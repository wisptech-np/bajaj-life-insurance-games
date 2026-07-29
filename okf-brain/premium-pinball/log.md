# Premium Pinball — build log

## 2026-07-29 (final round) — seed-luck, session length, and honest copy

Re-review closed all three MAJORs from the previous round (the reviewer's own
cradle-forever bot reproduced STUCK=0 across three seed blocks and a 451-point
drop grid at four poses; the 26 px bound was audited correct and tight; the
keyboard latch verified on all four edge cases). Six new MINORs, two of them
ship-blockers. This round closes all six.

**Verification after the round**

| Gate | Result |
| --- | --- |
| `pnpm build` (vite build --mode uat) | pass, 526 modules, 429.47 kB / 142.61 kB gzip |
| `node scripts/balance.mjs` (600 runs/profile) | pass — tap 36.7%, cradle-0.8s 32.8%, cradle-3s 30.7%, **0 watchdog in every one of 4 seed blocks x 3 profiles**, 0 tunnelling, peak 1500.0 px/s, min 4 substeps, clearance 29.98 > 26 px |
| `node scripts/balance.mjs --seed 0xdeadbeef` | pass (this is the invocation that FAILED on the shipped gate) |
| `node scripts/render-smoke.mjs` | pass — 2,753 draw calls, 0 per-frame gradient allocations |

---

### MINOR-A — "0 watchdog" was a property of the seed, not the table

The shipped gate passed on its own seed and failed on `--seed 0xdeadbeef`.
Reproduced at 4 seed blocks x 3 hold profiles x 200 runs: **6 watchdog deaths in
6,047 ball losses**, every one at the same place — (223.87, 103.00), balanced on
the top endpoint of a rollover lane post, a single contact tilted 0.85 degrees
off vertical with both flippers at rest.

The wobble could not break it, and the arithmetic says why. The friction cone is
NOT `gravity * mu` = 105.6 px/s^2. A resting contact re-collides every substep
and the impulse it carries is inflated by restitution, so the real ceiling is

    gravity * frictionMu * (1 + wallRestitution) = 880 * 0.12 * 1.55 = 163.7

The wobble was 90 — not merely marginal, but **below the cone by 45%**, so there
was an entire class of rest it could never break at any seed.

`settleAccel` 90 -> **185** (13% over the cone). Proof, same harness both sides:

| settleAccel | runs | ball losses | watchdog deaths |
| --- | --- | --- | --- |
| 90 (before) | 2,400 | 6,047 | **6**, all at (223.87, 103.00) |
| 185 (after) | 3,600 | 9,272 | **0** |

Seed block 0xb52a7998 is the one that reproduces it most readily and is now a
permanent gate block. Cost of the bigger amplitude, measured over the same runs:
wobble active on **0.30%** of play ticks (was 0.33%) and the largest x-drift in
any single episode **12.7 px** (was 9.1 px) — a ball creeping under 45 px/s
drifting a ball and a half. Same order, still invisible in play.

And the gate no longer asks one seed. It runs **four blocks**
(`0x5eed1055, 0xdeadbeef, 0xb52a7998, 0x1234abcd`), reports watchdog counts
per block, and fails if any block is non-zero. `--seed` still forces a single
block for bisecting.

### MINOR-B — session length, and why the obvious fix does not work

Sessions had regressed to a 26.9 s median with 20.7% of them under 20 s, against
the 60-120 s GAME_STANDARD asks for.

The obvious lever — widen the drain mouth — cannot work on its own, and the
reviewer's own numbers show it: the next step up put the tap profile at 45.5%,
over its ceiling. That is not bad luck, it is structural. **Score and duration
are the same variable**: points accrue per bumper contact, so anything that buys
playtime buys score at the same rate and pushes the win rate up with it.

So the fix separates them, in three parts:

1. **Cover Note ball save** (`ballSave`, 9 s, once per ball). An early drain is
   re-served free. It adds playtime, and it specifically refunds the cheapest
   losses — which are largely the undefendable outlane deaths of MINOR-C, so it
   partly addresses that too. Thematically it is the grace period on a late
   premium: cover does not lapse the instant you are late.
2. **`scoreCooldown` split out of `hitCooldown`** (0.09 s -> 0.75 s for points,
   kick stays at 0.09 s). This is the actual decoupling: a ball working the goal
   cluster still gets thrown around exactly as before, it just does not bank 50
   points per contact. Splitting the two mattered — slowing the shared cooldown
   made bumpers stop kicking for three-quarters of a second at a time, which
   reads as a dead post. Feel preserved, scoring rate cut.
3. **`serveDelay` 0.75 s -> 2.4 s.** Session time that carries no scoring at
   all, and it gives the player time to read what just happened.

`bumperKick` 300 -> 190 and `pivotDX` 78 -> 88 finish the tuning. Result, 600
runs per profile:

| | before | after | target |
| --- | --- | --- | --- |
| tap win | 35.5% | **36.7%** | 20-45% |
| session mean | 27.6 s | **45.9 s** | — |
| session p25 | ~21 s | **40.9 s** | > 30 s |
| session p50 | 26.9 s | **46.0 s** | 45 s+ |
| under 20 s | 20.7% | **0.2%** | — |

Full distribution (tap): p10 36.6, p25 40.9, p50 46.0, p75 51.1, p90 55.6 s.

### MINOR-D — the watchdog told the player two different things

`drainBall()` decremented `ballsLeft` for stuck/timeoutBall while the HUD copy
read "BALL HELD — SERVED FRESH", so a ball dot vanished under a message saying
nothing was lost. A watchdog retirement is the game's fault, so it now genuinely
**costs no ball**: the engine skips the decrement, the drain event carries the
unchanged count, and the copy reads "BALL HELD — SERVED FRESH (NO BALL LOST)".
A watchdog re-serve also continues the same ball, keeping the goals already lit.
And `finish()` no longer lets a last-ball watchdog fall through to "COVER
LAPSED" — it reads "BALL HELD — RUN ENDED".

### MINOR-E — charge survived losing focus

`releaseAllInputs()` dropped flippers but left `plungerCharging` true, so
blurring mid-charge left the meter filling with nobody touching it and the 6 s
auto-launch then fired at its own 0.5 power under a meter painted full. Added
`cancelCharge()` to the engine and called it from `releaseAllInputs()`.

### MINOR-F — an undated table

The `--holds` table in the previous log entry was measured at a different run
count from the profile table beside it, and the two disagreed. `--holds` now
prints its own sample size, and the table below is re-measured at the stated
count.

**Hold sweep — 150 runs x 4 seed blocks = 600 runs per row:**

| hold | win% | drains | watchdog | median session |
| --- | --- | --- | --- | --- |
| 60 ms | 37.5% | 2732 | 0 | 45.4 s |
| 110 ms | 36.7% | 2746 | 0 | 46.0 s |
| 200 ms | 34.8% | 2781 | 0 | 45.7 s |
| 400 ms | 34.2% | 2813 | 0 | 45.6 s |
| 800 ms | 32.8% | 2848 | 0 | 45.6 s |
| 1500 ms | 33.8% | 2882 | 0 | 45.8 s |
| 3000 ms | 30.7% | 2937 | 0 | 45.9 s |
| 6000 ms | 23.3% | 3062 | 0 | 45.4 s |

Monotone, graceful, zero watchdogs at every point on the axis.

---

## 2026-07-29 (later) — review fix round: the raised-flipper wedge

Independent review rejected the first build with 3 MAJOR findings. All three are
the same underlying mistake in different clothes: **the first build reasoned
about the flipper at rest, and the flipper does not stay at rest.** Holding a
flipper up is a documented control and standard cradle technique, and every
proof in the first round quietly assumed it never happened.

