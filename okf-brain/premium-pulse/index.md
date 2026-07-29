---
type: project
title: Premium Pulse
description: Beat-synchronised rhythm tapping with a radial go/no-go twist — blue premium rings contract onto a policy badge in time with a synth metronome and must be tapped on the beat, red spiked temptation rings must be let through, across three movements at 96/112/126 BPM.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/premium-pulse
tags:
  - game
  - rhythm
  - timing
  - go-no-go
  - arcade
timestamp: 2026-07-29
---

# Premium Pulse

A glowing policy badge sits at the centre of the screen. Rings spawn at the edge and
contract onto it in exact time with a synth metronome groove. BLUE rings are premiums
falling due: tap when one reaches the badge outline (`|err| <= 45 ms` PERFECT, `<= 110 ms`
GOOD, otherwise MISS). RED spiked rings are impulse buys and must be let through untouched —
touching one costs a miss, ignoring one pays 15. Every 8th beat is a bonus double: two blue
rings a half-beat apart. Three movements at 96 -> 112 -> 126 BPM separated by 8-beat fills,
87.4 s of music, 64 scored rings. Win with `score >= 4600` and fewer than 8 misses; the 8th
miss ends the run. Dev port **5066**.

## Financial hook

A premium is a small, dull, perfectly-timed act you have to keep doing while everything
around you is asking for the same money right now. The mechanic is the argument, and the
balance sim measures it rather than asserting it:

- **Rhythm alone does not win.** The `redBlind` bot has near-perfect timing and taps every
  ring including the temptations. It wins 0% and lapses at 53.8 s. Being good at paying is
  worthless if you also pay for everything else.
- **Inhibition alone does not win either.** The `idle` bot never touches a temptation and
  lapses at 18.9 s. Not spending is not a plan.
- **Hedging does not work.** The `hedger` bot double-taps every premium 70 ms early and
  70 ms late to cover whatever the true latency turns out to be; it lapses at 20.4 s,
  because the first tap consumes the ring and the second is just a mistimed payment.
- **Consistency compounds, accuracy does not.** The combo multiplier reads the streak you
  already had. Almost all of the gap between the 4,295-point median run and the
  11,748-point sharp run is combo, not extra PERFECTs.
- The score target, not survival, is the binding half of the win line: the gate profile
  survives the track 73.5% of the time but clears 4,600 points only 37.5% of the time.

## The one clock, and why it is not the AudioContext

This is the highest-risk part of the design and the previous batch's goal-keeper went four
review rounds on exactly this, so it is written down in full.

Everything — the metronome, the ring radii, the tap stamps — comes off a single pause-aware
`performance.now()` track clock. There is no second timeline, so there is nothing that can
drift.

**The brief asked for the audio clock to be the timing source. It is not, and here is the
data-backed reason.** The kit's `createAudio` is a fire-and-forget synth: `audio.hit()`
plays a kick at whatever `currentTime` happens to be when it is called, and the kit exposes
no AudioContext handle and no scheduled-tone API. Those files are copied byte-identical from
`shared/game-kit` and may not be edited (verified by SHA-256, 0 mismatches across all 7).
Therefore:

1. There is no schedulable audio timeline to slave the visuals to. A voice's play time is
   decided by WHEN WE CALL IT, which is a `performance.now()` decision.
2. Opening a second AudioContext purely to read `currentTime` would be strictly worse, not
   better: its clock runs independently of the one the kit's voices actually play on, so it
   would introduce exactly the second, drifting timebase the requirement exists to prevent.

