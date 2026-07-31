---
type: log
title: Portfolio Fit Change Log
description: Chronological history of changes for Portfolio Fit.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/portfolio-fit/log.md
timestamp: 2026-07-09T00:00:00+05:30
---

# Portfolio Fit Change Log

## [2026-07-09] Initial build (v1)
- **New game**: 1010!-style drag-and-place block puzzle themed as asset allocation
  (Equity=orange, Debt=blue, Gold=gold, Insurance=green with animated shield sheen).
- **Gameplay**: 9×9 board, 3 offered pieces per tray, no gravity/rotation, ghost preview
  with would-clear line highlight, invalid-drop shake + snap-back, sweep-band line clears
  with per-cell flash-out and ≥8 particles per cell, "Portfolio Rebalanced!" /
  "Diversification Bonus ×2!" banners, streak flames on consecutive clearing drops,
  floating score text, screen shake, per-asset vector glyphs (colorblind-friendly, no emoji).
- **Session shape**: 2-minute hard cap (timer end = score win), lose when no offered piece
  fits ("Portfolio Overloaded"), difficulty ramp via tier weights across three phases,
  instant restart via gameKey remount.
- **Scoring**: +1/cell placed, +100/line, ×2 diversification (all 4 asset classes in a line),
  +50 × (streak − 1) streak bonus.
- **Audio**: lazy Web Audio synth SFX — place thock, ascending clear sines (400/600/800 Hz),
  triangle diversify chord (523/659/784 Hz), sawtooth invalid, 5-note win fanfare, lose sweep.
- **Standard compliance**: screen flow, LeadCaptureModal / SlotBookingModal / ThankYouScreen,
  api.js (LEAD_NO_KEY `portfolioFitLeadNo`, summary 'Portfolio Fit Lead'), playCount on
  startGame, crypto/shortener utils copied from the gold-standard bubble shooter; port 5044.
- **Build verification**: `pnpm install` and `pnpm build` both pass (see summary below).

## [2026-07-09] QA audit (independent)
- **Build gate**: `pnpm build` (vite build --mode uat) exits 0 — 517 modules, dist emitted
  (index.html 0.86 kB, css 18.64 kB, js 390.61 kB). node_modules already installed via pnpm.
- **index.html**: viewport meta tightened to the literal §6 form
  (`initial-scale=1.0, maximum-scale=1.0, user-scalable=no`; was `1`/`1`, semantically
  identical to the gold standard) — only fix applied; rebuilt green afterwards.
  Poppins Google Font loaded, sensible title, theme-color set.
- **Mobile checklist**: App container `max-width: 430px; margin: 0 auto` portrait;
  canvas sized to wrapper × devicePixelRatio (capped 3) with ResizeObserver re-layout;
  `touch-action: none` on canvas + `touchstart` preventDefault (`passive: false`) +
  pointer capture during drag; `touch-action: manipulation` / `overscroll-behavior: none`
  on body; rAF + delta-time loop.
- **Screen flow**: home → howtoplay → game → results verified in App.jsx; LeadCaptureModal
  auto-opens on first results when `sessionStorage['portfolioFitLeadNo']` is empty;
  Book a Slot → LeadCaptureModal (if no lead) → SlotBookingModal → ThankYouScreen.
  Validations confirmed: name `^[A-Za-z\s]+$`, mobile `^[6-9]\d{9}$`, optional email
  format-checked, required T&C in both modals.
- **API / playCount**: api.js posts to `__LMS_BASE_URL__/whatsappInhouse` and
  `__LMS_UPDATE_BASE_URL__/updateLeadNew`; both defines present in vite.config.js
  (port 5044, unique across games). `incrementPlayCount()` called once in `startGame()`.
  Shared files diffed against life-goals-bubble-shooter: playCount.js / crypto.js /
  shortener.js byte-identical; api.js / modals / ThankYouScreen differ only in
  game-name text and LEAD_NO_KEY, as the standard requires.
- **Emoji scan**: no emoji codepoints in canvas-drawn sprites; only hits are arrows in
  code comments and the standard-permitted checkbox tick (U+2713) in the shared lead-form
  HTML (GAME_STANDARD §8 allows UI copy in HTML text). All game art is programmatic
  canvas vector work (gradients, glyphs, shield sheen) or inline SVG (streak flame in HUD).
