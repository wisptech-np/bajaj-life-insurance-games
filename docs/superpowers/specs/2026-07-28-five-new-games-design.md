# Five New Games — Design (batch 3)

**Date:** 2026-07-28
**Directive:** Build 5 games absent from the Bajaj-Game-Store repo (verified against
`GAMES_CATALOG.md` quick index at FETCH_HEAD and the full `angular-shell/src/assets/games/`
directory listing, including un-cataloged newer folders) and absent from this repo.
**Anti-duplication result:** plinko, chain-reaction, jenga-removal, orbit-hop, and flick-bowling
appear in neither repo (nearest neighbours checked: milestone-dunk = basketball dunk ≠ bowling;
tile-flipping = pair memory ≠ any pick; stackibility-stack = additive stacking ≠ jenga removal).
**Briefs:** taken verbatim from this repo's archived manifest (`1cf30a9`), which used the
BajajLife review format.
**Governing standard:** `okf-brain/GAME_STANDARD.md` v2 verbatim. Shared architecture identical
to the swing-to-secure/milestone-hopper spec §"Shared architecture" (scaffold copied from
guardian-shelter, kit-driven canvas component, LMS lead flow, OKF docs, registration).

| dir | bajajName | gameName | mechanic | port | stats contract keys |
|---|---|---|---|---|---|
| `wealth-drop/` | Wealth Drop | Plinko Pachinko | plinko board drop | **5039** (archived 5037 now taken) | `{score, coins, shielded, combo}` |
| `ripple-shield/` | Ripple Shield | Chain Reaction | one-tap chain reaction | 5046 | `{score, protected, waves, chain}` |
| `steady-tower/` | Steady Tower | Jenga De-Risk | jenga-style removal | 5047 | `{score, risks, stability, time}` |
| `goal-orbit/` | Goal Orbit | Orbit Hop | orbit-switch timing | 5050 | `{score, planets, coins, perfects}` |
| `risk-strike/` | Risk Strike | Shield Bowling | flick bowling physics | 5054 | `{score, strikes, spares, pins}` |

CRM identity per game: `LEAD_NO_KEY` = `<camelCaseDir>LeadNo` (`wealthDropLeadNo`,
`rippleShieldLeadNo`, `steadyTowerLeadNo`, `goalOrbitLeadNo`, `riskStrikeLeadNo`);
`summaryDtls` = `'<BajajName> Lead'`. Rollup output names: `WealthDrop`, `RippleShield`,
`SteadyTower`, `GoalOrbit`, `RiskStrike`.

## Briefs (approved archive format, verbatim)

### wealth-drop — Market volatility & ULIP: disciplined investing through ups and downs
Plinko: tap/drag to choose drop position at top, release a gold premium coin that bounces down
through rows of glowing pegs (circle physics, restitution, slight randomness) into buckets at
the bottom labelled with goal multipliers (Retirement x5, Home x3, Education x2, Savings x1,
and 2 red Risk x0 buckets that flash). 10 coins per session (or 90s cap). Occasional blue
shield peg: touching it shields the coin so a Risk bucket pays x1 instead of x0 — insurance
smooths volatility. Running total with animated counter; combo streak for consecutive scoring
buckets. Score = total payout. Peg hit sparkles, bucket win confetti bursts, coin trail.
Win/lose: win = total payout ≥ target (tuned so ~40% of casual runs win); lose otherwise.

### ripple-shield — One policy protects many: the ripple effect of family coverage
Chain-reaction: 40–60 drifting orbs float on screen — most are blue family orbs, some green
virus orbs that must NOT be caught. Player gets ONE tap per wave: tap creates an expanding
shield ripple; any family orb it touches becomes a new expanding ripple (chain), viruses
touched shrink the ripple penalty. Each wave has a target ("Protect 25 of 40"). 5 waves in
2 minutes, orb speed rises. Score = orbs protected x40 + chain-depth bonus + wave-clear x200.
Bloom visuals: translucent expanding rings, orb glow, slow-motion on mega-chain (15+),
count-up ticker of protected members. Win = clear all 5 wave targets; lose = miss a target.

### steady-tower — De-risking your portfolio without destabilizing your life plan
Physics tower: a 12-layer tower of alternating blocks; some blocks are RED RISK blocks
(high-interest debt, junk investment, virus icon), others are BLUE FOUNDATION blocks (term
cover, emergency fund). Tap-and-flick red blocks to pull them out; tower physics
(center-of-mass + wobble, simplified stacked-body solver is fine) reacts: pull the wrong
support and the tower sways; topple = lose. Remove ALL red blocks to win; a stability meter
shows center-of-mass offset with heartbeat when critical. 2-minute cap. Score = risks removed
x200 + stability average bonus + time bonus. Dust particles + slow tilt when leaning, dramatic
collapse on loss.

### goal-orbit — Staying on track: disciplined orbit around your life goals
Orbit timing: a comet (player) circles a glowing goal planet (Home). Tap to release
tangentially and get captured by the next planet's orbit (Education, Car, Marriage… each a
distinct vector-art planet). Time releases to travel clean transfer arcs; hitting drifting
green virus asteroids or flying off-screen = lose a life (3 lives). Coins dot the transfer
paths. Every 5th planet is a MILESTONE (banner + bonus). Speed increases gradually; 2-minute
cap or 20 planets = win. Score = planets reached x100 + coins x20 + perfect-transfer (no orbit
>1 loop) bonus x50. Orbit trails, gravity-well glow rings, star parallax.

### risk-strike — Knock out risks in one decisive shot: comprehensive cover
Bowling: pseudo-3D lane (perspective trapezoid with gloss reflections); 10 pins styled as
green virus bottles (Illness, Accident, Debt, Inflation labels on front pins). Flick the
glowing shield ball — flick speed sets power, flick angle sets direction, small post-flick
curve via swipe curl. Realistic-enough pin physics: ball-pin and pin-pin 2D collisions
projected onto the lane. 5 frames, 2 throws each (strike/spare bonuses like real bowling,
simplified display). 2-minute cap. Score = bowling score x10. Pin explosion into particle
shards on strike + STRIKE banner, gutter shame wobble, ball trail, crowd-cheer synth swell.
Win = total pins ≥ tuned target across the 5 frames; lose otherwise.

## Cross-cutting requirements

- Balance gate per game (established batch precedent): verify win reachability and fairness by
  arithmetic or headless sim; corrected constants documented in `data.js`.
- All juice/audio/mobile requirements per standard §4–6; no emoji sprites; kit loop/input/
  effects/audio; `swing-to-secure/` and `milestone-hopper/` are the review-verified idiom
  references.
- Registration (after all builds): README rows, manifest entries (briefs above), sync-game-kit
  GAMES list, build-status, tracker script catalog note, `GAMES_TRACKER.xlsx` regeneration.
