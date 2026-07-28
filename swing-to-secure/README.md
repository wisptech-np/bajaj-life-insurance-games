# Swing to Secure

A one-thumb rope-swing runner. You are a guardian crossing a canyon on ropes
thrown at protection pylons: **hold** to grab the nearest pylon, **swing** to
build momentum, **release** on the forward swing to fly. Reach the Retirement
Vault at 2,000 m before the 105-second session ends.

## The financial hook

The canyon is a working life and the pylons are cover. Momentum is the only
thing that carries you across a gap, and momentum only survives if you keep
catching the next anchor — miss one and there is nothing under you. The gaps
widen as you go (life gets more expensive), the risk orbs get denser, and the
late-course pylons sway. Milestones are the moments the run is really about:
Graduation, First Job, Marriage, Home, Retirement.

Shield tokens are cover in the literal sense: with one active, a risk orb costs
you the shield instead of the run.

## Controls

| Input | Action |
| --- | --- |
| Press and hold | Throw the rope at the nearest pylon ahead and hang on |
| Release | Let go — you keep the tangential speed you had at that instant |
| Quick tap near a pylon | "Skim": touch the rope and fly on, keeping momentum |

There is no steering. Everything is timing.

- **Release low** (just before the bottom of the arc) for maximum speed and a
  flat, fast trajectory.
- **Release high** (past the bottom, on the way up) for a lofted arc that lands
  you near the next pylon.
- **Perfect Release** fires when you let go swinging forward through the low arc
  (`-0.5 rad < θ < -0.1 rad`). It is the only way to *add* energy to a run, so
  chaining them is how you beat the widest late-course gaps.

## Scoring

| Event | Points |
| --- | --- |
| Coin | 25 |
| Milestone crossed | 300 |
| Perfect Release (once per pylon) | 50 |

Distance itself does not score — it gates the milestones. The results screen
reports `{ score, distance, coins, milestones }`.

## Win / lose

- **Win** — reach the vault at 2,000 m.
- **Lose** — fall past the canyon floor, or run out of the 105-second session.

A risk orb hit while unshielded knocks you off the rope with downward velocity
and blocks grabs for 0.5 s. Early in the course, where pylons are close, that is
survivable. Late, it is not.

## Running it

```bash
pnpm install
pnpm dev        # http://localhost:5037
pnpm build      # uat mode (default); also build:preprod, build:prod
pnpm preview
```

Tunables live in `src/data.js` (`GAME_CONFIG`). Shared game feel — loop, input,
particles, audio, device tiers — comes from `src/kit/`, which is a synced copy of
`shared/game-kit/`. Do not edit `src/kit/` directly; edit the canonical copy and
run `node scripts/sync-game-kit.mjs`.

## Balance notes

Three values in `GAME_CONFIG` needed care, because the obvious reading of each
makes the vault unreachable. All three were checked with a headless simulation of
the exact physics loop driven by scripted players across 40 generated courses.

1. **`rope.damping` is applied per second**, as `omega *= Math.pow(damping, dt)`.
   Physics runs on the kit's fixed 1/120 s step; multiplying by `0.995` once per
   step compounds to about `0.55x` per second, which drains a swing faster than
   `releaseBoost` can pump it. With per-step damping an optimally-played run dies
   around 85 m. `kit/loop.js` documents this class of bug and `kit/effects.js`
   uses the same `pow(k, dt)` idiom for particle drag.

2. **`rope.grabAssistPx` (120) extends the 150 px base reach while falling.**
   A pylon hangs at y≈180 with a 150 px reach, so once you are 140 px below it
   the horizontal grab window is only ~50 px wide. At the base radius alone an
   optimal player never finishes; with the assist, a consistent player wins about
   half their runs. The assist only applies while descending — the moment a run
   is actually lost — so it never hands you a free re-grab on the way up. It also
   makes `rope.maxLen` (260) meaningful for the first time, since a grab can now
   land beyond 260 px.

3. **`player.startSpeed` (620) seeds the opening swing.** A pendulum released
   from rest at y=320 can never rise above y=320, so it can never reach the next
   pylon: without an opening impulse the run is lost before the first input.

A fourth value, `hazards.minY/maxY`, was raised to 230–380 for the same reason:
sitting under the flight arc at 300–430 the risk orbs were never hit once in 40
simulated runs, which made the whole hazard-and-shield system dead content.

### Measured with the shipped values (40 generated courses)

| Player | Win rate | Median distance | Coins | Shield saves |
| --- | --- | --- | --- | --- |
| Times grabs and releases well | ~48% (42 s) | 1,976 m | 129 | 2 |
| Times grabs, releases early | ~30% (36 s) | 1,528 m | 107 | 2 |
| Grabs on sight, no timing | 0% | 180–450 m | 2–20 | 0 |

A winning run scores around 4,400, which is why the results ring is calibrated to
`RESULT_TARGET_SCORE = 4000`.

**Known skill cliff.** Grabbing projects your velocity onto the rope tangent and
throws the radial part away, so a grab taken the instant a pylon enters range —
which is what happens if you simply hold the button down — destroys most of your
momentum. Timing the grab to the moment the rope lines up with your flight path
is the deepest skill in the game, and it is currently unsignposted beyond the
How-to-Play copy. If playtesting shows first-timers stalling under 300 m, the
cheapest fix is a grab-timing assist (defer a held grab until the tangent
aligns) rather than a further radius increase.
