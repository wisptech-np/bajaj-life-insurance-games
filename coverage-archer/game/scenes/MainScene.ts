import Phaser from 'phaser';
import { playSynthSFX } from '../../utils/audio';
import { GameResult, HudState } from '../../types';
import { DPR, GAME_CONFIG as CFG, RISKS, RiskKind } from '../../data';

type Size = 'L' | 'M' | 'S';
type Pattern = 'pendulum' | 'orbit' | 'dart';

interface Target {
  sprite: Phaser.GameObjects.Sprite;
  kind: RiskKind;
  size: Size;
  radius: number;
  homeX: number;
  homeY: number;
  phase: number;
  baseScale: number;
  alive: boolean;
  knockX: number;
  knockY: number;
}

// Guardian Archer — single-player precision archery.
// The player is the ONLY shooter: risk targets never fire back.
// Every tunable lives in ../../data.ts (GAME_CONFIG / RISKS).
export default class MainScene extends Phaser.Scene {
  /* Player & aiming */
  private archer!: Phaser.GameObjects.Sprite;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private isDragging = false;
  private dragVector = new Phaser.Math.Vector2();

  /* Session state */
  private score = 0;
  private arrowsLeft = CFG.ARROWS_PER_SESSION;
  private arrowsUsed = 0;
  private timeLeft = CFG.SESSION_SECONDS;
  private gameActive = true;
  private waveTransition = false;
  private simTime = 0;          // ms of un-frozen gameplay, drives all target motion
  private hitStopMs = 0;

  /* Progress */
  private waveIndex = 0;
  private risksNeutralized = 0;
  private totalRisks = 0;
  private criticalHits = 0;
  private streak = 0;
  private bestStreak = 0;

  /* Wind */
  private windLevel = 0;
  private windDir: 'L' | 'R' | 'none' = 'none';
  private windAccelX = 0;
  private windFlashUntil = 0;
  private windStreaks: number[] = [];

  /* Entities */
  private arrow: Phaser.Physics.Arcade.Sprite | null = null;
  private arrowLive = false;
  private arrowPrev = new Phaser.Math.Vector2();
  private targets: Target[] = [];

  /* Graphics layers (all pre-allocated — nothing is created per frame) */
  private windGfx!: Phaser.GameObjects.Graphics;
  private trailGfx!: Phaser.GameObjects.Graphics;
  private aimGfx!: Phaser.GameObjects.Graphics;
  private powerText!: Phaser.GameObjects.Text;
  private lastPowerShown = -1;
  private trail: number[] = [];  // flat x,y ring buffer

  /* Timers / callbacks */
  private sessionTimer?: Phaser.Time.TimerEvent;
  private onHudUpdate!: (hud: HudState) => void;
  private onGameOver!: (result: GameResult) => void;
  private feedbackTimer?: Phaser.Time.TimerEvent;
  private currentFeedback = '';
  private outOfArrowsScheduled = false;

  constructor() {
    super('MainScene');
  }

  init() {
    this.onHudUpdate = this.registry.get('onHudUpdate');
    this.onGameOver = this.registry.get('onGameOver');

    this.score = 0;
    this.arrowsLeft = CFG.ARROWS_PER_SESSION;
    this.arrowsUsed = 0;
    this.timeLeft = CFG.SESSION_SECONDS;
    this.gameActive = true;
    this.waveTransition = false;
    this.simTime = 0;
    this.hitStopMs = 0;
    this.waveIndex = 0;
    this.risksNeutralized = 0;
    this.criticalHits = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.isDragging = false;
    this.dragStart = null;
    this.arrow = null;
    this.arrowLive = false;
    this.targets = [];
    this.trail = [];
    this.lastPowerShown = -1;
    this.currentFeedback = '';
    this.outOfArrowsScheduled = false;
    this.windFlashUntil = 0;
    this.totalRisks = CFG.WAVES.reduce((sum, w) => sum + w.targets.length, 0);
  }

