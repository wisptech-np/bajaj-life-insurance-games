# Guardian Archer

A single-player precision archery game for Bajaj Life Insurance. Four named financial
**risks** — Illness, Accident, Debt, Job Loss — float at varying ranges. The player is the
ONLY shooter: targets never fire back. Every arrow is a Protection Arrow; every clean hit
is a risk covered.

> Directory is `coverage-archer/` (historical); all in-game branding is **Guardian Archer**.

## Concept & financial hook

**Precision coverage against risks.** A family's financial safety depends on identifying
each risk and covering it precisely. Small, distant, fast-moving risks are harder to hit —
and worth more when you do. A direct hit on a target's glowing **core** is a **CRITICAL x2**:
precise, right-sized coverage beats scattershot protection. Running out of arrows or time
with risks still on the field = an unprotected family.

## The four risks

Each risk has its own silhouette, palette, idle motion and death animation — they are not
palette swaps of one shape. All drawn programmatically on canvas (no emoji, no image files).

| Risk         | Silhouette                     | Colour    | Idle     | Death     |
| ------------ | ------------------------------ | --------- | -------- | --------- |
| **Illness**  | hexagonal cell + fever ECG      | `#E11D48` | throb    | shatter   |
| **Accident** | hazard triangle + forking crack | `#F59E0B` | tumble   | burst     |
| **Debt**     | shackled ingot on chains        | `#8B5CF6` | sway     | drop      |
| **Job Loss** | briefcase split by a fault line | `#64748B` | flicker  | dissolve  |

## Gameplay

- **12 arrows**, **2-minute** hard cap, **3 waves** (10 targets total).
- **One arrow in the air at a time** — every shot resolves before the next is drawn.
- Each wave has its **own movement pattern**, so aim reading has to be relearnt:
  - Wave 1 *Everyday Risks* — **pendulum**: large targets swinging on a shallow arc.
  - Wave 2 *Health & Accident* — **orbit**: medium targets circling a fixed centre.
  - Wave 3 *Critical Risks* — **dart**: small targets that hold still, then snap sideways.
- Everything speeds up by 25% once the clock passes 60 seconds remaining.
- **Wind** (HUD direction + strength meter) visibly bends every arrow — cyan streaks scroll
  across the sky at wind speed so the bend is never a surprise. It re-rolls after each shot
  and gets stronger in later waves.
- Win: clear all 3 waves → time bonus. Lose: arrows exhausted or timer hits 0.

## Controls & feel

- **Drag back anywhere** (touch-first, slingshot style) to set angle + power; release to fire.
- Continuous aim feedback while dragging:
  - **pull vector** drawn from the launch anchor,
  - **power ring** around the archer with a white tick at the release threshold,
  - a **power bar pinned to the top of the field** that a thumb can never cover,
  - live **percentage readout**, colour-ramped green → amber → orange,
  - below the threshold everything greys out and reads `PULL BACK` — releasing there
    cancels the shot and costs no arrow.
- Dotted **trajectory arc for the first 3 shots**; afterwards a short muzzle stub only.
- In flight: the arrow rotates to its velocity vector and drags a fading cyan trail.
  Collision is **swept** along each frame's path, so fast arrows cannot tunnel small targets.
- On impact: **hit-stop**, a 14–24 particle burst, screen shake, a floating `+N` at the hit
  point, the target's own death animation, and surviving targets **stagger** away from the
  shockwave.
- On a **CRITICAL**: longer hit-stop, an expanding gold shockwave ring, a camera flash and
  a punched-in `CRITICAL x2 +N` label.
- On a **miss**: the arrow **sticks where it landed** and fades over 1.6 s, a dust burst
  marks the spot, and if the wind was blowing the HUD wind chip **pulses** with a
  `WIND →` callout naming direction and level — misses tell you why.

## Scoring

| Target                     | Points        |
| -------------------------- | ------------- |
| Large risk                 | 100           |
| Medium risk                | 150           |
| Small risk                 | 250           |
| Core hit                   | x2 (CRITICAL) |
| Streak bonus               | +25 per consecutive hit (max +100) |
| Win time bonus             | +5 per second remaining |

## Tuning

**Every gameplay tunable lives in [`data.ts`](./data.ts)** — session length, quiver size,
ballistics, aim assist, wind, all juice timings (hit-stop, shake, burst counts, shockwave),
scoring, target geometry, per-wave pattern/speed/amplitude/wind, and the late-session
speed-up. Nothing gameplay-related is hard-coded in the scenes.

`RISKS` in the same file defines each antagonist's silhouette family, idle motion, death
animation and palette; `PreloadScene` draws from it and `MainScene` animates from it.

## Screens

Built to the repo's shared design language (`guardian-shelter` is the reference):
glassmorphism cards, deep-blue gradient backgrounds, 12px-radius gradient buttons with a
0.96 press scale and glow, and framer-motion screen transitions.

- **Intro** — glass plate hero showing the archer against all four risks.
- **How to Play** — **animation only**: one looping SMIL demo of a finger pulling back, the
  power ring filling, the arrow arcing with the wind and the target shattering. Three
  icon-led labels (`Pull back` · `Mind the wind` · `Hit the core`) and nothing else.
- **Results** — animated count-up, SVG circular progress ring, confetti on a win, Share
  Score, a glass action card with Call Specialist + Book Consultation, a ghost *Play again*
  and the standard disclaimer.
- **Lead capture** — Name + Mobile + T&C only. **No email field.**

## Tech

- React 19 + TypeScript + Phaser 3 (arcade physics) + Vite 6, Tailwind (CDN) for UI chrome,
  framer-motion for screen transitions.
- All sprites drawn programmatically on canvas — **no emoji, no image/audio files**.
  See [`asset-from-here.md`](./asset-from-here.md) for the Nano Banana prompts that would
  replace them with real art.
- Retina-correct: the canvas backing store is `480*DPR x 640*DPR`, the camera is zoomed by
  `DPR` and DPR-rasterised textures are drawn at `1/DPR`, so all game logic stays in the
  480x640 design space at every device pixel ratio.
- Web Audio synth SFX; lead capture (`submitToLMS`), slot booking (`updateLeadNew`) and
  `incrementPlayCount` wired per the repo GAME_STANDARD (lead key: `coverageArcherLeadNo`).

## Screen flow

`home → howtoplay → game → results (+ lead modal if no lead) → Book a Slot → thankyou`

## Build & run

```bash
pnpm install
pnpm dev      # dev server on port 3036
pnpm build    # production build (uat mode) -> dist/
```

**Port:** 3036
