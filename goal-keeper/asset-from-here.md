# Goal Keeper — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

> **Rewritten 2026-08-03** for the rebuilt game. The previous sheet described a
> penalty-save game (keeper diving into six zones, shield glove, feint telegraph)
> that no longer exists. Every asset below serves the cover-span game: a bar of
> light on the goal line whose *width* is the player's sum assured.

## Art direction lock (read once, applies to every prompt below)

Flat silk-screened match poster. Four flat ink layers, no gradients, tone
carried by coarse halftone dots, one layer deliberately misregistered by one to
two pixels, light paper grain. No 3D rendering, no photographic texture, no
bloom, no bevel, no drop shadow.

Two rules that are not stylistic and cannot be traded away:

1. **ONE LIGHT SOURCE — a floodlight high and to the LEFT.** Every lit face is
   the left face; every contact shadow falls down and to the right. There is no
   second key light, no rim light and no glow anywhere in this game. If an asset
   comes back lit from the right or lit from everywhere, it is wrong.
2. **FIVE HUES, ONE JOB EACH.** Anything without a job is drawn in the neutral
   ramp. Using a hue for the wrong job breaks the game's readability, not just
   its look.

| Hue | Hex | Its ONLY job |
|---|---|---|
| Cover cyan | `#00A3E0` → `#7BDCFF` | the cover span, the column of light it throws, the premium pips |
| Risk crimson | `#EF4444` (deep `#7F1D1D`) | strikers, aim crosshairs, ball tracers, a goal conceded |
| Save green | `#28A745` → `#4ADE80` | a save, and nothing else |
| Family gold | `#FFC845` → `#FFE38A` | the three family-goal banners and their funding pips |
| White ink | `#F4F8FF` | structure: posts, goal line, type |

Neutral ramp (ground, never meaning): Night Navy `#070F22`, Sky Mid `#0A1A38`,
Sky Low `#0C2450`, Out-of-play `#050B18`, Stand `#060E1F`, Hoarding `#08234C`,
Turf `#0A3520` / `#0F4E2E` / `#15693F`.

Brand anchors remain Blue `#003DA6` and Green `#28A745`; **orange is not used in
this game** — it collided with the crimson risk hue and has been retired.

Two hard technical rules, because the game post-processes these files at runtime:

1. All game sprites must be centred with sufficient padding and readable at small
   mobile display sizes.
2. If a transparent PNG cannot be produced, use `#FF00FF` flat backdrop for
   runtime keying.

---

### gk-bg-stadium — the full-screen poster the whole match is played on
- **Size:** 1080×1920 portrait, opaque PNG. Keep y=380–1300 quiet: that band is
  the empty pitch the shots cross and nothing may compete there.
- **Prompt:** Create a portrait mobile-game backdrop in flat silk-screened
  sports-poster style, looking down a football pitch from behind the attack. Four
  flat ink layers, no gradients: a night sky as a solid `#070F22` field carrying
  ONE floodlight pylon in the upper left — a thin `#0B1830` mast with a bank of
  five hard white `#DCE9FF` lamps — and the cone of light it throws falling to the
  right across everything below; a crowd stand as a solid `#060E1F` band with a
  coarse halftone screen of `rgba(120,170,240,0.35)` dots standing in for faces,
  denser toward the front rows; a perimeter hoarding as a flat `#08234C` band
  printed with a repeating open chevron rhythm in `rgba(0,163,224,0.22)`; and the
  pitch as a trapezoid of flat `#0F4E2E` narrowing toward the top, with two
  symmetrical lighter mown stripes in `#15693F` converging on the same vanishing
  point as the touchlines. Everything outside the pitch is one flat `#050B18`.
  One ink layer misregistered by two pixels along the hoarding. Light paper grain.
- **Negative:** text, gradients, photographic grass, soft shadows, 3D rendering,
  bokeh, lens flare, a second light source, light from the right, individual
  crowd faces, sponsor logos, watermark, emoji, drop shadow

