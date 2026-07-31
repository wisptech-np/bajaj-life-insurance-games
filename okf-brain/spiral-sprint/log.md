---
type: log
title: Spiral Sprint Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/spiral-sprint/log.md
timestamp: 2026-07-28
---

# Spiral Sprint Change Log

## [2026-07-31] Revamp — bigger ball, over-fall destroy, difficulty ramp

- **Ball resized 14 → 20 px** (`data.js` `ball.radiusPx`) and everything it has to
  fit through retuned with it, because a bigger ball through unchanged gaps is a
  silent difficulty change. Its angular width at the worst-case 360 px screen goes
  16.4° → 23.5°, so: `arcs.gapSpanDeg` 70→42 became **80→46** (the deepest gap
  keeps 11.3° of slack a side, the same drag tolerance the old pair gave the old
  ball), `minSafeSpanDeg` 55→**60**, `minSafeSliceDeg` 10→**14**,
  `minCrashSpanDeg` 16→**18**, `tower.thicknessPx` 13→**16**. Collision follows
  automatically: `contactHalfDeg = atan(r / orbitR)` and contact is sampled across
  five points spanning it, so the ball genuinely occupies the extra degrees.
- **Over-fall destroy.** More than `fall.maxRings: 4` rings in one uninterrupted
  fall destroys the ball and ends the run (`passRing()` checks the streak before
  scoring the ring, and is deliberately not gated on fever). Telegraphed from
  ring `fall.warnRings: 3`: hot-metal `stressBall` gradient replacing the blue,
  fracture crackle lines that multiply and jitter, a pulsing red full-frame
  vignette, the ring-pass tone jumping a register (`audio.combo` at a higher
  index), a live `Fall n/4` HUD chip in danger red, and `fall.stressVelocityPx:
  700` replacing the 2,300 px/s terminal velocity so the ball visibly strains.
  That last one is the fairness knob: 150 px per ring at 700 px/s is 214 ms, so
  there are **429 ms between the first cue and destruction** against a landing arc
  at least 60° wide, ≤ 43 px of drag from the gap edge.
- **Fever reconciled with the limit rather than left to contradict it.** Kept
  `fever.ringsPerStreak: 3` and set `fall.maxRings: 4` — reward and death are one
  ring apart and never overlap: ring 3 lights the fever *and* starts the stress,
  ring 4 is the last legal ring, ring 5 destroys the ball regardless of fever.
  Fever immunity is explicitly scoped to crash arcs. The planted fever shafts stay
  2 rings long, which lands the streak on exactly 3, so the generator never hands
  out a ring of stress the player did not choose.
- **Difficulty now ramps instead of being flat.** New `arcs.rampExp: 1.7` eases
  the depth parameter every difficulty lerp reads (`difficultyT()`), so gap width,
  crash coverage and crash-arc count all back-load. Crash coverage `[0.10,0.34] →
  [0.08,0.46]`, crash arcs `[1,3] → [1,4]`. Measured over 400 towers: gap width
  77.9° / 69.3° / 55.3° and crash coverage 10.3% / 19.9% / 35.6% by third of the
  descent. New `ball.lateSpeedup: 1.28` scales launch speed by k and gravity by k²
  on the same curve, shortening the bounce period 0.70 s → 0.55 s while holding
  the apex at exactly 100 px, so deep rings give less aiming time without the ball
  changing weight.
- **G1** — email removed from `LeadCaptureModal.jsx` (`EMAIL_RE`, the state, the
  field block, the validation branch, the `lastSubmittedEmail` session read/write
  and the key in both `submitToLMS` and `onSubmitted`). `api.js` untouched; it
  already does `email_id: email || ''`, so the LMS payload shape is unchanged.
  Zero case-insensitive `email` matches left in `src/` outside `src/kit/`.
