# Game Visual Audit — Bajaj Life Insurance Games

**Date:** July 30, 2026  
**Scope:** 16 Active Bajaj Life Insurance Games  
**Focus:** Visual Asset Quality, UI Consistency, Mobile Ergonomics, Touch Targets, Art Direction, and Asset Modernization via Nano Banana.

---

## Executive Summary

An exhaustive visual and UI audit was conducted across all 16 active games in the Bajaj Life Insurance suite. While the underlying gameplay mechanics and Canvas 2D/Phaser 3 logic are functional, the existing visual presentation suffers from inconsistent art direction, low-resolution placeholders, generic canvas primitives, basic emojis, unoptimized mobile touch targets, and fragmented typography styles.

This audit establishes the baseline visual state of every game, identifies low-quality or inconsistent assets, evaluates mobile screen readability, and defines exact requirements for asset replacement and design system integration.

---

## Workspace Summary & Tech Stack Overview

| # | Game Name | Type | Tech Stack | Primary Renderer | Existing Visual Asset Quality | Audit Score (Visual / UI) |
|---|---|---|---|---|---|---|
| 1 | `guardian-shelter` | New | React 18 + Vite | Canvas 2D | Moderate (Mixed PNGs & Canvas shapes) | 6.5 / 10 |
| 2 | `secure-journey` | New | React 18 + Vite | Canvas 2D | Low (Procedural canvas blocks) | 5.5 / 10 |
| 3 | `smart-match-3d` | New | React 18 + Vite | Canvas 2D | Moderate (Inline SVG rendering) | 7.0 / 10 |
| 4 | `risk-exit` | New | React 18 + Vite | Canvas 2D | Low-Moderate (Simple vector blocks) | 6.0 / 10 |
| 5 | `life-soar` | New | React 18 + Vite | Canvas 2D | Moderate (Stretched PNGs, flat HUD) | 6.5 / 10 |
| 6 | `swing-to-secure` | New | React 18 + Vite | Canvas 2D | Low (Basic canvas shapes & text) | 5.5 / 10 |
| 7 | `milestone-hopper` | New | React 18 + Vite | Canvas 2D | Low-Moderate (Geometric blocks) | 6.0 / 10 |
| 8 | `portfolio-fit` | New | React 18 + Vite | Canvas 2D | Moderate (Flat CSS blocks) | 6.5 / 10 |
| 9 | `spiral-sprint` | New | React 18 + Vite | Canvas 2D | Low (Basic canvas circles & arcs) | 5.0 / 10 |
| 10 | `wealth-drop` | New | React 18 + Vite | Canvas 2D | Low-Moderate (Simple pin graphics) | 5.5 / 10 |
| 11 | `ripple-shield` | New | React 18 + Vite | Canvas 2D | Low (Canvas gradient circles) | 5.0 / 10 |
| 12 | `steady-tower` | New | React 18 + Vite | Canvas 2D | Low-Moderate (Flat rectangular blocks) | 5.5 / 10 |
| 13 | `goal-orbit` | New | React 18 + Vite | Canvas 2D | Low (Canvas orbital rings & dots) | 5.0 / 10 |
| 14 | `risk-strike` | New | React 18 + Vite | Canvas 2D | Low-Moderate (Basic ball & pin shapes) | 5.5 / 10 |
| 15 | `coverage-archer` | Revamp | React 18 + Vite | Phaser 3 | Moderate (Phaser graphics primitives) | 6.0 / 10 |
| 16 | `tightrope-protection` | Revamp | React 18 + Vite | Phaser 3 | Moderate (Phaser graphics primitives) | 6.0 / 10 |

---

## Detailed Game-by-Game Audits

---

### 1. Guardian Shelter (`guardian-shelter`)
* **Concept:** Cover Orange style shield-placement physics puzzle.
* **1. Existing Visual Style:** Semi-cartoon family character cutouts layered over a flat blue sky canvas background. Threat cloud rendered as a procedural purple cloud with basic virus particle drops.
* **2. Low-Quality / Inconsistent Assets:** 
  - `family_dad.png`, `family_grandpa.png`, `family_kid.png`, `family_mom.png` have soft/blurry edges and inconsistent lighting angles.
  - Wooden and iron shield blocks are rendered as flat colored canvas rectangles with procedural stroke lines.
  - Threat cloud lacks dramatic animation, depth, or warning indicators.
