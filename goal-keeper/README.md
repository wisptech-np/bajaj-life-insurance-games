# Goal Keeper

**Cover the goal line.** You do not dive. You own a *span* of the goal line — a
bar of light whose width is your sum assured — and you steer it with your thumb
for 78 seconds while shots arrive at points you do not choose.

Dev port **5057**.

## Concept

The goal mouth is the interval `u ∈ [0,1]`. Your **cover** is a span on it: a
centre you steer and a half-width you cannot earn. A ball inside the span is
saved. A ball outside it goes past you into whichever of the family's three
goals — **Child's Education**, **Family Home**, **Retirement** — stands behind
that part of the mouth.

The span only ever narrows. Three things take it away and one thing gives it
back:

| | |
|---|---|
| **The term runs down** | `decayPerSec`, 0.015 → 0.033 of half-width per second across the match. A full policy is gone in 15 s early and in under 7 s at full time. |
| **Every claim draws it down** | `claimCost` 0.014 per save. A busy wave costs you width. |
| **A lapse costs double to restart** | Let it hit zero and the restart is **2 premiums**, not one. A lapsed policy is re-underwritten, not simply paid up. |
| **RENEW puts it back to full** | Costs 1 premium. You hold at most 3 and one arrives every 2.5 s. |

And one rule the whole thing rests on:

> **Once any ball is past the LOCK LINE — 55% of its flight — renewal is
> LOCKED.** You can still steer. You cannot buy cover for a claim that is
> already in the air.

Full cover spans **44% of the mouth**, so a volley wider than that *cannot* be
covered however perfectly you are positioned. That is under-insurance, and it is
the reason the last decision of a bad wave is always *which family goal do I let
through*.

## Objective and controls

**Objective:** reach full time (78 s) with all three family goals still standing.
Each goal has six funding pips; a conceded ball takes one from the goal it went
past. Lose every pip on **any one** goal and the match ends there — spreading the
damage is a real decision, not a nicety.

**Controls — two gestures, and only two:**

- **Drag** anywhere on the canvas → the finger's x maps straight onto the goal
  mouth and the span slews toward it at `slewPerSec` 0.72 of the mouth per
  second. Cover moves; it does not teleport.
- **Tap** → RENEW. The drag threshold is the kit's own tap tolerance, so a renew
  tap can never also jog the span sideways.

Every shot is telegraphed by a crimson crosshair on the goal line before the ball
is struck. The game is **never** a guess about *where* — only about whether you
can be there, and whether the policy is wide enough when you are.

## Difficulty progression

Five named phases, announced on screen. Each tightens three screws at once — the
warning gets shorter, the policy runs down faster, and the volleys get wider than
the cover can reach.

| Phase | Ends | Warning | Reach per shot | Policy → zero | 2-ball | 3-ball | Skilled save rate |
|---|---|---|---|---|---|---|---|
| WARM UP | 15 s | 1.80 s | 130% of mouth | 14.7 s | – | – | 100.0% |
| PRESSURE | 31 s | 1.58 s | 114% | 10.7 s | 30% | – | 99.5% |
| SQUEEZE | 47 s | 1.43 s | 103% | 8.8 s | 45% | – | 91.7% |
| VOLLEY | 63 s | 1.29 s | 93% | 7.6 s | 58% | 8% | 83.2% |
| FULL TIME | 78 s | 1.17 s | 84% | 6.8 s | 66% | 11% | 73.2% |

("Warning" is telegraph + flight; "reach" is how much of the mouth the span can
cross inside it.)

## Scoring

- Save **100**, plus **15 × streak** (capped at 12) for consecutive saves.
- **+50 PLANNED** when the policy was still above 62% of full at the moment of
  the claim — the bonus pays for being properly insured, not for scraping in.
- Full time: **+400**, plus **250** per family goal that finishes untouched.

## Financial hook — the mechanic *is* the argument

Nothing here is branding laid over a football game. Every rule is an insurance
rule, and `scripts/balance.mjs` measures each one rather than asserting it:

- **Cover is bought in advance or not at all.** The lock line is the rule, and
  the gate proves it fires: a bot that taps RENEW constantly is blocked by it
  1,814 times a match; a modelled casual player is blocked 6 times.
- **Cover lapses.** It runs down every second whether or not anything is
  happening. A bot with *perfect* positioning that never renews wins **0%** of
  matches; the same positioning with renewals wins **99.3%**. That 99-point gap
  is the premium economy being load-bearing rather than decorative.
- **A lapsed policy is not a thin policy — it is nothing.** `isCovered` requires
  `half > 0`. Standing in exactly the right place with a lapsed policy saves
  nothing, which is the difference between luck and cover.
- **You cannot insure everything.** Full cover is 44% of the mouth and volleys go
  wider. Under-insurance is not a failure state you can grind out of; it is the
  geometry.
- **Which goal goes uncovered is your call.** Per-goal funding, per-goal loss.

## Structure

```
src/
  data.js              every tunable + the palette. Imported by nothing that has rules.
  cover.js             PURE. Wave plan, span, decay, premiums, the lock, impacts,
                       and the three bot profiles the gate drives.
  rules.js             PURE. Scoring, the family's funding, win/lose.
  GoalKeeperGame.jsx   canvas + presentation only. Contains no rules.
  Screens.jsx          Home / How to Play / Results
  kit/                 COPY of shared/game-kit — never edit here
scripts/balance.mjs    the headless gate (below)
```

`cover.js` and `rules.js` import nothing but each other, take the config as a
parameter, and are stepped by `scripts/balance.mjs` at the same fixed timestep
the game runs at. The gate therefore measures the code that ships.

## Verification

```bash
node scripts/balance.mjs          # 300 seeds; exits 1 if any gate fails
node scripts/balance.mjs --sweep  # reaction-time sensitivity
npx vite build
cd .. && node scripts/play-test.mjs goal-keeper --all-sizes
```

Gate (300 seeds, seed `0x60a1c0de`):

| bot | win rate | required |
|---|---|---|
| skilled | **99.3%** | ≥ 90% |
| casual (300 ms reaction, ±0.05 aim, forgets to renew) | **61.3%** | 35–70% |
| idle (never touches the screen) | **0.0%**, dead at 29 s | 0% |
| never-renews (skilled positioning, no premiums spent) | **0.0%** | must be worse than skilled |
| lock-ignoring (taps RENEW every frame) | 99.3%, blocked 1,813.7×/run | lock must fire |
| lapse-only (renews only after zero) | 36.7%, every renewal charged ×2 | lapse path must be charged |

## Build

```bash
pnpm install
pnpm build        # vite build --mode uat
pnpm dev          # port 5057
```

## Screen flow

`home → howtoplay → game → results (+ LeadCaptureModal if no lead yet) →
[Book a Slot → SlotBookingModal] → thankyou`. Lead form is **Name + Mobile
only**. `incrementPlayCount()` fires once per `startGame()`.
