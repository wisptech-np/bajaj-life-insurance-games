---
type: project
title: Smart Recall
description: Simon-style ordered serial recall on a 3x3 board of nine premium goal tiles — the family's plan plays back one pitched tile at a time across seven rounds of 3 to 9 steps, and from round 4 some steps flash red and must be skipped during recall.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/smart-recall
tags:
  - game
  - memory
  - serial-recall
  - inhibition
timestamp: 2026-07-29
---

# Smart Recall

A 3x3 board of nine goal tiles — Health, Home, Education, Retirement, Travel,
Family, Savings, Wedding, Emergency. Each round "the family's plan" plays back
one tile at a time, each tile sounding its own pitch, and then the player
reproduces the sequence **in order** by tapping. Seven rounds of 3, 4, 5, 6, 7,
8 and 9 steps; playback tightens from 460 ms to 300 ms per step. From round 4
some steps flash **red** and must be **skipped** during recall. Three slips or
the 110-second clock ends the run.

## The identity constraint, and how it is met

The store catalogue already contains a `memory-flip` concentration/pairs game,
and the brief makes the distinction mandatory and visual, not just mechanical.
Smart Recall is unmistakably ordered recall:

- **Nothing is ever face-down.** All nine tiles show their icon, their label and
  their colour at all times, on every screen, from the moment the board appears.
- **Nothing ever flips.** There is no flip animation anywhere in the codebase;
  the tile transitions are a resting/lit cross-fade, a press squash and a shake.
- **There are no pairs.** Tiles are never matched to each other and never
  removed. A round is a *sequence*, and the only question is what came next.
- **Order is shown, not implied.** The home screen and the how-to beats light
  tiles one at a time carrying numbered `1 2 3 4` order badges, and the in-game
  progress dots track position-in-sequence rather than pairs-found.

## Financial hook

- **A plan you cannot remember is a plan you do not have.** Nine real life goals,
  and the entire skill is keeping them in the right sequence.
- **The red steps are the risky detours.** They are shown inside the plan and
  look exactly as attractive as everything else; the discipline is leaving out
  the thing that does not belong, not remembering more things.
- **Three slips, and a slip does not wipe the round.** The correct step is shown
  and play resumes. That is the argument for cover in one rule: one mistake is
  survivable, three compound into a forgotten plan.

## Rounds

| Round | Steps | Red steps | Taps | Playback/step |
|---|---|---|---|---|
| 1 | 3 | 0 | 3 | 460 ms |
| 2 | 4 | 0 | 4 | 433 ms |
| 3 | 5 | 0 | 5 | 407 ms |
| 4 | 6 | 1 | 5 | 380 ms |
| 5 | 7 | 2 | 5 | 353 ms |
| 6 | 8 | 2 | 6 | 327 ms |
| 7 | 9 | 2 | 7 | 300 ms |

Generator invariants, all machine-checked: a red step is never first or last;
two red steps are never adjacent; a red tile appears exactly once in its plan
(so the inhibition is "never tap this goal today" rather than a positional
puzzle); no tile appears more than twice back to back; every round meets a
distinct-tile floor and rounds 1-4 always cover at least five different tiles.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, and the nine `GOALS` (hue,
  silhouette, pitch index). Pure: imported by the balance gate under node.
- `src/sequence.js` — the rules. `generateSequence()` is *constructive* rather
  than rejection-sampled: every asserted constraint is enforced while the plan is
  being built, so there is no retry loop that can time out and no fallback path
  that can quietly violate a rule. Also `judgeTap()` / `judgeIdle()`, the scoring
  helpers, and `sessionBudget()` — the arithmetic that proves the clock. Pure.
- `src/SmartRecallGame.jsx` — presentation only. State machine
  `intro → banner → lead → playback → recall → correction → clear` on the kit's
  fixed 120 Hz tick; all mutable state in refs; per-tile animation in four
  `Float32Array`s; HUD via `textContent` refs; eighteen tile faces (nine resting,
  nine lit with the glow baked in) plus the backdrop pre-rendered to offscreen
  bitmaps once per resize; the risk overlay and the idle ring drawn live from
  cached gradients and one reused dash array.
- `src/Screens.jsx` — Home (the real nine-tile board playing a four-step plan
  with numbered order badges and a red skip), How to Play (three animated SVG
  beats: watch the order, tap it back, skip the red), Results (score ring against
  a perfect 5,650, rounds/longest-plan/slips tiles).
- `scripts/balance.mjs` — generator proof, session-budget proof, balance gate.

## Colour grammar

Each of the nine goals owns one hue and one silhouette, and nothing else uses
that hue. **Red (#EF4444) is reserved for exactly one meaning**: the risk flash
and the slip. Red therefore never means "a goal", it always means "do not touch
this" — which is what lets a red step be read instantly at 300 ms. White is the
plan itself (the playback glow); orange is the player's own clock (the idle
countdown ring); green is a cleared round.

## Audio

Kit `createAudio` synth only. Each tile carries a pitch index fed to the kit's
`combo(depth)` voice — 440 Hz x 1.122^depth, a whole-tone ladder over the nine
tiles in reading order — so a plan is a little melody whose contour maps onto the
shape it draws across the grid, and the player's own taps replay it. `hit()` is
the slip sting and the red-step warning, `powerUp()` the round fanfare,
`victory()` / `failure()` the endings.

