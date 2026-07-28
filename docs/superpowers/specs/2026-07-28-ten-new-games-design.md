# Ten New Games — Design Spec (Batch 4)

Date: 2026-07-28. Author: controller session (Fable planning pass).

Ten new insurance-themed mobile web games. Every mechanic below was verified absent from:
- the bajaj-game-store catalog (48 games, GAME_001–GAME_048) and all store directories on disk
  (incl. uncataloged: banana-joyride / insurance-rio / term-joyride = runners,
  shield-marble-vita = peg solitaire, wealth-waters = fishing, wealth-miner = gold miner),
- this repo's 16 shipped games,
- the dropped/removed list in scripts/build_tracker.py CATALOG_NOTE.

## Global constraints (apply to every game — copied from okf-brain/GAME_STANDARD.md v2)

- One isolated Vite 5 + React 18.3.1 app per game, kebab-case dir at repo root. NO workspace. pnpm only.
  `pnpm build` (mode uat) is the hard verification gate.
- Scaffold is cloned from `guardian-shelter/` (the gold standard). Services (`src/services/api.js`,
  `crypto.js`, `shortener.js`) copied verbatim — only the CRM identity strings change.
- Screen flow: home → howtoplay → game → results (+LeadCaptureModal if no lead) →
  [Book a Slot → SlotBookingModal] → thankyou. Restart via `gameKey` remount.
  `incrementPlayCount()` exactly once, in startGame.
- Session ≤ 2 minutes with a clear WIN and a clear LOSE path.
- Brand: BLUE `#003DA6`, ORANGE `#F26522`, GREEN `#28A745`, page bg `#0B1221`.
- NO emoji as canvas sprites. Programmatic canvas / inline SVG only. (HTML ✓ glyph allowed per §8.3.)
- Juice floor: bursts ≥8 particles, floating text, screen shake, squash/stretch, screen transitions,
  animated score counter.
- Audio: `src/kit/audio.js` Web Audio synth only. No audio files.
- Viewport meta + 430px max container + DPR canvas via `fitCanvas(canvas, w, h, maxDpr)` + `touch-action: none`.
- Kit: copy `shared/game-kit/*.js` into `<game>/src/kit/` (byte-identical; `scripts/sync-game-kit.mjs --check`
  must pass after registration).
- CRM identity: `LEAD_NO_KEY = '<camelCaseDir>LeadNo'` in api.js; `summaryDtls: '<Title> Lead'`;
  `grep -r "Guardian Shelter" <game>/src/` must return ZERO matches (includes SlotBookingModal
  remark + header, ThankYouScreen strings).
- OKF docs: `okf-brain/<dir>/index.md` + `okf-brain/<dir>/log.md`.
- Balance gate: a headless node sim (`<game>/scripts/balance.mjs` or similar) that imports the SHIPPED
  game modules (never re-implements rules) and proves the win/lose targets below. If a constant in this
  spec is proven broken by the sim, correct it and document the correction in okf-brain log — the
  reachable-win requirement governs over literal constants.
- Hot-loop discipline (review-verified idioms from prior batches): refs for mutable state; `fx.update(dt)`
  then `fx.isFrozen()` early-return; full teardown on unmount; HUD via textContent refs (no per-frame
  React state); endRun bursts clamped on-screen; offscreen pre-rendered paints; no per-frame allocations.

Loop/input/effects API (already in `shared/game-kit/`): `createGameLoop({update, render, stepMode:'fixed',
sessionSeconds, onTick, shouldTickClock, onExpire, onPause})` (dt = 1/120); `createInput(el, {onDown, onMove,
onUp, onTap, onSwipe, onHold}, {transform})`; `createEffects()`; `createAudio()`; `BALANCE`
(physics.gravity 1600, terminalVelocity 2400, inputBufferSeconds 0.12); `withOverrides`.

---

## 1. premium-pinball — "Premium Pinball" (port 5055)

