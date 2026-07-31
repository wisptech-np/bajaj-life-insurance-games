# Sip Stack — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Sip Stack is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Sip Stack's answer |
|---|---|
| Motif | Sip Stack gameplay theme & visual style. |
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

### bg-dusk-curtainwall — full-screen background behind the tower
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of a still dusk sky seen from inside a glass
  atrium, for a vertical tower-stacking game. Vertical gradient from `#081226` at the very bottom
  through `#0E2247` in the middle to `#0B1221` at the top, with a wide soft cool-blue bloom low in
  the frame as though a lit glass structure sits just below the crop. Faint out-of-focus vertical
  mullion lines of distant glass curtain wall run up both outer thirds, blurred almost to nothing,
  never crossing into the centre. A single warm `#F26522` horizon smear sits at the very bottom
  edge at low opacity. The centre column of the image, roughly 60% of the width, must stay almost
  featureless and dark so a bright stacked tower reads on top of it. No stars, no clouds with
  definition, no buildings with detail. Flat, calm, deep.
- **Negative:** text, watermark, buildings in focus, city skyline detail, windows, stars, moon,
  clouds, people, birds, realistic photo, lens flare, emoji, UI frame, busy centre

### slab-glass-base — the wide foundation-range SIP slab (hue ≈ 216, brand blue)
- **Size:** 512×256 px, 2:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single rectangular bar of thick cast optical
  glass seen from a very slight overhead angle so its polished top face and one short right-hand
  side face are both visible, for a vertical tower-stacking game. The glass is deep brand blue,
  hue 216 — `#1E6BE0` where light passes through it, deepening to `#003DA6` in the thick lower
  body, with the polished top face reading noticeably brighter and cooler. The two sawn ends are
  frosted and slightly cloudy; the long faces are clear with faint internal ripples and a couple of
  trapped bubbles. An internal light source makes the whole bar glow softly outward. A crisp
  hairline white specular line runs the full length of the top edge. Wrap the bar in a thin brushed
  pewter channel along its bottom edge only. Transparent background, centred, generous padding.
- **Negative:** text, watermark, engraving, logos, bevelled cartoon plastic look, opaque fill,
  rainbow refraction, realistic photo, emoji, drop shadow, background, reflections of a room

### slab-glass-mid — the mid-tower SIP slab (hue ≈ 175, blue-green transition)
- **Size:** 512×256 px, 2:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a rectangular bar of thick cast optical glass,
  identical in construction, angle, thickness and lighting to the base slab of the same set but
  narrower in width, for a vertical tower-stacking game. The glass sits at hue 175 — a cool
  teal-cyan, roughly `#1FA8B4` in the transmitting body deepening to `#0A5E72` in the thick
  section, with the polished top face brighter. Same frosted sawn ends, same faint internal
  ripples, same internal glow, same hairline white specular along the top edge, same thin brushed
  pewter channel on the bottom edge. It must read unmistakably as the *same object family* as the
  blue slab, one step up a colour ramp. Transparent background, centred, generous padding.
- **Negative:** text, watermark, different lighting angle, different thickness, engraving, opaque
  fill, rainbow refraction, realistic photo, emoji, drop shadow, background

### slab-glass-summit — the top-of-tower SIP slab (hue ≈ 130, brand green)
- **Size:** 512×256 px, 2:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a rectangular bar of thick cast optical glass,
  identical in construction, angle and lighting to the rest of its set but the narrowest of the
  three, for a vertical tower-stacking game. The glass sits at hue 130 — brand green, `#35B95C` in
  the transmitting body deepening to `#1C7E3D`, with the internal glow noticeably stronger than the
  lower slabs, as though the tower gets brighter as it rises. Same frosted sawn ends, faint internal
  ripples, hairline white specular top edge and thin brushed pewter bottom channel. Transparent
  background, centred, generous padding.
- **Negative:** text, watermark, different lighting angle, engraving, opaque fill, neon tube glow,
  rainbow refraction, realistic photo, emoji, drop shadow, background

### slab-milestone-band — the orange marker band applied to milestone layers
- **Size:** 512×128 px, transparent PNG, horizontally tileable
- **Prompt:** Create a polished mobile-game overlay asset of a narrow horizontal marker band for a
  glass tower-stacking game: a strip of warm amber cast glass in `#F26522` fading to `#FF8A3D` at
  its top edge, noticeably more opaque and saturated than the clear structural glass it will sit
  on, with two thin brushed pewter rails running along its top and bottom edges. The strip's short
  ends are cut square and left transparent so it can be tiled to any slab width. Internal glow
  warm, as if a filament runs along its length. Transparent background, band centred vertically
  with padding above and below.
- **Negative:** text, lettering, numbers, watermark, arrows, ribbon folds, cloth, realistic photo,
  emoji, drop shadow, rounded ends

### shard-shear — the overhang that shears off a mis-timed drop
- **Size:** 256×256 px, transparent PNG, three variants
- **Prompt:** Create a polished mobile-game asset of a small broken-off wedge of cast optical
  glass, for a glass tower-stacking game — the offcut when a bar is sheared. One face is a clean
  saw cut, the opposite face is a jagged conchoidal fracture with the characteristic ripple rings
  of broken glass, and the fracture edges are bright white where they catch light. Colour matches
  the tower's mid-ramp teal-blue, transmitting `#2E86E8` deepening to `#0A4CB8`. Its internal glow
  is *dying* — dimmer than a placed slab, as if the light has been cut off. Tumbling orientation,
  clearly not level. Transparent background, centred with padding. Generate three different
  fracture shapes.
- **Negative:** text, watermark, sparks, fire, blood, sharp weapon look, realistic photo, emoji,
  drop shadow, motion blur, background

