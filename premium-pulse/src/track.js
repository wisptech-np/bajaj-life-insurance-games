// track.js — pure schedule generation and tap judging for Premium Pulse.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js: every
// function takes the config object as a parameter. scripts/balance.mjs imports
// THIS file, so the balance table in the README is measured against the code
// that ships rather than against a re-implementation that can silently drift
// from it.
//
// ─── The one clock ──────────────────────────────────────────────────────────
// Everything in this game is a function of ONE monotonic track clock, measured
// in milliseconds from the moment the player taps to start:
//
//     beat time      <- buildSectionPlan()  +  beatTimeMs()
//     ring position  <- ring.hitMs - now                (the component)
//     metronome      <- metronomeEvents()               (the audio scheduler)
//     tap judgement  <- judgeTap() against ring.hitMs
//
// There is no second timeline that has to be kept in step, which is the whole
// point: a rhythm game whose visuals and audio are scheduled independently will
// drift, and the player will feel it long before anyone can measure it.
// `beatTimeMs` derives a beat's time by section offset + multiply;
// `metronomeEvents` derives it by accumulating one beat at a time. Those are
// genuinely different code paths, and scripts/balance.mjs asserts they agree to
// < 1 ms over all 152 beats and over every ring, on every seed block.
//
// ─── Judging honesty ────────────────────────────────────────────────────────
// `judgeTap` receives a RAW tap time on the track clock and applies the device
// latency allowance itself (`toJudgeMs`). The compensation lives in shipped
// pure code rather than in the component, deliberately: the balance sim then
// exercises the exact arithmetic the player's finger goes through, so the
// constant cannot be right in one place and wrong in the other. `judgeTap`
// looks at nothing else — no frame counter, no wall clock, no knowledge of what
// the ring "was going to be". The same function judges the player and the sim's
// bots.
//
// Callers must sweep auto-resolution on the JUDGING clock too, which lags the
// visual clock by exactly `deviceLatencyMs`: use `toJudgeMs(trackMs, cfg)`.
// Sweeping on the raw clock would let the per-frame sweep retire a ring 60 ms
// before a tap aimed at it could be judged.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Small deterministic PRNG, so a headless run can be reproduced from a seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const beatMsFor = (bpm) => 60000 / bpm;

/**
 * Visual/track clock -> judging clock.
 *
 * The player hears a beat a few ms after the synth is triggered (audio output
 * latency) and the browser hands over a pointerdown a few tens of ms after the
 * finger lands (touch input latency). Both are additive, both push a tap LATE,
 * and their sum is `cfg.deviceLatencyMs`. Subtracting it once, here, is what
 * makes "tapped exactly on the beat I heard" read as err = 0.
 *
 * Apply it to EVERY read of the judging timeline — taps and the per-frame
 * auto-resolution sweep alike — so a single consistent timeline does all the
 * judging. The visual timeline stays uncompensated: rings meet the badge when
 * the schedule says, and the ~25 ms of that constant which is audio output
 * latency is below the audio/visual sync threshold at these tempos.
 */
export const toJudgeMs = (trackMs, cfg) => trackMs - cfg.deviceLatencyMs;

/* ─── Section plan ────────────────────────────────────────
   Lays the configured sections end to end and records, for each, the beat index
   and the millisecond it starts at. `startMs` is accumulated section by section
   (7 additions); `beatTimeMs` then does one multiply inside the section. */
export function buildSectionPlan(cfg) {
  const sections = [];
  let startBeat = 0;
  let startMs = 0;
  let movementIndex = 0;

  for (let i = 0; i < cfg.sections.length; i++) {
    const src = cfg.sections[i];
    const beatMs = beatMsFor(src.bpm);
    const section = {
      index: i,
      kind: src.kind,
      bpm: src.bpm,
      beats: src.beats,
      label: src.label,
      tag: src.tag || '',
      redRatio: src.redRatio || 0,
      beatMs,
      startBeat,
      startMs,
      endMs: startMs + src.beats * beatMs,
      movementIndex: src.kind === 'movement' ? movementIndex : -1,
    };
    if (src.kind === 'movement') movementIndex += 1;
    sections.push(section);
    startBeat += src.beats;
    startMs = section.endMs;
  }

  return {
    sections,
    totalBeats: startBeat,
    totalMs: startMs,
    movementCount: movementIndex,
  };
}

