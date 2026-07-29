# Legacy Echo

Time-loop past-self co-op for Bajaj Life. Five 18-second loops over one
hand-authored vault map: every loop you play a single glowing guardian, and
when the loop ends the world hard-resets — but your finished run replays as a
live **echo** that still presses plates, blocks the hazard beam and flips
levers. Build a relay across time, then carry the **policy chest** through all
three vault doors into the family vault before loop 5 expires.

## Financial hook

*Your past contributions keep working for you — every premium your past self
paid is a hand protecting the family today.* The mechanic is the message: the
run you invest now is literally the helper that holds the door open for the
future you.

## How it plays

- **Drag to move.** Critically damped follow, max 260 px/s (180 px/s while
  carrying the chest). Portrait 390x780 logical playfield.
- **5 loops x 18 s** with a 1.5 s rewind scrub between loops (~97 s session).
- **Vault doors** cross the central spine and open only while ALL their
  plates are held — door 1 needs 1 body, door 2 needs 2, door 3 needs 3
  distinct bodies at once (two bodies stacked on one plate count once, and
  stacked seconds cost score). Bodies reach the plates through the free side
  wings; the chest only fits through the doors.
- **Echoes replay your previous runs** from a recorded state track. One echo
  can do two jobs in one loop — hold a plate early, then walk to another
  plate for the finale. That reposition is the core skill.
- **Hazard beam** sweeps the vault approach on a fixed loop-clock schedule
  (session-seeded phase, identical every loop). Any body standing in it
  blocks it for everyone beyond; only the live player is knocked back and
  stunned when caught.
- **Twin levers** ~310 px apart must both flip within 0.5 s of each other —
  impossible solo — to open the coin alcove.
- **5 coins** sit behind doors and the lever gate, reachable only with echo
  cooperation. Coins persist once collected (no farming).
- **Anti-AFK:** a loop with under 64 px of movement ends early at 4 s and is
  burned — it never joins the cast.
- **Anti-pause-scum:** backgrounding auto-pauses; resume freezes the world
  and the single master loop clock behind a visible 3-2-1 re-acquire count
  (1.5 s) with input dead until it ends, so pausing never buys planning time
  and ghosts can never desync (one clock, shared by everything).

## Scoring

- Delivery: **1000**
- Unused full loops after delivery: **+400 each**
- Coins: **+60 each** (5 placed)
- Plate redundancy: **-5 per stacked second**, final score floored at 0

WIN: chest crosses the vault threshold before loop 5 ends. LOSE: loop 5
expires without delivery. Results receive `{score, loopsUsed, coins}` plus
doors opened and burned loops.

## Ghost tech (the load-bearing bit)

Fixed 1/120 s simulation; recording is a **state track**, not an input log —
every 2nd tick (60 Hz) the player's `(x, y, actionBits)` is written into a
preallocated Float32Array (1080 samples per loop, ~13 KB). Replay is pure
array playback indexed by the same loop-tick counter, and all interactions
(plates, levers, beam blocking) are evaluated per tick from replayed
positions. World events key off the loop clock plus a session `mulberry32`
seed, so the world is bit-identical on every loop.

## Verification

`gate.mjs` runs the shipped pure rules module (`src/rules.js`) headless:

- solvable: an expert waypoint plan wins in 4 loops and a casual plan (two
  simple repositions) wins in 5, across five session seeds;
- an idle/AFK bot never wins (all five loops burn at 4 s, score 0);
- ghost replay determinism: the same track replayed twice produces
  bit-identical interaction timelines;
- the pause freeze provably holds the loop clock and refuses input.

## Commands

```
pnpm install
pnpm dev          # dev server on port 5075
pnpm build        # uat build — the verification gate
pnpm build:preprod
pnpm build:prod
pnpm preview
node gate.mjs     # headless rules gate (prints PASS/FAIL lines)
```

## Structure

- `src/data.js` — `GAME_CONFIG`, `COLORS`, `GHOST_TINTS`; every tunable.
- `src/rules.js` — pure simulation (no DOM, no React, config as parameter).
- `src/LegacyEchoGame.jsx` — canvas component; no rules, presentation only.
- `src/Screens.jsx`, `src/App.jsx` — screen flow per repo standard.
- `src/kit/` — byte-identical copy of `shared/game-kit/`.
- `src/sound.js` — extra synth voices (tape whir, latch, door slide) beside
  the kit's standard set. Web Audio only, lazy unlock on first gesture.
- Lead capture / slot booking / play count copied from `guardian-shelter/`
  (`LEAD_NO_KEY = 'legacyEchoLeadNo'`).

Dev port **5075**. No image assets, no emoji sprites — programmatic canvas
and inline SVG only.
