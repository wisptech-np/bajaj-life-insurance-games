# Goal Orbit

An orbit-switch timing arcade. A comet circles a glowing goal planet; **one tap**
releases it tangentially, and the released line has to reach the next planet's
capture ring, where a gravity well snaps it into a new orbit. Chain twenty goals
inside the 120-second session — on three lives — to win.

## The financial hook

The chain is a life plan laid out as a run of orbits. Home is the planet you
start on;
Education, Car, Marriage, Child, Health, Savings, Business, Travel and Legacy are
the goals you transfer through, and every 5th planet is a **milestone** — First
Job (5), Family (10), Wealth (15), Retirement (20) — that pays a bonus banner.

Staying on track is the entire mechanic. Sitting on an orbit costs nothing but
time; leaving it at the wrong instant costs you the goal. The green virus
asteroids sweeping the transfer paths are the risks that arrive between life
stages, and the answer to one is never speed, it is timing — release a beat
earlier or later and the same rock is harmless. Coins sit on the *ideal* transfer
line, so flying the clean arc and being rewarded for it are the same act.

## Controls

| Input | Action |
| --- | --- |
| Tap anywhere | Release the comet along the orbit tangent |

That is the whole control scheme. There is no aiming and no charge: the direction
is wherever the orbit has carried you, so the only decision is *when*.

Capture is assisted — the comet is caught within `orbit.captureBand` (32 logical
px, about half an orbit radius) of the target ring, and the radius is then eased
in over 0.26 s so a near miss reads as a gravity well pulling you in rather than
a snap. The comet's collision radius (8 px) is deliberately smaller than its
drawn head and glow: a rock that looks like it grazed you does not kill you.

## Scoring

| Event | Points |
| --- | --- |
| Each planet reached | 100 |
| Coin | 20 |
| Perfect transfer (released inside one orbit loop) | 50 |
| Milestone planet (every 5th) | 250 |
| Time bonus (win only) | 4 per second left |

The results screen reports `{ score, planets, coins, perfects }` and calibrates
its ring to `RESULT_TARGET_SCORE = 4800` — a clean 20-planet run measures ~4,700.

## Win / lose

- **Win** — capture planet 20 (Retirement) before the clock runs out.
- **Lose** — spend all **3 lives**, or run the 120-second session out short of 20
  planets. A life is lost to a virus asteroid or to a release that leaves the
  chain (off-screen, or `orbit.maxFlightSeconds` without a capture). After a
  0.55 s beat the comet respawns on the planet it left, with 1.6 s of
  invulnerability — you never lose progress, only time.

