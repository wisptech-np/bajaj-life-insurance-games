# Steady Wings — build log

## 2026-07-29 — initial build (port 5065)

Built `steady-wings/` as an isolated Vite 5 + React 18.3.1 JS app cloned from the
`guardian-shelter` scaffold (via `goal-keeper`, which carries the same scaffold at
its most recent revision). pnpm, no workspace. `src/kit/` copied byte-identical
from `shared/game-kit/` and verified with `cmp` after the copy.

Mechanic per spec §1: one-tap impulse flight (flappy-style) through labelled
expense-wall gates, portrait canvas, 24-gate win target, 100 s clock, cover token,
near-miss bonus, difficulty ramp.

### Architecture decisions

**All rules in `src/flight.js`, pure.** No React, no canvas, no DOM, and
deliberately no import of `data.js` — every function takes the config as a
parameter. `scripts/balance.mjs` imports that exact file, so the gate measures the
code that ships. The component owns pixels and nothing else.

**Normalised coordinates, decided before any code.** `y` ∈ [0,1] top to bottom;
every horizontal distance in playfield *heights*; velocities in heights/second.
This is the wealth-drop lesson taken up front rather than discovered in review —
that game kept absolute sideways authority while its board shrank with the screen
and moved 20 points of win rate between two handset sizes. Here device
independence is structural: `flight.js` contains no pixel concept at all.

**Gates at fixed world positions.** The speed ramp therefore shortens the interval
between gates (2.90 → 2.59 → 2.32 s) instead of moving them, which is both the
natural implementation and the one that keeps the reachability proof simple: a
leg's available time is `(spacing − pillarWidth) / speedFor(gatesPassed)`.

**The ready beat is inside `flight.js`, not around it.** `createFlight(cfg,
false)` returns an unlaunched run; `stepFlight` advances only `t` until the first
tap. No scroll, no gravity, no clock (`shouldTickClock` gates on `launched`), no
scoring. It is therefore provably incapable of affecting the balance gate, which
launches every profile at t = 0. Without it the glider falls from 0.5 to the floor
in 0.68 s and a first-time player is dead before they have read the screen.

**Shield invulnerability is computed, not constant.** On absorb,
`invuln = (pillarTrailingEdge + r − dist) / speed + graceSeconds`, i.e. exactly as
long as it takes to leave the masonry you are currently inside, plus a beat. A
flat window either expires while still inside the pillar (an "absorbed" hit that
kills you on the very next step — not absorption) or runs long enough to walk
through the following gate. The absorb also bumps *away from the edge that was
hit* (`clearTop < clearBot ? down : up`) and snaps the glider just clear, so a top
-pillar absorb cannot fling you into the ceiling.

### Sim-proven correction: flight physics (reachable-win governs)

**Every constant the spec names ships exactly as specified.** 24 gates, 100 s
clock, gap 34% → 24% of the playfield, +12% scroll at gates 9 and 17, drift from
gate 12, scoring 50 / 25 / 30 / +150, cover token every ~8 gates (before gates 4,
12 and 20), stats contract `{score, gates, coins, nearMisses}`.

