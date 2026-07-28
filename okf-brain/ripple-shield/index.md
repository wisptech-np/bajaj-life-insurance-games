---
type: project
title: Ripple Shield
description: One-tap chain reaction where a single shield ripple cascades through drifting family orbs, five waves in two minutes, with green virus orbs eating the ripple's reach.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/ripple-shield
tags:
  - game
  - chain-reaction
  - arcade
timestamp: 2026-07-28
---

# Ripple Shield

One tap per wave. Hold to aim, release to send an expanding shield ripple; every
blue family orb the ring sweeps sends out a ripple of its own, so one tap
cascades across a board of 40-60 drifting orbs. Green virus orbs caught by a
ripple eat its remaining reach. Five waves (targets 25/25/26/26/27 against
40/46/50/56/60 orbs), 120-second session.

## Financial hook

One policy protects many. The tap is the cover you buy and the cascade is
everyone that cover reaches; each generation carries slightly less reach, so
where the shield is placed decides how far it travels. The viruses are the risks
that eat cover — a ripple that catches one is measurably shorter afterwards, and
a chain aimed into a virus cluster dies three orbs in.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable lives here,
  including the wave table and the ripple radii the whole balance turns on.
- `src/RippleShieldGame.jsx` — the whole game: one canvas component with mutable
  state in refs, module-level sprite builders and programmatic draw functions,
  fixed orb/ripple pools reused across waves and replays.
- `src/Screens.jsx` — Home (the board itself: rings expanding from a tap point,
  orbs turning gold in order, viruses where the chain would break), How to Play
  (3-beat CSS-animated SVG: one tap, chain the family, avoid the viruses),
  Results (score ring, protected/waves/best-chain tiles, five wave chips, Book a
  Slot / Retry / Home).
- `scripts/balance-sim.mjs` — headless balance gate that imports the shipped
  `data.js` and replays the component's exact chain resolution.
- `src/kit/` — synced copy of `shared/game-kit`: fixed-step loop with the session
  clock, pointer input, pooled particle/shake/float-text effects, Web Audio
  synth, device tiering. Never edited in place.

## Colour grammar

Blue is always protection (family orbs, the shield ripple), green is always risk
(virus orbs), gold is the reward — an orb that has been covered turns gold with
a cover tick, so the board reads at a glance as "who is still exposed". Orange
is the warning state: a ripple that a virus has eaten into turns orange for the
rest of its life.

## Mechanic in one paragraph

A ripple grows from radius 0 at 250 ref px/s to its maximum, then fades over
0.3 s. `rootRadius` (98 ref px) is the only authored radius in the game: a
chained ripple has no constant of its own, it inherits its parent's *current*
maximum minus 2 px of generational decay, so virus damage and decay both travel
down the chain. Contact is a monotonic ring-crossing test, so each ripple touches
each orb exactly once, with no per-ripple hit sets and no allocation. A virus
touched subtracts 18 px from that ripple's maximum; a ripple worn below the
minimum radius is spent. The wave ends when the last ripple expires.

## Balance

Verified by `pnpm balance` — the gate's default run, 300 boards per wave per
strategy (40 for the oracle), against the shipped constants.

| Tap profile | per wave | full run |
| --- | --- | --- |
| random | 62.3 / 47.0 / 48.3 / 50.3 / 47.0% | 3.3% |
| centre | 80.0 / 73.0 / 72.3 / 71.0 / 66.3% | 19.9% |
| centroid | 79.7 / 69.3 / 78.3 / 81.0 / 72.0% | 25.2% |
| oracle (6x8 grid replay) | 100 / 100 / 100 / 97.5 / 97.5% | 95.1% |

A winning tap existed on essentially every board, so the ceiling is a read of the
board rather than luck. Mega-chains (15+) fire on 88-94% of centre taps; mean
chain depth ~6.2 generations, deepest 17.

Four corrections against the spec's literal reading are documented in the game
README's "Balance notes": `rootRadius: 98` chosen so the root sits well above the
continuum-percolation threshold (k = 7.1-9.5 orbs per ripple against a threshold
of ~4.5) while the 2 px-per-generation decay walks each branch back down through
it (k = 5.3 at R = 76, 4.5 at R = 69, 3.6 at R = 60); a virus penalty of 18 px
rather than a third of a radius; a target ladder that plateaus at 25/25/26/26/27
because five compounding waves make a strictly rising ladder a 12.9% full run;
and difficulty that rises through the board (orbs, viruses, drift) rather than
through the target.

Every authored length is a reference-playfield length scaled at runtime by
sqrt(area ratio), because a chain reaction depends on orb density rather than
radius. The gate reproduces this: its default run ends with a cross-device sweep
(382x496 → 78/72/68/75/70%, 382x665 → 74/64/65/73/64%, 344x520 →
77/68/71/75/64%, 400x760 → 71/68/70/73/67%), and `pnpm balance 300 382x665` runs
the whole table on any one playfield.

## Ports and commands

Dev server on **5046**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `pnpm balance`.
