---
type: log
title: Cover Drive Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/cover-drive/log.md
timestamp: 2026-07-29
---

# Cover Drive Change Log

## [2026-07-29] Initial build

Built to `docs/superpowers/specs/2026-07-28-ten-new-games-design.md` §2 and
`okf-brain/GAME_STANDARD.md` v2.

### Scaffold and identity

- Scaffolded from the `guardian-shelter/` gold standard per GAME_STANDARD §1 —
  `index.html`, `vite.config.js`, `package.json`, `main.jsx`, `index.css`,
  `api.js`, `LeadCaptureModal.jsx`, `SlotBookingModal.jsx`, `ThankYouScreen.jsx`,
  `services/playCount.js`, `utils/crypto.js`, `utils/shortener.js` — plus an
  unedited copy of `shared/game-kit/*.js` into `src/kit/`. The copies were taken
  via `wealth-drop/`, which is the same scaffold with only the identity strings
  changed; diffing the two confirmed they differ from guardian-shelter in exactly
  those strings, and it avoids inheriting guardian-shelter's
  `ThankYouScreen` background-image import, which has no asset in this game.
- Identity rewired: package name `cover-drive`, rollup output `CoverDrive`, dev
  port **5056**, title `Cover Drive — Bajaj Life`,
  `LEAD_NO_KEY = 'coverDriveLeadNo'`, `summaryDtls = 'Cover Drive Lead'`,
  slot remark `Cover Drive Slot Booking | Score: N`, lead summary
  `Cover Drive - Post Game Lead`. `grep -rn "Guardian Shelter" src/` returns
  **zero matches**, as does a search for `wealth drop` / `wealthDrop`. The only
  surviving foreign name is the first-line comment of the verbatim-copied
  `index.css` (`Life Goals Bubble Shooter — premium UI redesign`), which is
  identical in guardian-shelter and every game in the batch and is left alone
  because that file is a verbatim copy.
- The stats contract has no `score` key, so `App.jsx` passes `stats.runs` to the
  lead and slot modals as the CRM score. Screen flow, `gameKey` remount and the
  single `incrementPlayCount()` in `startGame` are unchanged from the standard.

### Architecture — rules out of the component

The spec requires the balance sim to import the SHIPPED modules. Rather than
carve a pure region out of the canvas component and slice it at sim time (the
`wealth-drop` approach), the rules were put in their own files from the start:

- `src/deliveries.js` — seeded PRNG, Gaussian, delivery generation, per-delivery
  timing windows, late cutoff, worst-case ball duration. Zero imports.
- `src/rules.js` — swing classification, the chase state machine, `statsOf()`.
  Imports only `deliveries.js`.
- `src/CoverDriveGame.jsx` calls `makeDelivery()` and `resolveBall()` and owns no
  gameplay decision of its own.

`scripts/balance.mjs` therefore does a plain `import` of the shipping code —
no temp files, no source slicing, nothing that can silently drift.

### Gameplay

- Chase 40 off 18 with 3 wickets. Single control: tap to swing, judged on
  `|swing − ideal contact|`. PERFECT alternates 4 then 6; GOOD alternates 1 then
  2; EDGE scores nothing and is out 35% of the time; MISS (including a leave) is
  out if the delivery was on the stumps, which 60% are.
- Three pace tiers (Loopy 0.86× / Stock 1.00× / Express 1.18×, weighted
  0.30/0.42/0.28), ball speed +8% every over, and a 0.8× slower ball at p = 0.22
  from ball 7. Deliveries are named as life events per tier, with a separate name
  set for the slower ball.
- Every 6th ball is a Cover ball; a PERFECT on it banks one wicket shield
  (max 1) which absorbs the next dismissal.
- Win the instant runs reach 40 with wickets in hand; lose on the third wicket or
  when the 18 balls run out short. Wicket precedence over the chase is stated
  explicitly in `resolveBall()` even though a wicket ball scores nothing and the
  two cannot actually collide.

### Spec correction 1 of 2 — timing windows divide by delivery speed

**This is a correction, not a reading.** The spec states flat windows of ±36 /
±90 / ±150 ms; the shipped game divides all three by the delivery's speed factor,
so the number a given ball is judged on is not the number in the spec. That is a
deviation and is logged as one.

Rationale: the spec also specifies three delivery speeds AND an 8% ramp. A window
constant in milliseconds regardless of ball speed makes both of those decorative
for difficulty — they change *when* to tap, never *how precisely*, so "Express"
and the ramp would be pure animation. Dividing by speed is what makes the pace
telegraph mean something. Over-3 Express is 1.376× reference, so its PERFECT
window is ±13.6 ms against ±18.7 ms for a reference stock ball, and the gauge
draws its green bands from the actual computed window, so a fast ball visibly has
a narrower target.

It is sim-verified, and importantly **the 99.3% baseline that proves correction 2
was measured with this division already in place** (`--scale 1.00` scales the
windows but leaves the speed divide untouched). So the proof that the literal
±36 ms is unreachable does not depend on removing this correction — if anything
the flat-window variant is easier still, because it never narrows on a quick ball.

### The gauge needle sweeps at a constant wall-clock rate — deliberate

`GAUGE_LEAD` (0.45 s) and `GAUGE_SPAN` (0.58 s) are wall-clock constants, so the
needle crosses the arc at the same angular rate on every delivery. What changes
with pace is the *width of the green bands*, not the speed of the cue.

