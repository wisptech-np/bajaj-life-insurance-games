// GAME_BALANCE_CONFIG — central tuning surface for every Bajaj Life game.
//
// Everything a designer might want to retune lives here: physics feel, difficulty
// ramps, scoring weights, and effect intensity. Per-game files import BALANCE and
// override only what differs, so nobody edits gameplay logic to change a number.
//
// Canonical source: shared/game-kit/config.js  →  copied into <game>/src/kit/config.js
// Run `node scripts/sync-game-kit.mjs` after editing the canonical copy.

/** Global feel constants shared by all games. Units are logical px and seconds. */
export const BALANCE = {
  // ---- Frame pacing -------------------------------------------------------
  loop: {
    // Physics runs on a fixed step so behaviour is identical at 30/60/120 Hz.
    fixedStep: 1 / 120,
    // Hard ceiling on catch-up work per frame. Prevents the spiral of death
    // when a device stalls or the tab is restored after being backgrounded.
    maxCatchUpSeconds: 0.25,
  },

  // ---- Arcade physics -----------------------------------------------------
  // Deliberately NOT realistic: heavier gravity plus strong damping reads as
  // "responsive" on a phone, where realistic float feels sluggish and vague.
  physics: {
    gravity: 1600,
    terminalVelocity: 2400,
    restitution: 0.45,
    friction: 0.86,
    // Forgiveness windows that make arcade games feel fair rather than strict.
    coyoteTimeSeconds: 0.09,
    inputBufferSeconds: 0.12,
  },

  // ---- Input --------------------------------------------------------------
  input: {
    tapMaxSeconds: 0.25,
    tapMaxMovePx: 12,
    swipeMinPx: 28,
    holdSeconds: 0.35,
    // Minimum touch target per WCAG 2.5.5 / platform HIG.
    minTouchTargetPx: 44,
  },

  // ---- Scoring ------------------------------------------------------------
  scoring: {
    comboWindowSeconds: 2.0,
    comboMaxMultiplier: 5,
    // Score counters lerp toward the true value so numbers feel alive.
    counterLerpPerSecond: 8,
  },

  // ---- Effect intensity ---------------------------------------------------
  // Scaled by the device performance tier at runtime (see device.js). Authors
  // tune the "high" values; low-end devices get them scaled down automatically.
  effects: {
    screenShake: { maxOffsetPx: 9, decayPerSecond: 6 },
    particles: { budget: 220, perBurst: 12 },
    floatingText: { riseVelocity: -46, lifeSeconds: 0.85 },
    squash: { amount: 0.18, recoverySeconds: 0.22 },
    hitStop: { seconds: 0.06 },
    trail: { maxPoints: 14 },
  },

  // ---- Haptics (ignored where unsupported) --------------------------------
  haptics: {
    light: 8,
    medium: 18,
    success: [12, 40, 18],
    failure: [28, 60, 28],
  },
};

/**
 * Effect multipliers per performance tier. Applied by scaleEffects() so a
 * budget Android phone renders the same game with a cheaper effect budget
 * rather than dropping frames.
 */
export const TIER_SCALE = {
  high: { particles: 1.0, shake: 1.0, trail: 1.0, shadows: true },
  mid: { particles: 0.6, shake: 0.85, trail: 0.7, shadows: true },
  low: { particles: 0.25, shake: 0.5, trail: 0.0, shadows: false },
};

/**
 * Resolve the effect budget for a tier, honouring reduced-motion.
 * Reduced motion keeps informational effects (score popups) but removes
 * vestibular triggers: screen shake, trails, and large translations.
 */
export function scaleEffects(tier = 'high', reducedMotion = false) {
  const scale = TIER_SCALE[tier] || TIER_SCALE.high;
  const fx = BALANCE.effects;
  return {
    shadows: scale.shadows && !reducedMotion,
    particleBudget: Math.round(fx.particles.budget * scale.particles),
    particlesPerBurst: Math.max(1, Math.round(fx.particles.perBurst * scale.particles)),
    shakeMaxOffsetPx: reducedMotion ? 0 : fx.screenShake.maxOffsetPx * scale.shake,
    shakeDecayPerSecond: fx.screenShake.decayPerSecond,
    trailPoints: reducedMotion ? 0 : Math.round(fx.trail.maxPoints * scale.trail),
    hitStopSeconds: reducedMotion ? 0 : fx.hitStop.seconds,
    squashAmount: reducedMotion ? 0 : fx.squash.amount,
    floatingText: fx.floatingText,
  };
}

/** Deep-merge a per-game override object over BALANCE without mutating it. */
export function withOverrides(overrides = {}) {
  const merge = (base, over) => {
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const [k, v] of Object.entries(over || {})) {
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof base?.[k] === 'object'
        ? merge(base[k], v)
        : v;
    }
    return out;
  };
  return merge(BALANCE, overrides);
}
