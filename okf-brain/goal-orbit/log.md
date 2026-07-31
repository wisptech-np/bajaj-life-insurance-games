---
type: log
title: Goal Orbit Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/goal-orbit/log.md
timestamp: 2026-07-28
---

# Goal Orbit Change Log

## [2026-07-28] Gameplay implementation

- Built the full orbit-switch arcade per spec: seeded generation of a 21-node
  planet chain (20 to reach) under spacing, rise and ring-clearance constraints,
  a tangential one-tap release with an assisted capture band and an eased
  gravity-well pull-in, an angular-speed ramp across the chain, coins on the
  ideal transfer line, sweeping green virus asteroids, three lives with a
  respawn-on-last-planet beat and invulnerability window, milestone banners every
  5th planet, and the 20-planet / 120-second win and lose states.
- Split the orbital model into `src/orbit.js` as pure functions — angular speed,
  launch speed, `transferWindow`, `flyRelease`, asteroid motion, `verifyGap`,
  `buildChain` — so that `tools/balance-sim.mjs` can import the shipping model
  and the shipping constants rather than a paraphrase of them.
- Rendering is canvas with offscreen pre-rendered sprites for the five planet
  builds, the gravity wells, the three-layer parallax star field and the virus
  rocks; the comet head, tail, orbit trail, rings and release-window hint are
  drawn programmatically. All art is canvas or inline SVG — no emoji sprites, no
  image files. Audio is the kit Web Audio synth, unlocked on the first gesture.
- Juice via the shared kit: pooled particles on release, capture, coin, perfect
  transfer, hit, milestone and win; floating score text; screen shake and
  hit-stop on damage; animated score counter; animated screen transitions.
- HUD is DOM over the canvas, written through refs so the fixed-step physics tick
  never re-renders the tree.

## [2026-07-28] Balance gate

- `tools/balance-sim.mjs` re-run at 250 chains (5,000 gaps) against the shipped
  constants. Geometry: 0 unreachable releases; release window 0.77-1.18 rad =
  0.33-0.87 s (p50 0.51 s); 21.6 ms to generate a chain. Asteroids: 28 per chain,
  0 gaps left blocked, clear-release fraction min 0.47 / p50 0.69, worst-case wait
  1 orbit loop. Agents: well-timed dodger 100% win / mean 4,731; decent dodger
  99.6% win in 44.8-99.5 s (p50 64.5 s) / mean 4,704; the same agent ignoring
  rocks 0.4% and ~10 planets; random taps 0% and 0.6 planets.
- Six corrections against the brief's literal reading are documented inline in
  `src/data.js` and argued in the game README's "Balance notes": logical-unit
  generation, `launchBoost 1.6` with a `[150,300]` clamp, `omegaStart 1.35`,
  transfer-line asteroid anchoring, the radius/half-span ratio, and the per-gap
  solvability simulation.

## [2026-07-28] Screens polish, identity and docs

- Replaced the scaffold-copied `Screens.jsx` (still carrying the gold standard's
  copy and artwork) with Goal Orbit screens built from CSS-animated inline SVG:
  Home hero is two goal planets with gravity wells, dashed orbit rings, a comet
  riding the near orbit, a coin-dotted transfer arc and a drifting virus rock
  over a three-layer star field; How to Play is a 3-beat animation (tap release
  along the tangent, timed transfer with the capture lock, rock dodge); Results
  carries the score ring against `RESULT_TARGET_SCORE`, goals / coins / perfects
  tiles, four milestone chips and Book a Slot (orange primary) / Retry / Home.
  Title "Goal Orbit", tagline "Stay on track. Orbit every life goal.", control
  line "Tap to leave orbit · Time your transfer · Dodge the virus asteroids".
  All animation is disabled under `prefers-reduced-motion`.
- Identity verified end to end: port 5050, rollup output `GoalOrbit`,
  `LEAD_NO_KEY = 'goalOrbitLeadNo'`, `summaryDtls = 'Goal Orbit Lead'`, index.html
  title "Goal Orbit — Bajaj Life", slot-booking remark "Goal Orbit Slot Booking",
  lead-capture summary "Goal Orbit - Post Game Lead". Zero references to the
  scaffold source game remain in `src/` copy or share strings.
- Stats contract is `onWin/onLose({ score, planets, coins, perfects })` and
  `ResultsScreen` renders exactly those keys.
- Wrote `README.md` (concept, hook, controls, scoring, win/lose, port 5050, build
  commands, balance notes with the measured tables) and these OKF notes.

### Verification

