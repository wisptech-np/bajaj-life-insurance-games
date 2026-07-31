# Portfolio Fit — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Portfolio Fit is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Portfolio Fit's answer |
|---|---|
| Motif | Portfolio Fit gameplay theme & visual style. |
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

### bg_boardroom_deep — full-screen game and home background
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of a deep midnight-navy allocation chamber for a block-fitting finance puzzle. Use a clean vector-gradient art style with soft dimensional lighting and controlled detail: a radial glow centred at 50% width / 24% height fading from `#102547` into `#0B1221` at the edges, a barely-visible 9×9 square lattice etched at 4% opacity across the middle third, and four faint drifting light motes tinted `#F26522`, `#2F7BFF`, `#F2B705` and `#28A745` positioned far apart in the corners so they never compete with foreground blocks. Keep the centre band visually quiet and low-contrast so bright tiles read on top of it. Flat, matte, no vignette banding. Export-ready game background, 1080×1920.
- **Negative:** text, watermark, logos, charts, candlestick graphs, coins, currency symbols, photographic textures, city skylines, people, heavy vignette, noise grain, emoji, drop shadow

### board_pegboard — the 9×9 grid frame the pieces land in
- **Size:** 1024×1024 px, 1:1, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a square nine-by-nine pegboard tray for a finance block puzzle. Use a frosted dark-glass art style with clean silhouettes and soft dimensional lighting: a rounded-square outer frame with a 20 px corner radius, a 1 px cool white inner hairline at 12% opacity, and a translucent panel fill of white at 5% opacity over nothing. Inside, show eighty-one identical empty wells as rounded squares with a 24% corner radius, each a recessed white 4.5% fill with a whisper of inner top shadow so they read as sockets waiting to be filled. Wells are perfectly evenly spaced with equal margins on all four sides. Show it flat-on, straight from the front, no perspective. Transparent background outside the frame. Export-ready game asset, 1024×1024.
- **Negative:** text, numbers, watermark, grid lines drawn as strokes between cells, wood or metal texture, perspective tilt, isometric angle, photographic reflections, emoji, coloured wells

### block_equity — equity asset piece (orange)
- **Size:** 512×512 px, 1:1, transparent PNG — deliver as a 1-cell, a 1×3 bar and an L-tromino in the same style
- **Prompt:** Create a polished mobile-game asset of a chamfered extruded slab tile in equity orange for a block-fitting finance puzzle. Use a matte soft-plastic art style with clean silhouettes and soft dimensional lighting: one continuous body with a 22% corner radius, filled by a single top-to-bottom gradient from `#FFA05C` at the top through `#F26522` at 45% to `#9A3B08` at the base, a bright bevel highlight along the entire top edge, a soft dark facet along the bottom edge for depth, and a thin cool rim light tracing the whole outline including any concave corner. Engrave into the top face a single growth motif: a rising three-segment trend line with an arrow head in the upper right, drawn as a uniform-weight round-capped stroke in white at 60% opacity with a 1 px dark offset beneath it so it reads as cut into the surface. On multi-cell versions the slab stays ONE object with ONE gradient and one engraved icon centred per cell — absolutely no seam, divider or outline between cells. Show it flat-on from the front. Export-ready game asset, 512×512.
- **Negative:** text, watermark, seams between cells, internal divider lines, individual squares stuck together, glossy specular blobs, bevelled cube isometric rendering, photographic plastic, emoji, drop shadow, second colour

### block_debt — debt asset piece (blue)
- **Size:** 512×512 px, 1:1, transparent PNG — 1-cell, 1×4 bar and 2×2 square variants
- **Prompt:** Create a polished mobile-game asset of a chamfered extruded slab tile in debt blue for a block-fitting finance puzzle. Use the same matte soft-plastic language as the equity slab: one continuous body, 22% corner radius, single top-to-bottom gradient from `#8AB6FF` through `#2F7BFF` at 45% to `#0A3C8F`, bright top bevel, dark bottom facet, thin cool rim light around the full silhouette. Engrave into the top face a coupon-note motif: a horizontal rounded rectangle with a small centred disc and two short vertical ticks flanking it, uniform round-capped stroke in white at 60% opacity with a 1 px dark offset beneath. The engraving must be visually distinct from the equity trend line and the gold bars at 20 px. On multi-cell versions the slab is ONE object with ONE gradient and one engraved icon per cell, no internal seams. Flat-on front view. Export-ready game asset, 512×512.
- **Negative:** text, digits, currency symbols, watermark, seams between cells, internal dividers, glossy highlights, isometric cubes, photographic texture, emoji, drop shadow

