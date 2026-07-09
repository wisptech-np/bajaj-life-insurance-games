---
type: project
title: Tax Save Maze
description: A maze game themed around tax savings and exemptions, built with React for Bajaj Allianz Life Insurance.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/tax-save-maze
tags:
  - game
  - react
  - typescript
  - vite
  - canvas
timestamp: 2026-07-08T08:45:00+05:30
---

# Tax Save Maze

An interactive 2D HTML5 canvas maze game themed around financial literacy and tax planning. The player navigates a maze to reach the "Tax-Free Exemption Zone" while avoiding tax collectors and collecting tax-saving investment keys.

## Tech Stack
- **Framework**: React 19 + TypeScript
- **Styling**: TailwindCSS via CDN
- **Rendering**: HTML5 Canvas API (smooth grid-snapped interpolation, custom particle systems, floating indicator tags)
- **Sound**: Web Audio API Synthesizer (collect, hit, win, stun, click sounds)
- **Build Tool**: Vite 6

## Key Components & Files
- [vite.config.ts](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/tax-save-maze/vite.config.ts): Vite build settings with alias and directory configs.
- [package.json](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/tax-save-maze/package.json): Core project scripts and packages.
- [index.html](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/tax-save-maze/index.html): Responsive viewport configurations and script loader.
- [index.tsx](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/tax-save-maze/index.tsx): Parameter capturing and token decryption logic.
- [App.tsx](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/tax-save-maze/App.tsx): Game loop, canvas render calls, input control buffers, sound effects, state transitions, and form validation.
- [utils/crypto.ts](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/tax-save-maze/utils/crypto.ts): Secure token decryption mirroring the Angular gamification shell.
- [services/api.ts](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/tax-save-maze/services/api.ts): Direct integration with the WhatsApp Inhouse Lead API.
- [services/playCount.ts](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/tax-save-maze/services/playCount.ts): Play tracking incrementation.
