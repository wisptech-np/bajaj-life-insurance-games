---
type: project
title: Secure Journey
description: A 3-lane auto-runner crowd shooter themed around risk and protection, built with React, HTML5 Canvas, and Framer Motion for Bajaj Allianz Life.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/secure-journey
tags:
  - game
  - react
  - canvas
  - framer-motion
  - vite
timestamp: 2026-07-09T22:30:00+05:30
---

# Secure Journey

An interactive 3-lane auto-runner crowd shooter focusing on dodging financial risks (virus blobs), collecting protective health shields, and reaching the Wealth Vault.

## Tech Stack
- **Game UI/State**: React 18 + Framer Motion
- **Game Engine**: Custom HTML5 Canvas 2D engine
- **Audio**: Web Audio API (realtime synthesizer, no assets required)
- **Build Tool**: Vite 5

## Key Components & Files
- [src/App.jsx](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/secure-journey/src/App.jsx): Screens coordinator (Home -> How to Play -> Game -> Results/Lead -> Slot Booking -> Thank You).
- [src/SecureJourney.jsx](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/secure-journey/src/SecureJourney.jsx): Main auto-runner canvas drawing loop, collision handlers, dynamic spread bolt firing, and sound synthesizer.
- [src/Screens.jsx](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/secure-journey/src/Screens.jsx): Home, How to Play, and Results screen layouts with vector SVGs and sharing controls.
- [src/data.js](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/secure-journey/src/data.js): Gameplay parameters, speeds, damages, points, and durations.
- [src/index.css](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/secure-journey/src/index.css): Responsive layout rules and visual styling for game overlay, HUD, and cards.
