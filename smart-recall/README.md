# Smart Recall

Simon-style **ordered serial recall** on a 3x3 board of premium goal tiles. "The
family's plan" plays back one tile at a time — each tile has its own pitch, so a
sequence is a short melody drawn across the grid — and then you reproduce it in
order by tapping. From round 4 some steps flash **red**: those are risky detours
and must be **skipped**, which turns recall into a go/no-go inhibition task on
top of a serial one.

**This is not a pairs game.** Nothing is ever face-down, nothing flips, and there
is nothing to match. All nine tiles show what they are at all times — the whole
difficulty is the ORDER. (The wider catalogue already contains a
concentration/memory-flip title; keeping this distinction visually obvious is a
hard requirement of the brief, so the home and how-to screens both show face-up
tiles carrying numbered order badges.)

## Financial hook

- **A plan you cannot remember is a plan you do not have.** Nine real goals —
  Health, Home, Education, Retirement, Travel, Family, Savings, Wedding,
  Emergency — and the game is entirely about keeping them in the right sequence.
- **The red steps are the risky detours.** They look exactly as tempting as
  every other goal and they are shown to you in the same breath as the plan. The
  discipline being tested is not "can you remember more", it is "can you leave
  out the thing that does not belong".
- **Three slips and the plan is forgotten.** Slips are finite and they are
  spent, not earned — but a slip does not wipe the round: the correct step is
  shown and you carry on. Cover works the same way; the point of it is that one
  mistake is not the end of the plan.
- **The plans get longer, and faster.** Three steps at 460 ms becomes nine steps
  at 300 ms. Real plans do not stay small either.

## Rounds

| Round | Steps | Red steps to skip | Taps required | Step period | Lit / dark |
|---|---|---|---|---|---|
| 1 | 3 | — | 3 | 460 ms | 285 / 175 ms |
| 2 | 4 | — | 4 | 433 ms | 269 / 165 ms |
| 3 | 5 | — | 5 | 407 ms | 252 / 154 ms |
| 4 | 6 | 1 | 5 | 380 ms | 236 / 144 ms |
| 5 | 7 | 2 | 5 | 353 ms | 213 / 140 ms |
| 6 | 8 | 2 | 6 | 327 ms | 187 / 140 ms |
| 7 | 9 | 2 | 7 | 300 ms | 160 / 140 ms |

The dark gap is floored at 140 ms rather than left at a flat 62% duty: below
about 100 ms two flashes of the *same* tile fuse into one perceived event, and a
flat duty put round 7 at 114 ms — thinnest exactly where the plans are longest.
Flooring the gap shortens the glow, not the period, so playback duration and the
whole budget below are unchanged.

A red step is never the first or the last step of a plan, two red steps are
never adjacent, and a red tile appears **exactly once** in its plan — so "this
goal is a risky detour today" is unambiguous rather than positional.

## Controls

Tap a tile. That is the whole input. Presses register on `pointerdown` rather
than on release, because a recall board has to answer the instant the thumb
lands.

- Wrong tile → slip. The correct tile is shown for 0.6 s, then recall resumes at
  the next step.
- 5 s of silence during your turn → slip. A countdown ring runs around the board
  and turns red as it closes.
- 3 slips, or the 110 s clock, ends the run. The clock only runs while the game
  is showing the plan or waiting for you — round cards and celebrations are free.

## Scoring

| Event | Points |
|---|---|
| Correct step | 25 x round number |
| Round cleared | 150 |
| Round cleared with no slips | +100 |

A perfect run is **5,650**.

