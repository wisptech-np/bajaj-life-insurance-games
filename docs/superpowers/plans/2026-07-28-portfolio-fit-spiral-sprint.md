# Portfolio Fit & Spiral Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore + modernize `portfolio-fit/` (port 5044) from commit `1cf30a9` and build `spiral-sprint/` (port 5048) fresh, both to `okf-brain/GAME_STANDARD.md`, then register repo-wide.

**Architecture:** portfolio-fit is restored from git history and touched only where the standard's gate or repo conventions demand (kit copy, session clock, CRM attribution). spiral-sprint follows the proven two-task shape (scaffold copied from `guardian-shelter/`, then a kit-driven canvas gameplay component). Registration mirrors the swing-to-secure/milestone-hopper batch.

**Tech Stack:** React 18.3.1, Vite 5, shared game-kit, Web Audio synth, pnpm. No workspace.

**Spec:** `docs/superpowers/specs/2026-07-28-portfolio-fit-spiral-sprint-design.md`

## Global Constraints

- `okf-brain/GAME_STANDARD.md` v2 in full; `guardian-shelter/` is the scaffold reference; `swing-to-secure/` + `milestone-hopper/` are review-verified worked examples of kit-driven gameplay components.
- Brand palette/typography, no-emoji-sprite rule, juice requirements (particles, floating text, shake, squash, transitions, animated score), kit synth audio, session ≤2 min with clear win AND lose, 60 fps fixed-step, DPR canvas — all per standard §4–6.
- Ports: portfolio-fit **5044**, spiral-sprint **5048**. Rollup output names `PortfolioFit` / `SpiralSprint`.
- CRM identity: `LEAD_NO_KEY` `portfolioFitLeadNo` / `spiralSprintLeadNo`; `summaryDtls` `'Portfolio Fit Lead'` / `'Spiral Sprint Lead'`; zero foreign-game attribution strings in each game's `src/` (grep gate).
- Build gate per game: `pnpm install` + `pnpm build` exit 0.
- Balance corrections to spec constants are allowed when verified by arithmetic/sim and documented in `data.js` (established batch precedent).

---

### Task 1: Restore + modernize portfolio-fit

**Files:**
- Restore: `git checkout 1cf30a9 -- portfolio-fit okf-brain/portfolio-fit`
- Create: `portfolio-fit/src/kit/` (copy of `shared/game-kit/*.js`)
- Modify (only as gates demand): `portfolio-fit/src/PortfolioFitGame.jsx` (session clock → kit loop if it uses setInterval), `src/api.js`/`src/SlotBookingModal.jsx` (attribution audit), `okf-brain/portfolio-fit/log.md` (restoration entry)

**Interfaces:**
- Produces: working `portfolio-fit/` app on port 5044 passing §8; `PortfolioFitGame({config, onWin, onLose})` already wired by the restored App.jsx.

- [ ] **Step 1: Restore from history** — `git checkout 1cf30a9 -- portfolio-fit okf-brain/portfolio-fit`; `Copy-Item shared/game-kit/*.js portfolio-fit/src/kit/` (create dir first).
- [ ] **Step 2: Audit the restored code against the standard's gates** — read `PortfolioFitGame.jsx`, `App.jsx`, `api.js`, `vite.config.js`, `data.js`:
  - vite port must be 5044 and output name `PortfolioFit` (fix if the archived copy differs);
  - `LEAD_NO_KEY`/`summaryDtls`/remarks must attribute Portfolio Fit — `grep -rn "Guardian Shelter\|Bubble Shooter\|bubble" portfolio-fit/src/` → 0 gameplay-attribution matches;
  - if the session timer is `setInterval`-based, port it to kit `createGameLoop` (`sessionSeconds`, `onTick`, `onExpire`) with minimal surgery — gameplay logic and feel stay untouched;
  - emoji-sprite grep over `src/` → none in canvas drawing.
- [ ] **Step 3: Build gate** — `cd portfolio-fit; pnpm install; pnpm build` → exit 0. Fix compile breaks caused by drift (e.g. React version pins) with the smallest possible change.
- [ ] **Step 4: OKF log entry** — append to `okf-brain/portfolio-fit/log.md`: restored from 1cf30a9 after BajajLife sign-off ("Ok"), kit added, audit results, build verified.
- [ ] **Step 5: Commit** — `git add portfolio-fit okf-brain/portfolio-fit && git commit -m "Restore Portfolio Fit from history and modernize to current standard"`.

