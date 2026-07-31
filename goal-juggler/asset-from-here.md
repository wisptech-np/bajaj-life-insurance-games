# Goal Juggler — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Goal Juggler is one of the Bajaj Life Insurance interactive game suite titles. The art must adhere strictly to Bajaj Life brand aesthetics, high readability, and clean mobile performance.

| Axis | Goal Juggler's answer |
|---|---|
| Motif | Goal Juggler gameplay theme & visual style. |
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

### gj-bg-hall — the full-screen court the orbs are juggled inside
- **Size:** 1080×2160 portrait, opaque PNG, keep y=200–1750 visually quiet
- **Prompt:** Create a portrait mobile-game backdrop of a tall, near-empty indigo glasshouse
  hall at night, in luminous hand-blown-glass style. Deep blue-black graduating `#08152F` at
  the top through a soft `#0C2A57` bloom at mid height to `#061229` at the floor, with the
  faintest suggestion of leaded window mullions and a vaulted ceiling dissolving into darkness.
  The only light is warm and comes from off-screen glass lanterns, so the walls carry gentle
  amber and blue colour bleeds and a few drifting dust motes catch the glow. Deliberately
  empty and calm in the centre. Painterly, soft-edged, atmospheric.
- **Negative:** text, furniture, plants, people, chandeliers, stained-glass pictures, hard
  edges, machined metal, daylight, watermark, lens flare, emoji, drop shadow

### gj-orb-education — the GOLD goal, a book lampworked inside the glass
- **Size:** 512×512, transparent PNG, centred with 20% padding
- **Prompt:** Create a polished mobile-game asset of a mouth-blown glass sphere with a small
  white open book suspended and glowing at its centre, in luminous hand-blown-glass style.
  Glass tinted warm gold, reading `#FFE38A` where the light passes through the thin upper wall,
  `#FFC845` through the body and `#8A5C06` in the thickest shadowed base. Visible glass wall
  thickness at the silhouette edge, two or three trapped air bubbles, a scatter of gold-leaf
  flecks fused into the gather, and a small pontil mark at the bottom. Warm filament glow from
  the book itself lighting the glass from inside, plus one crisp specular highlight at the
  upper left. Transparent background, floating, no contact shadow.
- **Negative:** text, pages with writing, opaque plastic, chrome, metal, faces, planet,
  watermark, cartoon outline, flat shading, hard rim light, emoji, drop shadow

### gj-orb-home — the GREEN goal, a house lampworked inside the glass
- **Size:** 512×512, transparent PNG, centred with 20% padding
- **Prompt:** Create a polished mobile-game asset of a mouth-blown glass sphere with a small
  white pitched-roof house suspended and glowing at its centre, in luminous hand-blown-glass
  style, built identically to its gold sibling. Glass tinted fresh green: `#A9F5C6` through the
  thin upper wall, `#4ADE80` through the body, `#106B36` in the thick shadowed base. Same
  visible wall thickness, trapped bubbles, gold-leaf flecks and pontil mark. The house's
  doorway glows a warmer amber than the surrounding green, so the sphere reads as *lit from
  home*. One crisp upper-left specular. Transparent background, floating, no contact shadow.
- **Negative:** text, windows with curtains, opaque plastic, chrome, metal, snow globe base,
  watermark, cartoon outline, flat shading, emoji, drop shadow

### gj-orb-health — the ORANGE goal, a heart lampworked inside the glass
- **Size:** 512×512, transparent PNG, centred with 20% padding
- **Prompt:** Create a polished mobile-game asset of a mouth-blown glass sphere with a smooth
  white lobed heart suspended and gently pulsing at its centre, in luminous hand-blown-glass
  style, built identically to its siblings. Glass tinted warm coral-orange: `#FFC59B` through
  the thin upper wall, `#FF8A3D` through the body, `#8C3708` in the thick shadowed base. Same
  visible wall thickness, trapped bubbles, gold-leaf flecks and pontil mark. The heart's glow
  is the warmest in the set and throws a soft caustic ring through the glass. One crisp
  upper-left specular. Transparent background, floating, no contact shadow.
