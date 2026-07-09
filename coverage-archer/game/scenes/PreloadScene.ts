import Phaser from 'phaser';
import { DPR, GAME_CONFIG } from '../../data';

// All textures are generated procedurally on canvas — no image files, no emoji.
// Every texture is rasterized at DPR scale (canvas dims x DPR, ctx.scale(DPR)),
// and MainScene displays sprites at 1/DPR so their world size is unchanged —
// crisp on retina, bit-identical on DPR-1 screens.
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.createArcherSpritesheet();
    this.createVirusSpritesheets();
    this.createArrowTexture();
    this.createParticleTexture();
  }

  create() {
    this.scene.start('MainScene');
  }

  private createArcherSpritesheet() {
    const frameWidth = 64;
    const frameHeight = 64;
    const numFrames = 5;
    const texture = this.textures.createCanvas(
      'archer_spritesheet_canvas',
      frameWidth * numFrames * DPR,
      frameHeight * DPR
    );
    if (!texture) return;
    const ctx = texture.context;
    ctx.scale(DPR, DPR);

    for (let f = 0; f < numFrames; f++) {
      const ox = f * frameWidth + frameWidth / 2;
      const oy = frameHeight / 2 + 6;

      // Body trunk — Bajaj blue uniform
      ctx.fillStyle = '#003DA6';
      ctx.beginPath();
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

      // Head
      ctx.fillStyle = '#FFCDB2';
      ctx.beginPath();
      ctx.arc(ox, oy - 8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Cap
      ctx.fillStyle = '#003DA6';
      ctx.beginPath();
      ctx.arc(ox, oy - 10, 8.5, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(ox - 3, oy - 13, 14, 3.5);

      // Eye (facing right)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ox + 4, oy - 9, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ox - 6, oy + 22, 4, 8);
      ctx.fillRect(ox + 2, oy + 22, 4, 8);

      // Shoes
      ctx.fillStyle = '#111827';
      ctx.fillRect(ox - 8, oy + 30, 6, 2.5);
      ctx.fillRect(ox, oy + 30, 6, 2.5);

      // Gold shield emblem on chest
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(ox - 3, oy + 10);
      ctx.lineTo(ox + 3, oy + 10);
      ctx.lineTo(ox + 4, oy + 14);
      ctx.lineTo(ox, oy + 17);
      ctx.lineTo(ox - 4, oy + 14);
      ctx.closePath();
      ctx.fill();

      // Bow poses per frame
      if (f === 0) {
        // Idle
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ox + 10, oy, 16, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox + 10, oy - 14);
        ctx.lineTo(ox + 10, oy + 14);
        ctx.stroke();

        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox + 4, oy + 8);
        ctx.lineTo(ox + 10, oy + 6);
        ctx.stroke();
      } else if (f === 1) {
        // Draw stage 1 (light pull)
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ox + 10, oy, 16, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ox + 10, oy - 14);
        ctx.lineTo(ox + 3, oy);
        ctx.lineTo(ox + 10, oy + 14);
        ctx.stroke();

        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox - 4, oy + 4);
        ctx.lineTo(ox + 3, oy);
        ctx.stroke();
      } else if (f === 2) {
        // Draw stage 2 (full pull)
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ox + 12, oy, 14, -Math.PI / 2.7, Math.PI / 2.7);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ox + 12, oy - 14);
        ctx.lineTo(ox - 4, oy);
        ctx.lineTo(ox + 12, oy + 14);
        ctx.stroke();

        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox - 6, oy + 4);
        ctx.lineTo(ox - 4, oy);
        ctx.stroke();
      } else if (f === 3) {
        // Release (string snap)
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ox + 10, oy, 16, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ox + 10, oy - 14);
        ctx.lineTo(ox + 12, oy);
        ctx.lineTo(ox + 10, oy + 14);
        ctx.stroke();

        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox - 6, oy + 6);
        ctx.lineTo(ox - 12, oy + 10);
        ctx.stroke();
      } else if (f === 4) {
        // Victory pose
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ox + 4, oy - 14, 12, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        ctx.strokeStyle = '#FFCDB2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox - 6, oy + 4);
        ctx.lineTo(ox - 14, oy - 4);
        ctx.stroke();
      }
    }

    texture.refresh();
    this.textures.addSpriteSheet('archer_spritesheet', texture.canvas as unknown as HTMLImageElement, {
      frameWidth: frameWidth * DPR,
      frameHeight: frameHeight * DPR,
    });
  }

  // Green virus creatures — three sizes, each a 3-frame sheet (pulsing core + wobbling spikes).
  private createVirusSpritesheets() {
    const sizes: Array<{ key: string; r: number }> = [
      { key: 'virus_L', r: GAME_CONFIG.VIRUS_RADIUS.L },
      { key: 'virus_M', r: GAME_CONFIG.VIRUS_RADIUS.M },
      { key: 'virus_S', r: GAME_CONFIG.VIRUS_RADIUS.S },
    ];
    const numFrames = 3;

    sizes.forEach(({ key, r }) => {
      const frameSize = Math.ceil(r * 3.1);
      const texture = this.textures.createCanvas(`${key}_canvas`, frameSize * numFrames * DPR, frameSize * DPR);
      if (!texture) return;
      const ctx = texture.context;
      ctx.scale(DPR, DPR);

      for (let f = 0; f < numFrames; f++) {
        const ox = f * frameSize + frameSize / 2;
        const oy = frameSize / 2;

        // Outer spikes (dark green), wobbling per frame
        const spikeCount = 10;
        const wobble = f * 0.21;
        ctx.strokeStyle = '#14532D';
        ctx.fillStyle = '#166534';
        ctx.lineWidth = Math.max(2.5, r * 0.14);
        ctx.lineCap = 'round';
        for (let i = 0; i < spikeCount; i++) {
          const angle = (i * Math.PI * 2) / spikeCount + wobble;
          const len = r * (1.28 + 0.06 * Math.sin(f * 2.1 + i));
          const sx = ox + Math.cos(angle) * len;
          const sy = oy + Math.sin(angle) * len;

          ctx.beginPath();
          ctx.moveTo(ox + Math.cos(angle) * r * 0.8, oy + Math.sin(angle) * r * 0.8);
          ctx.lineTo(sx, sy);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(2.2, r * 0.13), 0, Math.PI * 2);
          ctx.fill();
        }

        // Body — radial green gradient (brand green family)
        const grad = ctx.createRadialGradient(ox - r * 0.35, oy - r * 0.35, r * 0.15, ox, oy, r);
        grad.addColorStop(0, '#5EE07C');
        grad.addColorStop(0.55, '#28A745');
        grad.addColorStop(1, '#166534');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();

        // Rim highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = Math.max(1.2, r * 0.06);
        ctx.beginPath();
        ctx.arc(ox, oy, r * 0.94, -Math.PI * 0.85, -Math.PI * 0.2);
        ctx.stroke();

        // CORE — pulsing bright nucleus (direct hit = CRITICAL x2)
        const coreR = r * GAME_CONFIG.CORE_RATIO * (1 + 0.12 * Math.sin((f / numFrames) * Math.PI * 2));
        const coreGrad = ctx.createRadialGradient(ox, oy, coreR * 0.1, ox, oy, coreR * 1.5);
        coreGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
        coreGrad.addColorStop(0.4, 'rgba(186,255,201,0.85)');
        coreGrad.addColorStop(1, 'rgba(186,255,201,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(ox, oy, coreR * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#EAFFEF';
        ctx.beginPath();
        ctx.arc(ox, oy, coreR * 0.62, 0, Math.PI * 2);
        ctx.fill();

        // Core ring marker
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(ox, oy, coreR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Angry eyes above the core
        const eyeY = oy - r * 0.52;
        const eyeDX = r * 0.3;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ox - eyeDX, eyeY, Math.max(2, r * 0.13), 0, Math.PI * 2);
        ctx.arc(ox + eyeDX, eyeY, Math.max(2, r * 0.13), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#052E13';
        ctx.beginPath();
        ctx.arc(ox - eyeDX + 1, eyeY + 0.5, Math.max(1, r * 0.06), 0, Math.PI * 2);
        ctx.arc(ox + eyeDX + 1, eyeY + 0.5, Math.max(1, r * 0.06), 0, Math.PI * 2);
        ctx.fill();

        // Angry eyebrows
        ctx.strokeStyle = '#052E13';
        ctx.lineWidth = Math.max(1.2, r * 0.06);
        ctx.beginPath();
        ctx.moveTo(ox - eyeDX - r * 0.16, eyeY - r * 0.2);
        ctx.lineTo(ox - eyeDX + r * 0.12, eyeY - r * 0.08);
        ctx.moveTo(ox + eyeDX + r * 0.16, eyeY - r * 0.2);
        ctx.lineTo(ox + eyeDX - r * 0.12, eyeY - r * 0.08);
        ctx.stroke();
      }

      texture.refresh();
      this.textures.addSpriteSheet(key, texture.canvas as unknown as HTMLImageElement, {
        frameWidth: frameSize * DPR,
        frameHeight: frameSize * DPR,
      });
    });
  }

  private createArrowTexture() {
    const width = 48;
    const height = 16;
    const texture = this.textures.createCanvas('arrow', width * DPR, height * DPR);
    if (!texture) return;
    const ctx = texture.context;
    ctx.scale(DPR, DPR);
    const cy = height / 2;

    // Glowing arrowhead (cyan protection tip)
    ctx.fillStyle = '#00AEEF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(width - 12, cy - 6);
    ctx.lineTo(width - 2, cy);
    ctx.lineTo(width - 12, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shaft
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, cy);
    ctx.lineTo(width - 12, cy);
    ctx.stroke();

    // Fletching (blue V-tails)
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

  private createParticleTexture() {
    const texture = this.textures.createCanvas('sparkle', 16 * DPR, 16 * DPR);
    if (!texture) return;
    const ctx = texture.context;
    ctx.scale(DPR, DPR);
    const grad = ctx.createRadialGradient(8, 8, 1, 8, 8, 7);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, Math.PI * 2);
    ctx.fill();
    texture.refresh();
  }
}