---

### Task 2: Scaffold spiral-sprint

Same procedure as the milestone-hopper scaffold (worked example: `milestone-hopper/` at commit `0139d7c`), with substitutions:

**Files:** copy set from `guardian-shelter/` into `spiral-sprint/` (index.html, vite.config.js, package.json, src/{main.jsx, index.css, App.jsx, api.js, LeadCaptureModal.jsx, SlotBookingModal.jsx, ThankYouScreen.jsx}, src/services/playCount.js, src/utils/{crypto.js, shortener.js}, src/kit/ from shared/game-kit); placeholders `src/SpiralSprintGame.jsx`, `src/data.js`, `src/Screens.jsx`.

**Interfaces:**
- Produces: `SpiralSprintGame({ config, onWin, onLose })`; `LEAD_NO_KEY = 'spiralSprintLeadNo'`; `summaryDtls = 'Spiral Sprint Lead'`.

- [ ] **Step 1: Copy scaffold**

```powershell
New-Item -ItemType Directory -Force spiral-sprint/src/services, spiral-sprint/src/utils, spiral-sprint/src/kit
Copy-Item guardian-shelter/index.html, guardian-shelter/vite.config.js, guardian-shelter/package.json spiral-sprint/
Copy-Item guardian-shelter/src/main.jsx, guardian-shelter/src/index.css, guardian-shelter/src/App.jsx, guardian-shelter/src/api.js, guardian-shelter/src/LeadCaptureModal.jsx, guardian-shelter/src/SlotBookingModal.jsx, guardian-shelter/src/ThankYouScreen.jsx spiral-sprint/src/
Copy-Item guardian-shelter/src/services/playCount.js spiral-sprint/src/services/
Copy-Item guardian-shelter/src/utils/crypto.js, guardian-shelter/src/utils/shortener.js spiral-sprint/src/utils/
Copy-Item shared/game-kit/*.js spiral-sprint/src/kit/
```

- [ ] **Step 2: Identity edits** — package name `spiral-sprint`; vite output `SpiralSprint`, port **5048**; index.html title `Spiral Sprint`; api.js key/summary per Interfaces; LeadCaptureModal copy; App.jsx imports `SpiralSprintGame`; drop the unused `COLORS` import from the copied Screens.jsx; zero-"Guardian Shelter" grep gate incl. SlotBookingModal remark + header and ThankYouScreen/Screens share strings.
- [ ] **Step 3: Placeholders** — `data.js` `export const GAME_CONFIG = { sessionSeconds: 120 }; // real tunables land in the gameplay task`; stub `SpiralSprintGame`; Screens strings: title "Spiral Sprint", subtitle "Ride the market cycles. Land safe, dodge the crash.", how-to "Drag to spin the tower · Fall through the gaps · Avoid red crash zones".
- [ ] **Step 4: Build gate** — `cd spiral-sprint; pnpm install; pnpm build` → exit 0.
- [ ] **Step 5: Commit** — `git add spiral-sprint && git commit -m "Scaffold spiral-sprint from guardian-shelter gold standard"`.

---

### Task 3: Spiral Sprint gameplay

**Files:**
- Modify: `spiral-sprint/src/data.js`, `spiral-sprint/src/SpiralSprintGame.jsx`, `spiral-sprint/src/Screens.jsx`
- Create: `spiral-sprint/README.md`, `okf-brain/spiral-sprint/index.md`, `okf-brain/spiral-sprint/log.md`

**Interfaces:**
- Consumes: kit surface as used by `swing-to-secure/src/SwingToSecureGame.jsx` / `milestone-hopper/src/MilestoneHopperGame.jsx` (read those for the review-verified idioms: fitCanvas signature, effects lifecycle + isFrozen, loop opts, teardown set, HUD textContent refs).
- Produces: `onWin/onLose({score, rings, smashes, streak})`; ResultsScreen renders those keys.

- [ ] **Step 1: Real GAME_CONFIG**

```js
export const GAME_CONFIG = {
  sessionSeconds: 120,
  tower: { rings: 40, ringGapPx: 150, radiusPx: 150, degPerPx: 0.55 },
  ball: { bounceHeightPx: 90, bounceSeconds: 0.5, radiusPx: 14 },
  arcs: {
    // per-ring composition, lerped over depth t = ring/40
    gapSpanDeg: [70, 42], crashShare: [0.10, 0.34], minSafeSpanDeg: 55,
  },
  fever: { ringsPerStreak: 3, smashLimit: 1 },
  milestonesEveryRings: 10, yearsStart: 40,   // "40 years to retirement" at top, minus 10 per label
  scoring: { ring: 20, smash: 100, finishBonus: 800 },
};
```