* **3. Missing Assets:** Animated risk cloud asset, impact shield sparkle, placement grid highlight, victory crown / shield badge.
* **4. Scaling / Cropping / Blurring:** Family sprites scale poorly on high-DPR screens without explicit resolution clamping.
* **5. Inconsistent HUD & Modals:** Standard modal screens lack high-contrast glassmorphism cards and unified primary buttons.
* **6. Mobile Touch-Targets:** Placement ghost indicator is small and obscured by touch finger on smaller screens.
* **7. Visual Hierarchy:** Background sky color blends into UI overlay text, reducing top bar contrast.
* **8. Generic Elements:** Procedural canvas cloud and plain rectangle wooden beams.
* **9. Recommended Nano Banana Prompts:**
  - 3D-styled family avatar set (Dad, Mom, Kid, Grandpa) in unified casual 3D art style.
  - High-detail wood, steel, and titanium shield block textures.
  - Stylized menacing virus cloud overlay sprite.
  - Scenic sky & mountain background environment with soft clouds.
* **10. Reusable UI Components:** Shared glass header bar, primary pill buttons, slot booking modal.

---

### 2. Secure Journey (`secure-journey`)
* **Concept:** Forward-rail crowd runner / shooter against virus waves.
* **1. Existing Visual Style:** Neon futuristic runner track with procedurally drawn stickman/capsule crowd runners and rectangular multiplier gates.
* **2. Low-Quality / Inconsistent Assets:**
  - Crowd runners are simple colored circles/capsules without character detail or running animations.
  - Multiplier gates are basic semi-transparent rectangles with raw canvas text.
  - Virus boss swarms use repetitive red canvas circles.
* **3. Missing Assets:** 3D-rendered runner character avatar, glowing gate frame textures, 3D virus monster assets, shield powerup orb sprite.
* **4. Scaling / Cropping / Blurring:** Text inside multiplier gates scales inconsistently across mobile screen widths.
* **5. Inconsistent HUD & Modals:** Score and multiplier multipliers overlap screen top safe area on notched devices.
* **6. Mobile Touch-Targets:** Horizontal drag zone lacks visual touch feedback line or thumb guide.
* **7. Visual Hierarchy:** Track background lacks perspective lines, causing poor speed perception.
* **8. Generic Elements:** Plain canvas arc fills for shield bubbles and raw text gates.
* **9. Recommended Nano Banana Prompts:**
  - 3D hero runner character in dynamic action pose.
  - Sci-fi energy multiplier gates (Blue +10, Green x2).
  - Spiky menacing virus enemy swarm sprite.
  - High-speed futuristic highway track environment.
* **10. Reusable UI Components:** Unified multiplier HUD, game-over summary card, responsive control bar.

---

### 3. Smart Match 3D (`smart-match-3d`)
* **Concept:** Triple-tile life-goal matching puzzle.
* **1. Existing Visual Style:** Clean 2D glass tile rendering using procedural SVG strings converted to canvas offscreen buffers.
* **2. Low-Quality / Inconsistent Assets:**
  - While vector SVG tiles avoid raster pixelation, they lack rich 3D depth, material textures, and tactile shadows present in top match-3D mobile games.
  - Match particle burst effects are generic colored dot explosions.
* **3. Missing Assets:** Dedicated 3D isometric goal icons (Shield, Savings, Home, Car, Education, Marriage, Child, Retirement, Health, Rewards, Family), tray slot highlight, combo streak banner.
* **4. Scaling / Cropping / Blurring:** Tiles in the bottom 7-slot tray get squeezed on narrow screens (<360px width).
* **5. Inconsistent HUD & Modals:** Timer and match counter use basic text overlays rather than sculpted HUD badges.
* **6. Mobile Touch-Targets:** Tiles scattered on the board can overlap tightly, causing accidental mis-taps.
* **7. Visual Hierarchy:** Board tray and active puzzle board have equal visual weight; board requires subtle contrast separation.
* **8. Generic Elements:** Standard SVG icon paths without 3D highlights or soft ambient occlusion.
* **9. Recommended Nano Banana Prompts:**
  - 11 high-detail 3D isometric life-goal icons (Home with garden, Golden piggy bank, Sleek family car, Graduation cap & books, Golden wedding rings, Shield with crest, Healthcare cross emblem, Family icon, Golden trophy, Retirement rocking chair, Baby stroller).
  - Premium wood/velvet puzzle board background.
