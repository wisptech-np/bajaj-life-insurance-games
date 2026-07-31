# Premium Tiles — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Premium Tiles is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Premium Tiles's answer |
|---|---|
| Motif | Premium Tiles gameplay theme & visual style. |
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

### pt-paper-field — full-screen canvas background the lanes are ruled onto
- **Size:** 800×1280 px, 5:8 portrait, opaque JPG/PNG
- **Prompt:** Create a polished mobile-game background of a sheet of dark hand-pressed rag paper
  for a lane-tapping rhythm game, photographed flat-on and square. The sheet is deep ink-stained
  indigo `#0B1221` warming to `#0B2450` down the middle, with visible cotton fibre grain, a faint
  cloudy mould-made mottling, and four vertical ruled guide lines in thin washed-indigo `#7FC0FF`
  at 12% opacity dividing the sheet into equal columns. Add a very subtle woodblock border
  impression along the outer edges — a repeating carved chevron in 8% marigold — and leave the
  central columns clean and unprinted so gameplay tiles read on top. Matte, absorbent, no sheen
  anywhere.
- **Negative:** glow, neon, glass, gloss, text, numbers, notation, tiles, shine, photographic
  paper texture close-up, vignette blobs

### pt-premium-tile — the blue tile the player taps to play the next note
- **Size:** 512×384 px, transparent PNG, 4:3 landscape
- **Prompt:** Create a polished mobile-game asset of a single rounded rectangular woodblock
  impression in indigo dye for a rhythm game, seen flat-on. The shape is printed rather than drawn:
  a solid `#003DA6` field with a lighter `#1E6BE0` band across the upper third where the block took
  more ink, a slightly ragged edge where the pigment bled into paper fibre, and a fine carved
  woodgrain visible as thin unprinted streaks running vertically through the fill. A hand-cut
  double keyline in unbleached `#F3EAD8` runs 3 px inside the outline, wobbling very slightly as a
  hand-carved line does. No shine, no bevel, no shadow. Transparent background.
- **Negative:** glossy plastic, bevel, drop shadow, glow, gradient sheen, perfectly straight
  machine edges, text, numbers, watermark, emoji, 3D extrusion

### pt-hold-tile — the tall tile the player presses and keeps held
- **Size:** 384×768 px, transparent PNG, tall portrait
- **Prompt:** Create a polished mobile-game asset of a tall rounded rectangular woodblock
  impression in indigo dye for a rhythm game, seen flat-on — the same printed family as the short
  premium tile but three times its height. Running down the centre is a carved channel left
  unprinted, reading as a pale `#F3EAD8` stripe with softly bled edges, and the indigo fill grades
  from washed `#7FC0FF` at the top through `#1E6BE0` to deep `#00185A` at the foot, as if the block
  was inked heaviest at the bottom. Hand-cut keyline inside the outline, visible woodgrain streaks,
  matte throughout. Transparent background.
- **Negative:** glossy plastic, bevel, drop shadow, glow, arrows, chevrons, text, numbers,
  watermark, emoji, 3D extrusion, machine-perfect symmetry

### pt-double-tile — the paired tile that must be hit in two lanes at once
- **Size:** 768×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of two rounded rectangular indigo woodblock
  impressions printed side by side for a rhythm game, seen flat-on, with a narrow unprinted paper
  gap between them and a single hand-carved tie-bar linking their inner edges — one carved block
  that prints as a pair. Both halves share identical ink coverage and woodgrain direction so they
  read as one stamp. Marigold `#FF8A3D` accent dots printed at the two outer corners. Matte,
  absorbent, no sheen. Transparent background.
- **Negative:** glossy plastic, bevel, drop shadow, glow, chain link, text, numbers, watermark,
  emoji, 3D extrusion, mirrored asymmetry

### pt-risk-impulse — the red "IMPULSE BUY" tile that must NOT be tapped
- **Size:** 512×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a rounded rectangular woodblock impression in
  madder red for a rhythm game, seen flat-on. The block is deliberately cruder than the indigo
  tiles: heavier ink, `#E23B3B` bleeding to oxidised `#8F1D1D` at the lower edge, a rough chipped
  corner where the carving broke, and a bold hand-cut X printed across the face in unbleached
  `#F3EAD8` — two thick crossed strokes with visible brush-end taper. The keyline is broken in two
  places. It must read as *damaged and wrong* at 32 px. Matte, absorbent. Transparent background.
- **Negative:** glow, glossy plastic, bevel, drop shadow, skull, flames, text, letters, numbers,
  watermark, emoji, 3D extrusion

### pt-risk-scam — the red "SCAM CALL" tile, the second risk variant
- **Size:** 512×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a rounded rectangular madder-red woodblock
  impression for a rhythm game, seen flat-on, in the same crude carved family as the impulse-buy
  block but distinguished by its printed device: a simple hand-cut handset silhouette in
  unbleached `#F3EAD8` with three short broken arcs radiating from its earpiece, the arcs
  deliberately printed with gaps as if the block did not take ink evenly. Ink is `#E23B3B` with
  `#8F1D1D` pooling along the bottom edge, one corner chipped, keyline broken. Legible at 32 px.
  Matte, absorbent. Transparent background.
- **Negative:** glow, glossy plastic, bevel, drop shadow, smartphone, modern phone icon, text,
  letters, numbers, watermark, emoji, 3D extrusion

