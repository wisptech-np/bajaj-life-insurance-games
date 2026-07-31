# Dual Cover — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Dual Cover is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Dual Cover's answer |
|---|---|
| Motif | Dual Cover gameplay theme & visual style. |
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

### dc-bg-void — the full-screen backdrop the whole run plays against
- **Size:** 1080×2160 portrait, opaque PNG, action safe from y=400 to y=1500
- **Prompt:** Create a portrait mobile-game backdrop of a blacked-out metrology laboratory
  void, in cold precision-instrument style. Near-black graduating `#08122B` at the top through
  a faint cool `#0D2350` glow at mid height to `#060E22` at the bottom, with a barely-visible
  engraved measurement grid etched into the darkness — fine hairlines at regular intervals,
  slightly brighter major divisions every fifth line, and small unlabelled tick marks along
  the vertical centre. Two extremely soft off-screen light sources bleed in from the upper
  left in blue `rgba(30,107,224,0.30)` and the upper right in orange `rgba(242,101,34,0.24)`,
  reading as instrument status lamps rather than as sky. Perfectly flat, no perspective, no
  horizon, no objects.
- **Negative:** text, numbers on the scale, stars, clouds, nebula, terrain, horizon, buildings,
  watermark, lens flare, bokeh, noise grain, emoji, drop shadow

### dc-orb-protection — the BLUE orb; one of the two things the player is steering
- **Size:** 512×512, transparent PNG, centred with 18% padding
- **Prompt:** Create a polished mobile-game asset of a spherical instrument node rendered as a
  machined metal core inside a frosted optical-glass shell, in cold precision-instrument style.
  Anodised deep blue body graduating `#7FC0FF` at the specular crown through `#1E6BE0` to
  `#062C6B` in the terminator, a milled equatorial groove with fine knurling, and a crisp
  white heater-shield emblem set flush into the front face like an engraved inlay. One hard
  studio key from upper-left producing a small tight specular ellipse, one thin cold rim from
  below-right. A contained internal glow suggests it is powered. Transparent background,
  floating, no contact shadow.
- **Negative:** text, face, eyes, character features, planet, marble swirl, watermark, cartoon
  outline, soft airbrush gradient, atmosphere, emoji, drop shadow, ground plane

### dc-orb-growth — the ORANGE orb, locked 180° opposite Protection
- **Size:** 512×512, transparent PNG, centred with 18% padding
- **Prompt:** Create a polished mobile-game asset of a spherical instrument node rendered as a
  machined metal core inside a frosted optical-glass shell, identical in construction and
  lighting to its blue twin but anodised warm orange, in cold precision-instrument style. Body
  graduating `#FFD9B0` at the specular crown through `#FF8A3D` to `#8C3708` in the terminator,
  the same milled equatorial groove and knurling, and a crisp white upward arrow emblem set
  flush into the front face as an engraved inlay. Same hard upper-left key, same thin cold rim
  from below-right, same contained internal glow. Transparent background, floating, no contact
  shadow.
- **Negative:** text, face, eyes, character features, sun, fireball, flames, watermark, cartoon
  outline, soft airbrush gradient, emoji, drop shadow, ground plane

### dc-orbit-ring — the track the two orbs are locked to
- **Size:** 1024×1024, transparent PNG, perfect circle, centred
- **Prompt:** Create a mobile-game asset of a thin circular guide track for a laboratory orrery,
  in cold precision-instrument style. A hairline ring of brushed steel rendered as a broken
  dashed circle in cool pale `rgba(190,214,255,0.16)` with slightly brighter graduation ticks
  in `rgba(190,214,255,0.28)` at every 15 degrees and longer ticks at the four cardinals.
  Perfectly concentric, absolutely uniform stroke weight, faint machined bevel catching a
  top-left key light. No hub, no spokes, no mounting hardware, nothing inside the circle.
  Transparent background.
- **Negative:** text, degree numbers, compass letters, hub, spokes, gear teeth, watermark,
  glow bloom, cartoon outline, emoji, drop shadow

