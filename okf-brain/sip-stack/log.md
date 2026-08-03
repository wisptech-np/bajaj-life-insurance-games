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

---

## 2026-08-03 — Blocks and UI rebuild (BajajLife review)

Feedback: *"The user interface and stacking blocks are not properly designed —
use clearly defined block assets with consistent dimensions and collision
boundaries; improve movement, drop controls, stacking physics, balance and
collapse; enhance the visual representation of SIP growth; improve the
interface, scoring display, progression and result screen."*

The build agent completed the work but its session ended before it wrote this
entry. The entry below was reconstructed by the coordinator from the diff and
from re-running every gate on the shipped tree — the numbers are measured, not
copied from the agent's report.

**Changed:** new pure module `src/stack.js` (300 lines) and
`scripts/balance.mjs`; rewrites of `src/SipStackGame.jsx` (+818/-372 across the
game), `src/data.js`, `src/Screens.jsx`, `src/App.jsx`, `README.md`, and
`okf-brain/sip-stack/index.md`.

**Geometry contract — the named defect.** `slabFaces()` in `src/stack.js` is now
the only description of a block's shape; the component fills exactly those
polygons and the drop is judged on exactly the same `[x, x + w]` footprint.
Gate PASS 1 asserts the two agree across 224 block widths from 12 px to
122.8 px: **224/224, worst horizontal, vertical and landing-surface
disagreement all 0.000 px.** A drop that looks perfect can no longer be trimmed.

**Input.** The drop is judged at the `pointerdown` timestamp rather than the
kit's `onTap` (which fires from `pointerup` and charges the player the whole
contact duration). Same root cause milestone-hopper hit in this batch.

**Compounding made visible.** Corpus recurrence `corpus x 1.06 + contribution`
per layer, so the first surviving layer ends the run worth **970 pts against
100 pts for the last (x9.70)**, and blocks ripen from brand blue to gold as they
compound. Full-perfect corpus 23,214.

**Verification re-run by the coordinator on the shipped tree:**

- `node scripts/balance.mjs` — **GATE: PASS**. Geometry 224/224 at 0.000 px;
  track 3,136/3,136 states with the slab always fully on canvas and a full miss
  always reachable; 20,000 random drops with 0 rule violations. Players over
  3,000 runs each: precise (12 ms) 100.0%, skilled (35 ms) 96.7%, casual (75 ms)
  0.0%, sloppy (130 ms) 0.0%, random 0.0%.
- `npx vite build` — passes, 418.62 kB / **139.29 kB gzip**.
- `node scripts/play-test.mjs sip-stack --all-sizes` — canvas mounts and paints
  100% at 320x568, 390x844, 412x915 and 412x700; results screen reached and
  retry restores the canvas at every size; **zero console and page errors**.
  Random-bot runs 3-6 s, consistent with the gate's random policy (median 4 s,
  0-10 layers) rather than a defect.

**Open — deliberately not changed by the coordinator.** Casual (75 ms timing
error) wins 0.0% while skilled (35 ms) wins 96.7%: the summit is a stretch goal,
not the pass mark. The results screen grades in three tiers at `targetLayers`
and `35% of targetLayers`, so a casual run still lands a real score (median 24
of 40 layers, corpus 4,909) rather than a bare loss. That is a defensible
score-attack shape and unlike the sub-20-second deaths fixed earlier in this
batch, but the 35 ms -> 75 ms cliff is sharp and is the first thing to revisit
if the client reports the game as unwinnable.

**Housekeeping.** Four stray `shot-*.png` files left at the game root by the
agent's screenshot pass were deleted; `.gitignore` only covered `playtest-*.png`.
