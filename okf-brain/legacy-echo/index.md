---
type: project
title: Legacy Echo
description: Time-loop past-self co-op — 5 loops x 12s over one hand-authored vault map. Carry the gold chest to the vault; the two gates in the way open only while somebody stands on their green pads, and the only somebody you have is the loop you already played, which replays as a live echo. Ghost replay is a 60 Hz state track on a single master loop clock; the objective is a pure function of the world so the headless gate can prove it is never stale.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/legacy-echo
tags:
  - game
  - time-loop
  - co-op
  - puzzle
  - arcade
timestamp: 2026-08-03
---

# Legacy Echo

> **Get the gold chest to the vault at the top. The gates in the way stay open
> only while somebody stands on their green pads — and the only somebody you
> have is the loop you already played.**

Time-loop past-self co-op. Five 12-second loops; each loop the player drags one
glowing guardian around a portrait 390x780 vault map. At loop end the world
hard-resets to t=0, but the finished run replays as a live **echo** that keeps
standing where you stood. Three green pads, two gates (1 pad and 2 pads), one
chest. One pad per loop then carry wins in 4 loops; repositioning inside a loop
wins in 3. Dev port **5075**.

**Revamped 2026-08-03** against the client review "the purpose of the game is
difficult to understand". The hazard beam, the twin-lever sync gate, the five
coins, the third gate and the stacked-plate penalty were deleted outright —
four mechanics competing for attention with the one idea the game exists to
land. See `log.md`.

## Financial hook

*Your past contributions keep working for you — every premium your past self
paid is a hand protecting the family today.* The mechanic argues it directly:
the run you invest early is literally the helper that holds the door open for
the future you, and a loop you waste (the anti-AFK burn) is a contribution
that never happened.

## Ghost replay (load-bearing design)

- **State track, not inputs.** Fixed 1/120 s sim; every 2nd tick (60 Hz) the
  player's `(x, y, actionBits)` is written to a preallocated Float32Array —
  720 samples/loop, ~8.6 KB. Replay is pure array playback indexed by the same
  integer loop-tick counter; ghosts are never re-simulated from input events.
- **Interactions from positions.** Pads are evaluated each tick from the
  replayed positions, identically for the live player and every echo.
- **One clock.** With the seeded beam gone the world has no random element at
  all, so every loop is bit-identical by construction. Pause freezes the
  single master tick counter for world, player and ghosts alike, so desync is
  structurally impossible.
- **Readability.** Max 4 ghosts at 0.5 alpha, per-loop hue (cyan, violet,
  amber, rose) plus a loop-number badge; runs under 64 px of path are culled;
  loop start flashes an echo marker at each ghost's spawn.

## Map and ramp

Central spine (chest route) crossed by gates at y 500 and 250; free side wings
hold the pads, so any plan is recordable in any loop. Gate 1 = 1 pad at
(58,560) — loop 1 stands on it and watches the gate open, which is the whole
lesson. Gate 2 = 2 pads at (58,330) and (332,330), so it needs two distinct
bodies and therefore two echoes. Each pad is drawn physically wired to its
gate, and the wire lights green when held.

One pad per loop then carry = win on loop 4, which is what a first-timer
following the on-screen arrow actually does. The **reposition** (hold gate 1's
pad early, walk to gate 2's late) wins on loop 3, which is the ceiling the map
allows. The chest cannot be picked up until the echoes cover every pad, so it
is impossible to scoop it and jam against a gate you cannot open.

Score: 1000 delivery + 400 x unused loops (max 1800). Anti-AFK: from loop 2
on, a loop with <64 px of path burns at 3 s; loop 1 is exempt so a first-timer
reading the screen is not punished. Anti-pause-scum: resume from auto-pause
freezes world + loop clock behind a visible 3-2-1 (1.5 s) with input dead
until the GO beat.

## Teaching the mechanic

`objectiveOf(cfg, world)` in the pure rules module returns the one next thing
to do and the one place to go, and both are shown at once — a sentence in the
HUD and a pulsing ring with an arrow on the canvas. Its four states walk a
player through the entire idea: *stand on a green pad → stay here, your echo
will repeat this → grab the gold chest → carry it to the vault*. Because it is
a rule, `gate.mjs` gates it like one.

## Verification

`legacy-echo/gate.mjs` (run `node gate.mjs`) drives the shipped pure module
`src/rules.js` headless: solvable in 3 loops (reposition) and 4 loops
(one pad per loop) across five seeds, idle bot never wins, ghost-replay
determinism (identical interaction timelines), the objective never stale, and
the pause freeze provably holds the clock. All 8 PASS; `npx vite build` green;
`node scripts/play-test.mjs legacy-echo --all-sizes` clean at all four
viewports. Details in `log.md`.
