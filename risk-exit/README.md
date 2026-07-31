# Risk Exit

A true sliding-block escape puzzle (Rush Hour / Unblock Me) for Bajaj Life. A
6x6 tray is packed with 2- and 3-cell risk blocks — **debt, illness, market
shock, job loss**. Every block is locked to one axis: horizontal blocks only
slide left/right, vertical blocks only up/down. **Drag** them out of the way to
open the third row, then slide the gold **Family Cover** block out through the
exit gate on the right wall.

Six boards, escalating from a 4-drag warm-up to an 11-drag knot, inside a
single 120-second session.

## Financial hook

The board is the argument. Nothing on it moves on its own, nothing can be
removed, and only one piece is allowed to leave — the cover. Every red block is
a real obligation already wedged across the family's path, and the only way out
is to shove them aside **in the right order**: move the wrong one first and it
boxes in the block you actually needed. Clearing a risk out of the cover's lane
is worth points the moment it happens, which is the whole pitch — protection is
what you arrange *before* you need the lane.

## Controls

- **Drag a block along its own axis.** The block tracks your finger cell-for-cell
  within its legal range and snaps to the grid when you let go — one drag of any
  distance is one move.
- Shoving a block into a neighbour it cannot pass **bounces it**: the board
  shakes, the block squashes and springs back, `-5`.
- Tapping a block that is wedged solid on both sides reports **BOXED IN**.
- The circular button resets the current board (the session clock keeps running).

No other input. There is no undo and no hint — a board that goes wrong is
cheaper to reset than to unpick.

## Rules and scoring

- 6x6 grid. Pieces are 2 or 3 cells long, `h` (slides left/right) or `v` (slides
  up/down). The hero is a 2-cell horizontal gold block permanently in row 2.
- The exit gate is the right wall of row 2. The board is solved the instant the
  hero sits flush against it; it then slides out through the gate.
- `+200` per board escaped, plus a par bonus of `150 x par / movesUsed`
  (full 150 at par, decaying the further over you go).
- `+40` each time a risk block is pushed clear of the exit lane — awarded once
  per block per board.
- `-5` for shoving a block into a wall or a neighbour.
- `+10 x seconds remaining` on a full clear.
- **WIN:** all 6 boards inside 120 s. **LOSE:** the clock runs out.

Par ladder: **4 → 5 → 6 → 8 → 10 → 11** (44 drags total, 2.73 s per drag at par).

Results screen receives `{ score, levelsCleared, moves, risksCleared }`.

## Headless solvability gate

```
node gate.mjs
```

Imports the shipped `src/data.js` + `src/rules.js` — it never re-implements a
rule, so the moves the solver enumerates are exactly the moves `slideRange`
allows the finger. Prints PASS/FAIL per check and exits non-zero on any failure:

- **(a)** every level is structurally well-formed (in bounds, no overlaps,
  exactly one 2-cell hero in the gate row);
- **(b)** every level is **solvable** — breadth-first search finds the minimum
  drag count, and that number must equal the authored `par` in `data.js`. Edit a
  layout and the gate fails until the par is corrected;
- **(c)** the returned solution replays legally through `slideRange` and ends
  with the hero at the gate;
- **(d)** no board is a freebie (>= 4 drags), the ladder never goes backwards,
  and the total par fits the session clock;
- **(e)** the checker has teeth — a deliberately walled-in board must come back
  unsolvable and a pre-solved board must come back at 0 drags.

A shipped unsolvable level is a hard failure, by construction.

## Build

```
pnpm install
pnpm dev        # http://localhost:5034
pnpm build      # uat — the verification gate
pnpm build:preprod
pnpm build:prod
pnpm preview
```

Dev server port: **5034**. Standalone Vite 5 + React 18.3.1 app. `src/kit/`,
`src/api.js`, `src/services/` and `src/utils/` are synced centrally and are not
edited here. Lead capture (name + mobile + T&C, no email), slot booking and
`playCount` follow the guardian-shelter gold standard
(`LEAD_NO_KEY = 'riskExitLeadNo'`).

## Art

All blocks, the tray, the gate, the particles and the how-to-play loop are drawn
programmatically — canvas 2D for the board, inline SVG for the screens. No image
assets and no emoji. `asset-from-here.md` holds the Nano Banana prompt sheet for
replacing them with real art without changing the layout.
