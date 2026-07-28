---
type: log
title: Ripple Shield Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/ripple-shield/log.md
timestamp: 2026-07-28
---

# Ripple Shield Change Log

## [2026-07-28] Initial build

- Scaffolded from `guardian-shelter/` exactly as `milestone-hopper/` was: shared
  `App.jsx`, screens, lead-capture / slot-booking / thank-you modals, `api.js`,
  `playCount.js`, `crypto.js`, `shortener.js`, plus an unedited copy of
  `shared/game-kit` in `src/kit/`. Identity: package `ripple-shield`, rollup
  output `RippleShield`, dev port 5046, `LEAD_NO_KEY = rippleShieldLeadNo`,
  `summaryDtls = 'Ripple Shield Lead'`. Zero "Guardian Shelter" strings survive
  anywhere in `src/`.
- Built the chain reaction per spec: 40-60 drifting orbs per wave (blue family,
  green virus), one tap per wave that sends an expanding shield ripple, every
  family orb the ring sweeps spawning its own ripple, viruses eating 18 px of
  the parent ripple's remaining reach, per-generation decay so a chain
  terminates on its own, and a wave that ends when the last ripple expires. Five
  waves with rising targets (27/28/29/30/31) inside a 120 s session; win is all
  five targets cleared, lose is any target missed or the clock running out.
- Input is press-to-aim, release-to-fire rather than the kit's `onTap`: a tap is
  only classified under 250 ms and 12 px, and aiming a single shot is exactly
  the gesture a player takes longer over. Holding shows a reticle with the
  ripple's actual reach, which is also how the mechanic teaches itself.
- Rendering is additive-blended bloom: a scaled unit-radius gradient disc, a
  bright leading ring and a trailing echo per ripple, over pre-rendered orb
  sprites whose glow is baked into the bitmap rather than applied with
  `shadowBlur` 60 times a frame. Backdrop, sprites and both ripple gradients are
  rebuilt only on resize. All art is canvas or inline SVG — no emoji sprites, no
  image files. Audio is the kit Web Audio synth, unlocked on the first pointer
  gesture.
- Juice via the shared kit: pooled particles on every protected orb, virus
  strike, tap and wave clear; floating `CHAIN n` text every fifth orb; screen
  shake on a virus strike; hit-stop plus a 0.9 s slow-motion beat and a blue
  wash when a cascade passes 15 orbs; spawn pop with overshoot; contact flash
  rings; animated score counter; a protected ticker that pops on each increment;
  animated screen transitions and a reduced-motion fallback.
- Orb and ripple pools are allocated once at mount and reused for every wave of
  every replay; contact is a monotonic ring-crossing test so each ripple touches
  each orb exactly once with no hit sets; particle counts are scaled by the kit
  device budget. Nothing in the hot loop allocates. HUD numbers are written
  through refs, never React state.
- Balance: `scripts/balance-sim.mjs` imports the shipped `data.js` and replays
  the component's exact resolution. Three constants were corrected against the
  spec's literal reading — ripple radii placed just above the continuum
  percolation threshold (chain radius 76 px, k ≈ 5.4 orbs per ripple against a
  ~4.5 threshold; the obvious 104 px covered the whole board from any tap), the
  virus penalty reduced from 26 px to 18 px (26 px collapsed wave 5 to a 41%
  clear rate), and a target ladder rising by one orb per wave instead of a flat
  share of the board. Measured over 600 boards per wave: centre-tap clear 72.5 /
  60.8 / 66.8 / 62.3 / 59.3%, random tap 52 / 41 / 41 / 42 / 31%, best-of-grid
  replay 99-100%, mega-chain 88-95%, worst cascade 3.5 s, full-run centre-tap
  win 10.9%. Re-running on four playfields from 344x520 to 400x760 keeps every
  wave within 51-70%, confirming the sqrt-area length scaling.
- Verified: `pnpm install` and `pnpm build` exit 0; `src/kit/*.js` byte-identical
  to `shared/game-kit/*.js`; no emoji codepoints in any game source (the only
  hit repo-wide is the inherited `✓` in the lead-capture checkbox, which is HTML
  UI copy, not a sprite); no "Guardian Shelter" attribution anywhere in `src/`.
