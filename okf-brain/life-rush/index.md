---
type: project
title: Life Rush
description: WarioWare-style microgame rush — twelve money moments drawn from a pool of fourteen, one of four gestures each, answered in a window shrinking from 3.5s to 2.6s, three shield lives, held together by a persistent frame of progress track, action window and instruction strip.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/life-rush
tags:
  - game
  - microgame
  - reaction
  - arcade
timestamp: 2026-07-29
---

# Life Rush

## The loop, in one paragraph

Twelve money moments, one gesture each. Each one names itself on a command
banner, waits for its cue, then gives you a shrinking window to answer with one
of four gestures — **TAP, DRAG, SWIPE or HOLD**. Three shields; miss three and
the run is over; survive all twelve and every shield still held pays 200.

## The persistent frame (2026-08-03)

A rush of tiny scenes is unreadable unless the things that never change are drawn
in the same place every time. Four elements, always on, drawn AFTER the phase
overlays so nothing dims them:

| y (stage px) | element |
|---|---|
| 8-13 | **progress track** — twelve segments: green cleared, red failed, pulsing orange the one you are on, dim still to come |
| 18-25 | **action window** — the countdown bar; hatched while the microgame is locked, draining once the cue lands, red under 28% |
| 31-73 | **HUD row** — Score / Shields (captioned, red at one) / Moment n/12 |
| 78-110 | **instruction strip** — the verb chip, the ask, and the money moment, for the WHOLE window |
| 116+ | the 100 x 130 microgame box |

The strip's chip reads **WAIT** in slate until the cue and then flips to the
orange verb: the cue rule, which fails you outright for touching early, finally
has a visible statement. The command word and its hint used to be shown for
1.15 s on the banner and then removed for the entire action window; they now
never leave the screen. `GRAMMAR` and `MOMENTS` live in `src/data.js` and
`scripts/balance.mjs` asserts both are complete for all fourteen.

## The microgames

Twelve rapid micro-challenges, each a single verb, each introduced by a one-word
command banner that slams across the scene — PAY!, SWAT!, PICK!, SHIELD!. The
action window shrinks from 3.5 s on the first to 2.6 s on the twelfth, with a
600 ms breather between and a SPEED UP card every fourth. Three shield lives; a
failed or timed-out microgame costs one. **Get through all twelve with a shield
still held and you win — you may fail up to two and still finish.** Fourteen
microgames exist and twelve are served, so **ten of the fourteen** vary from run
to run: the medium and hard rosters each drop one at random, and the four served
from every band are re-ordered. Dev port **5069**.

## Financial hook

The pitch is the format. Real life does not queue its problems, does not label
them, and does not wait while you decide: a premium falls due, a scam call
arrives, a bonus lands, the rain starts. Fourteen scenes, fourteen reflexes,
each one a financial decision compressed to the two seconds people actually give
it — and three shield lives standing between the ones you fumble and the run
ending. That is what cover is.

Each microgame carries its own small argument. As of 2026-08-03 it is also
**named**: every microgame has a money moment in `MOMENTS` (data.js) which is
shown above the command word on the banner, kept under the ask on the
instruction strip for the whole window, and listed back on the results screen,
so a run adds up to something the player can describe afterwards. The mechanics
still carry the argument on their own — SHIELD! is judged at the instant the rain
lands and only counts if you are still holding the umbrella, so protection has
to already be in place and still be there; GROW! fails both short of the goal and
over it, because a plan that overshoots was still not the plan; SPLIT! ends the
moment the coin lands in WANTS when it was needed; WAKE! gives you exactly one
pass at the 9th.

## The cue rule — the invariant everything hangs off

Every microgame is LOCKED until its cue lands (randomised inside the window),
and a touch before the cue fails it outright. Input is ignored entirely during
the command banner, and a finger that went down before the window opened cannot
act inside it at all (see the stale-gesture guard below).

This is not flavour. A microgame answerable from frame one is not a reaction
test — you touch it immediately, latency costs nothing, and hammering the glass
clears the whole pool. With the cue rule in place, `budget` (seconds after the
cue) is the single honest difficulty knob, and the gate's spam bot — which
hammers from frame one — wins 0.0% of runs rather than most of them.

## The fourteen microgames

Assigned to bands, drawn 4 per band into slots 1-4 / 5-8 / 9-12.

| Band | Microgames | Verb family |
|---|---|---|
| easy (roster of 4, all always served) | PAY!, PICK!, CATCH!, GIFT! | tap a target · tap a choice · tap a moving thing · drag |
| medium (roster of 5, 4 served) | SIGN!, SWAT!, SHIELD!, GROW!, TOP-UP! | swipe a path · swipe a moving thing · sustained drag · hold · a count |
| hard (roster of 5, 4 served) | SNOOZE!, STAMP!, SPLIT!, LOCK!, WAKE! | precision aim · oscillation timing · decision drag · sweep timing · one-shot timing |

