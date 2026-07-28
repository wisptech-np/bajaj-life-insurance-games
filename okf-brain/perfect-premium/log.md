---
type: log
title: Perfect Premium Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/perfect-premium/log.md
timestamp: 2026-07-28
---

# Perfect Premium Change Log

## [2026-07-28] Initial build

Built to design spec `docs/superpowers/specs/2026-07-28-ten-new-games-design.md`
§10 and `okf-brain/GAME_STANDARD.md` v2.

### Scaffold and identity

- Scaffolded from `guardian-shelter/` per GAME_STANDARD §1: `index.html`,
  `vite.config.js`, `package.json`, `src/main.jsx`, `src/index.css`,
  `src/App.jsx`, `src/api.js`, `LeadCaptureModal.jsx`, `SlotBookingModal.jsx`,
  `ThankYouScreen.jsx`, `Screens.jsx`, `services/playCount.js`,
  `utils/crypto.js`, `utils/shortener.js`, plus a byte-identical copy of
  `shared/game-kit/*.js` into `src/kit/` (verified with `diff` against the
  canonical copies before and after the build).
- Identity rewired: package name `perfect-premium`, rollup output name
  `PerfectPremium`, dev port **5064**, title `Perfect Premium — Bajaj Life`,
  `LEAD_NO_KEY = 'perfectPremiumLeadNo'`, `summaryDtls = 'Perfect Premium Lead'`
  (both the api.js default and the LeadCaptureModal call site), SlotBookingModal
  remark `Perfect Premium Slot Booking | Score: N`, api.js `stringval6` fallback
  `Slot Booking via Perfect Premium`. `grep -r "Guardian Shelter" src/` returns
  **zero matches**; a case-insensitive sweep for `guardian|shelter|wealth drop`
  over `src/` and `scripts/` also returns zero.
- Screen flow per §2: `home → howtoplay → game → results (+LeadCaptureModal if
  `sessionStorage[LEAD_NO_KEY]` is empty) → [Book a Slot → SlotBookingModal] →
  thankyou`. Restart is a remount via `key={gameKey}`. `incrementPlayCount()` is
  called in exactly one place — `startGame()` in App.jsx — and Retry and "play
  again" both route through it.

### Rules live in a pure module

The whole game is `src/stages.js`: the difficulty ramp (`stageSpeed`,
`stageZoneWidth`, `isArcStage`), zone generation (`makeZone`), lock judgment
(`judgeLock`), sweep kinematics (`stepMarker`, `timeToReach`), scoring
(`stageScore`) and the complete run state machine (`createRun`, `runStep`,
`runTap`, `lockAt`, `runStats`). It has no DOM, no React, no canvas and no
browser API, and imports only `src/data.js`, which is itself import-free.

`PerfectPremiumGame.jsx` therefore contains **no rules at all** — it drives
`runStep(dt)` on the fixed tick and `runTap()` on pointer-down, and reads state
back out to paint. `scripts/balance.mjs` drives the identical functions.

### Gameplay as built

- 12 stages, ages 25 → 60, each a premium due date named after the life event
  that wants the money instead (first pay cheque, first job raise, wedding year,
  first child, home loan, car upgrade, school fees, parents' care, college fund,
  business dream, pre-retirement top-up, retirement day).
- Marker sweeps `[0,1]` and reflects off both ends; base 0.90 bar-widths/s,
  +7% compounding per stage → 1.89 by stage 12.
- Green safe zone 24% → 9% of the bar, linear across the twelve stages. Gold
  PERFECT sliver is 26% of whatever green currently is (floor 1.4% of the bar),
  so it narrows with green — a late perfect really is harder.
- Zone centre re-randomised every stage AND every retry, constrained to keep
  green at least 5% of the bar clear of either end (a clipped zone would be a
  free stage: the marker cannot overshoot past 0 or 1, so a zone hard against
  the wall would catch every outward error). A re-roll must move at least 12% of
  the bar so a repeat is a new read, not the same muscle memory.
