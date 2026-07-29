# Premium Pinball

Portrait single-screen pinball with real flipper physics. Dev port **5055**.

## Concept

A pinball table where the three goal bumpers are the three things a life policy
is actually for — **Education**, **Home** and **Retirement**. The ball is the
cover itself: keep it in play and the goals keep getting funded; let it drain
between the flippers and the premium lapses.

> Keep your family's cover in play — every save at the flippers is a premium
> paid on time.

## Financial hook

Three rollover lanes across the top arm **Bonus Secure** — light all three and
everything scores double for 8 seconds. That is the compounding argument in
arcade form: the discipline of covering every lane pays more than any single
big hit. The drain is labelled LAPSE, because that is what it is.

## Controls

| Input | Action |
| --- | --- |
| Hold anywhere (ball in lane) | Charge the plunger — power decides how far round the top orbit the ball travels, and therefore which rollover lane it drops into |
| Release | Launch |
| Tap / hold LEFT half | Left flipper (holding keeps it raised) |
| Tap / hold RIGHT half | Right flipper |
| Both at once | Supported — the game uses its own multi-pointer handler, because `kit/input.js` is single-pointer by design |
| Holding a flipper up | Supported and measured. Cradling is legal but not free: hold a flipper up and balls coming down that side roll past it into the outlane |
| Arrow keys / A, D / Space | Desktop equivalents |

## Scoring

| Event | Points |
| --- | --- |
| Goal bumper | 50 |
| Rollover lane (first time lit) | 75 |
| Slingshot | 25 |
| All three goal bumpers on one ball | 500 |
| Bonus Secure | everything above x2 for 8s |

**Win** at 3,000 points. **Lose** on three drains or when the 120 s clock runs
out short of target. Combo counts chained scoring contacts inside 1.5 s.

**Cover Note (ball save):** a drain inside the first 9 s of a ball is forgiven
once per ball — the ball re-serves with a banner and no ball is charged. It is
the grace period on a missed premium: cover does not lapse the instant you are
late.

Stats contract handed to the results screen: `{score, bumpers, goalsLit, combo}`.

## Architecture

Rules and pixels are separated so the balance gate can drive the shipped game:

| File | Contents | DOM? |
| --- | --- | --- |
| `src/data.js` | every tunable — geometry, physics, scoring, effects | no |
| `src/table.js` | builds collision primitives from the tunables | no |
| `src/physics.js` | substepped circle-vs-segment / circle-vs-circle solver, rotating-capsule flipper | no |
| `src/engine.js` | run state machine, scoring, win/lose | no |
| `src/render.js` | every canvas painter | only `document.createElement('canvas')` |
| `src/PremiumPinballGame.jsx` | canvas shell, input, juice | yes |

The table is authored at a fixed 400x640 and letterboxed onto the canvas, so the
playfield is geometrically identical on every handset — a flipper gap that
scaled with the viewport would be a different game on a different phone.

## Verification

```bash
pnpm install
pnpm balance     # 200 seeded bot runs: win rate, tunnelling, speed ceiling
pnpm smoke       # every canvas painter, under Node, on real engine state
pnpm build       # the hard gate (vite build --mode uat)
pnpm verify      # all three
```

`pnpm balance` runs three flipper-hold profiles (tap 110ms, cradle 800ms,
cradle 3s) and asserts: tap win rate 20–45% and both cradle profiles 5–60%;
**zero** watchdog drains on every profile; **zero** tunnelling events; peak ball
speed within the 1500 px/s ceiling; at least 4 collision substeps per tick; and
wall-vs-flipper clearance above 2×ball + flipper radius across the entire
flipper sweep. It imports `src/data.js`, `src/table.js`, `src/physics.js` and
`src/engine.js` directly — it never re-implements a rule.

The hold axis matters: a held flipper changes the collision geometry of the
whole lower playfield, so a gate that only measures tapping only proves that
tapping works.

```bash
pnpm dev         # http://localhost:5055
```
