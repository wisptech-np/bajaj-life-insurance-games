---
type: log
title: Slide to Safety Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/slide-to-safety/log.md
timestamp: 2026-07-28
---

# Slide to Safety Change Log

## [2026-07-28] Initial build

### Scaffold

- Cloned the `guardian-shelter/` scaffold per GAME_STANDARD §1 (index.html,
  vite.config.js, package.json, main.jsx, index.css, api.js, LeadCaptureModal,
  SlotBookingModal, ThankYouScreen, services/playCount.js, utils/crypto.js,
  utils/shortener.js) plus an unedited copy of `shared/game-kit/*.js` into
  `src/kit/` — `cmp` confirms all seven kit files byte-identical to the shared
  originals.
  The scaffold files were taken via `wealth-drop/`, which is a verbatim
  guardian-shelter descendant: `services/playCount.js`, `utils/crypto.js`,
  `utils/shortener.js` and `main.jsx` are byte-identical to guardian-shelter's,
  and the three modals differ from guardian-shelter's only in the game-name
  strings — which had to change anyway. That route guarantees the
  "zero Guardian Shelter references" rule by construction.
- Identity rewired: package name `slide-to-safety`, rollup output
  `SlideToSafety`, dev port **5063**, title `Slide to Safety`,
  `LEAD_NO_KEY = 'slideToSafetyLeadNo'`, `summaryDtls = 'Slide to Safety Lead'`,
  slot-booking remark `Slide to Safety Slot Booking`, lead-modal summary
  `Slide to Safety - Post Game Lead`. `grep -rn "Guardian Shelter" src/` → 0,
  `grep -rniE "wealth ?drop|wealthDrop"` over src/, index.html, package.json,
  vite.config.js, scripts/ → 0.

### Game

- Rules and boards live in two pure modules — `src/levels.js` (five ASCII maps, a
  documented legend, the parser) and `src/slide.js` (`resolveSlide` /
  `applySlide` / `restartLevel` / `levelAward` / `slideSeconds`). Neither imports
  React, the DOM or the kit, so `scripts/balance.mjs` executes the shipping rules
  under node rather than a re-implementation that can drift.
- `resolveSlide()` is a pure query returning the full path of a swipe; the canvas
  needs the path up front to animate the glide and the board state must not
  change until the token has arrived, so `applySlide()` is a separate commit.
- `src/SlideToSafetyGame.jsx` is presentation only: a `intro → idle → sliding →
  falling/clear` state machine driven by the kit loop's fixed 120 Hz tick, all
  mutable state in refs, HUD through `textContent` refs, and the water/ice/rocks
  pre-rendered to one offscreen bitmap per board and per resize. Coins, thin ice,
  the gust lane, the family tile and the token animate and are drawn live.
- Rendering is programmatic canvas only — no emoji sprites, no image files. A
  codepoint scan over `src/` finds exactly one character in the emoji ranges:
  U+2713 CHECK MARK, the HTML checkbox tick inside LeadCaptureModal that
  GAME_STANDARD §8.3 explicitly permits.
- Juice floor met: ≥ 8 particles on every event (12 coin, 14 crack, 22 fall, 26
  board clear, 40 win, 24 lose), floating text on every score change, screen
  shake on a fall and a wall bonk, squash on every landing, an intro wipe per
  board, framer-motion screen transitions and a damped score counter.
- Input: kit `createInput` `onSwipe`, plus arrow keys / WASD for desktop testing.
  A flick that lands mid-glide is buffered for `BALANCE.physics.inputBufferSeconds`
  and fires the moment the token stops — without it a player swiping in rhythm
  loses roughly one input in three.
- Stats contract exactly `{score, levels, coins, moves}`. Screen flow
  home → howtoplay → game → results (+LeadCaptureModal when
  `sessionStorage[LEAD_NO_KEY]` is empty) → [Book a Slot → SlotBookingModal] →
  thankyou, restart via `gameKey` remount, `incrementPlayCount()` exactly once in
  `startGame`.

### Balance gate

