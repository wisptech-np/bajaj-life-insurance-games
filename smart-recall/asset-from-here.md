# Smart Recall — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Smart Recall is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Smart Recall's answer |
|---|---|
| Motif | Smart Recall gameplay theme & visual style. |
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

### bg-console-panel — full-screen background the nine buttons sit on
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of a mid-century control console panel seen
  straight on, for a nine-button sequence-memory game. A warm ivory phenolic faceplate in `#E8E2D4`
  occupies the centre of the frame, its surface finely stippled and faintly yellowed with age,
  mounted onto a deep navy chassis in `#0A1E42` darkening to `#061229` at the edges. A shallow
  recessed square well is milled into the centre of the faceplate to receive a three-by-three
  button array — the well itself empty. Four slotted screw heads sit at the faceplate corners,
  their slots at slightly different angles. Very faint ring-wear haloes are visible inside the
  well where nine caps have been pressed thousands of times. A soft warm overhead light falls from
  the upper left. Absolutely no buttons, lamps, letters or markings — the panel is bare.
- **Negative:** text, lettering, labels, numbers, watermark, buttons, lamps, LEDs, screens, wires,
  logos, realistic photo, perspective, emoji, heavy drop shadow, cool blue lighting

### button-cap-resting — one unlit bakelite pushbutton, the face-up resting state
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a square bakelite pushbutton with generously
  rounded corners, seen straight on from directly above, for a nine-button sequence-memory game.
  The moulded bakelite body is deep near-black `#1B2233` with the slightly waxy sheen bakelite has,
  and it is set in a thin ivory `#E8E2D4` collar. On top sits a square frosted acrylic legend lens,
  faintly milky, showing a soft internal diffusion but no light behind it — the lamp is off, so the
  lens reads dim, cool and inert. A hairline shadow gathers where the cap meets its collar. Leave
  the lens face completely blank so a legend glyph can be composited into it. Orthographic front
  view, centred with padding. Transparent background.
- **Negative:** text, symbols, watermark, glow, illumination, LED, screen, pixels, reflections of a
  room, perspective, realistic photo, emoji, drop shadow, bevelled plastic toy look

### button-cap-lit — the same pushbutton with its incandescent lamp on
- **Size:** 512×512 px, transparent PNG, deliver in each of the nine goal hues
- **Prompt:** Create a polished mobile-game asset of the same square bakelite pushbutton, identical
  in body, collar, corner radius and camera angle to its unlit twin, but with its incandescent lamp
  switched on behind the frosted acrylic legend lens, for a nine-button sequence-memory game. The
  lens now glows warmly and *unevenly*: a brighter hot-spot slightly off-centre where the filament
  sits, falling off toward the lens corners, with the frosting scattering the light into a soft
  bloom that spills a little past the cap edge onto the collar. Generate nine versions, one per
  goal hue — `#FF4D6D`, `#2E7BE8`, `#8B5CF6`, `#E3B23C`, `#17C3D4`, `#2FB162`, `#B7DD3F`, `#EC5FA8`
  and `#F26922` — every other property held identical across all nine. Leave the lens face blank
  for a glyph. Orthographic front view, centred with padding. Transparent background.
- **Negative:** text, symbols, watermark, LED, RGB, neon tube, pixel grid, screen, uniform flat
  fill, cold white light, perspective, realistic photo, emoji, drop shadow

### legend-glyphs-set-a — five goal legends (health, home, education, retirement, travel)
- **Size:** 256×256 px each, transparent PNG, delivered as a matched set of five
- **Prompt:** Create a set of five polished mobile-game legend symbols to be back-lit inside frosted
  acrylic button caps, for a nine-button sequence-memory game — (1) a heart with a small ECG pulse
  line across it, (2) a simple gabled house with a door, (3) a mortarboard graduation cap with a
  tassel, (4) a rising sun with eight rays over a flat horizon line, (5) a paper-dart aeroplane
  banking. Each is a bold solid silhouette with a single interior cut-out, drawn the way a 1960s
  legend plate is *masked* — opaque mask, clean cut, no strokes of varying weight, no outlines, no
  shading, no gradient. All five share one optical weight and one optical size so the set reads as
  one instrument. Render each as a flat white silhouette on transparent so it can be tinted per
  goal hue. Orthographic front view, centred in its own square with even padding.