### dc-bar-wall — the side-stub obstacle: two stubs, safe window straight up and down
- **Size:** 1024×192 horizontal, transparent PNG, one stub per file or both on one sheet
- **Prompt:** Create a mobile-game obstacle asset of a horizontal machined steel stub bar with a
  rounded cap on the inboard end and a squared flange on the outboard end, in cold
  precision-instrument style. Cold neutral metal only — never blue, never orange — with a lit
  top face `#D7E3F8`, a brushed body `#9FB4D8` showing horizontal tool marks, a shadowed
  underside `#5F749C` and a razor-thin bright edge highlight `#EAF2FF` along the top arris.
  Hard overhead key light, thin cold underlight. Reads as a solid milled billet, heavy and
  inert. Transparent background.
- **Negative:** text, rivets in a decorative pattern, rust, warning stripes, hazard chevrons,
  blue or orange tint, watermark, cartoon outline, flat colour, emoji, drop shadow

### dc-bar-centre — the centre bar: blocks the middle, gaps at both far edges
- **Size:** 1024×192 horizontal, transparent PNG, symmetrical about its centre
- **Prompt:** Create a mobile-game obstacle asset of a horizontal machined steel billet with
  both ends rounded and a symmetrical milled relief running along its face, in cold
  precision-instrument style. Same cold neutral metal family as the rest of the obstacle set —
  lit top `#D7E3F8`, brushed body `#9FB4D8` with fine horizontal tool paths, shadowed underside
  `#5F749C`, bright arris `#EAF2FF` — with two small engraved index notches marking the exact
  centre. Perfectly bilaterally symmetrical. Hard overhead key, thin cold underlight.
  Transparent background.
- **Negative:** text, arrows, direction markings, hazard stripes, blue or orange tint, rust,
  bolts, watermark, cartoon outline, flat colour, emoji, drop shadow

### dc-bar-spinner — the centre bar that rotates 45° as it descends
- **Size:** 1024×256 horizontal, transparent PNG, pivot exactly at the geometric centre
- **Prompt:** Create a mobile-game obstacle asset of a horizontal machined steel bar mounted on
  a visible central pivot boss, in cold precision-instrument style. Same cold neutral metal
  family as the rest of the set — lit top `#D7E3F8`, brushed `#9FB4D8` body, `#5F749C`
  underside, `#EAF2FF` arris — with a knurled circular pivot collar at dead centre, two fine
  engraved arc graduations sweeping a short way to either side of the collar, and a slight
  taper toward both tips so rotation reads clearly. Composition strictly horizontal and
  perfectly centred so the sprite can be rotated about its middle. Transparent background.
- **Negative:** text, degree numbers, motion arrows, hazard stripes, blue or orange tint,
  watermark, motion blur, cartoon outline, flat colour, emoji, drop shadow

### dc-bar-squeeze — the double bar with a single off-centre diagonal gap
- **Size:** 1024×384, transparent PNG, two parallel bars with the gap aligned off centre
- **Prompt:** Create a mobile-game obstacle asset of two parallel horizontal machined steel bars
  stacked with a narrow clearance between them, the upper bar interrupted by a single precise
  rectangular slot positioned off centre, in cold precision-instrument style. Cold neutral
  metal throughout — lit top `#D7E3F8`, brushed `#9FB4D8`, `#5F749C` shadow, `#EAF2FF` arris —
  with the slot edges chamfered and cleanly machined, and fine engraved witness lines flanking
  it. Reads as a go/no-go gauge: the gap is deliberate and exact. Hard overhead key.
  Transparent background.
- **Negative:** text, dimension callouts, arrows, hazard stripes, blue or orange tint, rust,
  watermark, cartoon outline, flat colour, emoji, drop shadow