- `scripts/balance.mjs` imports `src/levels.js`, `src/slide.js` and `src/data.js`
  and exits non-zero on any failure. Gates: family tile reachable; `par` equals
  the BFS optimum; every coin on a route of length ≤ par + 2; **no reachable
  dead-end state**; bot completion inside 25–50 %.
- The par/coin search is a BFS over `(position, crack states, coin mask)`. Cracks
  need one bit each because a *survivable* state only ever has intact or deepened
  thin ice — stopping on a crack, or crossing a deepened one, is a fall and
  therefore not an edge of the graph.
- The dead-end gate builds the whole `(position, crack states)` graph, BFSes it
  backwards from the family tile, then walks forward from the start and asserts
  every reachable state has a finite distance. That distance table is also the
  bot's optimal-move oracle, so the gate and the bot cannot disagree.
- Results (gate PASS): pars 6 / 8 / 9 / 10 / 12, all matching the BFS optimum;
  every coin reachable at exactly par (all 22 coins sit on an optimal line);
  reachable movement states 24 / 9 / 10 / 11 / 13, dead ends 0 / 0 / 0 / 0 / 0.
- Bot: 44.3 % of 300 seeded runs, and 43.0 % / 45.4 % / 45.4 % over 2,000 runs at
  three different seeds. 3.02 falls per run against 3 retries, 8.0 mis-swipes,
  49.4 moves against a 45-move perfect run, 49 s of the 120 s clock used.
- Seeded PRNG: `mulberry32` from `src/slide.js`, seeded from `--seed`
  (default `0x511de5a1`); the reaction-time gaussian is Box-Muller over the same
  stream, so any reported number is reproducible from its seed.

## Corrections to the spec, and why

The brief's §9 was implementable as written except where a literal reading would
have made the required solvability proof impossible. Per the batch rule that
"the reachable-win requirement governs over literal constants":

1. **The gust is a deterministic lane, not a moving entity.** The brief says
   "one patrolling wind gust per later level (shifts the token one cell sideways
   when crossed, telegraphed lane shimmer)". A gust whose *position* varies with
   wall-clock time makes the slide graph time-dependent, which makes "par = BFS
   optimal move count" and "every coin lies on an optimal-or-plus-2 path"
   undefined — and makes the puzzle unsolvable by reasoning, which is the whole
   point of a pathing puzzle. Implemented as a fixed lane of gust cells with a
   fixed push direction; "patrolling" is delivered as an animated shimmer that
   sweeps along the lane, which is also exactly the "telegraphed lane shimmer"
   the brief asks for. The deflection rule is: the shove only acts on a slide
   crossing the lane perpendicular to the push, the slide then continues in its
   original direction from the new cell, the shove is cancelled if the
   destination is rock or off-grid, and a cell reached *by* a shove never
   re-triggers a gust (so no arrangement of gusts can loop).
2. **The gust is on boards 3 and 5, not on all "later levels".** The brief
   requires level 5 to combine cracks and the gust; board 3 introduces the gust
   and board 4 is a pure-routing breather so the finale is not the third
   consecutive wind board. Both gust boards are measurably load-bearing: with
   their gust cells flattened to plain ice, `scripts/balance.mjs` reports the
   family tile as UNREACHABLE.
3. **The family tile is sticky.** The brief says "reach the family tile to
   finish the level". Implemented as: any slide whose path crosses it stops on
   it. The alternative (the token slides *over* the goal unless something else
   stops it there) makes most boards unsolvable without a rock behind every
   approach and makes par a function of level furniture rather than routing.
4. **"−1 of 3 total retries" resolved as: three survivable falls.** The fourth
   fall ends the run. The HUD shows three shield pips draining to zero, and the
   run continues at zero until the next fall.
5. **Coins are not restocked by a retry, and the par bonus uses the board's
   cumulative move count across retries.** Neither is in the brief; both close
   the same exploit — drowning on purpose to re-collect coins or to reset a
   botched route would otherwise be *profitable*. A fall already costs a retry;
   it now also costs the bonus and banks nothing new.
6. **Thin ice re-freezes on a retry.** Required for the solvability proof: if a
   hole persisted across a restart the reachable state space would not be
   bounded by the crack bits, and a retry could hand the player a board that is
   provably worse than the one they started. A retry is a clean second chance.

