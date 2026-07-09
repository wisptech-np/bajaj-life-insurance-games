# Bajaj Life Insurance Games — Build Standard (v2, 2026-07-09)

> **Read this fully before building or revamping any game.** The gold standard is
> `life-goals-bubble-shooter/` — every game must match its polish, structure, and lead-capture flow.

## 1. Project scaffold (new games)

Each game is a standalone Vite + React app in its own kebab-case folder at the repo root
(`C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/<game-dir>/`).

```
<game-dir>/
  index.html            # viewport meta (see §6), Google Font link (Plus Jakarta Sans or Poppins)
  package.json          # copy shape from life-goals-bubble-shooter/package.json (react 18.3.1, vite 5)
  vite.config.js        # copy from life-goals-bubble-shooter/vite.config.js — keep __LMS_BASE_URL__ /
                        #   __LMS_UPDATE_BASE_URL__ defines; change rollup output name + assign YOUR port
  src/
    main.jsx            # mounts <App/>; imports './index.css'
    index.css           # base reset, font, touch-action: manipulation, overscroll-behavior: none
    App.jsx             # screen flow (see §2) — copy structure from bubble shooter App.jsx
    Game.jsx            # the canvas game component (name it after the game)
    Screens.jsx         # HomeScreen, HowToPlayScreen, ResultsScreen
    LeadCaptureModal.jsx  # COPY from life-goals-bubble-shooter/src/, adjust title/summary text only
    SlotBookingModal.jsx  # COPY from life-goals-bubble-shooter/src/
    ThankYouScreen.jsx    # COPY from life-goals-bubble-shooter/src/
    api.js              # COPY from life-goals-bubble-shooter/src/api.js — change LEAD_NO_KEY to
                        #   '<camelCaseGameName>LeadNo' and default summaryDtls to '<Game Title> Lead'
    data.js             # GAME_CONFIG: tunables (durations, speeds, scoring) in one place
    services/playCount.js  # COPY verbatim from life-goals-bubble-shooter/src/services/playCount.js
    utils/crypto.js        # COPY verbatim
    utils/shortener.js     # COPY verbatim
```

Install/build with **pnpm**: `pnpm install` then `pnpm build` (build must pass — this is the gate).
Do NOT create a pnpm workspace; each game is isolated. Do NOT mix React 18 and 19 within a game.

## 2. Screen flow (identical to bubble shooter)

`home → howtoplay → game → results (+ LeadCaptureModal if no lead yet) → [Book a Slot → SlotBookingModal] → thankyou`

- `startGame()` calls `incrementPlayCount()` once.
- On game end call `onWin(stats)` / `onLose(stats)`; ResultsScreen shows score + CTAs:
  **Retry/Play again**, **Home**, **Book a Slot** (primary).
- Lead modal auto-opens on first results screen if `sessionStorage[LEAD_NO_KEY]` is empty.
- Lead form fields: Name (alphabets + spaces only), Mobile (`^[6-9]\d{9}$`), Email (optional but
  format-validated), required T&C checkbox → `submitToLMS()`. Slot booking → `updateLeadNew()`.
- ThankYouScreen shows confetti + booked slot details.

## 3. Session shape

- One session = **60–120 seconds max** (hard cap 2 minutes). Single stage unless the concept demands more.
- Clear win AND lose conditions. Score always visible. Difficulty ramps within the session.
- Instant restart (no reload). `gameKey` remount pattern from bubble shooter App.jsx.

## 4. Visual standard — AAA mobile feel

Brand: BLUE `#003DA6`, ORANGE `#F26522`, GREEN `#28A745`, dark bg `#0B1221` (or deep-blue gradient
like bubble shooter). Glass cards `rgba(255,255,255,0.05)` + `backdrop-filter: blur(12px)`.
Font: Plus Jakarta Sans or Poppins. Buttons: 12px radius, gradient fill, press-scale 0.96, glow.

**CRITICAL — no raw emoji as game sprites.** Render game objects with:
- Programmatic canvas drawing (gradients, `ctx.shadowBlur` glow, anti-aliased rounded shapes), or
- Inline SVG vector sprites (layered gradients, highlights) rasterized to offscreen canvas.

Every game must include: particle effects (≥8 particles on collect/explode), floating score text
(+100 style), screen shake on damage (0.3s), spawn scale/bounce animations, animated screen
transitions (0.3–0.5s fade/slide), pulsing interactive elements, animated score counting.

## 5. Audio — Web Audio API synth only (no files)

Coin/collect: ascending sines 400→600→800 Hz. Hit: sawtooth 200→100 Hz. Power-up: triangle chord
523/659/784 Hz. Win: 5-note fanfare. UI tap: 1000 Hz sine 50 ms. Create AudioContext lazily on first
user gesture; handle suspend/resume for mobile.

## 6. Mobile checklist (all required)

- `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />`
- App container: `max-width: 430px; margin: 0 auto; height: 100%` portrait layout.
- Canvas sized to container × `devicePixelRatio`; crisp on retina; resize handler.
- `touch-action: manipulation`; preventDefault on gameplay touches; no scroll/zoom during play.
- Touch targets ≥ 44×44 px. Test at 360×640, 375×812, 414×896.
- 60 fps target: requestAnimationFrame with delta-time physics; no per-frame allocations in hot loops.

## 7. OKF documentation (required, per game)

Write/update `okf-brain/<game-dir>/index.md` (YAML frontmatter: `type: project`, `title`,
`description`, `resource` file:/// link, `tags`, `timestamp`) and `okf-brain/<game-dir>/log.md`
(dated changelog entry describing what was built/changed and build verification result).
**Do NOT edit** the shared `okf-brain/index.md`, `okf-brain/log.md`, or this file — the
orchestrator maintains those centrally.

## 8. Verification gate (before reporting done)

1. `pnpm install` succeeds.
2. `pnpm build` passes with zero errors.
3. Grep your own src for emoji codepoints used as canvas sprites — none allowed (UI copy ✕/★ etc.
   in HTML text is acceptable; game objects are not).
4. Lead capture, slot booking, playCount wired exactly per §2.
5. README.md in the game folder: concept, financial hook, controls, scoring, port, build commands.
