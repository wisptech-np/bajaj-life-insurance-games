---
type: project
title: Swing to Secure
description: Rope-swing momentum runner where a guardian chains protection pylons across a canyon of life milestones to reach the retirement vault.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/swing-to-secure
tags:
  - game
  - rope-swing
  - physics
timestamp: 2026-07-28
---

# Swing to Secure

One-thumb rope-swing runner. Hold to throw a rope at the nearest protection
pylon, swing to build momentum, release on the forward swing to fly. Reach the
Retirement Vault at 2,000 m inside a 105-second session.

## Financial hook

The canyon is a working life; the pylons are cover. Momentum is the only thing
that carries you over a gap, and it only survives if you keep catching the next
anchor. Gaps widen, risk orbs get denser, and late pylons sway — the course gets
more expensive exactly as a life does. Five milestones mark the run: Graduation
(200 m), First Job (500 m), Marriage (900 m), Home (1400 m), Retirement (2000 m).
Shield tokens are literal cover: a risk orb spends the shield instead of the run.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable lives here.
- `src/SwingToSecureGame.jsx` — the whole game: one canvas component with mutable
  state in refs, module-level world generation, and programmatic draw functions.
- `src/Screens.jsx` — Home (rope-swing SVG motif), How to Play (3-beat CSS-animated
  SVG: hold → swing → release), Results (score ring, distance/coins/milestone
  tiles, milestone chips, Book a Slot / Retry / Home).
- `src/kit/` — synced copy of `shared/game-kit`: fixed-step loop with the session
  clock, pointer input, pooled particle/shake/float-text effects, Web Audio synth,
  device tiering. Never edited in place.

## Physics

Two states. FLYING is a projectile under kit gravity (1600) capped at terminal
velocity. SWINGING is a rigid pendulum measured from straight-down:

```
theta = atan2(x - anchor.x, y - anchor.y)
omega += (-g / len) * sin(theta) * dt
theta += omega * dt
release: vx =  omega * len * cos(theta) * releaseBoost
         vy = -omega * len * sin(theta) * releaseBoost
```

Grabbing projects the incoming velocity onto the rope tangent and discards the
radial part, so *when* you grab decides how much momentum survives — that is the
skill, alongside release timing. `releaseBoost` (1.06) is the only source of new
energy in an otherwise conservative system, which is why the Perfect Release
window matters mechanically and not just for points.

## Balance corrections

Three values needed a specific reading, each verified against a headless
simulation of the exact loop across 40 generated courses (see the game README's
"Balance notes"):

1. `rope.damping` is applied per second (`pow(damping, dt)`), not once per fixed
   1/120 s step — per-step it compounds to ~0.55x/s and kills every run by ~85 m.
2. `rope.grabAssistPx` (120) extends the 150 px base reach while descending;
   without it an optimally-played run never reaches the vault.
3. `player.startSpeed` (620) seeds the opening swing; from rest the guardian can
   never rise back to pylon height.
4. `hazards.minY/maxY` raised to 230-380: under the flight arc at 300-430 the
   risk orbs were never hit in 40 simulated runs, so the hazard-and-shield
   system was dead content.

Result: well-timed play wins ~48% of runs in ~42 s with ~4,400 points; untimed
play (holding the button rather than timing grabs) reaches 180-450 m. The skill
is grab timing, because the grab discards the radial component of the incoming
velocity.

## Ports and commands

Dev server on **5037**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`.
