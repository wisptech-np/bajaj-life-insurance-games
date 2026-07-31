# Risk Slash — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Risk Slash is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Risk Slash's answer |
|---|---|
| Motif | Risk Slash gameplay theme & visual style. |
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

### bg-dojo-lacquer — full-screen game background behind all orbs
- **Size:** 1080×1920 px, 9:16 portrait, opaque PNG
- **Prompt:** Create a polished mobile-game background of a night dojo wall rendered as polished
  black lacquerware, for a swipe-to-slice arcade game. Deep vertical gradient from ink black
  `#071026` at the top through lacquer navy `#0d1e3f` to `#0a1730` at the floor, with a faint
  washi-paper fibre grain visible only in the mid-tones. Across the upper third lay two lazy dry
  sumi-e brush sweeps in translucent `#003DA6`, the bristle streaks left visible, as if painted
  with a nearly empty brush. Along the bottom edge suggest a low lacquered rail catching a single
  soft `#FFC845` gold-leaf highlight. Keep the middle 70% of the frame visually quiet and low
  contrast so bright sprites read cleanly on top of it. Flat frontal camera, no perspective
  vanishing point, no horizon line. Muted, moody, matte-with-one-gloss-highlight finish.
- **Negative:** text, watermark, UI frame, characters, weapons, realistic photo, cherry blossoms,
  dragons, emoji, mockup device bezel, busy pattern in the centre, bright saturated fills

### blade-ink-ribbon — the slash trail that follows the player's finger
- **Size:** 512×512 px, transparent PNG (a single left-to-right stroke, tileable head-to-tail)
- **Prompt:** Create a polished mobile-game asset of a single wet calligraphy brush stroke
  travelling from lower-left to upper-right, for a swipe-to-slice arcade game. The stroke is
  thickest at its head and tapers to a dry split-bristle wisp at its tail. Core of the stroke is
  pure white with a hot `#7FC0FF` inner glow; the outer bleed is translucent `#1E6BE0` ink
  spreading into the paper. A few tiny flicked ink droplets trail off the tail. Absolutely no
  metal, no hilt, no sword shape — this is ink, not steel. Transparent background, centred with
  generous padding so the glow is not clipped. Export-ready game asset.
- **Negative:** text, watermark, sword, katana, hilt, blade metal, sparks, lens flare, drop
  shadow, emoji, realistic photo, gradient banding

### risk-fruit-scam — "SCAM CALL" risk orb, the most common slice target
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a carved jade fruit the size of a plum,
  bristling with eight short blunt thorns, for a swipe-to-slice arcade game. The body is polished
  translucent jade `#49E24B` deepening to `#0E5C1D` at the base, with a single crisp white
  crescent gloss highlight at the upper-left. Etched into the front face in gold-leaf `#FFC845`
  line-work is a simple old-fashioned telephone handset glyph, incised like an engraved seal, not
  printed on. A faint hairline kintsugi gold crack runs down one side hinting where it will split.
  Front-facing camera, centred, generous padding. Transparent background.
- **Negative:** text, watermark, numbers, emoji, realistic fruit photography, leaves, stem,
  cartoon face, eyes, drop shadow, UI frame, background gradient

### risk-fruit-fees — "HIDDEN FEES" risk orb
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a carved jade fruit with a slightly flattened
  melon profile and ten shallow ridges, for a swipe-to-slice arcade game. Body in polished jade
  `#3ECB5B` deepening to `#115C26`, waxy surface, one white crescent gloss. Incised into the front
  in gold-leaf `#FFC845` seal-engraving line-work is a percent-sign glyph — two small circles and a
  diagonal bar. Ridges catch a thin rim light. Front-facing camera, centred, generous padding.
  Transparent background.
- **Negative:** text, watermark, currency symbols, emoji, realistic photo, leaves, face, eyes,
  drop shadow, UI frame

