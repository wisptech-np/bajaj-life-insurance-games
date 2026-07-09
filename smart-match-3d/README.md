# Smart Match 3D

Premium mobile-web triple-tile matching game for Bajaj Life Insurance, in the style of
"Goods Triple Match 3D" — reskinned around **matching your life goals**.

## Concept

A scattered, layered pile of ~60 life-goal tokens (20 triplets) sits on the board:
**Shield, Savings, Home, Car, Education, Marriage, Child, Retirement, Health, Rewards, Family** —
each rendered as a premium layered inline-SVG glass tile (gradient fills, inner highlights,
soft shadows; no emoji anywhere). Tap an uncovered token to send it into the 7-slot tray at the
bottom. Three identical tokens in the tray auto-merge with a particle pop. Tokens buried deeper
in the pile are dimmed and locked until uncovered.

## Financial hook

Every merged triple is a "life goal secured" — the game frames each match with the goal's
protection message (term cover, child's education, retirement corpus...). The results screen
funnels straight into the standard lead-capture + slot-booking flow: *matching goals in a game
takes 2 minutes; securing them for real takes one conversation.*

## Controls

- **Tap** an uncovered (bright) token → it flies into the tray.
- **Undo** booster (x1): return the last tray token to the board.
- **Shuffle** booster (x1): gently re-scatter the remaining pile.
- **Magnet** booster (x1): pulls the tokens needed to complete a triple.

## Win / Lose

- **Win:** clear all 20 triplets before the 2:00 session cap.
- **Lose:** the 7-slot tray fills with no match, or time runs out.

## Scoring

- Match: **+100** per merged triple.
- Combo: **+25** extra per chain step (merges within a 3s window).
- Win bonuses: **+10 x seconds remaining** and **+50 per tray slot never used at peak**.

## Tech

- Vite + React 18, HTML5 canvas game loop (`requestAnimationFrame` + delta time,
  `devicePixelRatio` scaling, touch-first).
- SVG token sprites rasterized to offscreen canvases (bright + dimmed variants).
- Web Audio API synth SFX only (no audio files).
- Shared LMS lead capture / slot booking / play-count services (gold-standard copies).

## Dev

- Port: **5033** (`pnpm dev` → http://localhost:5033)

```bash
pnpm install
pnpm dev      # local dev server on port 5033
pnpm build    # production build (uat mode) — the verification gate
```
