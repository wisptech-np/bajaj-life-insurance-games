# Legacy Echo — build log

## 2026-07-29 — initial build

Built `legacy-echo/` (dev port 5075) per the batch-6 brief: time-loop
past-self co-op where previous runs replay as live ghost helpers. Cloned
scaffold from `guardian-shelter/`; Vite 5 + React 18.3.1, isolated app, pnpm
only, no workspace.

**Scaffold.** `index.html`, `package.json`, `vite.config.js` (rollup output
name `LegacyEcho`, server port 5075, `__LMS_BASE_URL__` /
`__LMS_UPDATE_BASE_URL__` defines kept), `main.jsx`, `index.css`,
`LeadCaptureModal.jsx`, `SlotBookingModal.jsx`, `api.js`,
`services/playCount.js`, `utils/crypto.js`, `utils/shortener.js` copied from
guardian-shelter with identity strings only changed. `ThankYouScreen.jsx`
replaces the guardian PNG backdrop with a gradient wash (goal-juggler
precedent) — the game ships with zero binary assets. `src/kit/` copied from
`shared/game-kit/` manually and verified **byte-identical** (md5 compare, all
7 files OK); `scripts/sync-game-kit.mjs` was not run.

**CRM identity.** `LEAD_NO_KEY = 'legacyEchoLeadNo'`, default
`summaryDtls: 'Legacy Echo Lead'`, modal posts
`'Legacy Echo - Post Game Lead'`, slot remarks `'Legacy Echo Slot Booking'` /
`'Slot Booking via Legacy Echo'`. Screen flow per standard: home → howtoplay
→ game → results (+ lead modal when no lead) → book slot → slot modal →
thankyou; `startGame()` calls `incrementPlayCount()` once; `gameKey` remount
for instant restart.

**Architecture.** All rules live in the pure module `src/rules.js` (no DOM,
no React, no import of `data.js` — config is a parameter, presentation is an
optional callback bag), so `gate.mjs` runs the shipped simulation headless.
`src/data.js` holds every tunable (`GAME_CONFIG`, `COLORS`, `GHOST_TINTS`).
The component (`src/LegacyEchoGame.jsx`) contains no rules.

**Ghost replay implemented exactly per brief.** 60 Hz decimation of the
120 Hz fixed-step sim into a preallocated `Float32Array(1080 * 3)` of
`(x, y, actionBits)` per loop (~13 KB); bit0 = carrying. Replay is pure array
playback indexed by the integer loop tick (`tick >> 1`); plates, levers and
beam blocking are evaluated per tick from positions for player and ghosts
uniformly. Beam schedule keys off the loop clock + a session-seeded
(`mulberry32`) phase, fixed for the whole session, so the world is
bit-identical on every loop. Never re-simulated from inputs.

**Anti-pause-scum.** Kit `loop.js` auto-pauses on `visibilitychange`; the
kit is immutable, so the rule lives in `rules.js` (`beginPause` / `endPause`
/ `isFrozen` / `isInputLocked`) driven from the component's `onPause`: resume
freezes the world AND the single master loop clock behind a visible 3-2-1
count (1.5 s ≥ the 1.2 s minimum), then a 0.35 s live input lock under the GO
beat. Ghosts and world share one tick counter, so a pause can never desync
the cast. Gate check (d) proves the clock holds and input is refused.

