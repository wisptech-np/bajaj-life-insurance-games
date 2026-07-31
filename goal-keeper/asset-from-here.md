# Goal Keeper — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Goal Keeper is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Goal Keeper's answer |
|---|---|
| Motif | Goal Keeper gameplay theme & visual style. |
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

### gk-bg-terrace — the full-screen poster the whole match is played on
- **Size:** 1080×1920 portrait, opaque PNG, keep y=250–1250 quiet for the goal mouth
- **Prompt:** Create a portrait mobile-game backdrop in flat silk-screened sports-poster style:
  a floodlit terrace behind a football goal, built from four flat ink layers with no gradients
  at all. Night sky as a solid `#08152F` field with a coarse halftone dot fade into `#0A2450`
  toward the horizon; the crowd as two solid bands of `#071228` and a halftone screen of
  `rgba(120,170,240,0.16)` dots standing in for faces; the pitch as a flat `#0E4A2C` slab with
  one lighter mown stripe printed in `#12613A` and a single crisp white touchline. One layer
  deliberately misregistered by two pixels so a thin colour fringe shows along the horizon.
  Light paper grain over the whole image. No shading, no soft edges, no depth of field.
- **Negative:** text, gradients, photographic grass, soft shadows, 3D rendering, bokeh, lens
  flare, individual crowd faces, sponsor boards, watermark, emoji, drop shadow

### gk-keeper — the player character, standing on his line and diving
- **Size:** 768×1024, transparent PNG, one file per pose (set, dive left, dive right, smother)
- **Prompt:** Create a mobile-game character asset of a goalkeeper in flat silk-screened
  sports-poster style, built from chunky geometric ink shapes: an arc for the shoulders, a
  wedge for each boot, a simple oval head. Jersey printed in solid keeper orange `#F26522`
  with the shaded side rendered as a halftone screen of `#B33F10` dots rather than as
  shading, gloves in solid gold `#FFC845` with `#FFE38A` cuffs, skin as a flat `#E8B98C` fill
  with a single `#B87F4E` hatch block. Bold outer silhouette, absolutely no gradients, one ink
  layer misregistered slightly at the collar. The pose must read instantly from its outline
  alone at 60 px tall. Transparent background.
- **Negative:** text, jersey number, sponsor logo, facial features beyond a mark, gradients,
  3D rendering, soft shading, photographic fabric, watermark, emoji, drop shadow

### gk-striker — the opponent, whose plant is the telegraph you have to read
- **Size:** 768×1024, transparent PNG, one file per pose (run-up, plant left, plant centre, plant right)
- **Prompt:** Create a mobile-game character asset of a penalty taker in flat silk-screened
  sports-poster style, same chunky geometric ink construction as the keeper. Kit printed in
  solid striker blue `#1E6BE0` with the shaded side as a halftone screen of `#00287A` dots,
  boots as flat dark wedges, skin as a flat `#E8B98C` fill with one `#B87F4E` hatch block.
  Critically, the **planted standing foot and the lean of the torso must be exaggerated and
  unmistakable** — the whole game is reading which way this body is pointing, so silhouette
  legibility beats anatomical accuracy every time. No gradients, one layer slightly
  misregistered. Transparent background.
- **Negative:** text, jersey number, sponsor logo, facial features beyond a mark, gradients,
  3D rendering, soft shading, ambiguous stance, watermark, emoji, drop shadow

### gk-ball — the penalty, the fastest thing on screen
- **Size:** 512×512, transparent PNG, centred with 15% padding
- **Prompt:** Create a mobile-game asset of a football in flat silk-screened sports-poster
  style: a solid white `#FFFFFF` circle with a bold geometric panel pattern printed straight
  on top in flat `#0B1221` — a few clean pentagon and hexagon shapes, no attempt at wrapping
  them around a sphere. The only tone is a crescent of `#C9D6EA` halftone dots on the lower
  right standing in for shadow. Heavy, confident ink edges. It must be identifiable at 16 px.
  Transparent background, no contact shadow.
- **Negative:** text, brand marks, gradients, 3D sphere rendering, realistic leather, specular
  highlight, motion blur, soft shading, watermark, emoji, drop shadow

### gk-goal-frame — posts, crossbar and net
- **Size:** 1536×768, transparent PNG, front-on, symmetrical
- **Prompt:** Create a mobile-game asset of a football goal seen dead-on, in flat silk-screened
  sports-poster style. Posts and crossbar as solid `#F4F8FF` bars with one flat `#9FB4D8` face
  printed along the right side of each to imply thickness — no rounding, no gradient. The net
  printed as a regular open lattice of thin `rgba(206,228,255,0.30)` lines, perfectly uniform,
  with the lines nearest the frame stepped up to `rgba(206,228,255,0.62)` in a single hard
  jump rather than a fade. Bilaterally symmetrical, front-on, no perspective. Transparent
  background.
- **Negative:** text, sagging net, photographic mesh, gradients, perspective distortion, 3D
  rendering, soft shadows, advertising boards, watermark, emoji, drop shadow

### gk-zone-grid — the six aim zones printed over the goal mouth
- **Size:** 1536×768, transparent PNG, 3 columns × 2 rows, matched to gk-goal-frame
- **Prompt:** Create a mobile-game HUD overlay in flat silk-screened sports-poster style: six
  equal rectangular target cells in a 3-across by 2-high arrangement, each drawn as a thin
  hard-edged `rgba(220,235,255,0.35)` outline over a barely-there `#DCEBFF` wash. Provide a
  second, HOT version of a single cell in solid keeper orange `#F26522` at low opacity with a
  bright `#FF8A3D` outline and a coarse halftone dot fill, plus two short registration
  crosshairs printed at its corners so it reads as *called out* rather than merely tinted. No
  gradients, no glow, no bevel. Transparent background.
