# Portfolio Fit & Spiral Sprint — Design

**Date:** 2026-07-28
**Source:** GAMES_TRACKER approved rows (Portfolio Fit feedback "Ok"; Spiral Sprint new original
concept) + the archived briefs in `git show 1cf30a9:scripts/games-manifest.json`, which match the
tracker rows and were written for BajajLife review.
**Governing standard:** `okf-brain/GAME_STANDARD.md` (v2) applies verbatim. Shared architecture
(scaffold, screen flow, kit usage, LMS lead flow, registration) is identical to
`docs/superpowers/specs/2026-07-28-swing-to-secure-milestone-hopper-design.md` §"Shared
architecture" and is not restated.

| dir | bajajName | gameName | concept | financial hook | port |
|---|---|---|---|---|---|
| `portfolio-fit/` | Portfolio Fit | Block Fit 1010 | 1010! drag-and-place block puzzle (no gravity) | Asset allocation — fitting every asset class into a balanced portfolio | 5044 |
| `spiral-sprint/` | Spiral Sprint | Helix Descent | Helix-jump descending ball | Riding market cycles — descend through volatility, avoid the crash zones | 5048 |

## Game 1 — Portfolio Fit (`portfolio-fit/`, port 5044) — RESTORE + MODERNIZE

A complete implementation exists at commit `1cf30a9` (removed in the scope cut solely for
lacking sign-off, which the tracker now grants as "Ok"). It is restored from history, not
rebuilt.

**Restored gameplay (as approved):** 9×9 board; three asset pieces offered at a time
(tetromino-like shapes themed as asset classes: Equity=orange, Debt=blue, Gold=gold,
Insurance=green with shield sheen). Drag pieces onto the board; completing a full row or column
clears it with a sweep animation + particles ("Portfolio Rebalanced!"). No gravity, no rotation.
Game ends when no offered piece fits (lose) or the 2-minute timer ends (score win). Clearing
rows containing all 4 asset colors = Diversification Bonus ×2. Score = cells placed + clears
×100 + diversification bonuses. Ghost preview while dragging, invalid-drop shake, streak flames
on multi-clears.

**Modernization pass (delta to the restored code):**
1. Copy the shared game-kit into `src/kit/` (repo convention since `b6af148`) — adopt
   `createGameLoop` for the session clock if the restored code uses `setInterval` (the
   background-tab drift defect the kit exists to fix); otherwise leave gameplay logic alone.
2. CRM attribution audit: `LEAD_NO_KEY`, `summaryDtls`, remark strings must say Portfolio Fit
   (zero "Guardian Shelter"/foreign-game grep matches in `src/`).
3. Verify against GAME_STANDARD §8: `pnpm install` + `pnpm build` pass, no emoji sprites,
   lead flow intact, README present. Fix only what the gate fails — no redesign.
4. Restore `okf-brain/portfolio-fit/` from the same commit and append a log entry for the
   restoration.

## Game 2 — Spiral Sprint (`spiral-sprint/`, port 5048) — FRESH BUILD

Helix jump: a bouncing shield ball descends a rotating spiral tower; drag horizontally to
rotate the tower (pseudo-3D: platform arcs drawn as ellipse segments with depth shading). Each
platform ring has gaps (fall through to descend), safe arcs (blue), and red crash arcs (touch =
lose unless in fever). Passing 3+ rings in one fall = fever streak (ball flames and smashes
through one red arc). 40 rings to the vault at the bottom = win; 2-minute cap. Rings labelled
with descending years-to-retirement every 10 rings. Score = rings descended ×20 + fever smashes
×100 + finish bonus. Bounce squash, paint-splash on landing, tower gradient darkens with depth.

**Mechanics detail (fixed for implementation):**
- Tower rotation is player-controlled by horizontal drag (deg-per-px in GAME_CONFIG); the ball
  bounces in place vertically (fixed screen x-center) with kit-gravity bounce of constant
  height; rotating the tower moves the arcs under the ball.
- Ring model: each ring = list of arc segments `{startDeg, spanDeg, type: safe|crash|gap}`.
  Ball state sampled at bounce-contact: over a gap → fall to next ring; safe arc → bounce;
  crash arc → lose (or smash in fever). Fever = passed ≥3 rings in one uninterrupted fall.
- Difficulty ramp: crash-arc share and narrower gaps grow with depth; ring 40 = vault floor.
- Lose paths: crash arc (unshielded/no fever) or 120 s timeout before ring 40. Win: ring 40.
- Stats contract: `onWin/onLose({score, rings, smashes, best streak → combo})` — exact keys:
  `{score, rings, smashes, streak}`.
- Balance gate (lesson from the sibling builds): verify by arithmetic or headless sim that a
  casual player clears 40 rings well inside 120 s and that fever is reachable; document any
  corrected constants in `data.js`.

## Registration

Both games: README table rows (5044 / 5048), `scripts/games-manifest.json` entries (briefs
above; portfolio-fit `feedback: "Ok"`), `scripts/sync-game-kit.mjs` GAMES list,
`scripts/build-status.json` statuses, regenerate `GAMES_TRACKER.xlsx`, OKF docs per game.

## Testing

Per repo convention: §8 build gate per game + manual smoke; kit covered by
`scripts/test-game-kit.mjs`.
