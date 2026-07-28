# Spiral Sprint

A one-thumb helix descent. A shield ball bounces in place at the front of a
rotating spiral tower; **drag left or right** to spin the tower under it. Land on
a blue arc and you bounce, drop through a gap and you descend, touch a green
crash arc and the run is over. Forty rings down is the retirement vault, and the
session is capped at 120 seconds.

## The financial hook

The tower is a market cycle you have to ride all the way to retirement. Every
ring is a year: blue arcs are the years the market gives you somewhere to stand,
gaps are the years you fall straight through, and the green crash arcs are the
drawdowns that end an uncovered run. The gold rules every ten rings count the
years down — 30, 20, 10 years to retirement — and the vault at the bottom is what
you were descending toward the whole time.

The fever streak is the reward for a run of good years: string three rings
together in a single fall and the ball flames, and for the next three seconds a
crash zone costs it nothing at all. Cover is what turns a drawdown from the end
of the story into a thing you go straight through.

## Controls

| Input | Action |
| --- | --- |
| Drag left / right | Spin the tower (0.7° per pixel) |
| Nothing | The ball bounces on its own — the tower is the only thing you move |

Rotation is direct and inertia-free: a 257 px drag turns the tower a half-turn,
which is the largest rotation the game ever asks for, so any angle is reachable
inside one thumb swipe on every supported screen width. Dragging works while the
ball is bouncing and while it is falling.

## Ring anatomy

Each ring is a full 360° of arcs:

- **Gap** — a wedge of nothing. Fall through it to descend. Spans lerp from 70°
  at the top of the tower to 42° at the bottom.
- **Landing arc** — the widest safe arc on the ring, always at least 55° so the
  ball (≈16° wide) fits with room to spare. Drawn a shade lighter than the other
  safe arcs.
- **Safe arcs** — the rest of the blue platform.
- **Crash arcs** — green, virus-textured, with a red warning stripe on the lip.
  1 to 3 of them, taking 10% of the ring at the top and 34% at the bottom.
  Touching one ends the run, unless the fever is lit, in which case the ball
  smashes straight through it for +100.

Ring 0 is the launch platform (one wide gap, no crash arcs); ring 40 is the solid
vault floor.

## Scoring

| Event | Points |
| --- | --- |
| Each ring descended | 20 |
| Fever smash | 100 |
| Reaching the vault | 800 |

A completed run is 1,600 before smashes, which is why the results ring is
calibrated to `RESULT_TARGET_SCORE = 2000`. The results screen reports
`{ score, rings, smashes, streak }` — `streak` is the most rings cleared in one
uninterrupted fall.

## Win / lose

