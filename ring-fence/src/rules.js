// rules.js — pure Ring-Fence rules: grid ops, the cut, the seal + flood-fill,
// orb reflection, the anti-stall fuse, scoring and the win/lose test.
//
// No DOM, no React, no imports. GAME_CONFIG arrives as a parameter and
// presentation arrives through an optional callback bag, so the canvas
// component and ring-fence/gate.mjs drive the exact same code.
//
// Board model
// -----------
// A 65 x 117 grid of 6 px cells (all from cfg.grid). Cell values:
//   0 UNCLAIMED — open field, orbs live here
//   1 CLAIMED   — safe ground; solid to orbs; the guardian walks on it
//   2 TRAIL     — the unfinished cut; fragile: an orb touching it costs a life
//
// The guardian moves on cell lanes at cfg.player.speed. Leaving claimed ground
// starts a cut; re-touching claimed ground seals it. On a seal the trail
// becomes claimed wall, then every unclaimed component that contains NO hazard
// is claimed (flood-fill labelling, O(cells)). A sealed cut therefore ALWAYS
// resolves in the player's favour — components with an orb simply stay open,
// and the wall itself is always kept.

export const UNCLAIMED = 0;
export const CLAIMED = 1;
export const TRAIL = 2;

/** up, right, down, left */
export const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

const EMPTY = {};

/** Deterministic PRNG — the same generator the gate seeds per run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/* ─── World ──────────────────────────────────────────────── */

export function createWorld(cfg, rng = Math.random) {
  const { cols, rows, cellPx, border } = cfg.grid;
  const N = cols * rows;
  const grid = new Uint8Array(N);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x < border || y < border || x >= cols - border || y >= rows - border) {
        grid[y * cols + x] = CLAIMED;
      }
    }
  }
  const interiorTotal = (cols - 2 * border) * (rows - 2 * border);

  const W = cols * cellPx;
  const H = rows * cellPx;
  const orbs = [];
  for (let i = 0; i < cfg.orbs.starts.length; i++) {
    const s = cfg.orbs.starts[i];
    const a = ((s.angleDeg + (rng() * 2 - 1) * cfg.orbs.startAngleJitterDeg) * Math.PI) / 180;
    const margin = (border + 1) * cellPx + cfg.orbs.radius + 2;
    orbs.push({
      x: clamp(s.x * W + (rng() * 2 - 1) * cfg.orbs.startPosJitterPx, margin, W - margin),
      y: clamp(s.y * H + (rng() * 2 - 1) * cfg.orbs.startPosJitterPx, margin, H - margin),
      dirX: Math.cos(a),
      dirY: Math.sin(a),
      active: true,
      nearArmed: true,
    });
  }
  // Third-orb slot, inactive until summoned.
  orbs.push({ x: 0, y: 0, dirX: 1, dirY: 0, active: false, nearArmed: true });

  const startCx = Math.floor(cols / 2);
  const startCy = rows - border; // innermost claimed frame row at the bottom

  return {
    grid,
    cols,
    rows,
    interiorTotal,
    claimedInterior: 0,

    time: 0,
    sinceClaim: 0,
    over: false,
    won: false,
    endCause: null,

    score: 0,
    lives: cfg.lives,
    seals: 0,
    nearMisses: 0,
    biggestCutPct: 0,
    timeBonus: 0,
    lifeBonusTotal: 0,

    player: {
      cx: startCx,
      cy: startCy,
      tx: startCx,
      ty: startCy,
      prog: 0,
      dir: -1,
      wantDir: -1,
      stop: false,
      mode: 'safe',
      cutOx: startCx,
      cutOy: startCy,
      invuln: 0,
      stationary: 0,
      fuseLit: false,
      fuseCells: 0,
    },

    orbs,
    thirdState: 'none', // none | warning | live | skipped
    thirdTimer: 0,
    thirdX: 0,
    thirdY: 0,
    thirdAngle: 0,

    rng,

    /* Pause / re-acquire state — see beginPause/endPause. */
    paused: false,
    pauses: 0,
    freezeLeft: 0,
    inputLockLeft: 0,

    /* Cut trail as an ordered list of cell indices (origin first). */
    trail: new Int32Array(N),
    trailLen: 0,

    /* Reusable seal buffers — allocated once, reused every seal. */
    _labels: new Int32Array(N),
    _queue: new Int32Array(N),
    _newly: new Int32Array(N),
    _dist: new Int32Array(N),
    _distGen: new Int32Array(N),
    _gen: 0,
  };
}