There is no "crashed into a goal" failure: `planets.bodyFrac` keeps every planet
body below half its orbit radius, so the capture ring is always clear of the
body and the comet is caught before it can touch anything.

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:5050
pnpm build      # uat mode (default); also build:preprod, build:prod
pnpm preview
```

Tunables live in `src/data.js` (`GAME_CONFIG`, `COLORS`). The orbital model, the
chain generator and its solvability proofs live in `src/orbit.js`, which the
headless balance sim imports directly — the sim measures the constants the game
actually ships. Shared game feel — fixed-step loop, pointer input, pooled
particles, Web Audio synth, device tiers — comes from `src/kit/`, a synced copy
of `shared/game-kit/`. Do not edit `src/kit/` directly; edit the canonical copy
and run `node scripts/sync-game-kit.mjs`.

Balance gate:

```bash
node tools/balance-sim.mjs 250
```

## Balance notes

Six values in `GAME_CONFIG` needed a specific reading, because the obvious one
makes the chain either unplayable or not a game. All six were checked with
`tools/balance-sim.mjs`, which imports `src/data.js` and `src/orbit.js` and
answers the three ways an orbit-timing game goes wrong: is the geometry always
solvable, are the asteroids always avoidable, and can a decent player finish
inside the session.

1. **The chain is generated in fixed logical units**, not screen pixels, and the
   whole scene is drawn at one uniform scale `canvasWidth / world.width` (410).
   Generating in pixels would make the game measurably easier on a wide phone —
   and generation runs at mount, before the canvas has been measured, so there is
   no screen width to reason about anyway.

2. **`orbit.launchBoost: 1.6` with a `[150, 300]` clamp.** A physically honest
   tangential release is `omega * R` ≈ 80 logical px/s at the opening speed,
   which crosses a 200 px gap in 2.5 s — measured, that reads as the comet being
   *dragged* rather than slung. The boost is the slingshot the art promises; the
   floor stops the opening transfers crawling and the ceiling keeps the late ones
   readable.

3. **`orbit.omegaStart: 1.35` (was 1.65).** The angular-speed ramp is also the
   session-length control, because half a loop is the average wait for a release
   window. At the first-cut 1.65 → 2.55 ramp a clean run measured **38 s**, under
   the 60 s floor in GAME_STANDARD §3. Slowing the opening lengthens the run
   without making any single transfer harder — what actually bounds the ramp is
   `minWindowSeconds`, not the top speed.

4. **Asteroids are anchored to the transfer line, not the planet-to-planet
   axis** (`asteroids.along`, `offsetFrac`). The transfer line leaves the source
   ring tangentially, so it escapes the source's keep-out disk far sooner than
   the axis, whose two keep-out disks overlap at every authored spacing. Laid out
   on the axis, **95% of rolled rocks were rejected** and a whole chain averaged
   one rock.

5. **`asteroids.radius: [9, 13]` with `halfSpan: [55, 92]`** (was `[11, 15]` /
   `[34, 66]`). The share of a cycle a rock spends blocking the line is
   `4 * (rockR + cometR) / (2*pi * halfSpan * cos(crossing))` — independent of
   the rock's speed, which cancels. So the fairness knob is the radius-to-span
   ratio, not the pace. The first cut blocked ~32% of the window per rock and
   killed a rock-dodging agent 2.9 times a run; the shipped values block ~17%.

6. **Every gap is simulated, not just laid out.** Placement alone does not prove
   a gap is passable — an asteroid can sweep the whole release window. The
   generator flies `verifyLoops (6) x verifySamples (6)` releases across the
   window against the moving rocks, and re-rolls the gap's asteroids (then drops
   one, then another) until a clear release exists, with `minClearFraction: 0.45`
   so no gap passes on a single needle and `maxWaitLoops: 3` so a hazard costs a
   beat, never the session clock.

### Measured with the shipped values (250 generated chains, 5,000 gaps)

**Geometry.** 0 unreachable releases. Release window **0.77-1.18 rad**
(p50 0.94), which is **0.33-0.87 s** of real time (p50 0.51 s) — the floor is
about 2x the median human tap-latency spread. Generation costs 21.6 ms/chain.

**Asteroids.** 28 rocks per chain. 0 gaps left blocked. Clear-release fraction
min **0.47**, p50 0.69. Worst case a gap made an agent wait **1 orbit loop**
(p50: 0).

| Agent | Win rate | Planets | Deaths | Coins / perfects | Mean score | Winning run |
| --- | --- | --- | --- | --- | --- | --- |
| Well-timed, dodges rocks (σ 35 ms) | **100%** | 20.00 / 20 | 0.05 | 36.4 / 15.6 | 4,731 | 44.6-85.2 s (p50 64.1) |
| Decent, dodges rocks (σ 55 ms) | **99.6%** | 19.99 / 20 | 0.36 | 35.6 / 15.6 | 4,704 | 44.8-99.5 s (p50 64.5) |
| Decent, ignores rocks (σ 55 ms) | 0.4% | 10.17 / 20 | 2.99 | 23.8 / 10.1 | 2,412 | — |
| Sloppy, ignores rocks (σ 90 ms) | 0.4% | 10.05 / 20 | 2.99 | 21.6 / 9.9 | 2,341 | — |
| Random taps | **0%** | 0.60 / 20 | 3.00 | 0.6 / 0.3 | 87 | — |

### The three fairness gates

- **Every release window is reachable and tappable.** No gap in 5,000 was
  unreachable, and the narrowest window in the whole sample was 0.33 s wide —
  enforced at generation by `minWindowSeconds: 0.26` *and* `minWindowRadians:
  0.5`, so a slow early planet cannot buy a knife-edge window just by being slow.
- **Every asteroid is dodgeable.** No gap was left blocked, the worst gap still
  offered a clear release on 47% of the window, and no gap ever cost more than
  one orbit loop of waiting.
- **The clock is a backstop, not the opponent.** Winning runs finish in
  **44.6-99.5 s** against the 120 s budget, comfortably inside GAME_STANDARD §3's
  60-120 s window, and the whole timing skill is legible: the only difference
  between the 99.6% agent and the 0.4% agent is whether it looks at the rocks.

**Known skill cliff.** Ignoring the asteroids caps you at ~10 planets, and the
sim's rock-ignoring agents die almost exactly 3 times per run whatever their tap
precision — the rocks, not the timing, are the difficulty. That is the intended
reading (risk is what stops a plan, not clumsiness), but it means a first-timer
who has not noticed the rocks will lose all three lives in the same place. The
How-to-Play third beat and the release-window hint on the first two planets
(`view.windowHintPlanets: 2`) are the current signposting; if playtesting shows
people still not seeing them, the cheap fix is a one-shot HUD nudge on the first
asteroid death rather than another spacing change.
