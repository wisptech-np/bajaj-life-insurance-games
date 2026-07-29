---
type: project
title: Goal Juggler
description: Tap-to-bounce juggling keep-ups — four goal orbs (Education, Home, Health, Retirement) falling in a walled court, tap to knock them up and steer, 1 to 4 orbs across 80 seconds, three covers, a risk gust from 40s. Review round 1 applied 2026-07-29.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/goal-juggler
tags:
  - game
  - physics
  - juggling
  - arcade
timestamp: 2026-07-29
---

# Goal Juggler

Four glowing goal orbs — Education (open book), Home (pitched roof), Health
(heart), Retirement (sun) — fall under gravity in a walled playfield. TAP an orb
to knock it upward; the offset of the tap from its centre steers it. An orb that
reaches the floor shatters, costs one of three covers, and is served again from
the ceiling 2s later. The count grows 1 → 4 at 15/35/60s and a risk gust drifts
sideways from 40s. Win by surviving the full 80s with fewer than 3 drops AND at
least 15,000 points. Dev port **5068**.

## Financial hook

Real life does not hand you one goal at a time, and the mechanic is the argument
rather than a slogan on top of one:

- **Three is manageable. Four is where it breaks.** The honest bot's drops
  cluster in the seconds immediately after each new orb is served — measured, at
  220 ms the collapse is at three orbs, at 120 ms it is at four. Adding a goal is
  not a linear cost, it is a cliff.
- **Parking a goal does not work.** The corner-cradle nudge means an orb cannot
  be stored out of the way; the camping bot loses 100% of runs and scores 2,718
  against honest play's 18,494.
- **Panic does not work either.** The same-orb decay means hammering one orb
  makes it fall faster, not slower.
- **The score target is the clause that catches the camper.** Surviving is not
  enough on its own: a run that keeps three orbs alive by parking them fails the
  1,500 gate. A player who actually juggles clears it many times over (honest
  winning runs average 21,000–23,000), which is the point — the AND exists for
  the degenerate strategy, not for the player.
- **Cover is what catches the one you miss.** Three covers are why a dropped
  goal is a setback rather than the end of the run.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, `GOALS`; every tunable in one place.
- `src/physics.js` — **pure**: field geometry, serving, the tap, substepped
  integration, wall/ceiling/floor/orb-orb collision, gust, corner rule, scoring,
  win/lose. No DOM, no React, no import of `data.js` (config is a parameter).
  Presentation arrives through an optional callback bag, so the headless sim
  passes `{}` and gets pure numbers.
- `src/GoalJugglerGame.jsx` — the canvas component. Contains no rules; it decides
  only what the simulation looks and sounds like.
- `src/Screens.jsx` — Home, How to Play, Results.
- `src/kit/` — byte-identical copy of `shared/game-kit`.
- `scripts/balance.mjs` — the balance gate; not bundled.

Rendering is programmatic canvas and inline SVG only. Distinct **silhouettes**
were the design constraint ahead of distinct colours — four orbs moving on a
360 px phone have to be told apart at a glance and by a colour-blind player — so
the set is a spread book, a pitched roof, a lobed heart and a radial burst, four
different outlines before any hue is applied. Each also carries its own semitone
offset, so the bounce note identifies the goal as well as the height.

## Colour grammar

Each goal owns one hue everywhere it appears (orb, trail, shatter burst,
banner): GOLD education, GREEN home, ORANGE health, BLUE retirement. RED is
never a goal — it belongs to the floor, the shatter and the lost cover, so
anything red on screen means something has gone wrong. WHITE is the player's own
touch: the tap shockwave rings.

## Balance

`scripts/balance.mjs` imports the shipped `data.js` and `physics.js` and drives
them on the same fixed 1/120 s step the kit loop uses in the browser, so a
simulated run and a played run are the same run. Six profiles, **4 seed blocks x
400 runs**, and each block runs a **different canvas size** — a single-size gate
would not have caught the device dependence described below.

Numbers below are **after review round 1** (see `log.md`); the initial build's
figures are superseded because two of its exploit fixes changed the physics.

