# Life Rush

A WarioWare-style microgame rush for Bajaj Life. Twelve one-verb challenges in a
row, each introduced by a single command word — **PAY!**, **SWAT!**, **PICK!**,
**SHIELD!** — and each answered in one gesture. The action window shrinks from
**3.5 s to 2.6 s** across the run. Three shield lives; a miss costs one, three
misses ends it. Survive all twelve with a shield still held and you win.

Dev server on port **5069**.

## Concept

Life does not announce which problem is arriving next, and it does not wait
while you work out what to do about it. The whole game is that sentence turned
into a mechanic: a word slams in, a scene is already live, and you have less
than a second of useful thinking time. Cover is the thing that answers when you
cannot.

Fourteen microgames exist; twelve are served per run, drawn as a seeded shuffle
from three difficulty bands, so nine of the fourteen change between runs.

## Financial hook

Each microgame is one financial reflex, and the failure states are the argument:

| Microgame | The reflex | What failing it means |
|---|---|---|
| **PAY!** | Pay the premium before the due-date stamp lands | A missed date is a lapsed policy |
| **PICK!** | Choose the cover that matches the claim | The wrong cover is no cover |
| **CATCH!** | Catch the piggy bank before it passes the shelf | Savings you did not reach for |
| **GIFT!** | Drag the bonus into the retirement box | A windfall that was never allocated |
| **SIGN!** | Sign along the dotted line | Paperwork left unfinished |
| **SWAT!** | Swipe the scam call away | The thing that gets you when you are busy |
| **SHIELD!** | Hold the umbrella over the family until the rain lands | Protection has to be in place *before*, and still there |
| **GROW!** | Hold the SIP fill, release inside the goal band | Under-invest or overshoot — both miss the plan |
| **TOP-UP!** | Double-tap the health cover | Enough, and not more than enough |
| **SNOOZE!** | Close the impulse-buy ad | The small X your thumb keeps missing |
| **STAMP!** | Stamp the claim square in the seal | Approval is a moment, not a mood |
| **SPLIT!** | Drop the salary coin in NEEDS or WANTS | Every rupee is one or the other |
| **LOCK!** | Tap the vault dial on the green notch | Locking it in has a window |
| **WAKE!** | Tap the alarm exactly on the 9 | The premium date comes round once |

## The cue rule

Every microgame is **locked until its cue** — the stamp starts falling, the ad
pops, the banner reveals which jar — and touching it before then fails it
outright ("jumped in early"). Input is ignored entirely during the command
banner, so the only way to jump the gun is to act inside the window but ahead of
the cue.

This is the single invariant the whole difficulty model hangs off. Without it a
microgame whose target is answerable from frame one is not a reaction test at
all: you touch it immediately, latency never costs anything, and a player who
just hammers the glass clears the entire pool. The balance gate carries a spam
bot precisely to keep that shut — it wins 0.0% of runs.

## Controls

| Verb | Microgames | Judged on |
|---|---|---|
| Tap | PAY!, PICK!, CATCH!, SNOOZE!, STAMP!, LOCK!, WAKE! | pointer **down** |
| Double tap | TOP-UP! | both downs, gap measured down-to-down |
| Swipe | SIGN!, SWAT! | pointer up (a stroke is a stroke) |
| Drag | GIFT!, SPLIT! | down, move, up |
| Sustained drag | SHIELD! | must still be held when judged |
| Hold | GROW! | down, then release |

Taps commit on pointer-DOWN, not release: a timing game must not secretly be
measuring how fast you lift your thumb.

## Scoring

| Event | Value |
|---|---|
| Microgame cleared | 100 |
| Speed / accuracy bonus | `remaining` x 50 |
| Perfect (`remaining` >= 0.75) | +50 |
| Each shield still held at the win | +200 |

`remaining` comes from the microgame, not the scheduler, and has two modes.
**PROMPTNESS** — how much of the answerable window you left, discounting the
irreducible travel time of the gesture itself — for the reaction games; and
**ACCURACY** — how centrally you answered — for the four judged at a fixed
instant (SHIELD!, GROW!, LOCK!, WAKE!), where "faster" is meaningless.

