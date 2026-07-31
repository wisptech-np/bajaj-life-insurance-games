# Smart Match 3D — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Smart Match 3D is the repo's **triple-tile matching puzzle**: players tap 3D life-goal glass tiles from a layered pile into a 7-slot tray to secure life goals within 2 minutes.

| Axis | Smart Match 3D's answer |
|---|---|
| Motif | 3D Life-Goal Glass Tiles on a dark velvet tabletop. |
| Shape language | **Bevelled rounded-square glass tiles.** Glossy 3D tiles with embedded 3D goal icons (Shield, Savings, Home, Car, Education, Marriage, Child, Retirement, Health, Rewards, Family). |
| Camera | Top-down 3/4 isometric perspective. |
| Signature accent | **Warm Gold `#FFB800`** and **Diamond Cyan `#00A3E0`** rims. |
| Hazard colour | N/A — pure positive life-goal matching. |
| Brand anchors | Blue `#003DA6`, Orange `#F26522`, Green `#28A745`. |
| Deep values | Deep Navy `#061826`, Royal Velvet `#0E1B2E`. |

Two hard technical rules, because the game post-processes these files at runtime:

1. **Every tile asset must fit inside a rounded-square glass tile container with identical optical weight.**
2. Icons must be 3D rendered, centred, and readable at 48px tray size.

---

### sm3-board-felt — full-screen play background behind the token pile

- **Size:** 1080×1920 px, 9:16 portrait, opaque JPG/PNG
- **Prompt:** Create a dark navy display-cabinet backdrop for a collectible tile-matching mobile game. The surface is deep midnight-navy velvet felt (`#051A3A` deepening to `#02102A` at the corners) with a faint short-pile fibre texture and a single soft overhead pool of cool light centred at the upper third, falling off smoothly toward every edge. Add a barely-visible embossed pinstripe grid in `#0E4F94` at 4% opacity, like the lining of a coin-collector's case, and a thin brushed-brass beading (`#C9A44C`) inset 40 px from the frame edge, softly blurred so it never competes with foreground tiles. Lighting is soft studio top-light with no hotspots. Composition is entirely empty in the centre two-thirds — this is a backdrop, objects will be drawn on top of it. Portrait 9:16.
- **Negative:** text, watermark, logos, characters, coins, tiles, badges, icons, photographic wood grain, harsh vignette, strong pattern, busy detail, drop shadows, UI frame, mock-up device bezel

---

### sm3-badge-blank — the shared token body every goal emblem sits on

- **Size:** 512×512 px, 1:1, transparent PNG
- **Prompt:** Create a single collectible enamel pin badge for a tile-matching mobile game, seen straight-on from directly above with no perspective skew. The badge is a squircle (rounded-square, corner radius roughly one-fifth of the width) with a raised brushed-brass rim in `#C9A44C` catching a warm highlight along the top-left edge and darkening to `#8A6B22` on the bottom-right. The rim encloses a glossy, deep, poured-enamel field in Bajaj blue `#003DA6` graduating to `#0F3480` at the base, with one crisp elongated specular highlight sweeping the upper-left quadrant and a faint inner bevel where the enamel meets the brass. The enamel centre is completely empty — an emblem will be composited into it later. Soft studio lighting from the upper left, slight physical weight and thickness visible at the rim, clean anti-aliased silhouette that stays readable at 48 px. Transparent background, centred with 6% padding.
- **Negative:** text, watermark, emoji, emblem, icon, symbol inside the badge, photographic reflections, background, cast shadow on ground, tilted or 3/4 perspective, glitter, sparkles, bevelled 3D chrome

---

### sm3-emblem-shield — "Shield" token (term protection)

- **Size:** 320×320 px, 1:1, transparent PNG (composited into `sm3-badge-blank`)
- **Prompt:** Create a single flat-relief enamel emblem of a heater-shaped protection shield with a bold check-mark struck through its centre, for a collectible tile-matching mobile game. Render it as raised cloisonné enamel: a thin brass outline (`#C9A44C`) around every shape, ice-white to pale-blue enamel body (`#FFFFFF` to `#CFE0FF`), and the check-mark poured in deep Bajaj blue `#003DA6`. Straight-on top-down view, no perspective, one soft specular highlight sweeping the shield's upper-left face. Silhouette must remain unmistakable at 40 px — thick strokes, generous negative space, no fine detail. Transparent background, centred with 12% padding.
- **Negative:** text, watermark, emoji, badge rim, squircle frame, background, cast shadow, realistic metal photography, gradient mesh noise, thin hairlines, sword, crest, heraldic ornament