- **Negative:** text, letters, numbers, watermark, outlines, strokes, shading, gradients, 3D,
  perspective, mismatched weights, realistic photo, emoji, drop shadow, decorative flourishes

### legend-glyphs-set-b — four goal legends (family, savings, wedding, emergency)
- **Size:** 256×256 px each, transparent PNG, delivered as a matched set of four
- **Prompt:** Create a set of four polished mobile-game legend symbols to be back-lit inside frosted
  acrylic button caps, for a nine-button sequence-memory game — (1) three simple standing figures,
  two tall and one short, shoulder to shoulder, (2) a stack of three coin ellipses with a small
  notch cut in the top one, (3) two interlocking rings with a small triangular gem above the left
  one, (4) a shield with a lightning bolt cut out of it. Mask-cut solid silhouettes in exactly the
  same idiom, weight and optical size as legend set A of the same instrument — opaque mask, clean
  cut, no outlines, no shading, no gradient. Render each as a flat white silhouette on transparent
  so it can be tinted per goal hue. Orthographic front view, centred in its own square with even
  padding.
- **Negative:** text, letters, numbers, watermark, outlines, strokes, shading, gradients, 3D, faces
  with features, perspective, mismatched weights, realistic photo, emoji, drop shadow

### button-cap-risk — the red detour step the player must never repeat
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of the same square bakelite pushbutton lit as a
  fault annunciator, for a nine-button sequence-memory game. The frosted acrylic lens burns a hard
  warning red — `#FF8B8B` at the filament hot-spot falling to `#EF4444` and `#7F1D1D` toward the
  corners — noticeably harsher and higher-contrast than any of the nine goal colours, the way a
  fault lamp is deliberately unpleasant next to status lamps. Masked into the lens is a bold circle
  with a single diagonal bar through it, the universal do-not-press mark. A faint red bloom spills
  onto the ivory collar. Same body, collar, corner radius and camera angle as the rest of the
  button set. Orthographic front view, centred with padding. Transparent background.
- **Negative:** text, letters, numbers, watermark, skull, hazard stripes, exclamation mark,
  flames, LED, pixel grid, perspective, realistic photo, emoji, drop shadow

### fx-lamp-bloom — the halo a lit button throws onto the panel around it
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game effect asset of an incandescent lamp bloom for a
  console-panel memory game: a soft square-cornered halo of warm light, brightest just outside where
  a button cap's edge would be and feathering to nothing about one cap-width out, slightly warmer
  and yellower than pure white as incandescent light always is. The very centre is fully
  transparent so a lit cap sits inside it. Include a barely-perceptible horizontal filament flare
  and nothing else. Soft, analogue, slightly diffuse — never a crisp digital glow ring.
  Orthographic front view, centred with generous padding. Transparent background.
- **Negative:** text, watermark, star flare, six-point sparkle, lens flare ghosts, hard ring,
  neon, RGB colour, pixels, realistic photo, emoji, drop shadow

### fx-slip-buzz — the feedback for tapping the wrong button
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game effect asset for a rejected keypress on a console-panel
  memory game: a doubled, slightly offset red outline of a square button cap, as though the cap
  physically jolted sideways and the eye caught both positions — the two outlines about six pixels
  apart, in `#EF4444` and `#FF8B8B`, with three short horizontal jitter ticks flying off each side.
  A dull red wash sits between the two outlines. It must read as a *mechanical* buzz and reject,
  not as an explosion or a digital glitch. Orthographic front view, centred with padding.
  Transparent background.
