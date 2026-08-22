# Bajaj Arcade — Unified Style Guide

**Version:** 2.0.0 · **Date:** 2026-08-22
**Supersedes:** `docs/GAME_DESIGN_SYSTEM.md` v1.0.0 (token list retained where noted; rendering doctrine, palette semantics, and layout frame all change)
**Applies to:** every title in the portfolio, including the approved Bubble Shooter.

This is the artifact that makes the asset uplift repeatable. Nothing gets generated, drawn, or licensed until it conforms to this document.

---

## 0. The one-paragraph brief

> Bajaj Arcade games are **shaded flat vector** — clean geometric shapes, one warm key light from the upper left, a soft ambient cool fill, no outlines, no gloss, no glassmorphism. Every scene is built on a **deep ink base** so that the one thing the player must act on is the **brightest object on screen**. Risk is always the **green virus**. Everything the player protects is **warm** — gold, amber, cream. The result should read, at a glance and at 32 px, as one studio's work.

---

## 1. Rendering doctrine

**Style: shaded flat vector, single warm key.**

| Rule | Spec |
|---|---|
| Key light | Upper-left, ~35°. Every object lit consistently. Non-negotiable — inconsistent lighting is the fastest way a set of assets stops looking like a set. |
| Shading | Two tones per surface: base + one shadow step (−18% lightness, +6% hue toward blue). Optional single warm rim on hero objects only. |
| Highlights | One flat highlight shape per object, max. No gradients on gameplay objects. |
| Outlines | None on gameplay art. Silhouette does the work. |
| Gradients | Backgrounds and UI surfaces only. Never on sprites. |
| Glassmorphism | **Removed.** Blur-backdrop panels are the visual signature of the rejected build. UI surfaces are now solid ink with a 1 px light edge. |
| Glow | Reserved. Glow means "interactive right now." Nothing decorative glows, ever. |
| Corner radius | 4 px on gameplay objects at 1x, 12 px on UI surfaces, 999 px on pills. |

**Banned across the portfolio:** emoji as assets, stock clip-art, drop-shadow text, bevel/emboss, lens flare, neon-cyberpunk grids, `ctx.arc` used as a character.

### 1.1 The per-game value idea

Every title states, in one sentence in its README, its **value idea** — the single high-contrast relationship that drives all its art. Example from the benchmark: *warm furnace glow against blinding white blizzard.*

Examples for this portfolio:

- `guardian-shelter` — *warm lit home interior against a cold green-lit exterior.*
- `spiral-sprint` — *bright descending shield against darkening depth; risk zones are the only lit thing below.*
- `secure-journey` — *a warm advancing column against a spreading green tide.*
- `milestone-hopper` — *lit safe lanes, unlit hazard lanes.*

If a game cannot state its value idea in one sentence, its art direction is not resolved.

---

## 2. Colour system

### 2.1 The semantic shift — read this before touching a palette

The review made **green the antagonist**. Green conventionally means *safe / success / go*. Both meanings cannot coexist. Therefore:

> **Green is hazard. Green is never positive. Positive is gold and cyan.**

Every use of `--color-success-emerald` (`#10B981`) from v1.0.0 is removed and replaced with gold or cyan. Any green pixel in any game must be a virus, a virus effect, or virus-contaminated. This is a hard portfolio rule and the most common way a title will fail review.

### 2.2 Base — the ink structure

Deep, slightly blue-violet, **not** pure navy. Gives cool shadows somewhere to sit and stops the portfolio's flat mid-value problem.

| Token | Hex | Use |
|---|---|---|
| `--ink-900` | `#0A1320` | Deepest background, vignette edges |
| `--ink-800` | `#101D2E` | Primary game background |
| `--ink-700` | `#18293D` | Background mid-plane, far parallax |
| `--ink-600` | `#22384F` | Near parallax, inactive surfaces |
| `--ink-500` | `#2F4A64` | Panel fill, dividers, disabled |

### 2.3 Brand

| Token | Hex | Use |
|---|---|---|
| `--bajaj-blue` | `#00529B` | Primary brand. CTA fill, logo lockup. |
| `--bajaj-blue-deep` | `#003B71` | Pressed states, CTA shadow step |
| `--bajaj-cyan` | `#00A3E0` | Secondary accent, active state, progress fill |
| `--bajaj-cyan-light` | `#5CCBF5` | Cyan highlight step, rim light |

