---
type: log
title: Steady Tower Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/steady-tower/log.md
timestamp: 2026-07-28
---

# Steady Tower Change Log

## [2026-07-28] Initial build

- Scaffolded from `guardian-shelter/` per GAME_STANDARD v2 §1: same `api.js`,
  `playCount.js`, `crypto.js`, `shortener.js`, lead/slot/thank-you modals and
  screen flow. Identity: package `steady-tower`, rollup output `SteadyTower`,
  port **5047**, title `Steady Tower`, `LEAD_NO_KEY = 'steadyTowerLeadNo'`,
  `summaryDtls = 'Steady Tower Lead'`. Zero "Guardian Shelter" strings remain in
  `src/`. `src/kit/` is an unedited copy of `shared/game-kit`.
- Built the full game: a 12-layer x 3 tower, 8 red risk blocks and 28 blue
  foundation blocks, flick-to-pull with speed and direction both mattering, a
  live stability meter with a heartbeat below 34%, dust from the joints when
  leaning, a settle-hold win beat and a loose-body collapse animation on loss.
- **Physics.** Two pure pieces in `data.js`. Statics compares the centre of mass
  above every interface against the support span the layer below provides, in
  normalised block-width units. The lean is modelled as a **shear**, not a rigid
  rotation, and feeds back into the statics: a layer `h` above an interface is
  carried `h * tan(theta)` off its support. The integrator is a damped spring
  toward the lean the offset implies, with the spring constant scaled by the live
  margin, so a healthy tower springs back and a critical one is floppy.
- Rigid rotation was tried first and measured **unplayable in the other
  direction**: internal interfaces are unchanged by a rigid rotation, so only the
  ground contact can fail and a 12-layer tower needs ~42 degrees. The worst
  reachable state sat at margin 0.345 and the careless reference player won 100%
  of runs — the tower literally could not be knocked over. Shear fixed it.
- Block height is derived from block width by `solver.layerHeight` (0.42) rather
  than from leftover screen height, because that ratio is the shear's moment arm;
  the original fill-the-height layout drifted to 0.66 on a tall phone, which
  would have quietly retuned the physics per device.
- **Balance gate** (`node scripts/balance.mjs`, exits non-zero on failure).
  Exhaustive, not sampled: removals are independent so the state space is exactly
  the 2^8 = 256 subsets. Per tower — count how many of the 40,320 orders keep
  every intermediate state at or above `safeMargin` 0.30, then drive the worst
  possible order through the shipped integrator and require it to topple.
  `buildVerifiedTower` runs the same checks at mount and falls back to a
  checked-in verified layout rather than shipping an unverified tower.
- Measured over 500 generated towers: **500/500 winnable, 500/500 topple-able by
  the worst order, 500/500 stable in the final state, 0 fallbacks**, median 24
  generation attempts against a 600 budget. Final margin 0.348–0.383, worst
  reachable margin 0.228–0.280, 32.1–50.0% of orders safe end to end.
  Dynamic, 500 runs per player: steady 100% win, casual 80.6%, careless 16.8%
  (83.2% topple). Winning runs score ~2,500–2,600, so `RESULT_TARGET_SCORE = 2600`.
- Solvability rules confirmed rather than assumed: bottom two layers never red;
  at most one red per layer except one pinch layer (both edges red, middle blue,
  so the sole remaining support is always a BLUE block); no three consecutive
  layers losing the same column; middle reds capped at 3 because a middle
  removal leaves the layer's support span unchanged.
- Rendering: pre-rendered backdrop (gradient, blueprint grid, tower glow,
  vignette, floor plane) plus one offscreen sprite per block carrying its face
  gradient, grain treatment, programmatic virus mark and auto-fitted label — the
  hot loop is 36 drawImage calls, no per-frame gradients or text layout.
  Alternating layer orientation is carried by the face treatment (end-grain vs
  long-grain) because a literal 90-degree front projection would leave only half
  the layers with three tappable blocks. All art is canvas or inline SVG; no
  emoji sprites, no image files. Audio is the kit Web Audio synth only.
- HUD is DOM over the canvas; score, risk count, stability percentage, meter fill
  and needle position are written through refs and guarded by change checks so a
  120 Hz tick never re-renders the tree or invalidates layout for nothing. Only
  the time pill, banner, hint, pause veil and mute button are React state.
- Screens: Home draws the tower itself, sheared and mid-pull, from the same
  three-block-layer construction the canvas uses; How to Play is a 3-beat
  CSS-animated SVG (flick a risk out, read the meter, don't topple); Results
  carries the score ring, `risks / stability / time` tiles, one chip per risk and
  Book a Slot / Play again / Home. Unused `COLORS` import dropped.
- Verified: `pnpm install` and `pnpm build` exit 0; `node scripts/balance.mjs`
  exits 0; zero "Guardian Shelter" strings in `src/`; zero attribution strings;
  no emoji codepoints anywhere in `src/` except the T&C checkbox tick in
  `LeadCaptureModal.jsx`, which is HTML UI copy and is identical in every
  reference game (GAME_STANDARD §8.3 permits it).
