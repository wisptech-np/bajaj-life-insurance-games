# Premium Pulse — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Premium Pulse is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Premium Pulse's answer |
|---|---|
| Motif | Premium Pulse gameplay theme & visual style. |
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

### pu-monitor-field — full-screen canvas background the rings contract across
- **Size:** 800×1280 px, 5:8 portrait, opaque JPG/PNG
- **Prompt:** Create a polished mobile-game background of a dark medical monitor field for a
  rhythm game, seen perfectly flat-on. Deep near-black navy `#03102a` at the edges lifting to a
  soft radial glow of instrument blue `#005BAC` at the exact centre, as if one indicator lamp sits
  behind the glass. Overlay very faint horizontal scanlines at 4% opacity and three barely visible
  concentric guide circles in `#BEE0FF` at 6% opacity, centred. Add a subtle glass sheen sweeping
  from the upper-left corner and a whisper of chromatic fringing where the glow meets the dark.
  Perfectly symmetrical about the vertical axis, centre kept clean and uncluttered so gameplay
  rings read on top. No graticule numbers, no waveform, no bezel hardware.
- **Negative:** text, numbers, graticule labels, waveform trace, bezel, buttons, vignette blobs,
  stars, particles, photographic grain

### pu-policy-badge — the orange badge at the centre; this is the player
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a glowing shield-shaped policy badge for a
  rhythm game, seen flat-on and centred. The shield is moulded from translucent smoked acrylic lit
  from within in a vertical gradient — `#FF8533` at the top through `#F26922` to a deep `#B3400E`
  at the point — with a crisp 1.5 px white inner rim at 45% opacity and a soft warm bloom haloing
  2 px beyond the silhouette. A clean white checkmark sits centred on the face, drawn as a thick
  rounded phosphor stroke, brighter than the shield behind it. Weightless and emissive, no bevel,
  no metal, no engraving. Transparent background.
- **Negative:** metallic finish, embossing, rivets, drop shadow, text, letters, watermark, cartoon
  outline, emoji, laurel wreath, ribbon

### pu-premium-ring — the blue ring you must TAP as it meets the badge outline
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a perfect luminous circle for a rhythm game,
  seen flat-on: a single unbroken ring stroke in instrument blue, rendered as phosphor — a bright
  `#BEE0FF` core line with `#3B8DD4` bleeding 6 px outwards into a soft `rgba(59,141,212,0.55)`
  halo and nothing inside the circle at all. The stroke is even in weight the whole way round,
  with no gaps, no dashes, no tick marks and no highlight. Give the outer bloom a faint scatter, as
  if seen through anti-glare glass. Perfectly circular, centred with 10% padding, transparent
  background.
- **Negative:** gradient around the circumference, dashes, ticks, arrows, gemstone, tube shading,
  text, watermark, drop shadow, emoji, sparkles

### pu-temptation-ring — the red spiked ring you must LET PASS untouched
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a hostile spiked ring for a rhythm game, seen
  flat-on: a fourteen-point star polygon drawn as a single sharp-cornered outline stroke, mitred
  not rounded, in alarm red — a `#FF8B8B` core with `#EF4444` bleeding outward into a nervous red
  glow. The spikes are shallow and even, the silhouette instantly distinguishable from a smooth
  circle at 32 px. Add a faint dark red `#7A1414` under-shadow inside the stroke so it reads as a
  warning rather than a decoration. Hollow centre, centred with 10% padding, transparent
  background.
- **Negative:** filled star, gemstone, sun rays, sawblade, rounded corners, text, watermark, drop
  shadow, emoji, flames, skull

### pu-bonus-double — the gold ring pair on every 8th beat
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of two concentric luminous gold circles for a
  rhythm game, seen flat-on, one ring 12% larger than the other with a clean dark gap between
  them. Both are phosphor strokes — `#FFE38A` core, `#FFC845` bleed, warm halo — with the outer
  ring at 70% the brightness of the inner one so the pair reads as *two events, one following the
  other*. No text, no multiplier symbol, no decoration; the meaning is carried entirely by the
  doubling. Perfectly circular and concentric, centred with 10% padding, transparent background.
- **Negative:** multiplier symbol, x2, numbers, text, stars, sparkles, watermark, drop shadow,
  emoji, gradient sweep, gemstone

### pu-perfect-burst — the flash fired on a PERFECT-timed tap
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game impact effect of a perfectly timed hit for a rhythm
  game, seen flat-on: a thin gold `#FFE38A` shock ring at the moment of expansion, its stroke
  thinning and fading toward the outer edge, with twelve very short radial light spurs at even
  intervals and a soft warm `#FFC845` core glow filling the middle at low opacity. Crisp, fast and
  clean — it should read as *precision*, not as an explosion. Perfectly radially symmetrical,
  centred, transparent background.
- **Negative:** fire, smoke, debris, lens flare streaks, confetti, stars, text, watermark, drop
  shadow, emoji, asymmetry

