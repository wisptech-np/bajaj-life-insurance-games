# Risk Exit — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Risk Exit is the repo's **arrow sliding escape puzzle**: players slide tactile directional arrow blocks and clear red financial risk blocks out of the path to guide the main Family Cover block to the exit portal.

| Axis | Risk Exit's answer |
|---|---|
| Motif | Financial Risk Grid & Escape Portal. |
| Shape language | **Tactile 3D rectangular vehicle blocks with arrow chevrons.** Smooth rounded bevels, heavy mass. |
| Camera | Top-down orthographic 2.5D view. |
| Signature accent | **Blue Shield Hero `#00529B`** with **Cyan Arrow `#00A3E0`**. |
| Hazard colour | **Warning Crimson `#EF4444`** for Risk Lock Blocks. |
| Brand anchors | Blue `#003DA6`, Orange `#F26522`, Green `#28A745`. |
| Deep values | Dark Slate `#0A1322`, Grid Navy `#111E36`. |

Two hard technical rules, because the game post-processes these files at runtime:

1. **Blocks must align perfectly to grid cell aspect ratios (1x2, 1x3, 2x1, 3x1).**
2. Directional chevrons must be clearly embossed on the top surface of each block.

---

### rx-block-cover-2 — the hero "Family Cover" block (the one piece that escapes)
- **Size:** 512x256 transparent PNG (2:1, matches a 2-cell horizontal block)
- **Prompt:** Create a polished mobile-game asset of a single thick gold plastic
  puzzle slab, 2:1 landscape, for a sliding-block escape puzzle. Use a consistent
  clean vector-3D art style with a 22% corner radius, a hard specular gloss band
  across the top half, a bright warm rim light on the top-left edge and a deep
  shadowed rim on the bottom-right, and a square recessed icon plate centred in
  the slab holding an engraved umbrella canopy sheltering two small rounded
  figures. Show the object straight-on from directly above, no perspective,
  no tilt. Keep the composition centred with even padding on all four sides.
  Use warm gold (`#FFE9A6` highlight, `#FFC845` body, `#B4780C` shadow) with a
  near-white rim (`#FFF3C4`) and dark bronze engraving (`#3B2A05`). Transparent
  background. Export-ready game asset, 512x256 PNG.
- **Negative:** text, numbers, watermark, photographic texture, perspective or
  isometric tilt, drop shadow on the transparent background, emoji, cartoon
  faces, car or vehicle shapes, bevelled outer glow, background gradient

### rx-block-debt-2 / rx-block-debt-3 — "Debt" risk blocks (2-cell and 3-cell)
- **Size:** 512x256 and 768x256 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a thick crimson plastic
  puzzle slab for a sliding-block escape puzzle, delivered in a 2:1 and a 3:1
  version with identical corner radius, gloss band and rim treatment so the two
  read as the same material at different lengths. Use a consistent clean
  vector-3D art style with a 22% corner radius, hard top gloss, bright top-left
  rim, dark bottom-right rim, and a square recessed icon plate centred in the
  slab holding an engraved stack of three flat coin ellipses beside a downward
  drain arrow. Show the object straight-on from directly above. Keep the
  composition centred with even padding. Use crimson (`#FCA5A5` highlight,
  `#E23D3D` body, `#7A1414` shadow) with a pale rose rim (`#FFDCDC`) and white
  engraving. Transparent background. Export-ready game asset.
- **Negative:** text, currency symbols spelled out, watermark, photographic
  texture, perspective tilt, emoji, skull imagery, flames, background, drop shadow

### rx-block-illness-2 / rx-block-illness-3 — "Illness" risk blocks
- **Size:** 512x256 and 768x256 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a thick magenta-rose plastic
  puzzle slab for a sliding-block escape puzzle, in matching 2:1 and 3:1
  lengths. Use a consistent clean vector-3D art style with a 22% corner radius,
  hard top gloss band, bright top-left rim, dark bottom-right rim, and a square
  recessed icon plate centred in the slab holding an engraved rounded medical
  cross with a single ECG heartbeat trace cut horizontally through it. Show the
  object straight-on from directly above. Keep the composition centred with even
  padding. Use magenta-rose (`#FDA4C4` highlight, `#D6336C` body, `#6D1030`
  shadow) with a pale pink rim (`#FFE0EE`) and a dark cut-out engraving
  (`#3A0A1A`). Transparent background. Export-ready game asset.
- **Negative:** text, watermark, photographic texture, perspective tilt, emoji,
  hospital scene, syringes, blood, human figures, background, drop shadow

