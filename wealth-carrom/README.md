# Wealth Carrom

> You versus The Market, one board, nine coins. The Queen of Protection is worth
> double — but only if you cover her.

Top-down carrom on a Bajaj-blue board, played as a **head-to-head match against
an AI opponent**. Nine gold wealth coins, one red Queen of Protection, two dark
risk discs, four corner pockets, 120 seconds.

- **Port:** 5058 · **Dir:** `wealth-carrom/` · **CRM:** `wealthCarromLeadNo` / `Wealth Carrom Lead`

## Concept and financial hook

The board is a portfolio and you are not the only one reaching for it. **The
Market** sits opposite and strikes at the *same* nine coins you do, so every turn
you leave on the table is a turn it takes. That is the hook: wealth is finite and
contested, and the thing that decides the match is not how hard you hit.

The Queen sits dead centre and is worth five times a coin — but she does not pay
at all unless she is **covered**: a gold coin pocketed on the same strike or your
very next one. Miss the cover and she goes straight back on the centre spot
having paid nothing. That is the classic carrom rule, and it is also the pitch.
Cover you never completed is cover you never had.

The two risk discs make the point from the other side: they cost 150 and a foul,
and one of them is parked between your baseline and the Queen, so the protection
at the centre of a portfolio is never the easiest thing to reach for.

## The match

| | |
| --- | --- |
| **Win** | First side to **6 coin-equivalent** (a covered Queen counts as 2) |
| **Turn** | Pocket a coin or the Queen and commit no foul → **you keep the strike**. Miss or foul → it passes |
| **Foul** | Your own striker, or a risk disc, pocketed: −150 and the turn. **3 fouls forfeits the match** |
| **Also ends** | Board out of coins, 12 strikes a side, or the 120 s clock — decided on points |
| **Tiebreak** | coin-equivalent → score → fewer fouls → best single strike → fewer strikes |

Turn continuation is why a break is worth setting up: a good strike can run
several coins before the opponent ever gets the striker back.

## Controls

Two gestures, one thumb, and the whole thing is cancellable.

1. **Place** — drag anywhere along the baseline strip to slide the striker left
   and right. It snaps past any coin resting on the line rather than parking
   inside it.
2. **Aim and flick** — press *on the striker* and pull back. The shot leaves
   along the opposite of the pull: a dashed ray shows the line (clipped at the
   rail, so it never points somewhere the striker cannot reach), a ring around
   the striker and a meter under the board show the power. Release to flick.

A pull shorter than `minPullFrac` cancels the shot, and a `pointercancel` — a
notification shade, an edge swipe, an incoming call — aborts instead of firing a
half-aimed striker. The striker returns to the baseline after every strike,
pocketed or not.

The board is laid out so a full-power pull is physically reachable: the square is
biased upward in the stage to leave the pull room *below* the baseline.

## The opponent

`src/bot.js`. The Market does not aim geometrically and hope — it **generates,
simulates, ranks and picks**:

1. **Generate.** A ghost-ball pass enumerates candidate shots: for every sampled
   striker placement, every target piece and every pocket, where must the
   striker's centre be at contact for that piece to leave along the piece→pocket
   line? Blocked corridors, thin cuts and off-felt ghosts are dropped cheaply
   here. Break shots are always appended so it is never without a move.
2. **Simulate.** The best candidates by geometric cost are each run to rest on a
   *clone* of the board using the shipped `stepWorld()` — the same physics,
   restitution and friction the player's strike uses. Outcomes are read with the
   shipped `tallyPocketed()`; no rule is re-implemented.
3. **Rank.** Each outcome is scored with the numbers from `data.js`: coins,
   whether the Queen was potted and could be covered, fouls, whether the strike
   keeps the turn, and a small positional term for leaving the board better than
   it was found.
4. **Pick by skill.**

Difficulty is four levers, and only one of them is aim — because a weak carrom
player is not someone with shaky hands so much as someone who takes the wrong
shot and does not price the downside:

| Level | `rollouts` | `pickFrom` | aim σ | power σ | `foulBlindness` |
| --- | --- | --- | --- | --- | --- |
| **Cautious** (easy) | 5 | 3 | 7.5° | 22% | 0.50 |
| **Balanced** (normal) | 12 | 2 | 4.0° | 12% | 0.18 |
| **Aggressive** (hard) | 26 | 1 | 1.8° | 6% | 0.04 |

`rollouts` is how many candidates it actually simulates — look at six shots and
you miss the good one. `pickFrom` makes it choose at random from its own top N.
`foulBlindness` is the chance it prices a shot with the foul penalty set to zero,
so it pots its own striker like a novice does. Every value lives in
`GAME_CONFIG.bot.levels`; the picker on the how-to-play screen reads its labels
from there, so retuning the opponent never means editing a screen.

