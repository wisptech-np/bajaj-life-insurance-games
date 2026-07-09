# Design: 25 New Games + 8 Revamps — Bajaj Life Insurance Games

**Date:** 2026-07-09 · **Mode:** autonomous (user directive: build with parallel subagents; no mid-task Q&A)

## Goal
Deliver 25 new very-high-quality mobile web games (mix of insurance-themed and pure-game concepts)
plus revamp all 8 existing games (everything except `life-goals-bubble-shooter`, the gold standard),
and maintain an Excel tracker (`GAMES_TRACKER.xlsx`).

## Decisions (made autonomously, rationale inline)
1. **Stack:** Vite + React 18.3 + canvas, cloned from the bubble-shooter scaffold — matches the gold
   standard exactly; shared services (`api.js`, `playCount.js`, crypto, shortener, modals) are copied
   per repo convention (see `bajaj-game-store/COMMON_SERVICES.md`).
2. **Concept selection:** From the user's table — rows marked *Ok* are built to feedback
   (Guardian Shelter, Balance Block Journey, Secure Journey, Smart Match 3D, Risk Exit; Guardian
   Archer as a revamp of coverage-archer). Rows marked *Drop* are excluded (Wealth Current, Path to
   Legacy, Launch to Protection, Secure Foundations). Rows marked *Not opening* (Life Soar, Shield
   Cascade) are rebuilt from their concept descriptions since the mechanic is clear and unduplicated;
   Tightrope Protection already exists → revamp. Remaining 18 concepts chosen from mechanics **absent**
   from both this repo and `bajaj-game-store/GAMES_CATALOG.md` (its "underused mechanics" guidance).
3. **Anti-duplication check:** every new mechanic verified against the catalog's quick index —
   plinko, 2048-merge, lane-hop, cut-rope, pipe-flow, knife-hit, piano-tiles, 1010-fit,
   spot-difference, chain-reaction, jenga-removal, helix, rope-swing, orbit-hop, traffic-control,
   claw machine, simon-sequence, bowling: none present.
4. **Quality bar:** `okf-brain/GAME_STANDARD.md` (written today) codifies the bubble-shooter flow,
   visual/audio/mobile standards, and a build-pass verification gate; every subagent must follow it.
5. **Orchestration:** one Workflow run; each game = one subagent that scaffolds, implements, runs
   `pnpm install && pnpm build` until green, and writes its own `okf-brain/<dir>/` files. The
   orchestrator (main session) owns shared files (root OKF index/log, tracker) to avoid write races.
6. **Tracker:** `GAMES_TRACKER.xlsx` with the user's exact columns (Game Concept, Reference Game
   Link, Financial Concept, Game Name, Game Name Bajaj, Feedback on Reference Game, Game Feedback)
   + Directory/Type/Status/Mechanic; second sheet = do-not-repeat catalog. Source of truth:
   `scripts/games-manifest.json`; regenerate via `scripts/build_tracker.py`.
7. **No commits** — user has not asked to commit; working tree left for review.

## Full game list
See `scripts/games-manifest.json` (25 `newGames` with per-game gameplay briefs + ports 5030–5054,
8 `revamps` with audit briefs).
