# Milestone Hopper

A one-thumb lane hopper. You are a guardian crossing a 48-row course of life
stages: **tap the middle** to hop forward, **tap either side** to steer. Reach the
Retirement gate before the 120-second session ends — and before the arrears tide
behind you does.

## The financial hook

The course is a working life laid out one row at a time. Pavement rows are the
stretches where nothing is coming at you; expense lanes are the years where debt
streams across your path; and past Marriage the ground opens into uncertainty
rivers you can only cross by standing on coverage — the glowing platforms
drifting through the fog.

**Six milestone gates are the progression system and the concept at once.** Each
one is a named life goal that banks a rupee corpus and pays three rewards on the
spot, so reaching a gate is not a checkpoint with a caption on it — it is a
receipt:

| Row | Gate | Goal secured | Corpus banked |
| --- | --- | --- | --- |
| 8 | Graduation | Education fund | ₹5 L |
| 16 | First Job | First term cover | ₹10 L |
| 24 | Marriage | Family cover | ₹25 L |
| 32 | Home | Home loan cover | ₹50 L |
| 40 | Child | Child education | ₹75 L |
| 48 | Retirement | Retirement corpus | ₹1 Cr |

A complete run secures **₹2.65 Cr**, counted up live in the HUD under the
milestone rail.

Every gate pays, in `GAME_CONFIG.rewards`:

1. **Cover renewed** — the cover token is restored if it was spent. Your policy
   renews at every life stage.
2. **+8 seconds** on the session clock. Protection buys back time.
3. **×0.25 compounding** on the earnings multiplier — rows and coins are worth
   25% more per gate reached, so a full run finishes on ×2.50. A secured goal
   makes everything after it worth more.

You **start the run already covered** (`pickups.startWithCover`). That is both the
point the game is making and the single cheapest fix for the first-timer
experience: a blind first hop onto an expense lane used to end the session in
about three seconds.

The arrears tide climbing the course from behind is the reason standing still is
not a strategy.

## Controls

| Input | Action |
| --- | --- |
| Tap the middle ~52% of the screen | Hop forward one row |
| Tap the outer 24% on the left | Hop one cell left |
| Tap the outer 24% on the right | Hop one cell right |

**Direction is resolved on pointer *down*, from where the thumb landed.** It used
to be resolved on pointer *up* (the kit's `onTap` fires from its pointerup
handler), which charged every input in the game the full duration of the finger
being in contact — 60-150 ms before anything moved, on top of a 115 ms hop. More
than half the perceived latency was the input contract, not the physics.

Swipes are deliberately **not** wired. `onSwipe` also fires from pointerup, so
with a pointerdown hop already committed one thumb gesture produced two hops.
The backwards hop went with it and is not missed: the course only scrolls
forward, the tide is behind you, and nothing in the game is improved by
retreating into it.

A hop takes **115 ms**, and **two** inputs are buffered while you are airborne
(newest intent wins), so a double-tap to cross a lane in one committed move
lands both hops. You are counted as occupying the cell you are landing in from
the half-way point of the hop, so chaining cannot phase you through a lane.

Hopping into a planter, off the grid, or **into a cell a debt weight will occupy
when you arrive** is rejected with a bump and a tick rather than being fatal —
see "Balance notes".

## Lane types

- **Pavement** — safe. 0-2 planters block cells. SIP coins and cover tokens live
  here.
- **Expense lane** — two kinds, and they ask different questions:
  - **Debt weights**: a stream of small chamfered cast-iron ledger blocks. A
    timing problem — read the gap, commit, cross.
  - **EMI blocks** (`roads.heavyChance`, 34% of lanes): one or two nearly
    three-cell-wide stacked slabs running at 60% speed. A positioning problem —
    the gap is never in doubt, but you go around it rather than through it.
- **Uncertainty river** (after row 24) — crossable only by landing on a drifting
  coverage platform, which then carries you sideways. Missing the platform, or
  riding one off the edge of the grid, ends the run.
- **Milestone gate** — a full-width safe band with a post at each screen edge, a
  gold arch between them, the goal name and the corpus it banks. It turns green
  with a tick once passed, and glows as you approach it.

## Scoring

| Event | Points |
| --- | --- |
| Each new row reached | 10 × multiplier |
| SIP coin | 25 × multiplier |
| Milestone gate | 300 (flat) |
| Time bonus (win only) | 5 per second left |

The multiplier starts at ×1.00 and rises ×0.25 per gate to ×2.50.
The results screen reports `{ score, rows, coins, milestones, corpus, multiplier }`.

## Win / lose

- **Win** — land on the Retirement row (row 48).
- **Lose** — a debt weight while uncovered, falling into an uncertainty river,
  being caught by the arrears tide, or the 120-second session expiring.

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

Run the gate after touching anything in `GAME_CONFIG`'s `hop`, `roads`,
`rivers`, `rows`, `tide`, `pickups` or `rewards` blocks — all seven move the win
rate:

```bash
node scripts/balance.mjs --courses 200            # ships-with values
node scripts/balance.mjs --courses 200 --baseline # pre-2026-08-03 knobs
```

