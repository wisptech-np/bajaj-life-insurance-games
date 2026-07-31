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
