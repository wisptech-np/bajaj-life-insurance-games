# Wealth Merge — build log

## 2026-07-29 — initial build

Built `wealth-merge/` (dev port 5072), the Suika/watermelon-style
drop-and-merge collector, cloned from the `guardian-shelter/` gold-standard
scaffold. Vite 5 + React 18.3.1, isolated app, pnpm only, no physics
dependency — the circle physics is hand-rolled in a pure module.

**Scaffold.** `package.json` (name `wealth-merge`), `vite.config.js`
(rollup output name `WealthMerge`, port 5072, LMS defines kept), `index.html`
(viewport per §6, Poppins). Copied verbatim from `guardian-shelter/src/`:
`main.jsx`, `index.css` (comment headers re-identified), `SlotBookingModal.jsx`,
`LeadCaptureModal.jsx` (title/summary text only), `services/playCount.js`,
`utils/crypto.js`, `utils/shortener.js`. `api.js` copied with
`LEAD_NO_KEY = 'wealthMergeLeadNo'`, default `summaryDtls: 'Wealth Merge
Lead'`, slot remark `'Slot Booking via Wealth Merge'`; modal posts
`'Wealth Merge - Post Game Lead'`. `src/kit/` copied byte-identical from
`shared/game-kit/` (verified with `cmp` on all seven .js files; sync script
not run per the brief). `ThankYouScreen.jsx` uses the gradient-backdrop
variant (goal-juggler precedent) instead of guardian-shelter's version, which
imports a guardian-specific PNG — the game ships zero binary assets.
`grep -ri "guardian" src/` is zero.

**Screen flow.** home → howtoplay → game → results (+LeadCaptureModal when no
lead) → [Book a Slot → SlotBookingModal] → thankyou. `startGame()` calls
`incrementPlayCount()` once; `gameKey` remount for instant restart.

**Game.** All numbers in `GAME_CONFIG` (`src/data.js`):

- 8 tiers, radii 12/16/22/30/40/54/72/96 (×~1.35), triangular merge scores
  1/3/6/10/15/21/28/36 × chain multiplier (x1, x1.5, x2, x3, then +1).
- Play space 360×480 logical, jar walls at x=14/346, floor 466, mouth 74,
  danger line 18% down the interior. Drag to aim (clamped inside the walls),
  release to drop; ghost landing preview; next piece 0.4 s after release,
  preview shown; droppable tiers 1–4 weighted 4:3:2:1, shifting to 1:3:3:2
  at 40 s.
- Physics: gravity 1500, restitution 0.15, friction 0.4, linear damping 0.6/s
  + settle damping 6/s, fixed 1/120 s kit step (60 Hz × 2 substeps), 4 solver
  iterations (impulse + positional correction, mass ∝ r², slop 0.4,
  correction 80%), speed clamp 1600. Deterministic: RNG picks tiers only; the
  only non-integrator impulses are the fixed merge pop (130 up) and jostle
  (90 outward with falloff) — the cascade engine.
- Merge pass on post-solver positions, contact epsilon 1.5 px,
  `mergedThisFrame` guard so no token double-merges in one step; chain window
  1.0 s. Creating tier 8 wins instantly.
- Overflow: resting token (speed < 20, age > 0.5 s) above the line arms a
  continuous 2.0 s countdown — flashing line, red band, heartbeat alarm,
  on-canvas count; countdown resets the moment nothing rests above the line.
- Session 100 s; win at score ≥ 300 on expiry or Corpus; anti-stall auto-drop
  at 5 s held (with a closing telegraph ring); pause-scum closed with the
  goal-juggler two-phase re-acquire (1.5 s frozen 3-2-1 with the session
  clock held via `shouldTickClock`, then 0.25 s live input lock), implemented
  in `physics.js` (`beginPause`/`endPause`/`isFrozen`/`isInputLocked`).

**Presentation.** Per-tier sprites pre-rendered to offscreen canvases at
device resolution: radial-gradient body, bevel crescents, rim, white emblem
silhouette with punched details (stroked rupee mark, coin stack, ingots,
piggy, SIP jar, shield+check, home, vault wheel), gloss + sparkle. Corpus
pulses a live glow. Merge pop = squash-and-stretch + 12/22-particle radial
burst + `audio.combo(tier pitch + chain depth)` — pitch rises one semitone
per chain step. Chain chip + growing score fly-ups, jelly wobble on landings,
screen shake reserved for tier-6+ merges (plus hit-stop), floating score
text, 0.3–0.5 s screen transitions, animated results counter. Web Audio synth
only, unlocked on first gesture; haptics via the kit. HUD score via
`textContent` ref; React state only for values that change rarely, behind
change guards. Pools allocated at mount; no per-frame allocations in the hot
loop (the danger-line gradient is built only while the alarm is active).

### One physics bug found and fixed during the build

**Phantom velocity in resting stacks made the overflow test unsatisfiable.**
Gravity injects `g·dt` of velocity into every token every step, and 4 solver
iterations cannot cancel all of it high up a 7-token column — positional
correction held the pile visually still while tokens near the top retained a
constant ~68 px/s stored velocity, so the "at rest = speed < 20" overflow arm
never fired and the jar could pile above the line forever. Fixed with
displacement-based velocity reconciliation after the solver (PBD-style,
applied only when the step's actual displacement is below rest speed, so
genuine bounces are untouched). Verified: the debug column now settles to
< 1 px/s and overflow ends the run at 2.14 s (settle + the 2.0 s grace).

### Verification

- `pnpm install` — clean (pnpm 10.29.2).
- `pnpm build` (mode uat) — **green, zero errors**: 524 modules,
  `dist/assets/index-oZy5SpxQ.js` 422.26 kB (140.45 kB gzip),
  `index-bneSBdfR.css` 33.60 kB, built in 2.13 s. No dev server left running.
