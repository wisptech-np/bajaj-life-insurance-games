# Milestone Hopper

A one-thumb lane hopper. You are a guardian crossing a 48-row course of life
stages: **tap** to hop forward one row, **swipe** to steer. Reach the Retirement
row before the 120-second session ends — and before the risk tide behind you does.

## The financial hook

The course is a working life laid out one row at a time. Pavement rows are the
stretches where nothing is coming at you; roads are the years where risk streams
across your path; and past Marriage the ground opens into uncertainty rivers you
can only cross by standing on coverage — the glowing platforms drifting through
the fog. Six milestone rows mark the run: Graduation (8), First Job (16),
Marriage (24), Home (32), Child (40), Retirement (48).

The risk tide climbing the course from behind is the reason standing still is not
a strategy. Cover tokens are cover in the literal sense: with one active, a virus
costs you the token instead of the run.

## Controls

| Input | Action |
| --- | --- |
| Tap anywhere | Hop forward one row |
| Swipe up | Hop forward one row |
| Swipe left / right | Hop one cell sideways |
| Swipe down | Hop back one row |

A hop takes 120 ms. One input is buffered while you are airborne, so you can
chain hops without waiting for each landing — and chaining is often the answer,
because you are counted as occupying the cell you are landing in from the
half-way point of the hop, not from the landing frame.

Hopping into a planter or off the grid is rejected with a bump and a tick.

## Lane types

- **Pavement** — safe. 0-2 planters block cells. Coins and cover tokens live here.
- **Road** — green virus blobs stream across at a lane-specific speed and
  direction. Contact ends the run unless you are carrying cover.
- **Uncertainty river** (after row 24) — crossable only by landing on a drifting
  coverage platform, which then carries you sideways. Missing the platform, or
  riding one off the edge of the grid, ends the run.
- **Milestone** — full-width safe bands at rows 8, 16, 24, 32, 40 and 48.

## Scoring

| Event | Points |
| --- | --- |
| Each new row reached | 10 |
| Coin | 25 |
| Milestone reached | 300 |
| Time bonus (win only) | 5 per second left |

The results screen reports `{ score, rows, coins, milestones }`.

## Win / lose

