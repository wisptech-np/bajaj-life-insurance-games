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