### pu-skip-pulse — the green pulse paid for correctly ignoring a temptation
- **Size:** 512×512 px, transparent PNG
- **Prompt:** Create a polished mobile-game feedback effect for restraint rewarded in a rhythm
  game, seen flat-on: a calm vitals-green `#6EE7A8` ring expanding outward, its stroke soft-edged
  and even, with a gentle `#22C55E` inner wash and a barely-there second ring trailing 8 px behind
  it. Deliberately quieter and slower-feeling than the gold hit burst — steady, not celebratory.
  Perfectly radially symmetrical, centred, transparent background.
- **Negative:** checkmark, thumbs up, text, watermark, sparkles, fire, drop shadow, emoji, sharp
  spikes, harsh contrast

### pu-combo-flame — the streak marker beside the combo chip
- **Size:** 384×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a stylised streak flame for a rhythm game,
  seen flat-on, but drawn as a *phosphor trace rather than fire*: a single continuous teardrop
  outline stroke in `#FF8533` with a hotter `#FFE38A` inner contour tracing the same shape 4 px
  inside it, and a soft orange bloom around the whole silhouette. The interior is dark and empty —
  this is a lit outline, not a solid flame. Smooth, symmetrical, legible at 28 px. Centred with
  padding, transparent background.
- **Negative:** realistic fire, smoke, embers, solid fill, cartoon flame, text, numbers, watermark,
  drop shadow, emoji, candle

### pu-hud-score-pill — the Score / Time readouts in the top HUD strip
- **Size:** 512×192 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD plate for a rhythm game, seen flat-on: a rounded
  rectangular panel of frosted smoked glass over near-black `#051a3a`, with a 1 px inner rim of
  `rgba(255,255,255,0.12)`, a soft top-edge sheen, and a faint cool `#3B8DD4` glow leaking from
  behind the lower edge as if backlit. The face is completely blank — score and time are drawn by
  the engine on top — so the plate must have no dividers, no icons and no engraving. Even
  illumination, no corner hotspots. Transparent background outside the rounded rectangle.
- **Negative:** text, numbers, icons, dividers, buttons, screws, bezel hardware, watermark, drop
  shadow, emoji, gradients that darken one end

### pu-hud-miss-dot — the row of dots that fill red as misses accumulate
- **Size:** 256×128 px, transparent PNG, dormant and spent states side by side
- **Prompt:** Create a polished mobile-game HUD indicator pair for a rhythm game, seen flat-on:
  two identical small circular pips side by side. The left pip is dormant — flat
  `rgba(255,255,255,0.18)` with no glow, reading as an unused slot. The right pip is spent — lit
  alarm red `#EF4444` with a tight 6 px `#FF8B8B` halo and a hot core, reading as a miss already
  taken. Same diameter and same position within their halves so the engine can cross-fade them.
  Legible at 10 px. Transparent background.
- **Negative:** text, numbers, hearts, crosses, skulls, icons inside the pip, watermark, drop
  shadow, emoji, differing sizes

### pu-beat-lane — the movement/progress bar under the HUD
- **Size:** 640×128 px, transparent PNG
- **Prompt:** Create a polished mobile-game progress track for a rhythm game, seen flat-on: a long
  thin capsule-ended channel in dark translucent glass `rgba(255,255,255,0.08)` with a 1 px
  `rgba(255,255,255,0.14)` rim, and inside it a partial fill of instrument blue running from
  `#005BAC` at the left to a brighter `#3B8DD4` head, the head carrying a small soft bloom where
  it stops. Add three faint vertical tick marks in the empty section at even intervals, marking the
  movement changes. No numbers, no labels, no arrow. Transparent background outside the capsule.
- **Negative:** text, numbers, percentage, arrow, chevrons, gradient rainbow, watermark, drop
  shadow, emoji, rounded 3D tube shading

### pu-result-inforce — win art on the results screen ("cover in force")
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration for a rhythm game, seen flat-on: a
  steady heartbeat trace drawn as a bright `#6EE7A8` phosphor line running horizontally across the
  frame with four evenly spaced, identical, textbook-clean peaks — the evenness is the whole point
  — passing behind a centred glowing orange `#F26922` shield badge that sits calmly on top of it.
  Soft green afterglow trailing the line to the left, gold `#FFE38A` sparks at the two tallest
  peaks. Weightless, emissive, symmetrical, restrained. Transparent background.
- **Negative:** text, numbers, trophy, confetti, fireworks, medal, watermark, drop shadow, emoji,
  irregular waveform, human figures, hospital equipment

### pu-result-lapsed — loss art on the results screen ("cover lapsed")
- **Size:** 640×640 px, transparent PNG
- **Prompt:** Create a polished mobile-game result illustration for a rhythm game, seen flat-on: a
  heartbeat trace in dimming `#3B8DD4` that runs in from the left with two weak, uneven peaks and
  then flattens into a straight dead line that fades out toward the right edge. A grey, unlit
  shield badge sits at the centre, its glow extinguished, drawn only as a faint
  `rgba(255,255,255,0.25)` outline. One small alarm-red `#EF4444` pip glows at the point where the
  line goes flat. Dark, quiet and clinical — no drama, no gore, no cartoon sadness. Transparent
  background.
- **Negative:** text, numbers, skull, tears, sad face, gore, watermark, drop shadow, emoji,
  explosion, human figures, hospital equipment

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