### gk-cover-span — THE hero element: the player's sum assured
- **Size:** 1024×256, transparent PNG, horizontal, symmetrical about its centre
- **Prompt:** Create a mobile-game HUD element in flat silk-screened poster style:
  a horizontal bar of cyan light, solid `#00A3E0` with a hard `#7BDCFF` lit edge
  along its TOP only (the light is above and to the left) and a `#00527A` foot.
  At each end, a chunky square bracket in `#7BDCFF` — like a dimension marker on
  a technical drawing — turning inward, so the bar reads as a measured *span*
  with a definite end rather than a glowing blob. Above the bar, a translucent
  column of `rgba(0,163,224,0.20)` rising and tapering slightly inward, edged by
  two thin `rgba(123,220,255,0.28)` rails, fading to nothing at the top. Hard
  edges everywhere; the sense of light comes from the flat shapes, not from blur.
  Provide a second LAPSED version: no bar at all, only a dashed crimson `#EF4444`
  rule where the bar used to be. Transparent background.
- **Negative:** text, glow, bloom, soft gradient, bevel, 3D rendering, rounded
  blobs, particles, sparkle, watermark, emoji, drop shadow

### gk-striker — the risk, standing on the edge of the box
- **Size:** 768×1024, transparent PNG, one file per pose (idle, lean, strike)
- **Prompt:** Create a mobile-game character asset of a footballer in flat
  silk-screened poster style, built from chunky geometric ink shapes: a rounded
  rectangle torso, an oval head, two thick strokes for legs. Kit printed in solid
  crimson `#EF4444` with the shaded side — the RIGHT side, because the light is
  upper left — as a flat `#7F1D1D` block rather than as shading. Skin a flat
  `#E8B98C`. Bold outer silhouette, no gradients, one ink layer misregistered at
  the shoulder. A single hard elliptical contact shadow offset down and to the
  right. The pose must read instantly from its outline alone at 30 px tall.
  Transparent background.
- **Negative:** text, jersey number, sponsor logo, facial features, gradients, 3D
  rendering, soft shading, photographic fabric, light from the right, watermark,
  emoji, drop shadow

### gk-ball — the shot, the fastest thing on screen
- **Size:** 512×512, transparent PNG, centred with 15% padding
- **Prompt:** Create a mobile-game asset of a football in flat silk-screened
  poster style: a solid white `#FFFFFF` circle with a bold geometric panel pattern
  printed straight on top in flat `#0B1221` — one centre disc and three smaller
  discs at equal spacing, with no attempt to wrap them around a sphere. The only
  tone is a crescent of `#B9C8DF` on the LOWER RIGHT standing in for shadow.
  Heavy, confident ink edges. It must be identifiable at 16 px. Transparent
  background, no contact shadow.
- **Negative:** text, brand marks, gradients, 3D sphere rendering, realistic
  leather, specular highlight, motion blur, soft shading, shadow on the left,
  watermark, emoji, drop shadow

### gk-crosshair — the telegraph, printed on the goal line before the shot
- **Size:** 512×512, transparent PNG, centred, radially symmetrical
- **Prompt:** Create a mobile-game HUD asset in flat silk-screened poster style: a
  crimson `#EF4444` aiming reticle — one hard-edged open ring, two short
  horizontal tick marks outside it left and right, no vertical ticks. Stroke
  weight even all the way round, absolutely no glow and no fill. Provide it at
  three ring diameters as a matched set (wide, medium, tight) so the game can
  play them in sequence as the shot is called. Transparent background.
- **Negative:** text, numbers, arrows, glow, gradients, fill, 3D rendering, soft
  edges, targeting brackets, watermark, emoji, drop shadow