**Map.** 390x780: central spine (chest route) with doors at y 580/390/200
(1/2/3 plates), free wings for plates/levers, muster zone at the bottom,
family vault at the top (threshold y=80). Beam corridor at y=140 (12 px band,
on 1.2 s / off 1.0 s). Twin levers at (40,130)/(350,130) — 310 px apart,
0.5 s sync window — open the right-wing coin alcove. 5 coins (3 in the
door-gated spine, 2 in the alcove), persistent once taken. Chest carry slows
260 → 180 px/s and the wings read as solid while carrying ("the chest only
fits through the vault doors").

### Verification

- `pnpm install` — clean (pnpm 10.29.2, 14.3 s).
- `pnpm build` (mode uat) — **green, zero errors**: 525 modules,
  `index-Cy2xrun_.js` 429.63 kB (142.43 kB gzip), `index-v4scUYR6.css`
  33.00 kB, built in 2.18 s. No dev server left running.
- `node gate.mjs` — **ALL GATES PASS** (7/7):
  - PASS solvable: expert plan wins in exactly 4 loops on every seed
    (1, 7, 20260729, 424242, 987654321 — the seed moves the beam phase).
  - PASS solvable: casual plan (two simple repositions) wins within 5 loops
    on every seed.
  - PASS scoring: delivery + unused-loop bonus lands — score=1577, coins=3,
    doors=3, redundant=0.6 s on the reference seed.
  - PASS anti-AFK: idle bot never wins — all 5 loops burn at the 4 s check,
    0 ghosts, score 0.
  - PASS ghost track recorded as a 60 Hz state track — 1080 samples (13 KB).
  - PASS ghost replay deterministic — two replays of the same track in fresh
    same-seed worlds produce identical interaction timelines (243 entries:
    plate/door/beam/lever/coin events + sampled ghost positions, compared
    byte-for-byte).
  - PASS anti-pause-scum — frozen=true, clockHeld=true, inputRefused=true,
    inputBack=true.
- Emoji scan (Node, full emoji ranges over `src/`, `gate.mjs`,
  `index.html`, `README.md`) — clean except the `✓` checkbox tick inside the
  verbatim-copied `LeadCaptureModal.jsx`, which is HTML UI copy explicitly
  allowed by GAME_STANDARD §8.3; zero emoji as canvas/game sprites.
- Kit md5 compare vs `shared/game-kit/` — all 7 files identical.

### Quality bar

Programmatic canvas only: prerendered backdrop (spine, wings, walls, vault
glow with roof + family marks, plate sockets with door numbers, lever
housings, beam emitter, chest podium), sliding two-panel doors with a
counterweight "k/n bodies" chip, plate latch glow + click synth, beam with
pre-warn flicker, white-hot core, ghost-blocker spark point and screen shake
+ knockback + stun on a hit, spinning gold coins, bobbing policy chest,
ghost bodies with per-loop hue + badge + state-track trails + faded ghost
chest when their bits say they carried, echo spawn-flash rings with labels,
inter-loop rewind: 0.8 s reverse playback of the player's own track with
afterimage blur + scanlines + a two-saw wow-flutter tape-whir synth, "LOOP
N" cards, delivery celebration (26+16 particle bursts, floating text,
victory fanfare), animated score ring on Results. Hot loops allocation-free:
paints (bodies, chest, coin, doors, beam) prebuilt once; HUD labels cached
per state; timeline bar driven via ref style writes; React state behind
change guards. Audio = kit synth voices + a small sibling synth
(`src/sound.js`) for whir/latch/door-slide, both lazily unlocked on first
gesture and suspended on pause. Full teardown on unmount.

### Deviations from the brief (with reasons)

1. **"Loop 1 solvable solo" is read as door 1 being fully operable solo**
   (stand on its single plate, watch the gate open, learn the latch), not as
   a solo chest delivery — with hold-to-open doors a solo delivery through
   door 1 is impossible by definition, and the brief's own ramp ("door 2
   needs 1 ghost") uses the same counting.
2. **Coins are placed 3 behind doors + 2 behind the twin-lever gate** rather
   than all 5 strictly behind doors: the lever pair needs a reward for the
   "impossible solo" sync, and all 5 remain reachable only with echo
   cooperation, which is the property the brief names.
3. **Coins persist across loop resets** (the world otherwise hard-resets):
   re-spawning collected coins would let one door-2 opening be farmed for
   60 points per loop. The score cap stays 5 coins as specified.
4. **Session length is ~97 s** (0.9 s intro + 5x18 s + 4x1.5 s rewind)
   against the brief's "~99s" — the echo-marker flash overlaps the first
   1.2 s of play instead of being its own blocking phase, keeping the session
   inside the 120 s hard cap with margin.
5. **`sessionSeconds` on the kit loop is null** — the session/loop clock
   lives in `rules.js` (the master tick), because the kit clock cannot be
   frozen per-phase (intro/rewind/re-acquire) and the single-clock property
   is the whole anti-desync argument.

### Deferred minors

1. The beam's "sweep" is a schedule (on/off duty cycle with seeded phase)
   rather than a travelling emitter; the block-for-everyone-behind rule is
   implemented as specified. A moving sweep would change none of the
   interaction rules and can be layered on later.
