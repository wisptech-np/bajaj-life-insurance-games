---
type: project
title: Guardian Archer
description: Single-player precision archery game — drag to aim Protection Arrows at green risk viruses (no return fire); 12 arrows, 2-minute session, 3 waves, wind + gravity physics, CRITICAL x2 core hits. Built with Phaser 3 + React for Bajaj Life Insurance.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/coverage-archer
tags:
  - game
  - react
  - phaser
  - typescript
  - vite
  - archery
  - single-player
timestamp: 2026-07-09T12:00:00+05:30
---

# Guardian Archer

Single-player target-shooting archery game (directory: `coverage-archer/`). Per stakeholder
feedback the two-archer duel concept was removed: the opponent is replaced by green virus
targets that **never fire back** — only the player shoots.

## Concept
- **Financial hook**: precision coverage against risks — each virus is a named risk
  (illness / accident / debt / income / medical); a direct core hit = CRITICAL x2
  ("right-sized cover beats scattershot protection").
- **Session**: 12 arrows, 120-second hard cap, 3 waves (3 large / 3 medium / 4 small
  viruses at increasing range with bob/drift motion and stronger wind).
- **Win**: clear all waves (+ time bonus). **Lose**: out of arrows or out of time.
- Drag-to-aim (angle + power), gravity + wind physics, dotted trajectory hint for the
  first 3 shots only, wind indicator in HUD.

## Tech Stack
- **Framework**: React 19 + TypeScript
- **Game Engine**: Phaser 3 (arcade physics), all textures drawn procedurally (no emoji/images)
- **Build Tool**: Vite 6 (`pnpm build`, port 3036)
- **Audio**: Web Audio synth SFX only

## Key Components & Files
- [App.tsx](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/coverage-archer/App.tsx): screen flow home > howtoplay > game > results (+lead modal) > slot booking > thankyou.
- [data.ts](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/coverage-archer/data.ts): GAME_CONFIG — every gameplay tunable (arrows, timer, waves, scoring, wind).
- [game/scenes/MainScene.ts](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/coverage-archer/game/scenes/MainScene.ts): core loop — aiming, waves, hits/criticals, wind, session timer.
- [game/scenes/PreloadScene.ts](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/coverage-archer/game/scenes/PreloadScene.ts): procedural canvas textures (archer, arrow, green viruses with glowing cores).
- [services/api.ts](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/coverage-archer/services/api.ts): LMS lead capture + slot booking (LEAD_NO_KEY `coverageArcherLeadNo`).
- `components/`: GameScreen (HUD), IntroScreen, HowToPlayPopup, ResultsScreen, LeadCaptureModal, SlotBookingModal, ThankYouScreen.
- `services/playCount.ts`, `utils/crypto.ts`, `utils/shortener.ts`, `utils/audio.ts`.
