---
type: log
title: Wealth Balloon Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/wealth-balloon/log.md
timestamp: 2026-07-29
---

# Wealth Balloon Change Log

## [2026-07-29] Initial build

- Scaffolded from `guardian-shelter/` per GAME_STANDARD §1 (index.html,
  vite.config.js, package.json, main.jsx, index.css, App.jsx, api.js,
  LeadCaptureModal, SlotBookingModal, ThankYouScreen, Screens.jsx,
  services/playCount.js, utils/crypto.js, utils/shortener.js) plus an unedited
  copy of `shared/game-kit/*.js` into `src/kit/` (verified byte-identical with
  `cmp` after copying). Identity rewired: package name `wealth-balloon`, rollup
  output `WealthBalloon`, dev port **5059**, title `Wealth Balloon`,
  `LEAD_NO_KEY = 'wealthBalloonLeadNo'`, `summaryDtls = 'Wealth Balloon Lead'`,
  slot-booking remark `Wealth Balloon Slot Booking | Score: n`. `grep -r
  "Guardian Shelter" wealth-balloon/src/` returns zero matches — the stragglers
  were the ThankYouScreen background-image import (dropped along with the PNG),
  the SlotBookingModal header comment and remark string, the LeadCaptureModal
  sub-heading, and a block of `.undo-btn` / `.storm-btn` rules in the copied
  `index.css` that only the source game used.
- Built the press-your-luck loop per spec §5: HOLD to inflate on `10 x t^1.6`,
  hidden burst threshold `U(2.2, 4.6)s` per round, an honest-but-noisy tell
  (wobble + blue→orange→red hue shift) starting at `0.7 x threshold ± 0.35 s`,
  RELEASE banks the shown value, one Term Shield absorbing the first burst at
  50% of the at-burst value, and needle drones from round 4 that pop the balloon
  if it is released while one overlaps the envelope. Six rounds, 120 s cap.
- All rules live in `src/rounds.js`, a pure module with no React/canvas/DOM
  import, so `scripts/balance.mjs` executes the shipping code rather than a
  re-implementation. Spatial quantities are in field units (fractions of the
  canvas width), which makes the drone geometry identical at every canvas size —
  the sim measures the geometry the phone renders.
- Rendering is programmatic canvas only. The balloon is a 40-segment polar path
  traced in unit space and scaled to the live radius (taper toward the neck; two
  counter-rotating sine harmonics for the wobble). The hue shift cross-fades
  three unit-space radial gradients built once per resize instead of rebuilding
  a gradient per frame. Drones are rotor ellipses + a rounded body + a blinking
  eye + the spike. Sky, stars, skyline and launch pad are one offscreen bitmap
  per resize.
- Juice per the standard: ≥ 8 particles on every event (18 bank, 24 shield,
  26 burst, 30 needle pop, 40 win), floating text on bank / compound / shield /
  burst / run end, screen shake + hit-stop on a burst, squash-and-stretch on the
  envelope, animated banked counter (kit `damp`), 420 ms stage entry and 1.5 s
  result-card animation, and a pulsing HOLD ring while a round is armed.
- Hot-loop discipline: mutable state in refs, `fx.update(dt)` then
  `fx.isFrozen()` early-return, HUD numbers written through `textContent` refs,
  React state touched only when a whole-number HUD value actually changes, full
  teardown on unmount (loop, input, ResizeObserver, orientation listener, end
  timer, effects, audio).
- Backgrounding mid-hold resolves the round at the moment of pause rather than
  letting the balloon burst while the tab is away.
- `pnpm install` + `pnpm build` (mode uat) pass: 524 modules, 416.62 kB JS
  (138.74 kB gzip), 33.00 kB CSS, built in 2.43 s.

### Spec corrections (balance)

The spec's §5 fixes four things at once: `value = 10 x t^1.6`, threshold
`U(2.2, 4.6)`, a win line of 320, and two balance gates — a bot releasing at 70%
must win 30–50%, and a greedy bot releasing at 95% must win under 15%. Those are
mutually unsatisfiable as written, and the failure is structural rather than a
matter of picking a better number. Two corrections, both minimal, both measured.

Every counterfactual quoted below is reproducible against the shipped modules
with a flag on the sim — `--bonus 0`, `--shield-keeps-streak`, `--no-drones` —
which override the config handed to `rounds.js` and never `rounds.js` itself. A
flagged run prints a banner and skips the gate. All figures are 20,000 runs per
bot at seed `0xba110032` unless stated.

**1. The win line moved from 320 to 500** (`GAME_CONFIG.scoring.targetScore`).

Two separate things are wrong with 320, and the second is the operative one.