### Level-authoring correction found by the gate (six placements moved)

The first pass placed thin ice wherever a mis-swipe came to rest. The dead-end
gate rejected it: cracks on a cell that slides merely *pass through* can sever
the only corridor out of a pocket, leaving states from which the family tile is
unreachable and the player has to drown on purpose to continue. Fifteen such
states were reported across four boards. The placements that caused them, and
what replaced them:

| board | removed | why it stranded the player | replacement |
|---|---|---|---|
| Thin Ice | (1,8) and (6,8) as a pair | (0,8) is a pocket whose only exit runs along row 8 through both | crack (0,8) itself — a cell that is never a resting state cannot strand anyone |
| Crosswind | (3,3) | the only column-3 corridor from the south shore to the north | (1,0) |
| Crosswind | (5,7) | the only corridor out of the launch bay in column 5 | (6,1), (6,6) |
| Crosswind | (2,5) | the only route east out of (1,5) | (6,8), (2,5) re-added later, once (6,6) and (5,7) had removed the states that depended on it |
| Cold Snap | (0,8) alone | (0,6) is a pocket whose only exit is down onto (0,8) | crack (0,6) as well |
| Bring Them Home | (4,0) | row 0 is a closed trap once entered; the crack made its only exit fatal | cracks (0,0) and (6,0), which stop row 0 being a resting row at all |
| Bring Them Home | (2,4) | the only column-2 corridor off the south shore | (2,2), (2,0), (4,0), (0,4), (3,6) |

