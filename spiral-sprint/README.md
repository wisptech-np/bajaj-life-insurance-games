# Spiral Sprint

A one-thumb helix descent. A shield ball bounces in place at the front of a
rotating spiral tower; **drag left or right** to spin the tower under it. Land on
a blue arc and you bounce, drop through a gap and you descend, touch a green
crash arc and the run is over — and if you fall through **more than four rings
without landing**, the ball itself comes apart. Forty rings down is the
retirement vault, and the session is capped at 120 seconds.

## The financial hook

The tower is a market cycle you have to ride all the way to retirement. Every
ring is a year: blue arcs are the years the market gives you somewhere to stand,
gaps are the years you fall straight through, and the green crash arcs are the
drawdowns that end an uncovered run. The gold rules every ten rings count the
years down — 30, 20, 10 years to retirement — and the vault at the bottom is what
you were descending toward the whole time.

Falling is not free. A few years of not landing anywhere is a run of luck; five
in a row is a plan with no floor under it, and the shield comes apart. The fever
streak is the reward for the controlled version of the same thing: string three
rings together in a single fall and the ball flames, and for the next three
seconds a crash zone costs it nothing at all. Cover is what turns a drawdown from
the end of the story into a thing you go straight through — it is not what saves
you from never landing.

## Controls

| Input | Action |
| --- | --- |
| Drag left / right | Spin the tower (0.7° per pixel) |
| Nothing | The ball bounces on its own — the tower is the only thing you move |

Rotation is direct and inertia-free: a 257 px drag turns the tower a half-turn,
which is the largest rotation the game ever asks for, so any angle is reachable
inside one thumb swipe on every supported screen width. Dragging works while the
ball is bouncing and while it is falling — steering out of a fall is a real move,
and after the ball starts stressing it is the only move that matters.

## The ball

`ball.radiusPx: 20` (was 14). A 40 px shield on a 360 px phone reads as the thing
the game is about; a 28 px one read as a marble. Everything the ball has to fit
through was retuned with it, because a bigger ball through unchanged gaps is a
silent difficulty change:

| Constant | Before | After | Why |
| --- | --- | --- | --- |
| `ball.radiusPx` | 14 | **20** | Legible at arm's length on a phone |
| — its angular width | 16.4° | **23.5°** | Measured at the worst case (360 px screen, R = 141.5) |
| `arcs.gapSpanDeg` | 70 → 42 | **80 → 46** | Deepest gap keeps 11.3° of slack a side — the same drag tolerance the old gap gave the old ball |
| `arcs.minSafeSpanDeg` | 55 | **60** | The guaranteed landing arc keeps ~18° of margin a side |
| `arcs.minSafeSliceDeg` | 10 | **14** | Between-crash slices stay readable next to a wider ball |
| `arcs.minCrashSpanDeg` | 16 | **18** | A hazard should not be thinner than a third of the ball |
| `tower.thicknessPx` | 13 | **16** | A 40 px ball on a 13 px lip looked like it was balanced on paper |

Collision is not a point sample: contact is classified across five samples
spanning the ball's real angular half-width (`contactHalfDeg = atan(r / orbitR)`),
so the widened ball genuinely occupies the extra degrees rather than just being
drawn bigger.

## The fall limit, and how it squares with the fever

One uninterrupted fall may cross at most **four** ring planes. The fifth destroys
the ball and ends the run.

| Ring of the fall | What happens |
| --- | --- |
| 1 – 2 | Normal descent, +20 each, HUD shows `Fall 1/4`, `Fall 2/4` |
| 3 | **Fever lights** (crash immunity, 3 s) **and the stress telegraph starts** |
| 4 | Last legal ring. Stress at maximum |
| 5 | Ball destroyed. Run over — fever or not |

The reward and the limit are deliberately **one ring apart**, and they do not
overlap: `fever.ringsPerStreak: 3`, `fall.maxRings: 4`. So the fever is the payoff
for a fall you then have to *stop*, and the immunity it grants is scoped to crash
arcs only. That is also the honest reading of the hook — cover protects you from
the market, not from never landing — and it removes the contradiction of a
"3 rings is good" reward sitting next to a "5 rings kills you" rule with nothing
between them. The planted fever shafts are 2 rings long, which lands the streak on
exactly 3: the game never gives you a free ring of stress you did not choose.

