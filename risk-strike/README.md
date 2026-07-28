# Risk Strike

Flick bowling on a pseudo-3D lane. Ten green virus bottles stand at the end of a
perspective lane — the four in front are labelled **Illness**, **Accident**,
**Debt** and **Inflation**. **Flick** the glowing shield ball up the lane:
how fast you flick is your power, the angle of the flick is your line, and the
curl of your swipe is the hook. Five frames, two balls each, real strike and
spare bonuses, inside a 120-second session.

## The financial hook

Ten risks are standing between you and a clear deck, and you get one decisive
shot at each rack. A ball down the middle knocks most of them over and leaves
the corners standing — comprehensive cover is the shot that clears everything,
not the one that clears most of it. The scorecard makes the point again: a
strike carries forward into the next two balls, so getting it right once pays
you three times.

## Controls

| Input | Action |
| --- | --- |
| Flick up the lane | Bowl. Flick speed sets power, flick angle sets line |
| Curl the swipe | Hooks the ball late — the only way to reach a corner pin cleanly |
| Anywhere on the stage | The whole canvas is the launch surface; there is no aim widget to hit |

While your thumb is down, a dotted line shows where the ball is heading **as far
as the arrows** and a meter on the right shows the power your current flick
speed would deliver. Both disappear the moment you release. You aim at the
arrows, not at the pins — the same read a real bowler uses.

## Rules

- **5 frames, 2 balls each.** Pins reset per frame; whatever is still standing
  after ball one stays standing for ball two.
- **Strike** (all ten on ball one) scores 10 plus the next two balls.
  **Spare** (all ten across both balls) scores 10 plus the next ball.
- The last frame carries the real 10th-frame rule: a strike buys two fill balls,
  a spare buys one, and the deck is re-racked for them.
- **120-second cap.** Frames you never threw score zero.
- **Gutter:** the ball leaves the lane, wobbles down the channel and knocks
  nothing. The banner tells you so.

## Scoring

| Quantity | Value |
| --- | --- |
| Headline score | bowling total x 10 |
| Ring calibration on the results screen | 900 points |

The results screen reports `{ score, strikes, spares, pins }`, where `pins` is
the total number of pins knocked down across the whole session.

## Win / lose

