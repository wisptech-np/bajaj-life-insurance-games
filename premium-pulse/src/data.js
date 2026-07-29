// data.js — Premium Pulse tunables.
//
// Every number a designer would want to retune lives here. PremiumPulseGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, glow radii, easing).
//
// The pure module src/track.js takes this object as a PARAMETER — it never
// imports it — so scripts/balance.mjs runs the SHIPPED schedule builder and the
// SHIPPED judge headless against the SHIPPED numbers.
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Tokens are the repo design system (index.css): --ls-blue #005BAC,
   --ls-blue-dark #004080, --ls-blue-light #3B8DD4, --ls-orange #F26922,
   --ls-orange-bright #FF8533, Poppins.

   Colour grammar for this game:
     BLUE   is a premium falling due — the ring you are meant to meet.
     RED    is an impulse buy: a spiky ring you must let pass untouched.
     ORANGE is you — the policy badge at the centre and the combo fire.
     GOLD   is a PERFECT beat and the bonus double.
     GREEN  is correct inhibition: a temptation skipped. */
export const COLORS = {
  blue: '#005BAC',
  blueDark: '#004080',
  blueLt: '#3B8DD4',
  blueGlow: 'rgba(59,141,212,0.55)',
  bluePale: '#BEE0FF',

  orange: '#F26922',
  orangeLt: '#FF8533',
  orangeDeep: '#B3400E',

  gold: '#FFC845',
  goldLt: '#FFE38A',

  green: '#22C55E',
  greenLt: '#6EE7A8',

  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  dangerDeep: '#7A1414',

  bgTop: '#051a3a',
  bgMid: '#0a2c5c',
  bgLow: '#03102a',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure module src/track.js and therefore by
   scripts/balance.mjs. Every win-rate number quoted in the README and in
   okf-brain/premium-pulse was measured by that script against exactly these
   values. */
export const GAME_CONFIG = {
  /* Backstop only. The TRACK is authoritative: the run ends when the last ring
     has resolved (~88.6 s including the end beat, printed by the balance gate).
     This clock exists so a phone that is backgrounded for two minutes mid-track
     still terminates, and it is deliberately longer than the track. */
  sessionSeconds: 110,

  /* -- The timeline --------------------------------------------------------
     One clock runs the whole game. Sections are laid end to end and every beat
     time is derived from them, so the metronome the player hears and the ring
     the player sees are two renderings of the SAME schedule rather than two
     schedules that have to be kept in step. `scripts/balance.mjs` asserts they
     agree to < 1 ms across all 152 beats (see track.js `metronomeEvents`).

     8-beat intro count-in, three movements at rising tempo separated by 8-beat
     fills, 8-beat outro. Total 87.4 s of music. */
  sections: [
    { kind: 'intro', bpm: 96, beats: 8, label: 'Count in' },
    { kind: 'movement', bpm: 96, beats: 48, label: 'Movement I', tag: 'Steady premiums', redRatio: 0.20 },
    { kind: 'fill', bpm: 112, beats: 8, label: 'Tempo up' },
    { kind: 'movement', bpm: 112, beats: 40, label: 'Movement II', tag: 'Life speeds up', redRatio: 0.25 },
    { kind: 'fill', bpm: 126, beats: 8, label: 'Tempo up' },
    { kind: 'movement', bpm: 126, beats: 40, label: 'Movement III', tag: 'Peak temptation', redRatio: 0.30 },
    { kind: 'outro', bpm: 126, beats: 8, label: 'Hold' },
  ],

  /* -- The ring grid -------------------------------------------------------
     Rings land on a 3+3+2 tresillo inside each 8-beat group: group-relative
     beats 0, 3 and 6. Beat 0 of every group is the BONUS DOUBLE — two blue
     rings a half-beat apart — which is the brief's "every 8th beat is a bonus
     double". Four rings per group, so 16 groups across the three movements
     produce exactly 64 scored rings.

     The tresillo is not decoration. A straight one-ring-per-two-beats grid
     makes the go/no-go decision metronomic: you stop reading the ring and just
     tap the pulse. 3+3+2 keeps the gap between decisions uneven, so every ring
     has to be looked at. */
  grid: {
    groupBeats: 8,
    /** Group-relative beats that carry a ring. */
    slotBeats: [0, 3, 6],
    /** Which of those is the bonus double, and how far apart its two rings are. */
    bonusSlotBeat: 0,
    bonusOffsetBeats: 0.5,
    /** Reds are drawn only from the single slots — a bonus double is two BLUE
        rings by definition, so the red ratio below is expressed over ALL rings
        in the movement and satisfied out of the single slots. */
    maxConsecutiveReds: 2,
  },

  /* -- Approach ------------------------------------------------------------
     How long a ring is on screen before it reaches the badge, in BEATS, so the
     approach shortens with the tempo exactly as the music does: 1.56 s at 96
     BPM down to 1.19 s at 126 BPM. The balance gate asserts the shortest
     approach still clears `minApproachMs`, which is a visual-reaction budget
     (250 ms to notice + 250 ms to decide colour + move) with room to spare. */
  approachBeats: 2.5,
  minApproachMs: 700,

  /* -- Judging -------------------------------------------------------------
     TIMING HONESTY. Read this together with the `deviceLatencyMs` note below
     and the clock section of PremiumPulseGame.jsx.

     A tap is stamped from the pointerdown event's own timestamp and converted
     into track-milliseconds. It is then judged here, in a pure function, with
     no reference to anything the player could not see or hear.

       |err| <= perfectMs   PERFECT
       |err| <= goodMs      GOOD
       otherwise            MISS

     `captureMs` is which ring a tap is aimed AT. A tap consumes the nearest
     unresolved ring within `captureMs`; beyond that it consumed nothing and is
     a false alarm. It is deliberately wider than `goodMs` so a tap that was
     clearly meant for a ring costs ONE miss (the mistimed tap) rather than two
     (the mistimed tap plus the ring auto-missing behind it). It is deliberately
     narrower than the 238 ms minimum spacing between two rings (the bonus
     double at 126 BPM), so a tap can never reach past a nearer ring.

     `lockoutMs` debounces finger bounce: a second contact within 60 ms of a
     judged tap is discarded, not judged. It cannot be exploited — it only ever
     discards the player's OWN input. 60 ms rather than the 90 ms first tried:
     the two halves of a bonus double are only 238 ms apart at 126 BPM, and with
     the gate profile's 65 ms jitter a 90 ms lockout swallowed the second tap on
     5.4% of Movement III doubles (0.45 extra misses per run). At 60 ms that is
     2.7%, and it is still well above any real finger bounce. */
  judge: {
    perfectMs: 45,
    goodMs: 110,
    captureMs: 190,
    lockoutMs: 60,
  },

  /* Touch + audio pipeline allowance, in ms. THE one latency constant.

     Two real, unavoidable delays sit between the beat the game intends and the
     timestamp the game reads, and they both push the measured error LATE:

       audio output  the synth voice is triggered at time T but leaves the
                     speaker some milliseconds later, so the beat the player
                     HEARS is later than the beat the schedule says;
       touch input   a handset delivers pointerdown 20-60 ms after the finger
                     actually contacted the glass.

     Both are additive and both are constant for a given device, so the sum is
     subtracted once from every tap: a player who taps exactly on the beat they
     hear reads as err = 0 rather than err = +60 ms. Without it the whole
     judging window is shifted 60 ms early and PERFECT is unreachable for
     everyone — the failure mode this constant exists to prevent.

     60 ms is the median of the published Android/iOS touch-to-event figures
     (~35 ms) plus a typical Web Audio output latency (~25 ms). It is a single
     documented constant rather than a per-device probe on purpose:
     `AudioContext.outputLatency` is unimplemented on Safari, so probing would
     make the game behave differently per browser and make the balance gate
     unfalsifiable. The sim charges this same constant to EVERY bot (a bot's tap
     is emitted at `hitMs + deviceLatencyMs + jitter` and then judged by the
     shipped judge, which subtracts it), so the two sides move together and the
     measured bands cannot be flattered by changing it. */
  deviceLatencyMs: 60,

  /* -- Win / lose ----------------------------------------------------------
     Lose on the 8th miss ("cover lapsed") — the run ends there and then. Win by
     surviving the track AND finishing at or above `targetScore`.

     `targetScore` is the tuned dial, and it is the binding half of the win line
     — the gate profile survives the track 72% of the time but only clears the
     score 36% of the time. The brief starts it at 4200; measured over 4 seed
     blocks x 400 runs of the gate profile (sigma 65 ms, 8% red false-tap),
     4200 wins 49.5-52.0%, above the 25-45% band. The full sweep:

         4200  51.5 50.7 52.0 49.5      5000  23.5 24.3 24.8 26.0
         4400  42.0 41.5 43.5 44.8      5200  19.8 20.8 20.5 20.8
         4600  33.8 35.8 36.8 36.3      5400  15.5 17.5 16.0 16.5
         4800  27.8 29.5 29.8 30.0

     4600 is the band centre with ~9 points of headroom on both sides, which is
     what a value has to have to survive seed noise and future retunes; 4800 and
     5000 sit close enough to the 25% floor that one block dips under it.
     `scripts/balance.mjs --sweep` reprints this table. */
  maxMisses: 8,
  targetScore: 4600,

  /* -- Scoring -------------------------------------------------------------
     PERFECT 100 x combo multiplier, GOOD 40 flat, temptation correctly ignored
     15. The multiplier reads the combo you ALREADY had, so the first PERFECT of
     a run is a flat 100 and the eleventh is 200:

         mult = min(comboMaxMult, 1 + floor(combo / comboStep))

     Anything correct extends the combo — including letting a red ring through,
     because inhibition is the other half of the skill. A miss (mistimed tap,
     tapped temptation, ignored premium, or a tap at nothing) resets it. */
  scoring: {
    perfect: 100,
    good: 40,
    redAvoided: 15,
    comboStep: 10,
    comboMaxMult: 3,
  },

  /* -- Effects -------------------------------------------------------------
     Particle counts are before the device tier scale in kit/device.js. */
  fx: {
    perfectParticles: 20,
    goodParticles: 10,
    missParticles: 14,
    avoidParticles: 8,
    winParticles: 40,
    missShake: 7,
    perfectShake: 2,
    hitStopSeconds: 0.05,
    /** Seconds the judgement ripple stays lit on the badge. */
    rippleSeconds: 0.55,
    /** Seconds the movement banner stays up. */
    bannerSeconds: 2.2,
    /** Squash-and-stretch recovery for the badge, on the kit's elastic curve. */
    squashSeconds: 0.22,
    /** Combo at which the badge catches fire, and the second tier. */
    fireCombo: 10,
    infernoCombo: 20,
  },

  /** Beat between the last ring resolving and the results screen appearing. */
  endBeatMs: 1200,
};

/**
 * Score the Results ring treats as a full circle.
 *
 * Deliberately the same number as the win line, so the ring closes at exactly
 * the moment the run becomes winnable and a player can read "how close was I"
 * off it directly. `scripts/balance.mjs` brute-forces the maximum achievable
 * score against the shipped resolve functions (a flawless 64-ring run) and
 * fails if this value exceeds it, so it can never silently become a ring that
 * cannot close.
 */
export const RESULT_TARGET_SCORE = GAME_CONFIG.targetScore;
