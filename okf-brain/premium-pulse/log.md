# Premium Pulse — build log

## 2026-07-29 — initial build (port 5066)

Built from the `guardian-shelter/` scaffold per `okf-brain/GAME_STANDARD.md` v2 and
`docs/superpowers/specs/2026-07-29-five-arcade-games-design.md` §2. Isolated Vite 5 +
React 18.3.1 app, pnpm, no workspace.

**Verification**

- `pnpm install` — clean, 114 packages resolved.
- `pnpm build` (mode uat) — 524 modules, `dist/assets/index-*.js` 421.41 kB (gzip 139.99 kB),
  `index-*.css` 33.27 kB (gzip 6.83 kB). Zero errors.
- `node scripts/balance.mjs` — **GATE: PASS** on all 4 seed blocks.
- `grep -r "Guardian Shelter" premium-pulse/src/` — **0 matches** (also 0 for
  `guardianShelter`, `guardian_shelter`, `GuardianShelter`).
- Kit files SHA-256 vs `shared/game-kit/` — **7/7 identical, 0 mismatches**.
- Emoji sweep of `src/` — one match, the U+2713 consent tick in `LeadCaptureModal.jsx`
  HTML text, which the standard explicitly permits. No canvas emoji sprites.

**CRM identity** — `LEAD_NO_KEY = 'premiumPulseLeadNo'`, `summaryDtls: 'Premium Pulse Lead'`
(api.js default), `'Premium Pulse - Post Game Lead'` in the lead modal per the scaffold
pattern, `'Premium Pulse Slot Booking | Score: N'` in the slot modal.

**Stats contract** — `{score, perfects, bestCombo, misses}`, exactly.

---

### Correction 1 — the timing source is `performance.now()`, not the AudioContext

The brief and the build order both say "the audio clock is the timing source; ring positions
are derived from it". Shipped as: **one pause-aware `performance.now()` track clock**, with
the *requirement* behind that instruction met and asserted rather than the *mechanism*
adopted. Reasoning, since this is the highest-risk area:

The kit's `createAudio` is fire-and-forget. `audio.hit()` plays a kick at whatever
`currentTime` happens to be when called; there is no handle on the AudioContext and no
scheduled-tone API, and the kit files are copied byte-identical from `shared/game-kit` and
may not be edited (verified: 7/7 SHA-256 match). Consequences:

1. There is no schedulable audio timeline to slave visuals to. A voice's play time is
   decided by when we call it — a `performance.now()` decision.
2. A second AudioContext opened purely to read `currentTime` would be **strictly worse**: its
   clock runs independently of the one the kit's voices actually play on, so it would create
   the second drifting timebase the instruction exists to prevent.

What the audio clock buys is resistance to stalls. Partly bought back with a 20 ms
`setInterval` lookahead scheduler (`pumpScheduler`, idempotent, also called from the rAF
update). **Corrected after review — the original claim here overstated it.** `setInterval`
is main-thread too, so a long synchronous block delays the scheduler exactly as it delays
rAF: measured **10.4 beat sounds dropped per run** under a stall profile. What the interval
actually buys is (a) complete protection against rAF-only starvation — a throttled or
skipped compositor frame cannot move a beat — and (b) tighter placement in normal play, mean
beat lateness **8.46 ms -> 5.60 ms at 60 fps**, because a 20 ms poll lands closer to the
scheduled time than a 16.7 ms frame that is not phase-aligned to it.

Timing CORRECTNESS never depended on either: the schedule is absolute, every event fires
against its own scheduled time, and a beat more than `LATE_SKIP_MS` = 110 ms late has its
sound dropped rather than bunched onto the next one. **A stall costs sound, never sync.**

**Proof, not assertion.** `beatTimeMs()` derives a beat by section offset + multiply;
`metronomeEvents()` derives it by accumulating one beat at a time. Different code paths. The
gate asserts they agree to < 1 ms across all 152 beats and all 64 rings, per seed block:

    block  seed        beat drift    ring drift
        0  0x5eed0001    2.91e-10ms    2.76e-10ms
        1  0x5efc4241    2.91e-10ms    2.76e-10ms
        2  0x5f0b8481    2.91e-10ms    2.76e-10ms
        3  0x5f1ac6c1    2.91e-10ms    2.76e-10ms

---

### Bug found by the sim — latency compensation was not in shipped code

