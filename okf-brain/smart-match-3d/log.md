# Smart Match 3D — Build Log

## 2026-08-06 — Redesign: Minimalist Thematic Scoring Display

### In-Game HUD Minimalist Scoring
- Replaced the large points counter in the in-game HUD with a minimalist fraction of secured goals: `{matches} / {totalTriplets}` (e.g., `12 / 20` goals matched).
- Updated the inline-floating text when merging a triplet: instead of points delta `+100` / `+125` floating in gold, it now floats `✓ {Goal Name}` (e.g. `✓ Shield`) in the goal's unique glow color, reinforcing the goal-secured concept.
- Combo indicator now displays `Combo ×{combo}` minimally below the goal confirmation float.

### Results Screen Layout Update
- Set the hero progress circle ring to represent matched goals progress ratio (`matches / totalTriplets`) instead of points.
- Shrunk circular inner score label to display the fractional goals count: `{matches} / {totalTriplets}` with the subtitle `GOALS SECURED` below it.
- Added a count-up animation for the matches count (`animatedMatches`) within the circle.
- Relocated the final points score to the bottom stats row (labeled "Final score"), keeping it as a secondary metric for leaderboard ranking and LMS tracking.
- Shorten message updated to include the fractional matched goals count instead of arbitrary points.

### Premium Ambient Background
- Generated a subtle abstract dark blue/indigo background image with a vertical aspect ratio.
- Configured Vite to resolve and bundle `src/assets/ambient_game_bg.png` relative to both the CSS index stylesheet and inline imports.
- Updated `html, body, #root` in `index.css` to render this ambient background image.
- Updated the parent mobile layout container in `App.jsx` to load `ambientBg` and render it with a cohesive, dark semi-transparent blue mask (`linear-gradient(rgba(5, 26, 58, 0.55), rgba(5, 26, 58, 0.55))`). This ensures the background renders inside the mobile shell frame (behind the game canvas) and remains subtle and non-intrusive.

### Build
- `pnpm install && pnpm build` passes with zero errors.

## 2026-07-09 — Initial build

- Completed the interrupted scaffold: verified existing `package.json`, `vite.config.js`
  (port 5033, LMS defines, `SmartMatch3D` rollup output name), `index.html` (viewport meta,
  Poppins), `main.jsx` (gamification token capture), `data.js`, `api.js`
  (`LEAD_NO_KEY = 'smartMatch3dLeadNo'`, summary `Smart Match 3D Lead`), and the shared copies
  of `LeadCaptureModal.jsx` / `SlotBookingModal.jsx` / `ThankYouScreen.jsx` /
  `services/playCount.js` / `utils/crypto.js` / `utils/shortener.js` — all logic identical to
  the life-goals-bubble-shooter gold standard (diff-verified; only titles/summary text differ).
- Built the missing core:
  - `src/Game.jsx` — canvas triple-match engine: layered 5-tier pile generation (~60 tokens /
    20 triplets over 11 life-goal types), covered-token dim/lock logic, tap→fly-to-tray arc
    animation, type-grouped 7-slot tray with reflow, auto-merge of triples with 14–16-particle
    bursts, floating score/goal-secured text, combo chain scoring, screen shake on tray danger
    and lose, 2:00 countdown with tick SFX in the last 10s, undo/shuffle/magnet boosters,
    Web Audio synth SFX (tap/place/merge-arpeggio/booster-chord/win-fanfare/lose-slide),
    dPR-scaled canvas + delta-time rAF loop, win/lose stat payloads.
  - `src/App.jsx` — gold-standard screen flow (home → howtoplay → game → results → thankyou)
    with lead modal auto-open, book-a-slot gating on `LEAD_NO_KEY`, `gameKey` remount restarts.
  - `src/Screens.jsx` — home screen with floating premium SVG token hero + sheen play CTA,
    how-to-play with CSS tray-drop merge demo + 3 steps, results screen with animated score
    ring, round stats (goals matched / best combo / time), share, call-now, book-a-slot,
    retry/home, standard disclaimer.
  - `src/index.css` — base reset + shared lead/terms/thanks/slot-booking styles (copied from
    gold standard) + Smart Match 3D glass HUD/booster/home/howto styles.
  - `README.md`, OKF docs.
- Fixed `data.js` retirement token 8-digit hex color; removed emoji entirely (SVG sprites only).
- Verification: `pnpm install` and `pnpm build` — both pass (see summary below).

## 2026-07-09 — Independent QA audit (post-build)

Full audit against `okf-brain/GAME_STANDARD.md` — **PASS, no fixes required**:

1. **Build:** `pnpm build` exits 0 (dist 400.69 kB JS / 23.07 kB CSS, 517 modules).
2. **index.html:** viewport meta (`maximum-scale=1, user-scalable=no, viewport-fit=cover` —
   byte-identical format to the gold standard), Poppins Google Font, sensible title.
3. **Mobile shell:** App container `max-width: 430px; margin: 0 auto`; canvas sized ×
   `devicePixelRatio` (capped at 3) with `ctx.setTransform(dpr,…)` and a resize handler that
   remaps board coordinates; `e.preventDefault()` on gameplay pointerdown + `touch-action: none`
   on the canvas + `touch-action: manipulation` / `overscroll-behavior: none` on body.
