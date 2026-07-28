// data.js — Wealth Carrom tunables.
//
// Every number a designer would want to retune lives here. board.js, physics.js,
// rules.js and WealthCarromGame.jsx read from this file and never hard-code a
// gameplay value; the only constants in the component are drawing details
// (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar on the board: GOLD is wealth (the nine coins you are chasing),
   RED is the Queen of Protection — the one piece worth more than any coin but
   only if you cover her — CHARCOAL/violet is risk (the two discs that cost you
   money and a foul), WHITE/ORANGE is the player's own hand (the striker, the aim
   line, the power meter). Green is reserved for progress toward the target, so
   green always means "you are winning" and never means a hazard. */
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
  goldDeep: '#8F6209',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  // Board: a deep navy "felt" inside a brand-blue frame with a gold inlay, so
  // the board reads as Bajaj Life rather than as a teak carrom board.
  feltTop: '#12305F',
  feltMid: '#0E2650',
  feltLow: '#081A3A',
  frameTop: '#0A4396',
  frameLow: '#04255C',
  inlay: 'rgba(255,200,69,0.55)',
  inlayDim: 'rgba(255,200,69,0.22)',
  pocketRim: 'rgba(255,200,69,0.42)',
  pocketWell: '#02060F',

  striker: '#F4F7FF',
  strikerRim: '#F26522',
  queen: '#E5343C',
  queenLt: '#FF7A80',
  queenDeep: '#7C1015',
  risk: '#3A3350',
  riskLt: '#8C7FB8',
  riskEdge: '#B9A8F0',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Gameplay configuration ──────────────────────────────
   `board`, `layout`, `physics`, `scoring` and `fouls` are consumed by the pure
   modules src/board.js, src/physics.js and src/rules.js — the same modules
   scripts/balance.mjs imports and runs headless, so every number below is
   exactly what the balance table measured. */