### 2.4 Warm — everything the player protects or earns

The warm family is the emotional centre of the portfolio. Player, family, goals, score, rewards are all warm. This is what makes the green read as invasive.

| Token | Hex | Use |
|---|---|---|
| `--gold-500` | `#FFB800` | Reward, score, primary warm accent |
| `--gold-400` | `#FFCE4D` | Highlight step on gold |
| `--gold-600` | `#D18F00` | Shadow step on gold |
| `--amber-500` | `#FF8A34` | Key-light warmth, energy, combo states |
| `--cream-100` | `#FFF4DC` | Warm white — lit surfaces, character highlights |
| `--cream-300` | `#F2D9A8` | Warm mid — skin, wood, paper |

### 2.5 Hazard — the virus green

Acid/bio green. Deliberately unpleasant next to the warm family, deliberately far from `--bajaj-cyan` in hue so it never reads as brand.

| Token | Hex | Use |
|---|---|---|
| `--virus-500` | `#7CD41F` | Virus body, primary hazard |
| `--virus-400` | `#A6EE4F` | Virus highlight, spore, active pulse |
| `--virus-600` | `#4E9410` | Virus shadow step |
| `--virus-700` | `#2E5D08` | Virus core, contaminated ground |
| `--virus-glow` | `rgba(124,212,31,0.35)` | Contamination haze, danger zone fill |

### 2.6 Signal — UI only, never gameplay art

| Token | Hex | Use |
|---|---|---|
| `--signal-danger` | `#FF4D4D` | Timer critical, life lost. UI chrome only. |
| `--text-primary` | `#FFFFFF` | Headings, HUD numerals |
| `--text-secondary` | `rgba(255,255,255,0.68)` | Captions, labels |
| `--surface-panel` | `#152438` | Solid panel fill (replaces glass) |
| `--surface-edge` | `rgba(255,255,255,0.14)` | 1 px top edge on panels |

### 2.7 Contrast requirement

Every gameplay object must clear **4.5:1 luminance contrast against its immediate background**. The actionable object must be the highest-luminance element in its region. `smart-recall`'s *"colours are too dull"* was this rule being broken.

### 2.8 CSS token block

```css
:root {
  /* ink */
  --ink-900:#0A1320; --ink-800:#101D2E; --ink-700:#18293D;
  --ink-600:#22384F; --ink-500:#2F4A64;
  /* brand */
  --bajaj-blue:#00529B; --bajaj-blue-deep:#003B71;
  --bajaj-cyan:#00A3E0; --bajaj-cyan-light:#5CCBF5;
  /* warm */
  --gold-500:#FFB800; --gold-400:#FFCE4D; --gold-600:#D18F00;
  --amber-500:#FF8A34; --cream-100:#FFF4DC; --cream-300:#F2D9A8;
  /* hazard */
  --virus-500:#7CD41F; --virus-400:#A6EE4F; --virus-600:#4E9410;
  --virus-700:#2E5D08; --virus-glow:rgba(124,212,31,.35);
  /* signal + surface */
  --signal-danger:#FF4D4D;
  --text-primary:#FFFFFF; --text-secondary:rgba(255,255,255,.68);
  --surface-panel:#152438; --surface-edge:rgba(255,255,255,.14);
  /* elevation — solid, no blur */
  --shadow-panel:0 10px 28px rgba(0,0,0,.45);
  --shadow-cta:0 4px 0 var(--bajaj-blue-deep), 0 8px 18px rgba(0,0,0,.35);
  --shadow-object:0 3px 0 rgba(0,0,0,.22);
}
```

Note the CTA shadow: a **hard 4 px offset step**, not a soft glow. Chunky, tactile, arcade — and it survives compression.

---

## 3. Typography

| Role | Family | Size (1x) | Weight | Tracking |
|---|---|---|---|---|
| Game title | **Baloo 2** | 32 px | 800 | −0.01em |
| Score / HUD numeral | **Plus Jakarta Sans**, tabular | 20 px | 800 | 0 |
| Panel heading | Plus Jakarta Sans | 20 px | 700 | −0.01em |
| Body / label | Plus Jakarta Sans | 14 px | 500 | 0 |
| Caption | Plus Jakarta Sans | 12 px | 500 | +0.01em |
| Button label | Plus Jakarta Sans | 16 px | 700 | +0.03em |

