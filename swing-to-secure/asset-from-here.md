# Swing To Secure — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Swing To Secure is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Swing To Secure's answer |
|---|---|
| Motif | Swing To Secure gameplay theme & visual style. |
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

### sts-bg-far-skyline — far parallax band, tiled behind the play field

- **Size:** 760 × 640 px, seamlessly horizontally tileable, PNG with alpha above the roofline
- **Prompt:** Create a polished mobile-game background strip of a distant city skyline at dusk for a side-scrolling momentum game. Render eight to ten slim tower silhouettes of varied height standing on a shared baseline, each tower's roof cut with a symmetrical 30-degree chevron bevel on both top corners so the skyline reads as a row of angled crowns rather than flat blocks; scatter a few thin aerial masts. Fill the towers with a vertical gradient from desaturated steel blue `#1B4079` at the crown to deep navy `#0A1A3C` at the base, and trace a thin warm rim of amber `#FFB020` at 30% opacity along each roofline and left edge, as if the setting sun sits just behind the frame. Sprinkle small sparse lit windows in warm `#FFC154` at low opacity, no more than a quarter of the available grid. Flat vector silhouette style with soft dimensional gradients, strong readability at small sizes, no interior architectural detail. Straight-on elevation view, no perspective convergence. The left and right edges must match exactly for seamless tiling, with no tower straddling either edge. Transparent above the roofline.
- **Negative:** text, watermark, photographic texture, people, cars, streets, ground plane, sky gradient baked in, clouds, birds, drop shadow, perspective vanishing lines, tower crossing the tile edge, rounded roofs, domes

---

### sts-bg-near-skyline — near parallax band, foreground silhouette

- **Size:** 760 × 640 px, seamlessly horizontally tileable, PNG with alpha above the roofline
- **Prompt:** Create a polished mobile-game foreground strip of near-field city towers at dusk for a side-scrolling momentum game, matching a companion distant skyline but heavier and darker. Render five to six wide, blocky towers with the same symmetrical 30-degree chevron roof bevel, standing taller in frame and overlapping slightly. Fill with a vertical gradient from near-black navy `#08132E` down to `#01040E`, almost pure silhouette, and trace a crisp warm rim of orange `#F26522` at 42% opacity along every roofline and left-facing edge so the towers separate from the band behind them. Add only a handful of dim warm window lights. Flat vector silhouette style, heavy and grounded, maximum contrast against a lighter background. Straight-on elevation view. The left and right edges must match exactly for seamless tiling, with no tower straddling either edge. Transparent above the roofline.
- **Negative:** text, watermark, photographic texture, people, signage, antennas with logos, sky baked in, drop shadow, perspective vanishing lines, tower crossing the tile edge, light interior detail, rounded roofs

---

### sts-bg-sun — low sun disc and horizon bloom, drawn once behind both skyline bands

- **Size:** 512 × 512 px, transparent PNG, glow centred with generous falloff padding
- **Prompt:** Create a polished mobile-game asset of a low setting sun for a dusk side-scrolling game. Show a small, hard-edged hexagonal core in pale cream `#FFECBE` at the exact centre, surrounded by a smooth circular radial bloom that fades from amber `#FFB020` at 45% opacity through orange `#F26522` at 20% to fully transparent at the outer edge. The falloff must be perfectly even and reach zero well before the canvas edge so the asset can be composited over any background without a visible boundary. No lens flare streaks, no starburst spikes, no chromatic fringing. Clean vector gradient style with a single light source. Straight-on view, centred. Transparent background.
- **Negative:** text, watermark, lens flare streaks, starburst spikes, anamorphic lines, photographic bokeh, clouds, horizon line, landscape, hard outer edge, banding, drop shadow

---

### sts-guardian-swing — the player character, hanging pose on the tether

- **Size:** 256 × 256 px, transparent PNG, pivot at the character's gripping hand (top-centre)
- **Prompt:** Create a polished mobile-game character asset of a compact futuristic courier hanging one-handed from an unseen overhead line for a rope-swing momentum game. Build the body from hexagonal plates: a hexagonal torso shell in a vertical gradient from bright blue `#5FA0FF` down to deep brand navy `#00246A`, a hexagonal helmet with a single horizontal glowing visor slot in warm amber `#FFE0A3`, and a raised gripping arm reaching straight up out of the top of the frame. Give the courier a short angular cape cut into two hard chevron points in brand orange `#F26522` with a darker `#8C3208` underside, streaming back and to the left as if mid-swing. Stamp a small amber chevron insignia on the chest. Light from the lower right with a warm rim, cold blue fill from above. Clean stylised vector-3D game art, bold silhouette, strong readability at 32 px. Side-on view, facing right. Transparent background.
- **Negative:** text, watermark, realistic human face, visible eyes or mouth, cloth folds, fabric texture, photographic render, emoji, drop shadow, ground shadow, weapons, logos, extra limbs, front-facing pose

---

### sts-guardian-fly — the player character, airborne between beacons

