# Ripple Shield

A one-tap chain reaction. Forty to sixty orbs drift across the board: blue
**family orbs** to protect, green **virus orbs** to avoid. You get **one tap per
wave** — hold to aim, release to send an expanding shield ripple. Every family
orb the ring sweeps sends out a ripple of its own, so a single well-placed tap
cascades across the screen. Clear all five wave targets inside 120 seconds.

## The financial hook

One policy protects many. The tap is the policy you buy; the cascade is
everything that cover reaches — a partner, a child, a parent, a business
partner, the people they in turn support. Each generation of the ripple carries
a little less reach (`chainDecayPx`), which is exactly the point: cover spreads,
but it thins as it spreads, so *where* you place it decides how far it goes.

The green viruses are the risks that eat cover. A ripple that catches one loses
18 px of its remaining reach, and a ripple worn down below the minimum radius is
spent. Aiming into a virus cluster is how a promising chain dies three orbs in.

## Controls

| Input | Action |
| --- | --- |
| Press and hold | Show the aim reticle and the ripple's reach |
| Drag | Move the aim point |
| Release | Send the ripple — this is your one tap for the wave |
| Tap (quick) | Same thing: fire at the tap point |

Release, not tap, is deliberate. The kit only classifies a press under 250 ms
and 12 px as a "tap", and aiming a single shot is exactly the gesture a player
takes longer over — so the game fires on `onUp` and a considered press works as
well as a quick one. Further presses during the cascade are refused with a tick.

## Wave structure

| Wave | Orbs | Viruses | Family | Target | Drift (ref px/s) |
| --- | --- | --- | --- | --- | --- |
| 1 | 40 | 5 | 35 | 27 | 10-26 |
| 2 | 46 | 8 | 38 | 28 | 14-34 |
| 3 | 50 | 9 | 41 | 29 | 18-42 |
| 4 | 56 | 11 | 45 | 30 | 22-50 |
| 5 | 60 | 13 | 47 | 31 | 26-58 |

A wave ends when the **last ripple has expired**, not when the last orb is
caught — a ring still in flight can still reach one. The wave-clear banner holds
the session clock, so the 1.35 s celebration is not charged to the player.

Orbs **bounce** off the playfield edge rather than wrapping. A wrap would
teleport an orb across the board mid-cascade: it reads as a bug, and it lets an
orb dodge a ripple that had already reached it.

## Scoring

| Event | Points |
| --- | --- |
| Family orb protected | 40 |
| Wave cleared | 200 |
| Chain-depth bonus (per wave) | 20 x deepest generation reached |

A winning run measures around 7,600, which is what the results ring treats as a
full circle. The results screen reports `{ score, protected, waves, chain }` —
total orbs protected, waves cleared, and the deepest chain generation of the run.

## Win / lose

- **Win** — clear all five wave targets.
- **Lose** — finish any wave below its target, or run out of the 120 s session.

## Juice

Additive-blended ripple bloom (disc + leading ring + trailing echo), baked orb
halos, spawn pop with overshoot, contact flash rings, pooled particles on every
protected orb and every virus strike, floating `CHAIN n` text every fifth orb,
screen shake on a virus strike, a hit-stop plus a 0.9 s **slow-motion** beat and
a blue wash the moment a cascade passes 15 orbs, an animated score counter, a
protected-count ticker that pops on every increment, and Web Audio synth
throughout (rising chain notes, cover chord on the tap, sawtooth on a risk,
fanfare on the win). All art is canvas-drawn or inline SVG — no emoji, no image
files.

## Balance notes

The gate is `pnpm balance` (`node scripts/balance-sim.mjs [boards]`), a headless
simulation that **imports the shipped `src/data.js`** and replays the component's
exact chain resolution: same 1/120 s fixed step, same crossing test, same virus
shrink, same per-generation decay, same bouncing drift. Numbers below are 600
boards per wave per strategy.

**Centre-tap clear rate: 72.5 / 60.8 / 66.8 / 62.3 / 59.3%** — every wave inside
the intended 50-70% band, with wave 1 as an on-ramp. A uniformly random tap
manages 52 / 41 / 41 / 42 / 31%; replaying each board from an 8x11 grid of
candidate taps clears 99-100% of them. So a lazy tap loses roughly half its
waves, a read of the board wins nearly all of them, and the full-run win
probability is 10.9% for a centre-tapper against a ceiling that is essentially
100% for a perfect eye. Mega-chains (15+) fire on 88-95% of centre taps: the
slow-motion beat is the payoff for a good tap, not a rarity.

