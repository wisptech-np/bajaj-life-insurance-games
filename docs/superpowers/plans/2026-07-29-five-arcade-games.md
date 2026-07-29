# Five Fast-Arcade Games Implementation Plan (Batch 5)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development
> (parallel dispatch variant). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 new GAME_STANDARD-compliant fast-arcade insurance games (steady-wings,
premium-pulse, smart-recall, goal-juggler, life-rush), fully reviewed, registered, tracked,
and pushed to main.

**Architecture:** Identical to batch 4: one isolated Vite 5 + React 18.3.1 JS app per game
cloned from guardian-shelter/, game logic in pure modules so headless balance sims import
shipped code. Controller session plans, dispatches parallel Opus builders, dispatches
independent reviewers, drives fix rounds, and is the ONLY thing that touches git.

Note on the user's "reusable architecture / TypeScript" brief: `shared/game-kit/` IS the
reusable framework (loop, input, effects, audio, device, config — one canonical source,
synced per game); per-game copies + JS are the repo's proven deployment contract across 26
shipped games and the CRM services are certified verbatim. Staying consistent; documented here
as a deliberate decision.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-29-five-arcade-games-design.md` — briefs normative.
- Standard: `okf-brain/GAME_STANDARD.md` v2; scaffold: `guardian-shelter/`; hot-loop reference:
  `wealth-drop/src/WealthDropGame.jsx`.
- Builders NEVER run git; touch ONLY `<their-game>/` and `okf-brain/<their-game>/`.
- Gates per game before review: `pnpm build` green; multi-seed balance sim (>= 4 seed blocks)
  importing shipped modules with adversarial bots; Guardian Shelter grep = 0; no emoji canvas
  sprites; session <= 2 min with reachable win AND lose.
- Batch-4 lessons enforced from day one: multi-seed gates, adversarial exploit bots (idle,
  spam, camp), honest human-latency timing models, no per-frame allocations, watchdog
  assertions must be properties not samples.
- Ledger: `.superpowers/sdd/2026-07-29-five-arcade-games/progress.md`.

### Task 0: Commit planning docs + open ledger
- [x] Spec + plan + ledger; commit.

### Tasks 1–5: Build each game (parallel wave of 5, model: opus)
Per game: Step 1 dispatch builder -> Step 2 controller verifies gates -> Step 3 independent
reviewer (opus for physics/timing-heavy: steady-wings, goal-juggler, premium-pulse; sonnet:
smart-recall; opus for life-rush breadth) re-runs sims -> Step 4 fix rounds via SendMessage ->
Step 5 scoped re-review -> Step 6 controller commit -> Step 7 ledger.

1. steady-wings (5065) — one-tap impulse flight
2. premium-pulse (5066) — beat-synchronised rhythm tapping
3. smart-recall (5067) — Simon-style serial recall
4. goal-juggler (5068) — tap-to-bounce juggling keep-ups
5. life-rush (5069) — WarioWare microgame rush

### Task 6: Registration + tracker
- [ ] Manifest +5, README +5 rows, sync-game-kit GAMES +5, build-status +5 (Write tool, no
  BOM), CATALOG_NOTE +5, regenerate GAMES_TRACKER.xlsx (expect 33 rows; respect Excel lock).
- [ ] Commit registration.

### Task 7: Final sweep + push
- [ ] kit-sync --check clean; all 5 builds green; repo-wide Guardian Shelter grep = 0 new.
- [ ] git fetch -> merge FETCH_HEAD if remote moved (never rebase); push to main with PAT
  inline (never stored).
