# Risk Radar — build log

## 2026-07-30 — Finished mid-build handoff; game complete

Picked up a half-built game from a previous agent that died mid-build. The
inherited half was the hard half, and it was finished and correct: `data.js`
(full GAME_CONFIG + authored maze), `rules.js` (pure simulation module —
wavefront reveal, lurker state machine, noise economy, fairness backstop,
pause re-acquire), `gate.mjs` (headless verification incl. the 10k-walk
fairness sweep), the §2 scaffold (api.js with `riskRadarLeadNo`, modals,
ThankYouScreen with gradient wash, kit copy, playCount, utils), vite config
(port 5078 / `RiskRadar`) and index.html. The inherited gate passed unmodified
on first run — rules and data needed zero changes.

Built this session:

- `src/RiskRadarGame.jsx` — presentation-only canvas component: camera-follow
  rendering of the reveal grammar (walls white, hazards red + ember-shimmer
  telegraph, exit gold, followers soft blue, lurker gray self-rings, cyan
  pulse wavefront, thumb-ring cooldown HUD around the family), tap-vs-hold
  gesture arming per `walkArmSeconds`/`walkArmMovePx`, local Web Audio synth
  (whoosh, proximity heartbeat 80→140 BPM, shriek, gate chime, footsteps),
  goal-juggler pause/re-acquire wiring (auto-pause → `beginPause` blacks out
  instantly → 3-2-1 behind `endPause`), pooled visuals, no hot-loop
  allocations. Hidden geometry is never drawn at any alpha — every draw is
  gated on `chunkAlpha`/`seenAlpha` > 0.
- `src/App.jsx` — §2 screen flow (guardian-shelter pattern): home → howtoplay
  → game → results (+ auto lead modal) → slot booking → thankyou;
  `startGame()` → `incrementPlayCount()` once; `gameKey` remount.
- `src/Screens.jsx` — bright glassmorphic Home/HowToPlay/Results, all art
  inline SVG/CSS (sonar hero motif with the reveal grammar), stats contract
  `{score, hearts, pulsesUsed, orbs}`, result ring to 1500.
- `README.md`, this OKF pair. Deleted the stale `.debug/` harness.

Verification:

- `pnpm install` OK (lockfile created), `pnpm build` (vite 5.4.21, uat) —
  zero errors, 523 modules, 435.40 kB js / 33.60 kB css.
- `node gate.mjs` — **GATE: PASS**, all 16 checks: (a) scripted bot wins on the
  session seed in 45.0s with 3/3 hearts, 5 pulses, 4 orbs, score 1850,
  deterministic replay; (b) 10,000 random walks, 3,548 lurker + 6,610 spike
  heart losses, every one telegraphed (worst age 2.40s vs 3.2s limit),
  fairness backstop never fired, shortest spike warning 0.70s; (c) quiet bot
  mean 1903 (40/40 wins) vs spam mean 1209 (27/40), spam draws 42.4 vs 6.8
  aggro entries/run; (d) reveal lights on wavefront crossing (0.292s vs
  ~0.289s expected), holds 1.0s, fades 0.7s, nothing lit before a pulse or
  beyond 400px; idle canary untouched.
- Emoji grep over src: only the allowed `✓` in the verbatim LeadCaptureModal.
- Kit files byte-identical to `shared/game-kit/` (cmp, all 7).

---

## 2026-07-31 — lead form trimmed, how-to-play rebuilt as animation, asset sheet

Three scoped changes. No gameplay touched: `data.js`, `rules.js` and
`RiskRadarGame.jsx` are byte-identical, so the pulse model, the noise economy,
the telegraph invariants and the maze are all unchanged.

**G1 — email field removed.** `src/LeadCaptureModal.jsx` lost `EMAIL_RE`, the
`email` state, the "Email Field" block, the `errs.email` branch, both
`lastSubmittedEmail` sessionStorage calls, and `email` from the `submitToLMS`
call and both `onSubmitted` payloads. `api.js` untouched — it already sends
`email_id: email || ''`. Name + Mobile + T&C unchanged. Grep for `email` over
`risk-radar/src` is now empty.

**G2 — `HowToPlayScreen` is now one animated demo.** Deleted: the three numbered
`Beat` paragraphs, the seconds/hearts/checkpoints/orbs paragraph, the four
scoring chips, the `Beat` and `BeatFrame` components and the now-unused
`rrChip` / `rrWalk` keyframes. In their place `DemoMaze()` renders a 214×225
pitch-black maze and runs one 5.6 s loop of the actual reveal grammar: a finger
taps, the cyan wavefront expands from the family, and wall chunks light **in the
order the front reaches them** — near at ~16% of the cycle, mid at ~22%, far at
~33%, each holding then fading behind the front, exactly the "expanding ring,
not a floodlight" behaviour `gate.mjs` asserts. The spike pool, the hidden orb
and the gold shelter show only while swept; nothing is drawn before the pulse.
Then the finger holds up-field and the family walks to it, the two followers
trailing on the same track via `animation-delay` (0.17 s / 0.34 s), which is
literally "followers walk your exact footsteps". Meanwhile the lurker leaves for
the spot the pulse came FROM — the pass window — and its own grey telegraph ring
(the shipped `rr-ping-sm`, reused) keeps running even in the dark, so the demo
also shows the fairness rule that nothing is ever unrevealed.
Remaining text: the "How to Play" heading, three icon-led cues (TAP TO PULSE /
HOLD TO WALK / NOISE DRAWS THEM) and the Play button. Nothing else. Card 340 px
wide; stack measures ~430 px, so 360×640 fits with no scroll (`overflow: hidden`,
was `overflowY: auto`).

**G3 — `asset-from-here.md`,** 14 Nano Banana prompts on the motif *rim-lit clay
diorama in a blackout room*: every asset is a matte unglazed clay maquette
photographed with one hard raking light, 80–95% of it falling into absolute
black, only a single lit contour visible — the premise of the game made literal.
Camera is low eye-level 3/4 (down in the maze), never plan view, with an explicit
ban in the sheet on flat vector, blueprint linework, phosphor glow and evenly lit
subjects. Covers the void background, the family, the tileable wall chunk, the
spike pool, the lurker, its grey telegraph ring, the shriek edge-flash, the
shelter, the hidden orb, the gate checkpoint, the pulse wavefront, the heart pips
and both result-screen pieces.

**Verification**

| Gate | Result |
| --- | --- |
| `pnpm install` | pass |
| `pnpm build` | pass — `✓ built in 5.85s`, 437.66 kB / 145.10 kB gzip |
| `node gate.mjs` | **PASS** — all (a)–(d) sections, including "before any pulse, no geometry is rendered at any alpha" and the wavefront timing checks |
