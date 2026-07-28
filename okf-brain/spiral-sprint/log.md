---
type: log
title: Spiral Sprint Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/spiral-sprint/log.md
timestamp: 2026-07-28
---

# Spiral Sprint Change Log

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