- **Win** — land on ring 40, the retirement vault.
- **Lose** — touch a crash arc without the fever lit, or let the 120-second
  session expire before reaching ring 40.

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:5048
pnpm build      # uat mode (default); also build:preprod, build:prod
pnpm preview
```

Tunables live in `src/data.js` (`GAME_CONFIG`). Shared game feel — loop, input,
particles, audio, device tiers — comes from `src/kit/`, which is a synced copy of
`shared/game-kit/`. Do not edit `src/kit/` directly; edit the canonical copy and
run `node scripts/sync-game-kit.mjs`.

## Balance notes

The tower generator and the descent physics were checked with a headless
simulation that reuses the shipped generator code verbatim and imports
`GAME_CONFIG` directly, so the numbers below describe the values that ship. It
runs 400 generated towers for the structural invariants and 300 runs per player
profile for the timings, at the narrowest supported stage width (a 360 px phone),
which is the worst case: the smallest tower radius makes the ball widest in tower
degrees and every fit tightest.

### The fall path is guaranteed, by construction

A ring is built as an ordered list of spans and then **phased** so that one
chosen segment sits centred under the previous ring's gap — either the landing
arc (you bounce) or its own gap (you keep falling). A crash arc is therefore
never the thing waiting directly below a gap, so a player who drops through a
hole and touches nothing can never be killed by the ring below. Every death in
this game is something the player steered into.

Measured over 400 towers (16,400 rings): **0** rings whose spans did not sum to
360°, **0** rings with a landing arc narrower than `minSafeSpanDeg`, and **0**
rings with a crash arc under the previous ring's gap. The component re-rolls the
whole tower (up to five times) if its own check ever disagrees.

### Three corrections against the spec's literal values

1. **`ball.bounceHeightPx: 100`, `ball.bounceSeconds: 0.7`** (spec: 90 px /
   0.50 s). The spec pair implies a gravity of **2,880 px/s²**, nearly twice the
   1,600 px/s² arcade gravity the shared kit uses for every other game in the
   catalog, and the simulation finished all 40 rings in a **14 s median** — an
   eighth of the session, with the timer purely decorative. A 100 px apex over a
   0.70 s period puts gravity at **1,633 px/s²**, within 2% of the kit value, and
   lands the same descent at a 27 s median.

2. **`arcs.fallThroughChance: 0.12`** (spec-derived: 0.28) and **fever shafts of
   2 rings every 9** (was 3 every 7). Between them the original numbers made more
   than half the tower descend with no input at all: the player was a spectator
   for the majority of the run. At the shipped values roughly three rings in four
   are a decision, and the mean best streak still sits at 3.8 — comfortably above
   the 3 needed for fever.

3. **`tower.degPerPx: 0.7`** (spec: 0.55). At 0.55 a half-turn takes 327 px of
   drag — essentially the entire play area on a 360 px phone (a ~340 px stage) —
   so the worst-case alignment was one edge-to-edge swipe with nothing to spare,
   or two swipes in practice. At 0.70 a half-turn is 257 px, comfortably inside
   one thumb swipe on every supported width, while the tightest 42° gap is still
   a 60 px drag target, five times the kit's 12 px tap threshold, so precision is
   unaffected.

A fourth reading is a mechanic change rather than a constant. The spec ends the
fever "after one smash or a normal bounce", but the fall that grants fever has at
most one more ring to run (0.06–0.13 s), so the reward would expire before the
player could steer into anything: fever would be a particle effect, not a
mechanic. **`fever.seconds: 3.0`** gives about six bounces of steering room, and
a single smash still consumes it.

Fever is lit **at most once per fall**, and a safe landing is what re-arms it, so
`fever.smashLimit: 1` really does mean one smash per fall: the second crash arc
in an uninterrupted fall ends the run. (Without that latch the smash itself
re-satisfies the streak test while the fever clock is momentarily zero, and every
crash arc for the rest of the fall smashes for free.)

### Measured with the shipped values (300 runs per profile)

| Player | Reaches ring 40 (min / median / p95) | Bounces | Runs that lit fever |
| --- | --- | --- | --- |
| Hesitant — 110 °/s drag, 0.40 s reaction | 25.7 / **34.3** / 38.9 s | 38.8 | 300/300 |
| Casual — 170 °/s drag, 0.25 s reaction | 21.9 / **26.9** / 29.1 s | 28.4 | 300/300 |
| Confident — 260 °/s drag, 0.12 s reaction | 18.8 / **23.7** / 25.4 s | 23.3 | 300/300 |
| Optimal — 260 °/s, no reaction lag | 14.2 / **18.5** / 19.4 s | 16.5 | 300/300 |

The simulated players never die, by design: the bot aims for the gap and never
deliberately steers onto a crash arc. That is the point of the measurement — it
establishes the **fairness floor** (a competent player is never killed by the
tower itself), not a death rate. Real losses come from steering into green while
hunting a gap, and from the clock.

### The three fairness gates

- **Ring 40 is reachable well inside the session.** Even the hesitant profile
  finishes at a 34.3 s median against a 120 s budget, and its slowest run of 300
  took 39.6 s. Arithmetically the clock only bites at about **four bounces per
  ring**: 40 × (4 × 0.70 s + 0.20 s fall) = **120.1 s**. One bounce per ring is
  36 s, two is 64 s, three is 92 s.
- **Fever is reachable.** Aligned 2-ring shafts are planted at rings 5-6, 14-15,
  23-24 and 32-33, and because the gap you drop through counts as the first ring
  of the fall, each shaft lands the streak on exactly 3. Every one of 1,200
  simulated runs lit the fever, a mean of 4.0 times per run.
- **Every ring is passable.** See the invariant table above: zero violations in
  16,400 generated rings, verified with the ball's real angular half-width
  (8.20° at the worst-case screen size) rather than a point sample.

### Colour grammar note

The design spec calls the crash arcs "red". The repo-wide rule that **risk always
reads green** outranks it, so they are drawn green with a virus texture — the
same visual language the rest of the catalog uses for risk — with a danger-red
warning stripe along the lip so the hazard still reads at a glance. Blue is
protection (safe arcs, the shield ball, the tower core), gold is wealth (the
vault, the milestone rules, the fever flame).
