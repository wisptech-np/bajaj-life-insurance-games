# Risk Strike — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Risk Strike is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Risk Strike's answer |
|---|---|
| Motif | Risk Strike gameplay theme & visual style. |
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

### rs-bg-arena — the hall behind the pin deck (`drawBackdrop`)
- **Size:** 1080x1920, portrait, opaque PNG (this one is a background, not a cutout)
- **Prompt:** Create a polished mobile-game background of a near-black futuristic bowling arena seen from behind the foul line, for a portrait one-thumb sports game. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. The frame is almost entirely deep ink navy (#050912) and graphite indigo (#0A1428); the only light is a single soft cool-blue pool (#2E7BF0 at low opacity) blooming low-centre where the pin deck would stand, and three faint concentric ignition-orange target rings (#FF6A1A, under 18% opacity) floating on the back wall centred on that pool. A dark horizontal masking slab crosses the upper third with one thin glowing orange bar (#FF6A1A) along its lower edge. Show it from a low straight-on player-eye perspective with a strong vanishing point at the centre of the upper third. Keep the composition centred and symmetrical with the lower 55% of the frame empty and unlit, because the lane is composited over it. Use #050912, #0A1428, #2E7BF0, #FF6A1A. No people, no lane, no pins, no ball, no scoreboard graphics.
- **Negative:** text, watermark, logos, realistic photo, wood grain, warm amber house lighting, neon signage, crowd, emoji, drop shadow, UI frame, bright midtones in the lower half

### rs-lane-bed — the perspective lane surface (`drawLane`)
- **Size:** 900x1400 trapezoid on transparent PNG (top edge ~22% the width of the bottom edge)
- **Prompt:** Create a polished mobile-game asset of a dark synthetic bowling lane surface in one-point perspective, narrowing sharply to the top, for a portrait sports game. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. The bed is a cool slate-indigo gradient running from #1B2C4E at the near edge through #12203C to almost black #070D1B at the far edge, with barely visible vertical board seams at 5% white and one broad soft specular sheen down the centre. Two narrow near-black channels (#080E1C) flank it. Show it from a low player-eye perspective. Keep the composition centred with the trapezoid touching the left and right edges at the bottom. Use #1B2C4E, #12203C, #070D1B, #080E1C. Transparent background outside the trapezoid. No arrows, no foul line, no pins, no ball, no reflections of objects.
- **Negative:** text, watermark, maple or wood texture, oil pattern rainbow sheen, warm colours, photographic scratches, emoji, border, mock-up

### rs-ball-shield — the player's ball (`drawBall`, `ShieldBall`)
- **Size:** 512x512, transparent PNG, centred
- **Prompt:** Create a polished mobile-game asset of a glowing spherical shield bowling ball for a portrait flick-bowling game. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. The sphere is a deep brand-blue radial gradient from a pale highlight #D6E8FF at the upper-left, through #2E7BF0, to near-black navy #001A4A at the lower-right rim; a crisp cool rim light (#D6E8FF) runs along the upper-left arc and a warm ignition-orange rim light (#FF6A1A) along the lower-right arc, and the two never meet. A clean white heraldic shield emblem sits centred on the face at about 50% of the ball's diameter, flat white #FFFFFF with no bevel. Show the object from a straight-on front view. Keep the composition centred with sufficient padding. Use #2E7BF0, #D6E8FF, #001A4A, #FF6A1A, #FFFFFF. Transparent background. No text, no finger holes, no cast shadow.
- **Negative:** text, watermark, finger holes, marble swirl, glitter, realistic photo, drop shadow, emoji, border, UI frame

### rs-pin-risk — the standing risk bottle (`makePinSprite`, `VirusPin`)
- **Size:** 384x768, transparent PNG, base-anchored at the bottom centre
- **Prompt:** Create a polished mobile-game asset of a bowling pin shaped like a sealed virus vial for a portrait flick-bowling game about life risks. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. It keeps the classic pin silhouette — wide base, pinched neck, rounded cap — and reads as a bottle: a bright toxic-green body gradient from #0E6420 at the base through #3FD34A to a pale #9CF08F highlight, one crisp white label band across the shoulder, a small very dark green core disc (#06380F) at the belly, and three short blunt protein spikes in deep green (#0E6420) poking out behind the belly on the left, right and top. Light it with a pale green-white rim (#C6FFB4) down the left contour and a warm ignition-orange rim (#FF6A1A) down the right contour, with a soft dark falloff across the middle so it reads as a cylinder. Show the object from a straight-on front view standing upright. Keep the composition centred with sufficient padding. Use #3FD34A, #0E6420, #06380F, #C6FFB4, #FF6A1A, #FFFFFF. Transparent background. No text, no face, no cast shadow.
- **Negative:** text, watermark, cartoon eyes or face, skull, biohazard symbol, red colours, realistic photo, drop shadow, emoji, border

### rs-pin-falling — the toppled risk bottle (topple frames)
- **Size:** 384x768, transparent PNG, four-frame horizontal strip (1536x768) at 0, 30, 60 and 85 degrees of tilt
- **Prompt:** Create a polished mobile-game asset sheet of the same green virus-vial bowling pin toppling over, as four frames in one horizontal strip, for a portrait flick-bowling game. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Frame one is upright, frames two to four rotate it clockwise about the base to roughly 30, 60 and 85 degrees, squashing very slightly as it goes and picking up a faint orange impact rim on the leading edge (#FF6A1A). The body keeps the same green gradient (#0E6420 to #3FD34A to #9CF08F), white label band and dark core disc. Show all four from the same straight-on front view with the pivot at the base centre. Keep each frame centred in its cell with sufficient padding. Use #3FD34A, #0E6420, #C6FFB4, #FF6A1A. Transparent background. No motion blur streaks, no impact stars, no text.
- **Negative:** text, watermark, speed lines, comic impact stars, debris, realistic photo, drop shadow, emoji, frame borders

### rs-shockwave — the impact ring (`drawRings`, `spawnRing`)
- **Size:** 1024x400, transparent PNG, three-frame horizontal strip (expanding)
- **Prompt:** Create a polished mobile-game VFX asset of a ground-level shockwave ring, as three expansion frames in one horizontal strip, for a portrait impact-driven sports game. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Each frame is a flattened ellipse ring seen in perspective on a floor plane, about three times wider than it is tall, drawn as a single clean stroke that starts thick and hot (#FFE0B8 core fading to #FF6A1A) in frame one and grows wider, thinner and dimmer by frame three. A very faint second ring trails just inside it. Show it from the same low player-eye perspective the floor would be seen at. Keep each ring centred in its cell. Use #FFE0B8 and #FF6A1A only. Transparent background. No sparks, no debris, no ball, no floor texture.
- **Negative:** text, watermark, circular top-down ring, lens flare, smoke, particles, realistic photo, emoji, border

### rs-timing-ring — the ready-to-flick ring around the ball (`drawBall`)
- **Size:** 512x512, transparent PNG
- **Prompt:** Create a polished mobile-game UI asset of a pulsing timing ring that sits on the floor around a ball, for a portrait flick-bowling game. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. It is a single flattened ellipse ring in perspective, about three times wider than tall, stroked in ignition orange #FF6A1A at roughly 60% opacity with a brighter #FFE0B8 highlight along its nearest arc, plus one fainter concentric ring outside it. It must read as "touch here" without any arrow or hand. Show it from a low player-eye perspective. Keep the composition centred with sufficient padding. Use #FF6A1A and #FFE0B8. Transparent background. No ball, no text, no arrow.
- **Negative:** text, watermark, arrow, hand or finger, full circle seen top-down, glow bloom haze, realistic photo, emoji, border

### rs-power-ring — the flick power meter (`drawAim`)
- **Size:** 512x512, transparent PNG
- **Prompt:** Create a polished mobile-game UI asset of a circular power gauge ring for a portrait flick-bowling game. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. It is a thick round-capped ring track in translucent white at 14% opacity, over which a filled arc sweeps clockwise from the twelve o'clock position through roughly 75% of the circle; the fill is a gradient from brand blue #2E7BF0 at its start to ignition orange #FF6A1A at its head, with a hot #FFE0B8 tip. A thin detached outer ring marks the maximum. Show the object flat, straight on. Keep the composition centred with sufficient padding. Use #2E7BF0, #FF6A1A, #FFE0B8, white. Transparent background. No numbers, no tick labels, no needle.
- **Negative:** text, numbers, watermark, needle or dial pointer, skeuomorphic gauge bezel, realistic photo, drop shadow, emoji, border

### rs-chevrons — the lane aiming marks (`drawLane`)
- **Size:** 768x384, transparent PNG
- **Prompt:** Create a polished mobile-game asset of five aiming chevrons laid flat on a lane floor in one-point perspective, for a portrait bowling game. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. They are open V shapes with round caps, not solid triangles, arranged in a shallow arc with the centre chevron highest and brightest and the outer ones stepped lower and dimmer. Stroke them in warm amber-orange #FF8A3D at about 45% opacity so they sit into the floor rather than on top of it. Show them from a low player-eye perspective with the correct foreshortening. Keep the group centred and symmetrical. Use #FF8A3D only. Transparent background. No lane surface, no pins, no text.
- **Negative:** text, watermark, solid filled triangles, arrows with tails, lane texture, realistic photo, drop shadow, emoji, border

### rs-hud-strike — the score chip glyph (`StrikeGlyph`)
- **Size:** 128x128, transparent PNG or SVG
- **Prompt:** Create a polished mobile-game UI icon of an impact burst for a portrait sports game HUD. Use a consistent flat-vector art style with clean silhouettes, strong readability at 15 pixels, soft dimensional lighting, controlled detail, and a professional casual-game finish. It is a solid ignition-orange disc (#FF6A1A) at the centre, one thin concentric ring around it in pale #FFE0B8 at half opacity, and four short round-capped rays at the cardinal points in #FFE0B8. Perfectly symmetrical, uniform stroke weight, no perspective. Show the object flat, straight on. Keep the composition centred with sufficient padding. Use #FF6A1A and #FFE0B8. Transparent background. No text, no star shape, no gradient mesh.
- **Negative:** text, watermark, five-pointed star, sparkle, lens flare, gradients, realistic photo, drop shadow, emoji, border

### rs-hud-pin — the risks-down chip glyph (`PinGlyph`)
- **Size:** 128x128, transparent PNG or SVG
- **Prompt:** Create a polished mobile-game UI icon of a bowling pin silhouette for a portrait sports game HUD. Use a consistent flat-vector art style with clean silhouettes, strong readability at 15 pixels, soft dimensional lighting, controlled detail, and a professional casual-game finish. It is a simplified pin shape — wide base, pinched neck, rounded cap — filled flat mint green #4ADE80 with a 1-unit dark green outline (#0E6420) and one horizontal white band across the shoulder. No spikes, no core disc: at 15 pixels those become mud. Show the object flat, straight on. Keep the composition centred with sufficient padding. Use #4ADE80, #0E6420, #FFFFFF. Transparent background. No text, no shading gradient.
- **Negative:** text, watermark, virus spikes, face, gradients, realistic photo, drop shadow, emoji, border

### rs-hud-clock — the timer chip glyph (`ClockGlyph`)
- **Size:** 128x128, transparent PNG or SVG
- **Prompt:** Create a polished mobile-game UI icon of a clock ring for a portrait sports game HUD. Use a consistent flat-vector art style with clean silhouettes, strong readability at 15 pixels, soft dimensional lighting, controlled detail, and a professional casual-game finish. It is a single open circular ring with a uniform round-capped stroke and two simple hands meeting at the centre, drawn in pure white; supply a second variant of the identical icon stroked in warm orange #FF8A3D for the low-time state. No numerals, no tick marks, no bezel. Show the object flat, straight on. Keep the composition centred with sufficient padding. Use white and #FF8A3D. Transparent background. No text.
- **Negative:** text, numerals, tick marks, watermark, hourglass, alarm bells, realistic photo, drop shadow, emoji, border

### rs-result-cleared — the win mark on Results (`TrophyIcon` slot)
- **Size:** 512x512, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a victory mark for the results screen of a flick-bowling game about clearing life risks. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. It is a bold heraldic shield in brand blue (#2E7BF0 to #003DA6) standing inside two concentric ignition-orange shockwave rings (#FF6A1A fading outward), with a clean gold check mark (#FFC845) centred on the shield face and three tiny toppled green vial silhouettes (#3FD34A) lying at its base. Cool rim light from above-left, warm orange rim from below-right. Show the object from a straight-on front view. Keep the composition centred with sufficient padding. Use #2E7BF0, #003DA6, #FF6A1A, #FFC845, #3FD34A. Transparent background. No text, no trophy cup, no confetti.
- **Negative:** text, watermark, trophy cup, medal ribbon, confetti, laurel wreath, realistic photo, drop shadow, emoji, border

### rs-result-standing — the loss mark on Results (`RiskIcon` slot)
- **Size:** 512x512, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a "risks still standing" mark for the results screen of a flick-bowling game. Use a consistent flat-vector-with-soft-gradients art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. It is a single green virus vial pin (#3FD34A body, white label band, dark #06380F core) still standing upright, lit from below by a dull red warning ring (#FF5A5A at low opacity) on the floor around its base, with two faint grey toppled pin silhouettes behind it. The mood is unfinished business, not failure: no crosses, no skulls. Show the object from a straight-on front view. Keep the composition centred with sufficient padding. Use #3FD34A, #06380F, #FF5A5A, #FFFFFF. Transparent background. No text.
- **Negative:** text, watermark, skull, red cross, sad face, broken glass, realistic photo, drop shadow, emoji, border

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
