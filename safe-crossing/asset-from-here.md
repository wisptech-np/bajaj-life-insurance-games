# Safe Crossing — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Safe Crossing is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Safe Crossing's answer |
|---|---|
| Motif | Safe Crossing gameplay theme & visual style. |
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

### bg-junction-plate — full-screen board behind the canvas junction
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of a brushed dark-steel control plate seen
  perfectly straight down from above, for a top-down traffic-timing game. The steel is gunmetal
  `#0B1221` with a fine horizontal brush grain and slightly darker vignetting at the four corners.
  Etched deep into the plate and acid-filled with matte charcoal `#232B3B` is a four-way road
  cross: one vertical band and one horizontal band of equal width meeting in the centre, the
  overlap filled a half-step lighter in `#2E3849`. Lane centre lines are thin dashes of pale
  inlaid enamel; the square overlap is outlined by a raised polished-gold cloison ridge that
  catches light on its upper-left edge only. Four featureless city blocks sit in the quadrants as
  slightly proud raised steel pads with softly bevelled corners. Keep everything low contrast and
  free of clutter so bright enamel vehicle pins read on top. No perspective, no horizon, no
  vanishing point — orthographic top-down only.
- **Negative:** text, watermark, road signs, traffic lights, people, trees, cars, realistic
  photo, tyre marks, perspective, isometric skew, emoji, drop shadow, UI frame

### vehicle-scooter — the fast light vehicle (teal, brakeable)
- **Size:** 256×256 px, transparent PNG, drawn nose-toward-frame-right
- **Prompt:** Create a polished mobile-game asset of a small scooter rendered as a hard-enamel
  lapel pin, seen straight down from above, for a top-down traffic-timing game. Compact rounded
  rectangle silhouette, shortest and narrowest in its vehicle set. Enamel fields: body in teal
  `#3BC9B0` with a lighter `#8FF0DF` enamel stripe along the top edge, rider seat in dark
  `#0E5F55`, two tiny warm-white `#FFF3C4` headlamp chips at the nose and two dark unlit lamp
  chips at the tail. Every colour field is separated by a raised polished-gold cloison ridge about
  one-tenth the vehicle width. Glossy epoxy dome finish with one diagonal specular streak across
  the upper-left. Nose points to the right of frame. Transparent background, centred with padding.
- **Negative:** text, watermark, rider figure, wheels visible from the side, perspective, side
  view, three-quarter view, realistic photo, emoji, drop shadow, motion blur, background

### vehicle-family-car — the blue family car (the thing being protected)
- **Size:** 256×256 px, transparent PNG, drawn nose-toward-frame-right
- **Prompt:** Create a polished mobile-game asset of a family car rendered as a hard-enamel lapel
  pin, seen straight down from above, for a top-down traffic-timing game. Rounded-rectangle
  silhouette, mid-length, noticeably wider than a scooter pin. Enamel fields: body in brand blue
  `#1E6BE0`, a lighter `#7FB6FF` enamel band along the top edge, a smoked near-black `#0B1221`
  windscreen-and-roof panel occupying the middle third, two warm-white `#FFF3C4` headlamp chips at
  the nose and two unlit dark red lamp chips at the tail. Raised polished-gold cloison ridges
  separate every field, and a slightly heavier gold ridge outlines the whole pin. Glossy epoxy
  dome, one diagonal specular streak upper-left. Nose points to the right of frame. Transparent
  background, centred with padding.
- **Negative:** text, watermark, brand logos, licence plate, driver, side view, perspective,
  realistic photo, emoji, drop shadow, motion blur, background

### vehicle-school-van — the slow gold school van (brakeable, longest wait)
- **Size:** 256×256 px, transparent PNG, drawn nose-toward-frame-right
- **Prompt:** Create a polished mobile-game asset of a school van rendered as a hard-enamel lapel
  pin, seen straight down from above, for a top-down traffic-timing game. Long boxy silhouette
  with squarer corners than the car pin, reading as slow and heavy. Enamel fields: body in warm
  gold `#FFC845` with a pale `#FFE9A8` enamel band along the top edge, a smoked roof-hatch panel
  in `#8A6208`, two warm-white `#FFF3C4` headlamp chips at the nose. Three evenly spaced raised
  gold cloison ribs run across the roof like van luggage rails. Glossy epoxy dome, single diagonal
  specular streak upper-left. Nose points to the right of frame. Transparent background, centred
  with padding.
