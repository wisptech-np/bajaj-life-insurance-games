# Perfect Premium

Stop-the-marker precision across a 35-year life timeline. A marker sweeps back
and forth over a bar; one TAP locks it. Land in the green band and that year's
premium is paid; land in the gold sliver at its centre and it is a **PERFECT** —
double points and a combo step. Land anywhere else and one of three grace periods
is gone and the stage comes round again, narrower and faster. Twelve premiums
carry you from age 25 to the vesting date at 60, inside 100 seconds.

> *Pay every premium right on time from 25 to 60 — discipline today is a pension
> tomorrow.*

## Concept

Twelve stages, each a premium due date landing on top of a life event that wants
the money for something else:

| # | age | life event | green zone | gold sliver | sweep | bar |
|---|---|---|---|---|---|---|
| 1 | 25 | first pay cheque | 24.0% | 6.2% | 0.90 | straight |
| 2 | 28 | first job raise | 22.6% | 5.9% | 0.96 | straight |
| 3 | 30 | wedding year | 21.3% | 5.5% | 1.03 | straight |
| 4 | 32 | first child | 19.9% | 5.2% | 1.10 | **arc** |
| 5 | 35 | home loan | 18.5% | 4.8% | 1.18 | straight |
| 6 | 38 | car upgrade | 17.2% | 4.5% | 1.26 | straight |
| 7 | 41 | school fees | 15.8% | 4.1% | 1.35 | straight |
| 8 | 44 | parents' care | 14.5% | 3.8% | 1.45 | **arc** |
| 9 | 47 | college fund | 13.1% | 3.4% | 1.55 | straight |
| 10 | 51 | business dream | 11.7% | 3.0% | 1.65 | straight |
| 11 | 55 | pre-retirement top-up | 10.4% | 2.7% | 1.77 | straight |
| 12 | 60 | retirement day | 9.0% | 2.3% | 1.89 | **arc** |

Zone widths are fractions of the bar; sweep speed is bar-widths per second
(+7% compounding per stage). The zone's position is re-randomised every stage
*and* every retry, and a re-roll must move at least 12% of the bar so a repeat is
a fresh read rather than the same muscle memory. Every 4th stage the bar bends
into an arc: the geometry changes, the timing rule does not.

**Win:** clear all 12 stages — retirement fireworks at 60.
**Lose:** three misses (grace exhausted), or the 100-second clock.

## Financial hook — premium discipline and the grace period

The whole game is the argument that a policy is a 35-year habit, not a purchase:

- **The window narrows as you get older.** Green goes 24% → 9% and the sweep
  speeds up 7% a stage, so the same tap that was comfortable at 25 is a
  commitment at 55. Life gets busier; the discipline has to get sharper.
- **The stage that wants your money is named.** Every due date is drawn on top of
  a home loan, school fees, a car upgrade. The premium is never convenient.
- **Grace periods are real, and there are only three.** A real policy forgives a
  late premium — up to a point. Miss a fourth time and the run is over the way a
  policy lapses: everything paid so far still counts for nothing toward the
  vesting date.
- **A missed premium does not vanish, it comes back harder.** The stage repeats
  with a new zone and the *same* narrower width — you do not get an easier
  second chance.
- **The top-up band is the honest trap.** A narrow gold band offset from green
  banks +150 but does **not** pay the premium: the stage stays open and the
  speed bonus keeps draining. Chasing extra return before covering the basics is
  measurably a losing strategy — the greedy bot in the sim wins 7.8% against
  39.4% for the bot that just pays the premium.
- **Perfection compounds.** Consecutive PERFECTs stack a multiplier to x4. An
  ordinary on-time payment keeps the policy alive but resets the streak, so the
  ceiling belongs to people who are early *and* exact, every single year.

## Controls

- **Tap anywhere** on the stage to lock the marker. That is the entire input.
  The lock fires on pointer-down, not on release — this is a timing game.
- Mute toggle bottom-right. The game auto-pauses when the tab is backgrounded and
  the 100-second clock pauses with it.

## Scoring

| event | value |
|---|---|
| premium paid (green) | `(100 + round(remaining stage seconds) x 10) x combo` |
| **PERFECT** (gold sliver) | the same, **x2**, and +1 combo |
| combo multiplier | `min(1 + consecutive PERFECTs, 4)` |
| bonus top-up band | flat **+150**, stage NOT cleared, combo untouched |
| miss | one grace period; combo resets to 0; stage repeats |

