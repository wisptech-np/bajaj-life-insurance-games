# Wealth Drop

Plinko/pachinko premium drop. Drag along the rail at the top of the board to
choose where a gold premium coin enters, release to drop it, and watch it rattle
down ten staggered rows of glowing pegs into one of nine goal pockets. Ten coins
or ninety seconds, whichever runs out first.

## Concept

Nine pockets, left to right:

| lane | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| pocket | Retirement | Savings | **Market Risk** | Education | Home | Education | **Market Risk** | Savings | Retirement |
| multiplier | x5 | x1 | **x0** | x2 | x3 | x2 | **x0** | x1 | x5 |

Payout for one coin is `coinValue x multiplier` (base 100), plus a combo bonus
for consecutive scoring pockets. Score is the total payout. Win at
**2,500** or more.

## Financial hook — market volatility and ULIP

The board is a market. You choose an entry point and then you do not choose
anything else: the coin's path is decided by a hundred small deflections, which
is what a market does to a disciplined investment. The geometry carries the
argument:

- **The biggest multiplier is the furthest from the middle.** Retirement x5 sits
  hard against the walls, and a red Market Risk band sits between it and the safe
  centre. Reaching for the highest return means aiming across volatility.
- **The safe middle is not free.** Home x3 in the centre pays steadily but never
  spectacularly, and a coin that drifts nowhere lands there.
- **Cover changes the floor, not the ceiling.** Grazing a blue cover peg shields
  the coin, and a shielded coin is paid **x1 by a Risk pocket instead of x0**. It
  never turns a x0 into a x5. Insurance does not raise your upside; it stops the
  downside being total. Cover pegs sit in the outer columns of the lower rows —
  on the path of exactly the coins that need them.
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
| **win** | total payout >= **2,500** |

Stats reported to the results screen: `{ score, coins, shielded, combo }` —
total payout, coins dropped, cover saves (Risk landings rescued by cover), and
best streak.

## Balance notes

The balance gate is a headless simulator that runs **the shipping physics**:
`tools/balance-sim.mjs` slices the region between the `PURE-PHYSICS` markers out
of `src/WealthDropGame.jsx`, writes it to a temp `.mjs` and imports it, so the
numbers below cannot drift from the code that runs in the browser.

```
node tools/balance-sim.mjs --runs 20000 --sweep
```

It exits non-zero if the casual win rate leaves the 35–45% band, so it doubles as
a regression gate on any physics change.

**Measured (20,000 runs per profile, seed `0x5eed1234`, 407x612 canvas):**

| aim profile | mean | p25 | p50 | p75 | win% @ 2500 | cover% | saves/run |
|---|---|---|---|---|---|---|---|
| centre (exact middle tap) | 2399 | 2100 | 2420 | 2700 | **44.4%** | 40.7% | 0.90 |
| casual (middle three lanes) | 2347 | 2020 | 2340 | 2700 | **40.2%** | 49.6% | 1.26 |
| spread (anywhere on the rail) | 2426 | 2040 | 2420 | 2800 | **45.8%** | 46.3% | 1.35 |

Per-coin pocket share from a centre drop: Retirement x5 1.9%, Savings x1 7.0%,
**Risk x0 19.5%**, Education x2 42.2%, Home x3 29.4%. Of the Risk landings 46.1%
are rescued by cover, so **10.5% of all coins actually pay nothing** — the Risk
pockets are hittable without dominating. A run spends 22–26 s of the 90 s cap
watching coins fall, about 6 s per drop left for aiming.

Re-measured at 407x556 and 338x452 the casual win rate is 41.1% and 36.1%, so the
win line holds across 360x640 / 375x812 / 414x896 handsets.

### Corrections carried against the first build

Four numbers moved after measurement; each is commented at its definition in
`src/data.js`.

1. **Wall pegs on the boundary rows.** With pegs only on interior lane lines, a
   coin that reached a side rail slid down the gap between the rail and the
   outermost centre-row peg — a gutter straight into the x5 pocket. It measured
   15–19% of all drops, making the outside of the board the *safest* place to
   aim. Boundary rows now carry a peg on every lane line, walls included.
2. **`physics.lateralDrag` / `maxLateralSpeed` (6 and 230).** A peg struck near
   its crown throws the coin upward, and an upward arc with unchecked sideways
   speed crosses two or three lanes before touching anything again. Without these
   the landing distribution measured *flat* — every pocket ~11% from a dead
   centre drop, i.e. the aim rail did nothing. With them the landing lane is a
   bell of sigma ~1.4 lanes around the release point.
3. **The pocket ladder itself.** The obvious "big prize outside, small prize
   inside" arrangement `[5 3 0 2 1 2 0 3 5]` measured 295 expected payout per
   coin from a wall versus 148 from the middle — hugging a wall is twice as good
   as anything else, which is a solved board. The shipped `[5 1 0 2 3 2 0 1 5]`
   measures 219 / 191, a 1.16x spread, and its *worst* aim is the Risk lane
   itself.
4. **`board.maxRowGapFrac` and `physics.maxStepFraction`.** Row spacing is
   derived from leftover height, which on a 430x900 handset gave rowGap = 1.54x
   the lane pitch and a measurably flatter distribution; it is now clamped to
   1.15x and the shortened field re-centred. Separately, the fixed 1050 px/s
   terminal velocity is safe against tunnelling at a 407 px canvas but not at
   296 px, where the collision radius shrinks with the pitch — so the speed
   ceiling is now also expressed as a fraction of the collision radius per step.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable lives here: the
  pocket ladder, board geometry fractions, peg rows and spacing, restitution and
  the rest of the physics, cover-peg slots, combo weights, the 2,500 win line,
  the 90 s session and every effect count.
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
The backdrop, all 95 pegs and the nine pocket faces are pre-rendered to offscreen
canvases once per resize and blitted; only the coin, its trail, the live cover
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
node tools/balance-sim.mjs --runs 20000 --sweep
```
