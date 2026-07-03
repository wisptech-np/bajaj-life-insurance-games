# Life Goals Bubble Shooter

> A classic match-3 bubble shooter for Bajaj Life Insurance, where every bubble colour represents a real-life risk and the matching Bajaj Life product that helps cover it.

Part of the **bajaj-game-store** monorepo. Loaded inside the Angular shell as `GAME_018`.

---

## What the game is

The player aims a cannon at the bottom of the screen and fires coloured bubbles upward. When three or more same-colour bubbles touch they pop, taking any disconnected clusters with them. The wall above gradually drops; if any bubble crosses the lose-line near the cannon — or the player runs out of shots — the round ends.

Each colour is mapped to a real life risk and a Bajaj Life product, so the act of "popping" the colour is framed as covering that risk:

| Colour | Risk theme        | Bajaj Life product |
|--------|-------------------|--------------------|
| Red    | Health Risk       | Health Cover       |
| Blue   | Income Loss       | Term Insurance     |
| Yellow | Child's Education | Child Plan         |
| Green  | Wealth Goal       | Savings Plan       |
| Purple | Inflation         | ULIP               |
| Pink   | Retirement        | Pension Plan       |

The HUD always shows the loaded ammo's product label ("Aiming: Term Insurance") so the educational message is whispered, not preached.

---

## Screens

The flow is intentionally short — Home → Game → Results — with two modal forms layered on top.

### 1. Home
- Bajaj-branded logo (navy square + white "B" + red dot + "LIFE" wordmark)
- Mini, non-interactive preview of the play area as the visual hero
- Tagline: _"Pop the bubbles. Save your life goals."_
- Gold "▶ Start Game" CTA pinned at the bottom with the current level badge (LVL 1, LVL 2, …)
- "BETA" pill in the top-right

### 2. Game
- Hex-grid play area (8 columns wide, ~6–8 rows tall depending on level)
- HUD: live score (with combo multiplier when chains chain), the current ammo's product label, shots remaining (turns red when ≤ 3)
- Cannon at the bottom with the loaded bubble visible on top of the gold disc, plus a "next" preview ball that doubles as a one-tap swap
- Drag to aim — a dotted trail shows the projected path including a wall ricochet
- Release to shoot. The bubble flies, pops on a 3+ same-colour match, and any floating clusters fall (worth +50 per bubble)
- Ceiling drops one row every 6 shots, increasing pressure
- Back button (←) returns to Home, abandoning the run

### 3. Lead Capture (modal)
- Fires automatically the **first** time the player reaches Results in a session (skipped if a leadNo is already in `sessionStorage`)
- Captures Name + 10-digit Indian mobile (regex `^[6-9]\d{9}$`) + T&C checkbox
- POSTs to `…/whatsappInhouse` (Bajaj LMS WhatsApp Inhouse API) and stores the returned `leadNo` under `lifeGoalsBubbleShooterLeadNo`
- "Skip for now" dismisses without blocking results

### 4. Results
- Animated radial "Security Score" ring (0–100, derived from final game score) with a letter grade (A+ / A / B / C / D)
- Win or lose ribbon — gold "Level Complete" or red "Game Over"
- Two stat tiles: Score and Shots Used
- "Unlocked Insight" — short copy that ties the game outcome back to the insurance message
- Confetti burst on a win
- Three CTAs:
  - 📅 **Book a Slot with an Advisor** — opens the slot booking modal
  - **Play next level → / Try again** — gold primary action
  - **← Home** — quiet text button

### 5. Slot Booking (modal)
- Captures Name + Mobile (prefilled from the lead step) + Date + Time slot + T&C
- Date input is constrained to **tomorrow → +14 days** so back-dated bookings are impossible
- Time slots are eight one-hour windows from 10:00 AM to 06:00 PM
- If a `leadNo` exists, calls `…/updateLeadNew` with the slot details (preferred path); otherwise falls back to a fresh `submitToLMS` whose summary carries the appointment hint

### 6. Thank You
- Confirmation tick + "Slot booked!" message echoing the chosen date and time
- "Play again" returns to Level 1 with a fresh game state

---

## How it works

### State machine

`App.jsx` owns a single `screen` state (`'home' | 'game' | 'results' | 'thankyou'`) plus two boolean flags for the lead-capture and slot-booking modals. Each screen change is a plain `useState` transition — no router, no global store.

