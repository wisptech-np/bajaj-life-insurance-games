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

## [2026-07-28] Review fixes: wall-hugging exploit and a one-profile balance gate

Two Important findings from review, both fixed by retuning rather than by
rewording the claims.

**1. Wall-hugging roughly doubled the win rate.** The review measured
aim-lane-0 winning 67.1% at 407x612 and 81.8% at 338x452 against 43.5%/37.5%
for a centre drop, so the shipped `data.js`/README claim that "no single spot
wins the game for you" was false. Nine configurations were measured before
settling:

- Raising or killing wall restitution made it worse or did nothing (72.7% and
  59.9% respectively) — the rail bounce was never the mechanism.
- With Risk pinned at the lanes that make it hittable from the centre (~19% of
  coins), a 9-lane symmetric board forces x5 to sit next to a wall, and 33-40%
  of edge-aimed coins land in the two outermost pockets. Every 9-lane ladder is
  therefore either edge-dominant (up to 59.9% for a wall-hugger) or, mirrored,
  edge-hopeless (0.0-0.3%, which makes the rail a "do not miss the middle"
  test). The lane count was the binding constraint, not the ladder.
- Shipped: **eleven lanes, `[1 1 5 0 2 3 2 0 5 1 1]`** — Home x3 in the centre,
  Education x2 flanking, the two Market Risk x0 bands, the Retirement x5
  jackpots immediately OUTSIDE those bands, and a two-lane Savings x1 gutter at
  each wall. The jackpot is now a narrow target guarded on both sides, and
  overshooting it lands in the gutter.
- Win target moved 2500 -> 2700 to hold casual at ~40% with the new ladder.

Measured at 8,000 runs per profile (407x612 / 407x556 / 338x452): wall 22.4 /
20.2 / 20.5%, lane0 22.2 / 22.3 / 21.9%, lane1 28.6 / 27.4 / 27.0%, lane2 30.9 /
31.3 / 30.9%, centre 35.4 / 34.0 / 34.8%, **casual 40.3 / 38.2 / 37.3%**, spread
32.8 / 32.5 / 31.7%. Casual is now the best line and every edge profile is 10-20
points worse, comfortably inside the <=55% ceiling. Per-lane expected payout is a
dome peaking at 217 against 211 at dead centre and 172 in the gutter, so
best/centre is 1.03-1.05 against the <=1.25 requirement.

**Root cause found while retuning: the board was not size-invariant.** Gravity
and every velocity were absolute px/s while the peg field shrinks with the
screen, so a short handset gave the coin relatively more sideways authority —
an 11-lane board went from a sigma ~2.2-lane bell at 407x612 to an almost flat
distribution at 338x452, and that is why the review's wall-hugging number moved
20 points between the two canvas sizes. Added `physics.refFieldPx` and
`board.velScale = fieldH / refFieldPx`, and scaled gravity, both speed ceilings,
the apex nudge, the spawn velocities and the pocket-entry speed by it. The
landing distributions at 338x452 and 407x612 now agree to within a percentage
point per pocket.

**2. The balance gate only measured one profile at one canvas size.** Added four
edge aim profiles (`wall` at the rail extreme, plus lane 0/1/2 centres), and the
gate now prints every profile at every canvas size and fails unless, at EACH
size, `casual` is inside 30-50% AND every edge profile is at or under 55%. The
target sweep prints all seven profiles too.

Also updated: pocket faces carry short labels (`SAV`/`RET`/`RISK`/`EDU`/`HOME`)
and width-driven type sizes now that eleven pockets are narrower; the Home hero
SVG redraws the 11-lane board with the new ladder; `data.js`, `README.md` and
`okf-brain/wealth-drop/index.md` numbers all regenerated against the final
configuration.

