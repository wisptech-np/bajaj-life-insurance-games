# Premium Pulse

Beat-synchronised rhythm tapping with a radial go/no-go twist. Dev port **5066**.

A glowing policy badge sits at the centre of the screen. Rings spawn at the edge and
contract onto it in exact time with a synth metronome groove — the audio and the rings are
two renderings of one schedule, not two schedules kept in step.

- **Blue rings** are premiums falling due. TAP when one reaches the badge outline:
  `|err| <= 45 ms` **PERFECT**, `<= 110 ms` **GOOD**, anything else is a **MISS**.
- **Red spiked rings** are impulse buys. Let them through untouched and they pay 15 for the
  inhibition; touch one and it costs a miss.
- Every **8th beat** is a **bonus double**: two blue rings a half-beat apart.

Three movements at **96 → 112 → 126 BPM**, separated by 8-beat fills, 87.4 s of music and
**64 scored rings** (48 blue, 16 red). Red ratio ramps 20% → 25% → 30%.

**Win:** finish the track with `score >= 4600` **and** fewer than 8 misses.
**Lose:** the 8th miss ("cover lapsed"), or the track ends short of the target.

## Financial hook

A premium is a small, dull, perfectly-timed act you have to keep doing while everything
around you is asking for the same money right now. The mechanic is that argument, and the
balance sim measures it rather than asserting it:

- **Rhythm alone does not win.** The `redBlind` bot has near-perfect timing and taps every
  ring including the temptations. It wins 0% of runs and lapses at 53.8 s. Being good at
  paying is worthless if you also pay for everything else.
- **Inhibition alone does not win either.** The `idle` bot never touches a temptation. It
  lapses at 18.9 s.
- **Hedging does not work.** The `hedger` bot double-taps every premium, 70 ms early and
  70 ms late, to cover whatever the true latency turns out to be. It lapses at 20.4 s: the
  first tap consumes the ring, so the second is just a mistimed payment.
- **Consistency compounds.** The combo multiplier reads the streak you already had, so ten
  clean beats double a PERFECT and twenty triple it. Nearly all of the difference between
  the 4,300-point median run and the 11,700-point sharp run is combo, not accuracy.

## Controls

Tap anywhere. The first tap starts the track (and unlocks audio — a rhythm game whose
first bar is silent is not a rhythm game); it is not judged.

## Scoring

| event | value |
|---|---|
| PERFECT (`<= 45 ms`) | 100 x combo multiplier |
| GOOD (`<= 110 ms`) | 40 |
| Temptation correctly ignored | 15 |
| Combo multiplier | `min(3, 1 + floor(combo / 10))`, read from the combo you already had |
| Miss | 0, combo resets |

Anything correct extends the combo, including letting a red ring through. A miss is a
mistimed tap, a tapped temptation, an ignored premium, or a tap at nothing while a ring is
on screen.

Stats contract: `{score, perfects, bestCombo, misses}`.

## Timing model

The part of this game that matters most, and the part most likely to be got wrong.

**One clock.** Everything — the metronome, the ring radii, the tap stamps — comes off a
single pause-aware `performance.now()` track clock. There is no second timeline, so there is
nothing that can drift. `scripts/balance.mjs` proves it: `beatTimeMs()` derives a beat by
section offset + multiply, `metronomeEvents()` derives it by accumulating one beat at a
time, and the gate asserts they agree to **< 1 ms** across all 152 beats and all 64 rings, on
every seed block. Measured drift is ~2.9e-10 ms.

**Why not `AudioContext.currentTime`?** The kit's `createAudio` is a fire-and-forget synth:
`audio.hit()` plays a kick *now*, and the kit exposes no AudioContext handle and no
scheduled-tone API — and those files are copied byte-identical from `shared/game-kit` and
may not be edited. So there is no audio timeline to slave the visuals to; a voice's play time
is decided by when we call it. Opening a *second* AudioContext purely to read `currentTime`
would be strictly worse: its clock is independent of the one the kit's voices actually play
on, which is exactly the second drifting timebase this design exists to avoid.

