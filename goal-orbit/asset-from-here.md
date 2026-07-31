# Goal Orbit — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Goal Orbit is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Goal Orbit's answer |
|---|---|
| Motif | Goal Orbit gameplay theme & visual style. |
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

### go-bg-space — the full-screen field the whole chain is flown across
- **Size:** 1080×2400 portrait, opaque PNG, tiles vertically (the camera pans up the chain)
- **Prompt:** Create a portrait mobile-game backdrop of deep space built entirely from layered
  cut paper. A base sheet of near-black navy card `#050C1E`, over it a torn-edged sheet of
  `#08183A` occupying the middle band, over that a smaller torn sheet of `#0B2350` — each
  layer's torn edge showing white paper fibres and casting a soft 2 mm shadow onto the sheet
  beneath. Stars are tiny punched holes and pin-dots of pale `#DCEBFF` card scattered at three
  different sizes for parallax depth. A faint dusting of loose paper fibre across the whole
  surface. Absolutely flat lighting apart from the inter-layer shadows. No glow, no bloom.
- **Negative:** text, realistic nebula, volumetric gas, lens flare, glossy finish, digital
  glow, galaxies, planets, spacecraft, watermark, emoji, harsh drop shadow

### go-planet-goal — the standard blue goal planet the comet orbits
- **Size:** 512×512, transparent PNG, centred with 20% padding
- **Prompt:** Create a polished mobile-game asset of a planet built from stacked cut paper: a
  large base disc of deep navy card `#04204F`, a slightly smaller disc of brand blue `#1E6BE0`
  offset up and left on top of it, and a smaller crescent of pale blue `#6FB4FF` card offset
  further up and left again, so the offsets read as a terminator without any shading. One thin
  horizontal band of `rgba(255,255,255,0.16)` paper laid across the middle as a latitude
  stripe. Every layer shows its cut edge thickness and drops a soft 1 mm shadow onto the layer
  below. Matte paper tooth throughout, single soft light from the upper left. Transparent
  background, no ground shadow.
- **Negative:** text, glossy sphere, specular highlight, atmospheric glow, realistic planet
  texture, clouds, 3D rendering, watermark, emoji, ground shadow

### go-planet-milestone — the gold planet at every fifth goal
- **Size:** 512×512, transparent PNG, centred with 20% padding
- **Prompt:** Create a polished mobile-game asset of a milestone planet built from stacked cut
  paper, constructed identically to its blue sibling but in warm tones: a base disc of deep
  brown card `#5E3006`, an amber `#E9962A` disc offset up and left, a pale `#FFD489` crescent
  offset further again. Add a flat paper ring cut as a single ellipse in `rgba(255,232,190,0.7)`
  card, slipped behind the planet at a tilt so its two ends emerge either side — the ring
  should visibly be a separate piece of card passing behind, with a small shadow where it meets
  the disc. Matte paper tooth, single soft light from the upper left. Transparent background.
- **Negative:** text, glossy sphere, metallic gold, specular highlight, atmospheric glow,
  realistic Saturn photograph, 3D rendering, watermark, emoji, ground shadow

### go-planet-variants — the other three builds cycled down the chain
- **Size:** 512×512 each, transparent PNG, one file per variant
- **Prompt:** Create three more mobile-game planets in the same stacked cut-paper construction
  and the same three-offset-disc lighting trick, so no two neighbours in a chain look alike.
  ROCKY — base `#1A2A44`, body `#5B7BA8`, highlight crescent `#B3C6E2`, with several small
  punched circles of the base colour scattered on the body as craters, each showing its own
  cut edge. CITY — base `#04302A`, body `#1E9781`, highlight `#8CEBD4`, with a cluster of tiny
  warm `rgba(255,222,150,0.9)` paper squares on the night side as lights. ICY — base `#27406E`,
  body `#93BAEA`, highlight `#E6F1FF`, with two torn white paper caps at the poles showing
  fibrous edges. Matte paper throughout, single soft upper-left light. Transparent background.
