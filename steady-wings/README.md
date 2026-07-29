# Steady Wings

One-tap impulse flight through labelled expense walls. Port **5065**.

> "Life's expenses keep coming — keep your cover airborne and glide through every one of them."

## Concept

A shield-glider — the family's cover, in flight — scrolls right at a fixed speed while gravity
pulls it down. **One tap sets its vertical velocity to a single fixed lift**, and that is the
entire control scheme. Paired stone pillars scroll in from the right, each pair labelled with a
real household expense (School fees, Medical bill, EMI hike, Gadget splurge…). The slot between
them is the premium you keep paying on time: fly through it and the cover stays up.

The insurance idea is in the mechanic, not in the copy. The bills arrive on a schedule you do not
control and they get harder to clear as the run goes on; what changes the outcome is the blue
**cover token**, which absorbs exactly one collision that would otherwise have ended the run.
Cover does not raise your ceiling — it stops one bad moment from being final.

## Controls

- **Tap anywhere** (or Space / Arrow Up on desktop) to lift.
- Nothing else. There is no hold, no steering, no second button.
- The run does not start until your first tap: the clock and the scroll are held during the
  "Tap to fly" beat, so nobody loses time reading the screen.

## Rules

| | |
|---|---|
| **Win** | Clear **24 gates** inside the **100 s** clock |
| **Lose** | Hit a pillar with no cover, touch the floor or the ceiling, or run out of clock |
| **Difficulty** | Slot narrows 34% → 24% of the playfield across gates 1–24; scroll speed +12% after gate 8 and again after gate 16; from gate 12 some slots drift vertically on a slow sine |
| **Cover token** | Appears before gates 4, 12 and 20. Absorbs one collision, shatters, and shoves you clear of the pillar you hit |
| **Session** | A full 24-gate run is **64.6 s** of flight — measured, not estimated (see the gate) |

## Scoring

| Event | Points |
|---|---|
| Gate cleared | 50 |
| Coin | 25 |
| Near miss (closest approach within 0.035 heights of a pillar edge, no contact) | 30 |
| Cover still intact at the win | 150 |

Stats handed to the results screen: `{ score, gates, coins, nearMisses }`.

## Layout

```
steady-wings/
  scripts/balance.mjs      headless balance gate (imports the shipped modules)
  src/
    data.js                every tunable number + the palette
    flight.js              ALL the rules, as pure functions — no React, no canvas
    SteadyWingsGame.jsx    pixels only: rendering, input, audio, HUD
    Screens.jsx            Home / How to play / Results
    App.jsx                screen flow + lead capture
    kit/                   byte-identical copy of shared/game-kit
```

`flight.js` is deliberately free of React, canvas, DOM and even an import of `data.js` — every
function takes the config as a parameter. `scripts/balance.mjs` imports that exact file, so the
balance numbers below are measured against the code that ships rather than a re-implementation
of it.

**Coordinates are normalised**: `y` runs 0 (ceiling) to 1 (floor) and every horizontal distance
is in playfield *heights*. The renderer multiplies by the measured playfield height and nothing
in `flight.js` knows what a pixel is, so a 360×640 handset and a 430×900 one run identical
physics rather than two games that happen to share a config.

## Balance gate

```bash
node scripts/balance.mjs              # 4 seed blocks x 400 runs per profile
node scripts/balance.mjs --blocks 8 --runs 2000
node scripts/balance.mjs --sweep      # win% across candidate end-gap values
```

Every band is asserted **independently on each seed block**, not on the pooled mean — a band that
only holds on average fails here. Measured on the shipped constants:

| Profile | blk0 | blk1 | blk2 | blk3 | band |
|---|---|---|---|---|---|
| `spec` — honest pilot, 90 ms tap jitter + aim error | 34.8% | 33.5% | 33.5% | 36.3% | 25–45% |
| `sharp` — 25 ms jitter | 100% | 100% | 100% | 100% | ≥ 90% |
| `perfect` — no jitter (reachability, empirical) | 100% | 100% | 100% | 100% | = 100% |
| `idle` — never taps | dead in 0.68 s | | | | < 4 s |
| `spam` — taps at the cooldown limit | dead in 1.38 s (ceiling) | | | | < 4 s |

It also proves, over all 1,600 generated levels: every gap clears the ceiling/floor margin at both
drift extremes; every consecutive centre jump respects both the maximum *and* the minimum delta
(no degenerate flat runs); that every leg is flyable inside the impulse envelope — the tightest
needs 69.4% of the available climb budget; and that every drifting gate leaves room for the
drift-inflated line-holding band plus a mistimed tap — the tightest needs 75.1% of that margin.
Both halves are required: travel alone is necessary but not sufficient, and the gate proves it by
failing a doubled-drift configuration that the travel check alone waves through.
Anti-tunnelling is argued analytically on both axes
(45.7 overlap tests per pillar horizontally, 17.0 steps to cross the narrowest gap vertically) and
counted empirically: a pillar passed without a single overlap test would be a tunnel, and there
are zero across every profile and block.

## Build

```bash
pnpm install
pnpm dev            # http://localhost:5065
pnpm build          # vite build --mode uat — the hard gate
```

## CRM

`LEAD_NO_KEY = 'steadyWingsLeadNo'`, `summaryDtls: 'Steady Wings Lead'`, post-game lead
`'Steady Wings - Post Game Lead'`, slot remark `'Steady Wings Slot Booking'`.
