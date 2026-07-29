# Five Fast-Arcade Games — Design Spec (Batch 5)

Date: 2026-07-29. Author: controller session (Fable). Status: normative for builder agents.

User directive: 5 more high-quality 1–2 minute fast-paced mobile games, same do-not-repeat
catalogue, premium visual quality, Bajaj Life branding, insurance theme through mechanics.

## Non-repeat research (2026-07-29)

Verified against: bajaj-game-store catalog (48 titles incl. snake, hangman, word scramble,
match-3 x2, tetris, fruit-slice, runners/climbers x4, top-down shooter, bomberman, galaga,
sudoku x2, whack-a-mole x2, brick-breaker, jigsaw x2, minesweeper, racing, tube-sorting,
quiz x3, bubble shooter, peg solitaire, stacking, memory-flip, tower defense, snakes & ladders,
arcade dodger), store on-disk dirs (joyride runners, shield-marble-vita, wealth-waters fishing,
wealth-miner gold miner), this repo's 26 shipped games, the removed-for-no-sign-off list
(stackibility-stack, retire-rich-clicker, edurise-jumper, tax-save-maze, she-shield-protector,
safe-stride-balancer, premium-tiles, income-flow, shield-drop, life-goals-bubble-shooter) and
the dropped-by-feedback list (compound-merge, shield-spin, physics orb, line drawing,
hedgehog launch, falling sand).

User-suggested formats EXCLUDED as repeats: endless runner (runners/climbers x4 + joyride),
fruit-ninja swipe (fruit-slice), traffic escape / lane racer (racing + arcade dodger +
safe-crossing), whack-a-mole & reaction shooter (whack-a-mole x2), match-3 rush (match-3 x2),
stack/tower rush (stacking + stackibility-stack), quick sort (smart-sorter + tube-sorting),
coin dash (generic collect — covered by runner family).

The 5 selected mechanics, each verified absent everywhere above:
1. One-tap impulse flight through gates (flappy-style). Distinct from life-soar (continuous
   hold-to-dive glider), edurise-jumper (platform jumper), arcade dodger (steer-to-dodge).
2. Beat-synchronised rhythm tapping (radial pulse). Distinct from premium-tiles (falling-lane
   piano tiles — removed game, and our design is radial go/no-go pulses, not lanes) and from
   perfect-premium (single sweeping spatial marker, no tempo).
3. Sequence-recall reproduction (Simon-style serial memory). Distinct from memory-flip
   (concentration pairs: spatial search, no order). The distinction (ordered serial recall vs
   pair matching) must be kept sharp: no card-flipping visuals.
4. Juggling keep-ups (tap-to-bounce, keep multiple bodies airborne). No prior art in any list.
5. WarioWare-style microgame rush (rapid sequence of 3–5s one-verb challenges). No prior art.
   Constraint: no individual microgame may itself clone a catalogue mechanic.

## Global constraints (all 5 games)

Everything in `okf-brain/GAME_STANDARD.md` v2 applies, plus the batch-4 review lessons:

- One isolated Vite 5 + React 18.3.1 JS app per game, cloned from `guardian-shelter/`
  (gold standard). NO workspace; pnpm only; `pnpm build` (mode uat) is the hard gate.
  services api.js/crypto.js/shortener.js verbatim except identity strings. Kit files copied
  byte-identical from `shared/game-kit/` into `<game>/src/kit/`.
