# Guardian Shelter — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Guardian Shelter is the repo's **storm-shelter** game: you build cover *before* the
weather arrives. Nothing here is a runner, a launcher or a match game, and the art
must not look like one.

| Axis | Guardian Shelter's answer |
|---|---|
| Motif | Storm shelter. Domes, lids, tarpaulins, things you get **under**. |
| Shape language | **Dome-over-box.** Every shield silhouette is a soft arc sitting on a hard rectangle. Chunky 3–4 px dark navy outline, bevelled edges, no thin filigree. |
| Camera | Flat front elevation (a stage seen side-on). No isometric, no perspective floor. |
| Signature accent | **Shelter Gold `#FFC845`** — used only for rim light, safe-state rings and "protected" cues. This is the colour that separates this game from every other one in the repo. |
| Hazard colour | **Spore Green `#49E24B`** with a deep core `#0E5C1D`. Storm hazards are *biological*, never fire or lightning-yellow. |
| Brand anchors | Blue `#003DA6` / bright blue `#1E6BE0` (shelter + water), Orange `#F26522` (timber/crates), Green `#28A745` (the child, safety). |
| Deep values | Night navy `#051A3A`, shadow `#021028`. |

Two hard technical rules, because the game post-processes these files at runtime:

1. **Family characters must be full-body, standing, feet touching the lower edge of
   the frame, horizontally centred.** The engine measures the opaque bounding box and
   anchors the sprite by its feet.
2. If a transparent PNG cannot be produced, the backdrop must be a **single flat colour
   that appears nowhere on the character** (recommend pure magenta `#FF00FF`). The engine
   flood-fills the backdrop away from the frame border, so any backdrop colour that also
   appears inside the character will punch a hole in it.

---