/** The section a (possibly fractional) beat belongs to. */
export function sectionAtBeat(plan, beat) {
  const s = plan.sections;
  for (let i = 0; i < s.length; i++) {
    if (beat < s[i].startBeat + s[i].beats) return s[i];
  }
  return s[s.length - 1];
}

/**
 * Time of a beat, in track ms. Beat may be fractional (x.5 for the off-beat
 * hats and the second half of a bonus double).
 *
 * Section offset + multiply. Deliberately a different derivation from
 * `metronomeEvents`, which accumulates; the balance gate cross-checks them.
 */
export function beatTimeMs(plan, beat) {
  const sec = sectionAtBeat(plan, beat);
  return sec.startMs + (beat - sec.startBeat) * sec.beatMs;
}

/* ─── The metronome ───────────────────────────────────────
   The groove, as a flat list of timed events. The component's scheduler walks
   this array and fires kit voices; it never computes a time itself.

   Pattern, per 4-beat bar inside a movement:
       beat 0   KICK (accented downbeat)      beat 0.5  hat
       beat 1   hat                           beat 1.5  hat
       beat 2   KICK                          beat 2.5  hat
       beat 3   hat                           beat 3.5  hat
   The intro count-in clicks every beat (accent on 1 of each bar). Fills put a
   kick on every beat — that IS the fill — and open with a sting.

   Times are accumulated one beat at a time, which is how a scheduler naturally
   advances and therefore the derivation most likely to drift. That is why it is
   the one the gate checks against `beatTimeMs`. */
export function metronomeEvents(plan) {
  const events = [];
  let t = 0;

  for (const sec of plan.sections) {
    const half = sec.beatMs / 2;
    for (let b = 0; b < sec.beats; b++) {
      const barBeat = b % 4;
      const beat = sec.startBeat + b;

      let kind;
      if (sec.kind === 'intro') kind = barBeat === 0 ? 'accent' : 'count';
      else if (sec.kind === 'fill') kind = 'tom';
      else if (sec.kind === 'outro') kind = barBeat === 0 ? 'accent' : 'hat';
      else kind = barBeat === 0 ? 'accent' : barBeat === 2 ? 'kick' : 'hat';

      events.push({ beat, tMs: t, kind, sectionIndex: sec.index, bpm: sec.bpm, barBeat });
      events.push({ beat: beat + 0.5, tMs: t + half, kind: 'hat', sectionIndex: sec.index, bpm: sec.bpm, barBeat });
      t += sec.beatMs;
    }
  }

  return events;
}

/* ─── Red placement ───────────────────────────────────────
   Chooses which of a movement's SINGLE slots carry a red spiky ring.

   Random placement with a run-length guard, then a deterministic sweep so the
   requested count is always met exactly, then a relaxation ladder that can only
   trigger if the count is infeasible at the requested run length (it is not for
   any shipped movement — the gate asserts the run length holds on every seed).
   A pure shuffle would happily emit four reds in a row, which reads as the game
   having stopped rather than as a temptation. */
function chooseRedSlots(nSlots, nRed, rand, maxRun) {
  const flags = new Array(nSlots).fill(false);
  if (nRed <= 0) return flags;

  const runAt = (i) => {
    let n = 1;
    for (let k = i - 1; k >= 0 && flags[k]; k--) n += 1;
    for (let k = i + 1; k < nSlots && flags[k]; k++) n += 1;
    return n;
  };

  let placed = 0;
  for (let guard = 0; placed < nRed && guard < nSlots * 40; guard++) {
    const i = Math.floor(rand() * nSlots) % nSlots;
    if (flags[i]) continue;
    flags[i] = true;
    if (runAt(i) > maxRun) { flags[i] = false; continue; }
    placed += 1;
  }

  for (let limit = maxRun; placed < nRed && limit <= nSlots; limit++) {
    for (let i = 0; i < nSlots && placed < nRed; i++) {
      if (flags[i]) continue;
      flags[i] = true;
      if (runAt(i) > limit) { flags[i] = false; continue; }
      placed += 1;
    }
  }

  return flags;
}

