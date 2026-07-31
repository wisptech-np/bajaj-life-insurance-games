---
type: project
title: Guardian Archer
description: Single-player precision archery game — drag to aim Protection Arrows at four financial risk antagonists (Illness, Accident, Debt, Job Loss; no return fire); 12 arrows, 2-minute session, 3 waves each with its own movement pattern, wind + gravity physics, CRITICAL x2 core hits. Built with Phaser 3 + React for Bajaj Life Insurance.
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
feedback the two-archer duel concept was removed: the opponent is replaced by risk targets
that **never fire back** — only the player shoots.

## Concept
- **Financial hook**: precision coverage against risks — four antagonists, each with its own
  silhouette, palette, idle motion and death animation (Illness hexagonal cell, Accident
  hazard triangle, Debt shackled ingot, Job Loss split briefcase); a direct core hit =
  CRITICAL x2 ("right-sized cover beats scattershot protection").
- **Session**: 12 arrows, 120-second hard cap, 3 waves (3 large / 3 medium / 4 small at
  increasing range), each wave with its own movement pattern — pendulum, orbit, then
  dart-and-hold — plus stronger wind and a 25% speed-up past 60 s remaining.
- **Win**: clear all waves (+ time bonus). **Lose**: out of arrows or out of time.
- Drag-to-aim with continuous feedback (pull vector, power ring with release-threshold tick,
  thumb-proof power bar, live % readout), gravity + visible wind physics, dotted trajectory
  hint for the first 3 shots only, wind indicator in HUD that pulses after a wind-blown miss.

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