Stats contract: `{score, cleared, bestStreak, perfects}`.
Measured ceiling **2,985** (best legal assignment of the pool, perfect bot;
arithmetic bound 3,000). The Results ring closes at 2,200
(`RESULT_TARGET_SCORE`), asserted by the gate against the MEASURED figure.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`; every tunable in one place,
  including a `micro` block per microgame (cue window, budget, prop geometry).
- `src/rng.js` — **pure**: mulberry32, shuffle, gaussian. One 32-bit seed
  determines an entire run.
- `src/scheduler.js` — **pure**: the run plan, lives, scoring, win/lose lines,
  and `runSeconds()` (which is how the session budget is proved).
- `src/microgames/common.js` — the contract, the shared input model, and the
  vector-art primitives.
- `src/microgames/*.js` — fourteen microgames, one file each, against the
  contract `init(seed, tier)` / `update(state, dt, input)` /
  `render(ctx, state, alpha)` / `result(state)`.
- `src/microgames/index.js` — the registry. Adding a microgame is: write it,
  import it, list it.
- `src/LifeRushGame.jsx` — the orchestrator: beats, HUD, particles, stings. It
  contains no gameplay rules at all.
- `src/Screens.jsx` — Home (the game's own frame with command words slamming
  through), How to Play (3 CSS-animated SVG beats), Results (score ring,
  cleared / streak / perfects tiles, Book a Slot).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` + `scripts/policies.mjs` — the balance gate; not part of
  the bundle.

Microgames lay out props in a fixed **100 x 130 logical box** which the component
letterboxes onto the canvas. A microgame's geometry — and therefore its
difficulty — is identical on a 320 px handset, a 430 px one, and in the headless
sim.

Rendering is programmatic canvas and inline SVG only. No image files, no emoji
sprites: the piggy bank, the umbrella, the vault dial, the alarm clock, the
salary coin and the rest are arcs, rounded rects and gradients. The game ships
with zero binary assets.

## Audio

Kit synth only (`src/kit/audio.js`), and no timers: stings are scheduled into a
fixed array and flushed from the game loop, so pausing and teardown are free.
Each microgame owns a distinct **two-tone sting** (a pair of `combo` pitches)
played as its banner lands, so twelve scenes in a row never blur together. The
SPEED UP jingle is a four-note run that starts a step higher each time.

## Balance

`scripts/balance.mjs` imports the shipped `data.js`, `rng.js`, `scheduler.js`
and all fourteen microgames and drives their real `init` / `update` / `result`.
It never re-implements a rule.

The bots do not decide whether they succeeded — the shipped microgame does.
A bot may only look at what is drawn (through a `sense()` that copies a handful
of on-screen facts, handed back **`latency` seconds stale**, so reaction cost is
a genuinely old frame rather than a fudge factor) and move a finger (a real
press / move / release, classified with the kit's own `BALANCE.input`
thresholds, so a swipe costs the time a swipe takes).

One parameter drives everything: `latencyMs`.

    reaction  = latency x (1 + 0.30 x N(0,1)), floored at 0.35 x latency
    timing    = N(0, 0.30 x latency) on any instant the bot aims for
    aim       = N(0, 1.4 + 0.0135 x latency) logical units on any point touched
    dragSpeed = 260 - 0.25 x latency units/sec
    readCost  = 0.35 x latency before a CHOICE (PICK!, SPLIT!)

**4 seed blocks x 500 runs, seed `0x11fe0d5b`:**

| profile | block1 | block2 | block3 | block4 | mean | band | cleared/run | score |
|---|---|---|---|---|---|---|---|---|
| **`honest`** (260 ms — the gate) | 28.2% | 35.6% | 34.0% | 32.0% | **32.5%** | 25–45% | 7.31 | 989 |
| `sharp` (120 ms) | 99.8% | 100.0% | 99.8% | 98.8% | **99.6%** | >=90% | 11.50 | 2,172 |
| `perfect` (0 ms) | 100% | 100% | 100% | 100% | **100%** | >=98% | 12.00 | 2,961 |
| `idle` (never touches the glass) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=0.1% | 0.00 | 0 |
| `spam` (hammers from frame one) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=1% | 0.00 | 0 |
| `mash` (waits for the cue, then hammers) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=10% | 0.39 | 45 |

Per-microgame clear rate for the honest bot, in-run: pay 81.5% · pick 86.2% ·
catch 69.1% · gift 74.3% · sign 79.4% · swat 58.7% · shield 81.8% · grow 79.5% ·
topup 81.2% · snooze 63.5% · stamp 51.1% · split 82.6% · lock 61.7% · wake 68.0%.
Outcomes: cleared 74.2%, out of time 16.2%, and the rest spread across each
microgame's own failure (crooked stamp 2.3%, tumblers thrown 1.9%, missed the
9th 1.3%, soaked 1.0%, too slow on the double tap 1.0%, overflowed 0.8%, under
the line 0.7%, let go of the umbrella 0.3%, impulse buy 0.2%, too early 0.2%).

**Nothing in the pool is impossible.** The perfect bot clears every microgame at
every slot it can be served in — the assertion the gate enforces is >=98% at the
hardest slot, and `--table` prints the whole grid, all 56 cells at 100.0%:

| microgame | band | slot A | slot B | slot C | slot D | sharp @hardest | honest @hardest | best `remaining` |
|---|---|---|---|---|---|---|---|---|
| pay | easy | 1: 100% | 2: 100% | 3: 100% | 4: 100% | 100.0% | 76.7% | 0.98 |
| pick | easy | 1: 100% | 2: 100% | 3: 100% | 4: 100% | 100.0% | 80.3% | 0.98 |
| catch | easy | 1: 100% | 2: 100% | 3: 100% | 4: 100% | 100.0% | 62.8% | 0.98 |
| gift | easy | 1: 100% | 2: 100% | 3: 100% | 4: 100% | 99.9% | 62.7% | 0.91 |
| sign | medium | 5: 100% | 6: 100% | 7: 100% | 8: 100% | 100.0% | 67.8% | 0.99 |
| swat | medium | 5: 100% | 6: 100% | 7: 100% | 8: 100% | 100.0% | 50.9% | 1.00 |
| shield | medium | 5: 100% | 6: 100% | 7: 100% | 8: 100% | 97.9% | 79.4% | 1.00 |
| grow | medium | 5: 100% | 6: 100% | 7: 100% | 8: 100% | 98.8% | 75.5% | 1.00 |
| topup | medium | 5: 100% | 6: 100% | 7: 100% | 8: 100% | 97.8% | 75.7% | 0.98 |
| snooze | hard | 9: 100% | 10: 100% | 11: 100% | 12: 100% | 97.5% | 60.7% | 0.99 |
| stamp | hard | 9: 100% | 10: 100% | 11: 100% | 12: 100% | 70.5% | 50.0% | 1.00 |
| split | hard | 9: 100% | 10: 100% | 11: 100% | 12: 100% | 100.0% | 69.2% | 0.93 |
| lock | hard | 9: 100% | 10: 100% | 11: 100% | 12: 100% | 78.7% | 54.5% | 0.90 |
| wake | hard | 9: 100% | 10: 100% | 11: 100% | 12: 100% | 83.6% | 62.3% | 0.92 |

`best remaining` is the best score-quality the perfect bot can post at that
microgame's hardest slot. All fourteen clear the 0.75 PERFECT threshold and the
gate asserts it, so the gold bonus cannot silently become unreachable on a
microgame.

The gate also asserts, on every seed block: no microgame is served twice in a
run; every microgame resolves inside its own action window (no hangs, no
overruns); `RESULT_TARGET_SCORE` (2,200) is at or below the MEASURED ceiling
(2,985); the countdown bar empties on every timeout and its low-time red state
is actually reached (42.0% of microgames); a gesture that began before the
action window opened cannot resolve inside it (five stale-finger cases driven
through the shipped kit recogniser); and the longest possible session fits the
budget.

**Session length.** The longest run physically possible — all twelve microgames
running to the buzzer with two of them failed (a third ends the run) — is
**71.0 s**, against the 110 s budget and the build standard's 120 s cap. The
honest bot averages 40.8 s with a longest observed run of 50.1 s.

**Latency sensitivity, printed on every gate run:**

    60ms 100.0% | 120ms 99.6% | 180ms 93.2% | 220ms 72.8% | 260ms 27.6% | 300ms 7.6% | 360ms 0.0%

That curve is steep on purpose and is intrinsic to the format: twelve
independent challenges multiply, so a rush has no strategy to fall back on. It
is printed every run so it can never quietly get worse.

## Ports and commands

Dev server on **5069**. `pnpm install`, `pnpm dev`, `pnpm build` (uat — the
verification gate), `pnpm build:preprod`, `pnpm build:prod`, `pnpm preview`,
`node scripts/balance.mjs`, `node scripts/balance.mjs --table --why`,
`node scripts/balance.mjs --runs 2000 --blocks 6`.