/* ─── The track ───────────────────────────────────────────
   Built in one pass from a seeded PRNG, so a seed fully determines the run and
   any headless result can be reproduced from it alone.

   Grid: inside every 8-beat group of a movement, rings land on group-relative
   beats 0, 3 and 6 (a 3+3+2 tresillo). Beat 0 is the BONUS DOUBLE — two blue
   rings a half-beat apart. Four rings per group; 6 + 5 + 5 groups across the
   three movements is exactly 64 scored rings.

   Only the single slots can be red, because a bonus double is two blue rings by
   definition. `redRatio` is expressed over ALL of the movement's rings and is
   satisfied out of those single slots, which is why Movement III (30% of 20
   rings = 6) uses 6 of its 10 singles. */
export function buildTrack(cfg, rand) {
  const plan = buildSectionPlan(cfg);
  const g = cfg.grid;
  const rings = [];

  for (const sec of plan.sections) {
    if (sec.kind !== 'movement') continue;

    const groups = Math.floor(sec.beats / g.groupBeats);
    const slots = [];
    for (let gi = 0; gi < groups; gi++) {
      const base = sec.startBeat + gi * g.groupBeats;
      for (const sb of g.slotBeats) {
        if (sb === g.bonusSlotBeat) {
          slots.push({ beat: base + sb, bonus: true, bonusPart: 0 });
          slots.push({ beat: base + sb + g.bonusOffsetBeats, bonus: true, bonusPart: 1 });
        } else {
          slots.push({ beat: base + sb, bonus: false, bonusPart: -1 });
        }
      }
    }

    const singleIdx = [];
    for (let i = 0; i < slots.length; i++) if (!slots[i].bonus) singleIdx.push(i);

    const nRed = Math.round(slots.length * sec.redRatio);
    const redFlags = chooseRedSlots(singleIdx.length, nRed, rand, g.maxConsecutiveReds);
    for (let k = 0; k < singleIdx.length; k++) slots[singleIdx[k]].red = redFlags[k];

    const approachMs = cfg.approachBeats * sec.beatMs;
    for (const slot of slots) {
      const hitMs = beatTimeMs(plan, slot.beat);
      rings.push({
        index: rings.length,
        sectionIndex: sec.index,
        movementIndex: sec.movementIndex,
        bpm: sec.bpm,
        beat: slot.beat,
        hitMs,
        approachMs,
        spawnMs: hitMs - approachMs,
        red: !!slot.red,
        bonus: slot.bonus,
        bonusPart: slot.bonusPart,
      });
    }
  }

  rings.sort((a, b) => a.hitMs - b.hitMs);
  for (let i = 0; i < rings.length; i++) rings[i].index = i;

  const lastResolveMs = rings.length
    ? rings[rings.length - 1].hitMs + cfg.judge.captureMs
    : 0;

  return {
    plan,
    rings,
    blues: rings.reduce((n, r) => n + (r.red ? 0 : 1), 0),
    reds: rings.reduce((n, r) => n + (r.red ? 1 : 0), 0),
    firstSpawnMs: rings.length ? rings[0].spawnMs : 0,
    lastResolveMs,
    /** When the music stops. */
    trackEndMs: plan.totalMs,
    /** When the results screen is shown. */
    runEndMs: Math.max(plan.totalMs, lastResolveMs) + cfg.endBeatMs,
  };
}

/* ─── Run state ───────────────────────────────────────────
   A plain mutable object. Mutating it is deliberate: the game component holds
   it in a ref and the sim holds it on the stack, and neither wants a fresh
   object allocated 64 times a run. */
export function createRun(track) {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    perfects: 0,
    goods: 0,
    misses: 0,
    redsAvoided: 0,
    redsTapped: 0,
    falseAlarms: 0,
    mistimed: 0,
    ignoredBlues: 0,
    taps: 0,
    /** Index of the earliest ring that has not been resolved yet. */
    cursor: 0,
    resolved: new Uint8Array(track.rings.length),
    lastTapMs: -Infinity,
    over: false,
    won: false,
    endedMs: 0,
  };
}

/** Combo multiplier applied to a PERFECT, read from the combo you ALREADY had. */
export function comboMult(combo, cfg) {
  const sc = cfg.scoring;
  return Math.min(sc.comboMaxMult, 1 + Math.floor(combo / sc.comboStep));
}