*Under the spec's own scoring* (banked values only, no compounding term), 320 is
close to a perfect-play line. Six rounds banked at the tell (`0.7 x T`,
`T ~ U(2.2, 4.6)`) is `6 x 10 x 0.7^1.6 x E[T^1.6]` = 6 x 40.9 = **245**, and the
ceiling bot — which holds to the latest instant the tell can *prove* is safe —
averages **303** (`--bonus 0`, measured). Measured at target 320 with the bonus
removed: disciplined **1.9%**, ceiling 37.1%.

*Under the shipped rules* (with the compounding term), the problem inverts: 320
is **trivial**, not hard. The disciplined bot wins **88.1%** of runs at 320. That
is why the line had to move, and it is a consequence of correction 2 rather than
an independent judgement call. Both gates hold simultaneously only for a line in
**[481, 514]** — the disciplined bot crosses 50% at ~481 and 30% at ~514, and the
greedy bot is under 15% from ~439 upward. 500 sits near the centre of that
33-point window.

**2. A compounding bonus was added**: `+18 x (streak - 1)` for each consecutive
banked round, capped at 5 steps (`GAME_CONFIG.compound`), and a burst resets the
streak whether or not the Term Shield absorbed it.

Without it, greed is not merely unpunished — it is optimal, and no win line
exists that satisfies both gates. The derivation:

- With six independent rounds where a burst costs only that round's value, the
  expected value of a strategy that releases at fraction `f` of the threshold is
  `(1 - p(f)) x (f x T)^1.6` where `p(f)` is its burst probability.
- Releasing at 0.95 banks `(0.95/0.7)^1.6 = 1.63x` more per surviving round than
  releasing at 0.70.
- For a uniform threshold, a fixed-fraction strategy's burst probability is
  bounded: `P(T < 0.95 x E[T]) = 0.5 - 0.05 x mean/width < 0.5` for any `U(a, b)`.
  So greed can never lose more than half its rounds, and `0.5 x 1.63 = 0.82`
  is the best case — greed is at most 18% worse in the mean while carrying
  roughly 2.4x the standard deviation.
- A high-variance strategy with a comparable mean has a *fatter right tail*, so
  wherever the disciplined bot clears its 30–50% band, the greedy bot clears
  more often, not less.

Measured, `--runs 20000 --bonus 0`, and the outcome is worse than the algebra
suggests — greed does not merely survive the mean comparison, it wins it:

| | disciplined | greedy |
|---|---|---|
| mean | 233 | **241** |
| win% at target 240 | 43.2% | **50.0%** |
| win% at target 300 | 5.2% | **23.9%** |

From target 240 upward the greedy bot wins more often at *every* target. The
disciplined gate pins the win line into roughly **235–252** (48.0% at 235, 29.4%
at 255) and the greedy bot scores **45–52%** across that entire window — three to
four times its 15% ceiling. Going the other way, the greedy bot first drops under
15% at target **330**, where the disciplined bot is at **1.0%**. There is no win
line at which both gates hold.

- The compounding bonus prices the thing greed actually destroys — the unbroken
  run — instead of the round it loses. The disciplined bot banks 93.4% of rounds
  and collects ~221 of bonus; the greedy bot banks 58.6% and collects ~58. That
  opens a 156-point gap in the mean (454 vs 298), which is what makes both gates
  satisfiable. It is also the pitch: consistency compounds, nerve does not.

**3. The Term Shield rescues the money but not the momentum**
(`GAME_CONFIG.shield.keepsStreak = false`). The first implementation had the
shield preserve the compounding streak as well as bank 50% of the at-burst
value. That reads well thematically, but it hands the greedy bot the *full*
compounding bonus on any run with a single burst, and 21.7% of its runs have at
most one.

Measured, `--runs 20000 --shield-keeps-streak`: across the whole band of targets
where the disciplined bot stays inside its 30–50% gate (~495–518) the greedy bot
measures **15.7–19.3%** — it never clears the 15% ceiling, so the variant is
excluded. **But note the margin.** Its floor is 15.7%, at target 520, where the
disciplined bot has already slipped to 28.4% and is out of band; the lowest value
actually inside the band is ~15.8%. That is a **0.7–1.0 pp miss**, not a
comfortable one. Recorded here as a **retune hazard**: this variant is excluded
by a whisker, so anything that moves the compounding bonus or the drone schedule
must re-run `--shield-keeps-streak` rather than assume the decision still holds.

Resetting the streak on every burst is also the more honest claim: cover stops
one bad moment being a total loss; it does not put you back where you would have
been.