/* ─── Small helpers ──────────────────────────────────────── */

export function pctClaimedOf(world) {
  return (world.claimedInterior / world.interiorTotal) * 100;
}

export function playerX(world, cfg) {
  const p = world.player;
  return (p.cx + 0.5 + (p.tx - p.cx) * p.prog) * cfg.grid.cellPx;
}

export function playerY(world, cfg) {
  const p = world.player;
  return (p.cy + 0.5 + (p.ty - p.cy) * p.prog) * cfg.grid.cellPx;
}

/** Hazard-orb speed for a given session time and time-since-last-claim:
 *  base ramp plus the boundary-camping bonus. Exposed separately so a
 *  planning sim can replicate stepWorld's accumulator arithmetic bit-exactly —
 *  the reflections are deterministic, so an orb's whole path is knowable,
 *  which is the fairness contract of the game. */
export function orbSpeedFor(cfg, time, sinceClaim) {
  const t = clamp(time / cfg.orbs.rampSeconds, 0, 1);
  const base = cfg.orbs.baseSpeed + (cfg.orbs.maxSpeed - cfg.orbs.baseSpeed) * t;
  const c = cfg.orbs.camping;
  const camp = Math.min(
    c.maxBonus,
    Math.floor(sinceClaim / c.intervalSeconds) * c.bonusPerInterval,
  );
  return base * (1 + camp);
}

/** Current hazard-orb speed (optionally `ahead` seconds into the future). */
export function orbSpeedAt(world, cfg, ahead = 0) {
  return orbSpeedFor(cfg, world.time + ahead, world.sinceClaim + ahead);
}

/** True if a circle at (x, y) overlaps any CLAIMED cell. */
export function circleHitsClaimed(world, cfg, x, y, r) {
  const cell = cfg.grid.cellPx;
  const { cols, rows } = world;
  const x0 = Math.max(0, Math.floor((x - r) / cell));
  const x1 = Math.min(cols - 1, Math.floor((x + r) / cell));
  const y0 = Math.max(0, Math.floor((y - r) / cell));
  const y1 = Math.min(rows - 1, Math.floor((y + r) / cell));
  const r2 = r * r;
  for (let cy = y0; cy <= y1; cy++) {
    const row = cy * cols;
    for (let cx = x0; cx <= x1; cx++) {
      if (world.grid[row + cx] !== CLAIMED) continue;
      const nx = clamp(x, cx * cell, cx * cell + cell);
      const ny = clamp(y, cy * cell, cy * cell + cell);
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy <= r2) return true;
    }
  }
  return false;
}

/** Axis-separated reflection of one orb against claimed ground. Deterministic:
 *  velocity direction is stored, magnitude comes from orbSpeedAt, and nothing
 *  is ever extrapolated across a pause. Works on any {x,y,dirX,dirY} object,
 *  which is what lets a planning sim run clones through the shipped physics. */
export function integrateOrb(world, cfg, orb, dt, sp) {
  const r = cfg.orbs.radius;
  const nx = orb.x + orb.dirX * sp * dt;
  if (circleHitsClaimed(world, cfg, nx, orb.y, r)) {
    orb.dirX = -orb.dirX;
  } else {
    orb.x = nx;
  }
  const ny = orb.y + orb.dirY * sp * dt;
  if (circleHitsClaimed(world, cfg, orb.x, ny, r)) {
    orb.dirY = -orb.dirY;
  } else {
    orb.y = ny;
  }
}

