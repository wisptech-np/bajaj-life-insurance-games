// data.js — Spiral Sprint tunables.
//
// Every number a designer would want to retune lives here. SpiralSprintGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants in
// the component are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar, kept identical to the rest of the catalog: green is ALWAYS
   risk (the crash arcs are green virus-styled bands, matching the risk blobs in
   Milestone Hopper and the risk tide in Swing to Secure), blue is ALWAYS
   protection (safe landing arcs, the shield ball, the tower core), gold is
   wealth (the retirement vault, milestone rules, fever flame).

   The design spec calls the crash arcs "red"; the repo-wide rule that risk reads
   green outranks it, so they are green with a virus texture and a danger-red
   warning stripe on the slab edge. See README "Balance notes". */
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
  virus: '#49E24B',
  virusCore: '#0E5C1D',
  danger: '#EF4444',
  bgDark: '#0B1221',
  skyTop: '#061634',
  skyMid: '#0A2444',
  skyLow: '#08182F',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',

  // Platform slabs: [top face light, top face dark, front face] per arc type.
  safeTop: '#2E63A8',
  safeBot: '#1C4881',
  safeFront: '#0F2A4E',
  landTop: '#3A79C6',
  landBot: '#22589A',
  landFront: '#12345F',
  crashTop: '#2E9B44',
  crashBot: '#14622A',
  crashFront: '#0A3A18',
  vaultTop: '#F3C75A',
  vaultBot: '#8A5F12',
  vaultFront: '#5B3D0A',

  coreTop: '#1B3A6B',
  coreMid: '#12294D',
  coreBot: '#0A1930',
  fogDeep: 'rgba(4,10,22,0.94)',
};

/* ─── Gameplay configuration ──────────────────────────────
   The first blocks are the balance sheet agreed in the design spec. The blocks
   below (`view`, `camera`, `fx`, `hud`) are presentation tunables that the same
   designer would reach for, kept here rather than buried in the component.

   Balance corrections carried against the spec's literal reading are marked
   CORRECTION and are explained in README.md "Balance notes". */