| profile | win% (S/A/B/C/D) | band | mean score |
|---|---|---|---|
| **`honest`** (220 ms reaction, aim noise) | **31.5 / 31.8 / 40.0 / 38.0 / 32.8** | 25–45% | 12,609 |
| `sharp` (120 ms, tight hand) | 98.3 / 99.0 / 98.5 / 98.0 / 96.5 | ≥85% | 16,113 |
| `pauser` (honest + unlimited pause scumming) | 0 / 0 / 0 / 0 / 0 | ≤45% (must never pay) | 734 |
| `idle` (never taps) | 0 / 0 / 0 / 0 / 0 | =0% | 0 |
| `camp` (corner cradler) | 0 / 0 / 0 / 0 / 0 | ≤5% + below honest | 1,191 |
| `spam` (locks on, 10 taps/s) | 0 / 0 / 0 / 0 / 0 | ≤5% + below honest | 60 |
| `masher` (8 taps/s, no aiming) | 0 / 0 / 0 / 0 / 0 | ≤5% + below honest | 46 |

Idle loses in 8.30–8.33s against a 12s ceiling. Spam dies at 7.5s, masher at
9.6s, camp at 31–34s, pauser at ~21s. Tunnelling: **0 events across 14,000 runs**,
worst observed step 0.137 R and worst penetration 0.259 R against a 0.75 R
threshold. Three further assertions beyond the win bands: a **pin probe** (no tap
rate from 4–30 Hz can hold one orb up for 45s), a **blocked-row serve probe**
(7,500 serves forced into a full entry row, 0 events, worst overlap 0.024 R), and
a **live score target** check (the gate fails if no honest run ever ends short of
it).

Two independent PRNG streams per run (world vs bot) mean every profile faces the
identical gusts and serves for a given seed, so a difference between profiles is
a difference in play and not in luck.

## Corrections against the spec

Three, all sim-proven and all detailed with numbers in `log.md`:

1. **A same-orb repeat inside 300 ms is ignored entirely** — stronger than the
   brief's "decay to 60%", because the briefed rule does not achieve what its
   own parenthesis asks for. Round 1 proved the initial build's compounding
   decay still pinned: at its 0.05 floor a tap carried 38.75 px/s, and any rate
   at or above 9.29 Hz beat gravity. A decayed impulse is still an impulse, so
   no floor above zero is rate-proof. Chained taps now carry no impulse, score
   nothing, and arm nothing. Asserted by a 4–30 Hz pin probe.
2. **The orb radius is a fraction of the field HEIGHT, not its width.** Deriving
   it from the width (the obvious choice) left one residual device dependence: a
   410x830 handset gets a 704 px field but the same ~28 px orbs as a 390x620 one,
   so the court is less crowded and collisions rarer. Measured, that alone moved
   the honest bot 34.3% → 43.3% purely from screen shape.
3. **The hit-pad floor moved 46 → 40 px of radius**, so the pad ratio is a
   uniform 1.75x and the floor is an accessibility backstop rather than part of
   the balance. (Round 1 corrected the recorded *reason*: with height-derived R
   the floor binds on an SE-class ~300x548 stage, not on block A where
   1.75 x R = 45.6 px. A fifth gate block `S 300x548` was added so that device
   class is measured rather than assumed; honest wins 31.5% there.)

4. **`tap.upImpulse` = 520**, retuned in round 1 from 775. The impulse is the
   difficulty knob and it has a hard geometric ceiling: an orb is strikeable all
   the way down only while its apex is at most half the field, i.e.
   `up <= sqrt(refHeight x gravity) = 612`. Above it the strike window collapses
   (0.14 s at 775). 775 was only reachable at all because the old physics let a
   player top the impulse up by spamming.

5. **Pause scumming is closed game-locally** (the kit is immutable): resuming
   from an auto-pause costs a 1.5 s frozen 3-2-1 count with the clock held, then
   a 0.25 s live input lock. The rule lives in `physics.js` so the gate drives
   it; a `pauser` canary that pauses at every crisis measures 0.0%.

