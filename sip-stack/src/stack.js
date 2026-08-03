// stack.js — the stacking rules of SIP Stack, as pure functions.
//
// No React, no DOM, no canvas, no colours, no imports. SipStackGame.jsx draws
// exactly the polygons slabFaces() returns and resolves every drop through
// resolveDrop(); scripts/balance.mjs imports this same module under Node — so
// the gate measures the code that ships rather than a re-implementation of it
// that can silently drift. If you need a pixel or a colour in here, the thing
// you are writing belongs in the component.

/* ── Block geometry ────────────────────────────────────────
   ONE source of truth. slabFaces() is the whole drawn block; slabDrawnBounds()
   measures those same vertices; footprint() is what a drop is judged against.
   scripts/balance.mjs asserts the two are identical, because they were not:
   the shipped drawSlab() ran its side and top faces from w to w + slabShear,
   so every block was drawn 10 logical px wider than the box it collided with. */

/**
 * The three faces of one pseudo-3D slab, in local space with origin (0, 0).
 * The extrusion is INSET, not appended: the whole solid lives inside
 * [0, w] x [0, h], which is exactly the box the drop is judged against. The
 * previous version appended the shear (top and side ran to w + shear), which is
 * the defect this module exists to close.
 */
export function slabFaces(w, h, depth, shear) {
  const d = Math.min(depth, h * 0.5);
  const s = Math.min(shear, w * 0.5);
  return {
    // Landing surface — its x-extent IS the collision extent, [0, w].
    top: [[0, d], [s, 0], [w, 0], [w - s, d]],
    front: [[0, d], [w - s, d], [w - s, h], [0, h]],
    side: [[w - s, d], [w, 0], [w, h - d], [w - s, h]],
  };
}

/** Bounding box of everything slabFaces() draws. */
export function slabDrawnBounds(w, h, depth, shear) {
  const f = slabFaces(w, h, depth, shear);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const face of [f.top, f.front, f.side]) {
    for (const [x, y] of face) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

/** X-extent of the drawn landing surface (the top face). */
export function topFaceBounds(w, h, depth, shear) {
  const top = slabFaces(w, h, depth, shear).top;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x] of top) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  return { minX, maxX };
}

/** The collision box of a placed block. */
export function footprint(block) {
  return { minX: block.x, maxX: block.x + block.w };
}

/* ── Slide track ───────────────────────────────────────────
   The slab sweeps from fully off one side of the tower to fully off the other,
   clamped so it can never leave the visible canvas — an unreachable slab is not
   difficulty, it is a broken interface. */

export function trackFor(topX, topW, slabW, viewW, edge) {
  let minX = Math.max(edge, topX - slabW);
  let maxX = Math.min(viewW - slabW - edge, topX + topW);
  if (maxX < minX) {
    const hi = Math.max(edge, viewW - slabW - edge);
    const c = Math.min(Math.max(topX, edge), hi);
    minX = c;
    maxX = c;
  }
  return { minX, maxX };
}

/* ── Motion ────────────────────────────────────────────────
   Position is a pure function of phase, so the sub-frame extrapolation done at
   pointerdown is exact rather than an iterative reflection that can land a
   fraction of a pixel away from where the renderer put the slab.
   phase is in [0, 2): 0..1 sweeps minX → maxX, 1..2 sweeps back. */

export function wrapPhase(phase) {
  return ((phase % 2) + 2) % 2;
}

export function advancePhase(phase, dt, traverseSeconds) {
  return wrapPhase(phase + dt / traverseSeconds);
}

export function slabXAt(phase, minX, maxX) {
  const p = wrapPhase(phase);
  const t = p <= 1 ? p : 2 - p;
  return minX + (maxX - minX) * t;
}

export function phaseDir(phase) {
  return wrapPhase(phase) <= 1 ? 1 : -1;
}

/** Seconds to cross a FULL-WIDTH track at this layer. Steps between blocks only. */
export function traverseFor(layerNum, cfg) {
  let t = cfg.speedSteps[0].traverseSeconds;
  for (const step of cfg.speedSteps) {
    if (layerNum >= step.fromLayer) t = step.traverseSeconds;
  }
  return t;
}

/**
 * Seconds to cross THIS track. Speed in px/s is held constant for a layer, so a
 * narrow tower crosses its shorter track proportionally faster.
 *
 * This is the difference between a difficulty ramp and a difficulty ramp that
 * runs backwards. Deriving the speed from the live track made a thin tower slow:
 * the sweep shrank with the footprint, so the same timing error bought a
 * proportionally smaller position error and the game got EASIER exactly as it
 * looked more dangerous. Measured: a 75 ms player won 100% of runs.
 */
export function crossSecondsFor(span, layerNum, cfg) {
  const ref = cfg.logicalWidth * cfg.startWidthFrac * 2;
  return traverseFor(layerNum, cfg) * Math.max(0.12, span / ref);
}

/* ── The drop ──────────────────────────────────────────────
   Judged entirely on footprints: [slabX, slabX + slabW] against the block below.
   Returns the block to push, plus the offcut to throw away, or a miss. */