CRM: `premiumPinballLeadNo` / `summaryDtls: 'Premium Pinball Lead'`.

**Mechanic (new: pinball flippers).** Portrait single-screen pinball table. Hold-to-charge plunger
launches the ball; tap LEFT half = left flipper, RIGHT half = right flipper (hold keeps flipper raised).
Table elements: 3 goal bumpers (Education / Home / Retirement, circles), 2 slingshots near the flippers,
3 rollover lanes at top. Lighting all 3 rollover lanes arms **Bonus Secure** (2× scoring, 8s).
Ball drains between the flippers → lose a ball. 3 balls per session, 120s clock.

- Win: score ≥ 3000 before balls or clock run out. Lose: 3 drains or clock expiry below target.
- Scoring: bumper hit 50 (Bonus Secure 100), slingshot 25, rollover 75, all-3-goal-bumpers-in-one-ball 500.
- Physics: circle-vs-segment collision with substeps (≥4 at terminal velocity — the sim must prove no
  tunneling); flippers are rotating capsules with angular impulse; gravity `BALANCE.physics.gravity × 0.55`
  (table pitch), restitution 0.55 walls / 1.15 bumpers (energy-inject clamp: post-hit speed ≤ 1500 px/s).
- Difficulty: static table; nudge NOT included (keeps scope tight).
- Stats contract: `{score, bumpers, goalsLit, combo}` (combo = best hits within 1.5s chain).
- Balance sim: scripted bot flips when ball crosses a flip window (80ms gaussian reaction jitter),
  200 seeds → win rate 20–45%; assert zero tunneling events and ball speed ≤ 1500 px/s across all seeds.
- Theme copy: "Keep your family's cover in play — every save at the flippers is a premium paid on time."

## 2. cover-drive — "Cover Drive" (port 5056)

CRM: `coverDriveLeadNo` / `summaryDtls: 'Cover Drive Lead'`.

**Mechanic (new: cricket batting timing).** Chase 40 runs in 18 balls, 3 wickets. Bowler runs up,
delivery speed/length telegraphed by a marker (3 speeds). One control: TAP to swing. Timing vs ideal
contact instant: |err| ≤ 36ms = PERFECT (boundary: alternate 4/6), ≤ 90ms = GOOD (1–2 runs, alternating),
≤ 150ms = EDGE (0 runs, 35% chance of wicket), else MISS (wicket if ball would hit stumps — 60% of
deliveries are stump-line). Deliveries themed as life events ("Medical emergency yorker",
"Inflation bouncer"); a PERFECT on a marked "Cover ball" (every 6th) grants +1 wicket shield (max 1).

- Win: reach 40 runs within 18 balls with wickets remaining. Lose: 3 wickets or balls exhausted short.
- Difficulty ramp: delivery speed +8% every 6 balls; occasional slower ball (0.8×) from ball 7 on.
- Rendering: side-on ground, programmatic batter/bowler (rounded-rect + circle rigs), ball trail,
  boundary rope arc, big floating "FOUR!/SIX!" text.
- Stats contract: `{runs, boundaries, wickets, perfects}`.
- Balance sim: bot swings with gaussian timing error σ = 45ms; 500 seeds → chase success 25–45%.
  Also assert: perfect-only bot (σ = 12ms) wins ≥ 95% (skill ceiling reachable).
- Theme copy: "Every ball is a life event — cover it with the right timing."

## 3. goal-keeper — "Goal Keeper" (port 5057)

CRM: `goalKeeperLeadNo` / `summaryDtls: 'Goal Keeper Lead'`.

**Mechanic (new: penalty-save reaction).** You are the keeper; behind your goal are family milestone
banners. 10 penalties. Striker's run-up gives a 400ms telegraph cue (body lean + ball plant direction,
drawn programmatically; cue truthful 80% of shots, feint 20%). During ball flight (550ms → 380ms by shot 10),
SWIPE toward one of 6 zones (3 columns × 2 heights) to dive; swipe magnitude picks height. Correct zone =
SAVE. Every 4th shot is a "Risk shot" (faster, worth double). One "Shield glove" power-up auto-saves one
conceded goal (granted after 3 consecutive saves, max 1).

