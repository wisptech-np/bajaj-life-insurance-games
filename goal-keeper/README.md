# Goal Keeper

Penalty-save reaction game. You are the keeper; behind the net hang three family
milestone banners. Ten penalties, six saves to win, five conceded and it's over.

## Concept

Every penalty is one decision under a deadline.

The striker's run-up carries a **400 ms telegraph** — his body leans, his plant
foot points, and a dotted aim arc shapes toward one of six zones. It tells the
truth on **four shots out of five**. Then the ball is in the air for **550 ms on
shot 1, shortening to 380 ms by shot 10**, and every fourth shot is a **Risk
shot**: 18% faster and worth double.

**Swipe to dive.** The direction of the swipe picks the column, the *length* of
it picks the height — a flick is a dive along the ground, a long throw is a top
corner. Get the zone right and get there before the ball and it is a save.

The catch is that a dive is not instant:

| dive target | travel |
|---|---|
| Low centre (the ball at your feet) | 164 ms |
| Top centre | 237 ms |
| Low left / low right | 296 ms |
| Top left / top right | 340 ms |

That is what turns the shrinking flight into a real ramp rather than a cosmetic
one. Early on you can wait for the ball and still reach anywhere. By the last few
shots, waiting leaves you time for the middle and nothing else — a corner has to
be committed to off the run-up, which is exactly when a feint hurts.

## Financial hook — protection is a decision made before you know the outcome

The mechanic *is* the argument:

- **The tell is honest 80% of the time, and you never know which 80%.** Reading
  it is worth a lot and it is never worth everything. That is risk, not
  ignorance.
- **Waiting for certainty is the losing strategy.** The `waiter` bot in the
  balance sim never guesses — it waits until the ball's path is unambiguous and
  then dives at the right zone every single time. It wins **1.1%** of runs,
  because by then it can only reach the middle. Perfect information that arrives
  too late is worth nothing.
- **Committing early is what works, and it is what exposes you.** The `expert`
  bot commits mid-run-up and wins 95% — and every one of its losses is a feint.
  You cannot have the reach without taking the risk.
- **The Shield glove is cover, not skill.** Three saves in a row earn one. It
  absorbs the next goal you were always going to concede — the one you never saw
  coming. It pays 60 rather than 100+, and it resets your streak, because the
  cover did the work and not the read. It does not make you a better keeper; it
  stops one bad moment ending the run. Measured over 20,000 runs of the gate
  profile: **0.43 gloves earned and 0.40 goals absorbed per run**.
- **Ten shots, not one.** A single penalty is a coin flip. Ten is a record, and
  the streak bonus pays consistency rather than heroics.

## Controls

- **Swipe** anywhere on the pitch to dive. Direction picks left / centre / right;
  swipe **length** picks low or high. A live dashed line previews the zone while
  you drag, and the zone you are aiming at lights up.
- **Release** to commit. One dive per penalty — the keeper cannot change his
  mind, which is the whole point of the telegraph.
- The clock stops the moment your drag passes 18 px, not when you lift off, so
  the length of the swipe itself is never billed against the ball. You then have
  150 ms to shape it; after that the keeper goes with whatever the drag reads,
  finger down or not. Starting a drag early is a blind dive, never free time to
  watch where the ball is actually going.
- A gesture shorter than 18 px is treated as a stray tap, not a dive. A finger
  already resting on the glass during the walk-back is fine — the drag is
  re-anchored when the run-up starts.
- Mute toggle bottom-right. The game auto-pauses when the tab is backgrounded and
  the session clock pauses with it.

## Scoring

| event | value |
|---|---|
| Save | 100 |
| Save on a Risk shot (every 4th) | 200 |
| Streak bonus, per save already in the streak | +25 |
| Perfect zone-centre dive | +50 |
| Goal absorbed by the Shield glove | 60 (streak resets) |
| Goal conceded | 0 |

The streak bonus uses the streak you *already had*, so the first save of a run is
a flat 100 and the fifth in a row is 100 + 100.

