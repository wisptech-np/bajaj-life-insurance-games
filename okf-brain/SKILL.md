---
name: bajaj-games-brain
description: >
  Bajaj Life Insurance Games workspace knowledge brain. Activate this skill when building,
  modifying, or debugging any game in the bajaj-life-insurance-games repository. It contains
  the full project map, game catalog, design system, common services reference, and UI/UX
  standards that all games must follow.
---

# Bajaj Life Insurance Games — Workspace Brain Skill

This skill provides the centralized knowledge base for all games in the Bajaj Life Insurance
Games workspace. **Read this before building or modifying any game.**

## 1. Workspace Map

The workspace root is at `C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games`.

Read the centralized OKF index for a full sitemap of all projects:
- [Workspace Index](../okf-brain/index.md)
- [Workspace Log](../okf-brain/log.md)

### Game Directories
| Game | Directory | OKF Brain |
|---|---|---|
| Coverage Archer | `coverage-archer/` | [index.md](../okf-brain/coverage-archer/index.md) |
| Life Goals Bubble Shooter | `life-goals-bubble-shooter/` | [index.md](../okf-brain/life-goals-bubble-shooter/index.md) |
| Stackibility Stack | `stackibility-stack/` | [index.md](../okf-brain/stackibility-stack/index.md) |
| Tightrope Protection | `tightrope-protection/` | [index.md](../okf-brain/tightrope-protection/index.md) |
| Retire-Rich Clicker | `retire-rich-clicker/` | [index.md](../okf-brain/retire-rich-clicker/index.md) |
| EduRise Jumper | `edurise-jumper/` | [index.md](../okf-brain/edurise-jumper/index.md) |
| Tax-Save Maze | `tax-save-maze/` | [index.md](../okf-brain/tax-save-maze/index.md) |
| SheShield Protector | `she-shield-protector/` | [index.md](../okf-brain/she-shield-protector/index.md) |
| SafeStride Balancer | `safe-stride-balancer/` | [index.md](../okf-brain/safe-stride-balancer/index.md) |

---

## 2. Design System & Visual Standards

All games MUST follow these premium visual standards. Games should feel like **AAA mobile titles**
(Jetpack Joyride, Temple Run, Subway Surfers quality).

### 2.1 Brand Colors
| Token | Hex | Usage |
|---|---|---|
| **BLUE** | `#003DA6` | Primary brand, buttons, headers (Bajaj Life blue) |
| **ORANGE** | `#F26522` | Accent / secondary buttons, highlights |
| **GREEN** | `#28A745` | Success / positive feedback |
| Dark BG | `#0B1221` | Primary dark background |
| Glass | `rgba(255,255,255,0.05)` with `backdrop-filter: blur(12px)` | Cards, panels |

### 2.2 Typography
- **Primary Font**: `'Plus Jakarta Sans'` or `'Poppins'` (Google Fonts)
- **Heading sizes**: clamp-based responsive (e.g., `clamp(1.2rem, 4vw, 1.8rem)`)
- **All text**: White on dark, with secondary text at `rgba(255,255,255,0.7)`

### 2.3 Canvas Game Object Rendering — CRITICAL
**DO NOT use raw emoji characters (🏃‍♀️, 💰, ⚡) as game sprites.**
Instead, render game objects using:
1. **SVG-based vector sprites** drawn directly on canvas via `Path2D` or inline SVG
2. **Programmatic canvas drawing** with gradients, shadows, and glow effects
3. **CSS-animated DOM elements** with proper styling (radial gradients, box-shadows, border effects)
4. **Generated sprite sheets** using the `generate_image` tool for key visual assets

Each game object should have:
- A glow/shadow effect (`ctx.shadowBlur`, `ctx.shadowColor`)
- Smooth gradient fills (not flat colors)
- Scale-up/bounce animation on spawn
- Trail/particle effects on movement
- Proper anti-aliased rounded shapes

### 2.4 UI Component Standards
- **Buttons**: Rounded (`border-radius: 12px`), gradient backgrounds, press-scale `0.96`, subtle glow
- **Cards**: Glassmorphic (`backdrop-filter: blur(12px)`, semi-transparent white border)
- **Progress bars**: Gradient fills with animated shimmer overlay
- **Score displays**: Large, bold, with counting animations
- **Modals**: Centered with backdrop blur, slide-up entrance animation

### 2.5 Animation Requirements
- **Screen shake**: On damage/collision (translate X/Y oscillation, 0.3s)
- **Particle systems**: On coin collection, explosions, power-ups (min 8 particles)
- **Floating text**: Score indicators float up and fade (+100, COMBO!, etc.)
- **Transitions**: All screen changes use fade/slide transitions (0.3-0.5s)
- **Pulse effects**: On interactive elements (buttons, collectibles)

### 2.6 Audio (Web Audio API)
All games use synthesized audio (no external files):
- Coin pickup: ascending sine tones (400→600→800 Hz)
- Hit/damage: sawtooth low rumble (200→100 Hz)
- Power-up: triangle chord (C-E-G, 523→659→784 Hz)
- Victory: 5-note ascending fanfare
- UI click: short 1000Hz sine blip (50ms)

---

## 3. Common Services Reference

Every game copies these shared services. See [COMMON_SERVICES.md](../../bajaj-game-store/COMMON_SERVICES.md) for full details.

| Service | File | Purpose |
|---|---|---|
| LMS API | `services/api.ts` | Lead submission + slot booking |
| Play Count | `services/playCount.ts` | One-per-session play counter |
| Crypto | `utils/crypto.ts` | AES-256 token encrypt/decrypt |
| Shortener | `utils/shortener.ts` | URL shortening for share links |

---

## 4. Lead Capture Form Standards

Every game ends with a lead capture form containing:
- **Name** (text input)
- **Mobile** (10-digit, pattern `^[6-9]\d{9}$`)
- **Email** (email input)
- **T&C Consent** checkbox (required)
- **Submit** button → calls `submitToLMS()`
- **Book a Slot** option → date picker + time dropdown → calls `updateLeadNew()`
- **Thank You** screen with confetti animation

---

## 5. Mobile Optimization Checklist

Every game MUST:
- [ ] Set viewport: `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`
- [ ] Use `touch-action: manipulation` on body
- [ ] Prevent default touch behaviors (no scroll/zoom during gameplay)
- [ ] Scale canvas to `window.innerWidth × window.innerHeight`
- [ ] Use `devicePixelRatio` for crisp rendering on retina screens
- [ ] Touch targets minimum 44×44px
- [ ] Test at 360×640, 375×812, 414×896 viewport sizes

---

## 6. OKF Documentation

When creating or modifying a game, always update its OKF files under `okf-brain/<game-name>/`:
- `index.md`: Project overview with YAML frontmatter (`type`, `title`, `description`, `resource`, `tags`, `timestamp`)
- `log.md`: Chronological change log