- Branding: the existing `index.css` design system IS the required palette (--ls-blue #005BAC,
  --ls-blue-dark #004080, --ls-blue-light #3B8DD4, orange #F26922, Poppins). Keep it; restyle
  copy/scene, never the token names. Premium feel: gradients, soft shadows, glass HUD, particle
  bursts >= 8, floating text, screen shake, squash-and-stretch, animated score. NO emoji canvas
  sprites (HTML ✓ U+2713 consent tick allowed).
- Screen flow: home -> howtoplay -> game -> results (+LeadCaptureModal if no lead) ->
  [Book a Slot -> SlotBookingModal] -> thankyou. gameKey remount restart. incrementPlayCount()
  exactly once in startGame. Loading/intro/how-to/pause/resume/success/failure/retry/CTA all
  present (scaffold provides them — keep them wired).
- Session <= 2 min with a clear, reachable WIN and LOSE. Fast-arcade: target 60–110s typical.
- CRM identity: `LEAD_NO_KEY = '<camelCaseDir>LeadNo'`; `summaryDtls: '<Title> Lead'`;
  `grep -r "Guardian Shelter" <game>/src/` must be ZERO.
- Balance gate: headless `scripts/balance.mjs` importing SHIPPED modules (never re-implementing
  rules), seeded PRNG (mulberry32), MULTI-SEED from day one: assertions must hold on >= 4 seed
  blocks x all bands, not one lucky seed (wealth-carrom / premium-pinball lesson). Include at
  least one adversarial/degenerate bot per game (idle bot, spam bot, camp bot as applicable)
  and assert it loses decisively. Sim-proven corrections to spec constants allowed if documented
  in okf-brain log (reachable-win governs).
- Hot-loop discipline: refs for mutable state; fx.update(dt) + fx.isFrozen() early-return;
  HUD via textContent refs; no per-frame allocations (cache gradients/strings); full teardown.
- Audio: kit createAudio synth only. Haptics via navigator.vibrate guarded.
- OKF docs: `okf-brain/<dir>/{index.md,log.md}` (decisions, corrections, deferred list).
- Dev port per game in vite.config.js as below.

---

## 1. steady-wings — "Steady Wings" (port 5065)

CRM: `steadyWingsLeadNo` / `summaryDtls: 'Steady Wings Lead'`.

**Mechanic (new: one-tap impulse flight).** Portrait side-scroller. A shield-glider (family
cover courier — rounded vector drone/bird carrying a glowing shield) flies right at fixed
scroll speed; gravity pulls it down; TAP gives a fixed upward impulse. Expense walls scroll in:
paired pillars (top/bottom) with a gap; each pillar pair is a labelled life expense ("School
fees", "Medical bill", "EMI hike", "Gadget splurge"). Passing through the gap = a premium kept
on time (+gate). Gold coins sit inside and between gaps; a blue shield token appears every
~8 gates — holding a shield absorbs one collision (shield shatters, brief invulnerability
flash) instead of ending the run.

- Win: pass 24 gates within the 100s clock. Lose: collision with no shield, floor/ceiling
  contact, or clock expiry short of 24.
- Difficulty: gap height 34% -> 24% of playfield across gates 1..24; scroll speed +12% at
  gates 9 and 17; from gate 12 some gaps drift vertically (slow sine, telegraphed).
- Scoring: gate 50, coin 25, near-miss (pass within 12px of a pillar edge, no contact) +30,
  shield saved intact at win +150.
- Stats contract: `{score, gates, coins, nearMisses}`.
- Balance sim: bot flaps to track gap centerline with gaussian timing error sigma = 90ms and
  aim error; 400 seeds x >= 4 seed blocks -> win 25–45%. Assert: sigma = 25ms bot wins >= 90%
  (ceiling); no-tap bot dies < 4s; every generated gap sequence is physically passable at its
  scroll speed (reachability proof over the impulse envelope — max climb/descent between
  consecutive gaps); zero tunnelling through pillars at terminal velocity.
- Theme copy: "Life's expenses keep coming — keep your cover airborne and glide through
  every one of them."

## 2. premium-pulse — "Premium Pulse" (port 5066)

CRM: `premiumPulseLeadNo` / `summaryDtls: 'Premium Pulse Lead'`.

**Mechanic (new: beat-synchronised rhythm tapping, radial go/no-go).** A glowing policy badge
sits center-screen. Rings spawn at the screen edge and contract toward the badge in exact time
with a synth metronome groove (kit audio: kick on the beat, hats between — the audio IS the
timing source, rings are its visualisation). TAP anywhere when a BLUE ring (a premium due)
reaches the badge outline: |err| <= 45ms PERFECT (x2 + combo), <= 110ms GOOD, else MISS.
RED spiky rings (impulse buys / risk temptations) must be let through WITHOUT tapping —
tapping a red ring = a miss (go/no-go inhibition). Every 8th beat is a "bonus double": two
blue rings one half-beat apart.

- Structure: 3 movements, 90s total. BPM 96 -> 112 -> 126 (movement changes telegraphed with
  a fill + banner). ~64 scored rings; red ratio 20% -> 30%.
- Win: finish the track with score >= target (tuned so the gate bands hold, start 4200) AND
  fewer than 8 misses. Lose: 8 misses ("cover lapsed"), or track end below target.
- Scoring: PERFECT 100 x combo mult (combo /10 capped x3), GOOD 40, red correctly ignored 15.
- Stats contract: `{score, perfects, bestCombo, misses}`.
- Timing honesty (goal-keeper lesson): stamp taps at pointerdown in performance.now time,
  compare against the audio-clock schedule with a documented device-latency allowance
  (~60ms, tunable constant); sim must model human tap jitter, not instant-commit.
- Balance sim: bot taps blue rings with gaussian error sigma = 65ms and false-taps reds 8%;
  400 seeds x 4 blocks -> win 25–45%. Assert: sigma = 20ms / 1% bot wins >= 90%; tap-everything
  spam bot loses (reds punish it) in < 45s; never-tap bot loses; ring schedule and audio
  schedule agree to < 1ms over all three movements (drift assertion).
- Theme copy: "A premium on every beat — stay in rhythm, skip the temptations, and your
  cover never misses."

## 3. smart-recall — "Smart Recall" (port 5067)

CRM: `smartRecallLeadNo` / `summaryDtls: 'Smart Recall Lead'`.

**Mechanic (new: Simon-style serial sequence recall).** A 3x3 grid of premium vector goal
tiles (Health, Home, Education, Retirement, Travel, Family, Savings, Wedding, Emergency —
distinct icon shapes + colours, no emoji). Each round, "the family's plan" plays: tiles light
up one at a time in sequence (with per-tile synth notes — each tile has a pitch, so sequences
are little melodies). Then "your turn": reproduce the sequence by tapping. Correct tile =
satisfying pop + note; wrong tile or 5s idle = a slip (3 slips = plan forgotten = lose).
NO card flipping, NO pair matching — this is ordered recall (distinction from the store's
memory-flip is mandatory and must be visually obvious).

- Rounds: length 3,4,5,6,7,8,9 (7 rounds); playback speed rises 460ms -> 300ms per step;
  from round 4, one step is a "risk flash" (red glow) that must be SKIPPED during recall
  (recall the sequence WITHOUT the red step — inhibition twist that keeps it fresh).
- Win: complete round 7 (length 9) within the 110s session. Lose: 3 slips or clock.
- Scoring: per correct step 25 x round number; round-clear bonus 150; no-slip-round +100.
- Stats contract: `{score, rounds, bestLen, slips}`.
- Balance sim: bot recalls each step with error probability growing with sequence length
  (p = 0.015 x len, tunable); 500 seeds x 4 blocks -> win 25–45%. Assert: p = 0.002 bot wins
  >= 90%; sequence generator never produces 3+ immediate repeats of one tile and covers >= 5
  distinct tiles by round 4 (non-degenerate); red-flash step never first or last in a sequence;
  total session (playback + recall at bot pace) provably <= 110s.
- Theme copy: "A financial plan only works if you remember every step — recall it in order,
  skip the risky detours."

## 4. goal-juggler — "Goal Juggler" (port 5068)

CRM: `goalJugglerLeadNo` / `summaryDtls: 'Goal Juggler Lead'`.

**Mechanic (new: tap-to-bounce juggling keep-ups).** Glowing goal orbs (Education book-orb,
Home house-orb, Health heart-orb, Retirement sun-orb — distinct silhouettes) fall under
gravity in a walled playfield. TAP an orb to knock it upward (impulse away from tap point —
tap under-centre sends it straighter; light horizontal steer from offset). Keep every live
orb airborne: an orb hitting the floor shatters (lose 1 of 3 "covers"; the orb respawns after
2s served from the top). Orb count grows: start 1, +1 at 15s/35s/60s (max 4). From 40s a slow
"risk gust" drifts horizontally (telegraphed wind streaks) pushing orbs sideways. Walls and
ceiling bounce (restitution 0.75).

- Win: survive the full 80s run with < 3 floor hits AND score >= 1500. Lose: 3 floor hits.
- Scoring: each tap-bounce 20 x live-orb count (juggling 4 orbs pays x4); "high keep" bonus
  +40 when an orb crests above the top third; all-4-airborne-for-10s streak bonus +200.
- Physics: circle-vs-wall + circle-vs-circle elastic (restitution 0.8 orb-orb); gravity
  BALANCE.physics.gravity x 0.45; tap impulse capped; max speed clamp 1400 px/s; >= 4 substeps
  at max speed (no tunnelling assertion).
- Anti-exploit (safe-crossing lesson): corner-cradling must not work — orbs within a ball
  radius of a wall corner for > 1.5s get a gentle outward nudge, and consecutive taps on the
  same orb within 300ms decay to 60% impulse (no pin-to-ceiling spam). Gate must include a
  corner-camp bot and a spam-tap bot and assert both lose or score below the honest bot.
- Stats contract: `{score, bounces, maxOrbs, drops}`.
- Balance sim: bot taps the lowest-priority orb (nearest to floor) with reaction 220ms +
  aim noise; 400 seeds x 4 blocks -> win 25–45%. Assert: 120ms sharp bot >= 85%; idle bot
  loses < 12s; spam/corner bots as above; zero tunnelling.
- Theme copy: "Education, home, health, retirement — real life means keeping every goal in
  the air at once. Cover is what catches the one you miss."

## 5. life-rush — "Life Rush" (port 5069)

CRM: `lifeRushLeadNo` / `summaryDtls: 'Life Rush Lead'`.

**Mechanic (new: WarioWare-style microgame rush).** 12 rapid micro-challenges, each a single
verb in 3.5s (shrinking to 2.6s by the end), each introduced by a one-word command banner
("PAY!", "SWAT!", "PICK!", "SHIELD!"). 3 lives; a failed or timed-out microgame costs one.
Between games: 600ms breather with speed-up jingle every 4th. Win: clear all 12 (order is a
seeded shuffle of the pool, difficulty-tiered: easy 1-4, medium 5-8, hard 9-12). Session
~75-100s. Lose: 3 fails.

Microgame pool (>= 14 built so every run varies; each MUST stay a trivial one-verb action and
MUST NOT clone a catalogue mechanic — no slicing arcs, no whack grids, no matching, no lanes):
  1. PAY! — tap the premium button before the due-date stamp slams down.
  2. SWAT! — swipe away the scam-call phone buzzing across the screen.
  3. PICK! — three cover cards; tap the one matching the banner icon (Health/Home/Motor).
  4. SHIELD! — drag the umbrella over the family group before the rain band arrives.
  5. GROW! — hold to fill the SIP jar to the marked line; release inside the band.
  6. SIGN! — swipe along the dotted line on the policy to sign it.
  7. CATCH! — tap the falling piggy bank before it passes the shelf.
  8. SNOOZE! — the impulse-buy ad pops up: tap its close X (small target, grows if missed once).
  9. STAMP! — tap when the wobbling APPROVED stamp aligns over the form (rotation timing).
 10. SPLIT! — drag the salary coin onto the correct of two jars (NEEDS vs WANTS, banner says which).
 11. LOCK! — tap the vault dial when the sweeping needle crosses the green notch.
 12. TOP-UP! — tap the health cover card exactly twice (double-tap) before time.
 13. GIFT! — drag the bonus ribbon onto the retirement box.
 14. WAKE! — device shows a sleeping alarm; tap it exactly when the clock hand hits 9 (premium date).
- No microgame reuses another's verb+layout; each has its own 2-tone synth sting.
- Scoring: microgame clear 100 + speed bonus (remaining fraction x 50); perfect (top-25%
  speed) +50; lives remaining at win +200 each.
- Stats contract: `{score, cleared, bestStreak, perfects}`.
- Balance sim: per-microgame bot success curves (per-game success probability as a function
  of a shared "skill" latency parameter, measured by running each microgame's shipped logic
  headless); honest-skill bot (latency 260ms) -> win 25–45% over 500 seeds x 4 blocks.
  Assert: sharp bot (120ms) >= 90%; every microgame individually: perfect bot clears >= 98%
  at hardest speed tier (no impossible game), and its worst-case duration fits the budget so
  a full 12-game run always ends <= 110s; the seeded shuffle never serves the same microgame
  twice in a run.
- Theme copy: "Life comes at you fast — pay, protect, pick and plan in seconds. That's what
  good cover feels like."

---

## Registration deltas (single controller task after all games land)

- `scripts/games-manifest.json`: +5 newGames entries, feedback "Approved - new original
  concept", reference "Original concept", ports 5065–5069.
- `README.md` games table: +5 rows.
- `scripts/sync-game-kit.mjs` GAMES: +5 dirs.
- `scripts/build-status.json`: +5 keys, final value "Built - review clean" (Write tool, no BOM).
- `scripts/build_tracker.py` CATALOG_NOTE approved-scope line: append the 5 (mechanic in parens).
- Regenerate `GAMES_TRACKER.xlsx` (expect 33 game rows).
