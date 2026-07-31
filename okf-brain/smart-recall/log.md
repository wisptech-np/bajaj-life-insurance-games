---
type: log
title: Smart Recall Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/smart-recall/log.md
timestamp: 2026-07-29
---

# Smart Recall Change Log

## [2026-07-29] Initial build

### Scaffold

- Cloned the `guardian-shelter/` scaffold per GAME_STANDARD §1 (index.html,
  vite.config.js, package.json, main.jsx, index.css, api.js, LeadCaptureModal,
  SlotBookingModal, ThankYouScreen, services/playCount.js, utils/crypto.js,
  utils/shortener.js), plus an unedited copy of `shared/game-kit/*.js` into
  `src/kit/` — SHA-256 confirms all seven kit files byte-identical to the shared
  originals.
  The scaffold files were taken via `slide-to-safety/`, itself a verbatim
  guardian-shelter descendant, because guardian-shelter's `Screens.jsx` depends
  on five PNG assets this game has no use for. `services/playCount.js`,
  `utils/crypto.js`, `utils/shortener.js` and `main.jsx` are byte-identical to
  guardian-shelter's; the three modals differ only in the game-name strings,
  which had to change anyway. That route makes the "zero Guardian Shelter
  references" rule true by construction.
- Identity rewired: package name `smart-recall`, rollup output `SmartRecall`,
  dev port **5067**, title `Smart Recall — Bajaj Life`,
  `LEAD_NO_KEY = 'smartRecallLeadNo'`, `summaryDtls = 'Smart Recall Lead'`,
  lead-modal summary `Smart Recall - Post Game Lead`, slot-booking remark
  `Smart Recall Slot Booking`. `Guardian Shelter` grep over `src/` → **0**.
  A scan for other games' identity strings finds only the three provenance
  comments the scaffold carries in every game in the repo
  (`// Copied from the life-goals-bubble-shooter gold standard`), the shared
  `index.css` header, and one deliberate documentation pointer to
  `WealthDropGame.jsx` as the hot-loop idiom reference.

### Game

- Rules live in two pure modules — `src/data.js` (`GAME_CONFIG`, `COLORS`, the
  nine `GOALS` with hue/silhouette/pitch) and `src/sequence.js` (the generator,
  the judge, the scoring helpers, `sessionBudget()`). Neither imports React, the
  DOM or the kit, so `scripts/balance.mjs` executes the shipping rules under node
  rather than a re-implementation that can drift.
- `generateSequence()` is **constructive, not rejection-sampled.** Every
  constraint the gate asserts is enforced while the plan is being built: risk
  positions are drawn from `[1, len-2]` by a greedy pass over a shuffled
  candidate list that cannot come up short (a random-order greedy independent set
  on a path of k nodes is always >= ceil(k/3), and every row of the round table
  satisfies `ceil((len-2)/3) >= risk`); risk tiles are withheld from the rest of
  the plan so a red tile occurs exactly once; each non-risk slot filters its
  candidate pool for the repeat cap and, when the remaining slots would otherwise
  make the distinct floor unreachable, for freshness. The candidate list is
  provably non-empty (>= 7 tiles available, at most 1 barred by the repeat rule
  and at most 4 by the freshness rule), and the code throws rather than falling
  back if that ever stops being true.
- `src/SmartRecallGame.jsx` is presentation only: an
  `intro → banner → lead → playback → recall → correction → clear` state machine
  driven entirely by the kit loop's fixed 120 Hz tick (no `setTimeout` in the
  gameplay path — the only timer is the end beat), all mutable state in refs,
  per-tile animation in four `Float32Array`s, HUD via `textContent` refs.
- Rendering is programmatic canvas only. Eighteen tile faces (nine resting, nine
  lit with `shadowBlur` glow baked in) plus the backdrop are pre-rendered to
  offscreen bitmaps once per resize; the hot loop does 18 `drawImage` calls, one
  cached gradient for the risk overlay and one reused two-element array for the
  idle ring's `setLineDash`. **Zero per-frame allocations.**
