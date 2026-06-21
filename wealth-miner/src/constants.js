export const GAME_WIDTH = 420;
export const GAME_HEIGHT = 720;


export const THEMES = {
  1: {
    name: "Savings Cavern",
    subtitle: "Build your base with safe savings",
    bgColor: "#1c1404",
    bgGradient: ["#2d1d05", "#140c01"],
    textColor: "#FFD700",
    accentColor: "#F26522",
    ambientColor: "rgba(242, 101, 34, 0.05)"
  },
  2: {
    name: "Family Protection Zone",
    subtitle: "Insure and protect your loved ones",
    bgColor: "#081326",
    bgGradient: ["#0a1d3a", "#040b17"],
    textColor: "#12A7F4",
    accentColor: "#FFD700",
    ambientColor: "rgba(18, 167, 244, 0.05)"
  },
  3: {
    name: "Education Mine",
    subtitle: "Invest in knowledge and core growth",
    bgColor: "#160729",
    bgGradient: ["#260f42", "#0c0316"],
    textColor: "#9C27B0",
    accentColor: "#FFD700",
    ambientColor: "rgba(156, 39, 176, 0.05)"
  },
  4: {
    name: "Retirement Vault",
    subtitle: "Secure your golden pension era",
    bgColor: "#291c07",
    bgGradient: ["#402d0d", "#150e03"],
    textColor: "#FF9800",
    accentColor: "#E040FB",
    ambientColor: "rgba(255, 152, 0, 0.05)"
  },
  5: {
    name: "Legacy Chamber",
    subtitle: "Seal your final financial triumph",
    bgColor: "#091c1d",
    bgGradient: ["#0f2e30", "#030a0b"],
    textColor: "#00BCD4",
    accentColor: "#FFD700",
    ambientColor: "rgba(0, 188, 212, 0.05)"
  }
};

export const LEVEL_CONFIGS = {
  1: {
    targetScore: 600,
    duration: 30,
    items: [
      { type: "coin", count: 8 },
      { type: "money_bag", count: 3 },
      { type: "gold_nugget", count: 4 },
      { type: "loan_shark", count: 4 },
      { type: "inflation_jellyfish", count: 1 }
    ]
  },
  2: {
    targetScore: 1400,
    duration: 30,
    items: [
      { type: "coin", count: 6 },
      { type: "protection_shield", count: 4 },
      { type: "family_crest", count: 3 },
      { type: "inflation_jellyfish", count: 4 },
      { type: "loan_shark", count: 2 }
    ]
  },
  3: {
    targetScore: 2400,
    duration: 30,
    items: [
      { type: "coin", count: 5 },
      { type: "education_crystal", count: 4 },
      { type: "graduation_gem", count: 3 },
      { type: "market_crash_bomb", count: 3 },
      { type: "loan_shark", count: 2 },
      { type: "inflation_jellyfish", count: 2 }
    ]
  },
  4: {
    targetScore: 3600,
    duration: 30,
    items: [
      { type: "coin", count: 4 },
      { type: "retirement_vault", count: 3 },
      { type: "income_pearl", count: 5 },
      { type: "inflation_jellyfish", count: 3 },
      { type: "market_crash_bomb", count: 3 },
      { type: "loan_shark", count: 2 }
    ]
  },
  5: {
    targetScore: 5000,
    duration: 30,
    items: [
      { type: "coin", count: 3 },
      { type: "legacy_relic", count: 2 },
      { type: "diamond_relic", count: 3 },
      { type: "loan_shark", count: 3 },
      { type: "inflation_jellyfish", count: 3 },
      { type: "market_crash_bomb", count: 4 }
    ]
  }
};

export const ITEM_TYPES = {
  // Good items
  coin: {
    name: "Gold Coin",
    value: 50,
    weight: 0.8,
    radius: 12,
    color: "#FFD700"
  },
  money_bag: {
    name: "Savings Money Bag",
    value: 200,
    weight: 2.2,
    radius: 22,
    color: "#FFA500"
  },
  gold_nugget: {
    name: "Gold Nugget",
    value: 100,
    weight: 1.6,
    radius: 16,
    color: "#DAA520"
  },
  protection_shield: {
    name: "Family Protection Shield",
    value: 250,
    weight: 2.5,
    radius: 24,
    color: "#1e88e5"
  },
  family_crest: {
    name: "Family Crest",
    value: 150,
    weight: 1.8,
    radius: 18,
    color: "#1565c0"
  },
  education_crystal: {
    name: "Education Crystal",
    value: 300,
    weight: 2.0,
    radius: 20,
    color: "#8e24aa"
  },
  graduation_gem: {
    name: "Graduation Gem",
    value: 350,
    weight: 2.2,
    radius: 22,
    color: "#ba68c8"
  },
  retirement_vault: {
    name: "Retirement Vault",
    value: 500,
    weight: 4.5,
    radius: 28,
    color: "#e65100"
  },
  income_pearl: {
    name: "Income Pearl",
    value: 180,
    weight: 1.2,
    radius: 15,
    color: "#fff8e1"
  },
  legacy_relic: {
    name: "Legacy Relic",
    value: 800,
    weight: 3.8,
    radius: 26,
    color: "#00acc1"
  },
  diamond_relic: {
    name: "Diamond Relic",
    value: 1000,
    weight: 3.2,
    radius: 25,
    color: "#e0f7fa"
  },

  // Hazards
  loan_shark: {
    name: "Loan Shark",
    value: -150,
    weight: 3.0,
    radius: 25,
    color: "#e53935",
    isHazard: true
  },
  inflation_jellyfish: {
    name: "Inflation Jellyfish",
    value: -200,
    weight: 1.8,
    radius: 20,
    color: "#ff5252",
    isHazard: true,
    isMoving: true
  },
  market_crash_bomb: {
    name: "Market Crash Bomb",
    value: -300,
    weight: 3.5,
    radius: 22,
    color: "#37474f",
    isHazard: true,
    isBomb: true
  }
};

export const UPGRADES = {
  clawStrength: {
    name: "Claw Strength",
    desc: "Reduces weight penalties for pulling heavy items",
    costs: [500, 1000, 2000],
    multipliers: [1.0, 1.4, 1.8, 2.3]
  },
  pullSpeed: {
    name: "Reel Speed",
    desc: "Increases base launch and reel speeds",
    costs: [500, 1000, 2000],
    values: [6.0, 7.8, 9.6, 12.0]
  },
  grabRadius: {
    name: "Grab Radius",
    desc: "Increases claw pickup hitbox range",
    costs: [400, 800, 1600],
    multipliers: [1.0, 1.2, 1.4, 1.6]
  },
  treasureMagnet: {
    name: "Treasure Magnet",
    desc: "Slightly pulls nearby rewards toward claw path",
    costs: [600, 1200, 2400],
    values: [0, 45, 75, 110] // Pull distance thresholds
  },
  luckyFinder: {
    name: "Lucky Finder",
    desc: "Boosts item scores and lowers hazard counts",
    costs: [600, 1200, 2400],
    multipliers: [1.0, 1.15, 1.3, 1.5]
  }
};