What the audio clock would have bought is resistance to frame stalls. That is partly bought
back by driving the metronome from a **20 ms `setInterval` lookahead scheduler** alongside
`requestAnimationFrame` — but only partly, and the original claim here overstated it.
`setInterval` is main-thread too, so a long synchronous block (GC, a long task) delays the
scheduler exactly as it delays rAF: measured, a stall profile drops **10.4 beat sounds per
run**. What the interval actually buys is (a) complete protection against rAF-only
starvation — a throttled or skipped compositor frame cannot move a beat — and (b) tighter
placement in normal play (mean beat lateness 8.46 ms -> 5.60 ms at 60 fps). A beat more than
`LATE_SKIP_MS` (110 ms) late has its sound dropped rather than bunched onto the next one.
Ring positions come off the same clock in `render()`, sampled once per update above the
hit-stop freeze check, so the judged timeline and the drawn timeline cannot diverge; a
non-drawn frame just means one picture was skipped. `pumpScheduler` is idempotent and is
called from both the interval and the rAF update.

The requirement behind the request — that the schedule the player hears and the schedule the
player sees are the same schedule — is met and is **asserted**, which is stronger than
picking a particular clock source. `beatTimeMs()` derives a beat by section offset +
multiply; `metronomeEvents()` derives it by accumulating one beat at a time. Those are
genuinely different code paths, and the gate asserts they agree to **< 1 ms** across all 152
beats and all 64 rings, on every seed block. Measured: **2.91e-10 ms** (beats) and
**2.76e-10 ms** (rings), identical on all four blocks.

## Tap stamping and the latency constant

Taps are stamped from the pointerdown event's own `timeStamp` — the moment the browser
recorded the contact — captured by a listener registered *before* the kit's input handler on
the same element, so it runs first at the target phase. Not from a `performance.now()` read
inside the handler: under jank those differ by several milliseconds, and several milliseconds
is a third of the PERFECT window. Older WebKit builds that report epoch milliseconds are
detected and fall back to a handler-time read.

`deviceLatencyMs = 60` is THE one latency constant, covering two additive delays that both
push a tap late: Web Audio output latency (~25 ms — the beat is heard after the voice is
triggered) and touch input latency (~35 ms — pointerdown arrives after the finger lands).
Without it the entire judging window sits 60 ms early and PERFECT is unreachable for
everyone; that is the failure mode it exists to prevent.

Two decisions about it matter:

- **It lives in shipped pure code** (`toJudgeMs` in `src/track.js`), not in the component.
  The first build had it in the component only, and the sim — which emits taps at
  `hitMs + deviceLatencyMs + jitter` — was therefore judging uncompensated times. The
  symptom was unmistakable and is recorded in `log.md`: the sigma-20 ms sharp bot scored
  10.6 PERFECTs out of 48 instead of ~47, because every tap read as +60 ms and landed in
  GOOD. Moving the compensation into the judge fixed it to 46.8 and is the reason the sim
  now exercises the exact arithmetic a real finger goes through.
- **It is charged to both sides.** Every bot pays it and the shipped judge subtracts it, so
  it cancels exactly, as it does for a real player tapping on the beat they hear. Changing
  it cannot flatter the measured bands — which is the whole point of charging it rather than
  only compensating for it.

It is a single documented constant rather than a per-device probe on purpose:
`AudioContext.outputLatency` is unimplemented on Safari, so probing would make the game
behave differently per browser and make the balance gate unfalsifiable.

The judging clock lags the visual clock by exactly `deviceLatencyMs`, and the per-frame
auto-resolution sweep uses it too. Sweeping the raw clock instead would retire a ring 60 ms
before a tap aimed at it could still be judged against it.

## Schedule design

The grid is a **3+3+2 tresillo** inside every 8-beat group: rings on group-relative beats 0,
3 and 6, with beat 0 carrying the bonus double (two blue rings a half-beat apart). Four rings
per group; 6 + 5 + 5 groups across the three movements is exactly **64 scored rings**.

The tresillo is not decoration. A straight one-ring-per-two-beats grid makes the go/no-go
decision metronomic — you stop reading the ring and just tap the pulse. 3+3+2 keeps the gap
between decisions uneven, so every ring has to be looked at.