- Win: ≥ 6 saves of 10. Lose: 5 conceded.
- Scoring: save 100 (+streak × 25), risk-shot save 200, perfect-zone-center dive +50.
- Stats contract: `{score, saves, conceded, streak}`.
- Balance sim: bot reads the cue (correct zone p = 0.8 on truthful, 1/6 on feints ⇒ effective ~0.55)
  with dive commitment latency 150ms; 400 seeds → win rate 25–45%.
- Theme copy: "Stand between risk and your family's goals — every save is cover doing its job."

## 4. wealth-carrom — "Wealth Carrom" (port 5058)

CRM: `wealthCarromLeadNo` / `summaryDtls: 'Wealth Carrom Lead'`.

**Mechanic (new: carrom flick-pocket).** Top-down carrom board, 4 corner pockets. Drag the striker
along the baseline, then pull back to aim (aim line + power meter), release to flick. 9 gold "wealth
coins" (+100), 1 red "Queen of Protection" (+500 but must be "covered": pocket a gold coin on the very
next strike or the queen returns to center — classic carrom rule), and 2 dark "risk discs" (pocketing
one = −150 and a foul). Disc friction μ ⇒ exponential velocity decay (half-life ~0.45s); disc-disc
elastic collision (restitution 0.92); striker returns to baseline each strike.

- 8 strikes per session, 120s clock. Win: pocket ≥ 6 gold coins (queen counts as 2 toward the 6 if
  covered). Lose: strikes exhausted below target, or 3 fouls (striker pocketed = foul too).
- Stats contract: `{score, coins, queenCovered, fouls}`.
- Balance sim: bot aims at the easiest direct-line coin with angular noise σ = 4° and power noise 10%;
  300 seeds → win rate 25–45%. Assert: all discs stationary within 6s of every strike (friction sane).
- Theme copy: "Pocket every goal — and remember, the Queen of Protection only stays yours if you cover her."

## 5. wealth-balloon — "Wealth Balloon" (port 5059)

CRM: `wealthBalloonLeadNo` / `summaryDtls: 'Wealth Balloon Lead'`.

**Mechanic (new: press-your-luck inflate).** 6 rounds. HOLD to inflate the wealth balloon — banked-value
counter climbs superlinearly (value = 10 × t^1.6, t in seconds held); hidden burst threshold per round
drawn uniform 2.2–4.6s, with escalating wobble + hue-shift warning that starts at 70% of the threshold
(the tell is honest but noisy ±0.35s). RELEASE to bank the shown value. Burst = round value lost, screen
shake, deflation confetti. ONE "Term Shield" per game: the first burst is absorbed and banks 50% of the
at-burst value (auto-applied). Needle drones drift across from round 4 — releasing while a needle overlaps
the balloon pops it regardless of threshold (forces timing, not just greed).

- Win: total banked ≥ 320 across 6 rounds (120s cap). Lose: below target after round 6 / clock.
- Stats contract: `{score, rounds, bursts, bestRound}`.
- Balance sim: bot releases at estimate 70% of expected threshold with σ = 0.3s noise; 500 seeds →
  win rate 30–50%; also assert a greedy bot (releases at 95%) wins < 15% (greed must be punished).
- Theme copy: "Grow your wealth as far as you dare — and let a Term Shield absorb the one burst
  you never saw coming."

## 6. income-pipeline — "Income Pipeline" (port 5060)

CRM: `incomePipelineLeadNo` / `summaryDtls: 'Income Pipeline Lead'`.