  create() {
    // The canvas backing store is WIDTH*DPR x HEIGHT*DPR for retina crispness;
    // zooming the camera by DPR puts every game coordinate back in 480x640 design space.
    const cam = this.cameras.main;
    cam.setZoom(DPR);
    cam.centerOn(CFG.WIDTH / 2, CFG.HEIGHT / 2);

    this.physics.world.setBounds(0, 0, CFG.WIDTH, CFG.HEIGHT + 200);

    this.drawBackdrop();

    // Wind streak layer sits behind the actors
    this.windGfx = this.add.graphics();
    this.windStreaks = [];
    for (let i = 0; i < 12; i++) {
      this.windStreaks.push(Math.random() * CFG.WIDTH, 60 + Math.random() * 380, 12 + Math.random() * 26);
    }

    // Archer
    this.archer = this.add.sprite(CFG.ARCHER_X, CFG.ARCHER_Y, 'archer_spritesheet', 0);
    this.archer.setScale(1.15 / DPR);
    this.tweens.add({
      targets: this.archer,
      y: CFG.ARCHER_Y - 3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.trailGfx = this.add.graphics();
    this.aimGfx = this.add.graphics();

    this.powerText = this.add
      .text(CFG.WIDTH / 2, 100, '', {
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '13px',
        fontStyle: '900',
        color: '#FFFFFF',
      })
      .setOrigin(0.5)
      .setResolution(DPR)
      .setVisible(false);

    this.randomizeWind();
    this.setupAimControls();
    this.spawnWave(0);
    this.startSessionTimer();
    this.notifyHud();
  }

  update(_time: number, delta: number) {
    if (!this.gameActive) return;

    // Hit-stop: freeze the world for a beat so impacts land
    if (this.hitStopMs > 0) {
      this.hitStopMs -= delta;
      if (this.hitStopMs <= 0) this.physics.world.resume();
    } else {
      this.simTime += delta;
    }

    this.drawWind(delta);
    this.moveTargets(delta);
    this.drawAimPreview();
    this.updateArrow();

    if (!this.waveTransition) this.checkOutOfArrows();
  }

  /* ── Background art ─────────────────────────────────────────── */

  private drawBackdrop() {
    const w = CFG.WIDTH;
    const h = CFG.HEIGHT;

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x020715, 0x020715, 0x0a1f47, 0x0a1f47, 1);
    sky.fillRect(0, 0, w, h);

    const stars = this.add.graphics();
    for (let i = 0; i < 46; i++) {
      stars.fillStyle(0xffffff, 0.12 + Math.random() * 0.35);
      stars.fillCircle(Math.random() * w, Math.random() * (h * 0.6), Math.random() * 1.4 + 0.4);
    }

    // City skyline the family lives in
    const city = this.add.graphics();
    city.fillStyle(0x06132d, 0.55);
    const widths = [60, 50, 70, 80, 55];
    const heights = [140, 180, 110, 160, 200];
    let x = 0;
    while (x < w) {
      const i = Math.floor(x / 40) % widths.length;
      city.fillRect(x, CFG.GROUND_Y - 50 - heights[i], widths[i], heights[i]);
      x += widths[i] + 8;
    }

    // Ground hills — the backdrop missed arrows stick into
    const g = this.add.graphics();
    g.fillStyle(0x0d381e, 1);
    g.beginPath();
    g.moveTo(0, CFG.GROUND_Y - 40);
    this.quadCurve(g, 0, CFG.GROUND_Y - 40, 120, CFG.GROUND_Y - 70, 240, CFG.GROUND_Y - 45);
    this.quadCurve(g, 240, CFG.GROUND_Y - 45, 360, CFG.GROUND_Y - 30, w, CFG.GROUND_Y - 50);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fill();

    g.fillStyle(0x14532d, 1);
    g.beginPath();
    g.moveTo(0, CFG.GROUND_Y - 25);
    this.quadCurve(g, 0, CFG.GROUND_Y - 25, 150, CFG.GROUND_Y - 48, 280, CFG.GROUND_Y - 30);
    this.quadCurve(g, 280, CFG.GROUND_Y - 30, 400, CFG.GROUND_Y - 20, w, CFG.GROUND_Y - 34);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fill();

    g.fillStyle(0x00aeef, 0.08);
    g.fillEllipse(CFG.ARCHER_X, CFG.ARCHER_Y + 44, 90, 22);
  }

  private quadCurve(
    g: Phaser.GameObjects.Graphics,
    sx: number, sy: number, cx: number, cy: number, ex: number, ey: number,
    segments = 16
  ) {
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const mt = 1 - t;
      g.lineTo(mt * mt * sx + 2 * mt * t * cx + t * t * ex, mt * mt * sy + 2 * mt * t * cy + t * t * ey);
    }
  }

  /** Horizontal streaks that scroll with the wind so the bend is never a surprise. */
  private drawWind(delta: number) {
    this.windGfx.clear();
    if (this.windLevel === 0) return;

    const dirSign = this.windDir === 'R' ? 1 : -1;
    const speed = (18 + this.windLevel * 26) * dirSign * (delta / 1000);
    const alpha = 0.06 + this.windLevel * 0.035;
    this.windGfx.lineStyle(1.4, 0x00aeef, alpha);

    for (let i = 0; i < this.windStreaks.length; i += 3) {
      let sx = this.windStreaks[i] + speed;
      if (sx > CFG.WIDTH + 40) sx -= CFG.WIDTH + 80;
      if (sx < -40) sx += CFG.WIDTH + 80;
      this.windStreaks[i] = sx;
      const sy = this.windStreaks[i + 1];
      const len = this.windStreaks[i + 2] * (0.5 + this.windLevel * 0.16);
      this.windGfx.lineBetween(sx, sy, sx + len * dirSign, sy);
    }
  }

