# Five New Games + Batch-2 Completion — Implementation Plan

> **For agentic workers:** executed via superpowers:dispatching-parallel-agents (user-directed) — one self-contained implementer per game in parallel, controller-run reviews on completion, controller-owned registration/commits/push. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship 7 game directories: restore `portfolio-fit/` (5044), build `spiral-sprint/` (5048), and build the five batch-3 games `wealth-drop/` (5039), `ripple-shield/` (5046), `steady-tower/` (5047), `goal-orbit/` (5050), `risk-strike/` (5054); register all and push.

**Specs:** `docs/superpowers/specs/2026-07-28-portfolio-fit-spiral-sprint-design.md`, `docs/superpowers/specs/2026-07-28-five-new-games-design.md`

## Global Constraints

Identical to the batch-2 plan's Global Constraints (GAME_STANDARD v2, brand/juice/audio/mobile rules, no-emoji sprites, kit usage, pnpm builds as the gate, documented balance corrections allowed). Parallel-execution additions:

- **Implementers never run git commands** — the controller commits each game dir when its agent completes and its review passes. Agents touch ONLY their own `<game>/` dir and `okf-brain/<game>/`.
- Scaffold + gameplay are ONE agent per game (the proven two-task shape executed by a single agent), following the worked examples `swing-to-secure/` and `milestone-hopper/`.
- Shared registration files (README, scripts/*, tracker) are controller-only, edited once at the end.

### Task P: portfolio-fit restore (agent) — per batch-2 plan Task 1 (restore from 1cf30a9, kit copy, gates audit, port 5044, build)
### Task S: spiral-sprint build (agent) — per batch-2 plan Tasks 2+3 (scaffold + helix gameplay, port 5048)
### Tasks W/R/T/O/K: wealth-drop, ripple-shield, steady-tower, goal-orbit, risk-strike (agents)

Each of W/R/T/O/K:
- [ ] Scaffold from guardian-shelter (same copy set + identity edits as the milestone-hopper scaffold; zero foreign-attribution grep gate incl. SlotBookingModal/ThankYouScreen/Screens share strings; drop unused COLORS import)
- [ ] data.js GAME_CONFIG with every tunable; gameplay component per spec brief using kit idioms from the two worked examples; Screens polish (Home hero, 3-beat animated HowToPlay, Results chips + Book-a-Slot primary)
- [ ] Balance verification (sim/arithmetic), documented corrections
- [ ] `pnpm install` + `pnpm build` exit 0; emoji grep clean
- [ ] README + OKF index/log
- [ ] Report file; NO git

### Task REG (controller, after all reviews pass)
- [ ] Commit each game dir as its review clears
- [ ] README rows ×7, manifest entries ×7, sync-game-kit GAMES +7, build-status +7, tracker-script catalog note (incl. portfolio-fit out of "Removed" note), regenerate GAMES_TRACKER.xlsx (Excel must be closed)
- [ ] §8 sweep: all 7 builds, greps, lead-flow diffs vs guardian-shelter
- [ ] Push with user PAT