Stats contract: `{score, rounds, bestLen, slips}`.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS` and the nine `GOALS` (hue, silhouette,
  pitch). The clock, slips, the round table, the playback ramp, scoring, the bot
  model and every effect count. No DOM, no React.
- `src/sequence.js` — the rules. The plan generator is *constructive*: every
  constraint the gate asserts is enforced while the plan is being built, so
  there is no rejection loop that can time out and no fallback that quietly
  breaks a rule. Also the judge, the scoring helpers and `sessionBudget()`. Pure.
- `src/SmartRecallGame.jsx` — presentation only: geometry, the
  `intro → banner → lead → playback → recall → correction → clear` state machine
  on the kit's fixed 120 Hz tick, all mutable state in refs, HUD through
  `textContent` refs, and eighteen tile faces (nine resting, nine lit with the
  glow baked in) pre-rendered to offscreen bitmaps once per resize.
- `src/Screens.jsx` — Home (the real nine-tile board lighting a 4-step plan with
  numbered order badges), How to Play (three animated SVG beats), Results (score
  ring against a perfect run, rounds/longest-plan/slips tiles).
- `scripts/balance.mjs` — the generator proof, the session-budget proof and the
  balance gate. Not bundled.

## Audio

Kit synth only (`createAudio`), no files. Each tile owns a pitch index fed to the
kit's `combo(depth)` voice (440 Hz x 1.122^depth — a whole-tone ladder over the
nine tiles), so playback and your own taps play the same melody. `hit()` is the
slip sting and the red-step warning, `powerUp()` the round fanfare, `victory()` /
`failure()` the run endings.

## Balance and proofs

`node scripts/balance.mjs` imports the shipping modules and never re-implements
a rule. It asserts, **on every one of six seed blocks**:

1. **Generator** — lengths match the table; no tile appears more than twice in a
   row; red steps never first/last and never adjacent; a red tile occurs exactly
   once; every round meets its distinct-tile floor and rounds 1-4 cover >= 5
   distinct tiles; `expected` equals the plan minus its red steps.
2. **Budget** — the worst-case session fits the clock (below).
3. **Honest bot** (`p = 0.015 x len` per tap) wins 25-45%.
4. **Sharp bot** (`p = 0.002 x len`) wins >= 90%.
5. **Idle bot** (never taps) and **spam bot** (random tile) win 0 runs.
6. No simulated run, won or lost, exceeds the 110 s clock.

7. **Careful bot** — accurate but unhurried (2.2 s/tap) — wins >= 85% **and
   never loses to the clock**. This is the cadence axis: every other bot averages
   0.62 s/tap, so without it the clock is never exercised at all.
8. **Pace cue** — every clock loss must have been signalled for >= 15 s first,
   and none may be silent.

Measured (gate PASS, 6 blocks x 500 runs, 252,000 generated plans):

| bot | per-block win rate (blocks 1–6, in order) |
|---|---|
| honest `p = 0.015 x len` | 38.6 / 34.8 / 34.8 / 27.6 / 35.8 / 34.6 % |
| sharp `p = 0.002 x len` | 99.4 / 99.8 / 99.2 / 99.4 / 98.6 / 99.0 % |
| careful (2.2 s/tap) | 99.2 / 99.2 / 99.4 / 99.4 / 98.4 / 99.2 %, **0 clock losses** |
| deliberate (2.6 s/tap, reported) | 87.8 / 87.8 / 88.3 / 88.8 / 86.8 / 88.8 % |
| idle (never taps) | 0/60 every block, dead at 19.7 s |
| spam (random tile) | 0/200 every block, dead at ~12 s |

At 20,000 runs per block the honest bot settles at **32.0% – 33.1%**, i.e. the
centre of the band rather than an edge of it.

### Session-budget proof — two clocks

The session clock and the wall clock are different quantities. The clock ticks
through **playback, recall and the slip correction** — the game presenting the
plan, you answering it, and the cost of your own slip. It is **held** through the
intro, the round banners, the lead-ins and the round-clear beats: chrome you
cannot speed up should not eat your thinking time. Wall duration is the clock
plus that held time, and it is what the 2-minute standard caps.

Because a slip *resumes* rather than restarting the round, a run contains exactly
seven playbacks, so both budgets are exact arithmetic:

```
CLOCK ticks: playback 15.21 s + 3 slip beats 1.80 s   = fixed  17.01 s
CLOCK held : intro 0.60 + 7x(banner 0.75 + lead 0.20
                            + clear 0.35)             = held    9.70 s
35 taps at the 0.70 s budget pace                     =        24.50 s

budget-pace run   clock  41.51 s of 110 s    wall  51.21 s
WORST-CASE WALL   110 + 9.70                     = 119.70 s  of the 120 s cap
PACE CLIFF        (110 - 17.01) / 35             =   2.657 s/tap
```

So a player may average **2.66 s per tap** and still finish. Measured by a
fixed-pace sweep of a never-wrong bot, the cliff sits between **2.70 s/tap (wins
100%)** and **2.80 s/tap (loses 100%)**.

**2.994 s/tap is the hard ceiling for any possible version of this game**: wall
is capped at 120 s, playback alone costs 15.21 s of it, and there are 35 taps, so
`(120 - 15.21) / 35` bounds the cliff even with every other beat set to zero.
2.657 is 89% of that ceiling.

### Pace cue

Because a hard timer always has an edge, the HUD makes it visible. It projects
your **own measured cadence** over the taps and playbacks still to come and warns
on the headroom that leaves — amber under 12 s of projected spare, red under 4 s,
once three taps have set a pace. It is distinct from the per-step idle ring, and
it fires early: a 2.6 s/tap player sees it **77–104 seconds** before the buzzer.
The gate and the HUD call the same `paceLevel()`, so the cue cannot drift from
the proof.

## Ports and commands

Dev server on **5067**.

```
pnpm install
pnpm dev
pnpm build          # vite build --mode uat — the hard gate
pnpm build:preprod
pnpm build:prod
pnpm preview
pnpm balance                            # full gate
node scripts/balance.mjs --runs 5000    # more runs per seed block
node scripts/balance.mjs --probe        # diagnostics only, never exits 1
```