```
home ──[Start Game]──▶ game ──[onWin/onLose]──▶ results
                                                  │
                                                  ├── (lead modal opens once per session)
                                                  │
                                                  ├──[Retry]─────▶ game (next level on win)
                                                  ├──[Home]──────▶ home
                                                  └──[Book Slot]─▶ slot modal ─▶ thankyou
```

### The bubble-shooter engine (`BubbleShooter.jsx`)

A single React component, ~330 lines, with these moving pieces:

- **Hex-grid coordinates.** `gridToPx(row, col, ceilingDrop)` converts grid cells to pixels, offsetting odd rows by half a bubble. `snapToGrid(px, py, ceilingDrop)` finds the closest empty cell when a projectile lands.
- **Initial board.** `buildInitialBubbles(level)` fills the first `level.rows` rows with random colours from the level's palette, with some random gaps in the bottom rows for variety.
- **Aim.** `onMouseMove` / `onTouchMove` updates `aimAngle` clamped to roughly upward (`[-π+0.18, -0.18]`). A `useMemo` simulates the projected path with the same wall-bounce logic to render the white aim-trail dots.
- **Shoot.** `onPointerUp` spawns a `projectile` with velocity from the angle. A `requestAnimationFrame` loop in `useEffect` advances the projectile, bouncing off side walls, sticking on ceiling-collision or any-bubble-collision.
- **Match resolution.** `handleStick` snaps to grid, then `collectChain` BFS-floods through neighbours of the same colour. If the chain is ≥ 3, those bubbles are marked `popping` (CSS animation) and removed after 320 ms. Then `findFloating` BFS-floods from the top row; anything not reachable becomes `falling` (CSS keyframe drops them), worth +50 each.
- **Scoring & combos.** `chain.length * 100 + combo * 50` — chaining match-after-match without misses multiplies. Floating-drop bonuses are added separately.
- **Ammo.** `cycleAmmo` rotates the next colour into the cannon and randomly picks a fresh "next" from colours still alive on the board, so the player never gets stuck firing colours that no longer exist.
- **Pressure.** Every 6 shots (`DROP_INTERVAL`) `ceilingDrop` increases by one row height. The lose line is fixed near the cannon (`SHOOTER_Y - 80`).
- **End conditions.** A `useEffect` watches for: zero alive bubbles → `onWin`; any bubble past the lose line → `onLose`; zero shots remaining and no projectile in flight → `onLose`. A `finishedRef` guard prevents double-firing.

### Levels (`data.js`)

Four levels, each picking 4 colours from the palette and tuning row count + shot budget:

| # | Name                | Colours                       | Rows | Shots |
|---|---------------------|-------------------------------|------|-------|
| 1 | Life Basics         | red, blue, yellow, green       | 6    | 25    |
| 2 | Family Protection   | red, blue, yellow, pink        | 7    | 25    |
| 3 | Wealth Building     | green, purple, yellow, blue    | 7    | 22    |
| 4 | Retirement          | pink, purple, blue, green      | 8    | 25    |

After winning level _n_ the "Retry" button advances to level _n+1_; on a loss it replays the same level. Level 4 + win loops back to "Play again" on the same level.

### Lead capture / slot booking (`api.js`, `LeadCaptureModal.jsx`, `SlotBookingModal.jsx`)

Mirrors the canonical pattern used by `stackibility-stack`, `life-flight`, and `health-shield`:

1. **`submitToLMS({ name, mobile, score, summaryDtls })`** posts to `…/whatsappInhouse`, attributes the lead to the sales person via `gamification_userId` / `gamification_gameId` from `sessionStorage`, returns the LMS payload — we extract `leadNo` (or `LeadNo`, or nested `data.leadNo`) and stash it under `lifeGoalsBubbleShooterLeadNo`.
2. **`updateLeadNew(leadNo, { name, mobile, date, time, remarks })`** posts to `…/updateLeadNew` with date converted to `dd/MM/yyyy` and the slot info packed into `miscObj1.stringval2..9`. Used to attach a callback slot to an existing lead.

Both endpoints come from the build-time `define` block in `vite.config.js` (`__LMS_BASE_URL__`, `__LMS_UPDATE_BASE_URL__`) so the URLs swap automatically per build mode (`uat` / `preprod` / `production`).

