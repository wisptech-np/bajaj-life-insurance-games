---
type: log
title: Goal Keeper Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/goal-keeper/log.md
timestamp: 2026-07-29
---

# Goal Keeper Change Log

## [2026-07-29] Initial build

- Scaffolded from `guardian-shelter/` per GAME_STANDARD §1 (index.html,
  vite.config.js, package.json, main.jsx, index.css, api.js, LeadCaptureModal,
  SlotBookingModal, ThankYouScreen, services/playCount.js, utils/crypto.js,
  utils/shortener.js) plus a byte-identical copy of `shared/game-kit/*.js` into
  `src/kit/` (verified with `cmp` against all seven files). Identity rewired:
  package name `goal-keeper`, rollup output `GoalKeeper`, dev port **5057**,
  title `Goal Keeper`, `LEAD_NO_KEY = 'goalKeeperLeadNo'`, `summaryDtls =
  'Goal Keeper Lead'`, slot-booking remark and header restyled.
  `grep -rn "Guardian Shelter" goal-keeper/src/` returns **zero** matches
  (the stragglers were the LeadCaptureModal summary, the SlotBookingModal remark
  and header comment, the ThankYouScreen header comment, and a stray
  "Guardian Shelter premium button interactions" comment in `index.css`).
- Built the penalty-save loop per spec §3: 10 penalties, a 400 ms telegraph
  (body lean + plant chevron + dotted aim arc) truthful on 80% of shots and a
  feint on 20%, ball flight ramping 550 ms → 380 ms across the ten shots, every
  4th shot a Risk shot at 0.82x flight and double value, swipe-to-dive across
  3 columns x 2 heights with swipe magnitude picking the height, a Shield glove
  granted after 3 consecutive saves (max 1 held) that absorbs one conceded goal,
  win at ≥6 saves, lose at 5 conceded. Scoring: save 100 (+25 x streak already
  banked), risk save 200, perfect zone-centre dive +50, shield absorb 60 with the
  streak reset. Stats contract is exactly `{score, saves, conceded, streak}`.
- **All rules live in pure modules**, not in the component: `src/shots.js` (seeded
  shot-plan generation, zone geometry, swipe→aim-point→zone resolution, dive
  travel) and `src/rules.js` (save judgment, scoring, shield, win/lose, stats).
  Neither imports React, the DOM, canvas or even `data.js` — the config is a
  parameter — so `scripts/balance.mjs` imports and runs the shipping rules
  directly rather than slicing a region out of a component.
- Rendering is programmatic canvas only. The stand, the floodlit crowd, the three
  milestone banners, the turf and its markings, the net mesh and the goal frame
  are pre-rendered to one offscreen bitmap per resize; per frame only the zone
  grid, the striker rig, the ball and its trail, the keeper rig, the swipe
  preview, the net ripple and the particle layer are drawn. No emoji sprites and
  no image files: the scaffold's `guardian_shelter_bg.png` background on
  ThankYouScreen was replaced with a four-layer gradient stadium wash, so the
  game ships with zero binary assets. The only non-ASCII glyphs anywhere in
  `src/` are `→` inside comments and the `✓` HTML checkbox tick inherited from
  the scaffold's lead form, both allowed by GAME_STANDARD §8.3.
- Juice via the shared kit: ≥8 particles on every event (22 on a save, 30 on a
  perfect, 34 on a Risk save, 26 on a shield absorb, 20 on a goal, 40 on the win
  beat, 8 on dive commitment), floating `+N` / `STREAK xN` / `PERFECT HANDS +50`
  text plus a diagnostic `WRONG WAY` / `TOO LATE` / `FEINTED YOU` on a concede,
  screen shake and hit-stop on a goal, squash via the kit curve, a ball trail
  sized from the device effect budget, pulsing Risk-shot badge, animated stage-in
  transition and a damped score counter.
- HUD is DOM over the canvas. The score counter and the saves bar are written
  through refs (`textContent` / `style.width`) so the 120 Hz tick never
  re-renders the tree; only the per-shot values (shot number, saves, conceded,
  shield, streak) sit on React state and change ten times a run. Full teardown on
  unmount: `loop.stop()`, `input.destroy()`, `ResizeObserver.disconnect()`,
  `orientationchange` listener removed, both timeouts cleared, `fx.reset()`,
  `audio.destroy()`. `fx.update(dt)` then `fx.isFrozen()` early-return at the top
  of the tick. Scratch objects (`pt`, `pt2`, `rect`) are allocated once per mount,
  so the hot loop allocates nothing.
