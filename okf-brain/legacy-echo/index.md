---
type: project
title: Legacy Echo
description: Time-loop past-self co-op — 5 loops x 18s over one hand-authored vault map; every finished run replays as a live echo that holds plates, blocks the hazard beam and flips levers, so a final run can carry the policy chest through three vault doors into the family vault. Ghost replay is a 60 Hz state track on a single master loop clock.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/legacy-echo
tags:
  - game
  - time-loop
  - co-op
  - puzzle
  - arcade
timestamp: 2026-07-29
---

# Legacy Echo

Time-loop past-self co-op. Five 18-second loops; each loop the player drags one
glowing guardian around a portrait 390x780 vault map. At loop end the world
hard-resets to t=0, but the finished run replays as a live **echo** whose
presence still triggers plates, blocks the hazard beam and flips levers. The
task: open three vault doors (1, 2 and 3 plates, held simultaneously by
distinct bodies) and carry the policy chest through all of them into the
family vault before loop 5 expires. Dev port **5075**.

## Financial hook

*Your past contributions keep working for you — every premium your past self
paid is a hand protecting the family today.* The mechanic argues it directly:
the run you invest early is literally the helper that holds the door open for
the future you, and a loop you waste (the anti-AFK burn) is a contribution
that never happened.

## Ghost replay (load-bearing design)

- **State track, not inputs.** Fixed 1/120 s sim; every 2nd tick (60 Hz) the
  player's `(x, y, actionBits)` is written to a preallocated Float32Array —
  1080 samples/loop, ~13 KB. Replay is pure array playback indexed by the same
  integer loop-tick counter; ghosts are never re-simulated from input events.
- **Interactions from positions.** Plates, twin levers and beam blocking are
  evaluated each tick from the replayed positions, identically for the live
  player and every echo.
- **One clock.** Beam schedule = loop clock + session `mulberry32` seed phase,
  identical every loop. Pause freezes the single master tick counter for
  world, player and ghosts alike, so desync is structurally impossible.
- **Readability.** Max 4 ghosts at 0.45 alpha, per-loop hue (cyan, violet,
  amber, rose) plus a loop-number badge; runs under 64 px of path are culled;
  loop start flashes an echo marker at each ghost's spawn.

## Map and ramp (authorial, not speed)

Central spine (chest route) crossed by doors at y 580/390/200; free side wings
hold the plates and levers, so any plan is recordable in any loop. Door 1 = 1
plate (loop 1 teaches the latch solo), door 2 = 2 plates (needs 1 echo),
door 3 = 3 plates + a beam corridor (needs 3 echoes or clever timing). The
core skill is the **reposition**: one echo holds a plate early, then walks to
a second plate for the finale. Expert plans win in 4 loops; a casual plan with
only two repositions wins in 5. Twin levers ~310 px apart (sync window 0.5 s,
impossible solo) open a coin alcove; 5 coins total sit behind cooperation.

Score: 1000 delivery + 400 x unused loops + 60 x coin - 5 x stacked plate
seconds, floored at 0. Anti-AFK: a loop with <64 px of path burns at 4 s.
Anti-pause-scum: resume from auto-pause freezes world + loop clock behind a
visible 3-2-1 (1.5 s) with input dead until the GO beat.

## Verification

`legacy-echo/gate.mjs` (run `node gate.mjs`) drives the shipped pure module
`src/rules.js` headless: solvability in 4 and 5 loops across five seeds,
idle bot never wins, ghost-replay determinism (identical interaction
timelines), and the pause freeze provably holds the clock. All PASS; `pnpm
build` (uat) green. Details in `log.md`.
