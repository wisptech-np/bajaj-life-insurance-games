# Wealth Merge — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Wealth Merge is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Wealth Merge's answer |
|---|---|
| Motif | Wealth Merge gameplay theme & visual style. |
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

### wmg-bg-night — the background behind the jar
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of a still bioluminescent night for a drop-and-merge jar game, seen straight on with no perspective. Deep vertical gradient from midnight navy (#08152F) at the top through ocean blue (#0C2A57) to near-black (#061229) at the bottom, with a soft cool bloom (#1E6BE0 at 24% opacity) behind the upper centre and a warm amber bloom (#B07B12 at 24% opacity) rising from the lower edge. Scatter twelve tiny out-of-focus luminous motes of varying blur across the frame, plus three very faint concentric caustic ripple rings low in the composition as if light is passing through water. Everything is soft, wet and glowing from within — no hard edges anywhere. Keep the central vertical band clear and low-contrast for gameplay sprites.
- **Negative:** text, watermark, stars as sharp points, constellations, moon, realistic photo, hard vector shapes, emoji, drop shadow, buildings, characters, flat colour blocks

### wmg-jar — the glass jar the tokens fall into
- **Size:** 1024×1280 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a tall hand-blown glass apothecary jar seen straight on with no perspective, for a drop-and-merge game. The jar is open at the top, has softly rounded lower corners and a slightly thickened base, and is rendered as genuinely translucent glass: a pale blue-white rim light (#BEDCFF) running down both walls and along the floor, a faint interior tint (#5FA8FF at 6% opacity), two soft vertical specular streaks on the left wall, and a visible meniscus curve where the wall meets the floor. The interior must be almost fully transparent so tokens read clearly through it. No lid, no cork, no label, nothing inside.
- **Negative:** text, lettering, label, watermark, cork, lid, liquid, bubbles, realistic glass photo, hard vector outline, emoji, drop shadow, perspective tilt, table surface, reflections of a room

### wmg-tier-sheet — all eight wealth tokens as one consistent ladder
- **Size:** 2048×1024 px, one row of eight, transparent PNG
- **Prompt:** Create a polished mobile-game asset sheet of eight hand-blown glass marble tokens in a single horizontal row for a drop-and-merge wealth game, each seen straight on, each visibly larger than the one to its left in a smooth progression from small to large. Every token is a translucent glass sphere lit from within, with a soft upper-left catch-light, a warm bounce glow along the lower-right inner wall, and its emblem suspended inside the glass rather than printed on the surface. In order: (1) a small pale-gold sphere (#FFD25E) holding a single coin disc, (2) a gold sphere (#FFC845) holding three stacked discs, (3) an amber sphere (#F2A93B) holding a rounded bar, (4) an orange sphere (#FF8A3D) holding a plump piggy form, (5) a green sphere (#4ADE80) holding a small jar shape, (6) a blue sphere (#5FA8FF) holding a rounded shield, (7) a burnt-orange sphere (#F26522) holding a simple house form, (8) a large radiant sphere with a bright inner corona holding a soft starburst. Even spacing, consistent lighting across all eight. Transparent background.
- **Negative:** text, lettering, numerals, tier numbers, currency symbols, watermark, opaque flat circles, realistic marble photo, hard vector outline, emoji, drop shadow, faces, sparkle stars, borders between tokens

### wmg-token-corpus — the tier-8 Retirement Corpus, the win condition
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of the largest and most valuable glass token for a drop-and-merge wealth game, seen straight on. A big hand-blown sphere of pale gold glass with a genuinely luminous core — a soft warm corona (#FFE38A) glowing outward from the centre, fading through gold (#FFC845) to a deep amber (#B07B12) meniscus at the lower-right inner wall, with a crisp upper-left catch-light and two fine refraction arcs inside the glass. A gentle six-point light bloom radiates just past the sphere's edge. It must read as the end of a ladder — obviously more alive than any smaller token. Transparent background.
- **Negative:** text, lettering, numerals, watermark, hard vector rays, lens flare cross, realistic photo, emoji, drop shadow, crown, trophy, coins spilling, sparkle stars

### wmg-merge-burst — the ring that fires at a merge contact point
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game effect asset of a merge shockwave for a drop-and-merge glass game. A single expanding soft-edged ring of pale gold light (#FFE38A) that is brightest at its inner edge and dissolves outward into transparency, with six small teardrop light motes trailing just outside the ring at irregular intervals and a faint secondary ring at 60% radius. Entirely made of light and refraction — no particles that look solid, no debris, no sparks. Transparent background.
- **Negative:** text, watermark, solid particles, glass shards, debris, sparks, fire, hard vector ring, realistic photo, emoji, drop shadow, star shapes, smoke

### wmg-chain-glyph — the chain-multiplier indicator
- **Size:** 384×512 px, tall, transparent PNG
- **Prompt:** Create a polished mobile-game HUD effect of a chain-multiplier indicator for a drop-and-merge game: three softly glowing chevrons stacked vertically and pointing upward, the lowest largest and dimmest and the topmost smallest and brightest, each drawn as a rounded stroke of luminous mint green (#4ADE80) with a soft outer glow and no hard edge. A faint vertical light trail links them. Made of light, matching a bioluminescent glass world. Transparent background.
- **Negative:** text, lettering, numbers, multiplication sign, watermark, hard vector arrows, realistic photo, emoji, drop shadow, lightning bolt, flames, solid fill

### wmg-danger-line — the overflow line across the jar mouth
- **Size:** 1024×128 px, wide strip, transparent PNG
- **Prompt:** Create a polished mobile-game HUD asset of a horizontal overflow warning line for a glass-jar game. A dashed rule of soft-edged glowing red light (#EF4444) with rounded dash caps, each dash haloed in paler coral (#FF8B8B) so the whole line reads as a light beam suspended in the jar rather than a painted stroke, and a gentle red wash bleeding a short distance upward from the line and fading to nothing. No arrows, no symbols, no end caps.
- **Negative:** text, lettering, numbers, watermark, warning triangle, hazard stripes, arrows, hard vector dashes, realistic photo, emoji, drop shadow, chain, rope, tape

### wmg-drop-guide — the aim guide under the token being dropped
- **Size:** 128×1024 px, tall, transparent PNG
- **Prompt:** Create a polished mobile-game HUD asset of a vertical drop guide for a jar game. A soft column of pale white-blue light (#BEDCFF) broken into evenly spaced rounded dashes that grow progressively fainter toward the bottom of the column, each dash slightly blurred so the whole guide reads as light passing through glass. A small soft landing halo sits at the very bottom of the column. No arrowhead, no solid line.
- **Negative:** text, watermark, arrowhead, hard vector dashes, laser beam, realistic photo, emoji, drop shadow, solid line, crosshair, ruler ticks

### wmg-hud-next — the next-token preview HUD frame
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD asset of a preview socket for a glass-token game: a softly glowing rounded-square well made of frosted blue glass (#5FA8FF at 14% opacity) with a pale luminous rim (#BEDCFF), a slightly concave interior that catches a soft floor highlight, and four tiny light motes drifting at its corners. The centre must be empty so a token sprite drops into it. Wet, glassy, glowing from within. Transparent background.
- **Negative:** text, lettering, watermark, hard vector frame, metal, rivets, realistic photo, emoji, drop shadow, filled centre, brackets, arrows

### wmg-hud-timer — the session-clock HUD icon
- **Size:** 192×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a glass sand-timer for a drop-and-merge game: a small hand-blown hourglass form in translucent blue glass (#5FA8FF) with a pale luminous rim (#BEDCFF), holding a soft warm gold (#FFC845) glow in its lower bulb and a thin falling thread of light between the bulbs. Everything lit from within, soft-edged, readable at 20 px. Straight-on view, transparent background.
- **Negative:** text, lettering, numbers, watermark, wooden frame, metal caps, sand grains, hard vector outline, realistic photo, emoji, drop shadow, clock face, hands

### wmg-result-corpus — the win-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the victory screen of a drop-and-merge glass game: the large radiant Retirement Corpus token resting at the bottom of the hand-blown glass jar, its inner corona lighting the jar walls from inside and throwing two soft caustic ring highlights onto the glass floor. Four smaller glass tokens in gold, amber, green and blue nestle around it, each catching a little of the corona and refracting it. A gentle warm bloom fills the upper jar. Everything translucent and lit from within, no external light source. Transparent background outside the jar.
- **Negative:** text, lettering, numbers, watermark, trophy, medal, confetti, fireworks, hard vector shapes, realistic photo, emoji, drop shadow, hands, human figures, currency symbols

### wmg-result-overflow — the loss-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the game-over screen of a drop-and-merge glass game: the hand-blown jar packed to its mouth with small unmerged glass tokens in gold, amber and pale blue, three of them pushed up past a dashed red light line (#EF4444) that glows across the jar's throat and washes the topmost tokens in coral (#FF8B8B). The tokens' inner lights are dim and mismatched, none of them the same size as its neighbour, so the picture reads as clutter that never consolidated. Cool, crowded and dim rather than violent. Transparent background outside the jar.
- **Negative:** text, lettering, numbers, watermark, shattered glass, cracks, spillage, fire, smoke, hard vector shapes, realistic photo, emoji, drop shadow, hands, human figures, sad face

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