**Verification after the round**

| Gate | Result |
| --- | --- |
| `pnpm build` (vite build --mode uat) | pass, 526 modules, 428.29 kB / 142.29 kB gzip |
| `node scripts/balance.mjs` | pass — tap 35.5%, cradle-0.8s 26.0%, cradle-3s 23.0%, **0 watchdog drains on all three**, 0 tunnelling, peak 1500.0 px/s, min 4 substeps, clearance 29.98 > 26 px |
| `node scripts/render-smoke.mjs` | pass — 2,753 draw calls, 10 paint passes, **0 per-frame gradient allocations** |
| `grep -r "Guardian Shelter" src/` | 0 matches |
| `diff shared/game-kit/*.js src/kit/*.js` | all identical |

---

### MAJOR 1 — the raised-flipper wedge (reproduced, then removed by construction)

**Reproduced first.** A cradling bot lost 82.9% of its balls to the stuck
watchdog. The probe dumped the exact contact geometry: ball at (261.4, 518.1),
touching the shoulder wall with normal (-0.436, -0.900) and the RAISED flipper
with normal (+0.497, -0.868). Opposing horizontal components, both pointing up:
a textbook two-normal wedge, mirrored at (105, 520) on the left. Round one's
"correction 3" had removed this wedge for `restAngle` only — the shoulder
clearance was derived from `sin(restAngle)` — and the raised flipper swept
straight back into it.

**Two things were wrong, not one.**

1. *The geometry.* The shoulder wall sat inside the flipper's swept arc. No
   amount of shortening fixes that: the sweep is 60 degrees about a pivot the
   wall has to reach, and any wall near the resting flipper is swept over by the
   raised one. The shoulder is now **deleted entirely**. The funnel ends above
   the flipper, specified in polar coordinates about the pivot
   (`funnelEndR: 52`, `funnelEndDeg: 65`) so clearance is a closed form —
   `R * sin(deg - |upAngle|)` = 30.0 px — and retuning the flipper moves the
   funnel with it instead of silently reopening the wedge.

2. *The bound itself was too weak.* I first asserted clearance > ball + flipper
   radius = 17 px. That is wrong. A ball touching the wall sits one ball radius
   from it, and it can lean that 9 px TOWARD the flipper, so by the triangle
   inequality both contacts are possible whenever
   `dist(wall, axis) <= ballR + (ballR + flipperR)` = **26 px**. The 17 px
   version passed while a ball still wedged once per ~200 runs. The invariant
   now requires 26 px and measures 29.98.

**It is now an asserted invariant, not an argument.** `minWallFlipperClearance()`
(table.js) walks every wall segment against the flipper axis at 96 sampled
angles across the whole sweep and returns the tightest approach;
`scripts/balance.mjs` fails the gate below the bound and prints which segment and
which angle was tightest (currently: left flipper at -0.520 rad — the raised
pose, exactly the case round one never checked).

**Consequence: real outlanes.** Ending the funnel above the flipper opens a gap
outboard of each flipper. A ball that rolls off slowly, or meets a raised
flipper, falls past into the drain. That is the anti-camp measure — it is
geometry, not a special case — and it is why cradling is now slightly *harder*
than tapping instead of being free.

**Retuning that followed.** The outlanes changed the difficulty completely, so
the drain mouth was re-swept against all three hold profiles (200 runs each):

| mouth | tap | cradle 0.8s | cradle 3s |
| --- | --- | --- | --- |
| 26.8 px | 55.0% | 39.0% | 36.0% |
| 34.8 px | 45.5% | 43.0% | 38.0% |
| **42.8 px** | **35.5%** | **26.0%** | **23.0%** |
| 50.8 px | 29.5% | 22.5% | 22.0% |
| 58.8 px | 25.5% | 21.5% | 18.5% |