- Nine distinct programmatic silhouettes (heart+ECG, house, mortarboard, sun on a
  horizon, paper plane, three figures, coin stack, interlocking rings,
  shield+bolt) on nine spaced hues. A codepoint scan over `src/` finds nothing in
  the emoji/pictograph ranges: only U+2192 RIGHTWARDS ARROW inside code comments
  and U+2713 CHECK MARK, the HTML checkbox tick GAME_STANDARD §8.3 permits.
- Juice floor met: >= 9 particles on every event (9 playback, 12 red step, 14
  correct tap, 18 slip, 26 round clear, 40 win, 24 lose), floating text on every
  score change, screen shake + hit-stop on a slip, kit elastic squash on every
  press, a lit-tile scale lift, animated round banners, framer-motion screen
  transitions and a damped score counter.
- Idle timeout: 5 s, shown as a dashed rounded-rect countdown ring around the
  whole board that fades in after 24% of the window and flashes red under 34%.
- Audio is kit `createAudio` only. Per-tile pitches use the kit's `combo(depth)`
  voice with `depth = 0..8` (440 Hz x 1.122^depth — a whole-tone ladder), mapped
  in grid reading order so a plan's melody contour matches the shape it draws.
  `hit()` doubles as slip sting and red-step warning; `powerUp()` is the round
  fanfare; `victory()`/`failure()` end the run. Haptics are the kit's guarded
  `haptic()`.
- Input is `pointerdown`, not tap-on-release: a recall board has to answer the
  instant the thumb lands, and waiting for `pointerup` adds a whole reaction time
  of lag to a game that is measuring reaction to memory.
- Stats contract exactly `{score, rounds, bestLen, slips}`. Screen flow
  home → howtoplay → game → results (+LeadCaptureModal when
  `sessionStorage[LEAD_NO_KEY]` is empty) → [Book a Slot → SlotBookingModal] →
  thankyou; restart via `gameKey` remount; `incrementPlayCount()` exactly once in
  `startGame`. Full teardown on unmount (loop, input, ResizeObserver,
  orientationchange, end timer, effects, audio).

### Balance gate

- `scripts/balance.mjs` imports `src/data.js` and `src/sequence.js` and exits
  non-zero on any failure. **Every gate is asserted on six seed blocks**, not
  one — the wealth-carrom / premium-pinball lesson.
- Gates: (1) generator invariants; (2) worst-case session budget; (3) honest bot
  25-45%; (4) sharp bot >= 90%; (5) idle bot 0 wins and dead inside 40 s;
  (6) spam bot 0 wins; (7) no run of any bot exceeds the 110 s clock.
- Result: **GATE: PASS.**

  | block | seed | honest `p=0.015xlen` | sharp `p=0.002xlen` | idle | spam |
  |---|---|---|---|---|---|
  | 1 | 0x5ec0de11 | 38.6% | 99.4% | 0/60 @20.9s | 0/200 @13.1s |
  | 2 | 0xc0ffee01 | 34.8% | 99.8% | 0/60 @20.9s | 0/200 @13.1s |
  | 3 | 0x3039 | 34.8% | 99.2% | 0/60 @20.9s | 0/200 @13.6s |
  | 4 | 0xf3fa3 | 27.6% | 99.4% | 0/60 @20.9s | 0/200 @13.6s |
  | 5 | 0xbde31 | 35.8% | 98.6% | 0/60 @20.9s | 0/200 @13.4s |
  | 6 | 0x1a2b3c4d | 34.6% | 99.0% | 0/60 @20.9s | 0/200 @14.1s |

- The 500-run blocks span 27.6-38.6%, which is sampling noise (SE ~2.1 pp), not
  seed sensitivity: re-run at **20,000 runs per block** the six blocks read
  33.1 / 32.0 / 33.0 / 32.8 / 32.8 / 33.0% — a spread of 1.1 pp and a true rate
  of ~32.8%, the centre of the 25-45% band, 7.8 pp from the floor and 12.2 pp
  from the ceiling. Sharp bot at the same depth: 98.9-99.0% on every block.
