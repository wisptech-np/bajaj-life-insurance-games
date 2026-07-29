// traffic.js — the rules of Safe Crossing, with nothing else in them.
//
// This module owns the junction geometry, the spawn schedule, vehicle
// kinematics, brake/release, junction-overlap collision detection, near-miss
// detection and scoring. It imports NOTHING: no React, no DOM, no canvas, no
// colours. SafeCrossingGame.jsx drives it and draws the result;
// scripts/balance.mjs drives the exact same functions under Node, so the
// balance table in data.js is measured against the code that ships rather than
// a re-implementation that can silently drift from it.
//
// Do not add a browser API or a presentation concern to this file.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Small deterministic PRNG, so a headless run reproduces from a seed. */
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

/** The four approaches. 'S' = travelling south (downward), etc. */
export const DIRS = ['N', 'S', 'E', 'W'];

/** Axis and travel sign per approach. Vertical approaches use y, horizontal x. */
const DIR_AXIS = { N: 'v', S: 'v', E: 'h', W: 'h' };
const DIR_SIGN = { N: -1, S: 1, E: 1, W: -1 };

/**
 * Lay the junction out for a measured canvas.
 *
 * One lane per direction, keeping LEFT (Indian traffic): travelling south your
 * left is screen-right, so the southbound lane sits right of the centre line;
 * travelling east your left is screen-down, so the eastbound lane sits below
 * it. That places the four conflict points at the four corners of the inner
 * square — N|S x E|W — which is the whole game.
 *
 * `scale` converts the authored px/s speeds (written against
 * `vehicles.refLaneWidthPx`) into this canvas's units, so a vehicle and the
 * junction it is crossing always keep the same size ratio, and the seconds-wide
 * overlap window a conflict is decided in is identical on every device.
 */
export function buildJunction(cfg, W, H) {
  const r = cfg.road;
  const laneW = clamp(Math.min(W, H) * r.laneWidthFrac, r.laneWidthPx[0], r.laneWidthPx[1]);
  const half = laneW; // road half-width == one lane each way
  const cx = W / 2;
  const cy = H * r.centerYFrac;

  const x0 = cx - half;
  const x1 = cx + half;
  const y0 = cy - half;
  const y1 = cy + half;

  const scale = laneW / cfg.vehicles.refLaneWidthPx;
  let maxLen = 0;
  for (const t of cfg.vehicles.types) maxLen = Math.max(maxLen, t.lenFrac * laneW);
  // Each approach has a runway that starts off-canvas. `spawnPadPx` is only
  // enough to hide a spawning vehicle; `runwayFrac` extends it, so several
  // vehicles are always queued behind the ones on screen. That off-screen depth
  // is what makes the junction contested: with only the visible stretch there
  // is barely one perpendicular vehicle in play at a time, and a dispatcher
  // with nothing to aim at produces no conflicts (measured: 37% of spawns
  // contested, and a bot that wins 60% of runs). See okf-brain log.
  const spawnOff = maxLen / 2 + r.spawnPadPx + Math.min(W, H) * r.runwayFrac;

  // Fixed cross-lane coordinate per approach: x for vertical, y for horizontal.
  const lane = {
    S: cx + laneW / 2,
    N: cx - laneW / 2,
    E: cy + laneW / 2,
    W: cy - laneW / 2,
  };
  // Along-axis coordinate at s = 0 (fully off-canvas on every approach).
  const start = {
    S: -spawnOff,
    N: H + spawnOff,
    E: -spawnOff,
    W: W + spawnOff,
  };
  // Box edge a vehicle meets first, and the one its rear must clear to count.
  const near = { S: y0, N: y1, E: x0, W: x1 };
  const far = { S: y1, N: y0, E: x1, W: x0 };
  const pathLen = {
    S: H + spawnOff * 2,
    N: H + spawnOff * 2,
    E: W + spawnOff * 2,
    W: W + spawnOff * 2,
  };

  return {
    W, H, cx, cy, laneW, half, scale, spawnOff,
    x0, x1, y0, y1,
    lane, start, near, far, pathLen,
    // The four conflict points, for drawing and for the tutorial screens.
    conflicts: [
      { x: lane.S, y: lane.E }, { x: lane.S, y: lane.W },
      { x: lane.N, y: lane.E }, { x: lane.N, y: lane.W },
    ],
  };
}

