# Asset Replacement Manifest — Bajaj Life Insurance Games

**Date:** July 30, 2026  
**Scope:** 16 Active Bajaj Life Insurance Games  
**Tracking:** Asset Migrations, Nano Banana Generated Replacements, Vector Enhancements, and UI Code Binding Files.

---

## Shared UI & System Assets

| Asset ID | Legacy Asset / Primitive | Upgraded Asset Name | Path | Format | Res / Spec | Status | Target Code References |
|---|---|---|---|---|---|---|---|
| `SH-UI-01` | Plain `<button>` tags | Shared Bajaj Pill Button | `assets/shared/ui/btn-primary-pill.svg` | SVG | Vector | Upgraded | `shared/game-kit/index.js`, `Screens.jsx` across games |
| `SH-UI-02` | Generic CSS borders | Glassmorphism Overlay Panel | `assets/shared/ui/glass-card-border.svg` | SVG | Vector | Upgraded | `index.css` (All 16 games) |
| `SH-UI-03` | Generic heart icon | Polished Life Shield Badge | `assets/shared/icons/icon-shield-badge.svg` | SVG | 64x64 | Upgraded | Top bar HUD components |
| `SH-UI-04` | Text clock `00:00` | Golden Timer HUD Dial | `assets/shared/icons/icon-timer-gold.svg` | SVG | 64x64 | Upgraded | Timer components |
| `SH-UI-05` | Plain star text | Gold Rating Star Badge | `assets/shared/icons/icon-star-gold.svg` | SVG | 64x64 | Upgraded | Result / Victory Screens |

---

## Game-Specific Asset Replacements

### 1. Guardian Shelter (`guardian-shelter`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `GS-01` | `family_dad.png` (low-res cut) | 3D Dad Avatar | `guardian-shelter/src/family_dad.png` | WebP/PNG | 512x512 | Upgraded | `GuardianShelterGame.jsx` |
| `GS-02` | `family_mom.png` | 3D Mom Avatar | `guardian-shelter/src/family_mom.png` | WebP/PNG | 512x512 | Upgraded | `GuardianShelterGame.jsx` |
| `GS-03` | `family_kid.png` | 3D Kid Avatar | `guardian-shelter/src/family_kid.png` | WebP/PNG | 512x512 | Upgraded | `GuardianShelterGame.jsx` |
| `GS-04` | `family_grandpa.png` | 3D Grandpa Avatar | `guardian-shelter/src/family_grandpa.png` | WebP/PNG | 512x512 | Upgraded | `GuardianShelterGame.jsx` |
| `GS-05` | `guardian_shelter_bg.png` | High-Res Mountain Sky BG | `guardian-shelter/src/guardian_shelter_bg.png` | WebP/PNG | 1080x1920 | Upgraded | `GuardianShelterGame.jsx` |
| `GS-06` | Procedural purple arc | Spiky Threat Virus Cloud | `guardian-shelter/src/threat_cloud.png` | PNG | 512x512 | Upgraded | `GuardianShelterGame.jsx` |

---

### 2. Secure Journey (`secure-journey`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `SJ-01` | Canvas blue dot crowd | 3D Runner Hero | `secure-journey/src/runner_hero.png` | PNG | 512x512 | Upgraded | `SecureJourneyGame.jsx` |
| `SJ-02` | Flat canvas text box | Multiplier Energy Gate | `secure-journey/src/multiplier_gate.png` | PNG | 512x512 | Upgraded | `SecureJourneyGame.jsx` |
| `SJ-03` | Canvas red circle | Spiky Virus Enemy Boss | `secure-journey/src/virus_boss.png` | PNG | 512x512 | Upgraded | `SecureJourneyGame.jsx` |
| `SJ-04` | Solid grey track | Sci-Fi Highway Track | `secure-journey/src/track_bg.png` | WebP/PNG | 1080x1920 | Upgraded | `SecureJourneyGame.jsx` |

---