**Frame stalls.** The metronome is driven from a **20 ms `setInterval` lookahead scheduler**
rather than from `requestAnimationFrame`. Precisely what that buys, measured:

- It does **not** survive a main-thread block — `setInterval` is main-thread too, so a long
  synchronous stall delays it exactly as it delays rAF (10.4 beat sounds dropped per run
  under a stall profile).
- It **does** give complete protection against rAF-only starvation (a throttled or skipped
  compositor frame cannot move a beat), and tighter placement in normal play: mean beat
  lateness **8.46 ms → 5.60 ms** at 60 fps.

Timing *correctness* never depended on either. The schedule is absolute, every event fires
against its own scheduled time, and a beat more than 110 ms late has its sound dropped rather
than bunched onto the next one. A stall costs sound, never sync. Ring positions come off the
same clock in `render()`, so a dropped frame moves neither the sound nor the picture.

**Tap stamps.** Taps are stamped from the pointerdown event's own `timeStamp` (same timebase
as `performance.now`), captured by a listener registered *before* the kit's input handler —
not from a `performance.now()` read inside the handler, which under jank is several ms late
against a 45 ms PERFECT window.

**The latency constant.** `deviceLatencyMs = 60` is the single documented allowance covering
audio output latency (the beat is heard after the voice is triggered) plus touch input
latency (pointerdown arrives after the finger lands). Both are additive and both push a tap
late, so the sum is subtracted once, in `toJudgeMs()`, in the **shipped pure module** — not
in the component. That is deliberate: the sim then exercises the exact arithmetic a real
finger goes through. Every bot emits taps at `hitMs + deviceLatencyMs + jitter` and is judged
by the shipped judge which subtracts it, so the constant cancels on both sides and cannot be
used to flatter the measured bands.

## Balance

`scripts/balance.mjs` imports the shipped `data.js` / `track.js` and never re-implements a
rule. **4 seed blocks x 400 runs** by default, every band asserted on every block
independently. At 4,000 runs per block:

| profile | block win% | band | score | misses |
|---|---|---|---|---|
| **`spec`** (the gate: sigma 65 ms, 8% red false-tap) | **36.6 / 34.9 / 38.4 / 38.0** | 25–45% | 4,295 | 5.73 |
| `sharp` (sigma 20 ms, 1%) | 100 / 100 / 100 / 100 | >= 90% | 11,748 | 0.14 |
| `casual` (sigma 75 ms, 11%) | 7.6 / 7.5 / 7.7 / 7.9 | 2–22% | 2,946 | 7.40 |
| `distracted` (gate + 2%/beat phantom taps) | 17.5 / 20.8 / 19.3 / 18.8 | 10–35% | 3,592 | 6.97 |
| `spam` (taps every 120 ms) | 0 / 0 / 0 / 0 | 0%, lapses **4.4 s** | 0 | 8.00 |
| `redBlind` (perfect timing, taps every ring) | 0 / 0 / 0 / 0 | 0%, lapses 53.8 s | 2,724 | 8.00 |
| `hedger` (double-taps every premium ±70 ms) | 0 / 0 / 0 / 0 | 0%, lapses 20.4 s | 420 | 8.00 |
| `idle` (never taps) | 0 / 0 / 0 / 0 | 0%, lapses **18.9 s** | 26 | 8.00 |

The gate profile's misses break down as mistimed 3.78, temptation taken 1.18, premium
ignored 0.52, off-beat 0.24. It survives the track 73.5% of the time and clears the score
37.5% of the time, so **the score target is the binding half of the win line**, which is what
makes the combo worth chasing rather than just surviving.

