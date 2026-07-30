# Game Design System — Bajaj Life Insurance Games

**Version:** 1.0.0  
**Target Platform:** Mobile-First Web & Desktop Browsers  
**Core Stack:** CSS3, HTML5, React, Canvas 2D, Phaser 3  
**Design Philosophy:** Premium, Modern, Friendly, Mobile-Native, High-Contrast, Financial Security Theme.

---

## 1. Design System Overview

The Bajaj Life Insurance Game Design System provides a cohesive visual language, layout architecture, typography hierarchy, component primitives, and animation standards across all 16 interactive games in the repository.

While each game retains its unique gameplay identity (e.g. space orbit, canyon gliding, block matching, archery), all games share unified HUD patterns, modal overlays, typography, color semantics, button interactions, and responsive mobile safe zones.

---

## 2. Color System & Design Tokens

### Core Color Palette

| Token Name | Hex Code | Purpose | Usage Examples |
|---|---|---|---|
| `--color-bajaj-blue` | `#00529B` | Primary Brand Color | Primary Buttons, Header Bars, Main Accents |
| `--color-bajaj-navy` | `#061826` | Deep Background | Modal Overlay Backdrops, Game HUD Container |
| `--color-bajaj-cyan` | `#00A3E0` | Secondary Brand Accent | Highlights, Active States, Energy Bars |
| `--color-gold-accent` | `#FFB800` | Reward & Value Accent | Stars, Coins, Timers, High Score Counters |
| `--color-gold-light` | `#FFE699` | Reward Text Highlight | Trophy Labels, Bonus Popups |
| `--color-success-emerald` | `#10B981` | Positive Feedback | Level Complete, Win Badges, Health Full |
| `--color-risk-crimson` | `#EF4444` | Hazard & Risk Warning | Virus Swarms, Danger Zone, Time Low |
| `--color-glass-surface` | `rgba(6, 24, 38, 0.75)` | Card Surface | Glassmorphic Cards, Overlay Panels |
| `--color-glass-border` | `rgba(0, 163, 224, 0.25)` | Card Border Glow | Panel Borders, Input Outlines |
| `--color-text-primary` | `#FFFFFF` | Primary Body / Headings | Main Labels, Modal Titles |
| `--color-text-secondary` | `rgba(255, 255, 255, 0.75)` | Subtitles & Captions | Instructions, Tooltips |

### Gradient Tokens

```css
:root {
  --gradient-primary-btn: linear-gradient(135deg, #00529B 0%, #00A3E0 100%);
  --gradient-primary-btn-hover: linear-gradient(135deg, #0066C2 0%, #00B4F8 100%);
  --gradient-gold-badge: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  --gradient-risk-warning: linear-gradient(135deg, #EF4444 0%, #991B1B 100%);
  --gradient-glass-card: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%);
  --shadow-glass-panel: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  --shadow-button-glow: 0 4px 20px rgba(0, 163, 224, 0.4);
}
```

---

## 3. Typography Scale & Hierarchy

All games standardise on modern geometric sans-serif typefaces (`Outfit`, `Inter`, `system-ui`).

| Hierarchy Level | Font Size | Line Height | Weight | Letter Spacing | CSS Variable |
|---|---|---|---|---|---|
| **Display 1 (Game Title)** | 28px (Mobile) / 36px (Desktop) | 1.15 | 800 | -0.02em | `--font-display-1` |
| **Heading 1 (Modal Title)** | 22px / 26px | 1.2 | 700 | -0.01em | `--font-h1` |
| **Heading 2 (Section Title)** | 18px / 20px | 1.3 | 600 | normal | `--font-h2` |
| **Body 1 (Game Text / Help)**| 14px / 16px | 1.45 | 400 | normal | `--font-body-1` |
| **Body 2 (Captions / Tooltips)**| 12px / 13px | 1.4 | 400 | +0.01em | `--font-body-2` |
| **Button Label** | 15px / 16px | 1.0 | 700 | +0.03em | `--font-btn` |
| **HUD Tabular Counter** | 16px / 18px | 1.0 | 800 (Tabular) | normal | `--font-hud-num` |

```css
.hud-counter-text {
  font-family: 'Outfit', 'Inter', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}
```

---

## 4. Component System Specifications

### A. Buttons

1. **Primary Action Button (Bajaj Pill CTA)**
   - Min Height: `48px`
   - Touch Target: Min `48px x 48px` (exceeds 44px mobile requirement)
   - Border Radius: `24px`
   - Background: `var(--gradient-primary-btn)`
   - Box Shadow: `var(--shadow-button-glow)`
   - Hover / Focus Effect: `transform: translateY(-2px); filter: brightness(1.1);`
   - Active / Pressed State: `transform: scale(0.96); filter: brightness(0.95);`
   - Disabled State: `opacity: 0.5; pointer-events: none; filter: grayscale(0.5);`