### 3. Smart Match 3D (`smart-match-3d`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `SM-01` | Inline SVG shield | 3D Term Shield Tile | `smart-match-3d/src/assets/tile_shield.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-02` | Inline SVG piggy | 3D Piggy Bank Savings Tile | `smart-match-3d/src/assets/tile_savings.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-03` | Inline SVG house | 3D Family House Tile | `smart-match-3d/src/assets/tile_home.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-04` | Inline SVG car | 3D Dream Car Tile | `smart-match-3d/src/assets/tile_car.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-05` | Inline SVG books | 3D Education Cap Tile | `smart-match-3d/src/assets/tile_education.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-06` | Inline SVG rings | 3D Wedding Rings Tile | `smart-match-3d/src/assets/tile_marriage.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-07` | Inline SVG stroller | 3D Child Future Tile | `smart-match-3d/src/assets/tile_child.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-08` | Inline SVG chair | 3D Retirement Chair Tile | `smart-match-3d/src/assets/tile_retirement.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-09` | Inline SVG cross | 3D Health Shield Tile | `smart-match-3d/src/assets/tile_health.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-10` | Inline SVG trophy | 3D Reward Trophy Tile | `smart-match-3d/src/assets/tile_rewards.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |
| `SM-11` | Inline SVG family | 3D Family Crest Tile | `smart-match-3d/src/assets/tile_family.png` | PNG | 512x512 | Upgraded | `data.js`, `Game.jsx` |

---

### 4. Risk Exit (`risk-exit`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `RE-01` | Flat canvas arrow box | Tactile 3D Arrow Block | `risk-exit/src/assets/block_arrow.png` | PNG | 512x512 | Upgraded | `RiskExitGame.jsx` |
| `RE-02` | Plain grey square | Financial Risk Lock Block | `risk-exit/src/assets/block_risk.png` | PNG | 512x512 | Upgraded | `RiskExitGame.jsx` |
| `RE-03` | Canvas border line | Portal Exit Gate Graphic | `risk-exit/src/assets/exit_portal.png` | PNG | 512x512 | Upgraded | `RiskExitGame.jsx` |

---

### 5. Life Soar (`life-soar`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `LS-01` | `hang_glider.png` | 3D Glider with Bajaj Wings | `life-soar/src/hang_glider.png` | WebP/PNG | 512x512 | Upgraded | `LifeSoarGame.jsx` |
| `LS-02` | `canyon_bg.png` | 3-Layer Canyon Parallax | `life-soar/src/canyon_bg.png` | WebP/PNG | 1080x1920 | Upgraded | `LifeSoarGame.jsx` |
| `LS-03` | Gradient stroke circle | Glowing Checkpoint Ring | `life-soar/src/checkpoint_ring.png` | PNG | 512x512 | Upgraded | `LifeSoarGame.jsx` |

---

### 6. Swing to Secure (`swing-to-secure`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `STS-01` | Canvas circle dot | 3D Acrobat Swing Hero | `swing-to-secure/src/assets/hero_swing.png` | PNG | 512x512 | Upgraded | `SwingToSecureGame.jsx` |
| `STS-02` | Pulsing dot | Milestone Anchor Pylon | `swing-to-secure/src/assets/anchor_pylon.png` | PNG | 512x512 | Upgraded | `SwingToSecureGame.jsx` |

---

### 7. Milestone Hopper (`milestone-hopper`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `MH-01` | Voxel canvas block | 3D Chibi Commuter Hero | `milestone-hopper/src/assets/chibi_hero.png` | PNG | 512x512 | Upgraded | `MilestoneHopperGame.jsx` |
| `MH-02` | Flat red rect | Medical Expense Hazard Car | `milestone-hopper/src/assets/car_hazard.png` | PNG | 512x512 | Upgraded | `MilestoneHopperGame.jsx` |
| `MH-03` | Brown bar | Bajaj SIP Safety Raft | `milestone-hopper/src/assets/sip_raft.png` | PNG | 512x512 | Upgraded | `MilestoneHopperGame.jsx` |

---

### 8. Portfolio Fit (`portfolio-fit`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `PF-01` | Flat CSS blue square | 3D Equity Gem Tile | `portfolio-fit/src/assets/block_equity.png` | PNG | 512x512 | Upgraded | `PortfolioFitGame.jsx` |
| `PF-02` | Flat CSS green square | 3D Debt Gem Tile | `portfolio-fit/src/assets/block_debt.png` | PNG | 512x512 | Upgraded | `PortfolioFitGame.jsx` |
| `PF-03` | Flat CSS gold square | 3D Gold Bullion Tile | `portfolio-fit/src/assets/block_gold.png` | PNG | 512x512 | Upgraded | `PortfolioFitGame.jsx` |

---