- **Win** — knock down **44 pins or more** in the session.
- **Lose** — anything less, including the clock running out first.

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:5054
pnpm build      # uat mode (default); also build:preprod, build:prod
pnpm preview
```

Tunables live in `src/data.js` (`GAME_CONFIG`). The lane-plane simulation and the
bowling scorer live in `src/physics.js` — pure, no React, no DOM, which is what
lets the balance simulation below drive the shipped physics rather than a copy
of it. Shared game feel — loop, input, particles, audio, device tiers — comes
from `src/kit/`, a synced copy of `shared/game-kit/`. Do not edit `src/kit/`
directly; edit the canonical copy and run `node scripts/sync-game-kit.mjs`.

## How it is built

- `src/physics.js` — the rack, the ball, circle-circle collision with restitution
  and a little tangential friction, kickback plates, toppling, the flick-to-shot
  mapping, the aim-path predictor, and the bowling scorer. All in lane
  coordinates: `x` across the lane, `y` down it.
- `src/RiskStrikeGame.jsx` — one canvas component. Mutable state lives in refs;
  React state is only used for values that change a handful of times a run
  (frame, scorecard, banner, pause). The perspective is one pinhole camera:
  `k = camDist / (camDist + y)` scales x, sizes every sprite and *is* the screen
  y, so a pin's base is always planted on the lane.
- `src/data.js` — `GAME_CONFIG` and `COLORS`. Lane units are centimetres, so the
  deck geometry is the real one (105 cm lane, 30.5 cm pin spacing, 21.7 cm ball,
  12 cm pins). Only the length is shortened, to 11.8 m.
- `scripts/balance-sim.mjs` — the balance gate. `node scripts/balance-sim.mjs 1500`.

## Balance notes

Every number below comes from `scripts/balance-sim.mjs`, which imports
`src/physics.js` and `src/data.js` and steps the same fixed 120 Hz tick the kit
loop runs. It is not a model of the game; it *is* the game with the drawing
removed.

### Corrections against the literal reading of the brief

1. **Kickback plates** (`pins.kickback: 0.6`). Circle pins on an open plane
   cannot reach the corners: a pocket hit sent everything forward and the 7 and
   the 10 survived, so the first build produced 8-9 pin counts with a **15%**
   strike rate on a perfect line — plenty of pins, almost no strikes. A real
   deck is flanked by kickback plates and a good share of real strikes come off
   them. Adding walls at the lane edge took the pocket strike rate to **30-35%**
   and left the dead-centre ball where it belongs, at **1%** (see the aim sweep
   below — hitting the head pin flush is how you leave a split).

2. **Aim gain** (`flick.angleGain: 0.115`, `maxAngle: 0.05`). The lane is 105 cm
   wide and 11.8 m long, so the entire playable spread of directions is under
   **3 degrees**. Passing the raw swipe angle to the physics puts the gutter at a
   4-degree thumb wobble. The gain divides the swipe down into that spread, and
   the dotted preview — truncated at the arrows — is what makes the mapping
   legible instead of mysterious.

3. **Release noise** (`flick.angleJitter: 0.0026`, `powerJitter: 0.022`,
   `pins.rackJitter: 0.7`). Without it, identical inputs produce identical
   racks: a player who finds the pocket once strikes ten times in a row and the
   game reads as a lookup table. The jitter is small enough that line still
   dominates outcome by a wide margin.

4. **Win target** (`winPins: 44`). Tuned last, from the measured distribution.

### Measured with the shipped values

Probe 1 — straight flick aimed 6 cm right of centre, 300 racks per row:

| Flick speed (px/s) | Ball power (u/s) | Avg pins | Strike rate |
| --- | --- | --- | --- |
| 300 | 447 | 8.37 | 13.0% |
| 600 | 547 | 8.75 | 22.7% |
| 900 | 639 | 8.99 | 27.7% |
| 1200 | 708 | 9.05 | 28.3% |
| 1600 | 823 | 9.25 | 45.7% |
| 2000 | 917 | 9.18 | 37.7% |

A centred decent flick knocks **8-9 pins**, comfortably past the "6+" bar, and
strikes are reachable at every power. Power matters less than line, which is
true of real bowling too.

Probe 2 — aim sweep at 1200 px/s, no curl, 300 racks per row:

| Swipe angle | Ball x at the pins | Avg pins | Strike | Gutter |
| --- | --- | --- | --- | --- |
| -24 deg | -56.9 | 0.00 | 0% | **100%** |
| -16 deg | -37.9 | 2.24 | 0% | 0% |
| -10 deg | -23.7 | 6.08 | 0% | 0% |
| -3 deg | -7.1 | 8.95 | **35.0%** | 0% |
| 0 deg | 0.0 | 8.06 | 1.0% | 0% |
| +3 deg | +7.1 | 8.95 | **29.7%** | 0% |
| +10 deg | +23.7 | 6.06 | 0% | 0% |
| +24 deg | +56.9 | 0.00 | 0% | **100%** |

The pocket is real, dead centre is a split factory, and a bad enough angle
gutters — all three of the things the brief asks for. (The -16/+16 rows knock
two pins and then drift into the channel level with the deck; that is not
counted as a gutter ball, because it is not one.)

Probe 3 — curl sweep, swipe aimed 8 degrees left, 1200 px/s: a straight ball on
that line knocks 6.11, curling it back right recovers **7.80**, and over-curling
it (-1.0) puts it in the gutter. Curl is a tool, and it is a tool you can hurt
yourself with.

Probe 4 — 1,500 full sessions per player profile:

| Profile | Aim error | Median pins | Median score | Strikes/session | Gutter balls | Time used |
| --- | --- | --- | --- | --- | --- | --- |
| Casual — aims near the pocket | 8 deg | 43 | 490 | 0.33 | 8.5% | 63.2 s |
| Brisk — goes for the pocket | 5 deg | 46 | 570 | 0.55 | 4.9% | 53.5 s |
| Hooker — plays the hook | 5 deg | 42 | 490 | 0.37 | 4.5% | 56.0 s |
| Wild — sloppy flicks | 16 deg | 32 | 330 | 0.17 | 30.2% | 53.0 s |

Probe 5 — win rate against the pin target:

| Target | Casual | Brisk | Hooker | Wild |
| --- | --- | --- | --- | --- |
| 40 | 77.6% | 97.3% | 75.7% | 12.9% |
| 42 | 62.1% | 91.1% | 57.0% | 8.2% |
| 43 | 52.3% | 85.6% | 48.5% | 6.1% |
| **44 (shipped)** | **42.0%** | 74.4% | 40.2% | 4.4% |
| 45 | 33.5% | 63.1% | 31.3% | 3.3% |
| 46 | 26.9% | 50.9% | 25.5% | 2.3% |

`winPins: 44` puts the casual profile at **42.0%**, inside the 40-50% band the
brief asks for, while rewarding a player who actually hunts the pocket (74%).

### The fairness gates

- **The clock is a backstop, not the opponent.** A full five frames takes
  **53-63 seconds** of the 120 available, including aiming time; no simulated
  session of any profile timed out. A player who dawdles at three times the
  simulated aim time still finishes.
- **Every throw is winnable.** There is no leave that cannot be hit: the ball
  can reach anywhere from -41.6 to +41.6 at the deck without gutting, and the
  corner pins sit at ±45.7 with a 16.9 unit contact radius, so a straight ball
  covers them — tightly, which is why corner spares are the hardest shot in the
  game and why curl exists.
- **Nothing can wedge the session.** A throw is force-tallied after
  `maxThrowSeconds` (7.5 s) whatever the physics is doing, and the session ends
  on the frame count or the clock, never on a settle condition.

**Known skill cliff.** The simulation says the hook profile does no better than
the straight one (42 vs 43 median pins). Curl is currently worth having for
corner spares and for rescuing a bad line, not as a primary strategy — a hooked
first ball has to be aimed wider, and the extra distance costs about as much as
the better entry angle gains. If playtesting shows people reaching for the hook
on every ball, the cheapest fix is raising `flick.curveGain` a little rather
than touching the rack.
