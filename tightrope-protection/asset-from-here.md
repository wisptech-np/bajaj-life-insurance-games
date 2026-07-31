# Tightrope Protection — Nano Banana Asset Prompt Sheet

Paste each prompt into Nano Banana as-is. One asset per prompt.

## Art direction lock (read once, applies to every prompt below)

Tightrope Protection is a **Phaser + React tightrope balance runner**: players balance a guardian hero walking across high-wire tension ropes between city skyscrapers under gusty winds.

| Axis | Tightrope Protection's answer |
|---|---|
| Motif | High-wire balancing across urban skylines under night winds. |
| Shape language | **Slim horizontal balance bars, tension wires, floating risk gusts.** |
| Camera | Side 2D elevation tracking hero across rope. |
| Signature accent | **Cyan Balance Glow `#00A3E0`**. |
| Hazard colour | **Gust Orange `#F26522`** & **Virus Red `#EF4444`**. |
| Brand anchors | Blue `#003DA6`, Orange `#F26522`, Green `#28A745`. |
| Deep values | Night City `#080F1E`, Sky Shadow `#020617`. |

Two hard technical rules, because the game post-processes these files at runtime:

1. **Runner hero must be centred vertically over the tightrope.**
2. Balance bar must be perfectly horizontal in default state.

---

