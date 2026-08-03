// data.js — Safe Crossing tunables.
//
// Every number a designer would want to retune lives here. traffic.js (the pure
// rules module) and SafeCrossingGame.jsx (the canvas component) both read from
// this file and never hard-code gameplay values; the only constants in the
// component are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.
//
// Everything under `road`, `vehicles`, `spawn`, `hold` and `scoring` is consumed
// by traffic.js, which scripts/balance.mjs imports directly — so the balance
// table below is measured against the numbers that actually ship.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar for the junction: BLUE/TEAL/GREEN are the family vehicles you
   are protecting, ORANGE is the risk truck (the thing you cannot control),
   GREEN is a safe crossing, RED is a crash, and the Claim Cushion shield is
   brand blue — protection is always blue, never red.

   STATE grammar (2026-08-03). Four states, and each one is signalled by a
   SHAPE as well as a colour, so the board still reads in greyscale, on a dim
   phone, or to a colour-blind player:

     GREEN + open corner brackets ......... junction clear, nothing to answer
     RED + filled triangles / diamond ..... predicted collision, act now
     BLUE + closed draining arc ........... you are holding this one (protection
                                            is blue everywhere in this repo)
     ORANGE + dashed / hazard chevrons .... control you do not have — the risk
                                            truck, and a driver out of patience

   Red is used for exactly one thing: a collision that is about to happen or has
   just happened. It is deliberately NOT the "held" colour any more — a held
   vehicle is the player protecting somebody, which is blue. */
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
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  cityTop: '#0A1A33',
  cityLow: '#060F20',
  block: '#101C33',
  blockLt: '#16253F',

  asphalt: '#232B3B',
  asphaltLt: '#2E3849',
  asphaltDeep: '#1A212E',
  kerb: 'rgba(255,255,255,0.14)',
  laneMark: 'rgba(255,255,255,0.30)',
  zebra: 'rgba(255,255,255,0.42)',
  boxLine: 'rgba(255,200,69,0.35)',

  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',

  /* Indicator layer. Split out from the base palette because these five are the
     ONLY colours allowed to carry state, and they must not drift into decoration. */
  // Motion streak behind a rolling vehicle. Presence/absence of the streak is
  // the non-colour half of the go/stop read: stopped vehicles have none.
  trail: 'rgba(214,232,255,1)',
  // Faint brand shield embossed into the two off-road city blocks.
  watermark: 'rgba(30,107,224,0.13)',
  watermarkLine: 'rgba(30,107,224,0.26)',
};

