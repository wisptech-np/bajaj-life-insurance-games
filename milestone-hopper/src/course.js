// course.js — pure course generation for Milestone Hopper.
//
// Extracted from MilestoneHopperGame.jsx so scripts/balance.mjs measures the
// generator the game actually ships rather than a hand-copied twin that drifts
// away from it. Nothing in here touches the DOM, canvas, React or the kit, so
// it imports cleanly into Node.
/* ─── Math ───────────────────────────────────────────────── */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Small deterministic PRNG so a course can be reproduced from one seed. */
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

/** Difficulty segment for a row, 0..5. Segment 6 (row 48) reuses the last ramp. */
export const segOf = (row) => clamp(Math.floor(row / 8), 0, 5);

/* ─── Course generation ──────────────────────────────────── */

/**
 * Cells of row r-1 the player can actually stand on, given the cells they can
 * land on. Sideways hops are free within a row, so a landing cell spreads left
 * and right until a blocked cell stops it. Two linear passes, no allocation
 * beyond the result.
 */
export function spreadStandable(reach, open, cols) {
  const stand = new Uint8Array(cols);
  for (let c = 0; c < cols; c++) if (reach[c]) stand[c] = 1;
  for (let c = 1; c < cols; c++) if (stand[c - 1] && open[c]) stand[c] = 1;
  for (let c = cols - 2; c >= 0; c--) if (stand[c + 1] && open[c]) stand[c] = 1;
  return stand;
}

export function pickTreeCount(cfg, rand) {
  const table = cfg.rows.treeChance;
  const roll = rand();
  let acc = 0;
  for (let i = 0; i < table.length; i++) {
    acc += table[i];
    if (roll < acc) return i;
  }
  return 0;
}

/**
 * One expense lane. Two kinds, chosen per lane:
 *
 *   light — a stream of small debt weights. A timing problem: read the gap,
 *           commit, cross.
 *   heavy — one or two wide, slow EMI blocks. A positioning problem: the gap is
 *           never in doubt, but the block is nearly three cells wide, so you go
 *           around it rather than through it.
 *
 * They are the same colour grammar and the same rule (contact ends the run) but
 * ask different questions, which is what stops every road row playing the same.
 */
export function makeRoadLane(cfg, rand, seg, spanCells, loCell) {
  const t = clamp(seg / 5, 0, 1);
  const heavy = rand() < cfg.roads.heavyChance;
  const base = lerp(cfg.roads.minSpeed, cfg.roads.maxSpeed, t)
    * (heavy ? cfg.roads.heavySpeedFactor : 1);
  const speedPx = clamp(
    base * (0.85 + rand() * 0.3),
    cfg.roads.minSpeed * 0.8 * (heavy ? cfg.roads.heavySpeedFactor : 1),
    cfg.roads.maxSpeed,
  );
  const speed = speedPx / cfg.roads.refCellPx; // cells per second
  const hit = heavy ? cfg.roads.heavyHitCells : cfg.roads.hitCells;
  const maxCount = heavy ? cfg.roads.heavyMaxCount : cfg.roads.maxWeights;

  // Two floors on the spacing: the authored minimum in cells, and whatever this
  // lane's speed needs for the player to have `gapSeconds` of standing room in
  // the widest part of the gap. Deriving spacing from the binding floor is what
  // keeps every lane crossable at every difficulty (see README). The heavy lane
  // uses its own (much wider) hit box in that sum, so its slabs are spaced for
  // the same standing time rather than being quietly harder.
  const stand = lerp(cfg.roads.gapSeconds[0], cfg.roads.gapSeconds[1], t);
  let gap = Math.max(cfg.roads.minGapCells, speed * stand + hit * 2);

  // Weight count ramps with the segment for visual density, but never below
  // what it takes for the wrap cycle to outrun the visible span — otherwise a
  // lane would show two copies of the same weight.
  const design = heavy ? maxCount : Math.round(lerp(2, cfg.roads.maxWeights, t));
  const count = clamp(
    Math.max(design, Math.ceil((spanCells + 1) / gap)),
    1,
    maxCount,
  );
  if (count * gap < spanCells + 1) gap = (spanCells + 1) / count;
  const cycle = count * gap;

  const xs = new Float32Array(count);
  const phases = new Float32Array(count);
  const phase = rand() * gap;
  for (let i = 0; i < count; i++) {
    xs[i] = loCell + phase + i * gap;
    phases[i] = rand() * Math.PI * 2;
  }
  return { dir: rand() < 0.5 ? -1 : 1, speed, xs, phases, gap, cycle, heavy, hit };
}

