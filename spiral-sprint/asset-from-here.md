# Spiral Sprint — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Spiral Sprint is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Spiral Sprint's answer |
|---|---|
| Motif | Spiral Sprint gameplay theme & visual style. |
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

### ss-ball-shield — the player ball, default state (bouncing, falling safely)
- **Size:** 512×512, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a compact armoured sphere — a shield ball — for a vertical helix-descent arcade game. The sphere is brushed cobalt metal with a bright pearl highlight at the upper left and a deep royal core, and a single crisp white heraldic shield crest is embossed flush into its front face with a thin blue chevron tick inside it. Use a consistent semi-realistic stylised 3D game-asset style with a clean circular silhouette, strong readability at 40 px, controlled surface detail and a cold single-source key light from directly above. Show the object from a straight-on front view at eye level, centred with generous padding. Use pearl `#CFE4FF`, sky cobalt `#4E96FF`, brand blue `#003DA6` and white `#FFFFFF` for the crest, with a faint blue rim glow `rgba(30,107,224,0.55)` hugging the silhouette. Transparent background. No ground plane, no cast shadow, no motion trail, no flames, no cracks, no text. Export-ready game asset, 512×512 PNG.
- **Negative:** text, watermark, realistic photo, emoji, drop shadow, ground, grass, cartoon face, eyes, cracks, fire, sparkles, UI frame, border

---

### ss-ball-fever — the same ball while the fever streak is lit (crash-immune)
- **Size:** 512×512, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of the same compact armoured shield sphere, now superheated and wrapped in a three-lobed flame corona rising from its lower half, for a vertical helix-descent arcade game. The metal has shifted from cobalt to glowing ember: a cream-hot highlight at the upper left falling to deep scorched red at the rim, with the embossed white shield crest still fully legible through the heat and its chevron tick now burning orange. Keep the same semi-realistic stylised 3D game-asset style, the same circular silhouette and the same cold overhead key light fighting the object's own warm self-illumination. Show it straight-on at eye level, centred with padding for the flame lobes. Use cream `#FFF0C8`, bright orange `#FF8A3D`, brand orange `#F26522` and scorched `#B93F09`, with gold `#FFC845` at the flame tips. Transparent background. No smoke, no ground, no explosion debris, no text. Export-ready game asset, 512×512 PNG.
- **Negative:** text, watermark, realistic photo, emoji, smoke plume, explosion, debris, ground, cast shadow, cracks, UI frame

---

### ss-ball-stressed — the ball on the 3rd–4th ring of an over-long fall, about to be destroyed
- **Size:** 512×512, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of the same armoured shield sphere failing structurally under an over-long fall, for a vertical helix-descent arcade game. The blue has been driven out of the metal entirely: the shell is hot rose-white at the upper left, dropping through searing red-orange to nearly black-red at the rim, and five jagged fracture lines radiate from just left of centre toward the edge, each one glowing white-hot along its crack with tiny chips of shell lifting away. The embossed shield crest is still there but split by two of the fractures and its chevron tick has gone dark maroon. Keep the same semi-realistic stylised 3D game-asset style, the same circular silhouette, and add a tight red danger halo `#EF4444` hugging the outline. Show it straight-on at eye level, centred with padding. Use blush white `#FFE2E2`, hot coral `#FF6A4A`, deep blood `#7A0F0F` and danger red `#EF4444`. Transparent background. No full shatter, no fragments flying away from the body, no flames, no text — the ball must still read as one intact sphere one moment from breaking. Export-ready game asset, 512×512 PNG.
- **Negative:** text, watermark, realistic photo, emoji, full explosion, scattered fragments, flames, smoke, ground, cast shadow, UI frame

---

### ss-arc-safe — a plain blue platform segment of a ring
- **Size:** 1024×512, 2:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single 70-degree slice of a flat circular platform — an annulus sector with an inner and outer curved edge — for a vertical helix-descent arcade game. It is a slab of brushed steel-blue metal about one-eighth as thick as it is wide, with a visible extruded front wall darker than its top face, a hard bright rim highlight running along the near outer lip, and fine concentric machining grooves on the top surface. Use a consistent semi-realistic stylised 3D game-asset style with a hard clean silhouette, strong readability at small sizes and a cold single-source key light from directly above. Show it from a 20-degree elevated three-quarter angle so the top face reads as a shallow ellipse and the front wall is visible along its whole length. Use top face `#2E63A8` fading to `#1C4881`, front wall `#0F2A4E` and a rim highlight of `rgba(255,255,255,0.28)`. Transparent background. No supports, no pillars, no ground, no text, no markings. Export-ready game asset, 1024×512 PNG.
- **Negative:** text, watermark, realistic photo, emoji, ground plane, cast shadow, rivets, bolts, wood, rust, UI frame, full ring

---

