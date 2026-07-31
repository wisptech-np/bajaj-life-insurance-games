# Secure Journey — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Secure Journey is the repo's **forward-rail runner shooter**: you navigate a 3-lane elevated wealth bridge, blasting through financial risk barricades to reach the safety vault.

| Axis | Secure Journey's answer |
|---|---|
| Motif | Elevated 3-lane suspension bridge over dark waters under a night sky. |
| Shape language | **Angular road-infrastructure.** Chevrons, wedges, guard rails, hazard stripes — sharp geometric silhouettes, never organic rounded blobs. |
| Camera | Steep top-down-behind perspective (high angle forward scrolling). |
| Signature accent | **Rail Glow `#3B8DD4`** — glowing neon guide rails framing the track. |
| Hazard colour | **Risk Barricade Amber/Crimson** `#FFC46B` (minor), `#FF9C5B` (mid), `#FF7361` (heavy). |
| Brand anchors | Blue `#003DA6`, Orange `#F26522`, Green `#28A745` (health HUD only). |
| Deep values | Night navy `#08172B`, shadow `#04101F`. |

Two hard technical rules, because the game post-processes these files at runtime:

1. **Vehicles and pods must be centred, facing upward along the vertical axis.** The engine measures bounding dimensions and anchors movement vectors to the object center.
2. If a transparent PNG cannot be produced, the backdrop must be a **single flat colour that appears nowhere on the asset** (recommend pure magenta `#FF00FF`).

---

