# Wealth Carrom

> Pocket every goal — and remember, the Queen of Protection only stays yours if you cover her.

Top-down carrom on a Bajaj-blue board. Nine gold wealth coins, one red Queen of
Protection and two dark risk discs. Eight strikes, 120 seconds, four corner
pockets.

- **Port:** 5058 · **Dir:** `wealth-carrom/` · **CRM:** `wealthCarromLeadNo` / `Wealth Carrom Lead`

## Concept and financial hook

The board is a portfolio. The nine gold coins are the goals you are saving
toward and they pay on their own. The Queen sits dead centre and is worth five
times a coin — but she does not pay at all unless she is **covered**: a gold coin
pocketed on the same strike or the very next one. Miss the cover and she goes
straight back on the centre spot having paid nothing.

That is the classic carrom rule, and it is also the pitch. Cover you never
completed is cover you never had. The two risk discs make the point from the
other side: they cost 150 and a foul, and one of them is parked between your
baseline and the Queen, so the protection at the centre of a portfolio is never
the easiest thing to reach for.

## Controls

Two gestures, one thumb.

1. **Place** — drag anywhere along the baseline strip to slide the striker left
   and right.
2. **Aim and flick** — press *on the striker* and pull back. The shot leaves
   along the opposite of the pull: a dashed ray shows the line, a ring around the
   striker and a meter under the board show the power. Release to flick. A pull
   shorter than the minimum cancels the shot.

The striker returns to the baseline after every strike, pocketed or not.

## Scoring

| Piece | Count | Effect |
| --- | --- | --- |
| Gold wealth coin | 9 | **+100**, and 1 toward the target |
| Queen of Protection | 1 | **+500** *when covered*, and 2 toward the target |
| Risk disc | 2 | **−150** and a foul |
| Your own striker | — | a foul |

- **Win:** 6 coin-equivalent pocketed (a covered Queen counts as 2).
- **Lose:** 8 strikes or 120 s without reaching 6, or 3 fouls.
- Reaching the target wins even on a strike that also produced the third foul —
  the line, once crossed, is never taken back.
- Stats contract: `{score, coins, queenCovered, fouls}`.

## Build

```bash
pnpm install
pnpm build          # vite build --mode uat — the hard gate
pnpm dev            # http://localhost:5058
pnpm balance        # the headless balance gate (below)
```

## Architecture

The rules and the physics are **not** in the React component. They are pure
modules with no DOM, canvas or React imports:

| File | What it owns |
| --- | --- |
| `src/data.js` | every tunable: geometry, rosette, physics, scoring, fx |
| `src/board.js` | board geometry for a measured canvas, the opening rosette, queen respawn |
| `src/physics.js` | friction, cushions, disc-vs-disc impulses, pocket capture, substepping |
| `src/rules.js` | the strike / foul / queen-cover state machine |
| `src/WealthCarromGame.jsx` | canvas, input, juice — and nothing else |

`scripts/balance.mjs` imports those four modules directly and runs the shipped
game headless under Node, so the balance table below is measured against the code
that ships rather than a re-implementation that can silently drift from it.

### Physics model

Friction is a **half-life**, not a constant deceleration: `v(t) = v0·e^(−kt)`
with `k = ln2 / 0.45s`. Because `dv/dt = −kv` and `dx/dt = v`, speed falls off
linearly with *distance* (`dv/dx = −k`), so a disc's total glide is exactly
`v0/k`. That makes "how hard do I need to hit this" a linear question, which is
what keeps the power meter honest — and it is how the bot computes its power.

Disc-vs-disc is an equal-restitution impulse (0.92) along the contact normal with
real masses — the striker is 1.55× a coin, which is what lets it drive *through*
the rosette instead of stopping dead on first contact. Cushions return 0.62.

Every tick is split into substeps small enough that nothing advances more than
0.3 of a disc radius, so no piece tunnels through a coin, a rail or a pocket
mouth at full power, at any canvas size. The count is sized from the fastest
piece × 1.25, not × 1: a striker-into-coin hit *amplifies* speed by
`M(1+e)/(M+m)` = 1.167×, so the peak mid-tick is higher than the figure the count
was based on.

Two position passes, not one. The integrate pass moves pieces by velocity and
then checks pockets and cushions — but the collision solver also moves pieces, by
positional separation, and it moves *stationary* ones. So the bounds check runs
again over anything separation touched. Without it a resting coin shoved by an
incoming striker could end up through a rail, or sitting in the black of a pocket
still counted as on the board, and never be looked at again (the integrate pass
skips zero-velocity pieces).