Each stage attempt carries a 6-second speed-bonus allowance that drains in real
time and is shown as a meter under the stage card. A perfect chain on early,
quickly-answered stages is worth roughly 8x a slow safe-zone tap on the same
stage.

Stats reported to the results screen: `{ score, perfects, bestCombo, stagesCleared }`.

## Balance notes

The gate is a headless simulator that imports the **shipped rules module**
(`src/stages.js`) and the **shipped tunables** (`src/data.js`) and drives them
with a scripted bot. Nothing in it re-implements a rule, so the numbers below
cannot drift from the game.

```
node scripts/balance.mjs                    # the gate: 500 runs per profile
node scripts/balance.mjs --runs 20000 --sweep
```

The bot aims at the centre of the green zone (i.e. always tries for a PERFECT)
and its realised lock lands at `centre + N(0, sigma)`, clamped to the bar. It
ignores the top-up band. Timing is simulated rather than assumed: after a 0.22 s
beat to read a fresh layout it waits for the marker to actually reach its target
and locks at that instant, so every resolve beat and wasted sweep comes out of
the same 100-second clock the player gets. Two independent mulberry32 streams per
run — one for the game's zone placement, one for the bot's aiming noise — both a
pure function of the run index and the master seed, so a re-run with the same
`--seed` reproduces the table exactly. Gaussians are Box-Muller over the bot
stream.

**Gate:** `sigma = 6%` must land in **25–45%** and `sigma = 2%` must reach
**>= 90%**; additionally every run must terminate inside the clock, and the
timeout lose path must be demonstrably reachable.

**Measured (20,000 runs per profile, seed `0x5eed1234`):**

| profile | win% | lose: grace | lose: clock | mean score | premiums | perfects | best combo | clock used |
|---|---|---|---|---|---|---|---|---|
| sigma 2% (expert) | **100.0%** | 0.0% | 0.0% | 7,444 | 12.00 | 8.34 | 5.27 | 13.9 s |
| sigma 4% | 88.7% | 11.3% | 0.0% | 4,118 | 11.81 | 5.11 | 2.54 | 15.1 s |
| **sigma 6% (casual)** | **39.4%** | 60.6% | 0.0% | 2,884 | 10.18 | 3.55 | 1.81 | 15.3 s |
| sigma 8% | 10.4% | 89.6% | 0.0% | 2,028 | 7.80 | 2.47 | 1.42 | 13.5 s |
| sigma 12% (mashing) | 0.5% | 99.5% | 0.0% | 1,090 | 4.56 | 1.33 | 0.93 | 10.1 s |
| sigma 6% **greedy** (chases top-ups) | 7.8% | 92.2% | 0.0% | 2,073 | 7.24 | 2.56 | 1.48 | 13.7 s |
| dithering (2% aim, 7.2 s per read) | 90.4% | 0.0% | **9.6%** | 4,845 | 11.90 | 8.30 | 5.27 | 98.1 s |

At the default 500-run gate the same seed measures casual at **42.4%** and expert
at **100.0%**; across five other master seeds casual measured 35.8–42.4%, so the
gate is comfortably inside the band and is not seed-fragile.

The difficulty curve is smooth and steep in exactly the right place — the sweep
below is the reason the game feels like a skill test rather than a coin flip:

```
sigma   1.0%   2.0%   3.0%   4.0%   5.0%   6.0%   7.0%   8.0%  10.0%  12.0%
win%   100.0  100.0   99.0   88.7   64.8   39.4   21.1   10.4    2.3    0.5
```

Halving your aiming error from 6% to 3% takes you from 39% to 99%. Doubling it to
12% takes you to 0.5%.

**Why the ramp produces 39%.** With gaussian positional error the per-stage clear
chance is `erf((green/2) / (sigma*sqrt2))`, which for sigma = 6% runs 95.4% on
stage 1 down to 54.7% on stage 12. The chance of zero misses across all twelve is
only 5.7%; the three grace periods are what turn that into a ~38% analytic
finish rate, and the measured 39.4% confirms it. **The grace periods are not a
safety net bolted on — they are the mechanism that makes the run winnable at all**,
which is precisely the point the game is making about real policies.

