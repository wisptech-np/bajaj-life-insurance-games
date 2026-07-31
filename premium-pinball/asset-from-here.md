# Premium Pinball — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Premium Pinball is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Premium Pinball's answer |
|---|---|
| Motif | Premium Pinball gameplay theme & visual style. |
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

### pp-playfield-bed — full-screen canvas background behind the whole table
- **Size:** 800×1280 px, 5:8 portrait, opaque JPG/PNG
- **Prompt:** Create a polished mobile-game background of an empty lacquered pinball playfield bed
  photographed from a steep 3/4 top-down angle, for an arcade physics game. Show varnished plywood
  stained deep navy `#0A1E42` fading to near-black `#061229` at the bottom, with a faint airbrushed
  radial glow of cobalt `#003DA6` in the upper third where the backglass neon spills onto the wood.
  Include authentic playfield texture: fine lacquer sheen, a few hairline ball-swirl scratches, two
  countersunk brass post holes, and a barely visible screen-printed guilloche pattern in 8% white.
  Keep the centre and lower thirds clean and uncluttered so gameplay sprites read on top. Single
  warm overhead cabinet lamp from above, soft falloff to the corners, no vignette hotspots. No
  bumpers, no flippers, no ball, no rails, no lettering anywhere on the wood.
- **Negative:** text, letters, numbers, logos, bumpers, flippers, ball, chrome rails, people,
  watermark, cartoon style, heavy vignette, busy pattern

### pp-ball-steel — the player's ball, the single most-seen sprite
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single 28 mm chrome pinball ball for an
  arcade physics game. Render it as real polished stainless steel: a mirror-bright upper-left
  specular hotspot in white `#FFFFFF`, a cool `#E8F1FF` body, a `#5E7FA8` terminator on the lower
  right, and a warm `#FFC845` rim-light kick along the bottom edge as if lit by an orange playfield
  insert below it. Add faint curved reflections of navy playfield wood across the equator and three
  or four microscopic play scuffs. Perfectly circular silhouette, centred with 12% padding.
  Transparent background.
- **Negative:** text, watermark, cast shadow, motion trail, sparkles, glass marble look, coloured
  ball, cartoon shading, outline stroke

### pp-bumper-education — blue goal bumper, left of the cluster (`GOALS[0]`)
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a pinball pop-bumper cap moulded in
  translucent cobalt plastic `#1E6BE0`, viewed from a steep 3/4 top-down angle, for an arcade
  physics game. Show a real bumper: a domed circular cap with a raised concentric ring, a lit
  incandescent lamp glowing `#7FB6FF` through the plastic from underneath, a chrome-plated metal
  skirt at the base, and a black rubber ring around the collar. Give the plastic genuine
  injection-moulded depth — internal light scatter, a bright crescent highlight upper-left, thin
  parting-line seam. Composition centred with padding, transparent background.
- **Negative:** text, letters, numbers, watermark, flat vector, glowing halo bloom outside the cap,
  emoji, cast shadow, gemstone facets

### pp-bumper-home — orange goal bumper, top-centre of the cluster (`GOALS[1]`)
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a pinball pop-bumper cap moulded in
  translucent orange plastic `#F26522`, viewed from a steep 3/4 top-down angle, for an arcade
  physics game. Identical hardware family to the cobalt bumper — domed cap, raised concentric ring,
  chrome skirt, black rubber collar ring — but this is the largest cap of the three and its
  under-lamp burns hotter, blooming `#FFB37A` through the plastic with a small white-hot core at
  the filament. Add fine radial mould texture and one shallow ball-strike scuff on the crown.
  Centred with padding, transparent background.
- **Negative:** text, letters, numbers, watermark, flat vector, cartoon outline, emoji, cast shadow,
  fire or flame effects

