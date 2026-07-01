import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Dynamically draw and register all textures procedurally
    this.createArcherSpritesheet();
    this.createVirusSpritesheets();
    this.createArrowTexture();
    this.createShieldTexture();
    this.createHazardOrbTexture();
    this.createParticleTexture();
  }

  create() {
    this.scene.start('MainScene');
  }

  private createArcherSpritesheet() {
    const frameWidth = 64;
    const frameHeight = 64;
    const numFrames = 5;
    const texture = this.textures.createCanvas('archer_spritesheet_canvas', frameWidth * numFrames, frameHeight);
    const ctx = texture.context;

    for (let f = 0; f < numFrames; f++) {
      const ox = f * frameWidth + frameWidth / 2;
      const oy = frameHeight / 2 + 6; // slightly offset downwards

      // Draw Archer Body (Strong posture, modern insurance blue uniform)
      ctx.fillStyle = '#003DA6'; // Bajaj Blue
      ctx.beginPath();
      // Draw body trunk
      ctx.ellipse(ox, oy + 12, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // White collar / chest detail
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(ox - 6, oy + 4);
      ctx.lineTo(ox, oy + 10);
      ctx.lineTo(ox + 6, oy + 4);
      ctx.closePath();
      ctx.fill();

      // Head (Skin tone)
      ctx.fillStyle = '#FFCDB2';
      ctx.beginPath();
      ctx.arc(ox, oy - 8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Cap (Bajaj Blue)
      ctx.fillStyle = '#003DA6';
      ctx.beginPath();
      ctx.arc(ox, oy - 10, 8.5, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(ox - 3, oy - 13, 14, 3.5); // visor

      // Eyes (Looking right, since archer faces right)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ox + 4, oy - 9, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Legs / Pants (White)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ox - 6, oy + 22, 4, 8);
      ctx.fillRect(ox + 2, oy + 22, 4, 8);

      // Shoes (Black)
      ctx.fillStyle = '#111827';
      ctx.fillRect(ox - 8, oy + 30, 6, 2.5);
      ctx.fillRect(ox, oy + 30, 6, 2.5);

      // Gold Shield Emblem on Uniform Chest
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(ox - 3, oy + 10);
      ctx.lineTo(ox + 3, oy + 10);
      ctx.lineTo(ox + 4, oy + 14);
      ctx.lineTo(ox, oy + 17);
      ctx.lineTo(ox - 4, oy + 14);
      ctx.closePath();
      ctx.fill();

      // Draw bow based on frame/aim stage
      ctx.strokeStyle = '#D97706'; // Wooden bow
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';

      // Draw bow string
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.2;

      // Poses
      if (f === 0) {
        // --- 0. Idle Pose ---
        // Left arm holding bow forward relaxed
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(ox + 10, oy, 16, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        // Bow string (straight)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox + 10, oy - 14);
        ctx.lineTo(ox + 10, oy + 14);
        ctx.stroke();

        // Archer arms relaxed
        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox + 4, oy + 8);
        ctx.lineTo(ox + 10, oy + 6);
        ctx.stroke();
      }
      else if (f === 1) {
        // --- 1. Aim Draw Stage 1 (Minor Pull) ---
        // Bow drawn slightly back
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(ox + 10, oy, 16, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        // Bow string pulled back slightly to the left
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ox + 10, oy - 14);
        ctx.lineTo(ox + 3, oy); // pulled point
        ctx.lineTo(ox + 10, oy + 14);
        ctx.stroke();

        // Drawing arm pulling back
        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox - 4, oy + 4);
        ctx.lineTo(ox + 3, oy);
        ctx.stroke();
      }
      else if (f === 2) {
        // --- 2. Aim Draw Stage 2 (Full Pull) ---
        // Bow flexed (deeper bend)
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(ox + 12, oy, 14, -Math.PI / 2.7, Math.PI / 2.7);
        ctx.stroke();

        // Bow string pulled back deep left
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ox + 12, oy - 14);
        ctx.lineTo(ox - 4, oy); // deep pull point
        ctx.lineTo(ox + 12, oy + 14);
        ctx.stroke();

        // Drawing arm holding fully pulled string
        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox - 6, oy + 4);
        ctx.lineTo(ox - 4, oy);
        ctx.stroke();
      }
      else if (f === 3) {
        // --- 3. Release Stage (Bow vibrating, string snaps) ---
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(ox + 10, oy, 16, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        // String vibrating (drawn straight/moving forward slightly)
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ox + 10, oy - 14);
        ctx.lineTo(ox + 12, oy); // snap vibration
        ctx.lineTo(ox + 10, oy + 14);
        ctx.stroke();

        // Left arm pointing forward, right arm flung back
        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox - 6, oy + 6);
        ctx.lineTo(ox - 12, oy + 10);
        ctx.stroke();
      }
      else if (f === 4) {
        // --- 4. Victory Pose ---
        // Bow raised high in right hand
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ox + 4, oy - 14, 12, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Left hand waving
        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox - 6, oy + 4);
        ctx.lineTo(ox - 14, oy - 4);
        ctx.stroke();
      }
    }

    texture.refresh();
    this.textures.addSpriteSheet('archer_spritesheet', texture.canvas as unknown as HTMLImageElement, { frameWidth: frameWidth, frameHeight: frameHeight });
  }

  private createVirusSpritesheets() {
    const frameSize = 64;
    const numFrames = 3;

    // Define the three threat types with distinct colors/labels
    const riskTypes = [
      { name: 'virus_red', fill: '#EF4444', border: '#991B1B', text: 'ILLNESS' },
      { name: 'virus_purple', fill: '#A855F7', border: '#6B21A8', text: 'DEBT' },
      { name: 'virus_black', fill: '#374151', border: '#111827', text: 'ACCIDENT' }
    ];

    riskTypes.forEach(risk => {
      const texture = this.textures.createCanvas(`${risk.name}_canvas`, frameSize * numFrames, frameSize);
      const ctx = texture.context;

      for (let f = 0; f < numFrames; f++) {
        const ox = f * frameSize + frameSize / 2;
        const oy = frameSize / 2;

        // Walking leg animations
        ctx.strokeStyle = risk.border;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        const legWalk = Math.sin(f * Math.PI) * 6;

        ctx.beginPath();
        ctx.moveTo(ox - 8, oy + 12);
        ctx.lineTo(ox - 12 - legWalk, oy + 24);
        ctx.moveTo(ox + 8, oy + 12);
        ctx.lineTo(ox + 12 + legWalk, oy + 24);
        ctx.stroke();

        // Draw outer virus Spikes
        ctx.fillStyle = risk.border;
        const spikeCount = 8;
        const radius = 15;
        for (let i = 0; i < spikeCount; i++) {
          const angle = (i * Math.PI * 2) / spikeCount + (f * 0.1); // rotating spikes
          const sx = ox + Math.cos(angle) * (radius + 4);
          const sy = oy + Math.sin(angle) * (radius + 4);
          
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = risk.border;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }

        // Draw main body circle
        ctx.fillStyle = risk.fill;
        ctx.beginPath();
        ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Angry Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        // Left eye
        ctx.arc(ox - 5, oy - 3, 3, 0, Math.PI * 2);
        // Right eye
        ctx.arc(ox + 5, oy - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(ox - 4.5, oy - 2.5, 1.2, 0, Math.PI * 2);
        ctx.arc(ox + 4.5, oy - 2.5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyebrow lines
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ox - 8, oy - 7);
        ctx.lineTo(ox - 3, oy - 5);
        ctx.moveTo(ox + 8, oy - 7);
        ctx.lineTo(ox + 3, oy - 5);
        ctx.stroke();

        // Grumpy Mouth
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(ox, oy + 6, 4, Math.PI, 0); // frown
        ctx.stroke();

        // Text banner overlay representing the risk
        ctx.fillStyle = risk.border;
        ctx.fillRect(ox - 22, oy - 22, 44, 9);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'black 6.5px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(risk.text, ox, oy - 17.5);
      }

      texture.refresh();
      this.textures.addSpriteSheet(risk.name, texture.canvas as unknown as HTMLImageElement, { frameWidth: frameSize, frameHeight: frameSize });
    });
  }

  private createArrowTexture() {
    const width = 48;
    const height = 16;
    const texture = this.textures.createCanvas('arrow', width, height);
    const ctx = texture.context;
    const cy = height / 2;

    // Glowing shield point (Arrowhead)
    ctx.fillStyle = '#00AEEF'; // Cyan
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(width - 12, cy - 6);
    ctx.lineTo(width - 2, cy);
    ctx.lineTo(width - 12, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shaft (white rod with subtle gradient)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, cy);
    ctx.lineTo(width - 12, cy);
    ctx.stroke();

    // Fletching/feathers (Blue V-tails)
    ctx.fillStyle = '#003DA6';
    ctx.beginPath();
    ctx.moveTo(8, cy);
    ctx.lineTo(2, cy - 5);
    ctx.lineTo(6, cy - 5);
    ctx.lineTo(10, cy);
    ctx.lineTo(6, cy + 5);
    ctx.lineTo(2, cy + 5);
    ctx.closePath();
    ctx.fill();

    texture.refresh();
  }

  private createShieldTexture() {
    const size = 48;
    const texture = this.textures.createCanvas('shield_powerup', size, size);
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
    ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'; // Green glow
    drawCrest(ctx, cx, cy, 1.2);
    ctx.fill();

    // Outer rim (White edge)
    ctx.fillStyle = '#FFFFFF';
    drawCrest(ctx, cx, cy, 1.02);
    ctx.fill();

    // Body (Green/Teal gradient)
    const grad = ctx.createLinearGradient(cx, cy - 15, cx, cy + 15);
    grad.addColorStop(0, '#22C55E');
    grad.addColorStop(1, '#0D9488');
    ctx.fillStyle = grad;
    drawCrest(ctx, cx, cy, 0.88);
    ctx.fill();

    // Inner white star/shield symbol
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 1);
    ctx.lineTo(cx - 2, cy + 4);
    ctx.lineTo(cx + 6, cy - 5);
    ctx.stroke();

    texture.refresh();
  }

  private createHazardOrbTexture() {
    const size = 24;
    const texture = this.textures.createCanvas('hazard_orb', size, size);
    const ctx = texture.context;
    const cx = size / 2;
    const cy = size / 2;

    // Small red risk particle sphere
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Spikes around orb
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 1.5;
    const spikeCount = 6;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i * Math.PI * 2) / spikeCount;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * 11, cy + Math.sin(angle) * 11);
      ctx.stroke();
    }

    texture.refresh();
  }

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