### gs-bg-shelter-yard — playfield background (canvas, behind everything)
- **Size:** 1024×1024 px, JPEG or PNG, opaque, no alpha needed
- **Prompt:** Create a polished mobile-game background of a quiet suburban shelter yard at dusk under a gathering storm for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Show it as a flat front elevation, like a theatre backdrop with no perspective floor. Compose it in three depth bands: a bruised night-navy sky (#051A3A to #0E3A74) filling the top half with heavy layered storm cloud shelves, a middle band of simplified dark blue rooftops and a low garden wall silhouetted in #021028, and an empty featureless lower third in deep navy that gameplay objects will be drawn over. Keep the lower third visually quiet, low-contrast and free of any detail, landmark or bright area. Add a faint bright blue #1E6BE0 atmospheric glow along the horizon line only. The whole image must be dark and low-contrast so light characters placed on top pop off it.
- **Negative:** text, watermark, logos, characters, people, umbrellas, crates, UI frame, HUD, buttons, vignette border, photographic texture, lens flare, rain streaks, busy foreground detail, bright areas in the lower third, isometric or three-quarter perspective

### gs-family-dad — family member "dad" (playfield, must be sheltered)
- **Size:** 1024×1024 px, transparent PNG (fallback: flat `#FF00FF` backdrop)
- **Prompt:** Create a polished mobile-game character asset of a calm, sturdy Indian father in a bright blue #1E6BE0 work shirt and dark navy #003DA6 trousers for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Show the full body standing straight and still, front-facing, arms relaxed at his sides, looking slightly upward at the sky with a steady protective expression. Fill the frame vertically: head near the top edge, both feet touching the bottom edge, body centred horizontally, occupying roughly half the frame width. Outline the whole figure with a chunky 4 px dark navy #021028 contour and add a warm gold #FFC845 rim light down the left edge of the body. Keep the silhouette simple and blocky so it reads at 45 px tall. Transparent background.
- **Negative:** text, watermark, drop shadow, ground plane, floor, base platform, cropped feet, cropped head, sitting or walking pose, side or three-quarter view, held props, umbrella, background scenery, photographic texture, emoji, thin outlines, gradients busier than two stops

### gs-family-mom — family member "mom" (playfield, must be sheltered)
- **Size:** 1024×1024 px, transparent PNG (fallback: flat `#FF00FF` backdrop)
- **Prompt:** Create a polished mobile-game character asset of a warm, alert Indian mother in a burnt-orange #F26522 kurta with a deep rust #C2470F dupatta for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Show the full body standing straight and still, front-facing, one hand held protectively across her waist, looking slightly upward with a watchful expression. Fill the frame vertically: head near the top edge, both feet touching the bottom edge, body centred horizontally, occupying roughly a third of the frame width. Outline the whole figure with a chunky 4 px dark navy #021028 contour and add a warm gold #FFC845 rim light down the left edge. Keep the silhouette simple and blocky so it reads at 45 px tall. Transparent background.
- **Negative:** text, watermark, drop shadow, ground plane, floor, base platform, cropped feet, cropped head, sitting or walking pose, side or three-quarter view, held props, umbrella, background scenery, photographic texture, emoji, thin outlines

### gs-family-kid — family member "kid" (playfield, smallest hit target)
- **Size:** 1024×1024 px, transparent PNG (fallback: flat `#FF00FF` backdrop)
- **Prompt:** Create a polished mobile-game character asset of a small cheerful Indian child in a leaf-green #28A745 t-shirt and dark green #146C2E shorts for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Show the full body standing straight and still, front-facing, arms down, chin tipped up, with an unworried open-mouthed smile. Fill the frame vertically: head near the top edge with slightly exaggerated child proportions, both feet touching the bottom edge, body centred horizontally, occupying roughly a third of the frame width. Outline the whole figure with a chunky 4 px dark navy #021028 contour and add a warm gold #FFC845 rim light down the left edge. Keep the silhouette simple and blocky so it reads at 38 px tall. Transparent background.
- **Negative:** text, watermark, drop shadow, ground plane, floor, base platform, cropped feet, cropped head, sitting or running pose, side or three-quarter view, toys, held props, background scenery, photographic texture, emoji, thin outlines

### gs-family-grandpa — family member "grandpa" (playfield, must be sheltered)
- **Size:** 1024×1024 px, transparent PNG (fallback: flat `#FF00FF` backdrop)
- **Prompt:** Create a polished mobile-game character asset of a kindly elderly Indian grandfather in a soft slate-lavender #7A89B8 kurta with gold-rimmed round spectacles for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Show the full body standing straight and still, front-facing, both hands resting one over the other in front of him, white hair and a short white beard, calm expression. Fill the frame vertically: head near the top edge, both feet touching the bottom edge, body centred horizontally, occupying roughly half the frame width. Outline the whole figure with a chunky 4 px dark navy #021028 contour and add a warm gold #FFC845 rim light down the left edge. Keep the spectacles as two simple #FFC845 circles so they survive downscaling to 45 px tall. Transparent background.
- **Negative:** text, watermark, drop shadow, ground plane, floor, base platform, cropped feet, cropped head, sitting or leaning pose, side or three-quarter view, walking stick, held props, background scenery, photographic texture, emoji, thin outlines

### gs-shield-umbrella — draggable shield type 1 (deflecting dome)
- **Size:** 512×448 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a sturdy scalloped storm umbrella seen as a flat front elevation for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Build it as a wide taut half-dome canopy occupying the top two thirds of the frame with three shallow scallops along its lower hem, a short white finial spike at the apex, and a slim grey #94A3B8 shaft below ending in a small hook. Shade the canopy with a left-to-right gradient from bright blue #1E6BE0 through #3B8DD4 into deep navy #003DA6, add a crisp white 35 percent opacity highlight arc along the top rim, and outline the entire shape in 4 px #021028. The dome must read as hard and bouncy, like something a ball would ping off. Centre it with even padding. Transparent background.
- **Negative:** text, watermark, rain, droplets, held hand, person, ground, drop shadow, three-quarter or tilted view, folded or closed umbrella, floral pattern, photographic texture, thin outlines, realistic fabric folds

### gs-shield-crate — draggable shield type 2 (blocking box)
- **Size:** 448×448 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a chunky square timber supply crate seen as a flat front elevation for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Build it as a rounded-corner square with a warm orange #FF8A3D to #F26522 diagonal gradient face, a recessed inner panel in darker #C2470F, two bold cross-braced planks forming an X across the face, a 4 px burnt-umber #A83B08 outline, and a small triangular white gloss wedge in the top-left corner. Keep every edge bevelled and heavy so it reads as solid and stackable. Centre it with even padding. Transparent background.
- **Negative:** text, watermark, labels, stencilled letters, nails, rope, ground, drop shadow, isometric or three-quarter view, open lid, contents, photographic wood grain, thin outlines

### gs-shield-barrel — draggable shield type 3 (tall blocker)
- **Size:** 384×448 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a tall banded steel barrel seen as a flat front elevation for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Build it as a rounded-corner vertical rectangle with a cylindrical left-to-right metal gradient running #112240, #1E6BE0, #0A3D91, #021028, two thick horizontal white 35 percent opacity reinforcing bands at 28 and 72 percent of its height, one soft vertical specular stripe near the left third, and a 4 px #1E3A8A outline. It must read as heavier and narrower than the crate. Centre it with even padding. Transparent background.
- **Negative:** text, watermark, hazard symbols, rust, dents, ground, drop shadow, isometric or three-quarter view, open top, spill, photographic metal texture, thin outlines

### gs-platform-ledge — floating ledge some family members stand on
- **Size:** 512×96 px, transparent PNG, horizontally tileable
- **Prompt:** Create a polished mobile-game asset of a narrow floating glass-and-steel safety ledge seen as a flat front elevation for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Build it as a long thin rounded-corner slab with a translucent deep blue #003278 body at about 40 percent opacity, a solid bright blue #1E6BE0 2.5 px border, a brighter top edge highlight to read as a walkable surface, and a soft bright blue outer glow. Keep the left and right ends flat so copies can butt together seamlessly. Centre it vertically with even padding. Transparent background.
- **Negative:** text, watermark, supports, pillars, brackets, ground, cast shadow, isometric or three-quarter view, railings, rivets, photographic texture, tapered ends

### gs-hazard-spore — storm particle that must be deflected
- **Size:** 256×256 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a small spiked bio-hazard storm spore for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Build it as a perfect circle in acid spore-green #49E24B with exactly ten short straight spikes radiating evenly from its rim, a solid dark green #0E5C1D inner core disc at half the radius, and a soft green outer glow halo. Keep it perfectly radially symmetrical so it looks correct at any rotation, and readable at 18 px across. Centre it with generous padding for the glow. Transparent background.
- **Negative:** text, watermark, face, eyes, tentacles, motion blur, trail, purple, crimson, red, realistic microbiology, photographic texture, drop shadow, asymmetric spikes
- **Note:** deliberately green, not the purple/crimson used in the older catalog draft — green is this game's hazard signature and must not drift.

### gs-hazard-emitter — the sweeping storm cloud that spawns spores
- **Size:** 512×384 px, transparent PNG
- **Prompt:** Create a polished mobile-game asset of a low, dense, angry storm cloud head seen as a flat front elevation for a physics protection puzzle. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Build it as a compact stack of overlapping rounded lobes in slate #334155 fading to #1E293B at the edges, with a single bright spore-green #49E24B glowing vent at its underside centre and a faint green underlight spilling down from that vent onto the cloud's lower lobes. Keep the silhouette wide, flat-bottomed and heavy, as if about to drop something. Centre it with padding for the glow. Transparent background.
- **Negative:** text, watermark, rain streaks, lightning bolts, yellow, orange, cartoon face, cheeks, blowing wind lines, photographic clouds, drop shadow, fluffy white cumulus
- **Note:** the vent glow must be green, matching gs-hazard-spore — the cloud reads as the source of the spores, not as weather.

### gs-hud-icons — HUD glyph set (round / timer / score)
- **Size:** 384×128 px sheet, three 128×128 cells in one row, transparent PNG
- **Prompt:** Create a polished mobile-game icon sheet of three flat line glyphs in one horizontal row for a physics protection puzzle HUD. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Cell one is a rounded heraldic shield outline in slate #94A3B8 for the round counter. Cell two is a circular clock face with hour and minute hands in orange #FF8A3D for the timer. Cell three is a five-pointed star outline in bright blue #1E6BE0 for the score. Draw all three with the same 2.5 px rounded-cap stroke, the same optical weight, no fill, and identical padding inside their cells so they sit evenly in a row. Transparent background.
- **Negative:** text, numbers, labels, watermark, filled shapes, gradients, drop shadow, inconsistent stroke weights, cell borders, background plate, photographic texture, more or fewer than three icons

### gs-result-sheltered — win art for the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of a family standing together safely under one large blue storm umbrella while green spores ricochet harmlessly off its dome for a physics protection puzzle results screen. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Show it as a flat front elevation: four simplified full-body family silhouettes in blue #1E6BE0, orange #F26522, green #28A745 and slate #7A89B8 clustered shoulder to shoulder, a wide deep-blue #003DA6 scalloped umbrella dome arcing over all of them, and three or four spore-green #49E24B spiked circles bouncing away off the dome along short curved deflection arcs. Wrap the whole group in a soft warm gold #FFC845 protective halo. Keep faces to simple dots and curves. Centre the composition with even padding. Transparent background.
- **Negative:** text, watermark, confetti, trophies, medals, sparkles, badges, rain, ground, drop shadow, three-quarter or isometric view, detailed faces, photographic texture, purple or crimson hazards

### gs-result-exposed — loss art for the results screen
- **Size:** 768×768 px, transparent PNG
- **Prompt:** Create a polished mobile-game illustration of a family standing beside a gap in their storm cover as green spores get through for a physics protection puzzle results screen. Use a consistent flat vector-illustration style with clean silhouettes, strong readability at small sizes, soft dimensional lighting, controlled detail, and a professional casual-game finish. Show it as a flat front elevation: four simplified full-body family silhouettes in desaturated slate greys, a blue #003DA6 umbrella dome covering only the left half of the group with an obvious open gap on the right, and two spore-green #49E24B spiked circles falling straight through that gap on dotted descent lines. Tint the uncovered figures a cool grey #64748B and mark them with small white X glyphs. Keep the mood plainly instructive rather than gruesome. Centre the composition with even padding. Transparent background.
- **Negative:** text, watermark, blood, gore, illness symptoms, skulls, tears, crying faces, rain, ground, drop shadow, three-quarter or isometric view, detailed faces, photographic texture

---

## Replacement checklist

| Prompt id | Replaces |
|---|---|
| `gs-bg-shelter-yard` | `src/guardian_shelter_bg.png` |
| `gs-family-dad` | `src/family_dad.png` |
| `gs-family-mom` | `src/family_mom.png` |
| `gs-family-kid` | `src/family_kid.png` |
| `gs-family-grandpa` | `src/family_grandpa.png` |
| `gs-shield-umbrella` / `-crate` / `-barrel` | currently drawn on canvas in `drawShield()` |
| `gs-platform-ledge` | currently drawn on canvas in `drawGame()` |
| `gs-hazard-spore` / `-emitter` | currently drawn on canvas in `drawGame()` |
| `gs-hud-icons` | inline SVGs in the HUD header |
| `gs-result-sheltered` / `-exposed` | `ResultsScreen` in `src/Screens.jsx` |

The four `family_*.png` files are JPEGs despite the extension, which is why the engine
has to key their backdrop out at runtime. Supplying real transparent PNGs lets
`keyOutBackground()` become a no-op and removes the last source of edge fringing.