The striker is never placed or respawned overlapping a resting piece. Its legal
x is solved exactly — each resting piece forbids a chord of the baseline, and the
free point nearest the wanted x is taken — rather than sampled, because a sampled
search misses slots narrower than its step. At zero contact offset the collision
normal is undefined and no impulse is applied at all, so a striker born inside a
coin passes straight through it and flings pieces off the board.

Every radius and velocity is a fraction of the **felt width**, never a pixel
count, and velocities are scaled by `board.scale`. A 360 px handset and a 430 px
one therefore play the same board rather than the same pixels.

## Balance notes

`node scripts/balance.mjs` — **5 seeds × 300 runs × 3 canvas sizes = 4,500 runs**,
seed set derived from `0xca77a0`.

The bot is a ghost-ball planner: for every legal striker position on the
baseline, every active gold coin and every pocket, it computes where the
striker's centre must be at contact for the coin to leave along the coin→pocket
line, rejects the shot if anything blocks either corridor or the cut is steeper
than ~72°, and takes the cheapest survivor. Then the brief's noise goes on top:
**4° gaussian aim error and 10% power error**.

**The gate is a sweep over seeds, and every seed is asserted separately.** A
single hard-coded seed measures one sample of a stochastic system and reports it
as if it were the system — the first version of this gate passed on `0xca77a0`
and failed on every other seed tried, because the bug it should have caught
(pieces escaping the felt) only surfaced in some seeds' break patterns. Pooling
would have hidden it just as well, so the assertion is per seed.

| Canvas | Win rate (per seed) | Pooled | Mean coin-equiv | Max settle | Escaped |
| --- | --- | --- | --- | --- | --- |
| 407×612 (414×896) | 30.3 / 40.3 / 33.7 / 32.0 / 40.3 % | **35.3%** | 4.82 / 6 | 3.00 s | 0 |
| 407×556 (375×812) | 33.7 / 36.7 / 33.3 / 31.3 / 33.7 % | **33.7%** | 4.72 / 6 | 2.99 s | 0 |
| 338×452 (360×640) | 32.7 / 34.7 / 27.3 / 34.3 / 35.0 % | **32.8%** | 4.69 / 6 | 3.02 s | 0 |

All 15 seed × size cells hold: win rate inside 25–45%, every one of 34,490
strikes stationary in under 6 s, zero watchdog firings, zero pieces off the felt.

Stress runs, all still passing:

- `--seeds 10 --runs 1200` → 36,000 runs / 276,128 strikes, pooled win
  33.9 / 34.2 / 34.4 %, max settle 3.07 s, **0 escaped**.
- Tick-level invariant sweep over 14.3 M physics ticks at five canvas sizes:
  no active piece ever outside the felt, none ever left sitting inside a pocket
  mouth, no near-concentric striker spawn.
- 65 max-power breaks from every baseline position × five angles: worst settle
  3.07 s, nothing escapes, nothing tunnels.

**The target of 6 is the right number**, and the sweep is what shows it:

| Target (coin-equiv) | 3 | 4 | 5 | **6** | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- |
| Win % (407×612) | 93.9 | 84.9 | 63.3 | **34.7** | 3.3 | 0.9 |

5 is a formality and 7 is a lottery; 6 is the only value in the band.

**The skill ceiling is reachable.** The same bot with the noise turned off
(`--aim-sigma 0 --power-sigma 0`) wins **100%** at all three sizes, pocketing
exactly 6 coins in 7 strikes and 32 s. A losing run is therefore aim, never a
board that cannot be beaten.

The balance knob that matters is `board.pocketRadiusDiscs` (2.10). Aim error
amplifies through a cut shot — a 4° error over a 150 px approach throws the coin
about 18° off line — so the pocket mouth has to absorb it. 1.92 measured 22.5%
and 2.30 measured 37.0%; 2.10 sits in the middle of the band at every size.

## Mobile

430 px column, DPR canvas via `fitCanvas`, `touch-action: none`, pointer events
only (kit `createInput`). Tested against 360×640, 375×812 and 414×896 in the sim;
the board square, the rosette, the baseline and the pocket clearances are all
derived from the measured canvas.

The HUD is two rows and the board's top reserve is sized so the square always
starts *below* it — at a tighter reserve the progress pill covered both top
pockets on a 360×640 handset.
