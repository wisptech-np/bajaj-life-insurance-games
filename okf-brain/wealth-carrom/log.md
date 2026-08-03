---
type: log
title: Wealth Carrom Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/wealth-carrom/log.md
timestamp: 2026-07-29
---

# Wealth Carrom Change Log

## [2026-07-29] Review fix round 2 (3 minors, pre-commit)

- **`legalStrikerX` padding could swallow a real slot.** The `play * 0.004`
  breathing room inflates every forbidden interval by ~pad a side, so a true free
  slot narrower than about 2x pad was reported as "nowhere" and the least-bad
  fallback returned an overlapping x (reviewer: 916 of 60,000 solves, worst 41
  px). `board.js` now retries the exact interval solve with **pad = 0** before
  falling through — a merely tight slot is still a legal placement. Measured
  after: the retry engages on **6.19% of solves** (929 of 15,000) and finds a
  free slot every time; **0** overlapping returns while a free x existed, against
  a dense independent 4,000-point scan of the baseline. The
  "twelve pieces cannot block the baseline" comment was wrong and now says what
  is true: three or four coins resting near the baseline can.
- **`substepSafety` under-derived.** 1.25 covered a single striker-into-coin
  amplification (1.167x) but not a break, where the struck coin is hit again
  within the same tick — worst measured single-tick amplification 1.517x, i.e.
  31.6% of a disc radius against the 30% travel budget. Raised to **1.6** and the
  derivation comment corrected. Empirically benign before (no tunnelling was ever
  observed) but the anti-tunnelling invariant should hold on paper.
- **`pointercancel` was not matched to the aiming pointer.** A stray second
  finger's UA-generated cancel could abort the primary finger's fully-aimed shot.
  The component now tracks the active pointer id with the same rule the kit uses
  (first pointer down wins, mouse only on the left button) and ignores cancels
  from any other. Kit files still byte-identical.
- Re-verified: full multi-seed gate **PASS** (pooled 33.7 / 33.2 / 33.3%, 34,552
  strikes, 0 escaped); stress `--seeds 10 --runs 1200` **PASS** (36,000 runs,
  0 escaped); invariant sweep 14.3 M ticks clean; 60-assertion rules suite
  ALL PASS; `pnpm build` pass.

## [2026-07-29] Review fix round 1

Independent review returned 2 CRITICAL, 2 MAJOR, 3 MINOR. All seven fixed; the
headline finding was that the original gate's PASS was **seed luck** — it passed
on `0xca77a0` and failed on every other seed tried and at `--runs 1200`.

### CRITICAL

1. **Stationary pieces moved by collision separation were never re-bounded.**
   `physics.js` — the integrate pass owns the cushion clamp and the pocket test
   but opens with `if (p.vx === 0 && p.vy === 0) continue`, while the
   disc-vs-disc pass runs *after* it and moves pieces positionally, including
   pieces at rest. The unrecoverable case is an overlapping pair with relative
   normal velocity ≥ 0: the impulse branch takes its `rvn >= 0 -> continue` exit
   so no velocity is ever imparted, but the separation above it has already
   moved them. The reviewer reproduced a coin resting 21.3 px *inside* the rail
   with v = (0,0), and a coin parked 18.5 px from a pocket centre still
   `active: true` — visually in the black, worth nothing.
   *Fix:* the bounds work (pocket capture, then cushion clamp) is now a named
   `resolveBounds()` called from the integrate pass **and** again over every
   piece the separation pass marked `nudged`. The clamp always corrects
   position; the reflection still only fires when the piece is moving into the
   rail, so a nudged-but-stationary piece is repositioned without gaining energy.
   Verified by two deterministic repros plus a tick-level invariant sweep over
   **14.3 M ticks** at five canvas sizes: no active piece ever outside the felt,
   none ever left inside a pocket mouth.