  /* ── Waves & targets ────────────────────────────────────────── */

  private spawnWave(index: number) {
    const wave = CFG.WAVES[index];
    if (!wave) return;

    const count = wave.targets.length;
    const [yTop, yBottom] = CFG.TARGET_BAND;
    const bandH = (yBottom - yTop) / count;

    wave.targets.forEach((spec, i) => {
      const radius = CFG.RISK_RADIUS[spec.size];
      const baseScale = radius / CFG.ART_RADIUS / DPR;
      const homeX = Phaser.Math.Between(wave.xRange[0], wave.xRange[1]);
      const homeY = Phaser.Math.Clamp(
        yTop + bandH * i + bandH / 2,
        yTop + radius,
        yBottom - radius
      );

      const sprite = this.add.sprite(homeX, homeY, `risk_${spec.kind}`, 0);
      sprite.setScale(0);
      sprite.setAlpha(0);
      this.tweens.add({
        targets: sprite,
        scale: baseScale,
        alpha: 1,
        delay: i * 120,
        duration: 380,
        ease: 'Back.easeOut',
      });

      this.targets.push({
        sprite,
        kind: spec.kind,
        size: spec.size,
        radius,
        homeX,
        homeY,
        phase: (i / count) * Math.PI * 2 + Math.random() * 0.6,
        baseScale,
        alive: true,
        knockX: 0,
        knockY: 0,
      });
    });
  }

  /** Each wave moves to its own rule — pendulum, orbit, then dart-and-hold. */
  private moveTargets(delta: number) {
    const wave = CFG.WAVES[this.waveIndex];
    if (!wave) return;

    const late = this.timeLeft <= CFG.LATE_SESSION_AT ? CFG.LATE_SESSION_SPEEDUP : 1;
    const speed = wave.speed * late;
    const amp = wave.amplitude;
    const t = this.simTime / 1000;
    const frame = Math.floor(this.simTime / 200) % 3;
    const decay = Math.pow(0.86, delta / 16.67);

    for (const target of this.targets) {
      if (!target.alive) continue;
      const sprite = target.sprite;
      const ph = target.phase;
      sprite.setFrame(frame);

      let ox = 0;
      let oy = 0;
      const pattern: Pattern = wave.pattern;
      if (pattern === 'pendulum') {
        ox = Math.sin(t * speed + ph) * amp;
        oy = -Math.cos(t * speed * 2 + ph) * amp * 0.22;
      } else if (pattern === 'orbit') {
        ox = Math.cos(t * speed + ph) * amp;
        oy = Math.sin(t * speed + ph) * amp * 0.6;
      } else {
        // dart: hold still, then snap sideways — punishes a slow release
        const cycle = ((t * speed * 0.5 + ph / (Math.PI * 2)) % 2 + 2) % 2;
        const seg = Math.floor(cycle);
        const f = cycle - seg;
        const snap = f < 0.62 ? 0 : Phaser.Math.Easing.Cubic.InOut((f - 0.62) / 0.38);
        const station = seg === 0 ? snap : 1 - snap;
        ox = (station - 0.5) * amp * 2;
        oy = Math.sin(t * speed * 1.4 + ph) * amp * 0.16;
      }

      // Impact stagger from a neighbouring hit, decaying back to the path
      target.knockX *= decay;
      target.knockY *= decay;

      sprite.x = Phaser.Math.Clamp(target.homeX + ox + target.knockX, 40, CFG.WIDTH - 26);
      sprite.y = Phaser.Math.Clamp(target.homeY + oy + target.knockY, 60, CFG.GROUND_Y - 60);

      // Per-risk idle signature
      const def = RISKS[target.kind];
      if (def.idle === 'throb') {
        sprite.setScale(target.baseScale * (1 + 0.06 * Math.sin(t * 4.2 + ph)));
      } else if (def.idle === 'tumble') {
        sprite.rotation = (t * 0.85 + ph) % (Math.PI * 2);
      } else if (def.idle === 'sway') {
        sprite.rotation = Math.sin(t * 1.5 + ph) * 0.18;
      } else {
        sprite.setAlpha(0.72 + 0.28 * Math.abs(Math.sin(t * 3.4 + ph)));
      }
    }
  }

  private aliveCount() {
    let n = 0;
    for (const t of this.targets) if (t.alive) n++;
    return n;
  }

  /* ── Aiming & firing ────────────────────────────────────────── */

  private canShoot() {
    return this.gameActive && !this.waveTransition && this.arrowsLeft > 0 && !this.arrowLive;
  }

