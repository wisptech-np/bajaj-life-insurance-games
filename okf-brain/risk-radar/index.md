---
type: project
title: Risk Radar
description: Darkness + sonar-pulse navigation game (Dark Echo-style) — tap to
  fire a radar pulse that lights the maze only where the wavefront passes, hold
  to walk the family to shelter while pulses lure lurkers to their origin.
  Financial hook - you can't see risks coming, your cover can. Pure-module
  rules (src/rules.js) proven headless by gate.mjs. Port 5078.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-radar
tags:
  - game
  - bajaj-life
  - canvas
  - sonar
  - stealth
  - lead-capture
  - vite-react
timestamp: 2026-07-30
---

# Risk Radar

Pitch-black maze; a tap emits a sonar wavefront (460 px/s, 400px max, 18px
band) that lights wall chunks only while crossing them (hold 1.0s, fade 0.7s).
Hold-to-walk at 105 px/s with 2 family followers on the breadcrumb trail.
Noise economy: lurkers hunt the pulse ORIGIN. Fairness invariant enforced in
rules and proven by the gate: nothing takes a heart untelegraphed. 100s /
3 hearts / 3 gate checkpoints / 5 hidden orbs / quiet bonus at ≤18 pulses.
Pause wipes all revealed geometry immediately; resume is behind a 3-2-1
re-acquire with the clock held.

- Scaffold: GAME_STANDARD v2 (guardian-shelter pattern), kit synced from
  `shared/game-kit/`.
- Verification: `node gate.mjs` — scripted-bot completion, 10k-walk fairness
  sweep, spam-vs-quiet economy, reveal-timing probes. All PASS.
