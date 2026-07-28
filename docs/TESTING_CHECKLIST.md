# Testing Checklist

**State of play:** there is no automated test infrastructure in any of the 7 games. Everything below
is manual until item T0 is done. `pnpm build` passing is a compile check, not a behaviour check — it
would not have caught either critical defect in `GAME_QUALITY_AUDIT.md`.

## T0. Minimum automation worth adding

Business-critical logic that is pure and cheap to test:

| Target | Why |
|---|---|
| Score computation incl. time bonus and combo multiplier | Money-adjacent; silent drift is invisible |
| `playCount` increment / one-per-session guard | Double counting corrupts campaign reporting |
| Lead-form validation (mobile `^[6-9]\d{9}$`, email, consent) | Bad leads reach the LMS |
| Double-submit guard on lead + slot booking | Duplicate LMS records |
| `createGameLoop` session accounting | Regression guard for the backgrounding fix |

Suggested: Vitest (already a Vite project, near-zero config). Keep it to pure functions — do not
attempt to test canvas rendering.

---

## Device matrix

| Class | Device | DPR | Why it matters |
|---|---|---|---|
| Budget Android | Moto G / Redmi A-series, Chrome | 2 | The real performance floor |
| Mid Android | Galaxy A5x, Chrome | 2.75 | Most common in-market |
| Flagship Android | Pixel / Galaxy S, Chrome | 3 | Highest fill cost — **DPR cap matters here** |
| iPhone SE | Safari | 2 | Smallest viewport, 375 × 667 |
| iPhone 14/15 Pro | Safari | 3 | Notch + home indicator, audio unlock quirks |
| iPad | Safari | 2 | Orientation change, wide aspect |

Viewports to verify: **360 × 640, 375 × 812, 414 × 896, 430 × 932**.

## Rendering — regression guards for the fixes in this pass

- [ ] **DPR:** on a DPR-2 *and* DPR-3 phone, the playfield fills its container. Nothing renders into
      a corner, nothing is cropped. *(Guards audit C1 — the defect was invisible at DPR 1, so
      desktop testing will not catch a regression.)*
- [ ] Tapping a shield/target hits exactly what is under the finger — visuals and input agree.
- [ ] No blurring or soft edges on text and vector shapes.
- [ ] Rotate mid-game: layout recovers, canvas resizes, no stretch.

## Session clock and lifecycle

- [ ] **Background the app mid-game for 30 s, return.** Timer must have lost ≈0 s, and the game must
      show the pause veil. *(Guards audit C2.)*
- [ ] Lock the phone mid-game, unlock. Same expectation.
- [ ] Switch browser tabs, return. Same.
- [ ] Answer a real phone call mid-game. Same.
- [ ] Pause veil dismisses on return and play resumes in the same state.
- [ ] Timer does **not** continue running behind the results screen.

## Controls

- [ ] Touch drag, tap, swipe, and hold all register first time, every time.
- [ ] No page scroll, pull-to-refresh, zoom, or text selection during play.
- [ ] Mouse works on desktop through the same code path (pointer events).
- [ ] Rapid repeated tapping does not double-fire scoring or spawn duplicates.
- [ ] Back-swipe / edge gestures do not exit mid-game unintentionally.
- [ ] All touch targets ≥ 44 × 44 px.
- [ ] Game is fully playable one-handed; nothing critical sits in a far corner.
- [ ] No interaction depends on hover.

## Layout and safe areas

- [ ] HUD clears the notch and the iOS home indicator (`env(safe-area-inset-*)`).
- [ ] Text legible at 360 px wide without truncation.
- [ ] No horizontal page scroll at any tested viewport.

## Accessibility

- [ ] With **Reduce Motion** enabled: no screen shake, no trails, no hit-stop — but score popups and
      all information still appear.
- [ ] Contrast ≥ 4.5:1 for HUD text against its background.
- [ ] Nothing conveys state by colour alone.

## Audio

- [ ] First sound plays on iOS Safari after the first tap. *(Guards audit H4 — historically silent.)*
- [ ] Nothing autoplays before interaction.
- [ ] Mute persists across screens for the session.
- [ ] Audio stops when backgrounded and does not play over another app or music.

## Performance

- [ ] Sustained ≥ 50 fps on the budget Android device during the busiest moment.
- [ ] No progressive slowdown across a full 2-minute session (leak check).
- [ ] Play → results → replay ×10: memory does not climb monotonically; no duplicate event listeners.
- [ ] Effect budget visibly reduces on a low-tier device rather than dropping frames.

## Business logic — must not regress

- [ ] Score matches the documented formula, including the time bonus.
- [ ] `playCount` increments exactly once per session.
- [ ] Lead form validates mobile, email, and the consent checkbox.
- [ ] Lead submits to the LMS exactly once; double-tap cannot create two records.
- [ ] Slot booking submits once and reaches the thank-you screen.
- [ ] Screen flow intact: `home → howtoplay → game → results → lead → slot → thankyou`.
- [ ] `smart-match-3d` how-to-play is **animation only, no instructional text** (explicit BajajLife
      feedback).
- [ ] Compliance-approved insurance copy is unchanged.

## Failure and network

- [ ] LMS unreachable: the player sees a clear, non-blocking error and can retry; the game score is
      never lost.
- [ ] Offline mid-session: gameplay continues; submission fails gracefully.
- [ ] Slow 3G: the game is playable before every asset finishes loading.

## Acceptance criteria

Ship-ready when:

1. Every **Rendering**, **Session clock**, and **Business logic** item passes on at least one DPR-2
   and one DPR-3 device.
2. Sustained ≥ 50 fps on the budget Android reference device.
3. Reduce Motion fully honoured.
4. No console errors during a complete play-through.
5. `pnpm build` passes for every game.
6. `node scripts/sync-game-kit.mjs --check` reports no stale kit copies.
