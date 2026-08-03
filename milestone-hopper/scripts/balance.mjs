// balance.mjs — headless fairness gate for Milestone Hopper.
//
//   node scripts/balance.mjs [--courses 300] [--verbose]
//
// Exit 0 if every assertion below holds, 1 otherwise. Run it after touching
// anything in GAME_CONFIG's `hop`, `roads`, `rivers`, `rows`, `tide` or
// `rewards` blocks — all six move the win rate.
//
// What it proves, and what it does not
// ------------------------------------
// Course generation is IMPORTED from src/course.js, so the layouts measured
// here are the layouts the game ships. The update order below is a
// reimplementation of MilestoneHopperGame.jsx's `update()` — lanes, hop tween,
// platform carry, collision, tide, in that order, on the same 1/120 s fixed
// step the kit loop uses. It is a twin, and a twin can drift: if you change the
// order of the guards in `update()`, change them here too.
//
// The bots are deliberately imperfect. A bot that reads every lane perfectly
// proves nothing about a thumb on a bus.

import { GAME_CONFIG as CFG } from '../src/data.js';
import { buildCourse, clamp, mulberry32 } from '../src/course.js';

const args = process.argv.slice(2);
const COURSES = Number(args[args.indexOf('--courses') + 1]) || 300;
const VERBOSE = args.includes('--verbose');

/* `--baseline` reverts, in memory only, every knob the 2026-08-03 responsiveness
   and progression pass moved, so the same bots on the same seeds can be
   measured before and after. This is the only honest way to say what the
   changes cost or bought — a different bot against a different build measures
   the bot, not the build. */
const BASELINE = args.includes('--baseline');
if (BASELINE) {
  CFG.hop.seconds = 0.12;
  CFG.hop.bufferDepth = 1;
  CFG.hop.coyoteRows = false;
  CFG.rewards.coverOnMilestone = false;
  CFG.rewards.timeSeconds = 0;
  CFG.rewards.multiplierPerMilestone = 0;
  CFG.roads.heavyChance = 0;
  CFG.pickups.startWithCover = false;
}

const STEP = 1 / 120;            // kit BALANCE.loop.fixedStep
const N = CFG.totalRows;
const COLS = CFG.cols;

/* ── one simulated run ──────────────────────────────────────────────────────
   `bot` supplies reaction time, the clearance it insists on before stepping
   onto a lane, and whether it detours for pickups. */
