// Secure Journey — all gameplay tunables in one place.
// Concept: build a stable bridge to long-term wealth. Steer the Guardian across
// the bridge, blast the viruses of financial risk, collect Health Shields
// (restore health + permanently boost firing power) and reach the Wealth Vault.

export const BRAND = {
  blue: '#003DA6',
  orange: '#F26522',
  green: '#28A745',
  bgDark: '#04101f',
};

export const GAME_CONFIG = {
  // Session
  duration: 90,              // seconds — hard cap well under 2 minutes

  // Player
  maxHp: 100,
  baseFireInterval: 0.42,    // seconds between shots at power 0
  minFireInterval: 0.14,
  fireIntervalFactor: 0.88,  // multiplied per shield collected
  baseDamage: 1,
  damagePerPower: 0.8,       // extra bolt damage per shield collected
  boltSpeed: 1.55,           // bridge-lengths per second
  steerLerp: 14,             // how fast player eases to drag target

  // Viruses
  spawnIntervalStart: 1.45,  // seconds between waves at t=0
  spawnIntervalEnd: 0.62,    // at end of run (difficulty ramp)
  virusSpeedStart: 0.105,    // bridge progress per second (≈9.5s march)
  virusSpeedEnd: 0.165,
  hpRampMax: 1.9,            // hp multiplier grows to (1 + this) across the run
  hpPerPower: 0.25,          // viruses toughen slightly as you gain power
  contactDamage: { small: 6, medium: 10, large: 15 },

  // Boss
  bossLeadTime: 22,          // boss appears with this many seconds remaining
  bossBaseHp: 55,
  bossHpPerPower: 10,
  bossSpeed: 0.055,
  bossDamage: 40,

  // Health Shield pickups
  shieldInterval: 8.5,       // average seconds between shield spawns
  shieldHeal: 20,            // HP restored per shield
  shieldSpeed: 0.12,

  // Scoring
  killPoints: 10,
  shieldPoints: 100,
  bossPoints: 250,
  healthBonusFactor: 2,      // win bonus = hp left × this
};