This is the choice that keeps the balance bot honest. The player's timing task is
posed in constant wall-clock terms, so a fixed-σ millisecond error is the right
model of a human doing it: the error does not scale with ball speed because the
thing being tracked does not either. Had the needle rate scaled with the
delivery, human error would plausibly scale with it too (proportional rather than
absolute), and a constant σ = 45 ms bot would stop being a fair proxy — it would
understate difficulty on quick balls and overstate it on slow ones, and the
measured 35.0% would not mean what it claims. The constant rate is what lets one
σ stand for one player across all three paces and all three overs.

### Spec correction 2 of 2 — `timing.windowScale = 0.52`

The spec's literal windows (36 / 90 / 150 ms) are
unreachably generous against the spec's own σ = 45 ms bot: ±36 ms is 0.8σ, so
that bot times well over half its balls PERFECT and, with a boundary worth an
average of 5, chases 40 as a formality while losing almost no wickets. Measured
on the shipped rules at `windowScale 1.00`, its chase success is **99.3%**
against the brief's 25–45% band. This is a genuine internal inconsistency in the
spec, not a matter of taste: no arrangement of the other constants recovers the
band while ±36 ms is 0.8σ, because PERFECT alone then pays ~52 runs off 18 balls
against a target of 40.

The correction is one number that scales all three windows together, so the
authored **36 : 90 : 150 ratio is preserved exactly** and only the absolute
difficulty moves. Alternatives rejected: raising the target or cutting the run
values would have broken the spec's own "40 runs / 4 / 6 / 1 / 2" figures, all of
which are quoted in player-facing copy; tightening only the PERFECT window would
have changed the relationship between the bands that the gauge draws.

Measured with `node scripts/balance.mjs --runs 4000 --scale <s>`, seed
`0x0c07d21e`:

| `windowScale` | 0.45 | 0.48 | 0.50 | **0.52** | 0.55 | 0.58 | 0.62 | 0.70 | 1.00 |
|---|---|---|---|---|---|---|---|---|---|
| casual σ=45 | 18.9% | 25.4% | 30.9% | **36.3%** | 44.3% | 51.4% | 62.1% | 78.7% | 99.3% |
| ceiling σ=12 | 100% | 100% | 100% | **100%** | 100% | 100% | 100% | 100% | 100% |

0.52 sits mid-band with a two-sided margin — the 25–45% band spans roughly
0.478–0.553 — and the skill ceiling is untouched at every value tested, so the
correction costs nothing at the top end: a metronomic bat still always wins. The
table, the rationale and the resulting effective windows are also commented at
the constant's definition in `src/data.js` and reproduced in the game README.

`sessionSeconds` was set to 100 (spec cap 120) and `deliveries.resolveSeconds`
was cut from an initial 1.05 to 0.55 after the session-length gate below showed
the innings running long; no other spec constant was changed.

### Deliberate non-use of `BALANCE.inputBufferSeconds`

The kit offers a 0.12 s input buffer, and every other game in the batch uses it.
Cover Drive does not, on purpose. An input buffer exists to forgive a press that
arrives slightly before the game can accept it — but here "slightly early" is not
a near-miss to be forgiven, it *is* the measurement. Buffering a pre-release tap
and replaying it at release would hand a mistimed swing a perfect one, which is
the one thing this game must never do. Taps before release are therefore dropped
outright (with a click and no penalty, since you cannot be out to a ball that has
not been bowled), and taps during flight are stamped with their true ball time
rather than deferred. The frame-latency problem a buffer would otherwise paper
over is solved exactly instead, by back-dating `lastTickWall` with the loop's
interpolation alpha — see the fix round below.

### Rendering

Programmatic canvas only — **no emoji sprites, no image files, and in fact no
`fillText`/`strokeText` anywhere in the game component**: every mark on the
canvas is a drawn shape, and all type is DOM over the top. Floodlit sky with
drawn pylon lamp grids and a speckled crowd, a boundary rope drawn as the top arc
of a wide ellipse with posts, a 30-yard circle, mown stripes converging with the
pitch, and a perspective pitch trapezoid with worn patch, creases and return
creases — all baked into one offscreen bitmap per resize and blitted, so the hot
loop builds no paths or gradients. Per frame only the marker, bowler, keeper,
stumps, gauge, batter, ball and its trail are drawn.

Batter and bowler are rounded-rect-and-circle rigs: pads with straps, torso with
a brand-blue collar, a blue helmet with a drawn grille, and a bat that rotates
about the hands. The bat animates from the contact pose through the follow-through
with a blurred wedge behind the blade, because a swing that started at the tap
would make contact after the ball had gone — the wedge supplies the back-swing
the eye expects while contact stays exactly on the tap.

Three stumps and two bails scatter with velocity and spin on a dismissal, at 35%
force when a shield absorbs it — a shielded miss still rattles the timber,
because the shield should look like it did work.

### Input latency

A pointer event fires between frames, so judging it on the next tick adds up to a
frame of latency — 16 ms against an 18.7 ms PERFECT window, i.e. the difference
between a four and a single. The handler stamps the tap with
`s.ballClock + (performance.now() − lastTickWall)`, where `lastTickWall` is set
at the end of `render()`, so the swing is judged at the ball time it actually
happened at rather than the ball time of the tick that processed it. Taps before
release are a flinch with a click, not a dismissal: you cannot be out to a ball
that has not been bowled.

