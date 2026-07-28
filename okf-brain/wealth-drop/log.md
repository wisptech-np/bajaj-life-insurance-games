---
type: log
title: Wealth Drop Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/wealth-drop/log.md
timestamp: 2026-07-28
---

# Wealth Drop Change Log

## [2026-07-28] Initial build

- Scaffolded from `guardian-shelter/` per GAME_STANDARD §1 (index.html,
  vite.config.js, package.json, main.jsx, index.css, App.jsx, api.js,
  LeadCaptureModal, SlotBookingModal, ThankYouScreen, Screens.jsx,
  services/playCount.js, utils/crypto.js, utils/shortener.js) plus an unedited
  copy of `shared/game-kit/*.js` into `src/kit/`. Identity rewired: package name
  `wealth-drop`, rollup output `WealthDrop`, dev port **5039**, title
  `Wealth Drop`, `LEAD_NO_KEY = 'wealthDropLeadNo'`, `summaryDtls =
  'Wealth Drop Lead'`. Zero references to the source game remain anywhere under
  `src/`; the unused `COLORS` import was dropped from the copied Screens.jsx.
- Built the plinko board: nine goal pockets, ten staggered peg rows (even rows on
  the lane centres, odd rows on the lane boundaries including the two walls), a
  drag-along aim rail at the top, and circle-vs-circle coin physics with
  restitution, tangential friction, a jittered contact normal and a coin-flip
  nudge for near-vertical contacts. Ten coins per session or a 90-second cap.
  Blue cover pegs shield the coin for the rest of its drop so a Risk pocket pays
  x1 instead of x0; cover re-arms per drop. Combo bonus for consecutive paying
  pockets. Score is total payout; win at 2,500.
- The pure board/physics layer sits between `PURE-PHYSICS` markers in
  `WealthDropGame.jsx`, free of React, canvas, DOM and imports.
  `tools/balance-sim.mjs` slices that exact region out of the component, writes
  it to a temp `.mjs` and imports it, so the balance table cannot drift from the
  code that ships. It exits non-zero outside a 35-45% casual win band.
- Rendering is programmatic canvas only — no emoji sprites, no image files. The
  backdrop, all 95 pegs, the side rails and the pocket dividers are pre-rendered
  to one offscreen canvas per resize; each of the nine pocket faces is its own
  bitmap so a payout can pop and lift it without re-laying out text. Per frame
  only the coin, its trail, the live cover pegs, peg sparks and pocket flashes
  are drawn.
- Juice via the shared kit: >= 8 particles on every scoring event (20 on a
  payout, 30 on a x5, 16 on cover, 20 on a Risk landing), floating `+N` and
  `STREAK xN` text, screen shake plus hit-stop on a Risk pocket, squash on the
  coin at every peg contact, a tapered coin trail sized from the device effect
  budget, pulsing Risk pockets and drop marker, animated stage-in transition and
  a damped score counter. Audio is the kit Web Audio synth only, unlocked on the
  first pointer gesture.
- HUD is DOM over the canvas; the score counter and target bar are written
  through refs rather than React state so a 120 Hz physics tick never re-renders
  the tree. Coins-used dots, the streak badge and the cover badge are the only
  values on React state and change a handful of times per run.
- Screens: Home draws the board itself as inline SVG with a coin tracing a real
  path down a staggered peg field into the labelled pockets; How to Play is a
  3-beat CSS-animated SVG (drag to aim, release and watch, cover the downside)
  with the goal ladder as chips; Results carries the payout ring against the
  2,500 target and coins/cover-saves/best-streak tiles, matching the
  `{score, coins, shielded, combo}` stats contract.
- Balance gate: four numbers were corrected after headless measurement.
  (1) Boundary rows gained pegs on the two walls — without them a coin reaching
  a side rail slid down an unguarded gutter into the x5 pocket, 15-19% of all
  drops, making the outside of the board the safest place to aim.
  (2) `lateralDrag: 6` / `maxLateralSpeed: 230` were added — upward arcs off peg
  crowns were crossing two or three lanes untouched and the landing distribution
  measured flat (~11% per pocket from a dead-centre drop), i.e. the aim rail did
  nothing; the landing lane is now a bell of sigma ~1.4 lanes around the release
  point. (3) The pocket ladder was rearranged from the obvious
  `[5 3 0 2 1 2 0 3 5]` (295 expected payout per coin from a wall vs 148 from the
  middle — a solved board) to `[5 1 0 2 3 2 0 1 5]` (219 vs 191, and the worst
  aim is the Risk lane itself). (4) `board.maxRowGapFrac` and
  `physics.maxStepFraction` clamp row spacing and per-step displacement relative
  to the lane pitch, so a 430x900 or a 296 px canvas is the same game and cannot
  tunnel a coin through a peg.
- Measured with the shipped values (20,000 runs per profile, seed 0x5eed1234,
  407x612): centre-tap wins 44.4% of runs, casual (middle three lanes) 40.2%,
  spread 45.8% against the 2,500 target; means 2399 / 2347 / 2426. Risk pockets
  take 19.5% of coins from a centre drop and 46.1% of those are rescued by cover,
  so 10.5% of all coins pay nothing. Cover is picked up on 41-50% of drops,
  0.9-1.4 saves per run, best streak averages 7.4 of 10. A run spends 22-26 s of
  the 90 s cap watching coins fall. Casual win rate re-measured at 41.1%
  (407x556) and 36.1% (338x452).
- Verification: `pnpm install` and `pnpm build` both exit 0 (523 modules, 421 kB
  / 141 kB gzip). Emoji-codepoint scan of `src/` and `tools/` finds no
  pictographs — the only non-ASCII are comment box-drawing/em-dashes, UI middots
  and the existing `U+2713` tick in the lead-capture checkbox, which is HTML text
  rather than a sprite. A headless draw harness exercises every pre-render and
  draw function against a stubbed 2D context at five canvas sizes (296x420 to
  430x900) with no non-finite arguments and sane geometry at each.