The rule that emerged, and that the boards now follow: **thin ice belongs either
on a pure stop-cell** (a cell no slide ever passes through, so cracking it
removes a resting state instead of severing a corridor) **or on a corridor cell
the optimal line crosses exactly once** (which is the "cross at speed, the crack
deepens" beat the brief asks for). Every placement is validated by gate 4 — the
gate is what makes the difference between the two cases decidable rather than a
matter of taste.

### Difficulty tuning

The first playable configuration had the bot completing 100 % of runs: mis-swipes
were plentiful (4 per run) but almost never fatal. Crack placement was then
tuned against the gate — candidate cells were scored by the noise-bot's falls per
board completion, subject to par being preserved and zero dead ends — until the
run-level completion landed inside the 25–50 % band with margin. Final: 43–45 %
across seeds, 3.02 falls per run against 3 retries.

The clock never binds for the bot (0 % of losses), because a bot that already
knows every optimal line spends 49 s of the 120 s. This is left as-is rather than
slowed down: making the glide slow enough to threaten a bot that never hesitates
would make it sluggish for the human it is actually for, and a human who has to
*find* each line — 45 moves of route-planning across five unfamiliar boards — is
squarely under the 120 s cap. The retries are the designed failure path; the
clock is the backstop.

## [2026-07-29] Review round 1 — three minor fixes

Independent review came back CLEAN overall (all seven corrections verified
justified, gate robust across seeds) with three minor findings. All three fixed;
none touch the rules, and the gate result is unchanged.

### 1. Mid-glide state mutation was not atomic (correctness)

`collectCoinAt` / `deepenCrackAt` were mutating `s.st.coins`, `s.st.cracks` and
`s.score` progressively as the token crossed each cell, ahead of the
`applySlide()` commit in `finishSlide()`. A clock expiry mid-glide could
therefore credit coins for a move that never landed (≤ 25 pts of inflation) and
leave the token frozen between cells — contradicting the invariant documented on
`resolveSlide` itself, that the board must not change until the token arrives.

Fixed the clean way: **all** scoring and board state now commits atomically in
`finishSlide()` (`SlideToSafetyGame.jsx:839-848`), and the per-crossing handlers
are presentation only — renamed `showCoinPickup` (`:724`) and `showCrackDeepen`
(`:737`) to say so. They paint into two cosmetic overlays, `s.coinHidden` and
`s.crackShown` (`:544`), so a coin can *look* swept up while the move that swept
it is still uncommitted; the renderer composites overlay over committed state
(`:1099`, `:1108`). Membership in `res.coins` / `res.deepened` — both resolved
before the glide began — is now the authority on what a crossing does, which
also retired the `a.idx < span || !a.res.fell` guard that was standing in for it.

**Expiry policy chosen: discard the in-flight glide.** `discardGlide()`
(`:656`, called from `endRun` at `:666`) drops the animation, clears the
overlays and snaps the token back onto the cell it actually occupies. Rationale:
the clock is a buzzer, so a swipe still in the air earns nothing, and
"score = the sum of committed moves" stays literally true — which is what both
the stats contract and the sim assume. The alternative (completing the commit)
would also have to decide whether a board *finished* after the buzzer counts,
and there is no good answer to that.

`scripts/balance.mjs:316` was updated to match: the bot's clock check now runs
after the glide time is deducted and **before** the move is credited and
applied. Win/lose is unaffected (an expired clock is a loss either way), so the
bot band did not move — 45.4% at 2,000 runs on each of seeds 12345 / 999331 /
777777, identical to the pre-fix figures.

### 2. Token resurrection on the fatal fall (visual)

On the fourth fall, `endRun` set `s.phase = 'over'` the moment the fall
animation finished, so the next frame's `falling = s.phase === 'falling'` was
false and the shield popped back to full size on the tile it had just gone
through — for the whole ~700 ms end beat, on the most common lose path. Now
latched: `s.tokenHidden` (`:538`) is set in `endRun` whenever the run ends while
the token is falling, and on a win (`:669`); the draw condition reads the latch
(`:1122`) instead of the phase. Reset in `loadLevel`. The same latch also covers
a clock expiry that lands mid-fall, which had the identical glitch.

### 3. Per-frame allocation in `drawFamily` (performance)

The `people` array literal was rebuilt on every frame. Hoisted to the
module-level `FAMILY_FIGURES` (`:83`) in units of the tile half-size, read by
index rather than destructured (array destructuring allocates an iterator)
(`:396`).

While there, the same rule was applied to the other per-frame allocations in the
draw path: the coin, token, roof and wall **gradients** were being rebuilt every
frame (~8 objects/frame). They are now created once per resize by `buildPaints`
(`:94`, called from `fit()`) and anchored at the origin, with the draw calls
translating to the entity — the `buildPaints` idiom from `wealth-drop`.

### 4. A committed win could be reported as a loss (MAJOR, pre-existing)

Found by the re-review, and exposed rather than caused by fix 1. `onExpire` was
`endRun(false, 'clock')` unconditionally, so a buzzer landing during the FINAL
board's ~1 s celebration beat turned a finished run into a reported loss. By
that point the win is fully committed — `finishSlide()` had already scored the
board and pushed `s.levelsCleared` to `LEVELS.length` — and the beat is
presentation, not play. The gate's bot model had always treated that boundary as
a win (`balance.mjs:346` guards its post-clear clock check with
`li < levels.length - 1`), so the game and the gate disagreed at exactly one
frame-accurate edge.

Fixed at `SlideToSafetyGame.jsx:1179-1193`: `onExpire` now special-cases a run
that is already complete and calls `endRun(true, 'levels')`, falling through to
`endRun(false, 'clock')` otherwise.

The same question for a **non-final** clear beat was checked and needs no
change: a buzzer there is still a loss, and it correctly keeps the board that
was just committed, because `stats()` reads `s.levelsCleared` and `finishSlide()`
increments it before the `'clear'` phase begins. Verified by inspection of the
commit order.

### In-flight glide discard — confirmed as shipped policy

The re-review flagged the other half of the same boundary — a buzzer during a
glide whose `res.reachedGoal` is true — as acceptable-but-confirm. **Confirmed
and kept as a deliberate product decision:** that move was never committed, so
it earns nothing and clears nothing. The asymmetry with fix 4 is the point — a
*committed* win survives the buzzer, an *uncommitted* one does not — and it is
what keeps the rule "score and boards cleared are the sum of committed moves"
literally true in both the game and the gate.

### Re-verification

- `node scripts/balance.mjs` → `GATE: PASS` — pars 6/8/9/10/12 all matching the
  BFS optimum, every coin inside par+2, 0 dead ends on all five boards, bot
  completion **44.3%** (133/300), falls/run 3.02, 49.0 s of 120 s used. Byte for
  byte the same gate output as before the fixes.
- `pnpm build` → 525 modules, `✓ built in 1.91s`, JS 424.14 kB (gzip 141.12 kB).

## [2026-07-28] Verification

- `pnpm install` → clean.
- `pnpm build` (vite build --mode uat) → 525 modules, `✓ built in 1.76s`,
  index.html 0.84 kB / CSS 33.00 kB / JS 423.29 kB (gzip 140.86 kB).
- `node scripts/balance.mjs` → `GATE: PASS — all 5 boards solvable at the
  published par, every coin inside par+2, no reachable dead ends, bot completion
  44.3%.`
- `shared/game-kit/*.js` vs `src/kit/*.js` → byte-identical (7/7).
- No files were written outside `slide-to-safety/` and
  `okf-brain/slide-to-safety/`.

---

## 2026-07-31 — Lead-form slim-down, animation-first how-to-play, asset prompt sheet

Narrow scope: no gameplay, balance, physics, HUD or `ResultsScreen` changes.
`src/slide.js`, `src/levels.js`, `src/data.js` and `scripts/balance.mjs` untouched.

### G1 — email field removed from lead capture

`src/LeadCaptureModal.jsx`: deleted `EMAIL_RE`, the `email` `useState`, the
"Email Field" `sl-lead-field` block, the `errs.email` branch, the
`sessionStorage.lastSubmittedEmail` read and write, and the `email` key from
`submitToLMS({...})` and both `onSubmitted({...})` payloads. `src/api.js`
untouched. Nothing else under `src/` referenced it. Name, Mobile and T&C
unchanged.

### G2 — `HowToPlayScreen` is now animation-first

`src/Screens.jsx`: deleted the three `Beat` step cards (and the `Beat` component
itself), the `Swipe to glide · Thin ice breaks · …` subtitle, the scoring
paragraph and the per-level `LEVELS` chip row.

New `BoardDemo` — one 5.2 s loop on a real 6×4 slice of the board, built from the
canvas's own `IceGrid`, `RockTile`, `CrackTile`, `FamilyTile` and `ShieldToken`
at the board's own 26 px cell: a `SwipeHand` glyph swipes right, the shield
glides until the rock stops it and sweeps up a `CoinToken` on the way, then
swipes up, crosses the thin-ice tile *without stopping on it* (the tile darkens
as it passes), and lands on the family tile to a green arrival ring. The orange
route trail draws itself leg by leg with `stroke-dashoffset`, matching the trail
the canvas draws. CSS transforms only touch `<g>` elements with no transform
attribute of their own. `prefers-reduced-motion` disables all six animations.

Under it, exactly three icon-led cues reusing the board's tiles: swipe glyph +
"SWIPE TO GLIDE", `CrackTile` + "THIN ICE BREAKS", `FamilyTile` + "REACH THE
FAMILY". Remaining text: heading, three ≤4-word labels, Play button.
`GAME_CONFIG` became unused in this file and was dropped from the import. Card is
~430 px tall inside a 640 px viewport — no scroll at 360×640.

### G3 — `asset-from-here.md`

13 Nano Banana prompts written to `slide-to-safety/asset-from-here.md`. Motif is
**layered die-cut papercraft with letterpress deboss**: every element is thick
cotton card stock, cut and stacked so its pale cut edge shows, with cracks and
frost *pressed* into the paper rather than airbrushed, and deckle-torn edges
wherever something breaks. Explicitly matte — no gloss, metal, glass or glow
anywhere. Covers the water background, both ice-tile shades, the three-stage thin
ice, the rock, the family goal tile, the shield token, the coin, the wind lane,
the breakthrough effect, the route trail, the HUD icon set and win/loss tableaus.

### Verification

- `pnpm install` + `pnpm build` — **green**: `dist/assets/index-CAQY8n85.js`
  424.61 kB (141.27 kB gzip), `index-v4scUYR6.css` 33.00 kB, built in 2.81 s.
- `node scripts/balance.mjs` — **GATE: PASS** (all 5 boards solvable at published
  par, every coin inside par+2, no reachable dead ends, bot completion 44.3%).
  Harness unmodified.