`pivotDX` 86 -> **78** (`length` unchanged at 56). The mouth is now 2.4 ball
diameters instead of the 3.3 the table needed when it had no outlanes — better
balanced and better looking.

**One residual trap, and why it needed physics rather than geometry.** After the
above, one ball in ~200 still died balanced 17 px directly above a flipper's
pivot cap. That is not a geometry bug: Coulomb friction holds a ball on any
slope shallower than `atan(mu)` = 6.8 degrees, and the top of a round cap
qualifies. Correct physics, permanent rest. Fixed with a **settle wobble**
(`physics.settleSpeed/settleAccel/settleHz`) — a slow alternating horizontal
micro-acceleration applied only to a nearly-stopped ball, which is what a real
cabinet's vibration and lean do. It alternates rather than pushing one way,
because a constant bias would just press the ball into whatever it rested
against and trade one trap for another.

### MAJOR 2 — the gate now measures the flipper-hold axis

The old gate proved the 20-45% band for `FLIP_HOLD = 0.11` and nothing else. At
800 ms the same table won 3.0% of runs with 168/200 timeouts: raised flippers
roofed the drain, no ball could be lost, and the session simply expired below
target. Neither failure was visible to a tap-only gate.

`scripts/balance.mjs` now runs **three hold profiles** with per-profile bands:

