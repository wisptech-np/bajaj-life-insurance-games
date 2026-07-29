// rules.js — the whole of Dual Cover's rules, as pure functions.
//
// No React, no canvas, no DOM, no import of data.js: every function takes the
// config as a parameter. gate.mjs imports THIS FILE, so the headless gate
// measures the code that ships rather than a re-implementation of it that can
// drift. If a rule lives anywhere else, it is a bug.
//
// GEOMETRY. Logical portrait field 390x780. Two orbs — BLUE Protection and
// ORANGE Growth — are locked 180° apart on a ring of radius `ringR` centred at
// (cx, cy). The pair's state is ONE angle, theta, in screen degrees: orb 0 sits
// at (cx + R·cosθ, cy + R·sinθ), orb 1 diametrically opposite. Increasing theta
// is clockwise on screen. Obstacles are horizontal bar assemblies that descend
// from the top; an obstacle's `leadY` is the screen y of its leading (bottom)
// edge, derived from the global scroll distance, so every obstacle is a pure
// function of time plus the pause-rewind offset.

/* ─── PRNG ───────────────────────────────────────────────── */

/** Small deterministic PRNG, so any run can be reproduced from its seed. */
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

const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Minimal distance between two orb-pair ORIENTATIONS (mod 180 — the pair is
    symmetric: theta and theta+180 are the same shape). Result in [0, 90]. */
export function oriDist(a, b) {
  const raw = ((a - b) % 180 + 180) % 180;
  return raw > 90 ? 180 - raw : raw;
}

/** Signed shortest rotation (degrees, in [-90, 90)) from theta to the nearest
    representative of orientation `target` (mod 180). */
export function signedOriDelta(theta, target) {
  let d = ((target - theta) % 180 + 270) % 180 - 90;
  return d;
}

/* ─── Descent ramp ───────────────────────────────────────── */

/** Descent speed at time t: linear v0 → v1 across ramp.seconds, flat after. */
export function speedAt(cfg, t) {
  const r = cfg.ramp;
  const k = clamp(t / r.seconds, 0, 1);
  return r.v0 + (r.v1 - r.v0) * k;
}

/** Scroll distance travelled by t: the closed-form integral of speedAt. */
export function distAt(cfg, t) {
  const r = cfg.ramp;
  const a = (r.v1 - r.v0) / r.seconds;
  if (t <= r.seconds) return r.v0 * t + 0.5 * a * t * t;
  const dRamp = r.v0 * r.seconds + 0.5 * a * r.seconds * r.seconds;
  return dRamp + r.v1 * (t - r.seconds);
}

/** Inverse of distAt — the time at which the scroll reaches distance d. */
export function timeAtDist(cfg, d) {
  const r = cfg.ramp;
  const a = (r.v1 - r.v0) / r.seconds;
  const dRamp = r.v0 * r.seconds + 0.5 * a * r.seconds * r.seconds;
  if (d <= dRamp) return (-r.v0 + Math.sqrt(r.v0 * r.v0 + 2 * a * d)) / a;
  return r.seconds + (d - dRamp) / r.v1;
}

/** Spawn interval at time t: linear interval0 → interval1 across the ramp. */
export function intervalAt(cfg, t) {
  const r = cfg.ramp;
  const k = clamp(t / r.seconds, 0, 1);
  return r.interval0 + (r.interval1 - r.interval0) * k;
}

/* ─── Obstacle construction ──────────────────────────────────
   Each obstacle is a list of axis-aligned rects (plus a rotation channel for
   the spinner) in obstacle-local coordinates: `off` is the distance from the
   leading (bottom) edge UP to the rect's bottom edge. On screen a rect spans
   y ∈ [leadY - off - h, leadY - off].

   Safe-orientation vocabulary (all tolerances follow from the geometry):
     wall     side stub, stops 55 px short of centre  → vertical  ±20°
     center   bar over the middle, side gaps          → horizontal ±23°
     gate     two stub walls, opposite sides, 380 px  → vertical, held longer
     spinner  centre bar rotating 45° through descent → horizontal, tracking
     squeeze  double bar, one off-centre gap at the 45° radius → diagonal ±11° */