`pnpm install` and `pnpm build` (uat) both exit 0 — 524 modules, 431.6 kB JS /
33.0 kB CSS. `node tools/balance-sim.mjs 250` passes all three gates. Emoji-sprite
grep over `src/` is clean (the only non-ASCII glyph is a `✓` in the lead-capture
checkbox, which is HTML UI copy, not a game object). Attribution grep is zero.
`src/kit/` left byte-identical to `shared/game-kit/`.

---

## 2026-07-31 — Lead-form / how-to-play revamp

**G1 — email removed from lead capture.** `src/LeadCaptureModal.jsx` no longer
collects an email address. Deleted `EMAIL_RE`, the `email` `useState` (and its
`lastSubmittedEmail` sessionStorage read), the optional-email validation branch,
the whole "Email Field" `sl-lead-field` block, the `lastSubmittedEmail`
sessionStorage write, and the `email` key from both the `submitToLMS({...})` call
and the two `onSubmitted({...})` payloads. `src/api.js` is untouched: `submitToLMS`
already sends `email_id: email || ''`, so omitting the key keeps the LMS payload
shape byte-identical. Name, mobile (`^[6-9]\d{9}$`) and the T&C checkbox are
unchanged. Grep confirms no `email` / `lastSubmittedEmail` reference survives
under `src/`.

**G2 — `HowToPlayScreen` is now animation-first.** Deleted the three numbered
instruction beats, the `Beat` component behind them, the milestone/target
paragraph and the hidden defs-only `<svg>` the beats needed. In their place is
`DemoTransfer`: one looping 4.2 s SVG of a single real transfer — the comet
circles the blue planet, a finger taps, it leaves along the **tangent**, crosses
a line of coins past a drifting green virus rock, and the gold milestone
planet's capture ring locks it in.

The geometry is not eyeballed. With the source planet at (66,132) on a 32 px
orbit and the target at (224,56), the release point that makes the straight leg
genuinely tangent is the solution of "AR perpendicular to RB" — i.e. the
intersection of the orbit circle with the circle on AB as diameter. Solving that
gives R = (57.6, 101.1), which is the keyframe the comet actually departs from.
That matters because the single thing a new player misreads about this game is
that release is *tangential, not aimed*; a demo whose straight leg visibly left
the circle at the wrong angle would teach the wrong model. The comet's orbital
leg is likewise four points sampled off the real r=32 circle rather than a
hand-drawn arc. Planets, rings, wells, comet and virus rock are the existing
`Planet` / `Comet` / `VirusRock` / `OrbitDefs` components, so the demo is drawn
from the same source as the Home screen and the canvas.

Remaining text: heading, three icon-led cues ("Tap to release", "Reach the ring",
"Dodge green risk" — all ≤ 4 words), Play button. Card capped at 344 px with
`overflow: hidden`; fits 360×640 without scrolling. The seven `goB1*`/`goB2*`/
`goB3*` keyframes are replaced by seven `goD*` keyframes, all added to the
existing `prefers-reduced-motion` kill switch. `goWell`, `goDash`, `goCoinPop`
and `goDrift` were left alone — the Home screen still uses them.

**G3 — `goal-orbit/asset-from-here.md` added.** 13 Nano Banana prompts committed
to a single motif: **layered cut-paper diorama** — every object assembled from
stacked coloured card with visible 1–2 mm edge thickness, soft contact shadows
between layers, deckled fibrous cut edges and matte paper tooth, lit by one soft
studio light. Depth comes from stacking, never from rendering: a planet is three
offset discs rather than a shaded sphere, a gravity well is stacked translucent
vellum rather than a radial gradient, a coin spin is achieved by narrowing the
face disc while the thickness edge stays visible. Every prompt explicitly forbids
glow, bloom and gloss, which is what keeps it away from the obvious sci-fi
default and away from the other four sheets in this batch. The sheet also
restates that green is the *only* colour risk may be, since the virus rock is
the one asset a generator would happily recolour. Covers the space backdrop, the
blue goal planet, the gold milestone planet, the three remaining planet builds,
the orbit ring, the gravity well, the comet, the virus asteroid, the coin, the
release ping, the capture lock, the HUD glyph set and the result art.

**Not touched:** gameplay, balance, `orbit.js`, chain generation, asteroid
timing, HUD layout, `ResultsScreen`, `HomeScreen`, `data.js`, `api.js`,
`src/kit/`. `tools/balance-sim.mjs` was not re-run — nothing this change touches
is reachable from it.

**Build:** `pnpm install` + `pnpm build` exit 0 —
`dist/assets/index-DAU8O2P7.js` 431.55 kB / 143.74 kB gzip, built in 2.85 s.
