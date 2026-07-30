# Time Shield

**Concept:** Time moves only when you move (SUPERHOT rule). The world's simulation speed is
proportional to your own motion — hold still and bullets hang in the air; move and they fly.
Inch through live bullet lattices, cross 5 zones bottom-to-top, reach the vault.

**Financial hook:** Good cover buys you time to think — when life comes at you fast,
protection lets you slow it down and pick your path.

## Controls

- Drag anywhere: the shield-guardian follows your finger (critically damped spring).
- The faster the guardian moves, the faster the world runs
  (`timeScale = 0.06 + 0.94 · (v/vRef)^0.85`, vRef 860 px/s).
- Standing still never fully freezes the world (0.06 floor), and the session clock plus a
  rising fog wall always run in real time — studying is free, the run itself is spending.

## Session

- 5 zones, 105 s real-time cap, fog rises at 6 px/s.
- Hazards (at full speed): bullet volleys 620 px/s, rotating laser fans (zone 3+),
  sweep walls (zone 4+). Every volley telegraphs 500 ms in real time.
- 2 hits = lose (first breaks the shield). Win = clear all 5 zones.

## Scoring

300/zone + 25/near-miss (only while timeScale > 0.3) + style bonus up to 400 for
session-average timeScale ≥ 0.45 + 8 × seconds remaining.

Anti-exploit: jitter movement is discounted by a net-displacement/path-length rule
(gate-proven: jitter bot earns ~0.061 timeScale vs 0.465 for honest movement);
pause resumes behind a 3-2-1 re-acquire countdown with timeScale re-entering at floor.

## Dev

- Port: **5076**
- `pnpm install`, `pnpm dev`, `pnpm build` (uat) / `build:preprod` / `build:prod`
- Headless proof: `node gate.mjs` (competent bot wins 8/8 seeds, freeze-camper always
  loses, jitter bot neutralized).