2. **Single hard-coded seed hid it.** `scripts/balance.mjs`.
   *Fix:* the gate is now a **sweep over seeds** — 5 seeds × 300 runs × 3 sizes,
   derived from `--seed` by an odd multiplier so the set stays reproducible and
   `--seed` still shifts all of it. Win band, settle limit and escape count are
   asserted **per seed**, never pooled, and the per-seed table is printed.

### MAJOR

3. **Striker respawned/placed inside resting discs.** `board.js`,
   `WealthCarromGame.jsx`, `scripts/balance.mjs`. Nothing tested placement
   against the board, so the striker could be born overlapping a coin up to
   fully concentric — and at zero contact offset the normal is undefined
   (nx = ny = 0), no impulse is applied, and the striker passes straight through
   while the separation term flings pieces off the board. This was the trigger
   for the escapes.
   *Fix:* new pure `legalStrikerX(board, pieces, wantX)`, solved **exactly**
   rather than sampled — each resting piece forbids a chord of the baseline, the
   intervals are merged, and the free point nearest the wanted x is returned.
   (A sampled grid was tried first and still left a 1.2 %-of-radius overlap in
   1 spawn out of 24,000; "nearly never" is not a useful property for a solver
   whose job is "never".) Wired into initial spawn, post-strike respawn, resize
   re-seat, live place-mode dragging, and the sim's own placement. Measured with
   placement disabled, the invariant sweep reports 3,559 overlapping spawns
   (worst 99 % of rsum, 2 near-concentric); with it, 1 shallow overlap in 48,000
   and 0 near-concentric.

4. **Clock expiry discarded a strike in flight.** `WealthCarromGame.jsx`
   `onExpire` called `expireRun` + `endRun` immediately, but coins pocketed
   during the strike live only in `s.provisional` until `finishStrike()` folds
   them into the run — so a coin visibly dropping at 0:00 that reached the target
   was reported as a **LOSS**.
   *Fix:* on expiry, if the board is moving, `settleStrike()` lets it finish
   rolling (bounded by the watchdog — microseconds of real time), then
   `finishStrike()` banks it exactly once, and only then is the result decided.
   `finishStrike()` may itself end the run on the target / foul limit / last
   strike, in which case it has already called `endRun` and expiry defers to it.

### MINOR

5. **Substep count sized from the wrong speed.** `physics.js` / `data.js` — the
   count is fixed at the top of a tick, but a striker-into-coin hit amplifies
   speed by `M(1+e)/(M+m)` = 1.167× (peak ~1835 px/s against a 1520 px/s launch),
   leaving ~7 % margin on the 30 %-of-radius travel budget.
   *Fix:* new `physics.substepSafety = 1.25` multiplier on the sizing term.

6. **Per-size verdict ignored escapes.** `scripts/balance.mjs` printed
   "win OK, settle OK" for a size that had escape failures.
   *Fix:* escapes are a first-class clause in both the per-seed verdict and the
   per-size roll-up, and every failure is listed by seed.

7. **`pointercancel` fired the striker.** The kit routes `pointercancel` through
   `onUp`, so a system gesture mid-pull (notification shade, edge swipe, incoming
   call) launched a half-aimed shot.
   *Fix:* the component registers its own `pointercancel` listener **before**
   `createInput` (same-element listeners fire in registration order) which sets
   `aim.cancelled`; `onUp` then aborts and resets the pull instead of firing.
   Kit files remain byte-identical — nothing in `src/kit/` was touched.

### Verification after the fix round

- `pnpm build`: pass, 526 modules, zero errors.
- `node scripts/balance.mjs`: **GATE PASS**, all 15 seed × size cells.
  Per-seed win rates 30.3–40.3 % (407×612), 31.3–36.7 % (407×556),
  27.3–35.0 % (338×452); pooled 35.3 / 33.7 / 32.8 %. 34,490 strikes, max settle
  3.02 s, 0 watchdog, **0 escaped**.
