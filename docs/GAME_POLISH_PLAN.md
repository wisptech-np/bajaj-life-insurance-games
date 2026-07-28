# Game Polish Plan

Companion to `GAME_QUALITY_AUDIT.md`. Grouped by value, not by game, because the
same defect recurs across games and is cheapest to fix as one sweep.

The shared systems in `shared/game-kit/` exist so each item below is adopted rather
than reimplemented per game. Edit the canonical copy, then run:

```
node scripts/sync-game-kit.mjs          # distribute to all 7 games
node scripts/sync-game-kit.mjs --check  # CI guard against stale copies
```

---

## Critical — correctness, do first

| # | Change | Games | Status |
|---|---|---|---|
| 1 | Apply a DPR transform so logical units map to the full backing store | guardian-shelter, secure-journey | **Done** |
| 2 | Cap render DPR at 2 | guardian-shelter, secure-journey | **Done** |
| 3 | Move the session clock into the rAF loop so backgrounding pauses it | guardian-shelter | **Done** |
| 4 | Same for the remaining four Canvas games | smart-match-3d, risk-exit, life-soar, secure-journey | **Pending** |
| 5 | Pause veil so the player sees *why* play stopped | guardian-shelter | **Done** |

Item 4 is the largest remaining correctness gap. Each game needs its
`setInterval` countdown replaced by `createGameLoop({ sessionSeconds, onTick, onExpire })`,
following the `guardian-shelter` diff as the worked example.

## High value — feel and reach

| # | Change | Detail |
|---|---|---|
| 6 | Adopt `createEffects()` | Replaces four independent per-frame-allocating particle systems with one pooled implementation that scales to the device tier. |
| 7 | Adopt `createAudio()` | Fixes the silent-on-iOS unlock, adds mute persistence for the session, suspends audio on pause. |
| 8 | Honour `prefers-reduced-motion` | Automatic once `createEffects` is adopted: shake, trails and hit-stop go to zero, score popups stay. |
| 9 | Add `env(safe-area-inset-*)` padding to HUD containers | Needed in guardian-shelter, risk-exit, life-soar, coverage-archer, tightrope-protection. |
| 10 | Wire `haptic()` into scoring, collision, win, lose | Done in guardian-shelter; trivially portable. |
| 11 | Fixed-step physics via `createGameLoop` | Removes the slow-motion-on-slow-device behaviour (H2). |
| 12 | Convert `landing_bg.png` (532 KB) to WebP | tightrope-protection. Est. 60–75% saving. |

## Optional — worth doing, not blocking

| # | Change | Detail |
|---|---|---|
| 13 | Resolve `public/thumbnail.png` (853 KB) | Confirm whether an external page references `/thumbnail.png`; delete if not. |
| 14 | Remove dead `life-soar/src/game_background.webp` | Repo hygiene only — not bundled, so no runtime gain. |
| 15 | Remove the no-op ref callback in guardian-shelter | Readability. |
| 16 | Tier-aware effect downgrade | `createGameLoop({ onSlow })` already detects sustained slow frames; wire it to `downgradeTier()` + `effects.refreshBudget()`. |
| 17 | Automated tests for scoring | No test infrastructure exists in any game today; see `TESTING_CHECKLIST.md`. |
| 18 | Phaser-specific audit | coverage-archer, tightrope-protection: verify `Scale.FIT`, scene teardown on replay, and texture memory across repeated restarts. |

## Sequencing

1. **Item 4** — finish the session-clock migration. Highest remaining correctness risk.
2. **Items 6–8, 11** — one adoption pass per game; they land together since all four come
   from the same kit wiring.
3. **Items 9, 10, 12** — quick, independent, low risk.
4. **Items 13–18** — as capacity allows.

## Explicitly out of scope

- **No new engine.** The brief asks for justification before adding Phaser/Pixi/Matter to the
  Canvas games. The recommendation is **not to**, and this repo happens to contain its own
  measurement. Current production bundles:

  | Game | Stack | Bundle | Gzip |
  |---|---|---|---|
  | guardian-shelter | Canvas 2D | 404 KB | **133 KB** |
  | secure-journey | Canvas 2D | 397 KB | **131 KB** |
  | tightrope-protection | Phaser 3 | 1,803 KB | **446 KB** |

  Adopting Phaser would mean rewriting five working games to ship **3.4× more JavaScript** on a
  marketing funnel where startup time directly costs leads. The defects actually found were a
  missing DPR transform and two clocks disagreeing — neither of which an engine would have
  prevented, and both of which are now fixed in a few dozen lines.
- **No rewrite.** Every change above is additive or a localised fix. Business rules, scoring,
  LMS lead capture, slot booking, `playCount`, and the screen flow are untouched.
- **No compliance copy changes.** Nothing in this pass alters insurance-facing wording.
