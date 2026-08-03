---
type: log
title: Milestone Hopper Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/milestone-hopper/log.md
timestamp: 2026-07-28
---

# Milestone Hopper Change Log

## [2026-08-03] Review response — jump responsiveness, milestone progression, asset pass

Review: *"overall quality below the expected standard. Improve character
movement and jump responsiveness. Add stronger progression and milestone-based
rewards. Upgrade environmental assets, animations, obstacles, and visual
effects. Make the insurance or financial milestone concept more prominent."*

### Defects found

- **D1 — every hop waited for the finger to lift.** The hop was bound to the
  kit's `onTap`, which fires from `createInput`'s *pointerup* handler
  (`src/kit/input.js:110`). A 60-150 ms finger contact was charged to every
  input in the game, on top of a 120 ms hop tween: more than half the perceived
  latency was the input contract, not the physics. `onDown` was being used only
  to unlock audio and hide the hint.
- **D2 — one gesture could fire two hops.** With the hop moved to pointerdown,
  the still-wired `onSwipe` (also pointerup) fired a second one. Measured on the
  headless random bot this halved survival; for a human, any tap with a little
  drag in it moved two rows.
- **D3 — the input buffer held one slot, first-wins.** A double-tap to cross a
  lane in one committed move lost its second tap.
- **D4 — `hop.arcHeight` was an absolute 14 px.** That is 30% of a cell on a
  320 px handset and 24% on a 412 px one: the same hop read as a jump on one
  phone and a slide on the other.
- **D5 — landing inside a debt weight was an unavoidable death.** Nothing
  checked the destination cell's occupancy, so a blind forward hop onto an
  expense lane had a ~35% chance of arriving inside a weight already sitting
  there. No counterplay exists at the moment of commit. This was ending
  random-input runs in **2-5 s**.
- **D6 — the tide retro-killed legal hops.** `advanceTide` measured the player
  at `effRow()`, which reports the cell *left behind* for the first half of a
  hop, so the last-moment escape hop died about half the time it was made.
- **D7 — a milestone was a caption on a green band.** +300 and a name. No
  reward, no financial quantity, no reason the theme was not a skin.
- **D8 — the debt weight read as a HANDBAG.** Trapezoid body plus an arched
  lifting bar over the top. Confirmed on the 390x844 screenshot.
- **D9 — one obstacle, forty-eight rows of the same three blues and one
  maroon.** No environmental progression across a course that is meant to be a
  working life.
- **D10 — sprites overflowed their bands.** (Introduced and caught inside this
  pass.) Weight height derived from sprite *width*; the ~2-cell EMI block came
  out 1.6x the row height, so two consecutive expense lanes merged on screen
  into one undifferentiated wall of ember.

### Movement and responsiveness

- Direction is now resolved on **pointerdown**, from where the thumb landed:
  the outer `input.sideZoneFrac` (24%) of the width each side hops sideways, the
  middle 52% hops forward. Zones mean nothing has to wait for a gesture to
  disambiguate. Input-to-motion latency went from *finger-contact duration*
  (60-150 ms) to the same frame. (D1)
- `onSwipe` unwired — one gesture, one hop. The backwards hop went with it; the
  course only scrolls forward and the tide is behind you, so retreating is never
  the play. (D2)
- `hop.bufferDepth: 2`, newest-intent-wins. (D3)
- `hop.seconds` 0.12 -> 0.115; `hop.arcHeight` (14 px) -> `hop.arcCellFrac`
  (0.5 of a cell), so the arc reads identically at 320 and 412 px and reads as a
  hop rather than a slide. Two analytic after-image ghosts on the arc (no
  history buffer — the arc is a pure function of `hopT`), honouring
  `budget.trailPoints` so reduced-motion and low tiers get none. (D4)
- A hop whose destination cell a weight will occupy **at landing time** is
  rejected with the bump a planter already gets, instead of killing you. (D5)
- `hop.coyoteRows`: while airborne the tide measures the *further* of the two
  cells. (D6)
- The loop was already `createGameLoop({ stepMode: 'fixed' })` at 1/120 s —
  verified, unchanged.

### Progression and rewards

`GAME_CONFIG.milestones` is now a table of six named life goals, each with a
rupee corpus (`milestoneRows` is derived from it so the gate table has one
source of truth). Landing on a gate banks the corpus and pays three rewards:

| Reward | Value | The point it makes |
| --- | --- | --- |
| Cover renewed | shield restored | your policy renews at every life stage |
| +8 s | `rewards.timeSeconds` | protection buys back time |
| x0.25 earnings | `rewards.multiplierPerMilestone` | a secured goal compounds everything after it |

A full run banks **Rs 2.65 Cr** (5 L / 10 L / 25 L / 50 L / 75 L / 1 Cr) and
finishes on x2.50. The run also **starts covered** (`pickups.startWithCover`) —
the concept the game is making, and the cheapest fix for a first-timer whose
blind first hop used to end the session in three seconds.

Surfaced everywhere: a live gold corpus chip under the milestone rail counting
"Rs X of Rs 2.65 Cr"; a multiplier chip that appears on the score chip only once
a gate raises it; a gate banner carrying the goal name, the corpus pill and the
three reward pills; three staggered floats at the point of action; and on
Results a corpus hero with a progress bar, an Earnings tile, and gate chips that
each carry the corpus they bank so an unreached gate reads as money left on the
table. Home leads with "6 goals - Rs 2.65 Cr cover"; the share message leads
with the corpus. `stats` gained `corpus` and `multiplier`. (D7)

### Assets, obstacles, effects

- **Hazard rebuilt.** The arched lifting bar is gone — that bar was the handbag.
  It is now a chamfered cast-iron ledger block: wider than tall, flat-bottomed,
  corner rivets, hot top rim, dark undercut, recessed face plate. (D8)
- **Second obstacle type.** `roads.heavyChance: 0.34` of lanes carry one or two
  **EMI blocks** — 1.95 cells wide, 60% speed, own hit box (`heavyHitCells`),
  stacked cap and an instalment tally. A small weight is a timing problem; a
  wide slow block is a positioning problem. Lane spacing uses the lane's own hit
  width, so the heavy lane is different, not quietly harder. (D9)
- **Sprite height now comes from the band, not from the sprite width.** (D10)
- **Milestone gates are built gates**: a post at each screen edge, a three-pass
  gold arch between them, the goal name, a corpus pill, a green + tick state
  once passed, an approach glow over `fx.gateGlowRows`, and a gold/green ground
  shockwave on bank. Everything is drawn *inside* the band — an arch that rose
  above it would paint over the two rows past the gate, which are live gameplay.
- **`SEG_WASH`** — a per-8-row climate wash over each band's top face. The
  course walks from cold pre-dawn blue at Graduation to warm gold dusk at
  Retirement. One low-alpha `fillRect` per visible row, no extra bitmaps. (D9)
- **Coins carry a stroked rupee mark** (`rupeeMark()`, paths not glyphs, so no
  font dependency and no non-ASCII in the canvas layer), squashing with the spin
  and dropped below 0.35 of the spin where it would smear.
- A rupee mark was **tried and cut** on the obstacle face plates: at ~10-13 px
  the four strokes smear into an arrow. They carry the game's inverted chevron
  instead — pointing back down-course, the inverse of the gold gate, platform
  and hopper chevrons, so direction alone still separates help from harm.
- The hopper gained a hard dark separation ring: blue on blue pavement, it
  dissolved into the band at handset size.
- The arrears tide's tumbling silhouettes follow the new block shape.

### Refactor

Course generation (`mulberry32`, `segOf`, `spreadStandable`, `pickTreeCount`,
`makeRoadLane`, `makeRiverLane`, `buildCourse`) moved out of the component into
`src/course.js` — pure, no React/canvas/kit — so `scripts/balance.mjs` measures
the generator the game actually ships instead of a hand-copied twin.

### Verification

- `npx vite build` — exit 0, `built in 5.26s`. gzip **147.96 kB** JS (was
  **144.83**), 6.77 kB CSS (unchanged), 0.45 kB HTML. **+3.13 kB gzip** for the
  progression system, the second obstacle type, the gate art and the rupee/
  chevron marks.
