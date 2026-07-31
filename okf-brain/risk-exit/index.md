# Risk Exit — Game Documentation

## Financial Concept
- **Clear the path before you need it**: The 6x6 tray is packed with named
  obligations — **debt, illness, market shock, job loss** — already wedged
  across the family's path. Nothing can be deleted and only one piece is
  allowed to leave the board: the gold **Family Cover** block. The player must
  shove the risks aside **in the right order**, because moving the wrong one
  first boxes in the block they actually needed. Pushing a risk clear of the
  cover's escape lane scores immediately, which is the pitch: protection is what
  you arrange before the lane closes.

## Tech Stack & Architecture
- **Framework**: React 18
- **Animations**: Framer Motion (screen tweens, board banners, modal fades)
- **Game Board**: HTML5 Canvas (DPR-aware, pointer-drag input, 60 fps rAF loop)
- **Audio**: Web Audio API (real-time synthesizer SFX, lazy-unlocked on gesture)
- **Rules**: pure ES module shared by the game and the headless gate

## Core Codebase Structure
- **Rules module**: [rules.js](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/src/rules.js) — no React, no DOM. Owns `slideRange` (the single definition of a legal move), `occupancy`, `applyMove`, `isSolved`, `blocksHeroRow`, `validateLevel` and a breadth-first `solve`. Imported by both the game and the gate, so the solver enumerates exactly the moves the finger can make.
- **Solvability gate**: [gate.mjs](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/gate.mjs) — `node gate.mjs`. Proves every shipped level is solvable, that each authored `par` equals the BFS minimum, that each solution replays legally, that the difficulty ladder never goes backwards, and that the checker itself can fail (a walled-in board must come back unsolvable).
- **Game Screen**: [RiskExitGame.jsx](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/src/RiskExitGame.jsx) — pointer-drag handling clamped to `slideRange`, grid snapping, extruded-slab canvas rendering (body gradient, gloss band, rim light, recessed icon plate, drawn risk glyphs), squash-and-stretch, screen shake, particles, floating text, the animated exit gate.
- **Home, Tutorial & Results Screens**: [Screens.jsx](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/src/Screens.jsx) — glassmorphic cards, an inline-SVG block set shared by the home hero and the how-to-play loop, the guardian-shelter results screen (count-up score, progress ring, confetti, share, call/book actions).
- **Game Configuration**: [data.js](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/src/data.js) — brand palette, hero and risk block skins, scoring, session cap, and the 6 hand-authored levels with solver-verified pars.
- **Audio Synthesizer**: [audio.js](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/src/audio.js) — UI tap, slide whoosh, exit arpeggio, bump, wedged-block buzz, risk-cleared chord, board-clear rise, win and lose stings.

## Game Mechanics
1. **Drag on one axis**: Every block is locked to its own axis — horizontal blocks slide only left/right, vertical blocks only up/down. The block tracks the finger cell-for-cell inside its legal range and snaps to the grid on release. One drag of any distance is one move.
2. **Escape the gate**: The exit gate is the right wall of row 2. The board is solved the instant the gold cover block sits flush against it, and it then slides out through the gate.
3. **Risk cleared**: Pushing a risk block out of the cover's row scores `+40` once per block per board, with a particle burst and a chord.
4. **Illegal shove**: Driving a block into a wall or a neighbour it cannot pass bounces it — screen shake, squash-and-stretch, `-5`. A block wedged solid on both sides reports **BOXED IN**.
5. **Par**: Each board carries the BFS minimum drag count. Clearing at par pays the full `150` par bonus, decaying as `150 x par / movesUsed` beyond it. Ladder: 4 → 5 → 6 → 8 → 10 → 11 across 6 boards in a 120-second session.
