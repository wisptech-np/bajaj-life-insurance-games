// data.js — Steady Tower tunables, palette, and the pure tower model.
//
// Two things live here:
//
//  1. `GAME_CONFIG` / `COLORS` — every number a designer would retune. The
//     component reads from here and never hard-codes a gameplay value; the only
//     constants inside SteadyTowerGame.jsx are drawing details (stroke widths,
//     glyph geometry).
//
//  2. The **pure tower model** — geometry-normalised block layout, the
//     centre-of-mass / support solver, the lean integrator, the generator and
//     the exhaustive solvability analyser. None of it touches React, canvas or
//     the DOM, which is deliberate: the balance gate imports this file straight
//     into node and runs the same code the game runs (see README "Balance
//     notes"). A model that only exists inside a canvas component cannot be
//     verified, and an unverifiable generator is how you ship an unwinnable
//     tower.
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar for this game: RED is always risk (the blocks you are here to
   pull out), BLUE is always protection (the foundation blocks that stay), ORANGE
   is the player's own action (drag ghost, flick arrows, meter needle) and GREEN
   is a healthy stability reading. Gold is reserved for the win beat. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  green: '#28A745',
  greenLt: '#4ADE80',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',
  danger: '#EF4444',
  dangerLt: '#FF7A6E',
  dangerDeep: '#7F1420',
  bgDark: '#0B1221',
  skyTop: '#061024',
  skyMid: '#0B1F42',
  skyLow: '#0B1221',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',

  // Block faces: [face light, face dark, top face, edge line]
  blueFaceLt: '#2C6BC8',
  blueFaceDk: '#0B2F6A',
  blueTop: '#5C9AEA',
  blueEdge: 'rgba(180,214,255,0.55)',
  redFaceLt: '#E8563F',
  redFaceDk: '#7C1522',
  redTop: '#FF8A72',
  redEdge: 'rgba(255,196,186,0.6)',

  plinthTop: '#24406E',
  plinthFace: '#13253F',
  plinthEdge: 'rgba(143,185,245,0.35)',
  dust: '#9DB4D8',
};

/* ─── Labels ──────────────────────────────────────────────
   Short enough to fit a ~75 px block face; the sprite builder shrinks the font
   until it fits, so a longer entry degrades gracefully rather than clipping. */
export const RED_LABELS = [
  'HIGH-INT DEBT',
  'JUNK FUND',
  'CARD DUES',
  'HOT-TIP STOCK',
  'PAYDAY LOAN',
  'F&O PUNT',
  'CHIT FUND',
  'PONZI SCHEME',
  'UNPAID EMI',
  'IDLE OVERDRAFT',
];

/** Foundation labels for the bottom (never-red) layers, then the general pool. */
export const BLUE_BASE_LABELS = ['TERM COVER', 'EMERGENCY FUND', 'HEALTH COVER'];
export const BLUE_LABELS = [
  'TERM COVER',
  'EMERGENCY FUND',
  'HEALTH COVER',
  'MONTHLY SIP',
  'PENSION PLAN',
  'CHILD PLAN',
  'ULIP CORE',
  'PPF',
  'FD LADDER',
  'GRATUITY',
  'ANNUITY',
  'INDEX FUND',
  'GOLD BONDS',
  'NPS TIER-1',
  'SAVINGS',
];

/* ─── Gameplay configuration ──────────────────────────────
   Values marked CORRECTION differ from the brief's literal reading and are
   explained in README.md "Balance notes"; each was chosen from the measured
   output of the headless gate rather than by feel. */
