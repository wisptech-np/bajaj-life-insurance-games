# Asset Inventory

**Date:** 2026-07-28

## Headline

These games are **not asset-driven**. A full sweep for `.png/.jpg/.webp/.avif/.svg/.mp3/.wav/.ogg/.gif`
across the whole repository (excluding `node_modules` and `dist`) returns **four files**. Everything
else — every character, shield, virus, tile, arrow, glider and particle — is drawn procedurally on
canvas or emitted as inline SVG.

So there is no sprite pipeline to rebuild and no stretched bitmaps to replace. Visual quality here is
governed by *rendering code*, and the biggest visual defect found was a missing DPR transform
(see `GAME_QUALITY_AUDIT.md` C1), not any image file.

## Binary assets

| File | Size | Used? | Bundled? | Verdict | Target |
|---|---|---|---|---|---|
| `tightrope-protection/public/thumbnail.png` | 853 KB | **No code reference** | **Yes** — `public/` copies to `dist/` regardless | **Confirm then remove** | — |
| `tightrope-protection/public/landing_bg.png` | 532 KB | Yes — `components/IntroScreen.tsx:15` | Yes | **Replace with WebP** | WebP q80, ≤160 KB, 1080×1920 |
| `life-soar/src/bb_bg.webp` | 201 KB | Yes — `src/Screens.jsx:7` | Yes | **Optimise + rename** | WebP q75, ≤120 KB; rename off the `bb_` bubble-shooter prefix |
| `life-soar/src/game_background.webp` | 79 KB | **No** | **No** — unimported files in `src/` are not bundled | **Delete (hygiene only)** | — |

Notes on the two "remove" rows:

- `thumbnail.png` is the only real payload win (853 KB shipped for nothing *in this repo*). It is
  **not** deleted in this pass: a file served at `/thumbnail.png` is exactly what an external game-store
  listing or OG card would point at, and that reference would live outside this repository. Confirm with
  whoever owns the listing, then delete.
- `game_background.webp` costs nothing at runtime. Removing it is tidiness, not optimisation.

## Procedural / code-drawn assets

| Game | Approach | Quality | Action |
|---|---|---|---|
| guardian-shelter | Canvas 2D: gradient-filled umbrellas, crates, barrels; vector family members; spiky virus orbs with glow | Good — layered gradients, shadow, no emoji | Keep |
| secure-journey | Canvas 2D: guardian with shield emblem, virus blobs with HP bars, parallax water/sky | Good | Keep |
| smart-match-3d | Inline SVG life-goal tokens (Shield, Savings, Home, Car, Education, Marriage, Child, Retirement, Health, Rewards, Family) | Good — meets the "better assets, not emoji" feedback | Keep |
| risk-exit | Canvas 2D gradient chevrons, padlock glyphs, virus-marked risk blocks | Good | Keep |
| life-soar | Canvas 2D glider, canyon parallax, coins and shield tokens | Good | Keep |
| coverage-archer | Phaser + generated textures | Not deeply audited | Phaser pass |
| tightrope-protection | Phaser + generated textures | Not deeply audited | Phaser pass |

## Fonts

Plus Jakarta Sans / Poppins via Google Fonts `<link>` in each `index.html`.

**Recommendation:** add `display=swap` (avoids invisible text during load) and preconnect to
`fonts.gstatic.com`. Self-hosting a `woff2` subset would remove a third-party round trip on the
critical path — worthwhile if startup time is measured and found wanting.

## Audio

**Zero audio files.** All sound is synthesised at runtime via Web Audio oscillators
(`shared/game-kit/audio.js`, and the per-game `playSound` helpers it supersedes). This is a
deliberate and good choice for a marketing game: nothing to download, nothing to cache-bust.

The functional gap is not asset quality but the **iOS unlock** (audit H4). If real recorded audio is
ever wanted, `ASSET_GENERATION_PROMPTS.md` carries the specification.

## Brand assets

Bajaj Life brand tokens are already applied consistently and should not be re-invented:

| Token | Hex | Use |
|---|---|---|
| Blue | `#003DA6` | Primary brand, buttons, headers |
| Orange | `#F26522` | Accent, secondary actions |
| Green | `#28A745` | Success |
| Virus green | `#49E24B` | Risk hazards (per BajajLife feedback: "Risk = Green virus") |
| Dark BG | `#0B1221` / `#051a3a` | Backgrounds |

Defined per game in `data.js` `COLORS` and codified in `okf-brain/GAME_STANDARD.md`.
