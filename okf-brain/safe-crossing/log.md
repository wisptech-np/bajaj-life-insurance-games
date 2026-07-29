---
type: log
title: Safe Crossing Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/safe-crossing/log.md
timestamp: 2026-07-29
---

# Safe Crossing Change Log

## [2026-07-29] Initial build

### Scaffold and identity

- Cloned from `guardian-shelter/` per GAME_STANDARD §1: `index.html`,
  `vite.config.js`, `package.json`, `main.jsx`, `index.css`, `App.jsx`,
  `api.js`, `LeadCaptureModal.jsx`, `SlotBookingModal.jsx`,
  `ThankYouScreen.jsx`, `services/playCount.js`, `utils/crypto.js`,
  `utils/shortener.js`, plus an unedited copy of `shared/game-kit/*.js` into
  `src/kit/` (verified byte-identical, all seven files).
- Identity rewired: package `safe-crossing`, rollup output `SafeCrossing`, dev
  port **5062**, title `Safe Crossing — Bajaj Life`,
  `LEAD_NO_KEY = 'safeCrossingLeadNo'`, `summaryDtls = 'Safe Crossing Lead'`,
  lead-modal summary `Safe Crossing Lead - Post Game`, slot remark
  `Safe Crossing Slot Booking`, `updateLeadNew` fallback remark
  `Slot Booking via Safe Crossing`. `grep -rn "Guardian Shelter\|guardianShelter"
  safe-crossing/src/` returns **zero matches**.
- Screen flow unchanged from the standard: home → howtoplay → game → results
  (+LeadCaptureModal when `sessionStorage[LEAD_NO_KEY]` is empty) → [Book a Slot
  → SlotBookingModal] → thankyou, restart by `gameKey` remount,
  `incrementPlayCount()` called exactly once in `startGame`.

### The game

- Built the junction in `src/traffic.js` as a **pure rules module**: no React, no
  DOM, no canvas, no colours, no imports at all. It owns junction geometry, the
  spawn schedule and dispatcher, vehicle kinematics and car-following,
  brake/release, junction-overlap collision detection, near-miss detection and
  scoring. `SafeCrossingGame.jsx` renders it and decides nothing.
  `scripts/balance.mjs` imports the same module, so the balance table cannot
  drift from what ships.
- Four approaches, one lane each, keeping left, with fixed straight paths. The
  parallel pair on each axis is a full lane apart and can never overlap, so the
  game has exactly four conflict points at the corners of the inner box.
  Collision is an exact AABB test between perpendicular pairs inside the box;
  the same test yields the near-miss clearance, so "near miss" is literally
  "would have been a crash 24 px ago".
- Same-lane traffic uses a car-following model and **queues** rather than
  rear-ending. Only a junction overlap is ever a crash, which keeps the mechanic
  legible: the player is never punished for something happening behind a vehicle
  they stopped.
