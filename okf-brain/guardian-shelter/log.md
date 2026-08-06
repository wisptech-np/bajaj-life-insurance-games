---
type: log
title: Guardian Shelter Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/guardian-shelter/log.md
timestamp: 2026-07-09T22:30:13+05:30
---

# Guardian Shelter Change Log

## [2026-08-03] Replace virus storm with acid rain storm, character hitboxes, layering, and predefined obstacles

- **Acid Rain Conversion:** Replaced the "virus storm" with "acid rain". Renamed logic states (`viruses` to `acidDrops`), colors (`COLORS.virus` to `COLORS.acid`), warnings, and defeat text overlays. Changed character status from `'infected'` to `'hit'`.
- **Tutorial Visuals:** Replaced virus SVG models with custom SVG teardrop-shaped acid droplets on the home and How to Play screens. Renamed keyframe animations from `gsVirus` to `gsRaindrop`.
- **Character Stacking Hitbox:** Updated `restYFor()` to treat family members as solid surfaces, enabling shields to snap and rest directly on top of characters' heads when placed there.
- **Visual Layering Sorting:** Adjusted `drawGame()` layering order so family members are rendered *before* placed shields. This draws umbrellas and other shields in front of character sprites instead of behind them.
- **Canopy Scaling & Scallops:** Refactored scallop rendering coordinates to calculate dynamically based on `domeR`, allowing the umbrella to scale correctly. Increased default umbrella size to `w: 90` and `domeR: 45` for better coverage.
- **Outward/Upward Deflection:** Added a horizontal push and minimum upward velocity (`v.vy = Math.min(v.vy, -150)`) on dome deflection to clean the characters underneath. Stem collision box width was restricted to `12px` to prevent invisible wide box overlaps.
- **Obstacles on Stage:** Added predefined platforms in Level 2, 3, 4, 5, and 6 to serve as fixed deflectors/complexities.

## [2026-07-31] Revamp — placement feel, family legibility, auto-storm

- **Lead form:** removed the email field, `EMAIL_RE`, its validation branch and all
  `lastSubmittedEmail` session storage from `src/LeadCaptureModal.jsx`. `api.js` untouched —
  `submitToLMS` already defaults `email_id` to `''`.
- **How to Play:** deleted the three numbered instruction paragraphs. The screen is now a
  single 4.2 s CSS-keyframe loop showing the real mechanic (finger drags a shield out of the
  tray → dashed ghost footprint appears → shield lands and squashes → spore falls, hits the
  dome, ricochets away), plus three icon-led one-word labels: DRAG / COVER / DEFLECT.
- **Item drop fixed.** Shields used to be pushed in at the release point with `settled:false`
  and then fall under gravity, so they never landed where the finger let go, and the ghost
  previewed the carried position rather than the landing position. Added `restYFor()` — a
  single function returning the resting centre for a footprint at a given x (ground, platform
  top, or top of an already-placed shield). The ghost, the plumb line and the placed shield are
  all positioned from that one value, so preview and final position cannot disagree. Release
  now animates from the actual release Y with an ease-out cubic over 0.22 s, then a
  base-anchored squash/rebound over 0.16 s. The whole gravity/AABB settling path and
  `AABBIntersect` were deleted.
- **Platform surface unified:** `platformTop(p) = p.y - p.h/2` is now used by both family
  placement and shield resting, so they stand on the drawn top edge instead of sinking to the
  rectangle's centre line.
- **Family legibility:** background gets a `rgba(3,12,32,0.5)` scrim; each member gets a radial
  dark pool behind the torso, a ground contact shadow and a pulsing gold floor ring; sprite draw
  box raised from `3.4r` to `6.2r` and anchored by the measured feet position instead of the hit
  circle centre (they were previously buried in the ground); idle breathing bob when calm,
  nervous shake during the storm. Family now renders after the ground so their base decoration
  is not sliced in half.
- **Sprite pipeline:** the four `family_*.png` files are actually JPEGs, so the backdrop is keyed
  out at load. Replaced the naive "delete every pixel near the backdrop colour" pass (which
  punched 3.6k–9.2k px of holes through dark hair, pupils and navy clothing) with a border-seeded
  flood fill, and baked a dark halo + gold `#FFC845` rim light into the cached canvas once at load
  rather than paying `ctx.filter` per frame.
- **Undo removed** — button, handler and all history state.
- **Start Storm removed** — the storm auto-starts. New `incoming` game state gives a ~1.2 s
  beat (green sweep + "STORM INCOMING" chip with a draining fuse bar) after the last shield
  lands, then `beginStorm()` fires. The countdown is ticked by the game loop, not a timer, so it
  pauses with everything else on tab blur. `beginStorm` reads only refs, so it is safe to call
  from the loop's first-render closure. Retry and `gameKey` remount both route through
  `initLevel()`, which resets `incomingT` and returns to `placement`.
- **Scoring:** the unused-shield bonus is unreachable now that the storm only starts on an empty
  tray, so `scorePerUnusedShield` and its always-zero results row were removed. Max round score is
  unchanged in practice (members saved x 100 + end-of-game time bonus).
- **Full-width playfield:** dropped the 14 px side padding and the 400 px canvas cap, plus the
  canvas border/radius and the whole bottom button row. Width is
  `min(100%, calc((100vh - 120px) * 400 / 580))` so the field only narrows when the viewport is
  too short to fit it below the HUD. Tray hit radius raised 24 → 28 logical px to clear 44 css px
  at 360 wide.
- **Assets:** wrote `guardian-shelter/asset-from-here.md` — 13 Nano Banana prompts on a locked
  palette (gold `#FFC845` signature accent, spore-green `#49E24B` hazards, dome-over-box shape
  language), including the two technical constraints the runtime keying imposes on the character art.
- **Build:** `pnpm install && pnpm build` → `✓ built in 2.68s`, exit 0.
- **Not changed:** `ResultsScreen` (repo reference implementation), `src/kit/`, `api.js`,
  `services/`, `utils/`.

## [2026-07-09] Initial Implementation
- Successfully implemented core game mechanics and UI screens.
- Verified successful Vite build compilation.