### rx-block-market-2 / rx-block-market-3 — "Market Shock" risk blocks
- **Size:** 512x256 and 768x256 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a thick burnt-orange plastic
  puzzle slab for a sliding-block escape puzzle, in matching 2:1 and 3:1
  lengths. Use a consistent clean vector-3D art style with a 22% corner radius,
  hard top gloss band, bright top-left rim, dark bottom-right rim, and a square
  recessed icon plate centred in the slab holding an engraved falling trend line
  with a solid arrowhead at its low end, over three faint candlestick bars. Show
  the object straight-on from directly above. Keep the composition centred with
  even padding. Use burnt orange (`#FBA98B` highlight, `#D2451C` body, `#6B1D06`
  shadow) with a pale peach rim (`#FFE7D6`) and white engraving; this is the
  only risk allowed to lean toward the brand orange `#F26522`. Transparent
  background. Export-ready game asset.
- **Negative:** text, percentages, watermark, photographic texture, perspective
  tilt, emoji, bull or bear animals, ticker tape, background, drop shadow

### rx-block-job-2 / rx-block-job-3 — "Job Loss" risk blocks
- **Size:** 512x256 and 768x256 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a thick deep-wine plastic
  puzzle slab for a sliding-block escape puzzle, in matching 2:1 and 3:1
  lengths. Use a consistent clean vector-3D art style with a 22% corner radius,
  hard top gloss band, bright top-left rim, dark bottom-right rim, and a square
  recessed icon plate centred in the slab holding an engraved briefcase outline
  crossed by a jagged break line, as if the handle has snapped. Show the object
  straight-on from directly above. Keep the composition centred with even
  padding. Use deep wine (`#E0A3B8` highlight, `#A32B4D` body, `#530A1F` shadow)
  with a pale blush rim (`#FADEE8`) and white engraving. Transparent background.
  Export-ready game asset.
- **Negative:** text, watermark, photographic texture, perspective tilt, emoji,
  office scene, people, "fired" imagery, background, drop shadow

### rx-block-axis-caps — the direction chevrons overlaid on every block end
- **Size:** 128x128 transparent PNG, one horizontal pair and one vertical pair
- **Prompt:** Create a polished mobile-game asset of a minimal pair of soft white
  chevron arrowheads for a sliding-block puzzle overlay, one pointing left and
  one pointing right (plus an up/down variant). Use a consistent clean vector
  style with rounded stroke caps, uniform 12%-of-height stroke weight, no fill,
  and a gentle inner glow so they stay legible on saturated red and gold slabs.
  Show them straight-on. Keep each chevron centred in its own square canvas with
  generous padding. Use pure white at 38% opacity with a faint white outer glow.
  Transparent background. Export-ready game asset, 128x128 PNG.
- **Negative:** text, watermark, arrow shafts, solid triangles, gradients,
  colour, drop shadow, background, emoji

### rx-board-tray — the recessed 6x6 board the blocks sit in
- **Size:** 1024x1024 transparent PNG, 1:1
- **Prompt:** Create a polished mobile-game asset of a dark recessed 6x6 puzzle
  tray for a sliding-block escape game: a deep navy well with a 20%-radius outer
  frame, a subtle inner drop-shadow lip all round, and 36 identical square
  sockets in a faint alternating checker so each grid cell is readable but never
  competes with the blocks on top. The right-hand wall must be BROKEN OPEN at
  the third row from the top — leave a clean full-cell gap there, no frame
  stroke across it. Use a consistent clean vector-3D style, straight-on from
  directly above, no perspective. Use deep navy (`#0D1728` to `#060C17`) with a
  cool steel-blue frame stroke (`rgba(120,165,235,0.22)`) and sockets at 2-4%
  white. Transparent outside the tray. Export-ready game asset, 1024x1024 PNG.
- **Negative:** text, numbers, coordinate labels, watermark, wood or metal
  photographic texture, perspective, isometric view, blocks or pieces inside the
  tray, drop shadow outside the frame, background scene

### rx-exit-gate — the glowing gate mouth on the right wall
- **Size:** 256x192 transparent PNG (wider than one cell so the glow can bleed)
- **Prompt:** Create a polished mobile-game asset of a glowing green exit gate
  mouth for a sliding-block escape puzzle: two bright horizontal bracket rails
  marking the top and bottom of a single open cell in a dark wall, with a soft
  outward-fading light beam spilling to the right and a single chevron arrowhead
  floating in the beam. Use a consistent clean vector style with rounded caps
  and a soft bloom, straight-on from directly above. Keep the brackets flush to
  the left edge with the beam fading to nothing at the right edge. Use safety
  green (`#4ADE80`) at full strength on the rails, fading to fully transparent
  green across the beam. Transparent background. Export-ready game asset,
  256x192 PNG.
- **Negative:** text, "EXIT" lettering, watermark, doors, hinges, arrows with
  shafts, red or orange light, photographic lens flare, background