### 9. Spiral Sprint (`spiral-sprint`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `SPS-01` | Plain canvas circle | Glowing Bajaj Shield Orb | `spiral-sprint/src/assets/shield_orb.png` | PNG | 512x512 | Upgraded | `SpiralSprintGame.jsx` |
| `SPS-02` | Solid red arc | Textured Hazard Sector | `spiral-sprint/src/assets/hazard_arc.png` | PNG | 512x512 | Upgraded | `SpiralSprintGame.jsx` |

---

### 10. Wealth Drop (`wealth-drop`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `WD-01` | Flat yellow dot | 3D Gold Investment Coin | `wealth-drop/src/assets/gold_coin.png` | PNG | 512x512 | Upgraded | `WealthDropGame.jsx` |
| `WD-02` | Static dot pin | Glowing Pachinko Brass Peg | `wealth-drop/src/assets/peg_brass.png` | PNG | 512x512 | Upgraded | `WealthDropGame.jsx` |

---

### 11. Ripple Shield (`ripple-shield`) — DROPPED 2026-08-03, game deleted; no assets needed

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `RS-01` | Thin stroke circle | Energy Shockwave Ripple | `ripple-shield/src/assets/ripple_pulse.png` | PNG | 512x512 | Upgraded | `RippleShieldGame.jsx` |
| `RS-02` | Static emoji circle | 3D Family Safety Sphere | `ripple-shield/src/assets/family_sphere.png` | PNG | 512x512 | Upgraded | `RippleShieldGame.jsx` |

---

### 12. Steady Tower (`steady-tower`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `ST-01` | Flat canvas rectangle | Mahogany Wood Block | `steady-tower/src/assets/block_wood.png` | PNG | 512x512 | Upgraded | `SteadyTowerGame.jsx` |
| `ST-02` | Plain line hook | Robotic Extractor Arm | `steady-tower/src/assets/extractor_arm.png` | PNG | 512x512 | Upgraded | `SteadyTowerGame.jsx` |

---

### 13. Goal Orbit (`goal-orbit`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `GO-01` | Gradient circle | 3D Goal Planet Sphere | `goal-orbit/src/assets/planet_goal.png` | PNG | 512x512 | Upgraded | `GoalOrbitGame.jsx` |
| `GO-02` | Canvas triangle | Bajaj Shield Spacecraft | `goal-orbit/src/assets/shield_ship.png` | PNG | 512x512 | Upgraded | `GoalOrbitGame.jsx` |

---

### 14. Risk Strike (`risk-strike`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `RK-01` | Shaded blue circle | Metallic Shield Bowling Ball | `risk-strike/src/assets/bowling_ball.png` | PNG | 512x512 | Upgraded | `RiskStrikeGame.jsx` |
| `RK-02` | Red capsule | 3D Risk Pin Model | `risk-strike/src/assets/pin_risk.png` | PNG | 512x512 | Upgraded | `RiskStrikeGame.jsx` |

---

### 15. Coverage Archer (`coverage-archer`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `CA-01` | Phaser graphics shape | 3D Guardian Archer Hero | `coverage-archer/public/assets/archer_hero.png` | PNG | 512x512 | Upgraded | `App.tsx`, `game/` |
| `CA-02` | Black line arrow | Golden Protection Arrow | `coverage-archer/public/assets/arrow_gold.png` | PNG | 512x512 | Upgraded | `App.tsx`, `game/` |
| `CA-03` | Red circle target | Glowing Virus Target | `coverage-archer/public/assets/target_virus.png` | PNG | 512x512 | Upgraded | `App.tsx`, `game/` |

---

### 16. Tightrope Protection (`tightrope-protection`)

| Asset ID | Legacy Asset | Upgraded Asset Name | Target File Path | Format | Dimensions | Status | Affected Files |
|---|---|---|---|---|---|---|---|
| `TP-01` | Phaser stick silhouette | 3D Balance Runner Hero | `tightrope-protection/public/assets/runner_balance.png` | PNG | 512x512 | Upgraded | `App.tsx`, `game/` |
| `TP-02` | Single black line | Cyan Energy Balance Bar | `tightrope-protection/public/assets/balance_bar.png` | PNG | 512x512 | Upgraded | `App.tsx`, `game/` |
| `TP-03` | Red circle obstacle | Flying Virus Risk Hazard | `tightrope-protection/public/assets/hazard_virus.png` | PNG | 512x512 | Upgraded | `App.tsx`, `game/` |
