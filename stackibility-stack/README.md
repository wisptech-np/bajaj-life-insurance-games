# LifeStack – Premium Stacking Game

LifeStack is a hyper-casual 2D stacking game where players build a "Life Tower" out of critical life assets using a swinging crane. The game emphasizes physics-based placement, combo matching, and immersive game-feel through haptics, synthetic audio, and parallax visuals.

## Design Philosophy

The game was designed around the core theme: **"Building life is hard. Protecting it is smart."**
Players must carefully stack essential life assets (Home, Health, Car, Family, Education, etc.) to build the tallest and safest tower possible without destabilizing it. 

### Visual Identity & Branding
The game uses a strict **Bajaj Life Insurance** brand palette to convey trust, stability, and energy:
- **Primary Blue:** `#005BAC`
- **Dark Blue:** `#004080`
- **Light Blue:** `#3B8DD4`
- **Accent Orange:** `#F26922`
- **Clean White:** `#FFFFFF`

Typography utilizes the **Poppins** font (weights: 600, 800, 900) to ensure a modern, playful, yet premium aesthetic for all UI elements.

## Core Gameplay Mechanics
- **Pendulum Crane:** Blocks swing back and forth on a dynamically resizing rope. Players tap anywhere on the screen to release the block via gravity.
- **Physics Landing Strategy:**
  - **Perfect Drop:** Placed perfectly on top of the underlying block. Grants `+1` increment to the Combo Meter, triggers haptic bursts, synthetic chimes, and Hit-Stop.
  - **Off-Center Drop:** The block trims its width based on the overhang to match the stability structure below. The trimmed overhang is lost, making future stacking harder.
  - **Miss:** The block falls off the tower, drastically reducing the tower stability or triggering an immediate Game Over if stability was already low.
- **Stability Core:** As blocks are placed poorly, a vertical "Stability Bar" drops. Dropping below 30% triggers the bar to flash Red (`#EF4444`) and aggressively shake, warning the player of imminent collapse.

## "Game Feel" & Micro-Interactions
Massive emphasis was placed on making the game feel tactile and hyper-responsive:
- **Fever Mode:** Reaching a `x5` Combo Streak engages *Fever Mode*. The pendulum crane's swing speed is cut in half (`0.5x`), giving the player an intense slow-motion window to chain further perfect drops.
- **Hit-Stops:** A physical frame skip of `~0.05s` occurs on *Perfect Drops*, pausing the entire rendering engine to artificially simulate heavy impact weight.
- **Web Audio Synthesis:** Because the game operates with zero external media files, sound effects are generated precisely via the Web Audio API (`AudioContext`):
  - *Chimes (Perfect)*: Dual sine-wave oscillators at 880Hz and 1100Hz.
  - *Thuds (Normal Hit)*: Low frequency triangle waves swept downwards to 50Hz.
  - *Crashes (Collapse)*: Algorithmic white-noise buffers mixed with deep sawtooth waves.
- **Haptic Engine:** Native `navigator.vibrate` is called during precise timing (e.g. `15ms` for a perfect tap, `[50, 50, 100]` rumble for a collapse).

## Canvas Rendering & Visual Depth
The game engine uses a customized raw `HTML5 Canvas 2D API` without external engines:
- **Dynamic Camera System:** As the tower grows, the camera interpolates downwards via linear interpolation (Lerp), smoothly revealing higher skies.
- **Immersive Parallax Dimensions:**
  - **Volumetric Clouds:** Semitransparent white arcs move softly at a `0.15x` negative-scroll correlation, floating slowly down the screen as the player builds up.
  - **Moody Mountains:** A sharp, dark blue jagged polygonal range scrolls at `0.4x`, fading dramatically downward as the tower climbs higher into the atmosphere.
  - **Deep Space Stars:** Floating fixed-position dots unaffected by the camera simulate immense planetary depth behind the parallax features.
- **Drop Prediction Shadow:** A colossal faint white shadow renders vertically beneath the swinging block, giving the player tactical feedback on exactly where the block will land on release.

## UI / UX Overlay Structure
- The overlay is entirely HTML/CSS Absolute-Positioned atop the Canvas in `index.html`.
- **Vertical HUD:** Designed for portrait mobile devices. 
- **Interactive Tutorial:** A sleek overlay accessible from the Start screen outlines rules simply with typography and Emojis instead of confusing text blocks.
- **Emoji Semantics:** All asset text-labels were stripped. Instead of reading "HOME" or "FAMILY", the blocks elegantly render massive emojis (🏠, ❤️, 👨‍👩‍👧, 🚗) to convey the asset naturally during high-speed gameplay.

---

## 🛠️ Complete UI Architecture (For Claude UI Rework)
If you are planning to completely overhaul the UI, here is the strict mapping of the DOM structure overlaid on top of the `<canvas id="c"></canvas>`.

### 1. Canvas Constraints
The game uses a pure `<canvas id="c">` absolutely positioned spanning `100vw` and `100vh`. Touch events are intercepted globally via `window.addEventListener('touchstart')`.

### 2. HUD Elements (Persistent during play)
The HUD lives inside `#hud` (`position: absolute; pointer-events: none`).
- **Top Bar (`#top-bar`)**: Flexbox container spanning the top width.
  - **Score (`#score-box`)**: Contains the raw number inside `#score`. When score increases, the class `.score-pop` is dynamically appended for an animation pop.
  - **Floors (`#height-box`)**: Displays current tower height inside `#height`.
- **Level Name (`#level-name`)**: Centers the text under the top bar, displaying the current environment (e.g. "Starting Life").
- **Combo Badge (`#combo-badge`)**: Hidden by default (`.hidden`). When a combo occurs, `.show` is dynamically toggled to slide it into view with text like `🔥 x5 STREAK!`.
- **Stability Bar Sidebar (`#stability-bar-wrap`)**: 
  - Anchored to the left-middle of the screen spanning 40% of viewport height.
  - `#stability-fill` grows vertically based on stability percentage (`0-100%`).
  - Colors are managed by `UIManager.js` inline styles (Blue > 70%, Orange > 30%, Red < 30%).
  - At <30% stability, `.shake-warning` is applied to `#stability-bar-wrap`.

### 3. Screen Overlays (Modals)
All modals are centered `z-index: 20` `absolute` overlays with the `.hidden` class used to toggle visibility.
- **Start Screen (`#start-screen`)**:
  - `#btn-start` (`div.screen-cta`): Engages the game loop.
  - `#btn-tutorial` (`div.screen-secondary`): Opens the How To Play screen.
- **Tutorial Screen (`#tutorial-screen`)**:
  - Explains the gameplay. Has a close button `#btn-tut-close`.
- **Game Over Screen (`#gameover-screen`)**:
  - Displays statistical breakdown dynamically injected into:
    - `#go-score`
    - `#go-floors`
    - `#go-level`
  - Re-clicking anywhere natively restarts the game because `window` catches the click in `GameManager.js` if the state is `GAMEOVER`.

### 4. Animation Classes in `index.css`
- `@keyframes scorePop`: Triggers the 1.3x scale bounce.
- `@keyframes barShake`: High frequency X-axis wobble used for the stability warning.
- `@keyframes pulse`: Used on `.blink` classes for generic CTA "Tap to Start".

### Recommendations for a Rework
When passing this to an AI for a UI rework:
1. Do not break the IDs (`#score`, `#height`, `#stability-fill`, `#start-screen`, `#gameover-screen`) as `UIManager.js` strictly queries them.
2. Maintain `touch-action: none;` and `user-select: none;` on the `body` and `html` to prevent accidental zooming/scrolling on mobile devices while tapping the game.
