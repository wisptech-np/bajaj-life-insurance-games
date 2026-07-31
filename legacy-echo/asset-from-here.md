# Legacy Echo — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Legacy Echo is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Legacy Echo's answer |
|---|---|
| Motif | Legacy Echo gameplay theme & visual style. |
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

### bg-vault-floor — the map backdrop behind the whole vault
- **Size:** 1024×2048 px, 1:2 portrait, opaque PNG
- **Prompt:** Create a top-down orthographic long-exposure background plate of a dark bank-vault floor for a puzzle game. Polished near-black marble in `#0B1221` with a slightly lifted central corridor band in `#101D3C` running top to bottom and darker `#0B1530` wings either side. The only light is a faint cold pool from far above the corridor and thin `#3D5EA8` specular streaks catching the veins in the stone. Add a whisper of golden light bleeding down from the very top edge, where the family vault will sit. Everything soft, low-contrast, unfocused — this plate must sit far behind glowing sprites and never compete with them. No props, no doors, no characters, no grid.
- **Negative:** text, numbers, logos, watermark, isometric or three-quarter perspective, furniture, doors, characters, torches, warm ambient wash, sharp detail, photographic marble tile grout

### body-guardian-living — the one body the player drags
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a living guardian rendered as a light-painted orb, seen from directly overhead: a hot pale `#FFD9B8` core, a saturated orange `#F26522` body shell, and a wide soft `#FF8A3D` bloom halo falling off into transparency, with a short comet-tail smear trailing to the lower right as if caught mid-exposure. Perfectly round core, glow only — no plastic surface, no outline, no facial features, no limbs. Centred with generous padding so the halo is never clipped. Transparent background.
- **Negative:** text, watermark, face, eyes, limbs, armour, cel outline, hard shadow, cast shadow on ground, emoji, perspective, background plate

### body-echo-cyan — a recorded past self replaying beside you
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a **ghost after-image** of a guardian orb, seen from directly overhead: the same round silhouette as the living body but rendered as a translucent long-exposure smear in cyan `#4FC3F7` with a pale `#B3E5FC` core, overall opacity around 45%, doubled and offset by a few pixels so it reads as two frames of the same body caught on one exposure, and edged by faint chromatic fringing. Softer, dimmer and flatter than the living orb — it must never be mistaken for the player. Centred, generous padding, transparent background. *(Regenerate three variants swapping the hue to violet `#B39DDB`/`#E1D6FF`, amber `#FFD54F`/`#FFECB3`, rose `#F48FB1`/`#FFD3E2` — one per loop.)*
- **Negative:** text, watermark, orange or gold tones, face, eyes, skull, sheet-ghost shape, hard outline, cast shadow, emoji, perspective, background plate

### chest-policy — the objective the guardian carries to the vault
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small policy strongbox seen from directly overhead: a rounded rectangular chest in deep `#B07B12` bronze with a bright `#FFC845` lid band, a single `#FFE38A` clasp centred on the front edge, and a low warm glow leaking from the seam between lid and body as if light is trapped inside. Heavy, compact, unmistakably *carried*. Rendered dark and matte apart from that seam glow, so it reads as an object being lit rather than a light source. Centred with padding, transparent background.
- **Negative:** text, lettering, currency symbols, coins spilling, padlock, keyhole sparkle, watermark, perspective, cast shadow, emoji, photographic wood grain, background plate

### plate-pressure-idle — an unheld floor plate
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of an unpressed floor pressure plate seen from directly overhead: a shallow circular socket recessed into dark stone, a 3 px ring in desaturated slate at about 30% brightness, a dimmer inner disc, and four short alignment notches at the cardinal points. Cold, inert, unlit — the "off" state of a switch. No glow at all. Centred with padding, transparent background.
- **Negative:** text, watermark, green light, glow, bloom, arrows, footprints, cast shadow, emoji, perspective, background plate

### plate-pressure-held — the same plate with a body standing on it
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of an activated floor pressure plate seen from directly overhead: the same circular socket, now with its ring blazing in `#4ADE80` and a solid `#28A745` inner disc, throwing a soft green light-painted bloom outward across the stone and a faint upward light shaft implied by a brighter ring just inside the rim. Unambiguous "held" state, readable at a glance from the far side of a 390-wide map. Centred with padding, transparent background.
- **Negative:** text, watermark, checkmark, tick icon, arrows, sparkles, confetti, cast shadow, emoji, perspective, background plate

### door-vault-gate — the sliding gate that crosses the corridor
- **Size:** 1024×256 px, 4:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a horizontal vault gate spanning a corridor, seen from directly overhead: a heavy slab of dark blue-steel `#2C4C8F` grading to `#16264C` along its lower edge, with three recessed drive grooves running its length, chamfered ends that seat into the corridor walls, and a thin cold `#3D5EA8` rim highlight on the leading edge. Closed state, solid and opaque, no gap. Drawn so it can be scaled horizontally to zero from its left end when it opens. Transparent above and below the slab.
- **Negative:** text, numbers, watermark, hinges, handles, warning stripes, rust, glow, cast shadow, emoji, perspective, background plate