  private setupAimControls() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.canShoot()) return;
      this.dragStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      this.dragVector.set(0, 0);
      this.isDragging = true;
      this.powerText.setVisible(true);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.dragStart) return;

      // Pull direction is opposite of flight direction (slingshot feel)
      this.dragVector.set(this.dragStart.x - pointer.worldX, this.dragStart.y - pointer.worldY);
      if (this.dragVector.length() > CFG.MAX_PULL) this.dragVector.setLength(CFG.MAX_PULL);

      const ratio = this.dragVector.length() / CFG.MAX_PULL;
      this.archer.setFrame(ratio < 0.22 ? 0 : ratio < 0.62 ? 1 : 2);
    });

    const release = () => {
      if (!this.isDragging || !this.dragStart) return;
      this.isDragging = false;
      this.aimGfx.clear();
      this.powerText.setVisible(false);
      this.lastPowerShown = -1;
      this.dragStart = null;

      if (this.dragVector.length() < CFG.MIN_PULL) {
        // Under the release threshold — shot cancelled, no arrow spent
        this.archer.setFrame(0);
        playSynthSFX('ui');
        return;
      }
      this.fireArrow();
    };

    // Phaser's window-level listeners deliver pointerup even outside the canvas,
    // so a drag that ends off-screen still resolves instead of sticking.
    this.input.on('pointerup', release);
  }

  private launchOrigin() {
    return { x: CFG.ARCHER_X + 22, y: this.archer.y - 4 };
  }

  private drawAimPreview() {
    this.aimGfx.clear();
    if (!this.isDragging || !this.dragStart) return;

    const { x: x0, y: y0 } = this.launchOrigin();
    const pull = this.dragVector.length();
    const ratio = pull / CFG.MAX_PULL;
    const armed = pull >= CFG.MIN_PULL;
    const threshold = CFG.MIN_PULL / CFG.MAX_PULL;
    const color = !armed ? 0x64748b : ratio > 0.75 ? 0xf26522 : ratio > 0.45 ? 0xfacc15 : 0x28a745;

    // 1. Pull vector — a drawn bowstring from the anchor back along the drag
    this.aimGfx.lineStyle(3, color, armed ? 0.95 : 0.45);
    this.aimGfx.lineBetween(x0, y0, x0 - this.dragVector.x * 0.42, y0 - this.dragVector.y * 0.42);
    this.aimGfx.fillStyle(color, armed ? 1 : 0.5);
    this.aimGfx.fillCircle(x0 - this.dragVector.x * 0.42, y0 - this.dragVector.y * 0.42, 4);

    // 2. Power ring around the archer, with a tick at the release threshold
    const R = CFG.POWER_RING_RADIUS;
    const start = -Math.PI / 2;
    this.aimGfx.lineStyle(4, 0x0b1f42, 0.85);
    this.aimGfx.beginPath();
    this.aimGfx.arc(x0, y0, R, start, start + Math.PI * 2);
    this.aimGfx.strokePath();

    this.aimGfx.lineStyle(4, color, armed ? 0.95 : 0.5);
    this.aimGfx.beginPath();
    this.aimGfx.arc(x0, y0, R, start, start + ratio * Math.PI * 2);
    this.aimGfx.strokePath();

    const ta = start + threshold * Math.PI * 2;
    this.aimGfx.lineStyle(2, 0xffffff, 0.7);
    this.aimGfx.lineBetween(
      x0 + Math.cos(ta) * (R - 6), y0 + Math.sin(ta) * (R - 6),
      x0 + Math.cos(ta) * (R + 6), y0 + Math.sin(ta) * (R + 6)
    );

    // 3. Always-visible power bar at the top — never hidden under a thumb
    const bw = 180;
    const bx = CFG.WIDTH / 2 - bw / 2;
    const by = 116;
    this.aimGfx.fillStyle(0x0b1f42, 0.9);
    this.aimGfx.fillRoundedRect(bx - 3, by - 3, bw + 6, 14, 7);
    this.aimGfx.fillStyle(color, armed ? 1 : 0.55);
    this.aimGfx.fillRoundedRect(bx, by, Math.max(4, bw * ratio), 8, 4);
    this.aimGfx.lineStyle(2, 0xffffff, 0.8);
    this.aimGfx.lineBetween(bx + bw * threshold, by - 3, bx + bw * threshold, by + 11);

    const shown = Math.round(ratio * 100);
    if (shown !== this.lastPowerShown) {
      this.lastPowerShown = shown;
      this.powerText.setText(armed ? `${shown}%` : 'PULL BACK');
      this.powerText.setColor(armed ? '#FFFFFF' : '#94A3B8');
    }

    if (!armed) return;

    // 4. Predicted arc — full dotted trajectory for the first shots, then a stub
    const vx = this.dragVector.x * CFG.SPEED_COEFF;
    const vy = this.dragVector.y * CFG.SPEED_COEFF;
    const dots = this.arrowsUsed < CFG.TRAJECTORY_HINT_SHOTS ? CFG.TRAJECTORY_DOTS : CFG.STUB_DOTS;
    this.aimGfx.fillStyle(0x00aeef, 0.9);
    for (let i = 1; i <= dots; i++) {
      const t = i * CFG.TRAJECTORY_STEP;
      const px = x0 + vx * t + 0.5 * this.windAccelX * t * t;
      const py = y0 + vy * t + 0.5 * CFG.GRAVITY_Y * t * t;
      if (px < -10 || px > CFG.WIDTH + 10 || py > CFG.GROUND_Y) break;
      this.aimGfx.fillCircle(px, py, Math.max(1.4, 3.4 - i * 0.11));
    }
  }

  private fireArrow() {
    if (!this.canShoot()) return;

    this.archer.setFrame(3);
    this.time.delayedCall(240, () => {
      if (this.gameActive && !this.isDragging) this.archer.setFrame(0);
    });

    const { x: x0, y: y0 } = this.launchOrigin();
    const vx = this.dragVector.x * CFG.SPEED_COEFF;
    const vy = this.dragVector.y * CFG.SPEED_COEFF;

    if (!this.arrow) {
      this.arrow = this.physics.add.sprite(x0, y0, 'arrow');
      this.arrow.setScale(1 / DPR);
    }
    const arrow = this.arrow;
    arrow.setActive(true).setVisible(true).setAlpha(1);
    arrow.setPosition(x0, y0);
    arrow.rotation = Math.atan2(vy, vx);

    const body = arrow.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(true);
    body.setVelocity(vx, vy);
    body.setAccelerationX(this.windAccelX);

    this.arrowPrev.set(x0, y0);
    this.trail.length = 0;
    this.arrowLive = true;
    this.arrowsLeft--;
    this.arrowsUsed++;
    playSynthSFX('shoot');
    this.notifyHud();
  }

  private updateArrow() {
    this.trailGfx.clear();
    const arrow = this.arrow;
    if (!arrow || !this.arrowLive) return;

    const body = arrow.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.x !== 0 || body.velocity.y !== 0) {
      arrow.rotation = Math.atan2(body.velocity.y, body.velocity.x);
    }

    // Fading trail — a fixed ring buffer stroked on one Graphics, no per-frame allocation
    this.trail.push(arrow.x, arrow.y);
    if (this.trail.length > CFG.TRAIL_POINTS * 2) this.trail.splice(0, 2);
    const pts = this.trail.length / 2;
    for (let i = 1; i < pts; i++) {
      const f = i / pts;
      this.trailGfx.lineStyle(1 + f * 2.6, 0x00aeef, f * 0.55);
      this.trailGfx.lineBetween(
        this.trail[(i - 1) * 2], this.trail[(i - 1) * 2 + 1],
        this.trail[i * 2], this.trail[i * 2 + 1]
      );
    }

    // Swept collision along this frame's path so fast arrows can't tunnel small targets
    const cos = Math.cos(arrow.rotation);
    const sin = Math.sin(arrow.rotation);
    const tipX = arrow.x + cos * CFG.ARROW_LENGTH;
    const tipY = arrow.y + sin * CFG.ARROW_LENGTH;
    const prevTipX = this.arrowPrev.x + cos * CFG.ARROW_LENGTH;
    const prevTipY = this.arrowPrev.y + sin * CFG.ARROW_LENGTH;

    for (let s = 1; s <= 4; s++) {
      const f = s / 4;
      const sx = prevTipX + (tipX - prevTipX) * f;
      const sy = prevTipY + (tipY - prevTipY) * f;
      for (const target of this.targets) {
        if (!target.alive) continue;
        const dist = Phaser.Math.Distance.Between(sx, sy, target.sprite.x, target.sprite.y);
        if (dist <= target.radius + CFG.HIT_FORGIVENESS) {
          this.handleHit(target, dist, sx, sy);
          return;
        }
      }
    }
    this.arrowPrev.set(arrow.x, arrow.y);

    // Ground / out of bounds => miss. Arrows above the top edge are legal lobs.
    if (tipY >= CFG.GROUND_Y - 18) {
      this.handleMiss(tipX, CFG.GROUND_Y - 18, arrow.rotation, true);
    } else if (tipX > CFG.WIDTH + 24 || tipX < -24) {
      this.handleMiss(Phaser.Math.Clamp(tipX, 6, CFG.WIDTH - 6), tipY, arrow.rotation, false);
    }
  }

  private parkArrow() {
    const arrow = this.arrow;
    this.arrowLive = false;
    this.trail.length = 0;
    if (!arrow) return;
    arrow.setActive(false).setVisible(false);
    const body = arrow.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAccelerationX(0);
    body.enable = false;

    // Fresh wind for the next shot, visible before the player draws again
    this.time.delayedCall(80, () => {
      if (this.gameActive && !this.arrowLive) {
        this.randomizeWind();
        this.notifyHud();
      }
    });
  }

  /* ── Hit / miss resolution ──────────────────────────────────── */

  private handleHit(target: Target, dist: number, hitX: number, hitY: number) {
    const def = RISKS[target.kind];
    const isCritical = dist <= target.radius * CFG.CORE_RATIO + 3;
    target.alive = false;
    this.parkArrow();

    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const base = CFG.POINTS[target.size];
    const streakBonus = Math.min(this.streak - 1, CFG.STREAK_BONUS_CAP) * CFG.STREAK_BONUS;
    const points = base * (isCritical ? CFG.CRITICAL_MULTIPLIER : 1) + streakBonus;
    this.score += points;
    this.risksNeutralized++;
    if (isCritical) this.criticalHits++;

    const shake = isCritical ? CFG.SHAKE_CRIT : CFG.SHAKE_HIT;
    this.hitStop(isCritical ? CFG.HITSTOP_CRIT_MS : CFG.HITSTOP_MS);
    this.cameras.main.shake(shake.ms, shake.amt);

    if (isCritical) {
      playSynthSFX('critical');
      this.shockwave(target.sprite.x, target.sprite.y, 0xfacc15);
      this.burst(hitX, hitY, 0xfacc15, CFG.BURST_PARTICLES_CRIT, 'sparkle');
      this.burst(hitX, hitY, def.core, Math.round(CFG.BURST_PARTICLES_CRIT * 0.6), 'shard');
      this.cameras.main.flash(140, 250, 220, 120);
      this.critLabel(target.sprite.x, target.sprite.y - target.radius - 10, points);
      this.setFeedback(`CORE HIT — ${def.label} fully covered!`);
    } else {
      playSynthSFX('hit');
      this.burst(hitX, hitY, def.body, CFG.BURST_PARTICLES, 'shard');
      this.burst(hitX, hitY, 0xffffff, 8, 'sparkle');
      this.floatingText(hitX, hitY - 8, `+${points}`, '#FFFFFF', 14);
      this.setFeedback(`${def.label} covered!`);
    }
    if (this.streak >= 2) {
      this.floatingText(target.sprite.x, target.sprite.y + target.radius * 0.5, `${this.streak}x streak`, '#00AEEF', 10);
    }

    this.playDeath(target, isCritical);
    this.staggerNeighbours(target);
    this.notifyHud();

    if (this.aliveCount() === 0) this.onWaveCleared();
  }

  /** Each risk dies in its own way — shatter, burst, drop, dissolve. */
  private playDeath(target: Target, isCritical: boolean) {
    const s = target.sprite;
    const death = RISKS[target.kind].death;
    const done = () => s.destroy();

    if (death === 'shatter') {
      this.tweens.add({
        targets: s, scaleX: 0.15, scaleY: target.baseScale * 1.5, alpha: 0,
        angle: Phaser.Math.Between(-50, 50), duration: 260, ease: 'Back.easeIn', onComplete: done,
      });
    } else if (death === 'burst') {
      this.tweens.add({
        targets: s, scale: target.baseScale * (isCritical ? 1.9 : 1.5), alpha: 0,
        angle: 220, duration: 240, ease: 'Cubic.easeOut', onComplete: done,
      });
    } else if (death === 'drop') {
      this.tweens.add({
        targets: s, y: s.y + 190, angle: 70, alpha: 0,
        duration: 460, ease: 'Quad.easeIn', onComplete: done,
      });
    } else {
      this.tweens.add({
        targets: s, alpha: 0, scale: target.baseScale * 0.55,
        duration: 300, ease: 'Sine.easeIn', onComplete: done,
      });
      this.tweens.add({ targets: s, x: s.x + 6, duration: 45, yoyo: true, repeat: 3 });
    }
  }

  /** Surviving risks recoil from the shockwave — the field reacts, not just the victim. */
  private staggerNeighbours(source: Target) {
    for (const other of this.targets) {
      if (!other.alive || other === source) continue;
      const dx = other.sprite.x - source.sprite.x;
      const dy = other.sprite.y - source.sprite.y;
      const d = Math.hypot(dx, dy);
      if (d > CFG.NEIGHBOUR_STAGGER_RADIUS || d < 0.001) continue;
      const push = (1 - d / CFG.NEIGHBOUR_STAGGER_RADIUS) * 22;
      other.knockX += (dx / d) * push;
      other.knockY += (dy / d) * push;
    }
  }

  private handleMiss(x: number, y: number, rotation: number, hitGround: boolean) {
    this.parkArrow();
    this.streak = 0;
    playSynthSFX('miss');
    this.cameras.main.shake(CFG.SHAKE_MISS.ms, CFG.SHAKE_MISS.amt);

    // Leave the arrow stuck where it landed so the error is readable
    const stuck = this.add.sprite(x, y, 'arrow').setScale(1 / DPR).setRotation(rotation).setDepth(1);
    this.tweens.add({
      targets: stuck, alpha: 0, duration: CFG.STICK_FADE_MS, ease: 'Quad.easeIn',
      onComplete: () => stuck.destroy(),
    });
    this.burst(x, y, hitGround ? 0x8b7355 : 0x475569, 8, 'shard');

    // Tell the player WHY: wind gets the blame when it was blowing
    if (this.windLevel > 0) {
      this.windFlashUntil = this.time.now + CFG.WIND_FLASH_MS;
      this.floatingText(x, y - 26, this.windDir === 'R' ? 'WIND →' : '← WIND', '#00AEEF', 12);
      this.setFeedback(`Missed — wind ${this.windDir === 'R' ? 'right' : 'left'} at level ${this.windLevel}. Aim into it.`);
      this.time.delayedCall(CFG.WIND_FLASH_MS, () => this.notifyHud());
    } else {
      this.floatingText(x, y - 26, 'MISS', '#EF4444', 12);
      this.setFeedback('Missed — adjust angle or power.');
    }
    this.notifyHud();
  }

  private checkOutOfArrows() {
    if (this.arrowsLeft > 0 || !this.gameActive || this.outOfArrowsScheduled || this.arrowLive) return;
    if (this.aliveCount() === 0) return;
    this.outOfArrowsScheduled = true;
    this.time.delayedCall(500, () => {
      this.outOfArrowsScheduled = false;
      if (this.gameActive && !this.waveTransition && this.aliveCount() > 0 && this.arrowsLeft <= 0) {
        this.endGame(false, 'Out of arrows!');
      }
    });
  }

  /* ── Waves & session flow ───────────────────────────────────── */

  private onWaveCleared() {
    if (!this.gameActive) return;

    const cleared = this.waveIndex;
    if (cleared >= CFG.WAVES.length - 1) {
      this.endGame(true, 'All risks neutralized!');
      return;
    }

    this.waveTransition = true;
    playSynthSFX('wave');

    const banner = this.add.container(0, 0);
    const bg = this.add.graphics();
    bg.fillStyle(0x030f26, 0.86);
    bg.fillRoundedRect(50, 250, CFG.WIDTH - 100, 96, 18);
    bg.lineStyle(2, 0x00aeef, 0.6);
    bg.strokeRoundedRect(50, 250, CFG.WIDTH - 100, 96, 18);
    banner.add(bg);
    banner.add(this.makeText(CFG.WIDTH / 2, 282, `WAVE ${cleared + 1} SECURED`, '#00AEEF', 18));
    banner.add(this.makeText(CFG.WIDTH / 2, 314, `${CFG.WAVES[cleared + 1].label} incoming…`, '#9fc5ff', 11));
    banner.setAlpha(0).setScale(0.85);
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' });

    this.setFeedback('');
    this.time.delayedCall(1400, () => {
      this.tweens.add({ targets: banner, alpha: 0, duration: 220, onComplete: () => banner.destroy() });
      if (!this.gameActive) return;
      this.waveIndex = cleared + 1;
      this.waveTransition = false;
      this.spawnWave(this.waveIndex);
      this.randomizeWind();
      this.notifyHud();
    });
  }

  private randomizeWind() {
    const waveMax = CFG.WAVES[Math.min(this.waveIndex, CFG.WAVES.length - 1)].windMax;
    this.windLevel = Phaser.Math.Between(0, waveMax);
    if (this.windLevel === 0) {
      this.windDir = 'none';
      this.windAccelX = 0;
    } else {
      this.windDir = Math.random() < 0.5 ? 'L' : 'R';
      this.windAccelX = this.windLevel * CFG.WIND_FORCE_PER_LEVEL * (this.windDir === 'R' ? 1 : -1);
    }
  }

  private startSessionTimer() {
    this.sessionTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.gameActive) return;
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.notifyHud();
          this.endGame(false, "Time's up!");
        } else {
          this.notifyHud();
        }
      },
    });
  }

  private endGame(won: boolean, reason: string) {
    if (!this.gameActive) return;
    this.gameActive = false;
    this.isDragging = false;
    this.hitStopMs = 0;
    this.aimGfx.clear();
    this.trailGfx.clear();
    this.powerText.setVisible(false);
    this.physics.world.pause();
    this.sessionTimer?.destroy();
    this.feedbackTimer?.destroy();

    let timeBonus = 0;
    if (won) {
      timeBonus = this.timeLeft * CFG.TIME_BONUS_PER_SECOND;
      this.score += timeBonus;
    }

    playSynthSFX(won ? 'win' : 'gameover');
    this.archer.setFrame(won ? 4 : 0);

    const label = this.makeText(
      CFG.WIDTH / 2, 300, won ? 'FAMILY SECURED!' : reason.toUpperCase(),
      won ? '#28A745' : '#F26522', 24
    ).setScale(0.4).setAlpha(0);
    label.setStroke('#03102a', 6);
    this.tweens.add({ targets: label, alpha: 1, scale: 1, duration: 380, ease: 'Back.easeOut' });

    if (won && timeBonus > 0) {
      this.floatingText(CFG.WIDTH / 2, 340, `Time bonus +${timeBonus}`, '#FACC15', 13);
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 160, () =>
          this.burst(
            Phaser.Math.Between(80, CFG.WIDTH - 80),
            Phaser.Math.Between(160, 420),
            [0x28a745, 0xfacc15, 0x00aeef][i % 3],
            14,
            'sparkle'
          )
        );
      }
    }

    const result: GameResult = {
      score: this.score,
      won,
      risksNeutralized: this.risksNeutralized,
      totalRisks: this.totalRisks,
      arrowsUsed: this.arrowsUsed,
      accuracy: this.arrowsUsed > 0 ? Math.round((this.risksNeutralized / this.arrowsUsed) * 100) : 0,
      criticalHits: this.criticalHits,
      bestStreak: this.bestStreak,
      wavesCleared: won ? CFG.WAVES.length : this.waveIndex,
      timeSeconds: CFG.SESSION_SECONDS - this.timeLeft,
    };

    this.notifyHud();
    this.time.delayedCall(1400, () => this.onGameOver(result));
  }

  /* ── HUD & effects ──────────────────────────────────────────── */

  private hitStop(ms: number) {
    this.hitStopMs = ms;
    this.physics.world.pause();
  }

  private setFeedback(msg: string) {
    this.currentFeedback = msg;
    this.notifyHud();
    this.feedbackTimer?.destroy();
    if (msg) {
      this.feedbackTimer = this.time.delayedCall(1900, () => {
        this.currentFeedback = '';
        this.notifyHud();
      });
    }
  }

  private notifyHud() {
    if (!this.onHudUpdate) return;
    this.onHudUpdate({
      score: this.score,
      arrowsLeft: this.arrowsLeft,
      timeLeft: this.timeLeft,
      wave: Math.min(this.waveIndex + 1, CFG.WAVES.length),
      waveTotal: CFG.WAVES.length,
      waveLabel: CFG.WAVES[Math.min(this.waveIndex, CFG.WAVES.length - 1)].label,
      risksLeft: this.aliveCount(),
      risksTotal: this.totalRisks,
      windLevel: this.windLevel,
      windDir: this.windDir,
      windFlash: this.time.now < this.windFlashUntil,
      streak: this.streak,
      feedback: this.currentFeedback,
    });
  }

  private makeText(x: number, y: number, text: string, color: string, size: number) {
    return this.add
      .text(x, y, text, {
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: `${size}px`,
        fontStyle: '900',
        color,
      })
      .setOrigin(0.5)
      .setResolution(DPR);
  }

  private burst(x: number, y: number, color: number, quantity: number, texture: 'sparkle' | 'shard') {
    const emitter = this.add.particles(x, y, texture, {
      speed: { min: 50, max: 190 },
      angle: { min: 0, max: 360 },
      rotate: texture === 'shard' ? { min: 0, max: 360 } : 0,
      scale: { start: 1 / DPR, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: texture === 'shard' ? 220 : 0,
      lifespan: 460,
      quantity,
      tint: [color],
    });
    this.time.delayedCall(480, () => emitter.destroy());
  }

  /** Expanding ring that sells a CRITICAL core hit. */
  private shockwave(x: number, y: number, color: number) {
    const ring = this.add.graphics();
    ring.lineStyle(4, color, 1);
    ring.strokeCircle(0, 0, 14);
    ring.setPosition(x, y);
    this.tweens.add({
      targets: ring,
      scale: 4.2,
      alpha: 0,
      duration: CFG.SHOCKWAVE_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private critLabel(x: number, y: number, points: number) {
    const t = this.makeText(x, y, `CRITICAL x2  +${points}`, '#FACC15', 16);
    t.setStroke('#03102a', 4);
    t.setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t, y: y - 58, alpha: 0, delay: 320, duration: 640,
      ease: 'Sine.easeOut', onComplete: () => t.destroy(),
    });
  }

  private floatingText(x: number, y: number, text: string, color: string, size = 12) {
    const t = this.makeText(x, y, text, color, size);
    t.setStroke('#03102a', 3);
    this.tweens.add({
      targets: t, y: y - 52, alpha: 0, duration: 850,
      ease: 'Sine.easeOut', onComplete: () => t.destroy(),
    });
  }
}
