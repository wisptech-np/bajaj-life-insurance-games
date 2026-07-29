---
type: project
title: Wealth Merge
description: Suika-style drop-and-merge wealth collector — drop rupee coins into a glass jar, identical tokens merge into the next tier up an 8-rung ladder (Coin to Retirement Corpus), chain cascades multiply score, and the overflow line with a 2-second grace countdown is the tension engine. 100s session, win at 300 points or by forging the Corpus. Port 5072.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/wealth-merge
tags:
  - game
  - physics
  - merge
  - suika
  - arcade
timestamp: 2026-07-29
---

# Wealth Merge

Drop wealth tokens into a jar; two same-tier tokens in contact merge into one
of the next tier at the contact midpoint, with a fixed pop-and-jostle that
sets off chain cascades. Eight tiers, radius ×~1.35 per step (12 → 96 px):
Rupee Coin → Coin Stack → Gold Ingot → Piggy Bank → SIP Jar → Gold Shield →
Home → **Retirement Corpus** (the glowing "watermelon"). Dev port **5072**.

## Financial hook

*Compounding in your hands* — small savings merge into life goals; two rupees
become a future. Nothing in the jar grows by sitting alone; it grows by being
combined, and unmerged clutter is what overflows the jar. The chain
multiplier (x1 → x1.5 → x2 → x3 → x4…) is compounding made tactile.

## Rules

- **Session** 100 s. **Win**: forge the tier-8 Corpus (instant), or score
  ≥ 300 at the whistle. **Lose**: overflow, or the whistle below target.
- **Droppable** tiers 1–4, weighted 4:3:2:1; after 40 s the weights shift to
  1:3:3:2 so the jar fills faster. Next piece 0.4 s after a release,
  next-piece preview always visible.
- **Overflow**: danger line 18% down from the jar mouth, always visible. Only
  a token **at rest** (speed < 20 px/s, age > 0.5 s) above the line arms the
  flashing 2.0 s countdown — a transient bounce never loses, and a
  last-second merge-out cancels it.
- **Anti-stall**: a held piece auto-drops after 5 s; since the win requires
  the score target, idling can never win (measured 0/30 idle sessions —
  they overflow on auto-drops).
- **Anti-pause-scum**: resuming from the kit's visibilitychange auto-pause
  holds the world and the session clock behind a 1.5 s 3-2-1 count, then a
  0.25 s live input lock. Pattern copied from `goal-juggler`; the rule lives
  in the pure module `src/physics.js`.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, `TIERS`; every tunable.
- `src/physics.js` — **pure** hand-rolled circle physics (no matter.js):
  gravity 1500 px/s², restitution 0.15, friction 0.4, fixed 1/120 s kit step
  (= 60 Hz with 2 substeps), 4 impulse+positional-correction iterations,
  mass ∝ r², post-solver merge pass with a same-frame double-merge guard,
  displacement-based velocity reconciliation for near-static tokens (so
  "at rest" is honest in tall stacks), chains, overflow, auto-drop, pause
  rule, win/lose. Config and tier table are parameters — headless-drivable.
- `src/WealthMergeGame.jsx` — canvas component: pre-rendered layered tier
  sprites (gradient body, bevel crescents, white emblem silhouettes with
  punched detail, gloss), aim guide with ghost landing ring, squash/wobble,
  particle bursts, chain fly-ups, tier-6+ screen shake, heartbeat alarm,
  re-acquire veil. No rules in the component.
- Scaffold (lead capture, slot booking, playCount, crypto, shortener, kit)
  copied from `guardian-shelter` / `shared/game-kit` per GAME_STANDARD.
  `LEAD_NO_KEY = 'wealthMergeLeadNo'`.

## Verification

`pnpm install` clean; `pnpm build` (uat) green — 524 modules, zero errors.
18/18 headless physics smoke checks pass (merge, triangular scoring, chain
depth, settle < 2 s, containment, overflow grace, auto-drop, freeze/input
lock, expiry both ways, Corpus instant win, stats contract). Emoji grep of
`src/` clean (game sprites are all programmatic canvas). Full details in
`log.md`.

## Ports and commands

Dev server **5072**. `pnpm install`, `pnpm dev`, `pnpm build` (uat gate),
`pnpm build:preprod`, `pnpm build:prod`, `pnpm preview`.
