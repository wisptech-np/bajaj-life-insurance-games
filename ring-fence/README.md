# Ring-Fence

Qix/JezzBall-style territory capture for Bajaj Life. The guardian rides a
glowing safety wall around a dark open field where green virus risk orbs bounce
in pure, deterministic reflections. Leave the wall to cut across open ground;
return to the wall to seal the cut — the trail becomes wall, and every enclosed
pocket that holds **no** risk orb floods blue in a 900 px/s colour wave and is
claimed. Secure **70%** of the field within **90 seconds**.

## Financial hook

*Ring-fencing* is a real asset-protection term: walling a family's wealth off
so no single risk can reach all of it. The game is the argument — every claim
starts with a bold move through open ground, every bold move is priced by the
danger it runs (bigger single cuts pay x1.5 / x2.5 / x4), and ground you have
ring-fenced is permanently safe: orbs bounce off it forever. Camping on the
boundary claims nothing, and the risks only get faster while you wait.

## Controls

- **Swipe / drag** anywhere (virtual stick, re-basing) to steer in 4
  directions; arrow keys / WASD also work.
- Moving off claimed ground starts a **cut**; re-touching claimed ground
  **seals** it. Trying to cross your own unfinished trail is ignored (never
  fatal); running out of legal moves simply halts you.
- Stalling mid-cut for more than 0.8 s ignites a **fuse** at the cut origin
  that chases along the trail at 340 px/s; moving again pauses it in place.

## Rules and scoring

- 65x117 grid of 6 px cells (390x702 logical field); a 2-cell frame starts
  claimed as the safety wall. 3 shields (lives).
- 2 orbs (r=13) from the start at 250 px/s, ramping linearly to 300 px/s over
  the session; a 3rd orb spawns at 65% claimed or t=55 s (whichever first),
  at least 150 px from the guardian, behind a 1.5 s warning ring.
- An orb touching the unfinished trail or the guardian mid-cut costs a shield:
  the trail burns back (150 ms), the guardian respawns at the cut origin with
  1.2 s invulnerability.
- Boundary camping: +6% orb speed per 8 s without a claim (cap +30%), reset by
  any claim.
- Score: +1 per claimed cell, single-cut multipliers (>=10% of field x1.5,
  >=20% x2.5, >=30% x4), +40 per near miss (orb within 20 px of a live trail
  without contact), and on a win +20 x seconds remaining +250 x shield left.
- WIN: 70% claimed in time. LOSE: 3 shields gone, or the timer ends below 70%.
- Fairness: reflections are deterministic (an orb's path is knowable), the 3rd
  orb is telegraphed, the fuse pauses the instant you move, and a sealed cut
  ALWAYS resolves in the player's favour — hazard-free pockets claim, never a
  wrong guess.

Results screen receives `{score, pctClaimed, biggestCutPct, livesLeft}`.

## Anti-pause-scum

The shared kit auto-pauses on `visibilitychange`. Resuming costs a visible
3-2-1 re-acquire countdown (1.8 s) with the session clock held and input dead,
then a 0.25 s live input lock. Orb velocities are stored state — never
extrapolated across a pause. The rule lives in `src/rules.js`
(`beginPause`/`endPause`) so the headless gate drives the same code.

## Headless gate

```
node gate.mjs
```

Imports the shipped `src/data.js` + `src/rules.js` (never re-implements a
rule) and proves, with PASS/FAIL lines and exit code:

- (a) a scripted strip-cutting bot reaches >=70% within 90 s on >=5 seeds
  (currently 6/6, winning in 17-39 s with all shields);
- (b) an idle bot and a boundary-camping bot never win;
- (c) seal correctness — after every seal no claimed ground contains an orb,
  claimed % is monotonically non-decreasing, and no trail cells survive.

## Build

```
pnpm install
pnpm dev        # http://localhost:5077
pnpm build      # uat — the verification gate
pnpm build:preprod
pnpm build:prod
pnpm preview
```

Dev server port: **5077**. Standalone Vite 5 + React 18.3.1 app; `src/kit/` is
a byte-identical copy of `shared/game-kit/` (never edited here). Lead capture,
slot booking and playCount follow the guardian-shelter gold standard
(`LEAD_NO_KEY = 'ringFenceLeadNo'`).
