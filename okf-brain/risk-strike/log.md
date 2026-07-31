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

## [2026-07-31] UI revamp: impact identity, compact HUD, animation-only tutorial

- **Own identity.** The game now owns ignition orange `#FF6A1A` (hot core
  `#FFE0B8`) as its accent and *concentric rings* as its shape language: timing
  rings around a ball at rest, shockwaves at every point of contact, target
  rings on the arena wall, the pocket ring on the deck, the ring glyph in the
  HUD, the score ring on Results. No other game in the catalog leads on that
  pair, which is what stops these screens reading like their neighbours.
- **Figure/ground rebuilt.** Ground dropped to near-black `#050912` across
  `App.jsx`, `Screens.jsx` and the canvas; the lane went from a mid-blue
  `#2B5FA6` — which sat at almost the same value as the ball — down to
  `#1B2C4E`/`#070D1B`. The arena behind the deck is now one soft bloom and a
  dark masking slab instead of two pulsing light bars, so the only high-value
  things on screen are the green bottles, the blue ball and the orange impact.
- **Every object redrawn with depth.** The pin sprite gained a directional
  shade across the belly plus two rim lights (cool `#C6FFB4` key, warm
  `#FF6A1A` fill) inside the silhouette and a dark contour outside it; the ball
  swapped its flat full-circle outline for two partial rim-light arcs; the
  aiming arrows became open chevrons; the foul line became a lit gradient bar.
  All programmatic — no images, no emoji.
- **Compact HUD.** The two labelled panels and the six-row scorecard card are
  gone. There are now three glyph-plus-number chips at 32 px (impact burst +
  score, bottle + risks down, clock ring + seconds) and one 22 px five-cell
  frame strip showing marks only. No word labels, no frame/ball sentence, no
  pins-out-of-total sentence. Spacing runs on one 5/10/16/22 scale.
- **Power meter moved to the point of action.** The vertical bar bolted to the
  right edge was deleted; power is now the ring that fills clockwise around the
  ball itself, going hot past 86%. Same information, no static panel, and it is
  the game's own ring language doing the work.
- **Impact feedback made heavy.** Pooled shockwave rings (`createRings` /
  `spawnRing`, cap 10, zero per-impact allocation) drawn as flattened ellipses
  on the lane plane under the pins, a full-screen flash tinted per event
  (orange on contact, hot white on a strike, red on a gutter), one frame of
  hit-stop on the first heavy contact of each throw, and shake scaled by
  impulse. Floating `+N` now spawns at the centroid of the pins that actually
  went down rather than at the middle of the screen.
- **G1 — email removed** from `src/LeadCaptureModal.jsx`: `EMAIL_RE`, the state,
  the field block, the validation branch, both `sessionStorage` reads/writes of
  `lastSubmittedEmail`, and `email` from the `submitToLMS` and `onSubmitted`
  payloads. `api.js` untouched (`email_id: email || ''` keeps the LMS shape).
- **G2 — How to Play is animation only.** The three numbered instruction beats
  and the win-condition paragraph are gone. One 3.2 s looping SVG shows a thumb
  glyph flicking up the lane with a curl, the ball following that exact curl,
  contact throwing a shockwave and a flash, the rack going down and the strike
  mark landing. Text on the screen is the heading, three glyph-led labels
  ("Flick up", "Curl to hook", "Clear all ten") and the Play button.
- **Home and Results restyled** to match. Home leads with a stacked wordmark
  inside two expanding shockwave rings over the same demo loop; Results keeps
  the repo-standard structure from `guardian-shelter/src/Screens.jsx` (count-up
  score, r=75 progress ring, confetti on win, Share, glass card with Book a
  Slot + Call Specialist, ghost Play again, disclaimer) with the new palette.
- **Contrast fixed.** `inkDim` raised 0.62 -> 0.72; stat-tile labels 0.5 -> 0.74;
  the POINTS caption 0.55 -> 0.76; the disclaimer block 0.40 -> 0.62; spare
  marks moved off `#2E7BF0` (4.2:1) to `#9CC6FF`; risk-label plates on the
  playfield taken to 92% opaque so body text clears AA over the bloom.
- **G3** — `risk-strike/asset-from-here.md` written: 14 Nano Banana prompts
  (arena, lane bed, ball, standing pin, falling-pin strip, shockwave, timing
  ring, power ring, chevrons, three HUD glyphs, two result marks), each with the
  two-light rule and the orange/ring identity that separates them from the other
  games' sheets.
- **No gameplay change.** `physics.js` untouched; every number under `flick`,
  `pins`, `winPins` and `scoreMultiplier` is as the balance sim set it. The only
  `data.js` edits are the palette and a new `fx` block for the ring/flash
  timings.
- **Verified:** `pnpm install` then `pnpm build` exits 0 — `built in 4.45s`,
  `dist/assets/index-*.js 436.48 kB / gzip 145.01 kB`.