/* ─── Vehicles ───────────────────────────────────────────── */

function placeXY(v) {
  if (v.axis === 'v') {
    v.x = v.lane;
    v.y = v.along;
  } else {
    v.x = v.along;
    v.y = v.lane;
  }
}

/**
 * Build one vehicle on an approach. `id` of 0 marks a throwaway probe used by
 * the spawn scheduler to score a candidate approach before committing to it.
 */
export function makeVehicle(cfg, J, dir, typeIndex, id, speedFactor = 1) {
  const t = cfg.vehicles.types[typeIndex];
  const axis = DIR_AXIS[dir];
  const len = t.lenFrac * J.laneW;
  const wid = t.widFrac * J.laneW;
  const cruise = t.speed * J.scale * speedFactor;
  const v = {
    id,
    typeIndex,
    speedFactor,
    key: t.key,
    label: t.label,
    dir,
    axis,
    sign: DIR_SIGN[dir],
    lane: J.lane[dir],
    along: J.start[dir],
    s: 0,
    len,
    wid,
    halfX: axis === 'v' ? wid / 2 : len / 2,
    halfY: axis === 'v' ? len / 2 : wid / 2,
    cruise,
    speed: cruise,
    brakeable: t.brakeable,
    held: false,
    // Patience is CUMULATIVE across every hold this vehicle is ever given and
    // is never refunded by a release. See toggleBrake().
    holdTime: 0,
    patienceSpent: false,
    committed: false, // front has entered the junction box: no longer stoppable
    crossed: false,
    dead: false,
    // Near-miss partners already scored against this vehicle. Allocated once at
    // spawn (roughly twice a second), never inside the physics step.
    nm: [],
    squash: 0,
    age: 0,
    // Presentation flags, initialised here so a vehicle's shape never changes
    // after construction (a hidden-class transition inside the render loop).
    warn: false,
    honked: false,
    x: 0,
    y: 0,
  };
  placeXY(v);
  return v;
}

/**
 * Re-fit a live world to a rebuilt junction.
 *
 * Mobile browsers resize the canvas for every pixel the URL bar moves. Vehicles
 * carry absolute pixel positions, so they are carried across by their fraction
 * of the runway rather than by their coordinates: a URL bar sliding away must
 * not teleport a vehicle into the box.
 */
export function rescaleWorld(world, cfg, oldJ, newJ) {
  for (const v of world.vehicles) {
    const t = cfg.vehicles.types[v.typeIndex];
    const k = newJ.pathLen[v.dir] / oldJ.pathLen[v.dir];
    v.s *= k;
    v.len = t.lenFrac * newJ.laneW;
    v.wid = t.widFrac * newJ.laneW;
    v.halfX = v.axis === 'v' ? v.wid / 2 : v.len / 2;
    v.halfY = v.axis === 'v' ? v.len / 2 : v.wid / 2;
    v.cruise = t.speed * newJ.scale * v.speedFactor;
    v.speed = Math.min(v.speed * (newJ.scale / oldJ.scale), v.cruise);
    v.lane = newJ.lane[v.dir];
    v.along = newJ.start[v.dir] + v.sign * v.s;
    placeXY(v);
  }
}

/** Signed time for a vehicle to cover `dist`, accelerating toward cruise. */
export function travelTime(dist, speed, cruise, accel) {
  if (dist <= 0) return dist / cruise; // already past: negative, and that is useful
  const v0 = clamp(speed, 0, cruise);
  const tAcc = (cruise - v0) / accel;
  const dAcc = v0 * tAcc + 0.5 * accel * tAcc * tAcc;
  if (dAcc >= dist) return (-v0 + Math.sqrt(v0 * v0 + 2 * accel * dist)) / accel;
  return tAcc + (dist - dAcc) / cruise;
}

/**
 * Predicted junction overlap between two vehicles on perpendicular approaches.
 *
 * Straight fixed paths mean a vertical/horizontal pair has exactly one shared
 * point: (vertical lane x, horizontal lane y). Each vehicle occupies that point
 * for a fixed distance — its own extent plus the other's width — so the pair
 * collides if and only if the two time intervals intersect.
 *
 * Returns `{ tv, th, half, gap, later }`; `gap < 0` is a predicted crash and
 * `later` is the vehicle that reaches the point second (the one to hold).
 * Returns null for a parallel pair, which can never conflict.
 *
 * Occupancy half-times use cruise speed rather than current speed so a HELD
 * vehicle still reads as "will arrive": that is what keeps a hold latched until
 * the other vehicle has genuinely gone past, instead of oscillating.
 */