Sections: 8-beat count-in, movement I (48 beats @ 96), 8-beat fill, movement II (40 @ 112),
8-beat fill, movement III (40 @ 126), 8-beat outro. 87.4 s of music, run ends at 88.6 s.

Reds are drawn only from the single slots, because a bonus double is two blue rings by
definition. `redRatio` is expressed over ALL of a movement's rings and satisfied out of those
singles, so Movement III (30% of 20 = 6) uses 6 of its 10 singles. Placement is random with a
run-length guard, then a deterministic sweep so the count is always met exactly; the gate
asserts never more than 2 temptations in a row and that the first ring of the track is never
one.

## Judging

| tap lands | outcome |
|---|---|
| within `captureMs` of a blue ring, `\|err\| <= 45 ms` | PERFECT, 100 x combo multiplier |
| within `captureMs` of a blue ring, `\|err\| <= 110 ms` | GOOD, 40 |
| within `captureMs` of a blue ring, worse than that | MISS (ring consumed) |
| within `captureMs` of a red ring | MISS (temptation taken) |
| no ring within `captureMs`, but a ring is on screen | MISS (off-beat — the brief's "else MISS") |
| no ring on screen at all | ignored |

`captureMs` is 190 ms and its two bounds are both load-bearing. It is **wider than the GOOD
window** so a tap clearly meant for a ring costs ONE miss rather than two (the mistimed tap,
plus the ring auto-missing behind it). It is **narrower than the 238.1 ms minimum ring
spacing** — the bonus double at 126 BPM — so a tap can never reach past a nearer ring; the
gate asserts this inequality per block.

Taps during the count-in, the fills and the outro are free, because no ring is on screen and
there is nothing to be wrong about. That is also what makes the tap-to-start gesture safe.

`lockoutMs` is 60 ms, a finger-bounce debounce that discards rather than judges. It was 90 ms
in the first build: with the gate profile's 65 ms jitter that swallowed the second tap of a
Movement III bonus double (238 ms apart) on **4.17% measured** (5.4% was the analytic
per-double figure; measured is lower because a swallowed tap does not advance the debounce
clock). The real cost of 90-vs-60 is **0.055 extra misses per run** (~1.2 win points) — an
earlier revision of this doc quoted 0.45, which counted swallowed taps, not misses. Still
far above any real finger bounce at 60 ms. It cannot be exploited — it only ever discards
the player's own input.

## Scoring

| event | value |
|---|---|
| PERFECT | 100 x `min(3, 1 + floor(combo / 10))` |
| GOOD | 40 |
| Temptation correctly ignored | 15 |
| Miss | 0, combo resets |

The multiplier reads the combo you ALREADY had, so the first PERFECT of a run is a flat 100
and the eleventh is 200. Anything correct extends the combo, including letting a red ring
through, because inhibition is the other half of the skill.

Stats contract: `{score, perfects, bestCombo, misses}`.

## Balance

`scripts/balance.mjs` imports the shipped `data.js` / `track.js` and never re-implements a
rule. **4 seed blocks x 400 runs** by default, blocks 1,000,000 apart in seed space, every
band asserted on every block independently. At 4,000 runs per block:

| profile | win% by block | band | score | misses |
|---|---|---|---|---|
| **`spec`** (the gate: sigma 65 ms, 8% red false-tap) | **36.6 / 34.9 / 38.4 / 38.0** | 25–45% | 4,295 | 5.73 |
| `sharp` (sigma 20 ms, 1%) | 100 / 100 / 100 / 100 | >= 90% | 11,748 | 0.14 |
| `casual` (sigma 75 ms, 11%) | 7.6 / 7.5 / 7.7 / 7.9 | 2–22% | 2,946 | 7.40 |
| `distracted` (gate + 2%/beat phantom taps) | 17.5 / 20.8 / 19.3 / 18.8 | 10–35% | 3,592 | 6.97 |
| `spam` (taps every 120 ms) | 0 / 0 / 0 / 0 | 0%, lapses **4.4 s** | 0 | 8.00 |
| `redBlind` (perfect timing, taps every ring) | 0 / 0 / 0 / 0 | 0%, lapses 53.8 s | 2,724 | 8.00 |
| `hedger` (double-taps every premium ±70 ms) | 0 / 0 / 0 / 0 | 0%, lapses 20.4 s | 420 | 8.00 |
| `idle` (never taps) | 0 / 0 / 0 / 0 | 0%, lapses **18.9 s** | 26 | 8.00 |

Gate-profile misses by cause: mistimed 3.78, temptation taken 1.18, premium ignored 0.52,
off-beat 0.24. Session 83.3 s mean, 88.6 s longest, against a 110 s backstop clock and the
120 s build-standard cap.

**Decision honesty.** No bot reads the future: a bot's tap for a ring is emitted at
`ring.hitMs + deviceLatencyMs + jitter` — a decision to tap "on the beat I can hear", not one
informed by where the ring actually is at the moment of contact. There is no
wait-and-then-retime profile because there is nothing to wait for: in a rhythm game the ring
arriving IS the information, and it arrives at the same instant for everyone. No bot
instant-commits; human timing is a gaussian around the perceived beat. Ring colour is not
hidden information (a ring is on screen for 1.19–1.56 s in a distinct colour AND a distinct
shape), so the briefed red false-tap rate models a failure of INHIBITION, not of perception.

**Sensitivity, printed on every run.** Four curves, because four different things have to
stay true; if any column were flat, that part of the design would be decoration.

    jitter      20ms 100%  | 40ms 99.5% | 55ms 78.5% | 65ms 33.8% | 80ms 4.5% | 100ms 0.5%
    inhibition  0% 51.7%   | 4% 42.0%   | 8% 33.8%   | 15% 22.0%  | 25% 11.8%
    phantom     0%/b 33.8% | 0.5% 27.8% | 1.0% 23.0% | 2.0% 17.5% | 4.0% 7.8% | 8.0% 1.0%
    bias      -30ms 16.8%  | -25ms 22.3%| -10ms 31.8%| 0 33.8%    | +10 32.8% | +25 20.3% | +30 14.5%

The jitter curve is steep, and honestly so: 48 blue rings x the briefed 110 ms GOOD window
against the briefed 8-miss cap gives a mean of 4.3 lapses per run at sigma 65 and 8.1 at
sigma 80. That steepness comes from the brief's own constants, not from a tuning choice, and
the `casual` canary exists to keep it visible.

The **phantom** row is the tresillo's cost, and the reason the `distracted` profile exists.
63% of metronome beats carry no ring; the 3+3+2 grid is justified in `data.js` by the claim
that an even grid lets a player stop reading rings and tap the pulse instead. Until this row
existed, no profile could make that mistake, so the gate was scoring a strictly easier game
than the one that ships.

The **bias** row closes the one blind spot the rest of the gate structurally cannot see:
`deviceLatencyMs` is charged to every bot AND subtracted by the shipped judge, so it cancels
exactly and no assertion can fail when the 60 ms constant is wrong for a real handset. Note
the sharp profile is no substitute as a guard — at +45 ms bias it still wins 99.3%, because
sigma-20 jitter keeps the whole distribution inside the GOOD window. A floor is asserted on
every block: gate profile >= 15% at +/-25 ms.

**Frame-replay equivalence.** The sim drives a run by taps alone; the shipped component also
calls `resolveDue` on the judging clock every animation frame, so a missed premium lights up
when it is missed rather than when the next tap arrives. If those two calling patterns could
disagree, every number above would be measuring a game nobody plays. The gate replays the
same seed, track and tap list BOTH ways — tap-driven, and frame-driven at 60 Hz with taps
injected at their own timestamps between frames — and requires the full stats contract to
come out bit-identical: **4,800 runs, 0 mismatches**. It holds because `judgeTap` sweeps to
the tap's own judging time before searching, so a frame preceding a tap at X can only have
swept to at most `X - deviceLatencyMs`, exactly where the tap's own sweep lands. Sweep the
raw clock, drop the sweep inside `judgeTap`, or make it non-idempotent, and the assertion
fails.

**Schedule assertions, per seed block:** exactly 64 rings; per-movement red counts; no
bonus-double half is ever red; never 3 temptations in a row; the first ring is never a
temptation; minimum ring spacing (238.1 ms) > `captureMs` (190 ms); the ON-SCREEN portion of
the shortest approach >= the 700 ms readability floor; metronome events and rings both
non-decreasing in time (the scheduler cursor and `run.cursor` both assume it); the run fits
the 120 s cap; and `targetScore` (4,600) <= the brute-forced flawless-run ceiling (12,340) so
the Results ring can always close.

The readability assertion used to credit the full `approachMs`, which was wrong: `spawnR`
(501 px) sits past the far corner (435 px) on purpose, so a ring fades in from offscreen
rather than popping in at the edge, and 15.7% of every approach is spent invisible. It now
asserts the visible fraction against the smallest portrait stage the standard names:
1,190 ms x 83.8% = **997 ms** against the 700 ms floor.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`; every tunable in one place.
- `src/track.js` — **pure**: section plan, beat times, the metronome event list, seeded ring
  and red-placement generation, latency compensation, tap judging, scoring, win/lose. No DOM,
  no React, no import of `data.js` (config is a parameter).
- `src/PremiumPulseGame.jsx` — the canvas component. Mutable state in refs (never React
  state — the loop runs at 120 Hz), module-level draw functions, an offscreen-prerendered
  backdrop rebuilt only on resize, per-ring runtime in preallocated typed arrays, HUD written
  via `textContent`. It contains no rules: it decides only what a beat looks like.
- `src/Screens.jsx` — Home (the mechanic as one animated SVG), How to Play (3 CSS-animated
  beat demos), Results (score ring closing exactly at the win line, stats tiles, Book a Slot).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

Rendering is programmatic canvas and inline SVG only. No image files, no emoji sprites: the
badge is a drawn shield with a rosette and a tick, premiums are smooth rings with four
cardinal nubs, temptations are 16-point rotating stars, the combo fire is a wobbling polygon
aura. The two silhouettes differ by **shape as well as colour**, so the go/no-go read
survives colour blindness. The scaffold's `guardian_shelter_bg.png` on the thank-you screen
was replaced with a concentric-pulse gradient wash, so the game ships with zero binary assets.

## Audio

All of it from the kit synth, built from its primitives — no audio files, no second context:

| role | kit voice |
|---|---|
| kick (bar beats 1 and 3) | `hit()` — saw 200 -> 100 Hz |
| hat (every off-beat) | `tick()` — 1400 Hz square |
| accented downbeat | `hit()` + `tick()` |
| count-in click | `click()` |
| fill / movement sting | `powerUp()` |
| PERFECT | `coin()` + `combo(depth)` |
| GOOD | `click()` |
| MISS | `hit()` |
| win / lose | `victory()` / `failure()` |

Master volume 0.30 so the groove sits under the judgement voices. The context is unlocked by
the tap-to-start gesture, which is why that gesture exists.

## Colour grammar

BLUE is a premium falling due — the ring you are meant to meet. RED is an impulse buy: a
spiked ring to let pass. ORANGE is you: the badge at the centre and the combo fire. GOLD is a
PERFECT beat and the bonus double. GREEN is correct inhibition, a temptation skipped.

## Ports and commands

Dev server on **5066**. `pnpm install`, `pnpm dev`, `pnpm build` (uat — the verification
gate), `pnpm build:preprod`, `pnpm build:prod`, `pnpm preview`,
`node scripts/balance.mjs [--runs N] [--blocks N] [--sweep]`.
