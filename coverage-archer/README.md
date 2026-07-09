# Guardian Archer

A single-player precision archery game for Bajaj Life Insurance. Green **risk viruses**
(illness, accident, debt…) float at varying ranges — the player is the ONLY shooter:
targets never fire back. Every arrow is a Protection Arrow; every clean hit is a risk covered.

> Directory is `coverage-archer/` (historical); all in-game branding is **Guardian Archer**.

## Concept & financial hook

**Precision coverage against risks.** A family's financial safety depends on identifying
each risk and covering it precisely. Small, distant, moving risks (critical illnesses,
rare accidents) are harder to hit — and worth more when you do. A direct hit on a virus's
glowing **core** is a **CRITICAL x2**: precise, right-sized coverage beats scattershot
protection. Running out of arrows or time with risks still on the field = an unprotected family.

## Gameplay

- **12 arrows**, **2-minute** hard cap, **3 waves** of green virus targets.
- Wave 1: large, near, gently bobbing. Wave 2: medium, bobbing/drifting. Wave 3: small,
  far, drifting — difficulty ramps within the session.
- **Wind** (with HUD direction + strength indicator) bends every arrow; it re-rolls after
  each shot and gets stronger in later waves.
- Win: clear all 3 waves (10 viruses) → time bonus. Lose: arrows exhausted or timer hits 0.

## Controls

- **Drag back anywhere** (touch-first, slingshot style) to set angle + power; release to fire.
- Dotted **trajectory hint for the first 3 shots only**; afterwards just the pull line +
  power ring.

## Scoring

| Target            | Points |
| ----------------- | ------ |
| Large virus       | 100    |
| Medium virus      | 150    |
| Small virus       | 250    |
| Core hit          | x2 (CRITICAL) |
| Streak bonus      | +25 per consecutive hit (max +100) |
| Win time bonus    | +5 per second remaining |

## Tech

- React 19 + TypeScript + Phaser 3 (arcade physics) + Vite 6, Tailwind (CDN) for UI chrome.
- All sprites drawn programmatically on canvas — **no emoji, no image/audio files**.
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
