# Guardian Arena

Archero-style arena survivor for Bajaj Life Insurance. You are a blue guardian
with a glowing shield emblem holding a walled arena against waves of green
virus blobs (repo convention: risk = green virus). One rule powers the whole
genre: **the guardian auto-fires at the nearest enemy only while standing
still — any movement input stops the firing.** The game is stutter-stepping:
slide for a beat, plant your feet, let the shield speak, repeat.

## Financial hook

*Layered protection* — every upgrade picked between waves is another **rider
added to your family's cover**. Multi-Cover Bolt, Ricochet Rider, Piercing
Cover, Auto-Pay, Top-Up Plan, Health Rider, Claim Settled: the run is won by
compounding layers of protection, exactly how a well-riding policy works.

## Controls

- **Hold & drag anywhere** — a floating virtual joystick appears under your
  finger (10 px dead zone, 60 px max radius). Drag to move (~200 px/s).
- **Release / stand still** — after a 120 ms settle, the guardian auto-fires
  at the nearest enemy (target-lock reticle shows who).
- Between waves: **tap 1 of 3 rider cards** to upgrade.

## Session (90 s, win OR lose — never a timeout fizzle)

| Wave | Time | Contents |
| --- | --- | --- |
| 1 | 0–20 s | 7 chasers, spawn every 1.5 s |
| 2 | ~20–45 s | 10 enemies, 30% shooters, 1.2 s spawns |
| 3 | ~45–70 s | 13 enemies, +25% splitters, 1.0 s spawns |
| 4 | 70–90 s | mini-boss (20× chaser HP, telegraphed 3-shot fan every 2.5 s) + trickle chasers |

- **WIN:** boss down, or the 90 s clock expires with the guardian standing.
- **LOSE:** 4 HP gone (hit = red vignette + 900 ms i-frames + knockback).

### Enemy archetypes

- **Chaser** — walks at you at 65% of your speed, contact damage, approaches
  from alternating flanks (anti corner-camping).
- **Shooter** — holds ~165 px range, 450 ms wind-up flash telegraph, fires a
  projectile at 75% of your speed (always dodgeable); leads its aim and arcs a
  2-shot spread when you park in a corner.
- **Splitter** — slow tank; on death splits into 2 half-size chasers with a
  300 ms harmless scatter.

### Fairness rules (all enforced in `src/sim.js`)

Projectiles slower than the player · every attack telegraphed ≥ 400 ms ·
spawns never within 150 px of the player and harmless during a 600 ms
spawn-in · i-frames prevent double-tap deaths.

## Scoring

`score = Σ kills × enemy tier + wave-clear bonuses`
(chaser 10, mini 5, shooter/splitter 20, boss 200; wave-clear bonus 50 × wave
number). Score is always visible and counts up with a damped animation.

## Anti pause-scum

The shared kit auto-pauses on `visibilitychange`. On resume the world **stays
frozen behind a visible 3-2-1 countdown (1.2 s) with the session clock held**,
then input is refused for one more 0.3 s live beat — backgrounding the tab is
never a free think-button. Implementation: `beginPause`/`endPause`/`isFrozen`
in `src/sim.js`, driven from the loop's `onPause` in
`src/GuardianArenaGame.jsx`.

## Tech

- Standalone Vite + React 18.3.1 app (no workspace), pnpm.
- Canvas renderer, 400×600 logical arena, DPR-aware, fixed-step 120 Hz sim
  via the shared game-kit (`src/kit/`, byte-identical copies — do not edit).
- Programmatic vector rendering only (no emoji sprites, no image assets).
- Web Audio synth only (`src/sfx.js`, ±10% random pitch), lazily unlocked on
  first gesture.
- Lead capture / slot booking / play count wired per `okf-brain/GAME_STANDARD.md` §2.
- All tunables in `src/data.js` (`GAME_CONFIG`).

## Build & run

```bash
cd guardian-arena
pnpm install
pnpm dev      # http://localhost:5070
pnpm build    # uat build (the verification gate)
```

Dev server port: **5070**.
