---
type: project
title: Portfolio Fit
description: A 1010!-style drag-and-place block puzzle for Bajaj Life Insurance where players fit equity, debt, gold and insurance blocks into a 9x9 portfolio grid — clearing lines rebalances the portfolio and mixing all 4 asset classes earns a Diversification Bonus.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/portfolio-fit
tags:
  - game
  - react
  - canvas
  - vite
  - block-puzzle
  - asset-allocation
timestamp: 2026-07-09T00:00:00+05:30
---

# Portfolio Fit

A premium mobile-web block puzzle (1010!-style, no gravity, no rotation) themed around
asset allocation. Drag asset-class blocks onto a 9×9 portfolio grid; complete rows/columns
to "rebalance" and clear them. Lines containing all 4 asset classes score a
Diversification Bonus ×2. 2-minute hard-capped session; lose if no offered piece fits.

## Tech Stack
- **Framework**: React 18 + Vite 5 (JavaScript)
- **Rendering**: HTML5 canvas, requestAnimationFrame + delta time, devicePixelRatio scaling
- **Audio**: Web Audio API synth SFX (no files)
- **Dev port**: 5044

## Key Components & Files
- [src/App.jsx](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/portfolio-fit/src/App.jsx): Screen flow (home → howtoplay → game → results → thankyou) with lead/slot modals.
- [src/PortfolioFitGame.jsx](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/portfolio-fit/src/PortfolioFitGame.jsx): Canvas game — board, tray, drag/ghost/snap-back, line clears with sweep + particles, streak flames, screen shake, floating score text, synth SFX, difficulty ramp.
- [src/Screens.jsx](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/portfolio-fit/src/Screens.jsx): Home (animated board preview), HowToPlay, Results (score ring, stats, share, Book a Slot).
- [src/data.js](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/portfolio-fit/src/data.js): GAME_CONFIG tunables, asset palette, 19 piece shapes with tier weights.
- [src/api.js](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/portfolio-fit/src/api.js): LMS lead submit / slot update (LEAD_NO_KEY `portfolioFitLeadNo`).
- `src/LeadCaptureModal.jsx`, `src/SlotBookingModal.jsx`, `src/ThankYouScreen.jsx`: shared lead-capture flow copied from the gold standard.
- `src/services/playCount.js`, `src/utils/crypto.js`, `src/utils/shortener.js`: shared verbatim.
