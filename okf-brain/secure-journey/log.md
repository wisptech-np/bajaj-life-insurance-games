# Secure Journey — Change Log

## 2026-07-31 — Revamp: HUD, antagonist, difficulty, end-of-run bug

### Fixed: run never ended after the boss (root cause)
`SecureJourney.jsx` win cutscene recomputed the pod's Y from `height * 0.8` on
every frame instead of accumulating it, so `newPlayerY` was permanently
`height*0.8 - 160*dt` (~3px of travel) and the vault-entry test
`newPlayerY <= targetY + 22` could never be satisfied. `onWin` was therefore
never called and the run hung after the boss died. The same block also called
`ctx.save()` + `ctx.translate()` with no matching `restore()` — a per-frame
canvas state-stack leak whose translate was then discarded by the later
`setTransform`, so the pod was never drawn during the cutscene either.

Fix:
- New `runY` ref accumulates the run-up; seeded at lock time.
- New `winTimer` ref plays an 0.85s win beat (sound, white flash, gold burst,
  health-bonus float) and then resolves.
- New `finishRun(didWin)` is the single exit point for the whole run, guarded by
  a `resolved` ref — `onWin`/`onLose` can now fire exactly once and cannot be
  skipped. Both the HP-zero path and the new timeout path route through it.
- Added a real timeout fail state: `timeRemaining <= 0 && !vaultSpawned` loses.
  Previously the timer could hit zero with the boss alive and the loop would
  simply run forever.
- Vault lock transition now tests `y >= target - 1` instead of a ±5 window, so a
  long frame that overshoots cannot skip the lock.
- Removed the leaked `ctx.save()`; the pod is now drawn at `runY` during the
  cutscene.

### Antagonist replaced
The green spiked virus blob (shared motif with several other games in the repo)
is gone. New antagonist: the **Risk Barricade** — a downward-pointing angular
chevron plate with diagonal hazard stripes, a white warning chevron and a grit
trail, in three financial tiers (late fee / loan slip / debt slab) on an
amber → crimson ramp. The boss is now the **Inflation Storm-Front**, a wide
crimson barricade wall with hazard chevrons, blinking warning lamps and
lightning forks, using box collision instead of a circle because it is a wall.
All particles, sparks and copy updated; `viruses` → `hazards`,
`virusesDestroyed` → `hazardsCleared`, `stats.viruses` → `stats.cleared`.

### HUD collapsed
Three stacked rows (two chips, a labelled HP bar, a labelled pip row and a
labelled progress bar — roughly 110px of vertical space) replaced by a single
glass strip: star+score, heart+HP, 5 power pips, clock+seconds, plus a 4px
hairline progress bar that doubles as the boss integrity bar while the
storm-front is alive. No word labels. Score deltas already float from the point
of the event on canvas; added floats for damage taken and the health bonus.

### Difficulty
`data.js` retuned: duration 90 → 78s; spawn interval 1.45→1.15 ramping to
0.62→0.46; hazard speed 0.105→0.125 ramping to 0.165→0.27; hp ramp 1.9 → 2.6;
contact damage 6/10/15 → 9/14/22; gap penalty 3 → 4; shield heal 20 → 16.
New tunables: `multiLaneChanceStart/End` (0.2 → 0.75) and
`tripleLaneFrom`/`tripleLaneChance` so waves grow from one lane to full 3-lane
walls late in the run, and `bridgeWidthStart/End` (0.80 → 0.50 of screen) so the
deck itself narrows and the safe window shrinks as you progress. Boss HP 55 →
78 and lead time 22 → 20s, which makes the boss a genuine DPS check: without
collected shields you cannot break it before the clock, so the run is losable.
Max-power bolt spread widened 0.16 → 0.24 rad so stacking shields is the answer
to multi-lane walls.

### Screens
- `ResultsScreen` aligned to the canonical `guardian-shelter` structure:
  count-up score, r=75 SVG ring, confetti on win, Share Score, glass action card
  with **Call Specialist** / OR divider / **Book Consultation**, ghost
  "Play again", disclaimer. Signature is now
  `({ stats, won, onRetry, onHome, onBookSlot })` — the `retryLabel` prop was
  dropped here and in `App.jsx`.
- `HowToPlayScreen` is animation-only (G2): a looping CSS demo of the real
  mechanic — pod drags lanes, auto-fired bolt destroys a barricade, pod drags
  onto a shield — with a finger glyph mirroring the drag. All instruction
  paragraphs deleted; remaining text is the heading, three one-word icon labels
  (Drag / Blast / Collect) and the Play button.
- `LeadCaptureModal.jsx`: email field, `EMAIL_RE`, validation branch,
  `lastSubmittedEmail` storage and the `email` key in the `submitToLMS` and
  `onSubmitted` payloads all removed (G1). `api.js` untouched — it already does
  `email_id: email || ''`.

### Assets
`secure-journey/asset-from-here.md` written — 13 Nano Banana prompts covering
background, pod, thruster, three hazard tiers, debris, shield pickup, boss,
vault, HUD glyph set, rail post and results hero art.

### Build
`pnpm install && pnpm build` → exit 0, `✓ built in 3.61s`.
