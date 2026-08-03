---
type: project
title: Perfect Premium
description: Real-time cover-level management across a 25-to-60 life timeline. Claims arrive with their size class known and their size hidden until 0.72s out; the player drags a cover line that raises slowly and drops fast. Under-cover costs family security on a super-linear damage curve, over-cover drains the budget meter, and both zeroes end the run.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/perfect-premium
tags:
  - game
  - action
  - resource-management
  - risk-under-uncertainty
timestamp: 2026-08-03
---

# Perfect Premium

**Set the cover. Then live with it.**

A cover line runs across the field at whatever level the player's thumb puts it.
Claims travel toward the NOW line from the right. Each shows its **class** — and
therefore the band its size was drawn from — from the moment it appears on the
horizon, and its **true size** only when it crosses the FORECAST line, 0.72 s
out. A claim under the line is covered, and worth more the tighter the fit. A
claim above it takes the uncovered part out of the family's security. Carrying
cover burns budget every second, so a line left sitting at the top is money that
never reaches the gold goal tokens riding along the floor.

Raising cover is slow (0.52 of the scale per second). Dropping it is fast (1.30).

Eight chapters, ages 25 to 60, about 96 seconds, roughly 39 claims and 13 goal
tokens per run.

Theme copy: *"Too little cover and the claim lands on your family. Too much and
the money never reaches your goals. Find the line."*

## Why the previous version was replaced

The 2026-08-03 client review rejected the stop-the-marker build: *"The current
experience does not feel like a game… introduce a genuine gameplay loop with
player decisions, challenge, scoring and progression… add meaningful consequences
for choosing the correct or incorrect premium strategy."*

The old loop had exactly one verb (tap to stop a sweeping marker) and exactly one
axis of skill (timing precision). There was no decision in it — nothing to weigh,
nothing to trade off, and no way for a premium *strategy* to be right or wrong,
only for a tap to be early or late. What replaced it keeps the theme and the
timeline and swaps the loop for one where the player's only verb sets a
**quantity** rather than an **instant**, under genuine uncertainty, with an
opposing cost on each side of the right answer.

## Financial hook — the two-sided cost of getting cover wrong

Every claim below is a measured number from `scripts/balance.mjs`, not a slogan:

- **Under-insuring is free until it is not.** Shortfall damage is
  `62 x (gap/0.70)^1.6` — super-linear on purpose. A 5%-of-scale gap costs under
  1 point of security; a critical claim taken bare costs 62 of 100. Small risks
  are genuinely self-insurable and large ones genuinely are not, and that is a
  rule rather than a caption.
- **Over-insuring is safe and still loses.** The always-max-cover bot suffers
  **zero** shortfalls across 20,000 runs and is bankrupt at **11.4 s**, 100% of
  the time. The realistic version — a cautious bot holding a 45% cover floor
  between claims — is bankrupt at **31.0 s**, also 100% of the time.
- **Over-insuring costs even when it survives.** A bot that ignores the reveal and
  carries every claim's band top wins 99.2% of its runs and scores **6,438
  against skilled's 14,753** (43.6%) for 13.5% mean surplus. Buying the maximum
  is a permanent tax, with a number on it.
- **Cover cannot be bought in the moment.** 0.72 s of reveal buys 0.37 of raise,
  enough to fix a routine or major misread and not enough to rescue a critical
  one from the floor. The forecast band is load-bearing, which is why the
  raise/drop asymmetry exists.
- **Chasing returns before covering the basics loses.** Goal tokens ride low, so
  taking one means dipping and then climbing back the slow way. The goal-greedy
  bot wins 85.0% against 100.0% for the same skill spent on claims.
- **Early frugality funds late cover.** Chapter 1 is routine claims only; chapter
  8 is 38% critical at 1.05–1.36 s spacing. The budget that survives the last
  three chapters is the budget not burned at 25.

## Chapter table

| # | age | life event | seconds | gap | routine/major/critical | goal |
|---|---|---|---|---|---|---|
| 1 | 25 | first pay cheque | 9.5 | 1.50–1.95 s | 100/0/0 | 30% |
| 2 | 29 | first job raise | 9.5 | 1.42–1.85 s | 78/22/0 | 30% |
| 3 | 33 | wedding year | 10 | 1.35–1.75 s | 60/40/0 | 28% |
| 4 | 37 | first child | 10 | 1.28–1.66 s | 48/40/12 | 28% |
| 5 | 42 | home loan | 10 | 1.22–1.58 s | 40/42/18 | 26% |
| 6 | 47 | school fees and parents | 10 | 1.16–1.50 s | 32/42/26 | 26% |
| 7 | 53 | college fund | 10 | 1.10–1.42 s | 26/42/32 | 24% |
| 8 | 60 | retirement day | 10 | 1.05–1.36 s | 22/40/38 | 24% |