/* ─── Input ──────────────────────────────────────────────── */

export function setDirection(world, dir) {
  if (world.over || world.paused || isInputLocked(world)) return false;
  world.player.wantDir = dir;
  world.player.stop = false;
  return true;
}

/** Deliberate halt (used by planning bots to wait on the wall; the UI itself
 *  never stops the guardian — only walls and the trail do). */
export function setStop(world, v) {
  if (world.over || world.paused || isInputLocked(world)) return false;
  world.player.stop = !!v;
  return true;
}

/* ─── Pause / anti-pause-scum ─────────────────────────────
   The kit auto-pauses on visibilitychange, and the kit is immutable, so the
   anti-scumming rule lives here where the gate can drive it: going hidden
   freezes the world; coming back costs a visible 3-2-1 re-acquire count
   (freezeLeft — the world AND the session clock stay stopped, input dead),
   then a short live input lock. Orb velocities are stored state; they are
   never extrapolated across the gap. */

export function beginPause(world) {
  if (world.over) return;
  world.paused = true;
}

export function endPause(world, cfg) {
  if (world.over || !world.paused) return;
  world.paused = false;
  world.pauses += 1;
  world.freezeLeft = cfg.hud.reacquireFreezeSeconds;
  world.inputLockLeft = cfg.hud.reacquireLockSeconds;
}

export function isFrozen(world) {
  return world.freezeLeft > 0;
}

export function isInputLocked(world) {
  return world.freezeLeft > 0 || world.inputLockLeft > 0;
}

/* ─── The step ───────────────────────────────────────────── */

export function stepWorld(world, cfg, dt, ev = EMPTY) {
  if (world.over || world.paused) return;
  if (world.freezeLeft > 0) {
    // Frozen for the re-acquire count: nothing moves, the clock is held.
    world.freezeLeft = Math.max(0, world.freezeLeft - dt);
    return;
  }
  if (world.inputLockLeft > 0) {
    world.inputLockLeft = Math.max(0, world.inputLockLeft - dt);
  }

  world.time += dt;
  world.sinceClaim += dt;

  stepPlayer(world, cfg, dt, ev);
  if (world.over) return;

  stepThird(world, cfg, dt, ev);

  const sp = orbSpeedAt(world, cfg, 0);
  for (let i = 0; i < world.orbs.length; i++) {
    const orb = world.orbs[i];
    if (!orb.active) continue;
    integrateOrb(world, cfg, orb, dt, sp);
    orbContact(world, cfg, orb, ev);
    if (world.over) return;
  }

  if (world.time >= cfg.sessionSeconds) {
    world.over = true;
    world.won = false;
    world.endCause = 'time';
    ev.onEnd?.(world);
  }
}

/* ─── Guardian movement ──────────────────────────────────── */

function legalDir(world, d) {
  const p = world.player;
  const nx = p.cx + DIRS[d].dx;
  const ny = p.cy + DIRS[d].dy;
  if (nx < 0 || ny < 0 || nx >= world.cols || ny >= world.rows) return false;
  // Crossing your own unfinished trail is illegal input — ignored, not death.
  if (p.mode === 'cut' && world.grid[ny * world.cols + nx] === TRAIL) return false;
  return true;
}

function commitEnter(world, cfg, nx, ny, ev) {
  const p = world.player;
  const idx = ny * world.cols + nx;
  const v = world.grid[idx];
  if (v === UNCLAIMED) {
    if (p.mode === 'safe') {
      p.mode = 'cut';
      p.cutOx = p.cx;
      p.cutOy = p.cy;
      world.trailLen = 0;
      p.fuseLit = false;
      p.fuseCells = 0;
      p.stationary = 0;
      for (let i = 0; i < world.orbs.length; i++) world.orbs[i].nearArmed = true;
      ev.onCutStart?.(p.cx, p.cy);
    }
    world.grid[idx] = TRAIL;
    world.trail[world.trailLen++] = idx;
  }
}