**Mechanic (new: pipe-rotation flow routing).** 3 levels (grids 4×4 → 5×5 → 6×6). Each grid cell holds
a pipe tile (straight / elbow / tee / cross); TAP rotates 90° CW. Source tile (Salary tap, left edge)
must connect to 1–3 goal tanks (Education / Home / Retirement, right edge). A visible "payday timer"
per level (18s / 22s / 26s) counts down; when it hits zero the money flows: it animates cell-to-cell
through connected pipe; every open/unconnected pipe end on the flow path leaks (−25 each); tanks reached
fill (+150 each). Tap-lock during flow. Early-finish bonus: remaining seconds × 5 if all tanks connect
before the timer (flow triggers immediately on full connection).

- Win: fill ALL tanks in all 3 levels. Lose: any level ends with zero tanks filled, or session clock (120s).
- Stats contract: `{score, tanksFilled, leaks, moves}`.
- Level generation: generated from a solved layout then scrambled by random rotations — solvability is
  guaranteed by construction; the sim must verify via BFS over rotation states that par ≤ 14 rotations
  per level, and that the scramble is not already-solved (≥ 4 rotations from solution).
- Balance sim: greedy solver bot with 0.9s per rotation → completes all levels within timers on
  70–95% of 300 seeds (this is a puzzle: comfortable-but-not-trivial); random-rotate bot wins < 5%.
- Theme copy: "Route every rupee of income to the goals that matter — before payday flows, seal the leaks."

## 7. smart-sorter — "Smart Sorter" (port 5061)

CRM: `smartSorterLeadNo` / `summaryDtls: 'Smart Sorter Lead'`.

**Mechanic (new: conveyor swipe-sorting).** Items ride a conveyor from top toward a sorting head at the
bottom third. When an item is in the head zone: SWIPE LEFT = Protect shelf (term plan, health cover,
critical illness, accident shield), SWIPE RIGHT = Grow shelf (SIP, mutual fund, bonds, gold), SWIPE DOWN
= bin (scam call, impulse buy, lottery ticket, dubious tip). Items are drawn as programmatic cards with
distinct icon shapes (shield family vs chart family vs hazard family). Missort or let an item scroll past
= 1 mistake (3 allowed). Conveyor speed +6% every 5 items; every 10th item is "urgent" (glows, 2× points,
1.5× speed). Combo meter: consecutive correct sorts ×1 → ×5 multiplier.

- Win: survive the full 90s run with < 3 mistakes AND score ≥ 1200. Lose: 3 mistakes.
- Scoring: correct sort 40 × combo multiplier; urgent 80 × multiplier.
- Stats contract: `{score, sorted, bestCombo, mistakes}`.
- Balance sim: bot with 6% missort probability and 250ms reaction; 500 seeds → win rate 25–45%;
  perfect bot scores ≥ 2× target (ceiling headroom).
- Theme copy: "Protect it, grow it, or bin it — sort your money life before it scrolls past you."

## 8. safe-crossing — "Safe Crossing" (port 5062)

CRM: `safeCrossingLeadNo` / `summaryDtls: 'Safe Crossing Lead'`.

**Mechanic (new: traffic-control tap go/stop).** Top-down 4-way junction, one lane per direction, fixed
straight paths through the shared center box. Family vehicles (car / scooter / school van) spawn on the
four approaches at ramping frequency (every 2.4s → 1.4s). TAP a vehicle to brake-hold it (brake lights);
TAP again to release. Un-stoppable "risk trucks" (10% of spawns, horn warning + flashing) never brake —
time everyone else around them. Two vehicles overlapping in the junction = crash. A crash consumes the
single "Claim Cushion" (first crash forgiven with a big shield flash); second crash ends the run.

- Win: 20 vehicles safely through within 110s. Lose: second crash, or clock with < 20 through.
- Scoring: vehicle through 50; near miss (< 24px gap in junction, no contact) +30 "smart timing" bonus.
- Stats contract: `{score, crossed, nearMisses, crashes}`.
- Balance sim: bot scans conflicts 3×/s and brakes the later-arriving vehicle of any predicted overlap
  (reaction 300ms); 400 seeds → win rate 25–45%; do-nothing bot must crash out < 15s (danger is real).