- **Size:** 256 × 256 px, transparent PNG, pivot at body centre
- **Prompt:** Create a polished mobile-game character asset of the same compact futuristic courier in a airborne dive pose for a rope-swing momentum game, matching a companion hanging pose exactly in build and palette. Hexagonal torso shell gradient bright blue `#5FA0FF` to deep navy `#00246A`, hexagonal helmet with a horizontal amber `#FFE0A3` visor slot, amber chevron chest insignia. Both arms are now swept back along the body and the two-point chevron cape in orange `#F26522` streams hard behind in a straight taut line, showing speed. Angle the whole body about 20 degrees nose-down as if leaping forward and to the right. Light from the lower right with a warm rim, cold blue fill from above. Clean stylised vector-3D game art, bold silhouette, strong readability at 32 px. Side-on view, facing right. Transparent background.
- **Negative:** text, watermark, realistic human face, visible eyes or mouth, motion-blur streaks, speed lines, cloth folds, photographic render, emoji, drop shadow, ground shadow, upright pose, extra limbs

---

### sts-beacon-idle — protection beacon, the anchor the player grabs

- **Size:** 192 × 192 px, transparent PNG, pivot at the exact centre of the hex head
- **Prompt:** Create a polished mobile-game asset of a protection beacon for a rope-swing traversal game: a hexagonal steel head slung under a thin vertical mast, flanked left and right by outward-pointing chevron catch-wings. Fill the hex head with a vertical gradient from pale sky blue `#9CC6FF` at the top-left faces to near-black navy `#02163B` at the bottom-right, with a crisp white rim light on the three upper-left faces only. Set a small solid hexagon core in orange `#FF9152` at the dead centre of the head — this is the grab point and must be the visual focus. Draw the two chevron wings as thick rounded strokes in pale steel blue, one on each side, pointing away from the head. Clean stylised vector-3D game art with soft dimensional shading, strong readability at 34 px. Straight-on front view, perfectly symmetrical left to right. Transparent background.
- **Negative:** text, watermark, rope, cable hanging below, hook shape, photographic metal texture, rivets, bolts, rust, drop shadow, ground shadow, emoji, asymmetry, circular head, square head

---

### sts-beacon-lit — protection beacon, highlighted when it is in grab range

- **Size:** 192 × 192 px, transparent PNG, pivot identical to `sts-beacon-idle`
- **Prompt:** Create a polished mobile-game asset of an energised protection beacon for a rope-swing traversal game, identical in geometry to a companion idle beacon but charged and calling to be grabbed. Same hexagonal steel head under a thin mast with chevron catch-wings, same gradient from pale sky blue `#9CC6FF` to near-black navy `#02163B`. Now recolour the chevron wings and the central core hexagon to bright sunset amber `#FFB020` and `#FFE0A3`, add a warm amber glow bleeding outward from the head, and draw one concentric hexagonal halo ring in amber at 60% opacity floating just outside the head. The glow must stay tight to the object with a clean falloff. Clean stylised vector-3D game art, strong readability at 34 px. Straight-on front view, perfectly symmetrical. Transparent background.
- **Negative:** text, watermark, lens flare, starburst, sparks, particles, lightning, photographic metal texture, drop shadow, ground shadow, emoji, asymmetry, circular halo, oversized glow filling the frame

---

### sts-tether — the swing line between beacon and player

- **Size:** 64 × 512 px, transparent PNG, vertically tileable, designed to stretch along its length
- **Prompt:** Create a polished mobile-game asset of a taut energy tether line for a rope-swing game, drawn as a single vertical strip. Build it in two concentric layers: an outer soft glow sheath in amber `#FFB020` at 35% opacity about six pixels wide, and a crisp solid white core about two pixels wide running dead centre. Add three evenly spaced small round pulses of pale amber `#FFE0A3` travelling along the line, each a soft-edged dot brighter than the core. The strip must be uniform along its whole length so it can be stretched and tiled without seams, with rounded caps at both ends. Clean stylised vector glow art, no texture. Straight-on view. Transparent background.
- **Negative:** text, watermark, braided rope texture, fibre detail, chain links, knots, fraying, photographic cable, sag, curvature, drop shadow, colour variation along the length, hard outer edge on the glow

---

### sts-chip — premium chip, the common collectible along the flight arc

- **Size:** 128 × 128 px, transparent PNG, centred
- **Prompt:** Create a polished mobile-game collectible asset of a premium chip token for an insurance-themed traversal game: a thick hexagonal coin standing on edge, facing the camera. Fill the face with a vertical gradient from pale gold `#FFE0A3` at the top through sunset amber `#FFB020` to deep bronze `#7A4A05` at the bottom, with a bright white rim light on the three upper-left faces and a small soft specular highlight in the upper-left quadrant. Stamp a single bold upward-pointing chevron into the face in dark bronze `#7A4A05`, embossed so it reads as cut into the metal. Show a slight edge thickness on the right side to give the chip real depth. Clean stylised vector-3D game art with soft dimensional lighting, strong readability at 28 px. Straight-on front view. Transparent background.
- **Negative:** text, numbers, currency symbols, rupee sign, dollar sign, watermark, milled coin edge, circular coin, photographic metal, scratches, patina, drop shadow, ground shadow, emoji, stack of coins