The EASY roster is exactly four on purpose: the opening four teach the four verb
families before the run gets fast. It also means the only tier where the set is
fixed is the one where predictability helps the player.

No microgame reuses another's verb+layout, and none clones a catalogue mechanic:
there is no slicing arc scored, no whack grid, no matching puzzle (PICK! is one
identification, once — nothing is hidden or paired), and no falling lane
(CATCH! is a single object with no columns and nothing accumulating).

## Architecture

The contract, in `src/microgames/common.js`:

    init(seed, tier) -> state
    update(state, dt, input)
    render(ctx, state, alpha)
    result(state) -> { done, cleared, at, reason, remaining }

Everything is pure except `render`. `src/LifeRushGame.jsx` is the orchestrator
and holds no rules; `src/scheduler.js` owns the run (plan, lives, scoring,
win/lose); each microgame owns its own inside. `scripts/balance.mjs` therefore
drives exactly the shipped logic of all fourteen, headless.

Microgames lay out props in a fixed **100 x 130 logical box**, letterboxed onto
the canvas by the component, so difficulty is identical on every handset and in
the sim. Pointer positions are converted back into that box by the kit's own
transform hook.

`src/inputBridge.js` sits between the kit's pointer recogniser and the
microgames. It queues events, delivers one EDGE per physics step, and stamps
each press with an EPOCH so that a gesture belonging to an earlier microgame — or
to the command banner — can never resolve into the live window. Tap microgames
commit on pointer-DOWN, not release: a timing game must not secretly measure how
fast you lift your thumb.

## Stats contract

`{score, cleared, bestStreak, perfects}`.

| Event | Value |
|---|---|
| Microgame cleared | 100 |
| Speed / accuracy bonus | `remaining` x 50 |
| Perfect (`remaining` >= 0.75) | +50 |
| Each shield held at the win | +200 |

`remaining` comes from the microgame, not from the scheduler, and has two modes.
**PROMPTNESS** (how much of the answerable window you left, discounting the
irreducible travel time of the gesture itself) for the reaction games, and
**ACCURACY** (how centrally you answered) for the four judged at a fixed instant
— SHIELD!, GROW!, LOCK!, WAKE! — where "faster" is meaningless.

Measured ceiling **2,985** (best legal assignment of the pool, perfect bot;
arithmetic bound 3,000). `RESULT_TARGET_SCORE` is 2,200 and the gate asserts it
against the measured figure, not the arithmetic one.

## Balance

`scripts/balance.mjs` + `scripts/policies.mjs`. Bots may only read what is drawn
(via a `sense()` handed back `latency` seconds STALE, so reaction cost is an old
frame rather than a fudge) and move a finger (real press/move/release,
classified with the kit's own `BALANCE.input` thresholds, so a swipe costs the
time a swipe takes). They never decide whether they succeeded.

One parameter, `latencyMs`, drives reaction, timing jitter, aim noise, drag
speed and read cost.

**4 seed blocks x 500 runs, seed `0x11fe0d5b`:**

| profile | b1 | b2 | b3 | b4 | mean | band | cleared/run | score |
|---|---|---|---|---|---|---|---|---|
| **`honest` 260 ms (the gate)** | 28.2% | 35.6% | 34.0% | 32.0% | **32.5%** | 25–45% | 7.31 | 989 |
| `sharp` 120 ms | 99.8% | 100.0% | 99.8% | 98.8% | **99.6%** | >=90% | 11.50 | 2,172 |
| `perfect` 0 ms | 100% | 100% | 100% | 100% | **100%** | >=98% | 12.00 | 2,961 |
| `idle` | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=0.1% | 0.00 | 0 |
| `spam` (from frame one) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=1% | 0.00 | 0 |
| `mash` (after the cue) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=10% | 0.39 | 45 |

### Microgame x tier x perfect-bot clear rate

The assertion is >=98% at the hardest slot; measured at every slot, the perfect
bot clears **every one of the 56 cells at 100.0%**:

| microgame | band | slot A | slot B | slot C | slot D | sharp @hardest | honest @hardest | best `remaining` |
|---|---|---|---|---|---|---|---|---|
| pay | easy | 1: 100.0% | 2: 100.0% | 3: 100.0% | 4: 100.0% | 100.0% | 76.7% | 0.98 |
| pick | easy | 1: 100.0% | 2: 100.0% | 3: 100.0% | 4: 100.0% | 100.0% | 80.3% | 0.98 |
| catch | easy | 1: 100.0% | 2: 100.0% | 3: 100.0% | 4: 100.0% | 100.0% | 62.8% | 0.98 |
| gift | easy | 1: 100.0% | 2: 100.0% | 3: 100.0% | 4: 100.0% | 99.9% | 62.7% | 0.91 |
| sign | medium | 5: 100.0% | 6: 100.0% | 7: 100.0% | 8: 100.0% | 100.0% | 67.8% | 0.99 |
| swat | medium | 5: 100.0% | 6: 100.0% | 7: 100.0% | 8: 100.0% | 100.0% | 50.9% | 1.00 |
| shield | medium | 5: 100.0% | 6: 100.0% | 7: 100.0% | 8: 100.0% | 97.9% | 79.4% | 1.00 |
| grow | medium | 5: 100.0% | 6: 100.0% | 7: 100.0% | 8: 100.0% | 98.8% | 75.5% | 1.00 |
| topup | medium | 5: 100.0% | 6: 100.0% | 7: 100.0% | 8: 100.0% | 97.8% | 75.7% | 0.98 |
| snooze | hard | 9: 100.0% | 10: 100.0% | 11: 100.0% | 12: 100.0% | 97.5% | 60.7% | 0.99 |
| stamp | hard | 9: 100.0% | 10: 100.0% | 11: 100.0% | 12: 100.0% | 70.5% | 50.0% | 1.00 |
| split | hard | 9: 100.0% | 10: 100.0% | 11: 100.0% | 12: 100.0% | 100.0% | 69.2% | 0.93 |
| lock | hard | 9: 100.0% | 10: 100.0% | 11: 100.0% | 12: 100.0% | 78.7% | 54.5% | 0.90 |
| wake | hard | 9: 100.0% | 10: 100.0% | 11: 100.0% | 12: 100.0% | 83.6% | 62.3% | 0.92 |

Mean at the hardest slot: honest 66.3%, sharp 94.6%. `best remaining` is the
best score-quality the perfect bot can post there; all fourteen clear the 0.75
PERFECT threshold, which the gate now asserts — the gold bonus is reachable on
every microgame rather than on some of them.

In-run honest clear rates (a microgame is served at any of its four slots):
pay 81.5% · pick 86.2% · catch 69.1% · gift 74.3% · sign 79.4% · swat 58.7% ·
shield 81.8% · grow 79.5% · topup 81.2% · snooze 63.5% · stamp 51.1% ·
split 82.6% · lock 61.7% · wake 68.0%. Outcomes: cleared 74.2%, out of time
16.2%, then crooked 2.3%, tumblers thrown 1.9%, missed the 9th 1.3%, soaked
1.0%, too slow on the double tap 1.0%, overflowed 0.8%, under the line 0.7%, let
go of the umbrella 0.3%, impulse buy 0.2%, too early 0.2%.

### Session budget

Longest possible run — twelve microgames all running to the buzzer with two
failed (a third ends it) — **71.0 s**, against the 110 s budget, the 110 s
backstop clock and the build standard's 120 s cap. The honest bot averages
40.8 s, longest observed 50.1 s.

### Latency sensitivity

    60ms 100.0% | 120ms 99.6% | 180ms 93.2% | 220ms 72.8% | 260ms 27.6% | 300ms 7.6% | 360ms 0.0%

Steep by construction: twelve independent challenges multiply, and a rush has no
strategy to fall back on. Printed on every gate run so it cannot quietly worsen.

## Corrections against the brief

Three, all measured, all in `log.md`:

1. **Session length 75-100 s -> ~57-71 s.** The brief's own constants fix the
   playable time at 12 x mean(3.05 s) = 36.6 s. Reaching 75 s needs ~3.2 s of
   framing per microgame, which is dead air in a format whose whole point is
   pace. Shipped framing gives a 71.0 s worst case and ~41 s typical, inside the
   global "fast-arcade 60-110 s" constraint and well inside the 110 s assertion.
2. **The cue rule** (not in the brief). Without it the pool is spam-clearable
   and latency is free; measured, the spam bot goes to 0.0%.
3. **State passed explicitly** to `update` / `render` / `result` rather than
   hidden in the module, so the sim can run thousands of instances and two
   mounted copies cannot corrupt each other.

## Colour grammar

Orange is the action — whatever the command word wants your finger on, in every
scene. Blue is paperwork and cover: policies, cards, jars, the vault, the
umbrella, the shield pips. Green is a microgame cleared. Red is the pressure
closing in: the due stamp, the rain band, the scam call, the popup. Gold is
money — coins, the SIP fill, the bonus ribbon.

## Ports and commands

Dev server on **5069**. `pnpm install`, `pnpm dev`, `pnpm build` (uat — the
verification gate), `pnpm build:preprod`, `pnpm build:prod`, `pnpm preview`,
`node scripts/balance.mjs`, `node scripts/balance.mjs --table --why`.
