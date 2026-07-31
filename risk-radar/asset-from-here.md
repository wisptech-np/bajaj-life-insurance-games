# Risk Radar — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Risk Radar is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Risk Radar's answer |
|---|---|
| Motif | Risk Radar gameplay theme & visual style. |
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

### rr-void — full-screen canvas background: the unlit maze
- **Size:** 800×1440 px, portrait, opaque JPG/PNG
- **Prompt:** Create a polished mobile-game background of near-absolute darkness for a
  sonar-navigation game — a photograph of an unlit clay diorama room, low eye-level 3/4. The frame
  is `#04070E` black almost everywhere, with only the faintest suggestion of depth: a barely
  perceptible cool `#0B1221` lift toward the upper centre, a whisper of airborne dust motes
  catching nothing in particular, and fine analogue sensor grain. Absolutely no object, edge,
  wall or silhouette may be discernible — the emptiness is the asset, and any hint of geometry
  would break the game's core rule that hidden things are never drawn. Deep, quiet, expensive
  black.
- **Negative:** visible walls, silhouettes, stars, fog volumes, light shafts, vignette rings, any
  discernible shape, text, watermark, gradient banding

### rr-family — the player and two followers who trail the breadcrumb
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of three small matte clay figures standing close
  together for a sonar-navigation game, low eye-level 3/4, in a blackout room lit by one hard
  raking light from the upper left. The leading figure is caught most: a crisp white `#FFFFFF` rim
  running down its left contour and a soft cool bounce on the shoulder beside it. The two behind
  are caught only faintly, in `#8FC6FF`, one more dimly than the other, so they read as *further
  into the dark*. Everything not on that lit contour is pure `#04070E` black with no fill, no
  detail, no faces. Unglazed porous clay with visible thumb marks along the lit edge. Transparent
  background.
- **Negative:** faces, eyes, clothing detail, even lighting, full-body visibility, cartoon
  character, gloss, outline stroke, drop shadow, text, watermark, emoji

### rr-wall-chunk — a wall segment as it lights under the passing wavefront
- **Size:** 512×256 px, transparent PNG, tileable horizontally
- **Prompt:** Create a polished mobile-game asset of a rough clay wall segment for a
  sonar-navigation game, low eye-level 3/4, revealed by a hard light passing across it from the
  left. Only the top edge and the near vertical face catch anything: a bright irregular
  `#E8F1FF` rim following every bump and tool-gouge of the clay, breaking into short dashes where
  the surface dips away, with a dim cool falloff two centimetres below it and pure black beneath.
  The whole rest of the block is unlit `#04070E`. The lit rim must look *sampled* — as if the light
  is a moving line, not a lamp. Ends cut flat for tiling. Transparent background.
- **Negative:** fully lit wall, brick pattern, even edge, smooth extrusion, flat vector line, glow
  bloom, plan view, text, watermark, emoji, drop shadow

### rr-spike-pool — the hazard that costs a heart
- **Size:** 512×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a pool of jagged clay spikes rising from the
  floor for a sonar-navigation game, low eye-level 3/4, lit by one hard raking light. The spikes
  are uneven, hand-pinched, of varying height, and only their tips and the left facet of each are
  caught — in hot `#FF5A5A` fading to `#8C1616` a few millimetres down, with everything below
  swallowed by black. A faint red ember shimmer clings inside the deepest gaps, the only light
  that is not from the sweep. Threatening by silhouette alone. Transparent background.
- **Negative:** fully lit spikes, lava, fire, blood, smooth cones, symmetry, glow bloom, plan
  view, drop shadow, text, watermark, emoji

### rr-lurker — the hunter that chases the noise
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a low, hunched clay creature for a
  sonar-navigation game, low eye-level 3/4, lit by one hard raking light from the side. It is
  almost entirely black — a heavy, wide, ground-hugging mass — with a single hot `#FF4D4D` rim
  along its leading edge and one deep `#7A0F0F` core point where a lit fissure opens in its front.
  No eyes, no mouth, no limbs picked out; the silhouette must be readable and unsettling with
  nothing else given away. Matte clay, tool-ridged along the lit contour. Transparent background.
- **Negative:** face, eyes, teeth, tentacles, monster illustration, fully lit body, even lighting,
  cartoon, gloss, glow bloom, drop shadow, text, watermark, emoji

### rr-lurker-telegraph — the grey ring a lurker emits about itself every 3.2 s
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a faint expanding disturbance ring for a
  sonar-navigation game, seen at low eye-level 3/4 so the ring reads as an ellipse lying on the
  floor. It is dust and grit lifted off clay ground by something moving — a thin, broken,
  grey-white `rgba(170,178,196,0.55)` arc of suspended particles, denser on the near side where
  the raking light catches them, dissolving to nothing on the far side. Not a drawn circle: a
  *photographed* ring of lifted particulate. Transparent background.
- **Negative:** drawn circle, neon ring, radar sweep, perfect ellipse, sonar graphic, plan view,
  glow bloom, text, watermark, emoji, drop shadow

