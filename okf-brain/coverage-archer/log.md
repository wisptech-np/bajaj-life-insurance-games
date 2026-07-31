---
type: log
title: Guardian Archer Change Log
description: Chronological history of changes for Guardian Archer (directory coverage-archer).
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/coverage-archer/log.md
timestamp: 2026-07-09T12:00:00+05:30
---

# Guardian Archer Change Log

## [2026-07-31] Full revamp — mechanics feel, new antagonists, gold-standard screens

- **Replaced the green virus targets** (the motif was reused across several games and read
  generic) with four distinct financial antagonists, each with its own silhouette, palette,
  idle motion and death animation — Illness (crimson hexagonal cell, throb, shatter),
  Accident (amber hazard triangle, tumble, burst), Debt (violet shackled ingot, sway, drop),
  Job Loss (slate split briefcase, flicker, dissolve). Defined in `data.ts#RISKS`, drawn
  procedurally in `PreloadScene` (`drawHexCell` / `drawHazardShard` / `drawChainWeight` /
  `drawBrokenCase`), animated in `MainScene#moveTargets` / `playDeath`. No emoji (G4).
- **Aiming rebuilt for legibility and thumbs**: pull vector, power ring with a white tick at
  the release threshold, a power bar pinned to the top of the field that a thumb cannot
  cover, a live percentage readout, colour ramp green → amber → orange, and an explicit
  greyed-out `PULL BACK` state below `MIN_PULL` where releasing cancels the shot for free.
- **Flight**: one arrow in the air at a time; rotation to velocity vector; fading cyan trail
  drawn from a pre-allocated ring buffer on a single Graphics (no per-frame allocation);
  **swept collision** across each frame's path so fast arrows can no longer tunnel small
  targets; wind made visible via cyan streaks scrolling across the sky at wind speed.
- **Impact**: hit-stop (70 ms / 130 ms critical) implemented by gating an internal sim clock
  and pausing the physics world; 14–24 particle bursts; per-risk death animations; screen
  shake; floating `+N` at the hit point; surviving targets stagger away from the shockwave.
  Criticals additionally get an expanding gold shockwave ring, a camera flash and a
  punched-in `CRITICAL x2 +N` label.
- **Misses are now informative**: the arrow sticks where it landed and fades over 1.6 s, a
  dust burst marks the spot, and when wind was blowing the HUD wind chip pulses with a
  `WIND →` callout naming direction and level.
- **Per-wave movement patterns** replace generic bobbing: wave 1 pendulum, wave 2 orbit,
  wave 3 dart-and-hold; plus a 25% global speed-up once the clock passes 60 s remaining.
  Still inside the 2-minute cap.
- **Fixed a latent DPR bug**: the canvas backing store was `480*DPR x 640*DPR` but the
  camera was never zoomed and sprites were never scaled by `1/DPR`, so on any retina device
  (DPR 2 — i.e. most phones) the whole game rendered in the upper-left quadrant.
  `MainScene.create` now sets `camera.setZoom(DPR)` + `centerOn`, all sprites are drawn at
  `1/DPR`, text uses `setResolution(DPR)`, and input reads `pointer.worldX/worldY`.
- **All tunables consolidated** into `data.ts` (`GAME_CONFIG` + `RISKS`): session, ballistics,
  aim assist, wind, every juice timing, scoring, target geometry, per-wave
  pattern/speed/amplitude/wind, late-session speed-up, canvas layout.
- **G1 — email removed** from `components/LeadCaptureModal.tsx` (regex, state, field,
  validation branch, `lastSubmittedEmail` read/write, `submitToLMS` arg, `onSubmitted`
  payload) and from `LeadDetails` in `types.ts`. `services/api.ts` untouched — it still
  sends `email_id: email || ''`, so the LMS payload shape is identical.
- **G2 — HowToPlayPopup rebuilt as animation only**: one looping SMIL demo (finger pulls
  back, power ring fills, arc previews, arrow flies the curve rotating to its heading, target
  shatters with a `x2` pop) plus exactly three icon-led labels — `Pull back`,
  `Mind the wind`, `Hit the core`. All instruction paragraphs deleted; Back is icon-only.