export const GAME_CONFIG = {
  sessionSeconds: 120,
  strikesPerSession: 8,

  /* -- Board geometry -----------------------------------------------------
     The board is a square inscribed in whatever canvas the stage measures, with
     room reserved above for the HUD and below for the power meter. Every radius
     is a fraction of the PLAY side (the felt inside the frame), never a pixel
     count, so a 360 px handset and a 430 px one play the same board. */
  board: {
    sideMarginFrac: 0.02,
    // Vertical room reserved for HUD chrome above / the power meter below.
    //
    // The top reserve is 0.23 rather than something tighter because the HUD is
    // two rows (~100 px) and the board's TOP POCKETS sit within a few pixels of
    // the felt's top corners. At 0.155 the progress pill covered both of them on
    // a 360x640 handset — you could not see the hole you were shooting at. The
    // fraction is set so the board always starts below the HUD on the shortest
    // supported canvas; on a tall one the square is width-limited anyway, so
    // this costs nothing there.
    topReserveFrac: 0.23,
    bottomReserveFrac: 0.125,
    // Where the square sits in whatever vertical room is left over (0 = top).
    verticalBiasFrac: 0.42,
    // Frame thickness, x board side.
    frameFrac: 0.052,
    discRadiusFrac: 0.052,
    strikerRadiusFrac: 0.0645,
    // Pocket mouth, x disc radius. The single biggest balance knob: it decides
    // how much of a rebound counts as "in". See the balance note in
    // scripts/balance.mjs.
    pocketRadiusDiscs: 2.10,
    // Pocket centre pulled in from the felt corner along the diagonal,
    // x pocket radius, so the hole reads as cut into the corner.
    pocketInsetFrac: 0.16,
    // Baseline height above the near rail, x play side, and how far its ends
    // are inset from the side rails.
    baselineFrac: 0.135,
    baselineInsetFrac: 0.155,
  },

  /* -- Opening rosette ----------------------------------------------------
     Queen of Protection dead centre, an inner ring of six and an outer ring of
     five: twelve pieces, 9 gold + 1 queen + 2 risk, exactly as the brief asks.

     The two risk discs sit at the top and BOTTOM of the inner ring — the bottom
     one directly between the baseline and the queen. A straight opening shot at
     the queen therefore runs through a disc that costs 150 and a foul, so the
     queen has to be worked for from an angle or after the rosette is broken.
     That is the financial hook laid out as geometry: the protection at the
     centre of a portfolio is never the easiest thing to reach for.

     `radiusDiscs` is in disc radii from the centre. Inner 2.08 has the six
     almost touching; outer 4.15 clears the inner ring by 2.07 radii even when
     the two rings line up, so nothing is born overlapping at any canvas size. */
  layout: {
    rings: [
      {
        count: 6,
        radiusDiscs: 2.08,
        startDeg: -90,
        kinds: ['risk', 'gold', 'gold', 'risk', 'gold', 'gold'],
      },
      {
        count: 5,
        radiusDiscs: 4.15,
        startDeg: -54,
        kinds: ['gold', 'gold', 'gold', 'gold', 'gold'],
      },
    ],
  },

  /* -- Disc physics -------------------------------------------------------
     Exponential velocity decay (a sliding disc on a powdered board sheds speed
     in proportion to the speed it has), equal-restitution disc-vs-disc impulses
     with a heavier striker, and dead-ish cushions. */
  physics: {
    // Reference play-side width, px. Every velocity below is authored against a
    // felt this wide and scaled by `board.scale` = play / refPlayPx, so the
    // striker covers the same FRACTION of the board on every device. Without it
    // a small handset would play like a much faster board.
    refPlayPx: 348,

    // Friction as a half-life: a disc loses half its speed every 0.45 s.
    // k = ln2 / halfLife; v(t) = v0 * e^(-k t); total glide = v0 / k.
    frictionHalfLifeSeconds: 0.45,
    // Below this the disc is parked. Without a floor the exponential never
    // reaches zero and a strike would never resolve.
    stopSpeed: 8,

    // Disc-vs-disc restitution (brief: 0.92) and the deadER cushions of a real
    // board — a rail that returned 0.9 would keep the rosette rattling for
    // twice as long and blow the 6 s settle budget.
    restitution: 0.92,
    wallRestitution: 0.62,
    // The striker is a heavier piece than a coin, which is what lets it drive
    // through the rosette instead of stopping dead on first contact.
    strikerMass: 1.55,
    discMass: 1,

    // Flick power, px/s at the reference play width.
    minPower: 430,
    maxPower: 1520,
    // Pull-back travel that maps to full power, x play side. Beyond it the
    // meter is pinned, so a long drag off the bottom of the screen is safe.
    maxPullFrac: 0.42,
    // Shortest pull that fires at all, x play side. Anything less is treated as
    // a placement nudge and cancels the shot.
    minPullFrac: 0.055,

    // Collision substepping. Each substep may not advance a disc by more than
    // this fraction of a disc radius, so nothing tunnels through a coin or a
    // rail at full power.
    maxSubstepTravelFrac: 0.3,
    // Headroom on the substep count. It is sized from the fastest piece at the
    // START of a tick, but collisions during the tick can leave something faster
    // than that.
    //
    // A single striker-into-coin hit amplifies by M(1+e)/(M+m) = 1.167x, but
    // that is not the worst case: on a break the struck coin is hit again by the
    // pieces behind it within the same tick, and the measured worst single-tick
    // amplification is 1.517x. At the old 1.25 that meant a genuine peak could
    // cover 31.6% of a disc radius against a 30% budget — empirically benign,
    // but the anti-tunnelling invariant has to hold on paper, not just in the
    // seeds that were run. 1.6 covers the measured worst case with margin.
    substepSafety: 1.6,
    maxSubsteps: 10,
    // Hard watchdog on one strike. Deliberately well ABOVE the 6 s settle
    // target the balance sim asserts, so the watchdog can never mask a friction
    // regression by silently parking the board at exactly 6 s.
    settleWatchdogSeconds: 9,
  },

  /* -- Scoring and the win line -------------------------------------------
     Gold coin +100. Queen of Protection +500, but the queen only pays when she
     is COVERED — a gold coin pocketed on the same strike or the very next one.
     An uncovered queen is put back on the centre spot and pays nothing, which
     is the classic carrom rule and, not by accident, the whole pitch: cover is
     only worth something if you complete it.

     A covered queen also counts as `queenCoinEquivalent` coins toward the
     target, so the fastest route to the win line runs through protection. */
  scoring: {
    coinPoints: 100,
    queenPoints: 500,
    riskPenalty: 150,
    targetCoins: 6,
    queenCoinEquivalent: 2,
  },

  fouls: {
    // Pocketing a risk disc, or pocketing your own striker.
    max: 3,
  },

  fx: {
    foulShake: 8,
    hitStopSeconds: 0.06,
    strikeParticles: 10,
    clackParticles: 6,
    railParticles: 5,
    coinParticles: 18,
    queenParticles: 30,
    riskParticles: 20,
    winParticles: 40,
    bannerSeconds: 1.5,
    pocketFlashSeconds: 0.55,
    discSquashSeconds: 0.2,
    // Minimum impact speed (px/s at reference width) that earns a clack sound
    // and sparks — otherwise a settling rosette machine-guns the speaker.
    clackMinImpact: 150,
  },

  hud: {
    endBeatMs: 700,
    lowTimeSeconds: 20,
    // Beat between the board settling and the next strike being allowed.
    reloadSeconds: 0.35,
  },
};

/** Pieces on the board at break, as the screens want to list them. */
export const PIECE_LEGEND = [
  { key: 'gold', label: 'Wealth coin', value: `+${GAME_CONFIG.scoring.coinPoints}`, count: 9 },
  { key: 'queen', label: 'Queen of Protection', value: `+${GAME_CONFIG.scoring.queenPoints}`, count: 1 },
  { key: 'risk', label: 'Risk disc', value: `-${GAME_CONFIG.scoring.riskPenalty}`, count: 2 },
];

/** Coins-equivalent the Results ring treats as a full circle: the win line. */
export const RESULT_TARGET_COINS = GAME_CONFIG.scoring.targetCoins;
