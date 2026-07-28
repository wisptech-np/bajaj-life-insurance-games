# Bajaj Life Insurance Games

**Developed by Wisp Technologies**

This repository contains multiple interactive web-based games developed for Babaj Life Insurance using Vite.

Each game is stored in its own folder.

## How to Use

1. Clone or download this repository.

2. Go into the folder of the game you want to run:
   cd game-folder-name

3. Install dependencies:
   pnpm install

4. Run the game in development mode:
   pnpm dev

5. Build the game for production:
   pnpm build

   The production files will be available in the dist/ folder of that game.

## Games

Only BajajLife-approved concepts are kept in this repository.

| Directory | Game | Dev port |
|---|---|---|
| `guardian-shelter/` | Guardian Shelter | 5030 |
| `secure-journey/` | Secure Journey | 5032 |
| `smart-match-3d/` | Smart Match 3D | 5033 |
| `risk-exit/` | Risk Exit | 5034 |
| `life-soar/` | Life Soar | 5035 |
| `coverage-archer/` | Guardian Archer | — |
| `tightrope-protection/` | Tightrope Protection | — |
| `swing-to-secure/` | Swing to Secure | 5037 |
| `milestone-hopper/` | Milestone Hopper | 5038 |
| `wealth-drop/` | Wealth Drop | 5039 |
| `portfolio-fit/` | Portfolio Fit | 5044 |
| `ripple-shield/` | Ripple Shield | 5046 |
| `steady-tower/` | Steady Tower | 5047 |
| `spiral-sprint/` | Spiral Sprint | 5048 |
| `goal-orbit/` | Goal Orbit | 5050 |
| `risk-strike/` | Risk Strike | 5054 |

Approved but not yet scaffolded: `balance-block-journey` (5031), `shield-cascade` (5036).

## Project Structure

babaj-life-insurance-games/
├── guardian-shelter/     # one Vite app per game
├── secure-journey/
├── ...
├── shared/game-kit/      # canonical shared game-feel systems
├── scripts/              # tracker + game-kit sync tooling
├── docs/                 # audit, polish plan, asset and testing docs
└── README.md

Note: node_modules are not included in this repository. Run pnpm install inside each game folder to generate them.

## Shared game systems

`shared/game-kit/` holds the loop, input, effects, audio, device-tier and balance-config modules
used across games. The games are isolated pnpm projects (deliberately — no workspace), so the kit
is **copied** into each game rather than imported:

    node scripts/sync-game-kit.mjs          # distribute to every game
    node scripts/sync-game-kit.mjs --check  # fail if any copy is stale

Edit `shared/game-kit/` — never a game's `src/kit/` copy.

`shared/game-kit/config.js` is the central balance configuration: physics, difficulty, scoring
weights and effect intensity all live there.

## Documentation

- [Game Quality Audit](docs/GAME_QUALITY_AUDIT.md) — current defects, root causes, priority
- [Game Polish Plan](docs/GAME_POLISH_PLAN.md) — critical / high-value / optional work
- [Asset Inventory](docs/ASSET_INVENTORY.md) — every asset, and what to do with it
- [Asset Generation Prompts](docs/ASSET_GENERATION_PROMPTS.md) — specs for replacement assets
- [Testing Checklist](docs/TESTING_CHECKLIST.md) — devices, scenarios, acceptance criteria
- [Build Standard](okf-brain/GAME_STANDARD.md) — scaffold every game must follow

---

Wisp Technologies – Creating engaging games for Babaj Life Insurance.
