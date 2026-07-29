# Dual Cover

Duet-style twin-orbit dodger. Two orbs — **BLUE Protection** (shield) and
**ORANGE Growth** (rising arrow) — are locked 180° apart on a ring. Obstacles
descend from the top of the screen for 90 seconds; spin the pair so **both**
orbs thread every wall, gate, spinner and squeeze. Losing either orb loses the
run.

Dev port **5079**.

## Concept

Hold the **left or right half** of the screen to apply angular acceleration
(780°/s²) toward that side, up to a max spin of 330°/s. Release and the spin
dies with an 80 ms half-life — a surgical, near-instant stop. Holding **both**
halves is zero net torque. Touches beyond the first two are ignored. An
accessibility **assist mode** (toggle on the How-to-Play screen, default off)
replaces hold-to-spin with direct drag steering.

The 90-second descent is one authored sequence (~30 obstacles from the
session's seed), ramping from 330 to 470 px/s with spawn breaths tightening
from 1.7 s to 1.15 s:

| Obstacle | Forces | Enters |
|---|---|---|
| Side wall (L/R) | orbs vertical ±20° | 0 s |
| Centre bar, side gaps | orbs horizontal ±23° | 0 s |
| Staggered gates (2 walls, 380 px apart, opposite sides) | vertical, held through the double beat | 20 s |
| Spinner (bar rotates 45° in descent; arrow + preview spin telegraph) | horizontal, tracking the corridor | 45 s |
| Squeeze (double bar, one off-centre gap) | a 45° diagonal held ~0.6 s | 70 s |

- **Win** — survive the full sequence.
- **Lose** — the 4th hit. You carry **3 shields**; each hit costs one
  (60 ms hit-stop, 900 ms invulnerability), and the obstacle **keeps the paint
  splat** in the colour of the orb that died there — death is legible history.

## Financial hook

Protection and growth are two sides of one plan — steer them together, because
losing either loses the future. The mechanic is the argument: the two orbs are
one rigid pair, so you can never favour one side; every safe line is a line
that keeps *both* alive, and the obstacle that forgives a lone orb does not
exist.

## Controls

- **Hold left / right half** — spin the pair that way (release = instant stop).
- **Both halves** — hold position.
- **Assist mode** — drag horizontally to steer directly.

Backgrounding the app auto-pauses. Resume runs a visible 3-2-1 re-acquire
(clock held, input dead) and **rewinds the descent by 250 ms of travel** —
grace, without a planning advantage.

## Scoring

- **+40 × combo** per clean pass; combo ×1.1 per consecutive clean pass,
  capped ×3, reset on hit. The pass chime rises with the combo.
- **+25 near-miss** — clearance under 10 px at the closest approach. Five
  near-misses running sets the orbit shimmering.
- **+150 per clean phase** (4 phases: walls & bars / staggered gates /
  spinners / the squeeze).
- **+500 no-hit finish.**

Results receive `{score, obstaclesPassed, nearMisses, shieldsLeft}`.

## Headless gate

`src/rules.js` is a pure module (ring kinematics, generator, collision,
scoring — no DOM). `node gate.mjs` proves, on 12 seeds:

- **(a)** every generated sequence satisfies
  `requiredRotationDeg / 330 × 1.6 ≤ timeToArrival` for every consecutive
  pair (and never demands more than 170°);
- **(b)** a scripted optimal-rotation bot — using the same hold input and the
  same accel/decay kinematics — survives every full sequence with 0 hits;
- **(c)** an idle bot that never rotates always loses.

## Build

```bash
pnpm install
pnpm dev          # http://localhost:5079
pnpm build        # uat — the verification gate
pnpm build:preprod
pnpm build:prod
node gate.mjs     # headless reachability + playability gate
```

## Structure

- `src/data.js` — `GAME_CONFIG`, `COLORS`; every tunable in one place.
- `src/rules.js` — pure rules: descent ramp, sequence generator with the
  reachability constraint, rotation kinematics, collision, scoring,
  pause/re-acquire/rewind. Config is a parameter; gate.mjs runs the shipped
  code.
- `src/DualCoverGame.jsx` — the canvas component. No rules; looks and sounds
  only.
- `src/Screens.jsx` — Home, How to Play (with the assist toggle), Results.
- `src/kit/` — byte-identical copy of `shared/game-kit`.
- `gate.mjs` — the headless gate (not bundled).

Lead capture, slot booking, play count and share flow are the repo-standard
scaffold (`LEAD_NO_KEY = 'dualCoverLeadNo'`).