### sj-bg-bridge — Scrolling playfield background (the wealth bridge over dark water)
- **Size:** 1080×1920 seamless-vertical tile, PNG, opaque
- **Prompt:** Create a polished mobile-game background of a narrow elevated three-lane suspension bridge deck seen from a steep top-down-behind camera, running vertically up the frame over near-black open water. Use a flat vector game-art style with clean geometry, crisp edges, controlled detail and a professional casual-game finish. The deck is dark navy (#08172B) with faint horizontal plank seams and two dashed white lane dividers at 12% opacity; both edges are capped with glowing guard rails in #3B8DD4 with small #003DA6 railing posts spaced evenly. Surrounding water is #04101F with thin lighter blue horizontal ripple strokes at low opacity. Lighting is cool, night-time, lit only by the rail glow. Composition must tile seamlessly top-to-bottom. Do NOT include any characters, vehicles, hazards, sky, city skyline or horizon line.
- **Negative:** text, watermark, logo, UI frame, photographic texture, people, cars, sky, buildings, sunlight, warm colours, drop shadow, border

### sj-pod-guardian — Player object (the Guardian pod / traveller)
- **Size:** 256×256 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a compact circular armoured hover-pod carrying a traveller, viewed from directly above, for a lane-runner protection game. Use a flat vector game-art style with clean silhouette, strong readability at 40px, soft dimensional shading and a professional casual-game finish. The body is a smooth disc with a radial gradient from #3B8DD4 at the upper-left highlight through #003DA6 to #051833 at the rim, with a bright white circular core lens dead centre. Two short swept triangular stabiliser fins in #0A2F52 flank the lower edge. A thin #3B8DD4 energy arc sits above the pod like a forward shield brow. Centred with generous padding. Do NOT add wheels, a driver's face, weapons, motion blur or ground shadow.
- **Negative:** text, watermark, face, cockpit glass reflection, realistic metal photo texture, wheels, exhaust smoke, drop shadow, border

### sj-thrust — Pod thruster flame (attaches under the pod)
- **Size:** 128×128 transparent PNG, 4-frame horizontal sprite strip (512×128)
- **Prompt:** Create a polished mobile-game asset sprite strip of four flickering flame plumes for a hover-pod thruster, seen from above, for a lane-runner game. Use a flat vector game-art style with hard-edged tapered triangular flame shapes, no gradients beyond two steps, strong readability at small size. Colours step from #FF8533 at the base to #F26522 at the tip with a thin pale-yellow #FFD37A inner core. Each frame varies only in length and jitter. Transparent background, frames evenly spaced and centred. Do NOT include smoke, sparks, the pod body or any glow bloom.
- **Negative:** text, watermark, smoke, realistic fire photo, blue flame, particle haze, drop shadow, border

### sj-hazard-small — Risk Barricade, minor tier ("late fee")
- **Size:** 128×128 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small angular road-hazard warning plate shaped like a downward-pointing chevron arrowhead, viewed flat-on from above, for a lane-runner game about financial risk. Use a flat vector game-art style with a hard geometric silhouette — a five-sided wedge, wide at the top, tapering to a single point at the bottom. Fill with a vertical gradient from #FFC46B down to #D98211, overlaid with four diagonal near-black (#090E18) hazard stripes at 50% opacity running lower-left to upper-right. Add a 1.5px white rim at 55% opacity and a bold white downward chevron mark centred on the face. Centred with padding. Do NOT round the corners into a blob, and do NOT add spikes, tendrils, eyes, or any organism-like feature.
- **Negative:** text, watermark, virus, germ, bacteria, spikes, eyes, face, green colour, rounded blob, drop shadow, border

### sj-hazard-medium — Risk Barricade, mid tier ("loan slip")
- **Size:** 160×160 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a medium angular road-hazard barricade plate shaped like a downward-pointing chevron arrowhead, viewed flat-on from above, for a lane-runner game about financial risk. Use a flat vector game-art style with the identical five-sided wedge silhouette as the small tier but visibly heavier: thicker rim, one extra hazard stripe, and a small dark ballast bar across the top edge. Fill with a vertical gradient from #FF9C5B down to #C43F16 with diagonal #090E18 hazard stripes at 50% opacity and a bold white downward chevron centred on the face. Add a faint warm rim-glow in #F26522. Centred with padding. Do NOT add spikes, tendrils, eyes, or any organism-like feature.
- **Negative:** text, watermark, virus, germ, spikes, eyes, face, green colour, rounded blob, realistic rust photo, drop shadow, border

### sj-hazard-large — Risk Barricade, heavy tier ("debt slab")
- **Size:** 192×192 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a heavy angular debt-slab road barricade shaped like a thick downward-pointing chevron arrowhead, viewed flat-on from above, for a lane-runner game about financial risk. Use a flat vector game-art style with the same wedge silhouette as the lighter tiers, scaled up and visibly massive: chunky bevelled rim, six diagonal hazard stripes in #090E18 at 50% opacity, two small dark bolt studs at the shoulders. Fill with a vertical gradient from #FF7361 down to #7E1710. A bold white downward chevron sits centred on the face. Add a deep crimson rim-glow. Centred with padding. Do NOT add spikes, tendrils, eyes, or any organism-like feature.
- **Negative:** text, watermark, virus, germ, spikes, eyes, face, green colour, rounded blob, cracks, gore, drop shadow, border

### sj-hazard-debris — Barricade destruction burst
- **Size:** 256×256 transparent PNG, 5-frame horizontal strip (1280×256)
- **Prompt:** Create a polished mobile-game asset sprite strip of a five-frame shatter burst of angular plate fragments for a lane-runner game. Use a flat vector game-art style: sharp-edged triangular and trapezoid shards, no soft particles, no smoke. Shards are #F26522 and #C43F16 with a few pale #FFD37A spark slivers. Frame one is a tight cluster, frames two to five expand radially and thin out. Transparent background, each frame centred in its cell. Do NOT include a fireball, smoke cloud, round particles, or any green colour.
- **Negative:** text, watermark, smoke, fireball, round soft particles, green, gore, realistic explosion photo, drop shadow, border

### sj-shield-pickup — Cover Shield pickup (heal + weapon stack)
- **Size:** 160×160 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a floating hexagonal protection token viewed flat-on from above, for a lane-runner protection game. Use a flat vector game-art style with a crisp flat-top hexagon silhouette, filled #3B8DD4 at 85% opacity with a clean 2px white outline and a bold white medical-style plus sign centred inside. Add a soft outer glow in #3B8DD4 and two thin concentric hex outlines at low opacity suggesting a containment field. Centred with generous padding. Do NOT add a heart, a coin, a star, wings, or any text on the token.
- **Negative:** text, watermark, heart, coin, star, cross of a religious kind, wings, realistic glass, drop shadow, border

### sj-boss-stormfront — Inflation Storm-Front (boss wall)
- **Size:** 1024×384 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a wide horizontal crimson barricade wall called an inflation storm-front, viewed flat-on from above, for a lane-runner boss fight. Use a flat vector game-art style with a strong horizontal rectangular silhouette with 10px rounded corners — roughly four times wider than tall — so it reads instantly as a wall blocking every lane. Fill with a vertical gradient from #FF7361 through #B3261E to #4E0D08, overlaid with repeating diagonal near-black hazard chevrons at 45% opacity. Add a white rim at 50% opacity, two glowing amber #FFD37A warning lamps inset at the top-left and top-right corners, and a bold white upward chevron gauge mark centred on the face. Below the lower edge, three thin jagged amber lightning forks stab downward. Centred with padding. Do NOT make it round, do NOT give it eyes, a mouth, spikes, tentacles or any creature anatomy.
- **Negative:** text, watermark, virus, germ, monster, eyes, mouth, tentacles, spikes, green colour, circular shape, realistic storm photo, drop shadow, border

### sj-vault — Wealth Vault (win-state goal object)
- **Size:** 384×384 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a squared strongroom vault door viewed flat-on from above, for a lane-runner game about reaching a wealth goal. Use a flat vector game-art style with a rounded-square brushed-silver body (#C0C0C0) framed by a 4px gold #FFD37A border, a dark #2D3748 circular dial recess at centre, four gold radial spoke handles crossing the dial, and a small gold hub cap at the exact centre. Add a warm gold outer glow suggesting the goal is reachable. Centred with generous padding. Do NOT add coins, banknotes, gems, a keyhole, or any currency symbol.
- **Negative:** text, watermark, coins, banknotes, currency symbol, gems, keyhole, realistic metal photo, drop shadow, border

### sj-hud-icons — HUD strip glyph set (score / health / power / clock)
- **Size:** 4 icons at 64×64 each, transparent PNG, delivered as one 256×64 strip
- **Prompt:** Create a polished mobile-game HUD icon set of exactly four glyphs in one horizontal strip for a lane-runner game: a solid five-point star in #FFD37A, a solid heart in #28A745, a small rounded-square power pip in a #FF8533 to #F26522 vertical gradient, and an outlined clock face with hands in #3B8DD4 at 2.4px stroke. Use a flat vector icon style with uniform optical weight, flat fills, no inner detail, and perfect legibility at 13px. Each glyph is centred in its own 64×64 cell with equal padding. Transparent background. Do NOT add badges, counters, numbers, containers, or any outline around the cells.
- **Negative:** text, numbers, watermark, badge, container circle, gradient mesh, 3D bevel, drop shadow, border

### sj-rail-post — Bridge guard-rail post (repeating deck decoration)
- **Size:** 64×48 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single short bridge guard-rail post cap viewed from directly above, for a lane-runner background. Use a flat vector game-art style: a small horizontal rounded bar in #003DA6 with a narrower inset highlight bar in #3B8DD4 sitting on top of it, crisp edges, no perspective. Centred with tight padding so the asset can be tiled at a fixed vertical interval along a bridge edge. Do NOT add bolts, rust, cables, lights, or a shadow.
- **Negative:** text, watermark, rust, cable, bolt heads, lamp, perspective, realistic metal, drop shadow, border

### sj-results-art — Results screen hero mark (win state)
- **Size:** 512×512 transparent PNG
- **Prompt:** Create a polished mobile-game result-screen hero mark of a gold vault door sitting at the end of a short converging blue bridge deck, viewed from a shallow top-down-behind camera, for a life-insurance protection game. Use a flat vector game-art style with clean geometry and a professional casual-game finish. The deck is #08172B with #3B8DD4 glowing rails converging toward the vault; the vault is silver with a #FFD37A gold frame and dial. A soft gold radial glow sits behind the vault. Composition is centred and vertically balanced with padding. Do NOT include characters, hazards, confetti, ribbons, trophies, or any number.
- **Negative:** text, numbers, watermark, trophy, medal, confetti, ribbon, characters, hazards, realistic render, drop shadow, border

---

## Replacement checklist

| Prompt id | Replaces |
|---|---|
| `sj-bg-bridge` | `src/track_bg.png / canvas drawBridge()` |
| `sj-pod-guardian` | `src/runner_hero.png / canvas drawPod()` |
| `sj-thrust` | `canvas drawThruster()` |
| `sj-hazard-small` | `canvas drawHazard(tier 1)` |
| `sj-hazard-medium` | `canvas drawHazard(tier 2)` |
| `sj-hazard-large` | `canvas drawHazard(tier 3)` |
| `sj-hazard-debris` | `canvas drawDebris()` |
| `sj-shield-pickup` | `src/multiplier_gate.png / canvas drawPickup()` |
| `sj-boss-stormfront` | `src/virus_boss.png / canvas drawBoss()` |
| `sj-vault` | `canvas drawVault()` |
| `sj-hud-icons` | `inline SVGs in HUD header` |
| `sj-rail-post` | `canvas drawRailPosts()` |
| `sj-results-art` | `ResultsScreen in src/Screens.jsx` |

The game engine dynamically binds these assets at runtime, with fallback to procedural SVG/canvas rendering.