- `node scripts/balance.mjs --courses 200` — **PASS**. Win rates
  58.5% / 73.0% / 63.0% (casual / brisk / careful) against 46.0% / 56.0% / 46.5%
  on `--baseline` (same bots, same seeds, pre-pass knobs). Casual median 46 -> 48
  rows; average winning score 2,895 -> 3,500. Worst standing window across every
  generated lane 1.20 s; 0 unreachable rows in 2,880; tide deaths 1.5-2.0% for
  moving players. `RESULT_TARGET_SCORE` recalibrated 2800 -> 3900.
- `node scripts/play-test.mjs milestone-hopper --all-sizes` — no console or page
  errors at any size, canvas mounts and paints 100% of sampled pixels, results
  screen and retry path work at all four sizes, exit 0. Random-bot survival on
  the final build: **13/11/17/28 s**; across four runs during the pass
  (16 samples) the median is **~15 s** against a pre-pass baseline of
  6/16/9/8 s (median 8.5 s).
- Screenshots read at 320x568, 390x844, 412x915 and 412x700. Two iterations came
  off the screenshots: the sprite-height overflow (D10) and the smeared rupee
  mark on the obstacle plates.
- No `email` outside `src/api.js` (kept for the LMS payload shape). Non-ASCII in
  game source is typographic and currency only — no emoji.

### Not done

- The safe-row planter still reads as a blue mushroom rather than a planter. Out
  of scope for the named defects, and it is unambiguously an obstacle in play.
- `scripts/balance.mjs` reimplements the component's update order rather than
  importing it; only course generation is shared. Welding the physics loose from
  the canvas would be a much larger refactor than this review asked for. The
  risk is noted at the top of the script.

## [2026-07-31] Revamp — new hazard, new visual identity, animation-only tutorial

- **Replaced the green virus hazard with a DEBT WEIGHT.** The virus/germ motif is
  reused across several games in the repo and read generic; the new hazard is a
  squat cast-iron ingot — bottom-heavy trapezoid, lifting bar over the top,
  recessed plate with inverted ember chevrons, molten seam through the middle —
  drawn programmatically in `makeWeight()`. Motion is heavy rather than alive: it
  rocks on its base, sinks on each rock and drags an ember scrape behind it in
  its direction of travel, instead of spinning with a pulsing eye. Every sprite,
  particle colour, tide silhouette and identifier moved with it
  (`makeVirus`→`makeWeight`, `drawVirusSprite`→`drawWeight`, `checkViruses`→
  `checkWeights`, `s.virus`→`s.weight`, cause `'virus'`→`'debt'`,
  `roads.maxViruses`→`roads.maxWeights`, dead `roads.virusCells`→ live
  `roads.weightCells` now driving the sprite width). Zero `virus` tokens remain
  in game source or README.
- **Fixed the palette's core conflict.** Green was doing double duty as both
  "milestone reached" and "this kills you". Risk is now ember-only
  (`#D0421F` / `#FF8A3D`), the uncertainty rivers went cold slate, and green is
  reserved exclusively for a gate already passed. The arrears tide (formerly the
  green risk tide) is ember smoke with tumbling weight silhouettes.
- **Own shape language: the chevron, always pointing up-course.** It is the
  hopper's chest crest, the milestone gate marks, the safe-platform footprint
  mark, the expense-lane road markings and the HUD score mark. The hazard is the
  only thing carrying an inverted chevron, so direction alone separates help
  from harm.
- **Compact HUD.** The two stacked label+value panels and the 176 px progress
  panel are gone. Top row is now two 28 px chips of icon + number only (chevron +
  score, stopwatch + seconds). Row progress became a hairline rail with six
  milestone notches and no text at all; the row counter survives only as an
  `sr-only` node for assistive tech. Cover and tide indicators are 28 px icon-only
  badges. The milestone banner shrank from a 3-line panel to a slim gold gate
  pill — the `+300` it used to carry is already floating at the point of action
  via `fx.floatText`.
- **Depth pass on the art.** Added a cool radial bloom and an edge vignette over
  the sky; side-lit gradient plus a hard rim light and a dark contact edge on the
  hopper; specular rim and chevron mark on the coverage platforms; ember chevron
  markings and a warm wash on the expense lanes; a gold double rule, warm
  gradient and flanking pulsing chevrons on the milestone gates.