### rr-shriek-flash — the 0.5 s warning that precedes every lunge
- **Size:** 800×400 px, transparent PNG, screen-edge overlay
- **Prompt:** Create a polished mobile-game screen-edge warning overlay for a sonar-navigation
  game: a soft band of hot `#FF4D4D` bleeding inward from one edge of the frame, dense and opaque
  at the very edge, falling off to nothing within a fifth of the frame, with a subtle irregular
  waver along its inner boundary as if the darkness itself flinched. No shapes, no icons, no
  vignette on the other three sides — only this one edge. Must be legible as *danger from that
  direction* at a glance. Transparent background elsewhere.
- **Negative:** icons, exclamation mark, skull, crack graphics, full vignette, symmetrical frame,
  text, watermark, emoji, sharp inner edge

### rr-shelter — the gold shelter, the goal of the maze
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small clay doorway with warm light spilling
  from inside it for a sonar-navigation game, low eye-level 3/4. The structure itself stays almost
  entirely black; what is visible is the doorway's warm gold `#FFC845` throat and a rim of that
  gold catching the near edge of the frame and the lip of the step. The light must look like it
  comes from *behind* the opening, not from the sweep — this is the only asset in the game with
  its own light source. Everything else is pure `#04070E`. Transparent background.
- **Negative:** fully lit building, house illustration, windows, roof detail, lantern, fire, glow
  bloom filling the frame, plan view, text, watermark, emoji

### rr-hidden-orb — the collectible that glints only inside a sweep
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small polished bead half-buried in clay for
  a sonar-navigation game, low eye-level 3/4, caught mid-sweep. The bead is the one object here
  that is not matte: a single hard cyan `#60CDFF` specular pip on its upper left, a thin cool
  crescent of reflected light along its rim, and nothing else — the rest of the bead and all of the
  clay around it stay black. Tiny, precious, easy to miss. Transparent background.
- **Negative:** gemstone facets, coin, star, sparkle burst, fully lit sphere, glow bloom, plan
  view, drop shadow, text, watermark, emoji

### rr-gate — a checkpoint the party respawns at
- **Size:** 512×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of two short clay posts flanking a gap in a wall
  for a sonar-navigation game, low eye-level 3/4, lit by one hard raking light. Each post catches a
  narrow cool `#8FC6FF` rim on its inner face and a faint dusting of the same light on the ground
  between them, forming a threshold you can just make out. The posts are hand-rolled and slightly
  unequal. Everything outside those two rims is black. It must read as *safe, passed, behind you*
  rather than as an objective. Transparent background.
- **Negative:** fully lit gate, arch, flag, banner, torch, glow bloom, plan view, symmetry, drop
  shadow, text, watermark, emoji

### rr-pulse-front — the radar wavefront itself
- **Size:** 800×800 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a travelling sound wavefront for a
  sonar-navigation game, seen at low eye-level 3/4 so it reads as a wide shallow ellipse of
  disturbed air. It is a narrow band, not a filled circle: a `rgba(96,205,255,0.55)` core with a
  brighter `rgba(255,255,255,0.85)` leading line on its outer edge and a warm
  `rgba(255,150,80,0.4)` fringe trailing just inside it. The band is dense at the near side and
  thins on the far side, and carries suspended dust picked out along its length. The centre is
  completely empty and black. Transparent background.
- **Negative:** filled circle, radar screen, sweep arm, concentric rings, plan view, neon tube,
  lens flare, text, watermark, emoji, drop shadow

### rr-hud-heart — the three hearts in the HUD, held and lost
- **Size:** 256×128 px, transparent PNG, two states side by side
- **Prompt:** Create a polished mobile-game HUD indicator pair for a sonar-navigation game: two
  identical small clay heart-shaped tokens side by side, low eye-level 3/4, lit by one raking
  light. The left is held — its upper-left contour caught in a warm `#FF5A5A` rim with a faint
  bounce on the lobe beside it, the rest black. The right is lost — the same token with no rim at
  all, visible only as a very faint `rgba(255,255,255,0.14)` edge, plus a fresh clean break across
  it where a chip has fallen away. Identical silhouette and placement so the engine can swap them.
  Legible at 16 px. Transparent background.
- **Negative:** glossy heart, cartoon heart, glow, blood, cracks drawn as lines, fully lit token,
  drop shadow, text, numbers, watermark, emoji

### rr-result-sheltered — win art on the results screen
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration for a sonar-navigation game, low
  eye-level 3/4: three small clay figures standing just inside a doorway, seen from outside, with
  warm gold `#FFC845` light from within washing over them so that for the first and only time
  their whole forms are lit — the point of the image is that they are no longer edges in the dark.
  Behind them the room remains pure `#04070E` black. Matte clay, thumb marks visible, no faces.
  Quiet and warm, no celebration graphics. Transparent background.
- **Negative:** trophy, confetti, fireworks, medal, faces, smiles, fully lit environment, glow
  bloom, plan view, text, watermark, emoji, drop shadow

### rr-result-lost — loss art on the results screen
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration for a sonar-navigation game, low
  eye-level 3/4: the last of a wavefront dying away in an empty clay corridor, its
  `rgba(96,205,255,0.35)` band already too faint to reveal anything but one metre of rough wall and
  a single set of small footprints pressed into the floor, leading forward and stopping. No figures
  are visible at all. Everything beyond that metre is absolute `#04070E` black. Still, cold and
  final — no gore, no monster, no cartoon sadness. Transparent background.
- **Negative:** skull, blood, monster, tears, sad face, cracked glass, fully lit scene, glow bloom,
  plan view, text, watermark, emoji, drop shadow

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
