# Coverage Archer — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Coverage Archer is a **Phaser + React archery game**: players aim and shoot golden arrows at moving virus targets to protect family milestones.

| Axis | Coverage Archer's answer |
|---|---|
| Motif | Night-range archery against life risk targets. |
| Shape language | **Sleek modern bows, golden arrows, concentric circular target rings.** |
| Camera | Side-on 2D archery range view. |
| Signature accent | **Golden Arrow `#FFB800`** & **Cyan Bow Light `#00A3E0`**. |
| Hazard colour | **Acid Spore Green `#49E24B`** with Crimson Core. |
| Brand anchors | Blue `#003DA6`, Orange `#F26522`, Green `#28A745`. |
| Deep values | Dark Range `#0B1326`, Silhouette Night `#030712`. |

Two hard technical rules, because the game post-processes these files at runtime:

1. **Archer hero must be facing right, drawing bowstring.**
2. Arrows must be aligned horizontally pointing right.

---

### bg-night-range — full-screen playfield backdrop behind the Phaser canvas
- **Size:** 960x1280 px portrait (2x of the 480x640 design space), opaque PNG
- **Prompt:** Create a polished mobile-game background of a moonless night archery range on a grassy ridge overlooking a distant sleeping city, for a portrait precision-shooting game. Use flat cel-shaded vector art with hard-edged shapes, two-tone shading only, a fine scatter of pin-sharp stars, and a faint cyan atmospheric haze rising from the horizon. Composition is strictly layered back-to-front: deep navy sky gradient from `#04122B` at the top to `#0A1F47` at the horizon, a flat unlit city skyline silhouette in `#06132D` occupying the middle band, then two overlapping rolling grass hills in `#0D381E` and `#14532D` filling the lower third with clean curved edges. Leave the entire upper two-thirds visually quiet and uncluttered — game targets are composited there and must stay readable. Add a soft cyan `#00AEEF` elliptical ground glow at the lower-left where the archer stands. Camera is a flat side-on 2D view with no perspective.
- **Negative:** text, watermark, logos, UI frames, characters, arrows, targets, photographic textures, lens flare, foreground foliage, busy detail in the upper two-thirds, warm sunset colours, 3D perspective grid

---

### archer-guardian — the player character, bottom-left of the playfield
- **Size:** 320x320 px per frame, transparent PNG, delivered as a 5-frame horizontal strip (1600x320)
- **Prompt:** Create a polished mobile-game character sprite of a calm, upright guardian archer in a fitted Bajaj-blue `#003DA6` field uniform with a white collar chevron, a white-brimmed navy cap, and a small gold `#FACC15` shield crest on the chest, for a 2D side-view archery game. Use flat cel-shaded vector art with a bold clean silhouette, two-tone shading, and a hard cyan `#00AEEF` rim light down the right edge of the body. Show the character in strict left-facing profile, feet planted, drawn small enough to read at 64 px tall. Deliver five frames of the same character in one strip: (1) bow lowered at rest, (2) bowstring drawn one-third with the arm bent, (3) bowstring drawn fully with the arm back past the cheek and the bow limbs flexed, (4) release follow-through with the string snapped forward and the draw hand flung back, (5) victory stance with the bow raised overhead. Keep the character centred with even padding in every frame.
- **Negative:** text, watermark, front-facing pose, realistic anatomy, photographic textures, drop shadow, ground plane, quiver clutter, medieval fantasy armour, emoji, facial detail beyond a single eye dot

---

### bow-protection — the archer's bow, used standalone in menus and the how-to-play demo
- **Size:** 256x384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a slim recurve guardian bow for a 2D archery game. Use flat cel-shaded vector art with a crisp outline, two-tone shading, and a hard cyan `#00AEEF` rim light along the outer limb. The riser is warm amber-bronze `#D97706` shading to `#B45309`, wrapped mid-grip in a Bajaj-blue `#003DA6` band, with a fine white bowstring drawn taut and straight. Show the bow from a flat side-on view, vertical, limbs curving away from the viewer, centred with generous padding. Silhouette must stay legible at 40 px tall.
- **Negative:** text, watermark, nocked arrow, hands, fantasy ornamentation, gemstones, photographic wood grain, drop shadow, perspective foreshortening, motion blur

---

### arrow-protection — the projectile fired every shot, also sticks into the backdrop on a miss
- **Size:** 384x128 px, transparent PNG, horizontal, tip pointing right
- **Prompt:** Create a polished mobile-game asset of a single sleek protection arrow for a 2D archery game. Use flat cel-shaded vector art with a hard clean outline. The head is a broad faceted cyan `#00AEEF` triangular point with a thin white highlight edge and a subtle cyan glow, the shaft is a straight matte white rod, and the fletching is a swept double-V in Bajaj blue `#003DA6`. Present the arrow perfectly horizontal, tip on the right, centred with padding at both ends so it can be rotated about its midpoint without clipping. Silhouette must read at 48 px wide.
- **Negative:** text, watermark, feather texture, wood grain, motion blur, trailing sparks, drop shadow, tilted angle, multiple arrows, quiver