Two families, both variable, both subsettable. **Baloo 2** for titles and big score pops — its rounded weight matches the flat-vector doctrine where a geometric grotesk reads corporate. **Plus Jakarta Sans** for everything functional. Latin + Devanagari subsets only; total font payload ≤ 60 KB woff2.

Numerals are always `font-variant-numeric: tabular-nums`. A score that jitters as it counts is a quality tell.

---

## 4. Layout frame — mobile-first portrait

**Design frame: 390 × 844 CSS px.** Everything is authored here. Desktop renders the same portrait frame, centred, on an `--ink-900` backdrop with a subtle vignette — no separate desktop layout.

```
┌──────────────────────────┐  0
│      safe top 44px       │
├──────────────────────────┤  44
│  HUD BAND  56px          │   ← score L · state C · pause R
├──────────────────────────┤  100
│                          │
│                          │
│      PLAY FIELD          │   ← 644px. Nothing else may enter.
│      390 × 644           │
│                          │
│                          │
├──────────────────────────┤  744
│  ACTION BAND  56px       │   ← controls, or empty for tap-anywhere
├──────────────────────────┤  800
│    safe bottom 44px      │
└──────────────────────────┘  844
```

- `env(safe-area-inset-*)` respected on every band.
- **The play field is sacred.** No HUD, no banner, no watermark inside it. `safe-crossing` failed review for HUD sitting in the traffic lane.
- Minimum touch target 48 × 48 px.
- Thumb zone: primary action must sit in the bottom 40% of the frame.
- Scaling: `min(width/390, height/844)`, integer-snap the transform to avoid half-pixel sprite sampling.

---

## 5. UI kit

### 5.1 Primary CTA

```
height 56px · radius 999px · fill var(--bajaj-blue) · label 16/700 white
shadow: 0 4px 0 var(--bajaj-blue-deep), 0 8px 18px rgba(0,0,0,.35)
press:  translateY(4px), shadow collapses to 0 0 0 — the button physically depresses
```

### 5.2 Secondary

Ghost: 2 px `--surface-edge` border, transparent fill, white label. Never competes with primary.

### 5.3 Icon button

48 × 48 circle, `--surface-panel` fill, 1 px `--surface-edge`, icon in `--text-primary` at 24 px.

### 5.4 Panel

`--surface-panel` fill, 20 px radius, 1 px `--surface-edge` inset top only, `--shadow-panel`. **No backdrop blur.**

### 5.5 HUD chips

Pill, 32 px tall, `rgba(10,19,32,.72)` fill, icon 20 px + tabular numeral. Score chip carries a gold icon; timer chip carries a gold clock that switches to `--signal-danger` with a 0.8 s pulse under 10 s.

### 5.6 Progress / cover bar

Rail 10 px, `--ink-600`, radius 5. Fill `--gold-500` → `--amber-500` horizontal. Depletion animates in `outQuad` over 240 ms; never snaps.

### 5.7 Screens — the mandated flow

1. **No start screen wall.** Game opens in live demo motion. One glowing affordance. (§8)
2. **No "How to Play" modal.** Deleted portfolio-wide. Mechanics are self-evident or the design is wrong.
3. **Pause** — panel: Resume / Restart / Sound / Exit. On re-entry from visibility-change auto-pause, a **3-2-1 re-acquire countdown** before the sim resumes. (Prevents the pause-scum exploit in reaction titles.)
4. **Run end** — outcome banner, score, best, `Play Again` primary, `Talk to an Advisor` secondary. **No score-linked financial insight box** (compliance, see research brief §8.3). **No "Claim Certificate".**
5. **Lead form** — Name + Mobile only. No email field anywhere.

### 5.8 Zero instructional text

No on-screen "how to play", no tutorial captions, no arrows with words. Permitted: a ghost-hand or ghost-arrow animation that fades after the first successful input.

---

## 6. Icon language

- 24 × 24 grid at 1x, 2 px stroke where stroked, otherwise solid fill.
- Flat vector, same two-tone shading as sprites, key light upper-left.
- **Silhouette test:** filled solid black at 24 px, every icon must remain identifiable and mutually distinct.
- SVG only. Single path per tone. No embedded raster, no filters.
- Named `icon-<subject>[-<variant>].svg`.

### 6.1 The 11 life-goal icons — locked set

One icon set, used identically in `smart-match-3d`, `portfolio-fit`, `wealth-merge`, `income-pipeline`, `smart-sorter`, and every future title that needs goal iconography. Each has a locked accent so the same goal is the same colour everywhere.