### Juice and HUD

Per the floor: ≥ 8 particles on every event (26 on a four, 34 on a six, 26 on a
wicket, 18 on a shield, 14 on contact, 40 on the end beat), big floating
`FOUR!` / `SIX!` / `COVERED` text, screen shake on wickets and misses, hit-stop
on contact and dismissal, squash on the ball at contact, a tapered ball trail
sized from the device effect budget, a pulsing length marker and Cover halo,
an animated stage-in transition and a damped runs counter. Audio is the kit Web
Audio synth only, unlocked on the first pointer gesture.

HUD is DOM over the canvas. The runs counter and the "Need N off M" line are
written through `textContent` refs so the 120 Hz tick never re-renders the tree;
only the delivery card, outcome banner, ball number, wicket dots and shield pip
are React state, and they change at most once per ball.

### Verification

- `pnpm install` and `pnpm build` (mode uat) both exit 0 — 525 modules,
  432.13 kB / 143.39 kB gzip.
- `node scripts/balance.mjs` exits 0, **GATE PASS** on all four checks: casual
  σ=45 **35.0%** inside 25–45%, metronome σ=12 **100.0%** at or above 95%,
  `statsOf()` keys exactly `{boundaries, perfects, runs, wickets}`, and the
  longest possible 18-ball innings **69.3 s** inside the 100 s session cap with
  30.7 s of headroom. Re-measured at 4,000 seeds: 36.3% / 100.0%.
  *(Superseded: that 69.3 s was under-charged — see the fix round below. The
  corrected bound is 72.7 s, still inside the cap.)*
- The session-length check is a real gate, not a note: `ballDurationSeconds()` in
  `deliveries.js` charges each ball its worst case (left alone to the late
  cutoff, then the slowest shot animation, plus the resolve hold) and the sim
  sums it over all 18 generated deliveries for 2,000 seeded bowling cards. It
  proves the session clock can never be the thing that ends a run, so both real
  lose paths stay inside the balls.
- Casual-bat losses split 162 all out against 163 balls gone, confirming both
  lose conditions are reachable and neither dominates.
- Headless draw harness: the shipped draw functions were bundled with esbuild and
  run against a stubbed 2D context at **7 canvas sizes** (296×420 to 430×900)
  over 7,560 generated deliveries — every ball path sampled across the full
  flight plus follow-through, the gauge swept from −0.4 to 1.4, the bat through
  its whole arc, the bowler through his whole action, 2.6 M context calls. No
  throws, no non-finite canvas arguments, and `save`/`restore` balanced at every
  size. Two bugs were fixed before this passed clean (below). The harness was a
  throwaway; it is not in the repo.
- Emoji scan of `src/` and `scripts/` finds one pictographic codepoint: the
  `U+2713` tick in the verbatim lead-capture checkbox, which is HTML text and is
  explicitly allowed by the spec's global constraints. Everything else non-ASCII
  is comment box-drawing, em-dashes and `≤` / `→` in prose.
- `src/kit/*.js` verified byte-identical to `shared/game-kit/*.js` for all seven
  files.
- `rules.js`, `deliveries.js` and `data.js` verified free of DOM, React, canvas
  and kit references.

### Fixes made during the build

1. **Run end was on a `setTimeout`.** The results screen was scheduled with a
   timer sized to the outbound animation, which keeps running while the tab is
   backgrounded — the loop pauses, the player sees nothing, and the run ends
   underneath them. Replaced with a check in the outbound branch of `update()`,
   so ending is driven by the same clock as everything else and is pause-safe.
2. **An edge that carried knocked the stumps over.** The dismissal branch fired
   on any wicket, so a caught-behind off an inside edge scattered the timber.
   Split into `bowled` (a miss on a stump-line ball) and `caught` (an edge that
   carried), which now sends the ball to the keeper with its own flash and shake.
3. **`drawGauge` leaked context state.** It set `lineCap`/`strokeStyle` without a
   `save`/`restore` pair and returned early on the out-of-sweep path; wrapped,
   with the early return restoring first. Caught by the harness's depth check.
4. Presentation timings that decide whether an innings fits the session clock
   (`shotSeconds`, `wicketBeatSeconds`, `resolveSeconds`) were moved out of
   inline literals in the component into `data.js`, so `ballDurationSeconds()`
   and therefore the session gate measure the numbers the component actually
   uses rather than a copy of them.

## [2026-07-29] Review fix round

Independent review returned one Major and four Minor findings. All five fixed;
sim gate and build re-run after.

### Major — `render()` discarded the loop's interpolation alpha

`kit/loop.js` calls `render(accumulator / step)`, and the component's
`const render = () => {` threw that away. Two consequences, and the second is the
serious one:

1. The ball and the gauge needle were drawn at the last completed 120 Hz step, so
   they snapped to step boundaries instead of tracking real time.
2. `lastTickWall` was stamped with `performance.now()` at the END of render — a
   wall time that did **not** correspond to the frame just drawn. The leftover
   accumulator (0 – 8.33 ms, varying frame to frame with the drift between the
   display refresh and the fixed step) therefore leaked straight into the judged
   `errMs` as frame-phase noise. Against the narrowest PERFECT window
   (±13.6 ms on an over-3 Express ball) that is up to ~60% of the window, it is
   not repeatable between frames, and no amount of practice can compensate for it
   — precisely the kind of noise this game cannot have, given it is *only* a
   timing game.

