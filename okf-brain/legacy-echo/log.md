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