- Longest winning session across all 120,000 simulated runs: **58.1 s** of 110 s.
- Generator: 252,000 plans (6 x 6,000 runs x 7 rounds), zero violations. Max
  identical-in-a-row 2 against a cap of 2; minimum distinct tiles per round
  2/3/4/5/5/5/5 against floors of the same; minimum union over rounds 1-4 was 5
  (floor 5). Tile usage 10.96-11.23% of 252,000 steps against an even 11.11%.
- Seeded PRNG is `mulberry32` from `src/sequence.js`; the bot's tap-time gaussian
  is Box-Muller over the same stream, so every number above reproduces from its
  seed.

## Corrections to the spec, and why

The brief's §3 was implemented literally except for one constant, which the sim
proved unwinnable-adjacent. Per the batch rule that the reachable-win requirement
governs over literal constants:

### 1. Risk steps per round: 1/1/1/1 → 1/2/2/2 (rounds 4-7)

**The brief says** "from round 4, one step is a 'risk flash' (red glow) that must
be SKIPPED during recall", and separately requires the `p = 0.015 x len` bot to
win 25-45%.

**Those two cannot both be literal.** With one red step in each of rounds 4-7 the
run asks for 38 judged taps (3,4,5,5,6,7,8). Against the brief's own bot that is
a **26.2%** win rate — 1.2 pp inside a band whose per-block sampling error at 500
runs is 2.1 pp. Roughly a third of seed blocks would have failed the gate, which
is exactly the fragile single-seed result the batch-4 review rejects.

**Measured** — a sweep over candidate risk tables, running the SHIPPED generator
and judge, 40,000 runs on each of 4 seeds per row:

| risk steps in rounds 4,5,6,7 | taps | per-seed win rate | mean |
|---|---|---|---|
| 1,1,1,1 (literal brief) | 38 | 26.2 / 26.5 / 25.7 / 26.3% | **26.2%** — 1.2 pp of margin |
| 1,1,2,2 | 36 | 30.5 / 30.6 / 30.9 / 30.5% | 30.7% |
| **1,2,2,2 (shipped)** | **35** | **33.0 / 32.7 / 32.9 / 32.2%** | **32.7%** — 7.7 pp of margin |
| 1,2,2,3 | 34 | 35.3 / 35.4 / 35.7 / 35.3% | 35.4% |

Shipped `1,2,2,2`. It is the smallest change that clears the band with real
margin, and it is thematically the right direction rather than a fudge: a longer
plan containing more risky detours is the difficulty ramp the mechanic already
implies. Every other brief constant is literal — 7 rounds, lengths 3..9, 3 slips,
110 s, playback 460→300 ms, red never first or last, >= 5 distinct tiles by
round 4.

### 2. A slip resumes the round; it does not restart it

The brief says "wrong tile or 5s idle = a slip (3 slips = plan forgotten = lose)"
without saying what happens to the round in progress. Classic Simon restarts.
Shipped: the correct tile is shown for 0.7 s and recall **resumes at the next
step**.

Two reasons, both load-bearing.

1. **The brief also requires a provable `<= 110 s` worst case.** Restarting makes
   the number of playbacks per run unbounded — a round can be replayed until the
   clock dies — so there is no arithmetic upper bound to assert, only an
   estimate. Resuming fixes the count of playbacks at exactly seven, which is
   what turns `sessionBudget()` into a proof.
2. **Restarting measures far under the band**, and no legal combination of the
   other constants recovers it. Same sweep, same shipped generator and judge,
   40,000 runs x 4 seeds:

   | risk table | RESUME (shipped) | RESTART (rejected) |
   |---|---|---|
   | 1,1,1,1 (literal brief) | 26.2% | **16.1%** (16.2 / 16.1 / 16.2 / 16.0%) |
   | 1,2,2,2 (shipped) | 32.7% | **21.4%** (21.5 / 21.4 / 21.3 / 21.3%) |

   Restarting is 10-11 pp below resuming on every configuration tried, and the
   best restart variant is still 3.6 pp under the 25% floor.

