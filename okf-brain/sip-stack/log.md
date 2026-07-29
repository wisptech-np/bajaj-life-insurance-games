# SIP Stack — build log

## 2026-07-29 — Initial build

Built the complete game from scratch on the guardian-shelter scaffold:

- **Scaffold**: standalone Vite + React 18.3.1 app, pnpm, port 5074, rollup
  output name `SipStack`, `__LMS_BASE_URL__`/`__LMS_UPDATE_BASE_URL__` defines
  kept. `LeadCaptureModal` (title/summary text adjusted), `SlotBookingModal`,
  `ThankYouScreen` (backdrop image swapped for a gradient wash — no binary
  asset), `services/playCount.js`, `utils/crypto.js`, `utils/shortener.js`
  copied from guardian-shelter. `api.js` copied with `LEAD_NO_KEY =
  'sipStackLeadNo'` and default `summaryDtls = 'SIP Stack Lead'`. All 7
  `shared/game-kit/*.js` files copied byte-identical into `src/kit/` (manual
  copy, kit untouched).
- **Game** (`SipStackGame.jsx`): linear ping-pong slab track (range = tower
  width + 2× slab width), traverse 1.6s → 1.35s @ layer 11 → 1.1s @ layer 21,
  speed constant within a slide; drop judged at the pointerdown timestamp with
  sub-frame extrapolation from the last physics tick; overlap kept / overhang
  sheared into a gravity+rotation chunk; perfect window max(12px, 10% width)
  with snap, expanding ring flash (brighter per streak step), rising pitch
  ladder (kit `combo(depth)`), and +12%-of-original-width regrowth from the
  3rd consecutive perfect (capped at original); total miss or kept width <8px
  loses; 30 layers win with full-tower zoom-out + confetti; camera rises one
  block-height per placement (250ms lerp); background hue drifts 3°/layer;
  milestone banners every 6th layer; score +1/block +2/perfect with animated
  counting; best run in localStorage with delta on results.
- **Anti-exploit**: one drop per slab (`dropArmed`), 200ms spawn input lock,
  and the repo-wide pause-scum fix — kit auto-pause on visibilitychange; on
  resume the world freezes behind a 3-2-1 re-acquire countdown (0.9s) plus a
  0.25s live lock, and the slab's phase AND direction are re-randomised.
- **Screens**: home (CSS-animated stacking mark), how-to-play (CSS shear
  demo), results (stars, best-run delta, share, Book a Slot, one-tap retry,
  disclaimer). Standard flow home → howtoplay → game → results (+lead modal)
  → slot → thankyou; `startGame()` calls `incrementPlayCount()` once;
  `gameKey` remount for instant restart.

**Build verification**: `pnpm install` and `pnpm build` (vite build --mode
uat) completed with zero errors. Grep for emoji codepoints in `src/` — none
used as canvas sprites (the ₹ glyph on the home-screen SVG coin is text in a
vector illustration, not an emoji).