**4. Needle-drone lane offset set to 0.195 field units** (`GAME_CONFIG.needles`).
The spec leaves the drone geometry open, so this is a chosen constant rather than
a corrected one — and what it actually does is not what the first draft of this
log claimed.

The lane does **not** sit outside a disciplined balloon's reach. The envelope
reaches the lane at **t = 2.044 s**, which is *inside* a normal disciplined
balloon: that bot's release times run p25 1.93 s / median 2.38 s / p75 2.83 s, so
**69% of its releases already cover the lane** against 94% for the greedy bot.

So the drones' dominant role is a **flat difficulty knob**, and a big one:
`--runs 20000 --no-drones` moves the disciplined bot **38.5% → 61.8%**, the
greedy bot 8.7% → 14.6%, and the ceiling bot 77.1% → 94.2%. Without them the
game is too easy and the greedy gate is nearly breached on its own.

The size tax is real but **secondary**. Single-drone overlap at a random release
instant is 9.9% for a 2.4 s balloon against 18.7% for a 3.2 s one. Per round that
lands as a pop rate of **6.0% (disciplined) vs 6.9% (greedy)**, which looks
almost flat — because greed loses 34.5% of its rounds to the threshold before a
release ever happens. Conditional on actually reaching a release it is **6.0% vs
10.5%**, a 1.7x tax. (The sim's `needleExposure()` line prints 13.7% / 24.1% for
the same two balloons because it averages over the three drone rounds and round 6
flies two.)

Post-correction gate, `node scripts/balance.mjs`, 500 runs per bot, seed
`0xba110032`:

```
  bot            win%     mean    p25    p50    p75   bursts  pops  shield  bonus  streak  hold
  disciplined   43.2%    465    422    488    526    0.0   0.3     0.3    231     5.5  14.2s
  greedy         7.8%    296    201    279    375    2.1   0.4     1.0     55     2.6  18.9s
  blind70       20.4%    374    284    386    494    0.6   0.3     0.6    164     4.5  14.2s
  blind95        6.8%    260    163    238    324    2.5   0.4     1.0     42     2.3  17.9s
  ceiling       77.2%    550    513    561    607    0.0   0.2     0.2    245     5.7  16.5s

  gate: disciplined   43.2% vs 30–50% — OK
  gate: greedy         7.8% vs < 15% — OK
```

At 20,000 runs the same seed gives disciplined **38.5%** / greedy **8.7%** —
quote that column when a number matters, since a 500-run sample carries roughly a
±4 pp window. Robustness across five further seeds (500 runs each): disciplined
34.8 / 36.0 / 39.0 / 39.8 / 41.6%, greedy 7.2 / 7.8 / 8.2 / 9.8 / 11.2%. The sim
also asserts that the tell precedes the burst in every simulated round
(15,000/15,000, average lead 1.02 s) and that the worst-case held time in a run is
24.3 s of the 120 s session.

### Deliberate reading of the spec's bot definitions

The spec's "bot releases at estimate 70% of expected threshold with σ = 0.3 s
noise" is implemented as a bot that releases when it sees the tell — the tell IS
the 70% mark, and it is the only estimate of the threshold the game offers —
with 0.3 s of reaction noise. The greedy bot reads the same tell and holds to
95% of the threshold that tell implies. The literal alternative reading (a fixed
2.38 s / 3.23 s release that never looks at the balloon) is also implemented, as
the ungated `blind70` and `blind95` bots, and reported on every run so the two
readings can be compared. The gate is asserted on the tell-reading bots because
they are the ones that actually play the game the spec describes.

## [2026-07-29] Review fixes

Independent review of the initial build. All four spec corrections were upheld;
the findings were four gameplay minors and a set of quoted measurements that did
not reproduce. Everything below is in this file's sections above as well — this
entry is the diff.

**Measurements corrected.** The counterfactual figures in the first version of
this log were carried over from intermediate tuning runs rather than re-measured
against the final modules, and several were wrong. To stop that recurring, the
three counterfactuals are now reproducible flags on the sim (`--bonus N`,
`--shield-keeps-streak`, `--no-drones`, plus `--sweep-from/-to/-step`); a flagged
run prints a banner and skips the gate so it can never be read as a pass. What
changed:

| claim | was | now (measured, 20k runs) |
|---|---|---|
| no-bonus best pair | disciplined 35.5% / greedy 22.0% | greedy *beats* disciplined on the mean (241 vs 233) and wins more at every target from 240 up; in the disciplined 30–50% window (~235–252) greedy is 45–52% |
| no-bonus, greedy < 15% | "where disciplined was 3.9%" | target 330, where disciplined is **1.0%** |
| ceiling bot, no bonus | ~330 | **303** |
| disciplined at 320, no bonus | 0.0% | **1.9%** |
| why 320 was replaced | "unreachable" | unreachable under spec scoring, but **trivial (88.1%)** under shipped rules — the latter is the operative reason; both gates hold only in **[481, 514]** |
| shield-keeps-streak floor | "never below 22%" | **15.7%** — excluded by 0.7–1.0 pp, now flagged as a retune hazard |
| drone lane | "just outside a disciplined balloon's reach" | envelope reaches the lane at **2.044 s**, *inside* a median 2.38 s disciplined release; 69% of disciplined releases cover it. Drones are mainly a flat difficulty knob (38.5% → 61.8% without them); the size tax is real but secondary (6.0% vs 10.5% pop rate conditional on reaching a release) |

**Gameplay fixes.**

- `WealthBalloonGame.jsx` — clock expiry mid-hold called `endRun` directly, so a
  balloon in flight when the timer hit zero was silently discarded. It now calls
  `settle(s.held)` first, matching `onPause`, which already did.
- `rounds.js` — banked amounts are now `Math.floor`ed, so the credited figure is
  exactly the one the HUD was showing. Previously the HUD floored the live value
  while `applyOutcome` handed out a rounded one, and a player could bank a point
  that was never on screen (six of them adds up to a run won on rounding). The
  component's float text and result card now print `res.banked` verbatim rather
  than re-rounding it, and the shield card carries the at-burst value explicitly
  instead of reconstructing it by doubling the halved figure.
- `rounds.js` — `runStats` now documents that `bestRound` is the round TOTAL
  (banked + compounding bonus), that it is usually the last round of the longest
  streak because the bonus term grows faster than the value term, and that a
  shielded burst can set it.
- `WealthBalloonGame.jsx` — the balloon knot's colour string was being rebuilt
  from `SKIN.calm.deep` on every frame in the hottest draw path; hoisted to the
  module constant `KNOT_FILL`.

The flooring change shifts every score by up to 6 points; the gate was re-run and
still passes (disciplined 43.2%, greedy 7.8% at 500 runs; 38.5% / 8.7% at 20k),
and every table in this file, `data.js`, `README.md` and `index.md` now quotes
post-fix numbers. `pnpm build` re-verified.

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
- Deleted the `Beat` and `BeatBalloon` components, all four numbered step blocks
  with their titles and copy, the rounds/session paragraph and the three chips.
  Dropped the now-unused `VALUE_CEILING` / `VALUE_FLOOR` imports.
- New 300×210 inline-SVG scene plays two complete rounds on one 6.4 s loop:
  round 1 the finger presses and holds, the envelope grows and cross-fades blue →
  orange while a gold value gauge climbs the right edge, the wobble tell shakes
  it, the finger lifts and a full-size gold coin arcs into the vault, which
  flashes; round 2 the finger holds past the wobble, the envelope goes red and
  shakes harder, bursts into an eight-ray star, and the blue Term Shield snaps in
  and sends a *half-size* coin to the vault. The 50% absorb rule is therefore
  shown by the coin's size rather than stated.
- The value gauge is the `10·t^1.6` curve made visible without printing a number,
  which keeps the screen inside the text budget.
- All demo transforms are authored around their parent group's origin, so no
  `transform-box` / `transform-origin` overrides are needed for the SVG scales.
- Remaining text: the "How to Play" heading, three icon-led labels (`HOLD TO
  GROW`, `WOBBLE = BANK`, `COVER SAVES HALF`), and the Play button.
- Container switched from `overflowY: auto` to `overflow: hidden`; measured stack
  is ~415 px so it fits 360×640 without scrolling. All 12 new keyframe classes
  are added to the existing `prefers-reduced-motion` kill switch.

**G3 — `wealth-balloon/asset-from-here.md`.** 13 Nano Banana prompts on a
"paper-craft carnival at golden hour" motif — layered cut-paper collage, torn
fibre edges, one soft contact shadow per layer, nothing glossy or metallic.
Covers the fairground background, all three balloon states (calm / warm /
critical), the paper burst, the Term Shield, the needle drone, the vault, the
coin, the value gauge, a HUD streak icon and both result-screen illustrations.

**Not changed:** gameplay, balance, `rounds.js`, the burst-threshold draw, the
wobble tell timing, HUD layout, `ResultsScreen`, `HomeScreen`, canvas artwork,
`data.js`, `api.js`, `src/kit/`.

**Build:** `pnpm install && pnpm build` — exit 0, `✓ built in 2.15s`
(`dist/assets/index-B8aCTYwv.js 421.44 kB │ gzip: 139.71 kB`).
