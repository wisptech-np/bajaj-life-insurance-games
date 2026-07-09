---
type: project
title: Smart Match 3D
description: Triple-tile matching (Goods Triple Match 3D style) mobile web game — tap life-goal tokens (Shield, Savings, Home, Car, Education, Marriage, Child, Retirement, Health, Rewards, Family) from a layered pile into a 7-slot tray; match 3 to secure each goal within 2 minutes. Premium layered inline-SVG sprites, canvas engine, LMS lead capture + slot booking.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/smart-match-3d/
tags:
  - game
  - triple-match
  - match-3d
  - life-goals
  - canvas
  - react
  - vite
  - lead-capture
  - bajaj-life
timestamp: 2026-07-09
---

# Smart Match 3D

Premium mobile-web triple-tile matcher for Bajaj Life Insurance.

- **Mechanic:** Goods-Triple-Match-3D-style pile clearing — ~60 overlapping tokens (20 triplets),
  tap uncovered tokens into a 7-slot tray, 3 identical auto-merge. Covered tokens are dimmed/locked.
- **Financial concept:** matching the life goals — each merged triple is a "goal secured"
  (Shield, Savings, Home, Car, Education, Marriage, Child, Retirement, Health, Rewards, Family).
- **Session:** 2:00 hard cap; win = clear all 20 triplets, lose = tray overflow or timeout.
- **Scoring:** matches x100 + combo bonus (+25/chain) + time bonus (10/s) + tray-efficiency bonus (50/slot).
- **Boosters:** 1 undo, 1 gentle shuffle, 1 magnet.
- **Assets:** premium layered inline-SVG token sprites (gradients, gloss, drop shadows) rasterized
  to offscreen canvases — no emoji sprites, per stakeholder feedback.
- **Stack:** Vite + React 18, canvas + rAF delta-time loop, dPR scaling, Web Audio synth SFX,
  framer-motion screen transitions, glassmorphic UI in brand palette (#003DA6 / #F26522 / #28A745).
- **Lead flow:** gold-standard LeadCaptureModal → SlotBookingModal → ThankYouScreen;
  `LEAD_NO_KEY = 'smartMatch3dLeadNo'`; playCount incremented on every game start.
- **Dev port:** 5033.
