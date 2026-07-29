---
type: project
title: Dual Cover
description: Duet-style twin-orbit dodger — BLUE Protection and ORANGE Growth orbs locked 180° apart on a ring, hold-to-rotate through a 90-second authored descent of walls, gates, spinners and squeezes; both orbs must survive. Headless gate proves reachability and playability per seed.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/dual-cover
tags:
  - game
  - dodger
  - twin-orbit
  - arcade
timestamp: 2026-07-29
---

# Dual Cover

Two orbs — BLUE **Protection** (shield glyph) and ORANGE **Growth** (rising
arrow) — locked at 0°/180° on a ring (radius 120, centre (195, 480) of a
390×780 logical portrait field). Obstacles descend from the top for ~90
seconds; the player spins the pair so BOTH orbs survive. Dev port **5079**.

## Financial hook

Protection and growth are two sides of one plan — steer them together, because
losing either loses the future. The rigid 180° pair IS the argument: no line
exists that saves one orb at the other's expense.

## Rotation feel

Hold-to-rotate: holding the left/right screen half applies 780°/s² of angular
acceleration toward that side, max ω 330°/s; release decays ω with an 80 ms
half-life (surgical stop); both halves held = zero net torque; touches beyond
two ignored. A direct-drag assist mode is an accessibility toggle on the
How-to-Play screen, default off (`rotation.dragDegPerPx`). The kit's
`createInput` is single-pointer, so the component uses raw pointer events for
the two-half hold (documented deviation; kit untouched).

## Vocabulary and ramp

wall (0 s, vertical ±20°) · centre bar (0 s, horizontal ±23°) · staggered
gates (20 s, two stub walls 380 px apart on opposite sides — vertical held
through a double beat) · spinner (45 s, centre bar rotating 45° in descent
with arrow + preview spin ~0.5 s before the lethal band) · squeeze (70 s,
double bar with one off-centre gap at the 45° orb radius — a held diagonal,
~0.6–0.7 s in the band). Descent 330→470 px/s and spawn interval 1.7→1.15 s,
both linear across 90 s. One authored sequence per session seed (~29–31
obstacles), spawn cadence anchored to the previous obstacle's trailing edge
crossing the ring centre so the lethal band is never doubly occupied.

## Win / lose / score

WIN = survive the full sequence. LOSE = 4th hit (3 shields; each hit 60 ms
hit-stop + 900 ms invulnerability; the obstacle persists and carries a paint
splat in the dead orb's colour — legible death history). Score: 40/pass ×
combo (×1.1 per consecutive clean pass, cap ×3, reset on hit) + 25/near-miss
(clearance < 10 px) + 150 × clean phase (4 phases) + 500 no-hit finish.
Results contract: `{score, obstaclesPassed, nearMisses, shieldsLeft}`.

## Pause handling

Kit auto-pause (visibilitychange) → resume behind a visible 3-2-1 re-acquire
(1.2 s, clock held, input dead) PLUS the obstacle field rewound by 250 ms of
travel — grace without advantage. Rule lives in `src/rules.js`
(`beginPause`/`endPause`/`isFrozen`) so the gate drives it.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` + `COLORS`, every tunable.
- `src/rules.js` — pure: PRNG, ramp closed forms, generator + reachability
  constraint, rotation kinematics, circle/AABB + circle/OBB collision,
  scoring, phases, pause/rewind. No DOM; config is a parameter.
- `src/DualCoverGame.jsx` — canvas component, no rules; raw two-pointer input.
- `gate.mjs` — headless gate (`node gate.mjs`).
- Scaffold (modals, ThankYou, api, playCount, crypto, shortener, kit copy)
  per GAME_STANDARD from guardian-shelter; `LEAD_NO_KEY = 'dualCoverLeadNo'`.

## Gate (all PASS, 12 seeds)

(a) reachability: `req/330 × 1.6 ≤ timeToArrival` for every pair, worst
ratio 0.269, max required rotation 90° (cap 170°); sequences 29–31 obstacles,
all finish ≤ 89.73 s. (b) optimal-rotation bot (shipped input API, bang-bang
with decay-braking) survives every seed with 0 hits, mean score 4,369,
tightest clearance 10.0 px. (c) idle bot always loses, latest 4th hit at
27.2 s. Plus a pause spot-check: resume freezes the clock and rewinds
obstacles by exactly `speedAt(t) × 0.25`.

## Ports and commands

Dev **5079**. `pnpm install`, `pnpm dev`, `pnpm build` (uat — the gate),
`pnpm build:preprod`, `pnpm build:prod`, `node gate.mjs`.
