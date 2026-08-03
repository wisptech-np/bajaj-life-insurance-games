# Slide to Safety

**Port 5063 · `slideToSafetyLeadNo` · "Slide to Safety Lead"**

> Aim the slide, reach cover, bring the shield home. Hold to plan the route — let go and it is committed.

## Concept

An ice-slide pathing puzzle on a frozen lake. The shield token **glides until something stops it** —
a rock, the shore, a cover point, or the family tile. Five handcrafted boards on a 7 × 9 grid,
120 seconds, three retries.

## Financial hook

The shield is your cover and the lake is a life you cannot see the bottom of. Thin ice is the risk
you can cross once and get away with; stop on it, or push your luck twice, and you are through it.
**Cover points** are the argument made mechanical: spend a move to reach one and a fall costs you a
retry instead of the whole board, and the ice you have already spent comes back.

## Controls — press, drag, release

| Input | Action |
| --- | --- |
| **Press** anywhere on the ice | Opens the aim. All four legal routes ghost in. |
| **Drag** up / down / left / right | Arms that route and draws it in full — every cell, every coin, the thin ice it deepens, and a marker on the cell it stops in. Re-aim as often as you like. |
| **Release** | **Commits.** This is the only thing that moves the shield. |
| Release with no direction | Cancels. Nothing happens. |
| Arrow keys / WASD | The same contract: hold to aim, release to commit. |
| Speaker button | Mute / unmute |

**The commitment point is stated three ways at once**, so it is never in doubt:

- the route dock reads `READY` → `AIMING` → `COMMITTED`;
- the route goes ghost → solid orange → a trail the shield eats as it travels;
- an orange ring closes on the shield the instant your thumb lifts.

A swipe into a wall is a "bonk": the token thuds, nothing moves, no move is counted, and the dock
says `BLOCKED` before you release.

## Rules

- **Coins** are collected by passing over *or* stopping on them, once per board (a retry does not
  restock a coin you already banked).
- **The family tile is sticky** — any slide whose path crosses it stops on it and finishes the board.
- **Cover points are sticky too** — the safe zone catches the shield, which is why it creates a stop
  where the open ice had none. Resting on one:
  1. **banks the board** — it becomes the respawn cell, so the next fall costs a retry, not the run
     back from the start;
  2. **restores the ice** — every fracture you have already deepened re-freezes, re-opening corridors
     you had spent;
  3. **scores 60**, the first time each is reached on a board (a retry does not restock it).
- **Thin ice** can be crossed at speed exactly once; the crack visibly deepens. Crossing an already
  deepened crack, or *stopping* on any crack, breaks it: the token falls through, the board restarts
  at your last cover point, and one of the three retries is spent.
- **The gust lane** shoves a slide that crosses it perpendicular one cell sideways, and the slide then
  carries on in its original direction. The shove is cancelled if the destination is a rock or the
  shore, and a cell reached *by* a shove never re-triggers a gust.

## Scoring

| Event | Points |
| --- | --- |
| Coin | 25 |
| Cover point reached (first time on the board) | 60 |
| Board complete | 100 |
| …finished in par moves or fewer | +75 |
| …finished in exactly par + 1 | +40 |

Par bonuses are judged on the board's **cumulative** move count across retries, so drowning on purpose
to reset a botched route costs the bonus as well as the retry.

- **Win:** all five boards cleared inside 120 s and the three retries.
- **Lose:** a fourth fall, or the clock.
- Stats contract: `{ score, levels, coins, covers, moves }`.

## Boards — the difficulty ramp

| # | Name | New mechanic | Par | Coins | Thin ice | Gust | Cover |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | First Steps | the verb | 6 | 4 | — | — | — |
| 2 | Thin Ice | thin ice | 8 | 4 | 8 | — | — |
| 3 | Crosswind | gust lane | 9 | 4 | 9 | 4 cells (row 2, pushes left) | — |
| 4 | Cover Point | cover point | 11 | 5 | 10 | — | 1 |
| 5 | Bring Them Home | — (all three) | 13 | 5 | 11 | 4 cells (row 8, pushes left) | 2 |

The ramp is gated, not asserted: par strictly increases, no board introduces two new mechanics at
once, the final board carries all of them and is the densest, and the skilled bot's **measured**
falls-per-attempt confirms it — board 1 never drowns it at all, and the back half of the run costs
roughly 0.92 falls per board attempt against 0.37 for the front half (default seed, 300 runs).

Note what that measurement also says: **board 4 is safer per attempt than board 3 despite being two
moves longer.** That is the cover point doing its job, not a hole in the ramp, which is why the gate
asserts "the back half is harder than the front" rather than "each board is deadlier than the last".

Boards 3 and 5 are measured **unreachable** with their gust cells flattened to plain ice. Boards 4
and 5 drop from par 11 → 10 and 13 → 12 with their cover points flattened. Neither mechanic is
decoration.

Boards are ASCII maps in `src/levels.js` with the legend documented at the top of that file.

## Collision — resolve, then follow

A slide is resolved to an exact cell path up front by `src/slide.js`, and the token is then
interpolated **along that path** by `createGlide` / `advanceGlide`. The renderer never integrates a
velocity and never asks "am I inside a rock now", so there is no frame rate at which it can tunnel —
the position and the cell index come from the same eased parameter and cannot disagree.

The speed profile is not a lerp: `glideEase` spends `timing.glideLaunch` of the move coming up to
speed and then holds it into the impact, so the mid-glide speed is 1.124× the average. That is
precisely the regime a per-frame collision test tunnels in, which is why the gate drives the shipped
sampler rather than a re-implementation of it.

## Balance / solvability / anti-tunnelling gate

```
node scripts/balance.mjs            # 300 skilled-bot seeds (default)
node scripts/balance.mjs --runs 2000
node scripts/balance.mjs --probe    # diagnostics + optimal lines, never exits 1
```

The script imports the shipping modules (`src/levels.js`, `src/slide.js`, `src/data.js`) and never
re-implements a rule or a motion curve. It asserts:

1. the family tile is reachable on every board;
2. the `par` field equals the BFS optimum over the slide graph;
3. every coin and every cover point lies on a route of length ≤ par + 2;
4. **no reachable state is a dead end** — including every way the player can deepen thin ice and
   every re-freeze a cover point grants, so no sequence of legal swipes can strand a player who then
   has to drown on purpose;
5. the cover points and the gust lanes are **load-bearing** — flattening either to plain ice must
   change the optimum or remove the route entirely;
6. the **difficulty ramp** above, structurally and behaviourally;
7. **no tunnelling** — every slide out of every reachable state, swept at 120/60/30/15 Hz and again
   at 4× slide speed, enters exactly the resolved path cells in order, and no swept sub-segment ever
   touches a rock or leaves the board;
8. an optimal-line bot with 15 % wrong-swipe noise finishes all five boards inside the clock and the
   retries on **30–60 %** of seeded runs, and a **random-input** bot on under 5 %.

## Build

```
pnpm install
pnpm dev      # http://localhost:5063
pnpm build    # vite build --mode uat  (the verification gate)
```
