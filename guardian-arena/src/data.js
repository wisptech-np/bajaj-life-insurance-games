// data.js — Guardian Arena tunables. Every number the sim, the renderer, or the
// designer might want to change lives here; gameplay code never hard-codes one.
//
// Logical arena: 400 × 600 px, portrait. All speeds are logical px/second.

export const COLORS = {
  blue: '#003DA6',
  blueBright: '#1E6BE0',
  blueLt: '#7FC0FF',
  orange: '#F26522',
  orangeBright: '#FF8A3D',
  green: '#28A745',
  greenLt: '#5EE07A',
  virus: '#49E24B',
  virusDeep: '#0E5C1D',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  bgDark: '#0B1221',
  bgMid: '#101c36',
};

export const GAME_CONFIG = {
  // ---- Session ------------------------------------------------------------
  sessionSeconds: 90,           // hard cap; survive it (or drop the boss) to WIN

  // ---- Arena (logical units) ----------------------------------------------
  arena: {
    width: 400,
    height: 600,
    wallPad: 16,                // soft inset the player cannot leave
    cornerZonePx: 84,           // "in a corner" test for the anti-camping shooter arc
  },

  // ---- Player -------------------------------------------------------------
  player: {
    radius: 14,
    speed: 200,                 // px/s at full joystick deflection
    maxHp: 4,
    iframeSeconds: 0.9,         // post-hit invulnerability (sprite flicker)
    knockbackSpeed: 340,        // impulse away from the hit source
    knockbackDecay: 8,          // exp decay rate of the knockback velocity
    hurtVignetteSeconds: 0.35,  // red edge flash on damage
  },

  // ---- Floating virtual joystick -----------------------------------------
  joystick: {
    deadZonePx: 10,             // below this the stick reads as "stationary"
    maxRadiusPx: 60,            // full deflection
  },

  // ---- Auto-fire (the one rule: fire ONLY while stationary) ---------------
  fire: {
    settleSeconds: 0.12,        // delay after stopping before the first shot
    interval: 0.42,             // seconds between shots at base fire rate
    boltSpeed: 430,             // px/s — bolts, not hitscan, so kills read
    boltRadius: 5,
    baseDamage: 1,
    range: 640,                 // bolts despawn past this travel distance
    ricochetSearchPx: 220,      // how far a ricochet bolt looks for its next mark
  },

  // ---- Enemies ------------------------------------------------------------
  // speed values are fractions of player.speed so the fairness rule
  // "everything hostile is slower than you" survives any retune.
  enemies: {
    spawnMinDistPx: 150,        // never spawn within this radius of the player
    spawnInSeconds: 0.6,        // harmless, telegraphed materialise-in
    playerQuadrantBias: 0.6,    // fraction of spawns biased into the player's quadrant
    flankAngleRad: 0.55,        // chasers offset their approach by ± this (both flanks)
    flankFadePx: 120,           // flank offset fades out inside this range
    separationPx: 26,           // soft push-apart so blobs never stack into one
    chaser:   { hp: 2,  speedMult: 0.65, radius: 13, damage: 1, score: 10 },
    mini:     { hp: 1,  speedMult: 0.72, radius: 8,  damage: 1, score: 5 },
    shooter:  {
      hp: 3, speedMult: 0.55, radius: 14, damage: 1, score: 20,
      holdRangePx: 165,         // keeps this distance, strafing
      windupSeconds: 0.45,      // telegraph flash before every shot (>= 0.4 fairness rule)
      cooldownSeconds: 2.3,
      projSpeedMult: 0.75,      // projectile at 75% of player speed — always outrunnable
      projRadius: 6,
      leadSeconds: 0.3,         // aims ahead of a moving player (anti corner-camping)
      cornerSpreadRad: 0.5,     // fires a 2-shot spread when the player hugs a corner
    },
    splitter: {
      hp: 4, speedMult: 0.55, radius: 17, damage: 1, score: 20,
      splitCount: 2,
      scatterSeconds: 0.3,      // children are harmless while they scatter apart
      scatterSpeed: 260,
    },
    boss: {
      hpMult: 20,               // × chaser hp  => 40
      speedMult: 0.45, radius: 26, damage: 1, score: 200,
      fanShots: 3,
      fanSpreadRad: 0.55,       // total arc of the 3-shot fan
      fanWindupSeconds: 0.5,    // telegraph before the fan (>= 0.4 fairness rule)
      fanCooldownSeconds: 2.5,
      projSpeedMult: 0.75,
      projRadius: 7,
    },
  },

  // ---- Waves (90 s arc; each clear pauses the world for an upgrade pick) --
  waves: [
    { label: 'Wave 1', count: 7,  spawnEvery: 1.5, mix: { chaser: 1 } },
    { label: 'Wave 2', count: 10, spawnEvery: 1.2, mix: { chaser: 0.7, shooter: 0.3 } },
    { label: 'Wave 3', count: 13, spawnEvery: 1.0, mix: { chaser: 0.45, shooter: 0.3, splitter: 0.25 } },
    // Wave 4 = the mini-boss + a trickle of chasers while it lives.
    { label: 'Final', boss: true, trickleEvery: 3.0, trickleMaxAlive: 3 },
  ],
  waveClearBonusBase: 50,       // × wave number, added on each clear

  // ---- Upgrade cards (insurance riders) -----------------------------------
  // Picked 1-of-3 between waves. `offense: true` marks cards that satisfy the
  // "always at least one offense option" rule. Stackable unless maxStacks set.
  upgrades: [
    { id: 'multishot', offense: true,  name: 'Multi-Cover Bolt',  blurb: '+1 bolt per volley, each −20% damage', icon: 'multishot', maxStacks: 2 },
    { id: 'ricochet',  offense: true,  name: 'Ricochet Rider',    blurb: 'Bolts leap to a nearby threat on impact', icon: 'ricochet', maxStacks: 2 },
    { id: 'pierce',    offense: true,  name: 'Piercing Cover',    blurb: 'Bolts punch through one extra enemy', icon: 'pierce', maxStacks: 2 },
    { id: 'firerate',  offense: true,  name: 'Auto-Pay',          blurb: '+25% fire rate — protection never lapses', icon: 'firerate', maxStacks: 3 },
    { id: 'damage',    offense: true,  name: 'Top-Up Plan',       blurb: '+30% damage on every bolt', icon: 'damage', maxStacks: 3 },
    { id: 'maxhp',     offense: false, name: 'Health Rider',      blurb: '+1 max HP — wider cover for the family', icon: 'maxhp', maxStacks: 2 },
    { id: 'heal',      offense: false, name: 'Claim Settled',     blurb: 'Restore 50% of your missing HP now', icon: 'heal' },
    { id: 'speed',     offense: false, name: 'Agile Portfolio',   blurb: '+10% move speed', icon: 'speed', maxStacks: 2 },
  ],
  upgradeEffects: {
    multishotDamageMult: 0.8,   // per-bolt damage multiplier per multishot stack
    multishotSpreadRad: 0.16,   // angular fan between parallel bolts
    firerateMult: 0.8,          // fire interval × this per stack (+25% rate)
    damageMult: 1.3,
    healFraction: 0.5,
    speedMult: 1.1,
    maxHpAdd: 1,                // integer hearts; ≈ +25% of base 4 per stack
  },

  // ---- Scoring ------------------------------------------------------------
  scoring: {
    // score = Σ kills × enemy score + wave-clear bonuses (see waveClearBonusBase)
    winTargetForRing: 800,      // results-screen progress ring scale only
  },

  // ---- Anti pause-scum re-acquire beat ------------------------------------
  // On resume from the kit's auto-pause the world STAYS frozen behind a visible
  // 3-2-1 (clock held), then input is refused for a short live beat.
  reacquire: {
    freezeSeconds: 1.2,         // 3 × 0.4 s beats (≥ 600 ms repo rule)
    inputLockSeconds: 0.3,
  },

  // ---- Juice --------------------------------------------------------------
  fx: {
    hitStopSeconds: 0.05,       // freeze-frame on every kill
    killShake: 3.5,             // px — inside the 3–4 px/100 ms spec
    hurtShake: 6,
    deathParticles: 14,
    hitParticles: 6,
    spawnParticles: 8,
    enemyFlashSeconds: 0.09,    // white flash on a damaged enemy
    dmgTextSize: 13,
    reticleSpinPerSec: 1.6,     // rad/s target-lock reticle rotation
    endBeatMs: 1100,            // beat between the final frame and the results screen
    bannerSeconds: 1.4,
  },

  hud: {
    lowTimeSeconds: 10,
  },
};