- Stress `--seeds 10 --runs 1200`: 36,000 runs / 276,128 strikes, pooled win
  33.9 / 34.2 / 34.4 %, max settle 3.07 s, **0 escaped**. PASS.
- Tick-level invariant sweep (14.3 M ticks, 5 canvas sizes): both CRITICAL-1
  repros fixed, 0 pieces outside the felt, 0 live pieces in a pocket mouth,
  0 near-concentric spawns.
- Rules/geometry assertion suite (60 checks): ALL PASS, unchanged.

### Deferred minors (accepted, not fixed)

- **Per-piece radial gradient allocation in the disc draw functions.** Each
  piece builds its gradient per frame rather than using a pre-rendered sprite
  atlas. This is the house style in this repo (wealth-drop does the same for its
  coin) and there are at most 13 pieces on screen; revisit only if a low-tier
  device profile shows it.
- **`topReserveFrac = 0.23` wants a real-device check.** On a 338×452 canvas
  roughly 14 px of the top pocket rims sit under the translucent progress pill.
  The pill is glass at 5 % white so the rims read through it, and the pocket
  centres and mouths are fully clear, but this is a "look at it on a handset"
  item rather than something the sim can settle.
- **`capturePocket` uses the piece centre, ignoring its radius**, so the striker
  (radius 1.24× a coin) is captured on exactly the same centre-distance test as
  a coin. Physically the bigger disc should need to be slightly further in. The
  measured effect is small (striker pots 0.05–0.12 per run) and making it
  radius-aware would shift the balance table, so it is left as authored and noted
  here.
- **Fully-blocked-baseline fallback.** When every point of the baseline is within
  reach of some resting piece — 1 spawn in 48,000 in the invariant sweep —
  `legalStrikerX` returns the least-bad position, which can overlap shallowly
  (worst measured 37 % of rsum, never near-concentric). The separation solver
  resolves it over a few ticks with no energy injected and no escapes.

## [2026-07-29] Initial build

Built to `docs/superpowers/specs/2026-07-28-ten-new-games-design.md` §4.

- Scaffolded from `guardian-shelter/` per GAME_STANDARD §1 (index.html,
  vite.config.js, package.json, main.jsx, index.css, App.jsx, api.js,
  LeadCaptureModal, SlotBookingModal, ThankYouScreen, Screens.jsx,
  services/playCount.js, utils/crypto.js, utils/shortener.js) plus an unedited
  copy of `shared/game-kit/*.js` into `src/kit/` (verified byte-identical).
  Identity rewired: package name `wealth-carrom`, rollup output `WealthCarrom`,
  dev port **5058**, title `Wealth Carrom`,
  `LEAD_NO_KEY = 'wealthCarromLeadNo'`, `summaryDtls: 'Wealth Carrom Lead'`,
  SlotBookingModal remark `Wealth Carrom Slot Booking`. `grep -r "Guardian
  Shelter" src/` returns zero matches.
- Screen flow home → howtoplay → game → results (+LeadCaptureModal when
  `sessionStorage[LEAD_NO_KEY]` is empty) → Book a Slot → SlotBookingModal →
  thankyou, restart via `gameKey` remount, `incrementPlayCount()` exactly once in
  `startGame`.
- Gameplay: 12 pieces (9 gold coins, 1 Queen of Protection, 2 risk discs) in a
  rosette — queen on the centre spot, inner ring of six with the risk discs at
  its top and bottom, outer ring of five. Eight strikes, 120 s. Place the striker
  by dragging the baseline; press the striker and pull back to aim; release to
  flick. Win at 6 coin-equivalent (covered queen = 2); lose on 3 fouls, strikes
  exhausted, or the clock.
