---
type: project
title: Risk Radar
description: Darkness + sonar-pulse navigation game (Dark Echo-style) — a RADAR
  button fires a pulse that lights the maze only where the wavefront passes and
  leaves a dim memory trace, touching the maze walks the family to shelter, and
  every pulse lures lurkers to its origin. Six named radar signals, each
  identifiable by shape and rhythm rather than colour. Financial hook - you
  can't see risks coming, your cover can. Pure-module rules (src/rules.js)
  proven headless by gate.mjs. Port 5078.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-radar
tags:
  - game
  - bajaj-life
  - canvas
  - sonar
  - stealth
  - lead-capture
  - vite-react
timestamp: 2026-08-03
---

# Risk Radar

Pitch-black maze; the RADAR button emits a sonar wavefront (460 px/s, 400px
max, 18px band) that lights wall chunks only while crossing them (hold 1.0s,
fade 0.7s, then a permanent dim memory trace). Touching the maze walks the
family at 105 px/s with 2 followers on the breadcrumb trail. Noise economy:
lurkers hunt the pulse ORIGIN, and the game now says so out loud. Fairness
invariant enforced in rules and proven by the gate: nothing takes a heart
untelegraphed. 100s / 3 hearts / 3 gate checkpoints / 5 hidden orbs / quiet
bonus at ≤18 pulses. Pause wipes all revealed geometry — memory map included —
immediately; resume is behind a 3-2-1 re-acquire with the clock held.

Six radar signals, each identifiable by shape and behaviour with the colour
removed (`src/signals.jsx` is the single definition, rendered by both the How
to Play key and the in-game `?` legend): wall = line + memory trace; risk pool
= spiked disc that breathes; shelter = roof chevron that self-rings every 2s;
checkpoint = dashed line, solid once crossed; bonus orb = four-spoke spinner;
lurker = repeating rings from a moving point, and the only thing that leaves
no memory trace.

- Scaffold: GAME_STANDARD v2 (guardian-shelter pattern), kit synced from
  `shared/game-kit/`.
- Verification: `node gate.mjs` — scripted-bot completion, 10k-walk fairness
  sweep, spam-vs-quiet economy, noise-report honesty, reveal-timing probes.
  All PASS. Plus `node scripts/play-test.mjs risk-radar --all-sizes`.
