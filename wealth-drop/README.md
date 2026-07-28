# Wealth Drop

Plinko/pachinko premium drop. Drag along the rail at the top of the board to
choose where a gold premium coin enters, release to drop it, and watch it rattle
down ten staggered rows of glowing pegs into one of eleven goal pockets. Ten coins
or ninety seconds, whichever runs out first.

## Concept

Eleven pockets, left to right:

| lane | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pocket | Savings | Savings | **Retirement** | **Risk** | Education | Home | Education | **Risk** | **Retirement** | Savings | Savings |
| multiplier | x1 | x1 | **x5** | **x0** | x2 | x3 | x2 | **x0** | **x5** | x1 | x1 |

Payout for one coin is `coinValue x multiplier` (base 100), plus a combo bonus
for consecutive scoring pockets. Score is the total payout. Win at **2,700** or
more.

## Financial hook - market volatility and ULIP

The board is a market. You choose an entry point and then you do not choose
anything else: the coin's path is decided by a hundred small deflections, which
is what a market does to a disciplined investment. The geometry carries the
argument:

- **The jackpot sits just beyond the volatility band.** Retirement x5 is not at
  the wall and not in the middle - it is immediately outside each red Market
  Risk band. Aiming for it means aiming across volatility and stopping there.
- **Overshoot lands in the savings gutter.** The two outer lanes on each side
  pay x1. Chasing the edge of the market is not a shortcut: measured, parking
  against the wall wins 22% of runs against 40% for someone who just plays the
  middle.
- **The disciplined middle is the best play, and it is still only ~40%.** Home
  x3 and Education x2 hold the centre. Regular, unspectacular investing is what
  actually funds the goals - but nothing here guarantees a win.
- **Cover changes the floor, not the ceiling.** Grazing a blue cover peg shields
  the coin, and a shielded coin is paid **x1 by a Risk pocket instead of x0**. It
  never turns a x0 into a x5. Insurance does not raise your upside; it stops the
  downside being total. Cover pegs sit in the outer columns of the lower rows -
  on the path of exactly the coins that have drifted toward a Risk band.
- **Ten coins, not one.** A single drop is a coin flip. Ten drops is a strategy,
  and the streak bonus pays discipline: consecutive paying pockets compound.

## Controls

- **Drag** anywhere on the board to move the drop marker along the rail.
- **Release** to drop the coin. A tap drops at the tapped point.
- One coin in flight at a time; the rail reappears after the previous coin settles.
- Mute toggle bottom-right. The game auto-pauses when the tab is backgrounded and
  the session clock pauses with it.

## Scoring

| event | value |
|---|---|
| coin into a goal pocket | `100 x multiplier` (100 / 200 / 300 / 500) |
| coin into a Risk pocket | 0 |
| coin into a Risk pocket **with cover** | 100 (x1) |
| combo, 2nd consecutive paying pocket onward | `+20` per step, capped at 4 steps (max `+80` per coin) |
| **win** | total payout >= **2,700** |

Stats reported to the results screen: `{ score, coins, shielded, combo }` —
total payout, coins dropped, cover saves (Risk landings rescued by cover), and
best streak.

## Balance notes

The balance gate is a headless simulator that runs **the shipping physics**:
`tools/balance-sim.mjs` slices the region between the `PURE-PHYSICS` markers out
of `src/WealthDropGame.jsx`, writes it to a temp `.mjs` and imports it, so the
numbers below cannot drift from the code that runs in the browser.

```
node tools/balance-sim.mjs --runs 8000 --sweep
```

It measures **seven aim profiles at every canvas size** and exits non-zero
unless, at *each* size, `casual` lands in 30-50% **and** every edge profile
(`wall`, `lane0`, `lane1`, `lane2`) stays at or under 55%. The edge profiles
exist because an earlier tuning was gated on `casual` alone and hid a
wall-hugging strategy that won roughly twice as often as a centre drop.

**Measured (8,000 runs per profile, seed `0x5eed1234`, target 2,700):**

| aim profile | 407x612 | 407x556 | 338x452 |
|---|---|---|---|
| `wall` (rail extreme) | 22.4% | 20.2% | 20.5% |
| `lane0` centre | 22.2% | 22.3% | 21.9% |
| `lane1` centre | 28.6% | 27.4% | 27.0% |
| `lane2` centre | 30.9% | 31.3% | 30.9% |
| `centre` (dead middle) | 35.4% | 34.0% | 34.8% |
| **`casual` (middle three lanes)** | **40.3%** | **38.2%** | **37.3%** |
| `spread` (whole rail) | 32.8% | 32.5% | 31.7% |

Casual play is the brief's ~40% line and it is also the **best** line - every
edge profile is 10-20 points worse. Expected payout per coin by aim lane
(12,000 drops per lane) is a gentle dome:

```
lane      0    1    2    3    4    5    6    7    8    9   10
407x612 172  190  196  206  213  211  217  216  197  189  175
338x452 170  184  198  204  213  209  219  211  201  187  173
```

best/centre is **1.03** (407x612) and **1.05** (338x452): no release point is
worth more than a few percent over the middle, while aiming into the savings
gutter costs ~20% of expected payout.

Pocket share per coin from a centre drop at 407x612: Savings x1 9.4%,
**Retirement x5 13.5%**, **Risk x0 25.4%**, Education x2 33.8%, Home x3 18.1%.
Of the Risk landings 45.3% are rescued by cover, so **13.9% of all coins
actually pay nothing**. Cover is picked up on 26-47% of drops depending on aim;
0.4-1.2 saves per run; best streak averages 6.8-8.6 of 10. A run spends 23-26 s
of the 90 s cap watching coins fall, about 6 s per drop left for aiming.