### rx-app-backdrop — the screen behind the board
- **Size:** 1080x1920 JPG/PNG, 9:16 portrait
- **Prompt:** Create a polished mobile-game background for a calm, cerebral
  sliding-block puzzle: a deep midnight-navy field with one soft elliptical
  light pooling from the upper third, and a very faint large-scale square grid
  drifting behind everything at under 4% opacity, as if the board's geometry
  extends past the frame. Keep the centre band clean and unbusy — a 6x6 board
  and a HUD sit on top of it. No focal object, no horizon, no characters. Use
  deep navy (`#060D1F`) into brand blue (`#0D2C5E`) with a whisper of brand
  orange (`#F26522`) only at the extreme lower edge. Full-bleed, no transparency.
  Export-ready game background, 1080x1920.
- **Negative:** text, watermark, characters, buildings, currency symbols, stars,
  bokeh particles, heavy vignette, busy patterns behind the centre of the frame

### rx-hud-icons — the three HUD stat glyphs (score / moves / par)
- **Size:** 96x96 transparent PNG each, delivered as one 288x96 strip
- **Prompt:** Create a polished mobile-game icon set of three matching HUD
  glyphs for a sliding-block puzzle: (1) a stylised coin-stack for SCORE,
  (2) two interlocking slab rectangles with a small motion arc for MOVES, and
  (3) a small flag on a post standing on a slab for PAR. Use a consistent clean
  vector line style with uniform 2.4px-equivalent stroke weight, rounded caps,
  no fill, and identical optical weight so the three sit evenly in a row. Show
  each straight-on, centred in its own square with generous padding. Use pure
  white at 85% opacity. Transparent background. Export-ready game asset, three
  96x96 tiles.
- **Negative:** text, numbers, watermark, filled shapes, colour, gradients,
  drop shadow, emoji, badges or circular frames

### rx-drag-hand — the finger cursor for the how-to-play loop
- **Size:** 256x256 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a simple pointing-hand
  cursor glyph for a touch tutorial: index finger extended upward, other fingers
  curled, drawn as a clean outline with a dark translucent fill so it stays
  visible over both bright gold and dark navy. Include a matching second frame
  with a small concentric press ring at the fingertip. Use a consistent clean
  vector line style with rounded caps and a uniform stroke. Show it straight-on,
  slightly rotated clockwise, centred with padding. Use a warm cream outline
  (`#FFF3C4`) over a dark navy translucent fill (`rgba(8,14,28,0.8)`).
  Transparent background. Export-ready game asset, 256x256 PNG.
- **Negative:** text, watermark, realistic skin texture, fingernails, sleeves or
  arms, photographic hand, emoji hand, drop shadow, background

### rx-result-crest — the results-screen art for a cleared board
- **Size:** 640x640 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a celebration crest for a
  puzzle win screen: the gold family-cover slab from the game, clear of the
  board and tilted a few degrees, breaking through a ring of green light, with
  four small red risk slabs pushed outward and downward to the corners. Use a
  consistent clean vector-3D style matching the block set — 22% corner radius,
  hard top gloss, bright top-left rim. Show it straight-on with only a slight
  playful rotation. Keep the composition centred with padding for a 640px
  square. Use gold (`#FFC845`), safety green (`#4ADE80`) for the ring, and
  desaturated crimson (`#7A1414`) for the receding risk slabs. Transparent
  background. Export-ready game asset, 640x640 PNG.
- **Negative:** text, "WIN" lettering, watermark, confetti, trophies, stars,
  laurel wreaths, characters, photographic texture, background

### rx-clear-burst — the particle sprite for a risk shoved out of the lane
- **Size:** 512x512 transparent PNG sprite sheet, 4x4 frames of 128x128
- **Prompt:** Create a polished mobile-game particle sprite sheet of a short,
  crisp shard burst for a puzzle game: a compact ring of small rounded
  rectangular chips flying outward and fading, drawn in 16 sequential frames on
  a 4x4 grid, starting tight and dense and ending sparse and faint. Use a
  consistent clean vector style with flat chips, no motion blur, no smoke. Show
  it straight-on. Keep each frame centred in its own 128x128 tile. Use crimson
  (`#E23D3D`) chips shifting to safety green (`#4ADE80`) across the later
  frames, marking a risk turning into cleared ground. Transparent background.
  Export-ready sprite sheet, 512x512 PNG.
- **Negative:** text, watermark, smoke, fire, sparkles with star shapes, lens
  flare, motion blur, frame borders or gridlines, background

---

## Replacement checklist

| Prompt id | Replaces |
|---|---|
| `rx-block-cover-2 / RE-01` | `src/assets/block_arrow.png / RiskExitGame.jsx` |
| `rx-block-debt-2 / RE-02` | `src/assets/block_risk.png / RiskExitGame.jsx` |
| `rx-exit-portal / RE-03` | `src/assets/exit_portal.png / RiskExitGame.jsx` |
| `rx-bg-grid` | `src/assets/grid_bg.png / canvas drawGrid()` |
| `rx-hud-moves` | `inline SVGs in HUD` |
| `rx-results-escaped` | `src/Screens.jsx ResultsScreen` |

The game engine dynamically binds these assets at runtime, with fallback to procedural SVG/canvas rendering.