function stepPlayer(world, cfg, dt, ev) {
  const p = world.player;
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);

  let dist = (cfg.player.speed * dt) / cfg.grid.cellPx; // in cells
  let guard = 0;
  while (dist > 1e-9 && !world.over && guard++ < 64) {
    if (p.prog === 0) {
      // At a cell centre: resolve the next committed direction.
      let d = -1;
      if (!p.stop) {
        if (p.wantDir >= 0) {
          if (legalDir(world, p.wantDir)) {
            d = p.wantDir;
          }
          p.wantDir = -1; // consumed either way — illegal input is ignored
        }
        if (d < 0 && p.dir >= 0 && legalDir(world, p.dir)) d = p.dir;
      }
      p.dir = d;
      if (d < 0) break; // halted (blocked, stopped, or no intent)
      const nx = p.cx + DIRS[d].dx;
      const ny = p.cy + DIRS[d].dy;
      commitEnter(world, cfg, nx, ny, ev);
      p.tx = nx;
      p.ty = ny;
    }

    const step = Math.min(dist, 1 - p.prog);
    p.prog += step;
    dist -= step;
    if (p.prog >= 1 - 1e-9) {
      p.cx = p.tx;
      p.cy = p.ty;
      p.prog = 0;
      if (p.mode === 'cut' && world.grid[p.cy * world.cols + p.cx] === CLAIMED) {
        doSeal(world, cfg, ev);
      }
    }
  }

  // Anti-stall fuse: stalling mid-cut ignites a fuse at the cut origin that
  // chases along the trail; moving again pauses it exactly where it is.
  if (p.mode === 'cut') {
    const halted = p.dir < 0;
    if (halted) {
      p.stationary += dt;
      if (!p.fuseLit && p.stationary >= cfg.cut.fuseIdleSeconds) {
        p.fuseLit = true;
        ev.onFuseIgnite?.();
      }
      if (p.fuseLit && p.stationary >= cfg.cut.fuseRelightSeconds) {
        p.fuseCells += (cfg.cut.fuseSpeed / cfg.grid.cellPx) * dt;
        if (p.fuseCells >= world.trailLen) {
          loseLife(world, cfg, 'fuse', playerX(world, cfg), playerY(world, cfg), ev);
        }
      }
    } else {
      p.stationary = 0;
    }
  }
}

/** Cell index of the fuse spark, or -1 when the fuse is not lit. */
export function fuseCellOf(world) {
  const p = world.player;
  if (p.mode !== 'cut' || !p.fuseLit || world.trailLen === 0) return -1;
  return world.trail[Math.min(world.trailLen - 1, Math.floor(p.fuseCells))];
}

/* ─── The seal ───────────────────────────────────────────── */

function multiplierFor(cfg, pct) {
  const table = cfg.scoring.multipliers; // sorted descending by pct
  for (let i = 0; i < table.length; i++) {
    if (pct >= table[i].pct) return table[i].mult;
  }
  return 1;
}

