# Risk Slash — build log

## 2026-07-29 — initial build

Built `risk-slash/` (dev port 5073), a Fruit-Ninja-style swipe slicer, cloned
from the `guardian-shelter/` gold-standard scaffold. Vite 5 + React 18.3.1,
isolated app (no workspace), pnpm only.

**Scaffold.** `index.html` (viewport meta per §6, Poppins), `package.json`
(name `risk-slash`), `vite.config.js` (rollup output name `RiskSlash`, port
**5073**, `__LMS_BASE_URL__`/`__LMS_UPDATE_BASE_URL__` defines kept),
`main.jsx`, `index.css`, `api.js`, `LeadCaptureModal.jsx`,
`SlotBookingModal.jsx`, `ThankYouScreen.jsx`, `services/playCount.js`,
`utils/crypto.js`, `utils/shortener.js` copied from guardian-shelter with
identity strings only changed. `src/kit/` copied **byte-identical** from
`shared/game-kit/` (verified with `cmp` on all 7 files; sync script not run).
`ThankYouScreen` swaps the guardian PNG backdrop for a gradient so the game
ships with zero binary assets.

**CRM identity.** `LEAD_NO_KEY = 'riskSlashLeadNo'`, default
`summaryDtls: 'Risk Slash Lead'`, modal posts `'Risk Slash - Post Game Lead'`,
slot remarks `'Risk Slash Slot Booking'` / `'Slot Booking via Risk Slash'`.
`grep -r "Guardian Shelter" src/` — 0 matches. Screen flow per §2:
home → howtoplay → game → results (+LeadCaptureModal when no lead) →
[Book a Slot → SlotBookingModal] → thankyou; `startGame()` calls
`incrementPlayCount()` once; `gameKey` remount for instant restart.

**Game.** 90 s session, target 120. Six labelled risk archetypes (Scam Call,
Hidden Fees, Debt Trap, Inflation, Medical Bill, Impulse Buy), each a spiky
glossy programmatic-canvas orb with a white Path-drawn icon, baked to offscreen
sprites per resize. Blue Family Shield orb (family silhouette, halo pulse,
soft airborne chime, 200 ms telegraph puff) is the bomb: −10 / 1 s white-flash
stun / combo reset per slice, 3 sliced = early LOSE. Blade = single-pointer
ring buffer (150 ms slice window, 200 ms tapering two-pass ribbon), slice gate
≥ 400 px/s per segment, hitbox 1.15× radius, cap 8 slices/gesture. Combos 3+
within ≤300 ms pay +2×(N−2) with escalating callouts and per-slice rising
semitone; 5+ in one swipe = 1 s slow-mo at 0.25× with zoom + flash. Frenzy
(combo meter 10 or ~30 s cadence, plus a forced 75–90 s finale): spawn ×3,
zero shields, warm tint. Ramp: 1–2/1.6 s → 2–4/1.2 s (10% shields) →
3–5/0.9 s (18%) → finale. Launch physics: gravity 1500, apex 70–85% of stage
height, middle-80% launch band, inward-angled vx. Missed risks cost tempo only.

**Shield fairness (enforced, both directions).** Ballistic path separation
≥ 1.2× combined radii between every shield and every risk over shared airtime,
sampled at 60 ms against live + pending launch descriptions; the shield
re-rolls up to 12 times then is dropped, and risks spawned while a shield is
live re-roll up to 8 times then are skipped.

**Anti-pause-scum (repo-wide rule).** Kit loop `onPause` drives a two-phase
re-acquire copied from goal-juggler: resume ⇒ 1.5 s world-and-clock freeze
behind a visible 3-2-1 count (`shouldTickClock` holds the session clock), then
a 0.25 s live input lock; the stale blade trail is cleared on resume so a
pre-pause swipe cannot slice. All slice input refuses while frozen, locked,
stunned, or ended.

**Performance.** Pools allocated once at mount: 18 orbs, 36 halves, 10 splat
decals, 24-point Float64Array blade ring; kit effects pool for particles /
floating text / shake. Sprites, halo, splat variants and backdrop baked to
offscreen canvases on resize only. HUD score/progress written via `textContent`
refs; React state only for values that change a handful of times per run.
`fitCanvas` DPR cap 2, `touch-action: none`, full teardown on unmount.

### Verification

- `pnpm install` — clean (pnpm 10.29.2, 5.7 s).
- `pnpm build` (mode uat) — **green, zero errors**: 523 modules,
  `dist/assets/index-B3rf1oIS.js` 424.04 kB (140.65 kB gzip),
  `index-bneSBdfR.css` 33.60 kB, built in 2.33 s.
- Emoji grep over `src/` — no emoji codepoints as game sprites; the only match
  is the gold-standard `✓` checkbox tick in LeadCaptureModal HTML copy
  (explicitly acceptable per GAME_STANDARD §8). All canvas text is ASCII.
- Kit files byte-identical to `shared/game-kit/` (`cmp` all 7).
- Lead capture, slot booking, playCount wired per §2 (scaffold copied, flow
  identical to guardian-shelter).

### Deviations from the brief (with reasons)

1. `SlotBookingModal.jsx` is verbatim except its two CRM remark strings and the
   header comment, which now say "Risk Slash" — leaving "Guardian Shelter" in
   lead remarks would mis-attribute CRM records (repo convention per
   goal-juggler's log).
2. `ThankYouScreen.jsx` is verbatim except the imported `guardian_shelter_bg.png`
   backdrop, replaced with a brand gradient — the PNG belongs to another game
   and Risk Slash ships zero binary assets.
3. Airborne time is ~1.55–1.75 s on a 620 px stage (the brief's 1.6–2.2 s range
   assumes taller stages): apex fraction 70–85% is the primary spec and gravity
   is fixed at 1500, so airtime follows from stage height.
4. "At each 10-combo" frenzy trigger is implemented as a cumulative combo meter
   (10 risks sliced without hitting a shield) — a literal 10-slice gesture is
   impossible under the briefed 8-slices-per-gesture cap.
