// data.js — Premium Tiles: every tunable, the melody, and the tile chart.
//
// Financial hook: a premium on every note. Blue premium tiles fall in four
// lanes; every one the player taps plays the NEXT note of a real melody, so a
// clean run literally performs the song and a dropped payment breaks the music.
//
// Everything a designer might retune lives in GAME_CONFIG. The chart is built
// deterministically from `chartSeed` by buildChart(), so every player performs
// the same ~90-second song and balance changes are reviewable diffs, not dice.

export const COLORS = {
  blue: '#003DA6',
  blueBright: '#1E6BE0',
  blueGlow: '#7FC0FF',
  orange: '#F26522',
  orangeBright: '#FF8A3D',
  green: '#28A745',
  greenBright: '#41D96B',
  red: '#E23B3B',
  redDark: '#8F1D1D',
  bg: '#0B1221',
  white: '#FFFFFF',
};

export const GAME_CONFIG = {
  lanes: 4,

  layout: {
    /** Vertical distance between consecutive chart rows, fraction of playfield height. */
    rowSpacingFrac: 0.375,
    /** Tile height, fraction of playfield height (~2 tiles/second at base speed). */
    tileHeightFrac: 0.135,
    /** The DUE line. A blue tile that fully crosses it untapped is a missed premium. */
    failLineFrac: 0.86,
    /** Tile-centre band above the DUE line that scores a Perfect (lower third of travel). */
    perfectBandFrac: 0.29,
    /** Horizontal inset of a tile inside its lane, px. */
    tileInsetPx: 5,
  },

  speed: {
    /** Base fall speed: 55% of screen height per second. */
    baseFrac: 0.55,
    /** Stepped ramp: +10% every 15 s with a SPEED UP flash. Steps, not creep. */
    stepEverySeconds: 15,
    stepFactor: 1.10,
    capMultiplier: 1.7,
  },

  lives: 3,

  chart: {
    chartSeed: 20260729,
    /** Chart rows. Doubles add a second tile per row → ~160 scorable tiles total. */
    rows: 150,
    /** Opening rows are always single taps so the first bars teach the loop. */
    easyIntroRows: 6,
    /** Closing rows are always single taps for a clean cadence. */
    easyOutroRows: 3,
    /** HOLD tiles (sustained note) enter the chart at 20 s. */
    holdEnterSeconds: 20,
    holdChance: 0.14,
    /** Hold tile length in row-spacing units [min, max]. */
    holdSpanRows: [1.4, 2.1],
    /** Extra breathing room after a hold, row-spacing units. */
    holdGapRows: 0.5,
    /** DOUBLE tiles (two lanes, both within the pairing window) enter at 40 s. */
    doubleEnterSeconds: 40,
    doubleChance: 0.11,
    /** RED risk tiles ("Impulse buy" / "Scam call") — must NOT be tapped. */
    redEnterSeconds: 12,
    redChance: 0.18,
    /** Hard cap: reds stay ≤10% of scorable tiles, and never adjacent to a double. */
    redMaxFrac: 0.10,
  },

  timing: {
    /** Taps still count this long after a tile's bottom edge crosses the DUE line.
        Implemented as: a tile only fails once it has FULLY crossed (one tile
        height past the line), which at every speed is later than bottom+120 ms —
        tileHeight / maxSpeed = 0.135H / 0.935H·s⁻¹ ≈ 144 ms of grace. */
    lateGraceSeconds: 0.12,
    /** Both halves of a DOUBLE must land within this window of each other. */
    doublePairSeconds: 0.10,
    /** Hold tiles bank +1 for every 200 ms held. */
    holdTickSeconds: 0.20,
  },

  scoring: {
    tile: 1,
    perfectTile: 2,
    /** Consecutive-hit thresholds for ×2 / ×3 / ×4. A miss resets to ×1. */
    comboThresholds: [25, 50, 75],
    comboMultipliers: [2, 3, 4],
  },

  /** Star rating on a WIN, by Perfect percentage of scorable tiles. */
  stars: { one: 0.50, two: 0.75, three: 0.90 },

  antiMash: {
    /** If more than maxTaps land inside windowSeconds with accuracy below
        minAccuracy, every extra tap counts as a miss — mashing loses. */
    windowSeconds: 1.0,
    maxTaps: 8,
    minAccuracy: 0.5,
  },

  /** Anti-pause-scum + fairness beats. All world freezes hold the tape AND the
      session clock behind a visible count, so backgrounding the tab buys
      nothing (see PremiumTilesGame.jsx). */
  reacquire: {
    /** 3-2-1 freeze after the kit auto-pause releases (visibilitychange). */
    freezeSeconds: 1.5,
    /** Brief live beat after the count during which taps are still refused. */
    lockSeconds: 0.25,
    /** Damage stun: world frozen while the offending tile clears. */
    lifeLostFreezeSeconds: 0.5,
    /** Shorter 3-2-1 after a life is lost, before play resumes. */
    lifeLostCountSeconds: 0.9,
    /** Opening GET READY count before the first tile moves. */
    introSeconds: 1.5,
  },

  audio: {
    masterGain: 0.5,
    pluckDecaySeconds: 0.38,
    holdReleaseSeconds: 0.14,
    wrongFreq: 110,
    wrongSeconds: 0.15,
  },

  /** End-of-run panel delay so the last note and pop can breathe. */
  endDelaySeconds: 1.1,
};