### risk-fruit-debt — "DEBT TRAP" risk orb, the heaviest-looking one
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a squat, heavy carved jade gourd that visibly
  sags under its own weight, for a swipe-to-slice arcade game. Body in `#63D14B` fading to
  `#1E5C0E` at the fat bottom, denser and more opaque than the other fruits, with a matte band
  around its widest point. Incised in gold-leaf `#FFC845` is a simple kettlebell-weight glyph.
  The whole silhouette should read as bottom-heavy at thumbnail size. Front-facing camera, centred,
  generous padding. Transparent background.
- **Negative:** text, watermark, chains, shackles, emoji, realistic photo, face, eyes, drop shadow,
  UI frame

### risk-fruit-inflation — "INFLATION" risk orb, the fastest mover
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of an elongated teardrop-shaped carved jade fruit
  that tapers to a point at the top, for a swipe-to-slice arcade game. Body in acid-lime jade
  `#8FDD4A` deepening to olive `#3D5C0E`, glassier and more translucent than the rest of the set so
  it reads as "rising". Incised in gold-leaf `#FFC845` is an upward-pointing arrow glyph. Two faint
  ascending speed ticks are etched behind the arrow. Front-facing camera, centred, generous
  padding. Transparent background.
- **Negative:** text, watermark, percentage numbers, charts, emoji, realistic photo, face, eyes,
  drop shadow, UI frame

### risk-fruit-medical — "MEDICAL BILL" risk orb
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a round carved jade fruit with a smooth
  unbroken surface and a shallow dimple at the top, for a swipe-to-slice arcade game. Body in
  cool teal-jade `#2FBF6B` deepening to `#0E5C33`, clinically clean and slightly cooler in
  temperature than its siblings. Incised in gold-leaf `#FFC845` is a plain equal-armed cross glyph
  with rounded ends. Front-facing camera, centred, generous padding. Transparent background.
- **Negative:** text, watermark, red cross branding, hospital logo, syringe, pills, emoji,
  realistic photo, face, eyes, drop shadow, UI frame

### risk-fruit-impulse — "IMPULSE BUY" risk orb
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a carved jade fruit shaped like a small
  cinched pouch, gathered and knotted at the top, for a swipe-to-slice arcade game. Body in mint
  jade `#55E28F` deepening to `#0F4D2E`, with soft fabric-like folds carved into the stone. Incised
  in gold-leaf `#FFC845` is a simple shopping-bag glyph with two handle arcs. Front-facing camera,
  centred, generous padding. Transparent background.
- **Negative:** text, watermark, brand logos, price tags, emoji, realistic photo, face, eyes,
  drop shadow, UI frame

### shield-orb-family — the blue Family Shield orb the player must NOT slice
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a serene cobalt-blue lacquer sphere wrapped in
  a folded washi paper protection charm, for a swipe-to-slice arcade game. The sphere is smooth,
  utterly thornless and calm — the visual opposite of a spiky jade fruit — in a radial gradient
  from `#7FC0FF` at the upper-left through `#1E6BE0` to `#003DA6` at the rim, with a soft outward
  halo of `#7FC0FF` at 30% opacity. Painted on the front in a single confident white sumi-e brush
  stroke is a minimal three-figure family silhouette (two adults, one child), shoulders touching.
  A slim gold-leaf `#FFC845` paper band circles the sphere like a sealed charm. Nothing about it
  should look edible or sliceable. Front-facing camera, centred, generous padding.
  Transparent background.
- **Negative:** text, watermark, thorns, spikes, cracks, faces with features, emoji, realistic
  photo, shield-crest heraldry shape, drop shadow, UI frame

### splat-jade-stain — fading goo decal left on the background after a slice
- **Size:** 512×512 px, transparent PNG, three variants
- **Prompt:** Create a polished mobile-game asset of an irregular splashed ink stain in jade green,
  for a swipe-to-slice arcade game. Mix of `#3ECB5B` in the body and `#177A32` in the thicker
  pooled centre, with feathered edges bleeding into invisible paper fibre, a handful of satellite
  droplets, and one long directional flick tail as though thrown from a brush. Roughly circular
  overall but deliberately asymmetric. Flat top-down orientation, no thickness, no gloss.
  Transparent background, centred with padding. Generate three visually different variants.
