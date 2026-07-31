// data.js — Ripple Shield tunables.
//
// Every number a designer would want to retune lives here. RippleShieldGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants in
// the component are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand anchors: BLUE #003DA6, ORANGE #F26522, GREEN #28A745.

   IDENTITY (2026-07-31 revamp). Every other game in the catalog ships the same
   navy #0B1221 board with a gold reward accent. Ripple Shield does not: its
   board is an ABYSS — a near-black teal-navy deep — and its signature accent is
   AQUA #19E3D6, the colour of the shield wave itself. Nothing else in the repo
   uses aqua, so a single frame of this game is identifiable at thumbnail size.
   The shape language is concentric: every ring, gauge, chip corner-radius and
   icon in the game is built from circles sharing a centre.

   Colour grammar (unchanged, so the board still reads at a glance):
     deep blue  = an exposed family orb, still uncovered
     AQUA       = the shield wave, and every orb it has reached
     green      = risk (virus orbs), now with a red nucleus so it never reads
                  as "collect me" beside the aqua
     orange     = warning — a wave that a virus has eaten into
   Contrast: aqua #19E3D6 and white on #03101E are 12.9:1 and 18.6:1; the
   dimmest HUD ink used anywhere is rgba(226,244,255,0.72) at 8.4:1. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  green: '#28A745',
  greenLt: '#4ADE80',

  // Signature accent — shield-wave aqua.
  aqua: '#19E3D6',
  aquaMid: '#3FD8E6',
  aquaLt: '#8CFFF4',
  aquaDeep: '#0A6E7A',
  aquaGlow: 'rgba(25,227,214,0.6)',

  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',

  // Risk.
  virus: '#3FD45E',
  virusBody: '#177033',
  virusCore: '#FF5A5A',
  danger: '#EF4444',

  // Abyss board.
  bgDark: '#03101E',
  skyTop: '#03101E',
  skyMid: '#062134',
  skyLow: '#07293F',
  ink: '#FFFFFF',
  inkDim: 'rgba(226,244,255,0.72)',
  // HUD chip substrate. 0.72 alpha is the figure that keeps white ink at 9.8:1
  // even in the worst case — a full-strength ripple crest passing directly
  // under a chip. At 0.58 that case measured 6.2:1; at 0.72 it clears AA with
  // room to spare and the dim ink beside it still measures 4.6:1.
  glass: 'rgba(3,16,30,0.72)',
  glassLine: 'rgba(140,255,244,0.22)',
  // Orange is the warning hue, but #FF8A3D as small TEXT on the chip substrate
  // is only 4.2:1. This lighter tint is 5.6:1 and is used wherever orange has
  // to be read as a number rather than seen as a mark.
  orangeInk: '#FFB27A',

  // Orb bodies.
  orbCore: '#062252',
  orbRim: '#4E96FF',
  orbHi: '#A8CEFF',
  orbSafeCore: '#EAFFFB',
  orbSafeRim: '#19E3D6',

  // Ripple rings.
  rippleEdge: 'rgba(196,255,250,0.98)',
  rippleBody: 'rgba(25,227,214,0.55)',
  rippleHurt: 'rgba(255,150,80,0.98)',
};

/* ─── Gameplay configuration ──────────────────────────────
   The first blocks are the balance sheet; `fx` and `hud` are presentation
   tunables that the same designer would reach for, kept here rather than buried
   in the component.

   Balance corrections carried against the spec's literal reading are marked
   CORRECTION and are explained in README.md "Balance notes". All figures below
   were measured by scripts/balance-sim.mjs, which imports THIS file and replays
   the component's exact chain resolution. Re-run it after changing anything in
   `waves`, `orb` or `ripple`:  node scripts/balance-sim.mjs */