- **Gameplay sanity (code review)**: hard cap exactly 120 s (`GAME_CONFIG.duration`),
  timer end → `endGame(true)` → onWin; no-fit → `endGame(false)` → onLose; both route to
  ResultsScreen with stats. Score/time/streak always visible in HUD. Difficulty ramps via
  three-phase tier weights (small → large pieces). Web Audio synth SFX wired to pick/place/
  invalid/clear/diversify/streak/win/lose/tap. Particles (9 per cleared cell), floating
  score text, 0.3 s screen shake, placement pop, sweep-band clears, snap-back wobble all
  present. Not a stub (~1,040-line game component). Scoring matches brief:
  +1/cell, +100/line, ×2 diversification, +50×(streak−1).
- **Verdict**: PASS. Note: runtime browser play-test not performed (dev servers not
  allowed in QA task); verification is static review + green production build.

## [2026-07-28] Restored from 1cf30a9 after sign-off
- **Context**: `portfolio-fit/` was removed from the repo (commit `3c75a0f`, "Reduce repo to
  BajajLife-approved games only") for lacking sign-off. It is now approved; restored verbatim
  from commit `1cf30a9` via `git checkout 1cf30a9 -- portfolio-fit okf-brain/portfolio-fit`
  (only git command run — no other add/commit/stash/restore performed).
- **Kit added**: `portfolio-fit/src/kit/` created and populated with unedited copies of
  `shared/game-kit/*.js` (`audio.js`, `config.js`, `device.js`, `effects.js`, `index.js`,
  `input.js`, `loop.js`). Files are not imported by the restored game code — added per
  standing instruction to make the shared kit available; no game logic wired to it (see
  session-clock note below).
- **Audit vs `okf-brain/GAME_STANDARD.md`**:
  - `vite.config.js`: already correct as restored — `server.port` 5044, rollup
    `output.name: 'PortfolioFit'`. No fix needed.
  - CRM identity: `LEAD_NO_KEY = 'portfolioFitLeadNo'` and `summaryDtls = 'Portfolio Fit Lead'`
    already correct in `src/api.js`. No fix needed.
  - Foreign-game attribution: `grep -rn "Guardian Shelter" src/` was clean (0 matches).
    `grep -rni "bubble shooter" src/` initially matched 4 header-comment lines referencing
    "the gold-standard bubble shooter" (`LeadCaptureModal.jsx:2`, `SlotBookingModal.jsx:2`,
    `ThankYouScreen.jsx:2`, `Screens.jsx:2`) — comment-only, no user-facing or CRM-payload
    text. Fixed with string-only edits to a generic "the gold-standard scaffold" phrasing
    (no logic changes). Both greps now return 0 matches.
  - Session clock: the game already runs its 120 s session entirely inside a
    `requestAnimationFrame` loop with its own accumulated delta-time timer
    (`S.elapsed += dt` in `PortfolioFitGame.jsx`'s `update()`) — no `setInterval` drives
    gameplay. The one `setInterval` in the codebase (`Screens.jsx` ResultsScreen) is a
    cosmetic 1200 ms score-count-up animation on the results screen, unrelated to session
    timing. Per the "smallest possible change wins" rule, left both untouched — no port to
    `kit/loop.js`'s `createGameLoop` was needed or performed.
  - Emoji-sprite scan: automated Unicode-range scan (U+1F300–1FAFF, U+2600–27BF) over all
    `src/**/*.{js,jsx,css,html}` (excluding the newly added `kit/`) found exactly one hit —
    a `✓` (U+2713) checkbox tick in `LeadCaptureModal.jsx`'s HTML consent checkbox, which is
    UI copy in markup, not a canvas game sprite (GAME_STANDARD §8 permits this). All game
    art in `PortfolioFitGame.jsx` is programmatic canvas drawing (gradients, vector glyphs,
    shield sheen) or inline SVG. No changes needed.
- **Build verification**: `pnpm install` — Done in 30.3s, `+68` packages, lockfile
  unchanged (up to date). `pnpm build` (`vite build --mode uat`) — exit 0, 517 modules
  transformed, `dist/` emitted (`index.html` 0.88 kB, css 18.64 kB, js 390.61 kB gzip
  130.72 kB). No compile breaks encountered; no source edits beyond the four attribution
  comment strings above.
- **Scope**: only `portfolio-fit/` and `okf-brain/portfolio-fit/` touched.

## [2026-07-31] Revamp — block redesign, new icon set, animation-only how-to-play
- **Blocks are now one object, not stuck-together cells** (`PortfolioFitGame.jsx`). Added
  `outlineOf()` — traces a polyomino's directed boundary edges into closed loops (multi-loop,
  so a component with a hole punched by a line clear still renders correctly), and
  `piecePath()` — rectilinear uniform inset (vertex moves along the sum of its two edge
  normals) plus per-corner radius clamping, producing one continuous rounded silhouette.
  `drawBlock` (per-cell) was deleted and replaced by `drawPiece` (per-piece): single
  top-to-bottom gradient over the whole bbox, top face light, bottom depth shade, inner rim
  light drawn as a thick stroke clipped to the silhouette so the bevel follows every convex
  and concave corner, and a dark outer definition line. No internal seams anywhere.
- **Board pieces merge**: `rebuildComponents()` flood-fills orthogonally-connected same-asset
  cells into components (cached, invalidated by a `compsDirty` flag) so a holding on the board
  reads as one solid slab. Per-cell placement pop was replaced by a silhouette-traced
  placement flash (`S.pop`), and the ghost preview is now one dashed outline, not N dashed cells.
- **New icon set** — `src/icons.jsx` (new file): one language, 24×24 box, 2 px stroke, round
  caps/joins, legible at 20 px. Asset faces (equity trend line, debt coupon note, gold bullion
  stack, insurance shield+tick), HUD (coin stack, clock, flame), results (rebalance cycle,
  diversify disc), how-to-play (finger, grid line), chrome (play, calendar, share, phone,
  rotate, shield). The canvas glyph drawers in `PortfolioFitGame.jsx` repeat the same geometry
  so a block face and its legend icon are the same drawing. No emoji (G4).
- **UI alignment** (`index.css` `pf-` section fully rewritten): one spacing scale
  `--pf-1…--pf-6` + `--pf-edge` + `--pf-tap` + `--pf-col`. HUD is a 3-column grid of 52 px
  chips with icon and value on a shared baseline; legend is a 4-column grid of icon chips;
  results buttons are all 52 px with one border radius; `.pf-results` uses a single gap
  rhythm instead of per-element `marginBottom`. Canvas `layout()` now derives board and tray
  from the same `PAD`/`FRAME` constants — equal left/right margins, tray wells aligned to the
  board frame, generous full-third touch targets for slot pickup.
- **G2 — how-to-play is animation-only**: deleted all four numbered instruction paragraphs.
  `HowToPlayScreen` now shows a 4 s looping CSS demo (finger glyph drags a 2-cell insurance
  slab from the tray into the last gap of row 3, the row flashes, a sweep fires, the line
  clears, loop) plus exactly three icon-led labels — "Drag", "Fill a line", "Mix for ×2" —
  and the Play button. Fits 360×640 without scrolling.
- **G1 — email removed** from `src/LeadCaptureModal.jsx`: `EMAIL_RE`, the `email` state, the
  field block, the validation branch, the `lastSubmittedEmail` session read/write and `email`
  from both the `submitToLMS` call and the `onSubmitted` payload. `api.js` untouched
  (`email_id: email || ''` already tolerates the missing key). Grep for `email` in `src/`
  outside `kit/` now hits only `api.js`.
- **G3 — asset sheet**: `portfolio-fit/asset-from-here.md`, 13 prompts covering background,
  pegboard, four asset slabs, tray dock, HUD icon set, legend chips, line-clear FX, win art,
  lose art and home hero. Motif unique to this game: chamfered extruded slab tiles with
  engraved line-icon faces on a frosted dark-glass pegboard.
- **Bugs found and fixed while building**: (1) the boundary walk's loop bound was
  `guard <= remaining + 2` while `remaining` was decremented inside the loop, truncating any
  outline with more than ~6 edges — hoisted to a fixed `cap`; (2) `drawGlyph` issues
  `beginPath`, which destroyed the current path before the outer definition stroke — the
  silhouette is now rebuilt before that stroke.
- **Verification**: outline tracing checked with a shoelace-area harness over all 19 shipped
  `SHAPES` plus single/bar/L/square/ring-with-hole/S-shape/offset cases — 28/28 pass, holes
  yield 2 loops with correct net area. `drawPiece` smoke-tested against a stub 2D context
  across 304 shape × asset × cell-size variants plus a holed component and bad input — no
  throws. `pnpm install` then `pnpm build` (`vite build --mode uat`) exit 0, 518 modules,
  `dist/index.html` 0.88 kB, css 24.69 kB (gzip 5.42 kB), js 392.22 kB (gzip 132.15 kB).
- **Scope**: only `portfolio-fit/src/{PortfolioFitGame,Screens,LeadCaptureModal,icons}.jsx`,
  `portfolio-fit/src/index.css`, `portfolio-fit/asset-from-here.md` and this log. `src/kit/`,
  `src/api.js`, `src/services/`, `src/utils/`, `src/data.js` and every other game folder
  untouched.