export const GAME_CONFIG = {
  sessionSeconds: 120,

  /* -- tower shape and red placement ------------------------------------- */
  tower: {
    layers: 12,
    // Fixed at 3 by the solver's 3-bit layer masks; kept here as documentation.
    perLayer: 3,
    // 8 rather than "some" (CORRECTION). A pull plus its settle is 2.0-3.5 s of
    // real play, so 8 risks is a 25-45 s core loop inside the 120 s cap — enough
    // room to hesitate, not enough to grind. It also keeps the exhaustive
    // analyser at 2^8 = 256 states, which runs in under a millisecond at mount.
    redCount: 8,
    // The bottom two layers are never red. This is the structural half of the
    // brief's solvability rule: the interface carrying the whole tower can never
    // be narrowed by the player.
    baseSafeLayers: 2,
    // One "pinch" layer has BOTH edge blocks red and the middle block blue, so
    // clearing it leaves the tower balanced on a single centred block. The sole
    // remaining support is therefore always a BLUE block — never a red one —
    // which is exactly the case the brief rules out, while still producing the
    // knife-edge that makes ordering matter.
    pinchLayers: 1,
    pinchMinLayer: 7,
    pinchMaxLayer: 9,
    // A middle block's removal leaves the layer's support span unchanged (the
    // two edge blocks still bracket it), so middle reds are nearly free. Capping
    // them keeps most of the run honest while leaving a couple of easy opening
    // pulls for confidence.
    maxMiddleReds: 3,
    // No three consecutive layers may lose the same column: that stacks a
    // support shift and a mass shift in the same direction and is the one
    // pattern that reliably produces an unwinnable final state.
    maxSameColumnRun: 2,
    // Max spread between the most- and least-used columns.
    columnImbalance: 3,
  },

  /* -- statics solver ----------------------------------------------------- */
  // Units are normalised: one block is 1.0 wide, so nothing here depends on the
  // canvas size and the headless gate measures exactly what the game feels.
  solver: {
    // Gap between blocks in a layer, as a fraction of block width.
    gapRatio: 0.06,
    // Layer pitch (block height + layer gap) as a fraction of block width. Must
    // track the rendered proportions, because it is the moment arm that couples
    // the lean back into the statics — see `evaluateMasks`.
    layerHeight: 0.42,
    // Shrink applied to every support span. 1.0 = pure geometry (topple exactly
    // when the centre of mass leaves the footprint). Measured runs at 1.0 gave
    // a good spread of outcomes, so no fudge factor is applied.
    supportFactor: 1.0,
    // A removal order is "safe" only if every intermediate state stays at or
    // above this margin. Winnability is proven against this number, not against
    // bare survival, so the guaranteed path has real headroom.
    safeMargin: 0.30,
    // Settled reading below which the tower is one bad flick from gone. Kept in
    // step with hud.criticalStability so the meter's heartbeat and the model's
    // idea of "in trouble" are the same number.
    dangerMargin: 0.34,
    // A tower must contain at least one reachable state at or below this, so a
    // careless order has something to walk into.
    fragileMargin: 0.30,
    // The all-reds-removed end state must be comfortably stable.
    finalMinMargin: 0.34,
    // Share of the 8! orders that stay safe throughout. Bounded on both sides:
    // too low is a memory test, too high is a walkthrough.
    minSafeOrderFraction: 0.015,
    maxSafeOrderFraction: 0.50,
    maxAttempts: 600,
    // The adversarial run every candidate must fail (see carelessOrderTopples).
    carelessPullGap: 0.35,
    carelessFlickSpeed: 1900,
  },

  /* -- lean / wobble integrator ------------------------------------------ */
  // A single rotational degree of freedom about the base centre, driven by the
  // statics solver. See README "The wobble model".
  wobble: {
    // Restoring stiffness at full stability. Scaled by the live margin, so a
    // tower that is nearly out of balance is physically floppy: the same pull
    // that barely rocks a healthy tower tips a critical one. This one term is
    // what makes the stability meter worth watching.
    stiffness: 58,
    minStiffnessFrac: 0.08,
    damping: 4.2,
    // Lean the tower settles into for a given centre-of-mass offset.
    maxLeanRad: 0.115,
    // Point of no return: past this the restoring force is abandoned.
    toppleAngle: 0.21,
    // Where the tower actually comes apart. The gap between the two angles is
    // the "slow tilt" beat the brief asks for.
    collapseAngle: 0.44,
    toppleAccel: 9.0,
    toppleBias: 0.35,
    // Angular velocity a clean pull imparts, in the direction of the flick.
    pullKick: 0.50,
    // Extra kick for a flick outside the clean speed band, x maxSpeedPenalty.
    speedKickMul: 1.6,
    // Kick from the sudden change in the centre-of-mass offset the pull causes.
    shiftKick: 0.5,
    // Tugging a blue block does not move it, but it does shake the tower.
    lockedKick: 0.10,
    settleOmega: 0.06,
    settleTheta: 0.012,
    // Ambient breathing sway, scaled by (1 - stability). Render-only: it never
    // feeds back into the integrator, so it cannot accumulate into a topple.
    idleSwayRad: 0.03,
    idleHz: 0.37,
  },

  /* -- flick input -------------------------------------------------------- */
  flick: {
    // Horizontal travel that commits the pull. Above the kit's 28 px swipe
    // floor so a stray thumb-roll while reading the meter does not fire.
    minPx: 30,
    // |dx| must beat |dy| by this ratio: a mostly-vertical drag is a scroll
    // attempt, not a pull.
    axisRatio: 1.25,
    // Clean speed band, px/s. Slower reads as scraping the block against its
    // neighbours; faster reads as yanking. Both add kick; between them is free.
    cleanMinSpeed: 380,
    cleanMaxSpeed: 1100,
    maxSpeedPenalty: 1.4,
    // Rubber-band feedback while the drag is below threshold.
    dragRubber: 0.32,
    maxDragPx: 46,
  },

  /* -- scoring ------------------------------------------------------------ */
  scoring: {
    riskValue: 200,
    // Full marks for holding 100% average stability across the run.
    stabilityBonusMax: 600,
    // Win only — a run that ended on the floor did not bank its time.
    timeBonusPerSecond: 6,
  },

  /* -- win / lose beats --------------------------------------------------- */
  win: {
    // After the last red leaves, the tower must ride out its own wobble before
    // the win is called. Cheap drama, and it makes the final pull matter.
    holdSeconds: 2.4,
  },

  /* -- layout (fractions of the canvas) ----------------------------------- */
  layout: {
    towerWidthFrac: 0.58,
    blockGapPx: 3,
    layerGapPx: 2,
    baseYFrac: 0.88,
    topMarginFrac: 0.2,
    plinthHeightPx: 16,
    plinthOverhangPx: 26,
    // Blocks tilt with a fraction of the shear angle. At 0 the tower reads as a
    // parallelogram of perfectly level bricks, which looks like a rendering bug
    // rather than a racked stack.
    blockTiltFrac: 0.45,
    // Forgiveness padding on the block hit test, in px.
    hitPadPx: 5,
  },

  /* -- effects ------------------------------------------------------------ */
  fx: {
    pullParticles: 12,
    lockedParticles: 6,
    dustParticles: 4,
    hitParticles: 22,
    winParticles: 40,
    collapseParticles: 30,
    damageShake: 6,
    hitStopSeconds: 0.07,
    // Ambient dust starts falling from the joints once the lean passes this.
    leanDustOffset: 0.5,
    dustIntervalSeconds: 0.16,
    blockFlightSeconds: 1.2,
    bannerSeconds: 1.6,
  },

  /* -- collapse animation ------------------------------------------------- */
  collapse: {
    gravity: 2100,
    spinMax: 7.5,
    bounce: 0.34,
    friction: 0.86,
    // Sideways kick applied to every block at the moment of collapse, on top of
    // the velocity its own height already gives it from the rotation.
    scatterSpeed: 120,
    settleSeconds: 2.2,
  },

  /* -- HUD ---------------------------------------------------------------- */
  hud: {
    endBeatMs: 900,
    // The collapse needs longer on screen than a win does.
    collapseBeatMs: 1500,
    lowTimeSeconds: 20,
    // Stability percent below which the meter heartbeats and the tick fires.
    criticalStability: 34,
    warnStability: 55,
    heartbeatMinInterval: 0.34,
    heartbeatMaxInterval: 0.9,
  },
};