* **10. Reusable UI Components:** Shared 7-slot tray container, combo streak badge, booster button bar.

---

### 4. Risk Exit (`risk-exit`)
* **Concept:** Arrow sliding escape puzzle (Arrow Exit style).
* **1. Existing Visual Style:** Grid board with flat color-coded arrow blocks pointing in cardinal directions.
* **2. Low-Quality / Inconsistent Assets:**
  - Blocks are flat rounded rectangles with canvas chevron arrows painted on top.
  - Exit gateway is a simple glowing line on the canvas border.
  - Obstacle blocks look identical to movable blocks, creating confusion.
* **3. Missing Assets:** 3D bevel arrow vehicle/block sprites, distinct hazard lock blocks, glowing portal exit effect.
* **4. Scaling / Cropping / Blurring:** Grid board margins compress on tall mobile aspect ratios (19.5:9).
* **5. Inconsistent HUD & Modals:** Move counter and level indicator lack Bajaj brand styling.
* **6. Mobile Touch-Targets:** Swipe gestures on small grid blocks can trigger accidental adjacent block drag.
* **7. Visual Hierarchy:** Exit direction arrows do not stand out sufficiently against static obstacles.
* **8. Generic Elements:** Standard canvas `stroke()` chevrons and plain gray grid lines.
* **9. Recommended Nano Banana Prompts:**
  - Tactile 3D arrow blocks with metallic trim and direction indicators.
  - Financial obstacle lock blocks (Debt, Volatility, Inflation).
  - Sci-fi/financial portal exit gate illustration.
  - Sleek modern grid floor mat background texture.
* **10. Reusable UI Components:** Level progress header, reset button, step count badge.

---

### 5. Life Soar (`life-soar`)
* **Concept:** Hang-glider canyon flight simulator.
* **1. Existing Visual Style:** 2D side-scrolling canyon with a static hang glider sprite and procedural goal rings.
* **2. Low-Quality / Inconsistent Assets:**
  - `hang_glider.png` is an unshaded 2D cutout with flat colors.
  - `canyon_bg.png` lacks multi-layer depth or sky parallax layers.
  - Milestone rings are basic canvas circles with gradient strokes.
* **3. Missing Assets:** Multi-tier canyon background (far mountains, mid canyon walls, near rock pillars), wind thermal visual effect, coin/milestone collectible badges.
* **4. Scaling / Cropping / Blurring:** Glider sprite stutters slightly when tilting up and down due to static angle rotation without sprite bank frames.
* **5. Inconsistent HUD & Modals:** Altitude meter and fuel/life gauge are plain CSS bars.
* **6. Mobile Touch-Targets:** Hold-to-climb touch area covers whole screen but lacks visual touch feedback.
* **7. Visual Hierarchy:** Canyon hazards (dowel wind/rocks) blend into background wall textures.
* **8. Generic Elements:** Plain canvas gradient circles for checkpoint rings.
* **9. Recommended Nano Banana Prompts:**
  - High-res 3D hang glider with Bajaj branded wings in flight pose.
  - 3-layer parallax canyon landscape (Sunlit sky, Distant red-rock canyon, Detailed near cliffs).
  - Glowing milestone rings (Education Ring, Retirement Ring, Home Ring).
* **10. Reusable UI Components:** Altitude HUD dial, fuel/energy gauge, flight result summary card.

---

### 6. Swing to Secure (`swing-to-secure`)
* **Concept:** Rope-swing physics traversal across financial gap hazards.
* **1. Existing Visual Style:** Simple canvas line rope with a circular hero avatar swinging between anchor points over pit traps.
* **2. Low-Quality / Inconsistent Assets:**
  - Hero is a plain circle with a small shield icon.
  - Rope is a single 2px canvas line without texture or elasticity effect.
  - Anchor points are basic pulsing dots.