- `tap` 110 ms, band 20-45% (the brief's)
- `cradle-0.8s` 800 ms, band 5-60%
- `cradle-3s` 3000 ms, band 5-60%

plus, on every profile, **zero watchdog drains** — a ball dying on the stuck or
per-ball timer is a geometry bug, not gameplay, and the cradle profiles exist
precisely because they are what surfaces those bugs. `--holds` sweeps the axis:
60 ms 34.7%, 110 ms 36.0%, 200 ms 28.0%, 400 ms 24.7%, 800 ms 25.3%, 1.5 s 22.7%,
3 s 22.7%, 6 s 12.0%, watchdog 0 throughout. Monotone and graceful; camping
costs you, and never breaks the game.

Engine support: `run.drainCauses` now counts drains by cause (`drain` /
`stuck` / `timeoutBall`) so the gate can assert on watchdogs directly rather
than inferring them from end causes.

### MAJOR 3 — keyboard release role latched at keydown

`onKeyUp` re-derived the role from the CURRENT phase. Hold ArrowLeft during
play, drain, and the engine serves the next ball into `ready`; the keyup then
resolved to `plunger`, firing the new ball at zero power AND leaving the left
flipper raised for the rest of the session with no way to lower it. Now a
`keysHeld` Map latches `code -> role` at keydown, mirroring the pointer map, so
press and release agree by construction.

---

### Minor fixes

| # | Fix |
| --- | --- |
| 4 | `releaseAllInputs()` drops pointer AND keyboard holds on pause; added a `window blur` handler, since alt-tab never delivers the keyup |
| 5 | `lostpointercapture` handled alongside `pointercancel` — stolen capture can no longer strand a flipper up |
| 6 | Bumper / flipper / ball / plunger-meter gradients cached in `buildPaints()` and painted in each object's own frame (a gradient resolves against the transform at PAINT time, so a unit gradient serves every instance). ~6 gradient allocations per frame -> 0, now asserted by the smoke test |
| 7 | Backdrop gradient built over the CSS canvas height and rebuilt in `fit()`, instead of over the table's authored 640 units |
| 8 | Mute button 34x34 -> **44x44** (WCAG 2.5.5 / GAME_STANDARD section 6) |
| 9 | The per-ball watchdog no longer shows drain copy. It reads "BALL HELD — SERVED FRESH" in gold with reduced shake and no hit-stop — the player did nothing wrong and should not be told they lost a ball they never saw go down |
| 10 | Bot reaction delay resampled into (0, 300 ms] instead of `Math.max(0, gaussian)`, which folded the whole negative tail onto zero and dragged the effective mean to ~88 ms. The gate now prints the achieved mean (~105 ms including the range clamp) so the claim stays checkable |

The render smoke test earned its keep during this round: it caught the
`buildPaints` signature change instantly (`createLinearGradient() got a
non-finite argument #3: NaN`) rather than at runtime on a phone. It now also
paints both flipper sweep extremes, since the flipper painter works in a
mirrored rotated frame where a sign error only shows at one end.

---

## 2026-07-29 — built from spec §1 (batch 4, ten new games)

Built `premium-pinball/` (port 5055) per
`docs/superpowers/specs/2026-07-28-ten-new-games-design.md` §1. Scaffold cloned
from the `guardian-shelter` gold standard; `src/kit/*.js` copied byte-identical
from `shared/game-kit/`; services and utils verbatim.

**Verification**

| Gate | Result |
| --- | --- |
| `pnpm build` (vite build --mode uat) | pass, 526 modules, 427.31 kB / 141.83 kB gzip |
| `node scripts/balance.mjs` (200 seeds) | pass — win 30.5%, 0 tunnelling, peak 1500.0 px/s, min 4 substeps |
| `node scripts/render-smoke.mjs` | pass — 2,247 draw calls across 10 paint passes |
| `grep -r "Guardian Shelter" src/` | 0 matches |
| `diff shared/game-kit/*.js src/kit/*.js` | all identical |
| Emoji-as-sprite scan | 0. One `✓` (U+2713) in LeadCaptureModal HTML text, allowed by GAME_STANDARD §8.3 |

CRM identity: `LEAD_NO_KEY = 'premiumPinballLeadNo'`,
`summaryDtls: 'Premium Pinball Lead'`, slot remark
`'Slot Booking via Premium Pinball'`.

---

## Corrections to the spec

The spec's own rule applies here: *"If a constant in this spec is proven broken
by the sim, correct it and document the correction — the reachable-win
requirement governs over literal constants."* Three corrections, all found by the
balance sim, none of them touching the spec's scoring values, target, ball count
or clock.

### 1. Flipper geometry: `pivotDX` 72 → 86, `length` 60 → 56

**Spec constant affected:** none literally — the spec does not fix flipper
dimensions, but it does fix the 20–45% win band, and the first geometry I chose
missed it badly.

**Problem.** This table has no outlanes (see correction 2 for why), so the mouth
between the flipper tips is the *only* way to lose a ball. My first pass left a
23.9 px free gap against an 18 px ball. The bot essentially never drained: 96.7%
win rate, and 116 of 120 runs ended by crossing the target with a minute to
spare. A pinball game you cannot lose is not a pinball game.

**Measurement.** Grid search over `pivotDX` x `length`, 140–320 seeded runs per
cell, win rate against free gap:

| free gap (px) | 28.4 | 38.8 | 43.9 | 50.8 | 54.8 | 58.8 | 62.3 | 73.2 | 85.2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bot win % | 90.0 | 77.1 | 49.3 | 42.5 | 38.4 | **33.1** | 30.6 | 9.3 | 5.7 |

**Fix.** `pivotDX: 86`, `length: 56` — a 58.8 px mouth, 33% at the sweep's
sample size and 30.5% on the final 200-seed gate. Mid-band, with room either
side for later tuning.

**Rationale.** The gap is wider than a real cabinet's (roughly 3 ball diameters
rather than 1.5). That is deliberate: a mobile session has to produce a clear
loss inside 120 s from a player using their thumbs on glass, and with no outlanes
the centre drain has to carry all of the difficulty on its own.

### 2. Friction model: per-contact velocity retention → Coulomb

**Spec constant affected:** none — the spec says nothing about friction. This is
a correction to my own first implementation, recorded because it is the single
thing that decided whether the game functioned.

