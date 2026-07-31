# Ring Fence — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Ring Fence is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Ring Fence's answer |
|---|---|
| Motif | Ring Fence gameplay theme & visual style. |
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

### rf-plot-sheet — full-screen canvas background the field is drawn on
- **Size:** 800×1440 px, portrait, opaque JPG/PNG
- **Prompt:** Create a polished mobile-game background of a surveyor's plot sheet on a backlit
  drafting table for a territory-capture game, seen flat-on in plan view. Near-black ground
  `#061229` with a precise 4 mm graph grid drawn in `#1E6BE0` at 7% opacity, and every fifth line
  drawn at 12% opacity so the grid reads as measured. Add a very faint cool glow rising from the
  lower centre as if the light box beneath is uneven, four small registration crosses at the
  corners, and one chamfered corner top-right. Nothing else — the whole sheet must stay empty and
  quiet so gameplay geometry reads on top. No border rule, no title block, no north arrow.
- **Negative:** title block, north arrow, text, numbers, dimension lines, buildings, contours,
  vignette blobs, paper fibre, coffee stains

### rf-guardian — the player marker riding the safety wall
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a surveyor's station marker for a
  territory-capture game, seen flat-on in plan view: a shield outline drawn as a single heavy
  `#1E6BE0` draughting line with a `#7FC0FF` inner highlight line 2 px inside it, the whole shape
  backlit so the enclosed area glows a soft cool white at 20% opacity. At its centre sits a small
  solid white surveyor's point with four tiny radiating tick marks at the cardinal directions.
  Hard, precise linework — no rounded cartoon edges, no shading, no volume. Centred with 15%
  padding, transparent background.
- **Negative:** 3D shield, bevel, gloss, knight, armour, character face, gradient fill, drop
  shadow, text, watermark, emoji, perspective

### rf-safety-wall — a segment of the claimed boundary the guardian rides
- **Size:** 512×128 px, transparent PNG, tileable horizontally
- **Prompt:** Create a polished mobile-game asset of a seamlessly tileable boundary-wall segment
  for a territory-capture game, seen flat-on in plan view: a band of survey cyan `#3B8DD4` at 55%
  opacity with a crisp `#7FC0FF` 2 px boundary line running along its outer edge, backlit so the
  band glows faintly from within, and a row of short perpendicular dimension ticks along the inner
  edge at even 32 px intervals. The left and right ends must be cut perfectly flat so copies butt
  together with no seam. Hard draughting linework, no rounding, no shading. Transparent background.
- **Negative:** brick, stone, fence posts, 3D wall, perspective, bevel, gradient across the length,
  text, numbers, watermark, emoji, rounded ends

### rf-live-cut — the unfinished trail the player is drawing through open ground
- **Size:** 512×128 px, transparent PNG, tileable horizontally
- **Prompt:** Create a polished mobile-game asset of an in-progress survey cut for a
  territory-capture game, seen flat-on in plan view: a single thin `#FF8A3D` construction line,
  backlit so it carries a tight 3 px orange halo, drawn as a *provisional* line — broken into a
  long-dash pattern with a small open circle marking every dash join, the way a draughtsman marks
  a line not yet committed. It must read as clearly less permanent than a solid boundary. Ends cut
  flat for tiling. Transparent background.
- **Negative:** solid unbroken line, rope, wire, energy beam, lightning, 3D tube, glow bloom
  filling the frame, text, numbers, watermark, emoji

### rf-claimed-fill — the hatch that floods a sealed pocket
- **Size:** 512×512 px, transparent PNG, tileable in both axes
- **Prompt:** Create a polished mobile-game asset of a seamlessly tileable ownership hatch for a
  territory-capture game, seen flat-on in plan view: even 45° parallel hatch lines in `#1E6BE0` at
  35% opacity spaced 24 px apart, over a wash of `rgba(0,61,166,0.4)`, with a second much fainter
  cross-hatch at 135° at 10% opacity. Every hatch line is a precise constant-weight draughting
  stroke — no taper, no texture, no brush feel. Must tile perfectly in both axes with the hatch
  phase continuing across every edge. Transparent background where the wash is absent.
- **Negative:** brush texture, watercolour, noise, gradient, 3D, perspective, irregular spacing,
  text, numbers, watermark, emoji

### rf-risk-orb — the green virus orb that bounces through open ground
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a contamination marker for a
  territory-capture game, seen flat-on in plan view: a hazard symbol drawn entirely in draughting
  line — a `#49E24B` circle of constant stroke weight with eight radial spikes projecting past its
  circumference at even 45° intervals, each spike a straight tapered tick, and a solid dark
  `#0E5C1D` core disc at the centre. Backlit so the green lines carry a tight halo. Rotationally
  symmetrical, instantly distinguishable from any blue shape at 20 px, no volume, no shading.
  Transparent background.
- **Negative:** 3D sphere, gloss, cartoon virus face, tentacles, slime, bacteria illustration,
  perspective, drop shadow, text, watermark, emoji