- Everything a node sim needs is in pure modules with no React/DOM/canvas
  imports: `src/board.js` (geometry, rosette, respawn), `src/physics.js`
  (half-life friction, cushions, disc-vs-disc impulses, pocket capture,
  substepping), `src/rules.js` (strike/foul/queen-cover state machine).
  `scripts/balance.mjs` imports those modules directly — it never re-implements
  a rule — with the ghost-ball planner factored into `scripts/bot.mjs` so the
  gate and any tuning pass measure the board with the same opponent.
- Juice floor met: bursts of 10–40 particles on strike / clack / pocket / queen /
  foul / win, floating text (`+100`, `-150`, `QUEEN!`, `QUEEN COVERED +500`,
  `STRIKER IN!`), screen shake and hit-stop on fouls, squash-and-stretch driven
  by the physics `squash` timer through the kit's elastic curve, animated screen
  transitions, damped score counter written via `textContent` refs (no per-frame
  React state), offscreen pre-rendered board bitmap, full teardown on unmount.
  All art is programmatic canvas paths and gradients or inline SVG — no emoji
  anywhere.

### Verification

- `pnpm install` then `pnpm build` (vite build --mode uat): pass, 526 modules,
  no errors or warnings.
- `node scripts/balance.mjs` (300 seeded runs per canvas size, seed `0xca77a0`,
  bot at the brief's 4° aim / 10% power noise): **GATE PASS**.
  Win rate 36.7% / 34.0% / 32.7% at 407×612 / 407×556 / 338×452 — inside the
  25–45% band at every size. Max settle 2.92 / 2.97 / 2.92 s over ~6,900
  strikes, zero watchdog firings, zero pieces escaping the felt.
- Zero-noise ceiling (`--aim-sigma 0 --power-sigma 0`): 100% at all three sizes,
  6 coins in 7 strikes and 32 s. The win is reachable by skill; a loss is aim.
- Scratch assertion pass (60 checks) over the queen-cover machine, the foul
  machine, the stats contract, rosette legality at five canvas sizes, queen
  respawn with the centre spot occupied, and 65 max-power breaks from every
  baseline position (worst settle 3.07 s, no escapes, no tunnelling).

### Spec corrections

**None to the gameplay constants.** Every number the brief fixes is shipped as
written: friction half-life 0.45 s, disc-disc restitution 0.92, 9 gold coins at
+100, queen +500 with the cover rule, 2 risk discs at −150 and a foul, striker
pocketed = foul, 3 fouls out, 8 strikes, 120 s, win at 6 gold-equivalent with a
covered queen counting 2, stats `{score, coins, queenCovered, fouls}`, and the
sim's 300 seeded runs at σ = 4° / 10% power.

The target sweep confirms the brief's win line of 6 is the only value that lands
in the band, so it needed no adjustment:

| Target (coin-equiv) | 3 | 4 | 5 | **6** | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- |
| Win % (407×612) | 94.3 | 82.3 | 67.0 | **36.7** | 2.3 | 0.7 |

Two things the brief left open had to be decided, and both are recorded here
because they are the numbers the balance hangs on:

1. **Pocket mouth = 2.10 disc radii** (`board.pocketRadiusDiscs`). The brief does
   not size the pockets, and this turned out to be the single knob the win rate
   depends on. Aim error amplifies through a cut shot: a 4° error over a 150 px
   approach lands the striker ~10 px off the ghost point, which throws the coin
   about 18° off its line, so the mouth has to absorb it. Measured at 407×612 —
   1.75 → 11.5%, 1.92 → 25.5%, 2.10 → 31.5%, 2.30 → 37.0%. 2.10 sits mid-band at
   all three canvas sizes. This is roughly 3.5× more generous than a real carrom
   board relative to the coin; that is a deliberate mobile concession and the
   reason the brief's 6-coin target is reachable at all.
   Disc radius 0.052 and striker radius 0.0645 of the felt (a 1.24× striker,
   which is the real carrom ratio) were fixed in the same sweep.

2. **Board top reserve = 0.23 of canvas height** (was 0.155 on first pass). At
   0.155 the two-row HUD covered both TOP POCKETS on a 360×640 handset — you
   could not see the hole you were shooting at. The reserve is now sized so the
   board square always starts below the HUD on the shortest supported canvas; on
   a tall canvas the square is width-limited anyway, so it costs nothing there.

### Bugs found and fixed during the build

- **Baseline ends inside the corner pockets.** The first geometry sweep produced
  configs with 2.3 striker pots per run and a 78% foul-out rate, which read like
  a balance result and was really a layout bug: widen the pocket far enough and
  the end of the baseline slides inside the corner hole, so the striker is
  pocketed the instant it is placed. `buildBoard` now solves for the x at which
  the striker just clears the near pockets and clamps `baseLo`/`baseHi` to it, so
  the pocket size and the baseline are independent knobs again.
- **Resize teleported a striker in flight.** The resize handler re-seated the
  striker on the baseline unconditionally, so a mobile URL bar sliding away
  mid-shot would snap it back. Now guarded to the `aim` phase.
- **Dead band at the minimum pull.** `powerFromPull` returns exactly `minPower`
  at the minimum pull, which normalises to 0 — and 0 is the "cancelled" signal,
  so there was a sliver of pull where the meter was visibly lit and the release
  did nothing. A live pull is now floored at 2%.

### Known issues / deferred

- The balance bot only hunts gold coins, so it pockets the queen on ~5% of runs
  and the cover branches are exercised ~45 times per 900-run gate rather than
  constantly. The state machine itself is covered directly by the scratch
  assertion pass (same-strike cover, next-strike cover, cover missed, risk disc
  does not cover, covered-queen-carries-the-win). A queen-hunting bot profile
  would be a reasonable future addition to the gate.
- No trajectory preview beyond the aim ray — a first-bounce prediction line was
  considered and left out to keep the hot loop free of per-frame path work.
- `scripts/games-manifest.json`, `README.md`, `scripts/sync-game-kit.mjs`,
  `scripts/build-status.json` and `build_tracker.py` registration are the
  controller's single post-batch task and were deliberately not touched here.

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
- Deleted the `Beat` and `BeatDefs` components, all three numbered step blocks
  with their titles and copy, the strikes/session paragraph and the
  `PIECE_LEGEND` chip row. Dropped the now-unused `PIECE_LEGEND` import and the
  `CrownIcon` helper, which only existed for the deleted copy.
- New 300×260 inline-SVG scene renders the whole board — mitred frame, lacquered
  playfield, brass centre circle, four collared corner pockets, the baseline
  strip, six goal coins, the Queen on the centre spot and both risk discs
  including the one parked between the baseline and the Queen.
- One 7 s loop plays two real strikes: the finger drags the striker along the
  baseline, presses on it and pulls back (dashed aim ray appears opposite the
  pull, power ring grows), releases; the striker flies, the Queen slides into the
  top-left pocket and the pocket flashes crimson — then a **dashed red pending
  ring** sits on that pocket, because she has not been covered yet. The second
  strike pots a gold coin into the top-right pocket, the pending ring clears and
  a green tick blooms over the centre. The cover rule is therefore demonstrated
  rather than described.
- Remaining text: the "How to Play" heading, three icon-led labels (`PULL TO
  AIM`, `POCKET COINS`, `COVER THE QUEEN`), and the Play button.
- Container switched from `overflowY: auto` to `overflow: hidden`; measured stack
  is ~510 px so it fits 360×640 without scrolling. All 11 new keyframe classes
  are added to the existing `prefers-reduced-motion` kill switch.

**G3 — `wealth-carrom/asset-from-here.md`.** 12 Nano Banana prompts on a
"lacquered heirloom board on a marble table" motif — photoreal product-render
CGI under a single overhead softbox, real materials (piano lacquer, brushed
brass, enamel, pearl acrylic), every disc dead-on from above with a short tight
contact shadow and an explicit "no perspective tilt" negative. Covers the board,
all four disc types, the pocket, the aim ray, the power ring, two HUD pips and
both result-screen illustrations.

**Not changed:** gameplay, balance, `physics.js`, `rules.js`, `board.js`, HUD
layout, `ResultsScreen`, `HomeScreen`, canvas artwork, `data.js`, `api.js`,
`src/kit/`.

**Build:** `pnpm install && pnpm build` — exit 0, `✓ built in 4.95s`
(`dist/assets/index-BNWUgJr8.js 433.06 kB │ gzip: 143.18 kB`).

## [2026-08-03] Review round: AI opponent, match rules, board/UI redesign

Review feedback: *"The carrom design is not visually strong. There is no bot
opponent. A proper sliding or flicking control is unavailable."* Two of those
three were already built and shipping; the third was real and was the bulk of
this round.

### What was actually missing

**The bot.** The game was a solo score-attack against a clock. There was a
ghost-ball planner in `scripts/bot.mjs`, but it existed only to drive the balance
sim — nothing in the shipped bundle imported it and the player never faced an
opponent. That is the finding the review is really about, and fixing it meant
rebuilding the match, not adding an actor.

**The controls were already there** (place on the baseline, pull back from the
striker, release; aim ray, power ring, power meter, `pointercancel` abort) and
the **physics were already fixed-step with substepping**. Both were re-verified
rather than rewritten. The one genuine control defect found: the aim ray was
drawn at a length derived from power alone and ran straight off the board at
shallow angles, pointing at somewhere the striker cannot reach.

### 1. Physics — verified, one invariant added

Unchanged model: friction as a half-life (`v = v0·e^(-kt)`, k = ln2/0.45s), so
speed falls off linearly with distance and the power meter stays honest;
equal-restitution disc impulses at 0.92 with a 1.55x striker mass; cushions at
0.62; fixed 1/120 s step with substeps capped at 0.3 of a disc radius and a 1.6x
safety factor on the substep count.

What is new is that the gate now *proves* the anti-tunnelling claim instead of
asserting it. A tick-level **swept closest-approach** test runs on every pair:
two discs that cross and separate inside one tick are simply "apart" when it
ends, so an end-state overlap check cannot see them. Measured: **880
maximum-power strikes, 452,813 ticks, 4 canvas sizes — 0 pass-throughs, 0 cushion
escapes, 0 ticks ending deeply overlapped**, worst per-tick travel 0.75 of a disc
radius.

Energy is asserted separately, with friction disabled so it cannot mask an
impulse that adds energy: total kinetic energy must be monotonically
non-increasing across every tick. **0 violations.**

### 2. Controls — the aim ray now stops at the rail

`drawAim` solves the ray against the four cushions (offset by the striker's own
radius, which is where it actually stops) and ends at the nearest hit. The rig is
otherwise as it was, and is now also used to render the OPPONENT's shot in
crimson rather than the player's orange — which is why its turn is animated at
all rather than resolved instantly.

Board geometry was re-laid so a full-power flick is physically performable: the
striker rests ~48 px above the bottom rail and `maxPullFrac` pulls ~150 px
straight back off the board, so `verticalBiasFrac` is 0.45 — chrome takes the
band above, the gesture gets the room below.

### 3. The bot — `src/bot.js`, a SHIPPED pure module

`scripts/bot.mjs` was deleted; there is now one implementation, imported by both
the game and the gate. It generates, simulates, ranks and picks:

1. **Generate** — ghost-ball enumeration over sampled placements × target pieces
   × pockets, rejecting blocked corridors, thin cuts and off-felt ghosts. Break
   shots always appended so it is never without a move.
2. **Simulate** — the best candidates by geometric cost are each run to rest on a
   *clone* using the shipped `stepWorld()`, at `bot.simStep` = 1/60 (stepWorld
   sizes substeps from dt, so a coarser step traces the same path for half the
   tick cost). Outcomes read with the shipped `tallyPocketed()`.
3. **Rank** — scored with the `data.js` scoring numbers, plus a keep-the-turn
   bonus and a positional term.
4. **Pick by skill.**

Difficulty is four levers in `GAME_CONFIG.bot.levels`, and only one is aim:
`rollouts` (how many shots it even looks at), `pickFrom` (it picks at random from
its own top N, so a weak bot chooses the wrong shot rather than merely aiming
badly), aim/power sigma, and `foulBlindness` (probability it prices the shot with
the foul penalty at zero — which is what actually makes a novice pot their own
striker).

| Level | rollouts | pickFrom | aim σ | power σ | foulBlind |
| --- | --- | --- | --- | --- | --- |
| Cautious (easy) | 5 | 3 | 7.5° | 22% | 0.50 |
| Balanced (normal) | 12 | 2 | 4.0° | 12% | 0.18 |
| Aggressive (hard) | 26 | 1 | 1.8° | 6% | 0.04 |

Selectable on the how-to-play screen, which reads the labels from `data.js`.

### 4. Match rules — `src/rules.js` rewritten

Was a single-player run machine; is now a two-sided match. You and The Market
strike at ONE shared rosette.

- **Turns** are classic carrom continuation, not alternate-every-shot: pot a gold
  coin or the Queen and commit no foul, and you keep the strike. 62% of strikes
  keep the turn in the measured sample, which is what makes a break worth setting
  up and lets a strong bot run several coins.
- **Fouls** — striker or risk disc pocketed: −150 and the turn passes. Three
  fouls forfeits the match.
- **Queen cover is per side.** She is worth 500 and two coins toward the target,
  but only if covered by a gold coin on the same strike or that side's very next
  one; otherwise she returns to the centre spot unpaid.
- **Completion** — first to six coin-equivalent; or a forfeit on fouls; or the
  board runs out of coins / 12 strikes a side / the 120 s clock, decided on a
  **tiebreak ladder**: coin-equivalent, score, fewer fouls, best single strike,
  fewer strikes used.

**The target moved 6 → 5 → 6.** Five was tried first because with nine coins a
4-4 split is impossible, so five is *guaranteed* decisive before the board
empties. Measured, it was too quick: 29.1 s of match against a 120 s session and
only 5.5 strikes at the top rung, and it collapsed the difficulty spread
(skilled beat normal 57.5% and hard 49.4% — eight points apart). Six measures
**37.3 s, 8.9 strikes, and 71.9% / 55.0%**. Six is not guaranteed to be reached
(5-4 empties the board), so that case is handled by the tiebreak ladder rather
than avoided — 40 of 960 matches ended `cleared`, **0 draws**.

### 5. Art and UI

- **Board environment.** The stage was flat void above and below a square board —
  the review's "not visually strong" in one glance. There is now a lit table: an
  ellipse wider and taller than the board, a lamp pool over the felt, a contact
  shadow under it and a vignette closing the corners. Measured effect: the
  play-test's paint coverage went from **44.6–58.9% to 100.0%** of sampled pixels
  at every size.
- **Pockets rebuilt.** At `pocketInsetFrac` 0.16 the pocket centre sat almost on
  the felt corner, so the clip threw away ~80% of the mouth and what remained
  read as a dark smudge you could not aim at. Now 0.55, and each hole is four
  passes: brass collar sunk into the felt, shaft darkening to true black,
  occlusion on the near wall, specular arc on the far lip. This moves the capture
  point, so the balance table was re-measured after the change.
- **Scoreboard rebuilt** as two side-by-side panels — You and The Market — each
  with score, six coin pips, three foul pips and a progress bar, the active side
  outlined in its own colour. A race is unreadable if you cannot see the other
  runner.
- **Turn chip** ("Your strike" / "The Market is reading the board…") and a
  **piece legend** (Coin +100 / Queen +500 / Risk −150) anchored to the board's
  measured top edge rather than a fixed offset, and the legend is dropped
  entirely when the band above the board is too short for it.
- **HUD reserve is now a minimum pixel height** plus a small fraction, not a pure
  fraction: the scoreboard is a fixed stack, so a pure fraction gave a 390×844
  handset 189 px for 100 px of content and took the difference out of the board.
- Results screen shows the head-to-head scoreline and both sides' pips; share
  copy reports the match result. Lead form untouched — **Name + Mobile only**.

### Verification

**Headless gate** — `node scripts/balance.mjs`, driving the shipped modules:

```
A. 880 max-power strikes / 452,813 ticks / 4 canvas sizes
   0 pass-throughs · 0 cushion escapes · 0 resting overlaps · max tick travel 0.75r
B. frictionless kinetic energy non-increasing on every tick: 0 violations
C. difficulty   skilled wins   random-flick wins   avg strikes
   easy              89.4%             21.3%            8.2
   normal            71.9%             11.3%            8.9
   hard              55.0%              5.0%            7.7
   960 matches / 9,185 strikes · settle mean 2.31 s, max 3.05 s · 0 watchdog · 0 escaped
   6.80 coins, 0.44 risk, 0.46 striker pots, 0.78 queen pots (0.57 covered) per match
   62% of strikes kept the turn · clock mean 37.3 s of 120 s
   endings: target 861, fouls 50, cleared 40, strikes 8, timeout 1 · 0 draws
GATE: PASS
```

Strictly ordered, none absolute: the reference beats every rung but never always,
and random flicks beat every rung sometimes but never often.

**Build** — `npx vite build`: pass, 527 modules, zero errors.
`dist/assets/index-DWRa3hqC.js 449.26 kB │ gzip 148.51 kB`,
`index-v4scUYR6.css 33.00 kB │ gzip 6.77 kB`.
Before this round: `433.06 kB │ gzip 143.18 kB` JS, same CSS. **+5.33 kB gzip**
for the bot, the match machine and the environment art.

**Play-test** — `node scripts/play-test.mjs wealth-carrom --all-sizes`, real
touch drags in headless Chrome:

| Viewport | Canvas | Painted | Random-input run | Retry |
| --- | --- | --- | --- | --- |
| 320×568 | 298×546 | 100.0% | 22 s | ok |
| 390×844 | 368×822 | 100.0% | 80 s | ok |
| 412×915 | 390×893 | 100.0% | 46 s | ok |
| 412×700 | 390×678 | 100.0% | 49 s | ok |

Zero console or page errors at every size; canvas mounts, paints, and comes back
after retry. Screenshots inspected at all four sizes: scoreboard, legend, turn
chip, board, aim ray, power meter and mute button all fit at 320×568 with no
clipping, and the aim ray now terminates at the rail.

### Known issues / deferred

- **`capturePocket` uses the piece centre, ignoring its radius**, so the striker
  (1.24× a coin) is captured on the same centre-distance test as a coin. Carried
  over from the previous round; making it radius-aware would shift the balance
  table again and the measured effect is small (0.46 striker pots per match).
- **The bot never plays for position deliberately.** Its positional term only
  rewards leaving coins nearer a pocket; it does not model what it leaves the
  OPPONENT. A snooker-style safety shot would be the next real step up in skill.
- **The rollout search is synchronous on the main thread** (~26 clones × ~3 s of
  sim at the top rung). It is hidden behind the "reading the board" indicator and
  measured clean at every size, but a very low-end device would feel it. A web
  worker is the fix if a device profile ever shows it.
- The how-to-play demo animation still shows a single player's two strikes; it
  teaches the gesture and the cover rule correctly but does not depict the
  opponent. The "You vs The Market" difficulty picker sits directly beneath it.