function doSeal(world, cfg, ev) {
  const { cols, rows } = world;
  const g = world.grid;
  const N = cols * rows;
  const labels = world._labels;
  const queue = world._queue;
  const newly = world._newly;
  const sealIdx = world.trail[world.trailLen - 1];
  let nNew = 0;

  // 1. The wall: every trail cell is kept, always.
  for (let i = 0; i < world.trailLen; i++) {
    const idx = world.trail[i];
    g[idx] = CLAIMED;
    newly[nNew++] = idx;
  }

  // 2. Label the unclaimed components (4-connectivity), O(cells).
  labels.fill(-1);
  let labelCount = 0;
  for (let i = 0; i < N; i++) {
    if (g[i] !== UNCLAIMED || labels[i] !== -1) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    labels[i] = labelCount;
    while (head < tail) {
      const c = queue[head++];
      const x = c % cols;
      if (x > 0 && g[c - 1] === UNCLAIMED && labels[c - 1] === -1) { labels[c - 1] = labelCount; queue[tail++] = c - 1; }
      if (x < cols - 1 && g[c + 1] === UNCLAIMED && labels[c + 1] === -1) { labels[c + 1] = labelCount; queue[tail++] = c + 1; }
      if (c - cols >= 0 && g[c - cols] === UNCLAIMED && labels[c - cols] === -1) { labels[c - cols] = labelCount; queue[tail++] = c - cols; }
      if (c + cols < N && g[c + cols] === UNCLAIMED && labels[c + cols] === -1) { labels[c + cols] = labelCount; queue[tail++] = c + cols; }
    }
    labelCount++;
  }

  // 3. Mark hazardous components: live orbs, plus a pending third-orb spawn so
  //    the warned ground is never claimed out from under the warning ring.
  const hazard = new Uint8Array(labelCount || 1);
  const cell = cfg.grid.cellPx;
  const markCircle = (x, y, r) => {
    const x0 = Math.max(0, Math.floor((x - r) / cell));
    const x1 = Math.min(cols - 1, Math.floor((x + r) / cell));
    const y0 = Math.max(0, Math.floor((y - r) / cell));
    const y1 = Math.min(rows - 1, Math.floor((y + r) / cell));
    const r2 = r * r;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const idx = cy * cols + cx;
        if (g[idx] !== UNCLAIMED) continue;
        const nx = clamp(x, cx * cell, cx * cell + cell);
        const ny = clamp(y, cy * cell, cy * cell + cell);
        const dx = x - nx;
        const dy = y - ny;
        if (dx * dx + dy * dy <= r2) hazard[labels[idx]] = 1;
      }
    }
  };
  for (let i = 0; i < world.orbs.length; i++) {
    if (world.orbs[i].active) markCircle(world.orbs[i].x, world.orbs[i].y, cfg.orbs.radius + 2);
  }
  if (world.thirdState === 'warning') markCircle(world.thirdX, world.thirdY, cfg.orbs.radius + 2);

  // 4. Claim every hazard-free component. Never guess wrong: components with
  //    an orb stay open, everything else is the player's.
  for (let i = 0; i < N; i++) {
    if (g[i] === UNCLAIMED && hazard[labels[i]] === 0) {
      g[i] = CLAIMED;
      newly[nNew++] = i;
    }
  }

  // 5. Score.
  world.claimedInterior += nNew;
  const pct = (nNew / world.interiorTotal) * 100;
  const mult = multiplierFor(cfg, pct);
  const points = Math.round(nNew * cfg.scoring.perCell * mult);
  world.score += points;
  world.sinceClaim = 0;
  world.seals += 1;
  if (pct > world.biggestCutPct) world.biggestCutPct = pct;

  // 6. Reset the cut.
  clearCutState(world);

  // 7. Wave order for the presentation: BFS distance (in cells) from the seal
  //    point across the newly claimed set — the flood wave the component draws
  //    at cfg.fx.wavePxPerSecond. Allocated per seal; seals are rare.
  const cells = new Int32Array(nNew);
  for (let i = 0; i < nNew; i++) cells[i] = newly[i];
  const dist = world._dist;
  const gen = ++world._gen;
  const distGen = world._distGen;
  for (let i = 0; i < nNew; i++) {
    distGen[cells[i]] = gen;
    dist[cells[i]] = -1;
  }
  let head = 0;
  let tail = 0;
  queue[tail++] = sealIdx;
  dist[sealIdx] = 0;
  let maxDist = 0;
  while (head < tail) {
    const c = queue[head++];
    const d = dist[c] + 1;
    const x = c % cols;
    const tryN = (n) => {
      if (distGen[n] === gen && dist[n] === -1) {
        dist[n] = d;
        if (d > maxDist) maxDist = d;
        queue[tail++] = n;
      }
    };
    if (x > 0) tryN(c - 1);
    if (x < cols - 1) tryN(c + 1);
    if (c - cols >= 0) tryN(c - cols);
    if (c + cols < N) tryN(c + cols);
  }
  const dists = new Int32Array(nNew);
  for (let i = 0; i < nNew; i++) {
    const d = dist[cells[i]];
    dists[i] = d === -1 ? ++maxDist : d;
  }

  ev.onSeal?.({ cells, dists, count: nNew, pct, mult, points, sealIdx, maxDist });

  // 8. Win?
  if (pctClaimedOf(world) >= cfg.winPct) {
    world.over = true;
    world.won = true;
    world.endCause = 'win';
    const remaining = Math.max(0, cfg.sessionSeconds - world.time);
    world.timeBonus = Math.round(remaining * cfg.scoring.timeBonusPerSecond);
    world.lifeBonusTotal = world.lives * cfg.scoring.lifeBonus;
    world.score += world.timeBonus + world.lifeBonusTotal;
    ev.onEnd?.(world);
  }
}