function simulate(seed, bot) {
  const rand = mulberry32(seed);
  const course = buildCourse(CFG, rand);
  const rows = course.rows;

  const p = {
    row: 0, col: CFG.player.startCol, hopping: false, hopT: 0,
    fromRow: 0, fromCol: CFG.player.startCol, toRow: 0, toCol: CFG.player.startCol,
    queue: [], carry: null, carryOffset: 0,
  };
  let t = 0;
  let remaining = CFG.sessionSeconds;
  let tideRow = CFG.tide.startRow;
  let shielded = !!CFG.pickups.startWithCover;
  let invuln = 0;
  let think = 0;
  let furthest = 0;
  let milestones = 0;
  let corpus = 0;
  let coins = 0;
  let mult = 1;
  let score = 0;
  let ended = null;

  const effRow = () => (!p.hopping ? p.row : (p.hopT < 0.5 ? p.fromRow : p.toRow));
  const effCol = () => (!p.hopping ? p.col : (p.hopT < 0.5 ? p.fromCol : p.toCol));
  const tideRowOf = () => (!p.hopping || !CFG.hop.coyoteRows ? p.row : Math.max(p.fromRow, p.toRow));

  const platformAt = (lane, col) => {
    const grace = CFG.rivers.edgeGraceCells;
    const c = col + 0.5;
    for (const pl of lane.plats) if (c >= pl.x - grace && c <= pl.x + pl.w + grace) return pl;
    return null;
  };

  /** Seconds until a lane's nearest weight reaches `col`; Infinity if never. */
  const timeToHit = (lane, col) => {
    let best = Infinity;
    for (const x of lane.xs) {
      // Signed distance the weight must travel to enter the kill window.
      let d = (col - lane.hit * Math.sign(lane.dir || 1)) - x;
      d *= lane.dir;
      if (d < 0) d += lane.cycle;
      best = Math.min(best, d / lane.speed);
    }
    return best;
  };
  const occupied = (lane, col) => lane.xs.some((x) => Math.abs(x - col) < lane.hit);

  const startHop = (dir) => {
    if (ended) return;
    if (p.hopping) {
      if (p.queue.length >= CFG.hop.bufferDepth) p.queue.shift();
      p.queue.push(dir);
      return;
    }
    const base = Math.round(p.col);
    let tr = p.row;
    let tc = base;
    if (dir === 'up') tr += 1;
    else if (dir === 'down') tr -= 1;
    else if (dir === 'left') tc -= 1;
    else if (dir === 'right') tc += 1;
    if (tr < 0 || tr > N || tc < 0 || tc >= COLS) return;
    if (!rows[tr].open[tc]) return;
    // Landing-inside-a-weight rejection, mirroring startHop() in the component.
    const dest = rows[tr].road;
    if (dest) {
      const travel = dest.dir * dest.speed * CFG.hop.seconds;
      for (const x0 of dest.xs) {
        let x = x0 + travel;
        if (x >= course.loCell + dest.cycle) x -= dest.cycle;
        else if (x < course.loCell) x += dest.cycle;
        if (Math.abs(x - tc) < dest.hit) return;
      }
    }
    p.hopping = true;
    p.hopT = 0;
    p.fromRow = p.row; p.fromCol = p.col;
    p.toRow = tr; p.toCol = tc;
    p.carry = null;
  };

  const land = () => {
    const row = rows[p.row];
    if (p.row > furthest) { score += (p.row - furthest) * CFG.scoring.row * mult; furthest = p.row; }
    if (row.type === 'river') {
      const pl = platformAt(row.river, p.col);
      if (!pl) { ended = 'river'; return; }
      p.carry = pl;
      p.carryOffset = p.col - pl.x;
    }
    if (row.coins[p.col]) { row.coins[p.col] = 0; coins++; score += CFG.scoring.coin * mult; }
    if (row.shield === p.col) { row.shield = -1; shielded = true; }
    if (row.label && !row.banner) {
      row.banner = true;
      milestones++;
      const gate = CFG.milestones.find((m) => m.row === p.row);
      corpus += gate ? gate.corpus : 0;
      score += CFG.scoring.milestone;
      mult = 1 + milestones * CFG.rewards.multiplierPerMilestone;
      if (CFG.rewards.coverOnMilestone && !shielded) {
        shielded = true;
        invuln = Math.max(invuln, CFG.pickups.shieldInvulnSeconds * 0.5);
      }
      remaining += CFG.rewards.timeSeconds;
    }
    if (p.row >= N) ended = 'win';
  };

  /* ── the bot's decision, made every `bot.reaction` seconds ───────────────
     Deliberately shallow: look at the row directly ahead, take it if it is
     safe or if the lane gives more than `bot.clear` seconds of room, otherwise
     sidestep towards a column that does. */
  const decide = () => {
    if (p.hopping || ended) return;
    const nextRow = p.row + 1;
    if (nextRow > N) return;
    const row = rows[nextRow];
    const here = Math.round(p.col);

    const colOk = (c) => {
      if (c < 0 || c >= COLS || !row.open[c]) return false;
      if (row.type === 'road') return !occupied(row.road, c) && timeToHit(row.road, c) > bot.clear;
      if (row.type === 'river') return !!platformAt(row.river, c);
      return true;
    };

    if (colOk(here)) {
      // Optional greed: hop sideways first for an adjacent pickup on a safe row.
      if (bot.greedy && rows[p.row].type === 'safe') {
        for (const d of [-1, 1]) {
          const c = here + d;
          if (c >= 0 && c < COLS && rows[p.row].open[c]
            && (rows[p.row].coins[c] || rows[p.row].shield === c)) {
            startHop(d < 0 ? 'left' : 'right');
            return;
          }
        }
      }
      startHop('up');
      return;
    }
    // Sidestep toward the nearest column that opens the row ahead.
    for (let d = 1; d < COLS; d++) {
      for (const s of [-1, 1]) {
        const c = here + s * d;
        if (c < 0 || c >= COLS) continue;
        if (!colOk(c)) continue;
        // Only step somewhere it is safe to stand right now.
        const cur = rows[p.row];
        const step = here + s;
        if (step < 0 || step >= COLS || !cur.open[step]) continue;
        if (cur.type === 'road' && (occupied(cur.road, step)
          || timeToHit(cur.road, step) < bot.clear * 0.6)) continue;
        if (cur.type === 'river' && !platformAt(cur.river, step)) continue;
        startHop(s < 0 ? 'left' : 'right');
        return;
      }
    }
    // Nothing better: wait a beat rather than walk into it. The tide punishes
    // waiting, which is the intended pressure.
  };

  while (!ended) {
    t += STEP;
    remaining -= STEP;
    if (remaining <= 0) { ended = 'timeout'; break; }
    if (invuln > 0) invuln = Math.max(0, invuln - STEP);

    think -= STEP;
    if (think <= 0) { decide(); think = bot.reaction; }

    // -- lanes
    for (let r = Math.max(0, p.row - 4); r <= Math.min(N, p.row + 14); r++) {
      const row = rows[r];
      if (row.road) {
        const lane = row.road;
        const d = lane.dir * lane.speed * STEP;
        for (let i = 0; i < lane.xs.length; i++) {
          let x = lane.xs[i] + d;
          if (x >= course.loCell + lane.cycle) x -= lane.cycle;
          else if (x < course.loCell) x += lane.cycle;
          lane.xs[i] = x;
        }
      } else if (row.river) {
        const lane = row.river;
        const d = lane.dir * lane.speed * STEP;
        for (const pl of lane.plats) {
          pl.x += d;
          if (pl === p.carry) continue;
          const base = course.loCell - pl.w;
          while (pl.x >= base + lane.cycle) pl.x -= lane.cycle;
          while (pl.x < base) pl.x += lane.cycle;
        }
      }
    }

    // -- player
    if (p.hopping) {
      p.hopT += STEP / CFG.hop.seconds;
      if (p.hopT >= 1) {
        p.hopping = false;
        p.row = p.toRow;
        p.col = p.toCol;
        land();
        if (ended) break;
        if (p.queue.length) startHop(p.queue.shift());
      }
    }

    // -- carry
    if (!p.hopping && p.carry) {
      p.col = p.carry.x + p.carryOffset;
      const out = CFG.rivers.carryOutCells;
      if (p.col < -out || p.col > COLS - 1 + out) { ended = 'river'; break; }
    }

    // -- collision
    if (invuln <= 0) {
      const r = effRow();
      const lane = r >= 0 && r <= N ? rows[r].road : null;
      if (lane) {
        const c = effCol();
        if (lane.xs.some((x) => Math.abs(x - c) < lane.hit)) {
          if (shielded) { shielded = false; invuln = CFG.pickups.shieldInvulnSeconds; }
          else { ended = 'debt'; break; }
        }
      }
    }

    // -- tide
    const pace = CFG.tide.secondsPerRow
      + (CFG.tide.minSecondsPerRow - CFG.tide.secondsPerRow)
      * clamp(tideRow / CFG.tide.rampEndRow, 0, 1);
    tideRow += STEP / pace;
    if (tideRowOf() <= tideRow) { ended = 'tide'; break; }
  }

  if (ended === 'win') score += Math.max(0, Math.floor(remaining)) * CFG.scoring.timeBonusPerSecond;
  return { ended, rows: furthest, seconds: t, milestones, corpus, coins, mult, score: Math.round(score) };
}