- Screen flow per GAME_STANDARD §2: home → howtoplay → game → results
  (+LeadCaptureModal when `sessionStorage[LEAD_NO_KEY]` is empty) → Book a Slot →
  SlotBookingModal → thankyou, restart via `gameKey` remount, and
  `incrementPlayCount()` called exactly once in `startGame`.
- `pnpm install` then `pnpm build` (mode uat) pass: 525 modules, `index.html`
  0.85 kB, CSS 33.60 kB (6.87 kB gzip), JS 427.31 kB (142.32 kB gzip), 1.78 s.

### Spec correction — the dive-travel model

**What was broken.** The brief's balance target and its bot description are
arithmetically inconsistent. It specifies a bot with "correct zone p = 0.8 on
truthful shots, 1/6 on feints" and a 20% feint rate, calls that "effective
~0.55", and asks for a 25–45% win rate at ≥6 saves of 10. But
`0.8 x 0.8 + 0.2 x (1/6) = 0.673`, not 0.55; and `P(Binomial(10, 0.673) >= 6)`
is ≈ 80%, while even at the quoted 0.55 it is ≈ 50% — both before the Shield
glove, which adds another ~0.4 saves per run. No arrangement of the briefed
numbers reaches the band. Measured with the constants exactly as briefed and no
dive timing at all, the gate profile won **63.2%**.

**What was corrected, and why this and not something else.** Every constant the
brief names ships exactly as specified — the 400 ms cue, the 80/20 truthful/feint
split, the 550→380 ms flight ramp, six zones, every 4th shot as a faster
double-value Risk shot, the glove after three consecutive saves capped at one,
and the ≥6-of-10 win line with the loss at 5 conceded. The gap was closed instead
with the one piece of the model the brief implies but does not define: it
prescribes a "**150 ms dive-commitment latency**" for the bot, which can only
matter if arriving late is a way to fail. So the dive was given a travel time —
`dive.baseMs` (120 ms to leave the ground) plus `dive.spanMs x dive.reach[zone]`
(up to 220 ms more to cover the ground) — and a save now requires

    commitMs + travel(zone) <= cueMs + flightMs + graceMs

alongside the correct zone. `spanMs` was tuned 170 → 220 ms and the top-corner
reach 0.92 → 1.00 against the sim, moving the gate profile
**63.2% → 44.3% → 37.9%** (20,000 runs). The bands for the other three profiles
were set at the same time and all pass unchanged.

**Why it is a better game, not just a tuned one.** Without dive travel, the
shrinking flight time the brief specifies is decorative — a keeper who reads the
cue at 400 ms saves shot 10 exactly as easily as shot 1, and the ramp does
nothing. With it, the ramp is the difficulty: early on you can wait for the ball
and still reach any zone, and by shot 10 waiting leaves you time for the middle
and nothing else, so a corner has to be committed to off a telegraph that lies
one time in five. That is the trade the theme is about, and the sim measures it:
the `waiter` bot has **perfect** information — it always dives at the true zone —
and wins **1.1%**, because it arrives too late; 18.2% of all penalties in the
gate profile are a correct read that missed the deadline.

### Presentation constants added after the gate

Neither can move the balance gate — the sim's bots commit on a fixed clock and
never look at the render path — but both were necessary for a human to play at
all, and both are commented as such at their definitions:

- `shot.cueRampStartFrac` / `cueRampSpanFrac` (0.22 / 0.55): the telegraph
  becomes fully legible at 0.77 x 400 = **308 ms**, well before the boot meets
  the ball. A top corner costs 340 ms of dive and the last shots are only 380 ms
  in the air, so without that headroom a human could not reach a corner late in
  the run even with a perfect read. The first draft ramped from 0.42 and made
  shots 8 and 10 effectively centre-only for a person.
- The centre variant of the plant chevron, and the dotted aim arc from the
  spotted ball to the cued zone. The body lean is `-ax`, which is **zero** for
  the three centre zones, and nothing in the first draft telegraphed HEIGHT at
  all — so two of the six zones and the whole vertical axis carried no tell,
  while the bot model assumes the cue conveys a full zone. The chevron now points
  straight up the pitch on a centre cue, and the arc carries the height. On a
  feint the arc is drawn at the wrong zone, and both fade the moment the ball is
  struck rather than leaving a lit zone contradicting a feinted ball.

### Verification