### block_gold — gold asset piece (yellow)
- **Size:** 512×512 px, 1:1, transparent PNG — 1-cell and 1×5 bar variants
- **Prompt:** Create a polished mobile-game asset of a chamfered extruded slab tile in bullion yellow for a block-fitting finance puzzle. Same matte soft-plastic language as the other asset slabs: one continuous body, 22% corner radius, single top-to-bottom gradient from `#FFE082` through `#F2B705` at 45% to `#8F6400`, bright top bevel, dark bottom facet, thin cool rim light around the whole silhouette. Engrave into the top face a stacked-bullion motif: one small trapezoid bar centred above two trapezoid bars side by side, all drawn as uniform round-capped outlines in white at 60% opacity with a 1 px dark offset beneath. Keep the three bars chunky and widely spaced so the stack still reads as three bars at 20 px. On multi-cell versions the slab is ONE object with ONE gradient and one engraved icon per cell. Flat-on front view. Export-ready game asset, 512×512.
- **Negative:** text, watermark, glitter, sparkles, metallic photographic reflections, seams between cells, internal dividers, coin shapes, treasure chest, emoji, drop shadow

### block_insurance — insurance asset piece (green, the protection block)
- **Size:** 512×512 px, 1:1, transparent PNG — 1-cell, L-pentomino and 3×3 variants
- **Prompt:** Create a polished mobile-game asset of a chamfered extruded slab tile in protection green for a block-fitting finance puzzle. Same matte soft-plastic language as the other asset slabs: one continuous body, 22% corner radius, single top-to-bottom gradient from `#7FE39A` through `#28A745` at 45% to `#0E5A24`, bright top bevel, dark bottom facet, thin cool rim light around the whole silhouette. Engrave into the top face a shield-with-tick motif: a flat-shouldered shield tapering to a rounded point, with a short confirm tick inside it, uniform round-capped stroke in white at 62% opacity with a 1 px dark offset beneath. Add a single soft diagonal sheen band sweeping across the slab at 30% white — this is the only asset slab that carries a sheen, it marks the protection piece. On multi-cell versions the slab is ONE object with ONE gradient and one engraved icon per cell. Flat-on front view. Export-ready game asset, 512×512.
- **Negative:** text, watermark, cross or medical symbol, umbrella, family silhouettes, seams between cells, internal dividers, photographic texture, emoji, drop shadow, second sheen band

### tray_dock — the three-slot piece tray under the board
- **Size:** 1024×360 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a horizontal three-slot dock for a finance block puzzle. Use the same frosted dark-glass language as the pegboard: one wide rounded-rectangle panel with a 20 px corner radius, white 5.5% fill, 1 px cool white hairline at 10% opacity, containing exactly three identical recessed wells as rounded rectangles with a 14 px radius, white 3% fill, separated by even 8 px gutters with equal 8 px padding at both ends so the three wells are perfectly balanced. Wells are empty — they are the resting sockets for the slabs. Show it flat-on from the front, no perspective. Transparent outside the panel. Export-ready game asset, 1024×360.
- **Negative:** text, numbers, watermark, slot labels, arrows, blocks inside the wells, wood or metal texture, perspective tilt, photographic reflections, emoji, drop shadow

### hud_icon_set — score, time and streak icons in the top HUD
- **Size:** three 96×96 px tiles on one 288×96 sheet, transparent PNG
- **Prompt:** Create a polished mobile-game icon set of three finance HUD glyphs drawn in one consistent line style for a block-fitting puzzle. Every icon sits in an identical 24-unit square, uses a uniform 2-unit stroke, round caps and round joins, the same corner softness, and is drawn in pure white with no fill. Left: a stack of three coins seen slightly from the front, an ellipse top with two curved rims below. Middle: a circular clock with a short and a long hand. Right: a flame with a smaller inner flame. All three must have equal visual weight, equal optical size, and stay legible at 20 px. Show them flat-on, evenly spaced, each centred in its own tile with equal padding. Transparent background. Export-ready icon sheet, 288×96.
- **Negative:** text, watermark, filled shapes, gradients, colour, shadows, varying stroke weights, sharp corner joins, badge backgrounds, emoji, 3D rendering