- Every 4th stage (indices 3, 7, 11) the bar bends into a circular arc, sagitta
  16% of the chord. Presentation only — declared in the rules module so the
  renderer and the how-to-play screen agree with the rules rather than guessing.
- Bonus top-up band: from stage 3 onward, 35% chance, 4.5% of the bar wide,
  offset to one side of green with a 6%-of-bar gap. Locking in it banks +150 and
  does **not** advance the stage; the stage clock deliberately keeps running
  through the resolve so a top-up is paid for out of the speed bonus rather than
  refreshing it. Missing everything still costs a grace period.
- Scoring: `(100 + round(remaining stage seconds) x 10) x min(1 + consecutive
  PERFECTs, 4)`, doubled on a PERFECT. 6-second speed-bonus allowance per
  attempt, drawn as a draining meter. A miss and an ordinary safe clear both
  reset the combo, so x4 is a chain of four perfect premiums.
- Win: 12 stages cleared (three staggered firework bursts + "RETIREMENT
  SECURED"). Lose: 3rd miss (grace exhausted) or the 100-second clock.
- Stats contract exactly `{score, perfects, bestCombo, stagesCleared}`.

### Balance gate

`scripts/balance.mjs` imports the shipped `src/stages.js` and `src/data.js` —
it never re-implements a rule, so the table cannot drift from the code.

Bot model: aims at the green centre (always tries for a PERFECT), realised lock
`centre + N(0, sigma)` clamped to the bar, ignores the top-up band. Timing is
simulated rather than assumed — after a 0.22 s beat to read a fresh layout it
waits for the marker to actually reach its target (via `timeToReach`) and locks
at that instant, so every resolve beat and every wasted sweep comes out of the
same 100-second clock the player gets. Two independent mulberry32 streams per
run (game zone placement, bot aiming noise), each a pure function of the run
index and the master seed; gaussians by Box-Muller with the second variate
cached. Re-running with the same `--seed` reproduces the table byte-for-byte.

Gate conditions (exit 1 on any failure): sigma 6% in 25–45%; sigma 2% at or
above 90%; no run hits the step guard; no run exceeds the 100 s clock; and the
timeout lose path must be demonstrably reachable.

**Result at the spec's 500 runs per profile, seed `0x5eed1234`: casual (sigma
6%) 42.4%, expert (sigma 2%) 100.0% — GATE: PASS.**

At 20,000 runs per profile the same seed measures:

```
profile               win%   lose:grace  lose:clock   score   stages  perfects  clock
sigma 2% (expert)    100.0%       0.0%        0.0%    7444    12.00      8.34   13.9s
sigma 4%              88.7%      11.3%        0.0%    4118    11.81      5.11   15.1s
sigma 6% (casual)     39.4%      60.6%        0.0%    2884    10.18      3.55   15.3s
sigma 8%              10.4%      89.6%        0.0%    2028     7.80      2.47   13.5s
sigma 12% (mashing)    0.5%      99.5%        0.0%    1090     4.56      1.33   10.1s
sigma 6% greedy        7.8%      92.2%        0.0%    2073     7.24      2.56   13.7s
dithering (2%, 7.2s)  90.4%       0.0%        9.6%    4845    11.90      8.30   98.1s
```

Seed robustness at the 500-run gate: 42.4% (`0x5eed1234`), 37.6% (`1`), 36.2%
(`99`), 35.8% (`123456`), 36.0% (`0xdeadbeef`), 42.0% (`7`) — every one inside
25–45%.

Two profiles exist to prove things the two gated numbers cannot:

- **`sigma 6% greedy`** aims at the bonus top-up band whenever one is on screen.
  It wins 7.8% against 39.4% for the same aim spent on the premium, so chasing
  extra return before covering the basics is a measurably losing strategy — the
  financial hook has a number behind it.
