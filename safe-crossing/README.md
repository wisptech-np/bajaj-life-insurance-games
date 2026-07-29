# Safe Crossing

> Life's traffic never stops — one Claim Cushion, and after that, timing is everything.

A top-down traffic-control game. You are the junction: a 4-way crossing with one lane per
direction and fixed straight paths through a shared centre box. Family vehicles arrive on all four
approaches and nothing waits unless you make it wait.

- **TAP a vehicle** — brake-hold. Its lights come on and it stops short of the box.
- **TAP again** — release. It pulls away and crosses.
- **Orange risk trucks have no brakes.** A tap does nothing. The only way past one is to time
  everybody else around it.
- Two vehicles overlapping inside the box is a **collision**. The first one is absorbed by your
  single **Claim Cushion**; the second closes the junction.
- **Every driver has a patience budget.** The ring around a held vehicle drains while it waits and
  never refills — six seconds of being stopped is all any driver gives you, across the whole run.
  Spend it and they go, and they will not stop for you again (dashed orange ring). You can hold
  life's traffic for a moment, not forever.

## Financial hook

The junction is a household's month. Everything is arriving at once, most of it can be sequenced
if you pay attention, and exactly one thing on the road — the risk truck — cannot be negotiated
with. You get one Claim Cushion for the collision you did not see coming. After that, the only
protection left is your own timing. That is the case for cover, played rather than pitched.

## Rules at a glance

| | |
|---|---|
| Session | 110 s |
| Win | 20 vehicles through the box |
| Lose | second collision, or the clock with fewer than 20 through |
| Scoring | vehicle through **50**; passing inside 24 px without contact **+30** ("smart timing") |
| Traffic | one vehicle every 2.4 s ramping to 1.4 s, spread over the four approaches |
| Vehicles | scooter 30% / family car 42% / school van 18% / **risk truck 10% (no brakes)** |
| Patience | 6 s per driver, cumulative across the run, never refunded |
| Stats contract | `{ score, crossed, nearMisses, crashes }` |

## Layout

- `src/traffic.js` — **all the rules**, and nothing else. Junction geometry, spawn schedule and
  dispatcher, vehicle kinematics and car-following, brake/release, junction-overlap collision,
  near-miss detection, scoring. No React, no DOM, no canvas, no colours.
- `src/SafeCrossingGame.jsx` — pixels, sound and HUD. Decides nothing about the game.
- `src/data.js` — every tunable, plus the measured balance table.
- `scripts/balance.mjs` — the headless gate. Imports `src/traffic.js` directly, so it measures the
  shipping rules rather than a copy of them.

## Balance notes

`node scripts/balance.mjs --runs 400` (seed `0x5afec205`) drives the shipping rules under Node and
enforces the two gates from the design brief:

1. The brief's bot — scans conflicts 3×/s, holds the later-arriving vehicle of every predicted
   junction overlap, 300 ms reaction — must win **25–45 %**.
2. A bot that does nothing must **crash out in under 15 s**.
3. `park-N/S`, which plays the game's one degenerate idea (keep the leading northbound and
   southbound vehicle held, so no conflict pair can exist) and nothing else, must not beat the
   reaction bot by more than **10 points**. Ten is deliberately generous: freezing a lane *is* a
   real tool — it is how you survive a risk truck — it just must not be a way to skip the game.

Every bot is restricted to vehicles that are **on canvas**. Half of each approach runway is off
screen, and a bot braking what the player cannot yet see is not playing the same game.

| canvas | reaction bot | truck-aware bot | park-N/S | do-nothing (2nd crash) |
|---|---|---|---|---|
| 407×612 | 34.3 % | 52.8 % | 5.0 % | 6.3 s |
| 407×556 | 38.5 % | 57.5 % | 5.0 % | 5.4 s |
| 338×452 | 32.5 % | 51.5 % | 4.8 % | 5.5 s |

Stable across seeds: over 3 seeds × 3 sizes the reaction bot spans 32.0–38.5 %, park-N/S 4.3–7.2 %.

The truck-aware line is the skill ceiling: the same bot, plus the one thing the literal brief bot
never learns — when the later-arriving vehicle is a risk truck, hold the *other* one. The ~18-point
spread between the two lines is the risk-truck mechanic measured in win rate. Truck-versus-truck
pairings, the only genuinely unavoidable collision, are 0.3–1.2 % of all crashes: the dispatcher
refuses to create them.

`--sweep` prints the win rate across `road.runwayFrac` and `spawn.conflictBias`; the reasoning
behind both is in the `spawn` comment block in `src/data.js`.

## Build

```
pnpm install
pnpm dev            # http://localhost:5062
pnpm build          # vite build --mode uat — the verification gate
pnpm balance        # node scripts/balance.mjs
```

CRM identity: `safeCrossingLeadNo` / `summaryDtls: 'Safe Crossing Lead'`. Port **5062**.
