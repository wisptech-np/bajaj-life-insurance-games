import Phaser from 'phaser';
import { playSynthSFX } from '../../utils/audio';
import { GameResult, HudState } from '../../types';
import { GAME_CONFIG as CFG } from '../../data';

type VirusSize = 'L' | 'M' | 'S';
type VirusMotion = 'static' | 'bob' | 'drift';

interface VirusMeta {
  sprite: Phaser.GameObjects.Sprite;
  size: VirusSize;
  motion: VirusMotion;
  baseX: number;
  baseY: number;
  phase: number;
  bobAmp: number;
  driftAmp: number;
  riskName: string;
  alive: boolean;
}

// Guardian Archer — single-player target shooting.
// The player is the ONLY shooter: green risk viruses are pure targets and never fire back.
export default class MainScene extends Phaser.Scene {
  // Player & aiming
  private archer!: Phaser.GameObjects.Sprite;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private isDragging = false;
  private dragVector = new Phaser.Math.Vector2();

  // Session state
  private score = 0;
  private arrowsLeft = CFG.ARROWS_PER_SESSION;
  private arrowsUsed = 0;
  private timeLeft = CFG.SESSION_SECONDS;
  private gameActive = true;
  private waveTransition = false;

  // Progress
  private waveIndex = 0;
  private virusesNeutralized = 0;
  private totalViruses = 0;
  private criticalHits = 0;
  private streak = 0;
  private bestStreak = 0;

  // Wind
  private windLevel = 0;
  private windDir: 'L' | 'R' | 'none' = 'none';
  private windAccelX = 0;

  // Entities
  private arrowsGroup!: Phaser.GameObjects.Group;
  private viruses: VirusMeta[] = [];

  // Graphics
  private hudGraphics!: Phaser.GameObjects.Graphics;

  // Timers
  private sessionTimer?: Phaser.Time.TimerEvent;

  // React callbacks
  private onHudUpdate!: (hud: HudState) => void;
  private onGameOver!: (result: GameResult) => void;
  private feedbackTimer?: Phaser.Time.TimerEvent;
  private currentFeedback = '';

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
    this.waveIndex = 0;
    this.virusesNeutralized = 0;
    this.criticalHits = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.isDragging = false;
    this.dragStart = null;
    this.viruses = [];
    this.currentFeedback = '';
    this.outOfArrowsScheduled = false;
    this.totalViruses = CFG.WAVES.reduce((sum, w) => sum + w.sizes.length, 0);
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.physics.world.setBounds(0, 0, width, height + 100);

    // Sky gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x020715, 0x020715, 0x0a1f47, 0x0a1f47, 1);
    sky.fillRect(0, 0, width, height);