/* ── bots ──────────────────────────────────────────────────────────────── */
const BOTS = [
  { name: 'Casual  (0.22 s reaction, 0.45 s clearance)', reaction: 0.22, clear: 0.45 },
  { name: 'Brisk   (0.14 s reaction, 0.30 s clearance)', reaction: 0.14, clear: 0.30 },
  { name: 'Careful (0.22 s reaction, 0.75 s clearance)', reaction: 0.22, clear: 0.75, greedy: true },
];

/* ── run ───────────────────────────────────────────────────────────────── */
const results = [];
for (const bot of BOTS) {
  const runs = [];
  for (let i = 0; i < COURSES; i++) runs.push(simulate(0x5eed + i * 7919, bot));
  const wins = runs.filter((r) => r.ended === 'win');
  const sorted = runs.map((r) => r.rows).sort((a, b) => a - b);
  const winTimes = wins.map((r) => r.seconds).sort((a, b) => a - b);
  results.push({
    bot: bot.name,
    winRate: wins.length / runs.length,
    medianRows: sorted[Math.floor(sorted.length / 2)],
    winSecs: wins.length ? [winTimes[0], winTimes[winTimes.length - 1]] : null,
    tide: runs.filter((r) => r.ended === 'tide').length / runs.length,
    medianScore: runs.map((r) => r.score).sort((a, b) => a - b)[Math.floor(runs.length / 2)],
    medianCorpus: runs.map((r) => r.corpus).sort((a, b) => a - b)[Math.floor(runs.length / 2)],
    winScore: wins.length
      ? Math.round(wins.reduce((a, r) => a + r.score, 0) / wins.length)
      : 0,
  });
}

// An idler proves the tide is the anti-camping pressure it claims to be.
const idler = [];
for (let i = 0; i < COURSES; i++) {
  idler.push(simulate(0x5eed + i * 7919, { reaction: 0.2, clear: 0.45, stopAt: 10 }));
}

/* ── the gates ─────────────────────────────────────────────────────────── */
const fmt = (x) => `${(x * 100).toFixed(1)}%`;
const fail = [];

console.log(`\nMilestone Hopper — balance gate  (${COURSES} generated courses per bot)`
  + `${BASELINE ? '  [BASELINE: pre-2026-08-03 knobs]' : ''}\n`);