**Clock behaviour.** A reflex player uses 14–15 s of the 100 s cap, so the clock
is generous by design: the lose path that actually bites is grace exhaustion. The
`dithering` profile exists to prove the clock is not dead code — the same
perfect-aim bot that wins 100% of the time loses 9.6% of runs once it spends
7.2 s deliberating over each layout.

### Spec corrections

**None.** Every constant in design spec §10 shipped as written — 12 stages,
+7% sweep per stage, green 24% → 9%, gold centre sliver, arc on every 4th stage,
+150 top-up that does not advance the stage, 3 grace periods, 100 s clock,
`100 + remaining-seconds x 10`, PERFECT x2 with a combo to x4. The sim hit
25–45% and >= 90% on the first measurement, so nothing needed correcting. The
numbers the spec left open — sweep base speed (0.90 bar/s), the gold sliver as
26% of the green width, the 6-second speed-bonus allowance, the 0.06-bar gap
around the top-up band, and the resolve beats — were chosen and are documented at
their definitions in `src/data.js`.

## Shape of the build

- `src/data.js` — `COLORS`, `STAGES` (the twelve ages and life events) and
  `GAME_CONFIG`. Every tunable lives here: the sweep ramp, the zone width ramp,
  the gold fraction, the top-up band, the scoring weights, the grace count, the
  100 s clock, the pacing beats and every effect count. No imports, no browser
  API — the sim imports it directly.
- `src/stages.js` — **all of the rules**, as pure functions: the difficulty ramp,
  zone generation, lock judgment, sweep kinematics, scoring and the whole run
  state machine (`createRun` / `runStep` / `runTap` / `lockAt` / `runStats`).
  No DOM, no React, no canvas. The component drives it; the sim drives it.
- `src/PerfectPremiumGame.jsx` — presentation only. Canvas layout, offscreen
  pre-render, programmatic painters, particles, audio and the HUD, with all
  mutable state in refs.
- `src/Screens.jsx` — Home (the timeline, bar and sweeping marker as inline SVG),
  How to Play (3-beat CSS-animated SVG: tap to lock, aim for the gold, mind the
  grace), Results (a ring filled by premiums paid, with score / perfects /
  best-combo tiles matching the stats contract).
- `src/kit/` — byte-identical copy of `shared/game-kit`. Never edited in place.
- `scripts/balance.mjs` — the balance gate. Not part of the bundle.

## Presentation

All art is programmatic canvas or inline SVG — no emoji sprites, no image files.
The backdrop, the well behind the bar and the timeline rail are pre-rendered to
one offscreen canvas per resize and blitted; per frame only the twelve milestone
nodes, the stage card, the speed meter, the track and its zones, and the marker
are drawn. Milestones are drawn shapes: a green disc with a stroked tick when
paid, a pulsing orange ring with a halo when due, a dim blue dot when still
ahead.

Juice: >= 14 particles on every lock (26 plus a green secondary on a PERFECT, 20
on a top-up, 18 on a miss, 3 x 40 staggered fireworks on the win), floating `+N`
and `GRACE USED` text, screen shake on a miss, hit-stop on a PERFECT, elastic
squash on the marker as it locks, a pop on the milestone node that just cleared,
an out-back grow on every fresh zone, a fade-and-rise on every stage card, a
stage-entry transition on the canvas frame, and a damped score counter. Audio is
the kit's Web Audio synth only, unlocked on the first pointer gesture: the
triangle chord on a PERFECT, the ascending chime on a safe pay, a rising square
note per combo step, the sawtooth thud on a miss, and the five-note fanfare or
three-note fall at the end.

The score counter is written to the DOM through a ref, so a 120 Hz tick never
re-renders the React tree; time, grace and combo are the only values on React
state and each changes a handful of times per run.

The 100-second session clock lives on the run object in `stages.js` rather than
on the kit loop, so the simulator measures the same clock the player sees. The
loop still owns pause/visibility and does not call `update()` while the tab is
hidden, so a backgrounded phone cannot burn the session.

## Port and build commands

Dev server on **5064**.

```
pnpm install
pnpm dev            # http://localhost:5064
pnpm build          # uat (default)
pnpm build:preprod
pnpm build:prod
pnpm preview
pnpm balance        # node scripts/balance.mjs
node scripts/balance.mjs --runs 20000 --sweep
```