/** Score the Results ring treats as a full circle. A clean win measures
    ~2,500: 1,600 (8 risks) + ~450 (stability average) + ~420 (time bonus).
    See README "Balance notes". */
export const RESULT_TARGET_SCORE = 2600;

/* ══════════════════════════════════════════════════════════════════════════
   PURE TOWER MODEL
   ══════════════════════════════════════════════════════════════════════════ */

/** Small deterministic PRNG so a tower can be reproduced from one seed. */
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

const POP3 = [0, 1, 1, 2, 1, 2, 2, 3];

/** Normalised x of a slot centre. Slot 0 = left, 1 = middle, 2 = right. */
export function slotOffset(slot, gapRatio) {
  return (slot - 1) * (1 + gapRatio);
}

/**
 * Statics, with the lean coupled back in.
 *
 * `masks[i]` is a 3-bit mask of the blocks still present in layer i (bit k =
 * slot k), bottom layer first. For every interface — the base plate under layer
 * 0, then each layer resting on the one below — we compare the centre of mass of
 * everything at or above that interface against the support span the layer below
 * actually provides. The tightest of those checks is the tower's stability.
 *
 * `theta` is the current lean, and it is treated as a **shear**, not a rigid
 * rotation. That distinction is the whole model. A tower of loose blocks does
 * not pivot about its base like a monolith — it racks: every layer slides a
 * little on the one below, so a layer sitting `h` above an interface is carried
 * `h * tan(theta)` off the support it is standing on. Rigid rotation would leave
 * every internal interface unchanged and only the ground contact would ever
 * matter, which is not how these towers fall.
 *
 * The consequence is the feedback loop the game is built on: leaning worsens the
 * margin, a worse margin softens the restoring spring (see `createLeanSolver`),
 * and a softer spring leans further. Below a certain margin that loop diverges
 * and the tower is gone — which is exactly what "pull the wrong support" should
 * feel like.
 *
 * Call with theta = 0 for settled statics, which is what winnability is proven
 * against: "if you let the tower settle after every pull, this order is safe."
 *
 * @returns {{margin:number, off:number, worst:number}}
 *   margin  1 = centred, 0 = the centre of mass sits exactly over the support
 *           edge, < 0 = already falling.
 *   off     the same reading signed and normalised (-1..1 inside the footprint),
 *           taken at the tightest interface. This is what the meter needle and
 *           the lean integrator read.
 *   worst   index of the tightest interface (0 = base plate).
 */
