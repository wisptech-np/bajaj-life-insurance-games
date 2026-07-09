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