Three readings differ from the spec's literal values:

1. **Ripple radii are the whole balance** (`rootRadius: 98`, `chainRadius: 76`).
   A chain reaction is continuum percolation: what decides it is the mean number
   of orbs inside one ripple, `k = n·π(R+r)²/area`, and the 2D threshold is
   k ≈ 4.5. An "obvious" 104 px chain radius puts k at 7.9 — every tap covers
   nearly the whole board and the game has no decisions in it (measured: a
   centre tap protected 31 of 35 orbs on wave 1). Below about 68 px the chain
   dies wherever it starts. 76 px puts k at 5.4, just above threshold, which is
   the only regime where *where you tap* changes the outcome.
2. **`virusShrinkPx: 18`, not a third of a radius.** At 26 px a wave-5 board's
   13 viruses ended cascades on contact and the centre-tap clear rate collapsed
   to 41%. 18 px keeps the penalty legible without killing the chain outright.
3. **The target ladder rises by one orb per wave (27→31), not by a flat share.**
   The spec's example target is 62.5% of the orbs on screen; held flat, that
   gets harder every wave on its own, because each extra virus eats reach — the
   same literal target cleared 66% of wave-1 boards and 38% of wave-5 boards.
   The one-orb ladder produces a smooth 72→59% ramp instead.

**Cross-device balance.** Every authored length is a reference-playfield length
(382x496) scaled at runtime by `sqrt(area / refArea)`, because orb *density* —
not radius — is what a chain reaction depends on. Re-running the simulation on
four real playfields confirms it holds:

| Playfield | Scale | Centre-tap clear per wave |
| --- | --- | --- |
| 382x496 (reference) | 1.000 | 70 / 56 / 62 / 61 / 60% |
| 382x665 (375x812 device) | 1.158 | 65 / 56 / 58 / 64 / 54% |
| 344x520 (small phone) | 0.972 | 69 / 64 / 63 / 62 / 55% |
| 400x760 (tall phone) | 1.267 | 69 / 53 / 61 / 64 / 51% |

**Pacing.** Worst observed cascade takes 3.5 s to resolve; with the 1.35 s
banner that is 24 s of the 120 s session across five waves, leaving ~19 s per
wave to aim. A player who dawdles runs out of clock and loses on timeout.

## Performance

- Fixed 1/120 s physics step through the shared kit loop; the session clock and
  gameplay clock are the same clock, so backgrounding cannot burn time.
- Everything static is pre-rendered once per resize: the backdrop, three orb
  sprites with their glow **baked in** (60 `shadowBlur` draws a frame would be
  the single most expensive thing this game could do), and two ripple gradients
  anchored at the origin and scaled by transform at draw time.
- Orbs and ripples are fixed pools allocated at mount and reused for every wave
  of every replay. The contact test is a monotonic ring-crossing comparison, so
  a ripple touches each orb exactly once with no per-ripple hit sets. Nothing in
  the hot loop allocates.
- Particle counts are authored once and scaled by the kit device budget, so a
  low-tier phone gets the same choreography at a quarter of the cost, and
  `prefers-reduced-motion` removes shake, hit-stop and screen animations.
- HUD numbers are written to the DOM through refs (`textContent`, `style.width`,
  `style.transform`), never React state — a 120 Hz tick must not re-render.

## Ports and commands

Dev server on **5046**.

```bash
pnpm install
pnpm dev            # http://localhost:5046
pnpm build          # uat (the gate)
pnpm build:preprod
pnpm build:prod
pnpm preview
pnpm balance        # headless balance simulation, 400 boards per wave
```

## Layout

```
ripple-shield/
  index.html                  viewport meta + Poppins
  vite.config.js              rollup output RippleShield, port 5046
  scripts/balance-sim.mjs     headless balance gate (imports src/data.js)
  src/
    main.jsx  index.css  App.jsx
    RippleShieldGame.jsx      the whole game
    data.js                   COLORS + GAME_CONFIG (every tunable)
    Screens.jsx               Home / How to Play / Results
    LeadCaptureModal.jsx  SlotBookingModal.jsx  ThankYouScreen.jsx
    api.js                    LEAD_NO_KEY = rippleShieldLeadNo
    services/playCount.js  utils/crypto.js  utils/shortener.js
    kit/                      synced copy of shared/game-kit (never edited)
```