Four sensitivity curves are printed on every run, because four different things have to stay
true:

    jitter      20ms 100%  | 40ms 99.5% | 55ms 78.5% | 65ms 33.8% | 80ms 4.5% | 100ms 0.5%
    inhibition  0% 51.7%   | 4% 42.0%   | 8% 33.8%   | 15% 22.0%  | 25% 11.8%
    phantom     0%/b 33.8% | 0.5% 27.8% | 1.0% 23.0% | 2.0% 17.5% | 4.0% 7.8% | 8.0% 1.0%
    bias      -30ms 16.8%  | -25ms 22.3%| -10ms 31.8%| 0 33.8%    | +10 32.8% | +25 20.3% | +30 14.5%

The **phantom** row is the cost the tresillo grid exists to impose (63% of beats carry no
ring, and an off-pulse tap is a miss) — without it the gate scored a strictly easier game
than the one that ships. The **bias** row is the one blind spot the rest of the gate
structurally cannot see: `deviceLatencyMs` cancels exactly between bot and judge, so nothing
fails when the 60 ms constant is wrong for a real handset. A floor is asserted on every
block (gate profile ≥ 15% at ±25 ms bias). The sharp profile is no substitute — at +45 ms
bias it still wins 99.3%.

**Frame-replay equivalence.** The sim drives a run by taps alone; the shipped component also
calls `resolveDue` every animation frame. The gate replays the same seed, track and tap list
both ways — tap-driven, and frame-driven at 60 Hz with taps injected between frames — and
requires the stats contract to come out bit-identical: **4,800 runs, 0 mismatches**. So the
numbers above measure the calling pattern that actually ships.

The gate also asserts, per seed block: the on-screen portion of the shortest approach
(1,190 ms × 83.8% visible = 997 ms, since `spawnR` sits past the corner so rings fade in from
offscreen) clears the 700 ms readability floor; exactly 64 rings; the red count per movement; no
bonus-double half is ever red; never 3 temptations in a row; the first ring is never a
temptation; minimum ring spacing (238.1 ms) exceeds `captureMs` (190 ms) so a tap can never
reach past a nearer ring; the shortest approach (1,190 ms) clears the readability floor; the
track fits the 120 s build-standard cap; and `targetScore` (4,600) is below the brute-forced
flawless-run ceiling (12,340) so the Results ring can always close.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`; every tunable in one place.
- `src/track.js` — **pure**: section plan, beat times, the metronome event list, seeded ring
  and red-placement generation, tap judging, scoring, win/lose. No DOM, no React, no import
  of `data.js` (config is a parameter).
- `src/PremiumPulseGame.jsx` — the canvas component. Mutable state in refs, module-level
  draw functions, an offscreen-prerendered backdrop rebuilt only on resize, HUD written via
  `textContent`. It contains no rules: it decides only what a beat looks like.
- `src/Screens.jsx` — Home (the mechanic as one animated SVG), How to Play (3 CSS-animated
  beat demos), Results (score ring closing exactly at the win line, the stats tiles, Book a
  Slot).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

Rendering is programmatic canvas and inline SVG only. No image files, no emoji sprites: the
badge is a drawn shield with a rosette and a tick, premiums are smooth rings with four
cardinal nubs, temptations are 16-point rotating stars, the combo fire is a wobbling polygon
aura. The two ring silhouettes differ by **shape as well as colour**, so the go/no-go read
survives colour blindness. All audio is the kit synth: kick (`hit`), hat (`tick`), count-in
(`click`), fill sting (`powerUp`), judgement voices (`coin` / `click` / `combo`).

## Ports and commands

Dev server on **5066**.

```
pnpm install
pnpm dev
pnpm build            # uat — the verification gate
pnpm build:preprod
pnpm build:prod
pnpm preview
node scripts/balance.mjs               # the gate: 4 blocks x 400 runs
node scripts/balance.mjs --runs 4000   # tighter confidence intervals
node scripts/balance.mjs --sweep       # win% across candidate targetScore values
```
