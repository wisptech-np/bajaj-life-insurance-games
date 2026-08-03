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
| `steady-tower/` | Steady Tower | 5047 |
| `spiral-sprint/` | Spiral Sprint | 5048 |
| `goal-orbit/` | Goal Orbit | 5050 |
| `risk-strike/` | Risk Strike | 5054 |
| `premium-pinball/` | Premium Pinball | 5055 |
| `cover-drive/` | Cover Drive | 5056 |
| `goal-keeper/` | Goal Keeper | 5057 |
| `wealth-carrom/` | Wealth Carrom | 5058 |
| `wealth-balloon/` | Wealth Balloon | 5059 |
| `income-pipeline/` | Income Pipeline | 5060 |
| `smart-sorter/` | Smart Sorter | 5061 |
| `safe-crossing/` | Safe Crossing | 5062 |
| `slide-to-safety/` | Slide to Safety | 5063 |
| `perfect-premium/` | Perfect Premium | 5064 |
| `steady-wings/` | Steady Wings | 5065 |
| `premium-pulse/` | Premium Pulse | 5066 |
| `smart-recall/` | Smart Recall | 5067 |
| `life-rush/` | Life Rush | 5069 |
| `guardian-arena/` | Guardian Arena | 5070 |
| `premium-tiles/` | Premium Tiles | 5071 |
| `wealth-merge/` | Wealth Merge | 5072 |
| `risk-slash/` | Risk Slash | 5073 |
| `sip-stack/` | SIP Stack | 5074 |
| `legacy-echo/` | Legacy Echo | 5075 |
| `ring-fence/` | Ring-Fence | 5077 |
| `risk-radar/` | Risk Radar | 5078 |

Approved but not yet scaffolded: `balance-block-journey` (5031), `shield-cascade` (5036).

Batch 6 (`guardian-arena` through `sip-stack`, ports 5070–5074) is **proposed and pending
BajajLife sign-off** — viral-genre concepts (arena survivor, piano tiles, drop-merge, slicer,
stack tower) built to the full GAME_STANDARD scaffold.

Batch 7 (`legacy-echo`, `ring-fence`, `risk-radar`; ports 5075, 5077, 5078) is **proposed and
pending BajajLife sign-off** — rare-mechanic concepts (time-loop ghost co-op, Qix territory
capture, sonar darkness navigation), each with a headless `gate.mjs` fairness/solvability proof.

Dropped by the 2026-08-03 review and deleted from the repo: `dual-cover` (5079),
`goal-juggler` (5068), `ripple-shield` (5046), `time-shield` (5076). Their ports are retired,
not reused.

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

## Play-testing a game

Each game's own `scripts/balance.mjs` proves the **rules** are fair, headlessly. It cannot tell
you whether the thing a reviewer opens on a phone actually plays — both games reported as "not
working" in the 2026-08-03 review built clean and passed their balance gates, then ended the run
in eleven and eighteen seconds. `scripts/play-test.mjs` is the check for that:

    npm i --no-save puppeteer-core            # once, at the repo root
    cd <game> && npx vite build && cd ..
    node scripts/play-test.mjs <game>                 # one handset
    node scripts/play-test.mjs <game> --all-sizes     # 320x568 through 412x915

It serves the production `dist/`, drives real touch input in headless Chrome, and reports console
and page errors, whether the canvas mounted and painted, how long a random-input bot survives,
and whether the results screen and retry path work. Screenshots land in the game folder
(gitignored). Exit code is non-zero only for a hard failure — a thrown error or a canvas that
never mounted; a short run is flagged as a smell to check against `balance.mjs`, not a failure.

## Documentation

- [Game Quality Audit](docs/GAME_QUALITY_AUDIT.md) — current defects, root causes, priority
- [Game Polish Plan](docs/GAME_POLISH_PLAN.md) — critical / high-value / optional work
- [Asset Inventory](docs/ASSET_INVENTORY.md) — every asset, and what to do with it
- [Asset Generation Prompts](docs/ASSET_GENERATION_PROMPTS.md) — specs for replacement assets
- [Testing Checklist](docs/TESTING_CHECKLIST.md) — devices, scenarios, acceptance criteria
- [Build Standard](okf-brain/GAME_STANDARD.md) — scaffold every game must follow

---

Wisp Technologies – Creating engaging games for Babaj Life Insurance.