### How URL params reach the API

`main.jsx` runs once on boot and stores the Angular shell's query params (`userId`, `gameId`, `empName`, `empMobile`, `location`, `zone`, `token`) into `sessionStorage` under `gamification_*` keys, then scrubs them from the URL bar. The shell builds these URLs in `FederationService.getGameUrl(gameId)` based on the active sales person's session.

---

## Project layout

```
life-goals-bubble-shooter/
├── package.json               # React + Vite + per-env build scripts
├── vite.config.js             # base './', port 5018, LMS define block
├── index.html                 # single <div id="root">, Fraunces + Plus Jakarta Sans fonts
├── .gitignore
├── src/
│   ├── main.jsx               # boot: capture URL params → sessionStorage, mount React
│   ├── App.jsx                # screen state machine + modals
│   ├── BubbleShooter.jsx      # core game (engine + HUD + shooter base)
│   ├── Screens.jsx            # Home + Results
│   ├── ThankYouScreen.jsx     # post-booking confirmation
│   ├── LeadCaptureModal.jsx   # name + mobile + T&C → submitToLMS
│   ├── SlotBookingModal.jsx   # date + time slot → updateLeadNew
│   ├── api.js                 # submitToLMS, updateLeadNew, extractLeadNo, LEAD_NO_KEY
│   ├── data.js                # COLORS, COLOR_KEYS, LEVELS
│   └── index.css              # bubble glossy gradients, animations, modal styles
└── README.md                  # this file
```

---

## How to run

### Locally (game only)

```bash
cd life-goals-bubble-shooter
pnpm install
pnpm dev          # http://localhost:5018
```

The game runs without a shell, but `userId` / `gameId` will be empty so leads will not be attributed to a sales person.

### Inside the shell

```bash
# from repo root
pnpm install                       # installs every workspace package
pnpm build:games                   # smart-builds all games + copies into shell + writes manifest
pnpm build:shell                   # ng build → angular-shell/dist/gamification/
pnpm dev                           # shell on 4200 + every game in parallel
```

Open `http://localhost:4200/gamification/` and the lobby will show **Life Goals Bubble Shooter** as a card with the 🫧 emoji.

### Per-environment builds

```bash
pnpm run build:uat       # __LMS_BASE_URL__ → uat endpoints (default if mode unknown)
pnpm run build:preprod
pnpm run build:prod
```

---

## Integration into the monorepo

When this game was added, four files outside its own folder needed touching:

1. **`pnpm-workspace.yaml`** — added `- "life-goals-bubble-shooter"` so pnpm includes the package.
2. **`scripts/copy-games.js`** — added an entry in the `games` array (so its `dist/` is copied into the shell after each build) and a corresponding manifest entry under the `manifest` object with `gameId: "GAME_018"`.
3. **`angular-shell/src/app/features/game-dispatcher/lobby.component.ts`** — added `'life-goals-bubble-shooter': '🫧'` to the `gameEmojis` map so the lobby card has an icon.
4. **`angular-shell/src/assets/federation.manifest*.json`** — auto-rewritten by `copy-games.js`, no manual edits.

`smart-build.js` auto-discovers the new package from the workspace, so it gets included in `pnpm build:games` without any further changes.

---

## Tunables

If gameplay needs balancing, the constants live at the top of `BubbleShooter.jsx`:

| Constant         | Default | Effect                                                     |
|------------------|---------|-------------------------------------------------------------|
| `BUBBLE_R`       | 22      | Bubble radius in pixels (drives `BUBBLE_D`, `ROW_H`, etc.) |
| `COLS`           | 8       | Columns in the hex grid                                     |
| `GAME_H`         | 560     | Play-area height                                            |
| `SHOT_SPEED`     | 16      | Pixels per frame for the projectile                         |
| `DROP_INTERVAL`  | 6       | Ceiling drops one row every N shots                         |
| `LOSE_LINE`      | y-80    | Bubble-y above this triggers loss                           |

Level mix is in `data.js`'s `LEVELS` array — change the colour list, row count, or shot budget there. Colour theming lives in `data.js`'s `COLORS` map; updating `theme` / `product` strings flows automatically into the Aiming HUD and the Insight copy.