- **Negative:** text, zone numbers, arrows, glow, bevel, gradients, 3D rendering, soft edges,
  rounded corners, watermark, emoji, drop shadow

### gk-banner-milestone — the family goal banners hanging on the stand behind the net
- **Size:** 768×256 each, transparent PNG, one per milestone, matched set
- **Prompt:** Create a matched set of mobile-game banner assets in flat silk-screened
  sports-poster style: three simple rectangular cloth banners strung on a wire, each printed
  with one bold pictogram and a solid gold `#FFC845` header stripe. Pictograms are flat
  single-colour silhouettes only — a graduation cap, a house, a walking-stick-and-sun — printed
  in `#FFE38A` on a near-transparent `rgba(255,255,255,0.07)` cloth with a thin `#B07B12`
  border. Slight fabric sag drawn as two straight angled segments rather than a curve, in
  keeping with the poster geometry. No gradients, one layer misregistered. Transparent
  background.
- **Negative:** text, lettering, words on the banners, gradients, realistic cloth folds, 3D
  rendering, soft shading, tassels, watermark, emoji, drop shadow

### gk-glove-shield — the Shield glove earned by three saves in a row
- **Size:** 512×512, transparent PNG, centred with 15% padding
- **Prompt:** Create a mobile-game asset of a goalkeeper glove with a shield emblem printed
  across its palm, in flat silk-screened sports-poster style. Glove body in solid gold
  `#FFC845` with the finger separations as hard `#B07B12` ink lines and one halftone dot block
  for the shaded edge; the shield printed over it in flat brand blue `#1E6BE0` with a pale
  `#A6D0FF` outline and a bold white check mark. Chunky, symmetrical, absolutely no gradient
  or bevel. Provide a second SPENT version in `#9FB4D8` grey with the blue layer knocked out
  and a red `#EF4444` cancel bar printed across it. Transparent background.
- **Negative:** text, brand logo, gradients, leather texture, 3D rendering, soft shading,
  glow, watermark, emoji, drop shadow

### gk-save-burst — the flash when the gloves get there first
- **Size:** 768×768, transparent PNG, radial, one flat-ink layer
- **Prompt:** Create a mobile-game VFX asset in flat silk-screened sports-poster style: a
  save impact printed as a bold radial burst of straight-sided green `#28A745` wedges of
  alternating length radiating from a solid `#4ADE80` centre, with a single hard concentric
  ring outside them and a scatter of coarse halftone dots beyond that. Every edge is hard,
  every fill is flat — the sense of energy comes from the wedge geometry, not from any glow.
  One layer offset two pixels for a misregistered ink fringe. Transparent background.
- **Negative:** text, glow, bloom, soft gradient, smoke, fire, sparkle stars, 3D rendering,
  watermark, opaque background, emoji, drop shadow

### gk-concede-mark — the stamp when the ball goes past you
- **Size:** 768×768, transparent PNG, one flat-ink layer
- **Prompt:** Create a mobile-game VFX asset in flat silk-screened sports-poster style: a
  conceded-goal stamp printed as a rough crimson `#EF4444` ring with a broken, ink-starved
  edge, a bold cross struck through it in the same ink, and a torn `#FF8B8B` halftone shadow
  offset three pixels down and to the right like a badly registered second pass. Looks like a
  rubber stamp slammed onto the poster. Hard edges, flat fill, visible ink starvation at the
  stroke ends. Transparent background.
- **Negative:** text, letters, words, gradients, glow, 3D rendering, soft edges, blood,
  realistic texture, watermark, opaque background, emoji, drop shadow

### gk-hud-glyphs — the saves / conceded / shots icons in the top strip
- **Size:** 128×128 each, transparent PNG, matched set on one sheet
- **Prompt:** Create a matched set of four mobile-game HUD glyphs in one unified flat
  silk-screened poster style — solid single-colour silhouettes with no outline and no fill
  variation: (1) a glove for SAVES in green `#28A745`, (2) a ball crossing a goal line for
  CONCEDED in red `#EF4444`, (3) a row of five dots for SHOTS REMAINING in white, (4) a
  lightning bolt for the double-value RISK shot in gold `#FFC845`. Identical optical weight,
  identical bounding box and identical corner treatment across all four so they sit in one
  row. Each printed with a faint one-pixel misregistered second colour behind it. Transparent
  background.
- **Negative:** text, labels, numbers, outlines, backing plates, gradients, 3D rendering, soft
  shading, mixed weights, watermark, emoji, drop shadow

### gk-result-poster — the win art on the results screen
- **Size:** 1024×1024, transparent PNG, centred with 10% padding
- **Prompt:** Create a mobile-game hero asset in flat silk-screened sports-poster style: a
  keeper in solid orange `#F26522` frozen at full stretch, both gold `#FFC845` gloves clamped
  on a white ball, printed over a bold sunburst of alternating flat `#28A745` and `#4ADE80`
  wedges, with the three gold milestone banners hanging small and intact along the top edge.
  Four flat ink layers, coarse halftone dots for all tone, one layer misregistered by two
  pixels, light paper grain. The composition should read like a commemorative match poster —
  triumphant, graphic, and completely free of rendering. Transparent background.
- **Negative:** text, lettering, dates, scores, trophy, medal, confetti, gradients, 3D
  rendering, soft shading, photographic elements, watermark, emoji, drop shadow

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