- Risk trucks (10% of spawns, exactly the brief's share) refuse the brake, flash
  a roof beacon continuously and sound their horn the moment they first come
  INTO VIEW — not when they spawn, which is several seconds earlier and off
  canvas, where a horn is just noise. Braking is also refused once a vehicle can
  no longer stop short of the box — nobody stops halfway across a junction, and
  allowing it would turn a mistap into an unavoidable pile-up.
- Rendering is programmatic canvas only, no emoji and no image files. City
  blocks, both roads, kerbs, dashed lane lines, four zebra crossings, stop bars
  and the yellow box-junction hatch are pre-rendered to one offscreen bitmap per
  resize. Per frame only vehicles, hold rings, conflict rings, road decals and
  particles are drawn. Vehicles are rounded-rect bodies with glass panels,
  headlights and brake lights that glare when held; the truck adds a cargo box,
  hazard chevrons and a beacon; the scooter has a rider drawn from an ellipse
  and a circle.
- Juice floor met: ≥8-particle bursts on every event (10 cross, 12 near miss,
  26 crash, 34 Claim Cushion, 40 win), floating text, screen shake on collision,
  hit-stop, squash on tap, animated score counter (`damp` at
  `BALANCE.scoring.counterLerpPerSecond`), CSS screen transitions on the stage
  and all three screens, pulsing conflict rings and cushion badge. Audio is kit
  Web Audio synth only.
- Hot-loop discipline per the batch idioms: mutable state in refs (React state
  only for values that change a few times a run), `fx.update(dt)` then
  `fx.isFrozen()` early-return, HUD score/through/progress written via
  `textContent` and `style.width` refs, pooled road decals and a pooled conflict
  list (`collectConflicts` grows its pool and returns a count rather than
  allocating), predicted-conflict scan throttled to ~8 Hz instead of running the
  O(n²) sweep at 120 Hz, endRun bursts clamped on-screen, full teardown on
  unmount (loop, input, ResizeObserver, orientation listener, both timeouts,
  `fx.reset()`, `audio.destroy()`).
- `rescaleWorld()` carries a live run across a canvas resize by each vehicle's
  fraction of its runway rather than by pixels, so a mobile URL bar sliding away
  cannot teleport a vehicle into the box. Verified: max runway-fraction drift
  0.000000 across a 407×612 → 338×452 resize mid-run.

### Spec corrections

The global constraints say the reachable-win requirement governs over literal
constants. Two corrections were needed; both are commented at their definition
in `src/data.js` and both are measured rather than asserted.

1. **Approach runway (`road.runwayFrac = 1.0`) — added; not in the brief.**
   Taken literally, vehicles spawn just off the canvas edge, which gives each
   approach only ~4 s of road. At the brief's 2.4 s → 1.4 s cadence that leaves
   barely **one** perpendicular vehicle in play at any moment, so only 37% of
   spawns could be made to contest the junction at all and the brief's own bot
   won **61%** of runs — outside the 25–45% band the brief also asks for, and a
   do-nothing player still won 30–45% of the time. Extending each approach
   off-canvas by one short-edge length puts 4–6 vehicles on every runway without
   touching the spawn cadence, the win condition, the clock or the truck share.
   Measured at 407×612, 150 runs per cell: runway 0.30 → bot 46.0%,
   0.62 → 42.0%, **1.00 → 33.3%**, 1.40 → 34.0%, 2.00 → 31.3%. Past ~1.4 the win
   rate stops moving and only the run gets longer, so 1.0 is where the
   difficulty lands without stretching the session.

2. **Conflict-aiming dispatcher (`spawn.conflictBias`, `paceCandidates`,
   `aimOverlap`, `vehicles.speedVariance`) — added; not in the brief.**
   Four independent uniform-random streams essentially never contest a junction:
   with a ~0.8 s overlap window against a 2.4 s cadence, the measured crash rate
   for a player doing nothing was one per ~20 s. The dispatcher instead picks,
   on 90% of beats, the approach **and the driver's pace** whose predicted
   arrival collides with a vehicle already on the road. Two knobs are needed,
   not one: the approach alone offers only two distinct arrival times (the
   vertical run to the box is longer than the horizontal one), which is far too
   coarse to line a conflict up. Per-driver pace within ±36% gives the
   dispatcher continuous control over arrival time. Type share is drawn *before*
   this runs and is never touched, so risk trucks stay at exactly 10%.

Two implementation notes worth recording because the first attempt was wrong:

- Candidate scoring is **tiered, not a weighted product.** The first version
  multiplied the aim error by a "prefer a risk truck" factor; that inverted the
  priority — a hopeless truck pairing scored better than a perfect car pairing,
  so the spawner picked approaches that produced no conflict at all and the bot
  win rate did not move (62% → 57%). Tiering it (real overlap with the truck
  arriving second > real overlap involving a truck > real overlap > nearest
  miss) fixed it.
- **Higher `conflictBias` makes the game easier, not harder.** Measured 0.60 →
  32.0%, 0.80 → 37.3%, 0.90 → 42.7%, 1.00 → 52.7%. At bias 1 every conflict is
  aimed cleanly and telegraphed from the moment of spawn; it is the leftover
  random spawns that go wrong late. Shipped at 0.82.

Two smaller additions, both closing holes rather than tuning:

3. **Impatient driver (`hold.maxSeconds = 6`).** Without a hold limit the
   dominant strategy is to park one vehicle in the N and S approaches
   permanently: the two remaining lanes are parallel, can never conflict, and
   the run wins itself. A held vehicle honks and rolls after six seconds, shown
   by the patience arc draining around it (it turns orange with 4.4 s spent).
   **This did NOT close the hole — see the 2026-07-29 fix round below.**
4. **Warm start (`spawn.preload`).** With an empty opening board the first ~15 s
   of every run is an empty crossroads and a do-nothing player took 23.8 s
   (median of 400 runs, measured) to crash out, failing the brief's under-15 s
   gate. Six vehicles are now laid onto the runways at
   t=0 through the *same* dispatcher, nearest the box first, clamped so the
   leading vehicle is still 70 px clear of the box — a warm vehicle that opened
   the run already committed would be a crash the player never had a chance to
   prevent. Measured: 2.3 vehicles on canvas at t=0, ~4.5 by t=2 s, none
   committed at t=0, first crash for a do-nothing player at 3.4 s median.

### Balance gate

`scripts/balance.mjs` imports `src/traffic.js` and `src/data.js` directly and
runs 400 seeded runs (`mulberry32`, seed `0x5afec205`, per-run seed
`SEED + i * 2654435761`) at three canvas sizes, exiting non-zero on either gate.

The brief's bot is implemented **literally** — 3 scans/s, holds the
later-arriving vehicle of every predicted junction overlap, 300 ms reaction on
every decision — because its one blind spot is the mechanic itself: when the
later vehicle is a risk truck the brake does nothing and the pair crashes. A
second `truck-aware` bot (identical, except it falls back to the earlier vehicle
when the later one has no brakes) is reported alongside as the skill ceiling, so
the difficulty attributable to the truck is visible as a number rather than a
claim. Both are beatable by queue-induced mistiming: a vehicle delayed behind a
hold arrives later than the free-flow prediction said it would.

| canvas | reaction bot (gated) | truck-aware | do-nothing 1st crash | do-nothing crash-out |
|---|---|---|---|---|
| 407×612 | **36.3 %** | 63.7 % | 3.4 s | **6.8 s** |
| 407×556 | **33.5 %** | 67.5 % | 3.1 s | **5.7 s** |
| 338×452 | **33.0 %** | 64.8 % | 3.1 s | **5.7 s** |

Both gates pass at all three sizes. A do-nothing bot wins **0.0%** of runs. The
reaction bot averages 1.5 collisions and 8.3 close calls over ~24 dispatched
vehicles; its crash distribution is 11% / 25% / 64% for zero, one and two
collisions, so the Claim Cushion is consumed in ~89% of runs.

### Verification

- `pnpm install` — clean.
- `pnpm build` (`vite build --mode uat`) — **passes**, 524 modules, 423.37 kB JS
  (141.12 kB gzip), 33.00 kB CSS, 1.6 s.
- `node scripts/balance.mjs --runs 400` — **GATE: PASS**.
- `grep -rn "Guardian Shelter\|guardianShelter" safe-crossing/src/` — zero
  matches.
- `src/kit/*.js` md5-identical to `shared/game-kit/*.js` (7/7).
- Emoji scan over `src/`, `scripts/` and `index.html`: the only non-ASCII
  pictograph is `U+2713` in the copied `LeadCaptureModal` consent checkbox,
  which is HTML text and explicitly permitted by the global constraints. No
  emoji anywhere in the canvas render path.
- Headless smoke test of the paths the balance sim does not exercise:
  `pickVehicle` round-trips on every live vehicle and returns null on empty
  asphalt; `toggleBrake` returns `hold`/`release` for family vehicles and
  `truck` for risk trucks; the impatient auto-release fires; a mid-run
  407×612 → 338×452 resize preserves every vehicle's runway fraction to 1e-6 and
  keeps every vehicle centred in its lane; the run still terminates and returns
  the exact stats contract `{score, crossed, nearMisses, crashes}`.

### Known issues / deferred

- The clock lose-path (110 s with fewer than 20 through) is implemented and
  reachable but never fires for any measured bot — every loss in 1,200 gated runs
  was a second collision, and the fastest observed win is ~46 s. The clock is a
  backstop against a player who holds everything rather than a live threat.
- Vehicles queued on the off-canvas runway are simulated but not visible. This
  never costs the player a decision (the visible stretch is ~4 s of road and a
  vehicle only needs ~0.3 s of it to be stopped), but a conflict can be predicted
  and highlighted a moment before both of its vehicles are on screen.
- Registration deltas (`scripts/games-manifest.json`, root `README.md`,
  `scripts/sync-game-kit.mjs` GAMES list, `scripts/build-status.json`,
  `scripts/build_tracker.py`, `GAMES_TRACKER.xlsx`) are the controller's
  single post-batch task and were deliberately not touched here.

## [2026-07-29] Fix round after independent review

Reviewer found 2 majors and 8 minors. Corrections 1, 2 and 4 above were verified
justified; correction 3 was **provably wrong** and is replaced below.

### MAJOR 1 — park-N/S was dominant, and `hold.maxSeconds` never closed it

`traffic.js` `makeVehicle` / `toggleBrake` / `stepWorld`, `data.js` `hold`.

The reviewer measured a reflex bot that does nothing but keep the leading
northbound and southbound vehicle held — 3 scans/s, 300 ms reaction, 4 taps/s
ceiling, on-canvas only — winning **96.0% / 92.7%** of runs at **0.54 taps/s**.
The two vertical lanes are parallel to each other and so are the two horizontal
ones, so a same-axis pair can never conflict; freezing the vertical pair
therefore removes *every* conflict pair from the board and the run wins itself
off E/W traffic alone. The per-hold `maxSeconds` timer I had written against
exactly this exploit did nothing: the bot simply re-taps whenever its target
comes free, and the measured result was **identical at `maxSeconds` 6 and at
infinity**.

Fixed as a mechanic, not a number: **patience is now cumulative and is never
refunded.** `holdTime` counts only while a vehicle is stopped for the player, it
survives every release (the player's own or the driver's), and when it reaches
`hold.maxSeconds` the driver leaves and `patienceSpent` latches — that vehicle
can never be held again. Each vehicle can therefore be delayed at most six
seconds in its entire life, after which it crosses uncontrolled, so every
conflict the strategy deferred comes due at once.

Telegraphed three ways, because a refusal the player cannot predict is not a
mechanic but a bug: the ring around a held vehicle is the *remaining* budget and
visibly drains; it turns orange at `warnSeconds`; and a spent driver carries a
dashed orange ring — the same orange the risk truck owns, because that is now
exactly what it is. Tapping one answers "WON'T STOP AGAIN".

Honest play is untouched: resolving a conflict costs 1–2 s of the 6 s budget, and
"brake everyone else around the truck" stays available for as long as it takes
the truck to clear. Measured after the fix, park-N/S falls from 96% to
**5.0% / 5.0% / 4.8%** — it is now far *worse* than honest play.

Gate 3 added to `scripts/balance.mjs`: `createParkBot()` implements the
reviewer's strategy exactly (same scan rate, reaction, tap ceiling and on-canvas
restriction; re-taps whenever the target comes free; gives up on a driver that
refuses). It asserts **park-N/S ≤ reaction bot + 10 points** at every canvas
size. Ten points is deliberately generous: the claim being defended is "not
dominant", not "worthless" — freezing a lane is a real tool, it just must not be
a way to skip the game.

