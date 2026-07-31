# Perfect Premium — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Perfect Premium is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Perfect Premium's answer |
|---|---|
| Motif | Perfect Premium gameplay theme & visual style. |
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

### bg-movement-plate — the backdrop the whole timeline sits on
- **Size:** 1080×1620 px, 2:3 portrait, opaque PNG
- **Prompt:** Create a straight-on background plate for a precision timing game, rendered as the mainplate of a fine mechanical movement: deep blue-black steel graduating `#0A1E42` at the top through `#0B2450` to `#061229` at the bottom, its whole surface covered in a tight guilloché engine-turned wave pattern at only 6% contrast, with a single soft raking highlight from the upper left and four tiny countersunk screw heads at the corners. Absolutely even, no focal point, no parts, no dial, no hands — a finished but empty plate that a bar, a marker and a HUD will be mounted onto. Keep the central horizontal band quietest of all.
- **Negative:** text, numerals, brand names, watermark, gears, cogs, springs, jewels, hands, dial markings, perspective, photographic scratches, heavy vignette, warm colours

### bar-premium-track — the straight sweep bar, the game's whole playfield
- **Size:** 1024×192 px, 16:3 landscape, transparent PNG
- **Prompt:** Create a machined game asset of a horizontal premium track for a stop-the-marker timing game: a long capsule-ended channel milled into brushed steel, its interior a very dark blue-black `#061229`, its rim a polished chamfer catching one crisp `rgba(255,255,255,0.22)` specular line along the upper lip and a fainter one along the lower, with a hairline engraved scale of fine ticks running the full length inside the channel at 12% opacity. Completely empty inside — the game paints the zones. Straight-on elevation, perfectly horizontal, transparent above and below.
- **Negative:** text, numbers, scale labels, watermark, coloured zones, marker, needle, plastic finish, gloss bloom, drop shadow, perspective, background plate

### zone-safe-band — the green "premium paid" band inside the track
- **Size:** 512×192 px, transparent PNG
- **Prompt:** Create a machined game asset of a safe-zone insert for a timing track: a rounded rectangular block of vitreous enamel in on-time green `#28A745` with a lighter `#4ADE80` upper bevel and a deep `#0E5C24` lower shadow edge, seated as if press-fitted into a milled channel so its top surface sits a fraction below the surrounding rim. Even, glassy but not glossy, no texture inside. Designed to be scaled horizontally without distorting the bevels — keep the end caps compact. Transparent background.
- **Negative:** text, numbers, tick marks, watermark, gradient wash, glow, sparkles, drop shadow, plastic sheen, perspective, background plate

### zone-perfect-sliver — the gold PERFECT sliver at the band's centre
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a machined game asset of a narrow reward sliver for a precision timing game: a tall slim block of polished gold `#FFC845` with a bright `#FFE38A` mirror highlight down its left face and a deep `#B07B12` shadow down its right, standing slightly **proud** of the surface around it with a fine chamfer on every edge, and a single hairline centre-line engraved down its face. It must read as the most valuable, most precisely machined object on the screen at only a few pixels wide. Straight-on, centred, transparent background.
- **Negative:** text, numbers, star, sparkle, watermark, glow bloom, lens flare, gradient background, drop shadow, plastic, perspective

### marker-sweep-needle — the orange marker the player stops
- **Size:** 256×512 px, 1:2 portrait, transparent PNG
- **Prompt:** Create a machined game asset of a sweep indicator needle for a precision timing game: a slender vertical blade in hand orange `#F26522` with a lighter `#FF8A3D` bevel down one side, tapering very slightly toward the bottom, capped at the top by a small faceted diamond-cut pointer in `#FF8A3D`, and pivoted at its base on a tiny polished collar. Blued-steel watch-hand proportions — long, thin, confident, with a single hard specular line running its length. Straight-on, perfectly vertical, centred, transparent background.
- **Negative:** text, watermark, arrow head, motion blur, trail, glow, sparkles, drop shadow, plastic finish, perspective, background plate

### bar-arc-track — the bent bar every 4th stage uses
- **Size:** 1024×640 px, transparent PNG
- **Prompt:** Create a machined game asset of a curved premium track for a timing game: the same milled channel as the straight bar, now swept into a shallow arc of roughly 100 degrees opening downward, with capsule ends, a dark `#061229` interior, a polished chamfered rim catching one crisp highlight along the outer edge, and the same hairline engraved tick scale following the curve inside. Empty of zones. Straight-on elevation with **no** foreshortening — this is a flat arc, not a perspective ring. Transparent background.
- **Negative:** text, numbers, watermark, coloured zones, needle, three-dimensional ring, perspective, ellipse foreshortening, gloss bloom, drop shadow, background plate

