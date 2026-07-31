# Time Shield — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Time Shield is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Time Shield's answer |
|---|---|
| Motif | Time Shield gameplay theme & visual style. |
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

### tsh-bg-chamber — the vertical arena background the guardian climbs
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of a vertical chrono-laboratory shaft for a slow-motion arcade game, seen in flat straight-on elevation with no perspective. Holographic glassmorphism style: a deep void gradient from near-black (#05101F) at the bottom through navy (#0B2450) to a cool electric blue bloom (#1E6BE0 at 22% opacity) at the top, overlaid with a faint hexagonal lattice grid in steel blue (#7C94AE at 8% opacity) and five evenly spaced horizontal frosted-glass ledges, each a translucent white band with a thin luminous #9CC5FF top edge. Add sparse vertical tick marks along the left and right walls like a measuring instrument. The central column must stay dark, empty and low-contrast so gameplay sprites read clearly. No characters, no bullets, no clock face.
- **Negative:** text, lettering, numbers, watermark, realistic photo, perspective vanishing point, isometric tilt, emoji, drop shadow, clutter, machinery, pipes, cables, human figures

### tsh-guardian — the player's shield-guardian orb
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a hovering shield-guardian orb for a slow-motion arcade game, seen straight on. Holographic glassmorphism style: a glassy sphere lit from within by a radial gradient running from pale sky (#7FB4FF) at the upper-left highlight through electric blue (#1E6BE0) to deep Bajaj blue (#003DA6) at the rim, encircled by a single thin luminous ring in ice blue (#9CC5FF) with a hair-fine chromatic fringe. A crisp white hexagonal shield plate floats flush on the front face, bearing a bold Bajaj-blue check mark. Subtle internal refraction, no external lamp, no cast shadow. Transparent background.
- **Negative:** text, watermark, face, eyes, character, realistic photo, glass photo reflection, emoji, drop shadow, lens flare, fire, wings

### tsh-guardian-cracked — the guardian after its first hit
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of the same hovering shield-guardian orb, now damaged, for a slow-motion arcade game. Identical construction to the intact version but the encircling ice-blue ring is broken into three arc fragments drifting slightly apart, the internal glow is dimmed and shifted toward cold steel (#7C94AE), and the white hexagonal shield plate has two clean geometric fracture lines with one small hexagonal chip missing. Read as "one hit left", not destroyed. Straight-on view, transparent background.
- **Negative:** text, watermark, realistic shattered glass photo, blood, fire, smoke, emoji, drop shadow, jagged organic cracks, debris cloud, face

### tsh-bullet — the hazard projectile with its frozen trail
- **Size:** 512×192 px, wide 8:3, transparent PNG, travelling left to right
- **Prompt:** Create a polished mobile-game asset of a single energy projectile hanging in stopped time for a slow-motion arcade game, drawn travelling to the right in a strict side view. Holographic style: a small dense round head in hot orange (#F26522) with a pale core highlight (#FFE0C4) and a tight luminous halo, followed by a straight tapering trail that fades from solid amber (#FF8A3D) at the head to fully transparent at the tail. The trail must have hard, clean edges — it is time *stopped*, not motion blur, so no smearing or softness. Transparent background, no cast shadow.
- **Negative:** text, watermark, motion blur, soft smear, smoke, sparks, realistic fire photo, emoji, drop shadow, bullet casing, gun, muzzle flash

### tsh-laser-fan — the rotating laser fan hazard (zone 3+)
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a rotating laser-fan emitter for a slow-motion arcade game, seen straight on. Holographic glassmorphism style: a small frosted hexagonal hub in dark steel (#7C94AE) with a luminous orange (#FF8A3D) core, radiating four perfectly straight hard-edged beams at 90° intervals, each beam a thin gradient from bright orange (#F26522) at the hub fading out at its tip, with a hair-fine white centre line. A faint dashed circular sweep guide in steel blue (#9CC5FF at 25% opacity) shows the rotation path. Geometric and precise, never glowing bloom. Transparent background.
- **Negative:** text, watermark, glow bloom haze, lens flare, sparks, realistic photo, emoji, drop shadow, curved beams, sci-fi turret, gun barrel

### tsh-sweep-wall — the horizontal sweep wall hazard (zone 4+)
- **Size:** 1024×256 px, wide strip, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a horizontal sweeping energy wall for a slow-motion arcade game, drawn straight on. Holographic style: a hard-edged translucent orange plane (#F26522 at 45% opacity) with a bright solid #FF8A3D edge line along its top and bottom, filled with a repeating fine vertical hatch pattern, and two small hexagonal steel (#7C94AE) emitter caps at the left and right ends. The interior must remain see-through enough that a sprite behind it is still visible. Transparent background outside the wall.
- **Negative:** text, watermark, glow bloom, smoke, fire, sparks, realistic photo, emoji, drop shadow, opaque fill, jagged edges, electricity arcs

### tsh-zone-gate — the mint gate bar that opens each zone
- **Size:** 768×192 px, wide strip, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a horizontal zone gate bar for a slow-motion arcade game, seen straight on. Holographic glassmorphism style: a frosted translucent bar with rounded ends filled with mint green (#57E0A0), a thin brighter white-mint top edge line, and three small hexagonal notches evenly spaced along its length. A faint mint halo sits directly above the bar, suggesting passage upward. Precise and instrument-like, no organic shapes. Transparent background.
- **Negative:** text, lettering, numbers, arrows, watermark, realistic photo, emoji, drop shadow, glow bloom haze, doorway, fence, gate hinges

### tsh-fog-wall — the rising fog wall that never stops
- **Size:** 1080×512 px, wide, transparent PNG at the top edge, horizontally tileable
- **Prompt:** Create a polished mobile-game asset of a rising wall of cold time-fog for a slow-motion arcade game. Holographic style rather than painterly: a dense steel-blue mass (#7C94AE) at the bottom that dissolves upward into transparency through a fine dithered hexagonal stipple, with three or four thin horizontal luminous strata lines in #9CC5FF marking its advancing front. It must read as an inexorable geometric threat, not as soft weather cloud. Left and right edges match exactly for seamless horizontal tiling. Transparent above the fog front.
- **Negative:** text, watermark, fluffy cloud, realistic smoke photo, painterly brush texture, emoji, drop shadow, faces in the fog, seam at edges

### tsh-flow-meter — the time-scale HUD meter track
- **Size:** 768×128 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD asset of a horizontal time-flow meter track for a slow-motion arcade game. Holographic glassmorphism style: an empty frosted capsule track with a thin ice-blue (#9CC5FF) hairline border and eleven fine tick marks along its lower edge, plus a separate matching fill bar rendered beside it as a three-stop gradient running steel (#7C94AE) to electric blue (#1E6BE0) to hot orange (#F26522). Render the empty track and the fill bar as two aligned elements on one transparent canvas. Precise instrument look.
- **Negative:** text, lettering, numbers, percentage marks, watermark, realistic photo, emoji, drop shadow, glow bloom, needles, dials

### tsh-hud-hit — the two-hits-remaining HUD pip
- **Size:** 192×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD pip for a slow-motion arcade game: a small frosted hexagon in ice blue (#9CC5FF) with a luminous #1E6BE0 inner edge and a tiny white shield mark at its centre, rendered in holographic glassmorphism. Crisp geometric silhouette that stays legible at 18 px. Straight-on view, transparent background, no cast shadow.
- **Negative:** text, watermark, heart shape, circle, realistic photo, emoji, drop shadow, glow bloom, cracks, blood, skull

### tsh-hud-clock — the real-time session clock HUD icon
- **Size:** 192×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a stopped chronometer for a slow-motion arcade game. Holographic glassmorphism style: a frosted circular bezel with twelve fine tick marks, a translucent face, and two straight hands in ice blue (#9CC5FF) frozen at an off-centre angle, plus a single hot-orange (#FF8A3D) sweep hand held mid-stroke with a thin arc trail behind it. Geometric, instrument-precise, no numerals anywhere on the dial. Readable at 20 px. Straight-on view, transparent background.
- **Negative:** text, lettering, numerals, roman numerals, brand names, watermark, realistic watch photo, emoji, drop shadow, wrist strap, glow bloom

### tsh-result-vault — the win-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the victory screen of a slow-motion arcade game: the blue shield-guardian orb hovering inside an opened hexagonal vault portal, painted in holographic glassmorphism. The vault is a frosted hexagon ring in mint green (#57E0A0) with a luminous inner edge, split open along a clean geometric seam; five small mint gate bars stack in receding scale behind the orb marking the zones cleared, and four orange projectiles (#F26522) hang permanently frozen in the surrounding void with their hard-edged trails intact. Cool internal light, no external lamp. Transparent background.
- **Negative:** text, lettering, numbers, watermark, realistic photo, emoji, drop shadow, trophy, medal, confetti, fireworks, human figures, treasure coins

### tsh-result-caught — the loss-state art on the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration for the game-over screen of a slow-motion arcade game: the cracked shield-guardian orb caught at the centre of a converging lattice of frozen orange projectiles, rendered in holographic glassmorphism. The orb's ring is broken into drifting arc fragments and its glow has faded to cold steel (#7C94AE); six hard-edged #F26522 projectiles with straight trails converge on it from all sides, every one stopped dead in the air, and a steel-blue fog front (#9CC5FF stipple) climbs across the lower third of the frame. Still, cold and airless — the moment time ran out, not an explosion. Transparent background.
- **Negative:** text, lettering, watermark, realistic photo, emoji, drop shadow, explosion, fire, smoke, blood, skull, debris cloud, motion blur, human figures

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