/* ─── Gameplay configuration ────────────────────────────── */
export const GAME_CONFIG = {
  /** Session cap. Brief: 20 vehicles through within 110 s. */
  sessionSeconds: 110,
  /** Vehicles that must clear the junction to win. */
  targetCrossed: 20,
  /** The single Claim Cushion: the first crash is forgiven, the second ends it. */
  claimCushions: 1,

  /* -- Junction geometry --------------------------------------------------
     A 4-way crossing with ONE lane per direction and fixed straight paths, so
     the shared centre box has exactly four conflict points (N|S x E|W). Lanes
     keep left (Indian traffic), which is why southbound sits to the right of
     the centre line and eastbound sits below it.

     All sizes derive from the measured canvas so the junction is the same
     junction on a 360 px phone and a 430 px one. */
  road: {
    // Half the road width == one lane. clamped so lanes stay tappable.
    laneWidthFrac: 0.108,
    laneWidthPx: [34, 48],
    // Junction centre, as a fraction of canvas height. Slightly below the
    // middle so the HUD strip along the top never sits over the box.
    centerYFrac: 0.53,
    // Extra clearance beyond half a vehicle length, so a spawning vehicle is
    // fully off-canvas on every approach.
    spawnPadPx: 14,
    // Off-canvas approach runway, as a fraction of the short canvas edge. The
    // visible stretch of road is only the last few seconds of each approach;
    // the rest of the queue waits off screen. This is the density knob — see
    // the balance note under `spawn`.
    runwayFrac: 1.0,
    // Zebra bar depth as a fraction of the lane width.
    zebraFrac: 0.34,
  },

  /* -- Vehicles -----------------------------------------------------------
     `weight` is the spawn share in percent and MUST sum to 100: the brief puts
     risk trucks at 10% of spawns, and that is `truck.weight`.

     Lengths and widths are fractions of the lane width, so vehicles keep their
     proportions at every canvas size. Speeds are px/s at the reference lane
     width and are scaled with it (see traffic.js buildJunction ⇒ `scale`), so a
     vehicle always takes the same number of SECONDS to reach the junction
     regardless of screen size — which is what keeps the balance numbers valid
     across devices.

     Deceleration is deliberately gentle (a hard stop would make the tap feel
     like a teleport and would remove all timing skill): a car at cruise needs
     ~0.25 s and ~7 px to stop, and traffic.js refuses a brake once a vehicle's
     nose is inside the box — nobody stops halfway across a junction, and a
     mistap that parked a car on the conflict point would be an unavoidable
     pile-up rather than a mistake. */
  vehicles: {
    accel: 118,
    decel: 205,
    // Bumper-to-bumper gap a queued vehicle keeps, and the distance at which it
    // starts easing off. Same-lane following NEVER crashes — vehicles queue.
    stopGapPx: 10,
    followGapPx: 82,
    // Reference lane width the px/s speeds below were authored against.
    refLaneWidthPx: 44,
    // Per-driver pace spread around the type's cruise speed. Some people are
    // quicker off the line — and it is the knob the dispatcher uses to aim a
    // conflict (see traffic.js pickSpawn). Without it the four approaches offer
    // only two distinct arrival times and the junction is never contested.
    speedVariance: 0.36,
    types: [
      {
        key: 'scooter',
        label: 'Scooter',
        weight: 30,
        speed: 62,
        lenFrac: 0.64,
        widFrac: 0.34,
        brakeable: true,
        body: '#3BC9B0',
        bodyLt: '#8FF0DF',
        trim: '#0E5F55',
      },
      {
        key: 'car',
        label: 'Family car',
        weight: 42,
        speed: 52,
        lenFrac: 0.94,
        widFrac: 0.52,
        brakeable: true,
        body: '#1E6BE0',
        bodyLt: '#7FB6FF',
        trim: '#003DA6',
      },
      {
        key: 'van',
        label: 'School van',
        weight: 18,
        speed: 43,
        lenFrac: 1.18,
        widFrac: 0.56,
        brakeable: true,
        body: '#FFC845',
        bodyLt: '#FFE9A8',
        trim: '#8A6208',
      },
      {
        key: 'truck',
        label: 'Risk truck',
        weight: 10,
        speed: 58,
        lenFrac: 1.38,
        widFrac: 0.60,
        // The whole point of the truck: TAP does nothing. Time everyone else.
        brakeable: false,
        body: '#F26522',
        bodyLt: '#FFA96B',
        trim: '#8C2E05',
      },
    ],
  },

  /* -- Spawn schedule -----------------------------------------------------
     One vehicle every `startInterval` s ramping to `endInterval` s over
     `rampSeconds`, spread across the four approaches, so traffic is never the
     scarce resource: a run is lost at the junction, not for want of vehicles.

     BALANCE — measured, not asserted. `node scripts/balance.mjs --runs 400`
     drives the SHIPPING rules in src/traffic.js. Three bots, all of them
     restricted to vehicles that are ON CANVAS (half of every approach runway is
     off screen, and a bot that brakes what the player cannot yet see is not
     playing the same game): the brief's bot, which holds the later-arriving
     vehicle of every predicted overlap; the same bot plus the one thing it
     never learns, that when the later vehicle is a risk truck you hold the
     OTHER one; and `park-N/S`, which plays the game's one degenerate idea and
     nothing else.

       canvas      reaction bot   truck-aware   park-N/S   do-nothing (2nd crash)
       407x612        34.3%          52.8%        5.0%       6.3 s median
       407x556        38.5%          57.5%        5.0%       5.4 s median
       338x452        32.5%          51.5%        4.8%       5.5 s median

     Stable across seeds: over 3 seeds x 3 sizes the reaction bot spans
     32.0-38.5% and park-N/S 4.3-7.2%.

     Reaction bot: 1.5 crashes and 6.4 near misses per run, ~33 s per run, ~21
     vehicles dispatched; a winning run lasts ~38 s. The ~18-point spread to the
     truck-aware line is the value of the risk-truck mechanic: it is the one
     thing a bot that only knows "hold whoever is later" cannot solve, and the
     one thing a player learns in their first run. Truck-versus-truck pairings —
     the only genuinely unavoidable collision — are 0.3-1.2% of all crashes,
     because the dispatcher actively refuses to create them (traffic.js
     pickSpawn, `deadlock`).

     Three knobs got the junction there, and each one is load-bearing.
     Measured at 407x612, 150 runs per cell, everything else at shipping values:

     - `road.runwayFrac` (density). The visible stretch of an approach is only
       ~4 s long, so with vehicles spawning at the canvas edge there is barely
       ONE perpendicular vehicle in play at a time and the dispatcher has
       nothing to aim at — 37% of spawns contested, bot win 61%. Extending each
       approach off-canvas puts 4-6 vehicles on every runway:
         runway  0.60    0.80    1.00*   1.30
         bot win 33.3%   33.3%   35.3%   41.3%
         run len 28.4s   29.7s   32.9s   36.6s
       Below ~0.8 the warm start has nowhere to queue and the do-nothing crash
       clock collapses to 4.5 s; above ~1.3 only the run gets longer.
     - `conflictBias` (contest rate):
         bias    0.78    0.84    0.88    0.90*   0.92    0.96
         bot win 24.7%   26.7%   32.7%   34.3%   38.7%   42.7%
       Counter-intuitively a bias near 1 makes the game EASIER: every conflict
       is then aimed cleanly and telegraphed from the moment of spawn, while it
       is the leftover random spawns that go wrong late.
     - `preload` (warm start). Without it the first ~15 s of every run is an
       empty crossroads and a do-nothing player took 23.8 s (median, 400 runs)
       to crash out, failing the brief's under-15 s gate. Warm vehicles are laid
       down through the same dispatcher, so the board opens already contested:
       2.3 vehicles on canvas at t=0, ~4.5 by t=2 s, first crash for a
       do-nothing player at 3.3 s.  (* = shipped) */
  spawn: {
    startInterval: 2.4,
    endInterval: 1.4,
    rampSeconds: 78,
    jitterFrac: 0.16,
    // Beat of clear road before the first scheduled vehicle.
    firstDelay: 1.1,
    // Warm start: vehicles already on the runways when the run begins, at these
    // fractions of the shortest runway. The top of the range is deliberately
    // high — the leading two must be ON CANVAS at t=0 or the run opens on an
    // empty crossroads — and `minLeadPx` keeps even those clear of the box.
    preload: { count: 6, minProgress: 0.40, maxProgress: 0.90, minLeadPx: 70 },
    conflictBias: 0.90,
    // Distinct driver paces the dispatcher tries when aiming a spawn.
    paceCandidates: 9,
    // Target overlap depth, as a fraction of the pair's own overlap window.
    // 0 aims at a knife-edge graze (which resolves itself); ~0.6 aims at an
    // unambiguous collision course the player has to answer.
    aimOverlap: 0.6,
    // An approach is unavailable while a vehicle is still within this distance
    // of its spawn point; the spawner then picks another approach (and skips
    // the beat entirely if all four are backed up).
    minSpawnGapPx: 92,
  },

  /* -- Brake hold ---------------------------------------------------------
     `maxSeconds` is a driver's TOTAL patience for the whole run, not a per-hold
     timer: it counts down only while the vehicle is stopped for the player, it
     is never refunded by a release, and when it reaches zero the driver goes
     and will not stop again.

     This closes the game's one degenerate strategy. The two vertical lanes are
     parallel to each other and so are the two horizontal ones, so a pair from
     the same axis can never conflict; parking the leading N and S vehicles
     therefore removes EVERY conflict pair from the board and the run wins
     itself off E/W traffic alone. A per-hold timer does NOT close it — the
     player simply re-taps after each release, whether the release was theirs or
     the driver's. Measured against the first (per-hold) implementation: a
     3 scans/s, 300 ms, 4 taps/s reflex bot that did nothing but keep the lead
     N and S vehicles held won 96.0% / 92.7% of runs at 0.54 taps/s, and the
     result was identical at `maxSeconds` 6 and infinity. With a cumulative
     budget each vehicle can be delayed at most `maxSeconds` in its life and
     then crosses uncontrolled, so the deferred conflicts all come due at once.

     Normal play never reaches the limit: resolving one conflict costs 1-2 s of
     the 6 s budget, and the draining arc around a held vehicle shows exactly
     how much is left (it turns orange with `warnSeconds` spent). */
  hold: {
    maxSeconds: 6,
    warnSeconds: 4.4,
  },

  /* -- Scoring ------------------------------------------------------------ */
  scoring: {
    crossPoints: 50,
    nearMissPoints: 30,
    // Clearance (px) below which a non-contact pass counts as smart timing.
    nearMissGapPx: 24,
  },

  /* -- Presentation ------------------------------------------------------- */
  fx: {
    crossParticles: 10,
    nearMissParticles: 12,
    crashParticles: 26,
    cushionParticles: 34,
    winParticles: 40,
    crashShake: 8,
    cushionShake: 5,
    hitStopSeconds: 0.07,
    // Seconds a crash scorch / cushion ring stays on the road.
    scorchSeconds: 1.1,
    cushionFlashSeconds: 1.0,
    bannerSeconds: 1.5,
    // Recovery time for a vehicle's squash after it is tapped.
    squashSeconds: 0.24,
  },

  /* -- Danger / safety indicators ----------------------------------------
     The 2026-08-03 review's priority: "the player must be able to read 'safe
     now' versus 'not safe now' instantly and peripherally, while their
     attention is on the mover."

     Everything here is drawn AT THE JUNCTION BOX, because that is where the eye
     already is. Nothing here relies on colour alone:

     - clear      four OPEN corner brackets, thin, perfectly static.
     - contested  the same four corners become FILLED TRIANGLES pointing into
                  the box, the outline thickens, and the whole frame pulses.
                  Shape, stroke weight and motion all change at once.
     - point      each predicted collision puts a filled DIAMOND on the exact
                  square metre where the two vehicles will meet. A diamond is
                  the only rotated-square shape on the board — every vehicle,
                  block and marking is an axis-aligned rounded rect or a circle.
     - vehicle    the two vehicles of a predicted pair carry a solid red ring
                  with a hazard TRIANGLE at twelve o'clock, and only while they
                  are within `warnRangeLanes` of the box. The old marker was a
                  thin orange dashed circle drawn on every warned vehicle
                  anywhere on the runway, which put a ring on five of the seven
                  vehicles on screen — ambient, and therefore not a signal. */
  indicator: {
    // Corner bracket / triangle leg, as a fraction of the lane width. The box is
    // only two lane widths across, so anything past ~0.3 makes the four corner
    // triangles meet and the whole box reads as a solid red block that hides the
    // keep-clear hatch and the vehicles inside it. Measured at 320x568 and
    // 412x700: 0.46 filled the box, 0.26 leaves the hatch legible.
    cornerFrac: 0.26,
    clearWidth: 2,
    contestWidth: 2.6,
    // Pulse rate of every contested indicator, in Hz. One rate for all of them
    // so the whole danger layer beats together and reads as one alarm.
    pulseHz: 2.1,
    // Conflict-point diamond half-diagonal, as a fraction of the lane width.
    diamondFrac: 0.18,
    // Per-vehicle ring is suppressed beyond this many lane widths from the box.
    warnRangeLanes: 4.5,
    // Hazard triangle above the ring, as a fraction of the lane width.
    triFrac: 0.30,
    // Motion streak: length as a fraction of vehicle length at full cruise, and
    // the fraction of cruise below which a vehicle is drawn as stopped.
    trailLenFrac: 1.05,
    trailMinSpeed: 0.16,
    trailAlpha: 0.30,
  },

  /* -- HUD layout ---------------------------------------------------------
     Two strips and nothing else. The old HUD stacked three rows down the top of
     the stage (pills at 10, progress at 62, status chips at 96), and on a
     320x568 handset the third row landed squarely on the southbound approach
     lane — a status chip sitting on top of moving traffic. Score/Through/Time
     and the progress rail are now ONE card at the top; the state chips moved to
     the bottom-left, which is a city block on every canvas size and therefore
     never has traffic under it. */
  layout: {
    // Inset of the HUD strips from the stage edge.
    inset: 10,
    // Gap between the two bottom-left chips.
    chipGap: 5,
    // Mute button edge (also its touch target, kept at the 44 px floor).
    controlSize: 44,
  },

  hud: {
    endBeatMs: 700,
    lowTimeSeconds: 15,
    // Danger hints are rescanned a few times a second, never per frame: an
    // O(n^2) prediction sweep has no business running at 120 Hz. The margin
    // lights a pair up slightly before it is strictly a predicted overlap, so
    // the player is warned rather than informed.
    conflictScanSeconds: 0.12,
    conflictMarginSeconds: 0.35,
    // Tap slop around a vehicle's box. On top of it, pickVehicle() pads every
    // vehicle out to `minTapTargetPx` on EACH axis independently: a flat pad
    // large enough for a scooter's 39 px long axis still left its short axis at
    // 42 px on a 338x452 canvas, because the pad is shared and the two axes are
    // not the same size.
    tapPadPx: 15,
    minTapTargetPx: 44,
  },
};

/** Vehicle types as the screens want them (risk truck last). */
export const VEHICLE_TYPES = GAME_CONFIG.vehicles.types;

/** Target the Results ring treats as a full circle. */
export const RESULT_TARGET_SCORE =
  GAME_CONFIG.targetCrossed * GAME_CONFIG.scoring.crossPoints;
