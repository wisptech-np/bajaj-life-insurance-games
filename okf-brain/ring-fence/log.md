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

---

## 2026-08-03 — art direction pass (review defect: "visual design is average and lacks polish")

**Defect.** The review is right and the screenshots said why. Three things were
wrong, in order of damage:

1. **The board had a hole in it.** The stage was `flex: 1` and the canvas was
   letterboxed inside it, so on a 390x844 handset ~128 px of empty dark sat
   under the field with the mute button floating in it, the HUD pills floated in
   the strip *above* the field, and the first-run hint (positioned `bottom: 64`
   of the stage, not the field) landed on top of the guardian's start position
   and wrapped into two colliding lines. Three disconnected zones, no object.
2. **The field had no material.** A near-black rectangle with a 4.5%-alpha grid
   and a flat, saturated 12 px electric-blue frame whose alpha swung 0.55 -> 0.90
   every 2.4 s. Generic arcade neon, and the only strong element on screen was
   the border. `asset-from-here.md` had already specified the opposite
   direction — a surveyor's plot on a backlit drafting table — and the shipped
   renderer ignored it entirely.
3. **No hierarchy and no goal.** Three glass pills of near-equal weight, 8 px
   labels, three identical blue shield blobs, and the win condition expressed
   only as the words "secure 70% to win". Nothing showed how close you were.

**Art direction.** Commit to the sheet the asset sheet already specifies:
**hard draughting linework on a backlit surveyor's plot** — measured graph rule
at two weights, 45 degree ownership hatch over a wash for claimed ground, a
surveyed boundary with dimension ticks instead of a neon bar, and a dashed
*provisional* construction line for the live cut. Restraint is the mechanism:
structure and spacing carry the premium read, so glow, particle counts and pulse
amplitudes all came **down**, not up.

**Play area.**
- `makeBackdrop()` rewritten: vertical sheet gradient, an uneven light-box glow
  rising from lower centre (the field now has a reading direction), a graph rule
  at every 2 cells with every 5th at double weight, four corner registration
  crosses, gentler vignette.
- `repaintTerritory()` rewritten. Claimed ground is a wash plus a tiling 45
  degree hatch (`makeHatchTile()` -> one 11 px `createPattern`, built once per
  resize) clipped `source-atop` to the claimed cells, then depth shading. The
  boundary is now three things instead of one: a muted band, a crisp 1.5 px
  `#7FC0FF` line stroked **only on the cell edges that face open ground**, and
  dimension ticks every 8 cells stepping along it. Path2D, built in the same
  neighbour loop that already ran, so the cost is unchanged and it only runs on
  seal/resize.
- Boundary breathe cut from +/-35% alpha to +/-7% (`ART.wall.breathe`).
  Structure holds; it does not throb.
- Guardian is now a seated station marker: a dark seat disc that lifts it off
  the band it rides (a blue marker on a blue wall was genuinely invisible), the
  shield, four cardinal bearing ticks that turn orange while cutting, a white
  centre point. Draw position is clamped by the seat radius so riding the outer
  frame never clips it against the canvas edge — cosmetic only, collision still
  reads the true `playerX/playerY`.
- Live cut is dashed with a travelling dash offset plus a faint continuous core,
  so it can never be misread as the solid boundary it is trying to become.
- Third-orb telegraph is now a dashed exclusion-zone marker with a gold
  countdown arc. Seal crest is two thin chasing arcs instead of one fat glowing
  ring. Wave crest particles sampled every 16th cell instead of every 8th — a
  big seal was throwing a confetti cloud.

**Layout.** `fit()` now measures the **root** (never the stage — observing what
you resize is how you get a ResizeObserver loop) and writes the stage's own
width/height as `field + one HUD band`. There is no letterbox strip left over at
any size; the HUD is real chrome above the plot instead of pills in a gap.

