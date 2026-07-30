# Risk Radar

Darkness + sonar-pulse navigation (Dark Echo-style) for Bajaj Life Insurance.

**Financial hook:** *You can't see risks coming — your cover can.* The maze is
pitch black. Your radar pulse is the only thing that shows the walls, the spike
pools and the lurkers between your family and shelter — but every pulse is
heard, and noise draws the danger to where you fired from.

## Concept

Guide a family of three (you + 2 followers who trail your exact footsteps)
through a hand-authored ~2,720px maze in 100 seconds with 3 hearts. Getting
caught by a lurker or stepping in a spike pool costs a heart and respawns the
party at the last of 3 gate checkpoints. **Win:** reach the gold shelter with
at least 1 heart. **Lose:** 0 hearts, or the clock runs out.

## Controls

- **Tap** — fire a radar pulse from the family (460 px/s wavefront, 400px max
  radius, 18px band). Wall chunks light only while the wavefront crosses them:
  alpha 1.0, hold 1.0s, fade 0.7s. Cooldown 1.6s, shown as a thumb-ring arc
  around the family.
- **Hold + drag** — walk toward your finger at 105 px/s. The family follows at
  12px spacing along your breadcrumb trail. Footsteps ripple a faint micro-ring
  every 0.32s.

## The noise economy

A lurker within 320px of a pulse hears it and hunts the pulse **origin** (not
you) at 95 px/s for 1.6s, then sniffs the stale spot — that distraction is your
pass window. Fairness invariant (enforced in `src/rules.js`, proven by
`gate.mjs`): **nothing hits you unrevealed** — every lurker self-telegraphs a
gray ring every 3.2s, force-rings inside 250px, cruises at ≤0.9× your speed,
and every lunge (180 px/s, 0.4s) is preceded by a 0.5s shriek + screen-edge
flash. Hidden geometry is *never* rendered at any alpha, so screen-brightness
cheating shows only more black. Pausing blacks out everything revealed
immediately and resumes behind a 3-2-1 re-acquire count (clock held).

## Scoring

- **+250** per heart remaining (win only)
- **+10** per second remaining (win only)
- **+60** per hidden orb (5 in the maze, visible only during a pulse sweep)
- **+300** quiet bonus for finishing with ≤ 18 pulses

## Build / run

```bash
pnpm install
pnpm dev          # http://localhost:5078
pnpm build        # uat (default) — must pass with zero errors
pnpm build:preprod
pnpm build:prod
node gate.mjs     # headless verification gate — must print GATE: PASS
```

Port **5078**. Rollup output name `RiskRadar`.

## Verification gate (`node gate.mjs`)

Runs the shipped `src/data.js` + `src/rules.js` headless and proves:
(a) a scripted bot completes the maze on the session seed within 100s with
hearts to spare, deterministically; (b) across 10,000 random walks every heart
loss was telegraphed within the prior 3.2s (self-ring/shriek; spike losses had
the ember shimmer ≥0.5s) and the in-rules fairness backstop never fires;
(c) a pulse-spam bot scores worse than a quiet bot and attracts far more
lurker aggro; (d) the reveal timing — chunks light exactly on wavefront
crossing, hold 1.0s, fade 0.7s, nothing lit before a pulse and nothing beyond
400px.

## Structure

- `src/rules.js` — the whole simulation as a pure module (no DOM/React); the
  gate runs exactly this code.
- `src/data.js` — every tunable (`GAME_CONFIG`) and the authored maze.
- `src/RiskRadarGame.jsx` — presentation only: canvas rendering, Web Audio
  synth (pulse whoosh, proximity heartbeat 80→140 BPM, shriek, gate chime),
  input, HUD.
- `src/App.jsx` / `src/Screens.jsx` — screen flow per
  `okf-brain/GAME_STANDARD.md` §2 with lead capture, slot booking, play count.
- `src/kit/` — shared game-kit (byte-identical to `shared/game-kit/`).