- **`dithering`** has the expert's 2% aim but spends 7.2 s reading each layout.
  A reflex bot uses only 14–15 s of the 100 s cap, so without this profile the
  timeout branch would be untested; the dithering bot loses 9.6% of runs to the
  clock at 98.1 s average, which is the gate's proof that the clock lose path is
  reachable rather than decoration.

### Spec corrections

**None were required.** Every constant in §10 shipped as written:

| spec constant | shipped |
|---|---|
| 12 stages, age 25 → 60 | as written |
| sweep speed +7% per stage | as written |
| green zone 24% → 9% of bar | as written |
| gold centre sliver = PERFECT | as written |
| zone position re-randomised per stage | as written (plus per retry, plus a 12% minimum shift) |
| every 4th stage bends into an arc | as written (indices 3, 7, 11) |
| top-up +150, does not advance the stage, missing costs grace | as written |
| 3 grace periods | as written |
| 100 s clock | as written |
| stage 100 + remaining-stage-seconds x 10 | as written |
| PERFECT x2, +1 combo, combo multiplies up to x4 | as written |
| win: 12 stages; lose: 3 misses or clock | as written |
| stats `{score, perfects, bestCombo, stagesCleared}` | as written |
| sim: sigma 6% → 25–45%, sigma 2% → >= 90% | measured 42.4% / 100.0% at 500 runs |

The ramp the spec specifies lands the analytic finish rate at ~38% (per-stage
clear chance `erf((green/2)/(sigma*sqrt2))` runs 95.4% → 54.7%; zero misses
across twelve stages is only 5.7% likely, and the three grace periods are what
turn that into a winnable run). The measured 39.4% at 20k runs confirms the
model, so there was nothing to correct.

Constants the spec deliberately left open, chosen here and documented at their
definitions in `src/data.js`:

- `sweep.baseSpeed = 0.90` bar-widths/s — 1.11 s per crossing on stage 1, 0.53 s
  by stage 12. Fast enough to require commitment, slow enough to read.
- `zone.perfectFraction = 0.26` (gold as a fraction of green) with a 1.4%-of-bar
  floor. Gives the sigma-6% bot a 39.7% perfect chance on stage 1 falling to
  15.5% on stage 12 — special, not rare.
- `zone.edgeMargin = 0.05` and `zone.minRerollShift = 0.12` — the two guards
  described above.
- `topUp.gap = 0.06`, `topUp.chance = 0.35`, `topUp.firstStageIndex = 2` — the
  band never touches green, and the player reads two ordinary stages first.
- `scoring.stageSeconds = 6` — the speed-bonus allowance. Makes the fast, exact
  play worth roughly 8x the slow, adequate one on the same stage.
- `timing.resolveSeconds` 0.55 / `missResolveSeconds` 0.85 / `topUpResolveSeconds`
  0.45 — the beats that give the banner and the shake room, and the reason a
  twelve-stage run is ~15 s of clock rather than 11.

### Presentation and standards compliance

- **No emoji sprites.** A codepoint scan over `src/` returns zero suspicious
  characters; every game object is a programmatic canvas shape (track as a
  rounded rect or an arc stroke, zones as bands, the marker as a needle with a
  diamond head, milestones as discs with a stroked tick / a pulsing ring / a dim
  dot) and every screen graphic is inline SVG. The only non-ASCII glyph in the
  tree is the `✓` in the copied LeadCaptureModal's HTML checkbox, which
  GAME_STANDARD §8.3 explicitly allows.
- Brand palette throughout: BLUE `#003DA6`, ORANGE `#F26522`, GREEN `#28A745`,
  page background `#0B1221`.