2. **Secondary Glass Button**
   - Background: `rgba(255, 255, 255, 0.12)`
   - Border: `1px solid rgba(255, 255, 255, 0.3)`
   - Border Radius: `20px`
   - Text Color: `#FFFFFF`

3. **Icon Action Button**
   - Size: `44px x 44px` circle
   - Background: `rgba(6, 24, 38, 0.8)`
   - Border: `1px solid rgba(0, 163, 224, 0.3)`
   - Icon Alignment: Center flex

---

### B. Cards & Glass Panels

- **Backdrop Blur:** `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);`
- **Background:** `linear-gradient(180deg, rgba(10, 30, 50, 0.85) 0%, rgba(6, 20, 35, 0.92) 100%)`
- **Border:** `1px solid rgba(0, 163, 224, 0.25)`
- **Border Radius:** `20px`
- **Box Shadow:** `0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15)`
- **Mobile Safe Area Padding:**
  ```css
  .game-modal-container {
    padding-top: max(20px, env(safe-area-inset-top));
    padding-bottom: max(20px, env(safe-area-inset-bottom));
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }
  ```

---

### C. Game HUD Patterns

1. **Top Bar HUD Container:**
   - Position: Fixed / Absolute at top of viewport
   - Background: Translucent gradient (`rgba(6, 24, 38, 0.7)`) with bottom border accent
   - Left Element: Level / Stage Badge
   - Center Element: Score Badge with golden icon
   - Right Element: Timer Badge with countdown clock

2. **Timer Indicator:**
   - Normal State: Glass pill with gold clock icon
   - Critical State (Time < 10s): Pulsing red glow (`animation: pulseDanger 0.8s infinite alternate;`)

3. **Progress / Health Bar:**
   - Outer Rail: `height: 12px; background: rgba(255, 255, 255, 0.15); border-radius: 6px;`
   - Fill Bar: `background: linear-gradient(90deg, #10B981, #00A3E0); border-radius: 6px; transition: width 0.3s ease-out;`

---

### D. Standard Screen Overlays

1. **Start Screen Overlay**
   - Title Banner: Game logo with Bajaj Life tagline
   - Feature Card: 3 key goal badges
   - Actions: "Play Now" primary CTA, "How to Play" secondary button

2. **How to Play Modal**
   - Visual 3-step graphic instruction layout
   - Touch controls diagram
   - "Got It! Start Game" CTA

3. **Pause Screen Modal**
   - Semi-transparent dark overlay (`rgba(0, 0, 0, 0.6)`)
   - Options: Resume, Restart, Sound On/Off, Exit

4. **Game Over / Victory Modal**
   - Outcome Banner: Glowing Victory Shield or Encouraging Retry Badge
   - Score & Bonus Summary Table
   - Financial Goal Insight Box: Educational takeaway linking score to financial planning
   - Action Buttons: Primary "Book Financial Consultation" / "Claim Certificate", Secondary "Play Again"

---

## 5. Micro-Interactions & Feedback

1. **Touch Feedback:** Every interactive button and tap zone triggers visual shrink (`scale(0.96)`) + subtle haptic vibration (`navigator.vibrate(12)`).
2. **Score Popups:** Floating `+100` score animations float upward with `opacity` fade and `translateY(-30px)`.
3. **Motion Sensitivity:** Respects `prefers-reduced-motion: reduce` by disabling non-essential screen shake and particle bursts while retaining score text popups.

---

## 6. Asset Folder Structure & Naming Standard

All game assets follow a clean, modular directory structure:

```text
assets/
  shared/
    icons/
      icon-shield.svg
      icon-timer.svg
      icon-star.svg
      icon-trophy.svg
      icon-sound-on.svg
      icon-sound-off.svg
    ui/
      bajaj-logo.svg
      glass-button-bg.png
      card-header-glow.png
  games/
    <game-name>/
      backgrounds/
        bg-main.webp
        bg-parallax-far.webp
      characters/
        player-idle.webp
        player-action.webp
      objects/
        tile-home.webp
        obstacle-risk.webp
      ui/
        hud-banner.webp
```

### Filename Rules
- Always lowercase separated by hyphens (kebab-case).
- Format: `[category]-[descriptor]-[state/variant].[ext]`
- Example: `player-hero-running.webp`, `obstacle-virus-spiky.webp`, `badge-level-complete.webp`.

---

## 7. Performance & Optimization Standards

1. **Image Formats:** WebP/SVG for all new raster and vector assets. PNG preserved only when lossless alpha mask is mandatory.
2. **Canvas High-DPR Rendering:** Every Canvas 2D game caps `devicePixelRatio` at `Math.min(window.devicePixelRatio || 1, 2)` and applies `ctx.scale(dpr, dpr)` to ensure crisp visuals without GPU memory waste.
3. **Asset Lazy-Loading:** Decorative modal images lazy-loaded after canvas scene initialization.
