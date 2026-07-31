# Ripple Shield — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Ripple Shield is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Ripple Shield's answer |
|---|---|
| Motif | Ripple Shield gameplay theme & visual style. |
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

### rs-bg-abyss — the playfield background, behind everything

- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG (this asset is the ground, not a cutout)
- **Prompt:** Create a polished mobile-game background of a still, bottomless dark-water surface seen from directly overhead for a one-tap chain-reaction puzzle game. Use a flat vector-with-depth style: an almost-black teal-navy field graduating from #03101E at the top through #062134 in the middle to #041A2B at the base, overlaid with two families of extremely faint concentric standing-wave rings — a large family centred slightly below the middle of the frame and a smaller family centred in the upper-left quadrant — drawn in aqua #19E3D6 at 4–10% opacity with hairline strokes that thin toward the outside, so the two ring families visibly cross and add where they overlap. Add one cold aqua depth-bloom at the centre at low intensity, a soft caustic band of #0A6E7A light along the bottom fifth, and a heavy vignette taking the four corners to near black. The image must stay dark enough that a bright cyan object placed on top is the brightest thing in the frame. Perfectly flat top-down camera, no horizon, no perspective. No text, watermark, border, mock-up, UI frame, photographic water textures, lens flare, or any object.
- **Negative:** text, watermark, logo, UI frame, characters, boats, fish, sky, horizon line, sun, photographic realism, noise grain, gold, purple, bright background, emoji

---

### rs-orb-family — the exposed family orb (the thing you are trying to reach)

- **Size:** 512×512 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small glowing glass bead containing a family of three, for a chain-reaction protection puzzle. Use a clean stylized-vector style with real sphere shading: a deep-blue body graduating from a bright #7FB4FF highlight in the upper-left, through Bajaj blue #1E6BE0, to a very dark #062252 at the lower-right, a soft occlusion shadow on the far side, one crisp specular ellipse at the upper-left, and a distinct cool rim light — a bright #A0D6FF arc hugging the lower-right edge only, as if lit by the water beneath it. Inside the bead, three simple soft-white beads arranged as two adults side by side with a smaller child below them, abstract and geometric, no faces. Add a faint outer glow of #003DA6 at low intensity. Show the object head-on, perfectly centred, sufficient padding for the glow. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, realistic human faces, drop shadow on a floor, gold, aqua, green, cast shadow, cartoon outline, emoji, sparkles, background plate

---

### rs-orb-protected — a family orb the wave has reached

- **Size:** 512×512 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of the same small glowing glass bead as the family orb, but now fully charged with protective energy, for a chain-reaction protection puzzle. Same sphere construction and same clean stylized-vector style, re-lit entirely in aqua: white core highlight in the upper-left, through pale #EAFFFB, to signature aqua #19E3D6, to deep #0A6E7A at the lower-right edge; crisp white specular ellipse; a bright white rim-light arc on the lower-right. Replace the family motif with a single confident check mark in very dark teal #03303A, thick and rounded. Around the bead, detached from it, draw one clean concentric halo ring of #19E3D6 at about 55% opacity and 1.35× the bead's radius — the frozen wave that reached it. Strong aqua outer glow. Head-on, centred, generous padding for the halo and glow. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, gold, yellow, green, blue body, multiple halos, shield emblem, drop shadow, cast shadow, emoji, background plate

---

### rs-risk-husk — the virus orb, the thing that eats your wave

- **Size:** 512×512 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small hostile spiked husk — a virus capsid — for a chain-reaction protection puzzle. Use the same clean stylized-vector style as the game's glass beads so it belongs in the same world, but make its silhouette deliberately jagged and irregular: nine radial spikes of two alternating lengths, the long ones narrow and the short ones broad, each spike graduating from deep #177033 at its base to #3FD45E at its tip. The central husk is a sphere shaded from #5FE97C in the upper-left through #3FD45E to a very dark #083D1A at the rim, with a cool pale-green rim-light arc on the lower-right. At its exact centre sits a hot, unmistakably dangerous nucleus: a glowing red #FF5A5A core with a pale #FFE3E3 hot spot and a tight red glow — the only warm light in the entire game. Head-on, centred, padding for the spikes and glow. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, cute face, eyes, smile, friendly character, aqua, blue, gold, symmetrical star, realistic microscopy photo, drop shadow, emoji, background plate

