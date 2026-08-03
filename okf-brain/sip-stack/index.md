---
type: project
title: SIP Stack
description: One-tap timing tower where the tower is a corpus, not a pile. A SIP slab slides on a linear track, tap to drop it, the overhang shears off, 40 layers = the Retirement Corpus summit. Score is the future value of the SIPs already stacked (corpus = corpus x 1.06 + contribution per layer), so an early surviving layer ends the run worth ~9.7x a late one — and the blocks visibly ripen from brand blue to gold as they compound.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/sip-stack/
tags:
  - game
  - stack
  - timing
  - one-tap
  - sip
  - compounding
  - retirement-corpus
  - canvas
  - react
  - vite
timestamp: 2026-08-03
---

# SIP Stack

Timing-tower game (port **5074**). A pseudo-3D SIP slab slides above the tower
on a LINEAR back-and-forth track; TAP — judged at the `pointerdown` timestamp —
drops it. Overlap survives, overhang shears off as a physics chunk.

## Geometry contract (the 2026-08-03 fix)

`src/stack.js` `slabFaces()` is the only description of a block's shape, the
component fills exactly those polygons, and the drop is judged on exactly the
same `[x, x + w]` footprint. `scripts/balance.mjs` PASS 1 asserts the two
bounding boxes are identical at every width the rules can produce. Before the
contract existed the top and side faces ran to `w + slabShear`, so every block
was **drawn 10 logical px wider than it collided** and a drop that visibly
landed on the block was scored as hanging off it.

## Rules

- Win: 40 layers. Lose: total miss or kept width < 12px — the tower then shears
  at its narrowest recent layer (`weakestRow`) and everything above topples.
- Speed is **px/s, constant within a layer** (traverse 2.3 → 2.0 → 1.7 → 1.45s
  for a full-width track), so a narrow tower crosses its shorter track faster.
  Deriving speed from the live track made narrowing *easier* and nobody lost.
- Perfect: offset ≤ max(3px, 4% width) → snap, ring flash, rising note ladder;
  from the 3rd consecutive perfect the slab regrows +7% of original width.
- The slab track is clamped to the canvas (`trackEdgePx`) and the start width is
  31.5%, so the whole sweep is always visible. It used to run ~100px off screen.

## Compounding

Score is not a placement counter — it is the SIP annuity recurrence
`corpus = corpus x (1 + 0.06) + contribution` per placed layer, where the
contribution scales with the footprint the drop kept. Visible as: age-driven
block hue (brand blue → gold), a gold growth wave washing down the tower on
every placement, two floating numbers per drop (instalment and growth earned), a
`corpus` + `x invested` HUD, a right-edge progression rail with milestone dots,
and a result screen that puts the player's first layer next to their last.
Milestones every 8th layer (SIP Year 1 → Retirement Corpus). Indicative points,
not a return projection.

- Anti-exploit: one drop per slab, 200ms spawn input lock, and the repo-wide
  pause-scum fix — on visibility-resume the world stays frozen behind a 3-2-1
  re-acquire countdown AND the slab phase is re-randomised.
- Standard scaffold: guardian-shelter screen flow, LMS lead capture (Name +
  Mobile only) + slot booking, playCount, shared game-kit copied byte-identical
  to `src/kit/`.