- **Win** — land on the Retirement row (row 48).
- **Lose** — a virus while uncovered, falling into a risk river, being caught by
  the tide, or the 120-second session expiring.

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:5038
pnpm build      # uat mode (default); also build:preprod, build:prod
pnpm preview
```

Tunables live in `src/data.js` (`GAME_CONFIG`). Shared game feel — loop, input,
particles, audio, device tiers — comes from `src/kit/`, which is a synced copy of
`shared/game-kit/`. Do not edit `src/kit/` directly; edit the canonical copy and
run `node scripts/sync-game-kit.mjs`.

## Balance notes

Four values in `GAME_CONFIG` needed a specific reading, because the obvious one
makes the course either unfair or unplayable. All four were checked with a
headless simulation of the exact update order — course generation, lane motion,
hop tween, platform carry, collision, tide — driven by scripted players across
200 generated courses.

1. **Lane spacing is authored in seconds, not cells** (`roads.gapSeconds`,
   `[1.8, 1.2]` across segments 0-5). `roads.minGapCells: 2.2` on its own does
   not describe a difficulty: at 220 px/s a 2.2-cell gap is a **0.28 s** standing
   window, which is not a crossing, it is a coin flip. Virus count per lane is
   derived from whichever floor binds — the authored cell minimum or the speed's
   own requirement — so the widest part of every gap is worth the same amount of
   *time* whatever the lane is doing. Measured at 0.7 s of standing room the
   simulated casual player still won 13% of runs and died a median of 17 rows in;
   at 1.8 s down to 1.2 s the same player wins 33% and reaches a median of 33.

2. **The virus wrap cycle is decoupled from the screen.** Wrapping viruses at the
   screen edge forces `gap = screenWidth / count`, which ties how sparse a lane
   can be to how many blobs are in it. They now wrap around a cycle sized from
   the spacing (up to ~24 cells), so a fast lane can be genuinely sparse without
   ever showing two copies of the same blob.

3. **`rows.maxRoadRun: 3`.** At the authored safe-row share, runs of five or more
   consecutive roads occur often enough to dominate the death rate: with no bank
   to stand on and read the next lane from, crossing them is luck. Capping the
   run guarantees a safe island at least every fourth row. Rivers get the same
   treatment more strictly — the row either side of a crossing is forced safe,
   because unlike a road a river cannot be waited out in place.

4. **`pickups.shieldInvulnSeconds: 1.0`.** A cover token that only absorbs the
   hit leaves the guardian standing on the virus that just spent it, so the next
   frame kills them anyway. The invulnerability window is what makes the token a
   save rather than a stay of execution.

Two smaller readings: `roads.refCellPx: 56` converts authored px/s speeds into
cells/s, so a lane is not measurably harder on a narrow phone and so course
generation (which runs at mount, before the canvas has been measured) has a cell
size to reason about; and `rivers.edgeGraceCells: 0.28` gives a quarter-cell of
forgiveness at a platform edge, without which a 2-cell platform at 130 px/s is a
0.8 s window with no margin for the 120 ms hop.

### Measured with the shipped values (200 generated courses)

| Player | Win rate | Median rows | Winning run | Tide deaths |
| --- | --- | --- | --- | --- |
| Casual — 0.22 s reaction, waits for 0.45 s of clearance | 33% | 33 / 48 | 13.6-27.6 s | 1.5% |
| Brisk — 0.14 s reaction, 0.30 s clearance | 28% | 22 / 48 | 8.2-16.8 s | 1.0% |
| Careful — 0.22 s reaction, 0.75 s clearance, collects nearby pickups | 25% | 26 / 48 | 15.0-39.9 s | 2.5% |
| Stops dead at row 10 | 0% | 10 / 48 | — | **40%** |

A winning run scores around 2,860, which is why the results ring is calibrated to
`RESULT_TARGET_SCORE = 2800`.

### The three fairness gates

- **Row 48 is reachable well inside the session.** Winning runs finish in
  **8.2-33.4 s** against a 120 s budget; the clock is a backstop, not the
  opponent.
- **The tide only catches a player who idles.** It needs **124.8 s** to climb
  from row -3 to row 48, longer than the whole session, so it can never overtake
  a player who keeps moving — 1-2.5% of simulated moving runs end in the tide
  against **40%** for a player who stops at row 10. It reaches row 10 at 39.7 s,
  row 20 at 66.1 s and row 30 at 88.7 s.
- **Every road is crossable at every difficulty.** Worst-case standing room in
  the widest part of a gap, measured across every lane generated in 200 courses:

  | Segment | 0 | 1 | 2 | 3 | 4 | 5 |
  | --- | --- | --- | --- | --- | --- | --- |
  | Standing window | 1.80 s | 1.68 s | 1.56 s | 1.44 s | 1.32 s | 1.20 s |
  | Gap between blobs | 2.40 s | 2.14 s | 1.94 s | 1.76 s | 1.60 s | 1.48 s |
  | Fastest lane | 103 px/s | 133 | 163 | 193 | 220 | 220 |

  Rivers cover 44-46% of their cycle with platforms and never make you wait more
  than 3.2 s on the bank. And **no row in 9,600 generated rows** had an open cell
  that could not be reached from the row before it: safe-row planters are
  re-rolled against the previous row's standable set, and cleared outright if six
  attempts fail.

Realised course shape: 42% pavement, 39% road, 7% river, 13% milestone; longest
road run seen, 3.

**Known skill cliff.** The simulation says decisiveness beats caution — a player
who waits for a large gap before stepping onto a road does *worse* (17% vs 33%)
than one who steps on a moderate gap and keeps moving, because the risk is
concentrated in time spent standing on a road, not in the moment of entering one.
That is a real and readable skill, but it is currently unsignposted beyond the
How-to-Play copy. If playtesting shows first-timers parked on the pavement, the
cheapest fix is a nudge in the HUD rather than another spacing change.
