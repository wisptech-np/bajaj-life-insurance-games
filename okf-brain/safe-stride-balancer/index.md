---
type: project
title: Safe Stride Balancer
description: A mobile-friendly HTML5 balancing game themed around risk and protection, built with Vanilla JS, HTML5 Canvas, and Tailwind CSS for Bajaj Allianz Life.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/safe-stride-balancer
tags:
  - game
  - vanilla-js
  - canvas
  - tailwindcss
  - vite
timestamp: 2026-07-08T08:45:00+05:30
---

# Safe Stride Balancer

An interactive mobile-friendly balancing game focusing on managing commute risks, staying upright, and collecting protective safety nets.

## Tech Stack
- **Game Engine**: Custom HTML5 Canvas 2D engine
- **UI Framework**: Vanilla JavaScript + Tailwind CSS (via CDN)
- **Audio**: Web Audio API (realtime synthesizer, no assets required)
- **Build Tool**: Vite 5

## Key Components & Files
- [index.html](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/safe-stride-balancer/index.html): Main layout and UI screens (Start screen, HUD, Lead Form, Booking Slot, T&C Modal, Thank you).
- [src/main.js](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/safe-stride-balancer/src/main.js): Inverted pendulum physics loop, touch/keyboard input controllers, procedural parallax drawing, and sound synthesis.
- [src/api.js](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/safe-stride-balancer/src/api.js): Bajaj Allianz LMS lead submission API (`whatsappInhouse`) and booking slot updates (`updateLeadNew`).
- [src/utils/crypto.js](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/safe-stride-balancer/src/utils/crypto.js): Decryption/encryption utility for AES-256 ECB tokens.
- [package.json](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/safe-stride-balancer/package.json): Package details and command scripts.
- [vite.config.js](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/safe-stride-balancer/vite.config.js): Vite build configuration with defined backend LMS URLs.