Verification: `pnpm build` exit 0 (523 modules, 422 kB / 141 kB gzip);
`node tools/balance-sim.mjs --runs 8000 --sweep` exit 0, GATE PASS at all three
canvas sizes; headless draw harness clean at five sizes (296x420 to 430x900),
115 pegs, pocket lifecycle firing exactly once per drop; attribution grep zero;
emoji scan unchanged (only the scaffold's U+2713 checkbox tick in HTML text);
kit copies still byte-identical to `shared/game-kit/`.

## [2026-07-31] Contrast revamp, compact HUD, animation-only tutorial, no email

Headline problem: foreground and background sat in the same value band, so the
board was hard to read on a phone in daylight. Measured before touching
anything (sRGB relative luminance, WCAG 2.x ratios):

- lit board mid was **L 0.0382** — a saturated `rgba(38,102,196,0.26)` well over
  `#0B2450`. The peg cores were `#DCEBFF` (**9.85:1** against the board), i.e.
  the scenery was the brightest thing on screen.
- the gold coin measured **1.28:1 against a peg core**, **1.22:1 against the
  Retirement pocket lip** and **1.82:1 against a peg body**. The object the
  player is tracking disappeared exactly where it mattered.
- the cover peg — the one reactable object in the game — measured **2.40:1**
  against the board and **1.76:1** against the peg field.
- text failures: results ring `target N` and the disclaimer at
  `rgba(255,255,255,0.4)` = **3.81:1**; lead-modal subtitle `#9CA3AF` = **2.54:1**,
  consent link `#31CDEC` = **1.90:1**, input placeholder `#CBD5E1` = **1.42:1**,
  error text `#EF4444` = **3.76:1**, submit button white-on-`#31CDEC` = **1.90:1**;
  orange/blue CTA labels at 17-18px were under the WCAG large-text line so
  white-on-`#F26522` (3.15:1) and white-on-`#2C7BF0` (4.04:1) both failed 4.5:1.

What changed:

- `src/data.js` — palette rebuilt as an explicit three-tier value ladder
  (backdrop L 0.008-0.014, structure 0.04-0.12, reactable objects 0.20-0.62) and
  a shared `outline` ink `rgba(3,6,11,0.92)`. Backdrop pushed to `#0A1220` /
  `#0B1526` / `#050A12` with the well alpha down to 0.16 of a desaturated slate:
  lit board mid **L 0.0382 -> 0.0122**. Peg field demoted from `#DCEBFF`/`#6E9DD6`
  to `#93B4D6`/`#3C5C82`. Bucket `colorLt` values relifted; Education moved to
  the game's own accent, teal `#1FA8B8`/`#6FE3F0`. Brand anchors unchanged.
- `src/WealthDropGame.jsx` — every gameplay object now carries a dark rim plus a
  light rim: coin (**13.1:1** rim-vs-body, **9.4:1** rim-vs-peg-core, **14.6:1**
  rim-vs-jackpot-lip), cover peg, pegs, aim marker, pocket faces. Pocket type is
  stroked in the outline ink before it is filled so it survives a payout flash.
  Added a board vignette so the centre column is the lightest backdrop area, and
  darkened/heightened the HUD scrim.
- HUD compacted to icon + number: two 32 px glass chips (coin+payout,
  clock+time), a full-width 6 px target track with a target glyph and the number,
  coin pips instead of an "N coins left" sentence, streak/cover as icon + one
  token. Removed the three stacked label/value panels. Outcome banner reduced
  from a three-line panel to one 38 px chip. One spacing scale (4/8/12/16)
  across the whole overlay. Floating `+N` at the pocket was already in place.
- `src/Screens.jsx` — **How to Play is now animation only** (G2): one looping 4 s
  CSS/SVG demo where a finger glyph drags the aim rail, lifts, and the coin drops
  from that exact x, grazes the cover peg (which flares and hands it a shield
  ring) and lands in the x5 pocket for a floating `+500`. All instruction
  paragraphs, the bucket-ladder chips and the numbered steps are gone; the only
  text left is the heading, three icon-led two-word labels and the Play button.
  Fits 360x640 with `overflow: hidden`. Results screen keeps the guardian-shelter
  structure (count-up, r75 ring, confetti, share, glass action card, ghost
  Play again, disclaimer) with corrected values and one shared 52 px button
  height at 19 px/900 — which is what puts brand orange over the large-text line.
- `src/LeadCaptureModal.jsx` — **email removed** (G1): `EMAIL_RE`, the state, the
  field block, the validation branch, both `sessionStorage` reads/writes of
  `lastSubmittedEmail`, and the key from `submitToLMS` and `onSubmitted`.
  `api.js` untouched — it already sends `email_id: ''`. Repo grep for
  `email` under `src/` outside `api.js`/`kit/` returns only the explanatory comment.
- `src/index.css` — lead/slot modal recoloured off the failing cyan onto brand
  blue (`#31CDEC` -> `#1E6BE0`, `#0096C7` -> `#003DA6`), subtitle `#5B6472`,
  placeholder `#6B7280`, error `#C22B2B`.
- `wealth-drop/asset-from-here.md` — 12 Nano Banana prompts, each restating the
  three-tier value ladder and the dark-rim requirement so generated art keeps
  the fix.

After: 54/54 measured pairs pass — body text >= 4.5:1 (lowest 4.91:1, the
disclaimer lead-in), large text and meaningful icons >= 3:1 (lowest 3.15:1,
white on brand orange at 19px/900, and 3.73:1 for the cover-peg rim against the
peg field). Object separation: coin 10.9:1 against the board and never below
9.4:1 at its own rim; cover peg 4.2:1 body / 13.0:1 highlight; risk pocket
4.5:1; aim marker 6.5:1.

Verification: `pnpm install` + `pnpm build` exit 0 (523 modules,
425.75 kB / 141.51 kB gzip). `node tools/balance-sim.mjs --runs 1500` GATE PASS
at all three canvas sizes (casual 37-39%, best edge 30.7%) — physics and the
`PURE-PHYSICS` region were not touched.
