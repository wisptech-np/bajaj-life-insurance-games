import Phaser from "phaser";
import { playSynthSFX } from "../../utils/audio";

export default class MainScene extends Phaser.Scene {
  // Player state
  private player!: Phaser.GameObjects.Sprite;
  private currentWireIndex = 1; // Start on wire 1 (0-indexed 0 to 3)
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
  private backgroundCity!: Phaser.GameObjects.Graphics;
  private poles: Phaser.GameObjects.Graphics[] = [];

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

    // Setup Wires (responsive vertical positions in middle of screen)
    const yOffset = height * 0.28;
    const wireGap = height * 0.15;
    this.wires = [
      yOffset,
      yOffset + wireGap,
      yOffset + wireGap * 2,
      yOffset + wireGap * 3,
    ];

    // Enable Phaser physics
    this.physics.world.gravity.y = 1200;

    // 1. Draw Static Sky Gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x030f26, 0x030f26, 0x09265c, 0x09265c, 1);
    sky.fillRect(0, 0, width, height);

    // 2. Draw Distant City Skyline (Parallax City Graphics)
    this.backgroundCity = this.add.graphics();
    this.drawCitySkyline();

    // 3. Create Wires Graphics
    this.wireGraphics = this.add.graphics();
    this.drawWires();

    // 4. Create Groups
    this.birdsGroup = this.add.group();
    this.collectiblesGroup = this.add.group();

    // 5. Spawn Player (Protection Beetle)
    const initialY = this.wires[this.currentWireIndex];
    this.player = this.add.sprite(width * 0.22, initialY, "beetle_run");
    this.physics.add.existing(this.player);

