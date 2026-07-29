# Goal Juggler — build log

## 2026-07-29 — initial build

Built `goal-juggler/` (dev port 5068) per
`docs/superpowers/specs/2026-07-29-five-arcade-games-design.md` §4, cloned from
`guardian-shelter/`. Vite 5 + React 18.3.1, isolated app, pnpm only.

**Scaffold.** `index.html`, `package.json`, `vite.config.js`, `main.jsx`,
`index.css`, `api.js`, `LeadCaptureModal.jsx`, `SlotBookingModal.jsx`,
`services/playCount.js`, `utils/crypto.js`, `utils/shortener.js` copied from
guardian-shelter with identity strings only changed. `ThankYouScreen.jsx` taken
from goal-keeper's variant (gradient backdrop) so the game ships with zero binary
assets. `src/kit/` copied byte-identical from `shared/game-kit/`.

**CRM identity.** `LEAD_NO_KEY = 'goalJugglerLeadNo'`, default
`summaryDtls: 'Goal Juggler Lead'`, modal posts
`'Goal Juggler - Post Game Lead'`, slot remarks `'Goal Juggler Slot Booking'` /
`'Slot Booking via Goal Juggler'`. `grep -r "Guardian Shelter" src/` is ZERO —
this included two comment headers in `index.css` that the scaffold carries and
that a naive copy leaves behind.

**Architecture.** Physics lives in a pure module (`src/physics.js`) that never
imports `data.js`; config is a parameter and presentation is an optional callback
bag. `scripts/balance.mjs` imports the shipped `data.js` + `physics.js` and
drives them on the same fixed 1/120 s step the kit loop uses, so the sim runs the
code that ships rather than a re-implementation of it. The component contains no
rules.

### Verification

- `pnpm install` — clean (pnpm 10.29.2).
- `pnpm build` (mode uat) — green, 524 modules, `index-DsRTWs6E.js` 426.57 kB
  (142.31 kB gzip), `index-bneSBdfR.css` 33.60 kB, built in 3.35s.
- `node scripts/balance.mjs --runs 400` — **GATE: PASS**, all six profiles inside
  band on all four seed blocks.
- `grep -r "Guardian Shelter" src/` — 0 matches.
- Kit files byte-identical to `shared/game-kit/`.

### Balance gate, final numbers

4 seed blocks x 400 runs x 6 profiles = 9,600 runs. Each block runs a different
canvas size, so the assertions hold on every shipped screen shape.

| profile | A 340x600 | B 390x620 | C 410x700 | D 410x830 | band |
|---|---|---|---|---|---|
| **honest** | **39.5%** | **40.3%** | **36.8%** | **35.5%** | 25–45% |
| sharp | 100.0% | 100.0% | 100.0% | 100.0% | ≥85% |
| idle | 0.0% | 0.0% | 0.0% | 0.0% | =0% |
| camp | 0.0% | 0.0% | 0.0% | 0.0% | ≤5% |
| spam | 0.0% | 0.0% | 0.0% | 0.0% | ≤5% |
| masher | 0.0% | 0.0% | 0.0% | 0.0% | ≤5% |

Mean scores across all blocks: honest 18,494 · sharp 30,060 · camp 2,718 ·
spam 7,945 · masher 49 · idle 0. The three exploit profiles are asserted on BOTH
axes — win rate AND mean score strictly below the honest bot — and pass both on
every block.

Honest drop distribution (0/1/2/3 drops), block B: 18 / 53 / 90 / 239, i.e. a
loss usually reads as one orb too many rather than a collapse. Idle loses in
8.30–8.33s against the 12s ceiling. Spam dies at 22.2s, masher at 9.4s, camp at
38.7–40.3s. Longest session 80.0s + 850 ms end beat = 80.9s against the 120s cap.

