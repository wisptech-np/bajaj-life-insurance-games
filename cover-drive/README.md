# Cover Drive

Cricket batting timing. Chase **40 runs off 18 balls** with **3 wickets** in hand,
under lights, with one control: **tap to swing**.

> Every ball is a life event — cover it with the right timing.

## Concept

The bowler telegraphs each delivery before he runs in:

- a **coloured length marker** on the pitch — blue Loopy, orange Stock, red Express;
- the **delivery card** naming it as a life event ("Medical emergency yorker",
  "Inflation bouncer", "School-fee seamer", "Premium-holiday slower ball");
- **red dashed rails** from the marker to the timber when the ball is on the stumps.

Then a timing gauge sweeps around the crease and you have to meet it.

| Band | Window (reference pace) | Outcome |
|---|---|---|
| **PERFECT** | ±18.7 ms | Boundary — alternates **4**, then **6** |
| **GOOD** | ±46.8 ms | **1** then **2**, alternating |
| **EDGE** | ±78.0 ms | No run, and a **35%** chance of being out |
| **MISS** | outside that, or no shot | Out if the ball was on the stumps (**60%** of deliveries) |

Windows are authored in milliseconds and **divided by the delivery's speed**, so an
Express ball in the third over is quicker in both senses: less time to react, and a
PERFECT window of ±13.6 ms instead of ±18.7 ms. The gauge's green bands are drawn
from the actual window, so the telegraph is honest — a fast ball visibly has a
narrower target.

**Cover ball.** Every 6th delivery is marked with a blue halo. Middle it and you bank
a **wicket shield**: the next dismissal is absorbed, the stumps rattle, and the chase
survives. Maximum one at a time.

**Ramp.** Ball speed rises **8% every over** (6 balls). From ball 7 the bowler mixes
in a **slower ball at 0.8×** — more air, a wider window, and a wrecked rhythm if you
had settled into the quick one.

- **Win:** reach 40 runs inside 18 balls with wickets remaining.
- **Lose:** 3 wickets, or the 18 balls run out short.

## Financial hook — timing, and what cover actually buys

The whole game is one argument, laid out as a run chase:

- **You do not get to choose the deliveries.** Medical emergencies, inflation, job
  loss and school fees arrive on someone else's schedule. All you control is how you
  meet them.
- **The required rate is real.** 40 off 18 is 2.22 a ball. You cannot nurdle singles
  to it — you need roughly eight boundaries. Playing safe is also a way to lose,
  which is the honest version of "cash under the mattress is a decision too".
- **Cover is a floor, not a ceiling.** The shield never adds a run. It only stops one
  mistake ending the innings. That is exactly what a term plan does: it does not
  raise your upside, it stops the downside being total.
- **You have to earn the cover before you need it.** The shield is banked on a Cover
  ball, in the middle of the chase, well before the ball that would have bowled you.
  Buying protection after the event is not on the menu — in the game or outside it.
- **The bowler gets quicker.** Every over is 8% faster. The cost of the same mistake
  goes up with time, and so does the value of already being covered.

## Controls

- **Tap anywhere** on the stage to swing. That is the whole control scheme.
- Tapping before the ball is released is a flinch, not a dismissal — you cannot be
  out to a ball that has not been bowled.
- Not swinging at all is a **leave**: safe on an off-line ball, bowled on a straight
  one, and worth nothing either way.

## Scoring and the stats contract

Runs are the score. The results screen and the `onWin` / `onLose` payload use exactly:

```js
{ runs, boundaries, wickets, perfects }
```

## Balance

`scripts/balance.mjs` imports the **shipped** modules — `src/deliveries.js`,
`src/rules.js`, `src/data.js` — and drives whole innings headless through the same
functions the canvas calls. It never re-implements a rule, so the table below cannot
drift from the game.

```
node scripts/balance.mjs                 # the gate (500 seeded innings per bot)
node scripts/balance.mjs --runs 4000     # tighter confidence interval
node scripts/balance.mjs --sweep         # chase success vs windowScale
node scripts/balance.mjs --scale 0.62    # probe one windowScale, no gate
```

Three assertions, all of which must hold or the script exits 1:

| Gate | Requirement | Measured (500 seeds) |
|---|---|---|
| Casual bat, σ = 45 ms | chase success 25–45% | **35.0%** (36.3% over 4,000) |
| Metronome bat, σ = 12 ms | ≥ 95% — the skill ceiling is reachable | **100.0%** |
| Longest possible innings | inside `sessionSeconds` (100 s) | **72.7 s**, 27.3 s spare |

Casual bat detail: 15.4 balls faced, 4.8 perfects, 4.8 boundaries, 1.7 wickets, 0.67
shields won and 0.37 wickets absorbed per innings. Its losses split almost exactly
evenly between **all out** (162) and **balls gone** (163), so both lose conditions
are live — the game is neither a pure survival test nor a pure run chase.

### Spec correction — `timing.windowScale`

The design spec's literal windows (36 / 90 / 150 ms) are unreachably generous against
the spec's own σ = 45 ms bot: ±36 ms is 0.8σ, so that bot times well over half its
balls PERFECT and chases 40 as a formality. Measured on the shipped rules at
`windowScale 1.00`, its chase success is **99.3%** against a brief that asks for
25–45%.

One constant scales all three windows together, so the authored 36 : 90 : 150 ratio
survives exactly and only the absolute difficulty moves:

| `windowScale` | 0.45 | 0.48 | 0.50 | **0.52** | 0.55 | 0.58 | 0.62 | 0.70 | 1.00 |
|---|---|---|---|---|---|---|---|---|---|
| casual σ=45 | 18.9% | 25.4% | 30.9% | **36.3%** | 44.3% | 51.4% | 62.1% | 78.7% | 99.3% |
| ceiling σ=12 | 100% | 100% | 100% | **100%** | 100% | 100% | 100% | 100% | 100% |

0.52 sits mid-band with a two-sided margin (the band spans roughly 0.478–0.553), and
the skill ceiling is untouched at every value — a metronomic bat always wins, so the
correction costs nothing at the top end. Rationale is logged in
`okf-brain/cover-drive/log.md`.

## Structure

```
src/
  data.js              GAME_CONFIG + COLORS — every tunable, nothing hard-coded elsewhere
  deliveries.js        PURE: seeded PRNG, Gaussian, delivery generation, timing windows
  rules.js             PURE: swing classification, the chase, the stats contract
  CoverDriveGame.jsx   canvas: rendering, animation, input, juice. Owns no rules.
  Screens.jsx          Home / How to Play / Results — inline SVG only
  App.jsx              screen flow + lead capture + slot booking
scripts/balance.mjs    headless gate over the shipped modules
```

`deliveries.js` and `rules.js` import no DOM, no React and no canvas, which is what
lets the balance gate run the shipping code under Node.

## Rendering

Everything on the canvas is drawn programmatically — no images, no emoji. Floodlit
sky with pylons and a speckled crowd, a boundary rope drawn as the top arc of a wide
ellipse, a perspective pitch with worn patch and creases, batter and bowler as
rounded-rect-and-circle rigs, three stumps and two bails that scatter on a dismissal,
a seamed ball with a tapering trail, and a timing gauge whose bands are the real
judgment windows. The static half (sky, stands, outfield, rope, pitch) is baked into
one offscreen bitmap per resize and blitted, so the hot loop builds no paths or
gradients.

## Build

```
pnpm install
pnpm build         # vite build --mode uat — the hard gate
pnpm dev           # http://localhost:5056
```

Port **5056**. CRM identity: `coverDriveLeadNo` / `Cover Drive Lead`.