---

### sm3-emblem-savings — "Savings" token (guaranteed savings plan)

- **Size:** 320×320 px, 1:1, transparent PNG
- **Prompt:** Create a single flat-relief enamel emblem of a thick rupee symbol struck on a circular medallion face with a dotted inner ring, for a collectible tile-matching mobile game. Render as raised cloisonné enamel with a thin brass outline (`#C9A44C`), a warm gold-to-amber enamel medallion (`#FFE9A8` to `#F0A500`), and the rupee glyph poured in dark bronze `#7A4A00` with squared, confident stroke ends. Add a small four-point brass sparkle at the upper right, no larger than one-eighth of the emblem. Straight-on top-down view, one specular sweep upper-left. Must read at 40 px. Transparent background, centred with 12% padding.
- **Negative:** text other than the single rupee glyph, watermark, emoji, dollar sign, coin stack, piggy bank, badge rim, background, cast shadow, photographic gold, glitter dust

---

### sm3-emblem-home — "Home" token (home-loan protection)

- **Size:** 320×320 px, 1:1, transparent PNG
- **Prompt:** Create a single flat-relief enamel emblem of a simple gabled house with a chimney, one door and two square windows, for a collectible tile-matching mobile game. Render as raised cloisonné enamel with a thin brass outline (`#C9A44C`): cream enamel walls (`#FDF6EC` to `#E8D9C3`), a roof poured in brand orange `#F26522` deepening to `#C24608`, and door/windows in deep teal `#0B564F`. Straight-on top-down flat view, no perspective, one soft specular sweep along the roof's upper-left slope. Bold geometry, no fine architectural detail, readable at 40 px. Transparent background, centred with 12% padding.
- **Negative:** text, watermark, emoji, landscape, garden, sky, ground, badge rim, background, cast shadow, isometric or 3/4 view, realistic brick or roof-tile texture, tiny windows

---

### sm3-emblem-education — "Education" token (child education plan)

- **Size:** 320×320 px, 1:1, transparent PNG
- **Prompt:** Create a single flat-relief enamel emblem of a graduation mortarboard cap with a hanging tassel, for a collectible tile-matching mobile game. Render as raised cloisonné enamel with a thin brass outline (`#C9A44C`): the cap board and crown in deep indigo enamel (`#3E3480` to `#221A52`), the tassel cord and bead in warm gold `#FFD25E`. Straight-on top-down flat view with the board shown as a clean rhombus, one specular sweep across the upper-left of the board. Thick shapes, big tassel bead, readable at 40 px. Transparent background, centred with 12% padding.
- **Negative:** text, watermark, emoji, diploma scroll, book, student figure, badge rim, background, cast shadow, fine tassel threads, realistic fabric texture

---

### sm3-emblem-health — "Health" token (health / critical-illness cover)

- **Size:** 320×320 px, 1:1, transparent PNG
- **Prompt:** Create a single flat-relief enamel emblem of a rounded heart with a clean ECG heartbeat line running horizontally across its middle, for a collectible tile-matching mobile game. Render as raised cloisonné enamel with a thin brass outline (`#C9A44C`): the heart poured in coral-to-crimson enamel (`#FF8B84` to `#D6221B`), the heartbeat line in pure white `#FFFFFF` with rounded stroke caps and one tall peak. Straight-on top-down flat view, one specular sweep on the heart's upper-left lobe. Bold, symmetric, readable at 40 px. Transparent background, centred with 12% padding.
- **Negative:** text, watermark, emoji, medical cross, stethoscope, pill, hospital imagery, badge rim, background, cast shadow, anatomical heart, thin jagged line

---

### sm3-emblem-retirement — "Retirement" token (pension / annuity)

- **Size:** 320×320 px, 1:1, transparent PNG
- **Prompt:** Create a single flat-relief enamel emblem of a wingback lounge armchair viewed square from the front, for a collectible tile-matching mobile game. Render as raised cloisonné enamel with a thin brass outline (`#C9A44C`): upholstery in warm sand-to-caramel enamel (`#FFE9C9` to `#F3C888`), frame, legs and armrest edges in cocoa brown `#7C4514`, and a small brass sun-arc rising behind the chair back at one-quarter the emblem height. Straight-on flat view, one specular sweep along the upper-left of the backrest. Chunky silhouette, readable at 40 px. Transparent background, centred with 12% padding.
- **Negative:** text, watermark, emoji, elderly person, walking stick, clock, beach, room interior, badge rim, background, cast shadow, wood-grain photography, spindly legs

---

### sm3-emblem-family — "Family" token (whole-life cover)

