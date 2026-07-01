import Phaser from "phaser";
import { playSynthSFX } from "../../utils/audio";
import { GameResult } from "../../types";

export default class MainScene extends Phaser.Scene {
  // Player & Bow Aiming
  private archer!: Phaser.GameObjects.Sprite;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private isDragging = false;
  private dragVector = new Phaser.Math.Vector2();
  
  // Game state metrics
  private score = 0;
  private level = 1;
  private maxLevels = 1;
  private arrowsLeft = 8;
  private arrowsUsed = 0;
  private familyShieldPct = 100;
  private virusesNeutralized = 0;
  private gameActive = true;
  private comboStreak = 0;
  private comboMultiplier = 1;
  
  // Wave state
  private virusesNeededInLevel = 5;
  private virusesSpawnedInLevel = 0;
  private virusesActiveCount = 0;
  
  // Wind forces
  private windSpeed = 0;
  private windDirection: '➔' | '⬅' | 'N/A' = '➔';
  private windAccelerationX = 0;
  private windBarrierActive = 0; // Number of shots protected from wind

  // Active arrow type
  private activeArrowType: 'Term Plan' | 'Critical Illness' | 'ULIP Rider' = 'Term Plan';

  // Object pools / groups
  private arrowsGroup!: Phaser.GameObjects.Group;
  private virusesGroup!: Phaser.GameObjects.Group;
  private hazardsGroup!: Phaser.GameObjects.Group;
  private powerupsGroup!: Phaser.GameObjects.Group;

  // Graphics containers for lines & visuals
  private backgroundCity!: Phaser.GameObjects.Graphics;
  private groundGraphics!: Phaser.GameObjects.Graphics;
  private hudGraphics!: Phaser.GameObjects.Graphics;
  
  // Callbacks back to React wrapper
  private onScoreUpdate!: (metrics: any) => void;
  private onGameOver!: (result: GameResult) => void;

  // Timers
  private spawnTimer!: Phaser.Time.TimerEvent;

  // Level Complete Banner elements
  private isLevelTransition = false;
  private levelCompleteOverlay!: Phaser.GameObjects.Container;

  constructor() {
    super("MainScene");
  }

  init() {
    this.onScoreUpdate = this.registry.get("onScoreUpdate");
    this.onGameOver = this.registry.get("onGameOver");

    // Reset properties for new game
    this.score = 0;
    this.level = 1;
    this.arrowsLeft = 8;
    this.arrowsUsed = 0;
    this.familyShieldPct = 100;
    this.virusesNeutralized = 0;
    this.comboStreak = 0;
    this.comboMultiplier = 1;
    this.gameActive = true;
    this.isDragging = false;
    this.isLevelTransition = false;
    this.windBarrierActive = 0;
    this.activeArrowType = 'Term Plan';
    this.dragStart = null;
    this.setLevelRequirements();
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Set physics world bounds
    this.physics.world.setBounds(0, 0, width, height + 100);

    // 1. Draw static sky gradient background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x020715, 0x020715, 0x061533, 0x061533, 1);
    sky.fillRect(0, 0, width, height);

    // 2. Draw procedural parallax skyline
    this.backgroundCity = this.add.graphics();
    this.drawCitySkyline();

    // 3. Draw hills and baseline
    this.groundGraphics = this.add.graphics();
    this.drawGroundHills();

    // 4. Create groups
    this.arrowsGroup = this.add.group();
    this.virusesGroup = this.add.group();
    this.hazardsGroup = this.add.group();
    this.powerupsGroup = this.add.group();

    // 5. Spawn Player Archer (at the left base)
    this.archer = this.add.sprite(90, 470, "archer_spritesheet", 0);
    this.archer.setScale(1.2);

    // 6. Draw graphics layer for aim dotted path preview
    this.hudGraphics = this.add.graphics();

    // 7. Initialize Wind conditions
    this.randomizeWind();

    // 8. Set up dragging aim handlers
    this.setupAimControls();

    // 9. Start Spawn Timer
    this.startSpawningTimer();

    // 10. Initial HUD sync with React
    this.notifyReact();
  }