export function evaluateMasks(masks, cfg, theta = 0) {
  const g = cfg.solver.gapRatio;
  const pitch = 1 + g;
  const lh = cfg.solver.layerHeight;
  const factor = cfg.solver.supportFactor;
  const baseHalf = pitch + 0.5;
  const shear = theta === 0 ? 0 : Math.tan(theta);
  const N = masks.length;

  let M = 0;
  let Mx = 0;
  let Mh = 0;
  let minMargin = Infinity;
  let worstOff = 0;
  let worstIdx = 0;

  for (let i = N - 1; i >= 0; i--) {
    const m = masks[i];
    // A layer emptied completely is not a lean, it is a hole: the tower is gone.
    // The generator never produces one (every layer keeps at least one blue),
    // but the model must not return NaN if one ever appears.
    if (m === 0) return { margin: -1, off: worstOff || 1, worst: i };

    let sum = 0;
    for (let k = 0; k < 3; k++) if (m & (1 << k)) sum += (k - 1) * pitch;
    const cnt = POP3[m];
    M += cnt;
    Mx += sum;
    Mh += cnt * (i + 0.5) * lh;

    // Height of the supported mass above this interface, and the sideways offset
    // the shear carries it by.
    const hAbove = Mh / M - i * lh;
    const C = Mx / M + hAbove * shear;

    let L;
    let R;
    if (i === 0) {
      L = -baseHalf;
      R = baseHalf;
    } else {
      const b = masks[i - 1];
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = 0; k < 3; k++) {
        if (!(b & (1 << k))) continue;
        const x = (k - 1) * pitch;
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
      L = lo - 0.5;
      R = hi + 0.5;
    }

    const center = (L + R) / 2;
    const half = ((R - L) / 2) * factor;
    const off = (C - center) / half;
    const margin = 1 - Math.abs(off);
    if (margin < minMargin) {
      minMargin = margin;
      worstOff = off;
      worstIdx = i;
    }
  }

  return { margin: minMargin, off: worstOff, worst: worstIdx };
}