### ss-arc-landing — the guaranteed landing arc, one shade brighter than the safe arcs
- **Size:** 1024×512, 2:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single 90-degree slice of a flat circular platform — an annulus sector — that must read as clearly *safer and more inviting* than an adjacent duller blue slab, for a vertical helix-descent arcade game. Same brushed metal slab construction with an extruded front wall and concentric machining grooves, but a full step brighter and cleaner, with a soft pale-blue glow bleeding upward from the top face and a crisp double rim highlight on the near outer lip. Use a consistent semi-realistic stylised 3D game-asset style with a hard silhouette and a cold overhead key light. Show it from a 20-degree elevated three-quarter angle so the top face is a shallow ellipse. Use top face `#3A79C6` fading to `#22589A`, front wall `#12345F`, glow `rgba(30,107,224,0.45)` and highlights in white. Transparent background. No icons, no arrows, no landing markings, no text, no ground. Export-ready game asset, 1024×512 PNG.
- **Negative:** text, watermark, realistic photo, emoji, arrows, target markings, ground plane, cast shadow, UI frame, full ring

---

### ss-arc-crash — the green crash arc (market drawdown); touching it ends the run
- **Size:** 1024×512, 2:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single 60-degree slice of a flat circular platform that has been infected and is unmistakably lethal, for a vertical helix-descent arcade game. Same annulus-sector slab construction as the safe platforms — extruded front wall, 20-degree elevated three-quarter view — but the top face is diseased viral green, crusted with a row of evenly spaced spiked virus pips: small four-spiked discs with pale bright rims and dark sunken cores, marching along the centre line of the arc. A single hard danger-red warning stripe runs the full length of the near outer lip like hazard tape. Use a consistent semi-realistic stylised 3D game-asset style, cold overhead key light, hard silhouette, strong readability at small sizes. Use top face `#2E9B44` fading to `#14622A`, front wall `#0A3A18`, pips `#B6FBAE` with `#0E5C1D` cores, warning stripe `#EF4444`. Transparent background. No skull, no biohazard symbol, no text, no ground, no dripping slime. Export-ready game asset, 1024×512 PNG.
- **Negative:** text, watermark, realistic photo, emoji, skull, biohazard symbol, slime drips, ground plane, cast shadow, UI frame, full ring

---

### ss-tower-core — the vertical column the rings are threaded onto
- **Size:** 512×1024, 1:2 portrait, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a seamless vertical section of a heavy cylindrical column for a vertical helix-descent arcade game — the spine the platform rings are threaded onto. It is dark navy-steel with a cylinder shade running across its width (dark at both edges, a cool highlight band at about one-third from the left), and evenly spaced thin horizontal rungs faintly etched across it so downward motion is readable when it scrolls. Use a consistent semi-realistic stylised 3D game-asset style, cold single-source lighting from above, no perspective taper — the column must tile seamlessly top to bottom. Show it dead straight-on. Use `#1B3A6B` for the lit band, `#12294D` mid, `#0A1930` at the edges, and rungs at `rgba(255,255,255,0.05)`. Transparent background outside the column's width. No bolts, no cables, no signage, no text, no end caps. Export-ready game asset, 512×1024 PNG, seamlessly tileable vertically.
- **Negative:** text, watermark, realistic photo, emoji, bolts, rivets, cables, pipes, end caps, perspective taper, ground, UI frame

---

### ss-vault-floor — the retirement vault at ring 40; landing on it wins the run
- **Size:** 1024×512, 2:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a solid unbroken circular gold vault floor sealing the bottom of a shaft, for a vertical helix-descent arcade game. It is one complete disc — no gap, no slice — of warm polished gold with a thick extruded front wall, a heavy circular bank-vault door mechanism inset at its centre with a spoked handwheel and four radial locking bolts, and a bright rim highlight along the near lip. Faint concentric wealth rings ripple outward from the mechanism. Use a consistent semi-realistic stylised 3D game-asset style, cold overhead key light warmed by the gold's own bounce, hard silhouette, readable at 120 px. Show it from the same 20-degree elevated angle as the platform arcs so it sits in the same world. Use `#F3C75A` top face fading to `#8A5F12`, front wall `#5B3D0A`, mechanism outlines `rgba(11,18,33,0.7)`. Transparent background. No coins, no money bags, no currency symbols, no text, no ground. Export-ready game asset, 1024×512 PNG.
- **Negative:** text, watermark, realistic photo, emoji, coins, banknotes, currency symbols, treasure pile, ground plane, UI frame

---

### ss-decade-rule — the gold milestone band drawn around rings 10 / 20 / 30
- **Size:** 1024×512, 2:1 landscape, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a thin gold measurement band that encircles a platform ring like a surveyor's mark, for a vertical helix-descent arcade game about counting down the years to retirement. It is a slender open elliptical hoop seen from a 20-degree elevation — the same tilt as the platforms — two pixels thick at game scale, with fine tick marks at regular intervals around its circumference and four slightly longer ticks at the quarter points, plus a small empty gold nameplate floating just above the far edge of the hoop with no writing on it. The gold is luminous rather than metallic-heavy, as if it were a projected instrument overlay. Use a consistent semi-realistic stylised 3D game-asset style, cold ambient, self-lit gold. Use `#FFC845` and `#FFE38A`, plate backing `rgba(6,16,34,0.6)`. Transparent background. No numbers, no letters, no clock face, no ruler graphics. Export-ready game asset, 1024×512 PNG.
- **Negative:** text, numerals, watermark, realistic photo, emoji, clock, ruler, tape measure, ground plane, cast shadow, UI frame

