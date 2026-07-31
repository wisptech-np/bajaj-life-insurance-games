# Wealth Drop — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Wealth Drop is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Wealth Drop's answer |
|---|---|
| Motif | Wealth Drop gameplay theme & visual style. |
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

### wd-board-backdrop — the playfield plate behind every peg and pocket
- **Size:** 860x1300 px, portrait 2:3, opaque PNG
- **Prompt:** Create a polished mobile-game background plate of a vertical pachinko cabinet interior for a physics drop game. Use a flat vector art style with soft dimensional lighting, controlled detail and a professional casual-game finish. Show it face-on, straight down the board, with no perspective. The surface is near-black desaturated navy: #0A1220 at the top fading to #0B1526 through the middle and #050A12 at the bottom, with one very faint slate-blue glow (#28486E at about 16% strength) pooled behind the centre of the board and a strong dark vignette (#03060B) pulling the outer 30% down. Add barely-visible brushed-metal micro-texture and two thin vertical side rails in white at 7% opacity. The plate must stay dark and quiet — relative luminance under 0.015 everywhere — because bright objects are composited on top of it and must win every value comparison. Centred composition, no focal point of its own.
- **Negative:** text, watermark, logo, characters, coins, pegs, pockets, bright highlights, saturated blue, neon glow, photographic texture, sky, clouds, perspective floor, drop shadow, vignette burn-in on the centre

### wd-coin-premium — the falling premium coin (the player's money)
- **Size:** 256x256 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a thick gold premium coin seen face-on for a physics drop game. Use a flat vector art style with clean silhouettes, strong readability at 24 px, soft dimensional lighting and a professional casual-game finish. The face is a radial gradient from a pale cream core #FFF6D6 through #FFE38A to #FFC845 with a deep bronze edge #6B4A05, and a simple inset ring at 60% radius. Critical: wrap the whole disc in a hard near-black rim, #03060B, about 10% of the radius thick, and put a bright cream #FFF6D6 rim-light arc along the upper-left inside that rim. The dark rim is non-negotiable — this coin is composited over gold pocket lips and pale pegs where the gold body alone measures 1.2:1, and the rim is what keeps the silhouette readable. Centred with 8% padding. Transparent background.
- **Negative:** text, numbers, currency symbols, watermark, emoji, realistic photo, cast shadow, ground plane, sparkles, coin stack, tilted 3/4 view, soft feathered edge

### wd-peg-stud — one of the ~115 static pegs the coin bounces off
- **Size:** 128x128 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small round metal stud or nail head seen face-on for a physics drop game. Use a flat vector art style with clean silhouettes, strong readability at 8 px and a professional casual-game finish. Radial gradient from a muted steel highlight #93B4D6 at the upper-left, through a mid steel blue #3C5C82, to a dark blue #16283F at the lower-right, finished with a thin near-black #03060B contact rim. This is scenery, not a prize: keep it deliberately mid-value so it never out-shines the gold coin passing over it — the highlight must stay well below the coin's brightness. No glow, no halo, no bloom. Centred with 10% padding. Transparent background.
- **Negative:** text, watermark, glow, bloom, halo, bright white core, chrome mirror finish, sparkle, star shape, emoji, cast shadow, photographic metal

### wd-cover-peg — the blue shield peg that turns a Risk pocket from x0 into x1
- **Size:** 256x256 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a compact heraldic shield badge with a bold white checkmark for a physics drop game about insurance. Use a flat vector art style with clean silhouettes, strong readability at 20 px, soft dimensional lighting and a professional casual-game finish. Shield face is a vertical gradient from pale blue #CDE4FF at the top through brand blue #2C7BF0 to deep navy #003DA6 at the bottom; a thick white checkmark sits centred on it. This is the single most important reactable object on the board, so give it the strongest treatment on the sheet: a hard near-black #03060B outline about 10% of the width, then a pale #CDE4FF inner rim inside that, then one thin concentric pale-blue ring floating just outside the shield as a pulse marker. Face-on, centred with 10% padding. Transparent background.
- **Negative:** text, watermark, emoji, padlock, umbrella, cross, medical symbol, realistic photo, cast shadow, gradient mesh noise, 3/4 view, soft edge

