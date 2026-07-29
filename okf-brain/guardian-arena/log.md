# Guardian Arena — build log

## 2026-07-29 — Initial build

Built the complete game from scratch per `okf-brain/GAME_STANDARD.md` with
`guardian-shelter/` as the scaffold reference and
`goal-juggler/src/GoalJugglerGame.jsx` as the canvas/feel reference.

**What was built**

- Scaffold: standalone Vite + React 18.3.1 (pnpm, no workspace), port 5070,
  rollup output `GuardianArena`, `__LMS_BASE_URL__`/`__LMS_UPDATE_BASE_URL__`
  defines kept. `index.html` with viewport meta + Poppins.
- Copied verbatim from guardian-shelter: `SlotBookingModal.jsx`,
  `ThankYouScreen.jsx`, `LeadCaptureModal.jsx`, `api.js`, `main.jsx`,
  `index.css`, `services/playCount.js`, `utils/crypto.js`,
  `utils/shortener.js`. Adjustments limited to: `LEAD_NO_KEY →
  'guardianArenaLeadNo'`, summary/remark strings → Guardian Arena, lead modal
  subtitle, and ThankYouScreen's guardian-shelter PNG import swapped for a
  pure gradient (the image asset does not exist in this game).
- `shared/game-kit/*.js` copied byte-identical into `src/kit/` via file copy
  (verified with SHA256 — `scripts/sync-game-kit.mjs` was NOT run).
- Game: `src/sim.js` (pure sim), `src/GuardianArenaGame.jsx` (canvas +
  HUD + overlays), `src/sfx.js` (synth, ±10% pitch), `src/data.js`
  (GAME_CONFIG), `src/Screens.jsx` (Home / HowToPlay / Results),
  `src/App.jsx` (standard screen flow, `incrementPlayCount()` once in
  `startGame()`, gameKey remount).
- Mechanics: stationary-only auto-fire with 120 ms settle + target-lock
  reticle; floating joystick (10 px dead zone / 60 px radius / 200 px/s);
  chaser + shooter (450 ms wind-up telegraph, 75%-speed projectiles, lead-aim
  and corner spreads) + splitter (2 harmless-scatter minis) + wave-4
  mini-boss (40 HP, telegraphed 3-shot fan every 2.5 s, trickle chasers);
  pick-1-of-3 insurance-rider upgrade cards between waves (multishot,
  ricochet, pierce, +25% fire rate, +30% damage, +1 max HP, heal 50%, +10%
  speed; always ≥1 offense card); 4 HP, 900 ms i-frames with flicker,
  knockback, red hurt vignette; spawns ≥150 px away, 600 ms harmless
  spawn-in, quadrant-biased toward the player; flanked chaser approaches.
- Juice: 50 ms hit-stop, 3.5 px kill shake, death-poof particle bursts,
  white hit flash, floating damage numbers and +score text, animated
  (damped) score counter, screen transitions, wave banners.
- Anti pause-scum (repo-wide rule): on resume from kit auto-pause the world
  stays frozen behind a visible 3-2-1 (1.2 s, session clock held via
  `shouldTickClock`), then a 0.3 s live input lock — pattern copied from
  goal-juggler, implemented in `sim.js` `beginPause`/`endPause`/`isFrozen`.

**Verification**

- `pnpm install` — OK (pnpm 10.29.2).
- `pnpm build` (vite --mode uat) — **passes, zero errors** (524 modules,
  ~2.1 s; dist emitted).
- Kit copies verified byte-identical to `shared/game-kit/` via SHA256.
- Emoji scan of `src/`: no emoji codepoints in game/canvas code (only the
  gold-standard `✓` glyph in LeadCaptureModal HTML consent text, which the
  standard explicitly allows).
- Lead capture / slot booking / playCount wired exactly per standard §2.
