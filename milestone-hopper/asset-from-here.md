# Milestone Hopper — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Milestone Hopper is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Milestone Hopper's answer |
|---|---|
| Motif | Milestone Hopper gameplay theme & visual style. |
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

### mh-hopper-avatar — the player character, canvas + Home hero + How to Play demo

- **Size:** 512x512 transparent PNG, subject occupying the centre ~70%.
- **Prompt:** Create a polished mobile-game asset of a small heroic guardian
  character built as a rounded cube-bodied figure for a life-milestone lane
  hopper game. The body is a single soft-cornered cube in deep brand blue with a
  brighter blue lit cap plate on top, a dark visor band across the front with one
  pale blue highlight rectangle inside it, a short trailing orange cape flicked
  out behind the left shoulder, and a bright gold double-chevron crest stacked on
  the chest pointing upward. Use a flat-shaded low-poly slab art style with matte
  surfaces, one hard key light from the upper left, a crisp pale rim light down
  the left edge of the body and a dark contact edge down the right, clean
  silhouette, strong readability at 40 px, and a professional casual-game finish.
  Show the object from a slightly-above near-orthographic three-quarter front
  view, standing, with a soft elliptical contact shadow beneath it. Keep the
  composition centred with sufficient padding. Use deep blue (#003DA6), bright
  blue (#1E6BE0), rim highlight (#CFE6FF), cape orange (#F26522) and crest gold
  (#FFC845). Transparent background. Export-ready game asset, 512x512 PNG.
- **Negative:** text, watermark, border, UI frame, mock-up, photographic texture,
  realistic human face, arms or legs, gloss or chrome, cel outline, drop shadow
  box, emoji, green anywhere on the character.

---

### mh-debt-weight — THE HAZARD: sliding across every expense lane

- **Size:** 512x384 transparent PNG, wide landscape subject.
- **Prompt:** Create a polished mobile-game asset of a squat cast-iron debt
  weight for a life-milestone lane hopper game. The object is a single
  bottom-heavy trapezoid ingot — narrow tapered shoulders, wide flat base, softly
  rounded corners — with a thick rounded lifting bar arcing over the top, a
  recessed near-black rectangular plate set into its face, and two small glowing
  ember chevrons inside that plate pointing **downward**. A molten seam glows
  horizontally through the middle of the body. Use a flat-shaded low-poly slab
  art style with matte cast-iron surfacing, one hard key light from the upper
  left, a hot rim light along the top edge, a dark undercut along the base, heavy
  grounded mass in the silhouette, and a professional casual-game finish. Show
  the object from a slightly-above near-orthographic three-quarter front view,
  resting on a surface, with a tight dark elliptical contact shadow. Keep the
  composition centred with sufficient padding. Use ember red (#D0421F), hot
  orange rim (#FF8A3D), molten highlight (#FFD3A0) and near-black core (#390C05).
  Transparent background. Export-ready game asset, 512x384 PNG.
- **Negative:** text, watermark, border, UI frame, mock-up, photographic texture,
  spikes, tentacles, eyes, faces, germs, viruses, cells, blobs, anything organic
  or alive, any green or teal, gloss, chrome, sparkles, emoji.

---

### mh-band-pavement — safe row slab (the ground you own)

- **Size:** 1024x256 transparent PNG, seamlessly tileable left to right.
- **Prompt:** Create a polished mobile-game asset of a wide horizontal pavement
  slab band for a life-milestone lane hopper game. The band is a single flat
  brick of blue-slate paving seen slightly from above: a lit foreshortened top
  face divided by seven faint vertical paving joints, a bright pale rim line
  along its leading edge, and a distinctly darker front face beneath it. Use a
  flat-shaded low-poly slab art style with matte surfacing, one hard key light
  from above and slightly left, a soft ambient shadow falling across the far edge
  of the top face, and a professional casual-game finish. Show the object from a
  near-orthographic slightly-above view, perfectly horizontal, seamlessly
  tileable at the left and right edges. Use slab blue (#3570B8), shaded blue
  (#23508A), front face (#123059) and rim highlight (#CFE6FF). Transparent
  background. Export-ready game asset, 1024x256 PNG.
- **Negative:** text, watermark, border, UI frame, perspective vanishing point,
  grass, roads, cars, photographic texture, gloss, any ember or green, emoji.

---

### mh-band-expense-lane — hazard row slab (where debt weights slide)

- **Size:** 1024x256 transparent PNG, seamlessly tileable left to right.
- **Prompt:** Create a polished mobile-game asset of a wide horizontal dark
  asphalt lane band for a life-milestone lane hopper game. The band is a single
  flat brick of warm-dark charcoal seen slightly from above: a lit foreshortened
  top face carrying a repeating row of small ember chevron markings pointing
  upward, a faint hot ember kerb line along the top and bottom of the top face,
  and a nearly black front face beneath it. The whole band should read as
  dangerous traffic rather than as ground you can trust, and should sit clearly
  darker and warmer than a blue pavement band. Use a flat-shaded low-poly slab
  art style with matte surfacing, one hard key light from above and slightly
  left, and a professional casual-game finish. Show the object from a
  near-orthographic slightly-above view, perfectly horizontal, seamlessly
  tileable at the left and right edges. Use warm charcoal (#332635), deep
  charcoal (#1E1622), front face (#100A14) and ember markings (#FF8A3D at low
  opacity). Transparent background. Export-ready game asset, 1024x256 PNG.
- **Negative:** text, watermark, border, UI frame, perspective vanishing point,
  white dashed road lines, vehicles, photographic asphalt texture, gloss, any
  green, emoji.

---

### mh-band-uncertainty-river — river row slab (nothing to stand on)

- **Size:** 1024x256 transparent PNG, seamlessly tileable left to right.
- **Prompt:** Create a polished mobile-game asset of a wide horizontal band of
  cold, still, unlit slate water for a life-milestone lane hopper game. The band
  is a single flat brick seen slightly from above: a desaturated dark blue-slate
  top face carrying three faint horizontal ripple lines, deliberately the lowest
  contrast and least inviting surface in the set, and a very dark front face
  beneath it. It must read as depth you would sink into, not as a surface you
  could stand on. Use a flat-shaded low-poly slab art style with matte surfacing,
  minimal specular response, one hard key light from above and slightly left, and
  a professional casual-game finish. Show the object from a near-orthographic
  slightly-above view, perfectly horizontal, seamlessly tileable at the left and
  right edges. Use slate teal (#123A52), deep slate (#0A2436) and front face
  (#05141F). Transparent background. Export-ready game asset, 1024x256 PNG.
- **Negative:** text, watermark, border, UI frame, foam, whitecaps, reflections
  of a sky, fish, boats, bright cyan, any green, gloss, photographic water,
  emoji.

---

### mh-band-milestone-gate — milestone row slab (Graduation … Retirement)

- **Size:** 1024x256 transparent PNG, seamlessly tileable left to right.
- **Prompt:** Create a polished mobile-game asset of a wide horizontal milestone
  gate band for a life-milestone lane hopper game. The band is a single flat
  brick seen slightly from above: a deep green top face washed with a warm gold
  gradient falling from its leading edge, a crisp double gold rule running the
  full width of that leading edge, and a repeating row of small gold chevrons
  pointing upward along the base of the top face. Beneath it sits a darker green
  front face. The band must read as a threshold that rewards you for arriving.
  Use a flat-shaded low-poly slab art style with matte surfacing, one hard key
  light from above and slightly left, a warm gold glow concentrated at the
  leading edge, and a professional casual-game finish. Show the object from a
  near-orthographic slightly-above view, perfectly horizontal, seamlessly
  tileable at the left and right edges. Use gate green (#249049), deep green
  (#166433), front face (#0B3B1D), gold rule (#FFC845) and pale gold (#FFE38A).
  Transparent background. Export-ready game asset, 1024x256 PNG.
- **Negative:** text, watermark, lettering of any milestone name, border, UI
  frame, ribbons, banners, checkered flags, trophies, photographic texture, any
  ember, emoji.

---

### mh-coverage-platform — the drifting raft that crosses a river

- **Size:** 512x192 transparent PNG, wide landscape subject.
- **Prompt:** Create a polished mobile-game asset of a glowing translucent
  coverage platform slab for a life-milestone lane hopper game. The object is a
  wide, low, heavily rounded rectangular pad of pale blue glass lit from within,
  with a bright white specular rim running along its top edge, a crisp light-blue
  outline all round, a soft blue outer glow, and a single bright chevron mark
  pointing upward centred on its face. It must read instantly as the one safe
  footprint on a dark cold river. Use a flat-shaded low-poly slab art style with
  matte-translucent surfacing rather than mirror glass, one hard key light from
  the upper left, and a professional casual-game finish. Show the object from a
  slightly-above near-orthographic three-quarter view, floating level. Keep the
  composition centred with sufficient padding for the glow. Use glass blue
  (rgba pale #B2D7FF), brand blue (#1E6BE0), deep blue (#0C3A84) and edge
  highlight (#BEDEFF). Transparent background. Export-ready game asset,
  512x192 PNG.
- **Negative:** text, watermark, border, UI frame, wooden raft, lily pad, log,
  boat, ripples, photographic glass reflections, chrome, any ember or green,
  emoji.

---

### mh-planter-blocker — the obstacle that blocks a cell on a safe row

- **Size:** 384x512 transparent PNG.
- **Prompt:** Create a polished mobile-game asset of a small civic planter box
  for a life-milestone lane hopper game. The object is a low soft-cornered
  blue-slate box with a bright blue capping rim, holding a compact cluster of
  three overlapping rounded cool-blue foliage domes. It is scenery that blocks a
  square, not a threat, so it must read calm and neutral — clearly part of the
  pavement furniture rather than something to avoid. Use a flat-shaded low-poly
  slab art style with matte surfacing, one hard key light from the upper left, a
  crisp rim highlight on the box cap, and a professional casual-game finish. Show
  the object from a slightly-above near-orthographic three-quarter front view,
  resting on a surface with a soft contact shadow. Keep the composition centred
  with sufficient padding. Use box blue (#17335C), rim (#5B93D8), foliage
  (#7FB8D8) and deep foliage (#3D6E96). Transparent background. Export-ready
  game asset, 384x512 PNG.
- **Negative:** text, watermark, border, UI frame, warm green leaves, flowers,
  photographic plant texture, faces, spikes, gloss, any ember, emoji.

---

### mh-coin-and-cover — the two collectibles, as a matched pair

- **Size:** two 256x256 transparent PNGs (deliver as a 2-up sheet).
- **Prompt:** Create a polished mobile-game asset sheet of two matched collectible
  tokens for a life-milestone lane hopper game. Token one is a thick gold disc
  seen at a slight angle with a bevelled rim and a single concentric inner ring
  scored into its face. Token two is a rounded heater-shaped shield in brand blue
  with a bright blue bevel and a bold white check mark centred on it, wrapped in a
  soft blue glow. Both must share one silhouette weight and one lighting setup so
  they read as siblings on the same HUD. Use a flat-shaded low-poly slab art
  style with matte surfacing, one hard key light from the upper left, crisp rim
  highlights and dark contact edges, and a professional casual-game finish. Show
  each object from a slightly-above near-orthographic three-quarter view, floating
  level, centred with generous padding. Use gold (#FFC845), pale gold (#FFE38A),
  deep gold (#B07B12), brand blue (#003DA6), bright blue (#1E6BE0) and highlight
  (#9FCCFF). Transparent background. Export-ready game assets, 256x256 PNG each.
- **Negative:** text, watermark, currency symbols, numerals, border, UI frame,
  photographic metal reflections, chrome, sparkle stars, drop shadow box, any
  ember or green, emoji.

---

### mh-background-layers — the sky and depth behind the course

- **Size:** three 1080x1920 PNGs (opaque base + two transparent overlays).
- **Prompt:** Create a polished mobile-game background layer set for a
  life-milestone lane hopper game, delivered as three stacked portrait layers.
  Layer one is an opaque deep-night sky gradient running from near-black navy at
  the top through mid navy to a lighter steel blue at the bottom, completely
  clean and free of stars, clouds or landmarks. Layer two is a transparent soft
  cool radial bloom centred at roughly one third down the frame, so the middle of
  the screen sits visually forward of the corners. Layer three is a transparent
  vignette that darkens only the outer edges and corners. All three must stay
  quiet enough that small foreground objects read instantly on top of them at
  360x640. Use a flat, bandless, dithered gradient style with no visible
  stepping and a professional casual-game finish. Use sky top (#050F26), sky mid
  (#0A2444), sky low (#123A6E), bloom blue (#4096FF at low opacity) and vignette
  (#020712). Export-ready game assets, 1080x1920 PNG each.
- **Negative:** text, watermark, border, UI frame, stars, moon, clouds, city
  skyline, mountains, buildings, characters, banding, noise grain, lens flare,
  any ember or green, emoji.

---

### mh-arrears-tide — the rising wall that chases the player up the course

- **Size:** 1080x640 transparent PNG, wide, with a soft top edge.
- **Prompt:** Create a polished mobile-game asset of a rising wall of ember debt
  smoke for a life-milestone lane hopper game. The wall fills the lower portion
  of the frame and fades to fully transparent at the top through a soft wavy
  crest; the crest itself carries a bright burning highlight line. Inside the
  smoke, four or five dark silhouettes of squat trapezoid cast-iron weights with
  arcing lifting bars tumble at different tilts, half-dissolved into the haze. The
  whole asset must read as consequence catching up from behind. Use a flat-shaded
  low-poly slab art style for the silhouettes with a soft volumetric haze for the
  body of the wall, one warm light source from within, and a professional
  casual-game finish. Show it head-on, filling the width, seamlessly tileable
  left to right. Use ember mid (#A83412), deep ember (#2E0A04), burning crest
  (#FFBE82) and hot rim (#FF8A3D). Transparent above the crest. Export-ready game
  asset, 1080x640 PNG.
- **Negative:** text, watermark, border, UI frame, realistic fire, sparks,
  photographic smoke plates, skulls, faces, germs, viruses, spiked blobs, any
  green or teal, emoji.

---

### mh-hud-icons — the four HUD marks, as one matched set

- **Size:** 128x128 transparent PNG each, delivered as a 4-up sheet.
- **Prompt:** Create a polished mobile-game icon set of four matched HUD marks
  for a life-milestone lane hopper game, drawn as clean stroked line glyphs on a
  single consistent grid. Icon one is a double chevron pointing upward, the upper
  chevron solid and the lower one at reduced opacity — the game's score mark.
  Icon two is a simple round stopwatch with a crown stem and two hands. Icon
  three is a heater-shaped shield outline. Icon four is a double chevron pointing
  **downward**, the hazard warning. Every glyph must use the same stroke weight,
  the same rounded caps and joins, and the same optical size. Use a flat stroked
  icon style with no fill, no gradient and no shadow, and a professional
  casual-game finish. Show each glyph centred on its own square with generous
  padding. Use pale gold (#FFE38A) for the score chevron, white for the
  stopwatch, light blue (#9FCCFF) for the shield and hot orange (#FF8A3D) for the
  warning chevron. Transparent background. Export-ready game assets, 128x128 PNG
  each.
- **Negative:** text, watermark, numerals, border, UI frame, filled shapes,
  gradients, drop shadows, badge backgrounds, photographic texture, emoji.

---

### mh-result-hero-win — Results screen art when Retirement is reached

- **Size:** 768x768 transparent PNG.
- **Prompt:** Create a polished mobile-game key art asset of the cube-bodied blue
  guardian hopper standing triumphantly on the top step of a short receding stack
  of three flat blue-slate slabs, arms-free and static, with a gold double
  chevron crest on its chest, its orange cape lifted, and a broad gold milestone
  rule glowing along the leading edge of the slab beneath its feet. A scatter of
  gold coins and small gold chevrons rises around it. Use a flat-shaded low-poly
  slab art style with matte surfacing, one hard key light from the upper left,
  crisp rim lights on every leading edge, dark contact edges on every shadow
  side, and a professional casual-game finish. Show the scene from a
  slightly-above near-orthographic three-quarter view. Keep the composition
  centred with sufficient padding. Use brand blue (#003DA6), bright blue
  (#1E6BE0), rim (#CFE6FF), gold (#FFC845), pale gold (#FFE38A) and cape orange
  (#F26522). Transparent background. Export-ready game asset, 768x768 PNG.
- **Negative:** text, watermark, numerals, border, UI frame, confetti streamers,
  fireworks, trophies, medals, podium, crowd, photographic texture, any ember
  hazard object, emoji.

---

### mh-result-hero-lose — Results screen art when the run ends short

- **Size:** 768x768 transparent PNG.
- **Prompt:** Create a polished mobile-game key art asset of a single squat
  ember cast-iron debt weight come to rest on a dark charcoal lane slab, tilted
  slightly off level, its molten centre seam still glowing and a short ember
  scrape trailing away behind it across the slab. A faint haze of ember smoke
  gathers at the base of the frame. No character is present. The asset must read
  as "the cost caught up", quietly, without gore or menace. Use a flat-shaded
  low-poly slab art style with matte cast-iron surfacing, one hard key light from
  the upper left, a hot rim light along the weight's top edge, and a professional
  casual-game finish. Show the scene from a slightly-above near-orthographic
  three-quarter view. Keep the composition centred with sufficient padding. Use
  ember red (#D0421F), hot orange (#FF8A3D), molten highlight (#FFD3A0), core
  (#390C05) and lane charcoal (#332635). Transparent background. Export-ready
  game asset, 768x768 PNG.
- **Negative:** text, watermark, numerals, border, UI frame, skulls, tombstones,
  broken hearts, red X marks, blood, faces, germs, viruses, spiked blobs,
  photographic texture, any green, emoji.

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