### dc-trail-blue / dc-trail-orange — the arc each orb smears behind it while spinning
- **Size:** 1024×1024, transparent PNG, a 60° arc segment, additive-blend friendly, one per colour
- **Prompt:** Create a mobile-game VFX asset of a short glowing arc segment that tapers from
  full width and full brightness at its leading end to nothing at its trailing end, following
  the curve of a circular track, in cold precision-instrument style. Render one version cored
  in `#7FC0FF` fading through `rgba(30,107,224,0.55)` to transparent, and a second cored in
  `#FFB27A` fading through `rgba(242,101,34,0.55)` to transparent. Clean hard-edged optical
  light, like a light-pipe or fibre-optic run, not a soft airbrushed smear. Transparent
  background, no black matte.
- **Negative:** text, sparks, particles, smoke, flame, soft airbrush blur, watermark, opaque
  background, emoji, drop shadow

### dc-nearmiss-shimmer — the gold flash for a clearance under 10 px, and the streak state
- **Size:** 768×768, transparent PNG, additive-blend friendly
- **Prompt:** Create a mobile-game VFX asset of a precision near-miss indicator: a thin gold
  `#FFC845` caliper-style bracket flashing around a tight clearance, with two short opposing
  tick arms almost touching, a hot `#FFE38A` core glow at the point of closest approach, and a
  fine spray of hard-edged golden splinters firing perpendicular to the gap. Reads as a
  measurement alarm on an instrument, sharp and geometric. Transparent background, no black
  matte.
- **Negative:** text, numbers, exclamation mark, soft glow blob, smoke, fire, watermark,
  cartoon impact star, opaque background, emoji, drop shadow

### dc-shield-pip — the HUD shield charges; three held, the fourth hit ends the run
- **Size:** 256×256 each, transparent PNG, two states on one sheet (charged, spent)
- **Prompt:** Create a matched pair of mobile-game HUD indicators in cold precision-instrument
  style: a small heater-shaped shield machined from metal, shown twice. CHARGED — anodised blue
  `#1E6BE0` face with a `#7FC0FF` bevelled rim, a lit interior and a crisp specular along the
  top edge. SPENT — the identical shield unlit and hollow, rendered as a bare `#5F749C` outline
  with a fine hairline fracture across the face and a dull red `#EF4444` residue in the
  fracture only. Identical silhouette, identical size, identical angle in both states so they
  swap cleanly in place. Transparent background.
- **Negative:** text, hearts, numbers, crosses, heraldry, watermark, cartoon outline, flat
  colour, glossy plastic, emoji, drop shadow

### dc-phase-marker — the milestone flare at each of the four phase boundaries
- **Size:** 1024×512, transparent PNG, horizontal, additive-blend friendly
- **Prompt:** Create a mobile-game VFX asset of a horizontal calibration sweep line marking a
  checkpoint, in cold precision-instrument style. A razor-thin bright white line spanning the
  full width, thickening slightly at the exact centre, flanked by two symmetrical arrays of
  short green `#28A745` graduation ticks that shorten as they travel outward, with a soft
  `#4ADE80` bloom hugging the line and a scatter of fine green splinters drifting upward.
  Reads as an instrument confirming a pass, precise and clinical. Transparent background, no
  black matte.
- **Negative:** text, checkpoint flag, banner, ribbon, confetti, fireworks, watermark, soft
  airbrush glow, opaque background, emoji, drop shadow

### dc-result-callipers — the win art on the results screen
- **Size:** 768×768, transparent PNG, centred with 12% padding
- **Prompt:** Create a polished mobile-game asset of a pair of precision vernier callipers
  closed gently around two touching spheres — one anodised blue `#1E6BE0`, one anodised orange
  `#FF8A3D` — with the callipers themselves in brushed steel `#9FB4D8` with a `#EAF2FF` arris
  and a fine engraved scale along the beam, in cold precision-instrument style. Three-quarter
  hero angle, hard studio key from upper-left, thin cold fill from below, both spheres carrying
  their own contained internal glow. A restrained gold `#FFC845` ring of light behind the
  arrangement suggests a passed measurement. Transparent background, floating.
- **Negative:** text, numbers on the scale, trophy, medal, ribbon, confetti, hands, watermark,
  cartoon outline, flat colour, atmosphere, emoji, drop shadow, ground plane

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