## Balance and proofs

`node scripts/balance.mjs` imports the shipping modules and never re-implements a
rule. Every gate is asserted on **six** seed blocks, not one.

Four bot archetypes are gated. The first two vary *accuracy* at a fast cadence;
the **careful** bot varies *cadence* at high accuracy, which is the axis the
first review found completely uncovered — every other bot averages 0.62 s/tap, so
the clock never bound for any of them.

| block | seed | honest `0.015 x len` | sharp `0.002 x len` | careful (2.2 s/tap) | careful clock losses |
|---|---|---|---|---|---|
| 1 | 0x5ec0de11 | 38.6% | 99.4% | 99.2% | 0 |
| 2 | 0xc0ffee01 | 34.8% | 99.8% | 99.2% | 0 |
| 3 | 0x3039 | 34.8% | 99.2% | 99.4% | 0 |
| 4 | 0xf3fa3 | 27.6% | 99.4% | 99.4% | 0 |
| 5 | 0xbde31 | 35.8% | 98.6% | 98.4% | 0 |
| 6 | 0x1a2b3c4d | 34.6% | 99.0% | 99.2% | 0 |

Bands: honest 25-45%, sharp >= 90%, careful >= 85% **and zero clock losses** —
an accurate player's only failure mode must be slips. At 20,000 runs per block
the honest bot converges to **32.0-33.1%**, the centre of its band, so the
500-run figures above are sampling noise around a comfortable target rather than
a lucky seed.

A `deliberate` probe at 2.6 s/tap is reported rather than gated, to show where
the edge actually is: 86.8-88.8%, losing 10-12% to the clock, with the pace
warning showing for 77-104 s beforehand.

Adversarial bots: an **idle** bot (never taps) wins 0/60 on every block and is
dead at 19.7 s of wall; a **spam** bot (uniformly random tile) wins 0/200 on
every block and is dead at ~12 s.

Generator: 252,000 plans checked (6 blocks x 6,000 runs x 7 rounds), zero
violations. Max identical-in-a-row 2 (cap 2). Minimum distinct tiles per round
2/3/4/5/5/5/5 against floors of the same. Minimum union across rounds 1-4 was 5.
Tile usage sits inside 10.96%-11.23% of 252,000 steps against an even 11.11%, so
no tile is favoured or starved.

### Session-budget proof — two clocks

The session clock and the wall clock are different quantities here, and the
difference is load-bearing. The clock ticks through `playback`, `recall` and the
slip `correction` — the game presenting the plan, the player answering it, and
the consequence of their own slip. It is **held** through `intro`, `banner`,
`lead` and `clear`: chrome nobody can speed up, which should not eat the
player's thinking time. Wall duration is the clock plus that held time, and
GAME_STANDARD §3 caps *that* at two minutes.

Because a slip *resumes* the round rather than restarting it, the number of
playbacks in a run is exactly seven, so both budgets are exact arithmetic:

```
CLOCK ticks: playback 15.21 s + 3 slip beats 1.80 s      = fixed  17.01 s
CLOCK held : intro 0.60 + 7x(banner 0.75 + lead 0.20
                            + clear 0.35)                = held    9.70 s
35 taps at the 0.70 s budget pace                        =        24.50 s

budget-pace run   clock  41.51 s of 110 s   wall  51.21 s
WORST-CASE WALL   110 + 9.70                    = 119.70 s  of the 120 s cap
PACE CLIFF        (110 - 17.01) / 35            =   2.657 s/tap
```

The gate asserts all three: the budget-pace run fits the session, the worst-case
wall fits the 120 s standard, and the affordable mean tap interval clears its
2.5 s floor. Measured by a fixed-pace sweep of a never-wrong bot, the cliff sits
between **2.70 s/tap (wins 100%) and 2.80 s/tap (loses 100%)**.

**2.994 s/tap is the ceiling for any possible configuration** of this game:
wall is capped at 120 s, playback alone costs 15.21 s of it, and there are 35
taps, so `(120 - 15.21) / 35` bounds the cliff even with every other beat set to
zero. 2.657 is 89% of that. The gate prints `ceilingTapSeconds` alongside the
cliff so the limit is visible rather than assumed.

The remaining edge is covered by signalling rather than by budget — see the pace
cue below. The budget stays a genuine upper bound and is slightly conservative:
round 7's clear beat is billed but never spent, because completing round 7 ends
the run immediately.

### Pace cue

A hard timer always has an edge; what matters is whether the player can see it
coming. The generic low-time pulse cannot do that job — by 20 s left a slow
player's deficit is unrecoverable — and the 5 s idle ring never fires for
someone taking 3 s a step.

So the HUD projects the player's **own measured cadence** over the taps and
playbacks still to come and warns on the headroom that leaves: amber under 12 s
of projected spare, red under 4 s, once three taps have established a pace.
The gate asserts (gate 11) that every clock loss was signalled for at least 15 s
first and that none is ever silent; measured lead for a 2.6 s/tap player is
**77-104 seconds**. The HUD and the gate call the same `paceLevel()` in
`src/sequence.js`, so the cue cannot drift from the proof.

## Ports and commands

Dev server on **5067**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `pnpm balance`,
`node scripts/balance.mjs --runs 5000`.
