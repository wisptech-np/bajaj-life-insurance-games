---
type: project
title: SIP Stack
description: Ketchapp-Stack-style timing tower — a SIP slab slides on a linear track, tap to drop it, overhang shears off, 30 layers = the Retirement Corpus summit. Perfect streaks regrow the slab (+12% of original width from the 3rd consecutive perfect), so consistency visibly repairs old mistakes.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/sip-stack/
tags:
  - game
  - stack
  - timing
  - one-tap
  - sip
  - retirement-corpus
  - canvas
  - react
  - vite
timestamp: 2026-07-29
---

# SIP Stack

Timing-tower game (port **5074**). A pseudo-3D SIP slab slides above the tower
on a LINEAR back-and-forth track (constant speed within a slide); TAP — judged
at the `pointerdown` timestamp — drops it. Overlap survives, overhang shears
off as a physics chunk. Camera rises one block-height per placement (250ms
lerp), background hue drifts ~3° per layer, every 6th layer is a milestone
banner (SIP Year 1 → Retirement Corpus).

- Win: 30 layers. Lose: total miss or kept width < 8px. No timer — the speed
  ramp (traverse 1.6s → 1.35s @11 → 1.1s @21) bounds the session.
- Perfect: offset ≤ max(12px, 10% width) → snap, ring flash, rising note
  ladder; from the 3rd consecutive perfect the slab regrows +12% of original
  width per perfect, capped at original.
- Score: +1 per block, +2 per perfect; 3★ = win with ≥15 perfects; best run
  persisted in localStorage with a delta line on the results screen.
- Anti-exploit: one drop per slab, 200ms spawn input lock, and the repo-wide
  pause-scum fix — on visibility-resume the world stays frozen behind a 3-2-1
  re-acquire countdown AND the slab phase/direction are re-randomised.
- Standard scaffold: guardian-shelter screen flow, LMS lead capture + slot
  booking, playCount, shared game-kit copied byte-identical to `src/kit/`.