The rule "3 slips = lose" is untouched, and resuming is also the better mobile
design: the correction beat teaches the step you missed instead of punishing you
by making you sit through the whole plan again.

### 3. A red tile appears exactly once in its plan

Not specified. Without it, the same tile could be a legitimate step at position 2
and a red detour at position 5, making the inhibition positional rather than
categorical — unreadable at 300 ms per step, and it would turn one memory task
into two. With it, a red flash means "this goal is a risky detour today, never
tap it", which is the go/no-go inhibition the brief is describing.

### 4. Red steps are never adjacent

Not specified (the brief only forbids first and last). Two skips in a row read as
one long gap rather than two decisions, so the constraint is enforced by the
generator and asserted by the gate.

## Fixed during self-review, before first report

Four defects were caught reading the component back against the budget and the
layout, and are fixed in the initial build rather than left for a review round:

1. **The lead-in beat was billed but never spent.** `banner` transitioned
   straight into `beginPlayback()`, so `timing.leadInSeconds` existed in
   `sessionBudget()` and nowhere else — the budget would have been an upper
   bound for a game that did not exist. Now a real `lead` phase sits between
   `banner` and `playback`.
2. **The correction flash faded before the player could use it.** The
   correct-tile glow was set once and then decayed on the shared `litSeconds`
   ramp (~0.2 s) inside a 0.7 s correction beat, so the teaching moment was
   invisible for two thirds of it. Now driven per tick with a pulse instead of
   decayed.
3. **The phase banner overlapped the top tile row on a short stage.** The board
   reserved 76 px for the HUD pills but nothing for the banner that sits at
   `top: 84`. At the 360x420 floor the top row landed at y=76, straight through
   it. Reserve is now 132 px.
4. **The round-progress bar was driven off the score counter.** It only redrew
   on a frame where the damped score changed an integer, so a round cleared at a
   settled score left the bar stale. It is now driven by `roundsCleared`, which
   is what it displays.

A fifth, cosmetic: the red risk wash was near-opaque and hid the goal
silhouette underneath it. The player has to remember *which* goal was the
detour, so the wash was dropped to 0.72-0.86 alpha with the ring and slash left
at full white.

## Verification

- `pnpm install` → clean (524 modules resolved; the usual esbuild build-script
  notice).
- `pnpm build` (vite build --mode uat) → **524 modules transformed, built in
  3.10 s**; index.html 0.85 kB, CSS 33.00 kB (gzip 6.77 kB), JS 424.53 kB
  (gzip 141.25 kB). Zero errors, zero warnings.
- `node scripts/balance.mjs` → **GATE: PASS** on all six seed blocks — generator
  clean over 252,000 plans, worst-case session 57.6 s <= 110 s, honest bot
  27.6-38.6%, sharp bot >= 98.6%, idle and spam bots lose every run.
- `Guardian Shelter` grep over `smart-recall/src/` → **0**.
- `shared/game-kit/*.js` vs `src/kit/*.js` → **byte-identical, 7/7** (SHA-256).
- Emoji codepoint scan over `src/` → only U+2192 in comments and U+2713, the
  permitted HTML checkbox tick. No canvas emoji sprites.
- No files were written outside `smart-recall/` and `okf-brain/smart-recall/`.

## [2026-07-29] Review round 1 — pace cliff (MAJOR) + playback legibility (minor)

Independent review returned PASS with findings. Both spec corrections reproduced
on the reviewer's independently-written bot (literal 1,1,1,1 = 26.21% against my
26.2%; the resume-vs-restart deltas matched), and exploits, leakage and identity
were clean. Two findings fixed.

### MAJOR — a silent pace cliff sat on top of plausible careful-human pace

