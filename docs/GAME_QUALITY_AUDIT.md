# Game Quality Audit

**Date:** 2026-07-28
**Scope:** the 7 BajajLife-approved games remaining after the scope reduction.
**Method:** static analysis of the source, plus `pnpm build` per game. Findings marked
**Verified** were confirmed by reading the code path end to end. Findings marked
**Needs device test** are strongly indicated by the code but not yet confirmed on hardware —
no game was run on a physical phone as part of this pass.

## Games in scope

| Game | Stack | Renderer | Source lines |
|---|---|---|---|
| guardian-shelter | Vite + React 18 | Canvas 2D (hand-rolled physics) | 5,018 |
| secure-journey | Vite + React 18 | Canvas 2D | 3,913 |
| smart-match-3d | Vite + React 18 | Canvas 2D | 3,869 |
| risk-exit | Vite + React 18 | Canvas 2D | 3,973 |
| life-soar | Vite + React 18 | Canvas 2D | 4,505 |
| coverage-archer | Vite + React 18 | Phaser 3 | 3,115 |
| tightrope-protection | Vite + React 18 | Phaser 3 | 2,500 |

No game uses Matter.js, PixiJS, or Three.js. The five Canvas games each implement their own
physics and particle code — which is why the same defect tends to appear in several of them
independently rather than in one shared place.

---

## Critical

### C1. Canvas rendered at 1/dpr scale on every retina phone — **Verified**

**Games:** `guardian-shelter`, `secure-journey`

Both size the canvas backing store by device pixel ratio but never apply a matching context
transform:

- `guardian-shelter/src/GuardianShelterGame.jsx` set `width={400 * devicePixelRatio}` and drew
  using raw logical coordinates (`0..400`, `0..580`). The file contained **no** `setTransform`
  and no `ctx.scale` outside one unrelated `scale(0.5, 0.5)` inside a sprite helper.
- `secure-journey/src/SecureJourney.jsx` set `canvas.width = width * dpr` at line 351 and cleared
  with `ctx.clearRect(0, 0, width, height)` in logical units. `dpr` appeared exactly three times
  in the whole file — the two sizing lines and its declaration. It was never applied to the context.

**Consequence.** On a DPR-2 phone the scene occupies the top-left quarter of the buffer; on DPR-3,
one ninth. It then displays shrunk into a corner. Critically, **input was already correct** —
`getLogicalCoords` maps through `getBoundingClientRect()` into logical units — so touches and
visuals disagreed. This is the single most likely root cause of the "blurry, badly scaled, low
quality" impression that prompted this work, and it would not show up in a desktop browser at
DPR 1, nor in `pnpm build`.

The other three Canvas games do this correctly (`smart-match-3d` line 753 `setTransform(dpr,…)`,
`risk-exit` line 657 `resetTransform()` + `scale(dpr, dpr)`, `life-soar` line 237 `scale(dpr, dpr)`),
which is what confirms the two above are defects rather than a deliberate convention.

**Fixed in this pass** for both games, with DPR additionally capped at 2.

### C2. Session clock kept draining while the game was backgrounded — **Verified**

**Games:** all five Canvas games (`guardian-shelter`, `secure-journey`, `smart-match-3d`,
`risk-exit`, `life-soar`)

Gameplay ran on `requestAnimationFrame`; the countdown ran on a separate `setInterval(…, 1000)`
(e.g. `guardian-shelter` line 148, `life-soar/src/LifeSoarGame.jsx` line 244, plus the `Screens.jsx`
result timers). `requestAnimationFrame` is halted when a tab is hidden — `setInterval` is throttled
but continues.

**Consequence.** Take a call mid-game, come back, and the game is exactly where you left it but
20 seconds poorer — or already lost. Grep for `visibilitychange` across all 7 games returns
**zero matches**, so nothing anywhere compensated for this.

**Fixed** in `guardian-shelter` by moving both clocks into one owned loop (`shared/game-kit/loop.js`).
The remaining four games still need the same change — see `GAME_POLISH_PLAN.md`.

---

## High value

### H1. No reduced-motion support anywhere — **Verified**

`prefers-reduced-motion` returns **zero matches** across all 7 games, while every game applies
screen shake, particle bursts, and translate-based transitions. For players with vestibular
sensitivity this is an accessibility failure, and the brief explicitly requires it.

Addressed structurally: `shared/game-kit/device.js` exposes `prefersReducedMotion()` and the effect
budget in `config.js` zeroes shake, trails, and hit-stop when it is set, while **keeping** score
popups — information is preserved, motion is removed. Per-game adoption is still pending.

### H2. Fixed 1/dpr-independent frame pacing was absent; delta was clamped, not accumulated — **Verified**

`guardian-shelter` clamped `dt` to 0.03 s. Clamping (rather than accumulating) means that below
~33 fps the game silently runs in **slow motion** rather than dropping frames — physics and the
perceived difficulty curve change with device speed. `secure-journey` clamps at 0.1 s, which is
worse: a single 100 ms hitch advances physics 100 ms in one step, letting fast objects tunnel
through collision boxes.

