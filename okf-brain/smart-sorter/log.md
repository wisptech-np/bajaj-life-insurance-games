---
type: log
title: Smart Sorter Change Log
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/smart-sorter/log.md
timestamp: 2026-07-29
---

# Smart Sorter Change Log

## [2026-07-29] Initial build

Built to `docs/superpowers/specs/2026-07-28-ten-new-games-design.md` §7.

### Scaffold and identity

- Scaffolded from `guardian-shelter/` per GAME_STANDARD §1 (index.html,
  vite.config.js, package.json, main.jsx, api.js, services/playCount.js,
  utils/crypto.js, utils/shortener.js) plus an unedited copy of
  `shared/game-kit/*.js` into `src/kit/` — verified byte-identical with `cmp`
  for all seven kit files.
- `index.css`, `LeadCaptureModal.jsx`, `SlotBookingModal.jsx` and
  `ThankYouScreen.jsx` were taken from `wealth-drop/` rather than
  `guardian-shelter/` because that copy is already free of the source game's
  strings and of the `guardian_shelter_bg.png` import; only the game name
  differs, confirmed by diff.
- Identity rewired: package name `smart-sorter`, rollup output `SmartSorter`,
  dev port **5061**, title `Smart Sorter`, theme-color `#0B1221`,
  `LEAD_NO_KEY = 'smartSorterLeadNo'`, `summaryDtls = 'Smart Sorter Lead'`,
  `'Slot Booking via Smart Sorter'`. `grep -rn "Guardian Shelter" smart-sorter/src/`
  returns **zero matches**.

### Game

- Belt, spawn schedule, swipe judgement, combo, mistake budget and the win/lose
  decision live in `src/rules.js` and `src/items.js`; the track-units-to-pixels
  map lives in `src/layout.js`. All three are free of React, canvas, DOM and
  browser globals, so `scripts/balance.mjs` imports and drives the shipping code
  rather than a model of it.
- Rendering is programmatic canvas only. No image files, no emoji: the twelve
  card faces (accent bar, icon badge, auto-fitted label, family tag) are
  pre-rendered to offscreen canvases once per resize, as is all belt furniture —
  lane, treads baseline, shelves, bin strip, direction arrows. Per frame only the
  cards, the urgent skin, flying filed cards, the head band and the kit's
  particles are drawn.
- Three visually distinct icon families so a card can be classified by shape
  before the label is read: shield silhouettes for Protect, chart furniture for
  Grow, angular/spiky marks for Bin.
- Juice per GAME_STANDARD §4: 18-26 particles per sort, 20 per mistake, 40 on a
  win; floating `+N`, `COMBO xN`, `WRONG SHELF` / `MISSED`; screen shake and
  hit-stop on mistakes; spawn scale-in and a breathing lift on the card the next
  swipe will judge; cards fly to their shelf on a pooled trajectory; screen
  transitions and an animated score counter.
- Screen flow, `gameKey` remount and `incrementPlayCount()` exactly once in
  `startGame` all follow GAME_STANDARD §2 unchanged.

### Spec corrections

**None.** Every constant in §7 shipped as written — 90 s session, +6% every 5
items, every 10th item urgent at 2x points and 1.5x speed, combo x1 to x5,
correct 40 x multiplier, urgent 80 x multiplier, 3 mistakes, target 1,200. The
sim hit all of the brief's targets on the first run with these values (casual bot
36.2% against the required 25-45%; perfect bot 10,360 against the required
>= 2,400).

Three things the spec left open were decided here and are recorded because a
reviewer would otherwise have to guess:

1. **`bestCombo` is the longest run of consecutive correct sorts, not the highest
   multiplier reached.** The spec names the stat but not its unit, and both
   readings are defensible. The streak was chosen because the multiplier caps at
   x5 and almost every surviving run reaches it, which would make the stat a
   constant; "best combo 24" is information, "best combo 5" is not. The HUD still
   shows the multiplier as `xN`, so nothing on screen is ambiguous.