---

### ss-background — the shaft the whole descent happens inside
- **Size:** 1080×1920, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of the inside of a deep vertical shaft receding downward into fog, for a helix-descent arcade game. A cold navy vertical gradient runs from near-black at the top through a deeper mid-blue to a dense fogged base; a soft cool bloom sits about a third down where the player's ball is parked; and the lowest quarter of the frame is swallowed by an opaque depth fog so anything drawn into it reads as far below. Add extremely faint concentric ellipse ghosts at wide intervals — the memory of platform rings already passed — at no more than 6% opacity, and a subtle vignette darkening all four edges. Use a consistent flat-but-atmospheric stylised game-background style with no hard objects, no focal subject and nothing that competes with foreground sprites. Use `#061634` at the top, `#0A2444` mid, `#08182F` low, fog `rgba(4,10,22,0.94)`, bloom `rgba(30,107,224,0.22)`. Full-bleed opaque background. No stars, no clouds, no city, no horizon, no characters, no text. Export-ready game background, 1080×1920 PNG.
- **Negative:** text, watermark, realistic photo, emoji, stars, clouds, buildings, horizon line, characters, foreground objects, UI frame

---

### ss-hud-icons — the four in-run HUD glyphs, one sheet
- **Size:** 1024×256, 4:1 landscape sheet of four 256×256 cells, transparent PNG
- **Prompt:** Create a polished mobile-game icon sheet of exactly four flat glyphs in one row, evenly spaced with equal padding, for the HUD of a vertical helix-descent arcade game. Left to right: (1) a double downward chevron stacked one above the other, the fall counter — clean, blunt, danger red; (2) a single teardrop flame with a hollow core, the fever mark, in bright orange; (3) a small heraldic shield with a chevron tick inside it, the ring-cleared mark, in brand blue; (4) a stylised spiral of three tightening concentric arcs seen from a 20-degree tilt, the descent mark, in gold. All four must share one stroke weight, one corner radius and one optical size, and must read as a set at 24 px. Use a consistent flat vector icon style with rounded caps, no gradients, no inner detail beyond what is described, and no container shapes behind the glyphs. Use `#EF4444`, `#FF8A3D`, `#1E6BE0` and `#FFC845` respectively. Transparent background. No text, no badges, no circles behind icons, no shadows. Export-ready icon sheet, 1024×256 PNG.
- **Negative:** text, watermark, realistic photo, emoji, gradients, drop shadow, container circles, badges, third-party logos, UI frame

---

### ss-result-vault-crest — win art on the results screen
- **Size:** 512×512, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a celebratory crest marking a completed descent, for the results screen of a helix-descent arcade game. A gold vault-door mechanism seen head-on — spoked handwheel, four radial bolts — sits at the centre of a slim ring of tilted platform slices that spiral inward toward it, the outer slices in brand blue and the inner ones warming to gold, as if the whole forty-ring tower had been compressed into one badge. A single blue shield ball rests in the notch at the bottom of the spiral. Use a consistent semi-realistic stylised 3D game-asset style with a hard silhouette, cold overhead key light and a warm gold bounce from the centre. Show it centred, straight-on, with generous padding. Use `#FFC845`, `#F3C75A`, `#003DA6`, `#1E6BE0` and white. Transparent background. No ribbon banners, no laurel wreath, no stars, no text, no numerals. Export-ready game asset, 512×512 PNG.
- **Negative:** text, numerals, watermark, realistic photo, emoji, ribbon, laurel, trophy cup, stars, confetti, UI frame

---

### ss-result-breach-crest — loss art on the results screen
- **Size:** 512×512, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a run-ended crest for the results screen of a helix-descent arcade game. The same slim ring of inward-spiralling tilted platform slices as the win crest, but the spiral is broken: three slices near the bottom are missing entirely, two are infected viral green with spiked virus pips, and a hairline fracture runs across the whole badge from the break outward. At the centre, where the gold vault mechanism would be, is a dark empty socket with a faint red glow in it. Use a consistent semi-realistic stylised 3D game-asset style with a hard silhouette and a cold overhead key light. Show it centred, straight-on, with generous padding. Use `#2E9B44` and `#14622A` for the infection, `#EF4444` for the fracture glow, `#1C4881` and `#0F2A4E` for the surviving slices. Transparent background. No skull, no crossbones, no sad face, no text, no numerals. Export-ready game asset, 512×512 PNG.
- **Negative:** text, numerals, watermark, realistic photo, emoji, skull, crossbones, sad face, tombstone, blood, UI frame

---

**13 prompts.** Every one is anchored to this game's tilted-annulus shape language
and cobalt-on-navy shaft palette; none of them describes a character, a field, a
sky or a tabletop, which is what keeps them from colliding with the other games
in the catalog.

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
