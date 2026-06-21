# LifeStack - UI Design Specification

This document outlines the exact architecture, layout, styling, and mechanics of the UI and rendering system for the **LifeStack** mobile game. You can use this as a reference guide or prompt context for UI overhauls.

---

## 1. Architecture & Layout Framework
- **Hybrid approach**: The game relies on an **HTML5 Canvas 2D API** for all moving game elements (blocks, rope, physics, backgrounds), overlaid with standard **DOM-based HTML/CSS** elements for the heads-up display (HUD) and menus.
- **Viewport constraints**: The container is locked to `100vw` and `100vh` with `overflow: hidden`, preventing any native scrolling.
- **Mobile First**: All elements are structured primarily for portrait mode viewing on mobile devices. Touch actions are captured to prevent double-tap zooming or native mobile pull-to-refresh.

---

## 2. Brand Colors (Bajaj Life Insurance Theme)
The game was recently reskinned to match the Bajaj brand identity:
- **Primary Blue**: `#005BAC`
- **Dark Blue**: `#004080` (used for shadows/ground)
- **Deep Navy / Indigo**: `#0A192F` (used for sky gradients)
- **Accent Orange**: `#F26922` (used for progress bars, buttons, and alert blocks)
- **Light Blue**: `#3B8DD4`
- **Clean White**: `#FFFFFF`
- **Dark Text (On White)**: `#0F172A`

---

## 3. DOM Elements & HUD (HTML / CSS)
The DOM interface is absolutely positioned via z-indexing over the canvas.

### Core HUD layout:
- **Score Node (`#score-box`)**: 
  - Position: Top-Left padding (`top: 20px, left: 20px`).
  - Style: Huge numerical value (`font-weight: 800`, `font-size: 2.2rem`), sitting above a highly tracked subtitle ("SCORE" with `letter-spacing: 2px`).
- **Floors Node (`#height-box`)**:
  - Position: Top-Right (via flex `justify-content: space-between`).
  - Style: Identical typographical hierarchy to the score block.
- **Level Name (`#level-name`)**:
  - Position: Absolute, dead center horizontally, `top: 70px`.
  - Style: Small uppercase text, tracked out.

### Vertical Stability Sidebar (`#stability-bar-wrap`):
- **Position**: Anchored to the left edge (`left: 20px`), vertically centered (`top: 50%`, `transform: translateY(-50%)`).
- **Layout**: It acts as a side-bar progress meter. `width: 8px`, `height: 40%` (min 200px). 
- **Styling**: The track is a subtle white translucent pill (`border-radius: 4px`, `background: rgba(255,255,255,0.1)`). 
- **Internal Fill**: The inner `#stability-fill` uses `flex-end` to ensure it pushes up from the bottom. The fill uses brand orange (`#F26922`).

### Ephemeral UI:
- **Combo Badge (`#combo-badge`)**: 
  - Shows when players get a "Perfect" drop. Absolute centered.
  - Scale transforms in dynamically `scale(0)` to `scale(1)` using a bouncy cubic-bezier.
- **Tap Hint (`#tap-hint`)**:
  - Persistent subtle text centered at the bottom (`bottom: 40px`). Small, very tracked (`letter-spacing: 3px`), low opacity.

### Screens (Start & Game Over):
- Full covering divs (`inset: 0`).
- **Backdrop**: Uses CSS `backdrop-filter: blur(8px)` with a dark translucent tint `rgba(10,14,26, 0.85)`. 
- **Typography**: Uses heavy font-weights (`font-weight: 900`), very tight letter spacing for major titles (`letter-spacing: -2px`). Emojis (🏗 / 💔) are used as hero icons.
- **CTA text**: Blinking animation altering opacity from 0.3 to 1 to prompt tap-to-start.

---

## 4. Canvas Rendering (Renderer.js)
The environment itself is painted purely in canvas context.

### Environments & Background
- Painted via a full vertical linear gradient based on the current level theme.
- **Stars / Distant Particles**: 35 subtle circles drawn with low opacity white across the top 70% of the screen.

### Blocks (The Stacked Assets)
- **Base Dimensions**: Standard blocks are `85px` wide and `32px` tall. The starting platform block is `120px` wide.
- **Shadowing**: A drop-shadow block is drawn slightly offset (`x+3, y+3`) under every block using a pure black translucent alpha (`rgba(0,0,0,0.3)`).
- **Body Paint**: Vertical linear gradient derived from the block's `color` property down to its `borderColor` property.
- **Highlight Detail**: A tiny flat translucent white rounded rectangle is drawn exactly on the top edge (giving the block a 3D "glassy" or beveled rim reflection).
- **Typography**: Label text is rendered inside the box, horizontally and vertically aligned to the center. It uses bold `Segoe UI`. If a block is white (`#FFFFFF`), the text renders deep navy for contrast; all other blocks utilize white text.

### The Rope & Crane
- Drawn from an invisible top anchor point down to the swinging block.
- **Styling**: Thin translucent white line, dashed `[5, 3]`. Base anchor is rendered as a clean glowing `4px` radius dot.

### Particles (Combo Effects)
- Simple geometric dots thrown outward from the center of a block when it lands perfectly stacked. 
- Utilizes simple canvas gravity math (`vy += 0.15`), gradually losing alpha until they splice from the array.

## Areas for UI Improvement
If passing this to Claude to improve the interface, these suggestions could be implemented:
1. CSS Animations for transitioning between screens rather than toggling `display: none`.
2. Polishing UI typography across the app to better utilize custom Web Fonts rather than system safe fallbacks like `Segoe UI`.
3. Making the starting base block on the canvas visually distinct from regular blocks.
4. Adding CSS particles or richer feedback to the DOM HUD elements (like making the SCORE numbers bounce on increase).
5. Ensuring that specific Bajaj brand gradients map correctly to UI text and call-to-action buttons.
