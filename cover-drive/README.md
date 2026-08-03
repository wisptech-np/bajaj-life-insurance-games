# Cover Drive

Cricket batting under lights. Chase **48 runs off 18 balls** with **3 wickets** in
hand, using one gesture: **tap to swing — and where you tap picks the zone you are
hitting into.**

> Every ball is a life event. Which goal you aim at is a financial choice.

## Concept

The bowler telegraphs each delivery before he runs in:

- a **coloured length marker** on the pitch — blue Loopy, orange Stock, red Express;
- the **delivery card** naming it as a life event ("Medical emergency yorker",
  "Inflation bouncer", "School-fee seamer", "Premium-holiday slower ball");
- **red dashed rails** from the marker to the timber when the ball is on the stumps.

Then the bat sweeps, and the ball either finds the middle of it or does not.

### There is a real bat and a real ball

Nothing about a shot is decided by a stopwatch. `src/physics.js` models the ball as a
circle travelling a straight line across the pitch and the bat as a **segment** from
0.34 m to 0.98 m out from the batter's hands, rotating at a constant rate through 118°
over 0.30 s. Contact is a **swept test**: the swing is sub-stepped 256 times and each
sub-step measures the true minimum distance between the *ball's travel segment* and
the *blade segment*. A ball at 26 m/s covers more ground in one sub-step than the bat
is thick, so a point-in-time test would tunnel straight through it.

What the shot is worth comes out of **where on the blade it landed**:

| Contact | Distance from the sweet spot | Reads as |
|---|---|---|
| **Middled** | within 125 mm | Middle of the bat |
| **Good** | within 260 mm | Worked away |
| **Edge** | anywhere else on the blade | Off the toe or the splice |
| **Miss** | the blade never reached it | Bowled, if the ball was on the stumps |

The timing gauge's bands are not authored. `physics.connectWindow()` bisects the same
swept collision, per delivery, and the renderer draws the seconds it returns — so the
gauge cannot promise a window the bat will not honour.

**Batter placement.** A real batter moves to the line, so the hands track the
delivery's line 88% of the way and the body stands to the leg side of them. What is
left over is the perpendicular distance from the hands to the ball's path, and that
distance is what sets the windows: a ball angled away from the body is played nearer
the hands and is measurably harder. The length marker telegraphs it before the run-up.

## The four insurance zones

The outfield is divided into four wedges, and the horizontal position of the swing tap
picks one. They do not just pay different amounts — they have different *shapes* of
payout, which is what makes shot selection a financial decision rather than a
preference.

| Zone | Middled | Good | Edge | Risk |
|---|---|---|---|---|
| **Child's Education** — through the covers | 4 | 3 | 0 | 14% caught on a good shot |
| **Protection Cover** — straight past the bowler | 4 **+ a wicket shield** | 1 | 0 | 10% |
| **Retirement Corner** — over deep midwicket, aerial | **6** | 3 | 0 | **36%** |
| **Guaranteed Income** — nudged square, along the ground | 2 | 2 | **1** | none |

- **Guaranteed Income** is the floor: it pays even off an edge and can never get you
  caught. It also cannot win — 2 a ball off 18 is 36, and the target is 48.
- **Retirement Corner** is the only six on the field and the only zone where a
  merely-good shot is caught more than a third of the time.
- **Protection Cover** pays fewer runs and banks a **wicket shield** instead, which
  absorbs the next dismissal. It buys survival rather than runs, and you have to buy
  it *before* the ball that would have ended the innings.

The required rate is what forces the choice. `Need 6 off 12` makes Income obviously
correct; `Need 14 off 3` forces Retirement Corner and its catch risk. A coach pip on
the strip shows what `rules.suggestZone()` would pick — the same function the balance
bot plays with, so the game teaches what the gate measures.

**Ramp.** Ball speed rises **6% every over** (6 balls). From ball 7 the bowler mixes
in a **slower ball at 0.82×** — more air, a wider window, and a wrecked rhythm if you
had settled into the quick one.

- **Win:** reach 48 runs inside 18 balls with wickets remaining.
- **Lose:** 3 wickets, or the 18 balls run out short.

## Financial hook

- **You do not get to choose the deliveries.** Medical emergencies, inflation, job loss
  and school fees arrive on someone else's schedule. All you control is how you meet
  them, and which goal you send the ball toward.
- **The required rate is real.** 48 off 18 is 2.67 a ball. Guaranteed Income alone
  tops out at 36. Playing safe is also a way to lose — the honest version of "cash
  under the mattress is a decision too".
- **Cover is a floor, not a ceiling.** The shield never adds a run. It only stops one
  mistake ending the innings, which is exactly what a term plan does.
- **You have to earn the cover before you need it.** Protection Cover is banked in the
  middle of the chase, well before the ball that would have bowled you.
- **The bowler gets quicker.** The cost of the same mistake goes up with time, and so
  does the value of already being covered.

## Controls

- **Tap a lane** at the bottom of the stage to swing. Where you tap is the zone; when
  you tap is the timing. One gesture, both halves of the decision.
- Tapping before the ball is released only **moves the aim** — a flinch, not a
  dismissal. You cannot be out to a ball that has not been bowled.
- Not swinging at all is a **leave**: safe on an off-line ball, bowled on a straight
  one.

## Scoring and the stats contract

Runs are the score. The results screen and the `onWin` / `onLose` payload use exactly:

```js
{ runs, boundaries, wickets, perfects, shieldSaves, zoneRuns }
```

`runs` is what the CRM records. `zoneRuns` drives the results screen's summary table.

## Balance

`scripts/balance.mjs` imports the **shipped** modules — `src/physics.js`,
`src/deliveries.js`, `src/rules.js`, `src/data.js` — and drives whole innings headless
through the same functions the canvas calls. It never re-implements a rule.

```
node scripts/balance.mjs                 # the gate (800 seeded innings per bot)
node scripts/balance.mjs --runs 5000     # tighter confidence interval
node scripts/balance.mjs --windows       # the per-pace window table only
node scripts/balance.mjs --target 52     # probe a chase target, no gate
```

Every gate must hold or the script exits 1. Measured at 2,000 innings per bot,
seed `0x0c07d21e`:

| Gate | Requirement | Measured |
|---|---|---|
| **A perfectly timed swing always connects** | every delivery, at every pace and every point in the ramp | **4,450 / 4,450 connected and middled**; worst residual 113 mm inside the 125 mm tolerance |
| Reaction budget at the fastest delivery | above human reaction time (~0.25 s) | **0.476 s** at 93 km/h |
| Connect window at the fastest delivery | ≥ 0.150 s | **0.231 s** |
| Perfect window at the fastest delivery | ≥ 0.030 s | **0.058 s** |
| The bat can reach every line bowled | hands-to-line inside (0.34 m, 0.78 m) | **0.589 m** worst |
| Skilled bat, σ = 35 ms | chase success 55–90% | **83.6%** |
| Casual bat, σ = 60 ms | chase success 15–55% | **34.8%** |
| Random swings | ≤ 10% — the control | **0.0%** |
| Longest possible innings | inside `sessionSeconds` (110 s) | **80.9 s**, 29.1 s spare |

The first row is the one that matters. It is the direct regression test for the
tunnelling class of defect: it swings the bat at the instant `physics.idealContact()`
computes in closed form, then asserts the *independent* swept collision reports a
middled contact. If a future change makes the collision a point-in-time test against a
26 m/s ball, that row goes red.

Full window table, all bisected against the shipped collision:

```
delivery          ball speed   flight   react budget   CONNECT    GOOD   PERFECT
over 1 Loopy          64 km/h   909 ms        762 ms    250 ms  185 ms    64 ms
over 1 Stock          73 km/h   800 ms        653 ms    242 ms  180 ms    62 ms
over 1 Express        83 km/h   702 ms        554 ms    236 ms  176 ms    60 ms
over 2 Loopy          68 km/h   858 ms        710 ms    246 ms  183 ms    63 ms
over 2 Stock          77 km/h   755 ms        607 ms    239 ms  178 ms    61 ms
over 2 Express        88 km/h   662 ms        514 ms    233 ms  174 ms    59 ms
over 3 Loopy          72 km/h   809 ms        662 ms    243 ms  181 ms    62 ms
over 3 Stock          82 km/h   712 ms        564 ms    237 ms  176 ms    60 ms
over 3 Express        93 km/h   625 ms        476 ms    231 ms  172 ms    58 ms
```

Note that a quicker ball narrows every window without a single difficulty constant
being applied to it: the ball crosses the blade's reach sooner, so the geometry does
it on its own.

## Structure

```
src/
  data.js              GAME_CONFIG + COLORS + ZONES — every tunable, nothing hard-coded elsewhere
  physics.js           PURE, IMPORTS NOTHING: ball flight, bat sweep, swept collision,
                       measured timing windows, zone lookup
  deliveries.js        PURE: seeded PRNG, Gaussian, delivery generation, session bound
  rules.js             PURE: the chase, the zone payouts, the stats contract, the coach
  CoverDriveGame.jsx   canvas: projection, rendering, animation, input, juice. Owns no rules.
  Screens.jsx          Home / How to Play / Results — inline SVG only
  App.jsx              screen flow + lead capture + slot booking
scripts/balance.mjs    headless gate over the shipped modules
```

`physics.js`, `deliveries.js` and `rules.js` import no DOM, no React and no canvas —
`physics.js` imports nothing at all — which is what lets the balance gate run the
shipping code under Node.

## Rendering

Everything on the canvas is drawn programmatically — no images, no emoji. Floodlit sky
with pylons and a speckled crowd, four tinted scoring wedges, a boundary rope drawn as
the top arc of a wide ellipse, a perspective pitch with worn patch and creases, batter
and bowler as rounded-rect-and-circle rigs, three stumps and two bails that scatter on
a dismissal, a seamed ball with a tapering trail, and the zone selector strip.

There is **one projection**, `projectPitch()`, and everything on the field goes through
it — the ball, the blade, the length marker and the batter's feet — so they cannot end
up in different spaces. The blade drawn on screen is the blade the swept test collides
with; only its thickness is exaggerated for legibility, because the camera is nearly
over the batter's shoulder and a bat's 108 mm face projects to about three pixels.

The static half (sky, stands, outfield, wedges, rope, pitch) is baked into one
offscreen bitmap per resize and blitted, so the hot loop builds no paths or gradients.

## Build

```
pnpm install
pnpm build         # vite build --mode uat — the hard gate
pnpm dev           # http://localhost:5056
```

Port **5056**. CRM identity: `coverDriveLeadNo` / `Cover Drive Lead`.
Lead capture is **Name + Mobile only** — no email field.