| # | Goal | Icon concept | Accent |
|---|---|---|---|
| 1 | **Shield** | Rounded heater shield, single centre ridge | `--bajaj-cyan` |
| 2 | **Savings** | Stacked coin column, front coin face-on | `--gold-500` |
| 3 | **Home** | Simple gabled house, one lit window | `--amber-500` |
| 4 | **Car** | Side-profile hatchback, two wheels | `--bajaj-cyan-light` |
| 5 | **Education** | Graduation cap, tassel right | `--bajaj-blue` |
| 6 | **Marriage** | Two interlocked rings, one gold one cyan | `--gold-400` |
| 7 | **Child** | Small figure with a raised hand | `--cream-300` |
| 8 | **Retirement** | Palm-and-sun arc over a horizon line | `--amber-500` |
| 9 | **Health** | Heart with a pulse line through it | `--cream-100` |
| 10 | **Rewards** | Six-point star with a flat centre facet | `--gold-500` |
| 11 | **Family** | Three figures, tallest centre | `--gold-400` |

**No emoji.** The current `smart-match-3d` tiles are a start but predate this system and must be regenerated against it.

---

## 7. The green virus — antagonist design

The one recurring character in the portfolio. It must be instantly recognisable across every title.

### 7.1 Core form

- **Silhouette:** a rounded blob with **exactly 7 stubby conical spikes**, unevenly spaced. Never a smooth circle, never a spiky starburst — the irregular 7 is the signature.
- **Body:** `--virus-500`, shadow step `--virus-600`, one flat `--virus-400` highlight upper-left.
- **Core:** a darker `--virus-700` inner disc, off-centre low-right, ~40% of body width.
- **Eyes:** two flat black ovals, close-set, slightly asymmetric. No pupils, no whites. Menacing but not gory — this ships in an insurance brand's arcade.
- **No mouth** in the base variant. Threat reads from the eyes and the silhouette.
- **Idle motion:** 0.9 s loop, ±4% non-uniform scale (breathing), spikes lag the body by 60 ms.
- Keep it **abstract and stylised** — no medical realism, no depiction of a specific pathogen or illness (compliance, research brief §8.6).

### 7.2 Variants — one language, five roles

| Variant | Delta from core | Used by |
|---|---|---|
| **Scout** (small) | 60% scale, 5 spikes, faster idle | swarms, fodder waves |
| **Standard** | The core form | default hazard everywhere |
| **Brute** (large) | 150% scale, 9 spikes, thicker shadow step, slower idle | mini-boss, high-HP targets |
| **Splitter** | Visible seam line across body, two-tone halves | splits into 2 Scouts on death |
| **Contaminant** (static) | No eyes, flattened, `--virus-glow` haze | hazard ground, danger zones, virus tide |

### 7.3 States

- **Hit:** 1 frame flash to `--cream-100` silhouette, then squash to sx 1.25 / sy 0.75 recovering over 180 ms `outElastic`.
- **Death:** burst into 6–9 `--virus-400` spore particles + a shrinking `--virus-glow` ring. Never a fade-out.
- **Spawn:** scale from 0 with `outBack`, 260 ms, plus a `--virus-glow` puff at origin.

### 7.4 Portfolio replacements

Every non-green antagonist is replaced by a virus variant: `guardian-shelter` clouds, `tightrope-protection` crows, `secure-journey` enemy army, `coverage-archer` opponent, `risk-slash` sliceable risks, `milestone-hopper` lane hazards, `safe-crossing` traffic threats, `debt`-style enemies anywhere.

---

## 8. Motion, juice, and the first 30 seconds

### 8.1 Easing contract

Already in `shared/game-kit/effects.js`. Use these, do not hand-roll.

| Situation | Easing | Duration |
|---|---|---|
| Input response | `outQuad` | 120 ms |
| Object settle | `outCubic` | 220 ms |
| Reward / pop-in | `outBack` | 300 ms |
| Impact recovery | `outElastic` | 400 ms |
| Screen transition | `inOutCubic` | 280 ms |
| Continuous motion | `linear` + `damp()` | — |

### 8.2 The impact stack — call all five, staggered

Any meaningful impact fires, in order:

| t | Effect | Call |
|---|---|---|
| 0 ms | Sound | `audio.play('impact')` |
| 0 ms | Flash frame — white silhouette, 1–2 frames | draw pass |
| 0 ms | Hit-stop 40–80 ms | `fx.addHitStop()` |
| 0 ms | Screen shake | `fx.addShake()` |
| +16 ms | Particle burst | `fx.burst()` |
| +16 ms | Squash/stretch recovery | `fx.squash()` |
| +32 ms | Floating score text | `fx.floatText()` |

One burst alone is why the current games feel flat. All five together is the difference.

### 8.3 Anticipation

Every player-initiated action gets 60–100 ms of wind-up before it fires: scale to 0.94 and rotate 3° against the action direction, then release. Currently missing portfolio-wide.

### 8.4 Permanence

Impacts leave marks — scorch, spore residue, debris — that persist for the run in a pooled ring buffer, capped by `effectBudget`. A screen that resets to pristine reads as a demo.

### 8.5 First-30-seconds standard

1. Opens in motion, non-scoring demo beat.
2. Exactly one glowing affordance; nothing else interactive.
3. First input succeeds regardless of accuracy.
4. Full impact stack on that first success.
5. Difficulty engages from interaction two.
6. Core loop completable in 10–15 s.
7. Zero words.

### 8.6 Reduced motion

`prefers-reduced-motion` drops shake and particles, **keeps** floating score text and colour feedback. Already handled by `effectBudget()`.

---

## 9. Audio

Oscillator synthesis is retired. Every title ships one licensed **sample sprite**.

| Layer | Spec |
|---|---|
| Format | One `sfx.webm` sprite per game (Opus ~64 kbps), decoded to an `AudioBuffer` once |
| Budget | ≤ 250 KB per game, all audio |
| Required cues | `tap`, `success`, `impact`, `fail`, `collect`, `combo`, `run-end` |
| Music | Optional, one 20–30 s seamless loop, ≤ 120 KB, mixed −18 LUFS under SFX |
| Pitch variance | ±6% random on repeated cues — identical repeats read as cheap |
| Gating | All audio behind first user gesture (iOS Safari requirement) |
| Mute | Persisted per-origin, honoured before first play |

---

## 10. Files, naming, and budgets

```
shared/assets/
  icons/          icon-shield.svg  icon-savings.svg  …          (11 life goals + UI)
  virus/          virus-standard.svg  virus-scout.svg  virus-brute.svg
                  virus-splitter.svg  virus-contaminant.svg
  ui/             btn-primary.svg  panel-frame.svg  hud-chip.svg  bajaj-lockup.svg
<game>/src/assets/
  atlas.webp  atlas.json          one packed sheet, ≤2048², MaxRects, 2px pad + extrude
  bg-far.webp  bg-near.webp
  key-art.webp                    end card / store tile
  sfx.webm
```

- kebab-case, `[category]-[subject]-[variant].[ext]`
- Author raster at 3x, ship 1x + 2x. Never upscale.
- WebP q88 sprites / q82 backgrounds. SVG for anything flat.

| Budget | Target | Cap |
|---|---|---|
| Total payload gzipped, per game | 1.8 MB | 2.5 MB |
| Art per game | 700 KB | 1.0 MB |
| Audio per game | 250 KB | 400 KB |
| Fonts (shared, cached) | 60 KB | 80 KB |
| Time to first interaction, 4G mid Android | 3 s | 5 s |

---

## 11. Conformance checklist

A title is style-guide compliant only when every line is true.

- [ ] Value idea stated in one sentence in the README
- [ ] Zero emoji anywhere
- [ ] Zero instructional text; ghost-hand only
- [ ] Every hazard is a green virus variant from §7
- [ ] No green pixel that is not a virus
- [ ] No glassmorphism / backdrop-blur
- [ ] Actionable object is the highest-luminance element in its region; 4.5:1 minimum
- [ ] Play field 390×644 free of HUD and chrome
- [ ] Primary action inside the bottom 40%
- [ ] Sprites are sprites — no `ctx.arc` characters
- [ ] Impact stack fires all five effects, staggered
- [ ] Anticipation on every player-initiated action
- [ ] Sampled audio, all seven cues, gated behind first gesture
- [ ] Time-critical input on `pointerdown`, never `onTap`
- [ ] Auto-pause on visibility change resumes via 3-2-1 countdown
- [ ] Lead form is Name + Mobile only
- [ ] No score-linked financial insight; no "Claim Certificate"
- [ ] Payload within §10 budgets
