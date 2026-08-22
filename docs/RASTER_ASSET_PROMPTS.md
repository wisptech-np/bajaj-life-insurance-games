# Raster Asset Prompt Pack

Backgrounds and key art for the priority titles, locked against `BAJAJ_ARCADE_STYLE_GUIDE.md`. The vector layer (icons, virus variants, UI) is already produced and lives in `shared/assets/`.

## How to run these

**Route through the MCP, not the CLI.** The unlimited model subscriptions (FLUX.2 Pro, GPT Image, Seedream 4.5, Kling O1 Image, Nano Banana, Seedream 5.0 Lite) are billed via a `use_unlim` parameter that **only the MCP exposes** — the CLI rejects it with `Unknown params: use_unlim` and always charges credits.

Prerequisite: the Higgsfield MCP connector must be authenticated to the **pro** account (`diwakar29buddy@gmail.com`), which holds those subscriptions. As of 2026-08-22 it was connected to a separate free account with no allowance.

```
mcp generate_image_batch → requests[{ index, params: { model, prompt, aspect_ratio, use_unlim: true } }]
→ jobs_wait → show_generation_by_ids
```

Fallback if unlimited is unavailable: `nano_banana` or `seedream_v4_5` via the CLI at 1 credit each (`kling_omni_image` is 0.5). Avoid `gpt_image_2` (7) and `recraft_v4_1` at 2k (10) for raster work.

## Shared style suffix

Append to every prompt below:

> Flat vector game art, shaded flat colour, single key light from the upper left. No outlines, no gloss, no text, no lettering, no logos, no user interface elements, no characters unless specified. Deep ink palette of near-black navy `#0A1320`, dark slate `#101D2E` and mid slate `#18293D`. Warm accents in gold `#FFB800` and amber `#FF8A34`. Any hazard or threat element is acid green `#7CD41F`.

All backgrounds render at `aspect_ratio: 9:16` for the 390×844 portrait frame. Key art also 9:16.

---

## Phase 2 — the proving trio

These three validate the style guide before the remaining fifteen titles commit to it. Generate and review these first.

### `milestone-hopper` — *lit safe lanes, unlit hazard lanes*

- **`bg-lanes`** ✅ generated — `milestone-hopper/src/assets/bg-lanes.png`
  > Top-down background for a lane-hopping game, portrait. Wide horizontal lanes running left to right. Safe lanes lit with a warm amber glow, hazard lanes dark and unlit. Alternating rhythm, no repetition seam at top or bottom.
- **`key-art`**
  > Key art for a lane-hopping game. A single small warm-lit character mid-hop between a dark lane and a glowing amber lane, seen from a low three-quarter angle. Acid green hazard shapes lurk in the unlit lanes below.

### `wealth-drop` — *a bright falling ball against a receding dark board*

Review notes: bigger ball, better board design, **zero text**.

- **`bg-board`**
  > Plinko board background, portrait. Rows of small rounded pegs in staggered offset across a deep navy field, receding into darkness toward the bottom. Pegs catch a soft warm rim light from the upper left. Collection slots along the bottom edge as simple flat bays.
- **`ball`** (`aspect_ratio: 1:1`)
  > A single large round game ball, front on, warm gold with one flat lighter highlight at the upper left and a darker gold shadow along the lower right. Solid, heavy, tactile. Nothing else in frame.

### `smart-match-3d` — *lit goal tiles on a calm dark tray*

The 11 life-goal tile faces already exist as SVG in `shared/assets/icons/`. Only the surfaces are needed here.

- **`bg-tray`**
  > Background for a tile-matching game, portrait. A calm dark slate tray surface with a subtle inset border and soft vignette toward the edges. Empty, uncluttered, nothing competing with foreground tiles.
- **`tile-blank`** (`aspect_ratio: 1:1`)
  > A single blank rounded square game tile, front on, light warm cream face with a soft bevel, one flat highlight at the upper left and a darker shadow along the lower right edge. Empty face, no symbol, no text.

---

## Phase 3 — remaining priority titles

Generate only after the trio is signed off.

### `guardian-shelter` — *warm lit home interior against a cold green-lit exterior*

Full rebuild. Existing art is 2,476 KB of un-optimised PNG and is replaced entirely.

- **`bg-home`**
  > Cutaway side view of a small warm-lit family home interior at night, portrait. Warm amber light spilling from windows. Outside the walls the night is cold and dark with a faint sickly acid green haze pressing in.
- **`family-group`** (`aspect_ratio: 1:1`)
  > A small group of four simple stylised family figures standing together, warm cream and gold tones, lit from the upper left. Rounded chunky shapes, readable as silhouettes.

### `life-soar` — *a bright glider against a deepening canyon*

Existing art is 2,120 KB of un-optimised PNG and is replaced.

- **`bg-canyon`**
  > Layered canyon walls receding into depth, portrait, seen from inside the canyon looking along it. Near walls dark slate, far walls lighter and hazier. A warm amber sky band at the very top. Three clearly separated parallax layers.
- **`glider`** (`aspect_ratio: 1:1`)
  > A simple stylised hang glider seen from behind and slightly above, warm gold canopy with a cream underside, one flat highlight upper left.

### `tightrope-protection` — *a lit wire above an unlit drop*

Review notes: restore the wire (currently flat ground), crows become the green virus.

- **`bg-drop`**
  > Looking along a single taut horizontal wire stretching into the distance, portrait. The wire catches a warm rim light. Below and behind, a dark empty drop fading to near black. Nothing else.

### `spiral-sprint` — *a bright descending shield against darkening depth*

Review notes: risk zones in dark, longer run, payoff animation after a long drop.

- **`bg-helix`**
  > Looking down the inside of a tall cylindrical shaft, portrait, walls receding into darkness below. Faint warm banding marks each level. The bottom of the shaft is unlit.
- **`platform-safe`** / **`platform-risk`** (`aspect_ratio: 1:1`)
  > A curved arc segment of a circular platform, seen from slightly above. Safe variant in warm gold with a lighter top face. Risk variant in acid green `#7CD41F` with a darker green underside.

---

## Post-processing

1. Convert to WebP — q82 backgrounds, q88 sprites. Style guide §10 budget: ≤700 KB art per game.
2. Sprites with a background go through `remove_background` (MCP) before packing.
3. Pack per-game sprites into one ≤2048² atlas, MaxRects, 2 px padding with edge extrude.
4. Preview on the ink background before accepting: `node scripts/preview-assets.mjs out.html <dir>`.

## Compliance

No generated background may contain text, logos, currency symbols, or anything readable as a product claim. The green virus stays abstract and stylised — no medical realism, no depiction of a specific illness. See `RESEARCH_PRODUCTION_QUALITY.md` §8.