**Problem.** I first wrote wall friction as "retain 94% of the tangential
velocity per contact", which is how several games in this repo damp a bounce. It
is fine for a ball that touches a surface and leaves. It is catastrophic for a
ball that *rests* on one: a resting contact re-resolves every substep, 480 times
a second, and 0.94^480 is zero. Every ramp on the table became flypaper. 63 of
120 runs ended on the stuck watchdog.

**Fix.** Cap the tangential impulse at `frictionMu (0.12) x the normal impulse`.
A resting contact carries a tiny normal impulse and therefore almost no grip, so
the ball rolls down the funnel; a hard impact carries a large one and scrubs real
speed. This is also what a steel ball on a lacquered playfield actually does.

### 3. Three geometric traps, each found as stuck-watchdog deaths

The sim reports the position where a ball's speed stays under 20 px/s, which
turned three separate wedges into three coordinates. All three are the same
class of bug: two contact normals whose horizontal components cancel, so the pair
supports the ball against gravity forever.

| Trap | Symptom | Fix |
| --- | --- | --- |
| Funnel wall ended a few px above and left of the flipper pivot | balls parked at (110, 530) and (260, 530); 48/60 runs died | End the shoulder one `ball radius + flipper radius` **above** the resting flipper, a short way out from the pivot, so a ball on the wall can never also touch the pivot cap. Derived in `table.js` from `cfg.flipper` and `cfg.ball` so the two cannot drift apart. |
| Level one-way gate across the plunger lane | balls sat on it like a shelf | Slope it (left end low) so a resting ball rolls off the low end into the playfield. |
| Lane inner wall's top endpoint poked through the gate | ball balanced on the tip — an endpoint normal points straight up and cancels gravity unaided | Drop the wall top to y=120, clearly below the gate. The surviving ~14 px gap is still under a ball diameter, so nothing slips into the lane. |

After all three: **0 stuck hotspots** over 120 probe runs, and stuck deaths fell
from 63/120 to 0/200 on the final gate.

---

## Decisions

**Fixed-size table, letterboxed.** The playfield is authored at 400x640 and
scaled uniformly to fit, with the input transform inverted through the same
scale. The alternative — rebuilding geometry from the measured canvas, as
`wealth-drop` does — would make the drain mouth a function of screen aspect, so
the 30.5% win rate would only be true on the phone it was measured on.

**Engine owns the session clock; the kit loop does not.** `createGameLoop` is
created *without* `sessionSeconds`, and `engine.js` counts the clock down inside
`stepRun`. Two clocks (the loop's wall-clock countdown and the engine's summed
fixed steps) would disagree on a slow device, and only one of them can be the one
the sim measures. A paused loop never calls `update()`, so the engine clock stops
on backgrounding exactly as the kit's own clock would have.

**Custom multi-pointer input.** `kit/input.js` states plainly that it ignores
secondary touches — "these are single-pointer games". Pinball is not: both
flippers have to work at once. The component keeps its own `pointerId -> role`
map with pointer capture, `touch-action: none` and `preventDefault`, and clears
every held flipper when the loop pauses. Every other kit system (loop, effects,
audio, device tiering) is used unmodified.

**`src/render.js` split out of the component.** Not cosmetic: it lets
`scripts/render-smoke.mjs` run all eleven painters under Node against a stub 2D
context that throws on any method or property outside the real
`CanvasRenderingContext2D` surface, and on any non-finite geometry argument.
`pnpm build` proves the JSX parses and nothing more; a misspelled canvas call or
a NaN coordinate would otherwise be discovered on a customer's phone. The smoke
test drives six genuine mid-run engine states (ball in lane, ball live, goal lit,
bonus running, post-drain, run over) at three device profiles plus the low-tier
no-shadow path.

**Rollovers light on downward crossings only.** A ball kicked back up through a
lane would otherwise re-light it, turning the top of the table into an infinite
points fountain.

