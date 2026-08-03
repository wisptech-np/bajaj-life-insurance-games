---
type: project
title: Wealth Carrom
description: Head-to-head carrom against an AI opponent (The Market) on a shared rosette. Nine gold wealth coins pay 100 each, two risk discs cost 150 and a foul, and the red Queen of Protection is worth 500 and two coins toward the target only if she is covered by a gold coin on the same or the very next strike. First side to six coin-equivalent takes the match; pot without fouling and you keep the strike.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/wealth-carrom
tags:
  - game
  - carrom
  - physics
  - arcade
  - ai-opponent
timestamp: 2026-08-03
---

# Wealth Carrom

> You versus The Market, one board, nine coins. The Queen of Protection is worth
> double — but only if you cover her.

Top-down carrom on a Bajaj-blue board with four corner pockets, played as a
head-to-head match against an AI opponent that strikes at the SAME rosette you
do. Drag the striker along the baseline to place it, pull back from it to aim,
release to flick. Twelve pieces open in a rosette: the Queen of Protection dead
centre, an inner ring of six with the two dark risk discs at its top and bottom,
and an outer ring of five gold coins.

First side to six coin-equivalent wins (a covered Queen counts as two). Pocket a
coin or the Queen without fouling and you KEEP the strike; miss or foul and it
passes. Three fouls forfeits. 120 seconds.

- **Port:** 5058 · **Dir:** `wealth-carrom/`
- **CRM:** `LEAD_NO_KEY = 'wealthCarromLeadNo'`, `summaryDtls: 'Wealth Carrom Lead'`
- **Stats contract:** `{score, coins, queenCovered, fouls}` + match fields (`opponentScore`, `opponentEquiv`, `winner`, `cause`, `draw`)
- **Opponent:** `src/bot.js` — generate / simulate / rank / pick, three difficulties in `GAME_CONFIG.bot.levels`

## The hook

The board is a portfolio. The nine gold coins are goals that pay on their own.
The Queen is worth five times a coin — and pays nothing at all unless she is
**covered**: a gold coin pocketed on the same strike or the very next one.
Uncovered, she goes back on the centre spot having paid nothing. That is the
classic carrom rule, and it is the pitch: cover you never completed is cover you
never had.

The two risk discs make the same point from the other side. They cost 150 and a
foul, and one of them is parked between the baseline and the Queen, so a straight
opening shot at the centre runs through the thing that punishes you. Protection
at the centre of a portfolio is never the easiest thing to reach for.

## Rules

| Piece | Count | Effect |
| --- | --- | --- |
| Gold wealth coin | 9 | +100, and 1 toward the target |
| Queen of Protection | 1 | +500 *when covered*, and 2 toward the target |
| Risk disc | 2 | −150 and a foul |
| Own striker pocketed | — | a foul |

- **Win:** 6 coin-equivalent (a covered Queen counts as 2).
- **Lose:** 8 strikes or 120 s below the target, or 3 fouls.
- Reaching the target wins even on a strike that also produced the third foul.

## Architecture

Rules and physics live in pure modules with no React, DOM or canvas imports, so
the balance sim runs the shipped game rather than a copy of it:

- `src/data.js` — every tunable (geometry, rosette, physics, scoring, fx).
- `src/board.js` — board geometry for a measured canvas, the opening rosette,
  the baseline-vs-pocket clearance solve, queen respawn.
- `src/physics.js` — half-life friction, cushions, disc-vs-disc impulses, pocket
  capture, substepping.
- `src/rules.js` — the strike / foul / queen-cover state machine.
- `scripts/bot.mjs` — the ghost-ball planner the gate measures the board with.
- `scripts/balance.mjs` — the gate itself.
- `src/WealthCarromGame.jsx` — canvas, input and juice only.

Friction is a half-life (0.45 s), so speed falls off linearly with distance
(`dv/dx = −k`) and a disc's total glide is exactly `v0/k`. Disc-vs-disc
restitution 0.92 with a 1.55× striker mass; cushions 0.62. Substeps are capped at
0.3 of a disc radius of travel, so nothing tunnels at full power. Every radius
and velocity is a fraction of the felt width and scaled by `board.scale`, so
every handset plays the same board rather than the same pixels.

## Balance

`node scripts/balance.mjs` — 5 seeds × 300 runs × 3 canvas sizes (4,500 runs),
bot at the brief's 4° aim / 10% power noise. Every seed is asserted separately,
not pooled: a one-seed gate measures a sample and reports it as the system.

| Canvas | Win rate (per seed) | Pooled | Max settle | Escaped |
| --- | --- | --- | --- | --- |
| 407×612 | 30.3 / 40.3 / 33.7 / 32.0 / 40.3 % | 35.3% | 3.00 s | 0 |
| 407×556 | 33.7 / 36.7 / 33.3 / 31.3 / 33.7 % | 33.7% | 2.99 s | 0 |
| 338×452 | 32.7 / 34.7 / 27.3 / 34.3 / 35.0 % | 32.8% | 3.02 s | 0 |

All 15 seed × size cells hold: win rate inside 25–45%, all 34,490 strikes
stationary in under 6 s, zero watchdog firings, zero pieces off the felt. Stress
at `--seeds 10 --runs 1200` (36,000 runs / 276,128 strikes) also passes. The same
bot with noise disabled wins 100%, so the ceiling is reachable and a loss is aim
rather than an unbeatable board.