### pp-bumper-retirement — green goal bumper, right of the cluster (`GOALS[2]`)
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a pinball pop-bumper cap moulded in
  translucent emerald plastic `#28A745`, viewed from a steep 3/4 top-down angle, for an arcade
  physics game. Same hardware family as the cobalt and orange caps — domed cap, raised concentric
  ring, chrome skirt, black rubber collar — with its lamp lit a cool `#7BE8A0` and the plastic
  slightly more frosted, so the glow reads as diffuse rather than point-source. Include a hairline
  crazing in the moulding near the rim to sell it as a used part. Centred with padding, transparent
  background.
- **Negative:** text, letters, numbers, watermark, flat vector, neon outline, emoji, cast shadow,
  leaf or plant motifs

### pp-flipper-pair — the two orange flippers the player taps to swing
- **Size:** 512×256 px, transparent PNG, left and right mirrored in one sheet
- **Prompt:** Create a polished mobile-game asset of a matched pair of pinball flipper bats for an
  arcade physics game, seen from a steep 3/4 top-down angle. Each bat is moulded orange plastic
  `#F26522` fading to `#FF8A3D` along the top face, with a black rubber sleeve wrapped around the
  striking edge, a chrome pivot bushing with a visible hex screw head at the fat end, and a tapered
  tip. Show honest wear: the rubber is slightly polished where the ball hits and there are two pale
  ball-impact marks on the plastic. Left bat points down-right, right bat mirrors it. Centred with
  padding, transparent background.
- **Negative:** text, watermark, motion blur, arrows, glowing energy, cartoon outline, emoji, cast
  shadow, hands or fingers

### pp-plunger-assembly — the spring plunger the player holds to charge and releases to launch
- **Size:** 256×512 px, transparent PNG, vertical
- **Prompt:** Create a polished mobile-game asset of a pinball spring plunger assembly for an
  arcade physics game, photographed straight down the shooter lane at a steep 3/4 angle. Show a
  chrome-plated steel rod, a coiled compression spring in blued steel, a moulded orange plastic
  knob `#F26522` with a knurled grip band, a chrome mounting flange with two screws, and a short
  section of the shooter-lane channel in navy lacquered wood either side. Render the spring
  partially compressed, mid-charge, so the pose reads as stored energy. Centred with padding,
  transparent background.
- **Negative:** text, watermark, numbers, power meter, arrows, glow effects, cartoon outline, emoji,
  cast shadow

### pp-slingshot-kicker — the two triangular kickers that fling the ball off the funnel walls
- **Size:** 384×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a pinball slingshot kicker for an arcade
  physics game, seen from a steep 3/4 top-down angle. Show a triangular navy plastic guard plate
  `#003DA6` with a chrome edge trim, two steel posts capped in white rubber, a stretched orange
  rubber band `#F26522` running between them, and a small kicker arm just behind the band. Add a
  lit slot insert glowing `#FFC845` on the guard plate face. Hardware, not iconography — screws,
  seams and rubber texture visible. Centred with padding, transparent background.
- **Negative:** text, letters, watermark, lightning bolts, energy beams, cartoon outline, emoji,
  cast shadow, sling weapon

### pp-lane-lamp-pair — the three top rollover lanes, shown unlit and lit
- **Size:** 512×256 px, transparent PNG, two states side by side
- **Prompt:** Create a polished mobile-game asset of a pinball rollover lane pair for an arcade
  physics game, viewed from a steep 3/4 top-down angle: two bent chrome wire-form lane guides
  standing in the playfield wood with a rectangular teardrop lamp insert set flush between them.
  Render the insert twice — left copy dark and dormant, a milky off-white plastic window with a
  dead filament behind it; right copy lit hot amber `#FFC845` blooming to `#FFE38A` at the centre,
  with the light spilling a short warm pool onto the surrounding lacquer. Keep both copies
  identical in geometry so they can be cross-faded in engine. Transparent background.
- **Negative:** text, letters, numbers, watermark, neon tube style, cartoon outline, emoji, cast
  shadow, halo bloom filling the frame