- **G1 — email removed** from `LeadCaptureModal.jsx`: `EMAIL_RE`, the `email`
  state, the field block, the validation branch, both `lastSubmittedEmail`
  sessionStorage calls, and `email` from the `submitToLMS` and `onSubmitted`
  payloads. `api.js` untouched — `email_id: email || ''` keeps the LMS shape.
- **G2 — How to Play is animation only.** One 4 s looping SVG demo of the real
  mechanic: a finger glyph taps, a ripple fires, the hopper hops onto the expense
  lane between two debt weights phased to sweep just before it lands and just
  after it leaves, then onto the pavement and onto the gold gate, which lights up
  and floats `+300`. All instruction paragraphs deleted; the only remaining text
  is the heading, three icon-led labels ("Tap to hop", "Dodge debt", "Reach
  gates") and the Play button.
- **G3 — `milestone-hopper/asset-from-here.md`** written: 14 Nano Banana prompts
  covering the hopper, the debt weight, all four band types, the coverage
  platform, the planter blocker, the coin/cover pair, the three background
  layers, the arrears tide, the HUD icon set, and both result-screen heroes.
- Home and Results restyled to match (gate-count badge, chevron score mark,
  chevron gate chips, ember "Run ended" mark). Results keeps the repo-standard
  structure: count-up score, r=75 SVG ring, confetti on win, Share Score, glass
  Book-a-Slot / Call-Specialist card, ghost Play again, disclaimer footer.
- Verified: `pnpm install && pnpm build` exit 0 (`✓ built in 2.28s`). No `virus`
  or `email` references left outside `src/kit/` and `src/api.js`; the only
  non-ASCII glyph in game source is the `✓` checkbox tick, which G4 allows.

## [2026-07-28] Gameplay implementation

- Built the full lane-hopper per spec: seeded 48-row course generation (lane
  types on a per-segment difficulty ramp, safe-row planters verified against the
  previous row's standable set, river banks and a road-run cap, coins on ~15% of
  open safe cells, one cover token per 8-row segment), a 120 ms hop tween with a
  parabolic arc and one buffered input, wrapping virus lanes, drifting coverage
  platforms with carry and fall, the rising risk tide, six milestone banners, and
  the Retirement win state at row 48.
- Rendering is flat-shaded pseudo-3D: each row is a band with a lit top face, a
  darker front face and a shadow along its top edge, pre-rendered to one offscreen
  canvas per lane type and blitted. Planters, viruses and coverage platforms are
  pre-rendered sprites; the guardian, coins, tokens and the fog wall are drawn
  programmatically. All art is canvas or inline SVG — no emoji sprites, no image
  files. Audio is the kit Web Audio synth, unlocked on the first pointer gesture.
- Juice via the shared kit: pooled particles (>= 8 on collect and on landing, 18
  on a hit), floating score text, screen shake and hit-stop when cover is spent,
  squash on landing, dust on take-off, an idle bob, pulsing cover tokens and
  coins, a live eye-glow on every virus, animated score counter and animated
  screen transitions.
- HUD is DOM over the canvas; the score counter and row readout are written
  through refs rather than React state so a 120 Hz physics tick never re-renders
  the tree. Milestone dots, a cover badge and a risk-tide chevron are the only
  values on React state, and they change a handful of times per run.
- Screens polished: Home draws the course itself as a receding stack of
  flat-shaded slabs with a hopping guardian, a streaming virus and the tide
  creeping in; How to Play is a 3-beat CSS-animated SVG (tap hop, dodge virus,
  milestone banner) with minimal copy; Results carries a score ring,
  rows/coins/milestones tiles, six milestone chips and Book a Slot / Retry / Home.
- Balance: four GAME_CONFIG readings were corrected after a headless simulation
  of the exact update order showed the literal readings make the course a coin
  flip rather than a crossing — lane spacing authored in seconds of standing room
  rather than cells, a virus wrap cycle decoupled from the screen width, a cap of
  three consecutive road rows, and an invulnerability window on the cover token.
  Documented in the game README under "Balance notes".
- Verified: `pnpm build` exit 0; `node scripts/sync-game-kit.mjs --check` reports
  the kit copy up to date; no emoji codepoints in any game source; 200-course
  simulation confirms row 48 is reachable in 8-33 s against a 120 s budget, the
  tide catches only idlers, and every road lane at every segment leaves at least
  1.20 s of standing room.