/* Reusable event record. One object per judged outcome; the callers read it
   synchronously inside their handler and never retain it. */
function makeEvent(kind, ring, errMs, points, mult, reason) {
  return { kind, ring, errMs, points, mult, reason };
}

/**
 * Apply one resolved ring outcome to the run and return the event.
 *
 * `kind` is one of 'perfect' | 'good' | 'avoid' | 'miss'. This is the ONLY
 * place score, combo and misses move, so the sim and the component can never
 * disagree about what a run was worth.
 */
export function resolveRingOutcome(run, ring, kind, cfg, errMs, reason, nowMs) {
  const sc = cfg.scoring;
  let points = 0;
  let mult = 1;

  if (kind === 'perfect') {
    mult = comboMult(run.combo, cfg);
    points = sc.perfect * mult;
    run.perfects += 1;
    run.combo += 1;
  } else if (kind === 'good') {
    points = sc.good;
    run.goods += 1;
    run.combo += 1;
  } else if (kind === 'avoid') {
    points = sc.redAvoided;
    run.redsAvoided += 1;
    run.combo += 1;
  } else {
    run.misses += 1;
    run.combo = 0;
    if (reason === 'red') run.redsTapped += 1;
    else if (reason === 'offbeat') run.falseAlarms += 1;
    else if (reason === 'ignored') run.ignoredBlues += 1;
    else run.mistimed += 1;
  }

  if (run.combo > run.bestCombo) run.bestCombo = run.combo;
  run.score += points;

  if (run.misses >= cfg.maxMisses && !run.over) {
    run.over = true;
    run.won = false;
    run.endedMs = nowMs;
  }

  return makeEvent(kind, ring, errMs, points, mult, reason);
}

/**
 * Resolve every ring whose judging window has closed at or before `nowMs`.
 *
 * A blue ring nobody met is a MISS ("premium lapsed"); a red ring nobody
 * touched is correct inhibition and pays `scoring.redAvoided`. Both happen
 * `judge.captureMs` after the beat, so a late tap either lands inside the
 * window and consumes the ring, or arrives after it has already resolved — the
 * two paths can never both charge for the same ring.
 *
 * Idempotent: safe to call every frame, and it is.
 */
export function resolveDue(track, run, nowMs, cfg, onEvent) {
  const rings = track.rings;
  const window = cfg.judge.captureMs;

  while (run.cursor < rings.length) {
    const ring = rings[run.cursor];
    if (run.resolved[ring.index]) { run.cursor += 1; continue; }
    if (ring.hitMs + window > nowMs) break;

    run.resolved[ring.index] = 1;
    run.cursor += 1;
    const ev = ring.red
      ? resolveRingOutcome(run, ring, 'avoid', cfg, 0, 'avoided', ring.hitMs + window)
      : resolveRingOutcome(run, ring, 'miss', cfg, 0, 'ignored', ring.hitMs + window);
    onEvent?.(ev);
    if (run.over) break;
  }
}

/** The ring a tap at `tapMs` is aimed at: nearest unresolved within captureMs. */
function findCapture(track, run, tapMs, cfg) {
  const rings = track.rings;
  const window = cfg.judge.captureMs;
  let best = -1;
  let bestErr = Infinity;

  for (let i = run.cursor; i < rings.length; i++) {
    const d = rings[i].hitMs - tapMs;
    if (d > window) break;
    if (run.resolved[rings[i].index]) continue;
    const a = d < 0 ? -d : d;
    if (a <= window && a < bestErr) { bestErr = a; best = i; }
  }
  return best;
}

/**
 * True when at least one unresolved ring is already on screen.
 *
 * NOTE the deliberate mixed-clock comparison. `tapMs` is on the JUDGING clock
 * and `spawnMs` is on the VISUAL clock, which runs `deviceLatencyMs` ahead. So
 * for the first 60 ms after a ring appears, a tap at nothing is treated as
 * "no ring on screen" and pardoned rather than charged as an off-beat miss.
 *
 * Kept, not fixed. This gate only ever decides whether to PUNISH a tap that hit
 * nothing, so the error is one-directional and always in the player's favour —
 * about 1.1 s of extra free-tap time per run, spread over 64 ring spawns. The
 * alternative (adding `cfg.deviceLatencyMs` here) would start charging misses
 * for taps made in the same instant a ring becomes visible, which is the
 * moment a player is least able to have reacted to it. Making the punishment
 * lag the picture is the right way round.
 */