### hud-grace-jewel — one of the three grace periods
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a machined HUD icon of a single grace-period indicator for a precision game: a small heraldic shield cut from steel, its face set with a domed synthetic jewel in on-time green `#4ADE80` with a `#0E5C24` core reflection, seated in a polished bezel with three tiny setting prongs. Also produce the **burned** state: identical steel shield with the jewel removed, leaving an empty dark socket and a faint red `#EF4444` residue ring in the bezel. Crisp at 18 px, centred, transparent background.
- **Negative:** text, numbers, watermark, heart, cross, crack, gloss bloom, drop shadow, cartoon outline, emoji, perspective, background plate

### hud-combo-rail — the perfect-combo multiplier pips
- **Size:** 512×128 px, 4:1 landscape, transparent PNG
- **Prompt:** Create a machined HUD element of a four-step combo rail for a precision timing game: four small capsule sockets milled in a row into a steel strip, each with a polished chamfer, the leftmost filled with a lit gold `#FFC845` insert and the remaining three left as empty dark `#061229` sockets with only their bezels catching light. Deliver lit and unlit inserts as separable elements on one canvas. Flat, straight-on, crisp at 8 px pip height. Transparent background.
- **Negative:** text, numbers, multiplication signs, watermark, glow, sparkles, gradient background, drop shadow, plastic, perspective

### token-topup — the bonus top-up band that appears on some stages
- **Size:** 512×192 px, transparent PNG
- **Prompt:** Create a machined game asset of a bonus top-up band for a timing track: a narrow insert of gold `#FFC845` cut with a fine repeating diagonal knurl across its face, a `#FFE38A` polished lip along the top edge and `#B07B12` in the knurl valleys, seated in the channel exactly like the green safe band but visibly textured so a player can tell them apart at a glance without reading colour alone. Straight-on, scalable horizontally, transparent background.
- **Negative:** text, numbers, plus signs, currency symbols, watermark, glow, sparkles, drop shadow, plastic, perspective, background plate

### milestone-pin — one of the twelve due-date markers on the timeline ribbon
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a machined HUD asset of a single timeline milestone pin for a 35-year premium schedule: a tiny domed rivet head in brand blue `#1E6BE0` sitting in a countersunk steel washer, with a hairline engraved index line running vertically through it. Also produce the **paid** state: the same rivet with its dome swapped to on-time green `#4ADE80` and a thin polished ring around the washer. Crisp at 8 px, centred, transparent background.
- **Negative:** text, numbers, ages, dates, watermark, icon inside the dome, glow, drop shadow, plastic, emoji, perspective, background plate

### fx-perfect-burst — the mark of a PERFECT lock
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create an effect asset for a perfect hit in a precision instrument game: a single thin expanding ring of polished gold `#FFC845` with a brighter `#FFE38A` leading edge, accompanied by eight short straight radial spokes of decreasing length — machined and geometric, like a shockwave etched in metal rather than a particle explosion. No soft bloom, no dust, no sparkle stars. Perfectly concentric, centred, transparent background.
- **Negative:** text, numbers, multiplication signs, watermark, sparkle stars, lens flare, smoke, dust, soft glow, blur, drop shadow, emoji, perspective

### fx-lapse-flare — the mark of a burned grace period
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create an effect asset for a missed premium in a precision instrument game: a hard-edged red `#EF4444` ring fractured into four arc segments with clean radial gaps, plus two short `#FF8B8B` stress lines striking outward from opposite sides, as if a machined part had sheared. Cold, mechanical, precise failure — not fire, not an explosion. Centred, transparent background.
- **Negative:** text, cross mark, skull, watermark, fire, smoke, sparks, blood, soft glow, blur, drop shadow, emoji, perspective, background plate

### result-policy-vested — win art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a straight-on illustration of a completed premium schedule for a win screen, rendered as a finished mechanical instrument: a circular guilloché dial plate with a full ring of twelve green-jewelled milestone rivets all set, a gold `#FFC845` PERFECT sliver seated at the top of the ring, three intact green grace jewels arranged below it, and the orange marker needle parked perfectly upright and still. Every chamfer catching one clean highlight. Precise, quiet, expensive-looking, complete. Centred, generous padding, transparent background.
- **Negative:** text, numerals, dates, ages, brand names, watermark, confetti, trophy, medal, human figures, gears spilling out, photographic scratches, perspective, drop shadow

### result-policy-lapsed — loss art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a straight-on illustration of an incomplete premium schedule for a loss screen, rendered as an unfinished mechanical instrument: the same circular guilloché dial plate, but only the first four milestone rivets set green while the remaining eight sockets sit empty and dark, all three grace jewels removed leaving red-residued bezels, and the orange marker needle stopped askew well outside the green band with a fractured red `#EF4444` arc where it landed. Dimmer overall lighting, no gold anywhere. Sombre and mechanical, never gruesome. Centred, transparent background.
- **Negative:** text, numerals, dates, watermark, gore, skulls, sad faces, human figures, fire, smoke, gold highlights, photographic rust, perspective, drop shadow

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