**Win:** 6 saves of 10 — reaching it ends the shootout early.
**Lose:** 5 conceded (with 10 shots, a fifth goal makes a sixth save
arithmetically impossible, so the two lines are the same line), or the 100 s
session clock.

Stats contract reported to the results screen: `{score, saves, conceded, streak}`
(`streak` = best streak of the run).

## Zones

Six zones, `zone = col + row * 3`:

|  | left | centre | right |
|---|---|---|---|
| **high** | 3 | 4 | 5 |
| **low** | 0 | 1 | 2 |

A swipe resolves into a continuous aim point — `ax` from −1 (left post) to +1
(right post), `ay` from 0 (grass) to 1 (crossbar) — and the zone is the cell it
lands in. Landing within 0.14 of the cell's centre on both axes is a
**perfect-zone-centre** dive and pays the +50.

## Balance

`scripts/balance.mjs` imports the shipped modules (`src/data.js`, `src/shots.js`,
`src/rules.js`) and never re-implements a rule, so the table below is measured
against the code that ships. Five bot profiles, each with its own band; the
script exits non-zero if any of them misses, if `RESULT_TARGET_SCORE` exceeds the
brute-forced score ceiling, or if a run could exceed the session clock or the
build standard's 120 s cap.

    node scripts/balance.mjs                # the gate: 400 seeded runs/profile
    node scripts/balance.mjs --runs 20000   # tighter confidence
    node scripts/balance.mjs --sweep        # win% across candidate win lines

Measured over 20,000 runs per profile, seed `0x9051f00d`:

| profile | what it does | win% | band | saves/run | score |
|---|---|---|---|---|---|
| **`spec`** (the gate) | honest cue reader: trusts the plant 80% of the time, otherwise guesses among the five zones it did *not* point at; cannot act until the telegraph ends + 150 ms | **33.8%** | 25–45% | 4.17 | 577 |
| `lookahead` | **exploit canary** — ignores the tell, waits for the ball to reveal, then dives at the *true* zone with 60 ms of steering | 21.5% | ≤35% | 3.66 | 592 |
| `expert` | commits mid-run-up, 95% on the plant, still beaten by feints | 95.4% | ≥85% | 5.88 | 1,095 |
| `waiter` | ignores the tell, dives on the revealed ball + 120 ms | 1.1% | ≤35% | 1.62 | 234 |
| `panic` | random zone at ball strike | 0.8% | ≤10% | 1.02 | 124 |

