---
type: project
title: Time Shield
description: SUPERHOT-rule dodger — world simulation speed proportional to the player's own movement; cross 5 bullet-lattice zones under a real-time clock and rising fog. Port 5076.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/time-shield/
tags:
  - game
  - time-manipulation
  - dodger
  - batch-7
timestamp: 2026-07-30
---

# Time Shield

Time moves only when you move. `timeScale = clamp(0.06 + 0.94·(vEMA/860)^0.85, 0.06, 1)`,
vEMA = character speed (EMA τ 100ms), critically damped finger-follow (ω 18/s). 5 stacked
zones, 105 s real-time cap, fog wall 6 px/s real-time. Bullet volleys 620 px/s with 500 ms
real-time telegraphs, laser fans zone 3+, sweep walls zone 4+. 2 hits lose; all zones win.
Score: 300/zone, near-miss 25 (timeScale > 0.3 only), style ≤ 400, 8×s remaining.

Anti-exploit: jitter discount (net displacement / path length < 0.25 scales input speed),
fog + real-time clock kill freeze-camping, pause resumes via 3-2-1 re-acquire at floor
timeScale. Pure rules in `src/rules.js`; proof in `gate.mjs`.
