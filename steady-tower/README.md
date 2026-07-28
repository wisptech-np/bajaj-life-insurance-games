# Steady Tower

A Jenga-style de-risking game. A 12-layer tower, three blocks per layer. Eight of
the 36 blocks are **red risks** — high-interest debt, a junk fund, card dues, a
payday loan. The other 28 are **blue foundation** blocks: term cover, an
emergency fund, health cover, a monthly SIP. Flick every red block out inside
120 seconds without racking the tower over.

## The financial hook

De-risking a portfolio is not "sell the bad things". It is "sell the bad things
*in an order that leaves you standing*". Every risk block is carrying some of the
load, and pulling one always makes the tower less stable for a moment — the
question is whether the tower can absorb it now, or whether you should take the
weight off somewhere else first.

The foundation blocks are the answer to that question, and the game will not let
you remove them: tug a blue block and it shakes but stays. That is the whole
argument in one interaction. Term cover, an emergency fund and health cover are
not things you optimise away; they are what makes it safe to change anything else.

## Controls

| Input | Action |
| --- | --- |
| Flick a red block left or right | Pull it out that way |
| Tap a red block | Nothing — it tells you to flick |
| Flick a blue block | Refused, but the tower still rocks |

A flick registers at **30 px of horizontal travel**, and only if the horizontal
distance beats the vertical by 1.25x — a mostly-vertical drag is a scroll
attempt, not a pull.

**Flick speed matters.** There is a clean band of **380–1,100 px/s**. Slower than
that reads as scraping the block out against its neighbours; faster reads as
yanking. Both add extra wobble, up to 1.4x the base kick x 1.6.

**Flick direction matters.** The tower is dragged the way your thumb went, so
pulling toward the side it is already leaning is worse than pulling away from it.

**Waiting matters most.** Every pull leaves the tower wobbling. Pull again before
it settles and the kicks stack.

## The stability meter

The bar under the HUD is the tower's live centre-of-mass reading. The track is
the support footprint at the tightest interface in the stack; the orange needle
is where the centre of mass actually sits; the coloured bar is the headroom left
between them. Green above 55%, orange from 34% to 55%, red below 34% — and below
34% the meter **heartbeats** and a tick fires, faster the closer you are to gone.

## Scoring

| Term | Points |
| --- | --- |
| Each risk pulled out | 200 |
| Average stability across the run | up to 600 (600 x average) |
| Time bonus (win only) | 6 per second left |

The results screen reports `{ score, risks, stability, time }` — risks pulled,
average stability as a percentage, and seconds remaining at the end.

## Win / lose

- **Win** — all 8 risks out, and the tower rides out the settle beat afterwards.
  Clearing the last risk is not the win; holding steady for up to 2.4 s after it is.
- **Lose** — the lean passes the collapse angle (the tower comes apart on screen),
  or the 120 s session expires with risks still standing.

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:5047
pnpm build      # uat mode (default); also build:preprod, build:prod
pnpm preview