export function conflictOf(a, b, cfg) {
  if (a.axis === b.axis) return null;
  const v = a.axis === 'v' ? a : b;
  const h = a.axis === 'v' ? b : a;
  const accel = cfg.vehicles.accel;

  const dv = v.sign * (h.lane - v.along);
  const dh = h.sign * (v.lane - h.along);
  const tv = travelTime(dv, v.speed, v.cruise, accel);
  const th = travelTime(dh, h.speed, h.cruise, accel);

  const halfV = (v.halfY + h.halfY) / v.cruise;
  const halfH = (h.halfX + v.halfX) / h.cruise;
  const half = halfV + halfH;

  return {
    tv,
    th,
    half,
    gap: Math.abs(tv - th) - half,
    later: tv > th ? v : h,
    earlier: tv > th ? h : v,
  };
}

/* ─── World ──────────────────────────────────────────────── */

export function createWorld(cfg, J, seed) {
  const world = {
    rand: mulberry32(seed >>> 0),
    time: 0,
    vehicles: [],
    nextId: 1,
    spawnTimer: cfg.spawn.firstDelay,
    spawns: 0,
    skipped: 0,
    crossed: 0,
    nearMisses: 0,
    crashes: 0,
    score: 0,
    cushions: cfg.claimCushions,
    over: false,
    won: false,
    endCause: null,
  };

  // Warm start. A junction that begins empty gives away the first fifteen
  // seconds of every run: nothing can conflict until the runways have filled,
  // and the player learns nothing from watching an empty crossroads. The warm
  // vehicles are laid down nearest-the-box first, through the SAME dispatcher
  // that runs the rest of the session, so each one can be aimed at the ones
  // already down and the board opens on traffic that is already flowing and
  // already contested — which is the whole theme. Measured: without it a
  // do-nothing player survived 30+ s and won 30-45% of runs.
  const pre = cfg.spawn.preload;
  let shortest = Infinity;
  for (const d of DIRS) {
    shortest = Math.min(shortest, Math.abs(J.near[d] - J.start[d]));
  }
  // Progress is measured against the SHORTEST runway so one fraction is legal on
  // every approach, and the leading vehicle is still kept `minLeadPx` clear of
  // the box — a warm vehicle that opened the run already committed would be a
  // crash the player never had a chance to prevent.
  let maxLen = 0;
  for (const t of cfg.vehicles.types) maxLen = Math.max(maxLen, t.lenFrac * J.laneW);
  const maxStart = shortest - maxLen / 2 - pre.minLeadPx;
  for (let i = 0; i < pre.count; i++) {
    const k = pre.count === 1 ? 0 : i / (pre.count - 1);
    // Nearest the box first: each later vehicle is placed further back, so the
    // dispatcher can aim it at the ones already down.
    const frac = pre.maxProgress + (pre.minProgress - pre.maxProgress) * k;
    const startS = Math.min(shortest * frac, maxStart);
    const typeIndex = pickType(cfg, world.rand);
    const plan = pickSpawn(world, cfg, J, typeIndex, startS);
    if (plan === null) continue;
    const v = makeVehicle(cfg, J, plan.dir, typeIndex, world.nextId++, plan.speedFactor);
    v.s = startS;
    v.along = J.start[plan.dir] + v.sign * startS;
    placeXY(v);
    world.vehicles.push(v);
    world.spawns += 1;
  }
  return world;
}

/** Run stats in the contract the Results screen and the sim both read. */
export function statsOf(world) {
  return {
    score: Math.round(world.score),
    crossed: world.crossed,
    nearMisses: world.nearMisses,
    crashes: world.crashes,
  };
}

function pickType(cfg, rand) {
  const types = cfg.vehicles.types;
  let total = 0;
  for (const t of types) total += t.weight;
  let r = rand() * total;
  for (let i = 0; i < types.length; i++) {
    r -= types[i].weight;
    if (r <= 0) return i;
  }
  return types.length - 1;
}

function laneClear(world, cfg, dir, startS) {
  const minGap = cfg.spawn.minSpawnGapPx;
  for (const v of world.vehicles) {
    if (v.dir !== dir) continue;
    if (Math.abs(v.s - startS) < minGap) return false;
  }
  return true;
}