Fixed as the reviewer specified. `render(alpha)` now:
- clamps alpha to 0..1 and computes `aStep = alpha * BALANCE.loop.fixedStep`;
- draws the ball at `ballClock + aStep` (flight) or `phaseClock + aStep`
  (outbound), and sweeps the gauge needle at `ballClock + aStep`, via a new
  `s.ballDraw` scratch object so `update()`'s authoritative `s.ball` is never
  touched by presentation;
- sets `s.lastTickWall = <wall at render start> − aStep * 1000`, so the wall
  clock the tap handler measures against is the instant the drawn frame actually
  represents. `s.ballClock + lag` is now the true ball time of the tap with no
  sub-step remainder in it.

The bowler's run-up was interpolated with the same `aStep` while there, for
consistency of motion. This changes nothing in the sim (which never renders) and
the gate confirmed identical numbers.

### Minor 1 — six gradients rebuilt per frame, plus per-frame closures and literals

- `drawStumps` built one linear gradient per stump (3/frame), and `drawBatter`
  built three more (torso, helmet, blade). All were already authored in local
  coordinates, and a canvas gradient resolves in the user space in force when it
  is *used*, so they hoist into `buildPaints` unchanged and follow the existing
  translate/rotate at draw time. `buildPaints` now returns
  `{ball, blade, stump, torso, helmet, topFade}` and both draw functions take
  `paints`.
- The reviewer also spotted that `buildPaints` built a `bat` gradient nothing
  consumed while `drawBatter` rebuilt its own blade gradient every frame. Wired:
  the orphan is now the `blade` paint, re-authored to the blade's actual
  half-width (5.2 sc rather than 5 sc) so it matches the rect it fills.
- `drawGauge` allocated a fresh `arc` closure per call; hoisted to a module-level
  `gaugeArc(ctx, g, …)`.
- `ballPathAt`, `markerAt`, `gaugePoint` and `timingWindows` each returned a
  fresh object literal, several times per frame. All four now take an optional
  `out` and the module keeps one scratch buffer per call site (`_path`, `_mPath`
  — separate because `markerAt` itself calls `ballPathAt` — `_marker`, `_pt`,
  `_win`, `_obPt`). Safe because every use is synchronous and non-reentrant.
  `timingWindows` keeps an allocating default for `rules.js`, which calls it once
  per ball, not once per frame.
- New `outboundPointAt(ob, t, out)` shares the post-shot arc maths between
  `update()` and the interpolated draw, so the two cannot drift apart.

### Minor 2 — the session upper bound was wrong

`ballDurationSeconds()` took its tail as `max(six, dead + wicketBeat)` = 1.00 s.
The real worst tail is an **edge that carries plus the wicket beat**
(0.62 + 0.50 = **1.12 s**), and the swing-and-miss-onto-the-stumps branch is
1.09 s (0.59 + 0.50). The bound was under-charging by 0.12 s a ball and survived
only because the margin was large — a 10 ms accident, as the reviewer put it. It
also ignored hit-stop, which freezes `update()` for up to 0.07 s and can fire on
any ball.

Fixed: tail is now `max(six, edge + wicketBeat, bowledMax + wicketBeat)` and
`cfg.fx.hitStopSeconds` is charged unconditionally. The bowled-travel literals
(`0.16 / 0.45 / 0.14`), which had never moved out of the component, are now
`deliveries.bowledSeconds = {min, base, span}` in `data.js` and read by both the
component and the bound — so the gate measures the numbers the game uses.

Measured worst-case innings moved **69.3 s → 72.7 s** against the 100 s cap
(27.3 s headroom). Still passes, and now for the right reason.

### Minor 3 — `endRun` still handed off via `setTimeout`

The previous round moved the *ball* end into the loop but left the final hand-off
to the results screen on `setTimeout(cfg.hud.endBeatMs)`, which keeps running
while the tab is backgrounded — so the log's claim that the end path was
loop-driven was false. Now `endRun` stores `s.endBeat / s.endWon / s.endStats`
and `update()` counts the beat down and fires `onWin`/`onLose` exactly once
(`s.endFired`). `endTimerRef` is gone; the only remaining `setTimeout` in the
component is the cosmetic outcome-banner dismissal, which is cleared on unmount.

### Minor 4 — shielded caught-behind sent the ball the wrong way

`rules.js` sets `ev.wicket = false` once a shield absorbs a dismissal, so the
edge branch's `ev.wicket ? keeper : off-side` test sent a *shielded* catch
squirting away to the off side while the banner read "COVERED — your shield
absorbs the wicket". The bowled path was already shield-independent (it keys off
`ontoStumps`), which is what made the inconsistency visible. Both the outbound
target and the `caught` flag now use `ev.wicket || ev.shielded`, and the arrival
beat draws a shielded catch in cover-blue at 0.4× force, matching how a shielded
bowled already rattles the timber at 0.35×.

### Verification after the fix round

- `pnpm build` exit 0 — 525 modules, 433.15 kB / 143.85 kB gzip.
- `node scripts/balance.mjs` exit 0, **GATE PASS**, and the two win rates are
  **unchanged**: casual σ=45 **35.0%**, metronome σ=12 **100.0%**, stats contract
  OK. Expected — the alpha fix is presentation-and-input only and the sim neither
  renders nor taps. Session bound now reports 72.7 s (was an under-stated 69.3 s).