* **3. Missing Assets:** Animated acrobat/hero character, textured energy rope / protection cable, milestone anchor towers, hazard pit imagery.
* **4. Scaling / Cropping / Blurring:** Camera tracking feels abrupt on smaller mobile viewports.
* **5. Inconsistent HUD & Modals:** Distance counter and swing velocity HUD look default.
* **6. Mobile Touch-Targets:** Release timing button is text-only at bottom center.
* **7. Visual Hierarchy:** Anchor targets overlap sky background with low contrast.
* **8. Generic Elements:** Plain canvas line primitives and raw color fills.
* **9. Recommended Nano Banana Prompts:**
  - Dynamic 3D acrobat character in swinging pose.
  - Glowing financial milestone anchor pylons (Milestone Towers).
  - Volatility pit hazard background graphics (Market Dip, Debt Trap).
  - City skyline & mountain sunrise background environment.
* **10. Reusable UI Components:** Timing release button, distance HUD meter, milestone reach popup.

---

### 7. Milestone Hopper (`milestone-hopper`)
* **Concept:** Crossy Road / Frogger lane-hopping to reach financial milestones.
* **1. Existing Visual Style:** Top-down/isometric grid lanes with colored vehicle blocks and log rectangles.
* **2. Low-Quality / Inconsistent Assets:**
  - Vehicles (representing life expenses/risks) are flat color rectangles.
  - Floating platforms (representing SIP/Insurance safety rafts) are plain brown bars.
  - Player character is a simple voxel/canvas square.
* **3. Missing Assets:** Chibi 3D player avatar, stylized risk vehicles (Medical bill car, Inflation truck, Emergency expense van), SIP/Insurance lilypad/raft sprites, lane terrain tiles (Road, River, Grass, Milestone Finish).
* **4. Scaling / Cropping / Blurring:** Grid lanes crop tightly on narrow mobile screens (320px-360px).
* **5. Inconsistent HUD & Modals:** Hop count and safe streak indicators use basic text.
* **6. Mobile Touch-Targets:** Virtual d-pad / tap zone arrows have small hitboxes.
* **7. Visual Hierarchy:** Water hazard lanes look visually identical to safe road lanes.
* **8. Generic Elements:** Flat solid color rectangles for all moving objects.
* **9. Recommended Nano Banana Prompts:**
  - 3D Chibi commuter hero character.
  - Stylized risk hazard vehicles (Tax Van, Inflation Roadster, Health Crisis Ambulance).
  - Glowing Bajaj SIP safety rafts for river crossing.
  - Vibrant isometric grass, asphalt, and water terrain tiles.
* **10. Reusable UI Components:** Swipe/Tap mobile controls overlay, milestone reach modal.

---

### 8. Portfolio Fit (`portfolio-fit`)
* **Concept:** 1010! drag-and-place block puzzle for asset allocation.
* **1. Existing Visual Style:** 10x10 grid matrix with colorful block polyominoes (Equity, Debt, Gold, Liquid, Term).
* **2. Low-Quality / Inconsistent Assets:**
  - Blocks are flat CSS colored squares with plain borders.
  - Dragged piece preview lacks shadow elevation.
  - Grid cells are simple thin-bordered squares.
* **3. Missing Assets:** Glossy 3D tactile block tiles with embedded asset icons, particle line-clear animation, shadow elevation frame.
* **4. Scaling / Cropping / Blurring:** 10x10 grid squeezed on small devices, making drag-and-drop touch precision difficult.
* **5. Inconsistent HUD & Modals:** Score & High Score banners lack depth and Bajaj branding.
* **6. Mobile Touch-Targets:** Piece spawn tray below grid is tight, causing finger cover during pickup.
* **7. Visual Hierarchy:** Placed blocks and empty grid slots lack strong contrast differentiation.
* **8. Generic Elements:** Plain CSS `backgroundColor` squares without highlights.
* **9. Recommended Nano Banana Prompts:**
  - Tactile 3D gem/glass blocks in 5 asset colors (Blue Equity, Green Debt, Gold Bullion, Cyan Liquid, Purple Shield).
  - Dark premium grid mat with cell recess textures.
* **10. Reusable UI Components:** Polyomino piece container, line clear score burst popup.

---

### 9. Spiral Sprint (`spiral-sprint`)
* **Concept:** Helix jump descending ball through financial market cycles.
* **1. Existing Visual Style:** Rotating canvas helix tower with circular platforms and red hazard sectors.
* **2. Low-Quality / Inconsistent Assets:**
  - Ball is a plain red/blue canvas circle.
  - Helix tower platforms are flat arcs without depth or bevels.
  - Red hazard zones are solid red arc fills without texture or warning pattern.