/**
 * Choose the approach — and the driver — for the next vehicle.
 *
 * Four independent uniform streams almost never contest the junction. Measured
 * on this exact geometry: a 2.4 s cadence against a ~0.8 s overlap window left
 * a do-nothing player with one crash per ~20 s and a 40% win rate for doing
 * nothing at all, i.e. there was no game to play.
 *
 * `spawn.conflictBias` is the dispatcher's thumb on the scale. Most beats it
 * releases the vehicle onto the approach — and hands it the driver — whose
 * predicted arrival collides hardest with something already on the road, so
 * nearly every spawn is a question the player has to answer.
 *
 * Two knobs, not one. The approach alone only offers two distinct arrival times
 * (the vertical run to the box is longer than the horizontal one), which is far
 * too coarse to line a conflict up: the best it could usually manage was a
 * knife-edge miss. Every driver also gets a personal pace inside
 * `vehicles.speedVariance` — some people are simply quicker off the line — and
 * picking that pace gives the dispatcher continuous control over when the
 * vehicle reaches the box. Type share is drawn BEFORE this runs and is never
 * touched here, so risk trucks stay at exactly their authored 10%.
 *
 * `startS` lets the warm start reuse the same aiming for vehicles placed part
 * way down a runway; scheduled spawns always pass 0.
 *
 * Returns `{ dir, speedFactor }`, or null when every approach is backed up.
 */
function pickSpawn(world, cfg, J, typeIndex, startS = 0) {
  const free = [];
  for (const d of DIRS) if (laneClear(world, cfg, d, startS)) free.push(d);
  if (free.length === 0) return null;

  const rand = world.rand;
  const spread = cfg.vehicles.speedVariance;
  const randomPick = () => ({
    dir: free[Math.min(free.length - 1, Math.floor(rand() * free.length))],
    speedFactor: 1 + (rand() - 0.5) * 2 * spread,
  });

  if (world.vehicles.length === 0 || rand() > cfg.spawn.conflictBias) return randomPick();

  const steps = cfg.spawn.paceCandidates;
  const aim = cfg.spawn.aimOverlap;
  let best = null;
  let bestTier = 99;
  let bestDist = Infinity;
  let bestDeadlock = true;

  for (const d of free) {
    for (let k = 0; k < steps; k++) {
      const factor = 1 + spread * (steps === 1 ? 0 : (2 * k) / (steps - 1) - 1);
      const probe = makeVehicle(cfg, J, d, typeIndex, 0, factor);
      if (startS !== 0) {
        probe.s = startS;
        probe.along = J.start[d] + probe.sign * startS;
        placeXY(probe);
      }

      // Score every candidate against every vehicle already on the road, and
      // keep its best target. The comparison is TIERED, not a weighted sum: a
      // candidate that genuinely overlaps always beats one that merely comes
      // close, and only within that does the risk-truck preference apply.
      // (A weighted product was tried first and inverted the priority — a
      // hopeless truck pairing scored better than a perfect car pairing, so the
      // spawner chose approaches that produced no conflict at all.)
      //   tier 0 — real overlap, ONE truck, and it is the one arriving SECOND
      //   tier 1 — real overlap with exactly one truck in the pair
      //   tier 2 — real overlap between two brakeable vehicles
      //   tier 3 — no overlap reachable; keep the nearest miss
      // A truck-versus-truck overlap is not a decision, it is a sentence:
      // neither vehicle can be braked, and if there is no brakeable vehicle
      // ahead in either lane to block with, the crash is unavoidable against a
      // single Claim Cushion. Those pairings are tracked separately and any
      // candidate that creates one loses to any candidate that does not.
      let tier = 99;
      let dist = Infinity;
      let deadlock = false;
      for (const o of world.vehicles) {
        if (o.axis === probe.axis) continue;
        const c = conflictOf(probe, o, cfg);
        if (!c) continue;
        // Ignore vehicles that are already through their shared point.
        if (c.tv + c.half < 0 && c.th + c.half < 0) continue;
        if (c.gap < 0 && !o.brakeable && !probe.brakeable) {
          deadlock = true;
          continue;
        }

        const dd = Math.abs(c.gap + aim * c.half);
        let t;
        if (c.gap >= 0) {
          t = 3;
        } else if (!o.brakeable || !probe.brakeable) {
          // Exactly one truck here — the deadlock case was skipped above.
          const truck = o.brakeable ? probe : o;
          t = c.later === truck ? 0 : 1;
        } else {
          t = 2;
        }
        if (t < tier || (t === tier && dd < dist)) {
          tier = t;
          dist = dd;
        }
      }
      const better = deadlock === bestDeadlock
        ? (tier < bestTier || (tier === bestTier && dist < bestDist))
        : !deadlock;
      if (better) {
        bestDeadlock = deadlock;
        bestTier = tier;
        bestDist = dist;
        best = { dir: d, speedFactor: factor };
      }
    }
  }
  // Nothing on the road is reachable from any approach: fall back to random.
  return best === null || bestTier === 99 ? randomPick() : best;
}

