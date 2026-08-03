# Perfect Premium

**Set the cover. Then live with it.**

A cover line runs across the field at whatever level your thumb puts it. Claims
travel toward the NOW line from the right; each shows its **class** — and
therefore the size band it was drawn from — the moment it appears, and its true
size only when it crosses the FORECAST line, 0.72 s out. A claim under your line
is covered, and worth more the tighter the fit. A claim above it takes the
uncovered part out of the family's security. Carrying cover burns **budget**
every second, so a line left sitting at the top is money that never reaches the
gold goal tokens riding along the floor.

Raising cover is slow. Dropping it is fast.

> *Too little cover and the claim lands on your family. Too much and the money
> never reaches your goals. Find the line.*

## Concept

Eight chapters carry you from the first pay cheque at 25 to the vesting date at
60 — about 96 seconds of continuous play. Each chapter is a stretch of claims on
its own spacing, drawn from its own mix, with one budget credit at the top of it
("salary credited").

| # | age | life event | seconds | gap between events | routine / major / critical | goal chance |
|---|---|---|---|---|---|---|
| 1 | 25 | first pay cheque | 9.5 | 1.50–1.95 s | 100 / 0 / 0 | 30% |
| 2 | 29 | first job raise | 9.5 | 1.42–1.85 s | 78 / 22 / 0 | 30% |
| 3 | 33 | wedding year | 10 | 1.35–1.75 s | 60 / 40 / 0 | 28% |
| 4 | 37 | first child | 10 | 1.28–1.66 s | 48 / 40 / 12 | 28% |
| 5 | 42 | home loan | 10 | 1.22–1.58 s | 40 / 42 / 18 | 26% |
| 6 | 47 | school fees and parents | 10 | 1.16–1.50 s | 32 / 42 / 26 | 26% |
| 7 | 53 | college fund | 10 | 1.10–1.42 s | 26 / 42 / 32 | 24% |
| 8 | 60 | retirement day | 10 | 1.05–1.36 s | 22 / 40 / 38 | 24% |

A sample run generates about 39 claims and 13 goal tokens.

### The three claim classes

| class | size band (fraction of the scale) | illustrative | colour |
|---|---|---|---|
| ROUTINE | 10% – 24% | around 4L – 10L | blue |
| MAJOR | 30% – 56% | around 12L – 22L | orange |
| CRITICAL | 55% – 88% | around 22L – 35L | red |

The class is public from the horizon. The size inside the band is uniform and
hidden until the reveal. That is the whole uncertainty model, and it is
deliberately honest: you always know the range and never know the number, which
is exactly the position anyone buying cover is in.

**Win:** survive all eight chapters to the vesting date.
**Lose:** family security to zero (under-insuring), or budget to zero
(over-insuring). The 120 s cap exists only so a stalled run cannot outlive the
two-minute rule; a completed schedule ends the run at about 96 s.

## Financial hook — the two-sided cost of getting cover wrong

The mechanic *is* the argument, and both mistakes are rules rather than captions:

- **Under-insuring is free until it is not.** A shortfall costs
  `62 x (gap / 0.70)^1.6` security. A near-miss is a graze (a 5%-of-scale gap
  costs under 1 point); a critical claim taken bare costs 62 of 100. Small risks
  really are self-insurable and large ones really are not — the single most
  useful thing this game can teach, and it lives in the damage curve rather than
  in a caption.
- **Over-insuring is safe and it still loses.** Cover burns 10.5 budget per
  second at the top of the scale against about 1.3/s of income. A bot pinned at
  maximum cover never suffers a single shortfall in its life and is bankrupt in
  **11.4 s**. A merely *cautious* bot that keeps a 45% floor between claims — the
  realistic version of the same mistake — is bankrupt in **31.0 s**.
- **Over-insuring costs even when it survives.** A bot that carries every claim's
  band top rather than trusting the reveal wins 99.2% of its runs and scores
  **6,438 against the skilled bot's 14,753** — 43.6%, for carrying 13.5% mean
  surplus. Buying the maximum is not free; it is a permanent tax.
- **You cannot buy cover in the moment you need it.** Cover raises at 0.52 of the
  scale per second and drops at 1.30. The 0.72 s reveal window buys 0.37 of
  raise — enough to correct a routine or a major misread, not enough to rescue a
  critical one from the floor. The forecast band is load-bearing.
- **Chasing returns before covering the basics loses.** The gold goal tokens ride
  low, so taking one means dipping, and the climb back is the slow direction. A
  bot that chases every token wins 85.0% against 100.0% for the same skill spent
  on the claims.
- **Early frugality funds late cover.** Chapter 1 is routine claims only; chapter
  8 is 38% critical with claims 1.05–1.36 s apart. The budget that pays for the
  last three chapters is the budget you did not burn at 25.

## Controls

One thumb, one continuous verb. **Drag anywhere** — the rail handle on the left
is the affordance — and the cover line travels toward your thumb at the rate
limits above. A dashed ghost line shows where the line is heading whenever the
rate limit is biting.

## Scoring

```
covered claim = (20 + round(efficiency x 30)) x combo x (perfect ? 2 : 1)
  efficiency  = 1 - surplus / 0.35, floored at 0
  perfect     = surplus <= 0.06 of the scale  (+1 combo step, combo caps at x3)
  a plain cover, and any shortfall, resets the combo

goal token    = 200 points + 5 budget refunded
shortfall     = 0 points, combo reset, security -= 62 x (gap/0.70)^1.6

end bonus     = (budget x 10 + security x 8) x (security / 100)
```

