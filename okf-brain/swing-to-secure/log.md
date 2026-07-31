---
type: log
title: Swing to Secure Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/swing-to-secure/log.md
timestamp: 2026-07-28
---

# Swing to Secure Change Log

## [2026-07-28] Gameplay implementation

- Built the full rope-swing game per spec: procedural 24,000 px course (anchors
  on a widening gap ramp, coins on the ideal flight arc, risk orbs at a rising
  density, shield tokens on a 600 px pitch), two-state physics (projectile /
  rigid pendulum), grab assist with a 0.12 s input buffer, Perfect Release
  scoring, circle-circle collisions, damped horizontal camera with two
  pre-rendered parallax rock layers, five milestone banners, and the vault
  win state.
- Juice via the shared kit: pooled particles (>= 8 per collect, 18 on a hit),
  floating score text, screen shake and hit-stop on damage, squash on grab,
  spawn scale-bounce as entities enter view, cape trail on the device trail
  budget, pulsing in-range pylons, animated score counter, animated screen
  transitions. All art is programmatic canvas or inline SVG — no emoji sprites,
  no image files. Audio is the kit Web Audio synth, unlocked on first pointer
  gesture.
- HUD is DOM over the canvas; the score counter and distance readout are written
  through refs rather than React state so a 120 Hz physics tick never re-renders
  the tree.
- Screens polished: Home rope-swing SVG motif with an animated title, How to Play
  as a 3-beat CSS-animated SVG diagram (hold -> swing -> release), Results with
  score ring, distance/coins/milestone tiles, milestone chips and Book a Slot /
  Retry / Home. Residual "Guardian Shelter" copy retitled; the lead-flow files
  (api.js, SlotBookingModal.jsx) were deliberately left verbatim.
- Balance: three GAME_CONFIG readings were corrected after a headless simulation
  of the exact physics loop showed the literal readings make the vault
  unreachable — damping applied per second rather than per fixed step, a 120 px
  grab assist while descending, and an opening swing impulse. Documented in the
  game README under "Balance notes".
- Verified: `pnpm build` exit 0; `node scripts/sync-game-kit.mjs --check` reports
  the kit copy up to date; no emoji codepoints used as sprites.

## [2026-07-31] Revamp: slow-down retune, dusk-skyline redesign, spec G1–G3

### Gameplay — "too fast"

- Diagnosed before touching anything: the physics were **not** frame-coupled.
  `kit/loop.js` already runs a fixed 1/120 s step, and every term in `data.js` is
  an acceleration, a velocity, or a per-second rate applied as `pow(k, dt)`. The
  game was simply tuned hot — it inherited the kit's global gravity of
  1600 px/s², which is sized for games where the player falls a screen height in
  well under a second.
- Applied a real time-scale rather than a fudge. Gravity is now a per-game value
  in `data.js` that lerps **640 → 960** on course progress (`player.x /
  courseLen`), which doubles as the difficulty ramp. Velocities scaled by s,
  accelerations by s²: `startSpeed` 620 → 395, `knockVy` 300 → 210.
  `grabRadius` 150 → 130 so the pendulum period (2π√(L/g)) did not balloon.
- Measured over 40 generated courses with an identical scripted player: world
  scroll fell **379 px/s → 273 px/s = 72%** of the previous speed, inside the
  65–75% target. In the same sweep, mean distance covered before a fall rose
  from 947 m to 1,095 m — the retune is more forgiving, not harder.
- Second-order consequence: a 72%-speed world over the same 24,000 px course
  would need ~1.4× the session and blow the 120 s cap. The course was therefore
  shortened **in pixels** — `pxPerMeter` 12 → 9, so 2,000 m is now 18,000 px —
  leaving a full run at ~66 s of a 110 s session against ~63 s of 105 s before.
  Metres and the five named milestones are unchanged.
- Four ramps now stack: gravity, widening beacon gaps (240 → 430 px), hazard
  density (1.05 → 3.6 per 1,000 px), and beacon sway from 750 m.

### Visual identity — dusk skyline, hexagon + chevron

- Backdrop rebuilt from the rocky ridge profile to **two parallax bands of
  chevron-roofed towers** with sparse lit windows, over a night-to-sunset sky and
  a low sun. `makeSkylineLayer()` replaces `makeLayer()`/`ridgeY()`; towers sit on
  a fixed pitch and are always narrower than it, so tiles are seamless without
  the old trigonometric bookkeeping. Still pre-rendered offscreen on resize only.
- Every entity redrawn from one `hexPath()` primitive with `hexRim()` rim
  lighting: beacons (were rounded-rect pylons), premium chips (were gold discs),
  cover tokens, **crimson** risk mines (were green virus orbs — green is now
  reserved for milestones), the vault gate, and the guardian (hex torso, hex
  helmet with a lit visor slot, two-point chevron cape).
- HUD reduced to three glyph+number chips plus a 3 px progress rail. The
  mid-screen milestone banner was **deleted** along with its state and timer —
  that feedback now lands as floating text at the guardian, where the player is
  already looking. The wordy first-run hint became a pulsing tap glyph.
- Home, How to Play and Results restyled to match; the `App.jsx` frame gradient
  was brought onto the same dusk ramp. Results keeps the repo-standard structure
  (count-up score, r=75 progress ring, confetti, Share, glass action card with
  Book a Slot / Call Specialist, ghost Play again, disclaimer footer).

### Spec compliance

- **G1** — email removed from `LeadCaptureModal.jsx`: `EMAIL_RE`, the `email`
  state, the field block, the validation branch, the `lastSubmittedEmail`
  sessionStorage get/set, and `email` from both the `submitToLMS({...})` call and
  the `onSubmitted({...})` payload. `api.js` untouched — it already sends
  `email_id: email || ''`, so the LMS payload shape is identical.
- **G2** — How to Play is animation-only: a 4.2 s looping demo in which a finger
  glyph presses to grab, holds through the swing, and lifts at the top of the
  forward arc, driving the real sprites through grab → swing → release → re-grab.
  All numbered instruction paragraphs deleted; the remaining text is the heading,
  three one-word icon labels (HOLD / SWING / RELEASE) and the Play button.
- **G3** — `swing-to-secure/asset-from-here.md` written: 13 Nano Banana prompts
  covering both parallax bands, the sun, two guardian poses, idle and lit
  beacons, the tether, chip, cover token, risk mine, vault gate and HUD glyphs.

### Build

`pnpm install && pnpm build` → exit 0, `✓ built in 4.74s`.