### wd-pocket-goal — the neutral goal pockets (Savings x1, Education x2, Home x3)
- **Size:** 240x220 px each, transparent PNG, deliver as three colour variants
- **Prompt:** Create a polished mobile-game asset of an open-topped rectangular collection pocket seen face-on for a physics drop game. Use a flat vector art style with clean silhouettes, strong readability at 34 px wide and a professional casual-game finish. The well interior is almost black, #04080E, so anything landing in it is the brightest thing in frame; the top edge carries one saturated colour lip bar about 18% of the height. Deliver three variants distinguished only by the lip and its matching inner glow: Savings in dusty blue #547FAE with a #BBD6F0 highlight, Education in teal #1FA8B8 with a #6FE3F0 highlight, Home in brand blue #1E6BE0 with a #A8C8FF highlight. Rounded top corners tight, bottom corners generous. Outline the whole pocket twice — a 2.4 px near-black #03060B rim first, then a 1 px white rim at 26% opacity over it — so the pocket silhouette survives sitting on either the lit centre or the vignetted edge of the board. Face-on, no perspective. Transparent background.
- **Negative:** text, numbers, multiplier labels, watermark, coins inside, emoji, wood texture, basket weave, 3/4 view, cast shadow, bright interior fill

### wd-pocket-risk — the two Market Risk x0 pockets, the only hazard on the board
- **Size:** 240x220 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of an open-topped rectangular collection pocket rendered as a hazard for a physics drop game. Use a flat vector art style with clean silhouettes, strong readability at 34 px wide and a professional casual-game finish. Same construction as the neutral pockets but the interior is a deep oxblood gradient — #7A1414 at 62% down to #2C0606 — with a saturated #EF4444 lip bar across the top and a pale #FFA8A8 outline. Keep the interior dark enough that pale red type placed on it later still reads at 4.5:1; do not let the red fill get bright or milky. Add two small angular warning notches in the lip corners as the only ornament. Outline the whole pocket with a 2.4 px near-black #03060B rim first, then the pale red rim over it. Face-on, no perspective. Transparent background.
- **Negative:** text, numbers, skull, warning triangle, hazard stripes, flames, watermark, emoji, bright red fill, pink, cast shadow, 3/4 view

### wd-pocket-jackpot — the two Retirement x5 pockets that sit just beyond the risk band
- **Size:** 240x220 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a premium open-topped collection pocket for a physics drop game, the richest pocket on the board. Use a flat vector art style with clean silhouettes, strong readability at 34 px wide and a professional casual-game finish. Interior almost black #04080E, a thick gold lip bar gradient #FFD75E to #E0A21C across the top, and a faint gold inner glow washing the top third of the well. Two small chamfered gold corner brackets at the mouth mark it as the jackpot. Because the gold coin lands in this pocket and gold-on-gold measures 1.22:1, the lip must be separated from everything by a 2.4 px near-black #03060B rim before any bright edge is drawn. Face-on, no perspective. Transparent background.
- **Negative:** text, numbers, crown, trophy, gems, coin pile, sparkle burst, watermark, emoji, cast shadow, 3/4 view, milky gold wash over the interior

### wd-aim-marker — the drop marker the player drags along the top rail
- **Size:** 192x192 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a downward-pointing release marker — a rounded shoulder tapering to a point at the bottom, with a white dot inset near the top — for a physics drop game. Use a flat vector art style with clean silhouettes, strong readability at 18 px and a professional casual-game finish. Vertical gradient from #FFB07A at the top to brand orange #F26522 at the bottom, a pure white inset dot, and a 1.8 px near-black #03060B outline all round. Orange is reserved in this game for the player's own hand, so nothing else on the sheet may use it. Face-on, centred, 12% padding. Transparent background.
- **Negative:** text, watermark, cursor arrow, mouse pointer, hand, emoji, glow, motion blur, cast shadow, 3/4 view, red or yellow tint

