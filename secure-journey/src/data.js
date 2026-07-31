// Secure Journey — all gameplay tunables in one place.
// Concept: drive the Guardian pod down a narrowing wealth bridge, blast the
// Risk Barricades (road hazards of financial risk), grab Cover Shields
// (restore health + permanently boost firing power) and reach the Wealth Vault
// before the clock runs out. The Inflation Storm-Front is the final wall.

export const BRAND = {
  blue: '#003DA6',
  orange: '#F26522',
  green: '#28A745',
  bgDark: '#04101f',
};

export const GAME_CONFIG = {
  // Session
  duration: 78,              // seconds — hard cap well inside the 60-120s window

  // Player
  maxHp: 100,
  baseFireInterval: 0.42,    // seconds between shots at power 0
  minFireInterval: 0.15,
  fireIntervalFactor: 0.89,  // multiplied per shield collected
  baseDamage: 1,
  damagePerPower: 0.8,       // extra bolt damage per shield collected
  boltSpeed: 1.55,           // bridge-lengths per second
  steerLerp: 14,             // how fast player eases to drag target

  // The bridge itself narrows as the run goes on — the safe window shrinks.
  bridgeWidthStart: 0.80,    // fraction of screen width at t=0
  bridgeWidthEnd: 0.50,      // fraction of screen width at the boss

  // Risk Barricades (hazards)
  spawnIntervalStart: 1.15,  // seconds between waves at t=0
  spawnIntervalEnd: 0.46,    // at end of run (difficulty ramp)
  multiLaneChanceStart: 0.2, // chance a wave fills 2 lanes at t=0
  multiLaneChanceEnd: 0.75,  // ...at the end of the run
  tripleLaneFrom: 0.55,      // progress after which a wave can block all 3 lanes
  tripleLaneChance: 0.2,
  hazardSpeedStart: 0.125,   // bridge progress per second (~8s march)
  hazardSpeedEnd: 0.27,      // ~3.7s march at the end — reactions get tight
  hpRampMax: 2.6,            // hp multiplier grows to (1 + this) across the run
  hpPerPower: 0.25,          // hazards toughen slightly as you gain power
  contactDamage: { small: 9, medium: 14, large: 22 },
  gapPenalty: 4,             // hp lost per hazard that slips past you

  // Boss — Inflation Storm-Front
  bossLeadTime: 20,          // boss appears with this many seconds remaining
  bossBaseHp: 78,
  bossHpPerPower: 11,
  bossSpeed: 0.07,
  bossDamage: 34,

  // Cover Shield pickups
  shieldInterval: 9.0,       // average seconds between shield spawns
  shieldHeal: 16,            // HP restored per shield
  shieldSpeed: 0.13,

  // Win cutscene
  vaultRunSpeed: 230,        // px/sec the pod runs into the vault
  winBeatTime: 0.85,         // seconds of win celebration before results

  // Scoring
  killPoints: 10,
  shieldPoints: 100,
  bossPoints: 250,
  healthBonusFactor: 2,      // win bonus = hp left × this
};