function clearCutState(world) {
  const p = world.player;
  p.mode = 'safe';
  world.trailLen = 0;
  p.fuseLit = false;
  p.fuseCells = 0;
  p.stationary = 0;
}

/* ─── Losing a life ──────────────────────────────────────── */

function loseLife(world, cfg, cause, x, y, ev) {
  world.lives -= 1;
  // Fired BEFORE the trail is cleared so the presentation can snapshot it for
  // the 150 ms burn-back.
  ev.onLifeLost?.(cause, x, y, world.lives);

  for (let i = 0; i < world.trailLen; i++) world.grid[world.trail[i]] = UNCLAIMED;
  clearCutState(world);

  const p = world.player;
  p.cx = p.tx = p.cutOx;
  p.cy = p.ty = p.cutOy;
  p.prog = 0;
  p.dir = -1;
  p.wantDir = -1;
  p.stop = false;
  p.invuln = cfg.player.invulnSeconds;

  if (world.lives <= 0) {
    world.over = true;
    world.won = false;
    world.endCause = 'lives';
    ev.onEnd?.(world);
  }
}

/* ─── Orb contact: trail hit, body hit, near miss ────────── */

function orbContact(world, cfg, orb, ev) {
  const p = world.player;
  if (p.mode !== 'cut' || p.invuln > 0) return;

  const r = cfg.orbs.radius;
  const cell = cfg.grid.cellPx;
  const half = cell / 2;

  // Body, mid-cut.
  const px = playerX(world, cfg);
  const py = playerY(world, cfg);
  const rr = r + cfg.player.radius;
  const bdx = orb.x - px;
  const bdy = orb.y - py;
  if (bdx * bdx + bdy * bdy <= rr * rr) {
    loseLife(world, cfg, 'orb', orb.x, orb.y, ev);
    return;
  }

  // Trail cells within reach (touch = life, close = near miss).
  const reach = r + half + cfg.orbs.nearMissPx + 1;
  const { cols, rows } = world;
  const x0 = Math.max(0, Math.floor((orb.x - reach) / cell));
  const x1 = Math.min(cols - 1, Math.floor((orb.x + reach) / cell));
  const y0 = Math.max(0, Math.floor((orb.y - reach) / cell));
  const y1 = Math.min(rows - 1, Math.floor((orb.y + reach) / cell));
  let minD2 = Infinity;
  for (let cy = y0; cy <= y1; cy++) {
    const row = cy * cols;
    for (let cx = x0; cx <= x1; cx++) {
      if (world.grid[row + cx] !== TRAIL) continue;
      const dx = orb.x - (cx + 0.5) * cell;
      const dy = orb.y - (cy + 0.5) * cell;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) minD2 = d2;
    }
  }

  const hitDist = r + half;
  if (minD2 <= hitDist * hitDist) {
    loseLife(world, cfg, 'trail', orb.x, orb.y, ev);
    return;
  }
  const nearDist = hitDist + cfg.orbs.nearMissPx;
  if (minD2 <= nearDist * nearDist) {
    if (orb.nearArmed) {
      orb.nearArmed = false;
      world.score += cfg.scoring.nearMiss;
      world.nearMisses += 1;
      ev.onNearMiss?.(orb.x, orb.y);
    }
  } else {
    orb.nearArmed = true; // left the zone — the next brush is a fresh near miss
  }
}

