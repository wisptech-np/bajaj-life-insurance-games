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
  the component's exact resolution. Constants corrected against the spec's
  literal reading — `rootRadius: 98` (the only authored radius; children inherit
  the parent's current maximum less 2 px, so the root sits at k = 7.1-9.5 orbs
  per ripple against a ~4.5 percolation threshold and the decay walks each
  branch back down through it) and the virus penalty reduced from 26 px to 18 px
  (26 px collapsed wave 5 to a 41% clear rate).
- Verified: `pnpm install` and `pnpm build` exit 0; `src/kit/*.js` byte-identical
  to `shared/game-kit/*.js`; no emoji codepoints in any game source (the only
  hit repo-wide is the inherited `✓` in the lead-capture checkbox, which is HTML
  UI copy, not a sprite); no "Guardian Shelter" attribution anywhere in `src/`.

## [2026-07-28] Review fixes

- Removed `ripple.chainRadius`: it was dead config. Children have always been
  sized from the parent's current maximum less `chainDecayPx`, seeded by
  `rootRadius`, so the 76 px value was never read and the percolation rationale
  written around it described a game that was not shipping. Gameplay constants
  are unchanged (honouring 76 px would drop clear rates to 31-40%); the key is
  gone and the rationale in `data.js`, `README.md`, this log and `index.md` now
  describes the real mechanism with k recomputed for the shipped numbers
  (7.1-9.5 at the root, walking down through the ~4.5 threshold at R ≈ 69). The
  sim header no longer prints the removed value, and the gate now prints the k
  figures itself so the documented arithmetic is regenerated rather than
  remembered.
- Made every documented number reproducible from the shipped gate rather than
  from a scratch script: `balance-sim.mjs` gained a `WxH` playfield argument
  (`scaleConfig()` applies the same sqrt-area scaling the component's `fit()`
  does), a cross-device sweep at the end of the default run, and an `oracle`
  strategy that replays the whole cascade from a 6x8 grid on each board to
  measure whether a winning tap existed at all. The old README claims that could
  not be reproduced (a hand-run cross-device table, and an "8x11 grid clears
  99-100%" figure) are now printed by `pnpm balance`.
- Retuned the wave targets for full-run reachability. Five compounding waves
  make the per-wave rate a fifth power, so the previous ladder (27/28/29/30/31,
  ~60-72% per wave) gave a ~11-13% full run against a 20% bar. Stepping the
  whole ladder down one orb still measured 12.9% centroid, so targets were taken
  to **25/25/26/26/27**, which plateaus rather than rising every wave — while
  difficulty keeps rising through orb count, virus count and drift. Default gate
  run: centre 80.0/73.0/72.3/71.0/66.3% (full run 19.9%), centroid
  79.7/69.3/78.3/81.0/72.0% (**full run 25.2%**, above the 20% bar), random
  62.3/47.0/48.3/50.3/47.0% (3.3%), oracle 100/100/100/97.5/97.5% (95.1%). No
  wave exceeds the 80% centre-tap cap. Wave 1 is now literally the brief's
  example, "protect 25 of 40".
- `RESULT_TARGET_SCORE` re-derived for the new balance: 7,400 (~145 orbs
  protected x 40, five wave clears, ~6.2 mean chain depth x 20 x 5).
- Re-verified: `pnpm build` exit 0; `node scripts/balance-sim.mjs` (default)
  reproduces every figure quoted in `data.js`, `README.md` and `index.md`.
