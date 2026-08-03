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

---

## 2026-08-03 — readability revamp ("the mechanics are difficult to understand")

Client review (naming the game *Ripple Radar*): simplify the interaction model,
add visual indicators / tooltips / a short tutorial, **clearly define what each
radar signal represents**, and improve correct-vs-incorrect feedback.

### What was actually confusing

Played the shipped build at 390×844 first. The failure was not subtlety, it was
that the game answered none of the four questions a player has in the first ten
seconds:

1. **Where am I and which way is out?** One tap lit a wavefront; 1.7s later the
   screen was black again. Nothing persisted, so there was no map to plan
   against — only a memory test in the dark. After 25s of play the score was
   still 0 and the route progress was invisible because there was no progress
   readout at all.
2. **What is that thing?** Every revealed object was an unlabelled shape. Two
   red discs on screen could be a spike pool or a lurker and nothing said which.
3. **How do I do anything?** Tap = pulse, hold 0.12s = walk. Two meanings on one
   surface, separated by 120 milliseconds. A slightly slow tap walked you
   somewhere instead of pinging, and the 1.6s cooldown lived as a thin arc
   around the family rather than anywhere the thumb was looking.
4. **Why did that go wrong?** The noise economy — a lurker walks to the spot you
   pinged *from*, not to you — is the whole game, and it was completely
   invisible. Losing a heart produced "Caught in the dark", which names the
   event and not the mistake.

### The interaction model

**Touching the maze always walks. The radar is its own button.** One surface,
one meaning each; `walkArmSeconds` / `walkArmMovePx` are gone from `data.js`.
Walking now starts on touch-down instead of 120ms later, and the cooldown is
the ring drawn around the RADAR button where the thumb already is. The game
fires the opening ping itself at t=1.1s so nobody stares at a black screen
wondering what a pulse is.

### The signal vocabulary

`src/signals.jsx` is the single definition; the How to Play key and the in-game
`?` legend both render from it, so the words, the glyph and the game cannot
drift. **No signal is distinguishable by colour alone** — each has a distinct
shape and a distinct behaviour, and the list survives being read in greyscale:

| Signal | Shape | Behaviour |
| --- | --- | --- |
| Wall | straight line | bright as the ring passes, then a dim memory that stays |
| Risk pool | spiked disc | breathes in and out at 1.5 Hz, forever |
| Shelter | roof chevron | emits its own ring every 2s once found — nothing else does |
| Checkpoint | dashed line across the corridor | goes solid once crossed |
| Bonus orb | four-spoke spinner | turns steadily |
| Lurker | repeating rings from a moving point | leaves **no** memory trace |

That last row is the load-bearing one: **only static geometry is remembered.**
A lurker is alive, so a stale ghost of it would be a lie, and it never gets one.

### The darkness

The darkness was the reason nothing was legible, so it was moved from governing
*whether* you can see to governing *how far ahead you can plan*. Swept geometry
now fades to a memory floor instead of to black (`reveal.memoryFloor` 0.30 for
walls, `reveal.entityMemory` 0.36 for landmarks) and stays there. Geometry that
has **never** been swept is still not rendered at any alpha, and `beginPause`
wipes `chunkMemory` along with every other reveal, so neither the
screen-brightness cheat nor pause-scum gained anything. The vignette came down
from 0.82 to 0.58 so the memory traces survive it.

Walls were drawn with `lineCap: 'round'` per 14px chunk; at memory alpha the
overlapping caps double-composited and the whole map rendered as a **dotted**
line. Measured it with a node probe (410/433 chunks at exactly 0.240, perfectly
contiguous — so the data was right and the compositing was wrong) and switched
that one loop to butt caps.

### Tutorial and indicators

- **Three coached lines** over the live game, each clearing when the player
  *does* the thing (watch the opening ping → walk 60px → fire a manual ping),
  with a 9s timeout so nobody is stuck. Never a blocking modal, never a wall of
  rules before touching anything.
- **First-encounter tooltips.** The first time each signal type is ever
  revealed, an on-canvas plate names it: "RISK POOL — costs a heart", "SHELTER —
  get here", "CHECKPOINT — cross it", "BONUS ORB", "LURKER — hunts your ping".
  One shot each. First pass placed them up-and-right unconditionally and they
  ran off a 320px screen and under the HUD; they are now clamped in screen
  space into a safe rect (inside the canvas, below the HUD pills, above the
  coach line and the radar button).