Course generation is **imported** from `src/course.js`, so the layouts measured
are the layouts the game ships. The update order in the script is a
reimplementation of the component's `update()` — lanes, hop tween, platform
carry, collision, tide — on the same 1/120 s fixed step the kit loop uses. It is
a twin, and a twin can drift: change the order of the guards in `update()` and
you must change them in `balance.mjs` too.

### Measured, 200 generated courses per bot

`--baseline` reverts, in memory only, every knob the 2026-08-03 pass moved
(`hop.seconds`, `hop.bufferDepth`, `hop.coyoteRows`, all three `rewards`,
`roads.heavyChance`, `pickups.startWithCover`), so the same bots on the same
seeds measure the change rather than the bot.

| Bot | Win rate before → after | Median rows | Winning run | Tide deaths | Avg win score |
| --- | --- | --- | --- | --- | --- |
| Casual — 0.22 s reaction, 0.45 s clearance | 46.0% → **58.5%** | 46 → **48** | 12.3-20.6 s | 1.5% | 2,895 → **3,500** |
| Brisk — 0.14 s reaction, 0.30 s clearance | 56.0% → **73.0%** | 48 | 7.6-11.6 s | 1.5% | 2,928 → **3,518** |
| Careful — 0.22 s reaction, 0.75 s clearance, greedy | 46.5% → **63.0%** | 46 → **48** | 14.7-27.1 s | 2.0% | 3,002 → **3,633** |

The gate asserts a 15-80% win band, a slowest win under 75% of the session, tide
deaths under 15% for a moving player, a casual median above 12 rows, at least
0.90 s of standing room in the worst lane generated, and zero unreachable rows.
A winning run now scores ~3,500-3,600, which is why the results ring is
calibrated to `RESULT_TARGET_SCORE = 3900`.

### The readings that needed a specific interpretation

1. **Landing inside a debt weight is rejected, not fatal.** A blind forward hop
   onto an expense lane had a ~35% chance of putting the guardian directly
   inside a weight that was already sitting there. That death has no
   counterplay: at the moment the input is committed there is nothing to react
   to and nothing to time. Measured on the headless random-input bot in
   `scripts/play-test.mjs`, that single case was ending runs in **2-5 seconds**.
   The hop is now rejected with the same bump a planter gets, tested at
   **landing** time so a weight that will have slid clear does not block it. The
   lane still kills you the way a lane should — by something arriving while you
   stand there, which you can see coming.

2. **Lane spacing is authored in seconds, not cells** (`roads.gapSeconds`,
   `[1.8, 1.2]` across segments 0-5). `roads.minGapCells: 2.2` on its own does
   not describe a difficulty: at 220 px/s a 2.2-cell gap is a 0.28 s standing
   window, which is not a crossing, it is a coin flip. Weight count per lane is
   derived from whichever floor binds — the authored cell minimum or the speed's
   own requirement — so the widest part of every gap is worth the same amount of
   *time* whatever the lane is doing. The heavy EMI lane puts its own (much
   wider) hit box into that sum, so it is spaced for the same standing time
   rather than being quietly harder.

3. **The weight wrap cycle is decoupled from the screen.** Wrapping at the
   screen edge forces `gap = screenWidth / count`, tying how sparse a lane can
   be to how many weights are in it. They wrap around a cycle sized from the
   spacing instead, so a fast lane can be genuinely sparse without ever showing
   two copies of the same weight.

4. **`rows.maxRoadRun: 3`.** At the authored safe-row share, runs of five or
   more consecutive roads occur often enough to dominate the death rate: with no
   bank to stand on and read the next lane from, crossing them is luck. Rivers
   get the same treatment more strictly — the row either side of a crossing is
   forced safe, because unlike a road a river cannot be waited out in place.

5. **`pickups.shieldInvulnSeconds: 1.0`.** A cover token that only absorbs the
   hit leaves the guardian standing on the weight that just spent it. The
   invulnerability window is what makes the token a save rather than a stay of
   execution. Gate-granted cover gets half that window, because a gate row is
   already safe ground.

6. **`hop.coyoteRows`.** While airborne the tide measures you at the *further*
   of the two cells, so a hop that was legal at the frame it started is never
   retro-killed by the tide arriving in the cell you have already left.

Two smaller readings survive from the original build: `roads.refCellPx: 56`
converts authored px/s speeds into cells/s, so a lane is not measurably harder
on a narrow phone and so course generation (which runs at mount, before the
canvas is measured) has a cell size to reason about; and
`rivers.edgeGraceCells: 0.28` gives a quarter-cell of forgiveness at a platform
edge, without which a 2-cell platform at 130 px/s is a 0.8 s window with no
margin for the hop.

### Play-test (`node scripts/play-test.mjs milestone-hopper --all-sizes`)

The random-input bot's survival is the crude but honest check that the game is
not hostile to someone who has not read anything. Final build: **13 / 11 / 17 /
28 s** at 320x568, 390x844, 412x915 and 412x700. Across four runs during this
pass (16 samples) the median is **~15 s**, against **8.5 s** before it. It is a
random bot on a hopper, so per-run variance is large by construction — the
balance gate above is the authority on whether a player can win.
