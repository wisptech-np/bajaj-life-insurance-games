# Slide To Safety — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Slide To Safety is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Slide To Safety's answer |
|---|---|
| Motif | Slide To Safety gameplay theme & visual style. |
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

### bg-lake-water — full-screen background the board floats on
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of deep winter lake water made from layered
  card stock, for a top-down ice-sliding puzzle. Three or four broad horizontal plies of dark blue
  paper stacked back to front — `#061229` at the outer edges, `#0A1E42` and `#0B2450` toward the
  centre — each ply's cut edge showing as a barely-lighter hairline where the knife passed through,
  and each casting a shallow 2-pixel shadow onto the ply below. Blind-debossed into the topmost ply
  are slow concentric ripple rings, visible only as raised-and-recessed relief with no colour change
  at all. The centre of the frame is the flattest and quietest ply so a bright board reads on top.
  Perfectly orthographic top-down, no horizon, no reflections, no specular highlights anywhere.
- **Negative:** text, watermark, waves with foam, reflections, sky, horizon, ice, boats, fish,
  gloss, realistic photo, emoji, heavy drop shadow, perspective, busy centre

### tile-ice — the safe ice tile, in the two alternating shades of the checkerboard
- **Size:** 256×256 px each, transparent PNG, deliver as a matched pair
- **Prompt:** Create a matched pair of polished mobile-game tile assets for a top-down ice-sliding
  puzzle: two square tiles of thick pale cotton card stock with softly rounded corners, one in
  `#CFE4F7` and one in `#F2F9FF`, identical in every other respect. Each is a single ply about
  three pixels thick, so a clean pale cut edge is visible around the whole perimeter and a tight
  narrow shadow falls to the lower right. Blind-debossed into each face is a sparse scatter of fine
  frost hairlines — pressed relief only, no ink, no colour — plus one faint pressed circular
  register mark near the centre, barely visible. Completely matte, no gloss, no sparkle, no
  gradient. Orthographic top-down. Transparent background, tile centred with a little padding.
- **Negative:** text, watermark, snowflake illustrations, sparkles, glitter, gloss, gradient fills,
  ice cube realism, perspective, realistic photo, emoji, heavy drop shadow

### tile-thin-ice — the cracking tile that ends a run if you stop on it
- **Size:** 256×256 px, transparent PNG, deliver three deepening states
- **Prompt:** Create a set of three polished mobile-game tile assets showing one square of thin ice
  cracking in stages, for a top-down ice-sliding puzzle. Each is a square of thin, slightly
  translucent card stock in `#B9CFE2` with rounded corners and a visible pale cut edge. State one:
  a shallow letterpress-inked star of six hairline cracks radiating from the centre in dark
  `rgba(16,38,66,0.72)`, with a faint warm `#E0785A` bloom pressed in around them. State two: the
  same cracks cut clean through the top ply so the darker water paper shows in the gaps, the warm
  `#E0785A` warning wash now clearly visible. State three: the centre of the tile physically
  missing, a ragged deckle-torn hole opening onto near-black `#04101F` paper beneath, with three or
  four small torn card fragments still hinged at the rim. Orthographic top-down, matte throughout.
  Transparent background, centred with padding.
- **Negative:** text, watermark, gloss, wet look, water splash, blood, gore, realistic photo,
  emoji, perspective, heavy drop shadow, smooth vector cracks

### tile-rock — the immovable rock that stops a glide
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of an angular boulder built from stacked
  card-stock plies, seen from directly above, for a top-down ice-sliding puzzle. Five or six
  irregular faceted plies of slate-blue paper in `#3C516C`, each smaller than the one beneath, so
  the boulder steps up like a paper contour model and each cut edge shows a lighter `#6A83A2`
  hairline. The topmost, smallest facet is the lightest; the deep crevices between plies are
  `#1C2A3D`. Blind-debossed hatching runs across the two largest facets. Matte, dry, chalky —
  clearly paper, not stone. Orthographic top-down. Transparent background, centred with padding.
- **Negative:** text, watermark, moss, snow cap, realistic rock texture, gloss, wet look,
  perspective, realistic photo, emoji, heavy drop shadow, smooth rounded pebble

### tile-family-goal — the green family tile, the only safe destination
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a goal tile built from layered papercraft for
  a top-down ice-sliding puzzle: a square base tile of pale card with a `#28A745` letterpress-inked
  border pressed into its perimeter, and standing proud on it a small die-cut paper house — a
  simple triangular `#28A745` roof ply over a rectangular `#F2F9FF` body ply, each with a visible
  cut edge and its own tight shadow. In the doorway sit three small die-cut discs standing for a
  family, in `#003DA6`, `#1E6BE0` and `#F26522`, cut from the same card and slotted in so their
  edges show. Warm, welcoming, hand-assembled. Orthographic top-down with the house read from
  slightly front-on the way a pop-up book stands a shape upright. Transparent background, centred
  with padding.
- **Negative:** text, watermark, human faces, features, windows with light, smoke from chimney,
  realistic photo, gloss, perspective, emoji, heavy drop shadow

### token-shield — the player's shield token, the piece you move
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a shield-shaped game token built from layered
  papercraft, for a top-down ice-sliding puzzle. Three plies stacked: a slightly oversized backing
  ply in pale `#A6D0FF` showing as a thin halo edge, a main body ply in brand blue `#1E6BE0` with a
  crisp visible cut edge, and a top ply that is a single white check mark die-cut as its own free
  shape and glued on, its paper edge catching a hairline of light. Classic rounded shield outline,
  point at the bottom. The whole token sits proud of the board with a tight, tidy contact shadow.
  Matte cotton card throughout. Orthographic top-down. Transparent background, centred with padding.