- [ ] **Step 2: Implement the canvas component** — same conventions as the two sibling games (refs + kit fixed-step loop + full teardown). Specifics:
  - Ring generation: for each ring build arcs summing 360°: one gap (span lerped by depth), crash arcs (share lerped by depth, split into 1–3 arcs), rest safe; guarantee `minSafeSpanDeg` contiguous safe landing and that the gap never sits fully under a crash arc of the ring below (fall path exists — verify in generator).
  - Ball: fixed screen x-center; vertical bounce is a deterministic parabola (height/period from GAME_CONFIG); at contact instant, sample tower angle → segment under ball: gap → enter fall (accelerate with kit gravity, cap at terminal), safe → bounce (squash + ring pulse + tick audio), crash → fever ? smash (burst, +100, consume fever) : lose splat.
  - Fall-through counting: consecutive rings passed without a bounce; ≥3 → fever (flame trail, next crash arc smashed); fever ends after one smash or a normal bounce.
  - Rotation: pointer drag maps dx → tower angle (`degPerPx`), inertia-free (direct control), works while ball bounces or falls.
  - Pseudo-3D: each visible ring drawn as two ellipse-arc passes (back half behind ball, front half in front), platform thickness via darker front-face band; tower core cylinder gradient; depth fog darkens with ring index; camera follows ball's ring with damped scroll.
  - Milestone labels every 10 rings ("30 years to retirement", …, "Retirement vault" at 40) as banner popups + `audio.powerUp`.
  - endRun beats, HUD (score lerp counter, timer, ring progress), stats `{score, rings, smashes, streak}` — mirror the sibling pattern, bursts clamped on-screen.
  - Balance gate: headless sim or arithmetic — casual descent (≈1 ring per 1.5 bounce-cycles) reaches ring 40 well under 120 s; document corrected constants in data.js if the spec numbers fail.
- [ ] **Step 3: Screens polish** — Home hero with spiral-tower motif; HowToPlay 3-beat animated SVG (drag-rotate → fall through gap → dodge red); Results with score + rings + smashes + best streak chips, Retry / Home / **Book a Slot** primary.
- [ ] **Step 4: Gates** — `pnpm build` exit 0; emoji grep clean; balance numbers in report.
- [ ] **Step 5: README + OKF docs** — concept, hook, controls, scoring, port 5048, build commands; OKF index frontmatter + log entry.
- [ ] **Step 6: Commit** — `git add spiral-sprint okf-brain/spiral-sprint && git commit -m "Implement Spiral Sprint helix-descent gameplay"`.

---

### Task 4: Register both games + tracker + push-ready verification

**Files:**
- Modify: `README.md` (rows 5044/5048), `scripts/games-manifest.json` (entries per spec briefs; portfolio-fit `feedback: "Ok"`), `scripts/sync-game-kit.mjs` (GAMES + portfolio-fit path note not needed — it has src/), `scripts/build-status.json` (both games "Built - review clean"), `scripts/build_tracker.py` (repo-scope catalog note + portfolio-fit no longer in "Removed" note), `GAMES_TRACKER.xlsx` (regenerate)

- [ ] **Step 1: sync-game-kit GAMES** — append `'portfolio-fit', 'spiral-sprint'`; `node scripts/sync-game-kit.mjs --check` → clean.
- [ ] **Step 2: README rows** — `| \`portfolio-fit/\` | Portfolio Fit | 5044 |`, `| \`spiral-sprint/\` | Spiral Sprint | 5048 |`.
- [ ] **Step 3: manifest + status + tracker script** — entries per spec; statuses; catalog-note updates (portfolio-fit moves from "Removed from repo" note into approved scope).
- [ ] **Step 4: Regenerate xlsx** — `python scripts/build_tracker.py --status-file scripts/build-status.json` (requires Excel closed).
- [ ] **Step 5: §8 verification both games** — builds exit 0; emoji + attribution greps; lead flow diff vs guardian-shelter (identity edits only).
- [ ] **Step 6: Commit** — `git add README.md scripts GAMES_TRACKER.xlsx && git commit -m "Register portfolio-fit and spiral-sprint repo-wide"`.