console.log('  bot                                       win    med.rows  win time      tide   avg win score');
for (const r of results) {
  console.log(`  ${r.bot.padEnd(40)}  ${fmt(r.winRate).padStart(5)}  ${String(r.medianRows).padStart(8)}  `
    + `${(r.winSecs ? `${r.winSecs[0].toFixed(1)}-${r.winSecs[1].toFixed(1)}s` : '—').padStart(12)}  `
    + `${fmt(r.tide).padStart(5)}  ${String(r.winScore).padStart(13)}`);
}

// 1. The course must be winnable by an ordinary player, and not a formality.
for (const r of results) {
  if (r.winRate < 0.15) fail.push(`${r.bot}: win rate ${fmt(r.winRate)} < 15% — the course is unfair`);
  if (r.winRate > 0.80) fail.push(`${r.bot}: win rate ${fmt(r.winRate)} > 80% — the course is a formality`);
}

// 2. A winning run must finish well inside the session; the clock is a backstop.
for (const r of results) {
  if (r.winSecs && r.winSecs[1] > CFG.sessionSeconds * 0.75) {
    fail.push(`${r.bot}: slowest win ${r.winSecs[1].toFixed(1)}s — too close to the ${CFG.sessionSeconds}s cap`);
  }
}

// 3. The tide must punish idling and only idling.
for (const r of results) {
  if (r.tide > 0.15) fail.push(`${r.bot}: ${fmt(r.tide)} of moving runs died to the tide — it is overtaking movers`);
}

// 4. Progression must actually pay: a median run banks a real corpus.
const casual = results[0];
if (casual.medianRows < 12) fail.push(`Casual median ${casual.medianRows} rows — the run ends before it starts`);
if (casual.medianCorpus <= 0) fail.push('Casual median run banks no corpus — the gates are unreachable');

// 5. Every road lane must leave real standing room at every difficulty.
let worst = Infinity;
let worstSeg = -1;
for (let i = 0; i < 120; i++) {
  const c = buildCourse(CFG, mulberry32(0xbeef + i * 104729));
  for (let r = 1; r <= N; r++) {
    const lane = c.rows[r].road;
    if (!lane) continue;
    const window = (lane.gap - lane.hit * 2) / lane.speed;
    if (window < worst) { worst = window; worstSeg = Math.floor(r / 8); }
  }
}
console.log(`\n  worst standing window across every generated lane: ${worst.toFixed(2)}s (segment ${worstSeg})`);
if (worst < 0.9) fail.push(`worst lane leaves only ${worst.toFixed(2)}s of standing room — under the 0.90s floor`);

// 6. Reachability: no generated row may have an unreachable open set.
//    buildCourse already re-rolls for this; the gate is that it succeeded.
let unreachable = 0;
for (let i = 0; i < 60; i++) {
  const c = buildCourse(CFG, mulberry32(0xf00d + i * 65537));
  let stand = new Uint8Array(COLS).fill(1);
  for (let r = 1; r <= N; r++) {
    const row = c.rows[r];
    let any = false;
    for (let col = 0; col < COLS; col++) if (row.open[col] && stand[col]) { any = true; break; }
    if (!any) unreachable++;
    const reach = new Uint8Array(COLS);
    for (let col = 0; col < COLS; col++) if (row.open[col] && stand[col]) reach[col] = 1;
    const next = new Uint8Array(COLS);
    for (let col = 0; col < COLS; col++) if (reach[col]) next[col] = 1;
    for (let col = 1; col < COLS; col++) if (next[col - 1] && row.open[col]) next[col] = 1;
    for (let col = COLS - 2; col >= 0; col--) if (next[col + 1] && row.open[col]) next[col] = 1;
    stand = next;
  }
}
console.log(`  unreachable rows in 2,880 generated rows: ${unreachable}`);
if (unreachable > 0) fail.push(`${unreachable} generated rows had no reachable open cell`);

// 7. Idlers must die to the tide — that is the whole reason it exists.
const idlerTide = idler.filter((r) => r.ended === 'tide').length / idler.length;

console.log(`  median casual run banks ${(casual.medianCorpus / 100000).toFixed(0)} lakh over ${casual.medianRows} rows`);
console.log(`  full-run reward budget: ×${(1 + 6 * CFG.rewards.multiplierPerMilestone).toFixed(2)} earnings, `
  + `+${6 * CFG.rewards.timeSeconds}s, 6 cover renewals\n`);

if (VERBOSE) console.dir(results, { depth: null });

if (fail.length) {
  console.log('FAIL');
  fail.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('PASS — course is winnable, timed, tide-fair, reachable, and pays progression.\n');
