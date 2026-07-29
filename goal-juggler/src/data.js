// data.js — Goal Juggler tunables.
//
// Every number a designer would want to retune lives here. GoalJugglerGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, glyph proportions).
//
// The pure module src/physics.js takes this object as a PARAMETER — it never
// imports it — so scripts/balance.mjs runs the SHIPPED simulation headless
// against the SHIPPED numbers.
//
// Feel constants shared with every other game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js.

import { BALANCE } from './kit/config.js';

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6 / #005BAC, ORANGE #F26522, GREEN #28A745, bg #0B1221.

   Colour grammar. Each of the four goals owns one hue and keeps it everywhere
   (orb, trail, shatter burst, banner): GOLD is education, GREEN is the home,
   ORANGE is health, BLUE is retirement. RED is never a goal — it belongs to the
   floor, the shatter and the lost cover, so anything red on screen means
   something has gone wrong. WHITE is the player's own touch (shockwave rings). */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  orangeDeep: '#B33F10',
  green: '#28A745',
  greenLt: '#4ADE80',
  greenDeep: '#12703099',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  dangerDeep: '#7F1D1D',

  bgDark: '#0B1221',
  skyTop: '#08152F',
  skyMid: '#0C2A57',
  skyLow: '#061229',

  rail: 'rgba(150,190,240,0.30)',
  railLit: 'rgba(190,220,255,0.62)',
  guide: 'rgba(166,208,255,0.30)',

  floorBand: 'rgba(239,68,68,0.20)',
  floorEdge: '#EF4444',
  floorEdgeLt: '#FF8B8B',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── The four goals ──────────────────────────────────────
   Distinct SILHOUETTES first, distinct hues second: the shapes have to read at
   a glance on a 360 px phone while four of them are moving, so each glyph has a
   different overall outline (tall rectangle, pitched roof, lobed heart, radial
   burst) rather than four variations on a circle.

   `pitch` is a semitone offset applied to the bounce voice so each goal also
   sounds different — the bounce note is (orb pitch + height), so a Home orb
   caught high and an Education orb caught low are never the same sound. */
export const GOALS = [
  {
    key: 'education',
    label: 'Education',
    glyph: 'book',
    color: '#FFC845',
    colorLt: '#FFE38A',
    colorDeep: '#8A5C06',
    glow: 'rgba(255,200,69,0.55)',
    pitch: 0,
  },
  {
    key: 'home',
    label: 'Home',
    glyph: 'house',
    color: '#4ADE80',
    colorLt: '#A9F5C6',
    colorDeep: '#106B36',
    glow: 'rgba(74,222,128,0.5)',
    pitch: 2,
  },
  {
    key: 'health',
    label: 'Health',
    glyph: 'heart',
    color: '#FF8A3D',
    colorLt: '#FFC59B',
    colorDeep: '#8C3708',
    glow: 'rgba(255,138,61,0.5)',
    pitch: 4,
  },
  {
    key: 'retirement',
    label: 'Retirement',
    glyph: 'sun',
    color: '#5FA8FF',
    colorLt: '#B6D9FF',
    colorDeep: '#0B3D82',
    glow: 'rgba(95,168,255,0.5)',
    pitch: 5,
  },
];

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure module src/physics.js and therefore by
   scripts/balance.mjs. Every win-rate number quoted in okf-brain/goal-juggler
   was measured by that script against exactly these values. */
