# Ring-Fence — build log

## 2026-07-30 — initial build

Built `ring-fence/` (dev port 5077), Qix/JezzBall-style territory capture,
cloned from the `guardian-shelter/` gold standard. Vite 5 + React 18.3.1,
isolated app, pnpm only, zero binary assets.

**Scaffold.** `index.html`, `package.json`, `vite.config.js` (rollup output
name `RingFence`, port 5077, LMS defines kept), `main.jsx`, `index.css`,
`LeadCaptureModal.jsx`, `SlotBookingModal.jsx`, `services/playCount.js`,
`utils/crypto.js`, `utils/shortener.js` copied from guardian-shelter with
identity strings only changed. `ThankYouScreen.jsx` uses the goal-juggler
gradient-wash variant (no PNG backdrop). `src/kit/` copied byte-identical from
`shared/game-kit/` (verified with `cmp` against the canonical copies; sync
script NOT run).

**CRM identity.** `LEAD_NO_KEY = 'ringFenceLeadNo'`, default
`summaryDtls: 'Ring-Fence Lead'`, modal posts `'Ring-Fence - Post Game Lead'`,
slot remarks `'Ring-Fence Slot Booking'` / `'Slot Booking via Ring-Fence'`.
`grep -r "Guardian Shelter" src/` is ZERO (including the index.css comment
header the scaffold carries).

**Architecture.** All rules live in the pure module `src/rules.js` (no DOM, no
imports; config is a parameter, presentation is an optional callback bag):
grid + lane movement, cut/seal with component labelling + flood-fill
(O(cells), preallocated buffers, BFS wave-order for the presentation), orb
reflection (axis-separated, fully deterministic), the anti-stall fuse, the
third-orb summon with warning, camping speed ramp, near-miss detection,
scoring, win/lose, and the pause/re-acquire state. `RingFenceGame.jsx` is
presentation only. `gate.mjs` at the game root drives the shipped modules on
the kit's fixed 1/120 s step.

**Anti-pause-scum (mandatory fix).** The kit auto-pauses on visibilitychange;
resume runs a frozen 3-2-1 (1.8 s, >= the 1.2 s minimum) with input dead and
the session clock held, then a 0.25 s live input lock, implemented in
`rules.js` so the gate can drive it. The kit loop runs UNTIMED here — the
world clock is the session clock — so the big-cut slow-mo (220 ms at 0.3x) and
the freeze hold sim and clock as one; orb velocities are stored, never
extrapolated.

### Design deviations from the brief (all minor, reasons recorded)

1. **Win-time/life bonuses are awarded on a win only** (+20/s remaining,
   +250/shield). On a timer loss "seconds remaining" is zero by definition; on
   a lives loss paying a time bonus would reward dying early. The per-cell,
   multiplier and near-miss components pay on every run as briefed.
2. **The gate's strip bot cuts full-span straight strips advancing four
   fronts** (top/bottom/left/right) rather than full-height vertical walls
   only: full-height mid-field walls have ~2.3 s of trail exposure and
   simulation showed safe windows are genuinely rare (the honest strategy the
   game teaches is the shallower bite). "Strip-cutting" is preserved — every
   cut is one straight strip sealed against a front.
3. **A pending (warning-phase) third orb marks its component hazardous during
   a seal**, so the warned ground is never claimed out from under the warning
   ring — the spawn telegraph can always be honoured.

### Bugs found and fixed during the gate work

- **Forecast bit-exactness:** the bot plans by running orb clones through the
  shipped `integrateOrb`. Reflection timing is chaotically sensitive, so the
  forecast must replicate `stepWorld`'s clock accumulation float-for-float
  (`orbSpeedFor` exported for exactly this). A one-step speed-phase offset was
  enough to flip a reflection and kill the bot mid-cut.
- **Bot phase bug:** a cut starting behind an advanced front walks a claimed
  prefix in safe mode; the bot misread that as "cut finished" and re-planned
  while the guardian marched into open field. Fixed with a `cutStarted` flag;
  travel was also moved to BFS pathfinding over claimed cells and fronts are
  re-derived from the grid each re-plan, so the bot's model can never drift.

### Verification

- `pnpm install` — clean (pnpm 10.29.2).
- `pnpm build` (mode uat) — green, 524 modules, `index-DPvynY90.js` 423.65 kB
  (141.58 kB gzip), `index-bneSBdfR.css` 33.60 kB, built in ~2.5 s. No dev
  server left running.
