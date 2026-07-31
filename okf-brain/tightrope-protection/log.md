---
type: log
title: Tightrope Protection Change Log
description: Chronological history of changes for Tightrope Protection.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/tightrope-protection/log.md
timestamp: 2026-07-08T08:42:25+05:30
---

# Tightrope Protection Change Log

## [2026-07-08] OKF Initialization
- Created `index.md` and `log.md` under the centralized `okf-brain/tightrope-protection/` directory.

## [2026-07-08T09:35:00+05:30] UI & Validation Polish
- Upgraded button styles to rounded-xl (12px) across all screens (Intro, Details, T&C Modal, Book Slot Modal).
- Added transition scale on hover (1.02) and active scale (0.95) along with focus glowing ring on buttons.
- Strengthened lead capture validation by making Email mandatory, verifying format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), and showing explicit validation error message.
- Audited Phaser canvas drawing code; confirmed no raw emojis are used as game objects (all assets such as the beetle, coins, and shields are procedurally drawn with Canvas arcs/paths).
- Ran pnpm build successfully with zero compiler errors.

## [2026-07-31] Full UI revamp to the guardian-shelter gold standard
- **Own visual identity.** Gave the game a palette accent and shape language distinct from the other 44: brand ORANGE `#F26522` as the signature (balance pole, lit cable, primary CTAs), brand BLUE `#003DA6` as structure, brand GREEN `#28A745` for reward. Motif is long taut horizontals + height/altitude ticks. Design tokens, glass card, shared 52px button height and 12px radius live in `index.html`.
- **Rebuilt the Phaser art** (`game/scenes/PreloadScene.ts`). Replaced the beetle/virus sprites with a tightrope walker carrying an orange balance pole (4-frame walk + tucked hop pose), a crimson gust vortex hazard (3-frame loop), a beveled rupee coin, a brand-blue protection crest and soft radial spark/glow particles. All layered gradients, rim light and depth; high-value foreground on a dark ground.
- **Rebuilt the scene** (`game/scenes/MainScene.ts`). Layered sky gradient + horizon bloom, two parallax skyline bands drawn across 2x width so the wrap is seamless, a depth haze below the lowest rope, three taut cables where the rope the walker is on is lit orange, and lattice anchor pylons with beacons and cable eyelets. Explicit `D.*` depth constants replace insertion-order stacking.
- **Fixed the lane-switch arc.** The tween ran `wireProgress: 0 -> 0`, so the arc never played and upward switches teleported. Now 0 -> 1 with gravity parked during the 180ms, plus a landing dust burst.
- **Fixed spawn lane range.** `Phaser.Math.Between(0, 3)` indexed a 3-element `wires` array, so ~25% of hazards and pickups spawned at `NaN`. Now `0..wires.length - 1`.
- **Polish beats.** 14-particle bursts + expanding ring flash, 300ms shake and a red flash on damage, back-ease pop-in on every spawn, scale-in floating `+₹100` / `SHIELD` / `BLOCKED` text at the point of action, camera fade in/out on scene entry and game over.
- **Compact HUD** (`components/GameScreen.tsx`). Icon + number only — pole glyph + score, coin glyph + savings, three shield pips for lives. Big bottom panels deleted. Progress is now a rope meter graphic: a lit cable with a walker marker and a goal pylon, not a labelled text bar.
- **G1 — email removed** from `components/EnterDetailsScreen.tsx` (state, validation, `email_id` in the `submitToLMS` payload, `onSubmit` payload) and `email` dropped from `PlayerInfo` in `types.ts`. `services/api.ts` untouched — `email_id` is optional and already defaults to `''`.
- **G2 — how-to-play is animation-only** (`components/HowToPlayPopup.tsx`). A 4s looping SVG demo: a finger glyph swipes up, the walker moves to the upper cable and that cable lights, then the finger taps and she hops a gust. Text is the heading, three icon-led labels (`Swipe`, `Tap to hop`, `Avoid gusts`) and the Play button. All instruction paragraphs deleted.
- **G3 — `tightrope-protection/asset-from-here.md`** written with 14 Nano Banana prompts unique to this game, including replacements for the existing `public/landing_bg.svg` and `public/thumbnail.png`, plus wiring notes on texture keys and the walker's `(0.5, 0.8125)` origin.
- **Results screen rebuilt** (`components/ScoringScreen.tsx`) to the repo standard: animated count-up, SVG circular ring at radius 75 with `strokeDasharray`/`strokeDashoffset`, confetti on a win (score >= 60), Share Score, glass action card with Call Specialist + Book Consultation, ghost Play again, small disclaimer.
- **No emoji anywhere.** All UI glyphs are inline SVG in the new `components/Icons.tsx`; verified by script over `App.tsx`, `index.html`, `types.ts`, `components/*` and `game/scenes/*`.
- **Contrast.** Muted text moved to `#A9C2E8` (10.2:1) and `#7E97BB` (6.2:1) on `#04122B`; orange buttons carry dark-ink labels (5.9:1) and green buttons use `#1E7E34 -> #14612A` (5.2:1) instead of `#28A745` with white (3.2:1, failing). Disclaimer lifted off 40% opacity.
- **Replaced `public/landing_bg.svg`** — the old file explicitly said "No wire or rope: this game plays on flat ground", contradicting the game name. New backdrop is three cables between anchor pylons over a night skyline.
- **Build:** `pnpm install && pnpm build` -> `✓ built in 6.96s`, exit 0. `npx tsc --noEmit` clean.