First build put the `deviceLatencyMs` subtraction in the component, and `judgeTap` took an
"already compensated" time. The sim emits bot taps at `hitMs + deviceLatencyMs + jitter` and
handed them straight to `judgeTap`, so every tap read +60 ms late. The gate caught it
immediately and unambiguously:

| profile | PERFECTs of 48 | expected | score | win% |
|---|---|---|---|---|
| `sharp` (sigma 20 ms) | **10.6** | ~47 | 4,188 | 14.2% (band >= 90%) |
| `spec` (sigma 65 ms) | 9.4 | ~24 | 1,616 | 0.1% (band 25–45%) |

A sigma-20 ms player landing 10.6 of 48 in a ±45 ms window is arithmetically impossible, so
the fault was in the compensation, not the balance.

**Fix:** `toJudgeMs(trackMs, cfg)` moved into `src/track.js` and applied inside `judgeTap`,
so the compensation is shipped pure code that the sim exercises. After: `sharp` 46.8 PERFECTs
and 100%, `spec` 23.5 and in band. This is exactly why the sim must import shipped modules —
a component-side constant is unfalsifiable.

The same commit made the auto-resolution sweep use the judging clock too. Sweeping the raw
clock retires a ring 60 ms before a tap aimed at it could still be judged against it.

---

### Correction 2 — `targetScore` 4200 -> 4600

Spec §2 says "score >= target (tuned so the gate bands hold, start 4200)". 4200 measured
**49.5–52.0%** across the four blocks, above the 25–45% band. Swept with `--sweep`
(4 blocks x 400 runs each):

    3600: 68.0 66.5 70.3 67.0      4800: 27.8 29.5 29.8 30.0
    3800: 64.0 63.0 65.3 64.0      5000: 23.5 24.3 24.8 26.0
    4000: 57.3 58.3 59.8 57.5      5200: 19.8 20.8 20.5 20.8
    4200: 51.5 50.7 52.0 49.5      5400: 15.5 17.5 16.0 16.5
    4400: 42.0 41.5 43.5 44.8      5600: 12.0 12.3 12.5 11.5
    4600: 33.8 35.8 36.8 36.3

**4600 chosen**: band centre with ~9 points of headroom on both sides, which is what a value
needs to survive seed noise and future retunes. 4800 and 5000 sit close enough to the 25%
floor that a block dips under it (5000 block 0 = 23.5%). Confirmed at 4,000 runs/block:
36.6 / 34.9 / 38.4 / 38.0.

`RESULT_TARGET_SCORE` is bound to the same constant, so the Results ring closes exactly at
the win line. The gate brute-forces the flawless-run ceiling (12,340) and fails if the target
exceeds it.

---

### Correction 3 — `lockoutMs` 90 -> 60

The finger-bounce debounce was 90 ms. The two halves of a bonus double are only 238 ms apart
at 126 BPM, so with the gate profile's 65 ms jitter a 90 ms lockout can swallow the second
tap of a double. Lowered to 60 ms, which is still far above any real finger bounce and
cannot be exploited (it only ever discards the player's own input).

**Audit trail corrected after review.** The figures first published here were wrong in two
ways and are restated:

- The "5.4% of Movement III doubles" was an ANALYTIC estimate from N(238, 92); the MEASURED
  rate is **4.17%**.
- "0.45 extra misses per run" conflated two different things. 0.45 was swallowed **taps**,
  not misses — most swallowed taps cost nothing, because the ring they were aimed at is then
  auto-missed only if no other tap captures it, and the combo break is often shared with a
  miss that was going to happen anyway. The real miss cost of 90 ms vs 60 ms is
  **0.055 misses/run**, about 8x smaller than claimed, worth roughly **1.2 win points**.

The decision stands — 60 ms is still the right value and costs nothing — but the original
numbers overstated the case by an order of magnitude and should not have been presented as
measurements.

---

### Correction 4 — 64 rings on a tresillo grid, and what "90s total" became

Spec §2 asks for "3 movements, 90s total ... ~64 scored rings" and "bonus doubles every 8th
beat". Those three cannot all be exact at 96–126 BPM: 64 rings over 90 s is 0.71 rings/s,
which at these tempos is roughly one ring per 2.9 beats — not a musical grid.

Shipped: a **3+3+2 tresillo** on group-relative beats 0, 3, 6 of every 8-beat group, with
beat 0 carrying the bonus double. Four rings per group; 6 + 5 + 5 groups = **exactly 64
rings**, and the double lands on every 8th beat as specified. Sections are an 8-beat count-in,
48/40/40 movement beats and 8-beat fills and outro, giving **87.4 s of music** and a run
ending at **88.6 s** against the spec's 90 s. Both spec numbers are hit to within 1.6%.

The tresillo also earns its place: a straight one-ring-per-two-beats grid makes the go/no-go
decision metronomic — the player stops reading the ring and taps the pulse. An uneven gap
forces every ring to be looked at.

---

### Correction 5 — red ratio is over all rings, satisfied out of the single slots

Spec §2 gives "red ratio 20% -> 30%" and separately says a bonus double is "two blue rings".
Those interact: if reds were drawn per-slot the red count would be roughly halved (7.9 of 64,
12.3%), and the adversarial `redBlind` bot would then need nearly every red in the track to
reach 8 misses. Shipped reading: `redRatio` is over ALL of a movement's rings (20/25/30% of
24/20/20 = 5/5/6 = **16 reds, 48 blues**) and is satisfied out of that movement's single
slots, so Movement III uses 6 of its 10 singles. Asserted per block, with a max-2-in-a-row
guard and a never-red-first-ring guard.

