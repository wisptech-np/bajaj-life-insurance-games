---
type: log
title: Income Pipeline Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/income-pipeline/log.md
timestamp: 2026-07-29
---

# Income Pipeline Change Log

## [2026-07-29] Initial build

Built to `docs/superpowers/specs/2026-07-28-ten-new-games-design.md` §6 and
`okf-brain/GAME_STANDARD.md` v2.

### Scaffold and identity

- Scaffolded from `guardian-shelter/` per GAME_STANDARD §1 (index.html,
  vite.config.js, package.json, main.jsx, index.css, App.jsx, api.js,
  LeadCaptureModal, SlotBookingModal, ThankYouScreen, services/playCount.js,
  utils/crypto.js, utils/shortener.js) plus an unedited copy of
  `shared/game-kit/*.js` into `src/kit/` (verified byte-identical against the
  canonical copies for all seven files).
- The chrome files were taken via `wealth-drop/`, which is the same
  guardian-shelter scaffold with the two PNG imports (`guardian_shelter_bg.png`,
  the family sprites) already removed — this game ships no image files at all.
  `api.js`, `services/playCount.js`, `utils/crypto.js` and `utils/shortener.js`
  are byte-identical to guardian-shelter apart from the CRM identity strings.
- Identity rewired: package name `income-pipeline`, rollup output
  `IncomePipeline`, dev port **5060**, title `Income Pipeline — Bajaj Life`,
  theme-color `#0B1221`, `LEAD_NO_KEY = 'incomePipelineLeadNo'`, default
  `summaryDtls = 'Income Pipeline Lead'`, lead-modal summary
  `'Income Pipeline - Post Game Lead'`, slot remark
  `'Income Pipeline Slot Booking | Score: N'`, update-lead fallback
  `'Slot Booking via Income Pipeline'`.
- `grep -r "Guardian Shelter" income-pipeline/src/` returns **zero matches**; a
  broader case-insensitive grep for `guardian` / `wealth drop` over `src/`,
  `index.html`, `package.json`, `vite.config.js` and `scripts/` is also clean.

### Game

- Three boards — 4x4 / 1 tank / 18s, 5x5 / 2 tanks / 22s, 6x6 / 3 tanks / 26s —
  inside a 120s session. Tile types straight / elbow / tee / cross; tap rotates
  90 degrees clockwise. Salary tap on the left edge, Education / Home /
  Retirement tanks on the right. Flow triggers at zero on the payday clock or
  the instant every tank connects, animates one BFS ring per 0.1s, fills reached
  tanks (+150) and sprays every open pipe end on the live path (-25). Early
  finish banks remaining whole seconds at 5 each. Taps are locked during flow.
  Win: all six tanks. Lose: any level ends with zero tanks filled, or the session
  clock. Stats contract exactly `{score, tanksFilled, leaks, moves}`.
- **Cross tiles are drawn locked and refuse the tap.** A cross shows all four
  ports at every rotation, so charging a move for turning one would charge the
  player for nothing. Tapping one plays a tick and floats `FIXED JUNCTION`
  instead of incrementing `moves`. This is a reading of the spec's tile list, not
  a departure from it: the cross is present, it is a genuine routing obstacle
  (route into one and its spare arms leak), and it is never an ambush because it
  only leaks if the player opens a pipe into it.
- All game logic lives in pure modules — `src/flow.js` (masks, rotation, flow
  resolution, leak counting, scoring, the optimal solver, both bots) and
  `src/levels.js` (generation) — with no React, DOM, canvas or colour imports.
  `scripts/balance.mjs` imports those exact modules, so the balance table cannot
  drift from the code that ships.
- Level generation is solved-then-scrambled: carve a tree from the inlet to every
  tank mouth, derive each tree tile's shape from its degree, fill the rest with
  weighted decoys (34/34/22/10 straight/elbow/tee/cross), then spin the tree tiles
  until the distance back to that layout lands in the level's scramble band.
  Solvability is guaranteed by construction.