node scripts/balance.mjs        # the balance gate; exits non-zero on failure
```

Tunables live in `src/data.js` (`GAME_CONFIG`). Shared game feel — loop, input,
particles, audio, device tiers — comes from `src/kit/`, which is a synced copy of
`shared/game-kit/`. Do not edit `src/kit/` directly; edit the canonical copy and
run `node scripts/sync-game-kit.mjs`.

## The physics model

Documented because the brief allows a simplified solver and this is the one that
shipped. It is two pieces, both in `src/data.js`, both pure functions with no
React or canvas anywhere near them — which is exactly why the balance gate can
import them into node and measure the real thing.

### 1. Statics — centre of mass against support span

`evaluateMasks(masks, cfg, theta)`. A layer is a 3-bit mask of the blocks still
in it. For every interface — the base plate under layer 0, then each layer
resting on the one below — the model compares the centre of mass of everything at
or above that interface against the span the layer below actually provides:

```
support of layer i-1 = [min(present x) - 0.5, max(present x) + 0.5]
off_i     = (C_i - centre_i) / halfSpan_i
margin_i  = 1 - |off_i|
```

The tower's **stability** is the tightest `margin` across all interfaces, and the
**offset** the meter needle draws is the signed `off` at that same interface.
Margin 1 is perfectly centred; 0 means the centre of mass sits exactly over the
support edge; below 0 it is already falling. Everything is in normalised units
where a block is 1.0 wide, so no reading depends on the canvas size.

### 2. The lean is a **shear**, not a rotation

This is the part that makes the game work. `theta` feeds back into the statics as
a shear: a layer sitting `h` above an interface is carried `h * tan(theta)` off
the support it is standing on.

A tower of loose blocks does not pivot about its base like a monolith — it
**racks**. Modelling the lean as a rigid rotation would leave every internal
interface unchanged (the geometry between layer i and layer i-1 is unaffected by
rotating both), so only the ground contact could ever fail, and a 12-layer tower
would need a ~42-degree lean before that happened. That is not how these towers
fall, and it is not a game.

`solver.layerHeight` (0.42, the layer pitch in block widths) is the moment arm
this uses, which is why `buildGeometry` derives block **height** from block width
rather than from whatever space was left over: drawing the tower at a different
aspect ratio would silently retune the physics per device.

### 3. The lean integrator

`createLeanSolver(cfg)`. One rotational degree of freedom, a damped spring pulled
toward the lean the current offset implies:

```
k_eff = stiffness * max(minStiffnessFrac, margin)      // 58 * max(0.08, margin)
alpha = -k_eff * (theta - maxLean * off) - damping * theta'
```

**The spring constant is scaled by the live margin.** A healthy tower is stiff and
springs back from a hard yank; a tower near its limit is physically floppy and
keeps going from the same nudge. That single coupling is why the stability meter
is worth watching rather than decorative, and combined with the shear feedback it
produces a genuine instability: leaning worsens the margin, a worse margin softens
the spring, a softer spring leans further.

Past `toppleAngle` (0.21 rad) or once the margin goes negative, the spring is
abandoned for an inverted-pendulum acceleration; the tower comes apart at
`collapseAngle` (0.44 rad). The gap between those two angles is the slow tilt
before the fall — and because damping is constant while stiffness collapses, a
critical tower goes over *slowly*, which is what sells it.

Ambient breathing sway (`wobble.idleSwayRad`, scaled by `1 - stability`) is
folded in once per tick as `visualTheta` so the renderer, the hit test and the
pull feedback all agree where a block is. It never feeds back into the
integrator: a shaky reading should look shaky without being able to accumulate
into a topple on its own.

### Alternating layers in a flat front view

Real Jenga rotates each layer 90 degrees. A literal front projection of that
shows three tappable blocks on only half the layers — the other half present one
unbroken face. So the alternation is carried by the face treatment instead:
odd layers are drawn end-grain (recessed end face, concentric growth rings,
seamed top) and even layers long-grain (lengthwise straight grain, unbroken top).
Three tappable blocks on every layer, and the orientation still reads.

## Balance notes

`node scripts/balance.mjs` is the gate. It imports `src/data.js` — the generator,
the statics, the lean integrator — and runs two passes. It exits non-zero if any
of them fail.

### Pass 1: every tower is proven winnable AND proven topple-able

Removals are independent, so the reachable state space is exactly the 2^8 = 256
subsets of the remaining risks and can be **enumerated outright** rather than
sampled. For each generated tower the gate:

1. Evaluates all 256 states at `theta = 0` (settled statics).
2. Counts, by dynamic programming over popcount, how many of the 40,320 removal
   orders keep **every** intermediate state at or above `safeMargin` (0.30). More
   than zero means winnable, and winnable with headroom rather than by a hair.
3. Drives the tower through the shipped lean integrator with the **worst possible
   order** — greedily take whichever removal leaves the lowest margin, never wait
   for the wobble to die, always flick toward the lean, at 1,900 px/s — and
   requires that it actually falls over.

`buildVerifiedTower` runs the same checks at mount, re-rolling up to 600 times,
and falls back to a checked-in layout (`FALLBACK_REDS`, itself verified) rather
than ever shipping an unverified tower.

Measured over **500 generated towers**:

| | result |
| --- | --- |
| Winnable (a safe order exists) | **500 / 500** |
| Worst-order careless run topples | **500 / 500** |
| Final state stable | **500 / 500** |
| Fell back to `FALLBACK_REDS` | **0 / 500** |
| Generation attempts | 1 / **24 median** / 208 (budget 600) |
| Final margin | 0.348 – 0.383 (median 0.357) |
| Worst reachable margin | 0.228 – 0.280 (median 0.257) |
| Safe orders of 40,320 | 32.1% – 50.0% (median 41.7%) |
| States in the heartbeat band | 14.8% – 26.6% of 256 (median 19.9%) |

So roughly **four in ten orders are safe end to end** — enough that a thoughtful
player is not memorising a solution, few enough that order is a real decision.

### The "no red block is the sole support" rule

The brief rules out a red block whose removal guarantees a topple regardless of
order. Three structural rules in the generator enforce it, and the exhaustive
analysis above confirms it:

1. **The bottom two layers are never red.** The interface carrying the entire
   tower can never be narrowed by the player.
2. **At most one red per layer**, except for one deliberate **pinch layer** in the
   7–9 band, where both *edges* are red and the *middle is blue*. Clearing it
   leaves the tower balanced on a single centred block — a genuine knife edge —
   but the sole remaining support is always a BLUE block, never a red one.
3. **No three consecutive layers lose the same column**, and column usage is
   balanced within 3. Stacking a support shift and a mass shift in the same
   direction is the one pattern that reliably produces an unwinnable end state.

Rule 2 is also why `maxMiddleReds` is capped at 3: removing a middle block leaves
the layer's support span unchanged (the two edges still bracket it), so middle
reds are nearly free. A couple of them makes good opening pulls; eight would make
the game a formality.

### Pass 2: dynamic runs through the shipped integrator

500 runs per scripted player. Same fixed 1/120 s step, same `createLeanSolver`,
same `pullImpulse` the game calls.

| Player | Win | Topple | Winning run | Median score | Median avg stability |
| --- | --- | --- | --- | --- | --- |
| **Steady** — waits for settle, best-margin order, clean flick away from the lean | **100%** | 0% | 9.8–11.6 s | 2,594 | 56.2% |
| **Casual** — settles between pulls, random order, slightly hard flick | **80.6%** | 19.4% | 11.3–13.5 s | 2,493 | 42.5% |
| **Careless** — no settle, random order, random hard flicks | **16.8%** | 83.2% | 5.3 s | 2,525 | 49.2% |

Both outcomes are reachable and the gap between them is skill, not luck:
patience and order take the win rate from 17% to 100%. That is the game.

A winning run measures around 2,500–2,600, which is why the results ring is
calibrated to `RESULT_TARGET_SCORE = 2600`.

### Corrections against the brief's literal reading

1. **8 risk blocks, not "some".** A pull plus its settle is 2–3.5 s of real play,
   so 8 is a 25–45 s core loop inside the 120 s cap. It also keeps the exhaustive
   analyser at 256 states, which is what makes the mount-time proof affordable.
2. **The lean is a shear, not a rigid rotation.** Under rigid rotation the
   internal interfaces never change and the tower is effectively untippable —
   measured, the worst reachable state sat at margin 0.345 and the careless player
   won 100% of runs. See "The physics model" above.
3. **Stiffness scales with the live margin.** Without it the topple threshold has
   to be an arbitrary angle, and the stability meter becomes a readout with no
   mechanical consequence.
4. **The win is the settle, not the last pull.** Clearing the final risk with a
   hard yank should not be a win, so the tower has to ride out up to 2.4 s
   afterwards. If the session clock expires during that hold with every risk
   already out, it counts as a win — losing on a technicality is not drama.

### Known simplification

The model has one rotational degree of freedom for the whole tower, so the tower
can only lean in the plane of the screen and blocks never settle into a new
resting configuration mid-run: the stack is either standing or collapsing. A full
stacked-body solver would let a tower shed a block, resettle lower and continue.
That is a richer game and a much less predictable one — with 256 states to prove
against, the deterministic model is what makes the winnability guarantee possible
at all. If playtesting wants the extra drama, the honest place to add it is a
one-off "block slips" event with its own scripted resettle, not a general solver.