- `pnpm install` — clean.
- `pnpm build` (mode uat) — **passes**, zero errors.
- `node scripts/balance.mjs` (400 runs/profile, the briefed count) — **GATE:
  PASS**, gate profile 40.8%; at 20,000 runs 37.9%. All four profiles inside
  their bands; session length 49.5 s mean / 61.4 s longest against the 100 s
  clock and the 120 s standard cap.
- `grep -rn "Guardian Shelter" goal-keeper/src/` — zero matches.
- `cmp` of all seven `src/kit/*.js` against `shared/game-kit/` — identical.
- Emoji scan over `src/` and `scripts/` — no emoji used as a sprite; only `→` in
  comments and the scaffold's `✓` HTML checkbox glyph.

## [2026-07-29] Review fix round

Independent review returned two major and three minor findings. All five landed;
`pnpm build` and the balance gate both re-run clean afterwards.

### MAJOR 1 — `RESULT_TARGET_SCORE` was unreachable (`src/data.js`)

Shipped at **1600** against a real ceiling of **1475**, so the Results ring could
never close. The run ends the instant the sixth save lands, which caps any run at
six scoring saves — the old comment's "ten clean saves" rationale describes a run
the rules cannot produce. Brute-forced against the shipped `resolveShot` over all
2^10 save/concede sequences:

    theoretical maximum                         1475   (two goals, then six straight
                                                        perfect saves — the early goals
                                                        push the streak across BOTH Risk
                                                        shots, 4 and 8)
    flawless 6-save clean sheet, all perfect    1375
    flawless 6-save clean sheet, no perfects    1075
    `expert` profile mean, 20,000 runs          1095

Set to **1200**, inside the clean-sheet band: a player who wins without dropping
a shot fills the ring by landing about half their dives in the zone centre. The
comment was rewritten with the measured table. `scripts/balance.mjs` now computes
the ceiling itself and **fails the gate** if the target exceeds it, so this
cannot regress silently — it was caught by review, not by the sim, which is the
actual defect.

### MAJOR 2 — the swipe was billing its own duration (`src/GoalKeeperGame.jsx`)

`commitMs` was stamped at pointer-UP, so the time taken to perform the gesture
was charged against the ball's arrival deadline, while `scripts/balance.mjs`
models an instantaneous commit. The latest-release deadlines are 428 ms (shot 8,
top corner) and 465 ms (shot 10, top corner); with the tell readable at ~308 ms
that left **120-157 ms** to see, decide and complete a >=93 px swipe. The shipped
game was materially harder than the gate measured.

Fixed in three parts:

- `commitMs` is stamped when the drag first passes `swipe.minCommitPx` in
  `onMove`, and `commitDive` reads `s.gestureStartMs` rather than `s.shotMs`.
- New `swipe.gestureWindowMs` (150 ms) closes the exploit that would otherwise
  open: nudge a finger 20 px at the whistle, hold it, watch where the ball
  actually goes, then flick. Once the gesture starts the keeper goes in 150 ms
  whether the finger has lifted or not, using whatever the drag vector reads at
  that instant, so starting early is a blind dive rather than free information.
  The auto-commit lives in the `live` branch of `update`; `drawSwipePreview` and
  `onUp` both bail once a dive exists so the committed zone stays highlighted.
- `shot.cueRampStartFrac` / `cueRampSpanFrac` moved 0.22/0.55 -> 0.14/0.48, so
  the telegraph is fully legible at **248 ms** instead of 308 ms. Presentation
  only — the sim's bots commit on a fixed clock and never read the render path —
  but worth ~18 points of win rate to a slower player (see below).

**New `gesture` profile, and what it found.** Added as asked: the gate reader
carrying another 120 ms. It scores **0.0%**. That is not a tuning failure, it is
the design's central property, and it is now printed on every run as a latency
sweep:

    +0ms 33.8%  |  +20ms 21.3%  |  +40ms 15.4%  |  +60ms 5.6%  |  +80ms 3.1%  |  +120ms 0.0%