---

### Frame-replay equivalence assertion (added after the latency bug)

The latency bug above was a case of the sim and the shipped component doing different
arithmetic, so a permanent guard against that whole class was added rather than just fixing
the instance.

The sim drives a run by taps alone. The component also calls `resolveDue` on the judging
clock every animation frame, so a missed premium lights up when it is missed rather than
when the next tap happens to arrive. The gate now replays the same seed, track and tap list
BOTH ways — tap-driven, and frame-driven at 60 Hz with taps injected at their own timestamps
between frames — across 4 blocks x 300 runs x 4 profiles and requires the full stats contract
to be bit-identical. **4,800 runs, 0 mismatches.**

It holds because `judgeTap` sweeps to the tap's own judging time before searching: a 60 Hz
frame preceding a tap at X can only have swept to at most `X - deviceLatencyMs`, which is
exactly where the tap's own sweep lands. Sweeping the raw clock, dropping the sweep inside
`judgeTap`, or making it non-idempotent all break it.

---

### Adversarial profiles

Beyond the briefed spam and never-tap bots:

- **`spam`** (taps every 120 ms) lapses at **4.4 s**, well inside the required 45 s. The
  brief's own "else MISS" is what does it: a tap that is not on a ring, while a ring is on
  screen, is a miss.
- **`idle`** (never taps) lapses at **18.9 s**.
- **`redBlind`** (near-perfect timing, taps every ring including temptations) wins 0% and
  lapses at 53.8 s. Proves the go/no-go half is load-bearing — timing alone cannot win.
- **`hedger`** (double-taps every premium at −70 ms and +70 ms) wins 0% and lapses at 20.4 s.
  This is the one exploit the capture window could plausibly open, and it is why `judgeTap`
  CONSUMES a ring on the first tap that captures it rather than letting the best of several
  taps win. Change judging to "best tap wins" and this profile goes to 100%; the canary
  guards the whole class.

Taps while no ring is on screen (count-in, fills, outro) are ignored rather than punished —
there is nothing to be wrong about, and it is what makes the tap-to-start gesture safe.

---

### Design decisions worth recording

- **Tap-to-start overlay.** The track begins on a real user gesture, which is what unlocks
  the AudioContext on iOS. A rhythm game whose first bar is silent is not a rhythm game. That
  contact is deliberately not judged.
- **Tap stamps from `PointerEvent.timeStamp`,** captured by a listener registered before the
  kit's input handler on the same element so it runs first at the target phase. A
  `performance.now()` read inside the handler is several ms late under jank, against a 45 ms
  PERFECT window. Older WebKit builds reporting epoch milliseconds are detected and fall back.
- **`captureMs` = 190 ms**, bounded on both sides and asserted: wider than the 110 ms GOOD
  window so a mistimed tap costs one miss rather than two, narrower than the 238.1 ms minimum
  ring spacing so a tap can never reach past a nearer ring.
- **Shape as well as colour.** Premiums are smooth rings with four cardinal nubs; temptations
  are 16-point rotating stars. The go/no-go read survives colour blindness.
- **Two clocks by design, not accident.** The kit loop's `sessionSeconds: 110` is a backstop
  for a phone backgrounded mid-track; the track clock is authoritative and ends the run at
  88.6 s. Both are pause-aware and both are held by the same `onPause`.