**The telegraph.** From ring 3 of a fall (`fall.warnRings`) the death is visible,
audible and readable for the ~0.43 s it takes to arrive:

- the shield loses its blue and goes to hot metal (`stressBall` gradient), with a
  red glow instead of the blue one;
- fracture lines crackle across the shell, multiplying and jittering as the fall
  runs on;
- the whole frame takes a red vignette that pulses faster the closer the ball is
  to breaking;
- the ring-pass tone jumps a register and keeps climbing (`audio.combo` at a
  higher index);
- the HUD shows the live skip count as `Fall 3/4` in danger red;
- and the fall itself **slows** — `fall.stressVelocityPx: 700` replaces the 2,300
  px/s terminal velocity, so the stressed ball visibly strains against the drop.

That last one is also the fairness knob. At 700 px/s a 150 px ring gap takes
214 ms, so there are **429 ms between the first stress cue and destruction**, and
the landing arc waiting on any ring is at least 60° wide — at 0.7°/px, under 43 px
of drag away from the gap edge. The escape is a real move at thumb speed, not a
coin flip at terminal velocity.

## Difficulty ramp

Every difficulty lerp rides one eased depth curve, `t = (ring/40) ^ arcs.rampExp`
with `rampExp: 1.7`, so the tower is genuinely gentle at the top and genuinely
mean at the bottom instead of being flat-hard from ring 1. Measured over 400
generated towers (15,600 hazard rings):

| Third of the descent | Gap width | Crash coverage |
| --- | --- | --- |
| Rings 1–13 | 77.9° | 10.3% |
| Rings 14–26 | 69.3° | 19.9% |
| Rings 27–39 | 55.3° | 35.6% |
| Ring 39 alone | 46° | 46%, across 4 arcs |

The descent also speeds up with depth: `ball.lateSpeedup: 1.28` scales launch
speed by `k` and gravity by `k²`, which shortens the bounce period from **0.70 s
at ring 0 to 0.55 s at ring 39** while leaving the apex at exactly 100 px. Deep
rings give you less time to aim; the ball never appears to change weight.

## Ring anatomy

Each ring is a full 360° of arcs:

- **Gap** — a wedge of nothing. Fall through it to descend. Spans lerp from 80°
  at the top of the tower to 46° at the bottom.
- **Landing arc** — the widest safe arc on the ring, always at least 60° so the
  ball (23.5° wide) fits with room to spare. Drawn a shade lighter than the other
  safe arcs.
- **Safe arcs** — the rest of the blue platform, each at least 14°.
- **Crash arcs** — green, virus-textured, with a red warning stripe on the lip.
  1 to 4 of them, taking 8% of the ring at the top and 46% at the bottom.
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

The ring that destroys the ball still counts and still scores — you did fall past
it — so `rings × 20` always reconciles with the score. A completed run is 1,600
before smashes, which is why the results ring is calibrated to
`RESULT_TARGET_SCORE = 2000`. The results screen reports
`{ score, rings, smashes, streak }` — `streak` is the most rings cleared in one
uninterrupted fall, and it now tops out at 4 by construction.

## Win / lose

- **Win** — land on ring 40, the retirement vault.
- **Lose** — touch a crash arc without the fever lit, **fall through more than 4
  rings without landing**, or let the 120-second session expire before reaching
  ring 40.

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

The tower generator was re-checked after the resize with a headless script that
reuses the shipped generator code verbatim and imports `GAME_CONFIG` directly, at
the narrowest supported stage width (a 360 px phone, 337 px stage), which is the
worst case: the smallest tower radius makes the ball widest in tower degrees and
every fit tightest.

### The fall path is guaranteed, by construction

A ring is built as an ordered list of spans and then **phased** so that one
chosen segment sits centred under the previous ring's gap — either the landing
arc (you bounce) or its own gap (you keep falling). A crash arc is therefore
never the thing waiting directly below a gap, so a player who drops through a
hole and touches nothing can never be *killed by a crash arc* they could not see
coming. Every crash death in this game is something the player steered into.

