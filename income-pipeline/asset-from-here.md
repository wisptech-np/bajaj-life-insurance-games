# Income Pipeline — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Income Pipeline is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Income Pipeline's answer |
|---|---|
| Motif | Income Pipeline gameplay theme & visual style. |
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

### bg-board-plate — the board backdrop behind the tile grid
- **Size:** 1080×1620 px, 2:3 portrait, opaque PNG
- **Prompt:** Create a flat 2-D background plate for a pipe-routing puzzle game that reads as a dark drafting table. Vertical gradient from `#0A1E42` at the top through `#0B2450` to `#061229` at the bottom, overlaid with a very faint blueprint grid at 4% opacity, a handful of hairline construction arcs and dimension ticks in the margins at 6% opacity, and a soft cool glow centred where the tile lattice will sit. Leave a clean unbusy band down the left edge for a salary inlet and down the right edge for goal tanks. Absolutely flat, no perspective, no props, no pipes, no characters — this plate must vanish under the sprites drawn on top.
- **Negative:** text, numbers, dimension labels, logos, watermark, isometric or three-quarter view, pipes, tanks, characters, photographic paper texture, heavy vignette, warm colours

### tile-well — the empty rounded cell every pipe sits in
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a flat 2-D game asset of a single empty puzzle cell for a pipe-rotation board: a rounded square (corner radius about 20% of the side) filled with white at 3.5% opacity, outlined by a 1 px white stroke at 7.5% opacity, with four barely-visible drafting registration ticks at the midpoint of each edge. Utterly minimal — it is a socket, not a decoration, and it must recede behind whatever pipe is drawn into it. Centred, generous padding, transparent background.
- **Negative:** text, numbers, watermark, gradient fill, bevel, drop shadow, glow, icon inside the cell, perspective, photographic texture

### pipe-straight — the two-port straight tile
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a flat 2-D game asset of a straight pipe segment for a pipe-rotation puzzle: a vertical run from the top edge to the bottom edge of the tile, drawn as a thick dark casing stroke in `#0D1A33` with a thinner cool metal bore in `#4E7FB8` centred inside it, rounded caps at both ends, and two thin machined collar bands where the pipe meets the tile edge. Constant line weight, blueprint precision, no taper, no highlight ramp. Centred in the tile with equal padding, transparent background.
- **Negative:** text, watermark, rust, dirt, rivets, photographic metal texture, drop shadow, glow, isometric or three-quarter view, water inside, background plate

### pipe-elbow — the four-state corner tile, the workhorse of the board
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a flat 2-D game asset of a right-angle elbow pipe for a pipe-rotation puzzle: one arm reaching the top edge of the tile, one reaching the right edge, meeting at the exact tile centre with a clean rounded 90-degree bend. Same construction as the straight — thick `#0D1A33` casing, thinner `#4E7FB8` bore inside, rounded caps, machined collar bands at the two open ends — plus a small drafting quarter-arc marked faintly inside the corner of the bend. Draw it at rotation zero so the game can rotate it in code. Centred, transparent background.
- **Negative:** text, watermark, arrows, rotation indicators, rust, rivets, photographic texture, drop shadow, glow, perspective, water inside, background plate

### pipe-tee — the three-port junction tile
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a flat 2-D game asset of a T-junction pipe for a pipe-rotation puzzle: arms reaching the top, right and bottom edges of the tile, meeting at the centre in a single moulded hub. Thick `#0D1A33` casing, thinner `#4E7FB8` bore, rounded caps, machined collars at each of the three open ends, and a slightly wider hub disc at the meeting point so the junction reads as one part rather than three crossing strokes. Draw it at rotation zero. Centred, transparent background.
- **Negative:** text, watermark, arrows, valves, handwheels, rust, photographic texture, drop shadow, glow, perspective, water inside, background plate

### pipe-cross-locked — the fixed four-way junction that cannot be turned
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a flat 2-D game asset of a four-way cross pipe junction for a pipe-rotation puzzle, visually marked as **welded shut / not rotatable**: arms to all four tile edges in `#0D1A33` casing with `#4E7FB8` bore, a wider central hub, and — the distinguishing feature — four small welded corner gussets filling the diagonals plus a thin desaturated slate ring around the hub, all at reduced saturation compared to the movable tiles so the player reads it as fixed furniture. Draw it symmetrical. Centred, transparent background.
- **Negative:** text, padlock icon, chain, watermark, arrows, bright colour, rust, photographic texture, drop shadow, glow, perspective, background plate

### inlet-salary-tap — the income source clamped to the left edge of the board
- **Size:** 384×512 px, 3:4 portrait, transparent PNG
- **Prompt:** Create a flat 2-D game asset of a salary inlet valve for a pipe-routing puzzle: a stout orange `#F26522` housing block with a `#FF8A3D` top face highlight and a crisp white 1.5 px outline, a circular white handwheel ring floating just above it, and a short outlet stub on its right side ending in a machined collar that will meet the first pipe tile. Blueprint-precise, flat front-on, no perspective, no depth. The only orange object in the plumbing set — it must be instantly findable on a dark navy board. Centred, transparent background.
- **Negative:** text, lettering, currency symbols, coins, banknotes, watermark, faucet dripping, photographic metal, drop shadow, perspective, background plate

