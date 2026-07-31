# Premium Tiles — build log

## 2026-07-29 — initial build

Built `premium-tiles/` (dev port 5071), cloned from `guardian-shelter/` per
`okf-brain/GAME_STANDARD.md`. Vite 5 + React 18.3.1, isolated app, pnpm only.

**Scaffold.** `package.json`, `vite.config.js` (output name `PremiumTiles`,
port 5071), `index.html` (Poppins, §6 viewport). Copied verbatim from
guardian-shelter: `main.jsx`, `index.css`, `SlotBookingModal.jsx`,
`services/playCount.js`, `utils/crypto.js`, `utils/shortener.js`.
`api.js` copied with `LEAD_NO_KEY = 'premiumTilesLeadNo'` and default
`summaryDtls = 'Premium Tiles Lead'`. `LeadCaptureModal.jsx` copied with
title/summary text only changed. `ThankYouScreen.jsx` copied with the
guardian PNG backdrop replaced by a gradient wash (same adaptation
goal-juggler shipped — no binary asset). All 7 `shared/game-kit/*.js` files
copied byte-identical into `src/kit/` (verified with `cmp`).

**Game.** `PremiumTilesGame.jsx` (canvas, refs-not-state, pre-rendered tile
sprites and backdrop, pooled ripples, kit loop/effects/device),
`data.js` (GAME_CONFIG + 160-note C-pentatonic melody + seeded `buildChart`),
`synth.js` (game-owned Web Audio synth: pluck / sustained hold note /
discordant thud+sting / fanfares; latencyHint interactive, warmed on first
gesture; kit audio has no sustain API and kit copies are immutable),
`Screens.jsx` (home / how-to-play with CSS demo / results with SVG stars,
perfect %, max combo), `App.jsx` (standard screen flow, `gameKey` remount,
`incrementPlayCount()` once in `startGame`).

**Chart verified by simulation** (node run of `buildChart`): 150 rows →
160 scorable tiles (10 doubles, 8 holds), 16 reds = exactly 10.0%, chart
~86.5 s (+ intro count ≈ 90 s session), first hold 20.6 s, first double
41.1 s, first red 14.3 s (no type debuts in the final 20 s), zero overlap /
lane / adjacency invariant violations.

**Anti-pause-scum.** Kit `loop.js` onPause release does not resume play:
world and session clock stay frozen behind a visible 3-2-1 (1.5 s) then a
0.25 s live input lock (goal-juggler pattern). Life lost = 0.5 s stun while
the offending tile clears, then a 0.9 s count. Input is raw multi-pointer
Pointer Events inside the component (kit input.js is single-pointer; the
brief's sanctioned option) — hits on discrete pointerdown only.

**Verification.** `pnpm install` clean; `pnpm build` (vite build --mode uat)
passes with zero errors (415.9 kB js / 33.6 kB css). Emoji scan of `src/`:
only U+2713 in the verbatim lead-modal HTML checkbox (allowed UI copy);
no emoji in any canvas drawing. Lead capture / slot booking / playCount
wired per standard §2. README with concept, hook, controls, scoring,
port 5071, build commands.

---

## 2026-07-31 — lead form trimmed, how-to-play rebuilt as animation, asset sheet

Three scoped changes. No gameplay touched: `data.js`, `synth.js` and
`PremiumTilesGame.jsx` are byte-identical, so the chart, the fall-speed ramp,
the anti-mash rules and the star thresholds are all unchanged.

**G1 — email field removed.** `src/LeadCaptureModal.jsx` lost `EMAIL_RE`, the
`email` state, the "Email Field" block, the `errs.email` branch, both
`lastSubmittedEmail` sessionStorage calls, and `email` from the `submitToLMS`
call and both `onSubmitted` payloads. `api.js` untouched — it already sends
`email_id: email || ''`. Name + Mobile + T&C unchanged. Grep for `email` over
`premium-tiles/src` is now empty.

**G2 — `HowToPlayScreen` is now one animated demo.** Deleted: all four numbered
instruction paragraphs and the old three-element hint panel. In their place
`DemoLanes()` renders the real four-lane board — same lane dividers, same
marigold DUE line, same tile gradients — running one 5.2 s loop of the three
inputs that actually exist: a blue premium tile falls to the DUE line and a
finger taps it (gold hit ring, melody note flies off); a tall HOLD tile lands and
the finger presses and *stays down* (sustained ring, two more notes bank); and a
red risk tile falls straight through lane 4 while the finger pulls clear of the
glass and shows a red "no" glyph. Every track shares the 5.2 s duration, and all
are disabled under `prefers-reduced-motion` (the old demo had no reduced-motion
handling at all).
Remaining text: the "How to Play" heading, three icon-led cues (TAP BLUE TILES /
HOLD LONG TILES / NEVER TAP RED) and the Play button. Nothing else — including
the "IMPULSE BUY" label that used to be baked into the old demo art. Card 340 px
wide with a 200×275 board; stack measures ~470 px, so 360×640 fits with no
scroll (`overflow: hidden`, was `overflowY: auto`).

**G3 — `asset-from-here.md`,** 14 Nano Banana prompts on the motif *hand-carved
woodblock printing on handmade paper*: every asset is an inked impression on rag
paper — bled edges, uneven ink coverage, carved woodgrain streaks, hand-cut
keylines that wobble — shot flat-on like a scanned print, with an explicit
repo-wide ban in the sheet on glow, glass, chrome, bevel and drop shadow. Colours
are read as dyes (indigo, marigold, madder, leaf) rather than as light. Covers
the paper field, the premium/hold/double tiles, both red risk variants, the DUE
rule, the note glyph, the perfect-tap ink bloom, the life pips, the combo seal,
the star rating and both result-screen pieces.

**Verification**

| Gate | Result |
| --- | --- |
| `pnpm install` | pass |
| `pnpm build` | pass — `✓ built in 2.03s`, 420.30 kB / 139.49 kB gzip |
