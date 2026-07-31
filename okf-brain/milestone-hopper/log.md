---
type: log
title: Milestone Hopper Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/milestone-hopper/log.md
timestamp: 2026-07-28
---

# Milestone Hopper Change Log

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