- Draw harness re-run against the new signatures at the same 7 canvas sizes,
  7,560 deliveries, now also sweeping the outbound arc through `outboundPointAt`:
  5.46 M context calls, no throws, no non-finite arguments, save/restore balanced.
- Gradient audit: `createLinearGradient`/`createRadialGradient` now appear only
  inside `makeGroundBitmap` (5, once per resize) and `buildPaints` (6, once per
  resize). Zero in any per-frame draw function.

## Deferred minors

- **`index.css` `touch-action` parity.** The shared stylesheet is copied verbatim
  from the scaffold and sets no global `touch-action` (its only rule is
  `.no-touch { touch-action: none; }`), while the
  game stage and canvas set `touch-action: none` inline (as the standard
  requires). The inline rule wins where it matters, so gameplay is correct, but
  the two are not stated in the same place and a future reader could reasonably
  be confused about which applies. Not changed here because `index.css` is a
  verbatim shared copy and editing it would diverge this game from every other in
  the repo; worth a repo-wide pass by the orchestrator rather than a local fork.

---

## 2026-07-31 — Lead-form / how-to-play revamp

**G1 — email removed from lead capture.** `src/LeadCaptureModal.jsx` no longer
collects an email address. Deleted `EMAIL_RE`, the `email` `useState` (and its
`lastSubmittedEmail` sessionStorage read), the optional-email validation branch,
the whole "Email Field" `sl-lead-field` block, the `lastSubmittedEmail`
sessionStorage write, and the `email` key from both the `submitToLMS({...})` call
and the two `onSubmitted({...})` payloads. `src/api.js` is untouched: `submitToLMS`
already sends `email_id: email || ''`, so omitting the key keeps the LMS payload
shape byte-identical. Name (letters+spaces), mobile (`^[6-9]\d{9}$`) and the T&C
checkbox are unchanged. Grep confirms no `email` / `lastSubmittedEmail` reference
survives anywhere under `src/`.

**G2 — `HowToPlayScreen` is now animation-first.** Every numbered instruction
paragraph, the sub-headline, the four outcome chips and the chase-maths paragraph
are gone, along with the `Beat` component that carried them. In their place is one
looping 3.4 s SVG demo (`DemoBall`) of the actual ball: the orange length marker
lights up as the telegraph, the ball pitches on it, the timing gauge needle sweeps
the arc, a finger glyph taps exactly as the needle crosses the bright GREEN
PERFECT core, the bat rotates through, and the ball clears the boundary rope into
a gold spark. Every track is keyed to the same 3.4 s clock (8% release, 30% pitch,
52% tap+contact, 78% over the rope) so the cause-and-effect chain reads without a
word of explanation. Sprite construction, palette and proportions are lifted from
the canvas rig and `HeroGround`, so the demo previews the real game rather than
illustrating it. Remaining text on the screen: the "How to Play" heading, three
icon-led cues ("Read the length", "Tap on green", "Bank cover" — all ≤ 4 words),
and the Play button. Card is capped at 344 px with `overflow: hidden`, so it fits
360×640 without scrolling. The three retired `cdBeat*` keyframes were replaced by
eight `cdD*` demo keyframes, all covered by the existing
`prefers-reduced-motion` kill switch.

**G3 — `cover-drive/asset-from-here.md` added.** 14 Nano Banana prompts committed
to a single motif: **night-match broadcast realism** — sodium-floodlight key with
a cold cyan rim, dew-slick specular turf, stadium bokeh, worn sports materials
(scuffed leather, chalked willow, dusty pads) and broadcast lens language.
Deliberately the only camera-realist sheet in the repo. Covers backdrop, pitch
strip, ball, ball trail, batter rig, bat, stumps intact and shattered, length
marker, timing gauge, cover shield, the HUD glyph set, the boundary spark and the
result trophy, each with size, dense prompt and negative list.

**Not touched:** gameplay, balance, physics, HUD layout, `ResultsScreen`,
`HomeScreen`, `data.js`, `rules.js`, `deliveries.js`, `api.js`, `src/kit/`.
No re-run of `scripts/balance.mjs` was needed — nothing this change touches is
reachable from the sim.

**Build:** `pnpm install` + `pnpm build` exit 0 — 525 modules transformed,
`dist/assets/index-Cfvv4GrS.js` 435.72 kB / 144.05 kB gzip, built in 2.23 s.

---

## 2026-08-03 — Review response: a real bat, a real ball, and insurance zones

Acting on the 2026-08-03 client review of Cover Drive. Two lines of that review were
overridden by the coordinator before work started and are recorded here so nobody
re-opens them: **the email field was deliberately NOT added** (see G5 below), and the
result-screen rebuild WAS in scope (G4).

### Root cause — "unable to hit the ball" and "collision is inaccurate" were one defect

The review listed these as two issues. They were one, and it was not a tunnelling bug:
**the build had no collision test of any kind.** `rules.classifySwing()` took
`errMs = (tapTime - flightSeconds) * 1000` and compared it to three authored
millisecond windows. Nothing ever asked where the bat was.

Measured, against the shipped `buildGround()` / `ballPathAt()` / `drawBatter()` at the
exact instant the game declared contact (`u = 1`), over 7,200 seeded deliveries:

| canvas | batter x | mean bat-to-ball gap | min | max | deliveries where the blade touched the ball |
|---|---|---|---|---|---|
| 320x480 | cx + 29 px | **32.0 px** | 3.6 px | 76.6 px | 5.8% |
| 390x740 | cx + 35 px | **39.5 px** | 5.4 px | 93.2 px | **4.3%** |
| 412x800 | cx + 37 px | **41.8 px** | 5.9 px | 98.4 px | 4.1% |

The batter was pinned at `cx + halfWidthAt(creaseY) * 0.46` regardless of where the
ball was going, while the ball arrived at `cx + lineOffset * halfWidth * 1.1`. On 95%+
of deliveries the two were nowhere near each other, so the banner could read "FOUR —
middle of the bat" while the ball passed 40 px wide of the blade. **The picture and
the verdict were unrelated, so the picture could not be used to learn the timing.**

That left the gauge as the only feedback, and the gauge was brutal. Effective windows,
measured from the shipped constants:

    over 1 Stock    flight 620 ms   PERFECT +-18.7 ms   CONNECT(edge) +-78.0 ms
    over 3 Express  flight 450 ms   PERFECT +-13.6 ms   CONNECT(edge) +-56.7 ms

A +/-13.6 ms PERFECT band is inside the jitter of a touchscreen tap. Miss entirely and,
on the 60% of deliveries bowled at the stumps, you were out. Three wickets ends it —
which is why the run died so quickly.

So the fix was **not** to widen the window. The window was a symptom.

### G1 — `src/physics.js`: real ball flight, real bat sweep, swept collision

New pure module that **imports nothing at all**, so `scripts/balance.mjs` drives the
shipped code. Works in metres and seconds in the pitch's own top-down frame:

- **Ball**: circle, radius 36 mm, exactly linear in `t` down the pitch (which is what
  makes the ideal contact closed form), piecewise-linear lateral line with seam
  movement off the pitch mark, and a height curve that skids for a yorker and climbs
  for a bouncer.
- **Bat**: a SEGMENT from `bladeInner` 0.34 m to `bladeOuter` 0.98 m out from the
  hands, rotating at a constant angular rate through 118 degrees over 0.30 s.
- **Contact**: `sweepContact()` sub-steps the swing 256 times (1.17 ms each) and in
  each sub-step measures the true minimum distance between the **ball's travel
  segment** and the **blade segment** (`segmentDistance()`, a proper
  segment-to-segment solve with the double clamp, not a line-to-line answer that has
  been clipped). At 26 m/s the ball moves 30 mm per sub-step against a blade 112 mm
  thick, so a point-in-time sample would tunnel; a travel segment cannot.
  A hit is then bisected for its instant and validated three ways: the ball must still
  be in front of `minContactY` (a ball level with the stumps has beaten the bat), its
  height must be inside the blade's vertical span, and it must be closing on the
  **face** of the blade rather than overtaking its back — without that last test a
  hopelessly late tap would score on the far side of the arc.

**Everything else falls out of that geometry rather than being asserted beside it:**

- **Shot quality is where on the blade it landed.** Contact radius within 125 mm of
  the sweet spot is middled, 260 mm is good, anywhere else on the blade is an edge.
  Read from the blade's own closest-point parameter, not from the ball centre's
  distance to the hands, because the swept scan reports first-surface-touch and the
  centre is a ball-radius short at that instant.
- **Timing windows are measured, not authored.** `connectWindow()` bisects the shipped
  collision per delivery and returns seconds. The gauge draws exactly those bands, so
  it can no longer promise a window the bat will not honour.
- **A quicker ball is harder for a geometric reason.** It crosses the blade's reach
  sooner, so every window narrows in proportion. There is no difficulty constant
  applied to a window anywhere in the codebase now; `timing.windowScale` is gone.
- **`idealContact()` is closed form**: the ideal contact is where the ball's straight
  path crosses the circle the sweet spot traces about the hands — Pythagoras for `y`,
  linearity for `t`, `atan2` for the required blade bearing, and the inverse of the
  swing easing for the tap. It is the single definition of "perfect" and the gate
  asserts the independent swept test agrees with it.

### G2 — batter placement and animation

- **The hands track the line.** `stanceFor()` puts the hands at
  `footworkFrac (0.88) * lineX + pivotOffsetM (0.50)`, with the body 0.22 m to the leg
  side of them. A real batter moves to the line; the old build did not, which is
  exactly "the batter is not positioned correctly". The residual 0.41-0.59 m between
  hands and ball line is now the thing that sets the windows, so a ball angled away
  from the body is measurably harder and the length marker telegraphs it before the
  run-up. `gate 3` asserts that residual always stays inside (0.34 m, 0.78 m), i.e.
  the ball can never pass inside the splice nor outside the sweet spot's reach.
- **The drawn bat IS the collision bat.** `buildPose()` pushes
  `physics.bladeAtPhase()`'s pitch-space segment through the renderer's single
  `projectPitch()`, and `drawBatter()` draws the handle from the hands to the splice
  and the blade along that segment, with the sweet spot marked on it. Position, length
  and angle are the collision's; only the drawn THICKNESS is exaggerated, because the
  camera is nearly over the batter's shoulder and a bat's 108 mm face projects to
  about three pixels. That allowance is commented at the draw site and never reaches
  `physics.js`.