**Tunnelling: 0 events over 9,600 runs** (wall 0, floor 0, ceiling 0, orb 0).
Worst observed substep displacement 0.153 R, worst penetrations wall 0.340 R /
floor 0.107 R / ceiling 0.483 R, worst orb-orb overlap 0.236 R, all against a
0.75 R threshold. The forced worst-case probe passes every case:

    clamp-speed into left wall    pen w/f/c = 0.062/0.048/0.000 R, step 0.102 R, substeps 4
    clamp-speed into right wall   pen w/f/c = 0.062/0.048/0.000 R, step 0.102 R, substeps 4
    clamp-speed into ceiling      pen w/f/c = 0.000/0.008/0.049 R, step 0.102 R, substeps 4
    clamp-speed into floor        pen w/f/c = 0.000/0.068/0.000 R, step 0.102 R, substeps 4
    two orbs head-on at 2x clamp  collision registered, max overlap 0.186 R

Substep floor: 4 substeps at the clamp = 2.77 px per substep against a 27.2 px
radius (0.102 R), satisfying the brief's "≥4 substeps at max speed".

### Corrections against the spec (all sim-proven)

**1. The same-orb decay compounds instead of sitting flat at 60%.**

The brief says "consecutive taps on the same orb within 300 ms decay to 60%
impulse (no pin-to-ceiling spam)". A flat 60% does not close the exploit.
Arithmetic against the shipped constants: at ten taps a second a 0.6 multiplier
still sets vy to −336 px/s each tap while gravity only recovers 72 px/s in the
100 ms between them, so the orb climbs at ~2.6 m/s and parks against the ceiling
for free — exactly the outcome the clause exists to prevent.

Shipped: a compounding chain (0.6, 0.36, 0.216, 0.130, 0.078 …) floored at 0.05.
By the fifth tap of a chain the impulse (≈39 px/s at the reference scale) is
smaller than the 72 px/s gravity adds between taps, so hammering an orb makes it
fall *faster*. Chained taps additionally score **zero**. Both halves are
required: the decay stops spam controlling the orb, the zero stops it farming
points off an orb it is not really keeping up. Measured: the lock-on spam bot
loses 100% of runs and dies at 22.2s.

**2. Orb radius derives from the field HEIGHT, not its width.**

Not in the brief either way, but the obvious choice (width) leaves a real device
dependence. Velocities are scaled by field height, so motion is already
screen-similar; sizing the orbs off the width breaks that — a 410x830 handset
gets a 704 px field but the same ~28 px orbs as a 390x620 one, so the court is
relatively emptier and orb-orb collisions rarer.

Measured at `upImpulse` 790, honest bot: 340x600 48.8% · 390x620 34.3% ·
410x700 37.8% · 410x830 43.3% — a nine-point swing from screen shape alone, with
block A already out the top of the band. After switching to
`height x 0.055` (with a width cap that does not bind on any shipped size):
28.5 / 37.3 / 27.8 / 32.8. The residual spread is sampling noise plus the radius
clamp biting on the tallest field.

**3. Hit-pad floor 46 → 40 logical px of radius.**

At 46 the floor *bound* on the narrowest gate size: on a 340x600 field
`1.75 x R` is only 40.6 px, so that phone silently received a 1.98x pad against
1.75x everywhere else, and the honest bot won 48.8% there against 34.3% on a
390x620. The pad is now uniform at 1.75x on every shipped size and the 40 px
floor is an accessibility backstop (an 80 px target against the 44 px platform
minimum) rather than part of the balance.

**4. `tap.upImpulse` tuned to 775.**

Not a spec value — the brief fixes gravity, restitution, the clamp and the
substep count but not the impulse, which is the game's actual difficulty knob.
An orb tapped at rest rises `up²/2g` and returns after `2·up/g`, both device
independent because k scales gravity and impulse together. Swept over 400 runs on
each of the four canvas sizes:

    up=740  honest 46.3 / 50.5 / 48.8 / 51.5   (out the top of the band)
    up=760  honest 42.5 / 42.8 / 39.5 / 44.0
    up=775  honest 33.3 / 40.3 / 38.3 / 36.8   <- shipped
    up=790  honest 28.5 / 37.3 / 27.8 / 32.8   (too near the 25% floor)

