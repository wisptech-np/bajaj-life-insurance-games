# Guardian Arena — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Guardian Arena is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Guardian Arena's answer |
|---|---|
| Motif | Guardian Arena gameplay theme & visual style. |
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

### bg-arena-floor — full-screen game background behind the canvas arena
- **Size:** 1080×1620 px, 2:3 portrait, opaque PNG
- **Prompt:** Create a top-down orthographic background plate of a sealed bio-containment arena floor for a mobile twin-stick survival game. A dark navy sterile deck (`#0B1221` at the corners lifting to `#101c36` at centre) with a faint circular containment well etched into it: three concentric hairline rings in ice blue at 6–10% opacity, a barely-visible hex-grid texture, and four short orange calibration ticks at the cardinal points. Add a soft cool radial glow from directly above the centre, a subtle vignette, and a thin desaturated red hazard band bleeding in from the extreme outer edge. Absolutely flat lighting, no perspective, no props, no characters, no depth of field, nothing that competes with sprites drawn on top. Clean, quiet, low-contrast — this plate must stay legible under a HUD.
- **Negative:** text, numbers, logos, watermark, isometric or three-quarter perspective, horizon line, characters, weapons, furniture, photographic grain, heavy shadows, busy detail, warm colour cast

### player-guardian-core — the player disc the joystick moves
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a top-down circular guardian drone for a twin-stick survival game: a domed blue disc chassis in bright blue `#1E6BE0` shading to `#00246B` at the rim, with an ice-blue `#7FC0FF` specular arc at the upper-left, a crisp brushed-steel ring around the circumference, and a raised opaque-white heraldic shield crest centred on the top face with a `#003DA6` inner shield inset. Viewed from directly overhead, perfectly circular silhouette, centred with generous padding. Soft dimensional lighting from above-left, controlled panel detail, clean readable at 28 px. Transparent background.
- **Negative:** text, watermark, face, eyes, limbs, gun barrel, tilt or perspective, drop shadow baked in, emoji, cel outline, photographic texture, background scenery

### enemy-chaser-blob — the common green pathogen that walks at you
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a top-down viral pathogen blob for a twin-stick survival game: a wet translucent sphere of luminous pathogen green `#49E24B` with a dense dark core `#0E5C1D` glowing through, ringed by eight short stubby receptor spikes in `#2FBF3F` radiating evenly outward like a virion. Subsurface-scatter gel look, glossy highlight at the top-left, faint internal bubbles. Viewed from directly overhead, radially symmetric silhouette, centred with padding. Menacing but clean — must read as one blob at 26 px. Transparent background.
- **Negative:** text, watermark, face, mouth, teeth, eyes, cartoon expression, emoji, perspective, cast shadow, tentacles, photographic microscopy, background

### enemy-shooter-spore — the pale pathogen that holds distance and fires
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a top-down ranged spore pathogen for a twin-stick survival game: a pale mint-green `#B9F0A8` gel sphere with a mid-green `#63D14E` shell and a deep `#237A1F` centre, distinguished from its cousins by a raised amber `#FFC845` charging ring inscribed around the core and three long tapering barb-spines instead of many short ones. Glassy translucent body, faint amber bloom leaking from the ring to telegraph a wind-up. Directly overhead view, centred, generous padding, readable at 28 px. Transparent background.
- **Negative:** text, watermark, face, eyes, muzzle flash, projectile, perspective, cast shadow, emoji, realistic microscope photo, background

### enemy-splitter-cyst — the fat pathogen that bursts into two children
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a top-down splitter cyst pathogen for a twin-stick survival game: a large teal-green `#7CE9A2` gel sac with a `#35C46A` shell and dark `#136D31` interior, visibly containing **two** smaller round nuclei pressed side by side under the translucent membrane, with a faint pale fissure line running between them to promise the split. Stubby uneven spikes, thick wobbling outline, wet gloss. Directly overhead, centred, wider silhouette than the other pathogens so it reads as the heavy. Transparent background.
- **Negative:** text, watermark, face, eyes, gore, blood, emoji, perspective, cast shadow, photographic texture, background, already-split fragments

### enemy-boss-culture — the wave-4 mini-boss
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a top-down pathogen mother-culture boss for a twin-stick survival game: a massive dark-green `#2FA63B` gel dome with a `#6FDF6F` outer membrane and an almost-black `#0E5C1D` nucleus, crowned by a ring of twelve thick receptor spikes and three amber `#FFC845` charge nodes spaced evenly around the shell to telegraph its three-shot fan. Denser, heavier and more armoured than the small pathogens — visible plated crust over the gel. Directly overhead, radially symmetric, centred with padding. Transparent background.
- **Negative:** text, watermark, health bar, face, eyes, limbs, perspective, cast shadow, emoji, photographic texture, background, smaller enemies