### wd-hud-icons — the four HUD glyphs (payout, clock, target, shield)
- **Size:** 96x96 px each, transparent PNG, deliver as a set of four
- **Prompt:** Create a set of four polished mobile-game HUD glyphs for a physics drop game, drawn as one consistent family. Use a flat vector art style with clean silhouettes, strong readability at 14 px, uniform 2.4 px stroke weight and a professional casual-game finish. The four are: a rupee-marked gold coin disc in #FFC845 with a #03060B rim; a simple clock outline in pale slate #B7C6DA; a concentric target ring with a filled centre in green #5CE68F; a shield outline in pale blue #CDE4FF. All four are meaningful icons drawn over a dark glass chip, so each must hold at least 3:1 against #14181F — keep every stroke light and unbroken, no fills below 60% value. Square canvas, centred, 14% padding, no baseplate. Transparent background.
- **Negative:** text, numbers, watermark, emoji, filled circular badge behind the icon, gradient strokes, thin hairlines, drop shadow, skeuomorphic bevel, colour outside the four named hues

### wd-result-win — the "target beaten" mark on the results screen
- **Size:** 512x512 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration of a gold premium coin resting inside an open goal pocket with a green completion ring sweeping around both, for a physics drop game about market volatility. Use a flat vector art style with clean silhouettes, soft dimensional lighting, controlled detail and a professional casual-game finish. Coin in #FFC845 with a #FFF6D6 rim-light and a near-black #03060B rim; pocket well in #04080E with a gold #FFD75E lip; completion ring in #5CE68F, 12 px stroke, three-quarters closed, with a small pale-blue #CDE4FF shield badge tucked at the ring's lower-left to say the win was covered. Composition centred on a transparent field, no backing plate. Every element separated from its neighbour by a dark rim so the whole mark reads at 120 px.
- **Negative:** text, numbers, watermark, confetti, fireworks, starburst, trophy cup, thumbs up, human hands, emoji, realistic photo, cast shadow, background plate

### wd-result-short — the "short of target" mark on the results screen
- **Size:** 512x512 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration of a payout curve that stopped under a dashed target line, for a physics drop game about market volatility. Use a flat vector art style with clean silhouettes, controlled detail and a professional casual-game finish. A dashed horizontal target line in pale slate #B7C6DA across the upper third, a jagged volatility polyline in muted amber #E0A21C rising and falling below it, and one gold coin #FFC845 sitting at the end of the curve, clearly below the line, with a near-black #03060B rim. Add two small red #EF4444 pocket lips at the base to name the cause. Read must be "close, not catastrophic": no downward red arrow, no crash imagery. Centred on a transparent field, no backing plate, readable at 120 px.
- **Negative:** text, numbers, percentage signs, watermark, red down arrow, crash graph, broken glass, sad face, emoji, realistic photo, cast shadow, background plate

### wd-payout-spark — the particle sprite the engine sprays on a scoring landing
- **Size:** 64x64 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game particle sprite of a single soft-edged rounded spark for a physics drop game. Use a flat vector art style with a professional casual-game finish. One filled disc with a slightly brighter core and a quick falloff, drawn in pure white so the engine can tint it per pocket (gold #FFE38A, cover blue #CDE4FF, teal #6FE3F0, risk red #FFA8A8). No rim on this one — it is the only asset on the sheet that is allowed to be rimless, because it is additive-blended over a near-black backdrop and always wins its value comparison. Centred, 20% padding. Transparent background.
- **Negative:** text, watermark, star points, cross flare, lens flare, streak, motion trail, coloured tint, hard outline, emoji

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