/**
 * One river lane: coverage platforms laid out around a wrap cycle. Platforms get
 * narrower and gaps wider with the segment, which is the river's difficulty ramp.
 */
export function makeRiverLane(cfg, rand, seg, spanCells, loCell) {
  const t = clamp(seg / 5, 0, 1);
  const speedPx = lerp(cfg.rivers.platformSpeed[0], cfg.rivers.platformSpeed[1], t)
    * (0.85 + rand() * 0.3);
  const speed = speedPx / cfg.roads.refCellPx;
  const wideBias = lerp(0.72, 0.24, t);
  const wNarrow = cfg.rivers.platformCells[0];
  const wWide = cfg.rivers.platformCells[1];

  const plats = [];
  // The cycle has to outrun the visible span plus one platform, otherwise two
  // copies of the same platform can be on screen at once.
  const minCycle = spanCells + 4;
  let cursor = loCell;
  let cycle = 0;
  while (cycle < minCycle) {
    const w = rand() < wideBias ? wWide : wNarrow;
    const g = lerp(
      cfg.rivers.gapCells[0],
      cfg.rivers.gapCells[1],
      clamp(t * 0.6 + rand() * 0.55, 0, 1),
    );
    plats.push({ x: cursor, w, phase: rand() * Math.PI * 2 });
    cursor += w + g;
    cycle += w + g;
  }
  return { dir: rand() < 0.5 ? -1 : 1, speed, plats, cycle };
}

/**
 * Build the whole course once per mount.
 *
 * Lane types come first so the river bank rule can rewrite neighbours, then the
 * per-row contents. Safe rows get 0-2 blocking planters, and every safe row is
 * checked against the previous row's standable set: a row whose open cells are
 * all unreachable is regenerated, and failing that, cleared. A course that
 * cannot be walked is not a difficulty spike, it is a bug.
 */