export const GAME_CONFIG = {
  sessionSeconds: 120,

  tower: {
    // Ring 0 is the launch platform, rings 1..39 are the hazard rings, ring 40
    // is the retirement vault floor. Landing on ring 40 wins.
    rings: 40,
    ringGapPx: 150,
    radiusPx: 150,
    // The tower is capped to this fraction of the stage width so a 360 px phone
    // gets the same silhouette as a 430 px one instead of a clipped tower.
    maxRadiusFrac: 0.42,
    // Core cylinder radius and ellipse tilt (ry / rx), as fractions of radius.
    innerFrac: 0.34,
    tiltFrac: 0.34,
    // Slab thickness — the darker front face that sells the pseudo-3D read.
    thicknessPx: 13,
    // Drag sensitivity (CORRECTION: spec 0.55). At 0.55 deg/px a half-turn needs
    // 327 px of drag, which is wider than the play area on a 360 px phone, so the
    // worst-case alignment took two swipes. At 0.70 a half-turn — the largest
    // rotation ever required — is 257 px, inside one thumb swipe on every
    // supported width, while the tightest 42 deg gap is still a 60 px drag
    // target (five times the kit's 12 px tap threshold, so precision is intact).
    degPerPx: 0.7,
  },

  ball: {
    // CORRECTION (spec: 90 px apex / 0.50 s period). The spec pair implies a
    // gravity of 2880 px/s^2 — nearly twice the arcade gravity every other game
    // in the catalog uses — and a headless sim of the finished tower had a
    // casual descent finishing all 40 rings in a 14 s median, an eighth of the
    // session. A 100 px apex over a 0.70 s period puts gravity at 1633 px/s^2,
    // within 2% of the kit's BALANCE.physics.gravity, so the ball weighs what
    // everything else in the catalog weighs, and lands the same descent at a
    // ~29 s median. See README "Balance notes".
    bounceHeightPx: 100,
    bounceSeconds: 0.7,
    radiusPx: 14,
    // Orbit radius as a fraction of the tower radius: the ball rides the middle
    // of the platform band, not its outer lip.
    orbitFrac: 0.68,
    // Falls accelerate under this cap so a long fever shaft stays readable.
    terminalVelocityPx: 2300,
    squashSeconds: 0.22,
    trailSeconds: 0.35,
  },

  arcs: {
    // Per-ring composition, lerped over depth t = ring / rings.
    gapSpanDeg: [70, 42],
    crashShare: [0.10, 0.34],
    minSafeSpanDeg: 55,
    // Crash arcs are split into this many pieces, lerped over depth.
    crashArcs: [1, 3],
    minCrashSpanDeg: 16,
    // Every safe run that is not the guaranteed landing run still gets this much
    // width, so a ring never contains a 2 deg sliver nobody can read.
    minSafeSliceDeg: 10,
    // Share of the ring's total safe width reserved for the guaranteed landing
    // run (floored at minSafeSpanDeg).
    landingShare: 0.34,
    // Chance that a ring anchors its GAP — rather than its landing run — under
    // the previous ring's gap, i.e. a free extra ring of fall.
    // CORRECTION: measured at 0.28 (with 3-ring fever shafts) more than half the
    // tower descended with no input at all — the player was a spectator for the
    // majority of the run. At 0.12 roughly three rings in four are a decision.
    fallThroughChance: 0.12,
  },

  fever: {
    ringsPerStreak: 3,
    smashLimit: 1,
    // CORRECTION: the spec ends fever "after one smash or a normal bounce".
    // Measured against the physics, the fall that grants fever has at most one
    // more ring to run (0.06-0.13 s), so the reward would expire before the
    // player could steer into anything: fever would be a particle effect, not a
    // mechanic. Fever instead runs for this long or until it is spent on one
    // smash, which is ~6 bounces of steering room.
    seconds: 3.0,
    // Planted fever shafts: `chainLength` consecutive rings whose gaps are all
    // aligned under the previous ring's gap, starting at `chainStartRing` and
    // repeating every `chainEveryRings`. Guarantees fever is reachable without
    // relying on the random fallThroughChance rolling three times in a row.
    // Two aligned rings is exactly enough: the gap the player drops through
    // counts as the first ring of the fall, so a 2-ring shaft lands the streak
    // on 3. A 3-ring shaft donated a fourth free ring for nothing.
    chainStartRing: 5,
    chainEveryRings: 9,
    chainLength: 2,
  },

  // A milestone rule every N rings: "40 years to retirement" at the top, minus
  // 10 years per label, and the vault at the bottom.
  milestonesEveryRings: 10,
  yearsStart: 40,

  scoring: { ring: 20, smash: 100, finishBonus: 800 },

  camera: {
    // Screen y the ball is parked at, as a fraction of stage height. High enough
    // that ~3 rings of read-ahead stay on screen below it.
    anchorFrac: 0.36,
    lambda: 9,
    // While bouncing, the camera holds the ring the ball is standing on, so the
    // bounce reads as the ball moving rather than the tower breathing. While
    // falling it tracks the ball, and this is the furthest it will ever let the
    // ball run ahead of the anchor — the lag is what makes a deep fall feel fast
    // without letting the ball reach the bottom edge of the stage.
    maxLeadPx: 150,
  },

  view: {
    // Rings drawn above / below the ball's ring.
    ringsAbove: 2,
    ringsBelow: 5,
    // Depth fog: a ring this many steps below the ball is fully fogged.
    fogRings: 5,
    fogMaxAlpha: 0.72,
    // Virus pip spacing along a crash arc, in degrees.
    crashPipDeg: 13,
  },

  fx: {
    damageShake: 7,
    smashShake: 5,
    hitStopSeconds: 0.09,
    bounceParticles: 8,
    passParticles: 10,
    feverParticles: 18,
    smashParticles: 24,
    milestoneParticles: 22,
    winParticles: 40,
    hitParticles: 20,
    bannerSeconds: 1.8,
  },

  hud: {
    // Beat between the run ending on screen and the results screen appearing.
    endBeatMs: 600,
    lowTimeSeconds: 15,
  },
};

/* ─── Derived physics ─────────────────────────────────────
   The bounce is a deterministic parabola pinned to the two numbers a designer
   actually thinks in: apex height and contact-to-contact period. Gravity and
   launch speed follow from them, and the same gravity drives falls, so a ball
   that drops through a gap keeps the weight it had while bouncing.

     apex h = g T^2 / 8      →  g  = 8h / T^2
     launch v = g T / 2      →  v0 = 4h / T                                   */
export const BOUNCE_GRAVITY =
  (8 * GAME_CONFIG.ball.bounceHeightPx) / (GAME_CONFIG.ball.bounceSeconds ** 2);
export const BOUNCE_SPEED =
  (4 * GAME_CONFIG.ball.bounceHeightPx) / GAME_CONFIG.ball.bounceSeconds;

/** Milestones as an ordered list — the shape the Results screen wants. */
export const MILESTONE_LIST = (() => {
  const out = [];
  const { rings, milestonesEveryRings, yearsStart } = GAME_CONFIG;
  for (let r = milestonesEveryRings; r <= rings; r += milestonesEveryRings) {
    const years = yearsStart - r;
    out.push({ ring: r, label: years > 0 ? `${years} years to go` : 'Retirement vault' });
  }
  return out;
})();

/** Long-form banner copy for a milestone ring, or null. */
export function milestoneFor(ring) {
  const { milestonesEveryRings, yearsStart, rings } = GAME_CONFIG;
  if (ring <= 0 || ring % milestonesEveryRings !== 0) return null;
  const years = yearsStart - ring;
  if (ring >= rings) return 'Retirement vault';
  return `${years} years to retirement`;
}

/** Score the Results ring treats as a full circle.
    A completed run measures 1,600 (40 rings x 20 + 800 finish bonus) before
    fever smashes; three smashes puts a strong run at ~1,900. */
export const RESULT_TARGET_SCORE = 2000;