### MAJOR 2 — the dispatcher was aiming truck-vs-truck collisions

`traffic.js` `pickSpawn` (was line 415).

`truckLate` never checked that the *other* vehicle was brakeable, so a
truck-versus-truck overlap scored **tier 0**, the dispatcher's highest priority.
Those pairings cannot be solved by braking anything: 4.4–5.6% of all crashes were
truck-vs-truck, and 39–69% of those had no brakeable vehicle ahead in either lane
to block with — unavoidable against a single Claim Cushion.

Fixed by tracking such pairings separately as `deadlock` and making **any**
candidate that creates one lose to **any** candidate that does not, ahead of the
tier comparison. A pure tier demotion would not have been enough: the tier is a
candidate's *best* target, so a spawn producing both a good car conflict and an
unavoidable truck-vs-truck would still have scored tier ≤ 2 and been chosen. The
"exactly one truck" branch is now unambiguous and picks the truck directly rather
than re-deriving it. Measured: truck-vs-truck falls from 4.4–5.6% of all crashes
to **0.3–1.2%** (reaction bot) and **0.8–1.2%** (truck-aware).

### MINOR fixes

3. **Braking distance could latch `committed` under a live hold.** `traffic.js`
   `toggleBrake`. The check tested the nose position at TAP time, so a vehicle
   still stopping could roll past `J.near`, latch `committed` and become
   permanently unreleasable — "TOO LATE" forever, on 11.6–15.8% of expert runs,
   contradicting the invariant in the `vehicles` comment block. Two changes: a
   hold is refused when `distToNear < v² / (2·decel)` (the vehicle can no longer
   stop short of the box — same "TOO LATE" message, now truthful), and **release
   is unconditional** and evaluated before every other refusal, so a held vehicle
   can always be let go whatever else is true of it. Measured over 400 expert
   runs: 50 taps honestly refused as `committed`, **0** held-and-rolled-past
   samples, **0** unreleasable holds.