**The finding.** Every gate bot averaged 0.62 s/tap, so the 110 s clock never
bound for any of them and the gate had *zero* coverage of slow-accurate play.
The reviewer's never-wrong fixed-pace bot found a step function exactly at my
documented `minAffordableTapSeconds`: **2.2 s/tap won 100%, 2.5 s/tap won 0%**,
all clock losses. A flawless but deliberate player — entirely plausible for a
non-gamer recalling 8-9 steps on an insurance microsite — lost deterministically,
never tripped the 5 s idle ring (4.9 s/tap still loses), and got no signal but
the generic 20 s low-time pulse, long after the deficit was unrecoverable.

**Root cause.** 33.11 s of un-skippable fixed beats were ticking the session
clock, compressing what was left for the player's own thinking.

**Fix 1 — the clock no longer ticks through chrome the player cannot influence.**
`SmartRecallGame.jsx:44` adds a `CLOCK_PHASES` table and `:1104`
`shouldTickClock` reads it. The clock now runs through `playback`, `recall` and
`correction` — the game presenting the plan, the player answering, and the
consequence of the player's own slip — and is HELD through `intro`, `banner`,
`lead` and `clear`. `data.js:150-190` documents the split and is the single
source the gate bills from.

**Fix 2 — the held chrome was also shortened**, because every held second is
wall-clock budget that buys no thinking time (`data.js:176-186`):
intro 1.1 → 0.6 s, banner 0.9 → 0.75 s, lead-in 0.45 → 0.2 s, round-clear
0.75 → 0.35 s, correction 0.7 → 0.6 s.

**Re-derived budget.** `sequence.js:sessionBudget()` was rewritten to return the
two quantities separately, because they are different clocks and the review
turned on the difference:

```
CLOCK ticks: playback 15.21s + 3 slip beats 1.80s          = fixed  17.01 s
CLOCK held : intro 0.60s + 7x(banner 0.75 + lead 0.20
                             + clear 0.35)                 = held    9.70 s
35 taps at the 0.70 s budget pace                          =        24.50 s
budget-pace run: clock 41.51s of 110s, wall 51.21 s
WORST-CASE WALL (clock fully burned) 110 + 9.70            =       119.70 s  <= 120 s cap
PACE CLIFF (110 - 17.01) / 35                              =         2.657 s/tap
```

Cliff moved **2.197 → 2.657 s/tap (+21%)**. Measured by a fixed-pace sweep of
the never-wrong bot: 2.70 s/tap still wins 100%, 2.80 s/tap loses 100%.

**Why not the reviewer's >= 3.5 s/tap target: it is geometrically impossible.**
Wall time is capped at 120 s by GAME_STANDARD §3 and playback alone costs 15.21 s
of it, so the highest cliff ANY configuration of this game could have is

```
(wallCapSeconds - playback) / taps = (120 - 15.21) / 35 = 2.994 s/tap
```

even with every other beat set to zero. 35 taps at 3.5 s is 122.5 s of wall
before a single frame of chrome. 2.657 is **89% of that ceiling**. The gate now
computes and prints `ceilingTapSeconds` so this cannot be re-litigated by
guesswork. The reviewer's requirement was an OR, and the remainder is therefore
handled by signalling.

**Fix 3 — a pace cue distinct from the idle ring.** `sequence.js:paceOutlook()`
and `paceLevel()`; driven in `SmartRecallGame.jsx:797-818`, rendered at
`:1240-1262`. It projects the player's **own measured cadence** over the taps
and playbacks still to come and warns on the headroom that leaves: amber under
12 s of projected spare, red under 4 s, after 3 taps of evidence.

A first attempt thresholded the *affordable rate* instead and measured at
**2.3 s of warning** before a clock loss — a player 0.06 s/tap over budget hugs
the line until the denominator is small enough to be noise. Projection gives the
same player a warning from their third tap: measured lead is now
**77.4-103.6 s**. The gate asserts it (gate 11): every clock loss must have been
signalled for >= 15 s first, and zero clock losses may be silent. The HUD and the
gate call the same `paceLevel()`, so the cue and the proof cannot drift apart.

