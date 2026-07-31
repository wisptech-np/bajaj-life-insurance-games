# Wealth Carrom — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Wealth Carrom is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Wealth Carrom's answer |
|---|---|
| Motif | Wealth Carrom gameplay theme & visual style. |
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

### wcr-board — the full playfield the game is played on
- **Size:** 1024×1024 px, square, opaque PNG
- **Prompt:** Create a polished mobile-game asset of a complete premium carrom board seen from directly overhead with zero perspective, in a photoreal product-render style lit by one soft overhead studio softbox. The playfield is deep navy piano lacquer (#0E2650) with a faint depth sheen, framed by a mitred hardwood rail in darker navy lacquer (#0A1A38) with a hairline brass edge line. Inlaid into the surface in brushed brass (#FFC845): a large centre circle, a small centre spot ring, two parallel baseline rails running across the lower area with a small circle at each end, and four short diagonal arrow inlays pointing at the corners. Four circular pockets are cut at the corners, each a true black opening ringed with a brass collar. No pieces on the board, nothing else in frame.
- **Negative:** text, lettering, numbers, brand logos, watermark, perspective tilt, isometric angle, hands, powder, chalk dust, room background, emoji, harsh drop shadow, players, chairs

### wcr-coin-goal — the gold wealth coin (the goals you save toward)
- **Size:** 512×512 px, transparent PNG, dead-on from above
- **Prompt:** Create a polished mobile-game asset of a single carrom disc seen from directly overhead with zero perspective, in a photoreal product-render style under one soft overhead softbox. A turned disc with a chamfered rim, faced in warm brushed brass running from pale champagne (#FFE38A) at the upper-left catch-light through gold (#FFC845) to deep bronze (#8F6209) at the lower-right rim, with a fine concentric lathe-turning texture and a plain polished centre boss. A short, tight contact shadow sits directly beneath the rim. Transparent background.
- **Negative:** text, lettering, numerals, currency symbols, engraved words, watermark, perspective tilt, side view, emoji, long drop shadow, sparkle stars, chalk powder

### wcr-coin-queen — the Queen of Protection
- **Size:** 512×512 px, transparent PNG, dead-on from above
- **Prompt:** Create a polished mobile-game asset of the Queen carrom disc seen from directly overhead with zero perspective, in the same photoreal product-render style under one soft overhead softbox. A turned disc with a chamfered rim faced in deep crimson enamel running from bright coral (#FF7A80) at the upper-left catch-light through crimson (#E5343C) to oxblood (#7C1015) at the lower-right rim, with a raised brass (#FFE38A) five-point crown emblem inlaid flush into the centre and a thin brass rim line. Slightly larger and visibly more valuable than a plain disc. Short, tight contact shadow. Transparent background.
- **Negative:** text, lettering, numbers, watermark, perspective tilt, side view, emoji, long drop shadow, jewels, gemstones, face, portrait, glitter

### wcr-coin-risk — the dark risk disc that costs a foul
- **Size:** 512×512 px, transparent PNG, dead-on from above
- **Prompt:** Create a polished mobile-game asset of a hazard carrom disc seen from directly overhead with zero perspective, in the same photoreal product-render style under one soft overhead softbox. A turned disc faced in dark aubergine enamel (#3A3350) with a cold violet rim highlight (#B9A8F0), a matte rather than glossy centre so it reads heavier than the gold discs, and a recessed violet cross-slash mark cut into the face. Noticeably darker and lower-key than every other piece so it reads as "do not touch". Short, tight contact shadow. Transparent background.
- **Negative:** text, lettering, numbers, watermark, perspective tilt, side view, emoji, long drop shadow, skull, biohazard, spikes, flames, cracks

### wcr-striker — the striker the player flicks
- **Size:** 512×512 px, transparent PNG, dead-on from above
- **Prompt:** Create a polished mobile-game asset of a carrom striker seen from directly overhead with zero perspective, in the same photoreal product-render style under one soft overhead softbox. A wide turned disc in pearl-white acrylic running from pure white (#FFFFFF) at the upper-left catch-light through cool white (#F4F7FF) to soft blue-grey (#9FB2D6) at the lower-right chamfered rim, with a crisp concentric ring of bright orange (#F26522) enamel inlaid partway in from the edge and a small polished centre dimple. Distinctly larger than a goal disc. Short, tight contact shadow. Transparent background.
- **Negative:** text, lettering, numbers, brand logos, watermark, perspective tilt, side view, emoji, long drop shadow, cue stick, fingers, chalk

### wcr-pocket — a corner pocket, for compositing over the board
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single carrom corner pocket seen from directly overhead with zero perspective, in a photoreal product-render style. A circular opening cut through navy lacquer, ringed by a brushed brass (#FFC845) collar with a chamfered inner edge that catches a thin overhead highlight along its upper arc, and a true black interior that falls off to nothing at the centre with a faint net shadow suggested at the bottom of the opening. The outer edge of the collar is transparent so it composites cleanly onto a board. No board surface around it.
- **Negative:** text, watermark, perspective tilt, side view, visible net mesh detail, emoji, long drop shadow, coins inside, wood grain background, room reflections

### wcr-aim-ray — the dashed aim line drawn from the striker
- **Size:** 128×768 px, tall, transparent PNG
- **Prompt:** Create a polished mobile-game HUD asset of a straight dashed aiming ray for a top-down flick game, drawn vertically. Evenly spaced rounded dashes in bright orange (#FF8A3D), each dash slightly shorter and more transparent than the one below it so the ray fades toward its far end, with a small hollow orange target ring at the top tip. Crisp and graphic — a UI overlay, not a physical object, so no material, no reflection, no shadow. Transparent background.
- **Negative:** text, watermark, arrowhead, glow bloom, laser beam haze, realistic photo, emoji, drop shadow, solid line, curved path, crosshair reticle

### wcr-power-ring — the power meter ring around the striker
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD asset of a circular power ring that sits around a striker in a top-down flick game. A thick open ring stroke drawn as a two-thirds arc, its colour sweeping from cool orange (#FF8A3D) at the start of the arc to hot orange (#F26522) at its end, with rounded stroke caps, a fine inner hairline guide ring in translucent white, and eight small tick marks outside the arc. Hollow centre so the striker shows through. Flat graphic UI treatment, no material, no shadow. Transparent background.
- **Negative:** text, lettering, numbers, percentage marks, watermark, glow bloom, realistic photo, emoji, drop shadow, filled centre, needle, gauge face

### wcr-hud-strike — the strikes-remaining HUD icon
- **Size:** 192×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon for a top-down carrom game: a small pearl-white striker disc seen from directly overhead with its orange (#F26522) inlaid ring, drawn at icon scale with simplified material — one clean highlight, one rim shade, no lathe texture — plus a short orange motion tick to its lower right suggesting a flick. Crisp silhouette that stays readable at 22 px. Transparent background, no shadow.
- **Negative:** text, lettering, numbers, watermark, perspective tilt, realistic photo detail, emoji, drop shadow, hand, finger, cue

### wcr-hud-foul — the foul-count HUD pip
- **Size:** 192×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD pip for a top-down carrom game: a small dark aubergine (#3A3350) disc seen from directly overhead with a cold violet (#B9A8F0) rim and a recessed violet cross-slash cut into the face, drawn at icon scale with simplified material. It must read as a penalty at a glance and must not resemble a heart or a life. Readable at 18 px. Transparent background, no shadow.
- **Negative:** text, lettering, numbers, watermark, heart shape, skull, realistic photo detail, emoji, drop shadow, blood, flames, warning triangle

### wcr-result-covered — the win-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the victory screen of a top-down carrom game, in the same photoreal product-render style under one soft overhead softbox, seen from directly above. The crimson Queen disc rests inside a brass-collared corner pocket with a single gold disc lying beside her right at the pocket mouth — the cover, completed. Five more gold discs are arranged in a loose overlapping stack to the lower left, and a slim brushed-brass ring encircles the whole group like a completed set. Warm brass catch-lights, short tight contact shadows. Transparent background.
- **Negative:** text, lettering, numbers, watermark, perspective tilt, emoji, long drop shadow, trophy, medal, confetti, fireworks, hands, human figures, currency symbols

### wcr-result-uncovered — the loss-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the game-over screen of a top-down carrom game, in the same photoreal product-render style under one soft overhead softbox, seen from directly above. The crimson Queen disc sits back on the brass centre-spot inlay, alone and un-pocketed, her crown catch-light dimmed; two dark aubergine risk discs lie close on either side of her, and the pearl striker rests stalled at the lower edge with a faded dashed aim ray still pointing past the Queen and missing. One gold disc lies far off to the corner, out of reach. Cool, still, slightly under-lit — a board that ran out of strikes. Transparent background.
- **Negative:** text, lettering, numbers, watermark, perspective tilt, emoji, long drop shadow, broken pieces, fire, blood, skull, hands, human figures, tears

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