- **Negative:** text, watermark, blood, gore, realistic liquid photography, emoji, drop shadow,
  bevel, UI frame, perfect circle

### hud-icon-set — the three HUD glyphs (timer, shield lives, combo meter)
- **Size:** 256×256 px each, transparent PNG, delivered as a matching set of three
- **Prompt:** Create a set of three polished mobile-game HUD icons drawn as single-weight gold-leaf
  `#FFC845` seal-engraving line-work on nothing, for a swipe-to-slice arcade game — (1) a circular
  sand-timer glyph, (2) a small paper-charm shield tag glyph, (3) a rising three-step combo tally
  glyph. All three share identical stroke weight, identical rounded caps, identical optical size,
  and the same incised-into-lacquer feel with a hairline `#0E5C1D` inner shadow along the bottom of
  each stroke. Flat frontal view, each centred in its own square with even padding. Transparent
  background.
- **Negative:** text, numbers, watermark, filled shapes, emoji, gradients, drop shadow, badge
  backgrounds, mismatched stroke weights, realistic photo

### banner-frenzy — the "FRENZY" state banner and warm screen tint
- **Size:** 1024×256 px, transparent PNG (horizontal ribbon)
- **Prompt:** Create a polished mobile-game asset of a torn horizontal washi paper banner ribbon
  with ragged fibrous edges, for a swipe-to-slice arcade game. The paper is warm off-white washed
  with a `#F26522` orange bleed that intensifies toward both torn ends, with a single dry sumi-e
  brush sweep of `#FF8A3D` running its length and a thin gold-leaf `#FFC845` rule near the top
  edge. Leave the centre third clean and unbusy so game text can be composited over it later.
  Flat frontal view, transparent background, generous vertical padding.
- **Negative:** text, lettering, watermark, flames, fire, sparks, emoji, realistic photo, drop
  shadow, UI frame, busy centre

### result-win-tableau — win-state art on the results screen
- **Size:** 800×800 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of a calm still-life after the fight, for
  a swipe-to-slice arcade game: the cobalt-blue lacquer family-charm sphere rests intact and
  glowing softly on a low black lacquer stand, while around it lie six cleanly bisected jade fruit
  halves, cut faces upward, each cut edge sealed with a bright gold-leaf `#FFC845` kintsugi seam.
  A single wet ink brush stroke arcs behind the group in translucent `#003DA6`. Palette: jade
  `#49E24B` and `#0E5C1D`, cobalt `#1E6BE0` and `#003DA6`, gold `#FFC845`, on nothing. Soft top-left
  key light, matte lacquer finish with a couple of controlled gloss points. Centred composition
  with padding. Transparent background.
- **Negative:** text, watermark, trophy, medal, confetti, fireworks, emoji, realistic photo, human
  faces, drop shadow, UI frame

### result-loss-tableau — loss-state art on the results screen
- **Size:** 800×800 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of an aftermath still-life for a
  swipe-to-slice arcade game: three cobalt-blue lacquer family-charm spheres lie cracked open on a
  black lacquer floor, their washi paper charm bands torn and curling, while whole uncut jade fruit
  crowd in from the edges of the frame still bristling with thorns. The cracks glow a dull warning
  `#EF4444` instead of gold. One spent ink brush stroke lies flat and dry across the bottom.
  Palette: cobalt `#003DA6`, jade `#49E24B`, ink black `#071026`, warning red `#EF4444`. Sombre low
  key light, no gold leaf anywhere. Centred composition with padding. Transparent background.
- **Negative:** text, watermark, gold, blood, gore, skulls, emoji, realistic photo, human faces,
  drop shadow, UI frame

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
