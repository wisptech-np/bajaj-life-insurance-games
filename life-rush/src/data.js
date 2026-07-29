// data.js — Life Rush tunables.
//
// Every number a designer would want to retune lives here. LifeRushGame.jsx and
// the fourteen microgame modules read from this file and never hard-code
// gameplay values; the only constants inside a microgame are drawing details
// (stroke widths, prop proportions).
//
// The pure modules (src/rng.js, src/scheduler.js, src/microgames/*) take this
// object as a parameter — they never import it — so scripts/balance.mjs runs the
// SHIPPED rules headless against the SHIPPED numbers.
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// thresholds, particle budgets, haptics) come from the kit: src/kit/config.js.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar for a rush of tiny scenes: ORANGE is the ACTION — the thing
   the command word is asking you to touch, always. BLUE is the paperwork and
   the cover: policies, cards, jars, the vault. GREEN is a microgame cleared.
   RED is the pressure closing in — the due stamp, the rain band, the scam call,
   the popup. GOLD is money: coins, the SIP fill, the bonus ribbon. If a prop is
   orange, it is what your finger wants. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueDeep: '#00246B',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  orangeDeep: '#A93A0D',
  green: '#28A745',
  greenLt: '#4ADE80',
  greenDeep: '#0E5824',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#9A6B08',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  dangerDeep: '#7A1414',

  bgDark: '#0B1221',
  stageTop: '#0D1A33',
  stageMid: '#0A1E42',
  stageLow: '#061229',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  inkFaint: 'rgba(255,255,255,0.32)',

  paper: '#F4F7FD',
  paperShade: '#CBD8EC',
  paperLine: '#9FB1CC',
  slate: '#24324C',
  slateDeep: '#141E30',

  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
  skin: '#E8B98C',
  skinShade: '#B87F4E',
};

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure modules and therefore by scripts/balance.mjs. Every
   win-rate number quoted in the README was measured by that script against
   exactly these values. */