**Bumper pop coil.** Bumpers apply a fixed 300 px/s outward impulse on top of the
1.15 restitution, gated by the same cooldown as scoring. Without it a slow ball
nestles against the cap and scores on every rearm instead of being thrown back
into the goal cluster.

---

## Deferred / known minors

- **Nudge is not implemented.** Explicitly out of scope per the spec
  ("nudge NOT included — keeps scope tight").
- **Outlanes exist as of the fix round** (see MAJOR 1). They are what makes
  cradling cost something and what keeps a held flipper from roofing the drain.
- **MINOR-C, accepted trade-off: 42.5% of drains are undefendable outlane
  deaths** (left 23.6%, right 18.9%; symmetric, and the centre drain is still
  the plurality). This is the direct cost of the anti-camp geometry — the same
  gap that stops a held flipper roofing the drain is a gap the player cannot
  defend. The Cover Note ball save added this round refunds the cheapest of
  those losses (2.07 saves per run at the tap profile), which softens it but
  does not remove it. Not addressed: there is no kickback, and nothing is
  painted in the outlane to tell the player it is there. A kickback coil, or
  even just an outlane lamp and an arrow, would be the honest next step.
- **Ball watchdogs now fire zero times** across 600 gated runs (3 profiles x 200).
  They remain as backstops only, and the gate fails if either ever fires.
- **Ready-phase touch latches as the plunger.** While a ball waits in the lane,
  ANY pointer down charges the plunger, so a player cannot pre-load a flipper
  before launching, and a finger still held when the 6 s auto-launch fires keeps
  its plunger role until lifted (it cannot flip until then). Deliberate: it makes
  the launch discoverable with one thumb and no on-screen plunger target. Worth
  revisiting only if playtesting shows people trying to hold a flipper through
  the plunge.
- **Sessions run ~27 s** of the 120 s budget at the tap profile, so the
  clock-expiry lose path is rare in practice; three drains is the live one. Both
  paths exist and both are reachable.
- **Plunger power → lane mapping is soft.** Strong plunges rattle around the top
  arc rather than landing deterministically in the far lane, so skilled lane
  selection is partly luck. Playable and fun, but a player cannot reliably farm a
  specific rollover. Tightening it would need a shaped ball guide along the top
  arc.
- **`ctx.roundRect`** is used in the painters (Chrome 99+, Safari 16.4+), the
  same baseline the other games in this repo already ship.

### Final re-review (CLEAN) + controller-applied residuals

The final scoped re-review verified all six minors closed with independent
instrumentation (exhaustive 12,561-placement rest sweep, cradle-forever at 5
seed blocks, Cover Note farm probes) and shipped a correction to the settle-
wobble derivation: BOTH earlier formulas were wrong. Measured directly, the
sustained normal impulse of a resting contact equals weight at every
restitution (g*mu*(1+e) is not a cone; the time-averaged impulse must balance
gravity), and g*mu alone starts the ball moving too slowly to reset the
watchdog. The governing criterion is the wobble's PEAK SLIDING SPEED
v_peak = (A/w)(2*sqrt(1-k^2) - k*(PI - 2*asin(k))), k = g*mu/A, w = 2*PI*Hz,
which must exceed watchdog.stuckSpeed. At the shipped (185, 0.7 Hz):
v_peak = 22.8 px/s vs threshold 20 — a ~4% amplitude margin (true boundary
~178), and the criterion also depends on settleHz (185 at 0.9 Hz FAILS).

Controller applied per prescription: data.js settle comment rewritten around
the peak-speed criterion (the 163.7 derivation removed as refuted);
balance.mjs now computes the closed form every run and asserts
v_peak > stuckSpeed (same treatment as the clearance invariant); README gained
the Cover Note paragraph (GAME_STANDARD 8.5); the pre-Cover-Note mouth sweep
table in data.js is marked historical. The unreachable 'BALL HELD - RUN ENDED'
branch in finish() is left as defensive dead code, noted here.