function hasVisibleRing(track, run, tapMs) {
  const rings = track.rings;
  for (let i = run.cursor; i < rings.length; i++) {
    if (run.resolved[rings[i].index]) continue;
    return rings[i].spawnMs <= tapMs;
  }
  return false;
}

/**
 * Judge one tap.
 *
 * `tapTrackMs` is the RAW track time of the pointerdown; the device latency
 * allowance is applied here (see `toJudgeMs`). Returns the event, or null when
 * the tap had no effect at all.
 *
 *   nearest unresolved ring within captureMs, and it is BLUE
 *       |err| <= perfectMs  PERFECT   (100 x combo multiplier)
 *       |err| <= goodMs     GOOD      (40)
 *       otherwise           MISS      (mistimed — the ring is consumed, so a
 *                                      badly timed tap costs one miss, not two)
 *   nearest unresolved ring within captureMs, and it is RED
 *                           MISS      (a temptation taken)
 *   no ring within captureMs, but a ring IS on screen
 *                           MISS      (off-beat: the brief's "else MISS")
 *   no ring on screen at all
 *                           ignored   (count-in, fills and the outro are free —
 *                                      there is nothing to be wrong about)
 *
 * Calls `resolveDue` first so a tap can never be judged against a ring whose
 * window has already closed.
 */
export function judgeTap(track, run, tapTrackMs, cfg, onEvent) {
  if (run.over) return null;

  // The one place the latency allowance is applied. Everything below — the
  // auto-resolution sweep, the capture search, the error — lives on the
  // judging clock, so a tap and the ring it was aimed at are always compared on
  // the same timeline.
  const tapMs = toJudgeMs(tapTrackMs, cfg);

  resolveDue(track, run, tapMs, cfg, onEvent);
  if (run.over) return null;

  // Finger-bounce debounce. Discards, never judges.
  if (tapMs - run.lastTapMs < cfg.judge.lockoutMs) return null;
  run.lastTapMs = tapMs;
  run.taps += 1;

  const idx = findCapture(track, run, tapMs, cfg);
  if (idx < 0) {
    if (!hasVisibleRing(track, run, tapMs)) return null;
    const ev = resolveRingOutcome(run, null, 'miss', cfg, 0, 'offbeat', tapMs);
    onEvent?.(ev);
    return ev;
  }

  const ring = track.rings[idx];
  const errMs = tapMs - ring.hitMs;
  const abs = errMs < 0 ? -errMs : errMs;
  run.resolved[ring.index] = 1;

  let ev;
  if (ring.red) {
    ev = resolveRingOutcome(run, ring, 'miss', cfg, errMs, 'red', tapMs);
  } else if (abs <= cfg.judge.perfectMs) {
    ev = resolveRingOutcome(run, ring, 'perfect', cfg, errMs, 'perfect', tapMs);
  } else if (abs <= cfg.judge.goodMs) {
    ev = resolveRingOutcome(run, ring, 'good', cfg, errMs, 'good', tapMs);
  } else {
    ev = resolveRingOutcome(run, ring, 'miss', cfg, errMs, errMs < 0 ? 'early' : 'late', tapMs);
  }
  onEvent?.(ev);
  return ev;
}

/**
 * Close the run at the end of the track.
 *
 * Win needs BOTH halves: the cover never lapsed (fewer than `maxMisses`) AND
 * the premiums actually added up (`score >= targetScore`).
 */
export function finishRun(run, cfg, nowMs) {
  if (run.over) return run;
  run.over = true;
  run.won = run.misses < cfg.maxMisses && run.score >= cfg.targetScore;
  run.endedMs = nowMs;
  return run;
}

/** The stats contract this game reports to the results screen. */
export function statsOf(run) {
  return {
    score: Math.round(run.score),
    perfects: run.perfects,
    bestCombo: run.bestCombo,
    misses: run.misses,
  };
}
