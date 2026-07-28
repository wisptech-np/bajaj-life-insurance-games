# Ten New Games Implementation Plan (Batch 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (parallel
> dispatch variant) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 10 new GAME_STANDARD-compliant insurance games (premium-pinball, cover-drive, goal-keeper,
wealth-carrom, wealth-balloon, income-pipeline, smart-sorter, safe-crossing, slide-to-safety,
perfect-premium), fully reviewed, registered, tracked, and pushed to main.

**Architecture:** One isolated Vite 5 + React 18.3.1 app per game cloned from guardian-shelter/, game
logic in pure modules (data.js / physics or rules module) so headless balance sims import shipped code.
Controller session (this one) plans, dispatches parallel Opus builder agents, dispatches independent
reviewers, drives fix rounds, and is the ONLY thing that touches git.

**Tech Stack:** Vite 5, React 18.3.1, shared/game-kit (copied per game), Web Audio synth, node headless sims.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-28-ten-new-games-design.md` — per-game briefs are normative.
- Standard: `okf-brain/GAME_STANDARD.md` v2; gold standard scaffold: `guardian-shelter/`.
- Reference implementation of kit idioms: `wealth-drop/src/WealthDropGame.jsx` (hot-loop discipline).
- Builder agents NEVER run git. Controller commits per game dir.
- Builder agents touch ONLY `<their-game>/` and `okf-brain/<their-game>/`.
- Gates per game (all must pass before review dispatch): `pnpm build` (mode uat) green; balance sim
  targets from spec met (sim imports shipped modules); `grep -r "Guardian Shelter" <game>/src/` = 0 hits;
  no emoji canvas sprites; session ≤ 2 min win AND lose reachable.
- Spec-constant corrections allowed only when sim-proven, documented in `okf-brain/<dir>/log.md`.
- Ledger: `.superpowers/sdd/2026-07-28-ten-new-games/progress.md` — controller appends per event.

---

### Task 0: Commit planning docs + open ledger

- [ ] Write spec + this plan; create ledger with the 10-game roster.
- [ ] `git add docs/superpowers/... .superpowers/sdd/2026-07-28-ten-new-games/ && git commit -m "Plan batch 4: ten new games (spec + plan)"`

### Tasks 1–10: Build each game (parallel, wave of 5 + wave of 5)

One task per game, identical shape. **Files** per game `<g>`: Create `<g>/**` (full app),
`okf-brain/<g>/index.md`, `okf-brain/<g>/log.md`. **Interfaces:** results stats contract exactly as
spec §`<g>`; CRM identity exactly as spec §`<g>`.

- [ ] **Step 1: Dispatch builder (model: opus).** Prompt contains: paths to spec (their § only is
  normative), GAME_STANDARD, guardian-shelter, wealth-drop reference; the per-game brief verbatim;
  the gates; the no-git / path-scope rules; required report format (files, sim numbers, build output tail).
- [ ] **Step 2: Verify gates myself** — run `pnpm build` in the game dir, run their balance sim, run the
  Guardian-Shelter grep, eyeball data/rules module for spec fidelity.
- [ ] **Step 3: Dispatch independent reviewer** (opus for physics-heavy: premium-pinball, wealth-carrom,
  cover-drive, goal-keeper; sonnet otherwise). Reviewer gets spec § + standard checklist; must
  re-run the sim, not trust the report. Output: findings list Critical/Major/Minor.
- [ ] **Step 4: Fix round** — SendMessage the original builder with Critical+Major findings; re-run gates.
- [ ] **Step 5: Scoped re-review** of the fixes (same reviewer via SendMessage when possible).
- [ ] **Step 6: Controller commit:** `git add <g> okf-brain/<g> && git commit -m "Add <g>: <one-line mechanic>"`
- [ ] **Step 7: Ledger append** (build result, findings, fixes, deferred minors).

Wave 1: premium-pinball, cover-drive, goal-keeper, wealth-carrom, wealth-balloon.
Wave 2: income-pipeline, smart-sorter, safe-crossing, slide-to-safety, perfect-premium.

### Task 11: Registration + tracker

**Files:** Modify `scripts/games-manifest.json`, `README.md`, `scripts/sync-game-kit.mjs`,
`scripts/build-status.json` (UTF-8 NO BOM — use Write tool, never PowerShell Set-Content),
`scripts/build_tracker.py` (CATALOG_NOTE approved-scope line); regenerate `GAMES_TRACKER.xlsx`.

- [ ] Manifest: +10 newGames entries `{concept, reference: "Original concept", financialConcept,
  gameName, bajajName, feedback: "Approved - new original concept", dir, port}` per spec ports 5055–5064.
- [ ] README table: +10 rows. sync-game-kit GAMES: +10 dirs; run `node scripts/sync-game-kit.mjs` then `--check`.
- [ ] build-status.json: +10 keys "Built - review clean" (only after Tasks 1–10 truly clean).
- [ ] `python scripts/build_tracker.py --status-file scripts/build-status.json` → expect "28 game rows".
  If Excel lock (`~$GAMES_TRACKER.xlsx`) present, wait for release — NEVER rebase/checkout while locked.
- [ ] Commit: `git add -A && git commit -m "Register batch 4: manifest, README, kit sync, tracker (28 rows)"`

### Task 12: Final sweep + push

- [ ] `node scripts/sync-game-kit.mjs --check` clean; all 10 `pnpm build` green (re-run any game whose
  dir changed since its gate run); repo-wide `grep -r "Guardian Shelter" */src/` = 0 new hits.
- [ ] `git fetch` → if remote moved, `git merge FETCH_HEAD` (NEVER rebase — Excel lock precedent), resolve
  only if disjoint; verify tree.
- [ ] Push to main with the user's PAT inline (never store in config/remote). Ledger final entry.