775 gives a 417 px arc — about 85% of the reference field, so an orb tapped low
crests near the ceiling, which is what a juggling arc should look like — on a
2.15s cycle, so four orbs demand ~1.9 taps a second.

Everything else ships exactly as specified.

### Two gate bugs found and fixed during the build

Both are recorded because in each case the gate was reporting a number that
meant nothing, and in one case it was reporting a *pass*.

**The bot conflated reaction latency with exclusive occupancy.** The first
version could not evaluate orb B until its 220 ms latency on orb A had elapsed,
capping it at 1/(reaction+gap) = 3.2 taps/s. It measured **0% win at every
setting of every game constant** — across `upImpulse` 520–940, `strikeLead`
0.25–1.2, aim sigma 0.2–1.0 and hit pads 1.5–2.3x — while the 120 ms bot won
93–100%, with a knife-edge cliff between 150 ms (31%) and 180 ms (1%). A
30-point swing over 30 ms is not a balance curve, it is a broken model. Drop-time
histograms confirmed the mechanism: the 220 ms bot's drops clustered at t=35s
(the third orb) and the 120 ms bot's at t=60s (the fourth).

Reaction time is a latency on each action, not occupancy — a juggler watches the
next ball while the hand is travelling. The bot now holds up to two scheduled
taps with execution serialised by finger speed, and pays for planning ahead with
aim sigma that grows with the lead. The curve became smooth
(120ms 100% · 200ms 94% · 220ms 83% · 260ms 35% · 300ms 3%) and the game constants
became tunable.

A related fix: the lead extrapolated in a straight line *through* the side rails,
so aims were being clamped to a wall and a third of all misses were the bot
aiming outside the field. The lead now reflects off the walls at the visible
restitution. Miss rate fell from 11–15% to 4–7%.

**The `spam` canary never entered the code path it guarded.** It re-picked the
*lowest* orb before each tap, so at ten taps a second with four orbs in play
consecutive taps landed on four different orbs and the 300 ms same-orb window
never triggered once. It was measuring a superhuman round-robin juggler with zero
reaction latency — and it "passed" at 100% win and 50,000 points, i.e. it would
have shipped as evidence that the anti-spam rule worked while never testing it.
It now **locks on** to a single orb and hammers that one; it loses 100% of runs
and dies at 22.2s. A `masher` profile (8 taps/s at random points, no aiming) was
added alongside it and dies at 9.4s with a 98.8% miss rate.

### Quality bar