- **Negative:** text, watermark, school lettering, children, windows with faces, side view,
  perspective, realistic photo, emoji, drop shadow, background

### vehicle-risk-truck — the orange truck that ignores every tap
- **Size:** 256×256 px, transparent PNG, drawn nose-toward-frame-right
- **Prompt:** Create a polished mobile-game asset of a heavy goods truck rendered as a hard-enamel
  lapel pin, seen straight down from above, for a top-down traffic-timing game. The longest and
  widest pin in its set, with an aggressive squared-off nose and a visible cab-to-trailer seam
  across its body. Enamel fields: body in hazard orange `#F26522` with a lighter `#FFA96B` band
  along the top edge, cab roof panel in deep `#8C2E05`, and — this is the point of the pin — the
  two tail lamp chips are cold dead grey, never red, because this vehicle has no brakes. Two short
  hazard chevrons in `#FFE9A8` are inlaid on the roof. Raised polished-gold cloison ridges, heavier
  than on the other pins, outline everything. Glossy epoxy dome, one diagonal specular streak.
  Nose points to the right of frame. Transparent background, centred with padding.
- **Negative:** text, watermark, brake lights, red tail lights, company livery, driver, side view,
  perspective, realistic photo, emoji, drop shadow, background

### fx-hold-ring — the "this vehicle is held" indicator drawn under a braking vehicle
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a flat circular hold marker for a top-down
  traffic-timing game: a thin raised polished-gold ring seen straight down, with a second inner
  ring of glowing crimson `#EF4444` enamel that is broken into four equal arc segments with small
  gaps at the compass points. The centre of the ring is completely empty and transparent so a
  vehicle pin can sit inside it. Very slight outward `#EF4444` bloom just outside the gold ring.
  Perfectly flat and orthographic, no thickness, no bevel other than the ring's own highlight.
  Transparent background, centred with generous padding.
- **Negative:** text, watermark, arrows, hand icon, stop sign, filled centre, perspective, drop
  shadow, realistic photo, emoji, lens flare

### fx-near-miss — the gold spark awarded for a tight, clean pass
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a celebratory near-miss spark for a top-down
  traffic-timing game: a small burst of eight slim tapered gold shards radiating from an empty
  centre, each shard cut like a faceted gold cloison shard rather than a soft glow, alternating
  long and short. Colour runs from bright `#FFE38A` at the tips to `#FFC845` at the base. A single
  thin gold ring sits inside the burst at about half its radius. Flat orthographic top-down, no
  volume. Transparent background, centred with padding.
- **Negative:** text, watermark, numbers, plus signs, stars with faces, soft blurry glow, lens
  flare, realistic photo, emoji, drop shadow

### fx-crash — the collision burst
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a collision burst for a top-down
  traffic-timing game: a jagged asymmetric shatter of angular enamel shards in warning red
  `#EF4444` fading to `#FF8B8B` at the edges, with the cloison gold ridges visibly *broken* and
  splayed outward as if a pin had been struck and cracked. Include three or four small detached
  chips flung clear of the main burst. Flat orthographic top-down, no smoke, no fire. Transparent
  background, centred with padding.
- **Negative:** text, watermark, flames, smoke, explosion fireball, blood, wreckage debris,
  realistic photo, emoji, drop shadow, motion blur

### claim-cushion-shield — the single forgiveness token shown in the HUD
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a protection token rendered as a hard-enamel
  pin for a top-down traffic-timing game: a classic rounded shield outline in raised polished gold
  cloison, its interior filled with translucent brand blue enamel running `#1E6BE0` at the top to
  `#003DA6` at the point. Inlaid in the centre in bright white enamel is a single clean check mark
  with rounded ends. A soft blue `#1E6BE0` bloom sits just outside the gold rim. Front-facing flat
  view, glossy epoxy dome with one specular streak upper-left. Transparent background, centred
  with generous padding.