export const GAME_CONFIG = {
  sessionSeconds: 120,

  /* -- reference playfield (CORRECTION) -----------------------------------
     A chain reaction does not depend on radii, it depends on how many orbs sit
     inside one ripple's area — i.e. on orb DENSITY. Authoring radii and speeds
     in raw pixels means a 620 px-tall phone and an 850 px-tall one play two
     different games (the taller screen has 30% lower density, and the chain
     stops percolating). So every length below is authored against this
     reference playfield and multiplied at runtime by sqrt(area / refArea),
     which holds orbs-per-ripple exactly constant on every screen.

     The gate reproduces this: `node scripts/balance-sim.mjs 300 382x665` runs
     the whole table on that playfield, and the default run ends with a
     cross-device sweep over four real ones. Measured centre-tap clear rates
     stay within a few points of the reference board on all of them. */
  reference: { width: 382, height: 496 },

  // Playfield inset inside the canvas, in CSS px. The top inset keeps orbs out
  // from under the HUD pills, which would otherwise hide taps and targets.
  playfield: { top: 108, bottom: 16, side: 14 },

  /* -- waves --------------------------------------------------------------
     `orbs` is the total on screen, `viruses` of which are risk. `target` is how
     many family orbs the single tap must protect. `drift` is the orb speed
     range in reference px/s.

     Numbers below are the shipped gate's DEFAULT run — `pnpm balance`, i.e.
     `node scripts/balance-sim.mjs`, 300 boards per wave per strategy (40 for
     the oracle). Re-running resamples, so each rate moves by a couple of points
     and the five-wave product by ~2.

       centre    80.0 / 73.0 / 72.3 / 71.0 / 66.3   full run 19.9%
       centroid  79.7 / 69.3 / 78.3 / 81.0 / 72.0   full run 25.2%
       random    62.3 / 47.0 / 48.3 / 50.3 / 47.0   full run  3.3%
       oracle     100 /  100 /  100 / 97.5 / 97.5   full run 95.1%

     A second default run measured 23.9% centre / 26.0% centroid full-run, which
     is the size of the sampling band on a five-wave product.

     `oracle` replays the whole cascade from a 6x8 grid of candidate taps on the
     same board and takes the best: a winning tap exists on essentially every
     board, so the ceiling is a read of the board, not luck, and the gap to a
     uniformly random tap (3.3% for the run) is the size of the skill.

     Two things set the ladder (CORRECTION):

     1. Five waves compound. A run needs ALL five targets, so a per-wave rate of
        r gives r^5 overall: the batch norm of ~40% casual completion is out of
        reach here (it would need 83% per wave), and the controller's bar of 20%
        needs ~73% per wave. That is why the ladder sits at the top of the sane
        band rather than the middle, and why it plateaus (25/25/26/26/27) rather
        than rising by one every wave — a strictly rising ladder measured 12.9%
        full-run for a centroid tap, half the bar.
     2. Difficulty still rises, just not through the target. Each wave adds orbs,
        viruses and drift speed, so the same-looking target is harder: holding
        the target at 26 costs a centre tap 73% on wave 3 but only 71% on wave 4
        with two more viruses. The target's share of the board falls across the
        run (71% of the family orbs on wave 1, 57% on wave 5) precisely because
        the board is fighting back harder. */
  waves: [
    { orbs: 40, viruses: 5, target: 25, drift: [10, 26] },
    { orbs: 46, viruses: 8, target: 25, drift: [14, 34] },
    { orbs: 50, viruses: 9, target: 26, drift: [18, 42] },
    { orbs: 56, viruses: 11, target: 26, drift: [22, 50] },
    { orbs: 60, viruses: 13, target: 27, drift: [26, 58] },
  ],

  orb: {
    radius: 12.5,
    virusRadius: 11.5,
    // Rejection-sampled spawn separation (centre to centre). Keeps the board
    // readable and stops two orbs sharing one tap's worth of area.
    minSeparation: 30,
    // Give up on separation after this many tries and place anyway, so a dense
    // wave can never hang the spawn loop.
    spawnTries: 60,
    // Orbs BOUNCE off the playfield edge rather than wrapping. A wrap would
    // teleport an orb across the screen mid-chain — visually it reads as a bug,
    // and it lets an orb dodge a ripple that had already reached it.
    wobbleAmp: 5,
    wobbleHz: 0.32,
    // Spawn pop-in animation, seconds.
    popSeconds: 0.34,
    popStagger: 0.012,
  },

  ripple: {
    /* The tap's ripple, and the ONLY authored radius in the game: a chained
       ripple is not sized from a constant of its own, it inherits its parent's
       CURRENT maximum minus `chainDecayPx` (and minus `virusShrinkPx` for every
       virus that parent caught). So `rootRadius` seeds the reach of the entire
       cascade, which makes it the most sensitive number here (CORRECTION).

       A chain reaction is continuum percolation: what decides it is the mean
       number of orbs inside one ripple,

           k = n * pi * (R + orbRadius)^2 / area,     threshold k ~ 4.5

       with area = 382 x 496 = 189,472 reference px^2. At the root, R = 98 gives
       R+orbRadius = 110.5 and therefore k = 7.1 on wave 1 (35 family orbs),
       7.7 / 8.3 / 9.1 / 9.5 on waves 2-5 — comfortably above threshold, which
       is what makes the first hop of a cascade reliable.

       The cascade's shape is the walk back DOWN from there. Every generation
       costs 2 px and every virus 18 px, so a branch loses reach until it falls
       through the threshold and stops: on a wave-3 board k is 5.3 by R = 76
       (eleven clean generations, or one virus and two hops) and 3.6 by R = 60,
       where the branch is finished. Measured mean depth is 6.3 generations,
       max 20 — exactly the walk this arithmetic predicts.

       Both ends of the range were measured and rejected: rootRadius 126 keeps
       every branch above threshold for its whole life (k = 13 at the root), so
       a centre tap cleared the board from anywhere and the game had no
       decisions in it; rootRadius 76 makes even the first hop unreliable and
       clear rates fell to 31-40%. */
    rootRadius: 98,
    growSpeed: 250,
    fadeSeconds: 0.3,
    // Reach a chained ripple loses per generation. This, not a separate chain
    // radius, is what terminates a cascade instead of letting it run until it
    // happens to hit empty space.
    chainDecayPx: 2,
    // A ripple that shrinks below this is spent and starts fading.
    minRadius: 30,
    // A virus caught by a ripple eats this much of its remaining reach — nine
    // generations' worth of decay in one contact. 26 px killed late waves
    // outright: with 13 viruses on a wave-5 board a centre tap cleared only 41%
    // of them. 18 px leaves the penalty legible without ending the cascade on
    // first contact (CORRECTION).
    virusShrinkPx: 18,
    // Visual ring thickness, and the contact tolerance derived from it.
    bandPx: 9,
  },

  slowMo: {
    // Orbs protected inside ONE chain that triggers the slow-motion beat.
    triggerChain: 15,
    scale: 0.34,
    seconds: 0.9,
  },

  scoring: {
    orb: 40,
    // Awarded per wave on the deepest chain generation reached that wave.
    chainDepth: 20,
    waveClear: 200,
  },

  fx: {
    damageShake: 5,
    tapParticles: 16,
    // Never below 8 — the build standard's floor for a burst that reads.
    orbParticles: 9,
    virusParticles: 12,
    waveParticles: 26,
    winParticles: 40,
    hitParticles: 18,
    bannerSeconds: 1.35,
    // A "+40" per orb would fire 25 float texts in half a second and blow the
    // pool; one every N orbs reads as a rising chain instead.
    floatEveryOrbs: 5,
  },

  hud: {
    // Beat between the run ending on screen and the results screen appearing.
    endBeatMs: 700,
    lowTimeSeconds: 15,
  },
};

/** Wave targets as an ordered list — the shape the Results screen wants. */
export const WAVE_LIST = GAME_CONFIG.waves.map((w, i) => ({
  wave: i + 1,
  target: w.target,
  family: w.orbs - w.viruses,
  orbs: w.orbs,
}));

/** Total family orbs a perfect run would protect (every orb of every wave). */
export const MAX_PROTECTED = WAVE_LIST.reduce((sum, w) => sum + w.family, 0);

/** Score the Results ring treats as a full circle.
    A winning run measures ~7,400: the gate's mean protected count for a centre
    tap is 28.5 / 27.4 / 29.6 / 30.0 / 29.4 = ~145 orbs x 40 (5,800), plus 5
    wave clears (1,000), plus a mean chain depth of ~6.2 x 20 x 5 (620). See
    README "Balance notes". */
export const RESULT_TARGET_SCORE = 7400;
