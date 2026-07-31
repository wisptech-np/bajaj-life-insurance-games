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

---

## 2026-07-31 — Lead-form slim-down, animation-first how-to-play, asset prompt sheet

Narrow scope: no gameplay, balance, physics, HUD or `ResultsScreen` changes.
`src/data.js` and `src/SipStackGame.jsx` untouched.

### G1 — email field removed from lead capture

`src/LeadCaptureModal.jsx`: deleted `EMAIL_RE`, the `email` `useState`, the
"Email Field" `sl-lead-field` block, the `errs.email` branch, the
`sessionStorage.lastSubmittedEmail` read and write, and the `email` key from
`submitToLMS({...})` and both `onSubmitted({...})` payloads. `src/api.js`
untouched — `email_id: email || ''` keeps the LMS payload shape identical with
the key omitted. Nothing else in `src/` referenced it. Name, Mobile and T&C
unchanged.

### G2 — `HowToPlayScreen` is now animation-first

`src/Screens.jsx`: deleted all three numbered instruction paragraphs and replaced
the old div-based demo (which had a bare tap ring and no hand) with `TowerDemo` —
a 4 s SVG loop drawn with the canvas's **own** slab construction. New `Slab`
component reproduces `drawSlab`'s pseudo-3D exactly: front face, right-hand side
face, sheared top face and the crisp `rgba(255,255,255,0.28)` top-edge highlight,
coloured off the shipping hue ramp (`slabHueStart` 216 → `slabHueEnd` 130).

The loop: a slab slides across the tower, a `TapFinger` glyph descends and taps
with a ripple, the slab drops, the full-width slab swaps for the 92 px overlap at
the exact frame of contact, and the 12 px overhang shears off and tumbles out of
frame — so the cost of a sloppy drop is visible, not described. CSS transforms
are only ever applied to `<g>` elements with no transform attribute of their own.
`prefers-reduced-motion` disables all five animations.

Under it, exactly three icon-led cues built from the same `Slab` primitive: tap
glyph + "TAP TO DROP", offset slabs with a shear line + "OVERHANG SHEARS",
aligned slabs on a centre line + "CENTRE = PERFECT". Remaining text: heading,
three ≤3-word labels, Play button. Card is ~473 px tall inside a 640 px viewport
— no scroll at 360×640.

### G3 — `asset-from-here.md`

13 Nano Banana prompts written to `sip-stack/asset-from-here.md`. Motif is
**backlit cast-glass architecture**: every layer is a bar of thick internally-lit
optical glass with frosted sawn ends and brushed-pewter seam channels, stacked
like a curtain-wall tower at dusk. The sheet ties slab colour to the shipping hue
ramp (216 → 130) rather than to an arbitrary palette, so generated art matches
what the canvas draws. Covers background, three ramp positions of slab, the
milestone band, shear offcuts, the perfect flare, the ₹ glass disc, the basalt
plinth, the summit lantern, the HUD icon set and win/loss tableaus.

### Verification

- `pnpm install` + `pnpm build` — **green**: `dist/assets/index-Bv1T3tVo.js`
  408.89 kB (136.43 kB gzip), `index-CbWL_ocX.css` 33.60 kB, built in 2.42 s.