### tp-01-walker-run — player sprite sheet, 4-frame walk cycle on the cable
- **Size:** 256×64 transparent PNG (4 frames of 64×64, feet resting at y=52 of each frame)
- **Prompt:** Create a polished mobile-game asset of a slender tightrope walker in a pale ice-white performance jacket and deep navy trousers, carrying a long horizontal orange balance pole across both hands, for a three-lane aerial runner game. Render as a four-frame side-profile walk cycle laid left to right in a single strip, each frame showing a different stride phase with the pole tilting a few degrees to counter the step, the figure facing right. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting from the upper right, a crisp white rim light down the leading edge, and a professional casual-game finish. Show the object from a strict side elevation, feet on an implied thin line at the same height in every frame. Keep each frame centred with even padding. Use ice white (#EDF3FF), pale steel blue (#A9C2E8), deep navy (#0A2C6B), brand blue (#003DA6) for the helmet and the chest sash, warm skin (#F3D2AE), gold (#FFC845) shoes, and brand orange (#F26522) with a light tip highlight (#FFB988) for the balance pole. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, cast shadows, ground plane, or extra objects. Export-ready game asset, 256x64 PNG sprite strip.
- **Negative:** text, watermark, numbers, frame borders, realistic photo, 3D render, emoji, drop shadow, ground or floor, rope drawn under the feet, circus tent, crowd, face detail beyond a single highlight, colour outside the listed palette

### tp-02-walker-hop — jump pose, replaces the run frames mid-air
- **Size:** 64×64 transparent PNG
- **Prompt:** Create a polished mobile-game asset of the same slender tightrope walker mid-hop with both knees tucked forward and the long orange balance pole tilted up to the left for counterweight, for a three-lane aerial runner game. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, soft dimensional lighting from the upper right, a crisp white rim light down the leading edge, and a professional casual-game finish. Show the object from a strict side elevation, facing right, body compressed and slightly higher in the frame than a standing pose. Keep the composition centred with sufficient padding. Use ice white (#EDF3FF), pale steel blue (#A9C2E8), deep navy (#0A2C6B), brand blue (#003DA6) helmet and sash, warm skin (#F3D2AE), gold (#FFC845) shoes, brand orange (#F26522) pole with #FFB988 highlight. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, cast shadows, or extra objects. Export-ready game asset, 64x64 PNG.
- **Negative:** text, watermark, motion-blur streaks, speed lines, realistic photo, 3D render, emoji, drop shadow, ground plane, cape, wings

### tp-03-balance-pole — standalone hero prop, also the score glyph source
- **Size:** 512×128 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a single long horizontal balance pole with a slight taper toward each end and a small spherical counterweight capping both tips, for an aerial balance game. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, a soft top-edge specular highlight running the full length, a darker underside for weight, and a professional casual-game finish. Show the object from a strict side elevation, perfectly horizontal, filling the width of the canvas. Keep the composition centred with sufficient padding above and below. Use brand orange (#F26522) as the body, warm highlight (#FFB988) on the upper edge, and deep burnt shadow (#8E3208) on the lower edge. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, hands, or extra objects. Export-ready game asset, 512x128 PNG.
- **Negative:** text, watermark, hands, grip tape, wood grain, realistic photo, 3D render, emoji, drop shadow, diagonal tilt

### tp-04-cable-tile — the three ropes the walker runs on, horizontally tileable
- **Size:** 512×32 transparent PNG, seamless left↔right
- **Prompt:** Create a polished mobile-game asset of a taut braided steel cable seen edge-on, perfectly horizontal and seamlessly tileable left to right, for an aerial three-lane runner game. Render three stacked variants in one image is NOT required — produce a single cable. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, a thin bright specular line along the top of the cable, a near-black core beneath it for weight, a faint outer glow, and a professional casual-game finish. Show the object from a strict side elevation with zero sag and zero perspective. Keep the cable vertically centred with generous transparent padding. Use cool steel (#7E97BB) for the braid, near-black (#02060F) for the underside, pure white at 60 percent for the top highlight, and a wide soft brand-orange (#F26522) glow bed behind it. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, knots, frays, or extra objects. Export-ready game asset, 512x32 PNG.
- **Negative:** text, watermark, sag or catenary curve, knots, fraying, hooks, realistic photo, 3D render, emoji, drop shadow, rope fibres, hemp texture

### tp-05-anchor-pylon — the platform tower at each end of the crossing
- **Size:** 256×640 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a tall slim lattice anchor pylon — two tapering legs braced by horizontal and diagonal cross-members, topped by a small flat crown platform where cables terminate — for an aerial three-lane runner game. Include three cable eyelets set into the tower at three evenly spaced heights on the lower half, and a single small warm beacon light above the crown with a soft halo. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, flat night lighting with a thin warm edge on the crown, and a professional casual-game finish. Show the object from a strict front elevation, vertical, filling the height of the canvas and narrowing toward the top. Keep the composition centred with sufficient padding. Use deep navy structure (#0A2149), lighter brace lines (#123566), a brand-orange (#F26522) trim strip across the crown, brand-blue (#003DA6) eyelets with a white specular dot, and a gold (#FFC845) beacon. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, ladders, flags, or extra objects. Export-ready game asset, 256x640 PNG.
- **Negative:** text, watermark, signage, flags, antennae clutter, power lines, birds, realistic photo, 3D render, emoji, drop shadow, ground or foundation

### tp-06-gust-crosswind — primary hazard, 3-frame swirl loop
- **Size:** 192×64 transparent PNG (3 frames of 64×64)
- **Prompt:** Create a polished mobile-game asset of a crimson crosswind vortex — a tight double curl of wind with three tapering speed streaks trailing behind it and a dark glowing core marked with a single sharp chevron — for an aerial runner game where it is the thing you must dodge. Render as a three-frame loop laid left to right, each frame rotating the outer and inner curls in opposite directions so the strip animates as a spinning vortex. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, an inner radial glow, a bright leading-edge highlight on the left arc, and a professional casual-game finish. Show the object from a straight-on view, travelling right to left. Keep each frame centred with even padding. Use crimson (#D92D4E), hot pink-red (#FF5C78), a near-black core shadow (#5B0E1E), a pale pink core light (#FF9AAC), and a bone-white chevron (#FFE3E9). Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, faces, eyes, or extra objects. Export-ready game asset, 192x64 PNG sprite strip.
- **Negative:** text, watermark, letters spelling RISK, eyes, teeth, face, creature, bird, virus, spikes, realistic photo, 3D render, emoji, drop shadow, blue or green tint

### tp-07-gust-downdraft — secondary hazard variant, drops from above
- **Size:** 192×64 transparent PNG (3 frames of 64×64)
- **Prompt:** Create a polished mobile-game asset of a crimson downdraft — a wedge-shaped column of falling air narrowing to a point, wrapped in two spiralling ribbons and cored by a dark glowing bead, for an aerial runner game. Render as a three-frame loop laid left to right, each frame sliding the ribbons further down the wedge so the strip animates as air pouring downward. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, a vertical inner gradient from bright at the top to deep at the tip, a thin white highlight down the left ribbon, and a professional casual-game finish. Show the object from a straight-on view, oriented vertically, point downward. Keep each frame centred with even padding. Use crimson (#D92D4E), hot pink-red (#FF5C78), near-black (#5B0E1E) and bone-white (#FFE3E9). Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 192x64 PNG sprite strip.
- **Negative:** text, watermark, raindrops, snow, clouds with faces, lightning bolt, creature, realistic photo, 3D render, emoji, drop shadow, blue or grey tint

### tp-08-pickup-coin — savings pickup collected along the cable
- **Size:** 96×96 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a thick beveled gold savings coin struck with a deeply engraved Indian rupee mark, for an aerial runner game. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, a two-step bevel from a darker outer rim into a brighter face, a soft warm halo bleeding just past the rim, one elliptical specular highlight in the upper left, and a professional casual-game finish. Show the object from a straight-on front view, perfectly circular. Keep the composition centred with sufficient padding. Use gold (#FFC845) for the face, pale gold (#FFF3C4) for the highlight, amber (#E8A317) for the rim, and dark bronze (#8A5A05) for the engraving. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, currency symbols other than the rupee, or extra objects. Export-ready game asset, 96x96 PNG.
- **Negative:** text, watermark, dollar or euro sign, sparkles, stars, coin stack, realistic photo, 3D render, emoji, drop shadow, tilted or perspective coin

### tp-09-pickup-shield — protection pickup that absorbs one gust
- **Size:** 96×96 transparent PNG
- **Prompt:** Create a polished mobile-game asset of a compact heraldic protection crest with a flat shoulder line, angular sides and a pointed base, carrying a bold white tick, for an aerial runner game about staying covered. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, a thin white outer border, a vertical gradient body, a faint inner rim light, a soft cool halo bleeding past the border, and a professional casual-game finish. Show the object from a straight-on front view, upright and symmetrical. Keep the composition centred with sufficient padding. Use sky blue (#4FB4FF) at the top of the body easing through (#1E6BE0) into brand blue (#003DA6) at the base, with a pure white border and tick. Transparent background. No text, watermark, border frame, mock-up, UI frame, photographic textures, unnecessary shadows, or extra objects. Export-ready game asset, 96x96 PNG.
- **Negative:** text, watermark, cross, star, lion, crown, ribbon banner, realistic photo, 3D render, emoji, drop shadow, green or orange tint

### tp-10-hud-icon-set — score, savings, lives and sound glyphs
- **Size:** 384×96 transparent PNG (4 cells of 96×96), or 4 separate 24×24 SVGs
- **Prompt:** Create a polished mobile-game icon set of four flat line-and-fill glyphs on one strip for an aerial balance game HUD: (1) a horizontal balance pole with round counterweights resting on a short vertical stem, (2) a beveled gold rupee coin, (3) a small heraldic shield with a tick, (4) a speaker with two curved sound arcs. Use a consistent flat-vector icon style with a uniform 2.2 px stroke weight, rounded caps and joins, an identical optical size and the same visual weight across all four, strong readability at 20 px, and a professional casual-game finish. Show every glyph from a straight-on front view on a shared baseline with equal padding in each cell. Use brand orange (#F26522) for the pole, gold (#FFC845) with dark bronze (#8A5A05) detail for the coin, sky blue (#2E9BFF) with a white tick for the shield, and ice white (#EDF3FF) for the speaker. Transparent background. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, container circles, or extra objects. Export-ready game asset, 384x96 PNG.
- **Negative:** text, watermark, labels, badge circles behind the glyphs, gradients, bevels, skeuomorphism, realistic photo, 3D render, emoji, drop shadow

### tp-11-bg-skyline-bands — the two parallax city layers behind the cables
- **Size:** two images, each 1440×480 transparent PNG, seamlessly tileable left↔right
- **Prompt:** Create a polished mobile-game background asset of a night financial-district skyline reduced to flat rectangular tower silhouettes of varied width and height, with slim roof masts on the tallest towers and a sparse scatter of small warm lit windows, for an aerial runner game played above the city. Produce two seamlessly tileable bands to be layered for parallax: a far band of shorter, lower-contrast towers, and a near band of taller, near-black towers. Use a consistent flat-vector game art style with clean silhouettes, zero interior architectural detail beyond the window dots, no perspective, and a professional casual-game finish. Show the objects from a strict front elevation, all towers sharing one baseline along the bottom edge. Use deep navy (#081C40) at 80 percent opacity for the far band and near-black navy (#040F26) for the near band, with brand-orange (#F26522) window dots at low opacity. Transparent background above the rooflines. No text, watermark, border, mock-up, UI frame, photographic textures, unnecessary shadows, moon, clouds, or extra objects. Export-ready game asset, 1440x480 PNG per band.
- **Negative:** text, watermark, signage, billboards, logos, moon, stars in the band, clouds, streets, cars, people, realistic photo, 3D render, emoji, drop shadow, perspective vanishing point

### tp-12-landing-bg — REPLACES `public/landing_bg.svg` (intro screen backdrop)
- **Size:** 1080×1920 SVG (or PNG), portrait, safe area kept clear between y=300 and y=900
- **Prompt:** Create a polished mobile-game portrait key-art background of three taut steel cables strung between two tall lattice anchor pylons high above a night financial-district skyline, with a single tiny tightrope walker carrying an orange balance pole standing on the middle cable, for an aerial balance game. Light only the middle cable in warm orange so the eye lands on the walker; leave the outer two cool and dim. Use a consistent flat-vector game art style with clean silhouettes, two parallax skyline bands, a sparse cool star field, a soft orange horizon bloom behind the towers, a deep haze fading to near-black beneath the lowest cable, and a professional casual-game finish. Show the scene from a straight-on side elevation with the cables running gently downhill from left to right. Keep the upper third and the lower fifth visually quiet and low-contrast so interface panels can sit on them. Use a sky gradient from #030913 through #04122B and #071B3E to #0B2E6B, skyline bands in #081C40 and #040F26, cables in #7E97BB and #F26522, pylons in #123566 with #FFC845 beacons, and the walker in #EDF3FF with #003DA6 and #F26522 accents. No transparent background — fill the full canvas. No text, watermark, logo, border, mock-up, UI frame, photographic textures, or extra objects. Export-ready portrait background, 1080x1920.
- **Negative:** text, watermark, logo, title lettering, UI mock-up, buttons, phone frame, crowd, circus tent, safety net, moon, birds, realistic photo, 3D render, emoji, busy detail in the upper third

### tp-13-thumbnail — REPLACES `public/thumbnail.png` (game tile in the hub)
- **Size:** 512×512 PNG, opaque
- **Prompt:** Create a polished mobile-game square thumbnail of a tightrope walker in three-quarter silhouette holding a long horizontal orange balance pole, standing dead centre on a single lit cable that runs edge to edge across the frame, with a dim night skyline and one lattice anchor pylon far behind, for an aerial balance game about insurance protection. Compose so the orange pole forms a strong horizontal bar across the middle of the square and the figure is the brightest element in the image. Use a consistent flat-vector game art style with clean silhouettes, strong readability when scaled to 96 px, a soft orange rim glow around the cable, a vignette darkening all four corners, and a professional casual-game finish. Show the subject from a straight-on side elevation. Keep the composition centred with generous margin so no element touches the edge except the cable. Use a background gradient from #030913 to #0B2E6B, the walker in #EDF3FF with #003DA6 and #FFC845 accents, and the pole and cable in #F26522. No transparent background — fill the full canvas. No text, watermark, logo, border, mock-up, UI frame, photographic textures, or extra objects. Export-ready square thumbnail, 512x512 PNG.
- **Negative:** text, watermark, title, logo, game name, star ratings, badge, phone frame, crowd, safety net, realistic photo, 3D render, emoji, busy background

### tp-14-result-crest — hero art for the scoring screen ring
- **Size:** 512×512 transparent PNG
- **Prompt:** Create a polished mobile-game emblem of a balance pole laid horizontally across the face of a heraldic protection crest, with a thin taut cable passing behind both and a small laurel-free tick mark set into the crest below the pole, for the results screen of an aerial balance game. Use a consistent flat-vector game art style with clean silhouettes, strong readability at small sizes, a soft dimensional gradient inside the crest, a warm rim light along the top edge of the pole, a faint outer glow, and a professional casual-game finish. Show the emblem from a straight-on front view, perfectly symmetrical about the vertical axis. Keep the composition centred with sufficient padding. Use brand blue (#003DA6) easing to sky blue (#4FB4FF) in the crest, brand orange (#F26522) with #FFB988 highlight for the pole, cool steel (#7E97BB) for the cable, brand green (#28A745) for the tick, and ice white (#EDF3FF) for the crest border. Transparent background. No text, watermark, border frame, mock-up, UI frame, photographic textures, unnecessary shadows, ribbons, or extra objects. Export-ready game asset, 512x512 PNG.
- **Negative:** text, watermark, numbers, percentage sign, ribbon banner, laurel wreath, trophy, medal, confetti, realistic photo, 3D render, emoji, drop shadow

---

## Wiring the generated art back in

Everything currently ships as procedural canvas art in
`game/scenes/PreloadScene.ts` and inline SVG in `components/Icons.tsx`, so the game runs
with zero image downloads. To swap in generated files:

1. Drop PNGs into `public/`.
2. In `PreloadScene.preload()`, replace the matching `create*Texture()` call with
   `this.load.spritesheet('walker_run', 'walker_run.png', { frameWidth: 64, frameHeight: 64 })`
   (or `this.load.image(...)` for single-frame assets) and move the call into a real
   `preload` load queue.
3. Keep the texture **keys** unchanged — `walker_run`, `walker_hop`, `gust`, `coin`,
   `shield_item`, `sparkle`, `glow` — so `MainScene` needs no edits.
4. Sprite anchoring: `walker_run` / `walker_hop` are placed with origin `(0.5, 0.8125)`,
   i.e. the feet must sit at y=52 of a 64 px frame. Generated frames that break this will
   float above or sink through the cable.

---

## Replacement checklist

| Prompt id | Replaces |
|---|---|
| `runner-balance / TP-01` | `public/assets/runner_balance.png / App.tsx` |
| `balance-bar / TP-02` | `public/assets/balance_bar.png / App.tsx` |
| `hazard-virus / TP-03` | `public/assets/hazard_virus.png / App.tsx` |
| `bg-city-skyline` | `public/landing_bg.svg / App.tsx` |
| `tp-results-art` | `Results overlay` |

The game engine dynamically binds these assets at runtime, with fallback to procedural SVG/canvas rendering.