6. **The score target is 15,000, not 1,500.** The briefed value was dead — the
   honest bot crossed it at t=13.2 s and no run in ~50,000 ever failed it, so
   the AND clause was decoration and the HUD bar saturated in the first 13 s.

Everything else ships exactly as the brief specifies: gravity
`BALANCE.physics.gravity x 0.45`, restitution 0.75 walls / 0.80 orb-orb, clamp
1400 px/s, ≥4 substeps at the clamp, orbs 1→4 at 15/35/60s, gust from 40s,
2s respawn, 3 covers, 80s, score 20 x live orbs / +40 high keep / +200 all-four,
win at <3 drops AND ≥15,000 (the threshold itself is ours — see correction 6).

## The bot model, and why it is the thing that mattered

The single most important decision in the gate, and the one that made the
difference between "this game is impossible" and a clean band. The first build
modelled reaction time as **exclusive occupancy**: the bot could not think about
orb B until its 220 ms latency on orb A had elapsed. That capped it at
1/(reaction + gap) = 3.2 taps/s and it collapsed the instant a third orb
appeared — **0% win at every setting of every game constant**, with a knife-edge
cliff between 150 ms (31%) and 180 ms (1%).

That is a property of the bot, not of the game. Reaction time is a *latency* on
each action; throughput is limited by how fast a finger can tap. A juggler
watches the next ball while their hand is still travelling. The gate's bot now
holds up to two scheduled taps, each executed `reaction` after the decision that
created it, with execution serialised by finger speed — and planning further
ahead costs accuracy, so it cannot buy the run in advance. The resulting curve is
smooth and behaves like a balance knob should:

    120ms 100% | 160ms 99% | 200ms 94% | 220ms 83% | 260ms 35% | 300ms 3% | 360ms 0%

A second bot fix mattered almost as much: the original lead extrapolated in a
straight line *through* the side rails, so a third of its misses were the bot
aiming at a point outside the field. Players obviously expect an orb to come off
a wall, so the lead now reflects.

**Round 1 found a third, larger instance of the same class of error.** Once
chained taps stopped carrying an impulse, `sharp` fell from 100% to 0% — and the
trace showed it had been making 4.68 taps/s against a cycle needing 1.9, tapping
orbs already high, smashing them into the ceiling and re-tapping the rebound
inside 300 ms. **The gate's own bots had been living on the exploit they were
supposed to be guarding**, so the initial build's "PASS" was measuring a game
nobody could play that way. The bot now refuses a repeat inside the window (the
one line that stops the ceiling loop), holds four taps in its plan rather than
two, and carries a realistic 4-5% miss rate instead of the 8.6% it needed to
look challenged while cheating. A strike-zone *height* gate was tried first and
was far too strict — refuse the repeat, not the high orb.

## The exploit canary that was measuring nothing

Worth recording because it nearly shipped as false evidence. The first `spam`
profile re-picked the **lowest** orb before every tap. At ten taps a second with
four orbs in play, consecutive taps therefore landed on four *different* orbs:
the same-orb window never triggered once. What the gate was actually measuring
was a superhuman round-robin juggler with zero reaction latency, and it "passed"
at 100% win and 50,000 points while telling us nothing whatsoever about spam. A
canary that never enters the code path it guards is worse than no canary,
because it reads as evidence. The profile now **locks on** to one orb and
hammers that one, which is what makes it a spam test — and it dies at 7.5s.

Round 1 caught the sharper version of exactly this: even the locked-on canary was
scoring 7,945 while *pinning its orb*, because chained taps were farming the
high-keep bonus (198 farmed bonuses, zero genuine crests) and the decay floor
still delivered enough impulse to hold the orb up. Both holes are closed and its
score collapsed to 60. The lesson generalises: **a canary's number is only
evidence if you have checked which code path produced it.**

## Ports and commands

Dev server on **5068**. `pnpm install`, `pnpm dev`, `pnpm build` (uat — the
verification gate), `pnpm build:preprod`, `pnpm build:prod`, `pnpm preview`,
`node scripts/balance.mjs --runs 2000`.