- `node gate.mjs` — **GATE: PASS**, deterministic across repeated runs:
  - (a) strip bot: 6/6 seeds WIN (needed >=5), 70.9-75.7% claimed in
    16.5-38.7 s, 3/3 shields on every seed, scores 7,363-9,055.
  - (b) idle bot and boundary-camper: 0 wins, 0.0% claimed, end cause `time`.
  - (c) 106 seals across 20 runs (6 strip + 6 idle/camper + 8 chaos): no orb
    ever inside claimed ground, claimed % monotonic, no trail survives a seal.
- Emoji scan of `src/`: only "→" in two comments and the "✓" checkbox tick in
  the lead form's HTML text (standard-permitted UI copy); all game objects are
  programmatic canvas / Path2D / inline SVG.
- Kit files byte-identical to `shared/game-kit/`; playCount/crypto/shortener
  byte-identical to guardian-shelter.
- Lead capture / slot booking / playCount wired per GAME_STANDARD §2
  (lead modal auto-opens on first results without a stored lead;
  `startGame()` calls `incrementPlayCount()` once; `gameKey` remount restart).

## 2026-07-30 - orchestrator re-verification after session-limit interruption

Re-ran full gate: pnpm build zero errors (423.65 kB JS); node gate.mjs GATE: PASS (strip bot >=70% on 6/6 seeds, idle+camper never win, 106 seals with zero orb-containment errors, monotonic claim). Kit hashes 7/7 identical. LEAD_NO_KEY ringFenceLeadNo, playCount wired.


---

## 2026-07-31 — lead form trimmed, how-to-play rebuilt as animation, asset sheet

Three scoped changes. No gameplay touched: `data.js`, `rules.js` and
`RingFenceGame.jsx` are byte-identical, so the grid, the orb speeds and ramp,
the seal resolution, the fuse and the scoring are all unchanged.

**G1 — email field removed.** `src/LeadCaptureModal.jsx` lost `EMAIL_RE`, the
`email` state, the "Email Field" block, the `errs.email` branch, both
`lastSubmittedEmail` sessionStorage calls, and `email` from the `submitToLMS`
call and both `onSubmitted` payloads. `api.js` untouched — it already sends
`email_id: email || ''`. Name + Mobile + T&C unchanged. Grep for `email` over
`ring-fence/src` is now empty.

**G2 — `HowToPlayScreen` is now one animated demo.** Deleted: the three numbered
instruction paragraphs (including the one that quoted `GAME_CONFIG.winPct` /
`sessionSeconds`) and the small 180 px demo strip. In their place `DemoField()`
renders a 216×240 miniature of the real field and runs one 6 s loop of an actual
claim: the guardian sits on the cyan safety wall, a finger presses and *drags*
it off into open ground, the orange dashed trail grows up → right → down, the
guardian re-touches the wall, and the sealed pocket floods blue left-to-right —
a directional wipe, matching the shipped 900 px/s colour wave rather than a fade
— after which the cut itself redraws as wall. Two green virus orbs bounce on
linear timing (so the reflections read as deterministic, which they are) and
both stay in ground that is still open, so the pocket that claims genuinely
contains no hazard. Orb sprite, wall blue, trail orange and guardian shield are
the shipped ones. All tracks share the 6 s duration; all are disabled under
`prefers-reduced-motion` (the old demo had none).
Remaining text: the "How to Play" heading, three icon-led cues (DRAG TO CUT /
SEAL TO CLAIM / AVOID THE ORBS) and the Play button. Nothing else. Card 340 px
wide; stack measures ~440 px, so 360×640 fits with no scroll (`overflow: hidden`,
was `overflowY: auto`).

**G3 — `asset-from-here.md`,** 13 Nano Banana prompts on the motif *surveyor's
plot on a backlit drafting table*: every asset is hard-line draughting ink on
vellum lit from beneath — measured line weights, 45° ownership hatching,
dimension ticks, registration crosses, dashed provisional construction lines —
always flat-on plan view, north up, with an explicit ban in the sheet on
perspective, volume, bevel and 3D. Covers the plot sheet, the guardian marker,
tileable wall and cut segments, the tileable claimed hatch, the risk orb, the
third-orb telegraph ring, the fuse spark, the shield pips, the claim dial, the
big-cut stamp and both result-screen pieces.

**Verification**

| Gate | Result |
| --- | --- |
| `pnpm install` | pass |
| `pnpm build` | pass — `✓ built in 3.72s`, 426.77 kB / 142.06 kB gzip |
| `node gate.mjs` | **PASS** — strip bot 6/6 seeds ≥70% in time, idle bot 0/3, camper bot 0/3, seal correctness over 106 seals across 20 runs |
