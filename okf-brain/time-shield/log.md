# Time Shield — log

## 2026-07-30 — build completed (mid-build handoff)

Original builder agent died on a session limit after finishing all src (rules.js,
TimeShieldGame.jsx, App.jsx, Screens.jsx, data.js, gate.mjs, scaffold copies, kit).
Orchestrator completed the remainder: install, verification, README, OKF docs.

Verification:
- `pnpm build` (uat): zero errors — 423.12 kB JS / 33.60 kB CSS.
- `node gate.mjs`: GATE: PASS — (a) competent bot clears all 5 zones within 105 s on
  8/8 seeds; (b) freeze camper always loses (fog@9.7s example); (c) jitter bot mean
  timeScale 0.061 vs 0.06 floor (never wins), honest-movement control 0.465.
- Kit copies hash-identical to shared/game-kit (7/7).
- Emoji scan clean; `timeShieldLeadNo` / 'Time Shield Lead' wiring; playCount once in
  startGame; no stale Guardian Shelter attribution strings.

## [2026-07-31] Revamp: email field removed, animated how-to-play, asset sheet

**G1 — email field removed.** `src/LeadCaptureModal.jsx`: deleted `EMAIL_RE`, the
`email` `useState`, the whole "Email Field" `sl-lead-field` block, the
`errs.email` validation branch, and both `sessionStorage` touches of
`lastSubmittedEmail`. Dropped `email` from the `submitToLMS({...})` call and from
both `onSubmitted({...})` payloads. `api.js` untouched — `submitToLMS` already
sends `email_id: email || ''`, so the LMS payload shape is unchanged. Name +
Mobile + T&C unchanged. Grep for `email` outside `src/kit/` and `src/api.js`
returns zero hits.

**G2 — `HowToPlayScreen` rebuilt as animation-first.** `src/Screens.jsx`:
- Deleted all three numbered instruction paragraphs.
- The demo was rewritten around the one thing the player must understand — the
  SUPERHOT rule. Keyframes lifted out of the JSX into a module-level `TUT_CSS`
  block on a single 5.6 s timeline. New `tsTutTrail` keyframe makes each bullet's
  trail stretch to 48 px while the hand is dragging and collapse to 5 px the
  instant it lifts, and a new `tsTutFrost` wash desaturates the whole plate while
  the world is stopped, so "move = time runs / stop = time freezes" is stated
  visually rather than in prose. The hand is now a filled white `DragHand` glyph
  (was a thin yellow stroke outline) so it stays legible over the bullet lattice.
  Two drags carry the guardian from the floor through the mint zone gate, which
  flashes on arrival. Demo box grown from 180 px to 208 px.
- Remaining text: the "How to Play" heading, three icon-led labels (`DRAG TO
  MOVE`, `STOP FREEZES TIME`, `CLIMB FIVE GATES`), and the Play button.
- Container switched from `overflowY: auto` to `overflow: hidden`; measured
  stack is ~410 px so it fits 360×640 without scrolling. Added a
  `prefers-reduced-motion` kill switch, which this screen previously lacked.

**G3 — `time-shield/asset-from-here.md`.** 13 Nano Banana prompts on a
"chrono-lab under a stopped clock" motif — holographic glassmorphism, hexagon and
tick-arc geometry, instrument-precise edges, and hard-edged *frozen* streak
trails explicitly instead of motion blur. Covers the shaft background, intact and
cracked guardian, bullet, laser fan, sweep wall, zone gate, fog wall, flow meter,
two HUD pips and both result-screen illustrations.

**Not changed:** gameplay, balance, `rules.js`, the timeScale formula, the
jitter/displacement anti-exploit, the pause re-acquire countdown, HUD layout,
`ResultsScreen`, `HomeScreen`, `data.js`, `api.js`, `src/kit/`, `gate.mjs`.

**Build:** `pnpm install && pnpm build` — exit 0, `✓ built in 2.60s`
(`dist/assets/index-CpaeAgJF.js 424.45 kB │ gzip: 141.41 kB`).

**Fairness gate re-run after the change:** `node gate.mjs` — `GATE: PASS`.
Competent bot 8/8 wins, freeze camper loses to fog at 9.7 s on every seed, jitter
bot mean timeScale 0.061 vs control 0.465. Unchanged from before this work, as
expected — nothing outside `Screens.jsx` and `LeadCaptureModal.jsx` was touched.
