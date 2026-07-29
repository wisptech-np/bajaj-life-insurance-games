---
type: project
title: Ring-Fence
description: Qix/JezzBall-style territory capture — ride the safety wall, cut into open ground and seal it to flood-claim every orb-free pocket; 2-3 deterministic virus orbs, 3 shields, anti-stall fuse, 70% in 90 s to win. Dev port 5077.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/ring-fence
tags:
  - game
  - territory-capture
  - qix
  - arcade
timestamp: 2026-07-30
---

# Ring-Fence

Territory capture on a 65x117 grid of 6 px cells (390x702 logical). A 2-cell
frame starts claimed as the glowing safety wall; the guardian rides it at
300 px/s (swipe / virtual stick / keys). Leaving claimed ground starts a cut;
re-touching claimed ground seals it: the trail always becomes wall, then every
unclaimed component containing NO hazard is flood-claimed and washed in by a
900 px/s colour wave — the signature moment. WIN at 70% claimed within 90 s;
LOSE on 3 shields gone or timer expiry. Dev port **5077**.

## Financial hook

"Ring-fencing" is a real asset-protection term and the mechanic argues it:

- **Claimed ground is permanently safe.** Orbs reflect off it forever — cover
  you have locked in cannot be re-exposed.
- **Every bold move is priced by the danger it runs.** Single-cut multipliers
  (>=10% x1.5, >=20% x2.5, >=30% x4) pay for exposure, not for busywork.
- **Presence is not protection.** Boundary camping claims nothing and ramps
  orb speed +6%/8 s (cap +30%); the gate's camper bot never wins.
- **Stalling is its own risk.** Stopping mid-cut >0.8 s ignites a fuse that
  chases the trail at 340 px/s; moving pauses it instantly.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` + `COLORS`; every tunable in one place.
- `src/rules.js` — **pure**: grid, lane movement, cut/seal, component
  labelling + flood-fill (O(cells), reused buffers), orb reflection
  (axis-separated, deterministic), fuse, third-orb summon, camping ramp,
  near-miss detection, scoring, win/lose, and the anti-pause-scum state
  (`beginPause`/`endPause`/`isFrozen`/`isInputLocked`). No DOM; config is a
  parameter; presentation arrives through an optional callback bag.
- `src/RingFenceGame.jsx` — canvas component, NO rules. Offscreen layers
  (backdrop / territory fill / boundary glow) rebuilt only on resize or seal;
  incremental wave reveal ordered by BFS distance; trail tension pulse
  proportional to 1/orb-distance; 220 ms slow-mo + "N% SECURED" banner + shake
  scaled by area on big cuts; DOM-ref HUD for the per-frame counters.
- `gate.mjs` — headless gate at the game root (`node gate.mjs`).
- `src/kit/` — byte-identical copy of `shared/game-kit/`.

## Anti-pause-scum

Kit `loop.js` auto-pauses on `visibilitychange` and is immutable, so the rule
lives in `rules.js`: resume runs a frozen, input-dead 3-2-1 (1.8 s, session
clock held — the world clock IS the session clock here, the kit loop runs
untimed) then a 0.25 s live input lock. Orb velocities are stored direction +
formula-derived magnitude; nothing is extrapolated across a pause.

## Headless gate

`node gate.mjs` imports the shipped `data.js` + `rules.js` on the kit's fixed
1/120 s step and prints PASS/FAIL:

- (a) strip-cutting bot >=70% within 90 s on **6/6 seeds** (17-39 s, all
  shields intact). The bot advances four claimed fronts with straight
  full-span strips, planning each cut by cloning the orbs through the shipped
  `integrateOrb` with bit-exact clock replication — deterministic reflections
  are the game's fairness contract, so a plannable cut is exactly what a
  careful player has.
- (b) idle and boundary-camping bots: 0 wins, 0% claimed.
- (c) seal correctness across 106 seals (strip + 8 chaos-bot runs): no claimed
  ground ever contains an orb, claimed % monotonically non-decreasing, no
  trail cells survive a seal.

## Ports and commands

Dev server **5077**. `pnpm install`, `pnpm dev`, `pnpm build` (uat — the
verification gate), `pnpm build:preprod`, `pnpm build:prod`, `node gate.mjs`.
