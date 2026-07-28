# Wealth Balloon

Press-your-luck inflate. Hold to grow the wealth balloon, let go to bank what it
is worth, and try to do that six times without meeting the hidden burst
threshold. One Term Shield absorbs the first burst you get wrong. Six rounds or
120 seconds, whichever runs out first.

## Concept

| element | rule |
|---|---|
| value | `10 × t^1.6`, t = seconds held (35 at 2.2 s, 71 at 3.4 s, 115 at 4.6 s) |
| burst threshold | drawn uniform `U(2.2 s, 4.6 s)` per round, never shown |
| the tell | wobble + hue shift blue → orange → red, starting at `0.7 × threshold ± 0.35 s` |
| bank | release before the threshold, with no drone touching you |
| burst | the round is worth nothing and the compounding streak resets |
| Term Shield | one per game; absorbs the first burst and banks **50%** of the at-burst value |
| compounding | each consecutive banked round adds **+18 × (streak − 1)**, capped at 5 steps |
| needle drones | from round 4; releasing while one overlaps the envelope pops it regardless |
| win | bank **500** across the 6 rounds |

## Financial hook — knowing when to bank, and what cover actually buys

The curve is the argument. `t^1.6` means the next second of holding is always
worth more than the last one was, so the balloon is permanently offering you a
better deal than the one you already have. That is exactly how an un-hedged
position feels on the way up, and it is why people hold too long.

- **The tell is honest, and it is still not enough.** The wobble starts at 70% of
  the threshold, so it always arrives — the game never pops you without warning.
  But the ±0.35 s of noise means the wobble only narrows the threshold to a
  one-second window. Real warnings work exactly like this: they are real, they
  are early, and they are not precise. You still have to decide.
- **Consistency beats nerve, and it is measured.** A bot that lets go the moment
  it sees the wobble wins 38.5% of runs. A bot that reads the same wobble and
  then pushes to 95% of what it implies wins 8.7%. Pushing banks 1.63× more per
  surviving round and still loses, because a burst takes the round *and* the
  compounding.
- **Cover rescues the money, not the momentum.** The Term Shield banks half of
  whatever the balloon was holding, which is worth about 0.9 of an average
  banked round. It does not restore the streak and it does not raise your
  ceiling. It stops one bad moment being a total loss — which is the honest
  claim a term plan can make.
- **The drones are the difficulty, and they lean on greed.** The lane is not
  outside a sensible balloon — the envelope reaches it at 2.04 s, and a
  disciplined release (median 2.38 s) already covers it 69% of the time, so
  everyone is exposed. Removing the drones would move a disciplined run from
  38.5% to 61.8%. What greed adds is exposure on top: 94% of greedy releases
  cover the lane, and conditional on actually getting to a release a greedy
  balloon is popped 10.5% of the time against 6.0% for a disciplined one.

## Controls

- **Hold** anywhere on the board to inflate. The counter above the balloon is
  what you would bank.
- **Let go** to bank it. If the balloon wobbles and turns orange, that is the
  tell — you are past 70% of its limit.
- From round 4, watch the dashed drone lane. The drone's eye flashes when it is
  actually touching you.
- Mute toggle bottom-right. The game auto-pauses when the tab is backgrounded,
  the session clock pauses with it, and a hold in progress is banked at the
  moment of pause rather than left to burst.

## Scoring

| event | value |
|---|---|
| bank at t seconds | `10 × t^1.6` |
| compounding bonus | `+18 × (streak − 1)`, streak capped at 5 steps → `0/18/36/54/72/90` |
| burst (shield available) | half the at-burst value; streak resets |
| burst (shield spent) | 0; streak resets |

A perfect six-round run banks ~243 of value plus 270 of compounding. The win
line is **500**.

Stats contract: `{score, rounds, bursts, bestRound}`.

## Balance

`node scripts/balance.mjs` — the sim imports `src/rounds.js` and `src/data.js`,
the modules that ship. Figures below are 20,000 runs per bot at seed
`0xba110032`; the 500-run gate is the same numbers with a ±4 pp sampling window.

| bot | strategy | win% | mean | bursts/run |
|---|---|---|---|---|
| disciplined | lets go on the tell, σ = 0.3 s reaction | **38.5%** | 454 | 0.4 |
| greedy | reads the tell, holds to 95% of what it implies | **8.7%** | 298 | 2.5 |
| blind-70 | fixed 2.38 s, never looks at the balloon | 21.1% | 376 | 0.9 |
| blind-95 | fixed 3.23 s, never looks at the balloon | 4.8% | 254 | 3.0 |
| ceiling | holds to the latest instant the tell proves is safe, dodges drones | 77.1% | 546 | 0.2 |

The gate asserts **disciplined ∈ 30–50%** and **greedy < 15%** and exits 1
otherwise, so it doubles as a regression test on any change to the rules or the
constants. At 500 runs the default seed gives 43.2% / 7.8%; across five other
seeds, 34.8–41.6% and 7.2–11.2%.

It also checks two invariants over every simulated round: the tell always
precedes the burst (average lead 1.02 s), and the worst-case held time in a run
(24.3 s) leaves ample slack inside the 120 s session.

```
node scripts/balance.mjs                # the gate
node scripts/balance.mjs --runs 20000   # tighter confidence intervals
node scripts/balance.mjs --sweep        # win% by bot across candidate targets
node scripts/balance.mjs --seed 11111   # a different reproducible sample
```

Counterfactual flags reproduce every "we tried X" claim in the OKF log against
the same shipped rules. A flagged run prints a banner and skips the gate.

```
node scripts/balance.mjs --runs 20000 --bonus 0              # no compounding
node scripts/balance.mjs --runs 20000 --shield-keeps-streak  # cover rescues the streak too
node scripts/balance.mjs --runs 20000 --no-drones            # clear skies
```

### Spec correction

The published design spec set the win line at 320 with no term other than the
banked values. Under that scoring 320 is a near-perfect-play line; under the
shipped rules it is trivial (88.5% → measured 88.1% for a disciplined run). Worse,
without a compounding term the spec's structure *rewards* the behaviour the game
is supposed to punish: with the bonus removed the greedy bot's mean (241) beats
the disciplined bot's (233) and it wins more often at every target from 240 up.
The compounding bonus and the 500 line are the minimal correction that makes both
of the spec's own balance gates satisfiable at once — both gates hold only for a
line in [481, 514]. Full derivation and every counterfactual in
`okf-brain/wealth-balloon/log.md`.

## Port and build

```
pnpm install
pnpm dev        # http://localhost:5059
pnpm build      # vite build --mode uat  (the verification gate)
```

## Structure

```
src/
  rounds.js              pure rules — value curve, threshold, tell, drones,
                         bank/burst, Term Shield, compounding. No DOM, no React.
  data.js                every tunable + the measured balance table
  WealthBalloonGame.jsx  canvas component (refs for hot state, HUD via textContent)
  Screens.jsx            Home / How to play / Results, inline SVG only
  App.jsx                screen flow + gameKey remount
  kit/                   byte-identical copy of shared/game-kit
scripts/
  balance.mjs            headless gate over the shipped rounds.js
```