### proj-cover-bolt — the auto-fired player projectile
- **Size:** 256×128 px, 2:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small energy bolt for a top-down shooter: a bright near-white `#DFF0FF` orb with a `#1E6BE0` denser inner dot, trailing a short soft ice-blue `#7FC0FF` motion streak to the left at about 45% opacity that fades to nothing. Crisp round head, tapering tail, no rotation cue. Rendered flat from directly overhead, pointing right, centred vertically with padding. Must stay visible against a dark navy floor at 10 px. Transparent background.
- **Negative:** text, watermark, muzzle flash, smoke, sparks, lens flare, perspective, cast shadow, emoji, bullet casing, background

### proj-viral-glob — the enemy projectile
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a hostile viral glob projectile for a top-down shooter: a wobbling droplet of luminous pathogen green `#49E24B` with a dark `#0E5C1D` centre and a thin ragged white rim at 60% opacity so it separates from the green enemies behind it. Slightly irregular, wet, unstable silhouette suggesting it will splatter. Directly overhead, centred, small padding. Must never be mistaken for the player's pale blue bolt. Transparent background.
- **Negative:** text, watermark, blue tones, motion blur streak, perspective, cast shadow, emoji, realistic slime photo, background

### hud-shield-heart — the HP pip in the top HUD
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a single hit-point pip for an insurance-themed arcade game: a compact heraldic shield in orange `#FF8A3D` to `#F26522` vertical gradient with a 2 px lighter inner bevel and a tiny white heart notched into the centre. Flat-shaded, thick readable silhouette, no gradient banding, designed to be tiled in a row of four at 18 px each. Also usable at 40% opacity as the empty state. Centred, transparent background.
- **Negative:** text, numbers, watermark, drop shadow, emoji heart, realistic anatomy, perspective, glow bloom, background plate

### hud-wave-chevron — the wave counter badge in the HUD
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a wave-progress chevron badge for a survival arena game: three stacked upward chevrons of decreasing width in ice blue `#7FC0FF`, sitting inside a rounded-square plate of translucent navy `#101c36` with a 1 px `rgba(127,192,255,0.3)` border. Clinical, instrument-panel styling to match a containment-lab theme. Flat, crisp at 22 px, centred. Transparent background outside the plate.
- **Negative:** text, digits, watermark, drop shadow, gloss, skeuomorphic metal, emoji, perspective, background scenery

### ui-joystick-ring — the floating virtual stick that appears under the thumb
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game UI asset of a floating virtual joystick for a top-down shooter: an outer ring of white at 45% opacity, 3 px stroke, with a barely-filled `rgba(255,255,255,0.07)` disc inside, plus a separate solid knob puck in ice blue `#7FC0FF` with a soft white top highlight sized at about 30% of the ring diameter. Deliver ring and knob as two centred elements on one transparent canvas. Minimal, thumb-friendly, unobtrusive over dark gameplay. No arrows, no direction letters.
- **Negative:** text, letters, arrows, D-pad, watermark, drop shadow, gradient background, skeuomorphic rubber texture, emoji, perspective

### rider-card-crest — the 1-of-3 upgrade card icon frame between waves
- **Size:** 512×640 px, 4:5 portrait, transparent PNG
- **Prompt:** Create a polished mobile-game UI asset of a rider-upgrade card frame for an insurance-themed arena game: a rounded-rectangle glass panel in deep navy `#101c36` at 80% opacity with a 1.5 px ice-blue border, an orange `#FF8A3D` accent bar across the top edge, and a circular emblem well cut into the upper third ready to receive an icon. Clinical lab-instrument styling — thin rules, tiny corner registration ticks, restrained gold `#FFC845` filigree only at the two top corners. Empty inside: no icon, no copy. Transparent outside the frame.
- **Negative:** text, lettering, numbers, watermark, icon inside the well, photographic texture, heavy ornament, emoji, drop shadow, background scenery

### result-arena-defended — win art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of a successfully defended containment arena, viewed from directly overhead: the blue guardian disc `#1E6BE0` standing alone at the centre of a clean circular well, ringed by an intact green `#28A745` containment barrier drawn as a glowing 8 px arc, with four dissolving pathogen-green motes fading out at the perimeter and a scatter of gold `#FFC845` spark specks rising. Calm, resolved, triumphant without confetti. Centred composition, generous padding, transparent background.
- **Negative:** text, score numbers, watermark, confetti, trophy, medal, human characters, perspective, photographic texture, drop shadow, background plate

### result-arena-breached — loss art on the results screen
- **Size:** 1024×1024 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of a breached containment arena, viewed from directly overhead: the same blue guardian disc `#1E6BE0` dimmed to 55% brightness at the centre, the circular containment ring broken into three arcs in danger red `#EF4444`, and four luminous green `#49E24B` pathogen blobs crowding in through the gaps with faint trailing smears. Sombre, low-glow, clearly a loss state but not gruesome. Centred composition, generous padding, transparent background.
- **Negative:** text, score numbers, watermark, gore, blood, skulls, human characters, perspective, photographic texture, drop shadow, background plate

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