---

### risk-illness-cell — wave 1 and 3 target: the Illness risk
- **Size:** 384x384 px per frame, transparent PNG, 3-frame horizontal strip (1152x384)
- **Prompt:** Create a polished mobile-game enemy target of an **Illness risk cell** for a 2D archery game: a hard-edged crimson **hexagon** membrane with six short blunt cilia stubs pushing out from its vertices and a jagged white fever ECG trace scored across its lower half. Use flat cel-shaded vector art, a bold hexagonal silhouette readable at 38 px, a top-down flat facing view, and a vertical gradient from `#FB7185` at the top through `#E11D48` to `#7F1D1D` at the base, outlined in dark maroon. At the exact centre place a small bright white nucleus ringed by a dashed pale-pink `#FF9DB0` circle — this is the critical-hit core and must stay the highest-contrast point in the image. Deliver three frames showing the membrane throbbing slightly larger and the ECG trace peaking higher. Keep it centred with even padding.
- **Negative:** text, watermark, cartoon eyes, mouth, face, spherical or round body, spiky ball virus, green colours, drop shadow, photographic slime, tentacles, 3D bevel

---

### risk-accident-shard — wave 1, 2 and 3 target: the Accident risk
- **Size:** 384x384 px per frame, transparent PNG, 3-frame horizontal strip (1152x384)
- **Prompt:** Create a polished mobile-game enemy target of an **Accident risk shard** for a 2D archery game: a chunky amber **rounded equilateral triangle** hazard plate with three dark blunt impact spikes bursting from its corners and a dark forking crack running from the apex to the base. Use flat cel-shaded vector art, a bold triangular silhouette readable at 38 px, a flat facing view, and a vertical gradient from `#FCD34D` through `#F59E0B` to `#78350F`, outlined in deep brown. At the exact centre place a small bright white nucleus ringed by a dashed pale-gold `#FFE08A` circle — the critical-hit core. Deliver three frames with the whole plate rotated a few degrees further each frame and the crack forking a little wider. Keep it centred with even padding.
- **Negative:** text, watermark, warning exclamation glyph, road-sign styling, hexagon or circular body, red colours, cartoon face, drop shadow, photographic metal, 3D bevel, glass refraction

---

### risk-debt-weight — wave 3 target: the Debt risk
- **Size:** 384x384 px per frame, transparent PNG, 3-frame horizontal strip (1152x384)
- **Prompt:** Create a polished mobile-game enemy target of a **Debt risk weight** for a 2D archery game: a heavy violet **rounded rectangular ingot** shackled by two dark steel restraint bands across its face, with two pale indigo chain links rising from its top edge as if it were hung, and a plain downward-pointing arrow scored into each flank. Use flat cel-shaded vector art, a bold squat block silhouette readable at 38 px, a flat facing view, and a vertical gradient from `#A78BFA` through `#8B5CF6` to `#3B1A86`, outlined in deep indigo. At the exact centre place a small bright white nucleus ringed by a dashed pale-lilac `#D6C2FF` circle — the critical-hit core. Deliver three frames in which the block sags slightly lower on its chains. Keep it centred with even padding.
- **Negative:** text, watermark, currency symbols, coins, banknotes, padlock, hexagon or triangular body, cartoon face, drop shadow, photographic metal, 3D bevel, rust texture

---

### risk-jobloss-case — wave 2 and 3 target: the Job Loss risk
- **Size:** 384x384 px per frame, transparent PNG, 3-frame horizontal strip (1152x384)
- **Prompt:** Create a polished mobile-game enemy target of a **Job Loss risk case** for a 2D archery game: a steel-grey **briefcase split clean down the middle** by a jagged vertical fault line, its two halves drifting apart and tilting away from each other, its carry handle snapped into two stubs, a pale latch stud on each half, and two short descending diagonal strokes scored across the shell like a falling income line. Use flat cel-shaded vector art, a bold wide rectangular silhouette readable at 38 px, a flat facing view, and a vertical gradient from `#94A3B8` through `#64748B` to `#1E293B`, outlined in slate. At the exact centre of the gap place a small bright white nucleus ringed by a dashed pale-blue `#CBD5F5` circle — the critical-hit core. Deliver three frames with the split opening progressively wider. Keep it centred with even padding.
- **Negative:** text, watermark, papers, documents, company logos, hexagon or triangular body, cartoon face, leather texture, drop shadow, photographic hardware, 3D bevel, warm colours

---

### fx-critical-shockwave — expanding ring played on a core hit
- **Size:** 512x512 px, transparent PNG
- **Prompt:** Create a polished mobile-game VFX asset of a single thin expanding shockwave ring for a 2D archery game, drawn as one perfectly circular gold `#FACC15` stroke that is brightest at the top-right and fades toward transparent at the lower-left, with a faint inner cyan `#00AEEF` echo ring one-third of the radius inside it. Use flat cel-shaded vector art with a hard clean stroke, no fill, and a completely empty centre so the hit point stays visible through it. Show it flat-on and perfectly centred.
- **Negative:** text, watermark, filled centre, particles, smoke, sparks, lens flare, photographic glow bloom, 3D perspective, multiple overlapping rings, drop shadow

