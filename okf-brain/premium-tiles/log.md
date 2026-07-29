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