- **Negative:** text, glossy finish, specular highlight, realistic planetary photography,
  atmospheric haze, 3D rendering, watermark, emoji, ground shadow

### go-orbit-ring — the dashed ring the comet travels before release
- **Size:** 1024×1024, transparent PNG, perfect circle, centred
- **Prompt:** Create a mobile-game asset of an orbit path built from cut paper: a perfect
  circle rendered as a ring of separate short paper dashes in pale blue
  `rgba(126,184,255,0.32)`, each dash individually cut with visible edge thickness and a
  slightly imperfect hand-cut end, each casting a tiny soft shadow. The dashes are evenly
  spaced and identical in length all the way round. Provide a second brighter variant in
  `rgba(180,214,255,0.9)` for the live ring. Nothing inside the circle. Transparent background.
- **Negative:** text, degree marks, arrows, solid unbroken line, glow, neon, 3D rendering,
  gradients, watermark, emoji, drop shadow

### go-gravity-well — the capture field that snaps the comet into a new orbit
- **Size:** 1024×1024, transparent PNG, radial, centred
- **Prompt:** Create a mobile-game asset of a gravity well built from layered translucent
  paper: four or five concentric discs of tinted blue vellum `rgba(30,107,224,0.34)`, each
  smaller and each slightly more saturated where they overlap, so the centre reads as denser
  purely through accumulation rather than through any gradient. Every disc has a soft, very
  slightly irregular hand-cut edge. The outermost disc almost disappears into transparency.
  No glow, no bloom, no radial gradient — only stacked translucent sheets. Transparent
  background.
- **Negative:** text, digital glow, radial gradient, bloom, lens flare, energy field, 3D
  rendering, sharp geometric rings, watermark, emoji, drop shadow

### go-comet — the thing the player is actually flying
- **Size:** 768×384, transparent PNG, pointing along +x, pivot at the head centre
- **Prompt:** Create a polished mobile-game asset of a comet built from cut paper, pointing to
  the right. The head is three stacked discs — a pale blue `#1E6BE0` base, a `#9FCCFF` middle
  and a small pure white `#FFFFFF` core, each offset slightly up and left. The tail is a long
  tapering paper wedge in `rgba(126,184,255,0.8)` swept back to the left, built from two or
  three overlapping wedges of decreasing opacity with visibly separate cut edges, the
  outermost torn rather than cut. Matte paper tooth, single soft upper-left light, small
  inter-layer shadows. Transparent background.
- **Negative:** text, fire, plasma, motion blur, digital glow, glossy finish, realistic comet
  photography, 3D rendering, watermark, emoji, drop shadow

### go-asteroid-virus — the green risk drifting across the transfer paths
- **Size:** 512×512, transparent PNG, centred with 18% padding
- **Prompt:** Create a mobile-game hazard asset built from cut paper: a virus-like body made of
  a bright green `#49E24B` disc with a smaller dark `#0E5C1D` disc pressed into its centre,
  ringed by eight short blunt paper spikes in `#127A28` radiating outward, each spike cut as a
  separate piece with visible edge thickness and its own small shadow on the body. Slightly
  irregular so it looks hand-cut rather than die-cut. It must read as *hostile* from its
  silhouette alone at 24 px, and it must be unmistakably green — green is the only colour
  danger is allowed to be in this game. Matte paper, soft upper-left light. Transparent
  background.
- **Negative:** text, skull, face, teeth, realistic virus microscopy, slime, glow, gloss, 3D
  rendering, red or orange tint, watermark, emoji, drop shadow