- Rendering is programmatic canvas only — no emoji sprites, no image files. Pipes
  are stroked paths (dark casing, metal bore, gold bore when money is inside)
  drawn under a rotated context so a tap swings the arms rather than teleporting
  them; tanks are vessels with a rising fill level; the salary tap is a valve body
  with a wheel. The backdrop, board plate, tile wells, tap and tank shells are
  pre-rendered to one offscreen canvas per resize.
- Juice via the shared kit: >= 8 particles on every event (8 on a tap, 9 per cell
  as the flow arrives, 14 per leak, 22 per tank filled, 40 on a win), floating
  `+150` / `-25` / `EARLY +N` text, screen shake on every leak and on a loss,
  squash on the rotating tile, animated board slide-in per level, banner
  transitions, and a damped score counter.
- HUD is DOM over the canvas. The routed-score counter, the payday seconds and
  the payday bar are written through `textContent` / `style` refs so a 120 Hz tick
  never re-renders the tree; the payday bar's gradient string is only re-assigned
  when the urgency band changes, so no string is allocated per frame. Level
  number, session seconds (1 Hz from the loop's `onTick`), the flow-lock badge and
  the banner are the only values on React state.
- Hot-loop discipline: mutable state in refs, `fx.update(dt)` then
  `fx.isFrozen()` early-return, full teardown on unmount (loop, input,
  ResizeObserver, orientation listener, both timeouts, effects reset, audio
  destroy, bitmap released), end-run bursts clamped on-screen, a module-level
  reusable dash array so `setLineDash` never allocates, and a reusable flow
  scratch object so resolving the board allocates nothing.
- Screen flow, restart via `gameKey` remount and `incrementPlayCount()` exactly
  once in `startGame` are inherited unchanged from the scaffold.

### Solvability gate — an exact solver rather than a brute BFS

The spec asks the sim to "verify via BFS over rotation states that par <= 14".
A literal BFS is not available: a 6x6 board has 4^36 rotation states.

The problem collapses, though. Taps are per-tile and independent, and the win
condition only asks for connectivity, so every tile outside the eventual network
can be left at zero cost. What remains is a minimum-cost tree spanning the salary
inlet and every tank mouth where a tile's cost depends on the rotation it lands
in — node-weighted Steiner tree with port-dependent node costs.
`flow.js minRotationsToSolve()` solves it exactly with the Dreyfus-Wagner DP
(`dp[terminalSubset][tile][rotation]`, 16 x 36 x 4 states, subsets merged at a
shared tile, growth by Dijkstra because a tap costs 1..3 depending on how far the
tile swings). About a millisecond per board.

This is a strengthening, not a weakening, of the brief. The brief's "the scramble
is not already-solved (>= 4 rotations from solution)" is checked against the
distance to the **nearest** solution — decoy shortcuts included — rather than to
the generated one, so a board cannot pass by happening to be solvable a different
way. The sim also re-derives par and the scramble distance from scratch for every
generated level and asserts that replaying the stored solution actually wins.

### Balance

`node scripts/balance.mjs` — 300 seeded runs, `mulberry32(seed + n * 0x9E3779B1)`
per run, one stream for level generation and bot decisions so run *n* is
bit-identical at any `--runs` value and reproducible with `--only n`.

| | L1 (4x4) | L2 (5x5) | L3 (6x6) | all |
|---|---|---|---|---|
| par | 4–7 (mean 5.7) | 4–9 (mean 6.9) | 4–11 (mean 8.6) | 4–11 (mean 7.1) |
| scramble distance | 4–7 | 5–9 | 7–11 | 4–11 (mean 7.9) |
| tap budget (0.9s/tap) | 20 | 24 | 28 | |
| greedy bot | 99.7% | 95.7% | 80.0% | **78.7%** (gate 70–95%) |
| random-rotate bot | 0.7% | 0.0% | 0.0% | **0.0%** (gate < 5%) |

Par band violations 0 · par > 14: 0 · scramble < 4: 0 · born already solved 0 ·
stored solution broken 0 · par/scramble recompute mismatch 0/0. Greedy runs use
20.6–59.0s of the 120s cap (mean 33.6s) and 17–57 taps (mean 28.5); worst-case
theoretical run (all three clocks expiring plus three full flow animations) is
71.4s. Stable across seed streams: 75.0 / 76.3 / 76.0% at seeds 1 / 999 / 424242,
77.1% over 1500 runs. `generateLevelSet()` costs 0.71ms mean / 7.30ms worst over
500 seeds, so a fresh board set on mount is not a visible hitch.

### Spec corrections

Two, both minimal, both documented at their definition in `src/data.js`.

1. **Level 2 and 3 scramble bands tightened** to `[5,9]` and `[7,11]` from the
   first-pass `[6,10]` and `[8,13]`. The spec fixes the grids, the tank counts,
   the timers and the `par <= 14` ceiling but not the scramble band, which is a
   generation knob. At the wider bands the greedy bot measured **69.3%** on 300
   seeds — 0.7 points under the spec's 70–95% floor. The tightened bands hold par
   comfortably inside 14 (measured max 11) while landing the bot mid-band. The
   reachable-win requirement governs over the literal constant, per the spec's
   Global-constraints note.

2. **`minRotationsToSolve()` is a Dijkstra/Steiner DP over rotation states, not a
   literal BFS.** A BFS over 4^36 states is not computable; see the section above
   for why the reformulation is exact and why it is strictly stronger than the
   check the spec describes. No gameplay constant changed as a result.

Not a correction but worth recording, because two intermediate bot designs were
discarded before the numbers above were reachable:

- A hill-climber scored on live flow alone solved **5%** of seeds. Two
  neighbouring tiles must BOTH open toward each other before a drop crosses, so
  no single rotation ever moves the live flow one cell closer and the heuristic
  is a flat plateau everywhere. Fixed by scoring the half-finished join: with `A`
  the relaxed tile-distance from the live flow to the tank and the board "aimed"
  when a live pipe end already sprays into a tile strictly closer than `A`, the
  cost `2A - aimed` falls by one on the tap that aims and by one again on the tap
  that accepts. That took it to 73%.
- Even then, **11% of level-3 boards deadlocked**: the escape tap broke a live
  join, the next greedy tap put it straight back because that was the biggest
  available gain, and the pair repeated until the clock ran out. A four-step tabu
  on the tile an escape tap just touched removed the cycle and took the bot to
  78.7%. Both are player-model fixes, not rule changes — no game constant moved.

### Verification

- `pnpm install` clean.
- `pnpm build` (mode uat) passes: 525 modules, `dist/index.html` 0.85 kB,
  `assets/index-*.css` 33.00 kB, `assets/index-*.js` 424.73 kB (gzip 141.99 kB),
  built in 1.86s, zero errors and zero warnings.
- `node scripts/balance.mjs --runs 300` exits 0, GATE PASSED.
- `grep -r "Guardian Shelter" income-pipeline/src/` — zero matches.
- Kit files byte-identical to `shared/game-kit/` (all seven).
- Non-ASCII scan of `src/`: only comment arrows and the lead modal's HTML check
  glyph, both allowed by GAME_STANDARD §8.3. No emoji anywhere.

### Deferred

- Registration deltas (`scripts/games-manifest.json`, root `README.md`,
  `scripts/sync-game-kit.mjs` GAMES list, `scripts/build-status.json`,
  `scripts/build_tracker.py`, `GAMES_TRACKER.xlsx`) are the controller's
  single post-batch task and were deliberately not touched.
- The 120s session clock is a backstop rather than a live pressure: the three
  payday clocks plus their flow animations total 71.4s at worst, so a run ends on
  the third board's outcome long before the session expires. The dominant lose
  path is a board ending with zero tanks connected, which is immediate and very
  reachable (a passive player loses on level 1 in 18s).

## 2026-07-31 — Lead-form slim, animation-first tutorial, asset prompt sheet

**G1 — email field removed from lead capture** (`src/LeadCaptureModal.jsx`)

- Deleted `EMAIL_RE`, the `email` `useState` seeded from
  `sessionStorage.lastSubmittedEmail`, the entire "Email Field"
  `<div className="sl-lead-field">` block and the `errs.email` branch of
  `validate()`.
- Removed the `sessionStorage.setItem('lastSubmittedEmail', …)` write and the
  `email` key from the `submitToLMS({…})` call and from both `onSubmitted({…})`
  payloads.
- `src/api.js` untouched: `submitToLMS` already defaults `email_id: email || ''`,
  so the LMS request body is byte-identical to before.
- Repo-folder grep for `email` / `lastSubmittedEmail` afterwards is clean
  outside `src/kit/` and `src/api.js`; `ThankYouScreen.jsx` and
  `SlotBookingModal.jsx` never referenced it.
- Name, Mobile and the T&C checkbox are untouched.

**G2 — `HowToPlayScreen` rebuilt as animation-first** (`src/Screens.jsx`)

- Removed the `Beat` step component and all three numbered step blocks, the
  orange one-line subtitle, the scoring paragraph
  (`+tankFilled / −leakPenalty / +earlyBonusPerSecond`) and the row of level
  chips. `GAME_CONFIG` is no longer referenced on this screen and was dropped
  from the `data.js` import.
- New 4.6 s CSS `@keyframes` loop (`IP_TUT_CSS`) that dramatises the actual
  rule set on a 2-row mini board drawn with the canvas's own tile wells, casing
  stroke, pipe bore and gold flow: an elbow tile sits turned the wrong way, the
  live route dead-ends and sprays red leak jets, a yellow finger glyph taps that
  tile, the tile snaps a quarter turn **clockwise** (matching `tapCell()`), the
  leak stops, gold money runs the whole salary→tank route via
  `stroke-dashoffset`, and the goal tank fills. Then it resets.
- The rotating tile is a `<g transform="translate(126 62)">` wrapper with an
  inner CSS-rotated group pinned to `transform-origin: 0 0`, so it pivots about
  the true cell centre rather than its own bounding box.
- Remaining text is exactly: the "How to Play" heading, three icon-led labels
  ("Tap to turn" / "Fill every tank" / "Seal the leaks", 3 words each, each with
  an inline SVG glyph) and the "Play" button.
- Card padding tightened to `22px 18px 20px`, outer padding 18 px,
  `overflow: hidden` — the card is ~440 px tall, so 360×640 fits without a
  scrollbar.
- `prefers-reduced-motion` disables the whole demo, matching the existing
  `SCREEN_CSS` block.
- Gameplay, `flow.js`, `levels.js`, HUD, balance and `ResultsScreen` untouched.

**G3 — `asset-from-here.md`**

- New `income-pipeline/asset-from-here.md`, 14 Nano Banana prompts.
- Motif chosen for this game: **engineering blueprint made physical** — flat
  front-on 2-D, cyanotype drafting-plate construction marks, constant line
  weights, machined collars, with money as the only warm material in the set.
  Deliberately the opposite of a glossy 3-D casual look, and distinct from every
  other sheet in this batch.
- The sheet restates and enforces the existing colour grammar from `data.js`
  (gold = money in motion, blue = plumbing you own, orange = the tile under your
  finger, green = a funded goal, red = income sprayed away).
- Covers: board plate, empty tile well, straight / elbow / tee / welded-cross
  tiles, salary inlet valve, empty and funded tanks, the tiling money-flow
  strip, the leak spray, the payday clock HUD badge, and both result states.

**Verification**

- `pnpm install` — OK.
- `pnpm build` (vite --mode uat) — **passes**, `✓ built in 4.22s`.