- **Negative:** text, anatomical detail, veins, opaque plastic, chrome, metal, valentine
  ribbon, watermark, cartoon outline, flat shading, emoji, drop shadow

### gj-orb-retirement — the BLUE goal, a radiant sun lampworked inside the glass
- **Size:** 512×512, transparent PNG, centred with 20% padding
- **Prompt:** Create a polished mobile-game asset of a mouth-blown glass sphere with a small
  white eight-rayed sun disc suspended and radiating at its centre, in luminous
  hand-blown-glass style, built identically to its siblings. Glass tinted cool sky blue:
  `#B6D9FF` through the thin upper wall, `#5FA8FF` through the body, `#0B3D82` in the thick
  shadowed base. Same visible wall thickness, trapped bubbles, gold-leaf flecks and pontil
  mark. The sun's rays cast faint radial light shafts through the glass wall. One crisp
  upper-left specular. Transparent background, floating, no contact shadow.
- **Negative:** text, clock, hourglass, opaque plastic, chrome, metal, planet rings, watermark,
  cartoon outline, flat shading, emoji, drop shadow

### gj-rail-side — the left and right walls the orbs rebound off
- **Size:** 128×1536 vertical, transparent PNG, mirrorable
- **Prompt:** Create a mobile-game asset of a slender vertical guide rail for a glasshouse
  court, in luminous hand-blown-glass style. A thin cold brass post with a soft pale blue
  patina, reading `rgba(150,190,240,0.30)` in its unlit length and brightening toward
  `rgba(190,220,255,0.62)` where a lantern's glow falls on it, with tiny beaded joints at
  regular intervals and a faint vertical caustic streak running down its inner face. Cool and
  understated — it must never compete with the lanterns for attention. Transparent background.
- **Negative:** text, ornament, filigree crest, gold, warm colour, rust, bolts, watermark,
  cartoon outline, flat colour, emoji, drop shadow

### gj-floor-line — the red danger threshold at the bottom of the court
- **Size:** 1536×256 horizontal, transparent PNG, glow-heavy, additive-blend friendly
- **Prompt:** Create a mobile-game asset of a warning threshold running across the base of a
  dark hall, in luminous hand-blown-glass style. A single sharp crimson `#EF4444` line with a
  slightly brighter `#FF8B8B` core, sitting on a soft upward-fading haze of
  `rgba(239,68,68,0.20)` about a fifth as tall as the image, with a few thin embers rising out
  of it and a faint reflection of the line smeared on the darkness below. Reads as heat and
  danger, not as a floor surface. Transparent background, no black matte.
- **Negative:** text, warning sign, skull, hazard chevrons, lava texture, floor tiles, flames,
  watermark, opaque background, emoji, drop shadow

### gj-shatter — the burst when a glass goal reaches the floor
- **Size:** 1024×1024, transparent PNG, radial, one tinted variant per goal colour
- **Prompt:** Create a mobile-game VFX asset of a hand-blown glass sphere shattering, in
  luminous hand-blown-glass style. A radial spray of curved glass shards of wildly varied size
  — some large enough to show their own wall thickness and internal tint, most small and
  needle-thin — flying outward from a hot white flash, each shard catching a bright edge
  specular and refracting a sliver of colour. Produce one version per goal tint: gold `#FFC845`,
  green `#4ADE80`, orange `#FF8A3D`, blue `#5FA8FF`, and add a crimson `#EF4444` bloom at the
  origin of every version. Delicate and expensive-looking, not explosive. Transparent
  background, no black matte.
- **Negative:** text, fire, smoke, sparks, comic impact star, rock debris, metal fragments,
  watermark, opaque background, emoji, drop shadow

