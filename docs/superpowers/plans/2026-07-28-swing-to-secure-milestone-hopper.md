# Swing to Secure & Milestone Hopper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two BajajLife-approved games `swing-to-secure/` (rope-swing traversal, port 5037) and `milestone-hopper/` (Crossy-Road lane-hopper, port 5038) to `okf-brain/GAME_STANDARD.md`, and register them repo-wide.

**Architecture:** Each game is an isolated Vite + React 18 app copied from the `guardian-shelter/` gold-standard scaffold (screens, lead/slot/thank-you flow, LMS services) with gameplay in one canvas component driven by the shared game-kit (`createGameLoop`, `createInput`, `createEffects`, `createAudio`, `fitCanvas`, `detectTier`). Tunables live in `data.js` `GAME_CONFIG`.

**Tech Stack:** React 18.3.1, Vite 5, framer-motion (UI screens), crypto-js (copied utils), shared game-kit (vanilla JS), Web Audio synth. pnpm only. No workspace.

**Spec:** `docs/superpowers/specs/2026-07-28-swing-to-secure-milestone-hopper-design.md`

## Global Constraints

- Follow `okf-brain/GAME_STANDARD.md` v2 in full; `guardian-shelter/` is the reference to copy from.
- Brand: BLUE `#003DA6`, ORANGE `#F26522`, GREEN `#28A745`, dark bg `#0B1221`; glass cards `rgba(255,255,255,0.05)` + `backdrop-filter: blur(12px)`; font Plus Jakarta Sans or Poppins.
- **No emoji as canvas/game sprites** — programmatic canvas drawing or inline SVG only (UI text glyphs like ✕ in HTML are fine).
- Screen flow: `home → howtoplay → game → results (+LeadCaptureModal if no lead) → [Book a Slot → SlotBookingModal] → thankyou`; `startGame()` calls `incrementPlayCount()` once; instant restart via `gameKey` remount.
- Session: hard cap ≤ 2 min, clear win AND lose, score always visible, difficulty ramps in-session.
- Viewport meta exactly: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`; app container `max-width: 430px`; canvas sized with `devicePixelRatio`; `touch-action: manipulation`.
- Hazards are green virus creatures; shields are blue 1-hit-protection tokens; coins are gold; milestones are life stages.
- Build gate: `pnpm install` then `pnpm build` must pass (repo games have no unit-test harness; the build + manual smoke is the test cycle; kit already covered by `scripts/test-game-kit.mjs`).
- Ports: swing-to-secure **5037**, milestone-hopper **5038**. Rollup output names `SwingToSecure` / `MilestoneHopper`.

---

### Task 1: Scaffold swing-to-secure

**Files:**
- Create: `swing-to-secure/package.json`, `swing-to-secure/vite.config.js`, `swing-to-secure/index.html`
- Create (copy verbatim from `guardian-shelter/src/`): `src/SlotBookingModal.jsx`, `src/ThankYouScreen.jsx`, `src/services/playCount.js`, `src/utils/crypto.js`, `src/utils/shortener.js`, `src/index.css`, `src/main.jsx`
- Create (copy then edit): `src/api.js`, `src/LeadCaptureModal.jsx`, `src/App.jsx`
- Create (new placeholders): `src/SwingToSecureGame.jsx`, `src/data.js`, `src/Screens.jsx`
- Create: `swing-to-secure/src/kit/` (copy of `shared/game-kit/*.js`)

**Interfaces:**
- Produces: `SwingToSecureGame({ config, onWin, onLose })` component contract; `GAME_CONFIG` from `data.js`; `LEAD_NO_KEY = 'swingToSecureLeadNo'` from `api.js`. Task 2 fills in the gameplay behind this exact contract.

- [ ] **Step 1: Copy the scaffold**

```powershell
New-Item -ItemType Directory -Force swing-to-secure/src/services, swing-to-secure/src/utils, swing-to-secure/src/kit
Copy-Item guardian-shelter/index.html, guardian-shelter/vite.config.js, guardian-shelter/package.json swing-to-secure/
Copy-Item guardian-shelter/src/main.jsx, guardian-shelter/src/index.css, guardian-shelter/src/App.jsx, guardian-shelter/src/api.js, guardian-shelter/src/LeadCaptureModal.jsx, guardian-shelter/src/SlotBookingModal.jsx, guardian-shelter/src/ThankYouScreen.jsx swing-to-secure/src/
Copy-Item guardian-shelter/src/services/playCount.js swing-to-secure/src/services/
Copy-Item guardian-shelter/src/utils/crypto.js, guardian-shelter/src/utils/shortener.js swing-to-secure/src/utils/
Copy-Item shared/game-kit/*.js swing-to-secure/src/kit/
```

- [ ] **Step 2: Edit identity files**

`package.json`: `"name": "swing-to-secure"` (keep every script and dependency unchanged).

`vite.config.js`: rollup `output: { name: 'SwingToSecure', exports: 'named', format: 'es' }` and `server: { port: 5037, host: '0.0.0.0' }`. Keep the `__LMS_BASE_URL__` / `__LMS_UPDATE_BASE_URL__` defines untouched.

`index.html`: `<title>Swing to Secure</title>`; keep viewport meta and Google Font link as copied.

`src/api.js`: change the lead-storage key and default summary only:
```js
export const LEAD_NO_KEY = 'swingToSecureLeadNo';
// in submitToLMS signature:
summaryDtls = 'Swing to Secure Lead'
```

`src/LeadCaptureModal.jsx`: adjust visible title/summary copy to Swing to Secure (field logic untouched).

`src/App.jsx`: replace `GuardianShelterGame` import/use with `SwingToSecureGame` from `./SwingToSecureGame.jsx`; leave the screen flow, lead-modal gating on `LEAD_NO_KEY`, and `gameKey` remount logic byte-identical otherwise.

- [ ] **Step 3: Placeholder gameplay + screens so the app compiles**

`src/data.js`:
```js
export const GAME_CONFIG = { sessionSeconds: 105 }; // real tunables land in Task 2
```

`src/SwingToSecureGame.jsx`:
```jsx
import React from 'react';
export default function SwingToSecureGame({ config, onWin, onLose }) {
  return <div style={{ color: '#fff' }}>Swing to Secure — gameplay lands in Task 2</div>;
}
```

`src/Screens.jsx`: copy `guardian-shelter/src/Screens.jsx` and swap title strings to “Swing to Secure”, subtitle “Bridge life's gaps — keep your protection momentum”, and how-to-play copy: “Hold to throw your rope · Release to fly · Chain swings to the vault”. Real art/polish lands in Task 2.

- [ ] **Step 4: Verify the build gate**

Run: `cd swing-to-secure; pnpm install; pnpm build`
Expected: exit 0, `dist/` produced.

- [ ] **Step 5: Commit**

```bash
git add swing-to-secure
git commit -m "Scaffold swing-to-secure from guardian-shelter gold standard"
```

---

### Task 2: Swing to Secure gameplay

**Files:**
- Modify: `swing-to-secure/src/data.js`, `swing-to-secure/src/SwingToSecureGame.jsx`, `swing-to-secure/src/Screens.jsx`
- Create: `swing-to-secure/README.md`, `okf-brain/swing-to-secure/index.md`, `okf-brain/swing-to-secure/log.md`

**Interfaces:**
- Consumes: kit — `createGameLoop({update, render, sessionSeconds, onTick, onExpire})` → `{start, stop, getRemaining}`; `createInput(canvas, {onDown, onUp})` → `{destroy}`; `createEffects` → `{burst, floatText, addShake, addHitStop, update, beginCamera, endCamera, draw, squash, reset}`; `createAudio()` → `{click, coin, hit, powerUp, victory, failure}`; `fitCanvas`, `detectTier`, `withOverrides`.
- Produces: game calls `onWin({score, distance, coins, milestones})` / `onLose({score, distance, coins, milestones})`; `ResultsScreen` renders those stat keys.

- [ ] **Step 1: Real GAME_CONFIG in data.js**

```js
export const GAME_CONFIG = {
  sessionSeconds: 105,
  pxPerMeter: 12,
  goalMeters: 2000,
  milestones: [
    { m: 200,  label: 'Graduation' },
    { m: 500,  label: 'First Job' },
    { m: 900,  label: 'Marriage' },
    { m: 1400, label: 'Home' },
    { m: 2000, label: 'Retirement' },
  ],
  rope: { minLen: 90, maxLen: 260, grabRadius: 150, damping: 0.995, releaseBoost: 1.06 },
  anchors: { startGapPx: 260, endGapPx: 420, swayAfterMeters: 900, swayAmpPx: 26, swayHz: 0.35 },
  hazards: { startPer1000px: 1.2, endPer1000px: 2.6, radius: 22 },
  pickups: { coinValue: 25, milestoneValue: 300, perfectReleaseValue: 50, shieldRadius: 20, coinRadius: 14 },
  player: { radius: 16, startY: 320 },
};
```

- [ ] **Step 2: Implement the canvas component**

`SwingToSecureGame.jsx` structure (single component + module-level helpers, mirroring `GuardianShelterGame.jsx` conventions — refs for mutable state, effect for setup/teardown, kit loop):

- Setup effect: `fitCanvas(canvas, container)` with resize handler; `detectTier()` → `createEffects(tier)`; `createAudio()`; `createInput(canvas, { onDown: grabRope, onUp: releaseRope })`; `createGameLoop({ update, render, sessionSeconds: config.sessionSeconds, onTick: setTimerState, onExpire: () => endRun(false) })`; generate world; `loop.start()`; cleanup calls `loop.stop()` + `input.destroy()`.
- World generation: anchors from x=300 stepping by gap that lerps `startGapPx → endGapPx` across the course; anchor y jitters ±60 around 180. Per gap, place coins along the ideal flight arc, viruses at density lerped from `startPer1000px → endPer1000px` positioned mid-gap, a shield token every ~600 px.
- Player physics (fixed-step `update(dt)`), two states:

```js
// FLYING: projectile under kit gravity
vy = Math.min(vy + PHYS.gravity * dt, PHYS.terminalVelocity);
x += vx * dt; y += vy * dt;

// grab (pointer held or buffered within BALANCE.physics.inputBufferSeconds):
// nearest anchor with anchor.x > x - 40 and dist <= rope.grabRadius
len = clamp(dist(player, anchor), rope.minLen, rope.maxLen);
theta = Math.atan2(x - anchor.x, y - anchor.y);       // 0 = straight down
const tx = Math.cos(theta), ty = -Math.sin(theta);     // tangent unit vector
omega = (vx * tx + vy * ty) / len;

// SWINGING: pendulum
omega += (-PHYS.gravity / len) * Math.sin(theta) * dt;
omega *= rope.damping;
theta += omega * dt;
x = anchor.x + len * Math.sin(theta);
y = anchor.y + len * Math.cos(theta);

// release:
vx = omega * len * Math.cos(theta) * rope.releaseBoost;
vy = -omega * len * Math.sin(theta) * rope.releaseBoost;
// Perfect Release: swinging forward (omega > 0) and -0.5 < theta < -0.1 rad
// → +perfectReleaseValue, floatText('PERFECT +50'), audio.powerUp()
```

- Collisions (circle-circle): coin → score + `effects.burst` gold + `audio.coin`; shield → `shielded = true` + blue aura; virus → if shielded, drop shield + `addHitStop` + shake; else knock off rope into FLYING with vy = 300 and no further grabs for 0.5 s (usually fatal). `y > canyon floor (logical height + 60)` → `endRun(false)`.
- Camera: `camX = damp(camX, x - width * 0.35, 4, dt)` (kit `damp`); parallax canyon layers drawn from two pre-built offscreen gradient layers (rock silhouettes as bezier paths — follow the life-soar SVG-backdrop approach).
- Milestones: crossing `m * pxPerMeter` → banner (DOM overlay div animating in), `+300`, `audio.powerUp()`. Reaching `goalMeters` → vault celebration → `endRun(true)`.
- `endRun(won)`: stop loop, compute stats `{score, distance, coins, milestones}`, call `onWin`/`onLose` after a 600 ms beat (`victory`/`failure` audio + confetti burst on win).
- HUD (DOM, not canvas): score top-left with lerped counter, timer top-right, distance meter pill; milestone banner layer.
- Rendering (all programmatic, no emoji): guardian = layered circles/rounded-rects with gradient + cape trail (kit trail budget); rope = quadratic curve sagging toward the player, snap-taut 80 ms on grab; anchors = glowing shield pylons (`ctx.shadowBlur`); viruses = green spiky orbs (12 spikes, radial gradient, pulse); coins = gold discs with inner highlight; vault = arched safe door with glow.

- [ ] **Step 3: Screens polish**

`Screens.jsx`: HomeScreen with animated title, floating anchor/rope motif (CSS/SVG), Start CTA; HowToPlayScreen shows a 3-beat animated diagram (hold→swing→release) built from CSS-animated SVG, minimal text; ResultsScreen shows score + distance + coins + milestone chips, CTAs Retry / Home / **Book a Slot** (primary, orange).

- [ ] **Step 4: Verify the build + standard gates**

Run: `cd swing-to-secure; pnpm build` → exit 0.
Run: `node scripts/sync-game-kit.mjs --check` → kit copy not stale.
Grep `swing-to-secure/src` for emoji codepoints in canvas code → none.
Manual smoke in `pnpm dev` (port 5037): full flow home→howtoplay→game→results→lead modal; win path (reach vault) and lose path (fall); 60 fps feel; restart remounts cleanly.

- [ ] **Step 5: README + OKF docs**

`swing-to-secure/README.md`: concept, financial hook, controls, scoring table, port 5037, pnpm commands.
`okf-brain/swing-to-secure/index.md`: YAML frontmatter (`type: project`, `title: Swing to Secure`, `description`, `resource: file:///.../swing-to-secure`, `tags: [game, rope-swing, physics]`, `timestamp: 2026-07-28`) + overview.
`okf-brain/swing-to-secure/log.md`: dated entry — built per spec, build verified.

- [ ] **Step 6: Commit**

```bash
git add swing-to-secure okf-brain/swing-to-secure
git commit -m "Implement Swing to Secure rope-swing gameplay"
```

---

### Task 3: Scaffold milestone-hopper

Identical procedure to Task 1 with these substitutions (repeatable without reading Task 1: copy the same guardian-shelter file set):

**Files:** same copy set into `milestone-hopper/`; placeholders `src/MilestoneHopperGame.jsx`, `src/data.js`, `src/Screens.jsx`.

**Interfaces:**
- Produces: `MilestoneHopperGame({ config, onWin, onLose })`; `LEAD_NO_KEY = 'milestoneHopperLeadNo'`; `summaryDtls = 'Milestone Hopper Lead'`.

- [ ] **Step 1: Copy scaffold**

```powershell
New-Item -ItemType Directory -Force milestone-hopper/src/services, milestone-hopper/src/utils, milestone-hopper/src/kit
Copy-Item guardian-shelter/index.html, guardian-shelter/vite.config.js, guardian-shelter/package.json milestone-hopper/
Copy-Item guardian-shelter/src/main.jsx, guardian-shelter/src/index.css, guardian-shelter/src/App.jsx, guardian-shelter/src/api.js, guardian-shelter/src/LeadCaptureModal.jsx, guardian-shelter/src/SlotBookingModal.jsx, guardian-shelter/src/ThankYouScreen.jsx milestone-hopper/src/
Copy-Item guardian-shelter/src/services/playCount.js milestone-hopper/src/services/
Copy-Item guardian-shelter/src/utils/crypto.js, guardian-shelter/src/utils/shortener.js milestone-hopper/src/utils/
Copy-Item shared/game-kit/*.js milestone-hopper/src/kit/
```
- [ ] **Step 2: Identity edits** — `package.json` name `milestone-hopper`; vite output name `MilestoneHopper`, port **5038**; `index.html` title `Milestone Hopper`; `api.js` key/summary per Interfaces; `LeadCaptureModal.jsx` copy tweaks; `App.jsx` imports `MilestoneHopperGame`.
- [ ] **Step 3: Placeholders** — `data.js` `export const GAME_CONFIG = { sessionSeconds: 120 };`; stub `MilestoneHopperGame` component; `Screens.jsx` copied with title “Milestone Hopper”, subtitle “Navigate life's risks. Reach every milestone.”, how-to “Tap to hop forward · Swipe to dodge · Reach Retirement before time runs out”.
- [ ] **Step 4: Build gate** — `cd milestone-hopper; pnpm install; pnpm build` → exit 0.
- [ ] **Step 5: Commit** — `git add milestone-hopper && git commit -m "Scaffold milestone-hopper from guardian-shelter gold standard"`.

---

### Task 4: Milestone Hopper gameplay

**Files:**
- Modify: `milestone-hopper/src/data.js`, `milestone-hopper/src/MilestoneHopperGame.jsx`, `milestone-hopper/src/Screens.jsx`
- Create: `milestone-hopper/README.md`, `okf-brain/milestone-hopper/index.md`, `okf-brain/milestone-hopper/log.md`

**Interfaces:**
- Consumes: same kit surface as Task 2.
- Produces: `onWin/onLose({score, rows, coins, milestones})`.

- [ ] **Step 1: Real GAME_CONFIG**

```js
export const GAME_CONFIG = {
  sessionSeconds: 120,
  cols: 7,
  totalRows: 48,
  milestoneRows: { 8: 'Graduation', 16: 'First Job', 24: 'Marriage', 32: 'Home', 40: 'Child', 48: 'Retirement' },
  hop: { seconds: 0.12, arcHeight: 14, bufferOne: true },
  roads: { minSpeed: 90, maxSpeed: 220, minGapCells: 2.2, maxViruses: 4 },
  rivers: { afterRow: 24, platformSpeed: [70, 130], platformCells: [2, 3], gapCells: [1.5, 2.5] },
  tide: { startRow: -3, secondsPerRow: 3.2, minSecondsPerRow: 2.0 },
  scoring: { row: 10, coin: 25, milestone: 300, timeBonusPerSecond: 5 },
};
```

- [ ] **Step 2: Implement the canvas component**

Same component conventions as Task 2 (refs + kit loop; `stepMode: 'fixed'`). Specifics:

- Course generation (once per mount, plain seeded RNG `mulberry32(seed)` so replays differ via `Date.now()` seed at mount): for each row 1–48 pick type — milestone rows fixed per config; segment difficulty index `seg = Math.floor(row / 8)`; safe rows ~35% (with 0–2 tree cells, never blocking all 7 columns — verify a path exists by checking at least one open cell adjacent to previous row's open cells); road rows otherwise; after `rivers.afterRow`, ~25% of non-safe rows are rivers. Road speed lerps with `seg`, direction alternates randomly.
- Grid/camera: logical cell = `width / cols`; camera y follows `max(playerRow - 3, furthest - 3)` smoothly via `damp`. Rows render as flat-shaded slabs: top face light gradient, front face darker — pseudo-3D; trees/planters as rounded vector shapes; NO emoji.
- Player: rounded cube guardian with face-forward orientation flip on side hops; idle bob; hop = 0.12 s tween along parabolic arc + squash on land (`effects.squash`) + dust burst + `audio.click`-style hop blip; one queued input while mid-hop.
- Input: `onTap` → hop forward; `onSwipe(dir)` → hop that direction (up also = forward). Reject hops into tree cells (bump animation + tick sound) or off-grid.
- Roads: viruses (green blob discs with spikes + eye-glow, size ~0.8 cell) stream at row speed with per-row spacing; wrap around at edges ± spawn margin. Collision = same row and `|virusX - playerX| < 0.55 * cell` → if shield: consume + shake + hitstop; else `endRun(false)` with splat squash.
- Rivers: platforms (glowing glass slabs, 2–3 cells) drift; while player on river row they must be standing on a platform — player x follows platform (float x, not snapped); off platform or carried off-screen → `endRun(false)` (fog swallow animation). Hopping from a platform re-snaps to nearest column.
- Risk tide: green fog wall rises from below — row index advances every `secondsPerRow` (lerps down to `minSecondsPerRow` by row 32); drawn as animated fog gradient with virus silhouettes; `playerRow <= tideRow` → `endRun(false)`. HUD shows a subtle “tide” chevron when within 3 rows.
- Collectibles: coins in ~15% of open cells (never on trees/roads’ virus spawn line), shield token ~1 per segment. Pickup on landing in the cell.
- Milestones: landing on a milestone row first time → full-width banner + fanfare + `+300`; row 48 → `endRun(true)` with confetti bursts + time bonus `remaining * timeBonusPerSecond`.
- Score: `furthestRow * 10 + coins * 25 + milestones * 300 (+ time bonus on win)`; HUD identical layout to Task 2 (score, timer, milestone progress dots).
- `endRun(won)` semantics identical to Task 2 with stats `{score, rows, coins, milestones}`.

- [ ] **Step 3: Screens polish** — HomeScreen with isometric-styled hero rows motif; HowToPlay = animated 3-beat SVG (tap hop → dodge virus → milestone banner), minimal text; ResultsScreen with score + rows + coins + milestone chips and Retry / Home / **Book a Slot** (primary).

- [ ] **Step 4: Verify build + gates** — `pnpm build` exit 0; kit check; emoji grep clean; manual smoke on 5038: win (reach row 48 — temporarily raise `sessionSeconds` while testing if needed, restore after), lose via virus, river, and tide; restart clean.

- [ ] **Step 5: README + OKF docs** — same shape as Task 2 Step 5 with hopper content, `tags: [game, lane-hop, arcade]`.

- [ ] **Step 6: Commit**

```bash
git add milestone-hopper okf-brain/milestone-hopper
git commit -m "Implement Milestone Hopper lane-hop gameplay"
```

---

### Task 5: Register both games repo-wide + final verification

**Files:**
- Modify: `README.md` (games table), `scripts/games-manifest.json` (two `newGames` entries), `scripts/sync-game-kit.mjs` (GAMES list)

**Interfaces:**
- Consumes: both game dirs complete; briefs from the spec.

- [ ] **Step 1: sync-game-kit GAMES list** — append `'swing-to-secure', 'milestone-hopper'` to the `GAMES` array; run `node scripts/sync-game-kit.mjs --check` → up to date.
- [ ] **Step 2: README table** — add rows `| swing-to-secure/ | Swing to Secure | 5037 |` and `| milestone-hopper/ | Milestone Hopper | 5038 |`.
- [ ] **Step 3: games-manifest.json** — append two `newGames` objects (dir/bajajName/gameName/concept/financialConcept/feedback `"Approved — new original concept"`/port/brief) with briefs condensed from the spec sections.
- [ ] **Step 4: Full verification gate (§8)** — for BOTH games: `pnpm build` exit 0; emoji-sprite grep clean; lead capture + slot booking + playCount wiring diffed against guardian-shelter (only the documented identity edits differ); per-game README present.
- [ ] **Step 5: Commit**

```bash
git add README.md scripts/games-manifest.json scripts/sync-game-kit.mjs
git commit -m "Register swing-to-secure and milestone-hopper repo-wide"
```