### gk-lock-line — the rule the whole game rests on
- **Size:** 1536×128, transparent PNG, horizontal
- **Prompt:** Create a mobile-game HUD asset in flat silk-screened poster style: a
  long dashed horizontal rule with even 5-on 7-off dashes. Provide two versions —
  an OPEN state in a very faint `rgba(244,248,255,0.22)`, and a LOCKED state in
  solid crimson `#EF4444` at double the stroke weight with a torn, ink-starved
  edge at the dash ends, as though the second pass ran dry. No glow on either.
  Transparent background.
- **Negative:** text, arrows, glow, gradients, 3D rendering, soft edges, animated
  blur, watermark, emoji, drop shadow

### gk-goal-frame — posts, goal line and net
- **Size:** 1536×768, transparent PNG, front-on, symmetrical
- **Prompt:** Create a mobile-game asset of a football goal seen from behind the
  attack, in flat silk-screened poster style: two solid `#F4F8FF` posts with a
  flat `#8FA6C8` face printed down the RIGHT side of each to imply thickness (the
  light is upper left), joined by a crisp white goal line. Below the line, the net
  printed as a regular open lattice of thin `rgba(206,228,255,0.18)` lines over a
  near-black `rgba(4,10,22,0.86)` field, with one brighter
  `rgba(206,228,255,0.42)` line along the bottom edge in a single hard jump
  rather than a fade. Bilaterally symmetrical, no perspective, no rounding.
  Transparent background.
- **Negative:** text, sagging net, photographic mesh, gradients, perspective
  distortion, 3D rendering, soft shadows, shading on the left face, advertising
  boards, watermark, emoji, drop shadow

### gk-family-banner — the three things you are actually defending
- **Size:** 768×256 each, transparent PNG, one per goal, matched set
- **Prompt:** Create a matched set of three mobile-game banner assets in flat
  silk-screened poster style: rectangular cloth plates hanging in a goal net, each
  with a solid gold `#FFC845` header stripe across the top, a body of
  `rgba(255,255,255,0.055)` with a thin `rgba(255,200,69,0.34)` border, and a row
  of six small solid `#FFC845` funding pips along the lower third. Provide each
  plate in a HEALTHY version (gold) and a BREACHED version (body `rgba(70,14,14,0.92)`,
  border and header crimson `#EF4444`, every pip knocked out to
  `rgba(255,255,255,0.09)`). A hard shadow offset two pixels down and to the
  right. No lettering — the game sets the type. Transparent background.
- **Negative:** text, lettering, words, numbers, gradients, realistic cloth folds,
  3D rendering, soft shading, tassels, glow, watermark, emoji, drop shadow

### gk-premium-pip — the currency of renewal
- **Size:** 256×256 each, transparent PNG, matched pair
- **Prompt:** Create a matched pair of mobile-game HUD tokens in flat
  silk-screened poster style: a hard-edged diamond (a square rotated 45°) in solid
  cyan `#00A3E0` with a one-pixel `#7BDCFF` outline for the HELD state, and the
  same diamond in flat `rgba(255,255,255,0.10)` with no outline for the SPENT
  state. Identical bounding box and identical optical weight so a row of them
  reads as one meter. Absolutely no bevel, no gradient, no glow. Transparent
  background.
- **Negative:** text, numbers, coins, currency symbols, gradients, bevel, glow, 3D
  rendering, soft shading, watermark, emoji, drop shadow

### gk-save-burst — the flash when the shot lands inside the span
- **Size:** 768×768, transparent PNG, radial, one flat-ink layer
- **Prompt:** Create a mobile-game VFX asset in flat silk-screened poster style: a
  save impact printed as a bold radial burst of straight-sided green `#28A745`
  wedges of alternating length radiating from a solid `#4ADE80` centre, with a
  single hard concentric ring outside them and a scatter of coarse halftone dots
  beyond that. Every edge hard, every fill flat — the energy comes from the wedge
  geometry, never from a glow. One layer offset two pixels for a misregistered ink
  fringe. Transparent background.