**Typography / hierarchy.** One hero, two peers, everything else subordinate.
Hero `%` 30 px/900 (25 px on short handsets), Score and Time 20/17 px tabular,
labels 9 px/800 at 0.2 em. Under them, a **full-width goal rail**: the fill is
`pct / winPct`, so 100% of the rail is the win line, with a gold target tick and
a gold `70%` cap. That is the piece that was missing — the goal is now visible,
not stated. Shields demoted to 13 px pips on the rail row, held = solid outline,
lost = dashed ghost (the two states `asset-from-here.md` specifies). Hero/value
sizes ship as CSS custom properties written by `fit()`, so a resize never
round-trips through React.

**Feedback states.**
- New: the board's own perimeter flashes on a big seal (blue) and on a hit
  (red). The whole game is a boundary holding or failing, so the boundary is
  what reacts.
- New: below 10 s a red inset edge glow joins the pulsing clock — the field
  itself tells you, not just the number.
- Banner restyled from a saturated candy gradient to a measured dark plate with
  a coloured left rule and the title in the accent colour.
- Camp chip demoted from a full-width orange alarm to a hairline chip.
- Re-acquire count now sits in a ringed disc.
- Hint rewritten as two short non-wrapping lines.

**Screens.** All three now sit on the same plot sheet as the field (same graph
rule at half weight), which is what makes them read as one object with the game.
Home: viewport-relative rhythm (`clamp`/`vh`) — the fixed 26 px gaps overflowed
320x568, clipping both the eyebrow and the CTA — plus a 3-cell brief
(70% / 90 s / 3 shields) filling what was dead space, and a hero plot that is
now hatched, ticked and squared instead of a rounded cartoon card. How-to-play:
its demo field gained the hatch, the dimension ticks and the graph rule, and its
trail is dashed, so it teaches what the real field looks like; cue labels no
longer wrap. Results: an outcome mark (approval stamp / broken perimeter with a
struck cross, both from the asset sheet) is the new hero, the outcome line
leads, the score dial lost 3 px of stroke and gained graduation ticks so it
reads as an instrument, and `Secured` leads the stat row.

**Tokens.** Every colour and constant added lives in `data.js` under `ART`
(`sheet`, `claim`, `wall`, `cut`, `player`, `type`, `hud`, `screen`). Nothing
art-related is hard-coded in the component.

**Not changed.** `rules.js` is byte-identical — no grid, orb, seal, fuse or
scoring behaviour was touched. Screen flow, LMS wiring, capture mechanic and
compliance copy unchanged. `src/kit/` untouched. Lead form remains Name +
Mobile. Zero new binary assets — the hatch, the sheet and the outcome marks are
all drawn.

**Verification**

| Gate | Result |
| --- | --- |
| `npx vite build` (before) | pass — 426.77 kB / **142.06 kB gzip**, CSS 6.87 kB gzip |
| `npx vite build` (after) | pass — 438.13 kB / **145.16 kB gzip** (+3.10 kB, +2.2%), CSS 6.87 kB gzip unchanged |
| `node gate.mjs` | **PASS** — strip bot 6/6 seeds >=70% in time (16.5-38.7 s), idle bot 0/3, camper bot 0/3, 106 seals across 20 runs with zero orb-containment errors |
| `node scripts/play-test.mjs ring-fence --all-sizes` | **ok at 4/4** — no console or page errors at any size; canvas mounted and painted 100.0% of sampled pixels at 320x568 (269x484), 390x844 (370x666), 412x915 (392x706), 412x700 (339x610); random-input bot survived 90-91 s at every size; results screen and retry path work, canvas returns after retry |

Screenshots were read at every size before and after, and iterated against
twice: the first pass shipped a HUD band too short for its own content (the hero
`%` clipped at 320x568, fixed by sizing the band to hero + caption + rail and
publishing compact type sizes as CSS vars), and the second shipped a home screen
that overflowed 568 px (fixed with viewport-relative rhythm).

**Known trade-off.** Giving the HUD a real band costs field height where the old
layout had none to spare: at 412x700 the canvas goes 377x678 -> 339x610 (-10%).
That is the price of removing the dead strip and taking the HUD off the play
surface, and it is the right trade — but if a reviewer wants the larger field
back on short-and-wide viewports, lower `ART.hud.compactUnder` to 700 so that
size takes the 64 px band.
