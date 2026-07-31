# Wealth Balloon — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Wealth Balloon is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Wealth Balloon's answer |
|---|---|
| Motif | Wealth Balloon gameplay theme & visual style. |
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

### wbl-bg-fairground — the gameplay background behind the balloon
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of a quiet carnival field at golden hour for a press-your-luck inflate game, built entirely as layered cut-paper collage with visible torn fibre edges and a faint paper grain. Five stacked paper layers receding upward: a deep navy card sky (#0B1221) at the top fading to a warm dusk band, a row of soft rounded paper bunting flags in muted blue and gold strung across the upper third, two low hand-cut paper hills in deep blue (#002D7A), and a cream card-stock ground strip (#F6EFE2) at the very bottom. Every layer casts one soft contact shadow onto the layer beneath. Warm raking light from the upper left. Keep the whole central area open and low-contrast — gameplay sprites live there. No tents, no crowds, no balloons.
- **Negative:** text, lettering, watermark, realistic photo, photographic paper texture close-up, emoji, harsh drop shadow, gradient mesh, people, tents, ferris wheel, balloons, clouds with faces

### wbl-balloon-calm — the envelope early in the hold (safe blue state)
- **Size:** 512×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a plump inflating balloon in its calm state for a press-your-luck game, built as layered cut-paper collage seen straight on. The envelope is a rounded teardrop cut from bright blue card (#1E6BE0) with a slightly darker blue back-layer (#003DA6) peeking out along the lower-right edge for depth, a soft hand-cut pale highlight crescent (#7FB6FF) at the upper left, visibly torn fibre along the silhouette, and a small deep-navy (#002D7A) paper knot tab at the bottom. Calm, full, unstressed. Warm light from the upper left, one soft contact shadow under the knot only. Transparent background.
- **Negative:** text, watermark, string, rope, glossy latex shine, realistic balloon photo, emoji, harsh drop shadow, face, ribbon, basket, hot-air-balloon burner

### wbl-balloon-warm — the envelope at the wobble tell (warning state)
- **Size:** 512×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of the same cut-paper balloon, now stretched and warning, for a press-your-luck game. Same collage construction but the envelope card has shifted to warm orange (#F26522) with a lighter orange back-layer (#FF8A3D), the silhouette is visibly wider and the torn fibre edge is stretched thin and frayed, three short hand-cut orange motion arcs sit just outside the left and right shoulders to read as a wobble, and two faint pale stress creases run over the surface. Tense but not yet failed. Warm light from the upper left. Transparent background.
- **Negative:** text, watermark, cracks, shards, fire, sparks, glossy latex shine, realistic photo, emoji, harsh drop shadow, face, exclamation mark

### wbl-balloon-critical — the envelope one beat before the burst
- **Size:** 512×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of the same cut-paper balloon at breaking point for a press-your-luck game. Same collage construction, now cut from alarm red card (#EF4444) with a darker red back-layer, the envelope pulled taut and almost circular, the torn fibre edge frayed into fine loose threads at the widest points, five short red wobble arcs outside the silhouette, and a hairline pale split beginning at the top of the crown. Maximum tension, still intact. Warm light from the upper left. Transparent background.
- **Negative:** text, watermark, already-burst pieces, fire, smoke, sparks, glossy latex shine, realistic photo, emoji, harsh drop shadow, face, skull

### wbl-burst — the burst effect when the threshold is met
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a paper balloon bursting for a press-your-luck game, as layered cut-paper collage on a single frame. Eight tapered shards of torn red card (#EF4444) flying outward in a radial star from a small warm orange (#FF8A3D) paper puff at the centre, each shard showing a lighter torn fibre edge along one side, plus a scatter of six tiny irregular red paper flecks in the outer ring. Read as scissor-cut paper flying apart, never as an explosion of light or fire. Warm light from the upper left. Transparent background.
- **Negative:** text, watermark, fire, flames, smoke, sparks, light rays, lens flare, realistic explosion photo, emoji, harsh drop shadow, glass shards

### wbl-term-shield — the Term Shield that absorbs the first burst
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a protective Term Shield badge for a press-your-luck game, as layered cut-paper collage seen straight on. A rounded shield cut from Bajaj blue card (#003DA6) sitting on a slightly larger pale sky-blue backing card (#7FB6FF) so a thin border shows all round, a bold check mark cut from cream card (#F6EFE2) laid across the lower half, and two small hand-cut blue radiance flakes at the upper left and upper right. Visible torn fibre edges and one soft contact shadow between the layers. Warm light from the upper left. Transparent background.
- **Negative:** text, watermark, heraldic crest, sword, crown, metallic chrome, glossy highlight, realistic photo, emoji, harsh drop shadow, lens flare, wings

### wbl-needle-drone — the needle drone that crosses the lane from round 4
- **Size:** 512×256 px, wide 2:1, transparent PNG, facing right
- **Prompt:** Create a polished mobile-game asset of a small hostile needle drone for a press-your-luck game, in strict side view facing right, built as layered cut-paper collage. A stubby rounded body cut from dark slate card (#2B3A50) with a lighter grey back-layer edge, two short flat paper rotor blades above it drawn as thin ovals, a single round red card lens (#EF4444) at the front, and a long straight pale needle spike (#F6EFE2) projecting forward from the nose. Visible torn fibre edges, one soft contact shadow beneath the body. Menacing but toy-like. Transparent background.
- **Negative:** text, watermark, realistic drone photo, camera gimbal, propeller motion blur, metallic chrome, emoji, harsh drop shadow, missiles, military markings, antenna cluster

### wbl-vault — the vault the banked value drops into
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small paper savings vault for a press-your-luck game, seen straight on, built as layered cut-paper collage. A rounded-corner box cut from green card (#28A745) on a brighter mint backing card (#4ADE80) so a rim shows all round, a dark navy paper slot cut into its upper face, a cream card-stock (#F6EFE2) dial ring at its centre with a single stubby pointer, and two small gold (#FFC845) paper corner studs. Visible torn fibre edges, one soft contact shadow beneath the box. Warm light from the upper left. Transparent background.
- **Negative:** text, lettering, numbers, currency symbols, watermark, realistic safe photo, metallic chrome, keypad, emoji, harsh drop shadow, coins spilling out, padlock

### wbl-coin — the banked value token
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a banked value token for a press-your-luck game, built as layered cut-paper collage seen straight on. A slightly irregular hand-cut disc of gold card (#FFC845) on a darker bronze backing disc (#B07B12) so a thin rim shows, with a pale gold (#FFE38A) crescent highlight at the upper left and a simple plus-sign cut out of the centre in deep bronze. Visible torn fibre along the disc edge. Warm light from the upper left, one soft contact shadow. Transparent background.
- **Negative:** text, lettering, numerals, currency symbols, rupee sign, dollar sign, watermark, metallic shine, realistic coin photo, emoji, harsh drop shadow, sparkle stars

### wbl-value-gauge — the rising value gauge beside the balloon
- **Size:** 192×768 px, tall, transparent PNG
- **Prompt:** Create a polished mobile-game HUD asset of a vertical value gauge for a press-your-luck game, built as layered cut-paper collage. An empty rounded capsule track cut from deep navy card (#0B1221) with a pale cream (#F6EFE2) hairline rim and eight small hand-cut notch marks along its right side, plus a separate matching fill column rendered alongside as a gold card (#FFC845) capsule with a pale gold (#FFE38A) highlight stripe. Render the empty track and the fill column as two aligned elements on one transparent canvas. Torn fibre edges, one soft contact shadow.
- **Negative:** text, lettering, numbers, percentage marks, watermark, glossy glass, realistic photo, emoji, harsh drop shadow, arrows, thermometer bulb

### wbl-hud-streak — the compounding-streak HUD icon
- **Size:** 192×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a compounding streak for a press-your-luck game, built as layered cut-paper collage. Three rounded paper chevrons stacked in ascending scale from lower-left to upper-right, the smallest in mint (#4ADE80), the middle in green (#28A745) and the largest in gold (#FFC845), each sitting on a slightly darker backing card so a rim shows, with visible torn fibre edges. Compact silhouette readable at 22 px. Straight-on view, transparent background.
- **Negative:** text, lettering, numbers, multiplication sign, watermark, realistic photo, glossy shine, emoji, harsh drop shadow, flames, lightning bolt, star burst

### wbl-result-vault-full — the win-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the victory screen of a press-your-luck inflate game, built as layered cut-paper collage. The green paper vault sits open in the lower centre with a generous heap of irregular gold card discs (#FFC845 with #FFE38A highlights) mounded above its slot, and three calm blue paper balloons (#1E6BE0) float upward and away on hand-cut string-free trajectories, each smaller than the last. A row of soft paper bunting flags in blue and gold arcs across the top. Warm golden-hour light from the upper left, one soft contact shadow per layer. Transparent background.
- **Negative:** text, lettering, numbers, watermark, realistic photo, emoji, harsh drop shadow, trophy, medal, fireworks, confetti streamers, human figures, currency symbols

### wbl-result-burst — the loss-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the game-over screen of a press-your-luck inflate game, built as layered cut-paper collage. Eight torn red card shards (#EF4444) settle slowly toward a cream card-stock ground strip (#F6EFE2), a single small navy paper knot tab lies alone at the centre, and the green paper vault sits closed and dim at the lower left with only two gold discs beside it. A needle drone in dark slate card hovers small in the upper right, needle still extended. Muted late light, quiet and deflated rather than violent. One soft contact shadow per layer. Transparent background.
- **Negative:** text, lettering, watermark, realistic photo, emoji, harsh drop shadow, fire, smoke, explosion light, blood, skull, human figures, tears, sad face

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