/**
 * Lean integrator — one rotational degree of freedom about the base centre.
 *
 * Not a rigid-body solver. The tower's *statics* are exact (see evaluateMasks);
 * what this adds is the reaction: a damped spring that pulls the tower toward
 * the lean its current centre-of-mass offset implies, with the spring constant
 * scaled by the live stability margin. That single coupling is the whole feel of
 * the game — a healthy tower springs back from a hard yank, a critical one is
 * floppy and keeps going. Once the centre of mass leaves the footprint (or the
 * lean passes `toppleAngle`) the spring is abandoned for an inverted-pendulum
 * acceleration, which is what makes the fall look inevitable rather than scripted.
 */
export function createLeanSolver(cfg) {
  const w = cfg.wobble;
  let theta = 0;
  let omega = 0;
  let toppling = false;
  let toppled = false;

  const targetFor = (off) => w.maxLeanRad * Math.max(-1, Math.min(1, off));

  return {
    get theta() { return theta; },
    get omega() { return omega; },
    get toppling() { return toppling; },
    get toppled() { return toppled; },

    kick(v) { omega += v; },

    reset() { theta = 0; omega = 0; toppling = false; toppled = false; },

    /** True once the tower has stopped moving and is sitting at its lean. */
    isSettled(off) {
      if (toppling) return false;
      return Math.abs(omega) < w.settleOmega && Math.abs(theta - targetFor(off)) < w.settleTheta;
    },

    /** Advance one fixed step. Returns true on the frame the tower comes apart. */
    step(dt, margin, off) {
      if (toppled) return true;
      if (!toppling && (margin <= 0 || Math.abs(theta) >= w.toppleAngle)) toppling = true;

      if (toppling) {
        const dir = theta !== 0 ? Math.sign(theta) : (off !== 0 ? Math.sign(off) : 1);
        omega += w.toppleAccel * (Math.sin(Math.abs(theta)) + w.toppleBias) * dir * dt;
      } else {
        const k = w.stiffness * Math.max(w.minStiffnessFrac, Math.min(1, margin));
        omega += (-k * (theta - targetFor(off)) - w.damping * omega) * dt;
      }

      theta += omega * dt;
      if (Math.abs(theta) >= w.toppleAngle) toppling = true;
      if (Math.abs(theta) >= w.collapseAngle) toppled = true;
      return toppled;
    },
  };
}

/**
 * Cost of an untidy flick, 0..flick.maxSpeedPenalty.
 *
 * Zero inside the clean band; it climbs both below it (scraping the block out
 * against its neighbours) and above it (yanking). Exported rather than inlined
 * in the component because the balance gate drives the same curve.
 */
export function flickPenalty(speedPxPerSec, cfg) {
  const f = cfg.flick;
  const s = Math.max(0, speedPxPerSec);
  let p = 0;
  if (s < f.cleanMinSpeed) p = (f.cleanMinSpeed - s) / f.cleanMinSpeed;
  else if (s > f.cleanMaxSpeed) p = (s - f.cleanMaxSpeed) / f.cleanMaxSpeed;
  return Math.min(f.maxSpeedPenalty, p);
}