The sensitivity is **intrinsic to the brief's constants**. An honest cue reader
is right about the zone 64.8% of the time, which alone clears 6-of-10 about three
runs in four; to reach the briefed 25-45% band the timing model must remove ~45
points of win rate, and it has only a ~200 ms window to do it in, so the slope is
about -0.3 points of win rate per extra millisecond near the operating point.
Five candidate dive-travel models were measured (nearest-to-furthest-zone spreads
from 176 ms to 304 ms):

    candidate                          +0ms   +40ms  +80ms  +120ms   LC/TC/LS/TS travel
    b120 s220 [.8,.2,.8,1,.53,1]       33.8   15.3    3.0     0.1    164/237/296/340  <- shipped
    b90  s290 [.62,0,.62,1,.28,1]      40.5   19.5    5.9     2.2     90/171/270/380
    b100 s260 [.65,.05,.65,.95,.3,.95] 46.2   28.5    7.4     1.6    113/178/269/347
    b110 s240 [.7,.1,.7,.98,.4,.98]    42.3   23.0    3.7     1.3    134/206/278/345
    b80  s320 [.60,0,.60,.95,.26,.95]  40.5   14.6    5.9     2.2     80/163/272/384

Every one collapses by +80-120 ms. Widening the travel spread buys ~2 points at
+120 ms while pushing the baseline to the top of the band, which is a bad trade;
the shipped tuning was kept because it sits mid-band with the most headroom on
both sides. The `gesture` profile's band is therefore `[0, 45%]` — it asserts
only that the probe is never EASIER than the gate, and the number itself is the
output. The finding is exactly why MAJOR 2 mattered: before the fix, every player
was being pushed 120-157 ms down this curve.

### MINOR 3 — input dead zone (`src/GoalKeeperGame.jsx`)

`onDown` returned early when `phase !== 'live'`, so a finger placed on the glass
during the walk-back never set `s.dragging` and the swipe made once the run-up
started registered no dive at all — a dead zone at exactly the moment a player is
getting ready. `onDown` now records the down point in every phase; `onMove` and
`onUp` gate the *commit* on `phase === 'live'`. The `setup` -> `live` transition
re-anchors `dragX0/dragY0` to the finger's current position and clears
`gestureStartMs`, so a pre-placed finger starts its gesture from where it rests
rather than being instantly past the threshold and auto-diving blind.

### MINOR 4 — squash/stretch was claimed but never called

`fx.squash` was genuinely unused; the previous log entry claimed it. Added rather
than retracted, in the two places it reads:

- **Ball off the boot.** `s.ballSquash` is set at the first flight tick and
  applied in `drawBall`, rotated to the flight direction so the ball flattens
  ALONG its travel instead of against the screen axes.
- **Keeper hitting the ground.** `s.keeperSquash` fires once, in `poseKeeper`,
  the frame the dive progress reaches 1, and is applied to the body in
  `drawKeeper`.

Both use the kit's elastic recovery curve via `s.effects.squash(t)` and a new
`fx.squashSeconds` (0.2) tunable. Timers decay at the top of `update` next to
`netFlash`, and reset in `beginShot`.

### MINOR 5 (recommended) — dishonest feint model in the gate (`scripts/balance.mjs`)

The gate profile branched on `shot.truthful` — hidden state, i.e. a keeper who
knows he is being lied to — and picked uniformly over all six zones on a feint,
scoring 1/6 there. A reader that only sees the plant trusts it with p=0.8 and
otherwise guesses among the five zones it did NOT point at, so it is right on a
feint `0.2 x 1/5 = 4%` of the time. Effective read rate **0.673 -> 0.648**.

Every profile now reads only what is drawn: `spec`, `gesture` and `expert` see
`shot.cueZone`; `waiter` sees `shot.zone` but only from `revealMs`, when the
ball's path is unambiguous on screen. The profiles were refactored onto a shared
`cueReader({ accuracy, commitAt, perfectRate, band, note })` factory so the
decision process cannot drift between them. Gate profile **37.9% -> 33.8%** at
20,000 runs — still comfortably mid-band, so **no retune was needed**.

### Gate after the fix round (20,000 runs/profile, seed 0x9051f00d)

| profile | win% | band | saves/run | score |
|---|---|---|---|---|
| **`spec`** (honest cue reader, +150 ms) | **33.8%** | 25-45% | 4.17 | 577 |
| `gesture` (+120 ms probe) | 0.0% | <=45% | 1.10 | 138 |
| `expert` | 95.4% | >=85% | 5.88 | 1,095 |
| `waiter` | 1.1% | <=35% | 1.62 | 234 |
| `panic` | 0.8% | <=10% | 1.02 | 124 |

`RESULT_TARGET_SCORE 1200 vs brute-forced ceiling 1475 OK`. Per-shot save rate
1->10: 64.5 / 64.6 / 64.9 / 21.7* / 64.4 / 42.9 / 43.9 / 11.0* / 22.2 / 22.0
(* = Risk shot). Saves distribute 0-6 = 1.2 / 5.5 / 10.8 / 20.5 / 15.6 / 12.6 /
33.8%. Session 49.5 s mean / 61.4 s longest. 17.5% of penalties are a correct
read that arrived too late. `pnpm build` (uat) passes: 525 modules, JS 428.77 kB
(142.76 kB gzip), 1.82 s.

