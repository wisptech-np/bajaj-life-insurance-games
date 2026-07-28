---
type: log
title: Risk Strike Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/risk-strike/log.md
timestamp: 2026-07-28
---

# Risk Strike Change Log

## [2026-07-28] Gameplay implementation

- Scaffolded from `guardian-shelter/` per GAME_STANDARD §1 (identical `api.js`,
  `playCount.js`, `crypto.js`, `shortener.js`, modals and screen flow), with the
  Risk Strike identity applied: package `risk-strike`, rollup output
  `RiskStrike`, dev port **5054**, `LEAD_NO_KEY = 'riskStrikeLeadNo'`,
  `summaryDtls = 'Risk Strike Lead'`. Zero references to the source game remain
  in `src/`.
- Built the full flick-bowling game per spec: a 2D lane-plane simulation
  (`src/physics.js`) with ball-pin and pin-pin circle collisions, restitution,
  tangential friction, kickback plates beside the deck, a topple test on both
  speed and displacement, and a fall window during which a toppled pin keeps
  hitting its neighbours — that window is the chain reaction. Gutters take the
  ball out of play. Five frames of two balls with real strike/spare bonuses and
  the real 10th-frame fill-ball rule, a 120 s cap where unthrown frames score
  zero, and score = bowling total x 10.
- The gesture: pointer samples are kept in a preallocated ring, and at release
  the speed over the last 110 ms is the power, the direction is the line, and
  the turn between the first and second half of the swipe is the hook. While the
  thumb is down a dotted preview — truncated at the arrows, not at the pins —
  and a live power meter show what the current flick would deliver.
- Rendering is pseudo-3D from a single pinhole camera solved at resize: one `k`
  per lane distance scales x, sizes sprites and gives the screen y. The lane is a
  gradient-filled trapezoid with board seams, a broad specular sheen, two
  travelling highlights, arrows and a foul line; pins and ball are reflected in
  it. The pin is a virus bottle rasterised once per resize to an offscreen canvas
  (spiked belly, cover band, dark core) and blitted; the ball, its trail, the
  labels and the hall behind the deck are drawn programmatically. All art is
  canvas or inline SVG — no emoji sprites, no image files. Audio is the kit Web
  Audio synth, unlocked on the first pointer gesture; the crowd swell on a strike
  is a scheduled sequence of kit voices driven from the game loop rather than
  setTimeout, so it pauses when the game does.
- Juice via the shared kit: pooled particles (10 on a ball-pin impact, 12 per
  toppled pin, 34 across three bursts on a strike), floating pin-count text,
  screen shake scaled by impact strength, hit-stop on a strike, a rack that
  springs down on every new frame, a breathing ball while it waits to be thrown,
  a gutter wobble with its own banner, animated score counting and animated
  screen transitions.
- HUD is DOM over the canvas: the score counter and pin tally are written through
  refs so a 120 Hz physics tick never re-renders the tree; the five-frame
  scorecard, the frame/ball readout and the banner are React state and change a
  handful of times per run.
- Balance: `scripts/balance-sim.mjs` imports the shipped `physics.js` and
  `data.js` and steps the same fixed 120 Hz tick, so the gate measures the game
  rather than a model of it. Four corrections came out of it — kickback plates
  (without them a perfect pocket hit strikes 15% and the corners are
  unreachable), the aim gain that folds a thumb swipe into the lane's sub-3-degree
  spread, release and rack noise so identical inputs are not identical racks, and
  `winPins: 44` from the measured distribution.
- Verified: `pnpm install` and `pnpm build` exit 0; no emoji codepoints anywhere
  in the game's own source (the one `✓` is the scaffold's T&C checkbox glyph in
  HTML text, identical to every other game in the catalog and allowed by §8.3);
  zero source-game attribution strings in `src/`; every `cfg.*` and `COLORS.*`
  reference in the game and physics resolves against `data.js`; and the balance
  sim over 1,500 sessions per profile reports a centred flick knocking 8-9 pins,
  a 30-35% pocket strike rate against 1% dead centre, gutters on bad angles, a
  42.0% casual win rate at the shipped target, and 53-63 s used of the 120 s
  session.