### tank-goal-empty — the goal reservoir on the right edge, before it fills
- **Size:** 384×512 px, 3:4 portrait, transparent PNG
- **Prompt:** Create a flat 2-D game asset of an empty goal reservoir tank for a pipe-routing puzzle: a tall rounded-rectangle vessel with a translucent white 6%-opacity body, a 1.6 px blue `#1E6BE0` outline, a thin sight-glass stripe down the left inner wall marked with four faint blueprint fill ticks, and an inlet collar on its left edge at mid height. Completely empty inside so the game can draw the fill level over it. Flat front-on, blueprint-precise, centred, transparent background.
- **Negative:** text, numbers, percentage marks, watermark, liquid inside, gloss reflection, photographic glass, drop shadow, perspective, background plate

### tank-goal-full — the same tank once its goal is funded
- **Size:** 384×512 px, 3:4 portrait, transparent PNG
- **Prompt:** Create a flat 2-D game asset of a fully funded goal reservoir for a pipe-routing puzzle: identical vessel geometry to the empty tank, now brimming with flat funded-green `#28A745` fluid topped by a lighter `#4ADE80` meniscus band, the outline switched to `#4ADE80`, and three small rising bubble dots inside. Add a thin green glow hugging the outer edge only — no bloom into the surrounding transparency. Flat front-on, centred, transparent background.
- **Negative:** text, numbers, tick marks, watermark, sparkles, confetti, checkmark, photographic glass, drop shadow, perspective, background plate

### fx-money-flow — the gold highlight that travels the live route
- **Size:** 512×128 px, 4:1 landscape, transparent PNG tileable horizontally
- **Prompt:** Create a flat 2-D seamless-tiling overlay strip of money in motion inside a pipe bore for a routing puzzle: a horizontal band of warm gold `#FFC845` with lighter `#FFE38A` streaks and a deep `#B07B12` shadow line along the bottom, broken into an even repeating dash-and-gap rhythm so it animates as travelling fluid when scrolled. The strip must tile seamlessly left-to-right with no visible seam. Rounded dash caps, no outline, no casing. Transparent above and below the band.
- **Negative:** text, coins, currency symbols, banknotes, sparkles, lens flare, watermark, drop shadow, perspective, seam, photographic liquid

### fx-leak-spray — money escaping an open pipe end
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a flat 2-D game effect asset of income spraying out of an open pipe end for a routing puzzle: three tapering jets in danger red `#EF4444` fanning out to the right from a single origin point at the left edge, each jet breaking into two or three detached droplets that shrink and fade as they travel, with a faint `#FF8B8B` inner core along each jet. Sharp, graphic, blueprint-flat — a warning symbol that happens to look like a spray, not a rendered fluid sim. Origin point at the left-centre so it can be anchored to any pipe end and rotated. Transparent background.
- **Negative:** text, watermark, blood, gore, gold or yellow tones, photographic water, motion blur, lens flare, drop shadow, perspective, background plate

### hud-payday-clock — the countdown badge in the HUD
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a flat 2-D HUD icon of a payday countdown clock for a puzzle game: a circular dial with a 2.5 px orange `#FF8A3D` rim, a dark `#0D1A33` face, twelve tiny blueprint tick marks, and two blunt hands set to roughly five-to-twelve in white. Add a thin orange arc sweeping the top-right quadrant to suggest depletion. Crisp at 22 px, no numerals on the face, centred, transparent background.
- **Negative:** text, numerals, digits, watermark, gloss, skeuomorphic chrome, drop shadow, glow, emoji clock, perspective, background plate

### result-route-complete — win art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a flat 2-D blueprint illustration of a completed income route for a results screen: a compact orange salary valve on the left, a short elegant L-shaped run of dark-cased blue pipe crossing the frame, and three green funded reservoirs on the right all brimming, with warm gold `#FFC845` fluid visible along the whole bore and a few gold specks rising above the tanks. Every pipe end sealed with a machined cap — no open ends anywhere. Calm, orderly, resolved. Faint drafting construction lines behind at 5% opacity. Centred, transparent background.
- **Negative:** text, score numbers, watermark, confetti, trophy, coins, human characters, red or leaking elements, photographic texture, drop shadow, perspective

### result-route-drained — loss art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a flat 2-D blueprint illustration of a failed income route for a results screen: the same orange salary valve on the left feeding a short run of dark-cased blue pipe that terminates in **two open, uncapped ends** spraying red `#EF4444` jets and droplets down and away, while three reservoirs on the right sit empty with dimmed blue outlines and a broken hairline where a pipe should have reached them. Sombre and dim, gold present only as a few stray droplets on the floor. Faint drafting construction lines behind at 5% opacity. Centred, transparent background.
- **Negative:** text, score numbers, watermark, gore, skulls, sad faces, human characters, green or funded tanks, photographic texture, drop shadow, perspective

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