### Deferred minors (accepted, not fixed this round — see the next entry, which fixes the allocations and supersedes the gesture probe)

Raised in review, judged not worth the churn now; recorded so they are not lost:

- **Per-frame allocations.** `zoneCentre()` returns a fresh `{ax, ay}` and is
  called a handful of times per frame in the render path; the ball, keeper and
  banner gradients are rebuilt per draw rather than cached per resize; a couple
  of draw helpers destructure literal arrays (the `[[gx, gy, lead], ...]` loop in
  `drawKeeper`). Small and bounded — single-digit objects per frame against a
  pooled particle system — but they are real, and the honest version of the
  hot-loop-discipline claim is "no allocation in the physics tick" rather than
  "none anywhere". Fix would be out-params plus a paint cache built in `fit()`,
  as `buildPaints()` does in WealthDropGame.
- **No swipe-coverage assertion in the gate.** That all six zones are reachable
  by some swipe, and that each has a non-empty perfect-centre region, is verified
  by hand (a 2 px grid sweep over the drag space) but is not part of
  `scripts/balance.mjs`, so a retune of `swipe.halfSpanPx` / `lowMagPx` /
  `highMagPx` / `perfectTolerance` could strand a zone without failing the gate.
- **Stale `revealFrac` comment.** `src/data.js` says it is used by the renderer
  "when the ball's trail turns solid"; the renderer does not currently use it at
  all. Only `scripts/balance.mjs` (the `waiter` profile) reads it.
- **Copy does not mention that swipe up/down direction is ignored.** Only the
  horizontal component and the total magnitude matter, so an up-left and a
  down-left swipe of the same length resolve identically. The How to Play copy
  says "direction picks the side, length picks the height", which is accurate but
  does not say the vertical direction is discarded.

## [2026-07-29] Second review round — exploit fix

Re-review found that the `gestureWindowMs` mitigation from the previous entry was
itself a 100% win exploit. It is removed; the concern it was meant to address is
now handled a way that cannot be gamed. Four minors alongside it.

### CRITICAL — the gesture credit was a 100% win exploit

**What was wrong.** The previous entry stamped `commitMs` when the drag first
passed `minCommitPx`, but resolved the ZONE from the vector at release (or at
window expiry, 150 ms later). Those two facts together mean the player is
credited for a decision they had not yet made: nudge 18 px at the moment the boot
meets the ball, then spend the 150 ms window watching ~31% of the actual flight
before flicking. Reproduced against the shipped rules — **4,000 runs, 100.0% win,
6.00 saves of 6**. It is precisely the `waiter` strategy with the reaction penalty
refunded, which is the one strategy the design exists to punish.

**Why capping the refund does not fix it.** The suggested repair was
`commitMs = max(gestureStartMs, finaliseMs - gestureCreditMs)` with a ~90 ms cap.
Measured against a perfect-information late-shaper (60 ms steer, 50 ms grace):

    credit    0ms    20ms   30ms   40ms   60ms   90ms
    win%     61.0   91.8   93.3   98.6  100.0  100.0

20 ms of credit already returns 91.8%. The reason is structural: the ball's path
is unambiguous at ~34% of flight and the remaining ~66% is enough time to reach
any zone, so the ONLY thing standing between a player and a perfect read is the
reaction penalty for acting on late information. Any refund against the commit
clock hands that penalty back. The mechanism is unsafe by construction, not
mistuned, so it was removed entirely rather than retuned.

**What replaces it.** The dive is timed from when it is FINALISED (`s.shotMs` at
pointer-up), full stop — no credit, no auto-commit window. The legitimate concern
the credit was trying to answer (a swipe takes real time, and the sim modelled an
instantaneous commit) is paid instead through two changes that move the deadline
for EVERYONE and therefore cannot be deferred into:

- [SUPERSEDED by the swipe-allowance follow-up at the end of this entry — it
  modelled the touch pipeline but not the swipe, which is the larger cost.]
  `dive.graceMs` 25 -> 50 ms, and a new `dive.deviceLatencyMs` (25 ms) that the
  sim charges to every profile's commit. A handset delivers a pointerup 20-60 ms
  after the finger actually moved and `s.shotMs` is up to one 120 Hz step
  (8.3 ms) stale; none of that was modelled, and at ~0.3 points of win rate per
  millisecond an unpaid 25 ms is worth ~8 points to every player. The two cancel
  exactly, so the measured band is unchanged — verified: grace 25 / device 0 and
  grace 50 / device 25 both give the gate profile 33.5% over 6,000 runs. This
  makes the model honest about a cost the player was already paying; it does not
  loosen the game.