- Juice floor met: >= 14 particles on every lock (26 + a 16-particle green
  secondary on a PERFECT, 20 on a top-up, 18 on a miss, 3 x 40 staggered
  fireworks on the win), floating `+N` / `GRACE USED` text, screen shake on a
  miss, hit-stop on a PERFECT, elastic squash on the marker, milestone-node pop,
  out-back grow on every fresh zone, fade-and-rise on every stage card, a
  420 ms canvas entry transition, framer-motion spring transitions between
  screens, and a damped score counter.
- Audio is the kit's Web Audio synth only, unlocked on the first pointer gesture,
  suspended with the loop's pause.
- Mobile: viewport meta with `maximum-scale=1`, 430 px max container,
  `fitCanvas(canvas, w, h, 2)` with a ResizeObserver and an orientationchange
  handler, `touch-action: none` on the stage and the canvas, 44x44 mute button.
- Hot-loop discipline: all mutable state in refs; `fx.update(dt)` then
  `fx.isFrozen()` early-return at the top of `update`; HUD score written through
  a `textContent` ref (time / grace / combo are the only React state and each
  changes a handful of times per run); the backdrop pre-rendered offscreen once
  per resize; gradients built once per resize and anchored at the origin;
  `barPoint()` writes into a module-level scratch object; end-run bursts clamped
  on-screen; full teardown on unmount (loop.stop, input.destroy, ro.disconnect,
  orientationchange removed, both timeouts cleared, fx.reset, audio.destroy).

Two presentation-layer decisions worth recording because they are not obvious:

1. **The session clock lives on the run object, not on the kit loop.**
   `createGameLoop` is created without `sessionSeconds`. Two clocks would
   disagree, and the simulator has to measure the same 100 seconds the player
   sees — so `runStep` owns the countdown and the component mirrors whole
   seconds into the HUD. The loop still owns pause/visibility and does not call
   `update()` while the tab is hidden, so a backgrounded phone cannot burn the
   session.
2. **The arc bands take flat colours, not the straight bar's gradients.** A
   linear gradient anchored at the origin is centred on the arc's centre, which
   on a ~284 px radius is hundreds of pixels from the stroke, so every band would
   paint in its extrapolated end stop. The lit edge is a second, thinner stroke
   just outside the band instead.

### Verification

- `pnpm install` — clean (React 18.3.1, Vite 5.4.21).
- `pnpm build` (mode uat) — **passes**, zero errors:
  `524 modules transformed`, `dist/index.html 0.85 kB`,
  `dist/assets/index-*.css 33.00 kB`, `dist/assets/index-*.js 420.57 kB`
  (gzip 139.82 kB), built in ~1.9 s.
- `node scripts/balance.mjs` — **GATE: PASS** (casual 42.4% in 25–45%, expert
  100.0% >= 90%, every run terminates inside the clock, timeout path reachable).
- `diff shared/game-kit/*.js perfect-premium/src/kit/*.js` — identical.
- `grep -r "Guardian Shelter" perfect-premium/src/` — zero matches.

### Known issues / deferred

- **No in-browser playtest.** The build gate and the headless simulator both
  pass, but this session had no browser: the canvas painters have been reviewed
  by hand rather than seen running. The arc geometry in particular (radius,
  centre and the angle mapping for stages 4/8/12) is derived and unit-consistent
  but unverified on a real device.
- **The expert profile tops out at 100.0% rather than merely clearing 90%.** At
  sigma 2% the narrowest green (9% of the bar) is 2.25 standard deviations wide,
  so misses are rare enough that three grace periods effectively never run out.
  That satisfies the spec's ">= 90%" but means the skill ceiling is reached
  slightly before the bar is at its most demanding. Left as specified rather
  than narrowing the end of the ramp, which would have pushed the casual number
  below the band.
- Registration deltas (`scripts/games-manifest.json`, `README.md` table,
  `scripts/sync-game-kit.mjs` GAMES list, `scripts/build-status.json`,
  `scripts/build_tracker.py` CATALOG_NOTE, `GAMES_TRACKER.xlsx`) are the
  controller's single post-batch task and were deliberately **not** touched here.
