# Portfolio Fit

A premium mobile-web block puzzle for **Bajaj Life Insurance** — 1010!-style drag-and-place
gameplay themed around **asset allocation**: fit every asset class into a balanced portfolio.

## Concept

A 9×9 "portfolio" grid. Three asset blocks are offered at a time in a tray — tetromino-like
shapes, each belonging to an asset class:

| Asset | Color | Role |
|---|---|---|
| Equity | Orange `#F26522` | Growth engine |
| Debt | Blue `#2F7BFF` | Steady income |
| Gold | Gold `#F2B705` | Inflation hedge |
| Insurance | Green `#28A745` (animated shield sheen) | Protection first |

Drag pieces onto the board (no gravity, no rotation). Completing a full row or column clears
it with a sweep animation and particle burst — **"Portfolio Rebalanced!"**

## Financial hook

Just like a real portfolio, no single asset fits everywhere. The player learns that a
resilient portfolio mixes all asset classes — lines that hold **all 4 asset classes** earn a
**Diversification Bonus ×2**, and insurance is presented as the protective layer every
balanced portfolio needs. The results screen leads into a Bajaj Life advisor conversation
(lead capture + slot booking).

## Controls

- **Drag** an asset block from the bottom tray onto the grid (touch-first; mouse works too).
- A **ghost preview** snaps to the grid while dragging; lines that would clear glow.
- Release on a valid spot to place; invalid drops shake and snap back to the tray.

## Scoring

- **+1 per cell** placed.
- **+100 per cleared row/column** ("rebalance").
- **×2** on any cleared line containing all 4 asset classes (Diversification Bonus).
- **+50 × (streak − 1)** for consecutive clearing drops (streak flames at ×2 and up).

## Win / lose

- **Win:** survive the 2-minute session (hard cap) — score is your result.
- **Lose:** none of the 3 offered pieces fits anywhere ("Portfolio Overloaded").
- Difficulty ramps within the session: bigger pieces dominate the tray as time passes.

## Tech

- Vite 5 + React 18, HTML5 canvas rendering (rAF + delta time, devicePixelRatio-aware).
- Web Audio API synth SFX only — no audio files. No emoji sprites; all art is programmatic
  canvas vector work / gradients / inline SVG.
- Shared Bajaj Life lead-capture flow (`LeadCaptureModal`, `SlotBookingModal`,
  `ThankYouScreen`, `api.js`, `services/playCount.js`).

## Dev

- **Port:** `5044` (see `vite.config.js`).

```bash
pnpm install
pnpm dev      # http://localhost:5044
pnpm build    # production build (uat mode) into dist/
```
