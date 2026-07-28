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
ripple eat its remaining reach. Five waves, rising targets, 120-second session.

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
0.3 s. Contact is a monotonic ring-crossing test, so each ripple touches each
orb exactly once, with no per-ripple hit sets and no allocation. A family orb
touched becomes protected and spawns a child ripple with the parent's *current*
maximum minus 2 px, so virus damage and generational decay both inherit down the
chain. A virus touched subtracts 18 px from the parent's maximum; a ripple worn
below the minimum radius is spent. The wave ends when the last ripple expires.

## Balance

Verified by `pnpm balance` (600 boards per wave per strategy) against the
shipped constants. Centre-tap clear rate per wave: 72.5 / 60.8 / 66.8 / 62.3 /
59.3% — inside the intended 50-70% band, with wave 1 as an on-ramp. A uniformly
random tap manages 52 / 41 / 41 / 42 / 31%; an 8x11 grid replay of every board
clears 99-100%, so the ceiling is a read of the board, not luck. Full-run win
probability is 10.9% for a centre-tapper. Mega-chains (15+) fire on 88-95% of
centre taps. Three corrections against the spec's literal reading are documented
in the game README's "Balance notes": ripple radii chosen just above the
continuum-percolation threshold (k ≈ 5.4 orbs per ripple, against a threshold of
~4.5), a virus penalty of 18 px rather than a third of a radius, and a target
ladder that rises by one orb per wave rather than holding a flat share.

Every authored length is a reference-playfield length scaled at runtime by
sqrt(area ratio), because a chain reaction depends on orb density rather than
radius; re-running the simulation on four real playfields (344x520 to 400x760)
keeps every wave inside 51-70%.

## Ports and commands

Dev server on **5046**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `pnpm balance`.
