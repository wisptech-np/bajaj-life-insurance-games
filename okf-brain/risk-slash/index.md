---
type: project
title: Risk Slash
description: Fruit-Ninja-style swipe slicer — green labelled risk orbs (Scam Call, Hidden Fees, Debt Trap, Inflation, Medical Bill, Impulse Buy) lobbed in arcs, swipe-to-slash with a speed-gated blade; blue Family Shield orbs are the bombs. 90s session, target 120, combos, frenzy, slow-mo, anti-pause-scum re-acquire.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-slash
tags:
  - game
  - slicer
  - swipe
  - arcade
timestamp: 2026-07-29
---

# Risk Slash

Green risk orbs — six labelled financial hazards, each a distinct spiky glossy
vector orb with a white icon — are lobbed up in ballistic arcs (gravity
1500 px/s², apex at 70–85% of stage height, launch across the middle 80% of the
width with a slight inward angle). The player's finger is a glowing tapering
blade ribbon; a swipe segment slices only at ≥ 400 px/s, so slow dragging cuts
nothing. Blue **Family Shield orbs** are the bombs: −10 points, a 1 s
white-flash stun and a combo reset per slice, three sliced = early LOSE.
WIN: score ≥ 120 at the 90 s horn. Dev port **5073**.

## Financial hook

*Cut the risks out of your family's life — cover is the blade.* The hazards are
household risks; the blade is protection removing them; the shields are the
family itself — the one thing the blade must never touch.

## Mechanics

- **Combos:** 3+ risks in one continuous gesture with ≤ 300 ms between slices
  pays +2 × (N − 2); the per-slice "shing" rises a semitone per slice and
  resets on break. Cap 8 slices per gesture.
- **Slow-mo:** 5+ slices in one swipe = 1 s at 0.25× with a slight zoom and a
  screen flash.
- **Frenzy:** combo meter (10 risks without a shield hit) or ~every 30 s → 4 s
  of ×3 spawns, zero shields, warm tint. 75–90 s is a forced finale frenzy.
- **Ramp:** 0–15 s volleys of 1–2 every 1.6 s no shields; 15–45 s 2–4 every
  1.2 s shields 10%; 45–75 s 3–5 every 0.9 s shields 18%; then the finale.
- **Shield fairness:** telegraph puff 200 ms before launch, soft chime while
  airborne, calm glow vs spiky green — and an enforced ballistic path
  separation ≥ 1.2× combined radii between every shield and every risk over
  shared airtime (sampled at 60 ms; 12 re-rolls, else the shield is dropped).
  The check runs in both directions: risks spawned while a shield is live are
  re-rolled or skipped too.
- **Anti-pause-scum (repo-wide rule):** on resume from the kit's
  visibilitychange auto-pause the world stays frozen behind a visible 3-2-1
  count (1.5 s, session clock held) then a 0.25 s live input lock; the stale
  blade trail is also cleared so a pre-pause swipe cannot slice on resume.
  Pattern copied from goal-juggler.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, `RISK_TYPES`; every tunable.
- `src/RiskSlashGame.jsx` — canvas component; pooled orbs/halves/splats/blade
  ring buffer, sprites baked to offscreen canvases per resize, DOM-ref HUD.
- `src/Screens.jsx` — Home, How to Play (animated swipe demo), Results.
- `src/kit/` — byte-identical copy of `shared/game-kit/`.
- Scaffold (api, modals, playCount, crypto, shortener) copied from
  `guardian-shelter/` with identity strings only changed
  (`riskSlashLeadNo`, "Risk Slash Lead").

## Juice

Blade trail (two-pass glow + core, tapering, 200 ms fade), two spinning
clipped-sprite halves per slice flying perpendicular to the cut (±80–150 px/s,
±3 rad/s), directional goo spray, fading background splat decals, floating
score text, animated score counter, escalating combo callouts (CLEAN CUTS /
RUTHLESS / UNSTOPPABLE), screen shake + white flash on shield slice, slow-mo
zoom, frenzy tint, win fireworks / lose burst, kit synth audio with rising
semitone slice pitch.

## Ports and commands

Dev server on **5073**. `pnpm install`, `pnpm dev`, `pnpm build` (uat — the
verification gate), `pnpm build:preprod`, `pnpm build:prod`, `pnpm preview`.