- **Bug found and fixed while checking screenshots:** the torso's lean used
  `ctx.rotate()` without first moving the origin to the hips, so at `lean = 1` it
  swung a hip-height's worth of arc — **72 px on a 390 px canvas** — leaving the torso
  detached from the head and pads. Visible in the first round of screenshots, invisible
  in the previous build only because the old follow-through decayed `lean` faster. Also
  added a neck (the helmet read as floating) and a follow-through settle.

### G3 — the insurance scoring zones

The outfield is four drawn wedges and the bottom of the screen is four tap lanes in
the same order, so "tap under the wedge you want" is literally true. Lane width is a
quarter of the canvas — 80 px on a 320 px handset, past the 44 px minimum.

| Zone | Middled | Good | Edge | Caught on a good shot |
|---|---|---|---|---|
| Child's Education | 4 | 3 | 0 | 14% |
| Protection Cover | 4 **+ wicket shield** | 1 | 0 | 10% |
| Retirement Corner (aerial) | **6** | 3 | 0 | **36%** |
| Guaranteed Income | 2 | 2 | **1** | none |

They are a real choice because they have different *shapes* of payout, not different
sizes. Guaranteed Income is flat — 2 whether you middle it or not, 1 off an edge, and
it can never get you caught — but 2 a ball off 18 is 36 against a target of 48, so an
innings of nothing but Income loses **by construction**. Retirement Corner is the only
six and the only zone with real catch risk. Protection Cover trades runs for a shield
that absorbs the next dismissal, and has to be bought before the ball that would have
ended the innings.

The required rate drives it. `rules.suggestZone()` takes the least risk that still
covers the rate on a merely-good shot; failing that, the best expected value; and it
buys Protection Cover when one wicket from the end with no shield in hand. That same
function drives the in-game coach pip AND the balance bots, so the gate measures the
game the player is being taught. The measured mix bears it out: the skilled bot sits
on Education 55.5% / Income 39.2% while the casual bot, which falls behind more often,
is pushed onto Retirement 9.9% and Protection 12.3%.

The old "every 6th ball is a Cover ball" mechanic is retired; the shield now comes
from the Protection zone, which ties the mechanic to the zone design instead of
sitting beside it.

Chase moved 40 off 18 -> **48 off 18** so that Income alone provably cannot reach it.

### G4 — result screen rebuilt onto the shared template

The screen already carried the shared skeleton (outcome pill, name greeting, score
ring, three stat tiles, Share Score, lead card with Book a Slot / Call Specialist,
Retry + Home, disclaimer) and is structurally identical to
`risk-radar/src/Screens.jsx` where it is not game-specific. What it was missing was two
of the four elements `docs/GAME_DESIGN_SYSTEM.md` section 4.D.4 requires:

- **Score & Bonus Summary Table** — `ZoneTable`, "Where your runs came from": one row
  per zone with a coloured bar and the runs banked, plus a footer line for wickets the
  cover absorbed and the total. The new scoring is what makes this worth showing: it
  is the record of the financial choices made under a rising required rate.
- **Financial Goal Insight Box** — `InsightBox`, an educational takeaway keyed to how
  the innings was actually played: never started, chased and lost, played it safe on
  Income, chased growth on Retirement, bought cover first, or balanced it.

Stat tiles relabelled ("Perfect timing" -> "Middled") and the stats contract widened to
`{runs, boundaries, wickets, perfects, shieldSaves, zoneRuns}`; `runs` is unchanged and
is still what the CRM records. `scripts/balance.mjs` asserts the new shape.

**How to Play** gained the four-zone legend (colour, payout, risk) and its CTA changed
from "Take Strike" to "**Got it! Start Game**" — the wording
`docs/GAME_DESIGN_SYSTEM.md` 4.D.2 specifies, and also the string
`scripts/play-test.mjs` looks for. Under the old label the harness could never get past
the how-to-play screen and reported "canvas: NONE — game never mounted" at all four
sizes; that was a verification blind spot, not a game defect, and it is now closed.

### G5 — the email field was deliberately NOT added

The review asks for an email field on the lead form. **It was not added.** The client
reaffirmed on 2026-08-03 that lead forms across this repo are **Name + Mobile only**;
that line of the review is stale, and email was already removed from this game on
2026-07-31 (see the entry above). `src/LeadCaptureModal.jsx` is untouched by this pass.
Verified in the browser: the lead modal renders exactly two inputs, `Full Name` and the
mobile field, at all four viewport sizes. `src/api.js` still sends `email_id: ''`, so
the LMS payload shape is unchanged.

### Verification