- **Zero binary assets.** The scaffold's `guardian_shelter_bg.png` on the thank-you screen was
  replaced with a concentric-pulse gradient wash.

---

### Independent review round (same day) — 2 bugs found and fixed

An independent bug-only review of `track.js`, `PremiumPulseGame.jsx`, `data.js`, `App.jsx`,
`Screens.jsx` and `balance.mjs` was run against the four highest-risk categories (timing
correctness, lifecycle, index/bounds, runtime throws). Two real defects, both fixed and
re-verified.

**1. Scheduler kept the groove running for 1.2 s after a mid-track loss.**
`PremiumPulseGame.jsx` — the 20 ms metronome interval gated on `s.ended`, but `s.ended` is
only set when the end-beat `setTimeout` fires `cfg.endBeatMs` (1200 ms) after the run is
decided. `s.endPending` is set synchronously at that moment, and every *other* post-end guard
in the file already used it (`update()`, the pointerdown handler, `shouldTickClock`). So on
the common losing path — the 8th miss, mid-track — the interval kept pumping for 1.2 s:
kicks and hats played over the `failure()` sting, and if a section boundary fell inside that
window `pumpScheduler`'s section-change branch called `showBanner()` and **replaced the
"COVER LAPSED" banner with a movement banner**. Score/combo/miss state was never affected
(the leaked calls touch only scheduling, audio and banners, never `resolveDue`), but the
audio and banner corruption was real and would have fired on nearly every loss.
Fixed by adding `s.endPending` to the guard, making it consistent with the other three.

**2. Win-screen confetti flickered in place instead of falling.**
`Screens.jsx` — `Confetti` generated each piece's `left`, `--dur`, `--delay` and `rotate`
with `Math.random()` inline in its render body. `ResultsScreen` runs a 16 ms interval for
1.2 s to animate the score counter, re-rendering the child ~75 times; with stable `key`s
React rewrote the same 26 DOM nodes with fresh random values on every render, so the confetti
jumped rather than fell — on every win. Fixed by randomising once in a lazy `useState`
initialiser. Note this shape came from the `guardian-shelter` scaffold and is likely present
in the sibling games too; only this game's copy was changed (scope).

**Explicitly clean** in the review, with the reasoning checked against current disk state:
no ring can be double-charged (`resolveDue` is idempotent via `run.resolved` + `run.cursor`,
and `judgeTap` always sweeps on the judging clock before `findCapture`); `pumpScheduler`
cannot replay an event from its two callers (`s.evIndex` only advances); pause accounting
neither leaks nor double-counts; `run.cursor` / `run.resolved` / `ringState` / `ringExit` /
`ringKind` / `drawFrom` are all correctly sized and monotonic, with no ring skipped, drawn
forever or left unresolved; and nothing can throw before the first `fit()` or after teardown.

The pause-clock arithmetic was additionally unit-tested in isolation (start offset, freeze
during pause, resume continuity, duplicate pause/resume signals ignored, 500 short pauses
with no drift, monotonicity across 2,000 randomised steps): **11/11 PASS**.

Post-fix re-verification: `pnpm build` clean (524 modules, 421.52 kB / gzip 140.02 kB),
`node scripts/balance.mjs` **GATE: PASS** on all 4 blocks with frame-replay equivalence still
0 mismatches over 4,800 runs.

---

### Scoped review round 2 — 1 Major, 2 model-honesty Majors, 6 minors

The reviewer's own harness independently reproduced the core claims before finding anything:
3,600 paired sim/component runs with 0 stat differences; stall / fps / pause immunity with 0
mismatches; miss accounting exact; no exploit (a GOOD-edge always-tap strategy tops out at
47% of target); the `targetScore` sweep reproduced exactly; and the "kit exposes no
AudioContext handle" claim confirmed true. What follows is what it found wrong.