* **3. Missing Assets:** Glowing 3D Bajaj shield sphere, textured helix platform slices, warning hazard striping, central tower shaft texture.
* **4. Scaling / Cropping / Blurring:** Tower rotation canvas lacks smooth interpolation on lower-end devices.
* **5. Inconsistent HUD & Modals:** Descend level depth indicator uses default font stack.
* **6. Mobile Touch-Targets:** Left/Right drag area covers screen but has no visual guide.
* **7. Visual Hierarchy:** Safe platform gap and hazard sectors can be hard to distinguish during fast rotation.
* **8. Generic Elements:** Procedural canvas `arc()` calls with basic solid fills.
* **9. Recommended Nano Banana Prompts:**
  - 3D Bajaj orb/sphere character with glowing energy core.
  - High-tech central tower column texture.
  - Metallic blue safe platform segment & red hazard sector texture.
* **10. Reusable UI Components:** Vertical progress tracker, crash/retry screen card.

---

### 10. Wealth Drop (`wealth-drop`)
* **Concept:** Plinko / pachinko board drop illustrating market volatility & disciplined investing.
* **1. Existing Visual Style:** Canvas peg board with dropping coins and bottom multiplier slots.
* **2. Low-Quality / Inconsistent Assets:**
  - Coins are flat yellow canvas circles.
  - Pegs are tiny static dots without metallic highlight or glow upon collision.
  - Multiplier bins are plain colored boxes at the bottom.
* **3. Missing Assets:** Shiny 3D golden investment coin asset, glowing brass/neon pachinko pegs, illuminated slot buckets with animations.
* **4. Scaling / Cropping / Blurring:** Peg spacing on narrow mobile displays becomes dense.
* **5. Inconsistent HUD & Modals:** Accumulated wealth score banner uses plain background box.
* **6. Mobile Touch-Targets:** Drop slot selector bar is small at top of board.
* **7. Visual Hierarchy:** Dropping coin blends into background pegs.
* **8. Generic Elements:** Canvas `arc()` dots and flat stroke lines.
* **9. Recommended Nano Banana Prompts:**
  - Premium 3D gold investment coin with Bajaj emblem.
  - Metallic brass/neon glowing peg sprite.
  - Casino/arcade style multiplier bin UI elements (1x, 2x, 5x, SIP Bonus).
  - Velvet blue arcade board background texture.
* **10. Reusable UI Components:** Drop control launcher, multiplier score HUD.

---

### 11. Ripple Shield (`ripple-shield`)
* **Concept:** One-tap chain reaction showing family protection ripple effects.
* **1. Existing Visual Style:** Canvas background with expanding wave circles popping floating risk dots and expanding family safety bubbles.
* **2. Low-Quality / Inconsistent Assets:**
  - Ripple waves are thin expanding canvas circles with decaying alpha stroke.
  - Family members inside bubbles are tiny static emoji/icons.
  - Risk dots are simple floating red circles.
* **3. Missing Assets:** Translucent 3D energy shield shockwave sprite, detailed family bubble avatars, menacing virus/risk dots.
* **4. Scaling / Cropping / Blurring:** Particle trails stutter when multiple ripples collide.
* **5. Inconsistent HUD & Modals:** Reaction percentage gauge lacks visual flair.
* **6. Mobile Touch-Targets:** Single tap anywhere on canvas works, but tap prompt lacks pulsing visual ring.
* **7. Visual Hierarchy:** Small risk dots get lost behind bright ripple circles.
* **8. Generic Elements:** Procedural `ctx.arc()` loops with flat opacity fades.
* **9. Recommended Nano Banana Prompts:**
  - Glowing energy pulse ripple ring effect.
  - 3D family safety sphere asset.
  - Spiky dark red virus particle asset.
  - Deep cosmos/abstract blue background environment.
* **10. Reusable UI Components:** Tap prompt indicator, chain combo counter.

---

### 12. Steady Tower (`steady-tower`)
* **Concept:** Jenga-style block removal without toppling the life financial tower.
* **1. Existing Visual Style:** Stacked rectangular canvas blocks with text labels (Risk, Debt, Savings, Pension).
* **2. Low-Quality / Inconsistent Assets:**
  - Blocks are flat colored canvas rectangles with simple black text overlay.
  - Tower physics wobbles abruptly without realistic wood/concrete textures.
  - Crane/extractor hand is a basic canvas line hook.
