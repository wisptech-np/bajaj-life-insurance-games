---
type: log
title: Guardian Archer Change Log
description: Chronological history of changes for Guardian Archer (directory coverage-archer).
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/coverage-archer/log.md
timestamp: 2026-07-09T12:00:00+05:30
---

# Guardian Archer Change Log

## [2026-07-09] Revamp to single-player "Guardian Archer" (stakeholder feedback)
- **Single-player conversion (explicit feedback)**: removed every threat that acts against
  the player (advancing viruses damaging a family shield, falling hazard orbs). The game is
  now pure target shooting — green virus creatures at varied sizes/distances that bob or
  drift and **never fire back**; only the player shoots.
- **New session shape**: 12 arrows, 120-second hard cap, 3 waves (3 large near / 3 medium
  mid / 4 small far). Win = clear all waves (+5 pts/second time bonus); lose = out of
  arrows or out of time. Difficulty ramps via smaller drifting targets and stronger wind.
- **Aiming**: drag-back slingshot (angle + power) with dotted trajectory hint for the
  first 3 shots only, then pull-line + power ring. Gravity (300) + per-shot random wind
  with an SVG direction/strength HUD indicator.
- **Scoring**: L/M/S = 100/150/250; direct core hit = CRITICAL x2 (pulsing nucleus drawn
  in the texture); +25 streak bonus per consecutive hit (cap +100); floating score text,
  particle bursts, screen shake, wave banners, win fanfare.
- **Rebranding**: title/branding renamed to **Guardian Archer** in index.html, intro
  screen, share copy, README, and OKF docs.
- **Standard flow**: rebuilt App to home > howtoplay > game > results (+auto lead modal
  when no lead) > Book a Slot > SlotBookingModal > ThankYouScreen (confetti + booked slot
  details) matching life-goals-bubble-shooter; `incrementPlayCount()` on every game start.
- **Shared modules aligned to gold standard**: services/api.ts rewritten to the bubble
  shooter api.js contract (build-time `__LMS_BASE_URL__` defines, `extractLeadNo`,
  `LEAD_NO_KEY = 'coverageArcherLeadNo'`, default summary "Guardian Archer Lead");
  LeadCaptureModal / SlotBookingModal / ThankYouScreen ported with identical logic,
  restyled to the game theme. playCount/crypto/shortener kept verbatim.
- **No emoji sprites**: removed all emoji from HUD, intro, tutorial and results
  (bow/arrow/wind/sound/virus visuals are inline SVG or procedural canvas).
- **Audio**: Web Audio synth SFX per standard (UI tap 1000 Hz, ascending-hit,
  critical chord, miss thud, wave rise, 5-note win fanfare) with working mute toggle.
- **Verification**: `pnpm install` OK; `pnpm build` (vite --mode uat) OK, zero errors;
  `tsc --noEmit` clean; emoji-codepoint grep over src returns none.

## [2026-07-08] Visual Polish & Build Validation
- **Canvas Emoji Fix**: Replaced the raw emoji star in the level completion overlay in
  `MainScene.ts` with a programmatically drawn 5-pointed gold star.
- **Lead Capture & Verification**: Verified Name, Mobile (10-digit), and optional Email
  collection with the T&C consent check and active LMS connection.
- **Build Verification**: Ran `pnpm build` successfully with output in `dist/`.

## [2026-07-08] OKF Initialization
- Created `index.md` and `log.md` under the centralized `okf-brain/coverage-archer/` directory.