2. Ghost trail rendering reuses track samples directly; on the first ~0.5 s
   of a loop the trail is necessarily short.
3. `kit/input.js` is single-pointer (kit-inherited): a resting second finger
   swallows input. Documented repo-wide; kit is immutable.

## 2026-07-31 — Lead-form slim, animation-first tutorial, asset prompt sheet

**G1 — email field removed from lead capture** (`src/LeadCaptureModal.jsx`)

- Deleted `EMAIL_RE`, the `email` `useState` seeded from
  `sessionStorage.lastSubmittedEmail`, the whole "Email Field"
  `<div className="sl-lead-field">` block and the `errs.email` branch of
  `validate()`.
- Removed the `sessionStorage.setItem('lastSubmittedEmail', …)` write and the
  `email` key from the `submitToLMS({…})` call and from both `onSubmitted({…})`
  payloads.
- `src/api.js` untouched — `submitToLMS` already sends `email_id: email || ''`,
  so the LMS request body is unchanged.
- Grep of the game folder afterwards is clean outside `src/kit/` and
  `src/api.js`; `ThankYouScreen.jsx` and `SlotBookingModal.jsx` never read the
  field.
- Name, Mobile and the T&C checkbox untouched.

**G2 — `HowToPlayScreen` rebuilt as animation-first** (`src/Screens.jsx`)

- Deleted all three numbered instruction paragraphs and the "VAULT" text label
  that sat inside the old demo box. `GAME_CONFIG` is still imported — it is
  used by `ResultsScreen` for the loops/coins stat tiles — but no longer
  referenced on this screen.
- New 7 s CSS `@keyframes` loop (`LE_TUT_CSS`) that plays the whole time-loop
  co-op idea in one pass, in the canvas's own colour grammar: the orange living
  guardian is dragged by a finger glyph out into the left wing onto a pressure
  plate, the plate latches green and the blue vault gate slides open; a cyan
  scrub band sweeps up the frame and the loop rewinds, snapping the guardian
  back to spawn and briefly dropping the plate and gate; the loop-1 **echo**
  fades in on that plate at 60% opacity and holds it, re-opening the gate; the
  finger then drags the guardian up the spine, it picks up the gold policy
  chest, passes through the open gate and the dashed family-vault mouth at the
  top flares gold.
- Everything is one inline `<svg viewBox="0 0 300 200">` — spine walls
  `#233B6E`, floor `rgba(16,29,60,.75)`, plate `#4ADE80`, gate `#2C4C8F`,
  living body `#F26522`/`#FFD9B8`, echo `#4FC3F7`/`#B3E5FC` (that is
  `GHOST_TINTS[0]`), chest `#FFC845`/`#B07B12`. Shared `TutBody` helper draws
  the same core+shell+halo disc the canvas draws.
- The gate uses `transform-box: fill-box; transform-origin: left center` so it
  retracts into the left wall instead of shrinking about its middle.
- Remaining text is exactly: the "How to Play" heading, three icon-led labels
  ("Drag to move" / "Echoes hold plates" / "Carry chest home", 3 words each,
  each with an inline SVG glyph) and the "Play" button.
- Card padding tightened to `22px 18px 20px`, outer padding 18 px and
  `overflow: hidden` — the card is ~420 px tall so 360×640 fits with no scroll.
- `prefers-reduced-motion` disables the whole demo.
- `rules.js`, the canvas component, HUD, balance, `gate.mjs` and
  `ResultsScreen` all untouched.

**G3 — `asset-from-here.md`**

- New `legacy-echo/asset-from-here.md`, 14 Nano Banana prompts.
- Motif chosen for this game: **long-exposure light-painting in a black marble
  vault** — architecture is unlit polished stone catching only a cold rim
  light, and everything that moves is pure emitted light with
  persistence-of-vision smear. It is the one motif in this batch that makes the
  *ghost/after-image* idea the whole art direction, which is exactly the
  game's hook.
- The sheet restates the `data.js` colour grammar (orange = the you that is
  alive now, a cool tint = a recorded past self, green = held/open/safe, red =
  the beam and only the beam) and pins the four `GHOST_TINTS` hues.