/**
 * Angular impulse a pull imparts.
 *
 * Two terms: the yank itself, which drags the tower the way your thumb went and
 * grows with how untidy the flick was, and the sudden change in the centre-of-mass
 * offset the missing block causes. Pulling toward the side the tower is already
 * leaning is therefore worse than pulling away from it — the single piece of
 * tactics the flick direction carries.
 */
export function pullImpulse({ dir, speed, offBefore, offAfter }, cfg) {
  const yank = dir * cfg.wobble.pullKick * (1 + flickPenalty(speed, cfg) * cfg.wobble.speedKickMul);
  const shift = (offAfter - offBefore) * cfg.wobble.shiftKick;
  return yank + shift;
}

/* ─── Tower construction ─────────────────────────────────── */

/**
 * Build the immutable tower description from a red-placement list.
 * @param {Array<[number,number]>} reds  [layer, slot] pairs.
 */
export function buildTower(reds, cfg) {
  const L = cfg.tower.layers;
  const layers = [];
  const blueMasks = new Uint8Array(L);
  const redList = [];

  const isRed = (layer, slot) => reds.some(([l, s]) => l === layer && s === slot);

  let redIdx = 0;
  let blueIdx = 0;
  for (let i = 0; i < L; i++) {
    const row = [];
    for (let slot = 0; slot < 3; slot++) {
      const red = isRed(i, slot);
      if (red) {
        const block = {
          id: i * 3 + slot,
          layer: i,
          slot,
          red: true,
          redIndex: redIdx,
          label: RED_LABELS[redIdx % RED_LABELS.length],
        };
        redList.push(block);
        row.push(block);
        redIdx += 1;
      } else {
        const label = i < cfg.tower.baseSafeLayers
          ? BLUE_BASE_LABELS[(i * 3 + slot) % BLUE_BASE_LABELS.length]
          : BLUE_LABELS[blueIdx % BLUE_LABELS.length];
        blueMasks[i] |= 1 << slot;
        row.push({ id: i * 3 + slot, layer: i, slot, red: false, redIndex: -1, label });
        blueIdx += 1;
      }
    }
    layers.push(row);
  }

  return { layers, blueMasks, reds: redList, redCount: redList.length };
}

/** Layer masks for a given red-presence bitmask, written into `out`. */
export function masksForState(tower, state, out) {
  const target = out || new Uint8Array(tower.blueMasks.length);
  target.set(tower.blueMasks);
  for (let k = 0; k < tower.reds.length; k++) {
    if (state & (1 << k)) {
      const r = tower.reds[k];
      target[r.layer] |= 1 << r.slot;
    }
  }
  return target;
}

/**
 * Exhaustive order analysis.
 *
 * Every subset of the remaining reds is reachable — removals are independent, so
 * a subset is simply "these ones are gone, in any order" — which means the whole
 * state space is the 2^R subsets and can be enumerated outright rather than
 * sampled. R is 8, so this is 256 states and runs in well under a millisecond.
 *
 * Reported:
 *   winnable            a full removal order exists on which EVERY intermediate
 *                       state holds margin >= solver.safeMargin.
 *   safeOrders          how many of the R! orders are safe end to end.
 *   minMargin           the worst state anywhere in the space — proof that a
 *                       careless order can topple the tower.
 *   hazardStates        states below solver.dangerMargin.
 */