function nextInterval(world, cfg) {
  const sp = cfg.spawn;
  const k = clamp(world.time / sp.rampSeconds, 0, 1);
  const base = sp.startInterval + (sp.endInterval - sp.startInterval) * k;
  return base * (1 + (world.rand() - 0.5) * 2 * sp.jitterFrac);
}

function spawnTick(world, cfg, J, dt, ev) {
  world.spawnTimer -= dt;
  if (world.spawnTimer > 0) return;
  world.spawnTimer += nextInterval(world, cfg);

  const typeIndex = pickType(cfg, world.rand);
  const plan = pickSpawn(world, cfg, J, typeIndex);
  if (plan === null) {
    // Every approach is backed up. Skip the beat rather than stacking vehicles
    // on top of each other at the spawn point — holding traffic costs you the
    // vehicles that never got released.
    world.skipped += 1;
    return;
  }
  const v = makeVehicle(cfg, J, plan.dir, typeIndex, world.nextId++, plan.speedFactor);
  world.vehicles.push(v);
  world.spawns += 1;
  if (ev.onSpawn) ev.onSpawn(v);
}

/**
 * Player action: brake-hold a vehicle, or release one already held.
 *
 * Returns 'hold' | 'release' | 'truck' | 'committed' | 'impatient'.
 *
 * Four refusals, and each one closes a hole rather than adding friction:
 *
 * - `truck` — risk trucks have no brakes. That is the mechanic.
 * - `impatient` — **patience is cumulative and never refunded.** A driver will
 *   wait `hold.maxSeconds` in total across the whole run, however many separate
 *   holds that is spread over; once it is gone they will not stop for you
 *   again. Without this the game has a dominant degenerate strategy: because
 *   the two vertical lanes and the two horizontal lanes are parallel and can
 *   never conflict with their own kind, simply parking the leading N and S
 *   vehicles removes EVERY conflict pair from the board and the run wins
 *   itself. A per-hold timer does not close it — the player just re-taps after
 *   each release, whether the release was theirs or the driver's, and measured
 *   that strategy won 96% of runs at 0.54 taps/s. A cumulative budget does
 *   close it: each vehicle can be delayed for at most `maxSeconds` in its life,
 *   after which it goes and cannot be recalled. Normal play never comes close —
 *   resolving a conflict costs 1-2 s of a 6 s budget.
 * - `committed` — the nose is already in the box, OR the vehicle can no longer
 *   stop short of it (`v² / 2a` against the distance remaining). Braking
 *   distance is real, so testing only the current position would let a tap
 *   latch a hold that carries the vehicle into the box and then refuse to
 *   release it, which measured on 12-16% of expert runs.
 * - A held vehicle can ALWAYS be released, whatever else is true of it.
 */
export function toggleBrake(world, cfg, J, v) {
  if (!v || v.dead || world.over) return null;
  // Release first and unconditionally: a vehicle that rolled past the line
  // while stopping must never become permanently unreleasable.
  if (v.held) {
    v.held = false;
    return 'release';
  }
  if (!v.brakeable) return 'truck';
  if (v.patienceSpent || v.holdTime >= cfg.hold.maxSeconds) return 'impatient';
  if (v.committed) return 'committed';
  const distToNear = v.sign * (J.near[v.dir] - v.along) - v.len / 2;
  if (distToNear < (v.speed * v.speed) / (2 * cfg.vehicles.decel)) return 'committed';
  v.held = true;
  return 'hold';
}

