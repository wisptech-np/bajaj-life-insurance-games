---
type: project
title: Guardian Arena
description: Archero-style arena survivor — a blue shield guardian auto-fires at green virus blobs only while standing still; stutter-step through 4 waves, pick insurance-rider upgrades between waves, and down the mini-boss. Financial hook - layered protection, every upgrade is another rider on the family's cover.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/guardian-arena
tags:
  - game
  - arena-survivor
  - archero-like
  - virtual-joystick
  - canvas
  - react
  - vite
  - lead-capture
  - insurance-riders
  - anti-pause-scum
timestamp: 2026-07-29
---

# Guardian Arena

Standalone Vite + React 18.3.1 game at `guardian-arena/` (dev port **5070**,
rollup output name `GuardianArena`). Scaffold copied from the
`guardian-shelter` gold standard: same `api.js` shape
(`LEAD_NO_KEY = 'guardianArenaLeadNo'`), `LeadCaptureModal`,
`SlotBookingModal`, `ThankYouScreen`, `services/playCount.js`,
`utils/crypto.js`, `utils/shortener.js`, and the
`home → howtoplay → game → results (+lead) → slot → thankyou` flow with the
`gameKey` remount pattern.

## Core mechanic

The guardian **auto-fires at the nearest enemy only while stationary** — any
joystick input stops the firing (120 ms settle delay after stopping, target-
lock reticle on the nearest enemy). Floating virtual joystick: pointerdown
sets the origin, 10 px dead zone, 60 px max radius, ~200 px/s player speed on
a 400×600 logical arena.

## Structure

- `src/data.js` — `GAME_CONFIG`: every tunable (waves, enemy specs, fairness
  distances, upgrade effects, juice budgets).
- `src/sim.js` — pure world sim: waves, chasers/shooters/splitters/mini-boss,
  bolts with pierce/ricochet/multishot, fairness rules, anti-corner-camping
  (quadrant-biased spawns, flanked approaches, lead-aim + corner spreads),
  and the anti pause-scum `beginPause`/`endPause`/`freezeLeft` re-acquire beat.
- `src/GuardianArenaGame.jsx` — canvas renderer (programmatic vectors only),
  HUD, upgrade-card overlay, re-acquire 3-2-1 overlay, kit loop/input/effects.
- `src/sfx.js` — Web Audio synth voices with ±10% random pitch (the kit audio
  copy is immutable and fixed-pitch).
- `src/kit/` — byte-identical copies of `shared/game-kit/*`.

## Session

90 s: Wave 1 (7 chasers) → Wave 2 (10, 30% shooters) → Wave 3 (13, +25%
splitters) → Wave 4 mini-boss (20× chaser HP, telegraphed 3-shot fan) +
trickle. Pick-1-of-3 rider cards between waves (world and clock held). WIN =
boss down or clock survived; LOSE = 4 HP gone. Score = kills × tier +
wave-clear bonuses.