4. **Screen flow:** home → howtoplay → game → results (+ThankYou); lead modal auto-opens on
   first results when `sessionStorage['smartMatch3dLeadNo']` is empty; Book a Slot gates on
   lead → SlotBookingModal → ThankYouScreen. Validations verified: name `/^[A-Za-z\s]+$/`,
   mobile `/^[6-9]\d{9}$/`, optional email format, required T&C.
5. **API:** posts to `__LMS_BASE_URL__/whatsappInhouse` and `__LMS_UPDATE_BASE_URL__/updateLeadNew`
   (both defined in vite.config.js, port 5033 unique across the repo); `incrementPlayCount()`
   imported in App.jsx and called once in `startGame()`.
6. **Sprites:** emoji-codepoint grep of src is clean — only comment arrows and the shared lead
   modal's HTML ✓ tick (allowed per §8.3). All 11 token SVGs generate cleanly (no `undefined`
   interpolations, no 7/8-digit hex, stack-parse well-formed — re-verified via node).
7. **Gameplay sanity (code review):** 120 s hard cap; win (20/20 merges) and lose (tray
   overflow with no inbound token, or timeout) both reachable and both route to results via
   `onWin`/`onLose` → `finishRound`; score/goals/time HUD always visible; merge/combo/booster/
   win/lose/tick synth SFX wired; 14–16-particle bursts, floating `+N` / “goal secured” text,
   0.25–0.4 s screen shake all present. Shared modules diff-identical to gold standard except
   the two intended retitle lines.
8. **Docs:** README (concept/hook/controls/scoring/port/build) and OKF index/log present.

Notes (non-blocking): gameplay not exercised in a live browser (dev server prohibited for QA
too); difficulty ramp is intrinsic (tray pressure, shrinking choice space, final-10 s ticks)
rather than an explicit mechanical ramp; board solvability not guaranteed by construction —
standard for the genre, mitigated by the undo/shuffle/magnet boosters.

## 2026-07-31 — Revamp: minimal in-game HUD, email removal, animation-only how-to-play

**1. Scoring presentation rebuilt (headline change).** The three glass stat chips
(Score / Goals / Time) and the separate timer bar are gone. In their place, one thin
26 px rail above the board — `Game.jsx` HUD block, `.sm3-rail` in `index.css`:

- **Time** = a 22 px SVG ring that depletes counter-clockwise (`RING_C` dash-offset), turning
  coral and pulsing under 15 s. No digits, no "TIME" label.
- **Goals** = a 6 px collection rail that fills orange as triplets are secured, notched into
  20 hairline segments by a `repeating-linear-gradient` (one notch per triplet — zero JS).
- **Score** = a single 13 px tabular-nums number, no label, keyed on its own value so React
  remounts it and replays a 0.32 s bump only when the score actually changes (not on the
  once-a-second timer tick).

Feedback moved to the point of action instead of the HUD: the merge float is now just `+N`
(the "<goal> goal secured!" line is deleted, combo is a `×3` glyph not the word "Combo"),
and merging a trio now pushes `st.slotPulses` entries that draw an expanding coloured ring
on the three tray slots the trio just freed (`drawTray`, 0.45 s decay). Booster buttons lost
their word captions — icon + count badge only, `aria-label` retained for screen readers.

**2. G1 — email removed** from `src/LeadCaptureModal.jsx`: `EMAIL_RE`, the `email` state, the
whole optional-email field block, the validation branch, the `lastSubmittedEmail` session
read/write, and `email` from both the `submitToLMS({...})` call and the `onSubmitted({...})`
payload. `api.js` untouched — `email_id: email || ''` still resolves to `''`. Repo-grepped:
no other file in this game read `lastSubmittedEmail`. Name / mobile / T&C unchanged.

**3. G2 — how-to-play is animation-only.** The three numbered instruction paragraphs
(`.sm3-step*`, ~120 words) are deleted. The looping demo now shows the real mechanic: three
identical Home tiles sitting on the board, an inline-SVG finger glyph that travels to and
presses each tile at the exact frame that tile lifts off (`sm3-demo-finger` waypoints are
synced to `sm3-demo-drop`'s 3 s cycle and its 0 / 0.28 / 0.56 s stagger), each tile flying
into a visible tray slot, then the trio popping with the existing spark burst. Remaining
text: the "How to Play" heading, three icon-led cues — finger + "Tap", three-tiles +
"Match 3", tray + "Don't fill tray" — and the Play button. Card measures ~432 px tall at
360×640, so it does not scroll.

**4. G3 — `smart-match-3d/asset-from-here.md`** written: 14 Nano Banana prompts on a motif
used by no other game in the repo — hand-poured vitreous enamel on brushed-brass squircle
**pin badges** laid on navy collector's felt. Covers the felt backdrop, the shared badge body,
seven individual goal emblems, a four-emblem strip for the remainder, the 7-slot brass tray
rail, a five-glyph HUD/booster sheet, the merge burst, and a collector's-drawer results hero.
Badge body and emblems are deliberately separate prompts so the rim lighting stays identical
across all eleven goals.

Untouched per G7: `src/kit/`, `src/api.js`, `services/`, `utils/`, every other game folder.

**Build:** `pnpm install && pnpm build` — exit 0.
`dist/assets/index-DOYnWTlv.js 401.48 kB │ gzip: 134.12 kB`, CSS 23.91 kB, 517 modules,
built in 3.40 s.