- **G2** — `HowToPlayScreen` is now a single 5 s looping demo with no prose. The
  ring wedges live inside a group that is translated to the ring centre and
  flattened with `scale(1, 0.32)`, so rotating that group is a *true* spin of the
  tilted disc rather than a sideways slide: the thumb glyph drags, the tower
  spins, the gap arrives under the ball, the ball drops a ring, then a green crash
  arc swings toward it and the second drag steers it clear. Text budget spent on
  three icon-led labels: DRAG / MAX 4 DROPS / AVOID GREEN. The three `Beat`
  components and their keyframes were deleted.
- **G3** — `spiral-sprint/asset-from-here.md`, 13 prompts, all anchored to this
  game's tilted-annulus shape language and cobalt-on-navy shaft palette (ball in
  three states, safe / landing / crash arcs, core column, vault floor, decade
  rule, shaft background, HUD icon sheet, both result crests).
- README rewritten around the new ball size, the fall limit, the reconciled fever
  rule and the measured ramp; the stale per-profile simulation table was removed
  rather than left standing, since it was measured against the old constants.
- Verified: `pnpm install` + `pnpm build` exit 0 (`✓ built in 2.62s`). Headless
  re-check of the generator (shipped code copied verbatim, `GAME_CONFIG` imported,
  worst-case 337 px stage, 400 towers / 15,600 hazard rings): 0 rings whose spans
  miss 360°, 0 landing arcs under `minSafeSpanDeg`, 0 crash arcs under the previous
  gap, 0 gaps with under 4° of slack over the ball's width. Pacing bound: 41 / 67 /
  92 s for 40 rings at 1 / 2 / 3 bounces per ring against the 120 s cap. The
  generator can stack a 7-ring passive shaft (62 of 15,600 rings sit at such a
  depth, ~1 spot per 6 towers) — that is the mechanic, not a bug: dragging works
  mid-fall and the stress cap exists to make those escapable.

## [2026-07-28] Review fix — fever relight exploit

- **Fixed (Important, from review):** `fever.smashLimit: 1` was not enforced
  during an uninterrupted fall. `smashThrough()` zeroed the fever clock and then
  called `passRing()`, which incremented the streak past `ringsPerStreak` while
  `fever <= 0` was momentarily true, so `lightFever()` fired again and reset both
  the 3 s clock and `feverSmashes`. Once a fall reached streak 3, every crash arc
  for the rest of that fall smashed for +100 with the clock resetting each time —
  a live score exploit that contradicted `data.js`, the README and the OKF index.
- The fix is a one-fever-per-fall latch (`s.feverLitThisFall`), set in
  `lightFever()`, required to be false by the relight test in `passRing()`, and
  cleared in `landOn()` — a safe landing is what ends a fall, so it is what
  re-arms the fever. Guarding only "the pass was not itself a smash" would not
  have been enough: the *next* gap pass in the same fall would still have
  relit it.
- Verified with an isolated trace of the fever state machine driven by scripted
  contact verdicts. Reviewer's path (3 gaps then two crash arcs in one fall):
  before the fix `smashes=2` and the run survived; after the fix `smashes=1` and
  the second crash ends the run. A four-crash fall went from `smashes=4` to
  `smashes=1` plus death. A safe landing between two falls still allows one smash
  each (`smashes=2`, run survives). 9/9 assertions pass.
- The balance simulation was updated to mirror the latch and re-run: output is
  byte-identical to the pre-fix run (the simulated players never steer onto a
  crash arc, so the smash path never executes) — win/loss profile and all timings
  unchanged.
- Also in this pass: removed the two per-frame string allocations the sibling
  games do not have (the ring-pulse `rgba()` is now a module-level 21-entry alpha
  ramp; milestone label and uppercase-tag strings are resolved into Maps once at
  mount instead of being rebuilt by `drawRing` every frame), and softened the
  `degPerPx` justification in `data.js` and the README — 327 px of drag is
  essentially the whole play area on a 360 px phone rather than literally wider
  than it.
- Re-verified: `pnpm build` exit 0; state-field cross-check 0/0; no template
  strings left in the per-frame draw path.

## [2026-07-28] Scaffold + gameplay implementation

