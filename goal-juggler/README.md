# Goal Juggler

Tap-to-bounce juggling keep-ups. Four glowing goal orbs — **Education** (open
book), **Home** (pitched roof), **Health** (heart), **Retirement** (sun) — fall
under gravity inside a walled playfield. Tap an orb to knock it back up; where
you tap relative to its centre steers it. Keep every live orb off the floor for
80 seconds.

Dev port **5068**.

## Concept

You start with one orb. A second joins at 15s, a third at 35s, a fourth at 60s.
From 40s a **risk gust** drifts sideways across the court, telegraphed by wind
streaks that appear before the wind is strong enough to bend an arc.

An orb that reaches the floor **shatters** and costs one of three **covers**. It
is served again from the ceiling two seconds later. Three floor hits ends the
run.

- **Win** — survive the full 80 seconds with fewer than 3 drops **and** at least
  15,000 points.
- **Lose** — 3 floor hits, or the final whistle short of the target.

## Financial hook

Real life does not hand you one goal at a time. Education, the home, health and
retirement are all in the air simultaneously, they arrive on a schedule you did
not choose, and a gust you did not see coming pushes all of them at once. The
mechanic is the argument, and the balance gate measures it rather than asserting
it:

- **You can hold three. The fourth is where it breaks.** Measured, a 220 ms
  player drops 2.5 orbs a run and wins 35% of the time — and the drops cluster
  hard in the seconds after each new orb arrives. Adding a goal is not a linear
  cost.
- **Parking a goal does not work.** An orb cradled in a corner for more than
  1.5s gets nudged back out, and the corner-camping bot loses 100% of runs while
  scoring 1,191 against an honest player's 12,609.
- **Panic does not work either.** A second tap on the same orb inside 300 ms
  does nothing at all — no impulse, no score — so no tap rate can pin an orb;
  the gate proves it from 4 Hz to 30 Hz. That bot dies at 7.5s. Undirected
  mashing dies at 9.6s.
- **Walking away does not work.** Leaving the app freezes the world, and coming
  back costs a re-acquire beat, so a pause can never buy the reaction time it
  would otherwise hand you.
- **Cover is what catches the one you miss.** The three covers are the whole
  reason a dropped goal is a setback rather than the end of the run.

## Controls

**Tap an orb** to knock it upward. The tap is a single gesture — no dragging, no
swiping. Use **one finger**: the shared input kit tracks a single pointer, so a
second finger resting on the glass swallows every tap.

- Tapping **under the centre** sends it straight up.
- Tapping **off-centre** steers it: tap the left of an orb and it travels right,
  which is how you pull one back off a wall or out of a gust.
- The tap target is **1.75x the drawn radius** (floor 40 logical px of radius —
  an 80 px target against the 44 px platform minimum). Overlapping pads resolve
  to the nearest orb centre, so a generous pad never steals a tap from a closer
  orb.
- Tapping the **same orb twice within 300 ms** does nothing at all — no
  impulse, no steer, no score. One tap, one bounce, and hammering an orb makes
  it fall rather than holding it up.

## Scoring

| Event | Value |
|---|---|
| Tap-bounce | 20 x live-orb count (four in the air pays x4) |
| High keep — orb crests above the top third | +40 |
| All four airborne for 10 continuous seconds | +200 |
| Rapid repeat tap on the same orb | 0 (and no impulse) |

The high-keep bonus arms only when an orb is tapped from **below** the line, so
it has to be earned by lifting a goal into the top third rather than by tapping
one that is already up there.

Stats contract: `{score, bounces, maxOrbs, drops}`.

## Physics

- Gravity `BALANCE.physics.gravity x 0.45` = 720 px/s² at the reference field
  height, scaled to the measured field so a bounce takes the same number of
  *seconds* on every handset.
- Wall and ceiling restitution **0.75**; orb-orb restitution **0.80**, equal
  masses, overlap split evenly.
- Speed clamp **1400 px/s**. The integrator runs **4 substeps at the clamp**
  (~0.10 of an orb radius per substep), falling with speed so the cost is only
  paid when something is moving fast.
- The balance gate asserts **zero tunnelling** — wall, floor, ceiling and
  orb-orb — over every run of every profile, and separately forces the worst
  case: an orb launched at the clamp straight into each boundary, and two orbs
  closing head-on at twice it.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, `GOALS`. Every tunable in one place.
- `src/physics.js` — **pure**: the whole simulation. No DOM, no React, no import
  of `data.js` (config is a parameter). Presentation is delivered through an
  optional callback bag, so the headless sim passes `{}` and gets numbers out.
- `src/GoalJugglerGame.jsx` — the canvas component. Mutable state in refs,
  module-level draw functions, an offscreen-prerendered backdrop rebuilt only on
  resize. It contains **no rules**.
- `src/Screens.jsx` — Home (the court as inline SVG, four orbs mid-juggle),
  How to Play (3-beat CSS-animated SVG), Results (score ring, stat tiles).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

Rendering is programmatic canvas and inline SVG only. No image files, no emoji
sprites: the four silhouettes are `Path2D` outlines, the orbs are radial
gradients with a rim-light crescent and a rotating specular sweep, the floor is a
drawn hazard band.

## Balance

`scripts/balance.mjs` imports the shipped `data.js` and `physics.js` and drives
them on the same fixed 1/120 s step the kit loop uses in the browser. Seven
profiles across **5 seed blocks x 400 runs**, and each block also runs a
**different canvas size**, so the assertions holding on all five is the evidence
that the game plays the same on a 300x548 handset and a 410x830 one.

```
node scripts/balance.mjs                 # the gate
node scripts/balance.mjs --runs 2000     # tighter confidence intervals
node scripts/balance.mjs --sweep         # tuning sweeps (not part of the gate)
node scripts/balance.mjs --replay 1234   # one run, verbose, from a seed
```

| profile | win% | band | mean score | note |
|---|---|---|---|---|
| **`honest`** (the gate: 220 ms reaction, aim noise) | **31.5–40.0%** | 25–45% | 12,609 | drops 2.5/run |
| `sharp` (120 ms, tight hand) | 96.5–99.0% | ≥85% | 16,113 | the skill ceiling |
| `pauser` (honest + unlimited pause scumming) | 0% | ≤45% | 734 | pausing must never pay |
| `idle` (never taps) | 0% | =0% | 0 | dies at 8.3s |
| `camp` (corner cradler) | 0% | ≤5% | 1,191 | must also score below honest |
| `spam` (locks on, 10 taps/s) | 0% | ≤5% | 60 | dies at 7.5s |
| `masher` (8 taps/s, no aiming) | 0% | ≤5% | 46 | dies at 9.6s |

Three further assertions beyond the win bands:

- **Pin probe** — one orb, isolated, hammered at a fixed rate for 45s. No rate
  inside the repeat window (4–30 Hz tested) can keep it off the floor; all fall
  in 1.6s.
- **Blocked-row serve probe** — 7,500 serves forced into a full entry row, to
  prove the 0.12s `serveGrace` on the orb-overlap diagnostic hides nothing.
  Zero tunnelling events, worst post-grace overlap 0.024 R.
- **Live score target** — the gate fails if no honest run ever ends short of
  `targetScore`, so the win condition's AND clause cannot quietly become
  decoration.

Every profile reads only what a player can see — orb positions, velocities, the
field and gravity. **None reads the gust**, which is exactly what makes the 40s
wind bite: the lead is computed from gravity alone.

## Commands

```
pnpm install
pnpm dev            # port 5068
pnpm build          # mode uat — the verification gate
pnpm build:preprod
pnpm build:prod
pnpm preview
node scripts/balance.mjs
```