- Theme copy: "Life's traffic never stops — one Claim Cushion, and after that, timing is everything."

## 9. slide-to-safety — "Slide to Safety" (port 5063)

CRM: `slideToSafetyLeadNo` / `summaryDtls: 'Slide to Safety Lead'`.

**Mechanic (new: ice-slide pathing).** 5 handcrafted levels on a frozen grid (7×9 cells). SWIPE
up/down/left/right: the shield token glides until it hits a wall, rock, or the grid edge. Collect coin
cells it passes over. Reach the family tile to finish the level. Hazards: crack tiles (sliding ONTO one
breaks it — token falls, level restarts, −1 of 3 total retries; sliding OVER at speed is safe on the
first pass, crack visibly deepens), and one patrolling wind gust per later level (shifts the token one
cell sideways when crossed, telegraphed lane shimmer).

- Win: finish all 5 levels within 120s and retries. Lose: retries exhausted or clock.
- Scoring: coin 25; level complete 100 + par bonus (par-move finish +75, par+1 +40).
- Levels defined in `src/levels.js` as ASCII maps (documented legend); level 1 teaches (6 moves par),
  level 5 combines cracks + gust (par ≤ 12).
- Stats contract: `{score, levels, coins, moves}`.
- Balance/solvability sim: BFS over slide-graph per level proves: family tile reachable; par = optimal
  move count matches `levels.js` par field; every coin lies on at least one optimal-or-plus-2 path;
  crack-break states cannot make a level unsolvable (validate all reachable states). Bot: optimal-path
  with 15% wrong-swipe noise → completes all 5 within clock in 25–50% of 300 seeds.
- Theme copy: "One swipe at a time, glide your shield past thin ice and bring it home to the family."

## 10. perfect-premium — "Perfect Premium" (port 5064)

CRM: `perfectPremiumLeadNo` / `summaryDtls: 'Perfect Premium Lead'`.

**Mechanic (new: stop-the-marker precision).** A life timeline from age 25 to 60 in 12 stages (each
stage = a premium due date: "Age 28 — first job raise", "Age 35 — home loan", …). A marker sweeps back
and forth across a horizontal bar; TAP to lock it. Green safe zone = premium paid (stage cleared);
gold center sliver = PERFECT (+combo). Miss (outside green) = one of 3 "grace periods" consumed; the
stage repeats. Per stage: sweep speed +7%, green zone width 24% → 9% of bar, zone position re-randomised;
every 4th stage the bar bends into an arc (visual variety, same timing rule). Occasional bonus "top-up"
zone (gold, offset from green): locking inside it banks +150 without advancing the stage (risk: it's
narrow; missing it costs grace like any miss).

- Win: clear all 12 stages (retirement fireworks at age 60). Lose: 3 misses (grace exhausted) or 100s clock.
- Scoring: stage 100 + speed bonus (remaining stage seconds × 10); PERFECT ×2 and +1 combo (combo
  multiplies stage score up to ×4).
- Stats contract: `{score, perfects, bestCombo, stagesCleared}`.
- Balance sim: bot taps with gaussian positional error σ = 6% of bar width; 500 seeds → win rate 25–45%;
  σ = 2% bot wins ≥ 90% (skill ceiling).
- Theme copy: "Pay every premium right on time from 25 to 60 — discipline today is a pension tomorrow."

---

## Registration deltas (single controller task after all games land)

- `scripts/games-manifest.json`: +10 `newGames` entries, feedback "Approved - new original concept",
  reference links: n/a ("Original concept" text), ports as above.
- `README.md` games table: +10 rows with ports.
- `scripts/sync-game-kit.mjs` GAMES: +10 dirs.
- `scripts/build-status.json`: +10 keys, final value "Built - review clean".
- `scripts/build_tracker.py` CATALOG_NOTE approved-scope line: append the 10 (mechanic in parens).
- Regenerate `GAMES_TRACKER.xlsx` (expect 28 game rows).