### rf-orb-warning — the 1.5 s telegraph ring before the third orb spawns
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a survey exclusion-zone marker for a
  territory-capture game, seen flat-on in plan view: a large circle drawn as a dashed `#FFC845`
  construction line with long dashes and short gaps, a second concentric dashed circle 20% smaller
  and 40% dimmer inside it, and four short radial ticks at the cardinal points crossing both
  circles. The centre is completely empty. It must read as *something is about to appear here*,
  not as an object. Constant stroke weight, no fill, no glow bloom, no volume. Transparent
  background.
- **Negative:** filled circle, target crosshair with bullseye, radar sweep, 3D ring, glow bloom,
  text, numbers, watermark, emoji, perspective

### rf-fuse-spark — the fuse that ignites at the cut origin when the player stalls
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a burning survey mark for a territory-capture
  game, seen flat-on in plan view: a small hot `#EF4444` point with six short irregular radial
  spurs of unequal length drawn as fine draughting strokes, plus a faint `#FFC845` inner point at
  the very centre. Around it, one tight incomplete arc of dashes suggests the burn spreading
  outward. Deliberately the only *irregular* asset in this game — everything else is measured and
  this one is not. No smoke, no realistic flame, no volume. Transparent background.
- **Negative:** realistic fire, smoke, embers, cartoon flame, 3D, gloss, perspective, drop shadow,
  text, watermark, emoji

### rf-hud-shield — the three shields (lives) in the HUD, held and lost
- **Size:** 256×128 px, transparent PNG, two states side by side
- **Prompt:** Create a polished mobile-game HUD indicator pair for a territory-capture game, seen
  flat-on in plan view: two identical small shield outlines drawn in draughting line, side by side.
  The left is held — a crisp `#7FC0FF` outline with a 20% cool-white backlit fill and a solid
  centre point. The right is lost — the same outline redrawn as a thin broken dashed
  `rgba(255,255,255,0.22)` line with no fill, no centre point, and a small red `#EF4444` cross
  struck through it at 45°. Identical size and placement so the engine can swap them. Legible at
  14 px. Transparent background.
- **Negative:** 3D shield, heart, cracked glass, gloss, bevel, text, numbers, watermark, emoji,
  differing silhouettes

### rf-hud-claim-dial — the percentage-claimed readout in the HUD
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD gauge for a territory-capture game, seen flat-on in
  plan view: a circular draughting protractor drawn as a thin `#3B8DD4` outline with an inner arc
  track, twenty short graduation ticks around the circumference and four longer quadrant ticks, and
  a partially filled progress arc in solid `#1E6BE0` running clockwise from the top and stopping
  roughly seven tenths of the way round, with a slightly heavier `#7FC0FF` cap at its head. One
  small gold `#FFC845` target tick sits on the circumference marking the goal. The centre is
  completely empty — the number is drawn by the engine. Transparent background.
- **Negative:** text, numbers, percent sign, needle, clock hands, 3D dial, bevel, gloss, watermark,
  emoji, perspective

### rf-cut-multiplier — the stamp awarded for a large single cut
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a draughtsman's approval stamp for a
  territory-capture game, seen flat-on in plan view: a hexagonal outline in `#FFC845` drawn at a
  heavy constant line weight, with a second thinner hexagon nested 6 px inside it, six short
  radial ticks bridging the two at each vertex, and a completely blank interior — the multiplier
  value is drawn by the engine on top. Backlit so the gold lines carry a faint halo. Precise and
  symmetrical, no texture, no fill, no volume. Transparent background.
- **Negative:** text, numbers, multiplier symbol, ribbon, medal, star, 3D, gloss, bevel, watermark,
  emoji, perspective

### rf-result-enclosed — win art on the results screen
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration for a territory-capture game, seen
  flat-on in plan view: a completed survey plot — an irregular closed polygon of land drawn with a
  heavy `#1E6BE0` boundary line, filled with even 45° ownership hatching, its vertices marked with
  small solid station points, and a full ring of dimension ticks running the whole way round the
  outside with no gaps. Two green `#49E24B` contamination markers sit clearly *outside* the
  boundary, drawn smaller and dimmer, unable to reach in. Precise, measured, quietly conclusive.
  No celebration graphics. Transparent background.
- **Negative:** trophy, confetti, fireworks, medal, flag, text, numbers, 3D, perspective, gloss,
  watermark, emoji, human figures

### rf-result-breached — loss art on the results screen
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration for a territory-capture game, seen
  flat-on in plan view: an unfinished survey plot — a boundary polygon drawn heavy on two sides,
  thinning to a broken dashed `#FF8A3D` construction line on the third, and simply *stopping*
  before it closes, leaving an open mouth in the perimeter. Only a small part of the interior
  carries ownership hatching; the rest is bare grid. One green `#49E24B` contamination marker sits
  inside the incomplete outline and a small red `#EF4444` cross is struck at the point where the
  line failed. Cool, technical, no drama. Transparent background.
- **Negative:** skull, tears, sad face, explosion, cracked glass, text, numbers, 3D, perspective,
  gloss, watermark, emoji, human figures

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