- **Screens brought to the `guardian-shelter` bar**: added `framer-motion` (with
  `AnimatePresence` in `App.tsx`), glassmorphism `.glass-card`
  (`rgba(255,255,255,0.05)` + `blur(12px)`), deep-blue gradient backgrounds, 12px-radius
  gradient buttons (`.btn-primary` / `.btn-secondary` / `.btn-accent` / `.btn-ghost`) with
  0.96 press scale and glow in `index.html`. `ResultsScreen` rewritten to the canonical
  structure: count-up score, SVG ring (r=75), confetti on a win, Share Score primary, glass
  action card with Call Specialist + Book Consultation, ghost *Play again*, tiny disclaimer.
- **G3 — `coverage-archer/asset-from-here.md`** written: 14 Nano Banana prompts (background,
  archer, bow, arrow, each of the four risk types, shockwave, shards, wind indicator, HUD
  icon set, two result crests), in a deliberately divergent flat cel-shaded night-lit style
  rather than the catalog's default stylized 3D.
- **Docs**: `coverage-archer/README.md` rewritten to match what shipped.
- **Verification**: `pnpm install` OK, `npx tsc --noEmit` clean, `pnpm build`
  (vite --mode uat) exit 0 — `✓ built in 12.64s`, `dist/index.js 1,966.05 kB │ gzip: 497.62 kB`.

## [2026-07-09] Revamp to single-player "Guardian Archer" (stakeholder feedback)
- **Single-player conversion (explicit feedback)**: removed every threat that acts against
  the player (advancing viruses damaging a family shield, falling hazard orbs). The game is
  now pure target shooting — green virus creatures at varied sizes/distances that bob or
  drift and **never fire back**; only the player shoots.
- **New session shape**: 12 arrows, 120-second hard cap, 3 waves (3 large near / 3 medium
  mid / 4 small far). Win = clear all waves (+5 pts/second time bonus); lose = out of
  arrows or out of time. Difficulty ramps via smaller drifting targets and stronger wind.
- **Aiming**: drag-back slingshot (angle + power) with dotted trajectory hint for the
  first 3 shots only, then pull-line + power ring. Gravity (300) + per-shot random wind
  with an SVG direction/strength HUD indicator.
- **Scoring**: L/M/S = 100/150/250; direct core hit = CRITICAL x2 (pulsing nucleus drawn
  in the texture); +25 streak bonus per consecutive hit (cap +100); floating score text,
  particle bursts, screen shake, wave banners, win fanfare.
- **Rebranding**: title/branding renamed to **Guardian Archer** in index.html, intro
  screen, share copy, README, and OKF docs.
- **Standard flow**: rebuilt App to home > howtoplay > game > results (+auto lead modal
  when no lead) > Book a Slot > SlotBookingModal > ThankYouScreen (confetti + booked slot
  details) matching life-goals-bubble-shooter; `incrementPlayCount()` on every game start.
- **Shared modules aligned to gold standard**: services/api.ts rewritten to the bubble
  shooter api.js contract (build-time `__LMS_BASE_URL__` defines, `extractLeadNo`,
  `LEAD_NO_KEY = 'coverageArcherLeadNo'`, default summary "Guardian Archer Lead");
  LeadCaptureModal / SlotBookingModal / ThankYouScreen ported with identical logic,
  restyled to the game theme. playCount/crypto/shortener kept verbatim.
- **No emoji sprites**: removed all emoji from HUD, intro, tutorial and results
  (bow/arrow/wind/sound/virus visuals are inline SVG or procedural canvas).
- **Audio**: Web Audio synth SFX per standard (UI tap 1000 Hz, ascending-hit,
  critical chord, miss thud, wave rise, 5-note win fanfare) with working mute toggle.
- **Verification**: `pnpm install` OK; `pnpm build` (vite --mode uat) OK, zero errors;
  `tsc --noEmit` clean; emoji-codepoint grep over src returns none.

## [2026-07-08] Visual Polish & Build Validation
- **Canvas Emoji Fix**: Replaced the raw emoji star in the level completion overlay in
  `MainScene.ts` with a programmatically drawn 5-pointed gold star.
- **Lead Capture & Verification**: Verified Name, Mobile (10-digit), and optional Email
  collection with the T&C consent check and active LMS connection.
- **Build Verification**: Ran `pnpm build` successfully with output in `dist/`.

## [2026-07-08] OKF Initialization
- Created `index.md` and `log.md` under the centralized `okf-brain/coverage-archer/` directory.
