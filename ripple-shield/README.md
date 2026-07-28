# Ripple Shield

A one-tap chain reaction. Forty to sixty orbs drift across the board: blue
**family orbs** to protect, green **virus orbs** to avoid. You get **one tap per
wave** — hold to aim, release to send an expanding shield ripple. Every family
orb the ring sweeps sends out a ripple of its own, so a single well-placed tap
cascades across the screen. Clear all five wave targets inside 120 seconds.

## The financial hook

One policy protects many. The tap is the policy you buy; the cascade is
everything that cover reaches — a partner, a child, a parent, a business
partner, the people they in turn support. Each generation of the ripple carries
a little less reach (`chainDecayPx`), which is exactly the point: cover spreads,
but it thins as it spreads, so *where* you place it decides how far it goes.

The green viruses are the risks that eat cover. A ripple that catches one loses
18 px of its remaining reach, and a ripple worn down below the minimum radius is
spent. Aiming into a virus cluster is how a promising chain dies three orbs in.

## Controls

| Input | Action |
| --- | --- |
| Press and hold | Show the aim reticle and the ripple's reach |
| Drag | Move the aim point |
| Release | Send the ripple — this is your one tap for the wave |
| Tap (quick) | Same thing: fire at the tap point |

Release, not tap, is deliberate. The kit only classifies a press under 250 ms
and 12 px as a "tap", and aiming a single shot is exactly the gesture a player
takes longer over — so the game fires on `onUp` and a considered press works as
well as a quick one. Further presses during the cascade are refused with a tick.

## Wave structure

| Wave | Orbs | Viruses | Family | Target | Drift (ref px/s) |
| --- | --- | --- | --- | --- | --- |
| 1 | 40 | 5 | 35 | 25 | 10-26 |
| 2 | 46 | 8 | 38 | 25 | 14-34 |
| 3 | 50 | 9 | 41 | 26 | 18-42 |
| 4 | 56 | 11 | 45 | 26 | 22-50 |
| 5 | 60 | 13 | 47 | 27 | 26-58 |

A wave ends when the **last ripple has expired**, not when the last orb is
caught — a ring still in flight can still reach one. The wave-clear banner holds
the session clock, so the 1.35 s celebration is not charged to the player.

Orbs **bounce** off the playfield edge rather than wrapping. A wrap would
teleport an orb across the board mid-cascade: it reads as a bug, and it lets an
orb dodge a ripple that had already reached it.

## Scoring

| Event | Points |
| --- | --- |
| Family orb protected | 40 |
| Wave cleared | 200 |
| Chain-depth bonus (per wave) | 20 x deepest generation reached |

A winning run measures around 7,400 (~145 orbs protected, five wave clears, a
mean chain depth of ~6.2 per wave), which is what the results ring treats as a
full circle. The results screen reports `{ score, protected, waves, chain }` —
total orbs protected, waves cleared, and the deepest chain generation of the run.

## Win / lose

- **Win** — clear all five wave targets.
- **Lose** — finish any wave below its target, or run out of the 120 s session.

## Juice

Additive-blended ripple bloom (disc + leading ring + trailing echo), baked orb
halos, spawn pop with overshoot, contact flash rings, pooled particles on every
protected orb and every virus strike, floating `CHAIN n` text every fifth orb,
screen shake on a virus strike, a hit-stop plus a 0.9 s **slow-motion** beat and
a blue wash the moment a cascade passes 15 orbs, an animated score counter, a
protected-count ticker that pops on every increment, and Web Audio synth
throughout (rising chain notes, cover chord on the tap, sawtooth on a risk,
fanfare on the win). All art is canvas-drawn or inline SVG — no emoji, no image
files.

## Balance notes

The gate is `pnpm balance` (`node scripts/balance-sim.mjs [boards] [WxH]`), a
headless simulation that **imports the shipped `src/data.js`** and replays the
component's exact chain resolution: same 1/120 s fixed step, same crossing test,
same virus shrink, same per-generation decay seeded from `rootRadius`, same
bouncing drift.

**Every number in this section is printed by the default run** — `pnpm balance`,
300 boards per wave per strategy (40 for the oracle). It resamples each time, so
expect a couple of points of movement per wave and ~2 points on the five-wave
product.

| Tap profile | W1 | W2 | W3 | W4 | W5 | Full run |
| --- | --- | --- | --- | --- | --- | --- |
| random (uniform) | 62.3% | 47.0% | 48.3% | 50.3% | 47.0% | 3.3% |
| **centre** | **80.0%** | **73.0%** | **72.3%** | **71.0%** | **66.3%** | **19.9%** |
| **centroid of the family orbs** | **79.7%** | **69.3%** | **78.3%** | **81.0%** | **72.0%** | **25.2%** |
| cluster heuristic | 75.3% | 73.7% | 83.0% | 80.7% | 77.7% | 28.9% |
| oracle (best of a 6x8 grid replay) | 100% | 100% | 100% | 97.5% | 97.5% | 95.1% |

The `oracle` row is not a playable strategy: it replays the whole cascade from
every point of a 6x8 grid on the same board and takes the best outcome, which
answers "did a winning tap exist at all". It did, on essentially every board —
so the ceiling is a read of the board, not luck, and the distance from the
random row (3.3% for a run) is the size of the skill. Mega-chains (15+) fire on
88-94% of centre taps: the slow-motion beat is the payoff for a good tap, not a
rarity. Mean chain depth is ~6.2 generations, deepest seen 17.

Four readings differ from the spec's literal values:

1. **`rootRadius: 98` is the whole balance, and it is the only radius.** A
   chained ripple has no radius constant of its own: it inherits its parent's
   *current* maximum minus `chainDecayPx`, so this one number seeds the reach of
   the entire cascade. A chain reaction is continuum percolation — what decides
   it is the mean number of orbs inside one ripple,
   `k = n·π(R + orbRadius)²/area`, against a 2D threshold of k ≈ 4.5. The gate
   prints these: at the root, k runs 7.1 / 7.7 / 8.3 / 9.1 / 9.5 across the five
   waves, comfortably above threshold, which is what makes the first hop
   reliable. The cascade's shape is the walk back down — 2 px per generation,
   18 px per virus — so on a wave-3 board k is 5.3 by R = 76, 4.5 by R = 69, and
   3.6 by R = 60 where the branch is finished. Both ends were measured and
   rejected: at `rootRadius: 126` every branch stays above threshold for its
   whole life and a centre tap clears the board from anywhere; at 76 even the
   first hop is unreliable and clear rates fall to 31-40%.
2. **`virusShrinkPx: 18`, not a third of a radius.** At 26 px a wave-5 board's
   13 viruses ended cascades on contact and the centre-tap clear rate collapsed
   to 41%. 18 px — nine generations' worth of decay in one contact — keeps the
   penalty legible without killing the chain outright.
3. **The target ladder plateaus (25/25/26/26/27) instead of rising every wave.**
   Five waves compound: a run needs all five targets, so a per-wave rate of `r`
   gives `r⁵` overall and a 20% full-run bar needs ~73% per wave. A strictly
   rising ladder measured 12.9% full-run for a centroid tap — half the bar — so
   the ladder sits at the top of the sane band and steps every other wave.
4. **Difficulty still rises, through the board rather than the target.** Each
   wave adds orbs, viruses and drift, so the same number is harder to reach:
   holding the target at 26 costs a centre tap 72.3% on wave 3 and 71.0% on
   wave 4. The target's share of the family orbs falls across the run (71% on
   wave 1, 57% on wave 5) precisely because the board is fighting back harder.

**Cross-device balance.** Every authored length is a reference-playfield length
(382x496) scaled at runtime by `sqrt(area / refArea)`, because orb *density* —
not radius — is what a chain reaction depends on. The default run ends with this
sweep, and `pnpm balance 300 382x665` runs the full table on any one playfield:

| Playfield | Scale | Centre-tap clear per wave |
| --- | --- | --- |
| 382x496 (reference) | 1.000 | 78 / 72 / 68 / 75 / 70% |
| 382x665 (375x812 device) | 1.158 | 74 / 64 / 65 / 73 / 64% |
| 344x520 (small phone) | 0.972 | 77 / 68 / 71 / 75 / 64% |
| 400x760 (tall phone) | 1.267 | 71 / 68 / 70 / 73 / 67% |

The reference row is an independent 300-board sample of the same rates as the
centre row in the table above, so the two differ by a few points of sampling
noise rather than by anything real.

**Reproducibility.** A second default run measured 23.9% centre / 26.0% centroid
for the full run (per-wave centre 79.3 / 73.3 / 72.0 / 79.3 / 72.0%), which is
the size of the sampling band on a five-wave product. Pass a bigger board count
(`pnpm balance 1000`) to narrow it.

**Pacing.** Worst observed cascade takes 3.3-4.0 s to resolve (a max statistic,
so it moves between runs); at 4.0 s, with the 1.35 s banner, that is 26.5 s of
the 120 s session across five waves, leaving ~18.7 s per wave to aim. A player
who dawdles runs out of clock and loses on timeout.

## Performance

- Fixed 1/120 s physics step through the shared kit loop; the session clock and
  gameplay clock are the same clock, so backgrounding cannot burn time.
- Everything static is pre-rendered once per resize: the backdrop, three orb
  sprites with their glow **baked in** (60 `shadowBlur` draws a frame would be
  the single most expensive thing this game could do), and two ripple gradients
  anchored at the origin and scaled by transform at draw time.
- Orbs and ripples are fixed pools allocated at mount and reused for every wave
  of every replay. The contact test is a monotonic ring-crossing comparison, so
  a ripple touches each orb exactly once with no per-ripple hit sets. Nothing in
  the hot loop allocates.
- Particle counts are authored once and scaled by the kit device budget, so a
  low-tier phone gets the same choreography at a quarter of the cost, and
  `prefers-reduced-motion` removes shake, hit-stop and screen animations.
- HUD numbers are written to the DOM through refs (`textContent`, `style.width`,
  `style.transform`), never React state — a 120 Hz tick must not re-render.

## Ports and commands

Dev server on **5046**.

```bash
pnpm install
pnpm dev            # http://localhost:5046
pnpm build          # uat (the gate)
pnpm build:preprod
pnpm build:prod
pnpm preview
pnpm balance             # balance gate: 300 boards/wave + cross-device sweep
pnpm balance 600         # more boards
pnpm balance 300 382x665 # the whole table on a specific playfield
```

## Layout

```
ripple-shield/
  index.html                  viewport meta + Poppins
  vite.config.js              rollup output RippleShield, port 5046
  scripts/balance-sim.mjs     headless balance gate (imports src/data.js)
  src/
    main.jsx  index.css  App.jsx
    RippleShieldGame.jsx      the whole game
    data.js                   COLORS + GAME_CONFIG (every tunable)
    Screens.jsx               Home / How to Play / Results
    LeadCaptureModal.jsx  SlotBookingModal.jsx  ThankYouScreen.jsx
    api.js                    LEAD_NO_KEY = rippleShieldLeadNo
    services/playCount.js  utils/crypto.js  utils/shortener.js
    kit/                      synced copy of shared/game-kit (never edited)
```
