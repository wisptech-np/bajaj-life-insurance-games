# Steady Tower — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Steady Tower is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Steady Tower's answer |
|---|---|
| Motif | Steady Tower gameplay theme & visual style. |
| Shape language | **Clean geometric vectors & tactile 3D elements.** Bevelled edges, clear silhouettes. |
| Camera | Standard game view (Orthographic 2D / 2.5D). |
| Signature accent | **Bajaj Cyan `#00A3E0`** & **Accent Gold `#FFB800`**. |
| Hazard colour | **Risk Crimson `#EF4444`** or **Virus Green `#49E24B`**. |
| Brand anchors | Blue `#003DA6`, Orange `#F26522`, Green `#28A745`. |
| Deep values | Night Navy `#0B132B`, Dark Slate `#030712`. |

Two hard technical rules, because the game post-processes these files at runtime:

1. All game sprites must be centred with sufficient padding and readable at small mobile display sizes.
2. If a transparent PNG cannot be produced, use `#FF00FF` flat backdrop for runtime keying.

---

### st-block-foundation — the blue beams that make up most of the tower
- **Size:** 512×256 transparent PNG, 2:1 landscape
- **Prompt:** Create a polished mobile-game asset of a single precision-milled composite structural beam, rectangular with chamfered edges and a clearly visible thin top face, for a balance-puzzle tower game. Use a consistent modern stylized 3D art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting from directly above, controlled detail, and a professional casual-game finish. Show the object from a straight-on front elevation with a shallow top face revealed, as if seen slightly from below eye level. The face carries a vertical gradient from cobalt `#2C6BC8` at the top through `#154B94` to deep navy `#0B2F6A` at the bottom, a bright top edge in `#5C9AEA`, and a crisp pale-blue rim light `#B4D6FF` at 55% opacity tracing the outline. Fine straight lengthwise fibre lines run horizontally across the face at very low contrast. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 512×256 PNG.
- **Negative:** text, lettering, watermark, wood grain, timber, mahogany, brick, LEGO studs, realistic photo, emoji, drop shadow, cast shadow, background gradient, bevelled 90s chrome, multiple blocks

### st-block-foundation-end — the alternating layers, seen end-on
- **Size:** 512×256 transparent PNG, 2:1 landscape
- **Prompt:** Create a polished mobile-game asset of a single precision-milled composite structural beam shown END-ON, so the face reads as a recessed square end cross-section rather than a long side, for a balance-puzzle tower game. Use a consistent modern stylized 3D art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting from directly above, controlled detail, and a professional casual-game finish. Show the object from a straight-on front elevation with a shallow top face revealed; a single dark seam line runs back into the top face, marking where two beams meet. The face carries a vertical gradient from cobalt `#2C6BC8` through `#154B94` to deep navy `#0B2F6A`, an inset recessed panel outlined in pale blue `#B4D6FF` at 28% opacity, and three faint concentric rings inside that panel suggesting a cut cross-section. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 512×256 PNG.
- **Negative:** text, lettering, watermark, tree rings that look like real wood, timber, realistic photo, emoji, drop shadow, side view, multiple blocks

### st-block-risk — the red beams the player is here to pull out
- **Size:** 512×256 transparent PNG, 2:1 landscape
- **Prompt:** Create a polished mobile-game asset of a single structural beam that is visibly compromised — the same milled shape as its blue counterpart but rendered in warning crimson, with a hairline stress fracture running diagonally across one third of the face — for a balance-puzzle tower game. Use a consistent modern stylized 3D art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting from directly above, controlled detail, and a professional casual-game finish. Show the object from a straight-on front elevation with a shallow top face revealed. The face carries a vertical gradient from `#E8563F` through `#B32B2B` to `#7C1522`, a hot top edge in `#FF8A72`, and a soft outer glow in `#EF4444` at 35% opacity so it separates from the blue beams around it. A small circular hazard mark sits at the left third of the face: a filled white disc with eight short white spokes radiating outward and two dark crimson dots inside it. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 512×256 PNG.
- **Negative:** text, lettering, watermark, skull, biohazard trefoil, radiation symbol, flames, blood, realistic photo, emoji, drop shadow, wood grain, multiple blocks

