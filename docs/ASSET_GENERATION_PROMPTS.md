# Asset Generation Prompts

Specifications for assets that cannot practically be produced in code. Because the games are
overwhelmingly code-drawn (see `ASSET_INVENTORY.md`), this list is deliberately short — only two
background assets and one optional audio pack were genuinely needed.

> **Status: A1 and A2 are delivered.** Both were authored directly as SVG
> (`tightrope-protection/public/landing_bg.svg`, `life-soar/src/canyon_bg.svg`) rather than
> generated as raster. For flat-vector art this is the better outcome — resolution-independent
> at every DPR, ~1.4 KB gzip instead of 201–532 KB, and editable in-repo. The prompts below are
> retained so the art direction can be reproduced or handed to a designer, and in case a
> photoreal raster treatment is ever preferred.

**Constraints that apply to every prompt below**

- One art direction across all games: **polished flat 2D vector with soft gradients**, gentle inner
  highlights, soft ambient shadow. No photoreal, no cel-shaded 3D, no mixed styles.
- Bajaj Life palette only: Blue `#003DA6`, Orange `#F26522`, Green `#28A745`, risk/virus green `#49E24B`,
  dark ground `#0B1221`.
- **No emoji, ever** — an explicit standing instruction in `okf-brain/GAME_STANDARD.md`.
- No real people, no logos other than approved Bajaj Life brand marks, no third-party IP.
- No fear-based imagery: hazards read as abstract green "virus" motifs, never as illness, injury,
  hospitals, or distressed families.
- Do not download stock or copyrighted assets.

---

## A1. Tightrope Protection — intro background (replaces `landing_bg.png`)

- **Purpose:** full-bleed intro screen backdrop behind the title and CTA.
- **Dimensions:** 1080 × 1920 (9:16). Must also read well centre-cropped to 1:1.
- **Format:** WebP, quality 80, target ≤160 KB (current PNG is 532 KB).
- **Background:** opaque.
- **Art direction:** wide, calm dusk cityscape in flat vector. Deep blue `#003DA6` sky graduating to
  `#0B1221` at the top, warm orange `#F26522` horizon glow. Simplified building silhouettes in three
  parallax depth bands, each flatter and lower-contrast toward the back. Soft ground plane in the
  lower third with room for UI.
- **Camera:** eye-level, straight on, slight vignette.
- **Composition:** centre 60% must stay low-detail and low-contrast — title and button sit there.
- **Do not include:** any wire, rope, or tightrope. Per BajajLife feedback this game moves to
  **flat ground**; a wire in the art contradicts the gameplay.
- **Export:** `tightrope-protection/public/landing_bg.webp`, plus a 640 × 1138 `@1x` fallback.

## A2. Life Soar — intro background (replaces `bb_bg.webp`)

- **Purpose:** intro/home backdrop. Current file is inherited from the deleted bubble-shooter and is
  still named `bb_`.
- **Dimensions:** 1080 × 1920 (9:16).
- **Format:** WebP, quality 75, target ≤120 KB (currently 201 KB).
- **Background:** opaque.
- **Art direction:** high-altitude canyon vista at golden hour, flat vector. Layered canyon walls in
  three parallax bands, warm orange rim light on the near band, hazy blue distance. Open sky across
  the upper half for the title.
- **Camera:** slightly elevated, looking along the canyon to a distant horizon.
- **Composition:** clear, uncluttered sky in the top 45%; no focal subject in the centre.
- **Do not include:** the glider itself — it is drawn at runtime on canvas.
- **Export:** `life-soar/src/canyon_bg.webp` (and update the import in `src/Screens.jsx:7`).

## A3. Optional — recorded audio pack

Only needed if the synthesised Web Audio voices in `shared/game-kit/audio.js` are ever judged
insufficient. **Current recommendation: keep synthesis.** It adds zero download weight and there is
no quality complaint on record.

If commissioned, deliver as a single sprite sheet:

- **Format:** one `audio.webm` (Opus, ~64 kbps mono) plus `audio.m4a` (AAC) for Safari, with a JSON
  sprite map of `{ name: [startMs, durationMs] }`.
- **Total budget:** ≤120 KB across both files.
- **Loudness:** normalise to −16 LUFS integrated, true peak ≤ −1.5 dBTP. No clipping.
- **Style:** clean modern UI/arcade. Warm, non-aggressive, no harsh transients.

| Cue | Length | Character |
|---|---|---|
| `click` | 50 ms | Soft, neutral UI blip |
| `coin` | 220 ms | Bright three-step ascending chime |
| `hit` | 200 ms | Dull low thud, no distortion |
| `powerUp` | 320 ms | Warm major-triad swell |
| `victory` | 1.2 s | Five-note ascending fanfare, celebratory not triumphalist |
| `failure` | 700 ms | Gentle three-note descent — disappointed, **never** alarming or ominous |
| `combo` | 90 ms | Short pitched blip, designed to be pitch-shifted up per combo depth |
| `tick` | 30 ms | Dry clock tick for the final 10 seconds |

**Compliance note:** `failure` must not sound like an alarm or error klaxon. This is a marketing game
about protection; losing a round must never feel like a warning about the player's real life.

---

## Prompts intentionally *not* written

The following were considered and rejected because generating them would make the product worse:

- **Character sprite sheets** (family members, guardian, virus blobs). These are drawn as vectors with
  live gradients, glow, and squash-and-stretch driven by game state. Baking them to frames would cost
  fidelity, add download weight, and break the runtime scaling.
- **Life-goal icons** for `smart-match-3d`. Already inline SVG, already meeting the BajajLife
  instruction to use proper assets rather than emoji.
- **UI chrome** (buttons, cards, progress bars). CSS gradients and `backdrop-filter` are sharper at
  every DPR than any exported bitmap.