### beam-hazard — the sweeping red beam across the vault approach
- **Size:** 1024×128 px, 8:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game effect asset of a horizontal hazard beam seen from directly overhead: a narrow 12-px-equivalent core of near-white hot light along the exact centre line, wrapped in a saturated `#EF4444` band and a wide soft `#FF8B8B` falloff that fades fully to transparent top and bottom. Long-exposure look — the beam should feel *emitted*, with faint scan striations along its length and a slight bloom, not a flat red rectangle. Tileable left to right. Transparent background.
- **Negative:** text, watermark, laser emitter hardware, sparks, smoke, blue or green tones, hard edges, cast shadow, emoji, perspective, seam

### lever-twin — one of the two levers that must be flipped together
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a wall-mounted sync lever seen from directly overhead: a dark stone mounting block with a stubby brass `#B07B12` arm lying to one side, and a semicircular travel slot etched around it whose far end is marked by a small unlit `#4ADE80` dot. Cold and inert in this idle state, with only a thin `#3D5EA8` rim light on the block. Design it so a mirrored copy reads as the twin on the opposite wall. Centred, transparent background.
- **Negative:** text, watermark, hands, arrows, motion lines, glow, sparks, cast shadow, emoji, perspective, background plate

### coin-bonus — the optional pickup in the alcove
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single bonus coin seen from directly overhead as a light-painted object: a thin gold `#FFC845` disc with a brighter `#FFE38A` rim, a soft warm bloom around it, and a faint elongated glow smear beneath suggesting it is slowly bobbing during a long exposure. No embossed face, no symbol, no denomination — a pure luminous token. Centred with padding, transparent background.
- **Negative:** text, numbers, currency symbols, rupee or dollar mark, face, watermark, sparkle stars, cast shadow, emoji, perspective, stacked coins, background plate

### hud-loop-pips — the loops-remaining indicator in the HUD
- **Size:** 512×128 px, 4:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game HUD element showing five loop pips in a row for a time-loop game: each pip a small rounded capsule, the leftmost filled with warm `#FF8A3D` for the loop being lived, the next ones filled with the cool echo tints in order — cyan `#4FC3F7`, violet `#B39DDB`, amber `#FFD54F`, rose `#F48FB1` — each at reduced opacity, and unused pips left as hollow slate outlines. Flat, crisp at 16 px pip height, evenly spaced, no container plate. Transparent background.
- **Negative:** text, numbers, digits, watermark, container frame, drop shadow, gloss, gradient background, emoji, perspective

### fx-rewind-scrub — the between-loops rewind wipe
- **Size:** 1024×256 px, 4:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game transition effect of a rewind scan-wipe for a time-loop game: a horizontal band of cyan `#4FC3F7` light with a hot white leading edge at the top, trailing downward into stacked ghost repeats of itself at falling opacity — the visual language of a tape scrubbing backwards. Add faint horizontal tear striations and slight chromatic split at the edges. Fully transparent above and below the band so it can be swept across the whole screen. Tileable left to right.
- **Negative:** text, watermark, clock face, arrows, rewind triangle icon, static noise texture, orange or gold tones, cast shadow, emoji, perspective, seam

### result-vault-sealed — win art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a long-exposure light-painted illustration for a win screen, viewed from directly overhead: the gold policy chest resting inside a glowing family-vault mouth at the top, its seam light now spilling out warmly, with **four** translucent guardian after-images in cyan, violet, amber and rose frozen on lit green plates further down the frame, each still trailing the faint streak of the path it walked. The living orange orb stands at the vault mouth. Every gate along the corridor drawn open. Quiet, reverent, resolved. Centred, transparent background.
- **Negative:** text, score numbers, watermark, confetti, trophy, medal, human faces or bodies, red beam, photographic texture, hard cast shadows, perspective

### result-vault-locked — loss art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a long-exposure light-painted illustration for a loss screen, viewed from directly overhead: the gold policy chest stranded low in the corridor with its seam light almost extinguished, a heavy `#2C4C8F` vault gate still fully closed across the corridor above it, unlit slate pressure plates scattered in the wings, and only **one** faint cyan after-image dissolving mid-stride — its trail breaking up into dashes. A dim red `#EF4444` beam band crosses the upper frame. Sombre, cold, nearly monochrome apart from that red. Centred, transparent background.
- **Negative:** text, score numbers, watermark, gore, skulls, sad faces, human bodies, gold sparkle, green lit plates, photographic texture, perspective

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