function wallRects(cfg, side) {
  const O = cfg.obstacles;
  const x = side < 0 ? 0 : cfg.field.W - O.wallLen;
  return [{ x, w: O.wallLen, off: 0, h: O.barH }];
}

function buildObstacle(cfg, type, rand) {
  const F = cfg.field;
  const O = cfg.obstacles;
  const ob = {
    type,
    side: 0,
    spinDir: 0,
    rects: null,
    extent: O.barH,
    reqAngles: null,
    tol: 20,
    // Runtime state, reset per run because the sequence is rebuilt per run.
    passed: false,
    hitCount: 0,
    minClear: Infinity,
    nearX: 0,
    nearY: 0,
    splats: [],
  };

  if (type === 'wall') {
    ob.side = rand() < 0.5 ? -1 : 1;
    ob.rects = wallRects(cfg, ob.side);
    ob.reqAngles = [90];
    ob.tol = 20;
  } else if (type === 'center') {
    ob.rects = [{ x: F.cx - O.centerHalfW, w: O.centerHalfW * 2, off: 0, h: O.barH }];
    ob.reqAngles = [0];
    ob.tol = 23;
  } else if (type === 'gate') {
    ob.side = rand() < 0.5 ? -1 : 1;
    ob.rects = [
      ...wallRects(cfg, ob.side),
      { ...wallRects(cfg, -ob.side)[0], off: O.gateSepPx },
    ];
    ob.extent = O.gateSepPx + O.barH;
    ob.reqAngles = [90];
    ob.tol = 20;
  } else if (type === 'spinner') {
    ob.spinDir = rand() < 0.5 ? -1 : 1;
    ob.rects = [{ x: F.cx - O.spinnerHalfLen, w: O.spinnerHalfLen * 2, off: 0, h: O.barH }];
    ob.reqAngles = [0];
    ob.tol = 28;
  } else { // squeeze
    ob.side = rand() < 0.5 ? -1 : 1; // which side of centre the gap sits on
    const gapC = F.cx + ob.side * O.squeezeGapDx;
    const gapL = gapC - O.squeezeGapHalfW;
    const gapR = gapC + O.squeezeGapHalfW;
    const innerHalf = 53; // inner solid reaches this far past centre
    const bar = ob.side > 0
      ? [{ x: F.cx - innerHalf, w: gapL - (F.cx - innerHalf), off: 0, h: O.barH },
         { x: gapR, w: F.W - gapR, off: 0, h: O.barH }]
      : [{ x: 0, w: gapL, off: 0, h: O.barH },
         { x: gapR, w: (F.cx + innerHalf) - gapR, off: 0, h: O.barH }];
    const off2 = O.barH + O.squeezeSepPx;
    ob.rects = [...bar, ...bar.map((r) => ({ ...r, off: off2 }))];
    ob.extent = O.barH * 2 + O.squeezeSepPx;
    // Either diagonal fits: the pair is symmetric, so some orb reaches the gap
    // from both the 45° and the 135° orientation.
    ob.reqAngles = [45, 135];
    ob.tol = 11;
  }
  return ob;
}

/** Spinner bar angle (deg, signed) for a given leadY. The preview spin starts
    `spinPreviewPx` above the lethal band — visible before it can kill. */
export function spinPhiAt(cfg, ob, leadY) {
  if (!ob.spinDir) return 0;
  const F = cfg.field;
  const p0 = F.bandTop - cfg.obstacles.spinPreviewPx;
  const p1 = F.bandBot + ob.extent;
  const p = clamp((leadY - p0) / (p1 - p0), 0, 1);
  return cfg.obstacles.spinDeg * p * ob.spinDir;
}

/* ─── Sequence generation ────────────────────────────────────
   One authored run: ~30-36 obstacles across ~90 s. Cadence: an obstacle spawns
   (leading edge at y=0) `intervalAt` seconds after the previous obstacle's
   trailing edge crosses the ring centre, so the lethal band is never doubly
   occupied and every hand-off has a provable time budget.

   THE REACHABILITY CONSTRAINT (enforced here, proved in gate.mjs): for every
   consecutive pair, requiredRotationDeg / maxOmega × safetyFactor must fit in
   the gap between the previous obstacle leaving the band and the next entering
   it, and no pair may demand more than maxReqDeg. Candidates that would break
   it are re-picked; a same-orientation obstacle (req 0) always satisfies it,
   so generation can never wedge. */

