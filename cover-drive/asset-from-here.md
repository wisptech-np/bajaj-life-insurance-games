# Cover Drive — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Cover Drive is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Cover Drive's answer |
|---|---|
| Motif | Cover Drive gameplay theme & visual style. |
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

### cd-bg-stadium — full-screen canvas backdrop behind every ball
- **Size:** 1080×1920 portrait, opaque JPG/PNG, safe zone 120px top (HUD) and 260px bottom (gauge)
- **Prompt:** Create a portrait mobile-game backdrop of a floodlit cricket stadium seen from
  behind the batter's shoulder, in stylised broadcast realism. Night sky graduating `#081026`
  at the top to `#0A1E42` at the horizon, four floodlight banks flaring soft cool-white halos
  into the haze, packed stands rendered as two bands of blurred crowd colour `#0A1730` deep and
  `#132B54` mid with `#1C3E75` highlight seats catching the light, an outfield of dew-slick
  mown turf graduating `#0A3320` deep to `#1B7040` at the crease with faint mower stripes and a
  wet specular sheen, and a pale rope boundary `#EAF1FA` curving across the upper third.
  Shallow depth of field: stands heavily defocused, outfield sharpening toward the bottom of
  the frame. Warm key light from high camera-left, cold cyan rim from camera-right. Leave the
  centre-bottom third clean and uncluttered for gameplay. Cinematic broadcast camera, 35mm
  look, gentle vignette.
- **Negative:** text, scoreboard, sponsor logos, players, watermark, UI frame, cartoon
  outlines, flat vector shading, emoji, tiled repeating crowd faces, harsh drop shadow

### cd-pitch-strip — the 22-yard pitch drawn in perspective down the middle of the canvas
- **Size:** 640×1280 portrait, transparent PNG, keystone trapezoid (narrow top, wide bottom)
- **Prompt:** Create a mobile-game asset of a cricket pitch strip seen in steep one-point
  perspective, narrow at the far bowler's end and wide at the near crease, in stylised
  broadcast realism. Dry rolled clay graduating `#8B7748` in shadow at the far end through
  `#C2A971` to sunlit `#E0CDA0` at the near end, with subtle scuff patches, footmarks and a
  worn rough area off the line. Crisp chalked crease lines in `rgba(255,255,255,0.82)` at both
  ends, slightly powdery and imperfect. Lit by overhead floodlights so the surface has a soft
  broad specular and the footmark divots cast tiny contact shadows. Transparent background so
  it composites over turf.
- **Negative:** text, measurements, grass, players, stumps, watermark, cartoon outlines, flat
  fill colour, hard black outline, emoji, drop shadow

### cd-ball-leather — the delivery: the single most-tracked object on screen
- **Size:** 512×512, transparent PNG, centred with 12% padding
- **Prompt:** Create a polished mobile-game asset of a used red cricket ball in stylised
  broadcast realism, three-quarter angle with the seam running diagonally across the visible
  face. Leather graduating `#FF6E63` on the lit crown through `#D8302A` body to `#7C1410` in
  the terminator, scuffed and slightly asymmetric with one polished shine-side and one rough
  side, a raised hand-stitched seam in warm cream `#F4E3C8` with individual stitches visible,
  and a faint grass smear. Strong warm key from upper-left, cold cyan rim along the lower-right
  edge so it reads against a dark sky. Transparent background, no contact shadow.
- **Negative:** text, brand stamp, watermark, baseball stitching, perfect glossy sphere, flat
  vector shading, cartoon outline, emoji, drop shadow, motion blur

### cd-ball-trail — the streak the ball leaves in flight and after the shot
- **Size:** 1024×256, transparent PNG, horizontal, additive-blend friendly
- **Prompt:** Create a mobile-game VFX asset of a comet-style motion trail for a struck cricket
  ball, in stylised broadcast realism. A tapering ribbon that is hottest and widest at the
  right end and dissolves to nothing at the left, cored in warm white and shading out through
  `#FF8A3D` to a transparent `#F26522` haze, with a few fine sparks and a faint heat shimmer.
  Reads as air displacement under floodlight, not as fire. Pure black-free transparent
  background suitable for additive blending.