- **Negative:** text, glow, bloom, soft gradient, smoke, fire, sparkle stars, 3D
  rendering, watermark, opaque background, emoji, drop shadow

### gk-concede-mark — the stamp when the shot goes through the gap
- **Size:** 768×768, transparent PNG, one flat-ink layer
- **Prompt:** Create a mobile-game VFX asset in flat silk-screened poster style: a
  conceded-goal stamp printed as a rough crimson `#EF4444` ring with a broken,
  ink-starved edge, a bold cross struck through it in the same ink, and a torn
  `#FF8B8B` halftone shadow offset three pixels down and to the right like a badly
  registered second pass. Looks like a rubber stamp slammed onto the poster. Hard
  edges, flat fill, visible ink starvation at the stroke ends. Transparent
  background.
- **Negative:** text, letters, words, gradients, glow, 3D rendering, soft edges,
  blood, realistic texture, watermark, opaque background, emoji, drop shadow

### gk-hud-glyphs — the strip icons
- **Size:** 128×128 each, transparent PNG, matched set on one sheet
- **Prompt:** Create a matched set of four mobile-game HUD glyphs in one unified
  flat silk-screened poster style — solid single-colour silhouettes, no outline,
  no fill variation: (1) a horizontal bar with bracket ends for COVER in cyan
  `#00A3E0`, (2) a diamond for PREMIUM in cyan `#00A3E0`, (3) a dashed horizontal
  rule for the LOCK in crimson `#EF4444`, (4) a small plate with a header stripe
  and pips for a FAMILY GOAL in gold `#FFC845`. Identical optical weight,
  identical bounding box and identical corner treatment across all four so they
  sit in one row. Each printed with a faint one-pixel misregistered second colour
  behind it. Transparent background.
- **Negative:** text, labels, numbers, outlines, backing plates, gradients, 3D
  rendering, soft shading, mixed weights, watermark, emoji, drop shadow

### gk-result-poster — the win art on the results screen
- **Size:** 1024×1024, transparent PNG, centred with 10% padding
- **Prompt:** Create a mobile-game hero asset in flat silk-screened poster style:
  a wide cyan `#00A3E0` cover span with chunky `#7BDCFF` bracket ends stretched
  clean across a goal mouth, its translucent column of light rising behind it, and
  three intact gold `#FFC845` family plates hanging in the net below, each with
  its full row of pips. Printed over a bold sunburst of alternating flat `#28A745`
  and `#4ADE80` wedges. Four flat ink layers, coarse halftone dots for all tone,
  one layer misregistered by two pixels, light paper grain, and every lit edge on
  the upper left. The composition should read like a commemorative match poster —
  triumphant, graphic, completely free of rendering.
- **Negative:** text, lettering, dates, scores, trophy, medal, confetti, keeper,
  diving figure, gradients, 3D rendering, soft shading, photographic elements,
  light from the right, watermark, emoji, drop shadow

---

## Replacement checklist

| Prompt id | Replaces |
|---|---|
| `gk-bg-stadium` | `makeStadiumBitmap()` in `GoalKeeperGame.jsx` |
| `gk-cover-span` | `drawCoverSpan()` |
| `gk-striker` | `drawStriker()` |
| `gk-ball` | `drawBall()` |
| `gk-crosshair` / `gk-lock-line` | `drawShots()` telegraph, `drawLockLine()` |
| `gk-goal-frame` | posts + net in `makeStadiumBitmap()` |
| `gk-family-banner` | `drawFamilyGoals()` |
| `gk-premium-pip` / `gk-hud-glyphs` | `drawControlStrip()` |
| `gk-save-burst` / `gk-concede-mark` | the kit particle bursts on impact |
| `gk-result-poster` | `HeroGoal()` in `Screens.jsx` / Results screen |

The game currently renders all of the above procedurally on canvas and inline
SVG, to the same specification. These prompts exist so a raster pass can replace
that art without changing a single rule, and the engine binds them at runtime
with fallback to the procedural path.
