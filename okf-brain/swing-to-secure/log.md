---
type: log
title: Swing to Secure Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/swing-to-secure/log.md
timestamp: 2026-07-28
---

# Swing to Secure Change Log

## [2026-07-28] Gameplay implementation

- Built the full rope-swing game per spec: procedural 24,000 px course (anchors
  on a widening gap ramp, coins on the ideal flight arc, risk orbs at a rising
  density, shield tokens on a 600 px pitch), two-state physics (projectile /
  rigid pendulum), grab assist with a 0.12 s input buffer, Perfect Release
  scoring, circle-circle collisions, damped horizontal camera with two
  pre-rendered parallax rock layers, five milestone banners, and the vault
  win state.
- Juice via the shared kit: pooled particles (>= 8 per collect, 18 on a hit),
  floating score text, screen shake and hit-stop on damage, squash on grab,
  spawn scale-bounce as entities enter view, cape trail on the device trail
  budget, pulsing in-range pylons, animated score counter, animated screen
  transitions. All art is programmatic canvas or inline SVG — no emoji sprites,
  no image files. Audio is the kit Web Audio synth, unlocked on first pointer
  gesture.
- HUD is DOM over the canvas; the score counter and distance readout are written
  through refs rather than React state so a 120 Hz physics tick never re-renders
  the tree.
- Screens polished: Home rope-swing SVG motif with an animated title, How to Play
  as a 3-beat CSS-animated SVG diagram (hold -> swing -> release), Results with
  score ring, distance/coins/milestone tiles, milestone chips and Book a Slot /
  Retry / Home. Residual "Guardian Shelter" copy retitled; the lead-flow files
  (api.js, SlotBookingModal.jsx) were deliberately left verbatim.
- Balance: three GAME_CONFIG readings were corrected after a headless simulation
  of the exact physics loop showed the literal readings make the vault
  unreachable — damping applied per second rather than per fixed step, a 120 px
  grab assist while descending, and an opening swing impulse. Documented in the
  game README under "Balance notes".
- Verified: `pnpm build` exit 0; `node scripts/sync-game-kit.mjs --check` reports
  the kit copy up to date; no emoji codepoints used as sprites.