export function resolveDrop(top, slabX, slabW, cfg) {
  const lo = Math.max(slabX, top.x);
  const hi = Math.min(slabX + slabW, top.x + top.w);
  const overlap = hi - lo;
  const offset = slabX - top.x;

  if (overlap < cfg.minKeepWidthPx) {
    return { outcome: 'miss', x: slabX, w: slabW, overlap: Math.max(0, overlap), offset, shear: null };
  }

  const window = Math.max(cfg.perfectWindowPx, cfg.perfectWindowFrac * slabW);
  if (Math.abs(offset) <= window) {
    return { outcome: 'perfect', x: top.x, w: slabW, overlap, offset, shear: null };
  }

  return {
    outcome: 'trim',
    x: lo,
    w: overlap,
    overlap,
    offset,
    shear: offset < 0
      ? { x: slabX, w: top.x - slabX, side: -1 }
      : { x: top.x + top.w, w: slabX + slabW - (top.x + top.w), side: 1 },
  };
}

/** Streak regrowth: from the Nth consecutive perfect, the footprint widens. */
export function regrow(x, w, originalW, streak, cfg) {
  if (streak < cfg.regrowFromStreak || w >= originalW) return { x, w };
  const grown = Math.min(originalW, w + cfg.regrowFrac * originalW);
  return { x: x + w / 2 - grown / 2, w: grown };
}

/* ── Compounding ───────────────────────────────────────────
   The point of the game. Score is not a running total of placements: it is the
   future value of the SIPs already in the tower. Every layer already standing
   grows one step when a new SIP lands on it, then the new contribution is
   added — the textbook SIP annuity recurrence. A layer placed early therefore
   ends the run worth growthPerLayer-compounded more than the same layer placed
   last, which is the whole difference between a corpus and a pile.

   The contribution itself scales with how much footprint the drop kept, so a
   sloppy layer is a smaller SIP for the rest of the run, not just a thinner
   block. */

export function contributionFor(keptW, originalW, perfect, cfg) {
  const frac = Math.max(0, Math.min(1, keptW / originalW));
  const scaled = cfg.contributionMinFrac + (1 - cfg.contributionMinFrac) * frac;
  return Math.round(cfg.contributionBase * scaled * (perfect ? cfg.perfectContributionMult : 1));
}

export function growCorpus(corpus, contribution, cfg) {
  return corpus * (1 + cfg.growthPerLayer) + contribution;
}

/** What one contribution is worth after `layersAbove` further SIPs land on it. */
export function layerValue(contribution, layersAbove, cfg) {
  return contribution * Math.pow(1 + cfg.growthPerLayer, layersAbove);
}

/** 0..1 — how far a layer of this age has compounded. Drives its colour. */
export function maturityOf(age, cfg) {
  if (age <= 0) return 0;
  return Math.min(1, age / cfg.matureAfterLayers);
}

/* ── Collapse ──────────────────────────────────────────────
   A missed drop does not just end the run: the tower shears at its narrowest
   recent layer and everything above it goes over the side. The weak layer you
   let through is the one that brings the corpus down. */

export function weakestRow(tower, scanRows) {
  const from = Math.max(1, tower.length - scanRows);
  let idx = tower.length - 1;
  let min = Infinity;
  for (let i = from; i < tower.length; i++) {
    if (tower[i].w < min) {
      min = tower[i].w;
      idx = i;
    }
  }
  return idx;
}

/* ── Deterministic PRNG, for reproducible gate runs ───────── */

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

/** Box-Muller, so a "tapped 30 ms late" bot has a human-shaped error tail. */
export function gaussian(rand) {
  const u = Math.max(1e-9, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/* ── One headless run of the shipped rules ─────────────────
   Used by scripts/balance.mjs. `aim` returns the x the player drops at, given
   the live track — that is the only thing a bot gets to decide. */

export function playRun(cfg, viewW, aim, rand) {
  const originalW = viewW * cfg.startWidthFrac;
  const tower = [{ x: (viewW - originalW) / 2, w: originalW }];
  const contributions = [];
  let corpus = 0;
  let contributed = 0;
  let streak = 0;
  let perfects = 0;
  let seconds = 0;

  for (let layer = 1; layer <= cfg.targetLayers; layer++) {
    const top = tower[tower.length - 1];
    const slabW = top.w;
    const track = trackFor(top.x, top.w, slabW, viewW, cfg.trackEdgePx);
    const span = track.maxX - track.minX;
    const cross = crossSecondsFor(span, layer, cfg);
    const speed = span / cross;
    // Half a crossing on average per placement, plus a beat of spawn animation.
    seconds += cross * 0.5 + cfg.spawnLockSeconds;

    const wanted = aim(top, track, speed, rand, layer);
    const dropX = Math.min(track.maxX, Math.max(track.minX, wanted));
    const drop = resolveDrop(top, dropX, slabW, cfg);

    if (drop.outcome === 'miss') {
      return {
        won: false, layers: tower.length - 1, corpus, contributed, perfects,
        seconds, contributions, tower,
      };
    }

    let { x, w } = drop;
    if (drop.outcome === 'perfect') {
      streak += 1;
      perfects += 1;
      const g = regrow(x, w, originalW, streak, cfg);
      x = g.x;
      w = g.w;
    } else {
      streak = 0;
    }

    const contribution = contributionFor(w, originalW, drop.outcome === 'perfect', cfg);
    corpus = growCorpus(corpus, contribution, cfg);
    contributed += contribution;
    contributions.push(contribution);
    tower.push({ x, w });
  }

  return {
    won: true, layers: tower.length - 1, corpus, contributed, perfects,
    seconds, contributions, tower,
  };
}