---

### fx-impact-shards — debris particles thrown on every hit
- **Size:** 128x128 px per shard, transparent PNG, 4-shard horizontal strip (512x128)
- **Prompt:** Create a polished mobile-game VFX asset strip of four small angular debris shards for a 2D archery game, each a different irregular flat quadrilateral splinter with hard straight edges and a single bright highlight facet. Render them in pure white so they can be tinted at runtime to any risk colour. Use flat cel-shaded vector art with no gradient and no outline. Centre each shard in its own frame with even padding.
- **Negative:** text, watermark, colour, gradients, smoke, sparks, round particles, glow, blur, drop shadow, photographic rubble, 3D perspective

---

### hud-wind-indicator — HUD chip showing wind direction and strength
- **Size:** 256x128 px, transparent PNG
- **Prompt:** Create a polished mobile-game HUD icon of a wind direction indicator for a portrait archery game: a single horizontal cyan `#00AEEF` arrow pointing right with a chevron head, trailed by three shortening parallel speed lines behind it, and a compact stepped bar meter of six vertical rungs of increasing height sitting to its right. Use flat cel-shaded vector art with uniform 3 px stroke weight, rounded caps, no fill, and no container plate. Show it flat-on, centred, readable at 24 px tall.
- **Negative:** text, numbers, watermark, compass rose, weather vane, clouds, container pill or plate, drop shadow, gradients, 3D perspective, photographic effects

---

### hud-icon-set — quiver, timer and streak icons in the top HUD row
- **Size:** 128x128 px per icon, transparent PNG, 3-icon horizontal strip (384x128)
- **Prompt:** Create a polished mobile-game HUD icon strip of three matched line icons for a portrait archery game: (1) a quiver holding three arrow nocks, (2) a plain circular stopwatch with two hands, (3) a stacked upward chevron streak mark. Use flat cel-shaded vector line art with a uniform 2.6 px stroke, rounded caps and joins, no fill, drawn in pure white so they can be tinted at runtime, on a consistent optical size so the three read as one family. Show each flat-on and centred in its own frame, legible at 16 px.
- **Negative:** text, numbers, watermark, colour fills, container plates, badges, drop shadow, gradients, 3D perspective, mismatched stroke weights, photographic effects

---

### result-secured-crest — hero art on the results screen after a full clear
- **Size:** 768x768 px, transparent PNG
- **Prompt:** Create a polished mobile-game result-screen emblem of a guardian archery crest for a life-insurance precision game: a broad shield in Bajaj blue `#003DA6` with a green `#28A745` inner field and a white check mark, crossed behind it by one amber-bronze recurve bow and one cyan-tipped protection arrow forming an X, and ringed by four small dimmed silhouettes — a crimson hexagon, an amber triangle, a violet block and a slate briefcase — each struck through with a thin cyan line to read as neutralised. Use flat cel-shaded vector art with a bold heraldic silhouette, a hard cyan `#00AEEF` rim light along the shield's upper-left edge, and no background. Show it flat-on and perfectly centred.
- **Negative:** text, watermark, banners, ribbons, laurel wreaths, company logos, realistic metal, photographic textures, drop shadow, 3D bevel, gemstones, confetti

---

### result-gap-crest — hero art on the results screen when risks got through
- **Size:** 768x768 px, transparent PNG
- **Prompt:** Create a polished mobile-game result-screen emblem of a breached guardian crest for a life-insurance precision game: the same broad Bajaj-blue `#003DA6` shield, but cracked open on its right side with a jagged orange `#F26522` fault line, its green inner field dimmed to grey, and two of the four risk silhouettes — a crimson hexagon and a slate briefcase — slipping through the breach at full saturation while the other two stay dimmed outside the shield. Use flat cel-shaded vector art with a bold heraldic silhouette, a hard cyan `#00AEEF` rim light on the intact left edge, and no background. Show it flat-on and perfectly centred.
- **Negative:** text, watermark, blood, gore, banners, ribbons, company logos, realistic metal, photographic textures, drop shadow, 3D bevel, smoke, fire

---

## Replacement checklist

| Prompt id | Replaces |
|---|---|
| `archer-hero / CA-01` | `public/assets/archer_hero.png / App.tsx` |
| `arrow-gold / CA-02` | `public/assets/arrow_gold.png / App.tsx` |
| `target-virus / CA-03` | `public/assets/target_virus.png / App.tsx` |
| `bg-night-range` | `public/assets/range_bg.png / Phaser scene` |
| `ca-results-win` | `Results overlay` |

The game engine dynamically binds these assets at runtime, with fallback to procedural SVG/canvas rendering.