/**
 * Nearest vehicle whose box contains the point.
 *
 * `pad` is the visual slop; on top of it every vehicle is padded out to
 * `hud.minTapTargetPx` on EACH axis independently, so a scooter — 12 px across
 * its short axis on a small handset — still presents a 44 px target in both
 * directions rather than only in the one the flat pad happened to cover.
 */
export function pickVehicle(world, cfg, x, y, pad) {
  const minHalf = cfg.hud.minTapTargetPx / 2;
  let best = null;
  let bestD = Infinity;
  for (const v of world.vehicles) {
    if (v.dead) continue;
    const padX = Math.max(pad, minHalf - v.halfX);
    const padY = Math.max(pad, minHalf - v.halfY);
    if (Math.abs(x - v.x) > v.halfX + padX) continue;
    if (Math.abs(y - v.y) > v.halfY + padY) continue;
    const d = (x - v.x) * (x - v.x) + (y - v.y) * (y - v.y);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

/** True while any part of the vehicle is inside the canvas. */
export function isOnCanvas(v, J) {
  return v.x + v.halfX > 0 && v.x - v.halfX < J.W
    && v.y + v.halfY > 0 && v.y - v.halfY < J.H;
}

/** True once the vehicle's nose is inside the shared centre box. */
function inBox(v, J) {
  const near = J.near[v.dir];
  const far = J.far[v.dir];
  return v.sign * (v.along - near) > -v.len / 2 && v.sign * (v.along - far) < v.len / 2;
}

function nearBox(v, J, pad) {
  return (
    v.x + v.halfX > J.x0 - pad && v.x - v.halfX < J.x1 + pad
    && v.y + v.halfY > J.y0 - pad && v.y - v.halfY < J.y1 + pad
  );
}

function seenBefore(a, b) {
  for (let i = 0; i < a.nm.length; i++) if (a.nm[i] === b.id) return true;
  return false;
}

/**
 * One fixed step of the whole junction.
 *
 * `ev` carries presentation callbacks (spawn, brake, cross, near miss, crash,
 * cushion, impatient release, win, expiry). Every one is optional so the
 * headless sim can pass `{}` and get plain numbers out.
 */
export function stepWorld(world, cfg, J, dt, ev) {
  if (world.over) return;
  const ve = cfg.vehicles;
  const list = world.vehicles;

  world.time += dt;
  spawnTick(world, cfg, J, dt, ev);

  /* -- kinematics ------------------------------------------------------- */
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    v.age += dt;
    if (v.squash > 0) v.squash = Math.max(0, v.squash - dt / cfg.fx.squashSeconds);

    // Impatient driver. `holdTime` is the CUMULATIVE time this vehicle has ever
    // spent stopped for the player, and is never refunded by a release; when it
    // runs out the driver goes and will not stop again. See toggleBrake() for
    // why per-hold timers do not close the park-the-vertical-lanes exploit.
    if (v.held) {
      v.holdTime += dt;
      if (v.holdTime >= cfg.hold.maxSeconds) {
        v.held = false;
        v.patienceSpent = true;
        if (ev.onImpatient) ev.onImpatient(v);
      }
    }

    // Same-lane car following. Vehicles never overtake and never rear-end each
    // other: a blocked lane queues. Only junction overlap is a crash.
    let gap = Infinity;
    for (let j = 0; j < list.length; j++) {
      if (j === i) continue;
      const o = list[j];
      if (o.dir !== v.dir || o.s <= v.s) continue;
      const g = o.s - v.s - (o.len + v.len) / 2;
      if (g < gap) gap = g;
    }

    let target = v.held ? 0 : v.cruise;
    if (gap < ve.stopGapPx) {
      target = 0;
    } else if (gap < ve.followGapPx) {
      const k = (gap - ve.stopGapPx) / (ve.followGapPx - ve.stopGapPx);
      const eased = v.cruise * k;
      if (eased < target) target = eased;
    }

    if (v.speed < target) v.speed = Math.min(target, v.speed + ve.accel * dt);
    else if (v.speed > target) v.speed = Math.max(target, v.speed - ve.decel * dt);

    v.s += v.speed * dt;
    v.along = J.start[v.dir] + v.sign * v.s;
    placeXY(v);

    if (!v.committed && inBox(v, J)) v.committed = true;

    if (!v.crossed && v.sign * (v.along - J.far[v.dir]) >= v.len / 2) {
      v.crossed = true;
      world.crossed += 1;
      world.score += cfg.scoring.crossPoints;
      if (ev.onCross) ev.onCross(v);
      if (world.crossed >= cfg.targetCrossed) {
        world.over = true;
        world.won = true;
        world.endCause = 'target';
        if (ev.onWin) ev.onWin();
      }
    }

    if (v.s >= J.pathLen[v.dir]) v.dead = true;
  }

  /* -- junction: crashes and near misses ---------------------------------
     Only perpendicular pairs can ever overlap (parallel lanes are a full lane
     apart), and only inside the shared box, so the O(n^2) sweep is over a
     handful of vehicles and allocates nothing.

     Skipped entirely once the run is over. The 20th vehicle clearing the box
     ends it THERE: letting a crash land in the same step could overwrite a win
     with a loss, and which one stuck would depend on iteration order, so the
     headless sim and the browser could legitimately disagree about the same
     seed. */
  const pad = cfg.scoring.nearMissGapPx;
  for (let i = 0; !world.over && i < list.length; i++) {
    const a = list[i];
    if (a.dead || !nearBox(a, J, pad)) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead || a.dead) continue;
      if (a.axis === b.axis) continue;
      if (!nearBox(b, J, pad)) continue;

      const gx = Math.abs(a.x - b.x) - (a.halfX + b.halfX);
      const gy = Math.abs(a.y - b.y) - (a.halfY + b.halfY);

      if (gx < 0 && gy < 0) {
        a.dead = true;
        b.dead = true;
        world.crashes += 1;
        const cushioned = world.cushions > 0;
        if (cushioned) world.cushions -= 1;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        if (ev.onCrash) ev.onCrash(a, b, cx, cy, cushioned);
        if (!cushioned) {
          world.over = true;
          world.won = false;
          world.endCause = 'crash';
          return;
        }
        continue;
      }

      const clearance = gx > gy ? gx : gy;
      if (clearance < pad && !seenBefore(a, b)) {
        a.nm.push(b.id);
        b.nm.push(a.id);
        world.nearMisses += 1;
        world.score += cfg.scoring.nearMissPoints;
        if (ev.onNearMiss) ev.onNearMiss(a, b, (a.x + b.x) / 2, (a.y + b.y) / 2, clearance);
      }
    }
  }

  /* -- compaction (in place, no allocation) ------------------------------ */
  let w = 0;
  for (let i = 0; i < list.length; i++) {
    if (!list[i].dead) list[w++] = list[i];
  }
  list.length = w;

  /* -- clock -------------------------------------------------------------- */
  if (!world.over && world.time >= cfg.sessionSeconds) {
    world.over = true;
    world.won = world.crossed >= cfg.targetCrossed;
    world.endCause = 'timeout';
    if (ev.onExpire) ev.onExpire();
  }
}

