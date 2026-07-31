# Steady Wings — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Steady Wings is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Steady Wings's answer |
|---|---|
| Motif | Steady Wings gameplay theme & visual style. |
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

### sw-sky-gradient — the scrolling sky behind everything
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG, horizontally tileable
- **Prompt:** Create a polished mobile-game background of a monsoon dusk sky over a distant river gorge for a side-scrolling flight game, painted in a soft gouache style with visible brush texture and colours bleeding gently into one another. Vertical gradient from deep storm navy (#051A3A) at the top through ocean blue (#0E4F94) to a pale rain-washed teal (#2F7CBE) at the horizon. Add three receding layers of soft-edged, low-contrast gorge silhouettes across the bottom third, each paler and hazier than the one in front, and a few torn wisps of grey rain-cloud in the upper third. Leave the middle vertical band low in contrast so gameplay sprites read clearly. The left and right edges must match exactly so the image tiles horizontally with no seam. No sun, no moon, no birds, no lightning bolt.
- **Negative:** text, watermark, realistic photo, sharp vector edges, hard outlines, emoji, lens flare, sun disc, birds, aircraft, buildings, drop shadow, seam at edges

### sw-glider — the player's cover-glider
- **Size:** 512×512 px, transparent PNG, side profile facing right
- **Prompt:** Create a polished mobile-game asset of a small hand-built paper-and-canvas glider seen in strict side profile facing right, for a one-tap flight game. Painted gouache style with soft edges and visible brush grain: a tapered leaf-shaped fuselage in a warm sunset gradient from pale apricot (#FF9A55) through burnt orange (#F26922) to deep umber (#8F3208), a single swept-back canvas wing tilted slightly up, a small ice-blue (#BFE0FF) glazed cockpit bubble near the nose, and a short flame-orange tail fin below. The silhouette must read at 26 px wide. Damp, rain-lit highlight along the wing's upper edge. Transparent background, no ground shadow.
- **Negative:** text, watermark, propeller, jet engine, cockpit pilot, realistic photo, hard vector outline, emoji, drop shadow, three-quarter view, motion blur streaks

### sw-glider-covered — the glider while a cover token is active
- **Size:** 512×512 px, transparent PNG, side profile facing right
- **Prompt:** Create a polished mobile-game asset of the same small paper-and-canvas glider in side profile facing right, now wrapped in an active protective bubble, for a one-tap flight game. Same gouache glider as before (apricot #FF9A55 to umber #8F3208 fuselage, ice-blue cockpit) sitting inside a translucent watercolour sphere of pale ice-blue (#BFE0FF at 22% opacity) with a soft luminous rim in mid-blue (#3B8DD4) and three faint concentric ripple arcs suggesting the shell can take exactly one hit. The bubble edge is brushed and imperfect, never a crisp circle. Transparent background.
- **Negative:** text, watermark, hard vector circle, glass reflection highlights, realistic photo, emoji, drop shadow, cracks, sparks, energy lightning

### sw-pillar-top — the ceiling-hung expense pillar of a gate pair
- **Size:** 256×1024 px, tall 1:4 strip, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a wet basalt rock column hanging down from above, for a side-scrolling flight game, seen straight on with no perspective. Painted gouache style: an eroded, irregularly weathered stone shaft in cool blue-greys running dark at the outer edges (#16273F) through mid slate (#2C4364) to a rain-lit face (#4C6E9B), with soft horizontal strata bands and a few clinging dark moss patches. The bottom end finishes in a thick blunt cap band of weathered coral-orange rock (#F2694C) that reads as the danger edge. The top edge is flat so the column can extend upward arbitrarily. Transparent background, no ground shadow.
- **Negative:** text, watermark, stalactite icicle point, realistic rock photo, sharp vector edges, emoji, drop shadow, perspective, vines, skulls, spikes

### sw-pillar-bottom — the floor-standing expense pillar of a gate pair
- **Size:** 256×1024 px, tall 1:4 strip, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a wet basalt rock column rising up from below, for a side-scrolling flight game, seen straight on with no perspective. Painted gouache style matching its ceiling-hung twin: eroded blue-grey stone (#16273F edges, #2C4364 body, #4C6E9B rain-lit face), soft horizontal strata, a little damp moss near the base. The top end finishes in a thick blunt cap band of weathered coral-orange rock (#F2694C). The bottom edge is flat so the column can extend downward arbitrarily. Transparent background, no ground shadow.
- **Negative:** text, watermark, stalagmite point, realistic rock photo, sharp vector edges, emoji, drop shadow, perspective, vines, spikes, water splash

### sw-coin — the premium coin that sits in the gate slot
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small hammered gold premium token for a flight game, seen face-on with a slight tilt. Painted gouache style: an irregular hand-struck disc, not a perfect circle, with a warm radial fall-off from cream highlight (#FFF6D6) at the upper left through honey gold (#FFE38A) to deep bronze (#B07B12) at the lower right, a soft raised rim, and a single embossed upward chevron in the centre rendered as pure shape. Damp, rain-lit sheen along the upper edge. Transparent background, no ground shadow.
- **Negative:** text, lettering, numerals, currency symbols, rupee sign, dollar sign, watermark, realistic metal photo, sharp vector edges, emoji, drop shadow, sparkle stars

### sw-cover-token — the blue cover token that absorbs one collision
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a floating cover sigil for a flight game: a rounded shield form painted in gouache with soft brushed edges, filled with a mid-blue wash (#3B8DD4) that lightens to ice-blue (#BFE0FF) at the top, a pale hand-painted rim, and a simple white check mark brushed across its lower half. Three faint concentric halo arcs in #BFE0FF at 25% opacity drift outward behind it. Slightly imperfect, hand-made feel — never a crisp vector shield. Transparent background, no ground shadow.
- **Negative:** text, watermark, heraldic crest, sword, crown, sharp vector edges, realistic photo, emoji, drop shadow, metallic chrome, lens flare

### sw-hazard-band — the ceiling and floor kill-zone strips
- **Size:** 1024×96 px, wide strip, transparent PNG, horizontally tileable
- **Prompt:** Create a polished mobile-game asset of a horizontal danger band marking the edge of flyable sky, for a side-scrolling flight game. Painted gouache style: a deep storm-navy (#0B2B52) band of dense cloud with a torn, brushed lower contour and a thin warm coral (#F2694C) glow line running along its inner edge, fading upward into transparency. It should read as "you cannot go past this" without any symbol. Left and right edges match exactly for seamless horizontal tiling. Transparent background above the band.
- **Negative:** text, watermark, warning triangle, hazard stripes, chevrons, arrows, realistic cloud photo, sharp vector edges, emoji, drop shadow, seam at edges

### sw-hud-gate — the gates-cleared HUD icon
- **Size:** 192×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a cleared gate for a flight game: two short stubby basalt column ends facing each other from top and bottom with a clear gap between them, painted in gouache blue-greys (#2C4364 body, #4C6E9B lit face) with coral (#F2694C) cap edges, and a soft mint-green (#6EE7A2) brushed dash running horizontally through the gap. Compact, readable at 22 px. Straight-on view, transparent background.
- **Negative:** text, lettering, numbers, watermark, realistic photo, sharp vector edges, emoji, drop shadow, arrows, doorways, fences

### sw-hud-timer — the session-clock HUD icon
- **Size:** 192×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a weather-worn brass pocket barometer standing in for a flight timer, painted in gouache. A slightly oval brass case in honey gold (#FFE38A) with bronze shading (#B07B12), a pale rain-washed dial face, and a single blunt needle brushed in coral orange (#F26922) pointing up-right. Soft edges, hand-painted rim, no glass reflection. Readable at 22 px. Straight-on view, transparent background.
- **Negative:** text, lettering, numbers, tick marks with digits, watermark, realistic photo, sharp vector edges, emoji, drop shadow, hourglass, stopwatch buttons

### sw-result-updraft — the win-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the victory screen of a one-tap flight game: the small apricot-and-umber paper glider climbing steeply to the upper right on a rising column of pale warm air, painted in soft gouache with visible brush texture. Behind it, three receding hazy basalt gorge silhouettes in cool blue-grey (#2C4364 to #4C6E9B) drop away below, and a scatter of loose honey-gold (#FFE38A) coin discs trails behind the glider in a gentle arc. Warm break-in-the-clouds light from the upper right catching the wing's edge. Mood is relief and altitude. Transparent background.
- **Negative:** text, lettering, watermark, realistic photo, sharp vector edges, emoji, drop shadow, trophy, medal, fireworks, confetti, human figures, rainbow

### sw-result-grounded — the loss-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the game-over screen of a one-tap flight game: the small paper glider come to rest nose-down on a wet basalt ledge, one wing bent, painted in soft gouache. The ledge is cool blue-grey stone (#16273F to #4C6E9B) with a coral-orange (#F2694C) weathered cap edge; a thin veil of grey monsoon drizzle falls diagonally across the scene and two soft ripple rings sit in a shallow puddle beside the glider. Muted, low-contrast, quiet — disappointed rather than catastrophic. No fire, no wreckage debris. Transparent background.
- **Negative:** text, lettering, watermark, realistic photo, sharp vector edges, emoji, drop shadow, fire, smoke, explosion, shattered pieces, blood, skull, human figures

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