### st-plinth — the survey plinth the whole tower stands on
- **Size:** 768×192 transparent PNG, 4:1 landscape
- **Prompt:** Create a polished mobile-game asset of a wide low steel survey plinth — a machined slab with a slim top capping plate, shallow chamfered ends and two small recessed bolt heads near each corner — for a balance-puzzle tower game. Use a consistent modern stylized 3D art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting from directly above, controlled detail, and a professional casual-game finish. Show the object from a straight-on front elevation with a shallow top face revealed. Use a vertical gradient from slate blue `#24406E` at the top to dark steel `#13253F` at the bottom, with a single bright horizontal highlight line along the top capping plate in `#8FB9F5` at 35% opacity. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 768×192 PNG.
- **Negative:** text, lettering, watermark, engraved numbers, rivets that read as cartoon bolts, rust, concrete texture, realistic photo, emoji, drop shadow, tower on top of it

### st-flick-indicator — the pull direction cue on the held block
- **Size:** 256×256 transparent PNG, square
- **Prompt:** Create a polished mobile-game asset of a directional pull indicator: two nested chevron arrowheads pointing right, the outer one larger and fainter than the inner one, drawn as thick round-capped strokes with a soft outer bloom, for a balance-puzzle tower game. Use a consistent modern stylized flat-with-glow art style with clean silhouettes, strong readability at small sizes, controlled detail, and a professional casual-game finish. Show the object head-on, perfectly axis-aligned. Use warm orange `#FF8A3D` for the strokes and a `#F26522` bloom at 45% opacity. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 256×256 PNG.
- **Negative:** text, lettering, watermark, hand, cursor, mouse pointer, arrow with a tail or shaft, realistic photo, emoji, drop shadow, gradient background

### st-thumb-glyph — the finger in the how-to-play loop
- **Size:** 256×256 transparent PNG, square
- **Prompt:** Create a polished mobile-game asset of a simplified white thumb glyph seen from behind, as used to demonstrate a swipe gesture — one rounded thumb extended upward from a soft rounded palm block, no fingers, no fingernail detail — for a balance-puzzle tower game. Use a consistent modern stylized flat art style with clean silhouettes, strong readability at small sizes, a single soft dimensional shade, controlled detail, and a professional casual-game finish. Show the object from a front-facing angle, tilted about 12 degrees to the right as if mid-swipe. Fill in pure white `#FFFFFF` with a dark navy outline `#0B1221` at 55% opacity and one cool grey `#9DB4D8` shadow plane along the lower left. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 256×256 PNG.
- **Negative:** text, lettering, watermark, realistic skin, fingernails, wrist, sleeve, full hand with five fingers, glove, realistic photo, emoji, drop shadow

### st-backdrop — the drafting-table sky behind the tower
- **Size:** 1080×1920 opaque PNG, 9:16 portrait
- **Prompt:** Create a polished mobile-game background of a structural-engineering drafting environment for a balance-puzzle tower game. Use a consistent modern stylized art style with clean flat fields, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Composition, top to bottom: a vertical gradient sky from `#061024` through `#0B1F42` to `#0B1221`; a very faint square blueprint grid at 6% opacity across the whole frame; a soft cobalt glow `#1E6BE0` at 28% opacity centred about one third up from the bottom where the tower will stand; a lighter floor band across the lowest 12% of the frame separated by a single thin `#8FB9F5` horizon line at 22% opacity; and a dark vignette closing the corners. Leave the vertical centre band completely clear of detail — a tower is composited over it. Keep the composition symmetrical about the vertical axis. No text, watermark, border, mock-up, UI frame, photographic textures, buildings, clouds, characters, or extra objects. Export-ready game asset, 1080×1920 PNG.
- **Negative:** text, lettering, watermark, city skyline, clouds, stars, sun, people, furniture, desk objects, blueprint rolled paper, realistic photo, emoji, busy centre

### st-icon-set — the six HUD and screen glyphs, one sheet
- **Size:** 1536×1024 transparent PNG, 6 cells of 256×256 in a 3×2 grid
- **Prompt:** Create a polished mobile-game icon sheet of six line glyphs laid out in a 3×2 grid on one transparent canvas, each glyph centred in its own 256×256 cell, for a balance-puzzle tower game. Every glyph must share exactly the same construction: uniform 2-unit stroke weight on a 24-unit grid, round line caps and round joins, 1.5-unit corner radius on every rectangle, pure white `#FFFFFF` strokes, no fills except where stated, and equal optical weight so the set reads as one family at 20 pixels. The six glyphs, in reading order: (1) a stack of three horizontal rounded bars, widest at the bottom and narrowest at the top; (2) a small circle with eight short spokes radiating outward, evenly spaced; (3) a spirit level — a long horizontal rounded rectangle with two vertical centre marks and a small circle offset to the right of centre inside it; (4) a clock circle with hour and minute hands reading two o'clock; (5) the same three-bar stack squared up with a small solid diamond crowning it; (6) the same three-bar stack with the upper two bars rotated off axis so it reads as toppling. Keep each cell's composition centred with generous padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 1536×1024 PNG.
- **Negative:** text, lettering, numerals, watermark, filled solid icons, varying stroke weights, sharp square corners, gradients, colour, realistic photo, emoji, drop shadow, cell dividers or grid lines

