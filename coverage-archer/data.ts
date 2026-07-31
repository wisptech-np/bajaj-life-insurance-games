// GAME_CONFIG — the single tuning surface for Guardian Archer.
// Nothing gameplay-related is hard-coded in MainScene/PreloadScene: aiming, ballistics,
// wind, juice timings, scoring, wave layouts and risk-target art all read from here.

// Device pixel ratio used for crisp retina rendering (capped at 2 to bound canvas memory).
// The Phaser canvas backing store is WIDTH*DPR x HEIGHT*DPR while ALL game logic stays in
// the 480x640 design space — MainScene zooms the camera by DPR and displays DPR-rasterised
// textures at 1/DPR, so gameplay is bit-identical at every DPR.
export const DPR = Math.min(
  Math.max((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 1),
  2
);

/* ── Risk antagonists ─────────────────────────────────────────────────────
   Four financial risks, four different silhouettes / palettes / idle motions.
   `shape` drives the procedural art in PreloadScene, `idle` the per-frame wobble
   in MainScene. These are NOT palette swaps of one another.                */
export type RiskKind = 'illness' | 'accident' | 'debt' | 'jobloss';

export interface RiskDef {
  label: string;
  /** Silhouette family drawn in PreloadScene. */
  shape: 'hexCell' | 'hazardShard' | 'chainWeight' | 'brokenCase';
  /** Idle animation applied on top of the wave path. */
  idle: 'throb' | 'tumble' | 'sway' | 'flicker';
  /** How the target dies when struck. */
  death: 'shatter' | 'burst' | 'drop' | 'dissolve';
  body: number;   // main fill
  edge: number;   // outline / detail
  core: number;   // critical-hit core
  hex: string;    // same as `core`, for DOM/text use
}

export const RISKS: Record<RiskKind, RiskDef> = {
  illness: {
    label: 'Illness',
    shape: 'hexCell',
    idle: 'throb',
    death: 'shatter',
    body: 0xe11d48,
    edge: 0x7f1d1d,
    core: 0xff9db0,
    hex: '#FF9DB0',
  },
  accident: {
    label: 'Accident',
    shape: 'hazardShard',
    idle: 'tumble',
    death: 'burst',
    body: 0xf59e0b,
    edge: 0x78350f,
    core: 0xffe08a,
    hex: '#FFE08A',
  },
  debt: {
    label: 'Debt',
    shape: 'chainWeight',
    idle: 'sway',
    death: 'drop',
    body: 0x8b5cf6,
    edge: 0x3b1a86,
    core: 0xd6c2ff,
    hex: '#D6C2FF',
  },
  jobloss: {
    label: 'Job Loss',
    shape: 'brokenCase',
    idle: 'flicker',
    death: 'dissolve',
    body: 0x64748b,
    edge: 0x1e293b,
    core: 0xcbd5f5,
    hex: '#CBD5F5',
  },
};

export const GAME_CONFIG = {
  /* ── Session ───────────────────────────────────────────── */
  SESSION_SECONDS: 120,        // hard cap: 2 minutes
  ARROWS_PER_SESSION: 12,      // limited quiver
  LOW_TIME_WARN: 20,           // HUD turns red below this

  /* ── Ballistics ────────────────────────────────────────── */
  GRAVITY_Y: 340,
  SPEED_COEFF: 5.0,            // pull length (px) -> launch speed multiplier
  MAX_PULL: 132,               // px, pull is clamped here (= 100% power)
  MIN_PULL: 26,                // px, release threshold — below this the shot is cancelled
  ARROW_LENGTH: 20,            // px from centre to tip, used for collision + sticking
  TRAIL_POINTS: 14,            // ring-buffer length of the fading flight trail

  /* ── Aim assist ────────────────────────────────────────── */
  TRAJECTORY_HINT_SHOTS: 3,    // full dotted arc for the first N shots
  TRAJECTORY_DOTS: 20,
  TRAJECTORY_STEP: 0.075,      // seconds between preview samples
  STUB_DOTS: 6,                // short muzzle stub once the hint is gone
  POWER_RING_RADIUS: 46,

  /* ── Wind (acceleration px/s^2 per level) ──────────────── */
  WIND_FORCE_PER_LEVEL: 16,
  WIND_FLASH_MS: 1200,         // how long the HUD wind chip pulses after a blown miss

  /* ── Juice ─────────────────────────────────────────────── */
  HITSTOP_MS: 70,              // freeze on a normal hit
  HITSTOP_CRIT_MS: 130,        // freeze on a critical
  BURST_PARTICLES: 14,         // >= 8 required
  BURST_PARTICLES_CRIT: 24,
  SHAKE_HIT: { ms: 110, amt: 0.006 },
  SHAKE_CRIT: { ms: 260, amt: 0.016 },
  SHAKE_MISS: { ms: 80, amt: 0.003 },
  STICK_FADE_MS: 1600,         // how long a missed arrow stays stuck in the backdrop
  SHOCKWAVE_MS: 340,
  NEIGHBOUR_STAGGER_RADIUS: 130, // nearby targets recoil from the impact

  /* ── Scoring ───────────────────────────────────────────── */
  POINTS: { L: 100, M: 150, S: 250 } as Record<'L' | 'M' | 'S', number>,
  CRITICAL_MULTIPLIER: 2,      // direct core hit
  STREAK_BONUS: 25,            // per consecutive hit beyond the first
  STREAK_BONUS_CAP: 4,         // max stacked streak bonuses
  TIME_BONUS_PER_SECOND: 5,    // added to score on a win
  TARGET_SCORE: 2000,          // full results ring

  /* ── Target geometry ───────────────────────────────────── */
  RISK_RADIUS: { L: 34, M: 26, S: 19 } as Record<'L' | 'M' | 'S', number>,
  ART_RADIUS: 34,              // textures are rasterised at L and scaled down
  CORE_RATIO: 0.34,            // core radius = body radius * ratio
  HIT_FORGIVENESS: 4,          // px added to the body radius when testing a hit

  /* ── Waves ─────────────────────────────────────────────────────────────
     Each wave has its OWN movement pattern, so aim reading has to be relearnt:
       pendulum — swings along a shallow arc, predictable but wide
       orbit    — circles a fixed centre, needs lead-the-target timing
       dart     — holds still, then snaps sideways; punishes slow releases
     Difficulty ramps: smaller, farther, faster, windier.                  */
  WAVES: [
    {
      label: 'Everyday Risks',
      pattern: 'pendulum' as const,
      targets: [
        { kind: 'illness' as RiskKind, size: 'L' as const },
        { kind: 'accident' as RiskKind, size: 'L' as const },
        { kind: 'debt' as RiskKind, size: 'L' as const },
      ],
      xRange: [250, 355] as [number, number],
      speed: 0.55,      // pattern rate multiplier
      amplitude: 34,    // pattern size in px
      windMax: 2,
    },
    {
      label: 'Health & Accident',
      pattern: 'orbit' as const,
      targets: [
        { kind: 'illness' as RiskKind, size: 'M' as const },
        { kind: 'jobloss' as RiskKind, size: 'M' as const },
        { kind: 'accident' as RiskKind, size: 'M' as const },
      ],
      xRange: [280, 395] as [number, number],
      speed: 0.85,
      amplitude: 42,
      windMax: 4,
    },
    {
      label: 'Critical Risks',
      pattern: 'dart' as const,
      targets: [
        { kind: 'debt' as RiskKind, size: 'S' as const },
        { kind: 'jobloss' as RiskKind, size: 'S' as const },
        { kind: 'illness' as RiskKind, size: 'S' as const },
        { kind: 'accident' as RiskKind, size: 'M' as const },
      ],
      xRange: [295, 412] as [number, number],
      speed: 1.15,
      amplitude: 52,
      windMax: 6,
    },
  ],

  /** Everything speeds up by this factor once the clock passes the halfway mark. */
  LATE_SESSION_SPEEDUP: 1.25,
  LATE_SESSION_AT: 60,         // seconds remaining

  /* ── Canvas / layout (design space) ────────────────────── */
  WIDTH: 480,
  HEIGHT: 640,
  GROUND_Y: 560,
  ARCHER_X: 70,
  ARCHER_Y: 512,
  TARGET_BAND: [136, 468] as [number, number], // vertical band targets live in
};
