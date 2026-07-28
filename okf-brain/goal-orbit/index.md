---
type: project
title: Goal Orbit
description: Orbit-switch timing arcade where a comet is slung tangentially from one life-goal planet to the next, dodging virus asteroids across a twenty-planet chain.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/goal-orbit
tags:
  - game
  - orbit-timing
  - arcade
timestamp: 2026-07-28
---

# Goal Orbit

One-tap orbit-switch arcade. A comet circles a glowing goal planet; a tap
releases it along the orbit tangent, and the released line has to reach the next
planet's capture ring, where an assisted gravity well snaps it into a new orbit.
Twenty planets inside a 120-second session, on three lives, wins.

## Financial hook

The chain is a life plan laid out as orbits. Home is the planet you start on;
Education, Car, Marriage, Child, Health, Savings, Business, Travel and Legacy are
the goals you transfer through, and every 5th planet is a milestone — First Job
(5), Family (10), Wealth (15), Retirement (20) — worth a banner and a bonus.

Staying on track is the whole mechanic: sitting on an orbit costs only time,
leaving it at the wrong instant costs the goal. The green virus asteroids
sweeping the transfer paths are the risks that arrive between life stages, and
the answer to one is never speed — release a beat earlier or later and the same
rock is harmless. Coins sit on the *ideal* transfer line, so flying the clean arc
and being rewarded for it are the same act.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, `PLANET_STYLES`, goal and milestone
  labels. Every gameplay number lives here; the game files hold only drawing
  geometry.
- `src/orbit.js` — the orbital model as pure functions: angular-speed ramp,
  launch speed, `transferWindow` (the arc of release angles whose tangent reaches
  the next capture ring), `flyRelease`, asteroid motion, `verifyGap` and
  `buildChain`. Imported unchanged by the headless balance sim, so the sim
  measures what ships.
- `src/GoalOrbitGame.jsx` — the whole game: one canvas component with mutable
  state in refs, offscreen pre-rendered planet/well/star/rock sprites, and
  programmatic draw passes.
- `src/Screens.jsx` — Home (two goal planets with wells, rings, an orbiting comet
  and a coin-dotted transfer arc), How to Play (3-beat CSS-animated SVG: tap
  release, timed transfer, rock dodge), Results (score ring, goals/coins/perfects
  tiles, four milestone chips, Book a Slot / Retry / Home).
- `src/kit/` — synced copy of `shared/game-kit`: fixed-step loop with the session
  clock, pointer input, pooled particle/shake/float-text effects, Web Audio
  synth, device tiering. Never edited in place.
- `tools/balance-sim.mjs` — the balance gate. `node tools/balance-sim.mjs 250`.

## Colour grammar

Green is always risk (the virus asteroids), blue is always protection and
progress (the comet, orbit rings, gravity wells), gold is wealth (coins) and
marks the milestone planets. Deep space is the `#0B1221` family so the game reads
as one product with the shell around it.

## Chain generation

Seeded `mulberry32` at mount, so replays differ. Planets are placed in fixed
logical units (410-wide world) under spacing, rise and ring-clearance
constraints, then every gap is gated on its **release window**: the arc of orbit
angles whose tangent reaches the next capture ring must be at least 0.26 s wide
in real time *and* 0.5 rad wide, so a slow early planet cannot buy a knife-edge
window by being slow. Asteroids are anchored to the transfer line rather than the
planet-to-planet axis, then each gap is *simulated* — 6 loops x 6 release angles
flown against the moving rocks — and re-rolled until a clear release exists on at
least 45% of the window within 3 orbit loops.

## Balance corrections

Six readings differ from the brief's literal values, each verified by
`tools/balance-sim.mjs` across 250 generated chains (see the game README's
"Balance notes" for the full argument and tables):

1. The chain is generated in fixed logical units, not screen pixels — otherwise
   the game is measurably easier on a wide phone, and generation runs before the
   canvas has been measured anyway.
2. `orbit.launchBoost: 1.6` with a `[150, 300]` clamp — an honest `omega*R`
   release crosses a 200 px gap in 2.5 s, which reads as dragging, not slinging.
3. `orbit.omegaStart: 1.35` (was 1.65) — the ramp is the session-length control;
   at the first cut a clean run measured 38 s, under the 60 s floor in §3.
4. Asteroids anchored to the transfer line, not the planet-to-planet axis — on
   the axis, 95% of rolled rocks were rejected and a chain averaged one rock.
5. `asteroids.radius: [9, 13]` / `halfSpan: [55, 92]` — blocked share of a cycle
   is `4*(rockR+cometR)/(2*pi*halfSpan*cos(crossing))`, independent of speed; the
   first cut blocked ~32% of the window per rock.
6. Per-gap solvability simulation with `minClearFraction: 0.45` and
   `maxWaitLoops: 3` — placement alone does not prove a gap is passable.

Measured with the shipped values (250 chains, 5,000 gaps): 0 unreachable
releases; window 0.77-1.18 rad = 0.33-0.87 s; 28 rocks per chain with 0 gaps left
blocked and a worst-case clear fraction of 0.47; a decent rock-dodging agent wins
**99.6%** of runs in 44.8-99.5 s (p50 64.5 s) for a mean 4,704 points, while the
same agent ignoring the rocks wins 0.4% and random taps win 0%.

## Ports and commands

Dev server on **5050**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`. Rollup output name `GoalOrbit`; CRM identity
`LEAD_NO_KEY = 'goalOrbitLeadNo'`, `summaryDtls = 'Goal Orbit Lead'`.