- **Negative:** text, watermark, flames, smoke puffs, glitter stars, hard edges, cartoon
  speedlines, emoji, opaque background, drop shadow

### cd-batter-rig — the player character at the near crease
- **Size:** 768×1024, transparent PNG, one file per pose (stance / mid-swing / follow-through)
- **Prompt:** Create a mobile-game character asset of a right-handed cricket batter in a
  side-on stance, seen from behind and slightly to the right, in stylised broadcast realism
  with a clean readable silhouette. Crisp white kit `#F3F7FF` with a royal blue `#003DA6`
  shoulder yoke and collar, a blue `#1E6BE0` helmet with a steel grille, cream leg pads
  `#F0EBDA` with `#C6BC9C` strap lines and honest scuffing at the knee roll, batting gloves
  with sausage padding. Athletic adult build, weight forward, head still and eyes level.
  Floodlit: warm key from upper-left, cyan rim tracing the back and helmet. Transparent
  background, no ground plane.
- **Negative:** text, jersey number, sponsor logos, face detail beyond the grille, watermark,
  cartoon outlines, chibi proportions, flat shading, emoji, drop shadow

### cd-bat-willow — the bat, rotated by the swing animation
- **Size:** 256×768 vertical, transparent PNG, pivot at the very top of the handle
- **Prompt:** Create a mobile-game asset of a cricket bat standing vertically, face-on, in
  stylised broadcast realism. Pressed English willow blade in warm cream `#DDBB80` with visible
  straight grain lines and a darker `#A67E45` edge and toe, a chalk-dusted sweet spot slightly
  above centre, a rubber grip in deep navy `#12284A` with moulded ridges, and honest ball marks
  on the face. Soft broad floodlight specular running down the blade. Composition strictly
  vertical and centred so the sprite can be rotated about its handle top.
- **Negative:** text, brand decals, stickers, watermark, cartoon outline, flat colour, glossy
  plastic finish, emoji, drop shadow, tilted composition

### cd-stumps-set — the wicket the batter is defending
- **Size:** 512×512, transparent PNG, centred, base at the bottom edge
- **Prompt:** Create a mobile-game asset of a set of three cricket stumps with two bails
  seated, viewed straight on, in stylised broadcast realism. Turned ash-cream timber `#EFE0BC`
  on the lit faces falling to `#B79A62` in shadow, faint lathe rings and a slightly worn top,
  bails resting in their grooves. Lit by high floodlights so each stump throws a narrow soft
  core shadow onto its neighbour. Transparent background.
- **Negative:** text, LED stump lights, sponsor bands, watermark, cartoon outline, flat colour,
  emoji, ground shadow, extra stumps

### cd-stumps-shattered — dismissal moment and the "all out" result header
- **Size:** 768×768, transparent PNG, explosion centred
- **Prompt:** Create a mobile-game asset of cricket stumps at the instant of being bowled, in
  stylised broadcast realism. Two stumps cartwheeling outward at opposing angles, one still
  planted and leaning, both bails flung high and rotating, cream timber `#EFE0BC` to `#B79A62`,
  with a small burst of dry pitch dust `#C2A971` at the base and a crimson `#EF4444` shock
  glow washing the near faces. Frozen high-shutter action, floodlit with a cyan rim on the
  flying pieces. Transparent background.
- **Negative:** text, sparks, fire, watermark, comic impact star, cartoon outline, flat colour,
  emoji, ground shadow

### cd-length-marker — the orange ellipse that telegraphs where the ball will pitch
- **Size:** 512×256, transparent PNG, drawn as a flattened ellipse in pitch perspective
- **Prompt:** Create a mobile-game HUD-on-ground asset of a glowing landing marker painted flat
  onto a cricket pitch in perspective, so it reads as a squashed ellipse rather than a circle.
  A translucent orange fill `rgba(242,101,34,0.28)` inside a bright `#F26522` to `#FF8A3D` rim
  that is thickest at the near edge, with a soft outward bloom onto the clay and two short
  tick marks at the left and right extremes. Looks projected on the surface, catching the pitch
  texture through it. Transparent background.
- **Negative:** text, numbers, arrows, watermark, 3D ring standing upright, cartoon outline,
  opaque fill, emoji, drop shadow