  update(time: number, delta: number) {
    if (!this.gameActive || this.isLevelTransition) return;

    // 1. Aim drawing preview overlay
    this.drawAimPathPreview();

    // 2. Process and rotate arrows in-flight
    this.arrowsGroup.getChildren().forEach((child) => {
      const arrow = child as Phaser.GameObjects.Sprite;
      if (!arrow.active) return;

      const body = arrow.body as Phaser.Physics.Arcade.Body;
      
      // Face the arrow in its flight direction
      if (body.velocity.x !== 0 || body.velocity.y !== 0) {
        arrow.rotation = Math.atan2(body.velocity.y, body.velocity.x);
      }

      // Sparkle particles trailing the arrow
      if (Math.random() < 0.35) {
        this.createTrailParticle(arrow.x - Math.cos(arrow.rotation) * 16, arrow.y - Math.sin(arrow.rotation) * 16);
      }

      // Overlaps checks
      // Arrow vs Viruses
      this.virusesGroup.getChildren().forEach((vChild) => {
        const virus = vChild as Phaser.GameObjects.Sprite;
        if (virus.active && this.physics.overlap(arrow, virus)) {
          this.handleArrowVirusCollision(arrow, virus);
        }
      });

      // Arrow vs Spiked Hazard Orbs
      this.hazardsGroup.getChildren().forEach((hChild) => {
        const hazard = hChild as Phaser.GameObjects.Sprite;
        if (hazard.active && this.physics.overlap(arrow, hazard)) {
          this.handleArrowHazardCollision(arrow, hazard);
        }
      });

      // Arrow vs Power-ups
      this.powerupsGroup.getChildren().forEach((pChild) => {
        const shield = pChild as Phaser.GameObjects.Sprite;
        if (shield.active && this.physics.overlap(arrow, shield)) {
          this.handleArrowPowerupCollision(arrow, shield);
        }
      });

      // Recycle arrow if it falls off limits
      if (arrow.y > 540 || arrow.x > 500 || arrow.x < -20) {
        this.recycleArrow(arrow);
      }
    });

    // 3. Move and check viruses advancing
    this.virusesGroup.getChildren().forEach((child) => {
      const virus = child as Phaser.GameObjects.Sprite;
      if (!virus.active) return;

      // Animate walking frames manually
      const walkFrame = Math.floor(time / 200) % 3;
      virus.setFrame(walkFrame);

      // If virus reaches family base (home on hill $x < 80$)
      if (virus.x < 75) {
        this.handleVirusBreach(virus);
      }
    });

    // 4. Check spiked falling hazard orbs breaching
    this.hazardsGroup.getChildren().forEach((child) => {
      const hazard = child as Phaser.GameObjects.Sprite;
      if (!hazard.active) return;

      // Rotate hazard in flight
      hazard.rotation += 0.05;

      // Check ground/base breach
      if (hazard.y > 500) {
        this.handleHazardBreach(hazard);
      }
    });

    // 5. Scroll floating collectibles / shields in sky
    this.powerupsGroup.getChildren().forEach((child) => {
      const item = child as Phaser.GameObjects.Sprite;
      if (!item.active) return;

      item.y += Math.sin(time / 400) * 0.15; // wavy hover

      if (item.x < -40) {
        item.setActive(false);
        item.setVisible(false);
      }
    });

    // 6. Ramping difficulty check: if all arrows are gone, wait for arrows to clear before game over
    this.checkArrowInventoryStatus();
  }

  private setLevelRequirements() {
    this.virusesNeededInLevel = 10;
    this.virusesSpawnedInLevel = 0;
    this.virusesActiveCount = 0;
  }

  private drawCitySkyline() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.backgroundCity.clear();

    // Silhouettes of distant houses & financial bars
    this.backgroundCity.fillStyle(0x06132d, 0.4);
    
    // Procedural random towers
    const widths = [60, 50, 70, 80, 55];
    const heights = [140, 180, 110, 160, 200];
    