The spec does not specify the flight physics numerically ("gravity pulls it down;
TAP gives a fixed upward impulse"), so those were chosen — and the first choice
was wrong. Build 1 used Flappy-Bird-scale values, `gravity 2.6`, `flapVelocity
0.70`, `gliderRadius 0.035`.

Two separate faults, found in that order. **The first was in the measuring
instrument, not in the game, and the distinction matters for anyone retuning
this later.**

**Fault 1 — the bot's control law was wrong, not the game.** The first control law
was predictive: *tap when `y + vy²/2g ≥ line`* ("where will I bottom out"). That
term is correct for an impulse that ADDS to velocity and meaningless for one that
SETS it — a tap here reverses velocity instantly, so there is no post-tap
overshoot to predict. The phantom term made the pilot tap ~0.047 heights early
every cycle, gain that much altitude per cycle, and fly into the ceiling.

Under that broken law the gate read **0.0% for every profile including the
zero-jitter one**, which is how the error was caught: a no-jitter pilot that
cannot fly is a broken model, not a hard game. Those 0.0% figures are an artefact
of the bot and say nothing about the build-1 constants — an earlier revision of
this log tabulated them as if they were a property of the physics, which was a
false attribution and is corrected here. Replaced with the honest law *tap when
`y ≥ gap centre + hop/2`*, which is exact for a velocity-set impulse and puts the
pilot's band symmetrically on the slot.

**What the build-1 constants actually did.** Re-measured by re-running the
shipped `flight.js` with `gravity 2.6 / flapVelocity 0.70 / gliderRadius 0.035`
under the corrected control law, 400 runs × 4 seed blocks:

| profile | build-1 constants, honest law | shipped constants |
|---|---|---|
| `perfect` (0 ms jitter) | 100.0% | 100.0% |
| `sharp` (25 ms) | 99.8% | 100.0% |
| **`spec` (90 ms)** | **0.7%** (5.34 gates/run) | **34.5%** (15.98 gates/run) |

So build 1 was flyable and even masterable — it was not broken, it was *brutal*:
it put the honest pilot two orders of magnitude below the briefed 25–45% band
while a sharp player barely noticed. That is the real justification for the
correction, and it is a stronger one than the artefact was.

**Fault 2 — the hop genuinely did not fit.** With the control law fixed, the
closed form is legible. A pilot holding a line occupies a band exactly one hop
tall, `hop = flapVelocity²/(2·gravity)`; the slot it must fit inside is
`gapHeight − 2·gliderRadius`. Stated consistently for the **build-1**
configuration (`flapVelocity 0.70`, `gravity 2.6`, `gliderRadius 0.035`):

| | build-1 | shipped |
|---|---|---|
| hop | 0.0942 h | 0.0484 h |
| usable slot at gate 24, `gap.end − 2r` | 0.240 − 0.070 = **0.170 h** | 0.240 − 0.064 = 0.176 h |
| half-margin, `(slot − hop)/2` | **0.0379 h** | 0.0638 h |
| 90 ms positional error, `σ·flapVelocity` | **0.0630 h** | 0.0396 h |

At build 1 the error was **1.66× the half-margin**, so the pilot was outside its
own slot more often than inside it and 24 links of that chain is ~0. Shipped, the
half-margin is 1.61× the error instead — the ratio inverts, which is the whole
correction in one number. (An earlier revision of this log mixed the two
configurations, quoting the shipped 0.176 slot against build-1's 0.70 flap
velocity; the conclusion was unaffected but the arithmetic was not self-
consistent. Fixed above.)

The tempting fix was to widen the gaps and abandon the briefed 34%→24%. The sweep
says that is the wrong knob. Measured across 45 cells (300 runs × 2 seed blocks
each, `gliderRadius` 0.032, `gap.start` 0.34, `cycle = 2·flapVelocity/gravity`
held at 0.44 s), honest-pilot win rate:

| `flapVelocity` | g | hop | pillarW | gap.end 0.24 | 0.26 | 0.28 |
|---|---|---|---|---|---|---|
| 0.44 | 2.00 | 0.0484 | 0.100 | **35.0%** | 47.0% | 55.0% |
| 0.44 | 2.00 | 0.0484 | 0.115 | 34.5% | 45.8% | 51.7% |
| 0.44 | 2.00 | 0.0484 | 0.130 | **34.2%** | 46.2% | 47.8% |
| 0.48 | 2.18 | 0.0528 | 0.100 | 28.5% | 36.5% | 44.5% |
| 0.48 | 2.18 | 0.0528 | 0.115 | 24.2% | 32.3% | 37.8% |
| 0.48 | 2.18 | 0.0528 | 0.130 | 22.5% | 31.2% | 36.5% |
| 0.52 | 2.36 | 0.0572 | 0.100 | 18.3% | 24.0% | 31.3% |
| 0.52 | 2.36 | 0.0572 | 0.115 | 14.5% | 22.8% | 30.5% |
| 0.52 | 2.36 | 0.0572 | 0.130 | 13.8% | 22.0% | 27.2% |

(An earlier coarse sweep over `cycle` ∈ {0.44, 0.52, 0.60} and `flapVelocity` ∈
{0.34…0.58} located this neighbourhood; the 0.44 s cycle was chosen from it
because it is the snappiest rhythm — ~2.3 taps/second — that still lands in band.)

The **`flapVelocity 0.44 / gravity 2.00 / gliderRadius 0.032 / pillarWidth 0.13`**
cell holds the briefed `gap.end 0.24` at 34.2% *and* was the most block-stable
cell in the table (34.0 / 34.3 across the two probe blocks). Shipped. Softening
the hop preserves the briefed silhouette — a genuinely narrow slot at gate 24 —
where widening the gaps would have thrown it away.

Derived shipped values: hop 0.0484 heights (~29 px on a 600 px playfield), cycle
0.440 s, `maxFall` 1.24, `minFlapInterval` 0.09 s.

`gliderRadius` moved 0.035 → 0.032 in the same pass. The drawn craft's wings sweep
back past the collision circle — the fuselage is what the circle covers — which is
ordinary arcade forgiveness and is why a wingtip may cross a pillar's lip on a
near miss without ending the run.

### Gate design

Multi-seed from the first line, per the batch-4 review lesson. Four disjoint seed
blocks (spaced 1,000,003 apart so no two can share a run seed however large
`--runs` grows) × 400 runs, and **every band is asserted per block** — a profile
that only passes on the pooled mean fails. Final measured:

| profile | blk0 | blk1 | blk2 | blk3 | pooled | spread | band |
|---|---|---|---|---|---|---|---|
| `spec` | 34.8% | 33.5% | 33.5% | 36.3% | 34.5% | 2.7pt | 25–45% OK |
| `sharp` | 100% | 100% | 100% | 100% | 100% | 0.0 | ≥90% OK |
| `perfect` | 100% | 100% | 100% | 100% | 100% | 0.0 | =100% OK |
| `idle` | 0% | 0% | 0% | 0% | 0% | 0.0 | dead 0.68 s OK |
| `spam` | 0% | 0% | 0% | 0% | 0% | 0.0 | dead 1.38 s OK |

Adversarial bots are asserted to **die fast, not merely lose**: `idle` hits the
floor in 0.68 s (spec asks < 4 s) and `spam` — which taps at the cooldown limit —
hits the ceiling in 1.38 s. The ceiling being a hard lose condition is what makes
mashing a losing strategy, and `spam` exists to keep it that way.

Other assertions, all over every seed of every block:

- **Reachability — TRAVEL, analytic.** `checkReachability()` (in `flight.js`, so
  it is argued against the shipped physics constants) walks every leg of all
  1,600 generated levels. Worst case needs 0.470 h in 1.93 s against a climb
  budget of 0.677 h and a sink budget of 2.014 h → **69.4% of budget**, at gate
  21 of block 2 run 245. Sustained climb 0.350 h/s (flap velocity minus the
  cooldown's gravity debt), free sink 0.856 h in the first second.
- **Reachability — LINE-HOLDING, analytic.** Added in the review fix round; see
  the section below. Config worst case: hold band 0.0484 h static → **0.0705 h**
  on a drifting slot (+46%), leaving 0.1055 h of margin against 0.0792 h of tap
  error → **75.1% of margin**. Measured over the 10,403 drifting gates actually
  generated, the tightest is gate 24 at the same 75.1%.
- **Reachability, empirical.** `perfect` clears 24/24 on every seed of every
  block. A third independent proof of the same claim.
- **Tunnelling, analytic.** At terminal velocity and top scroll speed, one 8.33 ms
  step moves 0.00284 h horizontally against a 0.13 h pillar (45.7 overlap tests
  per pillar) and 0.01033 h vertically against a 0.176 h narrowest usable gap
  (17.0 steps to cross it).
- **Tunnelling, empirical.** A pillar cleared without a single overlap-test step
  increments `s.tunnels`. **Zero** across every profile and block.
- **Generator non-degeneracy.** 0 edge-margin violations at either drift extreme,
  0 centre jumps over `maxCentreDelta`, 0 under `minCentreDelta`; worst level
  still had 24/24 distinct centre changes and a 0.093 h centre spread. The
  `minCentreDelta` clamp was added specifically because without it a seed can
  serve six gates on one line and the run degenerates into holding a rhythm with
  nothing to read.
- **Session shape**, summed from the shipped scroll constants rather than timed by
  hand: 63.7 s of flight + 0.9 s end beat = **64.6 s**, over 19.28 heights of sky,
  against the 100 s clock (35.4 s spare) and the 120 s build-standard cap. Also
  asserted *not under* 45 s, so a future retune cannot quietly make it trivial.
- **Results ring.** `RESULT_TARGET_SCORE` 2,600 asserted against both the argued
  scoring ceiling (4,395) and — stronger — the best score the `sharp` profile
  actually posted (3,180 after the near-miss band widened; 3,150 before). The
  goal-keeper lesson: an argued ceiling can be loose, a demonstrated score
  cannot.

Death for the honest pilot distributes near-evenly across all 24 gates (2.1–3.8%
of runs at each), i.e. an actual ramp rather than a wall at the end; causes are
58.0% pillar, 7.5% floor, 0% ceiling, 0% clock. 1,715 cover tokens taken and 1,012
spent across 1,600 runs.

### Verification

- `pnpm install` — clean (4.2 s).
- `pnpm build` (`vite build --mode uat`) — **524 modules transformed, built in
  2.69 s**, zero errors. `dist/assets/index-1nf6UY5m.js` 422.86 kB (gzip 140.87),
  `index-bneSBdfR.css` 33.60 kB (gzip 6.87). (Hash current as of the review fix
  round below; it changes with every source edit, so treat it as a build stamp
  rather than a fact about the game.)
- `node scripts/balance.mjs` — **GATE: PASS**, all five profiles in band on all
  four seed blocks.
- `node scripts/balance.mjs --blocks 8 --runs 800` — **GATE: PASS** as well, to
  confirm the band is a property rather than something tuned to the default four
  blocks. Honest pilot across 8 disjoint blocks of 800: 32.5 / 33.0 / 32.4 / 33.0
  / 34.0 / 35.5 / 33.4 / 37.0, pooled 33.8%, spread 4.6 pt — every block inside
  25–45%. `sharp` and `perfect` 100% on all eight; reachability, generator and
  tunnelling assertions unchanged.
- **Event-surface smoke** (throwaway probe, not shipped): drove `flight.js` with
  the exact event-object shape `SteadyWingsGame.jsx` wires in, asserting every
  callback fires with at least the arity the component's handler destructures.
  All seven fired — `onFlap` 18,072, `onCoin` 4,473, `onGate` 1,847, `onToken`
  225, `onShield` 223, `onCrash` 400, `onEnd` 401 — so there is no dead or
  mis-named wiring between the rules and the renderer. It also confirmed the
  ready beat moves nothing (5 s unlaunched → `dist 0, y 0.5, vy 0`), that the
  stats contract is exactly `{coins, gates, nearMisses, score}`, and that the
  shield absorb genuinely absorbs: of 223 absorbs, **223** runs flew on past the
  pillar they hit rather than dying a step later.

  Worth recording that the probe's first version reported a false
  `onShield never fired`: its "reckless" bot flew badly from gate 1, so it died
  before gate 4 and never reached a token. The bot was wrong, not the game — the
  gate profile spends 1,012 shields per 1,600 runs. Fixed by making the bot fly
  straight until it has banked the gate-4 token and only then clip a lip.
- `grep -r "Guardian Shelter" steady-wings/src/` — **0 matches** (checked
  alongside "Goal Keeper"/"goalKeeper", also 0, since the scaffold was taken via
  that game).
- `src/kit/*.js` byte-identical to `shared/game-kit/*.js` — all 7 files verified.
- No emoji codepoints anywhere in `src/`; the only non-ASCII in UI text is the
  U+2713 consent tick the standard permits and typographic punctuation.

### CRM identity

`LEAD_NO_KEY = 'steadyWingsLeadNo'`; `submitToLMS` default `summaryDtls: 'Steady
Wings Lead'`; lead modal posts `'Steady Wings - Post Game Lead'`; slot booking
remark `'Steady Wings Slot Booking | Score: N'`; `updateLeadNew` fallback string
`'Slot Booking via Steady Wings'`. The scaffold's `guardian_shelter_bg.png` is not
carried at all — the thank-you screen uses a gradient sky wash — so the game ships
with zero binary assets.

### Deferred minors

1. **Duplicate SVG gradient ids across screens.** `Screens.jsx` renders `<Defs/>`
   inside each of four SVGs, so `swBody`/`swStone`/`swCoin` appear more than once
   per document. Browsers resolve `url(#id)` to the first match in document order
   and all copies are identical, so it renders correctly everywhere; it is
   untidy rather than broken. A single hidden `<svg>` of defs mounted once would
   be cleaner.
2. **No mid-run pause button.** The kit's auto-pause covers backgrounding
   (`visibilitychange`) and the veil is wired, but there is no player-facing pause
   control. Consistent with the other fast-arcade games in the repo; a 64 s
   session makes it low value.
3. **Near-miss and the in-slot coin are simultaneously achievable but awkward.**
   The coin sits at the slot centre and a near miss needs the edge, so banking
   both in one gate means grazing on entry and recovering to centre mid-crossing.
   The scoring ceiling assertion accounts for both, but a player is unlikely to
   discover the interaction; a small "grazed + collected" flourish would surface
   it.
4. **Parallax bands are rebuilt on every resize.** Three two-screen-wide bitmaps
   plus the sky and eight label bitmaps are regenerated whenever the mobile URL
   bar settles at a new height. The `fit()` early-out means this only happens on a
   genuine size change, but the cloud scatter is re-drawn from a fresh PRNG seeded
   off the run seed, so the clouds are stable while the ridge silhouette is
   redrawn identically — correct, just more work than strictly needed.
5. **`--sweep` mode re-runs the full profile set per candidate gap.** Useful but
   slow (~7 blocks × 4 × 400 runs). Fine as an opt-in flag; not on the default
   path.

## 2026-07-29 — review fix round

Verdict was SHIPPABLE with no Critical and no Major code defect: the reviewer's
own exploit bots (ceiling-hug, floor-skim, shield-ram, mash sweeps) all lose,
near-miss judging was clean over 53k gates, invariants clean over 12k runs, and
their independent honest-pilot measurement of 35.2% matched this build's 34.5%.
Two doc-integrity Majors and several minors were raised. All fixed below.

### M1 / M2 — doc integrity (the two Majors)

Both were in this log, not in the code, and both were false or inconsistent
statements about the build-1 correction. The log is what a future retune trusts,
so this matters more than its size suggests.

**M1.** The lead table presented the broken-predictive-bot's 0.0% as a property
of the build-1 *constants*. It was a property of the broken *control law*. The
reviewer re-ran shipped `flight.js` with build-1 constants under an honest law
and got perfect 100% / sharp 99.8% / spec 0.3%; re-measuring here independently
(400 runs × 4 blocks) gives **100.0% / 99.8% / 0.7%** — same conclusion, and the
0.4 pt difference on a ~0.5% quantity is sampling. The section is rewritten to
attribute the 0.0% to the instrument and to show what the physics actually did.
The correction is *better* justified this way: build 1 was masterable but put the
honest pilot two orders of magnitude below the briefed band.

**M2.** Mixed-radius arithmetic — the shipped slot (0.176 h, from r = 0.032) was
quoted against build-1's `flapVelocity 0.70` (which shipped with r = 0.035, slot
0.170 h, half-margin 0.0379 h). Now stated as a two-column table with each
configuration internally consistent. Conclusion unchanged; the arithmetic now
survives being checked.

`data.js` carried a one-line version of the same false attribution ("measured
0.0%") and is corrected identically.

### Mi1 — gate hardening (the substantive fix)

`checkReachability` only proved the glider could *travel* between gap centres. It
said nothing about whether it could *stay in the slot while crossing it*, which
made the whole reachability proof necessary-but-not-sufficient. The reviewer
demonstrated the hole rather than asserting it: with `gap.driftAmplitude`
doubled, every leg still passed at 82.6% of budget while the honest pilot
collapsed to 18.7%.

The missing physics: a pilot holding a line occupies a band of one hop *in the
gap's frame*. On a static gap that is `flapVelocity²/(2g)`. On a drifting gap the
slot is itself sliding at up to `driftAmp·omega`, so at the worst phase the band
inflates to `(flapVelocity + driftAmp·omega)²/(2g)` — **0.0705 h rather than
0.0484 h, +46%**, against a usable slot of only 0.176 h.

Added `lineHoldBand()` and `worstDriftMargin()` to `flight.js` (so the assertion
is argued against shipped constants, not a copy), plus
`reachability.pilotJitterSeconds = 0.090` to `data.js` so the tap-error term is
a shipped number too. `checkReachability` now returns a second verdict and the
gate asserts it twice: once from the config alone — the narrowest slot that can
ever drift, `gap.end` at full amplitude, a property true for every seed that will
ever exist — and once over every drifting gate actually generated.

Shipped configuration: margin 0.1055 h against 0.0792 h of tap error =
**75.1% of margin, OK**, and the same 75.1% is the tightest of the 10,403
drifting gates generated across the four blocks.

Negative control, to prove the new assertion actually bites: re-running the real
gate with `gap.driftAmplitude` forced to 2× reproduces the reviewer's finding and
now **fails**:

```
line-holding: hold band 0.0484 h static -> 0.0969 h drifting (+100%)
              margin 0.0791 h vs 0.0792 h of tap error -> 100.1% FAIL
reachability: worst leg 82.7% of budget  OK    <- travel-only still passes it
spec:         21.0% / 25.5%              FAIL  [25.0%-45.0%]
GATE: FAIL
```

The travel check reports a comfortable 82.7% on a configuration the game cannot
actually be played on; the line-holding check catches it. That is the whole point
of the fix.

### Mi4 — the near-miss lane was vestigial

The brief says "within 12px", i.e. 0.02 h on the 600-height reference, and that
is what shipped. But a pilot holding a line sits a full hop-half from the centre
at closest, so at gate 24 even a *perfectly* centred pilot's closest approach to
an edge is `(0.176 − 0.0484)/2 = 0.064 h` — more than three times the band.
Measured: sharp bot 0.01 near misses per run, honest pilot 2.79 across a winning
24-gate run. A briefed scoring lane and its results tile read zero for every
competent run.

`nearMissBand` 0.02 → **0.035 h**. This is scoring-only — survival is `clear >= 0`
and is untouched — and the gate re-run confirms it: every win rate is bit-identical
(spec 34.8/33.5/33.5/36.3, pooled 34.5%; sharp and perfect 100%), and only the
near-miss counts and scores move:

| | before | after |
|---|---|---|
| honest pilot, near misses/run | 1.6 | **3.8** |
| sharp, near misses/run | 0.0 | 0.2 |
| honest winning-run score | 2,722 | 2,831 |
| best `sharp` run posted | 3,150 | 3,180 |

`RESULT_TARGET_SCORE` 2,600 remains under both the argued ceiling (4,395,
unchanged — the formula counts one near miss per gate either way) and the
demonstrated best (3,180).

### Mi2 / Mi3 / Mi5 / Mi6 / Mi9 — minors

- **Mi2** (`scripts/balance.mjs`) — the jitter-sensitivity row sampled
  `max(120, RUNS/3)` but printed beside the full-`RUNS` profile table, so the
  same quantity appeared twice with different numbers (38.2% vs 34.5%). Now uses
  the full `BLOCKS × RUNS` and labels n. The 90 ms row reads **34.5%**, exactly
  the `spec` row, as it should.
- **Mi3** — the 100 s clock is unreachable (longest run 63.7 s), so
  `hud.lowTimeSeconds` and the `'TIME UP'` float text are dead. The spec constant
  is kept and both sites are now commented as **inert by construction**, with the
  reason they are not deleted: `onExpire` is the only terminating condition if a
  future scroll retune pushes a run past 100 s, and the gate asserts the run
  still fits, so the branch cannot go live silently.
- **Mi5** (`flight.js`) — `level.finishDistance` was computed and never read.
  Deleted.
- **Mi6** (`SteadyWingsGame.jsx`) — the vapour trail sampled the glider's screen
  x, which never changes, so every sample stacked at the same x and the "trail"
  rendered as a vertical smear through the craft. Now stores the world `dist` at
  each sample and advects at draw time by `(dist_now − dist_sampled) × fieldH`,
  so the ribbon actually trails.
- **Mi9** — the bundle hash quoted in Verification was stale; refreshed, and
  labelled as a build stamp rather than a durable fact.

### Fairness: a known risk, recorded

The win rate is steeply sensitive to input timing, which is intrinsic to a
24-link survival chain and not a tuning artefact — but it is worth stating
plainly rather than leaving for someone to rediscover.

**Jitter spread** (shipped constants, 400 × 4 blocks): σ 70 ms → 62.6%,
90 ms → 34.4%, 110 ms → 12.6%. So ±20 ms of tap precision is worth roughly 25
points of win rate.

**Constant, uncompensated input lag** — a slower device or a player who does not
anticipate at all — measured on top of the 90 ms jitter:

| added lag | 0 ms | 20 ms | 40 ms | 60 ms | 80 ms |
|---|---|---|---|---|---|
| win rate | 34.4% | 30.9% | 31.3% | 24.5% | 21.4% |
| gates/run | 15.96 | 14.73 | 14.32 | 12.96 | 12.13 |

A player carrying 60 ms of *uncompensated* lag sits at 24.5%, i.e. right at or
just under the 25% band floor.

**Why this is accepted rather than compensated.** The lag is not uncompensated in
practice: this is a rhythmic, self-paced control loop with a ~0.44 s cycle and no
external cue to react to, so a player adapts their tap phase within a few taps —
which is exactly the `delta` the honest pilot model already carries at zero mean.
The lag row above models someone who never adapts at all, which is the worst
case, not the typical one. It is also self-limiting: the glider's response to a
tap is instantaneous and visible, so the feedback needed to correct phase is
immediate. Compensating in code would mean either widening the slot (throwing
away the briefed 34%→24% silhouette) or adding input-time credit — and the
goal-keeper lesson is that credit against a commit clock is an exploit surface.
Recorded as a known risk with the argument, not silently fixed.

### Mi7 — not ours

`overscroll-behavior` handling in `index.css` is the repo-wide scaffold pattern,
inherited byte-for-byte from `guardian-shelter` and shared by all 30+ games.
Changing it here would make this game inconsistent with the rest of the repo for
no benefit; it belongs to whoever owns the shared scaffold. Noted, not touched.

## [2026-07-31] Revamp: email field removed, animated how-to-play, asset sheet

**G1 — email field removed.** `src/LeadCaptureModal.jsx`: deleted `EMAIL_RE`, the
`email` `useState`, the whole "Email Field" `sl-lead-field` block, the
`errs.email` validation branch, and both `sessionStorage` touches of
`lastSubmittedEmail`. Dropped `email` from the `submitToLMS({...})` call and from
both `onSubmitted({...})` payloads. `api.js` untouched — `submitToLMS` already
sends `email_id: email || ''`, so the LMS payload shape is unchanged. Name +
Mobile + T&C unchanged. Grep for `email` outside `src/kit/` and `src/api.js`
returns zero hits.

**G2 — `HowToPlayScreen` rebuilt as animation-first.** `src/Screens.jsx`:
- Deleted the `Beat` component, all three numbered step blocks with their titles
  and copy, the difficulty-ramp paragraph and the four scoring chips.
- New 300×200 inline-SVG scene runs the actual game on a loop: paired basalt
  expense pillars (`url(#swStone)`, coral cap bands) scroll right-to-left on a
  seamless 2.4 s `translateX(-150px)` cycle with three gate copies spaced 150 px
  apart; the existing `Glider` component sits at x=62 and rides a 1.2 s
  tap-and-fall arc that threads the 68–132 slot; a white hand glyph presses in
  the lower left with a gold ripple ring on the same 1.2 s beat, so one tap
  visibly equals one lift. A gold coin and a blue cover token ride in the slots.
- Ceiling and floor kill bands are drawn, so "don't touch the edges" is shown.
- Remaining text: the "How to Play" heading, three icon-led labels (`TAP TO
  LIFT`, `THREAD GAP`, `COVER SAVES ONE`), and the Play button. Nothing else.
- Container switched from `overflowY: auto` to `overflow: hidden`; measured
  stack is ~400 px so it fits 360×640 without scrolling. New keyframes are added
  to the existing `prefers-reduced-motion` kill switch.

**G3 — `steady-wings/asset-from-here.md`.** 12 Nano Banana prompts on a "monsoon
dusk over a river gorge" motif — soft-edged painterly gouache, eroded organic
shapes, layered atmospheric haze, wet basalt. Deliberately the opposite shape
language to the hard industrial sheets elsewhere in the repo. Covers the tileable
sky, glider and covered glider, both pillar halves, coin, cover token, hazard
bands, two HUD icons and both result-screen illustrations.

**Not changed:** gameplay, balance, `flight.js` physics, HUD layout,
`ResultsScreen`, `HomeScreen`, canvas artwork, `data.js`, `api.js`, `src/kit/`.

**Build:** `pnpm install && pnpm build` — exit 0, `✓ built in 2.53s`
(`dist/assets/index-B2eAY6e3.js 422.91 kB │ gzip: 140.82 kB`).