Its turn is animated rather than instant — an indicator while it searches, then
the aim rig drawing itself back in crimson at the angle and power it settled on —
so you can read what is coming before it arrives.

## Scoring

| Piece | Count | Effect |
| --- | --- | --- |
| Gold wealth coin | 9 | **+100**, and 1 toward the target |
| Queen of Protection | 1 | **+500** *when covered*, and 2 toward the target |
| Risk disc | 2 | **−150** and a foul |
| Your own striker | — | a foul |

Reaching the target wins even on a strike that also produced the third foul — the
line, once crossed, is never taken back.

Stats contract: `{score, coins, queenCovered, fouls}`, plus the match fields
(`opponentScore`, `opponentEquiv`, `winner`, `cause`, `draw`) the results screen
uses for the head-to-head.

## Build

```bash
pnpm install
pnpm build          # vite build --mode uat — the hard gate
pnpm dev            # http://localhost:5058
node scripts/balance.mjs   # the headless gate (below)
```

## Architecture

The rules, the physics and the opponent are **not** in the React component. They
are pure modules with no DOM, canvas or React imports:

| File | What it owns |
| --- | --- |
| `src/data.js` | every tunable: geometry, rosette, physics, scoring, bot difficulty, fx |
| `src/board.js` | board geometry for a measured canvas, the opening rosette, queen respawn |
| `src/physics.js` | friction, cushions, disc-vs-disc impulses, pocket capture, substepping |
| `src/rules.js` | the two-player match: turns, fouls, queen cover, completion, tiebreaks |
| `src/bot.js` | candidate generation, headless rollout, ranking, difficulty |
| `src/WealthCarromGame.jsx` | canvas, input, juice — and nothing else |

`scripts/balance.mjs` imports those five modules directly and runs the shipped
game headless under Node, so every number below is measured against the code that
ships rather than a re-implementation that can silently drift from it.

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
piece × 1.6, not × 1: a striker-into-coin hit *amplifies* speed by
`M(1+e)/(M+m)` = 1.167×, and on a break the struck coin is hit again within the
same tick (worst measured amplification 1.517×), so the peak mid-tick is higher
than the figure the count was based on.

Two position passes, not one. The integrate pass moves pieces by velocity and
then checks pockets and cushions — but the collision solver also moves pieces, by
positional separation, and it moves *stationary* ones. So the bounds check runs
again over anything separation touched. Without it a resting coin shoved by an
incoming striker could end up through a rail, or sitting in the black of a pocket
still counted as on the board, and never be looked at again.

The striker is never placed or respawned overlapping a resting piece. Its legal
x is solved exactly — each resting piece forbids a chord of the baseline, and the
free point nearest the wanted x is taken — rather than sampled, because a sampled
search misses slots narrower than its step. At zero contact offset the collision
normal is undefined and no impulse is applied at all, so a striker born inside a
coin passes straight through it and flings pieces off the board.

Every radius and velocity is a fraction of the **felt width**, never a pixel
count, and velocities are scaled by `board.scale`. A 320 px handset and a 430 px
one therefore play the same board rather than the same pixels.

## The gate

`node scripts/balance.mjs` asserts the three things a carrom build can get
silently wrong. See the OKF log for the measured table.

**A — no tunnelling.** Thousands of seeded **maximum-power** strikes at all four
supported canvas sizes, checked at the tick level with a *swept closest-approach*
test on every pair. Two discs that cross and separate inside one tick look
perfectly normal afterwards, so an end-state overlap check cannot see them; the
sweep can. Also asserts no active piece is ever outside the felt and no tick ends
with discs deeply overlapped.

**B — energy never increases in a collision.** Run with friction disabled (so
friction cannot mask an impulse that adds energy), total kinetic energy must be
monotonically non-increasing across every tick. Restitution is below 1 on both
discs and cushions, and the positional separation term must not inject any.

**C — the bot is beatable and not trivial.** Every difficulty is played against a
skilled reference opponent *and* against a random-flick opponent, sides swapped
every match. A level the reference always beats is not a game; a level it never
beats is not a difficulty; a level that loses to random flicks is not playing.
The three rungs must also come out strictly ordered.

## Mobile

430 px column, DPR canvas via `fitCanvas`, `touch-action: none`, pointer events
only (kit `createInput`). Verified in a real headless browser with real touch
drags at **320×568, 390×844, 412×915 and 412×700** via
`node scripts/play-test.mjs wealth-carrom --all-sizes`.

The board square, the rosette, the baseline and the pocket clearances are all
derived from the measured canvas. The HUD reserve is a **minimum pixel height**
plus a small fraction rather than a pure fraction: the scoreboard is a fixed
stack, so a pure fraction over-reserved badly on a tall phone and took the
difference out of the board.

All art is programmatic canvas (gradients, layered radials, clipped paths) or
inline SVG. No raster assets, and no emoji anywhere as a game object.