**Fix 4 — the careful bot archetype** (`data.js:236-247`, gate 7). Accurate
(`p = 0.002 x len`) but unhurried at 2.2 s +/- 0.45 s, min 0.9 s. Asserted on
every block to win >= 85% **and to never lose to the clock** — its only failure
mode must be slips. A `deliberate` probe at 2.6 s/tap is reported (not gated) to
show where the edge actually is.

| block | careful (2.2 s/tap) | clock losses | deliberate (2.6 s/tap) | pace-warning lead |
|---|---|---|---|---|
| 1 | 99.2% | 0 | 87.8% | 103.6 s |
| 2 | 99.2% | 0 | 87.8% | 98.9 s |
| 3 | 99.4% | 0 | 88.3% | 100.9 s |
| 4 | 99.4% | 0 | 88.8% | 103.1 s |
| 5 | 98.4% | 0 | 86.8% | 98.4 s |
| 6 | 99.2% | 0 | 88.8% | 77.4 s |

**Honest-bot band re-checked on all six blocks and is unchanged** — 38.6 / 34.8 /
34.8 / 27.6 / 35.8 / 34.6%, byte-identical to the pre-fix run, exactly as
expected: moving the clock changes nothing for a bot averaging 0.62 s/tap.

**Sim-accounting correction found while fixing this.** The bot billed a whole tap
of wall time even when the clock expired mid-tap, which made the 2.6 s/tap probe
look like it broke the 120 s cap by ~2-3 s. The game's `onExpire` fires within
one 1/120 s frame of zero, so the run stops *inside* that tap. `balance.mjs`
`tick()` now bills `min(secs, max(0, clock))` of wall. This is a fix to the
model, not to the game.

### MINOR — same-tile repeat gap was thin at the fast end

At a flat 62% duty the DARK gap shrinks with the period: 460 ms gave 175 ms but
300 ms gave only **114.0 ms**, marginal over the ~100 ms at which two flashes of
one tile fuse into a single perceived event — and worst exactly at round 7 where
sequences are longest and a merged repeat is most expensive.

Fixed by flooring the gap rather than the duty (`data.js:127-140`,
`sequence.js:litSeconds()`): lit time is now
`min(period x litFraction, period - minDarkGapMs)` with `minDarkGapMs = 140`.
This shortens the **glow**, not the period, so playback duration and every number
in the budget arithmetic above are untouched. Gate 2 asserts the floor and that
`lit + dark == period` on every round.

| round | step | lit before | lit after | dark before | dark after |
|---|---|---|---|---|---|
| 1-4 | 460-380 ms | — | unchanged | 174.8-144.4 ms | unchanged |
| 5 | 353.3 ms | 219.1 ms | 213.3 ms | 134.2 ms | 140.0 ms |
| 6 | 326.7 ms | 202.5 ms | 186.7 ms | 124.2 ms | 140.0 ms |
| 7 | 300.0 ms | 186.0 ms | 160.0 ms | **114.0 ms** | **140.0 ms** |

### Deferred (not mine)

The lead-capture modal's cyan (`#31CDEC`) is inherited scaffold CSS in the shared
`index.css`, identical in every game in the repo. Off-palette against the Bajaj
blue/orange, but changing it here would make this game inconsistent with the
other 32. Flagged for a repo-wide pass by the orchestrator.

### Re-verification

- `node scripts/balance.mjs` → **GATE: PASS**, exit 0. Generator clean over
  252,000 plans; min dark gap 140 ms; pace cliff 2.66 s/tap; worst-case wall
  119.7 s <= 120 s; honest 27.6-38.6%; sharp >= 98.6%; careful >= 98.4% with zero
  clock losses; idle and spam lose every run. Longest wall observed across all
  bots: 112.3 s.
- `pnpm build` → 524 modules, `✓ built in 4.25s`, JS 427.46 kB (gzip 142.04 kB).

## Deferred / minor

- ~~The `intro`, `banner`, `lead` and `clear` beats all run the session clock.~~
  **RESOLVED in review round 1** — this deferred item turned out to be the MAJOR
  finding. Those beats no longer tick the clock; see the round-1 section above.
