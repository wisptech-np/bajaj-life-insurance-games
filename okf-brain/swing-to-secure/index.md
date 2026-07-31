---
type: project
title: Swing to Secure
description: Rope-swing momentum runner where a guardian chains hex protection beacons across a dusk skyline of life milestones to reach the retirement vault.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/swing-to-secure
tags:
  - game
  - rope-swing
  - physics
timestamp: 2026-07-31
---

# Swing to Secure

One-thumb rope-swing runner. Hold to throw a tether at the nearest protection
beacon, swing to build momentum, release on the forward swing to fly. Reach the
Retirement Vault at 2,000 m inside a 110-second session.

Set at dusk over a city skyline. The shape language is the hexagon (beacons,
premium chips, risk mines, the vault gate) cut with chevrons (tower roofs, the
cape, progress marks); the signature accent is sunset amber `#FFB020` inside the
brand blue/orange/green. `swing-to-secure/asset-from-here.md` holds the Nano
Banana prompts for generated-art replacements of every on-screen object.

## Financial hook

The skyline is a working life; the beacons are cover. Momentum is the only thing
that carries you over a gap, and it only survives if you keep catching the next
anchor. Gaps widen, risk mines get denser, and late beacons sway — the course gets
more expensive exactly as a life does. Five milestones mark the run: Graduation
(200 m), First Job (500 m), Marriage (900 m), Home (1400 m), Retirement (2000 m).
Cover tokens are literal cover: a risk mine spends the token instead of the run.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable lives here.
- `src/SwingToSecureGame.jsx` — the whole game: one canvas component with mutable
  state in refs, module-level world generation, and programmatic draw functions.
- `src/Screens.jsx` — Home (dusk-skyline SVG motif), How to Play (animation-only
  4.2 s loop: a finger glyph performs the real grab/hold/release timing, with
  three one-word labels and no instruction prose), Results (score ring,
  distance/chips/milestone tiles, milestone chips, Book a Slot / Retry / Home).
- `src/kit/` — synced copy of `shared/game-kit`: fixed-step loop with the session
  clock, pointer input, pooled particle/shake/float-text effects, Web Audio synth,
  device tiering. Never edited in place.

## Physics

Two states. FLYING is a projectile under the game's own gravity — `GAME_CONFIG.physics`
lerps it 640 → 960 across the course rather than using the kit's global 1600 —
capped at terminal velocity. SWINGING is a rigid pendulum measured from straight-down:

```
theta = atan2(x - anchor.x, y - anchor.y)
omega += (-g / len) * sin(theta) * dt
theta += omega * dt
release: vx =  omega * len * cos(theta) * releaseBoost
         vy = -omega * len * sin(theta) * releaseBoost
```

Grabbing projects the incoming velocity onto the rope tangent and discards the
radial part, so *when* you grab decides how much momentum survives — that is the
skill, alongside release timing. `releaseBoost` (1.065) is the only source of new
energy in an otherwise conservative system, which is why the Perfect Release
window matters mechanically and not just for points.

## Balance corrections

Three values needed a specific reading, each verified against a headless
simulation of the exact loop across 40 generated courses (see the game README's
"Balance notes"):

1. `rope.damping` is applied per second (`pow(damping, dt)`), not once per fixed
   1/120 s step — per-step it compounds to ~0.55x/s and kills every run by ~85 m.
2. `rope.grabAssistPx` (120) extends the 130 px base reach while descending;
   without it an optimally-played run never reaches the vault.
3. `player.startSpeed` (395) seeds the opening swing; from rest the guardian can
   never rise back to beacon height. It must also satisfy
   `player.startY - anchors.baseY < rope.grabRadius`, or the opening `acos()`
   clamps to 1 and the guardian starts hanging dead still.
4. `hazards.minY/maxY` set to 226-368: placed under the flight arc the risk
   mines were never hit in 40 simulated runs, so the hazard-and-cover system was
   dead content. Nudged up again on 2026-07-31 because the shorter tether raises
   the release point.
5. (2026-07-31) Gravity moved off the kit global onto a per-game ramp, and the
   course was shortened in pixels (`pxPerMeter` 12 → 9) so the session stays
   legal at the slower speed. Measurements in `log.md`.

Result: well-timed play wins ~48% of runs in ~42 s with ~4,400 points; untimed
play (holding the button rather than timing grabs) reaches 180-450 m. The skill
is grab timing, because the grab discards the radial component of the incoming
velocity.

## Ports and commands

Dev server on **5037**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`.