### legend_chip_set — the four asset-class legend chips
- **Size:** four 88×88 px tiles on one 352×88 sheet, transparent PNG
- **Prompt:** Create a polished mobile-game asset of four small rounded legend chips for a finance block puzzle, one per asset class. Each chip is a 22-unit rounded square with a 7-unit radius carrying the same slab skin as the board pieces — a single top-to-bottom gradient, a bright 2 px top bevel, a soft dark bottom shade and a 1 px white rim at 22% opacity. Chip 1 uses equity orange `#FFA05C`→`#F26522`→`#9A3B08` with an engraved rising trend line. Chip 2 uses debt blue `#8AB6FF`→`#2F7BFF`→`#0A3C8F` with an engraved coupon note. Chip 3 uses bullion yellow `#FFE082`→`#F2B705`→`#8F6400` with engraved stacked bars. Chip 4 uses protection green `#7FE39A`→`#28A745`→`#0E5A24` with an engraved shield and tick. All four glyphs share one stroke weight and one corner treatment. Show them flat-on in a single evenly spaced row, equal padding around each. Export-ready icon sheet, 352×88.
- **Negative:** text, labels, watermark, circular chips, mismatched glyph weights, gradients running sideways, photographic texture, emoji, drop shadow

### fx_line_clear — the sweep that fires when a row or column rebalances
- **Size:** 1024×160 px, transparent PNG, horizontal (rotate 90° for the column version)
- **Prompt:** Create a polished mobile-game visual effect of a rebalance sweep for a finance block puzzle. Show one soft horizontal light bar with a bright white core at 55% opacity fading symmetrically to fully transparent at both ends over roughly a third of the width, a subtle cool blue-white tint `#9CC2FF` in the falloff, and a handful of tiny square spark motes scattered along its length in `#F26522`, `#2F7BFF`, `#F2B705` and `#28A745` to hint that all four asset classes were in the cleared line. Keep the bar crisp-edged top and bottom so it can be clipped to a single grid row. No object, no icon, pure light. Transparent background. Export-ready effect sprite, 1024×160.
- **Negative:** text, watermark, lens flare star spikes, rainbow gradients, fire, smoke, round bokeh circles, emoji, drop shadow

### result_balanced — win art on the results screen
- **Size:** 768×768 px, 1:1, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of a completed portfolio for the win screen of a finance block puzzle. Show a single tidy square arrangement of chamfered extruded slab tiles in equity orange, debt blue, bullion yellow and protection green, interlocked so their silhouettes tessellate perfectly with no gaps, seen flat-on from the front. The green protection slab sits at the centre and carries a soft outward glow at 40% opacity in `#28A745`, marking it as the piece holding the set together. Add a thin cool rim light along the top of the whole arrangement and four small square confetti motes drifting upward. Use the same matte soft-plastic language and engraved line-icon faces as the in-game blocks. Keep it centred with generous padding. Transparent background. Export-ready game asset, 768×768.
- **Negative:** text, watermark, trophies, medals, stars, ribbons, fireworks, currency symbols, charts, people, photographic texture, emoji, heavy drop shadow

### result_overloaded — lose art on the results screen
- **Size:** 768×768 px, 1:1, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of an overloaded portfolio for the game-over screen of a finance block puzzle. Show the same chamfered extruded slab tiles in equity orange, debt blue and bullion yellow crowded into a congested clump with awkward leftover holes between them, one slab tilted a few degrees as if it could not be placed, and no green protection slab anywhere in the arrangement — its absence is the point. Desaturate the whole group by roughly 25% and dim the bevel highlights so it reads as stalled rather than failed. Keep the same matte soft-plastic language and engraved line-icon faces as the in-game blocks, flat-on front view, centred with generous padding. Transparent background. Export-ready game asset, 768×768.
- **Negative:** text, watermark, skulls, red crosses, warning triangles, cracks, explosions, sad faces, currency symbols, people, photographic texture, emoji, heavy drop shadow

### home_hero — the floating board preview on the home screen
- **Size:** 800×700 px, transparent PNG
- **Prompt:** Create a polished mobile-game hero image of a small floating allocation board for a finance block puzzle. Show a seven-by-six frosted dark-glass mini pegboard with a 20 px corner radius, white 6% panel fill and a 1 px white hairline at 14% opacity, partially filled with chamfered extruded slab tiles in equity orange, debt blue, bullion yellow and protection green — the third row fully complete and lit slightly brighter than the rest, every other row sparsely filled with clear empty wells between them. Above the board, a single 2×2 equity-orange slab hovers as ONE continuous object with one top-to-bottom gradient and four engraved trend-line icons, casting a soft dark shadow onto the board to show it is mid-drag. Flat-on front view, gently tilted nowhere, centred with generous padding. Transparent background. Export-ready game asset, 800×700.
- **Negative:** text, watermark, hands, cursors, arrows, motion-blur trails, seams inside the hovering piece, isometric perspective, photographic texture, emoji, hard black shadow

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