    let xOffset = 0;
    while (xOffset < width) {
      const idx = Math.floor(xOffset / 40) % widths.length;
      const w = widths[idx];
      const h = heights[idx];
      this.backgroundCity.fillRect(xOffset, 510 - h, w, h);
      xOffset += w + 8;
    }
  }

  private drawQuadraticCurve(graphics: Phaser.GameObjects.Graphics, startX: number, startY: number, cpX: number, cpY: number, endX: number, endY: number, segments = 16) {
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const mt = 1 - t;
      const x = mt * mt * startX + 2 * mt * t * cpX + t * t * endX;
      const y = mt * mt * startY + 2 * mt * t * cpY + t * t * endY;
      graphics.lineTo(x, y);
    }
  }

  private drawGroundHills() {
    const width = this.cameras.main.width;
    this.groundGraphics.clear();

    // 1. Sky/hill border (dark green)
    this.groundGraphics.fillStyle(0x0d381e, 1);
    this.groundGraphics.beginPath();
    this.groundGraphics.moveTo(0, 510);
    this.drawQuadraticCurve(this.groundGraphics, 0, 510, 120, 480, 240, 505);
    this.drawQuadraticCurve(this.groundGraphics, 240, 505, 360, 520, width, 500);
    this.groundGraphics.lineTo(width, 640);
    this.groundGraphics.lineTo(0, 640);
    this.groundGraphics.closePath();
    this.groundGraphics.fill();

    // 2. Light green foreground hill overlay
    this.groundGraphics.fillStyle(0x14532d, 1);
    this.groundGraphics.beginPath();
    this.groundGraphics.moveTo(0, 520);
    this.drawQuadraticCurve(this.groundGraphics, 0, 520, 150, 500, 280, 515);
    this.drawQuadraticCurve(this.groundGraphics, 280, 515, 400, 525, width, 512);
    this.groundGraphics.lineTo(width, 640);
    this.groundGraphics.lineTo(0, 640);
    this.groundGraphics.closePath();
    this.groundGraphics.fill();

    // 3. Family Cottage icon sketch on the left hill
    // Base walls
    this.groundGraphics.fillStyle(0x1e3a8a, 0.95); // blue house
    this.groundGraphics.fillRect(25, 455, 34, 25);
    // Roof
    this.groundGraphics.fillStyle(0xd97706); // orange-brown roof
    this.groundGraphics.beginPath();
    this.groundGraphics.moveTo(20, 455);
    this.groundGraphics.lineTo(42, 435);
    this.groundGraphics.lineTo(64, 455);
    this.groundGraphics.closePath();
    this.groundGraphics.fill();
    // Door
    this.groundGraphics.fillStyle(0xffffff);
    this.groundGraphics.fillRect(38, 465, 8, 15);
    // Windows
    this.groundGraphics.fillStyle(0xfacc15); // glowing light
    this.groundGraphics.fillRect(28, 460, 6, 6);
    this.groundGraphics.fillRect(50, 460, 6, 6);

    // Glowing shield dome around cottage represents Family Shield
    this.updateFamilyShieldDome();
  }

  private updateFamilyShieldDome() {
    // Shield dome graphic (drawn on groundGraphics)
    const activeRadius = 55;
    const cx = 42;
    const cy = 465;

    // Draw check if shield health is above 0
    if (this.familyShieldPct > 0) {
      // Glow boundary
      this.groundGraphics.lineStyle(3, 0x22c55e, (this.familyShieldPct / 100) * 0.85);
      this.groundGraphics.strokeCircle(cx, cy, activeRadius);
      
      this.groundGraphics.fillStyle(0x22c55e, (this.familyShieldPct / 100) * 0.08);
      this.groundGraphics.fillCircle(cx, cy, activeRadius);
    }
  }

  private setupAimControls() {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.gameActive || this.isLevelTransition) return;

      // Allow aiming drag anywhere for accessibility, starting the vector line
      this.dragStart = pointer.position.clone();
      this.isDragging = true;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.dragStart) return;

      // Calculate distance dragged
      const dx = pointer.x - this.dragStart.x;
      const dy = pointer.y - this.dragStart.y;
      
      // Pulling direction is opposite of flight direction
      // We clamp the pull vector length
      this.dragVector.set(-dx, -dy);
      const len = this.dragVector.length();
      const maxPull = 130;
      if (len > maxPull) {
        this.dragVector.setLength(maxPull);
      }

      // Update Archer Draw stages
      const pullRatio = this.dragVector.length() / maxPull;
      if (pullRatio < 0.2) {
        this.archer.setFrame(0); // Idle
      } else if (pullRatio < 0.65) {
        this.archer.setFrame(1); // Stage 1 Draw
      } else {
        this.archer.setFrame(2); // Stage 2 Full Pull
      }
    });

    this.input.on("pointerup", () => {
      if (!this.isDragging || !this.dragStart) return;

      this.isDragging = false;
      this.hudGraphics.clear();

      const maxPull = 130;
      const pullLen = this.dragVector.length();

      // Cancel if drag was too short (accidental taps)
      if (pullLen < 15) {
        this.archer.setFrame(0);
        this.dragStart = null;
        return;
      }

      // Fire Arrow!
      this.fireArrow();
      this.dragStart = null;
    });
  }

  private drawAimPathPreview() {
    this.hudGraphics.clear();
    if (!this.isDragging || !this.dragStart) return;

    const x0 = this.archer.x + 24;
    const y0 = this.archer.y - 4;

    // Kinematic speed multiplier
    const speedCoeff = 5.2;
    const vx0 = this.dragVector.x * speedCoeff;
    const vy0 = this.dragVector.y * speedCoeff;

    // Dotted trajectory preview path
    this.hudGraphics.fillStyle(0x00aeef, 0.9);
    
    const dotsCount = 18;
    const dt = 0.08; // time interval

    for (let i = 1; i <= dotsCount; i++) {
      const t = i * dt;
      // Formula: s = s0 + v0*t + 0.5*a*t^2
      const xt = x0 + vx0 * t + 0.5 * this.windAccelerationX * t * t;
      const yt = y0 + vy0 * t + 0.5 * 300 * t * t; // gravity is 300

      // Only draw dots that are within camera screen limits
      if (xt >= 0 && xt <= 480 && yt >= 0 && yt <= 520) {
        const radius = Math.max(1.5, 3.5 - (i * 0.1)); // fading dot size
        this.hudGraphics.fillCircle(xt, yt, radius);
      }
    }

    // Draw elastic tension line from archer back
    this.hudGraphics.lineStyle(1.5, 0xffffff, 0.45);
    this.hudGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        this.archer.x - 10,
        this.archer.y,
        this.archer.x - this.dragVector.x * 0.35,
        this.archer.y - this.dragVector.y * 0.35
      )
    );
  }

  private fireArrow() {
    if (this.arrowsLeft <= 0) return;

    // Archer shooting release pose
    this.archer.setFrame(3);
    this.time.delayedCall(250, () => {
      if (this.gameActive && !this.isDragging && !this.isLevelTransition) {
        this.archer.setFrame(0);
      }
    });

    const x0 = this.archer.x + 24;
    const y0 = this.archer.y - 4;

    // Kinematic speed multiplier
    const speedCoeff = 5.2;
    const vx0 = this.dragVector.x * speedCoeff;
    const vy0 = this.dragVector.y * speedCoeff;

    // 1. Spawn primary arrow
    this.spawnArrowEntity(x0, y0, vx0, vy0);

    // 2. ULIP Split Arrow Rider Special Benefit
    if (this.activeArrowType === 'ULIP Rider') {
      // Fire helper arrow 1 (+12 deg)
      const angleUp = 0.2; // approx 12 degrees
      const vxUp = vx0 * Math.cos(angleUp) - vy0 * Math.sin(angleUp);
      const vyUp = vx0 * Math.sin(angleUp) + vy0 * Math.cos(angleUp);
      this.spawnArrowEntity(x0, y0, vxUp, vyUp);

      // Fire helper arrow 2 (-12 deg)
      const angleDown = -0.2;
      const vxDown = vx0 * Math.cos(angleDown) - vy0 * Math.sin(angleDown);
      const vyDown = vx0 * Math.sin(angleDown) + vy0 * Math.cos(angleDown);
      this.spawnArrowEntity(x0, y0, vxDown, vyDown);

      // Flash golden burst at release point
      this.createBurstEffect(x0, y0, 0xfacc15);
    }

    // Decrement arrow stock
    this.arrowsLeft--;
    this.arrowsUsed++;
    playSynthSFX("shoot");

    // Reduce wind shield active count if any
    if (this.windBarrierActive > 0) {
      this.windBarrierActive--;
      if (this.windBarrierActive === 0) {
        this.randomizeWind();
      }
    }

    this.notifyReact();
  }

  private spawnArrowEntity(x: number, y: number, vx: number, vy: number) {
    let arrow = this.arrowsGroup.getFirstDead(false);
    if (!arrow) {
      arrow = this.physics.add.sprite(x, y, "arrow");
      this.arrowsGroup.add(arrow);
    }

    arrow.setActive(true);
    arrow.setVisible(true);
    arrow.setPosition(x, y);
    arrow.rotation = Math.atan2(vy, vx);

    const body = arrow.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(true);
    body.setGravityY(0); // Inherit world gravity of 300 exactly, aligning preview
    body.setVelocity(vx, vy);
    body.setAccelerationX(this.windAccelerationX); // Wind acceleration
  }

  private recycleArrow(arrow: Phaser.GameObjects.Sprite) {
    arrow.setActive(false);
    arrow.setVisible(false);
    
    const body = arrow.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.setVelocity(0, 0);
    body.setAccelerationX(0);

    // Randomize wind for next shot once all arrows are inactive
    this.time.delayedCall(50, () => {
      const activeArrows = this.arrowsGroup.getChildren().some(c => c.active);
      if (!activeArrows && this.gameActive && !this.isDragging) {
        this.randomizeWind();
        this.notifyReact();
      }
    });
  }

  private randomizeWind() {
    if (this.windBarrierActive > 0) {
      this.windSpeed = 0;
      this.windDirection = 'N/A';
      this.windAccelerationX = 0;
      return;
    }

    // Storm events chance (increases at level 5+)
    const isStorm = this.level >= 5 && Math.random() < 0.35;
    const maxWind = isStorm ? 12 : 6;
    
    this.windSpeed = Math.floor(Math.random() * (maxWind + 1));
    if (this.windSpeed === 0) {
      this.windDirection = 'N/A';
      this.windAccelerationX = 0;
    } else {
      this.windDirection = Math.random() < 0.5 ? '➔' : '⬅';
      // ➔ accelerates arrows right (positive acc), ⬅ accelerates left (negative acc)
      const windForce = this.windSpeed * (this.windDirection === '➔' ? 14 : -14);
      this.windAccelerationX = windForce;
    }
  }

  private startSpawningTimer() {
    if (this.spawnTimer) this.spawnTimer.destroy();

    // Spawning frequency: 3s at level 1, decreases down to 1.3s at level 10
    const delay = Math.max(1200, 3000 - this.level * 180);

    this.spawnTimer = this.time.addEvent({
      delay: delay,
      callback: this.spawnVirusThreat,
      callbackScope: this,
      loop: true,
    });
  }

  private spawnVirusThreat() {
    if (!this.gameActive || this.isLevelTransition) return;

    // Limit spawning if we reached level quota
    if (this.virusesSpawnedInLevel >= this.virusesNeededInLevel) return;

    const width = this.cameras.main.width;

    // Spawns virus on the right side (ground or air)
    const startX = width + 40;
    const isAirEnemy = Math.random() < 0.45; // 45% chance of air enemy
    const startY = isAirEnemy ? Phaser.Math.Between(150, 320) : 482;

    // Select random risk virus type
    // red: Illness, purple: Debt, black: Accident
    const rnd = Math.random();
    let virusKey = 'virus_red';
    if (rnd < 0.4) {
      virusKey = 'virus_red';
    } else if (rnd < 0.75) {
      virusKey = 'virus_purple';
    } else {
      virusKey = 'virus_black';
    }

    let virus = this.virusesGroup.getFirstDead(false);
    if (!virus || virus.name !== virusKey) {
      virus = this.physics.add.sprite(startX, startY, virusKey);
      virus.name = virusKey;
      this.virusesGroup.add(virus);
    }

    virus.setActive(true);
    virus.setVisible(true);
    virus.setPosition(startX, startY);
    virus.setScale(0.85);

    const body = virus.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    body.setVelocity(0, 0);

    // Walking speed: -30 at level 1, increases to -75 at level 10
    const walkSpeed = -(35 + this.level * 5.5);
    body.setVelocityX(walkSpeed);

    this.virusesSpawnedInLevel++;
    this.virusesActiveCount++;

    // Spawning hazard orbs released by viruses (Level 3+)
    if (this.level >= 3 && Math.random() < 0.45) {
      this.time.delayedCall(Phaser.Math.Between(800, 1600), () => {
        if (virus.active && this.gameActive && !this.isLevelTransition) {
          this.releaseSpikedHazard(virus.x, virus.y - 12);
        }
      });
    }

    // Occasionally spawn Premium Shield floaters in the sky (12% chance)
    if (Math.random() < 0.12) {
      this.spawnPremiumShield();
    }
  }

  private releaseSpikedHazard(x: number, y: number) {
    let hazard = this.hazardsGroup.getFirstDead(false);
    if (!hazard) {
      hazard = this.physics.add.sprite(x, y, "hazard_orb");
      this.hazardsGroup.add(hazard);
    }

    hazard.setActive(true);
    hazard.setVisible(true);
    hazard.setPosition(x, y);

    const body = hazard.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(true);
    body.setGravityY(100); // falls downwards

    // Lob hazard upwards and to the left
    body.setVelocity(Phaser.Math.Between(-140, -60), Phaser.Math.Between(-180, -90));
  }

  private spawnPremiumShield() {
    const width = this.cameras.main.width;
    const startY = Phaser.Math.Between(120, 240); // sky positions

    let shield = this.powerupsGroup.getFirstDead(false);
    if (!shield) {
      shield = this.physics.add.sprite(width + 30, startY, "shield_powerup");
      this.powerupsGroup.add(shield);
    }

    shield.setActive(true);
    shield.setVisible(true);
    shield.setPosition(width + 30, startY);
    shield.setScale(0.85);

    const body = shield.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    body.setVelocity(-45, 0); // float left smoothly
  }

  private handleArrowVirusCollision(arrow: Phaser.GameObjects.Sprite, virus: Phaser.GameObjects.Sprite) {
    // Disable physics immediately
    const vBody = virus.body as Phaser.Physics.Arcade.Body;
    vBody.enable = false;
    virus.setActive(false);
    virus.setVisible(false);
    this.virusesActiveCount--;

    // Recycle arrow
    this.recycleArrow(arrow);

    playSynthSFX("hit");
    
    // Determine cover pop-up message based on virus type
    let coverMessage = 'Risk Secured!';
    let particleColor = 0xffffff;

    if (virus.name === 'virus_red') {
      coverMessage = 'Critical Illness cover activated!';
      particleColor = 0xef4444; // Red
      this.activeArrowType = 'Critical Illness'; // switch arrow type
    } else if (virus.name === 'virus_purple') {
      coverMessage = 'Debt risk neutralized with savings plan!';
      particleColor = 0xa855f7; // Purple
      this.activeArrowType = 'Term Plan';
    } else if (virus.name === 'virus_black') {
      coverMessage = 'Accident Shield rider protects family!';
      particleColor = 0x374151; // Charcoal
      this.activeArrowType = 'ULIP Rider';
    }

    // Combo multiplier
    this.comboStreak++;
    this.comboMultiplier = Math.min(5, Math.floor(this.comboStreak / 2) + 1);

    // Increment scoring
    const points = 100 * this.comboMultiplier;
    this.score += points;
    this.virusesNeutralized++;

    // Visual particles explosion
    this.createBurstEffect(virus.x, virus.y, particleColor);
    
    // Floating score text
    this.createFloatingText(virus.x, virus.y - 12, `+${points} (${this.comboMultiplier}x)`, '#FACC15');

    // Notify React HUD with the educational cover message
    this.triggerReactFeedback(coverMessage);

    // Check Level Complete trigger
    if (this.virusesNeutralized >= this.virusesNeededInLevel) {
      this.triggerLevelComplete();
    }

    this.notifyReact();
  }

  private handleArrowHazardCollision(arrow: Phaser.GameObjects.Sprite, hazard: Phaser.GameObjects.Sprite) {
    const hBody = hazard.body as Phaser.Physics.Arcade.Body;
    hBody.enable = false;
    hazard.setActive(false);
    hazard.setVisible(false);

    this.recycleArrow(arrow);
    playSynthSFX("hit");

    // Bonus points for mid-air hazard shot
    const points = 200 * this.comboMultiplier;
    this.score += points;

    this.createBurstEffect(hazard.x, hazard.y, 0xef4444);
    this.createFloatingText(hazard.x, hazard.y - 10, `+${points} Mid-air!`, '#22c55e');

    this.notifyReact();
  }

  private handleArrowPowerupCollision(arrow: Phaser.GameObjects.Sprite, shield: Phaser.GameObjects.Sprite) {
    const sBody = shield.body as Phaser.Physics.Arcade.Body;
    sBody.enable = false;
    shield.setActive(false);
    shield.setVisible(false);

    this.recycleArrow(arrow);
    playSynthSFX("shield");

    // Bonus +2 Arrows & temporary wind cover
    this.arrowsLeft = Math.min(25, this.arrowsLeft + 2);
    this.windBarrierActive = 2; // zero wind for next 2 shots
    this.randomizeWind();

    this.createBurstEffect(shield.x, shield.y, 0x22c55e);
    this.createFloatingText(shield.x, shield.y - 12, `+2 Arrows & Wind Shield!`, '#22C55E');
    this.triggerReactFeedback("Premium Shield Active! Temporary Wind Barrier.");

    this.notifyReact();
  }

  private handleVirusBreach(virus: Phaser.GameObjects.Sprite) {
    const vBody = virus.body as Phaser.Physics.Arcade.Body;
    vBody.enable = false;
    virus.setActive(false);
    virus.setVisible(false);
    this.virusesActiveCount--;

    // Impact breach damages shield
    this.familyShieldPct = Math.max(0, this.familyShieldPct - 15);
    playSynthSFX("lose");

    // Red impact overlay
    this.cameras.main.shake(200, 0.025);
    this.createBurstEffect(60, 470, 0xef4444);
    this.drawGroundHills(); // redraw hills with updated shield health

    // Reset combo streak on breach
    this.comboStreak = 0;
    this.comboMultiplier = 1;

    // Check game over
    if (this.familyShieldPct <= 0) {
      this.triggerGameOver();
    } else if (this.virusesNeutralized >= this.virusesNeededInLevel) {
      // Check level complete
      this.triggerLevelComplete();
    }

    this.notifyReact();
  }

  private handleHazardBreach(hazard: Phaser.GameObjects.Sprite) {
    const hBody = hazard.body as Phaser.Physics.Arcade.Body;
    hBody.enable = false;
    hazard.setActive(false);
    hazard.setVisible(false);

    this.familyShieldPct = Math.max(0, this.familyShieldPct - 5);
    playSynthSFX("lose");

    this.cameras.main.shake(120, 0.012);
    this.createBurstEffect(hazard.x, hazard.y, 0xef4444);
    this.drawGroundHills();

    // Reset combo streak
    this.comboStreak = 0;
    this.comboMultiplier = 1;

    if (this.familyShieldPct <= 0) {
      this.triggerGameOver();
    }

    this.notifyReact();
  }

  private checkArrowInventoryStatus() {
    // If player runs out of arrows, wait for all active arrows in flight to clear
    const activeArrows = this.arrowsGroup.getChildren().some(c => c.active);
    
    if (this.arrowsLeft <= 0 && !activeArrows && this.gameActive && !this.isLevelTransition) {
      // Allow a split second of delay for any active virus breach checks
      this.time.delayedCall(400, () => {
        if (this.gameActive && !this.isLevelTransition) {
          this.triggerGameOver();
        }
      });
    }
  }

  private triggerLevelComplete() {
    this.isLevelTransition = true;
    this.physics.world.pause();
    if (this.spawnTimer) this.spawnTimer.destroy();

    playSynthSFX("levelup");

    // Clear remaining entities
    this.virusesGroup.clear(true, true);
    this.hazardsGroup.clear(true, true);
    this.powerupsGroup.clear(true, true);

    // Provide arrows bonus (+3 arrows)
    this.arrowsLeft = Math.min(25, this.arrowsLeft + 3);

    if (this.level >= this.maxLevels) {
      this.triggerGameOver(true);
      return;
    }

    // Level-up tips array
    const insuranceInsights = [
      "Term Insurance is the base block of family safety.",
      "Dual Benefits support financial growth plus protection.",
      "ULIP split funds allow customized wealth accumulation.",
      "Covering early lowers premium costs significantly.",
      "Ensure riders protect against critical illnesses.",
      "Retirement planning blocks financial shocks early.",
      "Accidental death riders shield your kids' education.",
      "Term plans represent the cheapest protection coverage.",
      "Maintain shield stability against medical inflation.",
      "Bajaj Allianz ensures your goals stay safe from risks."
    ];
    const tip = insuranceInsights[(this.level - 1) % insuranceInsights.length];

    // Create Level Up Popup overlay
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.levelCompleteOverlay = this.add.container(0, 0);

    // Semi-trans background
    const bg = this.add.graphics();
    bg.fillStyle(0x030f26, 0.85);
    bg.fillRect(0, 0, width, height);
    this.levelCompleteOverlay.add(bg);

    // Main box
    const card = this.add.graphics();
    card.fillStyle(0x061939, 0.95);
    card.lineStyle(2, 0x00aeef, 0.4);
    card.fillRoundedRect(40, 140, width - 80, 320, 20);
    card.strokeRoundedRect(40, 140, width - 80, 320, 20);
    this.levelCompleteOverlay.add(card);

    // Gold Star
    const star = this.add.text(width / 2, 190, "🌟", { fontSize: "40px" }).setOrigin(0.5);
    this.levelCompleteOverlay.add(star);

    // Title
    const title = this.add.text(width / 2, 245, `LEVEL ${this.level} COMPLETED`, {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: "18px",
      fontStyle: "900",
      color: "#22c55e"
    }).setOrigin(0.5);
    this.levelCompleteOverlay.add(title);

    // Bonus Info
    const bonus = this.add.text(width / 2, 280, "+3 Arrows Added • Shield Restored!", {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: "11px",
      fontStyle: "700",
      color: "#00aeef"
    }).setOrigin(0.5);
    this.levelCompleteOverlay.add(bonus);

    // Restores shield partially (+15%)
    this.familyShieldPct = Math.min(100, this.familyShieldPct + 15);
    this.drawGroundHills(); // redraw base dome

    // Insight Title
    const insightTitle = this.add.text(width / 2, 325, "INSURANCE INSIGHT:", {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: "9px",
      fontStyle: "900",
      color: "rgba(255,255,255,0.4)"
    }).setOrigin(0.5);
    this.levelCompleteOverlay.add(insightTitle);

    // Insight Tip Description
    const insightText = this.add.text(width / 2, 355, tip, {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: "11px",
      fontStyle: "bold",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: width - 120 }
    }).setOrigin(0.5);
    this.levelCompleteOverlay.add(insightText);

    // Continue CTA Button
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x22c55e, 1);
    btnBg.fillRoundedRect(90, 400, width - 180, 40, 20);
    this.levelCompleteOverlay.add(btnBg);

    const btnText = this.add.text(width / 2, 420, "CONTINUE MISSION", {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: "12px",
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(0.5);
    this.levelCompleteOverlay.add(btnText);

    // Interactive button pointer listener
    btnBg.setInteractive(new Phaser.Geom.Rectangle(90, 400, width - 180, 40), Phaser.Geom.Rectangle.Contains);
    btnBg.on("pointerdown", () => {
      btnText.setScale(0.95);
    });

    btnBg.on("pointerup", () => {
      this.levelCompleteOverlay.destroy();
      this.advanceLevel();
    });
  }

  private advanceLevel() {
    this.level++;
    this.isLevelTransition = false;

    // Check if player has beaten all levels
    if (this.level > this.maxLevels) {
      this.triggerGameOver(true);
      return;
    }

    // Set next wave specifications
    this.setLevelRequirements();
    this.physics.world.resume();
    this.randomizeWind();
    this.startSpawningTimer();
    this.notifyReact();
  }

  private triggerReactFeedback(msg: string) {
    this.registry.get("onScoreUpdate")({
      score: this.score,
      arrowsLeft: this.arrowsLeft,
      familyShieldPct: this.familyShieldPct,
      virusesNeutralized: this.virusesNeutralized,
      level: this.level,
      windSpeed: this.windSpeed,
      windDirection: this.windDirection,
      arrowType: this.activeArrowType,
      combo: this.comboMultiplier,
      showFeedback: true,
      feedbackText: msg
    });

    // Auto fade educational banner after 2.5s
    this.time.delayedCall(2500, () => {
      if (this.gameActive && !this.isLevelTransition) {
        this.notifyReact();
      }
    });
  }

  private notifyReact() {
    if (!this.onScoreUpdate) return;
    this.onScoreUpdate({
      score: this.score,
      arrowsLeft: this.arrowsLeft,
      familyShieldPct: this.familyShieldPct,
      virusesNeutralized: this.virusesNeutralized,
      level: this.level,
      windSpeed: this.windSpeed,
      windDirection: this.windDirection,
      arrowType: this.activeArrowType,
      combo: this.comboMultiplier,
      showFeedback: false,
      feedbackText: ''
    });
  }

  private createTrailParticle(x: number, y: number) {
    let color = 0x00aeef; // Default cyan
    if (this.activeArrowType === 'Critical Illness') color = 0xec4899; // Pink
    if (this.activeArrowType === 'ULIP Rider') color = 0xfacc15; // Yellow

    const emitter = this.add.particles(x, y, "sparkle", {
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 250,
      quantity: 1,
      color: [color],
    });
    this.time.delayedCall(250, () => emitter.destroy());
  }

  private createBurstEffect(x: number, y: number, color: number) {
    const emitter = this.add.particles(x, y, "sparkle", {
      speed: { min: 40, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 14,
      color: [color],
    });
    this.time.delayedCall(400, () => emitter.destroy());
  }

  private createFloatingText(x: number, y: number, text: string, color: string) {
    const ft = this.add.text(x, y, text, {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontSize: "12px",
      fontStyle: "900",
      color: color,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: ft,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: "Sine.easeOut",
      onComplete: () => ft.destroy(),
    });
  }

  private triggerGameOver(completedAll = false) {
    this.gameActive = false;
    this.physics.world.pause();
    this.tweens.pauseAll();
    if (this.spawnTimer) this.spawnTimer.destroy();

    playSynthSFX("gameover");

    // Victory animation pose
    this.archer.setFrame(completedAll ? 4 : 0);

    // Final Normalized Score calculation
    // Max level achieved, viruses neutralized, and remaining shield health
    // If shield and levels are maximized, score hits 100%
    const levelWeight = (Math.min(this.level, this.maxLevels) / this.maxLevels) * 30; // max 30%
    const shieldWeight = (this.familyShieldPct / 100) * 50; // max 50%
    const accuracyWeight = Math.min(20, (this.virusesNeutralized / (this.arrowsUsed || 1)) * 20); // max 20%
    
    let finalScorePct = Math.round(levelWeight + shieldWeight + accuracyWeight);
    finalScorePct = Math.min(100, Math.max(10, finalScorePct));

    // Force 100% if they beat all levels with full shield
    if (completedAll && this.familyShieldPct >= 100) {
      finalScorePct = 100;
    }

    this.time.delayedCall(1200, () => {
      this.onGameOver({
        score: finalScorePct,
        arrowsLeft: this.arrowsLeft,
        virusesNeutralized: this.virusesNeutralized,
        familyShieldPct: this.familyShieldPct,
        level: this.level,
        timeSeconds: 0 // placeholder
      });
    });
  }
}
