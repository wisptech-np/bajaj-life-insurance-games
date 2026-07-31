# Dual Cover — build log

## 2026-07-29 — initial build

Built `dual-cover/` (dev port 5079), Duet-style twin-orbit dodger, cloned from
the `guardian-shelter/` gold-standard scaffold. Vite 5 + React 18.3.1,
isolated app, pnpm only.

**Scaffold.** `package.json` (name `dual-cover`), `vite.config.js` (LMS
defines kept, rollup output name `DualCover`, port 5079), `index.html`,
`main.jsx`, `index.css`, `LeadCaptureModal.jsx`, `SlotBookingModal.jsx`,
`services/playCount.js`, `utils/crypto.js`, `utils/shortener.js` copied from
guardian-shelter with identity strings only changed. `ThankYouScreen.jsx`
ships the gradient-wash variant (goal-juggler precedent) — zero binary
assets. `src/kit/` copied byte-identical from `shared/game-kit/` (verified
with `cmp` on all 7 files; sync script NOT run).

**CRM identity.** `LEAD_NO_KEY = 'dualCoverLeadNo'`, default
`summaryDtls: 'Dual Cover Lead'`, modal posts `'Dual Cover - Post Game
Lead'`, slot remarks `'Dual Cover Slot Booking'` / `'Slot Booking via Dual
Cover'`. `grep -r "Guardian Shelter" src/` is ZERO (including the two
`index.css` comment headers the scaffold carries).

**Architecture.** All rules live in the pure module `src/rules.js` (PRNG,
descent-ramp closed forms, obstacle generator with the reachability
constraint, hold-to-rotate kinematics, circle/AABB and circle/OBB collision,
scoring, phases, pause/re-acquire/rewind); config is a parameter, never an
import. `gate.mjs` imports the shipped `rules.js` + `data.js` and drives them
on the kit loop's fixed 1/120 s step, so the proof measures the code that
ships. The component contains no rules.

### Design decisions worth recording

1. **Spawn cadence anchored at the ring centre.** The spec fixes the interval
   ramp (1.7→1.15 s) AND "~34 obstacles in 90 s"; a naive spawn-to-spawn
   reading yields ~63 obstacles. The consistent reading — interval measured
   from the previous obstacle's trailing edge crossing the ring centre to the
   next spawn — yields 29–31 (the staggered gates' 406 px extent eats a
   couple), matches Duet's one-pattern-at-a-time pacing, keeps the lethal
   band singly occupied, and is what makes the per-pair reachability budget
   provable. Documented as the shipped interpretation.
2. **All bars stop short of the ring centre.** A wall crossing the centre has
   NO static safe orientation for a diametric pair (one orb is always on each
   side), so every safe window in the vocabulary is a hold: wall stubs
   140 px (vertical ±20°), centre bar half-width 97 px (horizontal ±23° —
   perfect play leaves exactly 10 px, the near-miss threshold, so sailing
   close pays), squeeze gap at the 45° orb radius (±11°).
3. **Staggered gates force vertical through a double beat** rather than a
   quarter-turn between the two walls: with stub walls, opposite-side gates
   share the vertical window, so the quarter-turn rhythm comes from the
   hand-offs into and out of the pattern (the generator caps same-orientation
   runs at 2, so a gate is always bracketed by horizontal demands). Honest
   deviation from the brief's "quarter-turn rhythm" gloss, chosen because a
   centre-crossing wall would need a provably-timed dynamic thread — an
   unverifiable fairness risk.
4. **The spinner demands horizontal with a rotating corridor.** The bar's 45°
   rotation (previewed with an arrow + spin ~0.5 s before the band) moves its
   swept x-extent, so the hold tolerance breathes as it falls; tracking the
   corridor buys margin but a clean horizontal hold is provably safe
   (~20 px). The rotation is real (circle/OBB collision), the demanded
   orientation is conservative — that is what keeps the reachability proof a
   proof.