* **3. Missing Assets:** Textured wood/glass/metal block sprites with engraved goal labels, stability meter dial, extraction highlight ring.
* **4. Scaling / Cropping / Blurring:** High tower stacks get cropped at the top on short mobile screens.
* **5. Inconsistent HUD & Modals:** Tower balance percentage indicator is a basic CSS bar.
* **6. Mobile Touch-Targets:** Tapping individual narrow blocks in the stack can select the wrong block.
* **7. Visual Hierarchy:** Hazardous unstable blocks look identical to safe structural blocks.
* **8. Generic Elements:** Canvas rectangles with raw `fillText()` text.
* **9. Recommended Nano Banana Prompts:**
  - 3D polished wooden & glass Jenga blocks with engraved financial icons.
  - Mechanical precision extraction arm/cursor sprite.
  - Industrial studio construction environment background.
* **10. Reusable UI Components:** Stability percentage gauge, block info tooltip.

---

### 13. Goal Orbit (`goal-orbit`)
* **Concept:** Orbit-switch timing arcade around life goals.
* **1. Existing Visual Style:** Central canvas circles representing life goals with orbiting dots.
* **2. Low-Quality / Inconsistent Assets:**
  - Goal planets are simple gradient canvas circles with plain text.
  - Player satellite ship is a tiny triangle arrow.
  - Orbit paths are static thin dashed white circles.
* **3. Missing Assets:** 3D life-goal planet spheres, sci-fi Bajaj satellite/shield ship, glowing orbital ring textures, space dust background.
* **4. Scaling / Cropping / Blurring:** Orbit radius squeezes on smaller portrait mobile screens.
* **5. Inconsistent HUD & Modals:** Orbit jump combo HUD is unstyled text.
* **6. Mobile Touch-Targets:** Tap-to-jump timing zone lacks visual pulse ring around ship.
* **7. Visual Hierarchy:** Orbit paths blend together when 3+ goal planets are on screen.
* **8. Generic Elements:** Basic canvas line paths and filled triangles.
* **9. Recommended Nano Banana Prompts:**
  - 3D sci-fi life goal planet spheres (Education Planet, Home World, Retirement Hub).
  - Sleek Bajaj shield spacecraft sprite.
  - Glowing neon orbital trajectory ring textures.
* **10. Reusable UI Components:** Timing jump button, goal orbit map HUD.

---

### 14. Risk Strike (`risk-strike`)
* **Concept:** Flick bowling physics knocking out risk pins in one shot.
* **1. Existing Visual Style:** 3D-perspective canvas bowling lane with pins shaped like red virus cylinders.
* **2. Low-Quality / Inconsistent Assets:**
  - Bowling ball is a flat shaded blue circle.
  - Pins are basic red canvas capsules with text (Debt, Illness, Inflation).
  - Bowling lane has plain gradient wood floor without reflective gloss.
* **3. Missing Assets:** Glossy 3D metallic Bajaj bowling ball, 3D risk pin models with distinct risk icons, reflective wooden lane texture, pin strike explosion effect.
* **4. Scaling / Cropping / Blurring:** Flick velocity arrow stays static and doesn't scale with flick strength.
* **5. Inconsistent HUD & Modals:** Pins knocked down count lacks bowling scorecard formatting.
* **6. Mobile Touch-Targets:** Flick gesture area covers lower screen but lacks flick trajectory visual guide.
* **7. Visual Hierarchy:** Pins in the back row merge visually into lane background wall.
* **8. Generic Elements:** Canvas gradient filled circles and rounded rect capsules.
* **9. Recommended Nano Banana Prompts:**
  - Heavy 3D Bajaj shield bowling ball with golden core.
  - 3D risk pin assets (Illness Pin, Debt Pin, Volatility Pin).
  - Glossy bowling alley lane environment texture.
* **10. Reusable UI Components:** Flick velocity indicator, strike scorecard modal.

---

### 15. Coverage Archer (`coverage-archer`)
* **Concept:** Archery / angle shooter firing protective arrows at virus targets.
* **1. Existing Visual Style:** Phaser 3 2D canvas with a stick/vector archer and floating red virus targets.
* **2. Low-Quality / Inconsistent Assets:**
  - Archer character rendered via Phaser Graphics shapes without character detail.
  - Bow and arrow are plain black stroke arcs and lines.
  - Targets are simple pulsating red circles.