- **Size:** 320×320 px, 1:1, transparent PNG
- **Prompt:** Create a single flat-relief enamel emblem of three abstract rounded figures — two tall adults flanking one short child — merged into a single compact group silhouette, for a collectible tile-matching mobile game. Render as raised cloisonné enamel with a thin brass outline (`#C9A44C`): the two adult figures in fresh green enamel (`#57BB5B` to `#1B5E20`), the child figure in warm cream `#FFE3B3`, all three sharing one continuous outer contour so the group reads as one shape. Straight-on flat front view, one specular sweep upper-left. No faces, no limbs — pure lollipop head-and-body forms. Readable at 40 px. Transparent background, centred with 12% padding.
- **Negative:** text, watermark, emoji, facial features, hands, hair detail, pets, house, badge rim, background, cast shadow, realistic people, more than three figures

---

### sm3-emblem-set-b — remaining four goal emblems on one sheet (car, marriage, child, rewards)

- **Size:** 1280×320 px, 4:1 strip, transparent PNG (four 320×320 cells, left to right)
- **Prompt:** Create a horizontal strip of exactly four flat-relief cloisonné enamel emblems for a collectible tile-matching mobile game, evenly spaced in four equal square cells, all drawn in one consistent style: thin brass outline (`#C9A44C`) around every shape, poured glossy enamel fill, straight-on top-down flat view, one specular sweep in the upper-left of each emblem, thick bold geometry readable at 40 px. Cell 1 — a compact side-on hatchback car, body in coral-red enamel (`#FF8A5C` to `#D64541`) with pale-blue glass `#BFE3FF` and charcoal wheels. Cell 2 — two interlocking wedding rings, one in blush-pink enamel (`#FFE9F3` to `#F3B8D4`) and one in champagne `#FFE1AE`, with a small brass sparkle at the upper right. Cell 3 — a pram/stroller seen from the side, hood in sky-blue enamel (`#FFFFFF` to `#CDEBFF`), body in warm orange `#FF9D5C`, two charcoal wheels. Cell 4 — a wrapped gift box, box in violet enamel (`#7C3AED` to `#4C1D86`) with a gold ribbon cross and bow in `#FFD25E`. Equal optical weight across all four cells. Transparent background, each emblem centred in its cell with 12% padding.
- **Negative:** text, watermark, emoji, badge rims, squircle frames, backgrounds, cast shadows, mismatched line weights between cells, extra cells, cell borders or dividers, photographic materials, people

---

### sm3-tray-rail — the 7-slot collection tray at the bottom of the play area

- **Size:** 1024×220 px, ~4.6:1, transparent PNG
- **Prompt:** Create a horizontal collector's display rail with exactly seven empty square recesses, for a collectible tile-matching mobile game. The rail is a shallow brushed-brass tray (`#C9A44C` top edge, `#8A6B22` underside) with softly rounded outer corners, its inside lined in dark navy felt `#0A2447`. Each of the seven recesses is an identical rounded-square well with a crisp inner shadow and a hairline brass lip, spaced evenly with equal gaps, empty and unlit. Straight-on top-down view with the faintest hint of depth in the wells only. The rail must tile-crop cleanly at the left and right ends. Transparent background above and below the rail, 4% padding.
- **Negative:** text, watermark, emoji, tokens or badges inside the wells, numbers on the slots, six or eight recesses, uneven spacing, wood, leather, photographic metal, heavy drop shadow, perspective tilt, decorative engraving

---

### sm3-hud-glyphs — HUD ring cap, collection-rail cap, and three booster glyphs on one sheet

- **Size:** 960×192 px, 5:1 strip, transparent PNG (five 192×192 cells, left to right)
- **Prompt:** Create a horizontal strip of exactly five minimal monoline UI glyphs for a collectible tile-matching mobile game, evenly spaced in five equal square cells, all in one consistent style: 2.5 px-equivalent uniform stroke weight, rounded caps and joins, no fill, pure white `#FFFFFF` at 85% opacity, absolutely flat with no gradients or highlights. Cell 1 — an open circular arc with a rounded end cap, three-quarters closed, reading as a depleting timer ring. Cell 2 — a short horizontal capsule with a small filled leading dot, reading as the end cap of a progress rail. Cell 3 — a counter-clockwise curved arrow (undo). Cell 4 — two crossing arrows swapping positions (shuffle). Cell 5 — a horseshoe magnet with two straight poles. Every glyph must sit on the same optical baseline and share the same visual weight. Transparent background, each glyph centred in its cell with 20% padding.
- **Negative:** text, watermark, emoji, fills, gradients, shadows, colour, badge frames, circles or buttons behind the glyphs, cell borders, varying stroke widths, extra cells, 3D shading