export function buildCourse(cfg, rand) {
  const N = cfg.totalRows;
  const cols = cfg.cols;
  const loCell = -cfg.roads.spawnMarginCells;
  const spanCells = cols - 1 + cfg.roads.spawnMarginCells * 2;

  /* -- 1. lane types --------------------------------------------------- */
  const types = new Array(N + 1);
  types[0] = 'safe';
  let riverRun = 0;
  let roadRun = 0;
  for (let r = 1; r <= N; r++) {
    if (cfg.milestoneRows[r]) { types[r] = 'goal'; riverRun = 0; roadRun = 0; continue; }
    if (r <= cfg.rows.clearUntilRow) { types[r] = 'safe'; riverRun = 0; roadRun = 0; continue; }
    const t = clamp(segOf(r) / 5, 0, 1);
    // A road run that has hit its cap gets a safe island whatever the roll says:
    // the player has to have somewhere to stand and read the next lane from.
    if (roadRun >= cfg.rows.maxRoadRun
      || rand() < lerp(cfg.rows.safeChanceStart, cfg.rows.safeChanceEnd, t)) {
      types[r] = 'safe';
      riverRun = 0;
      roadRun = 0;
    } else if (
      r > cfg.rivers.afterRow
      && riverRun < cfg.rivers.maxConsecutive
      && rand() < cfg.rivers.chance
    ) {
      types[r] = 'river';
      riverRun += 1;
      roadRun = 0;
    } else {
      types[r] = 'road';
      riverRun = 0;
      roadRun += 1;
    }
  }

  // Rivers get banks. A road on either side of a crossing leaves the player
  // nowhere safe to read the platform pattern from, and nowhere safe to land
  // coming off one — and unlike a road, a river cannot be waited out in place.
  for (let r = 1; r <= N; r++) {
    if (types[r] !== 'river') continue;
    if (r - 1 >= 1 && types[r - 1] === 'road') types[r - 1] = 'safe';
    if (r + 1 <= N && types[r + 1] === 'road') types[r + 1] = 'safe';
  }

  /* -- 2. row contents + reachability ---------------------------------- */
  const rows = new Array(N + 1);
  const allOpen = () => {
    const a = new Uint8Array(cols);
    a.fill(1);
    return a;
  };

  rows[0] = {
    type: 'safe', open: allOpen(), trees: [], coins: new Uint8Array(cols), shield: -1,
    road: null, river: null, label: null,
  };
  let standPrev = allOpen();

  for (let r = 1; r <= N; r++) {
    const type = types[r];
    const seg = segOf(r);
    const open = allOpen();
    let trees = [];

    if (type === 'safe' && r > cfg.rows.clearUntilRow) {
      for (let attempt = 0; attempt < 6; attempt++) {
        trees = [];
        open.fill(1);
        const n = pickTreeCount(cfg, rand);
        for (let i = 0; i < n; i++) {
          const c = Math.floor(rand() * cols);
          if (!open[c]) continue;
          open[c] = 0;
          trees.push(c);
        }
        let reachable = false;
        for (let c = 0; c < cols; c++) if (open[c] && standPrev[c]) { reachable = true; break; }
        if (reachable) break;
        if (attempt === 5) { trees = []; open.fill(1); }
      }
    }

    const reach = new Uint8Array(cols);
    for (let c = 0; c < cols; c++) if (open[c] && standPrev[c]) reach[c] = 1;

    rows[r] = {
      type,
      open,
      trees,
      coins: new Uint8Array(cols),
      shield: -1,
      road: type === 'road' ? makeRoadLane(cfg, rand, seg, spanCells, loCell) : null,
      river: type === 'river' ? makeRiverLane(cfg, rand, seg, spanCells, loCell) : null,
      label: cfg.milestoneRows[r] || null,
      banner: false,
    };

    standPrev = spreadStandable(reach, open, cols);
  }

  /* -- 3. pickups ------------------------------------------------------ */
  // Coins sit on open cells of safe rows only: never under a planter, never on
  // a lane, where the "reward" is a cell a debt weight is scheduled to occupy.
  for (let r = 1; r <= N; r++) {
    const row = rows[r];
    if (row.type !== 'safe') continue;
    for (let c = 0; c < cols; c++) {
      if (row.open[c] && rand() < cfg.pickups.coinChance) row.coins[c] = 1;
    }
  }

  // One shield token per 8-row segment, on a clear cell that is not a coin.
  const segCount = Math.ceil(N / 8);
  for (let sgi = 0; sgi < segCount; sgi++) {
    const from = sgi * 8 + 1;
    const to = Math.min(N, sgi * 8 + 8);
    const picks = [];
    for (let r = from; r <= to; r++) {
      const row = rows[r];
      if (row.type !== 'safe') continue;
      for (let c = 0; c < cols; c++) if (row.open[c] && !row.coins[c]) picks.push(r * cols + c);
    }
    if (!picks.length) continue;
    for (let k = 0; k < cfg.pickups.shieldPerSegment && picks.length; k++) {
      const idx = Math.floor(rand() * picks.length);
      const key = picks.splice(idx, 1)[0];
      rows[Math.floor(key / cols)].shield = key % cols;
    }
  }

  return { rows, spanCells, loCell };
}