**Balance gate** — `node scripts/balance.mjs --runs 2000`, seed `0x0c07d21e`, **PASS**:

    gate 1: a perfectly timed swing always connects
       4,450 deliveries (450 corners of the delivery space + 4,000 seeded)
       swept collision, 256 sub-steps per swing (1.17 ms each)
       connected 4450/4450, middled 4450/4450,
       worst distance from the sweet spot 112.6 mm (tolerance 125 mm) -> OK

    gate 2: measured timing windows (bisected against the shipped collision)
       delivery          ball speed   flight   react budget   CONNECT    GOOD   PERFECT
       over 1 Loopy          64 km/h   909 ms        762 ms    250 ms  185 ms    64 ms
       over 1 Stock          73 km/h   800 ms        653 ms    242 ms  180 ms    62 ms
       over 1 Express        83 km/h   702 ms        554 ms    236 ms  176 ms    60 ms
       over 2 Loopy          68 km/h   858 ms        710 ms    246 ms  183 ms    63 ms
       over 2 Stock          77 km/h   755 ms        607 ms    239 ms  178 ms    61 ms
       over 2 Express        88 km/h   662 ms        514 ms    233 ms  174 ms    59 ms
       over 3 Loopy          72 km/h   809 ms        662 ms    243 ms  181 ms    62 ms
       over 3 Stock          82 km/h   712 ms        564 ms    237 ms  176 ms    60 ms
       over 3 Express        93 km/h   625 ms        476 ms    231 ms  172 ms    58 ms

       at the FASTEST delivery (over 3 Express, 93 km/h):
         reaction budget  0.476 s  vs 0.25 s human reaction, floor 0.34 s  -> OK
         connect window   0.231 s  (floor 0.150 s)                         -> OK
         perfect window   0.058 s  (floor 0.030 s)                         -> OK

    gate 3: widest hands-to-line distance 0.589 m, inside (0.34, 0.78) -> OK

    skilled bat (sigma = 35 ms)  chase 83.6%  mean 46.7  middled 54.1% good 39.3% missed  6.5%
    casual  bat (sigma = 60 ms)  chase 34.8%  mean 37.2  middled 37.4% good 41.7% missed 19.1%
    random swings (control)      chase  0.0%  mean  2.7  middled  5.3%            missed 78.4%

    stats contract {boundaries, perfects, runs, shieldSaves, wickets, zoneRuns} -> OK
    session length worst 80.9 s, mean 79.5 s, cap 110 s -> OK (29.1 s headroom)
    GATE: PASS

Gate 1 is the direct regression test for the defect. It swings at the instant
`idealContact()` computes in closed form, then asserts the *independent* swept
collision reports a middled contact — on the full corner set of the delivery space
(three paces x three overs x slower-ball variation x fullest/shortest length x five
lines x three seam deviations) plus 4,000 seeded deliveries. Under the old build this
gate was not expressible: there was nothing to ask.

Note the 112.6 mm worst residual against a 125 mm tolerance: the swept scan reports
first-surface-touch, which is up to a ball-radius before the centre arrives, so a
contact the closed form places exactly on the sweet spot measures a few millimetres
short of it. The tolerance is documented in `data.js` as carrying that allowance.

**Build** — `cd cover-drive && npx vite build` exit 0: 526 modules,
`dist/assets/index-XHCzoXfN.js` 451.89 kB / 149.79 kB gzip, CSS 33.00 kB / 6.77 kB.

**Play-test** — `node scripts/play-test.mjs cover-drive --all-sizes`, real touch input
in headless Chrome:

| viewport | errors | canvas | painted | random-bot run | retry |
|---|---|---|---|---|---|
| 320x568 | none | 320x568 | 100.0% | ended 10 s at "try again" | canvas back |
| 390x844 | none | 390x844 | 100.0% | ended  9 s at "try again" | canvas back |
| 412x915 | none | 412x915 | 100.0% | ended 22 s at "try again" | canvas back |
| 412x700 | none | 412x700 | 100.0% | ended 22 s at "try again" | canvas back |

Zero console or page errors at every size. The short random-bot runs are correct
behaviour, not the failure mode the harness warns about: that bot taps at uniformly
random moments, the gate measures it at **0.0% chase success and 78.4% missed swings**,
and 58% of deliveries are on the stumps, so it is bowled three times in about six
balls. A *timed* tap behaves completely differently — see below.

**A real, single, deliberately-timed touch connects.** Driving one tap at a chosen
wall-clock instant into the Retirement lane at 390x844 and reading back what the game
said: `1850 ms -> SIX!`, `2050 ms -> SIX!`, `1950 ms -> THICK EDGE`,
`2150 ms -> CAUGHT!`, `2250 ms -> BOWLED!`. That is the whole band structure appearing
from one input channel, on the shipped build, through real touch events.

**Screenshots inspected at every size** (320x568, 390x844, 412x915, 412x700), mid-ball
and at the moment of contact. What they now show: the batter beside the stumps with the
bat reaching across to the ball's line; the ball on the marker's line; the four wedges
and the four-lane strip with the aimed zone highlighted in both; the gauge below the
crease with its measured bands; and on a middled Retirement shot, the ball leaving the
bat along the Retirement bearing under a "SIX! - Middle of the bat - Retirement"
banner. Two rounds of screenshot review drove the torso-pivot fix, the bat thickness,
the neck, the wedge label clamp and the bowler's walk-in height.

### Not fixed

- **The delivery card and the first-ball hint overlap the bowler** during his walk-in
  at 320x568 and 412x700. Both sit behind translucent glass, the hint disappears on the
  first tap, and the bowler is 30 px of figure at the far end of the pitch. Fixing it
  properly means moving the delivery card into the canvas so it can be laid out against
  `stripTop`, which is a larger change than the review asked for.
- **`index.css` `touch-action` parity** (carried over from the previous entry): the
  shared stylesheet sets no global `touch-action` while the stage and canvas set it
  inline. Gameplay is correct; the two are just not stated in the same place. Still not
  changed here because `index.css` is a verbatim shared copy.
- **The bat's drawn thickness is not its collision thickness.** Position, length and
  angle are exact; thickness is a legibility allowance of roughly 1.9x, because the
  near-overhead camera projects a bat's face to about three pixels. Fixing it honestly
  would mean lowering the camera, which is a whole-game art change.