4. **Scooter tap target under 44 px on its short axis.** `traffic.js`
   `pickVehicle`, `data.js` `hud.minTapTargetPx`. A single flat `tapPadPx` is
   shared by both axes, so sizing it for the 39 px long axis left the 12 px short
   axis at 42 px on a 338×452 canvas. `pickVehicle` now pads each vehicle out to
   `minTapTargetPx` (44) on each axis **independently**. Measured worst case over
   every type at every canvas size: scooter 44×53 at 338×452, everything else
   ≥ 45 px on both axes.
5. **Same-frame win + crash.** `traffic.js` `stepWorld`. The collision sweep is
   now guarded by `!world.over`, so the 20th vehicle clearing the box ends the
   run there and a crash in the same step cannot overwrite a win with a loss.
   Previously the outcome depended on iteration order, so the sim and the browser
   could legitimately disagree about the same seed.
6. **Off-canvas conflicts.** `traffic.js` `collectConflicts` takes an optional
   `J` and then skips pairs where NEITHER vehicle is on canvas; `isOnCanvas()` is
   exported. The game passes `J`, so warning rings no longer pulse over empty
   road. **Both** balance bots now also refuse to act on off-canvas vehicles,
   rather than the published ceiling braking things 7.8 s before they appear: the
   honest truck-aware ceiling is 51.5–57.5% (was 63.7–67.5% omniscient), and the
   gated bot moved from 33.0–36.3% to 32.5–38.5%, still inside the band.