### pp-drain-mouth — the fatal gap between the flipper tips at the bottom of the table
- **Size:** 512×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a pinball drain mouth for an arcade physics
  game, seen from a steep 3/4 top-down angle: the dark rectangular outhole cut into the bottom of
  the playfield, framed by chrome apron trim and two black rubber post sleeves at the outlane
  edges. The cut itself is genuinely dark — a black void with a faint red `#EF4444` warning lamp
  glowing from deep inside, the light catching only the near lip of the trim. The wood at the mouth
  is visibly worn pale from thousands of lost balls. Centred with padding, transparent background.
- **Negative:** text, letters, watermark, skull imagery, flames, cartoon outline, emoji, cast
  shadow, bright cheerful lighting

### pp-hud-ball-icon — "balls left" counter in the HUD strip
- **Size:** 128×128 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a single chrome pinball ball seated in a
  shallow chrome ball-trough cradle, for an arcade physics game. Render it as a tiny product shot,
  not a symbol: mirror-steel sphere `#E8F1FF` with a white specular pip, sitting in a brushed
  `#6E93C6` metal channel with a rolled lip. Legible at 24 px — one bold sphere silhouette, no
  interior detail smaller than 6% of the frame. Centred with generous padding, transparent
  background.
- **Negative:** text, numbers, watermark, outline stroke, flat colour fill, emoji, cast shadow,
  multiple balls

### pp-hud-timer-icon — session countdown in the HUD strip
- **Size:** 128×128 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a small chrome-bezelled cabinet timer dial
  for an arcade physics game — a circular gauge with a polished `#BFD8F5` metal ring, a matte navy
  `#0A1E42` face, five engraved tick marks and one orange `#F26522` needle sweeping past the
  three-quarter mark. Add a faint glass reflection arc across the top-left of the crystal. Legible
  at 24 px: heavy bezel, high contrast between needle and face, no fine numerals on the dial.
  Centred with padding, transparent background.
- **Negative:** text, numerals on the dial, watermark, hourglass shape, digital display, emoji,
  cast shadow, thin hairline detail

### pp-bonus-badge — the "BONUS SECURE ×2" band that lights when all three lanes are rolled
- **Size:** 512×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of an illuminated arcade backglass badge plate
  for a pinball game — a long rounded rectangular lamp insert with a chromed frame, its milky
  plastic window lit from behind in emerald `#28A745` blooming to `#4ADE80`, mounted on a strip of
  navy lacquered wood. Show a hot filament glow near the centre and light bleeding through two
  hairline cracks in the plastic. Leave the window face completely blank — the multiplier text is
  drawn by the engine on top. Centred with padding, transparent background.
- **Negative:** text, letters, numbers, multiplier symbol, watermark, neon tube, cartoon outline,
  emoji, cast shadow

### pp-result-secured — win art on the results screen ("Cover secured")
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration of a lit pinball backglass panel
  reading as triumph, for an arcade physics game: a chrome-framed rectangular backglass with three
  round lamp inserts glowing cobalt `#1E6BE0`, orange `#FF8A3D` and emerald `#4ADE80` in a row, all
  three burning at full brightness, with a chrome pinball ball resting captured in a shooter-lane
  cradle in front of them and warm gold `#FFC845` neon tubing tracing the frame. Steep 3/4 angle,
  warm cabinet lighting, celebratory but restrained — the light is doing the celebrating, not
  confetti. Transparent background.
- **Negative:** text, letters, numbers, trophy, confetti, fireworks, watermark, cartoon outline,
  emoji, human figures, cast shadow

### pp-result-lapsed — loss art on the results screen ("Cover lapsed")
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration of a dark pinball drain for an
  arcade physics game: two orange flipper bats hanging open and slack at their rest angle, a chrome
  ball caught mid-fall in the black gap between their tips, and the three round lamp inserts above
  them all dead and milky-grey with cold filaments. Lighting is a single dim overhead cabinet lamp
  — most of the frame falls into `#061229` shadow, with one faint red `#EF4444` glow from the
  outhole below. Sombre, quiet, no gore and no cartoon sadness. Steep 3/4 angle, transparent
  background.
- **Negative:** text, letters, numbers, skull, tears, sad face, watermark, cartoon outline, emoji,
  blood, human figures, cast shadow

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