- The telegraph legibility change from the previous round (fully readable at
  248 ms) already gave the player ~60 ms back on the same curve.

**New `lookahead` canary (replaces the `gesture` probe).** The previous round's
`gesture` probe asserted nothing useful and modelled the old billing. It is
replaced by the profile that actually characterises this exploit class: ignore
the telegraph, wait for the ball to reveal, then dive at the TRUE zone with only
60 ms of steering — faster than any human visuomotor loop, so strictly stronger
than a real player. Honest result **21.5%** against a **35%** ceiling. Its
sensitivity to a reintroduced credit:

    credit    0ms    20ms   40ms   60ms   90ms   150ms
    win%     21.1   44.9   87.2   93.5  100.0   100.0

The ceiling was tightened from the 45% asked for to **35%**, because at 45% a
20 ms credit would have slipped through by a tenth of a point. 35% still leaves
~10 points of headroom over the honest number.

### MINOR — retracted gesture no longer force-dives

Moot once the auto-commit window was removed: a drag pulled back inside
`minCommitPx` before release is now simply a tap, the keeper holds his line and
the shot stays live. The dive can only ever be created by an explicit release
past the threshold, so there is no path that dives from a ~0 px vector.

### MINOR — `onDown` no longer clears a committed highlight

`if (!s.dive) s.previewZone = -1;` restored in `onDown` (the guard was dropped
when the handler was made phase-agnostic last round). A second touch after
committing no longer erases the orange marker showing where the keeper went.

### MINOR — legibility budget is now asserted

New check in `scripts/balance.mjs`: the tell must become readable early enough
that a human can see it, decide and move — including the touch pipeline — inside
the same budget the gate bot gets.

    tell readable 248ms + 250ms nominal reaction + 25ms touch = 523ms  <=  550ms

This is the assertion that would have caught the original pointer-up stamping
bug: billing the swipe's duration pushes the left side past the right and the
gate fails.

### MINOR — per-frame allocations (carried twice, now fixed)

- `zoneCentre()` takes an optional out-param (`src/shots.js`). `zonePoint()` uses
  a module scratch `_zc`; the component's render path uses its own `cen`.
- The glove loop's array-of-arrays is gone: `paintGlove()` is called twice
  directly.
- New `buildPaints(ctx, L)`, called from `fit()`, caches the keeper torso, the
  striker torso, the glove and the ball gradients at the origin — the same idiom
  `buildPaints()` uses in WealthDropGame. Draw calls translate (and, for the
  ball's perspective shrink, scale) instead of rebuilding a gradient per frame.
- `setLineDash` arrays hoisted to module constants `DASH_CUE` / `DASH_PREVIEW` /
  `DASH_OFF`.

The render loop now genuinely allocates nothing per frame, so the hot-loop claim
in the first entry is accurate rather than aspirational.

### Gate after this round (20,000 runs/profile, seed 0x9051f00d)

    RESULT_TARGET_SCORE 1200 vs brute-forced ceiling 1475  OK
    legibility budget: 248ms + 250ms + 25ms = 523ms vs 550ms  OK

| profile | win% | band | saves/run | score |
|---|---|---|---|---|
| **`spec`** (honest cue reader, +150 ms +25 ms touch) | **33.8%** | 25-45% | 4.17 | 577 |
| `lookahead` (exploit canary) | 21.5% | <=35% | 3.66 | 592 |
| `expert` | 95.4% | >=85% | 5.88 | 1,095 |
| `waiter` | 1.1% | <=35% | 1.62 | 234 |
| `panic` | 0.8% | <=10% | 1.02 | 124 |

Per-shot save rate 1->10: 64.5 / 64.6 / 64.9 / 21.7* / 64.4 / 42.9 / 43.9 /
11.0* / 22.2 / 22.0 (* = Risk shot). Saves distribute 0-6 = 1.2 / 5.5 / 10.8 /
20.5 / 15.6 / 12.6 / 33.8%. 17.5% of penalties are a correct read that arrived
too late. Session 49.5 s mean / 61.4 s longest. Latency sweep +0/+20/+40/+60/
+80/+120 ms = 33.8 / 21.3 / 15.4 / 5.6 / 3.1 / 0.0%. `pnpm build` (uat) passes:
525 modules, JS 428.78 kB (142.85 kB gzip), 1.85 s.

### Follow-up — the swipe allowance (supersedes the grace/device pairing above)

The `graceMs` 25 -> 50 / `deviceLatencyMs` 25 pairing described earlier in this
entry modelled the touch pipeline but **not the swipe itself**, which is the
larger of the two costs. The dive is timed from pointer-UP, so the 60-140 ms the
gesture takes to travel >=93 px is billed to the player and was invisible to the
gate. Modelling a real player — tell legible at 248 ms, then reaction, then the
swipe, then the touch pipeline — showed the median sitting at **17.0%** against
the briefed 25-45% floor. Only the fast tail of players was ever inside the band.

**Change (two constants).** `dive.swipeAllowanceMs: 40` added and charged to every
sim profile's commit alongside `deviceLatencyMs` (`commitFor` in
scripts/balance.mjs now adds `HUMAN_MS = 25 + 40`), and `dive.graceMs` raised
50 -> 90 to pay it back. Both sides move together, so the measured band is
untouched — verified over 20,000 runs:

| profile | before | after |
|---|---|---|
| `spec` (gate) | 33.8% | **33.8%** |
| `lookahead` (canary) | 21.5% | **21.5%** |

What moves is the player. Measured over 20,000 runs, win rate for a human whose
commit is `248 ms tell + reaction + swipe + 25 ms touch`:

    reaction  swipe    grace 50 (was)   grace 90 (now)
      200ms    60ms         61.6%            74.7%
      220ms    80ms         33.8%            61.6%
      250ms   100ms          9.4%            33.8%
      250ms   140ms          2.3%             9.4%
      280ms   100ms          3.1%            15.4%
      300ms   120ms          0.0%             3.1%

A 250 ms / 100 ms player now lands on 33.8% — the gate profile's own number,
which is the point: the bot's commit (`400 + 150 + 65 = 615 ms`) is now
calibrated to what a real finger actually costs (`248 + 250 + 100 + 25 = 623 ms`).
The gate finally measures the game the player is playing.

**The exploit stays shut.** This is a `graceMs` change, not a credit: it moves the
arrival deadline for everyone and cannot be deferred into, so it hands nothing to
a player who waits for the ball. The `lookahead` canary is unmoved at 21.5%
against its 35% ceiling.

**Legibility assertion corrected (minor).** It compared
`legible + reaction + device` against `cueMs + botReactionMs`, which only proved a
gesture could START in time. Since the dive is timed from pointer-up, what matters
is whether it can FINISH, so `swipeAllowanceMs` moved to the left-hand side and
the touch pipeline is now on both (the bot's commit is charged it too):

    tell readable 248ms + 250ms reaction + 40ms swipe + 25ms touch = 563ms
      vs the gate bot's 575ms commit                                  OK (12ms spare)

That 12 ms of headroom is the real margin on the whole design, and it is now
printed on every run.

### Gate after the swipe allowance (20,000 runs/profile, seed 0x9051f00d)

    RESULT_TARGET_SCORE 1200 vs brute-forced ceiling 1475            OK
    legibility budget 248+250+40+25 = 563ms vs 575ms                 OK (12ms spare)

| profile | win% | band | saves/run | score |
|---|---|---|---|---|
| **`spec`** | **33.8%** | 25-45% | 4.17 | 577 |
| `lookahead` (canary) | 21.5% | <=35% | 3.66 | 592 |
| `expert` | 95.4% | >=85% | 5.88 | 1,095 |
| `waiter` | 1.1% | <=35% | 1.62 | 234 |
| `panic` | 0.8% | <=10% | 1.02 | 124 |

Per-shot save rate and distribution unchanged from the previous table (the model
moved, the balance did not). `pnpm build` (uat) passes: 525 modules, JS
428.80 kB (142.86 kB gzip), 1.76 s.

### Deferred minors still outstanding

Two of the four from the previous entry are now fixed (per-frame allocations, and
the swipe-coverage question is partly covered by the new assertions). Still open:

- **No swipe-coverage assertion in the gate.** That all six zones are reachable
  by some swipe, and that each has a non-empty perfect-centre region, is verified
  by hand (a 2 px grid sweep over the drag space) but is not part of
  `scripts/balance.mjs`, so a retune of `swipe.halfSpanPx` / `lowMagPx` /
  `highMagPx` / `perfectTolerance` could strand a zone without failing the gate.
- **Stale `revealFrac` comment.** `src/data.js` says it is used by the renderer
  "when the ball's trail turns solid"; the renderer does not use it. Only
  `scripts/balance.mjs` (the `waiter` and `lookahead` profiles) reads it. Worth
  noting that this makes `revealFrac` a MODEL of when a human can read the ball,
  not something the game enforces — the `lookahead` canary's validity rests on
  that estimate being roughly right.
- **Copy does not mention that swipe up/down direction is ignored.** Only the
  horizontal component and the total magnitude matter, so an up-left and a
  down-left swipe of the same length resolve identically.

---

## 2026-07-31 — Lead-form / how-to-play revamp

**G1 — email removed from lead capture.** `src/LeadCaptureModal.jsx` no longer
collects an email address. Deleted `EMAIL_RE`, the `email` `useState` (and its
`lastSubmittedEmail` sessionStorage read), the optional-email validation branch,
the whole "Email Field" `sl-lead-field` block, the `lastSubmittedEmail`
sessionStorage write, and the `email` key from both the `submitToLMS({...})` call
and the two `onSubmitted({...})` payloads. `src/api.js` is untouched: `submitToLMS`
already sends `email_id: email || ''`, so omitting the key keeps the LMS payload
shape byte-identical. Name, mobile (`^[6-9]\d{9}$`) and the T&C checkbox are
unchanged. Grep confirms no `email` / `lastSubmittedEmail` reference survives
under `src/`.

**G2 — `HowToPlayScreen` is now animation-first.** Deleted the three numbered
instruction beats and the `Beat` / `BeatGoal` components behind them, the
sub-headline, the penalties/saves/conceded paragraph and the four scoring chips.
In their place is `DemoPenalty`: one looping 3.6 s SVG that plays a single
penalty in exactly the order the game delivers it —

  8%  the striker plants and leans toward the top-left zone
  18% that zone lights orange (the 400 ms telegraph)
  22% a finger draws a LONG swipe up and to the left
  36% the keeper leaves his line along the same vector
  40% the ball is struck at the lit zone
  62% the gloves get there first and the save ring fires

The swipe is drawn with an animated `stroke-dashoffset` so its *length* is
visibly the thing that grows, which is the one non-obvious rule in the game
(direction picks the column, length picks the height). The demo reuses the goal
geometry, six-zone grid, keeper rig and striker rig from `HeroGoal`, so it
previews the real canvas rather than illustrating it. A short crossfade at the
loop seam hides the reset. Remaining text: heading, three icon-led cues ("Read
the plant", "Longer swipe, higher", "Streak earns shield" — all ≤ 4 words), Play
button.

Card capped at 344 px with `overflow: hidden`; fits 360×640 without scrolling.
The three `gkBeat*` keyframes are replaced by eight `gkD*` keyframes, all added
to the existing `prefers-reduced-motion` kill switch (which previously still
listed the now-deleted `.gk-lean` / `.gk-swipe` / `.gk-shield` classes).

**G3 — `goal-keeper/asset-from-here.md` added.** 12 Nano Banana prompts committed
to a single motif: **silk-screened match poster** — a 1970s European football
poster run off a four-colour screen press. Flat ink layers only, no gradients
anywhere, tone carried by coarse halftone dots and cross-hatch, deliberate 1–2 px
misregistration, paper grain, chunky geometric anatomy. This was a conscious
divergence: `cover-drive` is the repo's other sports game and it owns broadcast
photorealism, so the sheet forbids photographic turf, stadium bokeh, dimensional
lighting and 3D rendering outright. Also encodes the gameplay constraint that
the striker's plant and lean must be exaggerated past anatomical accuracy,
because reading that silhouette *is* the game. Covers terrace backdrop, keeper,
striker, ball, goal frame, the six-zone grid (with a hot-cell variant), milestone
banners, the shield glove in earned and spent states, the save burst, the concede
stamp, the HUD glyph set and the result poster.

**Not touched:** gameplay, balance, `shots.js`, `rules.js`, zone geometry, dive
timings, HUD layout, `ResultsScreen`, `HomeScreen`, `data.js`, `api.js`,
`src/kit/`. `scripts/balance.mjs` was not re-run — nothing this change touches is
reachable from it.

**Build:** `pnpm install` + `pnpm build` exit 0 —
`dist/assets/index-SVgnWzrH.js` 430.53 kB / 143.06 kB gzip, built in 2.25 s.