* **3. Missing Assets:** High-detail 3D archer hero sprite sheet (idle, draw bow, release), custom metallic arrow sprite, 3D virus target sprites, meadow/sky environment background.
* **4. Scaling / Cropping / Blurring:** Phaser canvas container lacks proper CSS flex auto-centering on tall mobile screens.
* **5. Inconsistent HUD & Modals:** Score, arrow count, and trajectory guide use default Phaser text objects.
* **6. Mobile Touch-Targets:** Aim drag indicator is sensitive to small thumb movements.
* **7. Visual Hierarchy:** Virus targets lack health bars or point value callouts.
* **8. Generic Elements:** Phaser `graphics.strokeCircle()` and `graphics.lineBetween()`.
* **9. Recommended Nano Banana Prompts:**
  - 3D Guardian Archer hero sprite.
  - Golden protection arrow asset with energy trail.
  - Glowing virus target sphere sprites in 3 sizes (Small, Medium, Boss).
  - Pristine green valley & blue sky environment background.
* **10. Reusable UI Components:** Aim trajectory HUD arc, quiver arrow counter, target point popups.

---

### 16. Tightrope Protection (`tightrope-protection`)
* **Concept:** Balance runner on flat ground dodging incoming financial risks.
* **1. Existing Visual Style:** Phaser 3 side-scroller with a stick figure runner balancing a pole while avoiding incoming red virus hazards.
* **2. Low-Quality / Inconsistent Assets:**
  - Runner is a basic Phaser Graphics silhouette.
  - Balance pole is a plain line segment.
  - Incoming risks are plain red floating circles.
* **3. Missing Assets:** 3D athletic runner character sprite sheet, metallic balance bar sprite, green/red virus hazard sprites, financial runway background environment.
* **4. Scaling / Cropping / Blurring:** Balance meter at screen top is a small thin bar difficult to read while focusing on runner.
* **5. Inconsistent HUD & Modals:** Tilt angle indicator uses raw text degrees.
* **6. Mobile Touch-Targets:** Left/Right tilt touch buttons on screen sides are small transparent boxes.
* **7. Visual Hierarchy:** Risk obstacles approach along the same visual plane as ground details.
* **8. Generic Elements:** Phaser primitive lines and circles.
* **9. Recommended Nano Banana Prompts:**
  - 3D balance runner hero character with protective aura.
  - Sleek energy balance pole sprite.
  - Floating green virus risk hazard sprites.
  - Modern city skyline flat-ground runner track background.
* **10. Reusable UI Components:** Prominent tilt balance HUD bar, touch tilt controls, finish line celebration screen.

---

## Universal Findings & Design System Requirements

Across all 16 games, the following systemic defects were identified:

1. **Typography Fragment:** Games currently use inconsistent system fonts (`Arial`, `sans-serif`, `Inter`, `Roboto`) with varied font weights and line heights.
2. **Button Inconsistency:** Primary actions range from flat CSS buttons to unstyled `<button>` tags without active/pressed states or touch feedback.
3. **Modal & Overlay Divergence:** Start screens, How-to-Play, Game Over, Lead Capture, and Slot Booking modals use disparate CSS classes and padding.
4. **Mobile Touch Target Failures:** Touch targets in 9 out of 16 games fall below the recommended 44x44px minimum, causing touch frustration on mobile devices.
5. **DPR & Canvas Sharpness:** High-DPR rendering requires explicit DPR scaling across all Canvas 2D and Phaser 3 scenes to eliminate blurriness on mobile devices.

---

## Action Plan & Implementation Strategy

To resolve these findings while preserving 100% of working game logic:
1. **Establish `docs/GAME_DESIGN_SYSTEM.md`** defining global visual tokens, unified button primitives, glass modal containers, mobile safe-zone rules, and HUD standards.
2. **Construct `docs/NANO_BANANA_ASSET_PROMPTS.md`** containing export-ready Nano Banana prompts for every character, background, tile, hazard, and icon across all 16 games.
3. **Build `docs/ASSET_REPLACEMENT_MANIFEST.md`** tracking exact original vs. upgraded assets, resolutions, paths, and integration points.
4. **Upgrade Game UI & Styles** across all 16 game codebases using clean CSS variables, unified glass overlays, high-DPR canvas scaling, and responsive touch layouts.
