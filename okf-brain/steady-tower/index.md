---
type: project
title: Steady Tower
description: Jenga-style de-risking game — flick eight red risk blocks out of a 12-layer tower without racking it over, against a live centre-of-mass stability meter.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/steady-tower
tags:
  - game
  - physics
  - jenga
  - arcade
timestamp: 2026-07-28
---

# Steady Tower

A 12-layer tower, three blocks per layer. Eight of the 36 blocks are red risks
(high-interest debt, junk fund, card dues, payday loan); the other 28 are blue
foundation blocks (term cover, emergency fund, health cover, monthly SIP). Flick
every red block out inside a 120-second session without toppling the stack.

## Financial hook

De-risking a portfolio is not "sell the bad things" — it is "sell the bad things
in an order that leaves you standing". Every risk block carries load, and pulling
one always costs stability for a moment; the question is whether the tower can
absorb it now or whether the weight should come off somewhere else first. The
foundation blocks are the answer, and the game refuses to remove them: tug a blue
block and it shakes but stays. Term cover, an emergency fund and health cover are
not things you optimise away — they are what makes it safe to change anything else.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, **and the whole pure tower model**:
  geometry-normalised block layout, the centre-of-mass / support solver, the lean
  integrator, the generator and the exhaustive solvability analyser. None of it
  touches React or canvas, which is deliberate — the balance gate imports it
  straight into node and measures the code the game actually runs.
- `src/SteadyTowerGame.jsx` — the canvas component: mutable state in refs,
  pre-rendered backdrop and 36 per-block sprites, flick recognition, collapse
  animation, HUD written through refs.
- `src/Screens.jsx` — Home (the tower itself, mid-pull and leaning), How to Play
  (3-beat CSS-animated SVG: flick, read the meter, don't topple), Results (score
  ring, risks/stability/time tiles, per-risk chips, Book a Slot / Retry / Home).
- `scripts/balance.mjs` — the gate. Exits non-zero on failure.
- `src/kit/` — synced copy of `shared/game-kit`. Never edited in place.

## The physics model

Two pieces, both pure.

**Statics.** For every interface (base plate under layer 0, then each layer on
the one below), compare the centre of mass of everything at or above it against
the support span the layer below provides. `margin = 1 - |offset|`, minimised
across interfaces. Normalised units: a block is 1.0 wide.

**The lean is a shear, not a rotation.** `theta` feeds back into the statics — a
layer `h` above an interface is carried `h * tan(theta)` off its support. A tower
of loose blocks racks; it does not pivot as a monolith. Modelling it as a rigid
rotation leaves every internal interface unchanged, so only the ground contact
can fail and a 12-layer tower needs ~42 degrees before it does. Measured with the
rigid reading, the worst reachable state sat at margin 0.345 and the careless
reference player won 100% of runs — i.e. the tower could not be knocked over.

**The integrator.** A damped spring toward the lean the offset implies, with the
spring constant scaled by the live margin: healthy towers are stiff and spring
back, critical towers are floppy and keep going. Past `toppleAngle` 0.21 rad the
spring is abandoned for an inverted pendulum; the stack comes apart at 0.44 rad.
Because damping stays constant while stiffness collapses, a critical tower goes
over slowly — which is the brief's "slow tilt when leaning", for free.

Block height is derived from block width via `solver.layerHeight` (0.42), because
that ratio *is* the shear's moment arm; sizing blocks to fill leftover screen
height would retune the physics per device.

## Balance gate

`node scripts/balance.mjs` — exhaustive, not sampled. Removals are independent,
so the reachable state space is exactly the 2^8 = 256 subsets and is enumerated
outright. Per tower: count how many of the 40,320 orders keep every intermediate
state at or above `safeMargin` 0.30 (winnability, with headroom), then drive the
worst possible order through the shipped integrator and require it to fall over.
`buildVerifiedTower` runs the same checks at mount (median 24 attempts, budget
600) and falls back to a checked-in verified layout rather than shipping an
unverified tower.

Measured over 500 generated towers: **500/500 winnable, 500/500 topple-able by
the worst order, 500/500 stable in the final state, 0 fallbacks.** Final margin
0.348–0.383, worst reachable margin 0.228–0.280, 32–50% of orders safe end to end
(median 41.7%).

Dynamic, 500 runs per scripted player through the same fixed 1/120 s step, with
the post-pull state read at the **live lean** exactly as the game does:

| Player | Win | Topple | Median score |
| --- | --- | --- | --- |
| Steady (settles, best-margin order, clean flick) | 100% | 0% | 2,597 |
| Casual (settles, random order, hard flick) | 89.0% | 11.0% | 2,494 |
| Careless (no settle, random order, random hard flicks) | 16.6% | 83.4% | 2,524 |

Patience and order move the win rate from 17% to 100%. Both outcomes reachable,
the gap is skill. The casual player waits for a *full* settle after every pull —
something a human under a running clock will not do — so its 11% loss rate is the
cost of a careless order alone; the careless row is where the real risk sits.

An earlier revision of the gate read the post-pull state at theta = 0 while
reading the pre-pull state at the live lean, which made pullImpulse's
`(offAfter - offBefore)` shift term a phantom restoring impulse and published a
gentler casual row (80.6% / 19.4%). Pass 1 was never affected — it already
evaluated at `lean.theta` — so no proof or tuning constant changed.

## Solvability rules

Three structural rules keep the brief's "no red block is the sole support"
guarantee, confirmed by the exhaustive analysis rather than assumed:

1. The bottom two layers are never red — the interface carrying the whole tower
   cannot be narrowed by the player.
2. At most one red per layer, except one deliberate pinch layer (7–9) where both
   *edges* are red and the *middle is blue*. The sole remaining support there is
   always a BLUE block.
3. No three consecutive layers lose the same column; column usage balanced within
   3. Stacking a support shift and a mass shift the same way is the one pattern
   that reliably produces an unwinnable end state.

Middle reds are capped at 3: removing a middle block leaves the layer's span
unchanged, so they are nearly free.

## Scoring and stats

`risks x 200` + `average stability x 600` + (win only) `6 per second left`.
Stats contract: `{ score, risks, stability, time }`.

## Ports and commands

Dev server on **5047**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `node scripts/balance.mjs`.