- Round 7's 0.75 s round-clear beat is billed in the budget but never spent
  (finishing round 7 ends the run immediately). Left as-is: it keeps the budget a
  strict upper bound.
- Two of the nine hues are neighbours on the wheel (Retirement amber #E3B23C /
  Savings lime #B7DD3F, and Emergency brand-orange #F26922). With nine categories
  on one board some hue adjacency is unavoidable; the silhouettes are the primary
  identifier and the labels the third channel. Worth a look on a real handset.
- The board is fixed at 3x3 for all seven rounds. A larger board in the late
  rounds would raise difficulty without lengthening the session, but it would
  invalidate the measured band and was not in the brief.

---

## 2026-07-31 — Lead-form slim-down, animation-first how-to-play, asset prompt sheet

Narrow scope: no gameplay, balance, physics, HUD or `ResultsScreen` changes.
`src/sequence.js`, `src/data.js` and `scripts/balance.mjs` untouched.

### G1 — email field removed from lead capture

`src/LeadCaptureModal.jsx`: deleted `EMAIL_RE`, the `email` `useState`, the
"Email Field" `sl-lead-field` block, the `errs.email` branch, the
`sessionStorage.lastSubmittedEmail` read and write, and the `email` key from
`submitToLMS({...})` and both `onSubmitted({...})` payloads. `src/api.js`
untouched — `email_id: email || ''` keeps the LMS payload shape identical.
Nothing else under `src/` referenced it. Name, Mobile and T&C unchanged.

### G2 — `HowToPlayScreen` is now animation-first

`src/Screens.jsx`: deleted the three `Beat` step cards (and the `Beat` component),
the `Watch the order · Tap it back · Skip the red` subtitle, the scoring
paragraph and the per-round `ROUNDS` chip row.

New `RecallDemo` — one 6 s loop on the real 3×3 board of all nine `GOALS`,
using the canvas's own `GoalGlyph` silhouettes and per-goal hues. First half is
the plan playing itself back — Home, Family, a red detour, Retirement, each cap
lighting in turn at the game's cadence. Second half is a `TapFinger` glyph
tapping Home, Family, Retirement in that same order, arcing *around* the red
tile without touching it, then the whole board rings green. Ordering is carried
by time plus a dashed route drawn between the three tiles, **not** by numeric step
badges — the old `MiniTile` badge numerals were removed so the demo contains no
text at all. `prefers-reduced-motion` disables all ten new animations.

Under it, exactly three icon-led cues: an eye + "WATCH THE ORDER", a tap glyph +
"TAP IT BACK", and the real red risk tile + "SKIP THE RED". Remaining text:
heading, three ≤4-word labels, Play button. Card is ~452 px tall inside a 640 px
viewport — no scroll at 360×640.

### G3 — `asset-from-here.md`

12 Nano Banana prompts written to `smart-recall/asset-from-here.md`. Motif is a
**mid-century electro-mechanical annunciator console**: bakelite pushbuttons with
frosted acrylic legend lenses on an aged ivory phenolic faceplate, back-lit by
*incandescent* lamps with an off-centre filament hot-spot and warm uneven bloom —
explicitly never LED, neon, pixel or flat-vector. The sheet holds the resting cap,
the lit cap in all nine goal hues, both legend-glyph sets (all nine goal
silhouettes), the red fault cap, the lamp bloom, the slip buzz, the round lamp
strip, the engraved HUD icon set and win/loss tableaus. Red `#EF4444` is reserved
for the risk step in the prompts exactly as it is in `data.js`.

### Verification

- `pnpm install` + `pnpm build` — **green**: `dist/assets/index-C-lH60uo.js`
  428.43 kB (142.42 kB gzip), `index-v4scUYR6.css` 33.00 kB, built in 4.64 s.
- `node scripts/balance.mjs` — **GATE: PASS** (generator clean over 252 000 plans,
  honest bot 27.6%–38.6%, sharp ≥ 98.6%, careful ≥ 98.4% with zero clock losses).
  Harness unmodified.
