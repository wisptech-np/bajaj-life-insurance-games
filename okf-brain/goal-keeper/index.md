---
type: project
title: Goal Keeper
description: Cover-span defence game — steer a bar of light along the goal line whose width is your sum assured, renew it before the shot or lose it to lapse, and choose which of the family's three goals goes uncovered when the volley is wider than any policy you can hold.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/goal-keeper
tags:
  - game
  - cover-span
  - resource-management
  - reaction
  - insurance-mechanic
timestamp: 2026-08-03
---

# Goal Keeper

Rebuilt from the ground up on 2026-08-03. The previous build was a penalty-save
reaction game (swipe to dive into one of six zones); the client rejected the
concept and the execution outright, and rejected the art separately under the
name "Goal Area". Nothing of the old gameplay survives.

## The mechanic

The goal mouth is the interval `u ∈ [0,1]`. The player owns a **cover span** on
it: a centre they steer with a drag, and a half-width that is their sum assured.
A ball inside the span is saved; a ball outside it goes past into whichever of
the family's three goals (Child's Education, Family Home, Retirement) owns that
third of the mouth.

The span cannot be earned. It only narrows:

- the **term runs down** at `decayPerSec` (0.015 → 0.033 of half-width per
  second across the five phases — a full policy is gone in 15 s early and under
  7 s at full time);
- every **claim draws it down** by `claimCost` 0.014;
- letting it reach zero is a **lapse**, and restarting a lapsed policy costs
  **2 premiums** instead of 1.

The only way back is **RENEW** (tap), which costs a premium. Three held, one
arriving every 2.5 s. And renewal is **LOCKED** the moment any ball is past 55%
of its flight: you cannot buy cover for a claim that is already in the air.
Steering is never locked — reacting is skill; the *size* of the policy is the
insurance decision, and its window closes before the outcome does.

Full cover spans 44% of the mouth. Volleys are generated wider than that, by
design, so under-insurance is geometry rather than a failure state. Loss is
**per goal**: six funding pips each, and every pip gone on any ONE goal ends the
match. Win = reach full time (78 s) with all three standing.

**Controls:** drag anywhere (absolute x → mouth position, slew-limited to 0.72
of the mouth per second); tap to renew. Nothing else. Every shot is telegraphed
by a crosshair on the line before it is struck, so the game is never a guess
about *where*.

**Difficulty:** five announced phases — WARM UP, PRESSURE, SQUEEZE, VOLLEY, FULL
TIME — each shortening the warning (1.80 s → 1.17 s), speeding the decay, and
widening the volleys past what the span can cover.

## Why this is insurance rather than branding

The rejected build had a keeper who saved shots and a Bajaj logo. Here every
rule is an insurance rule, and the balance gate measures each rather than
asserting it:

| Claim | Measurement (300 seeds) |
|---|---|
| Cover must be bought before the event | a bot that taps RENEW every frame is blocked by the lock **1,814×/run**; a modelled casual player **6.4×/run** |
| Cover lapses if not renewed | perfect positioning + never renewing wins **0.0%**; the same positioning with renewals wins **99.3%** |
| A lapsed policy pays nothing | `isCovered` requires `half > 0`. Without that clause a zero-width span still saved balls whose `u` happened to equal the centre, and a bot steering straight at each ball measured **41%** for never buying cover at all |
| A lapse costs more to restart | the lapse-only probe bot's renewals are **100%** charged at ×2 |
| You cannot insure everything | full cover = 44% of the mouth; volley spread runs to 48% |
| Which goal is uninsured is your call | per-goal funding, per-goal loss |

## Anti-duplication

Checked against `bajaj-game-store/GAMES_CATALOG.md` (33 deployed) and
`scripts/games-manifest.json` (37 + 2 revamps) on 2026-08-03. No row uses a
**resource-managed cover span with a renewal economy**. Nearest neighbours and
why they differ:

- `guardian-shelter` — place shields, then watch a storm. Static pre-placement
  physics puzzle; this is continuous real-time control with an economy.
- `health-shield` — Breakout. A fixed-size paddle breaking bricks; here the
  paddle's *width* is the resource, bought with premiums and consumed by claims,
  and multi-ball volleys make width rather than position the decision.
- `perfect-premium` — stop-the-marker timing. Single-axis precision, no spatial
  defence.
- `cover-drive` — cricket timing. The repo's other sports title; different
  mechanic, and its art direction (broadcast realism) is deliberately not this
  one's.

The theme (football goal) is fixed by the client's title. The old
`goal-keeper` row (penalty-save swipe-to-dive) is replaced, not duplicated.

## Art direction

Flat silk-screened match poster, restated as a deliberate system rather than a
mood:

- **One light source.** A single floodlight pylon, high and to the LEFT. Every
  lit face in the draw path is the left face, every contact shadow falls down
  and to the right. No rim light, no second key, no decorative glow anywhere.
- **Five hues, one job each.** CYAN `#00A3E0` is cover and only cover (the span,
  its column of light, the premium pips). CRIMSON `#EF4444` is risk and only risk
  (strikers, crosshairs, tracers, a goal conceded). GREEN `#28A745` is a save.
  GOLD `#FFC845` is the family's goals. WHITE INK `#F4F8FF` is structure. The
  neutral navy/turf ramp is ground and carries no meaning.
- **A composition, not a centred pile.** The vertical rhythm is fixed:
  sky + pylon (5.8%), stand (9.4%), a brand-blue hoarding with a printed chevron
  rhythm (3.8%), then a long, deliberately empty pitch down to the goal line at
  67.2% — the one hard horizontal in the frame — then the net band with the
  family's banners, then the control strip under the thumb. The touchlines and
  the mown stripes converge on one vanishing point.
- **Three type steps and one family.** 8.5px/900 labels, 19px/800 tabular
  numbers, 15px/900 banner titles. Poppins throughout.
- **The hero element is the cover span**: a bar of light on the goal line with
  bracket ends marking where the sum assured stops, throwing a translucent
  column up the pitch to the lock line so a player can *see* whether an incoming
  ball is inside their policy.

## Tutorial

Two layers, both required by the client's standing note:

1. **How to Play** — one 4.8 s SVG loop of the real game in the order it
   happens: the meter runs down, a tap renews it, crosshairs appear, the finger
   drags the span across, the lock line closes, the covered shot is saved. Three
   icon-led cues, ≤ 4 words each.
2. **In-game coach marks** — three, each fired once, each at the moment the rule
   it explains first matters: "DRAG TO MOVE YOUR COVER" during the kickoff beat
   (with a moving finger), "TAP TO RENEW" the first time the policy drops below
   55%, and "TOO LATE TO COVER" the first time a renew is blocked by the lock.

## Files

- `src/data.js` — every tunable and the palette. Rules modules never import it.
- `src/cover.js` — PURE. Wave plan, span, decay, premium economy, lock, impacts,
  and the three bot profiles the gate drives.
- `src/rules.js` — PURE. Scoring, family funding, win/lose.
- `src/GoalKeeperGame.jsx` — canvas presentation only; contains no rules.
- `src/Screens.jsx` — Home / How to Play / Results.
- `scripts/balance.mjs` — headless gate over the shipped modules at the shipped
  fixed timestep.

Dev port **5057**. Lead form is Name + Mobile only.