- **A gold chevron on the family always points along the corridor toward home.**
  The maze is a single corridor, so this gives away no puzzle — it removes only
  the "I have no idea where I am". Route progress ("HOME 34%") in the HUD.
- **`?` button** re-opens the full signal key at any time.

### Right / wrong feedback

- A ping overheard by lurkers now raises "N lurkers heard that ping — they are
  walking to the marked spot", and the origin is marked on canvas with a dashed
  crosshair labelled **THEY COME HERE**. That is the noise economy made visible
  for the first time; cause and effect are on screen together.
- A ping nobody heard floats **CLEAR PING**. New `ev.onHeard` hook in `rules.js`
  is the one rules change that makes both possible.
- Checkpoints and sighting the shelter wash the screen edge **green** — the
  mirror of the existing red hurt wash, from the same place on screen.
- Heart-loss banners now name the cause *and* the correction: "Walked into a
  risk pool / The breathing spiked disc — go round its dark side", "A lurker
  caught you / Ping, then step away from where you pinged".
- A winding-up lunger floats "LUNGING — BACK OFF" on top of the existing shriek
  and edge flash.

### Gate: what moved and what did not

The reveal changes are presentation-only — no rule reads `chunkAlpha` — so
**(a), (b) and (c) are numerically identical before and after**: bot wins in
45.0s with 3 hearts / 5 pulses / 4 orbs / score 1850; 3548 lurker + 6610 spike
losses over 10,000 walks, worst telegraph age 2.40s, staleCatchBlocks 0,
shortest spike warning 0.70s; quiet mean 1903 (40/40) vs spam mean 1209 (27/40),
spam 42.4 vs quiet 6.8 aggro entries per run.

One assertion was made obsolete by the redesign and was changed, deliberately:

- **was** `(d) then fades to black over 0.7s` — asserted `alpha === 0` after
  hold+fade.
- **now** `(d) then fades over 0.7s to the memory floor (not to black)` —
  asserts it settles at exactly `reveal.memoryFloor`, *and* that the floor is
  in (0.05, 0.35] so a swept corridor stays a hint rather than becoming a lit
  room. Reports `alpha mid-fade 0.50, settles at 0.300 (floor 0.3)`.

Three checks added: `(d) pausing wipes the memory map too (no pause-scum)`;
`(c2) onHeard fires once per lurker that overhears a ping` (heard=2 = aggro
delta 2); `(c2) a ping fired out of earshot reports nobody heard it` (start is
500px from the nearest lurker, hear radius 320) — without that pair the "N
lurkers heard that" and "CLEAR PING" feedback could be lying. 16 checks → 21.

### Verification

| Gate | Result |
| --- | --- |
| `node gate.mjs` | **GATE: PASS** — 21/21, numbers above |
| `npx vite build` | pass — `✓ built in 6.82s`, 451.16 kB js / 149.17 kB gzip, 525 modules |
| `node scripts/play-test.mjs risk-radar --all-sizes` | **ok at all four sizes**, zero console/page errors |

Play-test detail — 320×568 canvas 298×546, 390×844 canvas 368×822, 412×915
canvas 390×893, 412×700 canvas 390×678; painted 100% of sampled pixels at every
size; the random-input bot survived the **full 100s clock** at all four (it was
25s+ with no end state before), reached the results screen, and the retry path
remounted the canvas every time.

Screenshots checked by eye at every size, plus a deliberate (not random) drive
through the opening ping, the walk step, a manual ping and the legend, because
a random bot never presses RADAR and this game is mostly black. Confirmed: the
opening ping maps the first area and holds it, all three first-encounter
tooltips land on screen and clear of the HUD at 320px, the coach advances
correctly through all three steps, the RADAR cooldown ring reads at a glance,
and the How to Play card with its six-signal key fits 320×568 with no scroll.

**Not fixed / out of scope:** the lead modal stays mounted over the results
screen after a retry (pre-existing `App.jsx` scaffold behaviour, identical
before this change, and the screen flow was explicitly out of scope). Lead form
remains Name + Mobile only — no email field was added or reinstated.