/* ─── Melody ─────────────────────────────────────────────────────────────────
   An upbeat C-major-pentatonic folk tune, 160 notes: 20 eight-note phrases in
   a call-and-answer song form that resolves to C and loops musically if a run
   ever wraps the chart. Stored as note names, exported as frequencies (Hz). */

const NOTE_FREQ = {
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

const P1 = ['C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4']; // home
const P2 = ['D4', 'E4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4']; // answer
const P3 = ['G4', 'A4', 'C5', 'A4', 'G4', 'E4', 'G4', 'A4']; // lift
const P4 = ['C5', 'A4', 'G4', 'E4', 'D4', 'E4', 'C4', 'C4']; // resolve
const P5 = ['E4', 'G4', 'A4', 'C5', 'D5', 'C5', 'A4', 'G4']; // climb
const P6 = ['A4', 'C5', 'D5', 'E5', 'D5', 'C5', 'A4', 'G4']; // peak
const P7 = ['G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'A4']; // turn
const P8 = ['C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', 'A4']; // soar

const SONG = [
  P1, P2, P1, P3,
  P4, P5, P6, P4,
  P1, P2, P7, P8,
  P5, P6, P8, P4,
  P1, P3, P7, P4,
];

/** The melody as frequencies. One successful tile = one note, in order. */
export const MELODY = SONG.flat().map((n) => NOTE_FREQ[n]);

/* ─── Chart ──────────────────────────────────────────────────────────────────
   Deterministic build. Row 0 arrives first. Each row:
     kind   'tap' | 'hold' | 'double'
     lanes  [lane] or [laneA, laneB] (double)
     span   visual length in row-spacing units (1 for tap/double)
     red    lane index of an attached RED risk tile, or -1
     posU   tape position in row-spacing units (cumulative, includes hold gaps)
     timeAt nominal arrival time at the DUE line, seconds (drives type gates) */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildChart(cfg = GAME_CONFIG) {
  const rnd = mulberry32(cfg.chart.chartSeed);
  const { rows: rowCount, easyIntroRows, easyOutroRows } = cfg.chart;
  const rows = [];

  /** Tape speed in row-spacing units per second at a given multiplier. */
  const unitsPerSec = (mult) => (cfg.speed.baseFrac * mult) / cfg.layout.rowSpacingFrac;

  let t = 0;
  let posU = 0;
  let prevKind = 'tap';
  let prevLane = -1;
  let holds = 0;
  let doubles = 0;

  for (let i = 0; i < rowCount; i++) {
    const level = Math.floor(t / cfg.speed.stepEverySeconds);
    const mult = Math.min(cfg.speed.capMultiplier, Math.pow(cfg.speed.stepFactor, level));

    let kind = 'tap';
    const plain = i < easyIntroRows || i >= rowCount - easyOutroRows;
    if (!plain) {
      if (t >= cfg.chart.doubleEnterSeconds && prevKind !== 'double' && rnd() < cfg.chart.doubleChance) {
        kind = 'double';
        doubles += 1;
      } else if (t >= cfg.chart.holdEnterSeconds && prevKind !== 'hold' && rnd() < cfg.chart.holdChance) {
        kind = 'hold';
        holds += 1;
      }
    }

    let lanes;
    if (kind === 'double') {
      const a = Math.floor(rnd() * cfg.lanes);
      let b = Math.floor(rnd() * (cfg.lanes - 1));
      if (b >= a) b += 1;
      lanes = [Math.min(a, b), Math.max(a, b)];
    } else {
      let lane = Math.floor(rnd() * cfg.lanes);
      if (lane === prevLane) lane = (lane + 1 + Math.floor(rnd() * (cfg.lanes - 1))) % cfg.lanes;
      lanes = [lane];
    }

    const span = kind === 'hold'
      ? cfg.chart.holdSpanRows[0] + rnd() * (cfg.chart.holdSpanRows[1] - cfg.chart.holdSpanRows[0])
      : 1;

    rows.push({ kind, lanes, span, red: -1, posU, timeAt: t });

    prevKind = kind;
    prevLane = lanes[0];
    const gap = kind === 'hold' ? span + cfg.chart.holdGapRows : 1;
    posU += gap;
    t += gap / unitsPerSec(mult);
  }

  // Second pass: attach RED risk tiles to plain tap rows only — never on, next
  // to, or immediately after a double, never two in a row, ≤10% of tiles.
  const scorable = rows.reduce((n, r) => n + r.lanes.length, 0);
  const maxReds = Math.floor(scorable * cfg.chart.redMaxFrac);
  let reds = 0;
  for (let i = 1; i < rows.length - 1 && reds < maxReds; i++) {
    const r = rows[i];
    if (r.kind !== 'tap') continue;
    if (r.timeAt < cfg.chart.redEnterSeconds) continue;
    if (rows[i - 1].kind === 'double' || rows[i + 1].kind === 'double') continue;
    if (rows[i - 1].red >= 0) continue;
    if (rnd() >= cfg.chart.redChance) continue;
    let lane = Math.floor(rnd() * (cfg.lanes - 1));
    if (lane >= r.lanes[0]) lane += 1;
    r.red = lane;
    reds += 1;
  }

  const last = rows[rows.length - 1];
  return {
    rows,
    lengthU: last.posU + last.span,
    estSeconds: t,
    totals: { rows: rows.length, scorable, holds, doubles, reds },
  };
}
