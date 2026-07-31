---
type: log
title: Life Soar Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/life-soar/log.md
timestamp: 2026-07-09T22:30:13+05:30
---

# Life Soar Change Log

## [2026-07-09] Initial Implementation
- Successfully implemented core game mechanics and UI screens.
- Verified successful Vite build compilation.

## [2026-07-31] Mobile mechanics revamp + global rules G1/G2/G3

**Root cause fixed:** the flight loop computed `delta` but never used it — every
physics constant was applied per *frame*. On a 120/144 Hz phone the glider ran
2–2.4× faster than on a 60 Hz one, which is why it felt uncontrollably twitchy.
All motion is now delta-time integrated in px/s and px/s², with `dt` clamped to
50 ms so a backgrounded tab cannot teleport the glider through a wall. Verified
invariant: simulated run length varies 0.033 s across 24/30/60/90/120/144 fps.

- `src/data.js` rewritten as the single tuning surface (`WORLD`, `FLIGHT`, `RAMP`,
  `LAYOUT`, `MILESTONES`, `SCORING`). The old bubble-shooter `COLORS`/`GAME_CONFIG`
  data was dead in this game and was deleted along with its unused import in `App.jsx`.
- Speed cut to ~65% of the previous values: cruise 360→235 px/s, min 288→195 px/s,
  max 660→340 px/s. Gravity 468→240, dive 1008→520, lift gain 16.8→5.6 px/s² per px/s.
- Difficulty ramp added: forward speed ×1.0 → ×1.45 over the first 70 s, so the slow
  opening still finishes demanding. Obstacle gap 1.06 s flat → 1.96 s opening, 1.35 s late.
- Input forgiveness: 130 ms input buffer (a flick-tap still dives), 150 ms coyote time
  on the wall-contact fail edge with a scrape-and-recover grind plus a red danger
  vignette, and a real triangle hit test on spikes replacing a flat radius kill-box.
- Input surface: single pointer-event path with pointer capture replacing the split
  mouse/touch handlers, on a full-bleed overlay so the whole portrait width is the
  button. Added a 56 px full-width press band with a touch-down colour/lift change.
- Per-frame allocation removed from the render hot loop (sky gradient now cached).
- Simulated pacing at 60 fps: 62 s (aggressive) / 80 s (typical) / 95 s (passive),
  all inside the 60–120 s session cap; the 105 s timer stays the fail condition.
- **G1** — email field, regex, state, validation, `sessionStorage` read/write and the
  `submitToLMS`/`onSubmitted` keys removed from `LeadCaptureModal.jsx`. `api.js` untouched.
- **G2** — `HowToPlayScreen` rebuilt as an animation-only loop: scrolling canyon, glider
  diving and soaring, finger glyph pressing a full-width input band with a touch ripple.
  All four instruction paragraphs deleted; text is now the heading, three icon-led
  labels (Hold · Dive / Release · Soar / Avoid Spikes) and the Play button.
- **G3** — `life-soar/asset-from-here.md` added: 12 prompts in a flat vector
  aviation-chart style unique to this game.

**Build:** `pnpm install && pnpm build` → `✓ built in 2.55s`, exit 0.