- Headless physics smoke (18/18 pass): same-tier merge → next tier at contact
  midpoint; triangular × multiplier scoring; single survivor token; pile
  settles below rest speed with zero tokens outside the jar; cascade chains
  (depth 2, x1.5 observed); column above the line loses via `overflow` inside
  the grace window; auto-drop fires while idling (2 drops in 12 s, all auto);
  freeze after resume holds the world byte-for-byte and refuses drops, then
  releases; expiry below target loses (`time`) and at target wins (`target`);
  two Homes forge the Corpus and win instantly (`corpus`); weighted picks
  stay in tiers 1–4; stats contract `{score, bestTier, merges, maxChain,
  drops}`.
- Balance probe (30 seeded 100 s sessions per profile): **idle 0% win**
  (28 overflow / 2 time — auto-drops fill the jar with unmerged clutter);
  random-aim dropper at ~1.4 s cadence 93% win (median 911 pts, 11 Corpus);
  aimed matcher 93% win (15 Corpus). The 300 target and all weights are the
  briefed constants; the game is generous to any active player and
  unwinnable by idling, which is the briefed anti-exploit shape.
- Perf probe: 32.5 µs per 1/120 s step with a live jar in Node —
  ~0.07 ms/frame at 60 fps, comfortable low-end headroom.
- Emoji grep over `src/`: only the gold-standard modal's HTML checkbox tick
  and code-comment arrows — no emoji as canvas sprites.
- Lead capture, slot booking, playCount wired per §2 (copied files, key and
  summary strings re-identified only).

### Deviations from the brief, with reasons

1. **`ThankYouScreen.jsx` is the gradient-backdrop variant**, not a verbatim
   guardian-shelter copy — the original imports `guardian_shelter_bg.png`,
   an asset of another game. Follows the goal-juggler precedent; markup and
   flow identical.
2. **`SlotBookingModal.jsx`/`api.js` identity strings renamed** ("Guardian
   Shelter" → "Wealth Merge" in remarks) beyond the two listed api.js edits —
   leaving another game's name in CRM remarks would misattribute leads; same
   treatment every sibling game applied.
3. **Re-acquire freeze is 1.5 s** (brief floor: ≥ 600 ms) — matches the
   shipped goal-juggler pattern the brief says to copy, with the 3-2-1 count.
4. **Added displacement-based velocity reconciliation** (not in the spec's
   physics list) — required to make the spec's own "at rest, speed < 20 px/s"
   overflow rule reachable in tall stacks; see the bug note above.

## [2026-07-31] Revamp: email field removed, animated how-to-play, asset sheet

**G1 — email field removed.** `src/LeadCaptureModal.jsx`: deleted `EMAIL_RE`, the
`email` `useState`, the whole "Email Field" `sl-lead-field` block, the
`errs.email` validation branch, and both `sessionStorage` touches of
`lastSubmittedEmail`. Dropped `email` from the `submitToLMS({...})` call and from
both `onSubmitted({...})` payloads. `api.js` untouched — `submitToLMS` already
sends `email_id: email || ''`, so the LMS payload shape is unchanged. Name +
Mobile + T&C unchanged. Grep for `email` outside `src/kit/` and `src/api.js`
returns zero hits.

**G2 — `HowToPlayScreen` rebuilt as animation-first.** `src/Screens.jsx`:
- Deleted all three numbered instruction paragraphs and the `+3 MERGE!` floating
  text that the old demo drew inside the jar.
- The old demo was a 170 px DOM box showing a single drop and one merge. Replaced
  with a 300×230 inline-SVG jar on a module-level `TUT_CSS` timeline (6.4 s):
  the finger drags along the mouth with the game's real dashed drop guide under
  it, releases; the token falls, bounces and settles touching an identical twin;
  both vanish into a gold burst ring and the next tier pops out at the contact
  point — and because that result is itself a twin of its neighbour, a **second**
  merge fires 1.4 s later inside the chain window, with three ascending mint
  chevrons standing in for the multiplier. The cascade, which is the actual
  scoring engine, is now shown rather than described.
- The jar is drawn as real glass with the always-visible dashed red danger line
  pulsing across the mouth, so the overflow rule needs no sentence.
- The 8-tier ladder strip is kept as pure shapes; its `>` separators were dropped
  so the whole screen is wordless apart from the three labels.
- Remaining text: the "How to Play" heading, three icon-led labels (`DRAG AND
  DROP`, `SAME TIERS MERGE`, `STAY BELOW LINE`), and the Play button.
- Container switched from `overflowY: auto` to `overflow: hidden`; measured stack
  is ~510 px so it fits 360×640 without scrolling. Added a
  `prefers-reduced-motion` kill switch, which this screen previously lacked.

**G3 — `wealth-merge/asset-from-here.md`.** 12 Nano Banana prompts on a
"blown-glass apothecary jar in a bioluminescent night" motif — translucent glass
spheres with the emblem suspended *inside* them, everything lit from within
rather than by a lamp, meniscus curves and caustic rings, soft edges throughout.
Includes a single eight-token ladder sheet so the tier progression stays
consistent, plus the jar, the corpus token, the merge burst, the chain glyph, the
danger line, the drop guide, two HUD pieces and both result illustrations.

**Not changed:** gameplay, balance, `physics.js`, the tier table, merge or chain
rules, the overflow grace window, HUD layout, `ResultsScreen`, `HomeScreen`,
canvas artwork, `data.js`, `api.js`, `src/kit/`.

**Build:** `pnpm install && pnpm build` — exit 0, `✓ built in 2.54s`
(`dist/assets/index-OfumB4RS.js 425.37 kB │ gzip: 141.22 kB`).