Measured over 400 towers (15,600 hazard rings) with the ball's real angular
half-width of 11.74°: **0** rings whose spans did not sum to 360°, **0** rings
with a landing arc narrower than `minSafeSpanDeg`, **0** rings with a crash arc
under the previous ring's gap, and **0** gaps with less than 4° of slack over the
ball's full width. The component re-rolls the whole tower (up to five times) if
its own check ever disagrees.

### The over-fall death is the one thing the generator does not protect you from

That is deliberate. Because the gap the player drops through counts as ring 1,
and because `fallThroughChance: 0.12` can align further gaps under it, the
generator will occasionally stack a shaft longer than four rings: over 400
towers the longest passive fall it produced was **7 rings**, and 62 of 15,600
rings sat at a depth where a player who did nothing at all would exceed the
limit — about one such spot in every six towers.

Those are not unfair, they are the mechanic: dragging works during a fall, every
ring carries a landing arc at least 60° wide, and the stress cap gives 429 ms of
warning to reach one. A passive player dies there; a player who reacts does not.
The old build had no reason to ever touch the tower mid-fall, and long falls were
pure spectacle — this is what turns them into the tensest input in the game.

### Pacing against the 120 s cap

Arithmetic bound with the shipped constants (bounce period per ring plus one
ring-gap fall), which is an upper bound because it starts each fall from rest:

| Bounces per ring | Time for 40 rings |
| --- | --- |
| 1 | 41 s |
| 2 | 67 s |
| 3 | 92 s |

So the vault is comfortably reachable, and the clock becomes a real opponent at
around three bounces a ring — which the deep tower, with 46% of the ring lethal
and a 46° gap, will regularly cost you. Combined with the over-fall rule, failure
before ring 40 is now a genuine outcome rather than a theoretical one.

### Carried-over corrections against the design spec's literal values

1. **`ball.bounceHeightPx: 100`, `ball.bounceSeconds: 0.7`** (spec: 90 px /
   0.50 s). The spec pair implies a gravity of **2,880 px/s²**, nearly twice the
   1,600 px/s² arcade gravity the shared kit uses for every other game in the
   catalog. A 100 px apex over a 0.70 s period puts gravity at **1,633 px/s²**,
   within 2% of the kit value. The late-game `lateSpeedup` scales that pair as a
   unit rather than replacing it.

2. **`arcs.fallThroughChance: 0.12`** (spec-derived: 0.28) and **fever shafts of
   2 rings every 9** (was 3 every 7). Between them the original numbers made more
   than half the tower descend with no input at all. They matter more now, not
   less: with a 4-ring ceiling, a 0.28 alignment rate would have made unavoidable
   over-falls common rather than occasional.

3. **`tower.degPerPx: 0.7`** (spec: 0.55). At 0.55 a half-turn takes 327 px of
   drag — essentially the entire play area on a 360 px phone — so the worst-case
   alignment was one edge-to-edge swipe with nothing to spare. At 0.70 a half-turn
   is 257 px, and the tightest 46° gap is still a 66 px drag target, five times
   the kit's 12 px tap threshold.

4. **`fever.seconds: 3.0`** replaces "fever ends after one smash or a normal
   bounce". The fall that grants fever now has at most one more ring to run
   *by rule*, so the spec's reward would expire before the player could steer into
   anything. Three seconds is about six bounces of steering room after landing,
   and a single smash still consumes it.

Fever is lit **at most once per fall**, and a safe landing is what re-arms it, so
`fever.smashLimit: 1` really does mean one smash per fall: the second crash arc
in an uninterrupted fall ends the run. (Without that latch the smash itself
re-satisfies the streak test while the fever clock is momentarily zero, and every
crash arc for the rest of the fall smashes for free.)

### Colour grammar note

The design spec calls the crash arcs "red". The repo-wide rule that **risk always
reads green** outranks it, so they are drawn green with a virus texture — the
same visual language the rest of the catalog uses for risk — with a danger-red
warning stripe along the lip so the hazard still reads at a glance. Blue is
protection (safe arcs, the shield ball, the tower core), gold is wealth (the
vault, the milestone rules, the fever flame). Danger red is reserved for two
things only: that warning stripe, and the ball's own destruction telegraph.