---

### sts-cover-token — cover pickup, grants one hit of protection

- **Size:** 160 × 160 px, transparent PNG, centred
- **Prompt:** Create a polished mobile-game power-up asset of a protection cover token for an insurance-themed traversal game: a solid hexagon in a vertical gradient from light blue `#8CC4FF` through brand blue `#2C7BEF` to deep brand navy `#003DA6`, with a crisp white rim light on the three upper-left faces. Centre a bold white checkmark on the face, drawn with thick rounded stroke caps. Float one thin concentric hexagonal halo ring in pale blue `#8CC4FF` at 40% opacity just outside the solid hexagon, rotated about 15 degrees off-axis from the core so the two hexagons read as separate rings. Add a soft cool blue glow hugging the silhouette. Clean stylised vector-3D game art with soft dimensional lighting, strong readability at 34 px. Straight-on front view. Transparent background.
- **Negative:** text, watermark, heraldic shield shape, crest, banner, ribbon, photographic metal, drop shadow, ground shadow, emoji, sparkles, stars, circular ring, cross symbol, medical cross

---

### sts-risk-mine — the hazard the player must fly around

- **Size:** 160 × 160 px, transparent PNG, centred
- **Prompt:** Create a polished mobile-game hazard asset of a risk mine for an insurance-themed traversal game: a small crimson hexagonal core caged inside a ring of six outward-pointing chevron spikes. Fill the core with a radial gradient from pale pink `#FF9AA5` at the upper-left through hot crimson `#FF3B4E` to near-black maroon `#3F0610` at the rim, with a second smaller dark maroon hexagon inset at the very centre. Draw the six chevrons as thick rounded crimson strokes arranged evenly around the core, each pointing outward, forming a threatening cage with clear gaps between them. Add a tight crimson glow around the whole object. The silhouette must read instantly as dangerous and must not resemble a collectible. Clean stylised vector-3D game art, strong readability at 34 px. Straight-on front view, radially symmetrical. Transparent background.
- **Negative:** text, watermark, green colour, virus cell, bacteria, tentacles, organic blobs, cartoon face, eyes, teeth, skull, photographic texture, drop shadow, ground shadow, emoji, smooth round spikes, sea mine studs

---

### sts-vault-gate — the goal at 2000 m, and the win art on the Results screen

- **Size:** 512 × 512 px, transparent PNG, centred, bottom-weighted
- **Prompt:** Create a polished mobile-game asset of a monumental retirement vault gate for an insurance-themed traversal game: a giant hexagonal door standing on a low trapezoidal chevron plinth. Fill the door with a vertical gradient from pale gold `#FFE0A3` through sunset amber `#FFB020` to deep bronze `#7A4A05`, with a broad white rim light on the three upper-left faces. Inset a second recessed hexagon in near-black navy `#030A1A` outlined in pale gold, and inside that recess set two concentric hexagonal dial rings in amber, the outer one thicker than the inner, suggesting a lock mechanism mid-rotation. Cut the plinth from dark navy with a warm orange rim along its top edge. Backlight the whole gate with a warm amber halo as if the setting sun sits directly behind it. Clean stylised vector-3D game art, monumental and aspirational, strong readability at 120 px. Straight-on front elevation, perfectly symmetrical. Transparent background.
- **Negative:** text, lettering on the door, watermark, circular bank-vault wheel, spoke handle, combination dial numbers, rivets, photographic metal, marble, columns, arch, doorway with visible interior, drop shadow, ground shadow, emoji

---

### sts-hud-glyphs — the three HUD chip icons and the first-run tap nudge

- **Size:** 4-up sheet, each cell 64 × 64 px on a 256 × 64 px strip, transparent PNG
- **Prompt:** Create a polished mobile-game icon sheet of four flat UI glyphs in a single horizontal row for a dusk-themed traversal game, all sharing one stroke weight and one hexagonal design language. Cell one: a solid amber `#FFB020` hexagon with a dark embossed upward chevron inside it, representing collected value. Cell two: a pair of nested right-pointing chevrons in brand blue `#2C7BEF`, drawn as strokes with rounded caps, representing distance travelled. Cell three: a hexagon outline in white with two short clock hands inside it, representing time remaining. Cell four: a simple pointing-hand glyph in pale gold `#FFE0A3`, index finger up, drawn as a clean outline with rounded caps, representing tap-and-hold. Every glyph must be flat, unshaded, evenly weighted, centred in its cell with equal padding, and legible at 15 px. Straight-on view. Transparent background.
- **Negative:** text, labels, numbers, watermark, gradients, shading, drop shadow, glow, bevel, 3D perspective, photographic style, emoji, mismatched stroke weights, filled backgrounds, rounded-square badges behind the glyphs

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