### gj-touch-ring — the shockwave under the player's finger on every tap
- **Size:** 512×512, transparent PNG, radial, additive-blend friendly
- **Prompt:** Create a mobile-game VFX asset of a soft expanding touch shockwave, in luminous
  hand-blown-glass style. A single thin white ring, brightest at its leading edge and fading
  inward to nothing, with a faint secondary ring trailing it and a subtle refractive ripple
  distorting whatever sits behind it. Pure white with the barest cool tint, no colour of its
  own — this is the player's touch, and it must never be mistaken for a goal. Transparent
  background, no black matte.
- **Negative:** text, coloured tint, particles, sparks, sonar grid, target reticle, watermark,
  opaque background, emoji, drop shadow

### gj-cover-pip — the three covers in the HUD; a floor hit spends one
- **Size:** 256×256 each, transparent PNG, two states on one sheet
- **Prompt:** Create a matched pair of mobile-game HUD indicators in luminous
  hand-blown-glass style: a small heater-shaped shield rendered as a single piece of blown
  glass, shown twice. HELD — glass tinted brand blue `#1E6BE0` with a pale `#A6D0FF` lip, lit
  warmly from within, a couple of trapped bubbles and a bright upper-left specular. SPENT — the
  identical shield cold and unlit, its glass gone smoky grey, with a clean crack running from
  the lip to the boss and a dull `#EF4444` residue caught in the crack only. Identical
  silhouette and angle in both states so they swap cleanly in place. Transparent background.
- **Negative:** text, hearts, numbers, heraldry, metal, chrome, watermark, cartoon outline,
  flat colour, emoji, drop shadow

### gj-gust-veil — the sideways risk wind that starts blowing partway through the run
- **Size:** 1536×768 horizontal, transparent PNG, directional, mirrorable
- **Prompt:** Create a mobile-game VFX asset of a soft directional draught crossing a dark
  hall, in luminous hand-blown-glass style. Long, extremely faint horizontal streaks of pale
  warm `rgba(242,101,34,0.20)` air, denser at the leading edge and thinning as they travel,
  carrying a scatter of drifting dust motes and two or three tumbling gold-leaf flecks that
  make the direction unmistakable. Almost subliminal — it must be readable without ever
  obscuring an orb. Transparent background, no black matte.
- **Negative:** text, arrows, wind icon, tornado, cloud, speed lines, hard edges, watermark,
  opaque background, emoji, drop shadow

### gj-hud-glyphs — the score / timer / covers icons in the top strip
- **Size:** 128×128 each, transparent PNG, delivered as a matched set on one sheet
- **Prompt:** Create a matched set of three mobile-game HUD glyphs in one unified style —
  thin lampworked glass tubing, hollow, with a faint internal glow and no fill — for a
  juggling game: (1) a rising stack of three small spheres for SCORE in gold `#FFC845`, (2) a
  simple hourglass for TIME in pale blue `#5FA8FF`, (3) a shield outline for COVERS in
  `#1E6BE0`. Identical tube thickness, identical optical size and identical bend radius across
  all three so they sit in one row. Each glyph should carry one small specular pin-light where
  the glass catches the room. Transparent background.
- **Negative:** text, labels, numbers, backing plates, solid fills, metal, chrome, mixed line
  weights, watermark, emoji, drop shadow

### gj-result-set — the win art on the results screen
- **Size:** 1024×768, transparent PNG, centred with 10% padding
- **Prompt:** Create a polished mobile-game asset of all four glass goal lanterns — gold book,
  green house, orange heart, blue sun — floating together in a loose arc above a single blown
  glass shield, in luminous hand-blown-glass style. Every sphere lit from within by its own
  emblem, their glows overlapping into warm caustic pools of colour on the shield's upper
  surface, gold-leaf flecks drifting between them. Hero three-quarter composition, soft
  painterly light, deep indigo falloff at the edges of the group. All four spheres intact and
  unbroken — this is the winning image. Transparent background, floating, no contact shadow.
- **Negative:** text, trophy, medal, ribbon, confetti, cracks, shards, hands, pedestal,
  watermark, cartoon outline, flat shading, emoji, drop shadow, ground plane

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