**MAJOR 1 — the loss screen told a false story on the most common outcome.** `endRun(won)`
was boolean-only, so BOTH loss paths rendered "COVER LAPSED / Too many premiums missed". But
running out of track below the target is 37.5% of ALL runs and **58.3% of all losses**, at a
mean of 5.73 misses, with 14.3% of them at four misses or fewer — so the commonest single
outcome in the game was a player being told the cover lapsed while the tile beside it read
"Missed 4/8". Fixed: `lapsed = misses >= maxMisses` is computed at the call site from the run
itself, the score-short path gets its own banner ("PREMIUMS SHORT" + `<score> of <target> —
the cover held, the payments did not add up") and its own orange tone, `lapsed` is threaded
into the stats payload, and `ResultsScreen` shows "Premiums short" vs "Cover lapsed" plus a
one-line explanation under the greeting. The chip now derives from the same number as the
miss tile, so they cannot disagree.

**MAJOR 2 — the gate was blind to device-latency BIAS.** `deviceLatencyMs` cancels exactly
between bot and judge, so no assertion could fail when the constant is wrong for real
hardware. Added a bias sweep printed every run and a floor asserted on every block (gate
profile >= 15% at +/-25 ms). Full table in deferred #1 — and note the sharp profile is no
guard at all here, scoring 99.3% at +45 ms bias. Deferred #1 escalated with the cost
quantified and the reason calibration is still not shipped stated properly.

**MAJOR 3 — the bot could not make the mistake the design is built to punish.** `data.js`
justifies the 3+3+2 tresillo by saying an even grid lets a player stop reading rings and tap
the pulse instead — but 63% of metronome beats carry no ring, and no profile ever tapped one,
so the tresillo's whole reason for existing went unmeasured. Added `phantomRate` to
`humanTapper` (phantom taps land on the metronome, not on rings), a `distracted` canary at
2%/beat with its own band, and a sensitivity table printed every run:

    phantom   0%/beat  0.5%     1.0%     2.0%     4.0%     8.0%
    win%        33.8%  27.8%   23.0%   17.5%    7.8%     1.0%

`spec` is deliberately left at the brief's exact definition (sigma 65, 8% red, no phantoms)
because that is the contract the 25-45% band is written against; `distracted` is what stops
the cost going unmeasured. Modelled i.i.d. per beat, which is conservative — real off-pulse
tapping is serially correlated and clusters cost more than the same rate spread out.

**Minors, all fixed.**

1. Hit-stop froze the picture while the judge and metronome kept running — 0.598 rings/run
   arrive during a freeze, and structurally an ignored bonus first-half's auto-miss freeze
   runs straight across the second half's arrival for 46-67 ms of visual lag on a ring about
   to be judged. `s.trackMs = clockNow()` hoisted above the `fx.isFrozen()` early-return so
   the picture can never lie about the one thing the player is timing against; everything
   below the return still holds still, which is the point of a hit-stop.
2. Stall-immunity claims corrected everywhere (component header, scheduler comment, README,
   okf) to the measured position: a main-thread block stalls the interval too (10.4 dropped
   sounds/run); the interval buys rAF-only-starvation protection and beat lateness
   8.46 -> 5.60 ms at 60 fps. A stall costs sound, never sync.
3. Correction-3's audit numbers restated (see above): 5.4% was analytic not measured (4.17%),
   and "0.45 extra misses/run" was swallowed TAPS — real miss cost 0.055/run, ~8x smaller,
   worth ~1.2 win points. Decision unchanged; the arithmetic is now honest.
4. `hasVisibleRing` mixed-clock comparison documented as deliberate player-favouring leniency
   rather than left looking accidental (see deferred #5).
5. Readability assertion was crediting the off-screen head of each approach as readable.
   `spawnR` (501) is past the corner (435), so 15.7% of the approach is invisible. Now
   asserts the ON-SCREEN fraction against the smallest portrait stage in the standard:
   1190 ms x 83.8% = **997 ms** vs the 700 ms floor. Still passes, honestly this time.
6. Dead code removed: `fx.bonusParticles`, the whole `hud` block (`lowTimeSeconds`,
   `countInGoBeat`) — none were ever read, against `data.js`'s claim that every tunable lives
   there; the `hud.movement` React state (3 dead re-renders/run, replaced by a plain `misses`
   state); and App.jsx's unused `theme` prop and `homeBg` entry.

**Copy escalations.** How to Play now states plainly that a miss is any tap not on a blue
ring — too early, too late, on a red, or on nothing — because 4.04 of the 5.72 misses in an
average run come from exactly those, and that the game is one-finger (deferred #4). The
start overlay carries the short form of both.

Re-verified after every fix: `pnpm build` clean (524 modules, 422.72 kB / gzip 140.44 kB),
`node scripts/balance.mjs` **GATE: PASS** on all 4 blocks including the two new rows, with
frame-replay equivalence still 0 mismatches over 4,800 runs.

---

### Deferred minors

1. **No player-facing latency calibration — ESCALATED, and here is the cost.**
   `deviceLatencyMs` is a single 60 ms constant, not a measured per-device offset. Because the
   sim charges it to every bot and the shipped judge subtracts it, it cancels exactly and
   NOTHING in the gate could fail when the constant is wrong for a real handset. That blind
   spot is now closed by measurement (`── device-latency bias`, printed every run), and the
   answer is that being wrong is expensive:

       bias   -45ms  -30ms  -25ms  -20ms  -10ms    0ms  +10ms  +20ms  +25ms  +30ms  +45ms
       win%    3.3%  16.8%  22.3%  25.8%  31.8%  33.8%  32.8%  25.3%  20.3%  14.5%   3.0%

   Roughly 20 ms of bias eats a third of the win rate and 30 ms eats more than half. The
   sharp profile is NO substitute as a guard: at +45 ms bias it still wins 99.3%, because
   sigma-20 jitter keeps the whole distribution inside the 110 ms GOOD window. A floor is now
   asserted on every block (gate profile >= 15% at +/-25 ms) purely as a regression guard.

   **Still not shipping calibration, deliberately.** The count-in is only 8 beats / 5.0 s and
   is doing two jobs already (establishing the pulse, and showing the first ring's approach);
   a 4-beat tap-along inside it would produce an estimate from 4 samples whose standard error
   at sigma 65 is +/-32 ms — the same order as the bias it is trying to remove, so it could
   easily make things worse. Doing it properly needs 8-12 taps and a discard-outliers pass,
   which is a screen, in a 90-second game. `AudioContext.outputLatency` cannot cross-check it
   on Safari. The honest position is: the constant is a median, the cost of being wrong is
   now measured and printed, and a calibration step is a real feature to be scoped rather
   than a line of code that was skipped.

2. **The jitter curve is steep** (55 ms 78.5% -> 65 ms 33.8% -> 80 ms 4.5%). It follows from
   the brief's own constants — 48 blue rings x a 110 ms GOOD window against an 8-miss cap —
   rather than from a tuning choice, and the `casual` canary keeps it visible on every gate
   run. If play-testing says it is punishing, the cheapest lever is `maxMisses`, not the
   windows.

3. **Audio/visual offset — RESTATED, the original sign was wrong.** The earlier entry said
   "the picture leads the sound by the audio-output component", which is backwards about what
   the player experiences. Correctly: rings meet the badge on the uncompensated schedule, and
   the *sound* leaves the speaker ~25 ms after it is triggered, so the audio lags the picture
   at the point of generation — which makes a player who follows the AUDIO tap late, and a
   player who follows the PICTURE read as EARLY. In practice the display pipeline adds its own
   latency in the opposite direction (frame presentation is typically 1-2 frames behind the
   draw call), so the two largely cancel and the net offset is ~zero either way. Not worth a
   second timeline; the point is that the earlier description was not a correct account of the
   sign.

4. **One finger only.** The shared input kit (`kit/input.js`, byte-identical and immutable)
   tracks a single pointer: `if (active !== null) return;` in its `pointerdown` handler drops
   a second finger's contact while the first is still down. For a game whose bonus doubles are
   238 ms apart this is a real constraint — a player alternating thumbs would lose every
   second tap. It cannot be fixed here without diverging the kit, so it is stated in the
   How to Play copy and on the start overlay instead. If a future kit revision adds
   multi-pointer support, this game should adopt it.

5. **`hasVisibleRing` compares the judging clock to a visual `spawnMs`** (`track.js`), so for
   60 ms after each ring appears a tap at nothing is pardoned rather than charged — about
   1.1 s of extra free-tap time per run across 64 spawns. Left as is and documented at the
   call site: the gate only ever decides whether to PUNISH, so the error is one-directional
   and always favours the player, and the alternative charges misses for taps made in the
   same instant a ring becomes visible.

6. **`toLocaleString()` in the score HUD** allocates a small string whenever the animated
   counter ticks. Matches the existing repo pattern (goal-keeper, guardian-shelter) and is not
   worth diverging from for one string per frame during count-up.

7. **No difficulty selection.** Movements are fixed at 96/112/126. A "practice" tempo would be
   easy to add (the whole schedule is a function of `cfg.sections`) but was out of scope.