`shared/game-kit/loop.js` replaces this with a fixed 1/120 s accumulator plus a catch-up ceiling,
so behaviour is identical at 30, 60, and 120 Hz. Adopted by `guardian-shelter`.

### H3. No haptics, and notch-unsafe layout in 5 of 7 games — **Verified**

`navigator.vibrate` : zero matches repo-wide. `env(safe-area-inset-*)` appears only in
`secure-journey/src/index.css` (line 184) and `smart-match-3d/src/index.css` (line 1315). The other
five can place HUD elements under a notch or the iOS home indicator.

`haptic()` now exists in the kit and is wired into `guardian-shelter` win/lose.

### H4. Audio can be silently dead on iOS — **Verified by inspection**

Games create an `AudioContext` on mount. Mobile Safari starts it `suspended` until a genuine user
gesture, and nothing in the games calls `resume()` from within a gesture handler. Sounds before the
first qualifying interaction are dropped silently.

`shared/game-kit/audio.js` provides `unlock()` (resume + silent blip inside a gesture) and suspends
the context on pause so audio never plays over another app. **Needs device test** on real iOS to
confirm the unlock lands, as the exact gesture requirements vary by iOS version.

### H5. Per-frame allocation in particle code — **Verified**

`guardian-shelter.spawnParticles` pushes freshly allocated objects per burst (line 231), as do the
equivalents in the other Canvas games. Allocation during play is what produces GC stutter on
mid-range Android precisely when the screen is busiest.

The kit's `createEffects()` pre-allocates a pool sized to the device tier and recycles. Not yet
swapped into the games — the existing systems work, so this is a performance refactor, not a fix.

---

## Medium

### M1. `public/thumbnail.png` ships 853 KB that nothing references — **Verified**

`tightrope-protection/public/thumbnail.png` (853 KB) is referenced nowhere in any `.ts/.tsx/.css/.html`.
Anything in `public/` is copied into `dist/` regardless of imports, so this is real shipped weight.

**Not deleted.** A file at `/thumbnail.png` is a plausible external share/OG asset referenced by a
listing page outside this repo. Confirm before removing — see `ASSET_INVENTORY.md`.

`tightrope-protection/public/landing_bg.png` (532 KB) **is** used, by `components/IntroScreen.tsx`,
and should become WebP (est. 60–75% smaller at equal quality).

### M2. `life-soar/src/game_background.webp` is dead source — **Verified, no runtime cost**

Not imported anywhere. Because it sits in `src/` (not `public/`), Vite does **not** bundle it, so it
costs nothing at runtime — it is 79 KB of repository clutter inherited from the deleted
bubble-shooter, not a performance problem. `bb_bg.webp` (201 KB) *is* imported by
`life-soar/src/Screens.jsx` and is a genuine optimisation candidate.

### M3. Dead ref callback — **Verified**

`guardian-shelter` had an outer `<div ref={canvasRef => { if (canvasRef) { /* nothing */ } }}>` whose
parameter shadowed the real `canvasRef`. Harmless but misleading. Left in place; flagged for cleanup.

---

## What I did *not* find

Worth stating plainly, because the brief anticipated worse:

- **The games are not asset-driven.** Only 4 binary assets exist repo-wide; everything else is
  drawn procedurally on canvas or as inline SVG. So "low-quality assets" is mostly a question of
  *rendering code*, not of missing or stretched image files. There is no sprite-sheet pipeline to
  build because there are almost no sprites.
- **Central configuration already existed** in the batch-1 games (`data.js` with `GAME_CONFIG`,
  `LEVELS`). That part of the brief was largely already satisfied.
- **`devicePixelRatio` was handled** in 5 of 7 games; the failure was localised, not systemic.
- **Builds are clean.** All builds tested in this pass pass with no warnings.

## Priority and expected impact

| ID | Severity | Effort | Impact | Status |
|---|---|---|---|---|
| C1 | Critical | Low | Fixes the core "looks broken on mobile" complaint | **Done** (2 games) |
| C2 | Critical | Medium | Removes a silent, unfair way to lose | **Done** (1 of 5) |
| H2 | High | Medium | Consistent difficulty across devices | **Done** (1 of 5) |
| H1 | High | Low | Accessibility compliance | Kit ready, adoption pending |
| H3 | High | Low | Feel + notch safety | Partial |
| H4 | High | Low | Audio actually audible on iOS | Kit ready, needs device test |
| H5 | Medium | Medium | Removes GC stutter | Kit ready, adoption pending |
| M1 | Medium | Low | −853 KB payload | Needs owner confirmation |

## Honest limitations

- Nothing here was validated on a physical device or emulator. C1 in particular is a strong
  code-level inference; it should be confirmed visually on a DPR-2 phone.
- The two Phaser games (`coverage-archer`, `tightrope-protection`) were inventoried but not deeply
  audited. Phaser manages its own scaling and loop, so C1/C2/H2 largely do not apply to them; they
  need a separate pass against `Scale.FIT` configuration and scene lifecycle.
- No automated tests exist in any game, so all of the above is unprotected against regression.