### go-coin — the wealth pickups dotted along the ideal transfer line
- **Size:** 256×256, transparent PNG, centred, delivered as a 6-frame spin sheet
- **Prompt:** Create a mobile-game pickup asset built from cut paper: a coin as two stacked
  discs, a pale `#FFE38A` face laid on a slightly larger `#B07B12` base so the base reads as
  the coin's thickness, with a small circle embossed by a third punched disc in the centre.
  Deliver six frames of a spin cycle by narrowing the face disc into progressively thinner
  ellipses while the thickness edge stays visible, so the rotation is achieved through paper
  geometry rather than through any shading. Matte paper, soft upper-left light. Transparent
  background.
- **Negative:** text, currency symbols, numerals, metallic gloss, specular glint, sparkle
  stars, 3D rendering, watermark, emoji, drop shadow

### go-release-ping — the ring that fires the instant the tap lets go
- **Size:** 512×512, transparent PNG, radial, centred
- **Prompt:** Create a mobile-game VFX asset built from cut paper: a single expanding ring in
  warm orange `#FF8A3D` card, cut as one clean annulus with a visible edge thickness and a
  slightly irregular hand-cut outer edge, accompanied by four short straight paper darts in
  `#F26522` pointing outward at the diagonals. Provide three frames at increasing diameter and
  decreasing opacity. No glow and no blur — the sense of speed comes from the darts and from
  the ring thinning as it grows. Transparent background.
- **Negative:** text, digital glow, bloom, motion blur, lens flare, energy shockwave, 3D
  rendering, watermark, opaque background, emoji, drop shadow

### go-capture-lock — the confirmation when the next ring takes the comet
- **Size:** 768×768, transparent PNG, radial, centred
- **Prompt:** Create a mobile-game VFX asset built from cut paper: a green `#28A745`
  confirmation ring contracting inward onto a target, drawn as one clean paper annulus with
  four small `#4ADE80` paper brackets set at the cardinal points just inside it, each bracket
  a separate cut piece with its own tiny shadow. Provide three frames at decreasing diameter,
  the final frame adding a small punched check mark in pale card at the centre. Crisp, calm and
  satisfying rather than explosive. Transparent background.
- **Negative:** text, glow, bloom, sparkle burst, fireworks, lens flare, 3D rendering,
  watermark, opaque background, emoji, drop shadow

### go-hud-glyphs — the goals / lives / timer icons in the top strip
- **Size:** 128×128 each, transparent PNG, matched set on one sheet
- **Prompt:** Create a matched set of four mobile-game HUD glyphs cut from a single weight of
  paper card, all in one unified style with identical optical size and identical edge
  thickness: (1) a small planet-with-ring for GOALS REACHED in blue `#1E6BE0`, (2) a comet head
  for LIVES in pale `#9FCCFF`, (3) an hourglass for TIME in white, (4) a coin for SCORE in gold
  `#FFC845`. Each glyph is a two-layer stack — a darker base and a lighter face offset up and
  left by one millimetre — so every icon carries the same paper depth cue. Provide the LIVES
  glyph in a second spent version in flat grey card with no lighter face layer. Transparent
  background.
- **Negative:** text, labels, numbers, backing plates, outlines, gloss, gradients, 3D
  rendering, mixed thicknesses, watermark, emoji, drop shadow

### go-result-chain — the win art on the results screen
- **Size:** 1024×1024, transparent PNG, centred with 10% padding
- **Prompt:** Create a mobile-game hero asset built entirely from layered cut paper: a rising
  chain of five planets arranged along a gentle diagonal — three blue goal planets and, at the
  top, a large gold ringed milestone planet — linked by a dotted paper trail of small pale
  blue dashes, with the white-headed paper comet arriving at the top planet's ring and a
  scatter of gold paper coins along the path. Every planet built from its three offset discs,
  every dash and coin an individually cut piece casting its own small shadow, the whole
  arrangement mounted on a torn navy `#08183A` card ground with fibrous edges. Single soft
  upper-left light. Warm, handmade and celebratory without a single glowing pixel.
- **Negative:** text, trophy, medal, ribbon, confetti, digital glow, gloss, lens flare,
  realistic space photography, 3D rendering, watermark, emoji, harsh drop shadow

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