/**
 * Every live predicted conflict, written into the caller's `pool` and returned
 * as a count. `pool` is only ever grown and its entries are rewritten in place,
 * so neither the render loop nor the sim bot allocates while scanning.
 *
 * A conflict is reported while `gap < margin`; the margin is a small cushion so
 * a pair that is only just going to miss still reads as contested.
 *
 * Pass `J` to restrict the sweep to pairs with at least one vehicle ON CANVAS.
 * Half of every approach runway is off screen, and a conflict between two
 * vehicles the player cannot see yet is not a decision they can make: flagging
 * it pulses a warning ring over an empty road, and acting on it (a bot holding
 * a vehicle seven seconds before it appears) is not play, it is clairvoyance.
 */
export function collectConflicts(world, cfg, pool, margin = 0, J = null) {
  const list = world.vehicles;
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead) continue;
    const aSeen = J === null || isOnCanvas(a, J);
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead || a.axis === b.axis) continue;
      if (!aSeen && J !== null && !isOnCanvas(b, J)) continue;
      const c = conflictOf(a, b, cfg);
      if (!c || c.gap >= margin) continue;
      // Both already through their shared point: nothing left to decide.
      if (c.tv + c.half < 0 && c.th + c.half < 0) continue;
      let e = pool[n];
      if (e === undefined) {
        e = { a: null, b: null, gap: 0, later: null, earlier: null };
        pool[n] = e;
      }
      e.a = a;
      e.b = b;
      e.gap = c.gap;
      e.later = c.later;
      e.earlier = c.earlier;
      n += 1;
    }
  }
  return n;
}