### pt-due-rule — the DUE line the tiles must be tapped on
- **Size:** 800×96 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single printed horizontal rule for a rhythm
  game, seen flat-on: a bold marigold `#F26522` bar hand-inked across handmade paper, its edges
  slightly feathered where pigment wicked into the fibre, thicker in the middle than at the ends
  where the block lifted. Beneath it, a second much finer `#FF8A3D` hairline rule printed 6 px
  lower and only 70% as long, off-centre by a few pixels as hand-registered printing always is.
  No glow, no gradient, no caps or end-decorations. Transparent background.
- **Negative:** glow, neon bar, gradient, drop shadow, arrows, tick marks, text, numbers,
  watermark, emoji, perfectly uniform thickness

### pt-note-glyph — the melody note that flies up from each performed tile
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single hand-printed musical quaver for a
  rhythm game, seen flat-on: an inked oval notehead, a straight stem and one flag, carved and
  stamped rather than typeset — the stroke thickness varies, the flag has a slight hand-cut curl,
  and the ink is warm marigold `#FF8A3D` deepening to `#F26522` where it pooled. A faint offset
  ghost impression of the same glyph sits 2 px behind it in 15% opacity, as if the sheet shifted
  during printing. Legible at 20 px. Transparent background.
- **Negative:** typeset music font, perfect vector curves, glow, drop shadow, staff lines, text,
  numbers, watermark, emoji, 3D render

### pt-hit-bloom — the ink splash fired on a Perfect tap
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game impact effect for a rhythm game, seen flat-on: a
  circular bloom of marigold `#FF8A3D` ink hitting wet paper — an irregular ragged ring with
  feathered wicking spurs radiating outward at uneven intervals, six or seven small satellite
  droplets scattered around it, and a pale unprinted centre. Absolutely no symmetry: the whole
  point is that ink spreads the way fibre lets it. Matte, absorbent, no glow. Transparent
  background.
- **Negative:** glow, radial symmetry, lens flare, sparkles, stars, fire, drop shadow, text,
  watermark, emoji, perfect circle

### pt-hud-life — the three lives shown in the HUD, full and spent
- **Size:** 256×128 px, transparent PNG, two states side by side
- **Prompt:** Create a polished mobile-game HUD indicator pair for a rhythm game, seen flat-on:
  two identical small hand-carved lotus-bud stamps side by side. The left is a full life — printed
  solid in leaf green `#28A745` with a lighter `#41D96B` highlight petal and clean ink coverage.
  The right is spent — the same carving printed in flat `#8F1D1D` at 40% ink, patchy and starved,
  with the outline only partly landing. Identical silhouette and position so the engine can swap
  them. Legible at 14 px. Transparent background.
- **Negative:** heart shape, glow, drop shadow, text, numbers, cracks, broken glass, watermark,
  emoji, 3D render

### pt-combo-stamp — the combo multiplier badge
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a round hand-carved seal impression for a
  rhythm game, seen flat-on: a circular stamp printed in marigold `#F26522` with a carved
  concentric double border, a ring of twelve short radial notches between the borders, and a
  completely blank unprinted centre — the multiplier value is drawn by the engine on top. The
  impression is uneven: heavier ink on the lower left, one notch that did not print. Matte,
  absorbent, no glow. Transparent background.
- **Negative:** text, numbers, multiplier symbol, glow, drop shadow, gold foil, gemstone,
  watermark, emoji, 3D render, perfectly even ink

### pt-star-rating — the 1–3 star rating printed on the results screen
- **Size:** 384×384 px, transparent PNG, earned and unearned states
- **Prompt:** Create a polished mobile-game asset of two hand-carved five-point star stamps side by
  side for a rhythm game, seen flat-on. The earned star is printed in full marigold `#F26522` with
  a warmer `#FF8A3D` core and slightly bled points. The unearned star is the same carving printed
  as outline only — a thin `rgba(243,234,216,0.3)` keyline on bare paper with no fill at all. Both
  have the hand-cut irregularity of a carved point: no two arms exactly equal. Identical size and
  position. Transparent background.
- **Negative:** gold foil, gloss, glow, drop shadow, sparkles, text, numbers, watermark, emoji,
  3D render, perfectly symmetrical star

### pt-result-harmony — win art on the results screen
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration for a rhythm game, seen flat-on: a
  short printed passage of hand-carved music — five inked quavers standing evenly on two ruled
  marigold `#F26522` lines, all five landing cleanly and at identical spacing, with a small indigo
  `#003DA6` woodblock house-and-family motif stamped beneath them as the thing the music was for.
  A ring of tiny leaf-green `#41D96B` printed dots frames the whole passage. Warm, crafted and
  quiet; the achievement is the *evenness* of the printing. Matte, absorbent, no glow.
  Transparent background.
- **Negative:** trophy, confetti, fireworks, glow, gold foil, drop shadow, text, numbers,
  watermark, emoji, 3D render, human faces

### pt-result-broken — loss art on the results screen
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration for a rhythm game, seen flat-on: a
  printed passage of hand-carved music that has gone wrong — two inked quavers land correctly, the
  third is a starved half-impression, and the last two are missing entirely, leaving bare paper
  with only the faint ruled marigold lines running on. A single madder-red `#8F1D1D` smudge sits
  where a note should have been, the ink dragged sideways. The indigo house motif beneath is
  printed at 30% ink, barely there. Sombre and quiet, no drama, no cartoon sadness. Matte,
  absorbent, no glow. Transparent background.
- **Negative:** skull, tears, sad face, cracks, broken glass, glow, drop shadow, text, numbers,
  watermark, emoji, 3D render, human faces

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