### cd-timing-gauge — the sweeping arc across the crease that the whole game is played on
- **Size:** 1024×256, transparent PNG, shallow upward arc spanning the full width
- **Prompt:** Create a mobile-game HUD asset of a shallow timing arc lying in perspective across
  a cricket crease, in stylised broadcast realism with a glassy holographic finish. A neutral
  track in `rgba(255,255,255,0.17)`, a wider GOOD band in `rgba(40,167,69,0.55)` centred on the
  apex, and a narrow blazing PERFECT core in `#4ADE80` at dead centre with a tight outward
  glow; a single tick riser at the apex. Bands are soft-capped and slightly bevelled, sitting
  just above the turf with a faint reflected bloom on the grass beneath. Transparent background.
- **Negative:** text, tick numbers, percentages, watermark, full circle, upright dial, cartoon
  outline, flat colour, emoji, drop shadow

### cd-cover-shield — the wicket shield banked by middling a Cover ball; also the HUD pip
- **Size:** 512×512, transparent PNG, centred with 15% padding
- **Prompt:** Create a polished mobile-game asset of a heater-shaped protection shield rendered
  as brushed brand-blue metal with a glass overlay, in stylised broadcast realism. Body
  graduating `#003DA6` at the rim to `#1E6BE0` at the boss, a pale `#A6D0FF` bevelled edge, a
  crisp white check mark embossed on the face, and a soft interior glow suggesting it is
  charged and holding. Slight three-quarter tilt so the bevel catches the floodlights, cyan rim
  light along the lower-right. Transparent background.
- **Negative:** text, heraldry, crest, cross, watermark, cartoon outline, flat colour, plastic
  toy finish, emoji, drop shadow

### cd-hud-glyphs — the run / ball / wicket icons in the top status strip
- **Size:** 128×128 each, transparent PNG, delivered as a matched set on one sheet
- **Prompt:** Create a matched set of four mobile-game HUD glyphs in a single unified style —
  a thin engraved-metal line style with a subtle floodlit bevel and no fill — for a cricket
  chase game: (1) a running batter silhouette for RUNS in green `#28A745`, (2) a small ball
  with a seam for BALLS REMAINING in orange `#F26522`, (3) a tilted stump with a fallen bail
  for WICKETS in red `#EF4444`, (4) a shield outline for COVER in blue `#1E6BE0`. Identical
  stroke weight, identical optical size, identical corner radius across all four so they sit in
  one row. Transparent background.
- **Negative:** text, labels, numbers, badges, circular backing plates, watermark, mixed line
  weights, filled shapes, emoji, drop shadow

### cd-boundary-spark — the gold burst when the ball clears the rope
- **Size:** 768×768, transparent PNG, radial, additive-blend friendly
- **Prompt:** Create a mobile-game VFX asset of a celebratory boundary burst, in stylised
  broadcast realism. A radial spray of tapered gold shards `#FFC845` and `#FFE38A` of mixed
  length firing outward from a hot white core, with a thin expanding ring shockwave and a
  scatter of fine embers drifting off the top edge. Reads like floodlight catching thrown
  confetti, warm and celebratory, not explosive. Transparent background, no black matte.
- **Negative:** text, fire, smoke, star shapes, cartoon impact lines, watermark, opaque
  background, emoji, drop shadow

### cd-result-trophy — the win header on the results screen
- **Size:** 768×768, transparent PNG, centred with 12% padding
- **Prompt:** Create a polished mobile-game asset of a small two-handled cricket trophy cup with
  a miniature bat and ball crossed at its base, in stylised broadcast realism. Polished gold
  `#FFC845` body with `#FFE38A` highlights and `#B07B12` in the deep reflections, a navy
  `#003DA6` enamelled band around the plinth, willow bat in `#DDBB80` and a red `#D8302A` ball.
  Three-quarter hero angle, floodlit with a warm key and a cold cyan rim, a soft golden bloom
  behind the cup mouth. Transparent background.
- **Negative:** text, engraving, year, sponsor marks, watermark, cartoon outline, flat colour,
  plastic finish, emoji, ground shadow, confetti

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