export function analyzeTower(tower, cfg) {
  const R = tower.reds.length;
  const total = 1 << R;
  const margins = new Float32Array(total);
  const scratch = new Uint8Array(tower.blueMasks.length);

  for (let st = 0; st < total; st++) {
    masksForState(tower, st, scratch);
    margins[st] = evaluateMasks(scratch, cfg).margin;
  }

  const full = total - 1;
  const safe = cfg.solver.safeMargin;

  // Number of safe orders reaching each state, walked by popcount so every
  // predecessor is finished before its successors are read.
  const ways = new Float64Array(total);
  const byPop = [];
  for (let p = 0; p <= R; p++) byPop.push([]);
  for (let st = 0; st < total; st++) byPop[POPCOUNT(st)].push(st);
  if (margins[full] >= safe) ways[full] = 1;
  for (let p = R; p >= 1; p--) {
    for (const st of byPop[p]) {
      const wsum = ways[st];
      if (wsum === 0) continue;
      for (let k = 0; k < R; k++) {
        if (!(st & (1 << k))) continue;
        const nx = st & ~(1 << k);
        if (margins[nx] < safe) continue;
        ways[nx] += wsum;
      }
    }
  }

  let minMargin = Infinity;
  let hazard = 0;
  for (let st = 0; st < total; st++) {
    if (margins[st] < minMargin) minMargin = margins[st];
    if (margins[st] < cfg.solver.dangerMargin) hazard += 1;
  }

  let orders = 1;
  for (let i = 2; i <= R; i++) orders *= i;

  return {
    winnable: ways[0] > 0,
    safeOrders: ways[0],
    totalOrders: orders,
    safeOrderFraction: ways[0] / orders,
    finalMargin: margins[0],
    fullMargin: margins[full],
    minMargin,
    hazardStates: hazard,
    hazardRatio: hazard / total,
    totalStates: total,
    margins,
  };
}

function POPCOUNT(v) {
  let n = 0;
  let x = v;
  while (x) { x &= x - 1; n += 1; }
  return n;
}

/**
 * One candidate red placement. Structural rules only — the analyser above is
 * what actually decides whether a candidate ships.
 */
export function generateReds(cfg, rand) {
  const t = cfg.tower;
  const L = t.layers;
  const reds = [];
  const usedLayers = new Set();
  const columnCount = [0, 0, 0];
  let middleReds = 0;

  // Pinch layers first: both edges red, middle blue.
  const pinchPool = [];
  for (let i = t.pinchMinLayer; i <= Math.min(t.pinchMaxLayer, L - 1); i++) pinchPool.push(i);
  for (let n = 0; n < t.pinchLayers && pinchPool.length; n++) {
    const idx = Math.floor(rand() * pinchPool.length);
    const layer = pinchPool.splice(idx, 1)[0];
    usedLayers.add(layer);
    reds.push([layer, 0], [layer, 2]);
    columnCount[0] += 1;
    columnCount[2] += 1;
  }

  // The rest: at most one red per remaining layer.
  const pool = [];
  for (let i = t.baseSafeLayers; i < L; i++) if (!usedLayers.has(i)) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const bySlotOfLayer = new Map();
  for (const [l, s] of reds) bySlotOfLayer.set(l, s);

  const remaining = t.redCount - reds.length;
  if (remaining < 0 || remaining > pool.length) return null;

  for (let n = 0; n < remaining; n++) {
    const layer = pool[n];
    // Try the columns in a random order until one passes the structural rules.
    const cols = [0, 1, 2];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [cols[i], cols[j]] = [cols[j], cols[i]];
    }
    let placed = false;
    for (const slot of cols) {
      if (slot === 1 && middleReds >= t.maxMiddleReds) continue;
      // Same-column run check against the two layers directly below.
      let run = 1;
      for (let d = 1; d <= t.maxSameColumnRun; d++) {
        if (bySlotOfLayer.get(layer - d) === slot) run += 1;
        else break;
      }
      if (run > t.maxSameColumnRun) continue;
      const trial = columnCount.slice();
      trial[slot] += 1;
      if (Math.max(...trial) - Math.min(...trial) > t.columnImbalance) continue;
      reds.push([layer, slot]);
      bySlotOfLayer.set(layer, slot);
      columnCount[slot] += 1;
      if (slot === 1) middleReds += 1;
      placed = true;
      break;
    }
    if (!placed) return null;
  }

  reds.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  return reds;
}