### st-dust-puff — the grit that falls from a straining joint
- **Size:** 256×256 transparent PNG, square
- **Prompt:** Create a polished mobile-game particle asset of a small drifting dust puff — five or six irregular soft-edged specks of differing sizes clustered loosely, as if shaken loose from a joint under load — for a balance-puzzle tower game. Use a consistent modern stylized art style with clean silhouettes, strong readability at small sizes, flat shading with a single soft falloff, controlled detail, and a professional casual-game finish. Show the cluster head-on. Use cool grey-blue `#9DB4D8` at 70% opacity fading to fully transparent at the outer edge of each speck. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 256×256 PNG.
- **Negative:** text, watermark, smoke plume, fire, sparks, explosion, realistic photo, emoji, drop shadow, hard outlines, snowflakes

### st-result-secured — the win-screen hero
- **Size:** 768×768 transparent PNG, square
- **Prompt:** Create a polished mobile-game asset of a complete twelve-course tower of milled composite beams standing perfectly upright and plumb on a steel plinth, every beam in the cobalt-to-navy foundation palette with none of the crimson risk beams remaining, ringed by a soft green halo, for a balance-puzzle tower game. Use a consistent modern stylized 3D art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting from directly above, controlled detail, and a professional casual-game finish. Show the tower from a straight-on front elevation, slightly below eye level so the top faces of the beams catch light. Use cobalt `#2C6BC8` to navy `#0B2F6A` for the beams, slate `#24406E` for the plinth, a `#28A745` halo at 40% opacity, and a scatter of small gold `#FFC845` motes rising around the upper third. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 768×768 PNG.
- **Negative:** text, lettering, watermark, trophy, medal, ribbon, confetti streamers, characters, hands, red blocks, realistic photo, emoji, drop shadow, leaning tower

### st-result-toppled — the loss-screen hero
- **Size:** 768×768 transparent PNG, square
- **Prompt:** Create a polished mobile-game asset of a collapsed tower of milled composite beams — the lowest three courses still seated on their steel plinth, the courses above sheared progressively further off centre, and five or six loose beams scattered and rotated across the ground line in front — for a balance-puzzle tower game. Use a consistent modern stylized 3D art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting from directly above, controlled detail, and a professional casual-game finish. Show the wreck from a straight-on front elevation, slightly below eye level. Use cobalt `#2C6BC8` to navy `#0B2F6A` for most beams, two crimson `#E8563F` beams among the loose ones, slate `#24406E` for the plinth, and a low cool grey-blue `#9DB4D8` dust haze at 45% opacity hugging the ground line. The lean must read as an accumulating shear — each course displaced a little further than the one below, never a single rigid tilt. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 768×768 PNG.
- **Negative:** text, lettering, watermark, explosion, fire, cracks in the ground, characters, hands, rubble, concrete debris, realistic photo, emoji, drop shadow, uniformly skewed parallelogram stack

### st-meter-shell — the balance gauge chrome
- **Size:** 768×192 transparent PNG, 4:1 landscape
- **Prompt:** Create a polished mobile-game UI asset of a horizontal balance gauge shell: a long capsule-shaped track with a frosted translucent body, a single bright centre tick mark splitting it in half, and a slim vertical needle with a soft bloom sitting slightly right of that centre, for a balance-puzzle tower game. Use a consistent modern stylized glassmorphism art style with clean silhouettes, strong readability at small sizes, a soft inner highlight along the top edge, controlled detail, and a professional casual-game finish. Show the object head-on, perfectly axis-aligned. Use white at 8% opacity for the track body, a white 42%-opacity centre tick, a `#FF8A3D` needle with an orange bloom, and a thin white 12%-opacity outline. Keep the composition centred with sufficient padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 768×192 PNG.
- **Negative:** text, lettering, numerals, percentage marks, tick scale, watermark, speedometer dial, circular gauge, realistic photo, emoji, drop shadow, opaque background plate

---

## Replacement checklist

| Prompt id | Replaces |
|---|---|
| `game-background` | `src/assets/bg.png / canvas backdrop` |
| `player-hero` | `src/assets/hero.png / player rendering` |
| `hazard-object` | `src/assets/hazard.png / risk rendering` |
| `ui-hud-icons` | `HUD headers & badges` |
| `results-screen-art` | `Screens.jsx Results Screen` |

The game engine dynamically binds these assets at runtime, with fallback to procedural SVG/canvas rendering.
