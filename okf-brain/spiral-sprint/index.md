---
type: project
title: Spiral Sprint
description: Helix-jump descending shield ball — spin a spiral tower to drop 40 rings of market cycles through gaps, dodge green crash arcs, and reach the retirement vault.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/spiral-sprint
tags:
  - game
  - helix-jump
  - arcade
timestamp: 2026-07-28
---

# Spiral Sprint

One-thumb helix descent. A shield ball bounces in place at the front of a
rotating spiral tower; the player drags horizontally to spin the tower under it.
Blue arcs bounce, gaps drop you a ring, green crash arcs end the run. Forty rings
down is the retirement vault, inside a 120-second session.

## Financial hook

The tower is a market cycle ridden all the way to retirement. Every ring is a
year: blue arcs are the years the market gives you somewhere to stand, gaps are
the years you fall straight through, green crash arcs are the drawdowns that end
an uncovered run. Gold rules every ten rings count the years down — 30, 20, 10
years to retirement — and the vault at the bottom is the destination. The fever
streak is the reward for a run of good years: three rings in one fall lights the
flame and, for three seconds, a drawdown costs nothing at all. Cover is what
turns a crash from the end of the story into something you go straight through.
Falling is not free, though: more than four rings without landing destroys the
ball. A few years of not landing anywhere is luck; five in a row is a plan with
no floor under it, and cover does not protect you from never landing.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`, plus the derived bounce constants
  (`BOUNCE_GRAVITY`, `BOUNCE_SPEED`) and the milestone list. Every tunable here.
- `src/SpiralSprintGame.jsx` — the whole game: one canvas component with mutable
  state in refs, module-level tower generation, and programmatic pseudo-3D draw
  functions (annulus sectors on tilted ellipses, extruded front walls, a core
  cylinder that occludes the back of every ring).
- `src/Screens.jsx` — Home (the tower itself as a stack of tilted rings with the
  ball dropping down the shaft toward the vault), How to Play (3-beat
  CSS-animated SVG: drag to spin, drop through gaps, dodge the crash zone),
  Results (score ring, rings/smashes/best-streak tiles, years-to-retirement
  chips, Book a Slot / Retry / Home).
- `src/kit/` — synced copy of `shared/game-kit`: fixed-step loop with the session
  clock, pointer input, pooled particle/shake/float-text effects, Web Audio
  synth, device tiering. Never edited in place.

## Colour grammar

Green is always risk — here the crash arcs, drawn as virus-textured bands with a
danger-red warning stripe on the lip. Blue is always protection: safe landing
arcs, the shield ball, the tower core. Gold is wealth: the retirement vault, the
milestone rules, the fever flame. The design spec called the crash arcs "red";
the repo-wide rule that risk reads green outranks it.

## Tower generation

Seeded `mulberry32` at mount, so replays differ. A ring is built as an ordered
list of spans — one gap, one guaranteed landing arc of at least 55°, then crash
arcs alternating with narrower safe runs — and then **phased** so that one chosen
segment sits centred under the previous ring's gap. That phase is the whole
fairness guarantee: what waits under a hole is either a landing arc wide enough
for the ball or the next gap, never a crash arc. Aligned 2-ring fever shafts are
planted at rings 5-6, 14-15, 23-24 and 32-33 so the streak is always reachable
without relying on the random fall-through roll.

## Balance corrections

Three constants and one mechanic differ from the spec's literal reading, each
verified with a headless simulation that reuses the shipped generator code
verbatim (see the game README's "Balance notes"):

1. `ball.bounceHeightPx: 100` / `bounceSeconds: 0.7` (spec 90 / 0.50). The spec
   pair implies 2,880 px/s² gravity — nearly twice the kit's arcade gravity — and
   finished all 40 rings in a 14 s median. The shipped pair gives 1,633 px/s²,
   within 2% of the kit value, and a 27 s median.
2. `arcs.fallThroughChance: 0.12` plus 2-ring fever shafts every 9 rings (was
   0.28 and 3 every 7). The originals made over half the tower descend with no
   input; the player was a spectator.
3. `tower.degPerPx: 0.7` (spec 0.55). A half-turn — the largest rotation ever
   required — drops from 327 px of drag to 257 px, inside one thumb swipe on a
   360 px phone, while the tightest 42° gap is still a 60 px target.
4. `fever.seconds: 3.0` replaces "fever ends on the next normal bounce". The fall
   that grants fever has at most 0.13 s left to run, so the spec's reward expired
   before it could be used; a single smash still consumes it. Fever is lit at
   most once per fall (latched in the component, cleared on a safe landing) —
   without that latch the smash re-satisfies the streak test while the clock is
   momentarily zero and `smashLimit: 1` is not enforced at all.

## 2026-07-31 revamp

Ball 14 → 20 px with every fit retuned around it (gaps 80→46°, landing arc ≥ 60°,
slices ≥ 14°, slab 16 px). New `fall` block: more than 4 rings in one uninterrupted
fall destroys the ball, telegraphed from ring 3 by a hot-metal shell, fracture
crackle, red vignette, a rising pass tone, a `Fall n/4` HUD chip and a 700 px/s
stress cap that buys 429 ms to steer onto a landing arc. Fever threshold (3) sits
exactly one ring below the limit (4) and its immunity covers crash arcs only.
Difficulty now eases on `arcs.rampExp: 1.7` — crash coverage 8% → 46%, up to four
crash arcs, gaps 80° → 46°, bounce period 0.70 s → 0.55 s via `ball.lateSpeedup`.
How to Play is an animation-only loop with three icon labels. See the game README
and this folder's log.md.

Measured with the pre-revamp values across 400 generated towers and 1,200 simulated
runs: 0 unpassable rings in 16,400 generated rings, every run lit the fever (mean
4.0 activations), and ring 40 is reached in a 34.3 s median by the slowest
profile against a 120 s budget — the clock only bites at roughly four bounces per
ring (120.1 s).

## Ports and commands

Dev server on **5048**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`. Rollup output name `SpiralSprint`;
`LEAD_NO_KEY = 'spiralSprintLeadNo'`; LMS `summaryDtls` `'Spiral Sprint Lead'`.