const TYPE_ORDER = ['wall', 'center', 'gate', 'spinner', 'squeeze'];

function phaseWeights(cfg, t) {
  const U = cfg.obstacles.unlock;
  if (t < U.gate) return { wall: 0.55, center: 0.45, gate: 0, spinner: 0, squeeze: 0 };
  if (t < U.spinner) return { wall: 0.28, center: 0.30, gate: 0.42, spinner: 0, squeeze: 0 };
  if (t < U.squeeze) return { wall: 0.18, center: 0.20, gate: 0.24, spinner: 0.38, squeeze: 0 };
  return { wall: 0.10, center: 0.14, gate: 0.18, spinner: 0.20, squeeze: 0.38 };
}

function pickType(cfg, rand, t, prevTypes, prevOriRun, prevOri) {
  const S = cfg.sequence;
  const w = phaseWeights(cfg, t);
  for (let attempt = 0; attempt < 12; attempt++) {
    let total = 0;
    for (const k of TYPE_ORDER) total += w[k];
    let roll = rand() * total;
    let type = 'wall';
    for (const k of TYPE_ORDER) {
      roll -= w[k];
      if (roll <= 0) { type = k; break; }
    }
    // Variety: cap same-type runs and same-orientation runs. The orientation
    // cap is what guarantees an idle player cannot coast: at most
    // maxSameOrientation obstacles in a row share a safe window.
    const ori = type === 'wall' || type === 'gate' ? 90 : type === 'squeeze' ? 45 : 0;
    const typeRun = prevTypes[0] === type ? (prevTypes[1] === type ? 2 : 1) : 0;
    if (typeRun >= S.maxSameType) continue;
    if (ori === prevOri && prevOriRun >= S.maxSameOrientation) continue;
    return type;
  }
  // Fallback: alternate orientation family.
  return prevOri === 90 ? 'center' : 'wall';
}

export function buildSequence(cfg, rand) {
  const F = cfg.field;
  const S = cfg.sequence;
  const obstacles = [];

  let t = S.startDelay;
  let prevExit = 0;
  let prevSet = [0]; // the pair starts horizontal (locked at 0°/180°)
  let prevOri = 0;
  let prevOriRun = 1;
  const prevTypes = [null, null];

  for (let n = 0; n < 200; n++) {
    const d = distAt(cfg, t);
    // Stop when even the shortest obstacle could not clear the band by endTime.
    if (timeAtDist(cfg, d + F.bandBot + cfg.obstacles.barH) > S.endTime) break;

    let type = pickType(cfg, rand, t, prevTypes, prevOriRun, prevOri);
    let ob = buildObstacle(cfg, type, rand);
    // If this one's own extent would overrun the end, degrade to a short type.
    if (timeAtDist(cfg, d + F.bandBot + ob.extent) > S.endTime) {
      type = prevOri === 90 ? 'center' : 'wall';
      ob = buildObstacle(cfg, type, rand);
    }

    ob.index = obstacles.length;
    ob.dSpawn = d;
    ob.tSpawn = t;
    ob.tEnter = timeAtDist(cfg, d + F.bandTop);
    ob.tExit = timeAtDist(cfg, d + F.bandBot + ob.extent);

    // Reachability guard (belt and braces — the cadence already leaves several
    // times the budget, and gate.mjs proves it for every generated sequence).
    let req = 90;
    for (const a of prevSet) for (const b of ob.reqAngles) req = Math.min(req, oriDist(a, b));
    const tta = ob.tEnter - prevExit;
    const need = (req / cfg.rotation.maxOmega) * S.safetyFactor;
    if (req > S.maxReqDeg || need > tta) {
      // Replace with a same-orientation obstacle (req 0 always fits).
      type = prevOri === 90 ? 'wall' : 'center';
      ob = Object.assign(buildObstacle(cfg, type, rand), {
        index: obstacles.length, dSpawn: d, tSpawn: t,
        tEnter: timeAtDist(cfg, d + F.bandTop),
        tExit: timeAtDist(cfg, d + F.bandBot + cfg.obstacles.barH),
      });
    }

    obstacles.push(ob);

    const ori = ob.reqAngles[0] === 90 ? 90 : ob.reqAngles.length > 1 ? 45 : 0;
    prevOriRun = ori === prevOri ? prevOriRun + 1 : 1;
    prevOri = ori;
    prevTypes[1] = prevTypes[0];
    prevTypes[0] = ob.type;
    prevSet = ob.reqAngles;
    prevExit = ob.tExit;

    // Next spawn: interval after this one's trailing edge crosses ring centre.
    const tRef = timeAtDist(cfg, d + F.cy + ob.extent);
    t = tRef + intervalAt(cfg, tRef);
  }

  const last = obstacles[obstacles.length - 1];
  return {
    obstacles,
    total: obstacles.length,
    duration: last ? last.tExit : cfg.sessionSeconds,
  };
}