2. **The 1,200 score target is a floor, not the binding gate — deliberately kept
   anyway.** Because the run ends the instant three mistakes land, surviving the
   full 90 s implies having sorted at least ~51 cards. Measured: across 892
   surviving runs sampled at missort rates from 2% to 25%, the **worst survivor
   scored 7,120** — just under 6x the target — and **zero** survivors finished
   below it. (The absolute theoretical floor, 51 sorts pinned at the x1
   multiplier, is 2,040, but that state is unreachable because the combo rebuilds
   after every reset.) The win is therefore decided entirely by the mistake
   budget. The gate now asserts this directly ("every run that survives 90 s
   clears the target"), so if the belt speed or the target is ever retuned to the
   point where the score gate begins to bind, the check fails and this note gets
   revisited rather than quietly going stale.

   This was left as specified rather than "fixed" because the alternative is
   worse. Making the score gate bind requires either raising the target far above
   what the brief specifies, or cutting the item count — and the item count is
   what sets the win rate. Binomial arithmetic on the brief's own bot pins it:
   with a 6% missort chance and a 3-mistake budget, P(at most 2 mistakes) is 81%
   at 25 items, 42% at 50 and 29% at 60. Landing inside the required 25-45% band
   forces roughly 50-60 items, and 50 items cannot score under 1,200. The two
   requirements are simply not independent, and the win rate is the one the brief
   states numerically. The target still does real work on screen — it is what the
   HUD progress bar fills toward and what the results ring is scaled against — so
   it is kept at 1,200 and documented here rather than silently altered.

3. **An upward swipe, and any swipe while the sorting head is empty, does
   nothing.** The spec defines three directions and does not say what a fourth
   one costs. Charging a mistake for a gesture aimed at no card would make the
   game feel arbitrary, so both are acknowledged with a tick sound and no
   penalty.

### Numbers chosen by measurement rather than by feel

- `belt.baseSpeed = 0.16` track units/s. This is the single knob that sets item
  throughput and therefore the win rate. `--sweep` reports the casual bot across
  0.13-0.19 so the sensitivity is visible; 0.16 yields ~53 items in a full run
  and a 36.2% win rate, mid-band.
- `track.spacing = 0.34` is deliberately larger than the 0.30-deep head zone, so
  ordinary cards arrive one at a time and the swipe target is never ambiguous.
- `track.urgentSpacing = 0.52`. Urgent cards ride at 1.5x and therefore close on
  whatever is ahead of them; launching them from further back is what keeps the
  belt collision-free. The gate includes a *lazy* policy that exists only to
  force this case — every other policy clears a card ~250 ms after it enters the
  head, long before a trailing urgent card has closed any distance, so none of
  them would ever exercise the tightest geometry the rules can produce. Under the
  lazy policy the worst gap measured is **0.287 track units** (165 px on a 560 px
  belt, against an 84 px card) with zero spawn-order inversions.
- `track.headTop = 0.70`. Measured through `layout.js` on six stage sizes, this
  puts the centre of the sorting head 72-76% down the stage — the brief's "bottom
  third" — while leaving the reaction window at 1.88 s on the first card and
  0.698 s on the fastest urgent card of the last group, which is 2.8x the 250 ms
  reaction the balance bot uses. A run is never lost to a window a human could
  not physically hit.

### Review fixes made during the build

- **Combo fanfare announced the wrong multiplier.** `res.mult` is what the card
  just landed was *paid* at, computed from the streak before it landed; the meter
  the player watches is what the *next* card will earn. The step-up sound and
  floating text were celebrating x1 on the sort that actually unlocked x2. Both
  now read `multiplierFor(cfg, res.streak)`.
- **Bin strip arrow and label collided.** They were stacked vertically, which
  overlapped at the smallest clamped bin height (46 px), where a 13 px label and
  a 14 px arrow do not both fit either side of the mid-line. They are now laid
  out side by side and centred as one group.
- **Two per-frame string allocations in the hot loop.** The head-band stroke
  built an `rgba(...)` string every frame and the urgent skin built both an
  `rgba(...)` and a `900 Npx ...` font string per urgent card per frame. Alpha
  now rides `globalAlpha` against constant colours, and the chip font is built
  once per resize.
- **Nested `<svg>` inside the clipped hero SVG on the home screen** was replaced
  with plain paths in the hero's own coordinate space — getting a 14 px mark to
  land inside a 20 px badge through two transforms and a nested viewport is
  exactly the kind of thing that renders differently per browser.
- **Geometric-shape characters in the in-game hint** (U+25C0 and friends) were
  replaced with inline SVG triangles: several platforms give those an emoji
  presentation, and this repo does not put emoji in a game.

### Verification

- `pnpm install` then `pnpm build` (mode uat) — pass, zero errors. 526 modules,
  `dist/assets/index-*.js` 426.5 kB (141.7 kB gzip), CSS 33.0 kB (6.8 kB gzip).
- `node scripts/balance.mjs 500` — **GATE: PASS**, 14/14 checks, exit 0. Casual
  36.2%, perfect 10,360 (8.6x target) with zero mistakes, sloppy 0.6%, idle dead
  in 10.4 s; tightest card gap 0.287 track units with zero order inversions;
  narrowest reaction window 0.698 s; worst surviving-run score 7,160 against the
  1,200 target; layout valid on all six handset sizes; item table and icon table
  join cleanly (12/12, four per family).
- `grep -rn "Guardian Shelter" smart-sorter/src/` — zero matches.
- Kit files verified byte-identical against `shared/game-kit/` with `cmp`.
- Source scanned for emoji and symbol codepoints: the only hits repo-wide are a
  `→` inside a source comment in `App.jsx` and the `✓` HTML glyph in the shared
  `LeadCaptureModal.jsx` checkbox, which GAME_STANDARD §8.3 explicitly permits
  and which is identical to the gold standard. No non-ASCII character is used as
  a sprite anywhere.

### Not done / deferred

- Registration deltas (`scripts/games-manifest.json`, root `README.md`,
  `scripts/sync-game-kit.mjs` GAMES list, `scripts/build-status.json`,
  `scripts/build_tracker.py`, `GAMES_TRACKER.xlsx`) are the controller's single
  post-batch task per the spec's "Registration deltas" section and were not
  touched here.
- No on-device pass: the build was verified headlessly. The geometry claims are
  asserted through `layout.js` in the balance gate across six stage sizes rather
  than observed in a browser.

## [2026-07-31] Revamp: email field removed, animated how-to-play, asset sheet

**G1 — email field removed.** `src/LeadCaptureModal.jsx`: deleted `EMAIL_RE`, the
`email` `useState`, the whole "Email Field" `sl-lead-field` block, the
`errs.email` validation branch, and both `sessionStorage` touches of
`lastSubmittedEmail`. Dropped `email` from the `submitToLMS({...})` call and from
both `onSubmitted({...})` payloads. `api.js` untouched — `submitToLMS` already
sends `email_id: email || ''`, so the LMS payload shape is unchanged. Name +
Mobile + T&C are byte-identical to before. Repo grep for `email` outside
`src/kit/` and `src/api.js` now returns zero hits.

**G2 — `HowToPlayScreen` rebuilt as animation-first.** `src/Screens.jsx`:
- Deleted the `ShelfRow` component, the three-row shelf list, the three stat
  chips and every instruction paragraph, plus the now-dead `SHELVES` and `GLYPH`
  constants and the `BY_FAMILY` import.
- New 208 px demo stage renders the actual mechanic: a scrolling rubber belt
  between two rails, an amber dashed sorting-head bracket, and three shelf tiles
  (Protect left / Grow right / Bin bottom). Three cards ride down the belt on a
  single 6 s loop staggered 0 s / 2 s / 4 s; a white `FingerGlyph` pointer
  presses each card at the head and drags it off to its shelf, and the
  destination tile flashes on landing. Cards carry only the family glyph, no
  words, so the demo is language-free.
- Remaining text on the screen: the "How to Play" heading, three icon-led labels
  (`← PROTECT`, `→ GROW`, `↓ BIN`), and the Play button. Nothing else.
- Container switched from `overflowY: auto` to `overflow: hidden`; measured
  stack is ~440 px tall so it fits 360×640 without scrolling. All new keyframes
  are covered by the existing `prefers-reduced-motion` kill switch.

**G3 — `smart-sorter/asset-from-here.md`.** 14 Nano Banana prompts on a
"night-shift logistics depot" motif — rectilinear industrial shape language,
brushed steel, rubber cleats, hazard chevrons, courier parcels. Covers the depot
floor background, tileable rail and belt-tread strips, all three card families,
both shelf tiles, the reject chute, the sorting-head bracket, two HUD icons and
both result-screen illustrations.

**Not changed:** gameplay, balance, physics, HUD layout, `ResultsScreen`, canvas
artwork, `data.js`, `items.js`, `rules.js`, `layout.js`, `api.js`, `src/kit/`.

**Build:** `pnpm install && pnpm build` — exit 0, `✓ built in 3.29s`
(`dist/assets/index-D5wt_Lne.js 430.37 kB │ gzip: 142.04 kB`).

---

## 2026-08-03 — "The game is not working" (BajajLife review)

**What the report meant.** Not a crash and not dead input. The bundle builds and
boots with zero console errors, `scripts/balance.mjs` passed untouched, and a
scripted pointer drag over the canvas moved the score (0 → 40), so the swipe
path, `createInput`'s swipe recogniser and `applySwipe` all work. Every DOM
overlay already carries `pointerEvents: 'none'`, so nothing swallows a gesture.

Driven through headless Chrome at 390x844 the run ended in **11 seconds** with
`3/3 MISTAKES` and `1 SORTED`. The mistake budget was 3 and a scroll-past
counted, so a player meeting twelve unfamiliar item types at ~1.9 s per card
loses on the opening three cards — before a single card has resolved on screen.

**Fix**

- `data.js` / `rules.js` — new `mistakes.graceItems = 3`. The first three cards
  cannot spend a life. They still flash red, still break the combo and still
  fire the missort banner, so they teach; they just cannot end the run.
- `mistakes.allowed` stays at **3**. Raising it to 5 was tried and rejected: it
  sent the casual bot from the brief's 25–45% band to **83.4%**. The defect was
  when the budget got spent, not how big it was.
- `SmartSorterGame.jsx` — a grace mistake appends "warm-up, no life lost" to the
  banner, so a red flash with the mistake pips untouched does not read as a
  broken counter.

**Verification**

- `node scripts/balance.mjs` — **GATE: PASS**, all 14 assertions. Casual win
  rate **41.6%** (band 25–45%), idle bot still dies at **16.4 s** (gate < 20 s),
  perfect and lazy bots unchanged at 100%.
- `npx vite build` — passes, 430.49 kB / 142.11 kB gzip.
- Headless Chrome, 390x844, production bundle, random-swipe bot:
  run length **11 s → 19 s**, 0 page errors, results screen reached,
  "Try again" restores the canvas.
