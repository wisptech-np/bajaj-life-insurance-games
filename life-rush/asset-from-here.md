# Life Rush — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Life Rush is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Life Rush's answer |
|---|---|
| Motif | Life Rush gameplay theme & visual style. |
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

### bg-stage-card — the microgame stage every scene is played on
- **Size:** 1080×1620 px, 2:3 portrait, opaque PNG
- **Prompt:** Create a flat front-on background plate for a fast microgame collection that reads as a tiny paper-theatre stage: a vertical gradient from `#0D1A33` at the top through `#0A1E42` to `#061229` at the bottom, with a single soft warm pool of overhead lamp light landing in the middle third, a barely-visible dark velvet weave texture at 4% opacity, and a faint horizontal seam low in the frame where the stage floor meets the backdrop. Leave the top strip clean for a command banner and a life counter. Utterly plain otherwise — no props, no characters, no pattern, nothing that survives being looked at for two seconds.
- **Negative:** text, numbers, logos, watermark, curtains, spotlights, stage lights, props, characters, isometric or three-quarter view, sharp texture, bright colours

### banner-command-strip — the full-width slab the command word slams onto
- **Size:** 1024×192 px, 16:3 landscape, transparent PNG
- **Prompt:** Create a flat paper-cut asset of a bold command banner slab for a microgame collection: a wide rounded-corner strip cut from saturated orange `#F26522` cardstock, with a narrower lighter `#FF8A3D` strip layered behind it and offset 3 px down and right so a sliver shows along two edges, and a torn-fibre edge along the bottom cut. Completely empty — the game types the command word onto it at runtime, so leave the middle clean. Slight tilt of about 1 degree so it feels slammed down rather than placed. Transparent above and below the slab.
- **Negative:** text, lettering, words, exclamation marks, watermark, gloss, bevel, drop shadow blur, gradient fill, emoji, perspective, background plate

### hud-window-meter — the shrinking action-window bar
- **Size:** 1024×96 px, transparent PNG
- **Prompt:** Create a flat paper-cut HUD asset of a horizontal action-timer meter: a long rounded track cut from dark slate `#24324C` cardstock with a thin `#9FB1CC` cut edge on its upper lip, plus a separate full-length fill bar in `#FF8A3D` cardstock sized to sit inside it with 2 px of track showing all round. Deliver track and fill as two aligned elements on one transparent canvas so the fill can be scaled horizontally. Flat colour, no gradient, no glow. Crisp at 7 px bar height.
- **Negative:** text, numbers, tick marks, watermark, gloss, glow, gradient, rounded 3-D tube shading, emoji, perspective, background plate

### hud-shield-life — one of the three lives
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a flat paper-cut HUD icon of a single shield life for a microgame collection: a compact heraldic shield cut from cover blue `#1E6BE0` cardstock with a pale `#A6D0FF` shield cut one size larger layered directly behind it so a 1.5 px rim shows all around, and a small notch cut out of the top edge. Also produce the **spent** state as the same silhouette in flat `rgba(255,255,255,0.10)` with only the pale outline remaining. Flat, crisp at 18 px, centred, transparent background.
- **Negative:** text, numbers, watermark, heart, cross, gloss, bevel, glow, drop shadow, emoji, perspective, background plate

### prop-premium-card — the PAY! target
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a flat paper-cut game prop of a premium payment card for a tap microgame: a rounded rectangle cut from cover blue `#1E6BE0` cardstock, carrying a wide `#F4F7FD` paper strip near the top and two shorter `#9FB1CC` rule strips below it, with a bold circular button cut from **orange** `#F26522` cardstock layered proudly on the lower half — the button is the only orange thing in the prop and must be the first shape the eye lands on. Visible scissor edges, 3 px layer offsets, no gloss. Front-on, centred, transparent background.
- **Negative:** text, numbers, card digits, currency symbols, chip, magnetic stripe, logos, watermark, gloss, bevel, drop shadow, emoji, perspective, background plate

### prop-signature-sheet — the SIGN! swipe path
- **Size:** 640×512 px, transparent PNG
- **Prompt:** Create a flat paper-cut game prop of a policy sheet awaiting a signature for a swipe microgame: a rectangle of bright paper `#F4F7FD` cardstock with a `#CBD8EC` sheet layered a few pixels behind it to suggest a stack, two short `#CBD8EC` rule strips near the top, and across the lower third a **dashed** signature guide line in `#9FB1CC` running almost the full width with a small tick mark at each end. Leave the guide line empty — the game draws the green stroke over it. Front-on, centred, transparent background.
- **Negative:** text, handwriting, signature, letters, watermark, pen, ink blot, gloss, drop shadow, emoji, perspective, background plate

### prop-sip-jar — the GROW! hold-and-release jar
- **Size:** 512×640 px, 4:5 portrait, transparent PNG
- **Prompt:** Create a flat paper-cut game prop of a savings jar for a hold-and-release microgame: a tall rounded vessel cut from translucent-looking pale cardstock with a bold gold `#FFC845` outline strip layered around its edge, completely empty inside, and — crucially — a separate horizontal **target band** drawn as a dashed `#4ADE80` rectangle across the upper third, positioned so the fill can stop inside it. Also supply a matching solid `#FFC845` fill block sized to the jar interior. Flat, front-on, centred, transparent background.
- **Negative:** text, numbers, percentage marks, coins, currency symbols, watermark, gloss, glass reflection, liquid meniscus, drop shadow, emoji, perspective, background plate

