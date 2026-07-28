---
type: log
title: Milestone Hopper Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/milestone-hopper/log.md
timestamp: 2026-07-28
---

# Milestone Hopper Change Log

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
