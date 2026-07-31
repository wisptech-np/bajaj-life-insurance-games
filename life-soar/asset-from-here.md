# Life Soar — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Life Soar is the repo's **hang-glider canyon flight simulator**: players pilot a sleek glider through golden-hour canyon drafts, collecting milestone rings and avoiding rocky crags.

| Axis | Life Soar's answer |
|---|---|
| Motif | Golden-hour canyon flight over rivers toward life milestones. |
| Shape language | **Sleek aerodynamic wings, curved canyon crags, glowing circular milestone rings.** |
| Camera | Side-scrolling 3/4 flight elevation. |
| Signature accent | **Glider Wing Gold `#FFB800`** & **Electric Cyan `#00A3E0`**. |
| Hazard colour | **Crimson Crag `#DC2626`**. |
| Brand anchors | Blue `#003DA6`, Orange `#F26522`, Green `#28A745`. |
| Deep values | Twilight Canyon `#1E1B4B`, Deep Sky `#0F172A`. |

Two hard technical rules, because the game post-processes these files at runtime:

1. **Glider sprite must be horizontally centred and tilted slightly upward (5 to 10 degrees).**
2. Parallax background layers must tile seamlessly along the X axis.

---

### bg-canyon-parallax — the scrolling world behind the glider (3 layers, export separately)
- **Size:** 2400×1320 px each layer, seamless horizontal tile (left edge must match right edge), transparent PNG for layers 2 and 3, opaque for layer 1
- **Prompt:** Create a polished mobile-game background of a twilight canyon ridgeline seen from the air, delivered as three separate seamlessly-tiling parallax layers — a far layer of soft flat indigo mesa silhouettes at 25% contrast, a mid layer of sharper slate ridge teeth with thin engraved contour lines tracing their slopes, and a near layer of dark foreground crag edges. Use flat vector aviation-chart art with crisp geometry, no outlines, no gradients inside shapes except one long vertical wash per layer, and a single warm rim-light striking every ridge crest from the low horizon on the right. Vertical colour wash runs canyon slate (#0A172E) at the top through twilight indigo (#0E2B5E) and sky steel (#3B8DD4) to horizon amber (#FF9E59) along the bottom eighth only. Scatter a few thin horizontal wind streaks and three faint dashed altitude reference lines across the far layer. The composition must be empty through the middle horizontal band so gameplay stays readable. Export-ready game asset, seamless tile, 2400×1320 PNG per layer.
- **Negative:** text, watermark, photographic rock texture, realistic clouds, lens flare, birds, trees, buildings, characters, drop shadow, visible tiling seam, busy detail in the middle band, emoji

### player-glider — the flier the player controls, drawn every frame at ~52×34 px
- **Size:** 512×512 px, transparent PNG, subject occupying ~80% of frame, side profile facing right
- **Prompt:** Create a polished mobile-game asset of a sleek single-seat hang glider seen in exact side profile facing right, wing swept into one long tapered triangular wedge with a razor-thin trailing edge, a compact pilot tucked prone in a slate harness beneath it, and a slim control bar triangle below. Use flat vector aviation-chart art: crisp geometry, no outlines, one soft rim-light along the top surface of the wing from the upper right, and three thin engraved chord lines running spanwise across the sail. Wing upper surface brand blue (#003DA6) fading to sky steel (#3B8DD4) at the tip, a single bold orange (#F26522) chevron stripe two-thirds along the span, white leading edge, canyon slate (#0A172E) harness and pilot, amber (#FF9E59) helmet dot. Silhouette must stay instantly readable when scaled down to 52 px wide. Transparent background. Export-ready game asset, 512×512 PNG.
- **Negative:** text, watermark, realistic photo, 3D render, cartoon black outlines, motion blur, propellers, engine, parachute canopy, front or three-quarter view, drop shadow, emoji

### hazard-crag-down — crimson spike hanging from the canyon ceiling
- **Size:** 256×384 px, transparent PNG, tip pointing straight down, base flush with the top edge
- **Prompt:** Create a polished mobile-game asset of a hostile downward-pointing rock crag, a narrow isosceles wedge whose base spans the top edge of the frame and whose needle tip reaches the bottom. Use flat vector aviation-chart art with faceted planar shading — two flat facets only, a lit left face and a shadowed right face — plus two thin engraved contour lines chasing the taper. Lit face hazard crimson (#B91C1C), shadow face deep maroon, a bright coral highlight along the leading ridge, and a narrow canyon slate (#0A172E) collar where the crag meets the ceiling. The tip must read as sharp and dangerous at 32 px wide. Transparent background. Export-ready game asset, 256×384 PNG.
- **Negative:** text, watermark, photographic stone texture, moss, icicle sparkle, blood, cartoon outlines, soft airbrush gradients, drop shadow, emoji

### hazard-crag-up — crimson spike rising from the canyon floor
- **Size:** 256×384 px, transparent PNG, tip pointing straight up, base flush with the bottom edge
- **Prompt:** Create a polished mobile-game asset of a hostile upward-pointing rock crag, a narrow isosceles wedge rooted along the bottom edge of the frame with its needle tip at the top, drawn as the vertical mirror of a ceiling crag but with the lit facet on the right so the light direction stays consistent with a low horizon sun. Use flat vector aviation-chart art with exactly two flat facets, one thin coral ridge highlight, and two engraved contour lines. Lit facet hazard crimson (#B91C1C), shadow facet deep maroon, canyon slate (#0A172E) root collar. Transparent background. Export-ready game asset, 256×384 PNG.
- **Negative:** text, watermark, photographic stone texture, stalagmite drips, sparkle, cartoon outlines, soft airbrush gradients, drop shadow, emoji

### hazard-lapse-burr — the bobbing mid-air hazard that drifts across the flight channel
- **Size:** 384×384 px, transparent PNG, centred, radially symmetric
- **Prompt:** Create a polished mobile-game asset of a hovering hazard mote representing a lapsed policy — a small hard-edged faceted core ringed by eight straight radiating needles with tiny blunt caps, like a caltrop drawn as a navigation warning symbol. Use flat vector aviation-chart art: the core built from six flat facets with no gradient blending, needles as clean straight tapered lines, and a single thin concentric warning ring at 70% radius. Core lit facets moss green (#28A745) shading to deep forest on the shadow side, needles the same green with hazard crimson (#B91C1C) tips, warning ring pale mint at 40% opacity. Must read as "do not touch" at 28 px wide. Transparent background. Export-ready game asset, 384×384 PNG.
- **Negative:** text, watermark, biological virus imagery, slime, eyes, face, tentacles, realistic microscope photo, glow bloom, cartoon outlines, drop shadow, emoji

### pickup-wealth-coin — the ₹ coin collected in three-piece clusters
- **Size:** 256×256 px, transparent PNG, centred, flat-on face view
- **Prompt:** Create a polished mobile-game asset of a wealth token coin viewed flat-on: a clean circular disc with a raised inner rim, a milled edge suggested by twelve short radial ticks, and a bold engraved Indian rupee sign occupying the centre. Use flat vector aviation-chart art — flat fills, one crisp specular crescent at the upper left, no airbrushing. Disc face wealth gold (#FACC15) with a warmer amber ring toward the rim, engraved rupee mark and milled ticks in dark bronze, specular crescent pale cream. Silhouette stays a perfect circle so a cluster of three reads cleanly at 20 px each. Transparent background. Export-ready game asset, 256×256 PNG.
- **Negative:** text other than the rupee sign, watermark, dollar or euro symbol, realistic metal photo, heavy bloom, spinning motion blur, cartoon outlines, drop shadow, emoji

### pickup-protection-shield — the one-hit shield token
- **Size:** 256×288 px, transparent PNG, centred, front view
- **Prompt:** Create a polished mobile-game asset of a protection token shaped as a broad-shouldered heater shield with a flat top edge and a pointed base, split down the centre line into a lit left half and a shadowed right half, with a slim upright cross inscribed in the middle and a thin bevelled border following the outline. Use flat vector aviation-chart art with flat fills and one hard highlight streak across the upper left shoulder. Lit half sky steel (#3B8DD4), shadow half brand blue (#003DA6), bevel border pale ice blue, inscribed cross white at 80% opacity. Must stay legible as a shield silhouette at 24 px tall. Transparent background. Export-ready game asset, 256×288 PNG.
- **Negative:** text, watermark, heraldic crest, lion, sword, rivets, realistic metal photo, glow bloom, cartoon outlines, drop shadow, emoji

### milestone-gate — the life-stage marker the glider passes at 200/500/900/1400/2000 m
- **Size:** 512×768 px, transparent PNG, vertical, bottom-anchored
- **Prompt:** Create a polished mobile-game asset of a slim canyon marker post standing vertically: a thin tapered mast with a small triangular pennant flying to the right at the top, three stacked chevrons climbing the mast, and a narrow horizontal base plate. Use flat vector aviation-chart art with flat fills, a single rim-light down the right edge of the mast, and a dashed vertical guide line running the full height behind the mast at 20% opacity to signal a checkpoint plane. Mast and base plate canyon slate (#0A172E) with a sky steel (#3B8DD4) rim-light, pennant orange (#F26522), chevrons white, dashed guide line white at low opacity. Deliver the pennant on a separate layer so its colour can be swapped per life stage. Transparent background. Export-ready game asset, 512×768 PNG.
- **Negative:** text, watermark, numbers, flag of any country, rope, realistic wood or metal texture, cartoon outlines, drop shadow, emoji

### fx-thermal-trail — the particle puff spawned behind the glider while diving and soaring
- **Size:** 128×128 px, transparent PNG, single sprite, centred
- **Prompt:** Create a polished mobile-game particle sprite of a single soft airflow wisp: an elongated lens shape tapering to a fine point at the trailing left end, filled with a smooth radial falloff from a solid core to fully transparent at the edge, with no hard rim. Use flat vector aviation-chart art restricted to one hue plus alpha. Deliver two colour variants of the same shape — one in orange (#F26522) for the dive trail and one in pure white for the soar trail. Must tint cleanly when multiplied by an arbitrary colour and must look correct when many copies overlap at varying opacity. Transparent background. Export-ready game asset, 128×128 PNG per variant.
- **Negative:** text, watermark, hard outline, star or sparkle shape, smoke photography, visible square edges, banding in the alpha falloff, drop shadow, emoji

### hud-icon-set — the four glyphs in the top status chips
- **Size:** 128×128 px each, transparent PNG, four separate files on a shared 96 px optical grid
- **Prompt:** Create a set of four matching polished mobile-game HUD glyphs sharing one 96 px optical grid, one stroke weight and one corner radius: (1) DISTANCE — three stacked rightward chevrons of decreasing size suggesting forward progress; (2) WEALTH — a small rupee sign inside a circle; (3) SHIELD — a compact heater-shield outline with a tick mark inside; (4) TIME — a circle with two hands and four minute ticks at the quarters. Use flat vector aviation-chart art drawn as clean 8 px strokes with flat caps, no fills except where noted, and no interior detail beyond what is listed. All four in pure white so the game can tint them per state, each perfectly centred with 12 px padding, each legible at 18 px. Transparent background. Export-ready game asset, four 128×128 PNG files.
- **Negative:** text, watermark, colour, gradients, varying stroke weights between icons, rounded-cartoon styling, badge backgrounds, drop shadow, emoji

### ui-hold-band — the full-width touch band at the bottom of the play area, pressed state
- **Size:** 860×112 px, transparent PNG, horizontally tileable in the centre
- **Prompt:** Create a polished mobile-game UI asset of a wide full-width input band for a hold-to-dive control, shown in its active pressed state: a horizontal bar with a bright 4 px top rule, a vertical wash fading from strong at the bottom edge to fully transparent at the top, and two shallow inward-pointing chevrons at the far left and far right hinting that the entire width is tappable. Use flat vector aviation-chart art with a smooth alpha falloff and no texture. Top rule pale amber (#FF9E59), wash orange (#F26522) at 70% opacity at the bottom fading to zero, chevrons white at 60% opacity. The centre 60% of the width must tile seamlessly so the band can stretch to any phone width. Transparent background. Export-ready game asset, 860×112 PNG.
- **Negative:** text, watermark, button bevels, skeuomorphic gloss, rounded pill shape, icons, borders on the left or right edge, drop shadow, emoji

### result-summit-art — the hero illustration on the score screen
- **Size:** 1080×720 px, transparent PNG, subject centred with generous headroom
- **Prompt:** Create a polished mobile-game illustration of the hang glider cresting the final ridge at dawn, seen in wide side profile from a distance: the glider small and high in the upper third banking gently upward to the right, a long ribbon of dashed climb-line arcing behind it from the lower left, and a low layered ridgeline occupying only the bottom fifth of the frame. Use flat vector aviation-chart art with flat fills, engraved contour lines on the ridges, and one broad soft sunburst wedge rising from behind the ridge on the right. Glider in brand blue (#003DA6) with an orange (#F26522) chevron, climb-line white at 40% opacity, ridges canyon slate (#0A172E) and twilight indigo (#0E2B5E), sunburst wedge horizon amber (#FF9E59) fading to transparent. Leave the central area uncluttered so a score ring can sit on top. Transparent background. Export-ready game asset, 1080×720 PNG.
- **Negative:** text, watermark, numbers, confetti, trophy, medal, podium, crowd, realistic photo, sun disc with a face, lens flare, drop shadow, emoji

---

## Replacement checklist

| Prompt id | Replaces |
|---|---|
| `player-glider / LS-01` | `src/hang_glider.png / LifeSoarGame.jsx` |
| `bg-canyon-parallax / LS-02` | `src/canyon_bg.png (SVG/WebP) / LifeSoarGame.jsx` |
| `ring-milestone / LS-03` | `src/checkpoint_ring.png / LifeSoarGame.jsx` |
| `hazard-crag-down` | `canvas drawObstacles()` |
| `ls-results-art` | `src/Screens.jsx ResultsScreen` |

The game engine dynamically binds these assets at runtime, with fallback to procedural SVG/canvas rendering.