### prop-scam-call — the SWAT! moving threat
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a flat paper-cut game prop of a scam phone call for a swipe microgame: a chunky handset silhouette cut from pressure red `#EF4444` cardstock with a lighter `#FF8B8B` layer behind it, three short curved buzz-lines cut as separate paper slivers radiating from the earpiece, and a small dark slate `#24324C` screen panel layered on the body — left blank. Aggressive angular cuts, tilted about 12 degrees so it reads as buzzing. Front-on, centred, transparent background.
- **Negative:** text, numbers, caller ID, letters, warning triangle, skull, watermark, gloss, motion blur, drop shadow, emoji, perspective, background plate

### prop-umbrella-family — the SHIELD! sustained-drag pair
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create two flat paper-cut game props on one transparent canvas for a sustained-drag microgame. **(a)** An umbrella: a wide dome cut from **orange** `#F26522` cardstock in four alternating panels with `#FF8A3D` behind, and a short slate `#24324C` handle — orange because it is the thing the finger holds. **(b)** A family group: three simple rounded paper figures of descending height cut from cover blue `#003DA6`, `#1E6BE0` and pale `#A6D0FF` cardstock, no faces, no limbs, just silhouettes standing shoulder to shoulder. Keep the two props clearly separated on the canvas. Flat, front-on.
- **Negative:** text, watermark, faces, eyes, smiles, hands, rain, puddles, gloss, drop shadow, emoji, perspective, background plate

### prop-rain-band — the pressure that judges the SHIELD! scene
- **Size:** 1024×256 px, 4:1 landscape, transparent PNG
- **Prompt:** Create a flat paper-cut effect asset of a descending wall of rain for a microgame: a horizontal band of individual paper raindrop slivers cut from pressure red `#EF4444` with a scattering in lighter `#FF8B8B`, all sheared to the same angle, denser along the top edge of the band and thinning toward the bottom. Hard-edged paper cuts, no blur, no streak gradients. Tileable left to right. Transparent above and below the band.
- **Negative:** text, watermark, clouds, lightning, blue or grey water, photographic rain, motion blur, gloss, drop shadow, emoji, perspective, seam

### prop-piggy-coin — the CATCH! / SPLIT! money props
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create two flat paper-cut game props on one transparent canvas for a money microgame. **(a)** A falling piggy bank: a rounded body cut from gold `#FFC845` cardstock with a `#9A6B08` under-layer, a small snout disc and a slot cut clean through the top. **(b)** A salary coin: a plain gold disc with a brighter `#FFE38A` rim ring layered behind. Neither carries a symbol, a number or a face. Keep the two clearly separated on the canvas. Flat, front-on, hard scissor edges.
- **Negative:** text, numbers, currency symbols, rupee or dollar mark, eyes, snout nostrils, smile, watermark, gloss, coin embossing, drop shadow, emoji, perspective, background plate

### fx-clear-burst — the mark a scene was cleared
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a flat paper-cut effect asset for clearing a microgame: a bold green `#28A745` disc with a thick white paper tick cut clean through it, ringed by eight short tapering confetti slivers in `#4ADE80` and `#FFC845` flying outward, each an individual hard-edged paper shape at a different angle. Crisp, joyful, instantly legible at 60 px. Centred, transparent background.
- **Negative:** text, words, watermark, sparkle stars, lens flare, glow, blur, gradient, drop shadow, emoji, perspective, background plate

### fx-miss-crack — the mark a scene was missed
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a flat paper-cut effect asset for failing a microgame: a red `#EF4444` disc with a jagged white paper crack tearing across it from upper-left to lower-right, the two halves offset by a few pixels as if the paper split, plus three small torn scraps in `#FF8B8B` falling away below. Hard torn-paper edges, visible fibre on the tear. Centred, transparent background.
- **Negative:** text, words, cross mark, skull, watermark, blood, gore, glow, blur, drop shadow, emoji, perspective, background plate

### card-speed-up — the interstitial between difficulty bands
- **Size:** 1024×512 px, 2:1 landscape, transparent PNG
- **Prompt:** Create a flat paper-cut interstitial card for a microgame collection ramping up in speed: a wide rounded slab cut from orange `#F26522` cardstock with a `#FF8A3D` layer offset behind it, carrying three chunky right-pointing chevrons cut from `#FFE38A` paper marching across the right half at increasing size, and four short horizontal speed slivers trailing off the left edge. Empty in the middle-left where the game will type its word. Tilted about 2 degrees. Transparent background.
- **Negative:** text, lettering, words, numbers, watermark, gloss, motion blur, glow, gradient, drop shadow, emoji, perspective, background plate

### result-rush-cleared — win art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a flat paper-cut illustration for a win screen: a small paper stage on which the blue family silhouettes stand under the orange umbrella, surrounded by a loose arc of the run's cleared props — premium card, signed sheet, filled gold jar, piggy bank — each with a small green `#28A745` tick disc pinned to its corner, and three intact blue shield lives arranged along the top. Confetti slivers in `#FFC845` and `#4ADE80` cut as individual hard-edged paper shapes. Warm, tactile, celebratory, no gloss anywhere. Centred, transparent background.
- **Negative:** text, score numbers, watermark, trophy, medal, human faces, photographic texture, glow, blur, drop shadow, perspective

### result-rush-ended — loss art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a flat paper-cut illustration for a loss screen: the same paper stage, now with the orange umbrella lying on its side, the blue family silhouettes standing in a red `#EF4444` paper rain band, an unsigned sheet and an under-filled gold jar tipped over nearby, and three **spent** shield lives along the top drawn as hollow pale outlines only. Torn-paper edges on the fallen props, a few `#FF8B8B` scraps on the floor. Sombre but still craft-warm, never grim. Centred, transparent background.
- **Negative:** text, score numbers, watermark, gore, blood, skulls, crying faces, human faces at all, photographic texture, glow, blur, perspective

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