### fx-perfect-flare — the flash awarded for a dead-centre drop
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game effect asset of a horizontal alignment flare for a
  glass tower-stacking game: a single wide, very thin lens of white-hot light stretched left to
  right, brightest and thinnest at its centre line and feathering to nothing at both ends, tinted
  pale mint `#7CF5A0` in its outer falloff. Two short vertical registration ticks — one above, one
  below the centre — mark perfect alignment. A ring of tiny glass motes drifts outward from the
  centre. The effect must read as *light passing cleanly through glass*, not as an explosion.
  Transparent background, centred with generous horizontal padding.
- **Negative:** text, watermark, stars, sparkles with faces, explosion, fireball, lens flare
  ghosting artefacts, realistic photo, emoji, drop shadow, background

### coin-rupee-glass — the ₹ token used on the home mark and score pops
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a thick disc of warm amber cast glass, seen
  face-on, for a glass tower-stacking game. The disc is `#FFC845` transmitting to a deeper honey
  at its rim, with a chamfered polished edge and a frosted band around its circumference. Sunk into
  the face — moulded, not printed — is an Indian rupee symbol as a recessed relief, its hollow
  catching a slightly cooler light than the surrounding glass. A thin brushed pewter ring rims the
  disc. Internal warm glow. Transparent background, centred with generous padding.
- **Negative:** text, watermark, other currency symbols, coin milling, mint marks, portraits,
  realistic photo, metal gold coin, emoji, drop shadow, background

### base-plinth — the dark foundation the tower is built on
- **Size:** 768×256 px, 3:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a low, wide, matte foundation plinth for a
  glass tower-stacking game: a slab of dark honed basalt in `#0B1221` with a barely-visible stone
  grain, its top surface perfectly flat and its front edge chamfered. Inset into the top surface is
  a shallow brushed pewter register channel running its full width, the seat the first glass bar
  drops into. Utterly matte — it is the one object in this game that does not glow and does not
  transmit light. Very slight cool rim light along the top chamfer. Seen from the same slight
  overhead angle as the glass slabs. Transparent background, centred with padding.
- **Negative:** text, watermark, glass, glow, gloss, engraving, bricks, concrete texture, realistic
  photo, emoji, drop shadow, background

### summit-lantern — the Retirement Corpus marker at layer 30
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a glass lantern crown that caps a tower, for a
  glass tower-stacking game: a squat faceted dome of clear cast glass held in a slim brushed pewter
  frame of eight ribs meeting at a small finial, with an intense warm-white core light inside
  throwing a soft green `#28A745` halo through the glass and a warm `#FFC845` glint off the pewter
  ribs. It should read as the destination of a climb — settled, luminous, finished. Seen from the
  same slight overhead angle as the slabs. Transparent background, centred with generous padding.
- **Negative:** text, watermark, flame, candle, fire, crown jewels, trophy, flag, realistic photo,
  emoji, drop shadow, background, lens flare

### hud-icon-set — the three HUD glyphs (layers placed, perfect streak, personal best)
- **Size:** 256×256 px each, transparent PNG, delivered as a matching set of three
- **Prompt:** Create a set of three polished mobile-game HUD icons for a glass tower-stacking game,
  each cut from the same thin sheet of frosted cast glass and rimmed with an identical hairline
  brushed pewter edge — (1) three stacked horizontal bars of decreasing width, (2) a vertical
  centre line flanked by two short alignment ticks, (3) a simple upward chevron over a flat base
  line. All three share identical sheet thickness, identical rim weight, identical optical size and
  the same soft internal glow: icon one glowing `#1E6BE0`, icon two `#7CF5A0`, icon three `#FFC845`.
  Flat front-on view, each centred in its own square with even padding. Transparent background.
- **Negative:** text, numbers, watermark, mismatched rim weights, badge plates, gradients outside
  the glass, perspective, realistic photo, emoji, drop shadow

### result-win-tableau — win-state art on the results screen
- **Size:** 800×1200 px, 2:3 portrait, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of a completed glass tower for a
  tower-stacking game: a tall slender stack of cast-glass bars narrowing as it rises, its colour
  climbing a clean ramp from deep brand blue `#003DA6` at the base through teal to bright brand
  green `#28A745` at the top, every seam a thin brushed pewter channel, the whole structure lit from
  within so it glows against nothing. A glass lantern crown caps the summit with a warm core light.
  Three or four amber glass rupee discs hang suspended in the air beside the tower, catching its
  glow. Perfectly vertical, no lean, no missing layers, no cracks. Transparent background, centred,
  generous padding at the top for the crown's halo.
- **Negative:** text, watermark, trophy, medal, confetti, fireworks, people, city, realistic photo,
  emoji, drop shadow, UI frame, leaning tower, broken glass

### result-loss-tableau — loss-state art on the results screen
- **Size:** 800×1200 px, 2:3 portrait, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of an abandoned glass tower for a
  tower-stacking game: a short stack of cast-glass bars that has narrowed far too fast, its top
  layer barely a sliver and dangerously off-centre, sitting on a matte basalt plinth. The internal
  light is nearly out — the glass reads cold, grey-blue and only faintly transmitting, hue held
  near 216 with none of the green ramp reached. Sheared offcut wedges lie scattered around the
  plinth, their fracture faces catching the last of the light. Two pewter seam channels are visibly
  empty where layers should have been. Sombre, quiet, unlit. Transparent background, centred,
  generous padding.
- **Negative:** text, watermark, skulls, explosion, fire, blood, people, rubble, realistic photo,
  emoji, drop shadow, UI frame, bright colours, green glass

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