- **Negative:** text, watermark, explosion, fire, sparks, digital glitch blocks, scanlines, RGB
  split, broken glass, realistic photo, emoji, drop shadow

### plate-round-strip — the round-progress lamp strip along the top of the console
- **Size:** 1024×160 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a horizontal progress lamp strip from a
  mid-century console, for a nine-button sequence-memory game: a long ivory `#E8E2D4` phenolic bar
  with a row of small round recessed lamp bezels set evenly along it, each bezel a shallow brass-free
  ivory ring holding a tiny frosted lens. The leftmost few lenses glow warm green `#2FB162`, the
  next is lit warm amber `#E3B23C`, and the remainder sit dark and inert. Two slotted screw heads
  anchor the strip at its ends. Gentle age patina, soft overhead key light from the upper left.
  Orthographic front view. Transparent background, strip centred with padding above and below.
- **Negative:** text, numbers, tick labels, watermark, LEDs, digital segments, screens, neon,
  perspective, realistic photo, emoji, drop shadow

### hud-icon-set — the three HUD glyphs (round, slips remaining, session timer)
- **Size:** 256×256 px each, transparent PNG, delivered as a matching set of three
- **Prompt:** Create a set of three polished mobile-game HUD icons in the idiom of engraved console
  legend plates, for a nine-button sequence-memory game — (1) three small squares in a row with the
  first two filled, (2) a shield outline with a single notch missing from its rim, (3) a circular
  dial face with one swept sector. Each is engraved into a small ivory `#E8E2D4` phenolic plate:
  the groove is cut, filled with dark ink, and catches a hairline of light along its upper edge.
  All three share identical plate size, identical groove width and identical engraving depth; the
  ink fills are `#2E7BE8`, `#EF4444` and `#E3B23C` respectively. Orthographic front view, each
  centred in its own square with even padding. Transparent background.
- **Negative:** text, numbers, letters, watermark, LEDs, gradients, glow, badge plates, mismatched
  groove widths, perspective, realistic photo, emoji, drop shadow

### result-win-tableau — win-state art on the results screen
- **Size:** 800×800 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the win screen of a console-panel
  memory game: the full three-by-three array of bakelite pushbuttons on its ivory phenolic
  faceplate, every one of the nine caps lit at once in its own goal hue — `#FF4D6D`, `#2E7BE8`,
  `#8B5CF6`, `#E3B23C`, `#17C3D4`, `#2FB162`, `#B7DD3F`, `#EC5FA8`, `#F26922` — each with the warm
  uneven incandescent hot-spot and a soft bloom onto the collar, and not one red fault lamp anywhere
  on the panel. The round-progress strip above is lit green end to end. Warm, complete, quietly
  triumphant. Orthographic front view, centred with generous padding. Transparent background.
- **Negative:** text, numbers, letters, watermark, trophy, medal, confetti, fireworks, faces, LEDs,
  screens, perspective, realistic photo, emoji, drop shadow, UI frame, any red lamp

### result-loss-tableau — loss-state art on the results screen
- **Size:** 800×800 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the loss screen of a console-panel
  memory game: the same three-by-three array of bakelite pushbuttons, but with every goal lamp dark
  and inert behind its frosted lens except two, which burn hard fault red `#EF4444` with the
  do-not-press bar masked into them. The ivory faceplate is lit only by that cold red spill, its age
  patina and ring-wear now the most visible thing on it. The round-progress strip above is dark
  except one amber lamp stalled partway along. One cap sits very slightly proud of the panel, as if
  pressed and never released. Sombre, stalled, mechanical. Orthographic front view, centred with
  generous padding. Transparent background.
- **Negative:** text, numbers, letters, watermark, skulls, smoke, fire, sparks, broken glass,
  wiring, faces, LEDs, screens, perspective, realistic photo, emoji, drop shadow, UI frame

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