5. **The squeeze forces the diagonal via an off-centre gap**, not via bar
   pairing: a two-segment bar whose only gap sits at the 45° orb radius
   (either diagonal works — the pair is symmetric), doubled 56 px apart so
   the diagonal is HELD ~0.6–0.7 s in the band, per the brief.
6. **Pause-scum closed per repo memory**: resume = 1.2 s frozen 3-2-1 (clock
   held, input dead) + obstacle field rewound 250 ms of travel
   (`scrollBack += speedAt(t)·0.25`). Passed obstacles keep their flag, so a
   rewind can never re-hit or re-score something already cleared.
7. **Kit input not used for gameplay**: `kit/input.js` is single-pointer and
   Dual Cover needs both screen halves independently (both held = zero net
   torque). Raw pointer events, first two pointers tracked, the rest
   ignored. Kit files untouched and byte-identical.

### Verification

- `pnpm install` — clean (pnpm 10.29.2, 6 s).
- `pnpm build` (mode uat) — green, zero errors: 523 modules,
  `index-DuV7qxOJ.js` 415.98 kB (139.11 kB gzip), `index-bneSBdfR.css`
  33.60 kB, built in 2.04 s. No dev server left running.
- `node gate.mjs` — **GATE: PASS**, all 9 checks:
  - ramp endpoints exact (330→470 px/s, 1.7→1.15 s);
  - (a) reachability on 12 seeds: worst `need/timeToArrival` ratio 0.269,
    max required rotation 90° against the 170° cap; 29–31 obstacles per run,
    longest sequence 89.73 s ≤ 90;
  - all five obstacle types appear (wall 88 / center 106 / gate 83 /
    spinner 51 / squeeze 37 across seeds);
  - (b) optimal-rotation bot (shipped `setInput` API, bang-bang with
    decay-braking) survives every seed with 0 hits — mean score 4,369,
    tightest clearance 10.0 px (the centre bar's by-design margin);
  - (c) idle bot loses on every seed, latest 4th hit at t=27.2 s;
  - pause spot-check: resume freezes the clock and rewinds by exactly
    `speedAt(t) × 0.25` (84.4 px at the probe point).
- Kit copies byte-identical (`cmp` × 7).
- Emoji scan over `src/`, `gate.mjs`, `index.html`: only the scaffold lead
  modal's HTML checkbox tick (U+2713) — UI text, permitted; no emoji
  sprites.
- Lead capture / slot booking / `incrementPlayCount()` wired per §2:
  `startGame()` increments once; lead modal auto-opens on first results when
  `sessionStorage['dualCoverLeadNo']` is empty; Book a Slot routes through
  the lead modal when needed; ThankYou shows booked details.

### Quality bar

Programmatic canvas only: radial-gradient orbs with rim glow, per-orb glyphs
(shield / rising arrow), comet trails drawn as light arcs whose length ∝ ω,
persistent paint splats in the dead orb's colour riding the obstacle away,
near-miss gold spark + "+25 CLOSE" + orbit shimmer on 5+ streaks, rising
pass chime laddering with the combo (kit `audio.combo`, reset on hit),
phase-clear banners, 60 ms hit-stop + shake + red vignette + 14+8 particle
bursts on shield loss, floating score text, damped score counter, 0.3–0.5 s
screen transitions (framer-motion), reduced-motion respected via the kit
budget. HUD score/combo/progress written via refs (no per-frame React
renders); shields/banners/countdown via guarded state. No allocations in the
hot loop (module-level scratch for collision, flat-fill bars, origin-anchored
gradients per resize). Full teardown on unmount; `gameKey` remount restart.

### Deferred minors

1. The spinner's demanded orientation is conservative (horizontal hold) —
   tracking play is rewarded with margin, not required. See decision 4.
2. Sequence length runs 29–31 against the brief's "~34": a consequence of the
   cadence interpretation in decision 1; the ramp numbers are exact.
3. Assist (drag) mode bypasses the accel/decay envelope by design; it is an
   accessibility toggle, default off, and the gate proves the hold-input
   envelope.

---

## 2026-07-31 — Lead-form / how-to-play revamp

**G1 — email removed from lead capture.** `src/LeadCaptureModal.jsx` no longer
collects an email address. Deleted `EMAIL_RE`, the `email` `useState` (and its
`lastSubmittedEmail` sessionStorage read), the optional-email validation branch,
the whole "Email Field" `sl-lead-field` block, the `lastSubmittedEmail`
sessionStorage write, and the `email` key from both the `submitToLMS({...})` call
and the two `onSubmitted({...})` payloads. `src/api.js` is untouched: `submitToLMS`
already sends `email_id: email || ''`, so omitting the key keeps the LMS payload
shape byte-identical. Name, mobile (`^[6-9]\d{9}$`) and the T&C checkbox are
unchanged. Grep confirms no `email` / `lastSubmittedEmail` reference survives
under `src/`.

**G2 — `HowToPlayScreen` is now animation-first.** The three numbered instruction
paragraphs are deleted. The old demo — a bar that fell past an orbit which spun
for no visible reason — is replaced by `DemoOrbit`, one looping 4 s SVG that shows
the actual causal chain: the pair starts vertical, a centre bar drops toward them,
a hand glyph presses and *holds* the right half (that half tints, a ripple fires,
a gold arc arrow shows the spin direction), the ring turns 90° so both orbs sit in
the side gaps, and the bar sweeps through clean with a green pass ring. The demo's
geometry is the canvas geometry: the centre bar's half width (64 px of a 300 px
frame) is narrower than the ring radius (48 px), which is precisely why turning
horizontal is what saves you — so the picture teaches the rule rather than
asserting it. The dashed centre divider states the two-half control scheme without
a caption. Remaining text: the "How to Play" heading, three icon-led cues ("Hold to
spin", "Both must clear", "Three shields only" — all ≤ 4 words), the assist
control, and the Play button.

**Assist toggle kept, relabelled.** The direct-drag accessibility option is a
control, not an instruction, so it stays. Its sentence-long label
("Assist mode: drag to steer instead of hold-to-spin") is now a compact pill —
a drag icon plus "Assist: drag" — with the full sentence preserved on the
`aria-label` so screen-reader users lose nothing.

Card capped at 344 px with `overflow: hidden`; fits 360×640 without scrolling. The
three old `dcTut*` keyframes are replaced by eight `dcd*` keyframes in a
module-level `DEMO_CSS` constant, all covered by a `prefers-reduced-motion` kill
switch that the previous inline keyframes did not have.

**G3 — `dual-cover/asset-from-here.md` added.** 13 Nano Banana prompts committed to
a single motif: **cold-forged precision instrumentation** — a laboratory calibration
rig in CNC-milled aluminium, anodised colour anodes, frosted optical glass and
hairline engraved graduations, lit by hard product-photography studio light in a
dead-black void with no atmosphere, no environment and no ground plane.
Deliberately the inverse of any scenery-driven sheet in the repo. The sheet
restates the colour grammar as a hard constraint — obstacles are cold neutral
steel and are never tinted blue or orange, because tinting them would imply they
belong to one orb. Covers backdrop, both orbs, the orbit ring, four obstacle types
(wall stub, centre bar, spinner, squeeze), the two orb trails, the near-miss
shimmer, the shield pip in charged and spent states, the phase marker and the
result art.

**Not touched:** gameplay, balance, `rules.js`, obstacle generation, HUD layout,
`ResultsScreen`, `HomeScreen`, `data.js`, `api.js`, `src/kit/`. `gate.mjs` was not
re-run — nothing this change touches is reachable from it.

**Build:** `pnpm install` + `pnpm build` exit 0 —
`dist/assets/index-BvbnT76C.js` 418.38 kB / 139.68 kB gzip, built in 2.69 s.
