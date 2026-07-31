# Smart Sorter — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Smart Sorter is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Smart Sorter's answer |
|---|---|
| Motif | Smart Sorter gameplay theme & visual style. |
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

### ss-bg-depot — full-screen gameplay background behind the conveyor
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of an empty night-shift parcel-sorting depot interior for a swipe-sorting arcade game, viewed from a straight top-down camera looking directly at the floor. Use a flat-shaded industrial vector style with crisp edges, no gradients finer than a two-stop ramp, and strong readability at small sizes. The floor is dark navy concrete (#0B1221) with faint poured-slab seams and a soft cool pool of lamp light down the vertical centre (#1E6BE0 at 18% opacity) fading to near-black (#060B16) at the four corners. Add stencilled steel-grey (#9AA7BD) floor markings: dashed lane lines running top to bottom, two small hazard-striped corner blocks in amber (#FFC845), and a faint circular scuff pattern. Leave the entire central vertical band completely clear and uncluttered — gameplay sprites sit there. Cool overhead lighting, no visible lamps, no people, no shelving, no parcels, no vehicles.
- **Negative:** text, lettering, numbers, watermark, photographic concrete texture, realistic photo, emoji, drop shadow, perspective vanishing point, isometric tilt, characters, forklifts, boxes, UI frame, border

### ss-belt-rail — the two vertical conveyor rails that frame the lane
- **Size:** 96×1024 px, tall 3:32 strip, transparent PNG, vertically tileable
- **Prompt:** Create a polished mobile-game asset of a single vertical brushed-steel conveyor guide rail for a top-down sorting game, drawn as a seamless vertically tileable strip. Flat industrial vector style: a chamfered steel bar in cool grey (#9AA7BD) with a lighter top bevel (#D3DBE6) and a dark under-shadow line (#2A3446), punctuated every 128 px by a small round rivet and a short amber (#FFC845) safety tick. Keep the silhouette a perfectly straight-sided rectangle so it tiles with no seam. Transparent background, no ground shadow. Front-on orthographic view, no perspective.
- **Negative:** text, watermark, rust, photographic metal texture, realistic photo, emoji, drop shadow, rounded ends, perspective, bolts sticking out of silhouette

### ss-belt-tread — the moving rubber belt surface between the rails
- **Size:** 256×256 px, transparent PNG, seamlessly tileable in both axes
- **Prompt:** Create a polished mobile-game asset of a black rubber conveyor-belt surface for a top-down sorting game, as a seamless tile. Flat vector style: near-black rubber (#101827) with evenly spaced horizontal cleat ridges in slightly lighter charcoal (#1E2A3E), each ridge catching a 1 px cool highlight (#3D4E6B) on its upper edge. Subtle worn-shine band down the centre. The tile must repeat perfectly with no visible seam on any edge. Top-down orthographic, transparent background outside the tile.
- **Negative:** text, watermark, realistic rubber photo, dirt splotches that break tiling, emoji, drop shadow, perspective, logos

### ss-card-protect — the Protect-family card that rides the belt (swipe LEFT)
- **Size:** 512×340 px, 3:2 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a crisp white courier parcel card with chamfered corners for a swipe-sorting arcade game, seen straight top-down. Flat industrial vector style with a 6 px Bajaj-blue (#003DA6) border, a cool white-to-pale-steel body (#FFFFFF to #DCE6F5), and a bold centred blue shield emblem with a check mark cut out of it. Add two short blue barcode-style rule lines to the right of the shield and a small blue chamfer notch on the left edge indicating its sort direction. Hard-edged, no soft glow, strong silhouette at 80 px wide. Transparent background.
- **Negative:** text, lettering, numbers, barcode digits, watermark, realistic cardboard photo, emoji, drop shadow, perspective, tape, address label, hand

### ss-card-grow — the Grow-family card that rides the belt (swipe RIGHT)
- **Size:** 512×340 px, 3:2 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a crisp white courier parcel card with chamfered corners for a swipe-sorting arcade game, seen straight top-down. Identical construction to its blue sibling but with a 6 px green (#28A745) border and a bold centred three-bar ascending column chart emblem in green with a bright mint (#4ADE80) tallest bar. Add two short green rule lines to the right of the chart and a small green chamfer notch on the right edge indicating its sort direction. Flat industrial vector style, hard edges, no glow, readable at 80 px wide. Transparent background.
- **Negative:** text, lettering, numbers, percentage signs, watermark, realistic cardboard photo, emoji, drop shadow, perspective, arrows, currency symbols

### ss-card-bin — the Bin-family card that rides the belt (swipe DOWN)
- **Size:** 512×340 px, 3:2 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a scuffed, slightly dented courier parcel card with a torn top-right corner for a swipe-sorting arcade game, seen straight top-down. Flat industrial vector style with a 6 px orange (#F26522) border, an off-white grubby body (#F3EDE6 to #D8CFC4), diagonal amber-and-charcoal hazard stripes along the bottom edge, and a bold centred orange warning triangle emblem containing an exclamation bar and dot. The card must read as "reject" at a glance versus the two clean cards. Hard edges, no glow, transparent background.
- **Negative:** text, lettering, numbers, watermark, realistic cardboard photo, emoji, drop shadow, perspective, blood, skull, biohazard symbol

### ss-shelf-protect — the left-edge Protect shelf tile the card lands on
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a square powder-coated steel shelf tile with a rounded-square 20 px radius and a raised lip for a top-down sorting game. Flat industrial vector style: deep Bajaj blue face (#003DA6) with a brighter blue top bevel (#1E6BE0), a 4 px crisp white inner border, four small corner bolt heads, and a large white shield-with-check emblem centred on the face. Add a thin cool halo ring just outside the tile in #1E6BE0 at 40% opacity to read as the "active" state. Straight top-down orthographic, transparent background.
- **Negative:** text, watermark, realistic metal photo, emoji, drop shadow, perspective, gradient mesh, glow bloom, extra icons

### ss-shelf-grow — the right-edge Grow shelf tile the card lands on
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a square powder-coated steel shelf tile with a rounded-square 20 px radius and a raised lip for a top-down sorting game. Same construction as its blue sibling but with a deep green face (#28A745), a mint top bevel (#4ADE80), a 4 px white inner border, four corner bolt heads, and a large white three-bar ascending column chart emblem centred on the face. Thin mint halo ring outside the tile at 40% opacity for the active state. Straight top-down orthographic, transparent background.
- **Negative:** text, watermark, realistic metal photo, emoji, drop shadow, perspective, gradient mesh, glow bloom, leaves, plants

### ss-bin-chute — the bottom reject chute the Bin cards are swiped into
- **Size:** 1024×320 px, wide 16:5 strip, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a wide reject chute mouth at the end of a conveyor for a top-down sorting game. Flat industrial vector style: a dark open rectangular slot (#060B16) framed by a heavy orange (#F26522) powder-coated bezel with a lighter orange top bevel (#FF8A3D), diagonal amber-and-charcoal hazard chevrons running along the full width of the bezel, and two small orange warning triangle stamps at the left and right ends. The slot interior fades to pure black at its centre so a sprite dropping in reads as swallowed. Straight top-down orthographic, transparent background outside the bezel.
- **Negative:** text, watermark, realistic metal photo, emoji, drop shadow, perspective, trash can, recycling symbol, flames

### ss-head-bracket — the dashed sorting-head zone marker over the belt
- **Size:** 512×288 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD overlay asset of a rectangular targeting bracket that marks the active sorting zone of a conveyor, for a top-down arcade game. Flat vector style: an amber (#FFC845) rounded rectangle outline drawn as a bold dashed stroke with four solid thicker corner elbows, plus two small inward-pointing amber caret arrows on the left and right mid-edges. Completely hollow centre — the sprite it frames must be fully visible through it. No fill, no glow bloom, transparent background.
- **Negative:** text, watermark, filled interior, realistic photo, emoji, drop shadow, glow bloom, crosshair circle, reticle dots

### ss-hud-combo — the combo-multiplier HUD badge
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a stacked-plates combo badge for an industrial sorting game. Flat vector style: three chamfered rectangular steel plates stacked with a slight vertical offset, the top plate amber (#FFC845), the middle plate mint (#4ADE80), the bottom plate steel grey (#9AA7BD), each with a crisp 3 px dark navy (#0B1221) outline. A small upward amber chevron sits above the stack. Compact silhouette that stays readable at 28 px. Straight-on orthographic, transparent background.
- **Negative:** text, lettering, numbers, multiplication sign, watermark, realistic photo, emoji, drop shadow, glow, flames, star burst

### ss-hud-strike — the mistakes-remaining HUD pip
- **Size:** 192×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD pip of a hexagonal warning stud for an industrial sorting game, in two states rendered as one asset side by side is NOT wanted — render only the lit state. Flat vector style: a small chamfered hexagon in red (#EF4444) with a darker red bevel (#B91C1C), a 3 px navy (#0B1221) outline, and a white diagonal slash cut through its centre. Industrial stud, not a heart, not a circle. Straight-on orthographic, transparent background, readable at 18 px.
- **Negative:** text, watermark, heart shape, circle, realistic photo, emoji, drop shadow, glow, blood, cracked glass

### ss-result-clipboard — the win-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of a depot supervisor's steel clipboard lying flat with a completed sorting manifest, for the victory screen of an industrial sorting game, viewed from a gentle top-down three-quarter angle. Flat industrial vector style: a steel-grey (#9AA7BD) clipboard with a chamfered blue (#003DA6) clip bar, a pale sheet with abstract green (#28A745) tick rows drawn as pure shapes and never as letters, and a large mint (#4ADE80) check mark stamped diagonally across the sheet. Three tiny chamfered parcel cards fan out behind the clipboard in blue, green and orange. Warm work-lamp key light from the upper left. Transparent background.
- **Negative:** text, lettering, handwriting, numbers, signatures, watermark, realistic photo, emoji, drop shadow, hands, pen, coffee cup, confetti

### ss-result-jam — the loss-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of a jammed conveyor belt with three chamfered parcel cards piled up crooked against a stalled steel rail, for the game-over screen of an industrial sorting game, viewed from a gentle top-down three-quarter angle. Flat industrial vector style: black rubber belt (#101827), steel rails (#9AA7BD), one blue, one green and one scuffed orange card tipped at different angles, a small amber (#FFC845) rotating-beacon shape above the rail casting a flat amber wedge, and three short motion-stop dashes. Mood is "line stopped", not violent. Transparent background.
- **Negative:** text, lettering, watermark, realistic photo, emoji, drop shadow, fire, smoke, explosion, blood, people, sparks

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
