import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Generate Procedural Textures on launch
    this.createBeetleRunTexture();
    this.createBeetleJumpTexture();
    this.createBirdFlyTexture();
    this.createCoinTexture();
    this.createShieldTexture();
    this.createParticleTexture();
  }

  create() {
    // Start gameplay scene directly once resources are processed
    this.scene.start('MainScene');
  }

  private createBeetleRunTexture() {
    const frameSize = 64;
    const numFrames = 4;
    const texture = this.textures.createCanvas('beetle_run_canvas', frameSize * numFrames, frameSize);
    const ctx = texture.context;

    for (let f = 0; f < numFrames; f++) {
      const ox = f * frameSize + frameSize / 2;
      const oy = frameSize / 2;

      // 1. Draw Legs (different phases to animate running)
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';

      const legOffset = Math.sin(f * Math.PI / 2) * 5;

      // Back leg
      ctx.beginPath();
      ctx.moveTo(ox - 10, oy + 4);
      ctx.lineTo(ox - 22, oy + 16 + legOffset);
      ctx.stroke();

      // Mid leg
      ctx.beginPath();
      ctx.moveTo(ox, oy + 4);
      ctx.lineTo(ox - 4, oy + 18 - legOffset);
      ctx.stroke();

      // Front leg
      ctx.beginPath();
      ctx.moveTo(ox + 10, oy + 4);
      ctx.lineTo(ox + 18, oy + 16 + legOffset);
      ctx.stroke();

      // 2. Beetle Carapace / Body (Vibrant Green)
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(ox, oy, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Head (Green)
      ctx.fillStyle = '#16A34A';
      ctx.beginPath();
      ctx.arc(ox + 14, oy - 2, 7, 0, Math.PI * 2);
      ctx.fill();

      // 4. Big Cartoon Eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ox + 17, oy - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ox + 18, oy - 4, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 5. Antennae
      ctx.strokeStyle = '#16A34A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ox + 21, oy - 9, 6, Math.PI * 0.8, Math.PI * 1.6);
      ctx.stroke();

      // 6. Shiny Bajaj Shield Backpack (Blue / Insurance Accent)
      ctx.fillStyle = '#00AEEF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Shield shape on its back
      ctx.moveTo(ox - 14, oy - 8);
      ctx.lineTo(ox - 2, oy - 12);
      ctx.lineTo(ox + 4, oy - 6);
      ctx.lineTo(ox - 2, oy + 4);
      ctx.lineTo(ox - 14, oy + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mini white checkmark on shield
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox - 8, oy - 3);
      ctx.lineTo(ox - 5, oy);
      ctx.lineTo(ox - 1, oy - 5);
      ctx.stroke();
    }

    texture.refresh();
    
    // Register the canvas as a sprite sheet in the texture manager
    this.textures.addSpriteSheet('beetle_run', texture.canvas as unknown as HTMLImageElement, { frameWidth: frameSize, frameHeight: frameSize });
  }

  // Draw jump posture (wings split)
  private createBeetleJumpTexture() {
    const size = 64;
    const texture = this.textures.createCanvas('beetle_jump', size, size);
    const ctx = texture.context;
    const cx = size / 2;
    const cy = size / 2;

    // Legs straight down
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    [ -10, 0, 10 ].forEach(dx => {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + 4);
      ctx.lineTo(cx + dx + 2, cy + 18);
      ctx.stroke();
    });

    // Body
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Opened wings (Yellow-Green flap highlight)
    ctx.fillStyle = '#86EFAC';
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy - 8, 8, 14, -Math.PI / 6, 0, Math.PI * 2);
    ctx.ellipse(cx + 6, cy - 8, 8, 14, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#16A34A';
    ctx.beginPath();
    ctx.arc(cx + 14, cy - 2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx + 17, cy - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx + 18, cy - 4, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Shield Backpack (seen from side-view in jump)
    ctx.fillStyle = '#00AEEF';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 2, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    texture.refresh();
  }

  // Draw 3 frames of flying crow (flapping wings) onto 192x64 canvas texture
  private createBirdFlyTexture() {
    const frameSize = 64;
    const numFrames = 3;
    const texture = this.textures.createCanvas('bird_fly_canvas', frameSize * numFrames, frameSize);
    const ctx = texture.context;

    for (let f = 0; f < numFrames; f++) {
      const ox = f * frameSize + frameSize / 2;
      const oy = frameSize / 2;

      // 1. Draw Red "Risk/Debt" Tag hanging behind/underneath the bird
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#B91C1C';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Draw rectangular banner tag
      ctx.rect(ox - 24, oy + 4, 18, 10);
      ctx.fill();
      ctx.stroke();

      // Write 'RISK' or 'DEBT' in tiny white letters
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RISK', ox - 15, oy + 9);

      // Thread from bird claws to tag
      ctx.strokeStyle = '#B91C1C';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox - 6, oy + 6);
      ctx.lineTo(ox - 10, oy + 6);
      ctx.stroke();

      // 2. Crow Body (Charcoal/Black vector style)
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.ellipse(ox, oy, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Beak (Yellow-orange)
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(ox + 12, oy - 2);
      ctx.lineTo(ox + 22, oy);
      ctx.lineTo(ox + 11, oy + 2);
      ctx.closePath();
      ctx.fill();

      // Head (Black)
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(ox + 10, oy - 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Angry eye
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(ox + 11, oy - 4, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ox + 11.5, oy - 4, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // 3. Wings (Flapping states based on frame)
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      if (f === 0) {
        // Wings pointing UP
        ctx.ellipse(ox - 4, oy - 14, 6, 12, -Math.PI / 8, 0, Math.PI * 2);
      } else if (f === 1) {
        // Wings flat horizontal
        ctx.ellipse(ox - 4, oy, 12, 5, 0, 0, Math.PI * 2);
      } else {
        // Wings pointing DOWN
        ctx.ellipse(ox - 4, oy + 12, 6, 12, Math.PI / 8, 0, Math.PI * 2);
      }
      ctx.fill();

      // Claws (Yellow)
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ox - 4, oy + 8);
      ctx.lineTo(ox - 6, oy + 12);
      ctx.moveTo(ox - 2, oy + 8);
      ctx.lineTo(ox - 3, oy + 12);
      ctx.stroke();
    }

    texture.refresh();
    
    // Register the canvas as a sprite sheet
    this.textures.addSpriteSheet('bird_fly', texture.canvas as unknown as HTMLImageElement, { frameWidth: frameSize, frameHeight: frameSize });
  }

  // Draw gold rupee coin with shine
  private createCoinTexture() {
    const size = 48;
    const texture = this.textures.createCanvas('coin', size, size);
    const ctx = texture.context;
    const cx = size / 2;
    const cy = size / 2;

    // Beveled rim
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.fill();

    // Metallic face
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    // Inner bevel rim
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();

    // Core shine face
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();

    // Engraved Rupee Sign (₹)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 19px "Plus Jakarta Sans", sans-serif';
    
    // Engraved shadow
    ctx.fillStyle = '#78350F';
    ctx.fillText('₹', cx + 0.5, cy + 0.5);

    // Main text
    ctx.fillStyle = '#D97706';
    ctx.fillText('₹', cx, cy - 0.5);

    texture.refresh();
  }

  // Draw cyan protection shield item
  private createShieldTexture() {
    const size = 48;
    const texture = this.textures.createCanvas('shield_item', size, size);
    const ctx = texture.context;
    const cx = size / 2;
    const cy = size / 2;

    const drawCrest = (c: CanvasRenderingContext2D, x: number, y: number, s: number) => {
      c.beginPath();
      c.moveTo(x, y - 20 * s);
      c.lineTo(x + 16 * s, y - 14 * s);
      c.lineTo(x + 18 * s, y + 2 * s);
      c.lineTo(x, y + 20 * s);
      c.lineTo(x - 18 * s, y + 2 * s);
      c.lineTo(x - 16 * s, y - 14 * s);
      c.closePath();
    };

    // Glow ring
    ctx.fillStyle = 'rgba(0, 174, 239, 0.15)';
    drawCrest(ctx, cx, cy, 1.2);
    ctx.fill();

    // Outer rim (White edge)
    ctx.fillStyle = '#FFFFFF';
    drawCrest(ctx, cx, cy, 1.02);
    ctx.fill();

    // Body (Cyan/Blue insurance gradient)
    const grad = ctx.createLinearGradient(cx, cy - 15, cx, cy + 15);
    grad.addColorStop(0, '#00AEEF');
    grad.addColorStop(1, '#005D9E');
    ctx.fillStyle = grad;
    drawCrest(ctx, cx, cy, 0.88);
    ctx.fill();

    // Core white checkmark (✓)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 1);
    ctx.lineTo(cx - 2, cy + 4);
    ctx.lineTo(cx + 6, cy - 5);
    ctx.stroke();

    texture.refresh();
  }

  // Draw particle textures (small white circle sparks)
  private createParticleTexture() {
    const texture = this.textures.createCanvas('sparkle', 16, 16);
    const ctx = texture.context;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(8, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    texture.refresh();
  }
}