7. **Audio distinctness.** The truck horn was `audio.hit()`, the same voice as a
   collision; it is now `audio.combo(0)`, a flat 440 Hz square honk. The
   impatient release was `audio.tick()`, the same voice as the player's own
   release; it is now `audio.failure()`, a descending blare — the release was
   taken out of the player's hands and should not sound like their own input. It
   also now throws an 8-particle burst and reads "OUT OF PATIENCE".
8. **Hidden-class transition.** `v.warn` and `v.honked` are initialised to
   `false` in `makeVehicle` instead of being attached later from the render loop.
9. **log.md corrections** (applied to the entry above): the horn fires on first
   visibility, not on spawn; the hold warning is the patience arc turning orange,
   not a blink; do-nothing-without-preload is **23.8 s** median (400 runs,
   measured), not "30+ s".

### Re-tune

The on-canvas restriction on the bots plus cumulative patience pushed the
reaction bot to 24.0% at 407×612, just under the band floor. `conflictBias` was
raised **0.82 → 0.90**, the one knob already documented for this: measured at
407×612, 0.78 → 24.7%, 0.84 → 26.7%, 0.88 → 32.7%, **0.90 → 34.3%**,
0.92 → 38.7%, 0.96 → 42.7%. No other constant changed. The sweep tables in
`data.js` were re-measured at the shipped settings rather than left stale.

### Verification (fix round)

- `pnpm build` (`vite build --mode uat`) — **passes**, 524 modules, 425.24 kB JS
  (141.85 kB gzip), 33.00 kB CSS.
- `node scripts/balance.mjs --runs 400` — **GATE: PASS** on all three gates at
  all three canvas sizes, at seeds `0x5afec205`, `0x12345678` and `0x77359401`.
  Reaction bot spans 32.0–38.5% across the nine seed × size cells, park-N/S
  4.3–7.2%, do-nothing crash-out 5.4–6.4 s.
- Targeted re-measurement of every fixed defect; numbers inline above.

### Still open

- The clock lose-path remains implemented and reachable but never fires for any
  measured bot; every loss in the gated runs was a second collision.
- `audio.failure()` is now shared between the impatient release and the
  end-of-run loss sting. They never overlap — one is mid-run, the other arrives
  with a full-screen transition — and the kit's synth voices do not stretch to
  nine distinct events without inventing one, which would mean editing a kit
  file.

### Post-re-review polish (controller-applied)

The re-review returned CLEAN with one MINOR: the remaining-patience arc rendered
only while a vehicle was held (or fully spent), so a released driver with most
of their budget gone was drawn identically to a fresh one. Fixed in
`SafeCrossingGame.jsx` render: any vehicle with `holdTime > 0` now keeps a faint
(0.4 alpha) partial arc via the same `drawHoldRing`, so the run-wide budget
stays readable after release. Gate re-run after the change: PASS at all three
sizes (35.0 / 36.5 / 35.0%), build green.
