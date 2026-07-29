# SIP Stack

Ketchapp-Stack-style timing tower for Bajaj Life Insurance. A SIP slab slides
above the tower on a linear back-and-forth track — TAP to drop it. The overlap
with the block below survives; the overhang shears off and tumbles away. The
shrinking footprint IS the health bar. Reach **30 layers** to build the
Retirement Corpus summit.

## Financial hook

*Every layer is a monthly SIP — place it with discipline and watch the corpus
rise; consistency even repairs old mistakes.* Perfect streaks of 3+ regrow the
slab by +12% of its original width per perfect (capped at the original), so
skilled, consistent play visibly undoes past trims. Every 6th layer is a life
milestone: SIP Year 1 → SIP Year 5 → Home Goal → Education Goal → Retirement
Corpus.

## Controls

- **TAP** anywhere to drop the sliding slab. That's the whole game.
- Drops are judged on the `pointerdown` timestamp (never `click`), with the
  slab position extrapolated to that exact instant — input latency never eats
  a perfect.
- Exactly one drop per slab; input is locked for 200ms after each placement.

## Rules & scoring

| Rule | Value |
| --- | --- |
| Win | 30 slabs placed |
| Lose | Total miss, or kept width < 8px |
| Perfect window | offset ≤ max(12px, 10% of current width) → snap, no trim |
| Streak regrowth | from the 3rd consecutive perfect: +12% of original width per perfect |
| Score | +1 per block, +2 extra per perfect |
| 3★ | win with ≥ 15 perfects |
| Speed | traverse 1.6s (layers 1–10) → 1.35s (11–20) → 1.1s (21–30); never changes mid-slide |
| Best run | persisted in `localStorage`; results screen shows the delta |

No timer — the speed ramp bounds the session at roughly 60–100 seconds.

Anti-pause-scum: the game auto-pauses when the tab is hidden; on return the
world stays frozen behind a 3-2-1 re-acquire countdown and the slab's phase and
direction are re-randomised, so pausing yields zero aiming information.

## Tech

- Standalone Vite + React 18.3.1 app (no workspace), canvas renderer,
  fixed-step loop from the shared game-kit (`src/kit/`, byte-identical copy).
- Web Audio synth only (no audio files); AudioContext unlocked on first gesture.
- Blocks are programmatic pseudo-3D slabs (top + front + side faces with
  gradient shading and soft drop shadow) — no emoji sprites.
- Lead capture → LMS, slot booking, and play-count wiring per
  `okf-brain/GAME_STANDARD.md` §2.

## Dev

```bash
cd sip-stack
pnpm install
pnpm dev      # http://localhost:5074
pnpm build    # uat build (the verification gate)
```

Dev server port: **5074**. All gameplay tunables live in `src/data.js`
(`GAME_CONFIG`).