---

### sm3-merge-burst — the particle flash when three identical badges merge

- **Size:** 512×512 px, 1:1, transparent PNG
- **Prompt:** Create a single frozen burst effect for the instant three collectible enamel badges merge in a tile-matching mobile game. From a bright warm-white core, throw out roughly sixteen chunky rounded shards and dots of varying size, radiating unevenly outward in all directions with the longest at the top, coloured in warm gold `#FFD97A`, brand orange `#F26522`, and pure white. Behind them place a soft circular bloom of warm light fading to fully transparent at the edge, plus one thin expanding gold ring at roughly 60% of the frame width. Straight-on flat view, crisp graphic shapes rather than photographic sparks or lens flare. Transparent background, centred with 4% padding.
- **Negative:** text, watermark, emoji, lens flare, photographic bokeh, smoke, fire, sparks with motion-blur trails, background colour, badges or tiles, characters, star-shaped glints, dark edges

---

### sm3-result-cabinet — hero art on the end-of-run results screen

- **Size:** 900×600 px, 3:2, transparent PNG
- **Prompt:** Create a hero illustration of a completed collector's cabinet drawer for the results screen of a tile-matching mobile game. Show a shallow brushed-brass drawer (`#C9A44C` rim, `#8A6B22` shadow side) lined in dark navy felt `#051A3A`, tilted a gentle 15 degrees toward the viewer, holding nine glossy enamel squircle pin badges arranged in a neat 3×3 grid — each badge a different jewel tone (blue `#003DA6`, orange `#F26522`, green `#28A745`, teal, amber, violet, coral, sky, rose) with its emblem left as a soft indistinct raised shape so no single icon dominates. Add one warm overhead pool of light so the brass rim catches a highlight along the top edge and each badge shows a single specular sweep. Calm, premium, satisfying — the feeling of a finished set. Transparent background around the drawer, 5% padding.
- **Negative:** text, watermark, emoji, numbers, scores, stars, ribbons, trophies, confetti, characters, hands, room or table surface, hard cast shadow on ground, photographic realism, empty slots

---

## Notes for whoever generates these

- Badge emblems (`sm3-emblem-*`) are generated **separately from** `sm3-badge-blank` on purpose:
  one badge body, eleven emblems, composited at runtime. Do not ask Nano Banana for a
  finished badge-with-emblem — the rim lighting will drift between the eleven results.
- If an emblem comes back with a frame or rim around it, regenerate rather than crop; the
  cloisonné outline weight changes when the model thinks it is drawing a badge.
- Everything except `sm3-board-felt` must be transparent PNG. Check the alpha channel before
  dropping into `src/assets/`.
- Current build ships programmatic inline-SVG sprites (`src/data.js`); these prompts are the
  upgrade path to real art, not a description of what ships today.

---

## Replacement checklist

| Prompt id | Replaces |
|---|---|
| `tile-shield / SM-01` | `src/assets/tile_shield.png / data.js LIFE_GOALS` |
| `tile-savings / SM-02` | `src/assets/tile_savings.png / data.js LIFE_GOALS` |
| `tile-home / SM-03` | `src/assets/tile_home.png / data.js LIFE_GOALS` |
| `tile-car / SM-04` | `src/assets/tile_car.png / data.js LIFE_GOALS` |
| `tile-education / SM-05` | `src/assets/tile_education.png / data.js LIFE_GOALS` |
| `tile-marriage / SM-06` | `src/assets/tile_marriage.png / data.js LIFE_GOALS` |
| `tile-child / SM-07` | `src/assets/tile_child.png / data.js LIFE_GOALS` |
| `tile-retirement / SM-08` | `src/assets/tile_retirement.png / data.js LIFE_GOALS` |
| `tile-health / SM-09` | `src/assets/tile_health.png / data.js LIFE_GOALS` |
| `tile-rewards / SM-10` | `src/assets/tile_rewards.png / data.js LIFE_GOALS` |
| `tile-family / SM-11` | `src/assets/tile_family.png / data.js LIFE_GOALS` |
| `sm-bg-tabletop` | `src/assets/tabletop_bg.png / Game.jsx background` |
| `sm-hud-tray` | `src/assets/tray_frame.png / Tray component` |
| `sm-results-victory` | `src/assets/victory_art.png / ResultsScreen` |

The game engine dynamically binds these assets at runtime, with fallback to procedural SVG/canvas rendering.