/* ─── Third orb ──────────────────────────────────────────── */

function pickThirdSpawn(world, cfg) {
  const { cols, rows, cellPx, border } = cfg.grid;
  const px = playerX(world, cfg);
  const py = playerY(world, cfg);
  const rr = cfg.orbs.radius + 2;
  let minD = cfg.orbs.third.minPlayerDist;
  for (let relax = 0; relax < 4; relax++) {
    let count = 0;
    for (let y = border + 1; y < rows - border - 1; y += 3) {
      for (let x = border + 1; x < cols - border - 1; x += 3) {
        const idx = y * cols + x;
        if (world.grid[idx] !== UNCLAIMED) continue;
        const cx = (x + 0.5) * cellPx;
        const cy = (y + 0.5) * cellPx;
        const dx = cx - px;
        const dy = cy - py;
        if (dx * dx + dy * dy < minD * minD) continue;
        if (circleHitsClaimed(world, cfg, cx, cy, rr)) continue;
        world._queue[count++] = idx;
      }
    }
    if (count > 0) {
      return world._queue[Math.min(count - 1, Math.floor(world.rng() * count))];
    }
    minD *= 0.6;
  }
  return -1;
}

function stepThird(world, cfg, dt, ev) {
  const t3 = cfg.orbs.third;
  if (world.thirdState === 'none') {
    if (pctClaimedOf(world) >= t3.pctTrigger || world.time >= t3.timeTrigger) {
      const idx = pickThirdSpawn(world, cfg);
      if (idx < 0) {
        world.thirdState = 'skipped';
        return;
      }
      const cell = cfg.grid.cellPx;
      world.thirdX = ((idx % world.cols) + 0.5) * cell;
      world.thirdY = (Math.floor(idx / world.cols) + 0.5) * cell;
      world.thirdAngle = world.rng() * Math.PI * 2;
      world.thirdTimer = t3.warningSeconds;
      world.thirdState = 'warning';
      ev.onThirdWarning?.(world.thirdX, world.thirdY, t3.warningSeconds);
    }
  } else if (world.thirdState === 'warning') {
    world.thirdTimer -= dt;
    if (world.thirdTimer <= 0) {
      // The warned component is protected from seals, but a wall may have been
      // built nearby — re-pick if the spot is no longer clear.
      if (circleHitsClaimed(world, cfg, world.thirdX, world.thirdY, cfg.orbs.radius + 1)) {
        const idx = pickThirdSpawn(world, cfg);
        if (idx < 0) {
          world.thirdState = 'skipped';
          return;
        }
        const cell = cfg.grid.cellPx;
        world.thirdX = ((idx % world.cols) + 0.5) * cell;
        world.thirdY = (Math.floor(idx / world.cols) + 0.5) * cell;
      }
      const orb = world.orbs[world.orbs.length - 1];
      orb.x = world.thirdX;
      orb.y = world.thirdY;
      orb.dirX = Math.cos(world.thirdAngle);
      orb.dirY = Math.sin(world.thirdAngle);
      orb.active = true;
      orb.nearArmed = true;
      world.thirdState = 'live';
      ev.onThirdSpawn?.(orb.x, orb.y);
    }
  }
}

/* ─── Stats contract ─────────────────────────────────────── */

export function statsOf(world) {
  return {
    score: Math.round(world.score),
    pctClaimed: Math.round(pctClaimedOf(world) * 10) / 10,
    biggestCutPct: Math.round(world.biggestCutPct * 10) / 10,
    livesLeft: world.lives,
  };
}