- **Negative:** text, watermark, heraldry, crest, metal, chrome, gloss, bevel, gradient fill,
  realistic photo, emoji, heavy drop shadow, glow

### token-coin — the premium coin collected en route
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small circular game token built from layered
  papercraft, for a top-down ice-sliding puzzle: a disc of warm gold card `#FFC845` with a visible
  cut edge, topped by a smaller concentric ring die-cut from paler `#FFE38A` card and glued on, and
  a fine blind-debossed ring pressed just inside its rim. One tiny crescent of white card at the
  upper left stands in for a highlight — a glued paper shape, not a rendered gleam. Utterly matte,
  no metallic sheen of any kind. Orthographic top-down. Transparent background, centred with
  padding.
- **Negative:** text, currency symbols, numbers, watermark, metallic gold, shine, reflection,
  milling, realistic coin, gloss, perspective, emoji, heavy drop shadow

### lane-wind-gust — the wind lane that shoves the token one cell sideways
- **Size:** 256×768 px, 1:3 portrait, transparent PNG, vertically tileable
- **Prompt:** Create a polished mobile-game overlay asset of a wind lane for a top-down ice-sliding
  puzzle: a tall narrow band of translucent vellum in cool `#A6D0FF` at low opacity laid over
  nothing, its long edges torn to a soft deckle rather than cut. Pressed into the vellum are three
  evenly spaced chevron marks pointing the same way, blind-debossed so they read as raised relief
  in the paper rather than as printed ink. The short ends of the band fade to fully transparent so
  it tiles seamlessly along a column. Matte, papery, no glow. Orthographic top-down. Transparent
  background.
- **Negative:** text, watermark, arrows with heads, motion blur streaks, clouds, smoke, glow,
  gradient light, realistic photo, emoji, drop shadow, hard cut ends

### fx-breakthrough — the token falling through thin ice
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game effect asset of a papercraft collapse for a top-down
  ice-sliding puzzle: a ragged deckle-torn hole in pale `#B9CFE2` card opening onto flat near-black
  `#04101F` paper, with eight or nine torn card fragments flung outward around the rim — some still
  hinged and folded up, some fully detached and tumbling, every one showing the white torn core of
  the paper along its break. A single blue shield token is half-swallowed at the centre, tilted and
  sinking below the paper plane. Completely matte, no water, no splash, no gloss. Orthographic
  top-down. Transparent background, centred with padding.
- **Negative:** text, watermark, water, splash, droplets, gloss, wet reflections, blood, drowning
  figure, realistic photo, emoji, heavy drop shadow, motion blur

### trail-route — the orange route the player's swipes carve
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game overlay asset of a route trail for a top-down
  ice-sliding puzzle: an L-shaped path made of short evenly spaced dashes, each dash a separate
  tiny die-cut sliver of warm orange card `#FF8A3D` with rounded ends and its own visible cut edge,
  laid down like stitching along the route. The corner turn is mitred cleanly. A slightly larger
  detached chevron of the same card marks the far end. Matte, flat, no glow, no gradient, no taper.
  Orthographic top-down. Transparent background, path centred with padding.
- **Negative:** text, watermark, arrows with fletching, glow, neon, gradient, motion blur, taper,
  realistic photo, emoji, drop shadow

### hud-icon-set — the three HUD glyphs (moves used, retries left, session timer)
- **Size:** 256×256 px each, transparent PNG, delivered as a matching set of three
- **Prompt:** Create a set of three polished mobile-game HUD icons for a top-down ice-sliding
  puzzle, each die-cut from the same weight of pale `#F2F9FF` card and mounted on a slightly larger
  backing ply so a uniform hairline edge shows all round — (1) a right-angled L path glyph, (2) a
  circular arrow glyph, (3) a simple sand-timer glyph. All three share identical card thickness,
  identical backing offset, identical optical size and matte finish; the backing plies are tinted
  `#FF8A3D`, `#1E6BE0` and `#CFE4F7` respectively. Each casts the same tight contact shadow. Flat
  orthographic front view, centred in its own square with even padding. Transparent background.
- **Negative:** text, numbers, watermark, gloss, gradients, glow, mismatched thicknesses, badge
  plates, perspective, realistic photo, emoji

### result-win-tableau — win-state art on the results screen
- **Size:** 800×800 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the win screen of a papercraft
  ice-sliding puzzle: the blue paper shield token standing on the green family goal tile, the
  little die-cut paper house behind it with its three family discs slotted in the doorway, and a
  short orange dashed paper route trailing away behind the token across four pale ice tiles. Two or
  three gold paper coin discs rest on the tiles beside it. Everything is layered card stock with
  visible cut edges and tight contact shadows, entirely matte. Warm, tidy, complete — a puzzle
  finished, not a trophy won. Orthographic top-down. Transparent background, centred, generous
  padding.
- **Negative:** text, watermark, trophy, medal, confetti, fireworks, sparkles, faces, gloss,
  realistic photo, emoji, heavy drop shadow, UI frame

### result-loss-tableau — loss-state art on the results screen
- **Size:** 800×800 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the loss screen of a papercraft
  ice-sliding puzzle: a ragged deckle-torn hole in the pale ice card opening onto near-black
  `#04101F` paper, torn fragments hinged up around its rim, and the blue paper shield token tipped
  on its side at the edge of the break. Two or three cells away the green family goal tile sits
  untouched and out of reach, its little paper house intact. The orange dashed route stops short,
  its last dash a half-sliver. Everything matte layered card with visible cut edges. Quiet,
  unfinished, no drama. Orthographic top-down. Transparent background, centred, generous padding.
- **Negative:** text, watermark, skulls, blood, water, splash, drowning, flames, gloss, realistic
  photo, emoji, heavy drop shadow, UI frame

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
