# Risk Slash

Fruit-Ninja-style swipe slicer for Bajaj Life Insurance. Green **risk orbs** —
Scam Call, Hidden Fees, Debt Trap, Inflation, Medical Bill, Impulse Buy, each a
distinct spiky glossy vector orb with its own icon and label — are lobbed up in
ballistic arcs. The player's finger is a glowing blade: swipe fast to slash
them. Blue **Family Shield orbs** (serene glowing orb with a family silhouette)
must NOT be sliced — they are this game's "bombs".

## Financial hook

*Cut the risks out of your family's life — cover is the blade.* Every hazard on
screen is a real household risk; the blade is the protection that removes them.
The shields are the family itself: protection only works while the cover stays
whole, so cutting your own shield is the one mistake that ends the run.

## Controls

- **One finger = the blade** (single pointer; extra touches are ignored).
- Swipe **fast** through orbs to slice — blade speed must be ≥ 400 px/s, so a
  slow drag parked on the screen cuts nothing.
- Lift your finger to end the gesture; combos never survive a lifted finger.

## Scoring

| Event | Points |
|---|---|
| Risk orb sliced | +1 |
| N-risk combo (3+ in one gesture, ≤300 ms between slices) | +2 × (N − 2) bonus |
| Family Shield sliced | −10, 1 s blade stun, combo reset |
| Risk missed (falls unsliced) | 0 — tempo cost only |

- **WIN:** score ≥ **120** when the 90-second horn sounds.
- **LOSE:** score below target at the horn, or **3 Family Shields sliced**
  (early loss).
- Slicing **5+ in one swipe** triggers a 1 s slow-mo moment (0.25× + zoom).
- Filling the combo meter (10 risks without hitting a shield) or ~every 30 s
  starts a 4 s **FRENZY**: ×3 spawns, zero shields, warm tint. The last 15 s of
  the session is a shield-free finale frenzy.
- Max 8 slices per gesture.

## Session ramp (90 s)

| Window | Volley | Interval | Shield chance |
|---|---|---|---|
| 0–15 s | 1–2 risks | 1.6 s | 0% |
| 15–45 s | 2–4 objects | 1.2 s | 10% |
| 45–75 s | 3–5 objects | 0.9 s | 18% |
| 75–90 s | finale frenzy | 0.3 s | 0% |

**Shield fairness:** shields are visually unmistakable (calm blue glow vs spiky
green), chime softly while airborne, and puff 200 ms before launch. Launch
trajectories are checked so a shield's path stays ≥ 1.2× combined radii from
every risk path over shared airtime — no risk is ever un-sliceable without
touching a shield; if no clear path exists after 12 re-rolls, the shield is
dropped from the volley.

**Anti-pause-scum:** backgrounding the app freezes the world *and* the session
clock; returning shows a 3-2-1 re-acquire countdown (1.5 s, world still frozen)
followed by a 0.25 s live input lock, so pausing never buys reaction time.

## Tech

- Standalone Vite 5 + React 18.3.1 app (no workspace), pnpm only.
- All sprites are programmatic canvas vector art baked to offscreen canvases —
  no emoji, no image files. Audio is Web Audio synth (kit), unlocked on first
  gesture. Pooled orbs/halves/splats/blade points — no per-frame allocations.
- Shared `src/kit/` copied byte-identical from `shared/game-kit/`.
- Lead capture → LMS, slot booking, playCount per repo standard §2.

## Run / build

```bash
pnpm install
pnpm dev          # dev server on port 5073
pnpm build        # uat build — the verification gate
pnpm build:preprod
pnpm build:prod
pnpm preview
```