- Covers: vault floor plate, living guardian orb, echo after-image (with the
  three tint re-rolls), policy chest, idle and held pressure plates, vault
  gate, hazard beam, sync lever, bonus coin, loop-pip HUD strip, rewind scrub
  wipe, and both result states.

**Verification**

- `pnpm install` — OK.
- `pnpm build` (vite --mode uat) — **passes**, `✓ built in 3.37s`.

## 2026-08-03 — comprehension revamp (client review: "the purpose of the game is difficult to understand")

### What was confusing, and why

Played cold at 390x844, the first frame of the play screen showed: a corridor
with three gates; six green discs labelled 1/2/3/3/2/3 scattered through both
wings; two lever housings; five spinning coins; a red hazard beam; a chest in
a dashed circle at the bottom; chips reading "0/1 BODY", "0/2 BODIES",
"0/3 BODIES"; and a hint reading "Drag to move · stand on plates — your echo
will replay this run". Nothing on that screen said what the player was trying
to achieve. The destination ("FAMILY VAULT") was 9 px of grey text at the top
with no visible relationship to the chest at the bottom, and the word "BODIES"
is meaningless before you have seen an echo.

The root cause was not the wording. It was that a time-loop co-op mechanic —
the hardest thing in the game to explain — was competing for the player's
attention with **four other unrelated mechanics**, each with its own rules,
its own vocabulary and its own HUD real estate: a hazard beam with a duty
cycle, knockback, stun and a shield-your-past-self rule; a twin-lever sync
gate with a 0.5 s window; a five-coin economy with anti-farm persistence; and
an invisible stacked-plate score penalty. The one idea worth understanding was
the smallest thing on screen.

### What was simplified or removed

Deleted outright, from `data.js`, `rules.js`, the component and the gate:

- **The hazard beam** — schedule, seeded phase, block-for-everyone rule,
  knockback, stun, hit cooldown, screen shake, beam paint and pre-warn draw.
- **The twin levers + sync window + coin alcove gate** — an entire second
  mechanic with its own gate and its own reward.
- **All five coins** — collection, persistence, particles, floating score,
  the HUD coin chip and the coin score term.
- **Gate 3** (the 3-pad door) — the ramp is now 1 pad then 2 pads.
- **The stacked-plate redundancy penalty** — an invisible, unexplained,
  never-communicated score leak.
- `mulberry32` and the session-seeded world, now that nothing is random.
- The `stunned` body paint, `drawCoin`, and the lever/alcove render passes.

Retuned: loops 18 s → **12 s** (a helper loop was 17 s of standing still),
track 1080 → 720 samples, carry speed 180 → 190 px/s, burn check 4 s → 3 s,
session ~97 s → **~67 s**. Score is now only `1000 delivery + 400 x unused
loops` (max 1800 on a loop-3 delivery).

Two traps found while play-testing and closed:

1. **The chest could be scooped on loop 1**, after which the player was
   committed to the spine, jammed against a gate they had no way to open, and
   could do nothing for the rest of the loop. The chest is now locked (dim,
   slashed, un-pickable) until the echoes cover every pad for the current
   loop — `world.chestReady`, computed once per loop boundary.
2. **Loop 1 burned at 3 s** if the player was still reading. Loop 1 is now
   exempt from the anti-AFK check; loops 2-5 still burn, so an idle session
   still ends at 0 with no echoes. This made an existing gate assertion
   obsolete and it was updated (see below).

### The tutorial: showing, not telling

No instruction screen was added. The teaching is four things that run inside
the first thirty seconds of real play:

1. **A permanent goal line.** "GET THE CHEST TO THE VAULT" is pinned to the
   top of the stage at all times. Six words, never moves, always true.
2. **A live objective, in the rules module.** `objectiveOf(cfg, world)` is a
   pure read of the world returning `{kind, text, x, y}` — the one next thing
   to do and the one place to go. It is rendered twice simultaneously: as a
   sentence in an orange chip under the HUD, and as a pulsing ring with a
   bouncing chevron drawn on the canvas over the exact object. A player who
   reads nothing still always has an arrow. Its four states are the whole
   game: *stand on a green pad → stay here, your echo will repeat this → grab
   the gold chest → carry it to the vault*. Because it is a rule and not
   decoration it is gated headless (see verification).