/**
 * Prove a generated sequence is playable. For every consecutive pair:
 *   need = requiredRotationDeg / maxOmega × safetyFactor  ≤  timeToArrival
 *   requiredRotationDeg ≤ maxReqDeg
 * where timeToArrival is the gap between the previous obstacle's trailing edge
 * leaving the lethal band and the next one's leading edge entering it.
 * Returns every pair so the gate can print the tightest rather than just
 * asserting a boolean.
 */
export function checkSequence(cfg, seq) {
  const S = cfg.sequence;
  const pairs = [];
  let ok = true;
  let worstRatio = 0;
  let maxReq = 0;
  let prevSet = [0];
  let prevExit = 0;
  for (const ob of seq.obstacles) {
    let req = 90;
    for (const a of prevSet) for (const b of ob.reqAngles) req = Math.min(req, oriDist(a, b));
    const tta = ob.tEnter - prevExit;
    const need = (req / cfg.rotation.maxOmega) * S.safetyFactor;
    const ratio = tta > 0 ? need / tta : Infinity;
    const pairOk = req <= S.maxReqDeg && need <= tta;
    if (!pairOk) ok = false;
    if (ratio > worstRatio) worstRatio = ratio;
    if (req > maxReq) maxReq = req;
    pairs.push({ index: ob.index, type: ob.type, req, tta, need, ratio, ok: pairOk });
    prevSet = ob.reqAngles;
    prevExit = ob.tExit;
  }
  return { ok, worstRatio, maxReq, pairs };
}

/* ─── Run state ──────────────────────────────────────────── */

export function createWorld(cfg, seed) {
  const rand = mulberry32(seed);
  const seq = buildSequence(cfg, rand);
  return {
    seed,
    seq,
    t: 0,
    D: 0,
    theta: 0,   // the pair starts horizontal: blue at 0°, orange at 180°
    omega: 0,
    dir: 0,
    dragDelta: 0,
    scrollBack: 0,
    head: 0,

    hits: 0,
    shieldsLeft: cfg.hit.shields,
    invuln: 0,

    score: 0,
    passed: 0,
    nearMisses: 0,
    streak: 0,
    comboMult: 1,
    nearStreak: 0,

    phaseIdx: 0,
    phaseHit: false,
    phaseBonuses: 0,
    noHit: true,

    paused: false,
    pauses: 0,
    freezeLeft: 0,

    over: false,
    won: false,
    endCause: '',
    minClearRun: Infinity,
  };
}

/** Net drive torque from the touch state: -1 (counter-clockwise), 0, +1
    (clockwise). Both screen halves held resolves to 0 — zero net torque. */
export function setInput(world, dir) {
  world.dir = dir < 0 ? -1 : dir > 0 ? 1 : 0;
}

/** Assist (accessibility) drag: rotate directly by dDeg on the next step. */
export function dragBy(world, dDeg) {
  if (world.over || world.freezeLeft > 0) return;
  world.dragDelta += dDeg;
}

function endRun(world, won, cause, ev) {
  if (world.over) return;
  world.over = true;
  world.won = won;
  world.endCause = cause;
  if (ev && ev.onEnd) ev.onEnd(won, world);
}

/** Distance from orb centre to one rect of an obstacle; fills `out` with the
    closest point. Handles the spinner's rotated bar. */