The end bonus is scaled by surviving security on purpose: money hoarded while the
family was wiped out is not a saving, and the scoring must not say it is.

Stats contract: `{ score, playScore, endBonus, covered, perfects, shortfalls,
goals, bestCombo, yearsCleared, budgetLeft, securityLeft, meanSurplus, cause }`.

## Balance

`scripts/balance.mjs` imports the shipped `src/cover.js` and `src/data.js` and
drives them with bots that see exactly what the player sees — a claim's band from
the horizon, its true size only once `isRevealed()` says the fog has cleared.

20,000 runs per profile, seed `0x5eed1234`:

```
profile                        win%   lose:gap  lose:budget   score  claims  perfect  gaps  surplus  cover  clock
skilled                      100.0%      0.0%         0.0%   14753    39.8     38.2   0.2     3.5%  18.9%   96.2s
good                         100.0%      0.0%         0.0%    6768    22.0     16.5  18.0     4.2%  16.4%   96.2s
casual                        45.4%     54.6%         0.0%    2643     9.2      6.5  28.1     4.9%  14.7%   89.3s
novice                         0.0%    100.0%         0.0%     983     2.3      1.4  18.0     5.0%   9.8%   53.1s
never trusts the reveal       99.2%      0.0%         0.8%    6438    39.6      6.9   0.4    13.5%  21.3%   96.2s
over-cautious (45% floor)      0.0%      0.0%       100.0%    1225    10.7      1.2   0.1    23.8%  44.3%   31.0s
goal-greedy                   85.0%     15.0%         0.0%    9921    31.3     28.8   8.2     3.6%  17.6%   94.7s
random flailing                0.0%      1.5%        98.5%    1094    10.1      1.2   3.5    26.5%  39.3%   38.3s
always max cover               0.0%      0.0%       100.0%     870     3.5      0.0   0.0    82.8%  91.6%   11.4s
never cover                    0.0%    100.0%         0.0%     147     0.0      0.0  10.5     0.0%   0.0%   29.8s
```

Gate (exit 1 on any failure): skilled at or above 80%; casual in 25–60%; random
at or below 5% **and skilled scoring at least 3x random** (measured 13.49x — this
is the assertion that the game is not a calculator); always-max-cover at least
90% bankrupt with zero shortfalls; never-cover at least 90% exposed; the band-top
bot scoring at most 60% of skilled; the over-cautious bot at least 90% bankrupt;
every run terminating inside the clock.

## Shape of the build

- `src/data.js` — `COLORS`, `RISK_CLASSES`, `YEARS` and `GAME_CONFIG`: rate
  limits, fog window, budget economy, damage curve, goal tokens, scoring weights,
  pacing, every effect count. Zero imports, zero browser API.
- `src/cover.js` — **every rule**, as pure functions: schedule generation, fog
  reading, cover kinematics, scoring, the damage curve, and the run state machine
  (`createRun` / `runStep` / `setTarget` / `runStats`). No DOM, no React, no
  canvas. The component drives it and the balance simulator drives it, which is
  what makes the gate measure the shipping game.
- `src/PerfectPremiumGame.jsx` — presentation only: canvas layout, offscreen
  pre-render, programmatic painters, particles, audio, HUD. Mutable state in refs.
- `src/Screens.jsx` — Home (the loop itself, as an animated SVG), How to Play
  (a 3-beat CSS-animated demo, no instructional paragraphs), Results (a ring
  filled by chapters survived, six stat tiles and a verdict drawn from the run's
  own numbers).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

## Presentation notes

Space on screen is **time**: every event carries a `due` in seconds and the
renderer maps `(due - now)` to an x position, so the FORECAST line falls exactly
where `revealSeconds` puts it and the rules need no notion of scroll speed at all.

A fogged claim is drawn in two parts — a solid base up to the band's floor (cover
you will certainly need) and a hatched band above it up to the ceiling (cover you
might need), with a dashed line on the ceiling. That is the entire information
design: the player can see how much of the decision is known and how much is a
bet.

Colour grammar: **cyan/blue** is your cover (the line and the shaded band beneath
it), **green** a claim that landed inside it, **gold** precision and free money
(a tight cover, the streak, the goal tokens), **orange** a major claim and the
draining budget, **red** only ever a shortfall.

Auto-pause (tab hidden) releases into a **3-second re-acquire countdown**, so
backgrounding the tab cannot be used to freeze an inbound claim and study it.

## Port and build commands

Dev server on **5064**.

```
pnpm install
pnpm dev            # http://localhost:5064
pnpm build          # uat (default)
pnpm build:preprod
pnpm build:prod
pnpm preview
pnpm balance                              # the gate, 600 runs per profile
node scripts/balance.mjs --runs 20000     # the table above
node scripts/balance.mjs --sweep          # win% by aim noise
```

From the repo root, the browser check:

```
node scripts/play-test.mjs perfect-premium --all-sizes
```

## Compliance

Cover amounts, budget and claims are illustrative game mechanics. The lakh marks
on the cover scale are labels on a game axis, not a quote; there is no premium
figure anywhere in the game, and the budget meter is unitless. The results screen
carries the full disclaimer. Lead capture is **Name + Mobile only**.