Every profile pays `dive.deviceLatencyMs` (25 ms, the touch pipeline) **and**
`dive.swipeAllowanceMs` (40 ms, the gesture's own travel time) on top of its own
decision time, so the bots carry the same costs a real finger does;
`dive.graceMs` was raised by the sum (25 → 90 ms), so both sides move together
and the band is unchanged. No profile is told whether a shot is a feint. The cue readers see only
`shot.cueZone` (the plant, which is drawn on screen); `waiter` sees the true zone
but only from `revealMs`, when the ball's path is unambiguous. An honest reader
is therefore right on a feint just `0.2 x 1/5 = 4%` of the time — effective read
rate **0.648**, not the 0.673 a bot that secretly knew about the feint and
guessed uniformly over all six zones would score.

Per-shot save rate for the gate profile, shot 1 → 10:

    64.5  64.6  64.9  21.7*  64.4  42.9  43.9  11.0*  22.2  22.0      (* = Risk shot)

The ramp is legible in that row: the first three shots are pure read, and from
shot 6 the corners start closing for anyone reacting rather than anticipating.
17.5% of all penalties are a correct read that arrived too late — the difficulty
is a timing problem, not a guessing problem. The gate profile's saves distribute
0/1/2/3/4/5/6 = 1.2 / 5.5 / 10.8 / 20.5 / 15.6 / 12.6 / **33.8%**, so a losing run
usually reads as one or two saves short rather than hopeless.

### Latency sensitivity (printed on every run)

    +0ms 33.8%  |  +20ms 21.3%  |  +40ms 15.4%  |  +60ms 5.6%  |  +80ms 3.1%  |  +120ms 0.0%

This is the most important number about the design and it is **intrinsic to the
brief's constants, not a tuning artefact**. An honest cue reader is right about
the zone 64.8% of the time, which on its own clears 6-of-10 about three runs in
four; to land at ~34% the timing model has to remove roughly 45 points of win
rate, and it only has a ~200 ms window in which to do it. Five candidate
dive-travel models were measured (spreads from 176 ms to 304 ms between the
nearest and furthest zone) and every one collapsed by +80–120 ms; widening the
spread buys ~2 points at +120 ms while pushing the baseline to the top of the
band. The chosen tuning sits mid-band for the most headroom on both sides.

Two consequences, both acted on:

1. The telegraph is fully legible at **248 ms** rather than 308 ms, which is worth
   roughly 18 points of win rate to a slower player and costs nothing, because the
   sim's bots commit on a fixed clock and never read the render path. The gate
   asserts the resulting budget directly: `248 ms tell + 250 ms nominal reaction
   + 25 ms touch = 523 ms ≤ 550 ms`, the gate bot's commit.
2. The two costs a real finger carries that a bot does not are now **charged
   explicitly** to every profile and paid back through `dive.graceMs` (25 → 90 ms):
   `dive.deviceLatencyMs` (25 ms — a handset eats 20–60 ms between the finger
   moving and the pointer event landing, plus up to one 120 Hz step of stale shot
   clock) and `dive.swipeAllowanceMs` (40 ms — the dive is timed from pointer-up,
   so the 60–140 ms the gesture takes to travel ≥93 px is billed to the player).
   Neither was modelled, and the swipe is the larger of the two: a median player
   sat at **17.0%** against the briefed 25–45% floor, i.e. only the fast tail was
   ever in band. Measured over 20,000 runs, win rate by
   `248 ms tell + reaction + swipe + 25 ms touch`:

       reaction  swipe    grace 50 (was)   grace 90 (now)
         200ms    60ms         61.6%            74.7%
         220ms    80ms         33.8%            61.6%
         250ms   100ms          9.4%            33.8%
         280ms   100ms          3.1%            15.4%

   A 250 ms / 100 ms player now lands on 33.8% — the gate profile's own number,
   because the bot's commit (615 ms) is finally calibrated to what a real finger
   costs (623 ms). `spec` and the `lookahead` canary read 33.8% / 21.5% before
   and after: the model moved, the balance did not.

**Time is only ever handed back through `graceMs`, never as a credit on the
commit clock** — see "Post-review corrections" below for why that distinction is
load-bearing rather than pedantic.

A run takes **49.5 s on average and 61.4 s at its longest** (measured by the same
script from the pacing constants), against a 100 s clock.

### Balance notes — what was corrected and why

The brief's own bot description is arithmetically inconsistent with its target:
`0.8 x 0.8 + 0.2 x (1/6) = 0.673`, not the "effective ~0.55" it quotes, and a
binomial at either figure clears 6 of 10 far more often than 25–45% (≈80% and
≈50% respectively) *before* the Shield glove is counted. Rather than change any
constant the brief names — the 400 ms cue, the 80/20 feint split, the 550→380 ms
flight, six zones, every 4th shot, the glove after three saves, or the ≥6-of-10
win line, all of which ship exactly as specified — the gap was closed by giving
the **dive a travel time** (`dive.baseMs`, `dive.spanMs`, `dive.reach` in
`data.js`), which is a model the brief does not specify but which its own "150 ms
dive-commitment latency" implies. A correct read now also has to be an early
enough read. `dive.spanMs` was tuned from 170 to 220 ms and the top-corner reach
from 0.92 to 1.00 against the sim, moving the gate profile 63.2% → 44.3% → 37.9%
(and to 33.8% once the cue-reader model was made honest, below).

Three presentation constants were added afterwards for playability and cannot
move the gate (the sim's bots commit on a fixed clock):
`shot.cueRampStartFrac` / `cueRampSpanFrac`, which make the telegraph fully
legible at 248 ms so a human can still commit early enough to reach a corner on
the last shots; the centre variant of the plant chevron; and the dotted aim arc,
without which the three centre zones and the entire height axis carried no tell
at all.

### Post-review corrections

- **The dive is timed from when it is finalised, and the swipe-duration cost is
  paid by `graceMs` instead of by a credit.** An intermediate build stamped
  `commitMs` at the *start* of the gesture while resolving the zone at the end,
  to refund the duration of the swipe. That is a 100% win exploit and it measured
  as one: nudge 18 px as the boot meets the ball, then pick the zone while
  watching ~31% of the actual flight, and the clock still reads the nudge —
  4,000 runs, **100.0% win, 6.00 saves of 6**. It is the `waiter` strategy with
  the reaction penalty refunded. Capping the refund does not rescue it either;
  against the `lookahead` canary a credit of just 20 ms scores 91.8% and 40 ms
  scores 98.6%, because the reveal lands at ~34% of flight and the remaining
  ~66% is enough to reach any zone. **Any** refund against the commit clock is
  fatal, so the mechanism was removed rather than retuned, and the original
  concern (a swipe takes real time) is answered by `graceMs` + the earlier tell,
  which move the deadline for everyone and cannot be deferred into. The
  `lookahead` profile now guards the whole exploit class: 21.5% honest, 87.2% at
  a 40 ms credit, against a 35% ceiling.
- **The cue-reader model was made honest.** The gate profile used to branch on
  `shot.truthful` — a keeper who knows he is being lied to — and guessed
  uniformly over all six zones on a feint, scoring 1/6 there. A reader that only
  sees the plant is right on a feint `0.2 x 1/5 = 4%` of the time. Effective read
  rate 0.673 → 0.648, gate profile 37.9% → 33.8%, still comfortably mid-band; no
  retune was needed.
- **`RESULT_TARGET_SCORE` was unreachable.** It shipped at 1600 against a real
  ceiling of 1475 — the run ends on the sixth save, so no run can contain more
  than six scoring saves and the Results ring could never close. Now 1200, with
  `scripts/balance.mjs` brute-forcing the ceiling over all 2^10 save/concede
  sequences and failing the gate if the target exceeds it.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable: the shot timeline,
  dive travel model, swipe→zone mapping, scoring, shield rules, pacing, the
  milestone banners, every effect count.
- `src/shots.js` — **pure.** Seeded shot-plan generation, zone geometry, swipe
  resolution, dive travel. No DOM, no React, no import of `data.js`.
- `src/rules.js` — **pure.** Save judgment, scoring, the Shield glove, win/lose.
- `src/GoalKeeperGame.jsx` — the canvas component. Mutable state in refs, module
  level draw functions, offscreen-prerendered arena. Decides only what a shot
  *looks* like; it contains no rules.
- `src/Screens.jsx` — Home (the goal itself as inline SVG with the six zones, the
  banners and a keeper going with the ball), How to Play (3-beat CSS-animated
  SVG), Results (score ring, saves/conceded/streak tiles, Book a Slot / Retry /
  Home).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

All art is programmatic canvas or inline SVG. No image files, no emoji sprites —
the striker and the keeper are rigs built from arcs and rounded strokes, the ball
is a radial gradient with drawn panels, the net is a clipped line mesh.

## Colour grammar

**Orange** is you — the keeper's kit, the gloves, the swipe line: the thing
standing in the way. **Blue** is the striker and the risk he represents (and the
Shield glove, which is cover rather than reflex). **Green** is a goal kept out.
**Red** is a goal conceded. **Gold** is the telegraph and the milestone banners —
the tell, and the things the tell is protecting.

## Ports and commands

Dev server on **5057**.

    pnpm install
    pnpm dev
    pnpm build            # uat — the verification gate
    pnpm build:preprod
    pnpm build:prod
    pnpm preview
    node scripts/balance.mjs --runs 20000