Premium orb art (layered `Path2D` silhouettes, radial body gradient, rim-light
crescent, rotating specular sweep, per-orb glow), motion trails, tap shockwave
rings (hit and miss variants), bounce squash-and-stretch rotated along the tap
direction, shatter burst of 16+10 particles with screen shake and hit-stop,
high-keep sparkle, wind-streak gust telegraph that appears before the wind bites,
all-four-airborne streak banner, animated score counter, danger ring on the orb
closest to being lost (driven by the shipped `timeToFloor`, the same helper the
gate's bots use to pick a target).

Audio is kit synth only: the bounce voice is pitched by how high the orb was
caught plus a per-goal semitone offset, so a Home orb caught high and an
Education orb caught low are never the same sound. Haptics guarded via the kit's
`haptic()`. No emoji sprites, no image files. HUD score written via `textContent`
ref; the handful of values that change a few times per run (covers, live count,
gust) use React state behind change guards. Pools for trails, tap rings and wind
streaks are allocated once at mount; nothing allocates in the loop. Full teardown
(loop, input, ResizeObserver, orientation listener, timers, fx, audio).
`gameKey` remount on retry, `incrementPlayCount()` exactly once in `startGame`.
`touch-action: none`, `fitCanvas` with DPR cap 2, 430 px container.

### Deferred minors (as recorded at initial build; see round 1 below)

1. **Trails restart on resize** rather than being remapped. Two frames of ribbon
   on a URL-bar move; remapping a ring buffer through a field transform is more
   code than the artefact is worth.
2. **The score target is not a difficulty knob for a real player.** Honest
   winning runs average 21,000–23,000 against a 1,500 target, so the AND in the
   win condition only ever binds the corner-camper it was written for. Faithful
   to the brief and deliberately left alone, but if a future revision wants the
   target to bite it would need to be an order of magnitude higher.
3. **`serveGrace` (0.12s) suppresses orb-orb tunnelling diagnostics** for a
   freshly served orb. A serve drops an orb in at the ceiling and a crowded field
   can put it touching one already up there; that is a spawn overlap the solver
   separates on the next substep, not a body passing through another. The serve
   picker maximises 2D clearance over six tries first, so the case is rare.
4. **Gust direction is not persisted across a resize.** The gust segment timer
   continues, but a resize mid-segment rescales the acceleration through `k`
   without re-telegraphing. Invisible in practice.

---

## 2026-07-29 — review fix round 1

Review verdict: NOT CLEAN, 3 Majors + 6 minors. The strategy and physics core
held (the reviewer's own policies all lost at matched hands, max single-tap
airtime was proven, tunnelling was clean over 48k runs, and initial-build
corrections #2 and #4 were validated independently). All 9 items fixed below.

The three Majors interacted: closing MAJOR 1 and MAJOR 3 invalidated the initial
build's tuning outright, because **the gate's own bots had been living on the
exploits they were supposed to be guarding**. That is the headline of this round
and it is worth stating plainly — the initial build's "GATE: PASS" was measuring
a game nobody could actually play the way the bots were playing it.

### MAJOR 1 — chained taps farmed the high-keep bonus

`physics.js` armed `highArmed` on EVERY tap, including chained ones and taps on
orbs already above the line, and the next frame paid +40 with no crest. The 10 Hz
spam canary's entire 7,945 mean score was this farm: 198 high-keeps, zero genuine
crests. A 24 Hz version would have beaten honest play.

Fixed in `src/physics.js` — the arm is now
`hit.highArmed = (hit.y - f.R) > f.highKeepY`, i.e. only from BELOW the line, and
chained taps return before reaching it. The bonus is now for LIFTING a goal into
the top third, which is what it was always supposed to mean. Spam's mean score
collapsed **7,945 -> 60**, masher's **49 -> 46**.

### MAJOR 3 — the compounding decay did not stop pinning

The initial build claimed a compounding decay floored at 0.05 inverted the
exploit. It did not. At the floor a tap still delivered `775 x 0.05 = 38.75` px/s
of upward impulse, and any rate at or above 9.29 Hz delivered that faster than
gravity removed it. The gate's own 10 Hz canary was pinning its orb the whole
time and lost only because it had abandoned the other three. The `data.js` and
README arithmetic asserting otherwise was also stale (-336 and 28 px/s were
computed against an earlier 560 impulse).

Fixed with the reviewer's stronger option: **a repeat inside the window is
ignored entirely** — no impulse, no steer, no score, no arm. A decayed impulse is
still an impulse, so no floor above zero is rate-proof; not applying one is. The
`spamDecay` / `spamFloor` constants are deleted rather than left as dead config.

New gate assertion, `pinProbe()`: one isolated orb, hammered at a fixed rate for
45 s, across every block.

    rate     survived   verdict
     2 Hz      22.9s    fell   (below the repeat window — reported, not asserted)
     3 Hz      22.3s    fell   (below the repeat window — reported, not asserted)
     3.5 Hz     1.6s    fell   OK
     4 Hz       1.6s    fell   OK
     5 Hz       1.6s    fell   OK
     6 Hz       1.6s    fell   OK
     8 Hz       1.6s    fell   OK
    10 Hz       1.6s    fell   OK
    14 Hz       1.6s    fell   OK
    20 Hz       1.6s    fell   OK
    30 Hz       1.6s    fell   OK

Only rates inside the repeat window (>= 3.34 Hz) are asserted. Below it taps are
not repeats and carry full impulse by design; that band is reported rather than
hidden, and even there nothing pins — 2-3 Hz holds an orb for ~22 s, not the 45 s
the probe demands.

### MAJOR 2 — pause scumming

The kit's `visibilitychange` auto-pause froze the world and resumed it instantly,
so a player could do their perceiving and planning in stopped time. The reviewer
measured the honest bot at 84.7-87.7% with unlimited pauses at 10.3 per run.

The kit is immutable, so the rule was added game-locally — but in
`src/physics.js`, NOT the component, so the gate can drive it and measure the
exploit rather than take the component's word for it. `beginPause` / `endPause` /
`isFrozen` / `isInputLocked`, called from the component's `onPause`:

- **freeze 1.5 s** — world and session clock both held, visible 3-2-1 count, no
  taps accepted. A returning player is never dropped into a live crisis.
- **live lock 0.25 s** — world running, taps still refused. This is the part that
  removes the advantage: the crisis you paused for keeps developing for about as
  long as the reaction you skipped.

New `pauser` canary: the honest profile plus a pause at every crisis, unlimited
and greedy. Band `[0, honest ceiling]` — **pausing must never PAY**; it is
allowed to cost. Measured **0.0%** across all blocks (it pauses so often the live
lock never lets it act, dying at ~21 s). One pause costs 0.25 s of locked live
play out of 80 s, i.e. 0.3% of a session, so a genuine phone call is unaffected.

**Repo-wide note for the controller:** this is kit-inherited. Every game in this
repo that uses `createGameLoop` with a reaction-time-limited mechanic has the
same hole, and the same two-phase re-acquire is the pattern to copy.

### The retune the Majors forced

With chained taps as no-ops, the initial build's bots collapsed — `sharp` went
from 100% to 0% and died at 12.2 s. Tracing showed why: it was making **4.68
taps/s against a cycle needing 1.9**, i.e. it was tapping orbs already high,
smashing them into the ceiling, and re-tapping the rebound inside 300 ms. The
decayed impulse had been quietly holding them there. Its 100% was measuring the
exploit, not skill.

Three bot-model corrections followed, all making the bot more like a person
rather than more capable:

1. **It no longer re-taps an orb inside the repeat window.** The game says "TOO
   FAST" on screen; no player would spend a tap on it. This one line is what
   stops the ceiling loop. (A strike-zone HEIGHT gate was tried first and is far
   too strict — it cost the bot the whole upper half of the field and pinned it
   at 0.0% at every impulse from 460 to 650. Refuse the repeat, not the high orb.)
2. **`maxPending` 2 -> 4.** Taps pipeline, so a player who plans four lands the
   last `reaction + 3 x minGap` = 0.505 s out, inside a 0.72 s window. Holding
   only two in mind is a bot limitation being read as difficulty. Planning ahead
   is still paid for by `aimDriftPerSec`.
3. **Aim tightened 0.30/0.55 -> 0.24/0.35, decision cadence 60 -> 40 ms,
   strikeLead 0.45 -> 0.55.** The old values produced an 8.6% miss rate against a
   47 px-radius pad, which is not what a person does; it was the initial build's
   unwitting compensation for a bot being carried by the exploit. Now 4-5%,
   against sharp's 2.8%.

`tap.upImpulse` then retuned **775 -> 520**. The impulse has a hard geometric
ceiling the initial build missed: a full impulse must not bury an orb in the
ceiling, and an orb is strikeable all the way down only while its apex is at most
half the field, which reduces (k cancels) to
`up <= sqrt(refHeight x gravity) = 612`. Above it the strike window collapses —
at 775 it is 0.14 s. Swept over 250 runs on each block:

    up=460  honest 45.2 / 55.6 / 44.0 / 42.4   (out the top)
    up=520  honest 33.2 / 42.0 / 36.4 / 34.8   <- shipped
    up=560  honest 26.0 / 31.6 / 26.0 / 25.2   (on the floor)
    up=612  honest 13.2 / 12.4 / 11.6 / 12.0   (out the bottom)

### Minors

1. **Results copy was untruthful.** `Screens.jsx` always rendered "A goal hit the
   floor". `endCause` now rides alongside the stats contract (which stays exactly
   `{score, bounces, maxOrbs, drops}`) through `App.jsx` to `ResultsScreen`, and
   a clock-expiry loss reads "Lasted, but coasted" with its own icon.
2. **ESCALATED — the score target was dead.** 1,500 was crossed at t=13.2 s and
   never failed once in ~50,000 runs; the HUD bar sat pinned at 100% for 83% of
   the session and the 9,000 results ring was exceeded by 97% of runs by t=44 s.
   Fixed as a set. Choosing a live value needs the score distribution among runs
   that SURVIVED, since everything else already lost on drops:

       p5 15,120-15,660   p25 15,440-15,980   p50 15,840-16,400   p90 16,560-17,020

   `targetScore` 1,500 -> **15,000** (just under p5, so it fires on survivors who
   coasted), results ring 9,000 -> **18,000** (sharp averages 16,113, honest p90
   ~17,000). The HUD bar is `score / targetScore` and now moves across the whole
   session instead of saturating in the first 13 s.

   The reviewer suggested 8,000-12,000; that range predates the MAJOR 1 fix,
   which removed ~200 farmed bonuses per run and moved the whole distribution
   down — at 12,000 the target would still never have fired. Honest reading of
   the result: the target does not do much work any more. With the cradle and the
   pin both closed, surviving 80 s requires ~190 bounces and ~190 bounces is
   ~16,000 points, so there is no longer a way to survive while scoring badly.
   That is a property of this round's fixes, not of the constant. The gate now
   asserts liveness across all blocks combined (7 of 2,000) rather than per-block,
   because per-block it fires on single-digit runs and asserting that would be
   asserting sampling noise; it separately asserts the target stays below the
   median survivor so it can never become the dominant lose condition.
3. **One-finger constraint documented.** `kit/input.js` tracks a single pointer,
   so a resting second finger swallows every tap. Kit is immutable, so the How to
   Play screen and the README now say so. Also on the deferred list below.
4. **Per-frame allocation removed.** The danger-ring draw built an `rgba()`
   template string per orb per frame (~240 allocs/s at four orbs and 60 fps).
   Now `globalAlpha` against a constant colour.
5. **Correction #3's justification named the wrong canvas.** With height-derived
   R, block A gives `1.75 x R = 45.6` px (1.76x) — the floor does nothing there,
   and the quoted 40.6 corresponds to a ~300x548 SE-class stage that was not in
   the block list. The 46 -> 40 change stays, because SE-class is exactly what it
   protects; the recorded reason is corrected, and a **fifth gate block
   `S 300x548`** was added so the device class where the floor binds is now
   measured rather than assumed. Honest wins 31.5% there.
6. **Anti-exploit overstatements aligned** in `data.js`, `README.md` and this log:
   chained taps score nothing AND arm nothing AND carry no impulse; pinning is
   impossible at any rate inside the repeat window; the decay is gone rather than
   being "defence in depth".

**Recommended, folded in:** the reviewer's blocked-row serve probe is now a gate
assertion — 7,500 serves forced into a full entry row across all blocks, 0
tunnelling events, worst post-grace overlap 0.024 R. `serveGrace` is proven to
hide nothing.

### Round-1 gate: PASS

5 blocks x 400 runs x 7 profiles = 14,000 runs.

| profile | S 300x548 | A 340x600 | B 390x620 | C 410x700 | D 410x830 | band | mean score |
|---|---|---|---|---|---|---|---|
| **honest** | **31.5%** | **31.8%** | **40.0%** | **38.0%** | **32.8%** | 25-45% | 12,609 |
| sharp | 98.3% | 99.0% | 98.5% | 98.0% | 96.5% | >=85% | 16,113 |
| pauser | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=45% | 734 |
| idle | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | =0% | 0 |
| camp | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=5% | 1,191 |
| spam | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=5% | 60 |
| masher | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | <=5% | 46 |

Combined honest 34.8% over 2,000 runs. Exploit canaries pass on both axes (win
rate AND mean score strictly below honest). Idle loses in 8.30-8.33 s. Spam dies
at 7.5 s, masher at 9.6 s, camp at 31.4-33.6 s, pauser at ~21 s. Longest session
80.0 s + 850 ms end beat = 80.9 s against the 120 s cap.

**Tunnelling: 0 events over 14,000 runs** (wall 0, floor 0, ceiling 0, orb 0),
worst substep 0.137 R, worst penetrations 0.128 / 0.113 / 0.259 R, worst overlap
0.226 R, all against a 0.75 R threshold. Forced worst cases all contained.

Build: `pnpm build` (uat) green, 524 modules, `index-Bp1xh8rV.js` 429.17 kB
(142.97 kB gzip), 2.38 s.

### Deferred minors after round 1

1. **Trails restart on resize** rather than being remapped (unchanged).
2. **One finger only.** `kit/input.js` is single-pointer and the kit is
   immutable, so a resting second finger blocks input. Documented in-game and in
   the README rather than fixed.
3. **`serveGrace` still suppresses the orb-overlap diagnostic** for 0.12 s after
   a serve — now proven harmless by the blocked-row probe rather than argued.
4. **Gust direction is not re-telegraphed across a mid-segment resize**
   (unchanged).
5. **The score target does little work.** Live but marginal (7 of 2,000 runs), by
   construction rather than by tuning — see minor 2 above. If a future revision
   wants it to bite, the lever is the scoring weights, not the threshold.


## Controller close-out — the strike-lead question, resolved by bracket (2026-07-29)

The independent re-review was interrupted with one thread open: the gap between
the round-1 `strikeLead` 0.45 and larger values looked "too large to leave
unexplained". Resolved by running the SHIPPED gate with the honest spec bracketed
on both sides of the shipped 0.55, nothing else changed:

    strikeLead 0.45   honest  7.5% /  8.0%  (collapse — far below the 25-45% band)
    strikeLead 0.55   honest 31.5 / 31.8 / 40.0 / 38.0 / 32.8  (shipped; GATE PASS)
    strikeLead 0.70   honest 29.3 / 30.0 / 39.3 / 31.5 / 32.3  (plateau — no gain)

The curve is a step followed by a plateau, and the step has a mechanical cause:
the commit horizon is `reaction + strikeLead`. Four orb deadlines cluster inside
one 0.72 s strike window and taps pipeline at `reaction + 3 x minGap` = 0.505 s,
so a 0.67 s horizon (0.45) cannot land the third and fourth taps and the bot
sheds orbs regardless of tuning, while 0.77 s (0.55) just clears it. Above that,
`aimDriftPerSec` taxes the longer lead and earlier commitment buys nothing —
0.70 is statistically identical to 0.55. The shipped 0.55 is therefore the most
conservative value on the plateau and the physically motivated one (commit as
the orb crests). The retune was load-bearing, not cosmetic, and the tuning is
robust on the high side.

Final shipped-state gate re-run after restoring 0.55: **GATE: PASS** — honest
34.8% combined over 2,000 runs, sharp 98.0%, every canary shut, zero tunnelling.