Claim classes: ROUTINE 10–24% of the scale, MAJOR 30–56%, CRITICAL 55–88%. Size
inside the band is uniform and hidden until the reveal.

## Scoring

```
covered claim = (20 + round(efficiency x 30)) x combo x (perfect ? 2 : 1)
  efficiency  = 1 - surplus/0.35, floored at 0
  perfect     = surplus <= 0.06     (+1 combo, capped at x3)
goal token    = 200 + 5 budget refunded
shortfall     = 0 points, combo reset, security -= 62 x (gap/0.70)^1.6
end bonus     = (budget x 10 + security x 8) x (security/100)
```

The end-bonus scaling matters: without it a player who never bought any cover
would finish with a full budget meter and be paid for it. Money hoarded while the
family was wiped out is not a saving.

Stats contract: `{ score, playScore, endBonus, covered, perfects, shortfalls,
goals, bestCombo, yearsCleared, budgetLeft, securityLeft, meanSurplus, cause }`.

## Shape of the build

- `src/data.js` — `COLORS`, `RISK_CLASSES`, `YEARS`, `GAME_CONFIG`. Zero imports,
  zero browser API, so `scripts/balance.mjs` imports it under Node exactly as the
  app does.
- `src/cover.js` — **every rule**, as pure functions: schedule generation
  (`buildSchedule`), fog reading (`isRevealed`, `readNeed`), cover kinematics,
  `coverScore`, `shortfallDamage`, `endBonus`, and the run state machine
  (`createRun` / `runStep` / `setTarget` / `runStats`). No DOM, no React, no
  canvas.
- `src/PerfectPremiumGame.jsx` — presentation only. Mutable state in refs, HUD
  written to the DOM via textContent/style, offscreen backdrop rebuilt on resize.
- `src/Screens.jsx` — Home, How to Play (3-beat CSS/SVG demo, no instructional
  paragraphs), Results.
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the gate; not part of the bundle.
- `src/stages.js` — **deleted** (the old stop-the-marker rules module).

## Presentation

Space on screen is time: events carry a `due` in seconds and the renderer maps
`(due - now)` to x, so the FORECAST line falls exactly where `revealSeconds` puts
it and the rules module needs no notion of scroll speed.

A fogged claim is drawn in two parts — solid to the band floor (cover certainly
needed), hatched to the band ceiling (cover possibly needed), dashed line on the
ceiling. The player can see how much of the decision is known and how much is a
bet.

Colour grammar: cyan/blue is your cover (the line and the band beneath it); green
a claim that landed inside it; gold precision and free money (tight cover, the
streak, the goal tokens); orange a major claim and the draining budget; red only
ever a shortfall.

Auto-pause releases into a 3-second re-acquire countdown, so backgrounding the
tab cannot be used to freeze an inbound claim and study it.

## Balance

Gate at 600 runs per profile; table below at 20,000, seed `0x5eed1234`:

| profile | win% | lose: gap | lose: budget | score | claims | perfect | gaps | surplus | clock |
|---|---|---|---|---|---|---|---|---|---|
| skilled | 100.0% | 0.0% | 0.0% | 14,753 | 39.8 | 38.2 | 0.2 | 3.5% | 96.2 s |
| good | 100.0% | 0.0% | 0.0% | 6,768 | 22.0 | 16.5 | 18.0 | 4.2% | 96.2 s |
| **casual** | **45.4%** | 54.6% | 0.0% | 2,643 | 9.2 | 6.5 | 28.1 | 4.9% | 89.3 s |
| novice | 0.0% | 100.0% | 0.0% | 983 | 2.3 | 1.4 | 18.0 | 5.0% | 53.1 s |
| never trusts the reveal | 99.2% | 0.0% | 0.8% | 6,438 | 39.6 | 6.9 | 0.4 | 13.5% | 96.2 s |
| over-cautious (45% floor) | 0.0% | 0.0% | 100.0% | 1,225 | 10.7 | 1.2 | 0.1 | 23.8% | 31.0 s |
| goal-greedy | 85.0% | 15.0% | 0.0% | 9,921 | 31.3 | 28.8 | 8.2 | 3.6% | 94.7 s |
| **random flailing** | **0.0%** | 1.5% | 98.5% | 1,094 | 10.1 | 1.2 | 3.5 | 26.5% | 38.3 s |
| always max cover | 0.0% | 0.0% | 100.0% | 870 | 3.5 | 0.0 | 0.0 | 82.8% | 11.4 s |
| never cover | 0.0% | 100.0% | 0.0% | 147 | 0.0 | 0.0 | 10.5 | 0.0% | 29.8 s |

**Skilled scores 13.49x random.** That ratio is the gate's headline assertion and
the direct answer to the review: a player who understands nothing does not score
like a player who understands everything.

## Ports and commands

Dev server on **5064**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `pnpm balance`,
`node scripts/balance.mjs --runs 20000`, and from the repo root
`node scripts/play-test.mjs perfect-premium --all-sizes`.