    // Set up rigid body bounds
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false);
    body.setGravityY(1200);
    body.setSize(30, 20);
    body.setOffset(17, 22);

    if (!this.anims.exists("beetle_running")) {
      this.anims.create({
        key: "beetle_running",
        frames: this.anims.generateFrameNumbers("beetle_run", {
          start: 0,
          end: 3,
        }),
        frameRate: 12,
        repeat: -1,
      });
    }

    this.player.play("beetle_running");

    // 6. Draw Shield Bubble overlay
    this.shieldBubble = this.add.graphics();
    this.updateShieldBubble();

    // 7. Setup Inputs
    this.setupControls();

    // 8. Timers for spawning
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

    // Speed ramping timer: increases speed every 12 seconds
    this.time.addEvent({
      delay: 12000,
      callback: () => {
        if (!this.gameActive) return;
        this.speedMultiplier += 0.12;
        playSynthSFX("switch"); // subtle audio feedback for ramp speed
      },
      loop: true,
    });

    // Notify React of initial metrics
    this.notifyReact();
  }

  update(time: number, delta: number) {
    if (!this.gameActive) return;

    const dt = delta / 1000;
    this.timeElapsed += dt;

    // 1. Calculate distance
    const currentFrameSpeed = this.speed * this.speedMultiplier;
    this.distance += dt * (currentFrameSpeed / 50); // Scale distance down to look realistic

    // 2. Parallax background scrolling
    this.scrollBackground(currentFrameSpeed * dt);

    // 3. Keep player relative to wire
    const currentWireY = this.wires[this.currentWireIndex];

    if (!this.isSwitching) {
      // Snapping/Boundary collision for jumping
      if (this.player.y >= currentWireY) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y > 0) {
          // Beetle has landed on wire
          this.player.y = currentWireY;
          body.setVelocityY(0);
          body.setAccelerationY(0);

          if (this.isJumping) {
            this.isJumping = false;
            this.player.setTexture("beetle_run");
            this.player.play("beetle_running");

            // Landing squash animation
            this.tweens.add({
              targets: this.player,
              scaleY: 0.8,
              scaleX: 1.2,
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

    // 4. Update shield overlay position
    this.updateShieldBubble();

    // 5. Scroll and recycle obstacles
    this.birdsGroup.getChildren().forEach((child) => {
      const bird = child as Phaser.GameObjects.Sprite;
      if (!bird.active) return;

      const birdBody = bird.body as Phaser.Physics.Arcade.Body;
      birdBody.setVelocityX(-currentFrameSpeed - 80);

      // Overlap checks using physics bodies
      if (this.physics.overlap(this.player, bird)) {
        this.handleHazardCollision(bird);
      }

      if (bird.x < -100) {
        this.birdsGroup.killAndHide(bird);
        birdBody.enable = false;
      }
    });

    // 6. Scroll and recycle collectibles
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

    // 7. Calculate and send live updates to React HUD
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

  private drawCitySkyline() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.backgroundCity.clear();

    // Draw silhouettes of financial towers
    this.backgroundCity.fillStyle(0x061839, 0.45);
    const buildingWidths = [60, 80, 50, 70, 90, 60];
    const buildingHeights = [180, 240, 150, 210, 270, 160];

    let xOffset = 0;
    for (let i = 0; i < 10; i++) {
      const idx = i % buildingWidths.length;
      const w = buildingWidths[idx];
      const h = buildingHeights[idx];
      this.backgroundCity.fillRect(xOffset, height - h, w, h);
      xOffset += w + 10;
    }
  }

  private drawWires() {
    const width = this.cameras.main.width;
    this.wireGraphics.clear();
    this.wires.forEach((wireY) => {
      // Glow neon shadow
      this.wireGraphics.lineStyle(6, 0x00aeef, 0.25);
      this.wireGraphics.strokeLineShape(
        new Phaser.Geom.Line(0, wireY, width, wireY),
      );

      // Main cable
      this.wireGraphics.lineStyle(2, 0x00aeef, 0.85);
      this.wireGraphics.strokeLineShape(
        new Phaser.Geom.Line(0, wireY, width, wireY),
      );

      // White core
      this.wireGraphics.lineStyle(0.8, 0xffffff, 0.95);
      this.wireGraphics.strokeLineShape(
        new Phaser.Geom.Line(0, wireY, width, wireY),
      );
    });
  }

  private scrollBackground(dx: number) {
    // Parallax scrolling: shift city buildings slowly
    this.backgroundCity.x -= dx * 0.15;
    if (this.backgroundCity.x < -this.cameras.main.width) {
      this.backgroundCity.x = 0;
    }

    // Scroll power poles (Graphics spawned on the fly)
    this.poles.forEach((pole, idx) => {
      pole.x -= dx * 0.9;
      if (pole.x < -100) {
        pole.destroy();
        this.poles.splice(idx, 1);
      }
    });

    // Randomly spawn poles
    if (Math.random() < 0.006 && this.poles.length < 3) {
      this.spawnPole();
    }
  }

  private spawnPole() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const pole = this.add.graphics();
    pole.fillStyle(0x061939, 0.7);
    pole.lineStyle(2, 0x00aeef, 0.3);

    // Draw wood/steel cross beam pole
    pole.fillRect(0, height * 0.15, 12, height * 0.85); // main post
    pole.fillRect(-30, height * 0.25, 72, 8); // crossbar

    // Wire insulators
    pole.fillStyle(0x00aeef, 0.6);
    pole.fillRect(-24, height * 0.22, 6, 6);
    pole.fillRect(30, height * 0.22, 6, 6);

    pole.x = width + 50;
    this.poles.push(pole);
  }

  private setupControls() {
    // Keyboard inputs
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-UP", () => this.switchWire(-1));
      this.input.keyboard.on("keydown-DOWN", () => this.switchWire(1));
      this.input.keyboard.on("keydown-SPACE", () => this.jumpPlayer());
    }

    // Touch gesture swipes for mobile
    let startY = 0;
    let startTime = 0;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      startY = pointer.y;
      startTime = pointer.time;
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const elapsed = pointer.time - startTime;
      const distY = pointer.y - startY;

      // Swipe trigger limits
      if (elapsed < 300 && Math.abs(distY) > 30) {
        if (distY < 0) {
          this.switchWire(-1); // Swipe Up
        } else {
          this.switchWire(1); // Swipe Down
        }
      } else if (elapsed < 200 && Math.abs(distY) < 10) {
        this.jumpPlayer(); // Quick tap is a jump
      }
    });
  }

  private switchWire(dir: number) {
    if (!this.gameActive || this.isSwitching || this.isJumping) return;

    const nextIndex = this.currentWireIndex + dir;
    if (nextIndex < 0 || nextIndex >= this.wires.length) return;

    this.currentWireIndex = nextIndex;
    const startY = this.player.y;
    const targetY = this.wires[this.currentWireIndex];

    playSynthSFX("switch");

    // Anti-gravity arc switch tween
    this.tweens.add({
      targets: this,
      wireProgress: 0,
      duration: 180,
      ease: "Quad.easeInOut",
      onStart: () => {
        this.isSwitching = true;
        this.player.setTexture("beetle_jump");
      },
      onUpdate: (tween: any, target: any) => {
        const t = target.wireProgress;
        const linearY = Phaser.Math.Linear(startY, targetY, t);
        // Add upward curve factor mid-track transition
        const arcPeak = -32;
        const curveOffset = Math.sin(t * Math.PI) * arcPeak;
        this.player.y = linearY + curveOffset;
      },
      onComplete: () => {
        this.isSwitching = false;
        this.player.setTexture("beetle_run");
        this.player.play("beetle_running");

        // Land squish bounce animation
        this.tweens.add({
          targets: this.player,
          scaleY: 0.8,
          scaleX: 1.2,
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
    body.setVelocityY(-450); // Upward jump impulse
    this.player.setTexture("beetle_jump");
    playSynthSFX("jump");

    // Emit dust sparkles
    this.createJumpParticles();
  }

  private createJumpParticles() {
    const emitter = this.add.particles(
      this.player.x,
      this.player.y + 6,
      "sparkle",
      {
        speed: { min: 20, max: 60 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.7, end: 0 },
        lifespan: 300,
        quantity: 8,
        gravityY: 100,
      },
    );
    this.time.delayedCall(300, () => emitter.destroy());
  }

  private updateShieldBubble() {
    this.shieldBubble.clear();
    if (!this.isShielded || !this.gameActive) return;

    // Glowing cyan sphere surrounding beetle body
    this.shieldBubble.fillStyle(0x00aeef, 0.12);
    this.shieldBubble.lineStyle(2, 0x00aeef, 0.85);

    // Add pulsing effect
    const pulseScale = 1 + Math.sin(this.time.now / 100) * 0.05;
    this.shieldBubble.fillCircle(
      this.player.x,
      this.player.y - 2,
      25 * pulseScale,
    );
    this.shieldBubble.strokeCircle(
      this.player.x,
      this.player.y - 2,
      25 * pulseScale,
    );
  }

  private spawnObstacle() {
    if (!this.gameActive) return;

    // Spawns a Risk Bird on one of the wires
    const randomWire = Phaser.Math.Between(0, 3);
    const startX = this.cameras.main.width + 64;
    const startY = this.wires[randomWire] - 6;

    let bird = this.birdsGroup.getFirstDead(false);
    if (!bird) {
      bird = this.add.sprite(startX, startY, "bird_fly");
      this.physics.add.existing(bird);

      const body = bird.body as Phaser.Physics.Arcade.Body;
      body.setSize(26, 16);
      body.setOffset(19, 24);

      this.birdsGroup.add(bird);

      // Animate flapping wings
      if (!this.anims.exists("bird_flapping")) {
        this.anims.create({
          key: "bird_flapping",
          frames: this.anims.generateFrameNumbers("bird_fly", {
            start: 0,
            end: 2,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }
    }

    bird.setActive(true);
    bird.setVisible(true);
    bird.setPosition(startX, startY);
    bird.setScale(0.9);

    const body = bird.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    body.setVelocityY(0);

    bird.play("bird_flapping");
  }

  private spawnCollectible() {
    if (!this.gameActive) return;

    // Randomize whether to spawn a Gold Coin (88% chance) or Shield Cover (12% chance)
    const isShield = Math.random() < 0.12;
    const randomWire = Phaser.Math.Between(0, 3);
    const startX = this.cameras.main.width + 50;

    // Draw item slightly higher than wire
    const startY = this.wires[randomWire] - 12;

    let item = this.collectiblesGroup.getFirstDead(false);

    // Recreate if no dead entity is pooled or types mismatch
    if (!item || item.name !== (isShield ? "shield" : "coin")) {
      item = this.add.sprite(startX, startY, isShield ? "shield_item" : "coin");
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

    const body = item.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    body.setVelocityY(0);

    // Hover floating tween
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
    // Disable hazard physics immediately
    const birdBody = bird.body as Phaser.Physics.Arcade.Body;
    birdBody.enable = false;
    this.birdsGroup.killAndHide(bird);

    if (this.isShielded) {
      // Shield cover breaks and absorbs hit
      this.isShielded = false;
      this.shieldHits += 1;
      playSynthSFX("shield");

      // Explosion bubble burst visual
      this.createBurstEffect(this.player.x, this.player.y, 0x00aeef);
      this.cameras.main.shake(120, 0.015);
    } else {
      // Direct collision impact
      this.lives = Math.max(0, this.lives - 1);
      this.riskHits += 1;
      playSynthSFX("hit");

      this.createBurstEffect(this.player.x, this.player.y, 0xef4444);
      this.cameras.main.shake(200, 0.03);

      // Flash player red
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
      this.createBurstEffect(item.x, item.y, 0x00aeef);
      this.createFloatingText(item.x, item.y, "SHIELD ON!", "#00AEEF");
    } else {
      this.coinsCollected += 1;
      playSynthSFX("coin");
      this.createBurstEffect(item.x, item.y, 0xfacc15);
      this.createFloatingText(item.x, item.y, "+1000", "#22C55E");
    }
    this.notifyReact();
  }

  private createBurstEffect(x: number, y: number, color: number) {
    const emitter = this.add.particles(x, y, "sparkle", {
      speed: { min: 40, max: 120 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 14,
      color: [color],
    });
    this.time.delayedCall(400, () => emitter.destroy());
  }

  private createFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
  ) {
    const ft = this.add
      .text(x, y - 10, text, {
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontSize: "12px",
        fontStyle: "900",
        color: color,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: ft,
      y: y - 50,
      alpha: 0,
      duration: 700,
      ease: "Sine.easeOut",
      onComplete: () => ft.destroy(),
    });
  }

  private triggerGameOver() {
    this.gameActive = false;
    this.physics.world.pause();
    this.tweens.pauseAll();

    // Stop animations
    this.player.stop();
    this.player.setTexture("beetle_jump");

    playSynthSFX("gameover");

    // Final score percentage calculations
    // Say target distance is 1000m. Score calculation is percentage-based relative to target
    const targetDistance = 1000;
    const finalScorePct = Math.min(
      100,
      Math.max(
        0,
        Math.round((Math.floor(this.distance) / targetDistance) * 100),
      ),
    );

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