3. **The field explains itself.** Every pad is drawn physically wired to the
   gate it opens (dashed line, pad → wall → gate band), labelled "OPENS GATE
   n", and the wire lights animated green the moment the pad is held. Gate
   chips read "GATE 1 · NEEDS 1 PAD" / "GATE 2 · 1 OF 2 PADS" / "GATE 1 ·
   OPEN" instead of "0/2 BODIES". A gold dotted road runs up the spine from
   the chest to the vault mouth, so start and finish are legible in one
   glance.
4. **Two one-shot banners that narrate what just happened**, fired on the
   frame the player watched it: on the first gate opening, "GATE OPEN / it
   stays open only while a pad is held"; on the first time an echo takes a pad
   over, "THAT IS YOUR LAST RUN / it holds the pad so you can walk through".
   Neither interrupts play; both fire once per session.

`HowToPlayScreen` gained exactly one sentence of prose ("Get the gold chest up
to the vault. Gates open only while someone stands on a green pad — so your
last loop comes back to stand on it for you.") and lost nothing else.

**Bug found while screenshotting it:** the animated SVG demo added on
2026-07-31 had never actually worked. A CSS `transform` keyframe *replaces* an
element's SVG `transform` attribute rather than composing with it, so the
guardian, the chest and the finger were all animating about the viewBox origin
and sitting off-frame — the demo box showed only static scenery. Fixed by
nesting each animated `<g>` inside an outer `<g>` that carries the placement.
Verified by screenshot.

### Correct / incorrect feedback

- **Correct — pad held:** latch synth, haptic, green particle burst, the pad
  disc and its ring go green, the wire to its gate lights and animates, a
  "HELD" (or "ECHO HOLDS IT") float, and the gate slides open with its own
  burst and a "GATE OPEN" float. The gate chip flips to green "OPEN".
- **Correct — delivery:** unchanged (26+16 particle bursts, fanfare, floating
  "LEGACY DELIVERED").
- **Incorrect — walking into a shut gate:** this was previously *silent*, the
  move simply did not happen. `bodyBlocked` now records which shut gate
  refused the move, `stepWorld` fires `onGateBlocked(d, held, need)` on a
  1.1 s cooldown, and the gate flares solid red for ~0.5 s with a screen
  shake, a hit sound, a failure haptic, a red chip, and a float reading
  "HOLD ITS PAD FIRST" or "NEEDS 2 PADS — 1 HELD".
- **Incorrect — releasing a pad:** "RELEASED" float in red plus "GATE SHUT" on
  the gate, so cause and effect are visible in one beat.
- **Incorrect — wasted loop:** copy changed from "LOOP BURNED / barely moved,
  this echo is lost" to "LOOP WASTED / you barely moved — no echo from that
  loop", and the duplicate banner was removed (the rewind card already says
  it).
- **Carrying:** the wings are genuinely solid while carrying, which was
  previously invisible; they are now dimmed with a scrim so the rule is seen
  rather than discovered.

Layout: the playfield is now letterboxed *below* the HUD band (114 px top,
14 px bottom) instead of full-bleed behind it. The two things a player must
see — the vault at y=0 and the chest at y=660 — sit at the extreme ends of the
map, so on a 320x568 handset the goal bar was landing directly on the
destination. Costs some scale, buys a field where nothing is ever hidden.

### Verification

**`node gate.mjs` — ALL GATES PASS (8/8).** Before/after, since the numbers
moved:

| Gate | Before | After |
|---|---|---|
| expert solvability | wins in **4** loops, 5 seeds | reposition plan wins in **3**, 5 seeds |
| casual solvability | wins within **5** loops | one-pad-per-loop wins in **4** |
| scoring | score=**1577**, coins=3, doors=3, redundant=0.6 s | score=**1400**, loops=4, gates=2, echoes=3 |
| anti-AFK | **5/5** loops burn at 4 s, score 0 | **4/4** loops (2-5) burn at 3 s, score 0 |
| ghost track | **1080** samples (13 KB) | **720** samples (8 KB) |
| replay determinism | 243 timeline entries identical | 148 timeline entries identical |
| objective never stale | *did not exist* | kinds seen 0,1,2,3 ending on 3 |
| anti-pause-scum | frozen/clockHeld/inputRefused/inputBack all true | unchanged, all true |

Two assertions were deliberately changed because simplification made them
obsolete, both annotated in `gate.mjs`:

1. **anti-AFK** now asserts `burnedLoops === count - 1` rather than
   `=== count`, because loop 1 is exempt by design. The property the gate
   exists to hold — an idle session cannot win and scores 0 with no echoes —
   is unchanged and still asserted.
2. **The five-seed sweep** in the solvability gates no longer varies anything,
   because the hazard beam was the only seeded element. It is kept as a cheap
   proof that nothing has quietly reintroduced a dependence on the seed, and
   the file says so.

One assertion was **added**: the objective must, at every tick of a real
winning session, have non-empty text, point inside the field, only say "grab
the chest" when the echoes genuinely cover every pad, only say "stay here"
when the player really is on a pad, visit all four states, and end on "carry
it to the vault". This assertion caught a real staleness bug during
development — at the start of the carry loop the echoes have not walked to
their pads yet, so a live "is a ghost on it right now" test told the player to
go and stand on a pad their own past self was already walking towards. Fixed
by precomputing `plateGhostCovered` once per loop from the recorded tracks
(`ghosts.coverFraction = 0.3`) instead of reading the live per-tick flag.

**`cd legacy-echo && npx vite build` — passes.** 525 modules transformed;
`dist/index.html` 0.85 kB (gzip 0.46), `assets/index-v4scUYR6.css` 33.00 kB
(gzip 6.77), `assets/index-CfHlmgYK.js` 431.11 kB (gzip 142.53); built in
5.15 s.

**`node scripts/play-test.mjs legacy-echo --all-sizes` — ok at all four
viewports**, zero console or page errors:

```
=== legacy-echo @ iPhone SE   320x568 — ok ===  canvas 298x546, painted 100.0%, ended after 68s, retry ok
=== legacy-echo @ iPhone 12   390x844 — ok ===  canvas 368x822, painted 100.0%, ended after 67s, retry ok
=== legacy-echo @ Pixel 7     412x915 — ok ===  canvas 390x893, painted 100.0%, ended after 67s, retry ok
=== legacy-echo @ chrome open 412x700 — ok ===  canvas 390x678, painted 100.0%, ended after 68s, retry ok
```

Session length 97 s → 67 s, inside the 60-120 s standard with margin. The
random-input bot survives the full session at every size and reaches the
results screen and the retry path.

**Screenshots read manually**, at 320x568 and 390x844, on the home screen, the
how-to-play screen, the first play frame, mid-loop-1 with a pad held, the
rewind, and loop 2 with an echo running. Applying the cold-read test to the
first play frame: the screen states "GET THE CHEST TO THE VAULT", shows a
dimmed slashed chest at the bottom joined by a gold dotted road to a gold
"FAMILY VAULT" threshold at the top, an orange dot labelled "Drag the orange
dot", a pulsing ring and arrow on a green pad labelled "OPENS GATE 1" wired to
a gate chip reading "GATE 1 · NEEDS 1 PAD", and an objective chip reading
"Stand on a green pad". The objective is statable from that single frame.

### Not fixed, and why

- **The wings and the spine meet only through the muster zone at the bottom.**
  A player who drives up the spine and then drags straight sideways towards a
  pad will press against the spine wall and stay there until they drag
  downward, because the damped follow has no path-finding. This is
  pre-existing geometry, is never what the objective arrow tells you to do,
  and self-corrects the moment the finger moves; the fix is a pathfinder,
  which is not worth it here. Noted rather than papered over.
- `src/kit/input.js` remains single-pointer (kit-inherited): a resting second
  finger swallows input. The kit is immutable and shared; documented
  repo-wide.
- `asset-from-here.md` prompts `beam-hazard`, `lever-twin` and `coin-bonus`
  now have no object to skin. The sheet was annotated at the top rather than
  restructured, and names the two prompts worth adding when it is next
  revised (the pad-to-gate wire, and the locked chest state).

### Untouched

`src/kit/` and `shared/game-kit/` (never edited), the screen flow, LMS
integration, `api.js`, `LeadCaptureModal.jsx` (still Name + Mobile only, no
email), `SlotBookingModal.jsx`, `ThankYouScreen.jsx`, `playCount`, the
compliance disclaimer, and every file outside `legacy-echo/` and
`okf-brain/legacy-echo/`.
