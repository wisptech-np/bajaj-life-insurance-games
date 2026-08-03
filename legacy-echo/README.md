# Legacy Echo

**Get the gold chest to the vault at the top. The gates in the way stay open
only while somebody stands on their green pads — and the only somebody you
have is the loop you already played.**

Time-loop past-self co-op for Bajaj Life. Five 12-second loops over one
hand-authored vault map: every loop you drag a single glowing guardian, and
when the loop ends the world hard-resets — but your finished run replays as a
live **echo** that keeps standing where you stood. Three pads, two gates, one
chest.

## Financial hook

*Your past contributions keep working for you — every premium your past self
paid is a hand protecting the family today.* The mechanic is the message: the
run you invest now is literally the helper that holds the gate open for the
future you.

## How it plays

- **Drag to move.** Critically damped follow, max 260 px/s (190 px/s while
  carrying the chest). Portrait 390x780 logical playfield.
- **5 loops x 12 s** with a 1.5 s rewind scrub between loops (~67 s session).
- **Gates** cross the central spine and open only while ALL their pads are
  held — gate 1 needs 1 body, gate 2 needs 2 distinct bodies at once. Bodies
  reach the pads through the free side wings; the chest only fits through the
  gates. Each pad is drawn physically wired to the gate it opens.
- **Echoes replay your previous runs** from a recorded state track. One pad
  per loop then carry wins in 4; repositioning inside a loop (hold gate 1's
  pad early, walk to gate 2's late) wins in 3.
- **The chest is locked** until your echoes cover every pad for the current
  loop, so it is impossible to scoop it and jam against a gate you have no
  way to open.
- **Anti-AFK:** from loop 2 on, a loop with under 64 px of movement ends
  early at 3 s and is burned — it never joins the cast. Loop 1 is exempt so a
  first-timer reading the screen is not punished.
- **Anti-pause-scum:** backgrounding auto-pauses; resume freezes the world
  and the single master loop clock behind a visible 3-2-1 re-acquire count
  (1.5 s) with input dead until it ends, so pausing never buys planning time
  and ghosts can never desync (one clock, shared by everything).

## Teaching the mechanic (2026-08-03 review fix)

The objective is computed by the rules module (`objectiveOf`), not written in
prose, and is shown two ways at once: a sentence in the HUD and a pulsing ring
with an arrow over the exact thing to touch. It walks a player through all
four states — *stand on a green pad → stay here, your echo will repeat this →
grab the gold chest → carry it to the vault* — and `gate.mjs` asserts it is
never stale. Two one-shot banners narrate what the player has just watched
happen (a gate opening, an echo taking the pad over); there is no instruction
screen to sit through.

## Scoring

- Delivery: **1000**
- Unused full loops after delivery: **+400 each** (best possible 1800, on a
  loop-3 delivery — the fastest the map allows)

WIN: chest crosses the vault threshold before loop 5 ends. LOSE: loop 5
expires without delivery. Results receive `{score, loopsUsed, echoes,
doorsOpened, burnedLoops}`.

## Ghost tech (the load-bearing bit)

Fixed 1/120 s simulation; recording is a **state track**, not an input log —
every 2nd tick (60 Hz) the player's `(x, y, actionBits)` is written into a
preallocated Float32Array (720 samples per loop, ~8.6 KB). Replay is pure
array playback indexed by the same loop-tick counter, and pads are evaluated
per tick from replayed positions, identically for the live player and every
echo. With the hazard beam removed the simulation has no random element at
all, so the world is bit-identical on every loop by construction.

## Verification

`gate.mjs` runs the shipped pure rules module (`src/rules.js`) headless:

- solvable: a reposition plan wins in 3 loops and the one-pad-per-loop plan a
  first-timer following the arrow actually finds wins in 4, on five seeds;
- an idle/AFK bot never wins (loops 2-5 burn at 3 s, score 0);
- ghost replay determinism: the same track replayed twice produces
  bit-identical interaction timelines;
- the objective always names a real, actionable next step and walks the
  player through all four of them;
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
