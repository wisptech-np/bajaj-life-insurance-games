# Wealth Balloon

Three life goals inflate side by side. One income funds them, and it is not
enough for all three. Shocks are forecast before they land with the exact money
they will take, and one tap buys cover for a fixed premium. Ninety seconds.

## Concept

| element | rule |
|---|---|
| goals | 3 at once, each with a visible target (dashed ring) and a visible deadline |
| funding | HOLD a balloon to move income into it at **76/s**; slide your thumb to switch |
| income | refills at **24/s**, caps at **170** — the drain is ~3× the refill, so holding is a commitment |
| target | `140 + 12 × n` with ±16% jitter; window 19.5 s ±10% |
| deadline | at target or over → funded, score += target. Short → **−40** and the goal is replaced |
| shocks | forecast **4 s** ahead on a named goal; takes **28–72% of that goal's current value** |
| cover | **fixed premium 28**, **10 s** term, absorbs one shock in full then is spent |
| win | **1000** funded inside 90 seconds |

Nothing is hidden. There is no random threshold, no unseen trigger and no coin
flip anywhere in the model — every number the decision needs is on screen before
the decision has to be made.

## Financial hook — insure what you cannot afford to lose, not what is merely likely

The premium never moves. The money at risk moves constantly, because a shock
takes a percentage of whatever that goal is holding *right now*. So every shock
asks the same question with both numbers already printed:

- A balloon holding **180** hit by a **55%** shock loses **99**. Paying **28**
  saves 71. Buy it.
- A balloon holding **30** hit by the same shock loses **16**. Paying **28**
  loses you 12. Do not.

That is the whole of underwriting a household, and it is arithmetic a player does
in their head inside three seconds. Two more things fall out of the model rather
than being asserted:

- **You cannot fund everything.** Income over a session is 2,240 and the ~11.7
  goals that actually fall due are worth ~2,390 — 94%. Arithmetically almost
  enough; practically never, because you cannot be on three balloons at once.
  Spreading it evenly funds nothing: the `spread` bot averages **107** against
  the skilled bot's **1,212**, an 11× gap for doing the fair-sounding thing.
- **Funding flat out makes you uninsurable.** The drain is three times the
  refill, so a player who never lets go can never afford a premium. Cover costs
  the premium *and* the second of funding you gave up to have the premium in
  hand. That is the truest thing in the game.

## Skill, measured

`node scripts/balance.mjs` drives `src/goals.js` — the shipping rules — with bots.
6,000 runs, seed `0xba110032`:

| bot | win% | mean | funded | premiums | lost to shocks |
|---|---|---|---|---|---|
| **skilled** — reads target, deadline and shock size | **87.5%** | 1212 | 7.6 | 225 | 57 |
| **casual** — same screen, late and sloppy | **31.9%** | 845 | 6.1 | 177 | 116 |
| **random** — taps without reading | **0.0%** | 30 | 1.7 | 14 | 678 |
| **idle** — never touches the screen | **0.0%** | 0 | 0.0 | 0 | 0 |
| `spread` (diagnostic) — funds all three equally | 0.0% | 107 | 3.0 | 289 | 110 |
| `never-cover` (diagnostic) — skilled funding, no cover | 10.0% | 606 | 4.9 | 0 | 559 |
| `always-cover` (diagnostic) — skilled funding, covers everything | 44.0% | 944 | 6.6 | 433 | 0 |

The ordering is the design: **skilled 1212 > always-cover 944 > casual 845 >
never-cover 606 > spread 107 > random 30 > idle 0.** Going bare costs 606 points.
Covering indiscriminately gets 338 of that back. Choosing *which* shocks to cover
gets the remaining 268. Cover is not a skin and it is not a mulligan — it is a
decision with a right answer that changes every time.

Stable across seeds: skilled 87.0–88.0%, casual 30.3–32.4%, random 0.0%
(2,000 runs each at seeds 1 / 7 / 12345 / 999983 / 424242).

## Controls

- **Hold** a balloon to fund it. **Slide** to move to another without lifting.
- **Tap COVER** under a balloon to buy cover for 28.
- One thumb, portrait, no other input.

## Tutorial

Three coach prompts inside the live game, each cleared by doing the thing rather
than by a timer: *hold a balloon* → *fill past the dashed ring* → on the first
forecast, *is the red number bigger than 28?*. The How to Play screen plays the
same three beats as a 7-second animated loop first.

## Files

| file | what it is |
|---|---|
| `src/goals.js` | the whole rule set as a pure module — no React, canvas, DOM or browser API. `scripts/balance.mjs` and the game both import it, so there is one copy of the rules |
| `src/data.js` | `GAME_CONFIG`, `COLORS`, `SKIN` — every tunable, with the reasoning |
| `src/WealthBalloonGame.jsx` | the canvas component; mutable state in refs, HUD via `textContent`, no allocation in the hot loop |
| `src/Screens.jsx` | Home, How to Play, Results |
| `src/kit/` | byte-identical copy of `shared/game-kit`, never edited in place |
| `scripts/balance.mjs` | the skill gate; not part of the bundle |

## Port and commands

Dev server on **5059**.

```
pnpm dev
pnpm build            # uat
pnpm build:preprod
pnpm build:prod
pnpm preview
node scripts/balance.mjs [--runs N] [--seed S] [--sweep]
```