---

### rs-wave-crest-full — the shield wave at full energy (root ripple)

- **Size:** 1024×1024 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game VFX asset of a single expanding circular energy wave at full power, seen from directly overhead, for a chain-reaction protection puzzle. Build it as one ring, not a disc: the interior is almost entirely empty and transparent, energy piles up smoothly only across the outer fifth of the radius, peaks in a brilliant #C4FFFA crest, and dies to fully transparent exactly at the outer edge with no hard boundary. Layer, from inside out: a faint #0A6E7A wash, an #19E3D6 body, a bright #3FD8E6 shoulder, a white-hot hairline just inside the crest, and a wide soft aqua haze bleeding just past the crest. Behind the crest, two trailing echo rings, each roughly half as bright and half as thick as the one in front of it, spaced further apart as they fall behind — the wave must read as travelling outward. Additive, luminous, like light on dark water. Perfectly circular, perfectly centred, top-down. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, filled disc, solid circle, flat stroked outline, hard edge, blue, gold, purple, lens flare, sparkles, particles, drop shadow, emoji, background plate

---

### rs-wave-crest-spent — the shield wave at low energy (deep in the chain)

- **Size:** 1024×1024 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game VFX asset of the same overhead circular energy wave, but visibly spent — a late generation of a chain reaction that has nearly run out. Identical construction and identical aqua palette (#0A6E7A body, #19E3D6, #3FD8E6 shoulder, #C4FFFA crest) but at roughly half the crest thickness, two-thirds the overall opacity, only one faint trailing echo instead of two, and a noticeably narrower outer haze. The ring must still be clean and legible, never dirty or noisy — it is weaker, not damaged. Perfectly circular, perfectly centred, top-down. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, filled disc, broken ring, cracks, noise, static, orange, gold, blue, sparkles, drop shadow, emoji, background plate

---

### rs-wave-crest-bitten — a wave a virus has just eaten into

- **Size:** 1024×1024 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game VFX asset of an overhead circular energy wave in a wounded warning state, for a chain-reaction protection puzzle. Same ring construction as the healthy aqua wave — empty interior, energy piling up only across the outer fifth, crest peaking and dying to transparent at the edge, one trailing echo — but recoloured entirely to the warning palette: a #8C340A wash, a #F26522 body, an #FF8A3D shoulder, an #FFCEA8 crest, and a warm outer haze. The ring stays perfectly circular and unbroken; the alarm is carried purely by the hue shift and a slightly harsher, hotter crest. Top-down, centred. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, fire, flames, smoke, cracks, broken ring, red, aqua, gold, sparkles, drop shadow, emoji, background plate

---

### rs-shield-core — the shield emblem at the heart of the Home hero

- **Size:** 512×512 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a compact protective shield crest sitting at the centre of a set of concentric rings, for the title screen of a chain-reaction protection puzzle. The shield is a simple rounded heater-shield silhouette, small and confident, filled with the game's aqua sphere gradient (white core, #EAFFFB, #19E3D6, #0A6E7A edge), outlined in very dark teal #03303A, carrying a single thick rounded check mark in #03303A. Behind and around it, three clean concentric rings of #19E3D6 at descending opacity (roughly 55%, 30%, 16%) and descending stroke weight, plus a soft aqua bloom directly behind the shield. Symmetrical, head-on, centred, generous padding. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, heraldry, crest lions, banners, ribbons, sword, gold, ornate detail, 3D bevel, drop shadow, emoji, background plate

---

### rs-hud-wave-mark — HUD score icon

- **Size:** 128×128 px, square, transparent PNG (icon; must survive being drawn at 15 px)
- **Prompt:** Create a minimal mobile-game HUD icon of a wave leaving a point source, for a chain-reaction protection puzzle. Flat stroke-only construction: a solid #8CFFF4 dot at the exact centre, then two short opposing arc segments at 95% opacity forming an inner ring, then two longer opposing arc segments at 45% opacity forming an outer ring, all in aqua #19E3D6 with uniform rounded stroke caps and a stroke weight heavy enough to remain legible at 15 px. Perfectly centred, no fills except the centre dot, no gradients, no glow. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, wifi bars, signal bars, sound waves, gradients, glow, 3D, shadow, colour other than aqua, emoji, background plate

---

### rs-hud-clock-mark — HUD timer icon

- **Size:** 128×128 px, square, transparent PNG (icon; must survive being drawn at 15 px)
- **Prompt:** Create a minimal mobile-game HUD icon of a clock built from concentric circles, for a chain-reaction protection puzzle. Flat stroke-only construction in aqua #19E3D6: one bold outer ring, one much fainter inner ring at about half the radius, and a single rounded hand running from the centre up and then to the right, drawn at the same weight as the outer ring. No numerals, no ticks, no second hand, no fill, no gradient, no glow. Uniform rounded caps, legible at 15 px, perfectly centred. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, numerals, watermark, alarm bells, hourglass, sand, two hands, gradients, glow, 3D, shadow, emoji, background plate

---

### rs-hud-tap-mark — the "one tap ready" indicator

- **Size:** 128×128 px, square, transparent PNG (icon; must survive being drawn at 16 px)
- **Prompt:** Create a minimal mobile-game HUD icon showing a single available shot, for a chain-reaction protection puzzle. Three concentric circles in brand orange #FF8A3D: a filled solid centre dot, a bold mid ring at about 80% opacity, and a thin outer ring at about 45% opacity. Flat, stroke-only apart from the centre dot, no gradient, no glow, uniform stroke weight, legible at 16 px, perfectly centred. This is the one element in the game allowed to be orange rather than aqua. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, hand, finger, cursor, crosshair arms, gunsight, gradients, glow, 3D, shadow, aqua, gold, emoji, background plate

---

### rs-gesture-hand — the drawn finger used by the how-to-play demo

- **Size:** 256×256 px, square, transparent PNG
- **Prompt:** Create a clean mobile-game instructional glyph of a pointing hand about to press a screen, for a one-tap puzzle game tutorial. Stylized silhouette only, no realism and no skin tone: a very dark #061C2C fill with a crisp #8CFFF4 aqua outline of even weight, index finger extended straight down, remaining fingers curled, wrist cropped at the bottom edge of the frame. The shape must read instantly as "tap here" at 40 px and must not resemble an emoji or a stock cursor. Head-on, slightly tilted, centred. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, emoji, realistic hand, skin tones, fingernails, sleeve detail, mouse cursor, arrow pointer, drop shadow, gradients, background plate

---

### rs-result-crest — the win mark on the results screen

- **Size:** 512×512 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game result badge meaning "every wave held", for a chain-reaction protection puzzle. Three concentric elements sharing one centre: a thin outer ring of aqua #19E3D6 at 40% opacity, a bolder mid ring at 75% opacity, and a solid aqua #19E3D6 disc at the core carrying a single thick rounded check mark in very dark teal #03303A. Add a soft aqua bloom behind the whole mark. Perfectly symmetrical, head-on, centred, padding for the bloom. This must not look like a trophy, a medal or a star. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, trophy, cup, medal, ribbon, star, laurel, confetti, gold, yellow, 3D bevel, drop shadow, emoji, background plate

---

### rs-result-stall — the loss mark on the results screen

- **Size:** 512×512 px, square, transparent PNG
- **Prompt:** Create a polished mobile-game result badge meaning "the wave ran short", for a chain-reaction protection puzzle. Concentric construction like the win badge, but deliberately incomplete: the outer ring is drawn as three separate arc segments with visible gaps between them, in danger red #EF4444 at about 55% opacity with rounded caps; inside it a complete bolder red ring; at the centre a small solid red disc. The gaps in the outer ring are the whole idea — the wave did not close. No cracks, no shattering, no debris; the mark stays clean and geometric. Head-on, centred, symmetrical about the vertical axis. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, or extra objects.
- **Negative:** text, watermark, skull, cross, X mark, warning triangle, broken glass, cracks, shards, flames, aqua, gold, drop shadow, emoji, background plate

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