### Corrections carried against earlier builds

Each is commented at its definition in `src/data.js`.

1. **Wall pegs on the boundary rows.** With pegs only on interior lane lines, a
   coin that reached a side rail slid down the gap between the rail and the
   outermost centre-row peg - a gutter straight into the outer pocket. It
   measured 15-19% of all drops.
2. **`physics.lateralDrag` / `maxLateralSpeed` (6 and 230).** A peg struck near
   its crown throws the coin upward, and an upward arc with unchecked sideways
   speed crosses two or three lanes before touching anything again. Without
   these the landing distribution measured *flat* - every pocket equally likely
   from a dead centre drop, i.e. the aim rail did nothing. With them the landing
   lane is a bell of sigma ~2.0 lanes around the release point.
3. **`physics.refFieldPx` and `board.velScale` - the board is played in
   board-relative units.** Gravity and every velocity are authored against a
   reference peg-field height and scaled by how tall the field actually is.
   Without it the coin kept the same absolute sideways authority while the field
   shrank with the screen, so a short handset gave it relatively more time to
   drift: an 11-lane board went from a sigma ~2.2-lane bell at 407x612 to an
   almost flat distribution at 338x452, and the wall-hugging win rate moved 20
   points between the two sizes. With it, the landing distributions at 338x452
   and 407x612 agree to within a percentage point per pocket.
4. **The pocket ladder and the lane count.** Measured win rate by aim profile at
   each candidate's own ~40%-casual target, 407x612:

   ```
   ladder                          wall  lane0  lane1  lane2  centre  casual
   [5 1 0 2 3 2 0 1 5]   (9-lane) 51.6%  59.9%  48.0%  27.7%  45.6%   38.4%
   [1 5 0 3 2 3 0 5 1]   (9-lane) 51.6%  57.1%  59.4%   ~30%  40.5%   40.5%
   [3 2 0 1 5 1 0 2 3]   (9-lane) 41.1%  44.3%  32.9%  19.3%  49.3%   40.1%
   [1 2 0 3 5 3 0 2 1]   (9-lane)  0.1%   0.0%   0.3%   6.2%  57.4%   40.7%
   [1 1 5 0 2 3 2 0 5 1 1] (11)   22.4%  22.2%  28.6%  30.9%  35.4%   40.3%  <- shipped
   ```

   The "biggest prize outside" ladders are solved boards - parking against a
   wall wins ~1.5x as often as a centre drop (77% on a 360x640 handset before
   the velScale fix). Mirroring them over-corrects: the edges become unwinnable
   and the rail turns into a "do not miss the middle" test. Eleven lanes with
   the jackpot immediately outside each Risk band is what produces a dome
   instead of a ramp.
5. **`board.maxRowGapFrac` and `physics.maxStepFraction`.** Row spacing is
   derived from leftover height, which on a 430x900 handset gave rowGap = 1.54x
   the lane pitch and a measurably flatter distribution; it is now clamped to
   1.15x and the shortened field re-centred. Separately, the speed ceiling is
   expressed as a fraction of the coin+peg collision radius per step as well as
   an absolute velocity, so a coin can never tunnel through a peg at any canvas
   size.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable lives here: the
  pocket ladder, board geometry fractions, peg rows and spacing, restitution
  and the rest of the physics, cover-peg slots, combo weights, the 2,700 win
  line, the 90 s session and every effect count.
- `src/WealthDropGame.jsx` — the whole game. The region between the
  `PURE-PHYSICS` markers (board layout, cover-peg arming, the coin step, payout
  resolution) is free of React, canvas, DOM and imports so the balance simulator
  can execute it verbatim under Node. Everything after it is offscreen
  pre-render, programmatic draw functions and one canvas component whose mutable
  state lives in refs.
- `src/Screens.jsx` — Home (the board itself as inline SVG, with a coin tracing a
  real path down it), How to Play (3-beat CSS-animated SVG: drag to aim, release
  and watch, cover the downside), Results (payout ring against the target,
  coins/saves/streak tiles, Book a Slot / Retry / Home).
- `src/kit/` — synced copy of `shared/game-kit`: fixed-step loop with the session
  clock, pointer input, pooled particle/shake/float-text effects, Web Audio
  synth, device tiering. Never edited in place.
- `tools/balance-sim.mjs` — the balance gate. Not part of the bundle.

## Presentation

All art is programmatic canvas or inline SVG — no emoji sprites, no image files.
The backdrop, all 115 pegs and the eleven pocket faces are pre-rendered to
offscreen canvases once per resize and blitted; only the coin, its trail, the live cover
pegs, peg sparks and pocket flashes are drawn per frame. The two Risk pockets
pulse continuously; a landing flares its pocket and pops it; a peg hit sparks and
squashes the coin; a payout throws confetti in the pocket's colour with floating
`+N` text; a Risk landing shakes the screen, hit-stops and drops a red burst. The
score counter is damped toward its true value and written to the DOM through a
ref, so a 120 Hz physics tick never re-renders the React tree.

Audio is the kit's Web Audio synth only, unlocked on the first pointer gesture:
peg ticks, the ascending coin chime on a payout, a rising square-wave note per
streak step, the triangle chord on cover, the sawtooth thud on a Risk pocket, and
the five-note fanfare or three-note fall at the end of the run.

## Port and build commands

Dev server on **5039**.

```
pnpm install
pnpm dev            # http://localhost:5039
pnpm build          # uat (default)
pnpm build:preprod
pnpm build:prod
pnpm preview
node tools/balance-sim.mjs --runs 8000 --sweep
```