export const GAME_CONFIG = {
  /** Hard session length. A won run is exactly this long — the clock IS the
      win condition, so unlike most games in the repo it is not a backstop. */
  sessionSeconds: 80,

  /** Covers held. The third floor hit ends the run. */
  covers: 3,

  /* Score needed at the final whistle, on top of surviving.

     Round 1 shipped 1,500 and it was DEAD: the honest bot crossed it at t=13.2s
     and not one run in ~50,000 ever ended short of it, so the brief's AND was
     decoration and the HUD target bar sat pinned at 100% for 83% of the session.

     Choosing a live value needs the distribution of scores among runs that
     SURVIVED, since everything else already lost on drops. Measured over the
     five gate blocks, that population is tight — surviving means juggling, and
     juggling produces a fairly fixed number of bounces:

         p5 15,120-15,660   p25 15,440-15,980   p50 15,840-16,400   p90 16,560-17,020

     15,000 sits just under the fifth percentile, so it fires on the survivors
     who dawdled — a player who let orbs coast instead of working them — without
     turning the run into a scoring race. (The reviewer suggested 8,000-12,000;
     that range predates the high-keep fix below, which removed roughly 200
     farmed bonuses per run and moved the whole distribution down. At 12,000 the
     target would still never fire.) `scripts/balance.mjs` asserts it is live by
     counting runs that end with cause 'target' and failing if there are none. */
  targetScore: 15000,

  /** Orbs live at once. Starts at 1; `orbSchedule` adds the rest. */
  maxOrbs: 4,
  /** Seconds at which orb 2, 3 and 4 are served. */
  orbSchedule: [15, 35, 60],

  /* -- Playfield geometry --------------------------------------------------
     All of it is derived from the measured canvas, so the same run reads the
     same on a 360x640 and a 414x896 handset. `refHeightPx` is the height the
     velocities below were authored against; `physics.js` scales every velocity
     and acceleration by (actual field height / refHeightPx), which keeps the
     motion geometrically similar — a bounce takes the same number of SECONDS on
     every device instead of the same number of pixels. */
  field: {
    refHeightPx: 520,
    /** Canvas px reserved above the ceiling for the HUD band. */
    topPx: 92,
    /** Canvas px reserved below the floor line for the hazard band. */
    bottomPx: 34,
    sideMarginFrac: 0.045,
    /* Orb radius as a fraction of the playfield HEIGHT — the same quantity the
       velocities are scaled by — so the whole geometry stays similar across
       devices and not just the motion. Deriving it from the WIDTH instead (the
       obvious choice, and the first build's) leaves one residual device
       dependence: a 410x830 handset gets a 704 px field but the same ~28 px
       orbs as a 390x620 one, so the orbs are relatively smaller, the field is
       less crowded and orb-orb collisions are rarer. Measured, that alone moved
       the honest bot from 34.3% on 390x620 to 43.3% on 410x830 — a nine-point
       swing from screen shape. Height-relative sizing closes it.

       `orbRadiusWidthCap` is a safety rail, not a tuning knob: it stops four
       orbs from filling a narrow field. It does not bind on any shipped size. */
    orbRadiusFrac: 0.055,
    orbRadiusWidthCap: 0.11,
    orbRadiusPx: [17, 34],
    /* Tap forgiveness. The hit radius is 1.75x the DRAWN radius and never less
       than 46 logical px, so on a 400 px-wide stage an orb drawn at r=28 is
       tappable anywhere within 49 px of its centre — a 98 px target against the
       44 px platform minimum. The pad is deliberately larger than it looks:
       four orbs on a phone are small, the finger occludes the one it is aiming
       at, and a juggling game that punishes a 10 px aim error is a game about
       the touchscreen rather than about juggling. Overlapping pads resolve to
       the NEAREST orb centre (see tapAt), so the pad never steals a tap from a
       closer target.

       The floor is 40 logical px of RADIUS — an 80 px target against the 44 px
       platform minimum — and it is deliberately set low enough not to bind on
       any shipped canvas size. When it did bind (it was 46, and on a 340x600
       field 1.75 x R is only 40.6) the narrowest phone quietly got a 1.98x pad
       instead of 1.75x, and the honest bot won 48.8% there against 34.3% on a
       390x620 — the game was measurably easier on a small screen. The floor is
       kept as an accessibility backstop for a canvas smaller than anything in
       the gate, not as part of the balance. */
    hitPadMult: 1.75,
    hitPadMinPx: 40,
    /** Fraction of the field height that counts as "the top third" for the
        high-keep bonus. */
    highKeepFrac: 1 / 3,
  },

  /* -- Physics -------------------------------------------------------------
     Deliberately NOT realistic. Arcade gravity plus a hard speed ceiling reads
     as responsive on a phone; a physically-accurate float feels vague. */
  physics: {
    /** Brief: BALANCE.physics.gravity x 0.45. Resolved here so physics.js stays
        free of kit imports and the sim gets the shipped number. */
    gravity: BALANCE.physics.gravity * 0.45,
    /** Walls and ceiling, per the brief. */
    wallRestitution: 0.75,
    /** Orb against orb, per the brief. */
    orbRestitution: 0.80,
    /** Speed ceiling, px/s at the reference field height. */
    maxSpeed: 1400,
    /* Substepping. At the clamp speed the integrator runs
       `substepsAtMaxSpeed` (4) substeps per 120 Hz tick, i.e. each substep
       advances at most 1400/120/4 = 2.9 px against an orb radius of ~28 — about
       a tenth of a radius, so nothing can pass through a wall, the floor or
       another orb between two collision tests. Substep count falls with speed,
       so the cost is only paid when something is actually moving fast. */
    substepsAtMaxSpeed: 4,
    maxSubsteps: 6,
    /** Gentle air drag. Not for realism: it stops the gust pumping energy into
        an orb indefinitely, which is what would otherwise let a wall-hugging
        orb accelerate every time the wind reversed. */
    drag: 0.05,
    /** Below this speed a wall bounce is treated as a rest contact, so an orb
        does not buzz against a rail forever. */
    restEpsilon: 12,
    /* Diagnostics threshold used by the balance gate. Any penetration deeper
       than this fraction of a radius is counted as a tunnelling event; the gate
       asserts the count is zero over every run. */
    tunnelTolerance: 0.75,
  },

  /* -- The tap -------------------------------------------------------------
     A tap REPLACES the orb's vertical velocity rather than adding to it, which
     is what makes the game legible: a falling orb and a hovering orb answer the
     same tap the same way, so the player learns one response instead of a
     velocity-dependent family of them. The horizontal component is a steer, not
     a replacement — the offset of the tap from the orb centre is where the
     control lives.

     `upImpulse` sets the whole rhythm of the game, and it is THE difficulty
     knob. An orb tapped at rest rises upImpulse^2 / 2g px and returns to the
     tap height after 2 x upImpulse / g seconds, and both of those are device
     independent in field-relative terms because k scales gravity and impulse
     together. At 775 px/s against g = 720 that is a 417 px arc — about 85% of
     the reference field, so an orb tapped low crests near the ceiling, which is
     what a juggling arc should look like — on a 2.15 s cycle. Four orbs
     therefore demand ~1.9 taps a second.

     The value is bounded above by geometry, not just by taste. A full impulse
     must not bury an orb in the ceiling, or every strike rebounds off it and
     comes straight back down — which is the pin-to-ceiling loop the repeat rule
     exists to stop. An orb is strikeable all the way down only while its apex
     is at most half the field, and that reduces (k cancels) to

         upImpulse <= sqrt(refHeightPx x gravity) = sqrt(520 x 720) = 612 px/s

     Below that ceiling the strike window is exactly half the cycle; above it
     the window collapses fast. Swept over 250 runs on each of the gate's canvas
     sizes with the round-1 physics (a repeat inside the window does nothing at
     all, so the impulse can no longer be topped up by spamming):

         up=460  honest 45.2 / 55.6 / 44.0 / 42.4   (out the top)
         up=520  honest 33.2 / 42.0 / 36.4 / 34.8   <- shipped
         up=560  honest 26.0 / 31.6 / 26.0 / 25.2   (on the floor)
         up=612  honest 13.2 / 12.4 / 11.6 / 12.0   (out the bottom)

     520 centres all blocks. It was 775 before round 1; that value was tuned
     against physics where chained taps still carried a decayed impulse, and it
     is only reachable at all if a player can spam. */
  tap: {
    upImpulse: 520,
    /** Lateral authority at a full-radius offset, px/s. */
    steerImpulse: 330,
    /** Fraction of the orb's existing horizontal speed carried through a tap.
        Low, so a tap is a reset rather than an accumulation. */
    vxKeep: 0.40,
    /** Horizontal speed ceiling for a tapped orb, px/s. */
    maxVx: 520,

    /* -- Anti-exploit: rapid same-orb tapping ----------------------------
       The brief: "consecutive taps on the same orb within 300 ms decay to 60%
       impulse (no pin-to-ceiling spam)". Shipped STRONGER than that, because
       the briefed rule does not achieve what its own parenthesis asks for: a
       second tap on the same orb inside this window does nothing at all — no
       impulse, no steer, no score, no high-keep arm.

       Why not the decay. The first build implemented a compounding chain
       (0.6, 0.36, 0.216 ...) floored at 0.05 and claimed it inverted the
       exploit. It does not. At the floor a tap still delivers
       775 x 0.05 = 38.75 px/s of upward impulse, and any tap rate at or above
       9.29 Hz delivers that faster than gravity's 720 px/s^2 removes it, so the
       orb is held up indefinitely. Measured on an isolated orb: 9 Hz kept it
       aloft for the full 45 s probe, 11 Hz and above parked it against the
       ceiling. The gate's own 10 Hz canary was pinning its orb the whole time
       and lost only because it had abandoned the other three.

       A decayed impulse is still an impulse, so no floor above zero is
       rate-proof. Ignoring the repeat entirely is. `scripts/balance.mjs`
       asserts it with an isolated-orb pin probe over 4-30 Hz.

       Below the window (under 3.34 Hz) consecutive taps are not repeats and
       carry full impulse, so a fast enough player can hold one orb up. That is
       ordinary play rather than an exploit — it consumes the whole finger for
       one orb while juggling all four needs ~1.9 taps/s — and the probe reports
       that band rather than hiding it. */
    spamWindowSeconds: 0.30,
  },

  /* -- Serving -------------------------------------------------------------
     A new or respawned orb is dropped in from the ceiling with a little
     downward velocity, offset from whatever is already in play. */
  serve: {
    /** Beat before the first orb appears, so the player sees the field first. */
    introSeconds: 1.1,
    /** The brief's 2 s replacement after a floor hit. */
    respawnSeconds: 2.0,
    vy: 60,
    vxSpread: 90,
    /** Keep a served orb this many radii clear of a live one where possible. */
    clearanceMult: 2.6,
  },

  /* -- Risk gust -----------------------------------------------------------
     From 40 s a slow horizontal wind drifts across the field. Each segment
     picks a direction and a strength, ramps in over `rampSeconds` (the
     telegraph — the streaks are drawn from the first frame of the ramp and
     brighten with the force, so the wind is always visible before it bites),
     holds, then ramps out into a lull before the next one.

     The gust is the reason a 220 ms player cannot simply lead every orb
     perfectly: the lead is computed from gravity, and the wind is an
     acceleration the lead does not know about. */
  gust: {
    startSeconds: 40,
    periodSeconds: 7.0,
    rampSeconds: 1.6,
    minAccel: 120,
    maxAccel: 215,
  },

  /* -- Anti-exploit: corner cradling ---------------------------------------
     The brief: "orbs within a ball radius of a wall corner for > 1.5 s get a
     gentle outward nudge". `cornerRadiusMult` is measured from the orb CENTRE
     to the corner point, so 2.0 means "the orb is nestled into the corner"
     (its rim is within one radius of both walls) rather than "somewhere near
     the top of the screen".

     The nudge is applied as a floor on the outward speed rather than an
     addition, so an orb that has been parked with almost no velocity still
     leaves; a top corner also gets a downward component, because the cradle
     being defended against is the one where an orb rests in the angle between
     the ceiling and a wall and is fed one cheap tap every second. */
  antiExploit: {
    cornerRadiusMult: 2.0,
    cornerSeconds: 1.5,
    cornerNudge: 260,
    /** How fast the loiter timer bleeds off once the orb leaves the corner. */
    cornerDecayRate: 2.0,
  },

  /* -- Scoring -------------------------------------------------------------
     bounce 20 x live-orb count, high keep +40, all-four-airborne-for-10 s +200.

     A bounce scores only when it is NOT part of a rapid same-orb chain (see
     tap.spamWindowSeconds). One tap, one score: hammering a single orb pays
     for the first tap and nothing after it.

     A surviving player clears the 1,500 target with room to spare — measured,
     the honest bot's winning runs average well over 8,000 — which is exactly
     what the brief's AND is for. The target is not a difficulty knob for
     someone playing the game; it is the clause that fails a player who kept
     three orbs alive by parking them and never actually juggled. The corner
     camper in the gate is the profile it is written against. */
  scoring: {
    bouncePerOrb: 20,
    highKeep: 40,
    allUpBonus: 200,
    allUpSeconds: 10,
  },

  fx: {
    bounceParticles: 10,
    highKeepParticles: 14,
    shatterParticles: 16,
    nudgeParticles: 8,
    serveParticles: 12,
    winParticles: 40,
    loseParticles: 26,
    shatterShake: 8,
    nudgeShake: 2,
    hitStopSeconds: 0.06,
    squashSeconds: 0.22,
    ringSeconds: 0.42,
    bannerSeconds: 1.5,
    trailSampleSeconds: 0.016,
    /** Beat between the run ending on screen and the results screen. */
    endBeatMs: 850,
  },

  hud: {
    lowTimeSeconds: 15,

    /* -- Anti-exploit: pause scumming ------------------------------------
       The kit's loop auto-pauses on `visibilitychange` and the kit is
       immutable, so app-switching mid-crisis froze the world and resumed it
       instantly — the player perceived and planned in stopped time and then
       acted with no reaction latency at all. Review measured the honest bot at
       84.7-87.7% with unlimited pauses (10.3 per run, one notification shade
       each) against its 34-39% band.

       Resume now costs what the pause saved, in two phases. See
       physics.js beginPause/endPause; the rule lives in the pure module so the
       balance gate drives it rather than taking the component's word for it.

       freeze: the world and the clock stay stopped for a visible 3-2-1 count,
       so a returning player is never dropped straight back into a crisis. */
    reacquireFreezeSeconds: 1.5,
    /* lock: the world then runs for this long with taps still refused. This is
       the part that removes the advantage — the situation you paused for keeps
       developing for about as long as the reaction you skipped. Set to a
       nominal human reaction rather than something punitive. */
    reacquireLockSeconds: 0.25,
  },
};

/**
 * Score the Results ring treats as a full circle.
 *
 * A presentation stretch line, not the win condition (that is `targetScore`
 * plus surviving). Set above the win target so the ring keeps meaning something
 * once the target is banked, and below what a strong run posts so it can
 * actually close: the sharp profile averages 16,100 and the honest profile's
 * 90th-percentile survivor posts ~17,000, so 18,000 is a genuine stretch rather
 * than either a formality or an impossibility.
 *
 * Round 1 shipped 9,000, which 97% of honest runs had exceeded by t=44s — the
 * ring was full before the run was over. The gate asserts reachability against
 * the sharp bot's mean.
 */
export const RESULT_TARGET_SCORE = 18000;
