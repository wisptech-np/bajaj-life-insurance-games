import Phaser from "phaser";
import { playSynthSFX } from "../../utils/audio";

/** Signature accent for this game — the balance pole orange. */
const ORANGE = 0xf26522;
const ROPE_STEEL = 0x7e97bb;
const BRAND_BLUE = 0x003da6;
const GREEN = 0x28a745;
const CRIMSON = 0xd92d4e;

/** Explicit render order — everything is drawn programmatically, so depth is the only stacking rule. */
const D = {
  SKY: 0,
  BLOOM: 1,
  SKY_FAR: 2,
  SKY_NEAR: 3,
  PYLON: 4,
  ABYSS: 5,
  ROPE: 6,
  GLOW: 7,
  PROP: 8,
  PLAYER: 9,
  SHIELD: 10,
  FX: 20,
} as const;

export default class MainScene extends Phaser.Scene {
  // Player state
  private player!: Phaser.GameObjects.Sprite;
  private currentWireIndex = 1; // Start on the middle rope
  private isSwitching = false;
  private wireProgress = 0; // used for custom arc tween
  private isJumping = false;

  // Game metrics
  private distance = 0;
  private coinsCollected = 0;
  private shieldHits = 0;
  private riskHits = 0;
  private lives = 3;
  private score = 0;
  private gameActive = true;
  private speed = 250; // pixels per second
  private speedMultiplier = 1;
  private timeElapsed = 0;

  // Configuration
  private wires: number[] = [];

  // Shield state
  private isShielded = false;
  private shieldBubble!: Phaser.GameObjects.Graphics;

  // Groups/Pools
  private birdsGroup!: Phaser.GameObjects.Group;
  private collectiblesGroup!: Phaser.GameObjects.Group;

  // Visual structures
  private wireGraphics!: Phaser.GameObjects.Graphics;
  private skylineFar!: Phaser.GameObjects.Graphics;
  private skylineNear!: Phaser.GameObjects.Graphics;
  private poles: Phaser.GameObjects.Graphics[] = [];
  private walkerGlow!: Phaser.GameObjects.Image;

  // Callbacks to React
  private onScoreUpdate!: (metrics: {
    score: number;
    distance: number;
    coins: number;
    lives: number;
    shieldActive: boolean;
  }) => void;
  private onGameOver!: (metrics: {
    score: number;
    distance: number;
    coins: number;
    shieldHits: number;
    riskHits: number;
  }) => void;

  constructor() {
    super("MainScene");
  }

  init() {
    this.onScoreUpdate = this.registry.get("onScoreUpdate");
    this.onGameOver = this.registry.get("onGameOver");

    // Reset parameters
    this.distance = 0;
    this.coinsCollected = 0;
    this.shieldHits = 0;
    this.riskHits = 0;
    this.lives = 3;
    this.score = 0;
    this.gameActive = true;
    this.speed = 250;
    this.speedMultiplier = 1;
    this.timeElapsed = 0;
    this.currentWireIndex = 1;
    this.isSwitching = false;
    this.isJumping = false;
    this.isShielded = false;
    this.poles = [];
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Rope heights (unchanged from the original layout)
    const groundBase = height * 0.64;
    const laneGap = height * 0.08;
    this.wires = [groundBase, groundBase + laneGap, groundBase + laneGap * 2];

    this.physics.world.gravity.y = 1200;

    // ── 1. Layered sky: near-black overhead easing into brand blue at the horizon
    const sky = this.add.graphics().setDepth(D.SKY);
    sky.fillGradientStyle(0x030913, 0x030913, 0x061634, 0x061634, 1);
    sky.fillRect(0, 0, width, height);
    sky.fillGradientStyle(
      0x0b2e6b,
      0x0b2e6b,
      0x0b2e6b,
      0x0b2e6b,
      0,
      0,
      0.85,
      0.85,
    );
    sky.fillRect(0, height * 0.18, width, height * 0.42);

    // Horizon bloom sitting just behind the skyline
    const bloom = this.add.image(width * 0.62, height * 0.55, "glow");
    bloom.setDisplaySize(width * 1.5, height * 0.5);
    bloom.setTint(0xf26522);
    bloom.setAlpha(0.16);
    bloom.setDepth(D.BLOOM);

    // ── 2. Two parallax skyline bands (far = flatter + darker, near = taller)
    this.skylineFar = this.add.graphics().setDepth(D.SKY_FAR);
    this.skylineNear = this.add.graphics().setDepth(D.SKY_NEAR);
    this.drawSkylineBand(this.skylineFar, 0x081c40, 0.75, height * 0.60, 0.55, 7);
    this.drawSkylineBand(this.skylineNear, 0x040f26, 0.95, height * 0.64, 1, 3);

    // ── 3. Depth haze below the lowest rope — the drop the walker is over
    const abyss = this.add.graphics().setDepth(D.ABYSS);
    const lowest = this.wires[this.wires.length - 1];
    abyss.fillGradientStyle(
      0x020712,
      0x020712,
      0x000306,
      0x000306,
      0.0,
      0.0,
      0.95,
      0.95,
    );
    abyss.fillRect(0, lowest - 30, width, height - lowest + 30);

    // ── 4. Ropes
    this.wireGraphics = this.add.graphics().setDepth(D.ROPE);
    this.drawWires();

    // ── 5. Groups
    this.birdsGroup = this.add.group();
    this.collectiblesGroup = this.add.group();

    // ── 6. Walker + the pool of light under her feet
    const initialY = this.wires[this.currentWireIndex];
    this.walkerGlow = this.add.image(width * 0.22, initialY, "glow");
    this.walkerGlow.setDisplaySize(120, 60);
    this.walkerGlow.setTint(0xf26522);
    this.walkerGlow.setAlpha(0.2);
    this.walkerGlow.setDepth(D.GLOW);

    this.player = this.add.sprite(width * 0.22, initialY, "walker_run");
    this.player.setDepth(D.PLAYER);
    // Anchor at the feet so the figure stands ON the rope.
    this.player.setOrigin(0.5, 0.8125);
    this.physics.add.existing(this.player);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false);
    body.setGravityY(1200);
    body.setSize(26, 28);
    body.setOffset(19, 18);

