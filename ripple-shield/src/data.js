// data.js — Ripple Shield tunables.
//
// Every number a designer would want to retune lives here. RippleShieldGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants in
// the component are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar, consistent with the rest of the catalog: blue is ALWAYS
   protection (family orbs, the shield ripple), green is ALWAYS risk (virus
   orbs), gold is the reward (an orb that has been covered, the chain counter),
   orange is the warning state (a ripple that has been eaten into by a virus). */
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
  skyLow: '#0E3160',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',

  // Orb bodies.
  orbCore: '#0F3E8F',
  orbRim: '#4E96FF',
  orbHi: '#A8CEFF',
  orbSafeCore: '#FFE9B0',
  orbSafeRim: '#FFC845',

  // Ripple rings.
  rippleEdge: 'rgba(180,214,255,0.95)',
  rippleBody: 'rgba(30,107,224,0.55)',
  rippleHurt: 'rgba(242,101,34,0.9)',
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
     which holds orbs-per-ripple exactly constant on every screen. */
  reference: { width: 382, height: 496 },

  // Playfield inset inside the canvas, in CSS px. The top inset keeps orbs out
  // from under the HUD pills, which would otherwise hide taps and targets.
  playfield: { top: 108, bottom: 16, side: 14 },

  /* -- waves --------------------------------------------------------------
     `orbs` is the total on screen, `viruses` of which are risk. `target` is how
     many family orbs the single tap must protect. `drift` is the orb speed
     range in reference px/s.

     Measured centre-tap clear rate with the values below, 600 boards per wave:
     72.5 / 60.8 / 66.8 / 62.3 / 59.3%, i.e. every wave sits in the intended
     50-70% band with wave 1 as a deliberate on-ramp. A uniformly random tap
     manages 52 / 41 / 41 / 42 / 31%, and replaying every board from an 8x11
     grid of candidate taps clears 99-100% of them — so the gap between a lazy
     tap and a read of the board is real, and the ceiling is skill, not luck.

     The virus ramp is what makes later waves hard, and it is why the target
     ladder rises by only one orb per wave (CORRECTION): a flat 62.5%-of-total
     target as in the spec's example ("Protect 25 of 40") gets harder every wave
     on its own, because each extra virus eats ripple reach — the same literal
     target cleared 66% of wave-1 boards but only 38% of wave-5 boards. */
  waves: [
    { orbs: 40, viruses: 5, target: 27, drift: [10, 26] },
    { orbs: 46, viruses: 8, target: 28, drift: [14, 34] },
    { orbs: 50, viruses: 9, target: 29, drift: [18, 42] },
    { orbs: 56, viruses: 11, target: 30, drift: [22, 50] },
    { orbs: 60, viruses: 13, target: 31, drift: [26, 58] },
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
    // The tap's own ripple is wider than a chained one: the first shield is the
    // policy you buy, the chain is what it passes on.
    //
    // These two radii are the single most sensitive numbers in the game
    // (CORRECTION). A chain reaction is continuum percolation: what matters is
    // the mean number of orbs inside one ripple, k = n*pi*(R+orbR)^2/area. The
    // 2D percolation threshold is k ~ 4.5, so an "obvious" 104 px chain radius
    // (k ~ 7.9) covers nearly the whole board from any tap and the game has no
    // decisions in it; below ~68 px (k ~ 4.2) the chain dies wherever it starts
    // and the game is a coin flip. 76 px puts k at 5.4 — just above threshold,
    // where WHERE you tap decides the cascade.
    rootRadius: 98,
    chainRadius: 76,
    growSpeed: 250,
    fadeSeconds: 0.3,
    // Each generation loses a little reach, so a chain terminates on its own
    // instead of running until it happens to hit empty space.
    chainDecayPx: 2,
    // A ripple that shrinks below this is spent and starts fading.
    minRadius: 30,
    // A virus caught by a ripple eats this much of its remaining reach. 26 px
    // (a third of a chain radius) killed late waves outright — with 13 viruses
    // on a wave-5 board a centre tap cleared only 41% of them; 18 px leaves the
    // penalty legible without ending the cascade on first contact (CORRECTION).
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
    orbParticles: 7,
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
    A winning run measures ~7,600: ~150 orbs protected x 40 (6,000) + 5 wave
    clears (1,000) + ~6.3 mean chain depth x 20 x 5 (630). See README
    "Balance notes". */
export const RESULT_TARGET_SCORE = 7600;
