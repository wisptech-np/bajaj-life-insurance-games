# Swing to Secure & Milestone Hopper — Design

**Date:** 2026-07-28
**Source:** GAMES_TRACKER approved rows (new original concepts, BajajLife-approved)
**Governing standard:** `okf-brain/GAME_STANDARD.md` (v2) — scaffold, screen flow, session
shape, visual/audio rules, mobile checklist and verification gate all apply verbatim and are
not restated here. Gold-standard reference to copy from: `guardian-shelter/`.

## Scope

Two new standalone Vite + React games at the repo root, each following the standard scaffold
(copied `api.js`, `playCount.js`, `crypto.js`, `shortener.js`, lead/slot/thank-you modals),
with the shared game-kit copied in via `node scripts/sync-game-kit.mjs`.

| dir | bajajName | gameName | concept | financial hook | port |
|---|---|---|---|---|---|
| `swing-to-secure/` | Swing to Secure | Rope Swing | Tarzan rope-swing physics traversal | Bridging life's gaps — momentum of continuous protection | 5037 |
| `milestone-hopper/` | Milestone Hopper | Life Crossing | Crossy Road / Frogger lane-hopping | Navigating life's risks to reach each life milestone | 5038 |

Repo-wide conventions carried over from the existing catalog: risks/hazards are **green virus
creatures** (per repeated BajajLife feedback), protection pickups are **blue shield tokens**
(1-hit protection), wealth pickups are **gold coins**, and distance/progress milestones are
**life stages** (Graduation → First Job → Marriage → Home → Child → Retirement).

## Game 1 — Swing to Secure (`swing-to-secure`, port 5037)

Side-scrolling rope-swing traversal over a canyon at dusk (parallax SVG backdrop layers, as
in life-soar). The guardian character crosses the canyon by swinging between glowing shield
anchors. Anchors are "protection points"; the gaps between them are life's gaps; keeping
momentum from swing to swing is the financial metaphor of continuous protection.

**Control (one-touch, chosen over grapple-aiming which is too fiddly on mobile):**
press-and-hold anywhere = throw a rope to the best anchor ahead (auto-targeted within a
generous reach radius; the eligible anchor pulses ahead of time). While held, the player
swings as a pendulum under kit gravity with light damping. Release = let go; momentum carries
the player in a projectile arc to the next anchor. Grab assist: enlarged grab radius,
`BALANCE.physics.inputBufferSeconds` input buffering, and a small magnet toward the anchor
so near-misses connect — fair, not strict.

**Session:** single run, camera scrolls right. Distance milestones with banner popups:
Graduation 200 m, First Job 500 m, Marriage 900 m, Home 1400 m, Retirement 2000 m.
**Win:** reach the vault at 2000 m. **Lose:** fall into the canyon (missed grab or virus hit
while unshielded) or the 105 s cap expires before the vault. Difficulty ramps within the run:
anchor spacing widens, some later anchors sway slowly, virus density rises.

**Objects:** green virus orbs drift in the gaps (unshielded touch = knocked off the rope);
blue shield tokens grant 1-hit protection; gold coins are laid out along the ideal swing arcs
so collecting them teaches good release timing.

**Scoring:** distance ×1 + coins ×25 + milestones ×300 + Perfect Release +50 (released within
the optimal launch window — shown as floating text). Score visible throughout.

**Feel:** rope rendered as a tapered curve with slight sag and snap-taut animation on grab;
release trail particles; hit-stop + screen shake on virus hit; synth audio via kit
(grab = tap blip, release = rising whoosh arpeggio, coin/shield/win per standard §5).

## Game 2 — Milestone Hopper (`milestone-hopper`, port 5038)

Portrait top-down lane-hopper rendered as flat-shaded pseudo-3D rows (top + front face
gradients, soft drop shadows — no emoji sprites). The camera follows the player up a fixed
48-row course from Start to Retirement; each row is one hop.

**Controls:** tap = hop forward one row; swipe left/right/down = hop sideways/back one cell.
Hop is a ~120 ms tween (tunable in GAME_CONFIG) with a small arc and squash-and-stretch
landing + dust particles. Grid is 7 columns wide.

**Lane types:**
- **Safe lanes** — park/pavement, occasional static obstacles (trees, planters) that block cells.
- **Risk lanes** — roads where green virus blobs roll across at lane-specific speeds and
  directions. Unshielded contact = lose (shield token saves once).
- **Uncertainty rivers** (introduced after the Marriage milestone) — misty risk-fog lanes,
  crossable only by hopping onto drifting glowing coverage platforms that carry the player
  sideways; stepping into the fog or drifting off-screen = lose.
- **Milestone rows** at rows 8, 16, 24, 32, 40, 48 — full-width safe banner rows (Graduation,
  First Job, Marriage, Home, Child, Retirement) with a banner popup + fanfare on first touch.

**Idle pressure (replaces Crossy Road's eagle):** a risk tide — a wall of green virus fog —
rises slowly from the bottom of the course; standing still too long lets it catch the player
(lose). Combined with the standard 2-minute cap this keeps sessions moving.

**Win:** reach the Retirement row (row 48) within 2 minutes. **Lose:** virus hit while
unshielded, fog/river, risk tide, or timer expiry. Difficulty ramps per milestone segment:
denser roads, faster viruses, narrower platform gaps.

**Collectibles:** gold coins placed in cells (some on risky detours), blue shield tokens
(1-hit virus protection, does not protect from rivers/fog/tide).

**Scoring:** furthest row ×10 + coins ×25 + milestones ×300 + time bonus on win. Score and
timer always visible.

A fixed course with a win state was chosen over an endless high-score runner because the
standard (§3) requires a clear win condition, and over multi-stage levels because BajajLife
feedback on Balance Block Journey explicitly preferred one longer single stage.

## Shared architecture (both games)

- Scaffold, screen flow (`home → howtoplay → game → results (+lead modal) → [slot] → thankyou`),
  `gameKey` remount restart, playCount increment, LMS lead/slot wiring: copy from
  `guardian-shelter/` exactly per standard §1–2. `LEAD_NO_KEY`: `swingToSecureLeadNo` /
  `milestoneHopperLeadNo`; `summaryDtls` defaults `'Swing to Secure Lead'` / `'Milestone Hopper Lead'`.
- Game logic in a single canvas component (`SwingToSecureGame.jsx` / `MilestoneHopperGame.jsx`)
  driven by the kit: `createGameLoop` (fixed-step physics), `createInput`, `createEffects`
  (particles/shake/floating text/squash), `createAudio` (synth), `detectTier` + `scaleEffects`,
  `fitCanvas` (DPR-aware sizing). Tunables live in `data.js` `GAME_CONFIG`, physics constants
  via `withOverrides` on kit `BALANCE`.
- `vite.config.js` copied from guardian-shelter with rollup output names `SwingToSecure` /
  `MilestoneHopper` and ports 5037 / 5038.
- Registration: README games table rows, `scripts/games-manifest.json` `newGames` entries
  (brief = the sections above), OKF `okf-brain/<dir>/index.md` + `log.md` per standard §7.
- Verification gate §8 before done: `pnpm install` + `pnpm build` pass, no emoji sprites in
  canvas code, lead flow wired, per-game README.

## Testing

Per repo convention (no unit-test harness in games): the §8 build gate, plus manual smoke of
the flow at 360×640 / 375×812 / 414×896 and the docs/TESTING_CHECKLIST.md scenarios that
apply. Kit behaviour is already covered by `scripts/test-game-kit.mjs`.