function orbRectClear(cfg, ob, rc, leadY, ox, oy, out) {
  if (ob.spinDir) {
    const F = cfg.field;
    const phi = spinPhiAt(cfg, ob, leadY) * DEG;
    const cyR = leadY - rc.off - rc.h / 2;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const dx = ox - F.cx;
    const dy = oy - cyR;
    const L = rc.w / 2;
    const h2 = rc.h / 2;
    const lx = dx * c + dy * s;
    const ly = -dx * s + dy * c;
    const px = clamp(lx, -L, L);
    const py = clamp(ly, -h2, h2);
    out.x = F.cx + px * c - py * s;
    out.y = cyR + px * s + py * c;
    return Math.hypot(lx - px, ly - py) - cfg.field.orbR;
  }
  const ry2 = leadY - rc.off;
  const ry1 = ry2 - rc.h;
  const px = clamp(ox, rc.x, rc.x + rc.w);
  const py = clamp(oy, ry1, ry2);
  out.x = px;
  out.y = py;
  return Math.hypot(ox - px, oy - py) - cfg.field.orbR;
}

const _cp = { x: 0, y: 0 }; // scratch, module-level — no per-step allocation

function testOrb(world, cfg, ob, leadY, ox, oy, orbIdx, ev) {
  for (let r = 0; r < ob.rects.length; r++) {
    const clear = orbRectClear(cfg, ob, ob.rects[r], leadY, ox, oy, _cp);
    if (clear < ob.minClear) {
      ob.minClear = clear;
      ob.nearX = _cp.x;
      ob.nearY = _cp.y;
    }
    if (clear < 0 && world.invuln <= 0) {
      world.hits += 1;
      world.shieldsLeft = Math.max(0, cfg.hit.shields - world.hits);
      world.invuln = cfg.hit.invulnSeconds;
      world.streak = 0;
      world.comboMult = 1;
      world.nearStreak = 0;
      world.phaseHit = true;
      world.noHit = false;
      ob.hitCount += 1;
      // Death legibility: the paint splat stays ON the obstacle, in the colour
      // of the orb that died there, and scrolls away with it.
      if (ob.splats.length < 4) {
        ob.splats.push({ x: _cp.x, off: leadY - _cp.y, orb: orbIdx });
      }
      if (ev && ev.onHit) ev.onHit(ob, orbIdx, _cp.x, _cp.y, world.hits);
      if (world.hits > cfg.hit.shields) {
        endRun(world, false, 'hits', ev); // the 4th hit
      }
      return;
    }
  }
}

function passObstacle(world, cfg, ob, ev) {
  const Sc = cfg.scoring;
  world.passed += 1;
  ob.passed = true;
  const clean = ob.hitCount === 0;
  let pts = 0;
  let near = false;
  if (clean) {
    world.streak += 1;
    world.comboMult = Math.min(Sc.comboCap, Math.pow(Sc.comboGrowth, world.streak - 1));
    pts = Math.round(Sc.passBase * world.comboMult);
    world.score += pts;
    near = ob.minClear > 0 && ob.minClear < Sc.nearMissPx;
    if (near) {
      world.score += Sc.nearMiss;
      world.nearMisses += 1;
      world.nearStreak += 1;
    } else {
      world.nearStreak = 0;
    }
    if (ob.minClear < world.minClearRun) world.minClearRun = ob.minClear;
  } else {
    world.comboMult = 1;
  }
  if (ev && ev.onPass) ev.onPass(ob, pts, world.comboMult, near, clean);

  if (world.passed >= world.seq.total) {
    // Final phase bonus, then the run is won.
    const cleanPhase = !world.phaseHit;
    if (cleanPhase) {
      world.score += Sc.phaseBonus;
      world.phaseBonuses += 1;
    }
    if (ev && ev.onPhase) ev.onPhase(world.phaseIdx, cleanPhase, true);
    if (world.noHit) world.score += Sc.noHitFinish;
    endRun(world, true, 'cleared', ev);
  }
}

/**
 * Advance the run by one fixed step. `ev` carries presentation callbacks
 * (onHit, onPass, onPhase, onEnd) — all optional, so the headless gate passes
 * nothing and gets pure numbers out.
 */