    // Stars
    const stars = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * (height * 0.55);
      stars.fillStyle(0xffffff, 0.12 + Math.random() * 0.35);
      stars.fillCircle(sx, sy, Math.random() * 1.4 + 0.4);
    }

    // City skyline silhouettes
    this.drawCitySkyline();

    // Ground hills
    this.drawGroundHills();

    // Arrows pool
    this.arrowsGroup = this.add.group();

    // Archer
    this.archer = this.add.sprite(CFG.ARCHER_X, CFG.ARCHER_Y, 'archer_spritesheet', 0);
    this.archer.setScale(1.2);
    this.tweens.add({
      targets: this.archer,
      y: CFG.ARCHER_Y - 3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Aim overlay layer
    this.hudGraphics = this.add.graphics();

    this.randomizeWind();
    this.setupAimControls();
    this.spawnWave(0);
    this.startSessionTimer();
    this.notifyHud();
  }

  update(time: number) {
    if (!this.gameActive) return;

    this.drawAimPreview();
    this.animateViruses(time);
    this.updateArrows();

    if (!this.waveTransition) {
      this.checkOutOfArrows();
    }
  }

  /* ── Background art ─────────────────────────────────────────── */

  private drawCitySkyline() {
    const width = this.cameras.main.width;
    const g = this.add.graphics();
    g.fillStyle(0x06132d, 0.5);
    const widths = [60, 50, 70, 80, 55];
    const heights = [140, 180, 110, 160, 200];
    let xOffset = 0;
    while (xOffset < width) {
      const idx = Math.floor(xOffset / 40) % widths.length;
      g.fillRect(xOffset, CFG.GROUND_Y - 50 - heights[idx], widths[idx], heights[idx]);
      xOffset += widths[idx] + 8;
    }
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

  private drawGroundHills() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const g = this.add.graphics();

    // Back hill
    g.fillStyle(0x0d381e, 1);
    g.beginPath();
    g.moveTo(0, CFG.GROUND_Y - 40);
    this.quadCurve(g, 0, CFG.GROUND_Y - 40, 120, CFG.GROUND_Y - 70, 240, CFG.GROUND_Y - 45);
    this.quadCurve(g, 240, CFG.GROUND_Y - 45, 360, CFG.GROUND_Y - 30, width, CFG.GROUND_Y - 50);
    g.lineTo(width, height);
    g.lineTo(0, height);
    g.closePath();
    g.fill();

    // Front hill
    g.fillStyle(0x14532d, 1);
    g.beginPath();
    g.moveTo(0, CFG.GROUND_Y - 25);
    this.quadCurve(g, 0, CFG.GROUND_Y - 25, 150, CFG.GROUND_Y - 48, 280, CFG.GROUND_Y - 30);
    this.quadCurve(g, 280, CFG.GROUND_Y - 30, 400, CFG.GROUND_Y - 20, width, CFG.GROUND_Y - 34);
    g.lineTo(width, height);
    g.lineTo(0, height);
    g.closePath();
    g.fill();

    // Archer platform glow
    g.fillStyle(0x00aeef, 0.08);
    g.fillEllipse(CFG.ARCHER_X, CFG.ARCHER_Y + 42, 90, 22);
  }

  /* ── Waves & viruses ────────────────────────────────────────── */

  private spawnWave(index: number) {
    const wave = CFG.WAVES[index];
    if (!wave) return;

    const count = wave.sizes.length;
    // Vertical bands so targets never overlap
    const yTop = 140;
    const yBottom = 470;
    const bandH = (yBottom - yTop) / count;

    for (let i = 0; i < count; i++) {
      const size = wave.sizes[i];
      const motion = wave.motions[i % wave.motions.length];
      const r = CFG.VIRUS_RADIUS[size];
      const x = Phaser.Math.Between(wave.xRange[0], wave.xRange[1]);
      const y = Phaser.Math.Clamp(
        yTop + bandH * i + Phaser.Math.Between(r, Math.max(r + 1, bandH - r)),
        yTop + r,
        yBottom
      );

      const sprite = this.add.sprite(x, y, `virus_${size}`, 0);
      sprite.setScale(0);
      sprite.setAlpha(0);

      // Spawn pop-in animation (staggered)
      this.tweens.add({
        targets: sprite,
        scale: 1,
        alpha: 1,
        delay: i * 130,
        duration: 380,
        ease: 'Back.easeOut',
      });

      this.viruses.push({
        sprite,
        size,
        motion,
        baseX: x,
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        bobAmp: wave.bobAmp,
        driftAmp: wave.driftAmp,
        riskName: CFG.RISK_NAMES[Phaser.Math.Between(0, CFG.RISK_NAMES.length - 1)],
        alive: true,
      });
    }
  }

  private animateViruses(time: number) {
    const frame = Math.floor(time / 220) % 3;
    for (const v of this.viruses) {
      if (!v.alive) continue;
      v.sprite.setFrame(frame);
      const t = time / 1000 + v.phase;
      if (v.motion === 'bob') {
        v.sprite.y = v.baseY + Math.sin(t * 1.6) * v.bobAmp;
      } else if (v.motion === 'drift') {
        v.sprite.x = v.baseX + Math.sin(t * 1.1) * v.driftAmp;
        v.sprite.y = v.baseY + Math.sin(t * 1.9) * (v.bobAmp * 0.55);
      } else {
        // static targets still breathe gently
        v.sprite.y = v.baseY + Math.sin(t * 1.2) * 4;
      }
    }
  }

  private aliveVirusCount() {
    return this.viruses.reduce((n, v) => (v.alive ? n + 1 : n), 0);
  }

  /* ── Aiming & firing ────────────────────────────────────────── */

  private setupAimControls() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.gameActive || this.waveTransition || this.arrowsLeft <= 0) return;
      this.dragStart = pointer.position.clone();
      this.isDragging = true;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.dragStart) return;

      const dx = pointer.x - this.dragStart.x;
      const dy = pointer.y - this.dragStart.y;

      // Pull direction is opposite of flight direction (slingshot feel)
      this.dragVector.set(-dx, -dy);
      if (this.dragVector.length() > CFG.MAX_PULL) {
        this.dragVector.setLength(CFG.MAX_PULL);
      }

      const pullRatio = this.dragVector.length() / CFG.MAX_PULL;
      if (pullRatio < 0.2) this.archer.setFrame(0);
      else if (pullRatio < 0.65) this.archer.setFrame(1);
      else this.archer.setFrame(2);
    });

    this.input.on('pointerup', () => {
      if (!this.isDragging || !this.dragStart) return;
      this.isDragging = false;
      this.hudGraphics.clear();

      if (this.dragVector.length() < CFG.MIN_PULL) {
        this.archer.setFrame(0);
        this.dragStart = null;
        return;
      }

      this.fireArrow();
      this.dragStart = null;
    });
  }

  private launchOrigin() {
    return { x: this.archer.x + 24, y: this.archer.y - 4 };
  }

  private drawAimPreview() {
    this.hudGraphics.clear();
    if (!this.isDragging || !this.dragStart || !this.gameActive) return;

    const { x: x0, y: y0 } = this.launchOrigin();
    const vx0 = this.dragVector.x * CFG.SPEED_COEFF;
    const vy0 = this.dragVector.y * CFG.SPEED_COEFF;
    const pullRatio = this.dragVector.length() / CFG.MAX_PULL;

    // Elastic pull line (color shifts green -> orange with power)
    const lineColor = pullRatio > 0.72 ? 0xf26522 : pullRatio > 0.4 ? 0xfacc15 : 0x28a745;
    this.hudGraphics.lineStyle(2, lineColor, 0.7);
    this.hudGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        this.archer.x - 8,
        this.archer.y,
        this.archer.x - this.dragVector.x * 0.35,
        this.archer.y - this.dragVector.y * 0.35
      )
    );

    // Power ring around archer
    this.hudGraphics.lineStyle(3, lineColor, 0.5);
    this.hudGraphics.beginPath();
    this.hudGraphics.arc(this.archer.x, this.archer.y, 42, -Math.PI / 2, -Math.PI / 2 + pullRatio * Math.PI * 2);
    this.hudGraphics.strokePath();

    const showFullTrajectory = this.arrowsUsed < CFG.TRAJECTORY_HINT_SHOTS;
    const dotsCount = showFullTrajectory ? 18 : 5;
    const dt = 0.08;

    this.hudGraphics.fillStyle(0x00aeef, 0.9);
    for (let i = 1; i <= dotsCount; i++) {
      const t = i * dt;
      const xt = x0 + vx0 * t + 0.5 * this.windAccelX * t * t;
      const yt = y0 + vy0 * t + 0.5 * CFG.GRAVITY_Y * t * t;
      if (xt >= 0 && xt <= CFG.WIDTH && yt >= 0 && yt <= CFG.GROUND_Y) {
        this.hudGraphics.fillCircle(xt, yt, Math.max(1.5, 3.5 - i * 0.12));
      }
    }
  }

  private fireArrow() {
    if (this.arrowsLeft <= 0 || !this.gameActive || this.waveTransition) return;

    this.archer.setFrame(3);
    this.time.delayedCall(250, () => {
      if (this.gameActive && !this.isDragging) this.archer.setFrame(0);
    });

    const { x: x0, y: y0 } = this.launchOrigin();
    const vx0 = this.dragVector.x * CFG.SPEED_COEFF;
    const vy0 = this.dragVector.y * CFG.SPEED_COEFF;

    let arrow = this.arrowsGroup.getFirstDead(false) as Phaser.GameObjects.Sprite | null;
    if (!arrow) {
      arrow = this.physics.add.sprite(x0, y0, 'arrow');
      this.arrowsGroup.add(arrow);
    }
    arrow.setActive(true);
    arrow.setVisible(true);
    arrow.setPosition(x0, y0);
    arrow.rotation = Math.atan2(vy0, vx0);

    const body = arrow.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(true);
    body.setGravityY(0); // inherit world gravity, matching the preview math
    body.setVelocity(vx0, vy0);
    body.setAccelerationX(this.windAccelX);

    this.arrowsLeft--;
    this.arrowsUsed++;
    playSynthSFX('shoot');
    this.notifyHud();
  }

  private recycleArrow(arrow: Phaser.GameObjects.Sprite) {
    arrow.setActive(false);
    arrow.setVisible(false);
    const body = arrow.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setVelocity(0, 0);
    body.setAccelerationX(0);

    // New wind once the air is clear — visible before the next shot
    this.time.delayedCall(60, () => {
      const anyFlying = this.arrowsGroup.getChildren().some((c) => c.active);
      if (!anyFlying && this.gameActive) {
        this.randomizeWind();
        this.notifyHud();
      }
    });
  }

  private updateArrows() {
    this.arrowsGroup.getChildren().forEach((child) => {
      const arrow = child as Phaser.GameObjects.Sprite;
      if (!arrow.active) return;

      const body = arrow.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.x !== 0 || body.velocity.y !== 0) {
        arrow.rotation = Math.atan2(body.velocity.y, body.velocity.x);
      }

      // Cyan sparkle trail
      if (Math.random() < 0.35) {
        this.trailParticle(
          arrow.x - Math.cos(arrow.rotation) * 16,
          arrow.y - Math.sin(arrow.rotation) * 16
        );
      }

      // Tip position for precise hits
      const tipX = arrow.x + Math.cos(arrow.rotation) * 20;
      const tipY = arrow.y + Math.sin(arrow.rotation) * 20;

      for (const v of this.viruses) {
        if (!v.alive) continue;
        const r = CFG.VIRUS_RADIUS[v.size];
        const dist = Phaser.Math.Distance.Between(tipX, tipY, v.sprite.x, v.sprite.y);
        if (dist <= r + 4) {
          this.handleVirusHit(arrow, v, dist);
          return;
        }
      }

      // Ground / horizontal out-of-bounds => miss.
      // (Arrows above the top edge are legal lob shots — gravity brings them back.)
      if (arrow.y >= CFG.GROUND_Y - 20) {
        this.handleMiss(arrow, true);
      } else if (arrow.x > CFG.WIDTH + 30 || arrow.x < -30) {
        this.handleMiss(arrow, false);
      }
    });
  }

  /* ── Hit / miss resolution ──────────────────────────────────── */

  private handleVirusHit(arrow: Phaser.GameObjects.Sprite, v: VirusMeta, dist: number) {
    const r = CFG.VIRUS_RADIUS[v.size];
    const coreR = r * CFG.CORE_RATIO;
    const isCritical = dist <= coreR + 3;

    v.alive = false;
    this.recycleArrow(arrow);

    // Streak & scoring
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const base = CFG.POINTS[v.size];
    const critMult = isCritical ? CFG.CRITICAL_MULTIPLIER : 1;
    const streakBonus = Math.min(this.streak - 1, CFG.STREAK_BONUS_CAP) * CFG.STREAK_BONUS;
    const points = base * critMult + streakBonus;
    this.score += points;
    this.virusesNeutralized++;
    if (isCritical) this.criticalHits++;

    // Juice
    if (isCritical) {
      playSynthSFX('critical');
      this.cameras.main.shake(220, 0.012);
      this.burst(v.sprite.x, v.sprite.y, 0xfacc15, 20);
      this.burst(v.sprite.x, v.sprite.y, 0x5ee07c, 12);
      this.floatingText(v.sprite.x, v.sprite.y - r - 6, `CRITICAL x2  +${points}`, '#FACC15', 15);
      this.setFeedback(`Core hit! ${v.riskName} fully covered — 2x!`);
    } else {
      playSynthSFX('hit');
      this.cameras.main.shake(110, 0.006);
      this.burst(v.sprite.x, v.sprite.y, 0x5ee07c, 14);
      this.floatingText(v.sprite.x, v.sprite.y - r - 6, `+${points}`, '#FFFFFF', 13);
      this.setFeedback(`${v.riskName} covered!`);
    }
    if (this.streak >= 2) {
      this.floatingText(v.sprite.x, v.sprite.y + r * 0.4, `${this.streak} streak`, '#00AEEF', 10);
    }

    // Pop-out death tween
    const dying = v.sprite;
    this.tweens.add({
      targets: dying,
      scale: 1.35,
      alpha: 0,
      angle: Phaser.Math.Between(-40, 40),
      duration: 240,
      ease: 'Back.easeIn',
      onComplete: () => dying.destroy(),
    });

    this.notifyHud();

    // Wave cleared?
    if (this.aliveVirusCount() === 0) {
      this.onWaveCleared();
    }
  }

  private handleMiss(arrow: Phaser.GameObjects.Sprite, hitGround: boolean) {
    const ax = Phaser.Math.Clamp(arrow.x, 10, CFG.WIDTH - 10);
    this.recycleArrow(arrow);
    this.streak = 0;

    if (hitGround) {
      playSynthSFX('miss');
      this.cameras.main.shake(90, 0.004);
      this.burst(ax, CFG.GROUND_Y - 22, 0x8b7355, 8);
      this.floatingText(ax, CFG.GROUND_Y - 44, 'MISS', '#EF4444', 11);
    }
    this.notifyHud();
  }

  private outOfArrowsScheduled = false;

  private checkOutOfArrows() {
    if (this.arrowsLeft > 0 || !this.gameActive || this.outOfArrowsScheduled) return;
    const anyFlying = this.arrowsGroup.getChildren().some((c) => c.active);
    if (anyFlying) return;
    if (this.aliveVirusCount() > 0) {
      this.outOfArrowsScheduled = true;
      this.time.delayedCall(350, () => {
        this.outOfArrowsScheduled = false;
        if (this.gameActive && !this.waveTransition && this.aliveVirusCount() > 0) {
          this.endGame(false, 'Out of arrows!');
        }
      });
    }
  }

  /* ── Waves & session flow ───────────────────────────────────── */

  private onWaveCleared() {
    if (!this.gameActive) return;

    const clearedIndex = this.waveIndex;
    if (clearedIndex >= CFG.WAVES.length - 1) {
      this.endGame(true, 'All risks neutralized!');
      return;
    }

    this.waveTransition = true;
    playSynthSFX('wave');

    // Banner
    const width = this.cameras.main.width;
    const banner = this.add.container(0, 0);
    const bg = this.add.graphics();
    bg.fillStyle(0x030f26, 0.82);
    bg.fillRoundedRect(50, 250, width - 100, 96, 18);
    bg.lineStyle(2, 0x28a745, 0.6);
    bg.strokeRoundedRect(50, 250, width - 100, 96, 18);
    banner.add(bg);

    const title = this.add
      .text(width / 2, 282, `WAVE ${clearedIndex + 1} SECURED`, {
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '18px',
        fontStyle: '900',
        color: '#28A745',
      })
      .setOrigin(0.5);
    banner.add(title);

    const sub = this.add
      .text(width / 2, 314, CFG.WAVES[clearedIndex + 1].label + ' incoming…', {
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '11px',
        fontStyle: '700',
        color: '#9fc5ff',
      })
      .setOrigin(0.5);
    banner.add(sub);

    banner.setAlpha(0);
    banner.setScale(0.85);
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' });

    this.setFeedback('');
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: banner,
        alpha: 0,
        duration: 220,
        onComplete: () => banner.destroy(),
      });
      if (!this.gameActive) return;
      this.waveIndex = clearedIndex + 1;
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
    this.hudGraphics.clear();
    this.physics.world.pause();
    this.sessionTimer?.destroy();
    this.feedbackTimer?.destroy();

    // Time bonus on a win
    let timeBonus = 0;
    if (won) {
      timeBonus = this.timeLeft * CFG.TIME_BONUS_PER_SECOND;
      this.score += timeBonus;
    }

    playSynthSFX(won ? 'win' : 'gameover');
    this.archer.setFrame(won ? 4 : 0);

    // End banner
    const width = this.cameras.main.width;
    const label = this.add
      .text(width / 2, 300, won ? 'FAMILY SECURED!' : reason.toUpperCase(), {
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: '24px',
        fontStyle: '900',
        color: won ? '#28A745' : '#F26522',
        stroke: '#03102a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScale(0.4)
      .setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, scale: 1, duration: 380, ease: 'Back.easeOut' });
    if (won && timeBonus > 0) {
      this.floatingText(width / 2, 340, `Time bonus +${timeBonus}`, '#FACC15', 13);
      // celebratory bursts
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 160, () =>
          this.burst(
            Phaser.Math.Between(80, width - 80),
            Phaser.Math.Between(160, 420),
            [0x28a745, 0xfacc15, 0x00aeef][i % 3],
            12
          )
        );
      }
    }

    const result: GameResult = {
      score: this.score,
      won,
      virusesNeutralized: this.virusesNeutralized,
      totalViruses: this.totalViruses,
      arrowsUsed: this.arrowsUsed,
      accuracy: this.arrowsUsed > 0 ? Math.round((this.virusesNeutralized / this.arrowsUsed) * 100) : 0,
      criticalHits: this.criticalHits,
      bestStreak: this.bestStreak,
      wavesCleared: won ? CFG.WAVES.length : this.waveIndex,
      timeSeconds: CFG.SESSION_SECONDS - this.timeLeft,
    };

    this.notifyHud();
    this.time.delayedCall(1400, () => this.onGameOver(result));
  }

  /* ── HUD & effects ──────────────────────────────────────────── */

  private setFeedback(msg: string) {
    this.currentFeedback = msg;
    this.notifyHud();
    this.feedbackTimer?.destroy();
    if (msg) {
      this.feedbackTimer = this.time.delayedCall(2000, () => {
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
      virusesLeft: this.aliveVirusCount(),
      virusesTotal: this.totalViruses,
      windLevel: this.windLevel,
      windDir: this.windDir,
      streak: this.streak,
      feedback: this.currentFeedback,
    });
  }

  private trailParticle(x: number, y: number) {
    const emitter = this.add.particles(x, y, 'sparkle', {
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 250,
      quantity: 1,
      tint: [0x00aeef],
    });
    this.time.delayedCall(260, () => emitter.destroy());
  }

  private burst(x: number, y: number, color: number, quantity = 14) {
    const emitter = this.add.particles(x, y, 'sparkle', {
      speed: { min: 40, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 420,
      quantity,
      tint: [color],
    });
    this.time.delayedCall(440, () => emitter.destroy());
  }

  private floatingText(x: number, y: number, text: string, color: string, size = 12) {
    const ft = this.add
      .text(x, y, text, {
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: `${size}px`,
        fontStyle: '900',
        color,
        stroke: '#03102a',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: ft,
      y: y - 52,
      alpha: 0,
      duration: 850,
      ease: 'Sine.easeOut',
      onComplete: () => ft.destroy(),
    });
  }
}