- **Negative:** text, watermark, numbers, heraldry, crest, cross, laurel, realistic photo, emoji,
  drop shadow, UI frame

### hud-icon-set — the three HUD glyphs (session timer, vehicles through, cushion remaining)
- **Size:** 256×256 px each, transparent PNG, delivered as a matching set of three
- **Prompt:** Create a set of three polished mobile-game HUD icons as matching hard-enamel pin
  glyphs for a top-down traffic-timing game — (1) a circular countdown clock face with a single
  swept sector, (2) a chequered finish-band glyph made of alternating enamel squares, (3) a small
  shield outline. All three share an identical raised polished-gold cloison outline of identical
  weight, identical optical size, and flat enamel fills: the clock sector in `#4ADE80`, the
  chequered band in white and `#1E6BE0`, the shield in `#003DA6`. Flat orthographic front view,
  each centred in its own square with even padding, glossy epoxy finish. Transparent background.
- **Negative:** text, numbers, watermark, gradients, mismatched outline weights, badge plates,
  perspective, realistic photo, emoji, drop shadow

### marking-box-junction — the yellow keep-clear box overlay on the intersection
- **Size:** 512×512 px, transparent PNG, square, tileable edges
- **Prompt:** Create a polished mobile-game overlay asset of a keep-clear junction box marking for
  a top-down traffic-timing game: a perfect square outline of inlaid warm yellow `#FFC845` enamel
  about four pixels thick, with a hatched grid of thinner yellow lines crossing its interior at a
  shallow angle, all sitting in a shallow etched channel so the enamel looks slightly recessed
  into steel. Interior between the hatching is fully transparent. Edges of the yellow are slightly
  worn and chipped, as if traffic has scuffed the enamel. Flat orthographic top-down. Transparent
  background, square, edges flush to the canvas so it can be scaled to any junction size.
- **Negative:** text, watermark, arrows, road words, asphalt fill, perspective, drop shadow,
  realistic photo, emoji, rounded corners

### result-win-tableau — win-state art on the results screen
- **Size:** 800×800 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the win screen of a top-down
  traffic-timing game: a neat orderly fan of hard-enamel vehicle pins — teal scooter, blue family
  car, gold school van — all pointing the same way and all clear of a gold cloison junction-box
  square behind them, with the orange risk-truck pin already gone off the far edge of the frame.
  Above the group floats the blue-and-gold protection shield pin, its white check mark lit, still
  intact and unused. Straight-down orthographic view, brushed-steel sheen, glossy epoxy highlights.
  Palette: `#1E6BE0`, `#3BC9B0`, `#FFC845`, `#003DA6`, polished gold. Centred, generous padding.
  Transparent background.
- **Negative:** text, watermark, trophy, medal, confetti, checkered flag, people, perspective,
  realistic photo, emoji, drop shadow, UI frame

### result-loss-tableau — loss-state art on the results screen
- **Size:** 800×800 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the loss screen of a top-down
  traffic-timing game: two hard-enamel vehicle pins locked nose-to-flank inside a gold cloison
  junction-box square, their gold cloison ridges visibly cracked and splayed at the contact point
  with red `#EF4444` enamel shards scattered around it. The blue protection shield pin lies flat
  and face-down beside them, its enamel dulled to grey, clearly spent. A third pin waits stalled at
  the edge of the frame with its hold ring still lit. Straight-down orthographic view, cold low-key
  sheen on the steel. Palette: `#EF4444`, `#F26522`, `#232B3B`, dull grey, tarnished gold. Centred,
  generous padding. Transparent background.
- **Negative:** text, watermark, flames, smoke, blood, casualties, ambulance, perspective,
  realistic photo, emoji, drop shadow, UI frame

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