export function stepWorld(world, cfg, dt, ev) {
  if (world.over) return;

  // Re-acquire freeze: the world and the clock are held while the 3-2-1 runs.
  // Nothing below this line executes, so an obstacle three pixels from an orb
  // is still three pixels away when play resumes.
  if (world.freezeLeft > 0) {
    world.freezeLeft = Math.max(0, world.freezeLeft - dt);
    return;
  }

  const R = cfg.rotation;
  if (world.dir !== 0) {
    world.omega = clamp(world.omega + world.dir * R.accel * dt, -R.maxOmega, R.maxOmega);
  } else {
    // Surgical stop: 80 ms half-life decay on release.
    world.omega *= Math.pow(0.5, dt / R.releaseHalfLife);
    if (Math.abs(world.omega) < 0.4) world.omega = 0;
  }
  world.theta = (world.theta + world.omega * dt + world.dragDelta) % 360;
  if (world.theta < 0) world.theta += 360;
  world.dragDelta = 0;

  if (world.invuln > 0) world.invuln = Math.max(0, world.invuln - dt);

  world.t += dt;
  world.D = distAt(cfg, world.t) - world.scrollBack;

  // Phase boundaries: bonus if the phase was hit-free.
  const P = cfg.phases;
  if (world.phaseIdx < P.length && world.t >= P[world.phaseIdx]) {
    const clean = !world.phaseHit;
    if (clean) {
      world.score += cfg.scoring.phaseBonus;
      world.phaseBonuses += 1;
    }
    if (ev && ev.onPhase) ev.onPhase(world.phaseIdx, clean, false);
    world.phaseIdx += 1;
    world.phaseHit = false;
  }

  const F = cfg.field;
  const a = world.theta * DEG;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const x1 = F.cx + F.ringR * ca;
  const y1 = F.cy + F.ringR * sa;
  const x2 = F.cx - F.ringR * ca;
  const y2 = F.cy - F.ringR * sa;

  const obs = world.seq.obstacles;
  for (let i = world.head; i < obs.length; i++) {
    const ob = obs[i];
    if (ob.passed) {
      if (i === world.head) world.head += 1;
      continue;
    }
    const leadY = world.D - ob.dSpawn;
    if (leadY < -20) break; // sorted by spawn distance; nothing beyond is live
    if (leadY - ob.extent > F.bandBot + 4) {
      passObstacle(world, cfg, ob, ev);
      if (world.over) return;
      if (i === world.head) world.head += 1;
      continue;
    }
    if (leadY > F.bandTop - 2) {
      testOrb(world, cfg, ob, leadY, x1, y1, 0, ev);
      if (world.over) return;
      testOrb(world, cfg, ob, leadY, x2, y2, 1, ev);
      if (world.over) return;
    }
  }
}

/* ─── Pause and re-acquire ───────────────────────────────────
   The kit's game loop auto-pauses on `visibilitychange`, and the kit is
   immutable. On its own that is a live exploit: app-switching mid-descent
   freezes the world and resumes it instantly, so the player perceives and
   plans in stopped time. The rule lives HERE, in the shipped pure module, so
   the gate can drive it rather than the component asserting it is closed.

   Resume costs what the pause saved: the world stays frozen behind a visible
   3-2-1 count (clock held, input dead), AND the obstacle field is rewound by
   rewindSeconds of travel — the descent backs up a quarter second, so a
   returning player faces the situation slightly EARLIER than they left it.
   Grace, without advantage. */

/** Called when the loop reports it has auto-paused. */
export function beginPause(world) {
  if (world.over) return;
  world.paused = true;
}

/** Called when the loop reports it has resumed. Starts the re-acquire beat
    and rewinds the obstacle field. */
export function endPause(world, cfg) {
  if (world.over || !world.paused) return;
  world.paused = false;
  world.pauses += 1;
  world.freezeLeft = cfg.pause.reacquireSeconds;
  world.scrollBack += speedAt(cfg, world.t) * cfg.pause.rewindSeconds;
  world.D = distAt(cfg, world.t) - world.scrollBack;
}

/** True while the world is held for the countdown — the clock must hold too. */
export function isFrozen(world) {
  return world.freezeLeft > 0;
}

/** The stats contract handed to the results screen. */
export function statsOf(world) {
  return {
    score: Math.round(world.score),
    obstaclesPassed: world.passed,
    nearMisses: world.nearMisses,
    shieldsLeft: world.shieldsLeft,
  };
}