export const GAME_CONFIG = {
  /* Backstop clock only. The run is 12 microgames long and the balance gate
     sums the pacing constants per run: the longest possible run measures ~71 s
     (see README). The clock exists so a phone that was locked mid-run cannot
     leave a session open for ever. */
  sessionSeconds: 110,

  gamesPerRun: 12,
  lives: 3,

  /* The speed ramp. Microgame n gets an ACTION WINDOW of `startSeconds`
     shrinking linearly to `endSeconds` by microgame 12. `speed` (0..1) is the
     position along that ramp and every microgame scales its own tolerances by
     it, so the last four are not merely shorter, they are tighter. */
  duration: { startSeconds: 3.5, endSeconds: 2.6 },

  /* Difficulty bands map onto slot ranges. Four microgames are drawn from each
     band's roster, so a run is always easy-easy-easy-easy / medium x4 / hard x4.

     The EASY roster is exactly four games, deliberately: the opening four teach
     the four verb families (tap a target, tap a choice, tap a moving thing,
     drag) before the run gets fast. Medium and hard hold five each and drop one
     at random, so 9 of the 14 vary from run to run. */
  bands: ['easy', 'medium', 'hard'],
  bandSlots: 4,

  /* Pacing (seconds). Summed per run by scripts/balance.mjs, which fails if the
     longest possible run breaks the 110 s budget or the build standard's 120 s
     cap.

       intro                 3 - 2 - 1 - GO
       banner                the command word slams in over the darkened scene
       [action window]       the microgame itself (duration ramp above)
       clearBeat / failBeat  the burst or the shake, long enough to read
       breather              600 ms of black, exactly as briefed
       speedUp               the SPEED UP card, every 4th microgame
       endBeat               between the run ending and the results screen */
  pacing: {
    introSeconds: 2.6,
    bannerSeconds: 1.15,
    clearBeatSeconds: 0.45,
    failBeatSeconds: 0.9,
    breatherSeconds: 0.6,
    speedUpSeconds: 1.6,
    speedUpEvery: 4,
    endBeatSeconds: 1.3,
  },

  /* Scoring, exactly as briefed: a clear pays 100 plus the fraction of the
     window you left on the table x 50, a clear inside the first quarter of the
     window pays another 50, and every life still held at the win pays 200. */
  scoring: {
    clear: 100,
    speedBonusMax: 50,
    perfectBonus: 50,
    /** Remaining fraction at or above which a clear is "perfect" (top-25% speed). */
    perfectRemainingFrac: 0.75,
    lifeBonus: 200,

    /* Reference gesture speeds, logical units/second — a brisk but ordinary
       thumb. A drag or a swipe cannot be answered faster than its own length
       divided by these, so that time is discounted before promptness is
       measured (see `scoreFloor` in microgames/common.js). Without it PERFECT
       was unreachable on GIFT!, SIGN! and SPLIT! for anybody: the bonus was
       being withheld for the crime of the target being far away. */
    refDragSpeed: 300,
    refSwipeSpeed: 300,
  },

  /* ─── The fourteen microgames ───────────────────────────
     Shared shape for every entry:

       band     which slot range it can be drawn into
       cue      [lo, hi] fraction of the action window at which the CUE lands —
                the moment the microgame becomes answerable. Randomised per run.
       budget   [b0, shrink] seconds you get after the cue, as
                b0 x (1 - shrink x speed).

     THE CUE RULE, and why every microgame has one. A microgame whose target is
     answerable from frame one is not a reaction test: you touch it immediately
     and latency never costs anything, and a player (or a bot) who simply spams
     the glass clears the whole pool. So every microgame stays LOCKED until its
     cue — the stamp starts falling, the ad pops, the banner reveals which jar —
     and a touch before the cue fails it outright ("jumped in early"). Input is
     ignored entirely during the command banner, so the only way to jump the gun
     is to act inside the window but ahead of the cue.

     That single invariant is what makes `budget` the honest difficulty knob:
     the balance gate's bots differ only in how long they take to respond to the
     cue and how precisely they land, and the measured per-microgame clear rates
     in the README fall straight out of it. */
  micro: {
    /* -- EASY: the four verb families ---------------------------------- */
    pay: {
      band: 'easy',
      cue: [0.10, 0.30],
      budget: [0.38, 0.30],
      /** PAY button, logical units (the stage is 100 x 130). */
      btn: { x: 24, y: 92, w: 52, h: 19 },
      /** Where the OVERDUE stamp lands when the budget runs out. */
      stamp: { x: 50, y: 58, r: 17, fromY: -22 },
    },
    pick: {
      band: 'easy',
      cue: [0.12, 0.32],
      budget: [0.48, 0.30],
      /** Three cover cards in a row. */
      card: { w: 25, h: 39, y: 62, xs: [21, 50, 79] },
      kinds: ['health', 'home', 'motor'],
    },
    catch: {
      band: 'easy',
      cue: [0.10, 0.28],
      budget: [0.55, 0.30],
      /** The piggy falls from `fromY` and is lost past the shelf at `shelfY`. */
      drop: { fromY: 26, shelfY: 100, r: 11, xMin: 24, xMax: 76 },
    },
    gift: {
      band: 'easy',
      cue: [0.10, 0.28],
      budget: [0.66, 0.28],
      ribbon: { x: 50, y: 105, r: 11 },
      box: { x: 33, y: 34, w: 34, h: 30 },
    },

    /* -- MEDIUM: swipe, hold, timed drag, rhythm ----------------------- */
    sign: {
      band: 'medium',
      cue: [0.10, 0.30],
      budget: [0.68, 0.30],
      /** The dotted line. A signature must start left of `startX` and finish
          right of `endX`, staying within `bandY` of the line. */
      line: { y: 88, x0: 24, x1: 78, startX: 42, endX: 62, bandY: 15 },
    },
    swat: {
      band: 'medium',
      cue: [0.08, 0.26],
      budget: [0.90, 0.30],
      /** The scam-call handset drifts on a Lissajous path. */
      /** The path is `sin(wt+p) - sin(p)`, so it starts at (cx, cy) and swings
          up to 2 x ax / 2 x ay away from it. */
      phone: { cx: 50, cy: 60, ax: 16, ay: 13, w: 19, h: 33, hitR: 20, baseHz: 0.42, speedHz: 0.34 },
      /** A swipe shorter than this is a flinch, not a swat. */
      minSwipe: 16,
    },
    shield: {
      band: 'medium',
      cue: [0.10, 0.28],
      budget: [0.80, 0.32],
      /** Umbrella slides along a rail; the family appears somewhere on it. */
      rail: { y: 100, xMin: 14, xMax: 86, startX: 50 },
      family: { xMin: 20, xMax: 80, tol: 7 },
      /** Seconds this grip must already have lasted when the rain lands. An
          umbrella you are not holding is not cover — and without it a single
          tap cleared a microgame whose declared verb is DRAG. */
      minHold: [0.30, 0.25],
      rain: { fromY: -6, toY: 92 },
    },
    grow: {
      band: 'medium',
      cue: [0.10, 0.28],
      /** Hold has no external deadline — the overflow is the deadline — but the
          budget still bounds how late you may START the hold. */
      budget: [0.80, 0.30],
      jar: { x: 32, y: 34, w: 36, h: 72 },
      /** Seconds of holding until the fill reaches the CENTRE of the target
          band, and the band's width expressed in seconds of fill. Overflow
          (fill past the band) fails immediately, so the band IS the window. */
      reach: [0.72, 0.20],
      bandSeconds: [0.230, 0.34],
    },
    topup: {
      band: 'medium',
      cue: [0.10, 0.30],
      budget: [0.46, 0.30],
      card: { x: 25, y: 48, w: 50, h: 44 },
      /** Maximum gap between the two taps of the double-tap. A third tap on the
          card over-tops the cover and fails. */
      gap: [0.30, 0.28],
    },

    /* -- HARD: precision and timing ------------------------------------ */
    snooze: {
      band: 'hard',
      cue: [0.08, 0.24],
      budget: [0.88, 0.32],
      ad: { x: 20, y: 40, w: 60, h: 54 },
      /** The close X. Tiny; one fumble on the ad body grows it by `growth` and
          costs you the time, a second fumble fails the microgame. */
      close: { r: 4.8, growth: 1.75 },
    },
    stamp: {
      band: 'hard',
      cue: [0.08, 0.24],
      /* Long enough that at least one pass through square always falls inside
         it after a median reaction — the swing's half-period is 0.73 s at the
         last slot, so anything shorter makes the microgame a lottery on where
         the stamp happened to be when the cue landed. Measured: the gate's
         perfect bot went from 91.3% to 100% on this change alone. */
      budget: [1.50, 0.30],
      form: { x: 20, y: 58, w: 60, h: 52 },
      seal: { x: 50, y: 84, r: 17 },
      /** The APPROVED stamp swings about the seal. `amp` radians of swing at
          `hz` cycles/second; a tap counts while |angle| <= `tol` radians. */
      swing: { amp: 1.00, hz: [0.46, 0.50], tol: [0.45, 0.29] },
    },
    split: {
      band: 'hard',
      cue: [0.10, 0.28],
      budget: [1.00, 0.30],
      coin: { x: 50, y: 106, r: 11 },
      jars: [
        { key: 'needs', label: 'NEEDS', x: 13, y: 40, w: 30, h: 34 },
        { key: 'wants', label: 'WANTS', x: 57, y: 40, w: 30, h: 34 },
      ],
    },
    lock: {
      band: 'hard',
      cue: [0.08, 0.24],
      budget: [1.60, 0.26],
      dial: { x: 50, y: 64, r: 30, hitR: 34 },
      /* The needle sweeps at `rate` turns/second and the green notch is half
         `notch` radians wide, at a random angle. `lead` is how far BEHIND the
         notch the needle parks, as notch + lead[0] + rand x lead[1] radians.

         The needle makes exactly ONE pass: at the hard slots a second costs
         1.39 s against a 1.18 s budget. So the window has to be wide enough
         and, more importantly, has to OPEN late enough that a median reaction
         is ready for it — the first build's lead of 0.9-2.7 rad shut the notch
         ~400 ms after the cue on a fifth of slot-12 seeds, before a human could
         have moved, and LOCK! alone carried 14.2% of all expected failures. */
      sweep: { rate: [0.50, 0.44], notch: [0.52, 0.26], lead: [2.1, 1.5] },
    },
    wake: {
      band: 'hard',
      cue: [0.08, 0.22],
      budget: [1.45, 0.26],
      clock: { x: 50, y: 62, r: 27, hitR: 33 },
      /** One pass only: the hand leaves 12 and sweeps clockwise, reaching the 9
          after `arrive` seconds. A tap within `tol` seconds of that instant is
          the premium paid on the 9th; anything else is a miss. */
      hand: { arrive: [1.05, 0.28], tol: [0.150, 0.32] },
    },
  },

  fx: {
    clearParticles: 18,
    perfectParticles: 26,
    failParticles: 16,
    lifeLostParticles: 22,
    winParticles: 40,
    clearShake: 2.5,
    failShake: 8,
    hitStopSeconds: 0.06,
    /** How long the +points / reason text hangs about. */
    floatSeconds: 0.9,
  },

  hud: {
    /** Countdown bar turns red under this fraction of the action window. */
    lowFrac: 0.28,
  },

  /* Copy shown on the results/how-to screens. */
  theme: {
    tagline: 'Life comes at you fast — pay, protect, pick and plan in seconds.',
  },
};

/**
 * Score the Results ring treats as a full circle.
 *
 * A presentation stretch line, not the win condition. The hard ceiling is
 * 12 x (100 clear + 50 speed + 50 perfect) + 3 x 200 lives = 3,000, which needs
 * every one of the twelve cleared inside the first quarter of its window with
 * no life dropped. `scripts/balance.mjs` brute-forces that ceiling against the
 * shipped scheduler and fails if this value exceeds it, so it can never
 * silently become unreachable when the scoring is retuned.
 */
export const RESULT_TARGET_SCORE = 2200;
