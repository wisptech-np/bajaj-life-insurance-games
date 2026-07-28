# Risk Exit — Game Documentation

## Financial Concept
- **Smart Decisions / Order of Decisions**: In life planning, managing risk before chasing high rewards is critical. In this game, red **Risk Blocks** lock neighboring blocks if cleared early. Players must clear all standard arrow blocks first (representing foundational life goals) and the Risk Blocks **last** to secure the highest score and avoid lockdown penalties.

## Tech Stack & Architecture
- **Framework**: React 18
- **Animations**: Framer Motion (for screen tweens and modal fades)
- **Game Board**: HTML5 Canvas (DPR-aware, high-performance rendering)
- **Audio**: Web Audio API (real-time synthesizer sound effects, lazy-loaded on gesture)

## Core Codebase Structure
- **Game Screen**: [RiskExitGame.jsx](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/src/RiskExitGame.jsx) — Controls game state, collision math, neighbor locking, custom canvas graphics (chevrons, padlock, spiky virus), particles, and screen shake.
- **Home, Tutorial, & Results Screens**: [Screens.jsx](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/src/Screens.jsx) — Contains screens with glassmorphic cards, custom responsive layouts, SVG animations of arrow mechanics, and social sharing links.
- **Game Configuration**: [data.js](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/src/data.js) — Houses brand palette, direction colors, game scoring multipliers, timer, and 5 hand-crafted levels.
- **Audio Synthesizer**: [audio.js](file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-exit/src/audio.js) — Generates UI tap, block slide, exit arpeggios, bump, and risk breach sound effects programmatically.

## Game Mechanics
1. **Slide to Escape**: Tapping an arrow block slides it in the direction it points until it exits the board (earning points) or bumps into another block (losing points, resetting combo).
2. **Neighbor Lockdown**: Tapping a red Risk Block when normal blocks are still present triggers a risk breach penalty (-25 points) and locks down all adjacent blocks for 4 seconds.
3. **Safe Clear Bonus**: Clearing a Risk Block last awards a +100 point safe-exit bonus.
4. **Combo Streak**: Consecutive successful exits increase a score multiplier up to an 8x cap, prompting pitched-up exit synth chords.