    if (!this.anims.exists("walker_walking")) {
      this.anims.create({
        key: "walker_walking",
        frames: this.anims.generateFrameNumbers("walker_run", {
          start: 0,
          end: 3,
        }),
        frameRate: 12,
        repeat: -1,
      });
    }
    this.player.play("walker_walking");

    // ── 7. Shield bubble overlay
    this.shieldBubble = this.add.graphics().setDepth(D.SHIELD);
    this.updateShieldBubble();

    // ── 8. Inputs
    this.setupControls();

    // ── 9. Spawn timers
    this.time.addEvent({
      delay: 1500,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 2000,
      callback: this.spawnCollectible,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 12000,
      callback: () => {
        if (!this.gameActive) return;
        this.speedMultiplier += 0.12;
        playSynthSFX("switch");
      },
      loop: true,
    });

    // Entry transition
    this.cameras.main.fadeIn(320, 3, 9, 19);

    this.notifyReact();
  }

  update(time: number, delta: number) {
    if (!this.gameActive) return;

    const dt = delta / 1000;
    this.timeElapsed += dt;

    // 1. Distance
    const currentFrameSpeed = this.speed * this.speedMultiplier;
    this.distance += dt * (currentFrameSpeed / 50);

    // 2. Parallax
    this.scrollBackground(currentFrameSpeed * dt);

    // 3. Keep the walker on her rope
    const currentWireY = this.wires[this.currentWireIndex];

    if (!this.isSwitching) {
      if (this.player.y >= currentWireY) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y > 0) {
          this.player.y = currentWireY;
          body.setVelocityY(0);
          body.setAccelerationY(0);

          if (this.isJumping) {
            this.isJumping = false;
            this.player.setTexture("walker_run");
            this.player.play("walker_walking");

            this.tweens.add({
              targets: this.player,
              scaleY: 0.82,
              scaleX: 1.16,
              duration: 70,
              yoyo: true,
              onComplete: () => {
                this.player.setScale(1);
              },
            });
          }
        }
      }
    }

    // 4. Overlays follow the walker
    this.walkerGlow.y = Phaser.Math.Linear(
      this.walkerGlow.y,
      currentWireY,
      0.2,
    );
    this.updateShieldBubble();

    // 5. Hazards
    this.birdsGroup.getChildren().forEach((child) => {
      const bird = child as Phaser.GameObjects.Sprite;
      if (!bird.active) return;

      const birdBody = bird.body as Phaser.Physics.Arcade.Body;
      birdBody.setVelocityX(-currentFrameSpeed - 80);

      if (this.physics.overlap(this.player, bird)) {
        this.handleHazardCollision(bird);
      }

      if (bird.x < -100) {
        this.birdsGroup.killAndHide(bird);
        birdBody.enable = false;
      }
    });

    // 6. Collectibles
    this.collectiblesGroup.getChildren().forEach((child) => {
      const item = child as Phaser.GameObjects.Sprite;
      if (!item.active) return;

      const itemBody = item.body as Phaser.Physics.Arcade.Body;
      itemBody.setVelocityX(-currentFrameSpeed);
      if (this.physics.overlap(this.player, item)) {
        this.handleCollectibleCollision(item);
      }

      if (item.x < -100) {
        this.collectiblesGroup.killAndHide(item);
        itemBody.enable = false;
      }
    });

    // 7. Live HUD
    this.score =
      Math.floor(this.distance * 10) +
      this.coinsCollected * 100 +
      this.shieldHits * 500;
    this.notifyReact();
  }

  private notifyReact() {
    this.onScoreUpdate({
      score: this.score,
      distance: Math.floor(this.distance),
      coins: this.coinsCollected,
      lives: this.lives,
      shieldActive: this.isShielded,
    });
  }

  /**
   * Tower silhouettes drawn across 2x screen width so the parallax wrap is
   * seamless. `scale` shrinks the far band; `step` controls tower density.
   */
  private drawSkylineBand(
    g: Phaser.GameObjects.Graphics,
    color: number,
    alpha: number,
    baseY: number,
    scale: number,
    step: number,
  ) {
    const width = this.cameras.main.width;
    g.clear();
    g.fillStyle(color, alpha);

    const widths = [46, 68, 34, 58, 82, 40, 52, 74];
    const heights = [120, 190, 96, 160, 230, 110, 145, 205];

    let x = -20;
    let i = 0;
    while (x < width * 2 + 40) {
      const w = widths[(i * step) % widths.length];
      const h = heights[(i * step) % heights.length] * scale;
      g.fillRect(x, baseY - h, w, h);
      // roof mast on the tall ones
      if (h > 150 * scale) {
        g.fillRect(x + w / 2 - 1.5, baseY - h - 14, 3, 14);
      }
      // lit windows — a few warm dots for depth, cheap and static
      g.fillStyle(0xf26522, alpha * 0.22);
      for (let r = 0; r < Math.floor(h / 34); r++) {
        g.fillRect(x + 7, baseY - h + 14 + r * 30, 5, 4);
        g.fillRect(x + w - 14, baseY - h + 26 + r * 30, 5, 4);
      }
      g.fillStyle(color, alpha);
      x += w + 8;
      i++;
    }
  }

  /** Three taut steel cables; the one the walker is on is warm-lit. */
  private drawWires() {
    const width = this.cameras.main.width;
    this.wireGraphics.clear();

    this.wires.forEach((laneY, i) => {
      const active = i === this.currentWireIndex;
      // near ropes read heavier than far ropes
      const depth = 0.72 + i * 0.14;

      // soft glow bed
      this.wireGraphics.lineStyle(12, active ? ORANGE : ROPE_STEEL, active ? 0.16 : 0.05);
      this.wireGraphics.strokeLineShape(
        new Phaser.Geom.Line(0, laneY, width, laneY),
      );

      // dark under-body (gives the cable weight)
      this.wireGraphics.lineStyle(4.5 * depth, 0x020814, 0.95);
      this.wireGraphics.strokeLineShape(
        new Phaser.Geom.Line(0, laneY + 1.5, width, laneY + 1.5),
      );

      // core
      this.wireGraphics.lineStyle(
        3 * depth,
        active ? ORANGE : ROPE_STEEL,
        active ? 0.95 : 0.6,
      );
      this.wireGraphics.strokeLineShape(
        new Phaser.Geom.Line(0, laneY, width, laneY),
      );

      // top rim light
      this.wireGraphics.lineStyle(1, 0xffffff, active ? 0.75 : 0.28);
      this.wireGraphics.strokeLineShape(
        new Phaser.Geom.Line(0, laneY - 1.4, width, laneY - 1.4),
      );
    });
  }

  private scrollBackground(dx: number) {
    this.skylineFar.x -= dx * 0.08;
    if (this.skylineFar.x < -this.cameras.main.width) this.skylineFar.x = 0;

    this.skylineNear.x -= dx * 0.22;
    if (this.skylineNear.x < -this.cameras.main.width) this.skylineNear.x = 0;

    // Anchor pylons scroll close to rope speed
    for (let i = this.poles.length - 1; i >= 0; i--) {
      const pole = this.poles[i];
      pole.x -= dx * 0.85;
      if (pole.x < -140) {
        pole.destroy();
        this.poles.splice(i, 1);
      }
    }

    if (Math.random() < 0.006 && this.poles.length < 3) {
      this.spawnPole();
    }
  }

  /** Lattice anchor pylon — the structure the ropes are strung between. */
  private spawnPole() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const top = this.wires[0] - 96;
    const bottom = height + 10;

    const pole = this.add.graphics();

    // legs
    pole.lineStyle(4, 0x0a2149, 1);
    pole.strokeLineShape(new Phaser.Geom.Line(-16, bottom, -4, top));
    pole.strokeLineShape(new Phaser.Geom.Line(16, bottom, 4, top));

    // lattice cross-bracing
    pole.lineStyle(1.6, 0x123566, 0.9);
    for (let y = top + 16; y < bottom; y += 34) {
      const t = (y - top) / (bottom - top);
      const half = Phaser.Math.Linear(4, 16, t);
      pole.strokeLineShape(new Phaser.Geom.Line(-half, y, half, y));
      pole.strokeLineShape(
        new Phaser.Geom.Line(-half, y, half, Math.min(y + 34, bottom)),
      );
    }

    // crown platform where the cables terminate
    pole.fillStyle(0x0d2a58, 1);
    pole.fillRect(-22, top - 8, 44, 9);
    pole.fillStyle(ORANGE, 0.9);
    pole.fillRect(-22, top - 10, 44, 2.5);

    // beacon
    pole.fillStyle(0xffc845, 0.95);
    pole.fillCircle(0, top - 16, 3);
    pole.fillStyle(0xffc845, 0.18);
    pole.fillCircle(0, top - 16, 9);

    // cable eyelets at each rope height
    this.wires.forEach((laneY) => {
      pole.fillStyle(0x1e56b4, 0.95);
      pole.fillCircle(0, laneY, 3.2);
      pole.fillStyle(0xffffff, 0.5);
      pole.fillCircle(-0.8, laneY - 0.8, 1.2);
    });

    pole.x = width + 70;
    pole.setDepth(D.PYLON);
    this.poles.push(pole);
  }

  private setupControls() {
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-UP", () => this.switchWire(-1));
      this.input.keyboard.on("keydown-DOWN", () => this.switchWire(1));
      this.input.keyboard.on("keydown-SPACE", () => this.jumpPlayer());
    }

    let startY = 0;
    let startTime = 0;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      startY = pointer.y;
      startTime = pointer.time;
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const elapsed = pointer.time - startTime;
      const distY = pointer.y - startY;

      if (elapsed < 300 && Math.abs(distY) > 30) {
        if (distY < 0) {
          this.switchWire(-1);
        } else {
          this.switchWire(1);
        }
      } else if (elapsed < 200 && Math.abs(distY) < 10) {
        this.jumpPlayer();
      }
    });
  }

  private switchWire(dir: number) {
    if (!this.gameActive || this.isSwitching || this.isJumping) return;

    const nextIndex = this.currentWireIndex + dir;
    if (nextIndex < 0 || nextIndex >= this.wires.length) return;

    this.currentWireIndex = nextIndex;
    this.drawWires(); // re-light the rope she is now on
    const startY = this.player.y;
    const targetY = this.wires[this.currentWireIndex];

    playSynthSFX("switch");

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // NOTE: this tween used to run 0 -> 0, so the arc never played and the
    // switch resolved by gravity alone (an instant snap when moving up).
    // Driving it 0 -> 1 with gravity parked is what makes the hop readable.
    this.wireProgress = 0;
    this.tweens.add({
      targets: this,
      wireProgress: 1,
      duration: 180,
      ease: "Quad.easeInOut",
      onStart: () => {
        this.isSwitching = true;
        this.player.setTexture("walker_hop");
        body.setVelocityY(0);
        body.setAccelerationY(0);
        body.setAllowGravity(false);
      },
      onUpdate: (_tween: Phaser.Tweens.Tween, target: any) => {
        const t = target.wireProgress;
        const linearY = Phaser.Math.Linear(startY, targetY, t);
        const arcPeak = -32;
        const curveOffset = Math.sin(t * Math.PI) * arcPeak;
        this.player.y = linearY + curveOffset;
      },
      onComplete: () => {
        this.isSwitching = false;
        this.player.y = targetY;
        body.setAllowGravity(true);
        body.setVelocityY(0);
        this.player.setTexture("walker_run");
        this.player.play("walker_walking");

        // landing dust on the new rope
        this.createJumpParticles();

        this.tweens.add({
          targets: this.player,
          scaleY: 0.82,
          scaleX: 1.16,
          duration: 60,
          yoyo: true,
          onComplete: () => {
            this.player.setScale(1);
          },
        });
      },
    });
  }

  private jumpPlayer() {
    if (!this.gameActive || this.isJumping || this.isSwitching) return;

    this.isJumping = true;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-450);
    this.player.setTexture("walker_hop");
    playSynthSFX("jump");

    this.createJumpParticles();
  }

  private createJumpParticles() {
    const emitter = this.add.particles(this.player.x, this.player.y, "sparkle", {
      speed: { min: 20, max: 70 },
      angle: { min: 150, max: 390 },
      scale: { start: 0.75, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 320,
      quantity: 10,
      gravityY: 120,
      tint: ORANGE,
    });
    emitter.setDepth(D.FX);
    this.time.delayedCall(320, () => emitter.destroy());
  }

  private updateShieldBubble() {
    this.shieldBubble.clear();
    if (!this.isShielded || !this.gameActive) return;

    const cx = this.player.x;
    const cy = this.player.y - 22;
    const pulse = 1 + Math.sin(this.time.now / 140) * 0.06;

    this.shieldBubble.fillStyle(0x2e9bff, 0.1);
    this.shieldBubble.fillCircle(cx, cy, 30 * pulse);
    this.shieldBubble.lineStyle(2.2, 0x4fb4ff, 0.9);
    this.shieldBubble.strokeCircle(cx, cy, 30 * pulse);
    this.shieldBubble.lineStyle(1, 0xffffff, 0.5);
    this.shieldBubble.strokeCircle(cx, cy, 30 * pulse - 4);
  }

  /** Pop-in so nothing simply appears at the screen edge. */
  private popIn(obj: Phaser.GameObjects.Sprite, to: number) {
    obj.setScale(to * 0.4);
    this.tweens.add({
      targets: obj,
      scale: to,
      duration: 260,
      ease: "Back.easeOut",
    });
  }

  private spawnObstacle() {
    if (!this.gameActive) return;

    const randomWire = Phaser.Math.Between(0, this.wires.length - 1);
    const startX = this.cameras.main.width + 64;
    // Chest height on the rope — has to be jumped or dodged.
    const startY = this.wires[randomWire] - 22;

    let bird = this.birdsGroup.getFirstDead(false) as Phaser.GameObjects.Sprite;
    if (!bird) {
      bird = this.add.sprite(startX, startY, "gust").setDepth(D.PROP);
      this.physics.add.existing(bird);

      const body = bird.body as Phaser.Physics.Arcade.Body;
      body.setSize(26, 16);
      body.setOffset(19, 24);

      this.birdsGroup.add(bird);

      if (!this.anims.exists("gust_swirl")) {
        this.anims.create({
          key: "gust_swirl",
          frames: this.anims.generateFrameNumbers("gust", { start: 0, end: 2 }),
          frameRate: 10,
          repeat: -1,
        });
      }
    }

    bird.setActive(true);
    bird.setVisible(true);
    bird.setPosition(startX, startY);
    this.popIn(bird, 0.9);

    const body = bird.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    body.setVelocityY(0);

    bird.play("gust_swirl");
  }

  private spawnCollectible() {
    if (!this.gameActive) return;

    const isShield = Math.random() < 0.12;
    const randomWire = Phaser.Math.Between(0, this.wires.length - 1);
    const startX = this.cameras.main.width + 50;
    // Hand height, so it is picked up by the walker's torso.
    const startY = this.wires[randomWire] - 24;

    let item = this.collectiblesGroup.getFirstDead(
      false,
    ) as Phaser.GameObjects.Sprite;

    if (!item || item.name !== (isShield ? "shield" : "coin")) {
      item = this.add
        .sprite(startX, startY, isShield ? "shield_item" : "coin")
        .setDepth(D.PROP);
      item.name = isShield ? "shield" : "coin";
      this.physics.add.existing(item);

      const body = item.body as Phaser.Physics.Arcade.Body;
      body.setSize(24, 24);
      body.setOffset(12, 12);

      this.collectiblesGroup.add(item);
    }

    item.setActive(true);
    item.setVisible(true);
    item.setPosition(startX, startY);
    item.setTexture(isShield ? "shield_item" : "coin");
    this.popIn(item, 1);

    const body = item.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    body.setVelocityY(0);

    this.tweens.add({
      targets: item,
      y: startY - 8,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private handleHazardCollision(bird: Phaser.GameObjects.Sprite) {
    const birdBody = bird.body as Phaser.Physics.Arcade.Body;
    birdBody.enable = false;
    this.tweens.killTweensOf(bird);
    this.birdsGroup.killAndHide(bird);

    const hitY = this.player.y - 22;

    if (this.isShielded) {
      this.isShielded = false;
      this.shieldHits += 1;
      playSynthSFX("shield");

      this.createBurstEffect(this.player.x, hitY, 0x4fb4ff);
      this.createFloatingText(this.player.x, hitY, "BLOCKED", "#4FB4FF");
      this.cameras.main.shake(300, 0.012);
    } else {
      this.lives = Math.max(0, this.lives - 1);
      this.riskHits += 1;
      playSynthSFX("hit");

      this.createBurstEffect(this.player.x, hitY, CRIMSON);
      this.cameras.main.shake(300, 0.03);
      this.cameras.main.flash(140, 120, 20, 40);

      this.tweens.add({
        targets: this.player,
        alpha: 0.2,
        duration: 80,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.player.alpha = 1;
        },
      });

      if (this.lives <= 0) {
        this.triggerGameOver();
      }
    }
    this.notifyReact();
  }

  private handleCollectibleCollision(item: Phaser.GameObjects.Sprite) {
    const itemBody = item.body as Phaser.Physics.Arcade.Body;
    itemBody.enable = false;
    this.tweens.killTweensOf(item);
    this.collectiblesGroup.killAndHide(item);

    if (item.name === "shield") {
      this.isShielded = true;
      playSynthSFX("shield");
      this.createBurstEffect(item.x, item.y, BRAND_BLUE);
      this.createFloatingText(item.x, item.y, "SHIELD", "#4FB4FF");
    } else {
      this.coinsCollected += 1;
      playSynthSFX("coin");
      this.createBurstEffect(item.x, item.y, 0xffc845);
      this.createFloatingText(item.x, item.y, "+₹100", "#28A745");
    }
    this.notifyReact();
  }

  private createBurstEffect(x: number, y: number, color: number) {
    const emitter = this.add.particles(x, y, "sparkle", {
      speed: { min: 50, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 420,
      quantity: 14,
      tint: color,
    });
    emitter.setDepth(D.FX);
    // ring flash on top of the spark burst
    const ring = this.add.circle(x, y, 8).setDepth(D.FX);
    ring.setStrokeStyle(2.5, color, 0.9);
    this.tweens.add({
      targets: ring,
      scale: 3.2,
      alpha: 0,
      duration: 380,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
    this.time.delayedCall(430, () => emitter.destroy());
  }

  private createFloatingText(x: number, y: number, text: string, color: string) {
    const ft = this.add
      .text(x, y - 10, text, {
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: "14px",
        fontStyle: "900",
        color,
        stroke: "#02060F",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScale(0.6)
      .setDepth(D.FX);

    this.tweens.add({
      targets: ft,
      scale: 1,
      duration: 180,
      ease: "Back.easeOut",
    });

    this.tweens.add({
      targets: ft,
      y: y - 58,
      alpha: 0,
      duration: 760,
      ease: "Sine.easeOut",
      onComplete: () => ft.destroy(),
    });
  }

  private triggerGameOver() {
    this.gameActive = false;
    this.physics.world.pause();
    this.tweens.pauseAll();

    this.player.stop();
    this.player.setTexture("walker_hop");

    playSynthSFX("gameover");

    const targetDistance = 1000;
    const finalScorePct = Math.min(
      100,
      Math.max(0, Math.round((Math.floor(this.distance) / targetDistance) * 100)),
    );

    this.cameras.main.fadeOut(400, 3, 9, 19);

    this.time.delayedCall(1200, () => {
      this.onGameOver({
        score: finalScorePct,
        distance: Math.floor(this.distance),
        coins: this.coinsCollected,
        shieldHits: this.shieldHits,
        riskHits: this.riskHits,
      });
    });
  }
}