/**
 * Verified placement used when generation cannot find one in the attempt
 * budget. Produced by the headless gate (`node scripts/balance.mjs`) and checked
 * in with its measured numbers, so the fallback is never the untested path.
 *
 * Measured: final margin 0.357, worst reachable margin 0.257, 16,080 of 40,320
 * orders safe (39.9%), 51 of 256 states inside the heartbeat band, and the
 * adversarial careless run topples it. Layer 9 is the pinch.
 */
export const FALLBACK_REDS = [
  [2, 2],
  [3, 0],
  [4, 0],
  [7, 2],
  [8, 1],
  [9, 0],
  [9, 2],
  [11, 0],
];

/**
 * The other half of the brief's requirement, proven per tower rather than
 * assumed: drive this exact tower through the shipped lean integrator with the
 * worst order and the worst flicks, and confirm it actually falls over.
 *
 * Deliberately deterministic and adversarial — greedily take whichever removal
 * leaves the lowest settled margin, never wait for the wobble to die, and always
 * flick toward the side the tower is already leaning. Roughly 1,200 fixed steps,
 * so it is affordable inside the generator loop at mount.
 */
export function carelessOrderTopples(tower, cfg) {
  const R = tower.reds.length;
  const dt = 1 / 120;
  const lean = createLeanSolver(cfg);
  const scratch = new Uint8Array(tower.blueMasks.length);
  const probe = new Uint8Array(tower.blueMasks.length);

  let state = (1 << R) - 1;
  let t = 0;
  let nextPullAt = cfg.solver.carelessPullGap;

  while (t < cfg.sessionSeconds) {
    masksForState(tower, state, scratch);
    const ev = evaluateMasks(scratch, cfg, lean.theta);
    if (lean.step(dt, ev.margin, ev.off)) return true;
    t += dt;

    if (state === 0) return false;
    if (t < nextPullAt) continue;

    let worst = -1;
    let worstMargin = Infinity;
    for (let k = 0; k < R; k++) {
      if (!(state & (1 << k))) continue;
      masksForState(tower, state & ~(1 << k), probe);
      const m = evaluateMasks(probe, cfg, lean.theta).margin;
      if (m < worstMargin) { worstMargin = m; worst = k; }
    }
    if (worst < 0) return false;

    const next = state & ~(1 << worst);
    masksForState(tower, next, probe);
    const after = evaluateMasks(probe, cfg, lean.theta);
    const dir = lean.theta !== 0 ? Math.sign(lean.theta) : (after.off !== 0 ? Math.sign(after.off) : 1);
    lean.kick(pullImpulse({
      dir,
      speed: cfg.solver.carelessFlickSpeed,
      offBefore: ev.off,
      offAfter: after.off,
    }, cfg));

    state = next;
    nextPullAt = t + cfg.solver.carelessPullGap;
  }
  return false;
}

/**
 * Generate a tower that is provably winnable and provably topple-able.
 * Falls back to the checked-in placement rather than shipping an unverified one.
 */
export function buildVerifiedTower(cfg, rand) {
  const s = cfg.solver;
  for (let attempt = 0; attempt < s.maxAttempts; attempt++) {
    const reds = generateReds(cfg, rand);
    if (!reds) continue;
    const tower = buildTower(reds, cfg);
    const a = analyzeTower(tower, cfg);
    if (!a.winnable) continue;
    if (a.finalMargin < s.finalMinMargin) continue;
    if (a.minMargin >= s.fragileMargin) continue;
    if (a.safeOrderFraction < s.minSafeOrderFraction) continue;
    if (a.safeOrderFraction > s.maxSafeOrderFraction) continue;
    if (!carelessOrderTopples(tower, cfg)) continue;
    return { tower, analysis: a, attempts: attempt + 1, fallback: false };
  }
  const tower = buildTower(FALLBACK_REDS, cfg);
  return { tower, analysis: analyzeTower(tower, cfg), attempts: s.maxAttempts, fallback: true };
}