- Scaffolded from the `guardian-shelter/` gold standard: `index.html`,
  `vite.config.js`, `package.json`, `src/{main.jsx,index.css,App.jsx,api.js,
  LeadCaptureModal.jsx,SlotBookingModal.jsx,ThankYouScreen.jsx,Screens.jsx}`,
  `src/services/playCount.js`, `src/utils/{crypto.js,shortener.js}`, and
  `src/kit/` copied from `shared/game-kit/*.js`. Identity retargeted: package
  `spiral-sprint`, rollup output `SpiralSprint`, port **5048**, title
  "Spiral Sprint", `LEAD_NO_KEY = 'spiralSprintLeadNo'`, `summaryDtls`
  `'Spiral Sprint Lead'`, and every foreign-game attribution string in the copied
  modals, api remarks and share copy rewritten (zero "Guardian Shelter" matches
  in `src/`).
- Built the full helix descent per spec: seeded 40-ring tower generation, a
  deterministic bounce parabola pinned to an authored apex and period, falls that
  keep their velocity through aligned gaps, drag-driven inertia-free tower
  rotation, contact classification sampled across the ball's real angular width,
  the fever streak with its smash-through, four gold milestone rules counting the
  years to retirement, and the vault-floor win at ring 40.
- Rendering is programmatic pseudo-3D: every ring is drawn as annulus sectors on
  a tilted ellipse in three passes — far halves, then extruded front walls, then
  near top faces with rims, virus pips and the landing pulse — with the core
  cylinder re-laid between the far and near passes so the back of each platform is
  correctly occluded by the column it is threaded onto. Depth is sold by a
  six-step pre-mixed fog palette, a scrolling rung pattern on the core and a fog
  gradient at the base. All art is canvas or inline SVG: no emoji sprites, no
  image files. Audio is the kit Web Audio synth, unlocked on the first pointer
  gesture.
- Juice via the shared kit: pooled particles (8 on a bounce, 10 on a ring pass,
  18 on fever, 24 on a smash, 40 on the win), floating score text, screen shake
  and hit-stop on a smash, squash on landing, a ring pulse on contact, a fading
  ball trail during falls and fever, a flame corona in fever, animated screen
  transitions, a pulsing low-time readout and an animated score counter.
- HUD is DOM over the canvas; the score counter, ring readout and progress bar are
  written through refs rather than React state so a 120 Hz physics tick never
  re-renders the tree. Only the timer, fever chip, smash count, banner, pause veil
  and mute state live on React state, and each changes a handful of times per run.
- Screens polished: Home draws the tower itself — tilted rings with gap and crash
  wedges, a core column and the ball dropping down the shaft toward a gold vault;
  How to Play is a 3-beat CSS-animated SVG (drag to spin, drop through gaps, dodge
  the green crash arc); Results carries a score ring, rings/smashes/best-streak
  tiles, years-to-retirement chips and Book a Slot / Retry / Home.
  Stats contract is `onWin/onLose({ score, rings, smashes, streak })`.
- Balance: three `GAME_CONFIG` constants and one mechanic were corrected after a
  headless simulation (shipped generator code reused verbatim, `GAME_CONFIG`
  imported directly, worst-case 360 px screen) showed the literal spec values make
  a 14-second game with an unusable fever — bounce retimed to a 100 px apex over
  0.70 s so gravity matches the kit's arcade gravity, fall-through alignment cut
  from 0.28 to 0.12 with 2-ring fever shafts every 9 rings, drag sensitivity
  raised to 0.7 deg/px so a half-turn fits one thumb swipe, and fever given a
  3-second window instead of expiring on the next bounce. Documented in the game
  README under "Balance notes" and in the `data.js` comments.
- Verified: `pnpm install` and `pnpm build` exit 0; no emoji codepoints anywhere
  in `src/` (the only non-ASCII glyphs are typographic dashes, comment rules and
  the T&C checkbox tick in HTML copy); zero foreign-game attribution strings in
  `src/`; 400-tower invariant sweep reports 0 rings out of 16,400 that are
  unpassable, malformed or missing a full-width landing arc; 1,200 simulated runs
  all lit the fever (mean 4.0 activations) and reached ring 40 in a 34.3 s median
  at the slowest profile against the 120 s cap.
