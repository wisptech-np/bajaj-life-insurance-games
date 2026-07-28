# Slide to Safety

**Port 5063 · `slideToSafetyLeadNo` · "Slide to Safety Lead"**

> One swipe at a time, glide your shield past thin ice and bring it home to the family.

## Concept

An ice-slide pathing puzzle on a frozen lake. Swipe up / down / left / right and the shield token
**glides until something stops it** — a rock, the shore, or the family tile. Five handcrafted boards
on a 7 × 9 grid, 120 seconds, three retries.

## Financial hook

The shield is your cover and the lake is a life you cannot see the bottom of. Thin ice is the risk
you can cross once and get away with; stop on it, or push your luck twice, and you are through it.
The three retries are the only second chances you get — which is exactly the argument for having
cover in place before the ice gives way.

## Controls

| Input | Action |
| --- | --- |
| Swipe up / down / left / right | Glide the shield in that direction until it is stopped |
| Arrow keys / WASD | Same, for desktop testing |
| Speaker button | Mute / unmute |

A swipe into a wall is a "bonk": the token thuds, nothing moves, and no move is counted.

## Rules

- **Coins** are collected by passing over *or* stopping on them, once per board (a retry does not
  restock a coin you already banked).
- **The family tile is sticky** — any slide whose path crosses it stops on it and finishes the board.
- **Thin ice** can be crossed at speed exactly once; the crack visibly deepens. Crossing an already
  deepened crack, or *stopping* on any crack, breaks it: the token falls through, the board restarts
  and one of the three retries is spent.
- **The gust lane** shoves a slide that crosses it perpendicular one cell sideways, and the slide then
  carries on in its original direction. The shove is cancelled if the destination is a rock or the
  shore, and a cell reached *by* a shove never re-triggers a gust.

## Scoring

| Event | Points |
| --- | --- |
| Coin | 25 |
| Board complete | 100 |
| …finished in par moves or fewer | +75 |
| …finished in exactly par + 1 | +40 |

Par bonuses are judged on the board's **cumulative** move count across retries, so drowning on purpose
to reset a botched route costs the bonus as well as the retry.

- **Win:** all five boards cleared inside 120 s and the three retries.
- **Lose:** a fourth fall, or the clock.
- Stats contract: `{ score, levels, coins, moves }`.

## Boards

| # | Name | Par | Coins | Thin ice | Gust |
| --- | --- | --- | --- | --- | --- |
| 1 | First Steps | 6 | 4 | — | — |
| 2 | Thin Ice | 8 | 4 | 8 | — |
| 3 | Crosswind | 9 | 4 | 9 | 4 cells (row 2, pushes left) |
| 4 | Cold Snap | 10 | 5 | 10 | — |
| 5 | Bring Them Home | 12 | 5 | 11 | 4 cells (row 8, pushes left) |

Boards 3 and 5 are measured **unreachable** with their gust cells flattened to plain
ice, so the wind is load-bearing rather than decorative.

Boards are ASCII maps in `src/levels.js` with the legend documented at the top of that file.

## Balance / solvability gate

```
node scripts/balance.mjs            # 300 bot seeds (default)
node scripts/balance.mjs --runs 2000
node scripts/balance.mjs --probe    # diagnostics only, never exits 1
```

The script imports the shipping modules (`src/levels.js`, `src/slide.js`, `src/data.js`) and never
re-implements a rule. It asserts, per board:

1. the family tile is reachable;
2. the `par` field equals the BFS optimum over the slide graph;
3. every coin lies on at least one route of length ≤ par + 2;
4. **no reachable state is a dead end** — including every way the player can deepen thin ice, so no
   sequence of legal swipes can strand a player who then has to drown on purpose;

and, across the whole run, that an optimal-line bot with 15 % wrong-swipe noise finishes all five
boards inside the clock and the retries on 25–50 % of seeded runs.

## Build

```
pnpm install
pnpm dev      # http://localhost:5063
pnpm build    # vite build --mode uat  (the verification gate)
```
