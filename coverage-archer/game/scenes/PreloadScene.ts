import Phaser from 'phaser';
import { DPR, GAME_CONFIG as CFG, RISKS, RiskKind, RiskDef } from '../../data';
import archerIdleUrl from '../../assets/archer-idle.webp';
import archerDrawUrl from '../../assets/archer-draw.webp';

// Risks, arrows and particles are generated procedurally on canvas — no emoji.
// Every texture is rasterized at DPR scale (canvas dims x DPR, ctx.scale(DPR)) and
// MainScene displays it at 1/DPR with the camera zoomed by DPR, so world size is
// unchanged — crisp on retina, bit-identical on DPR-1 screens.
//
// The archer is the exception: he is the character the player watches on every
// shot, and a stick figure assembled from arcs is exactly the "asset issue" the
// review flagged. He is composited from two pieces of real art instead.
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.load.image('archer_idle_src', archerIdleUrl);
    this.load.image('archer_draw_src', archerDrawUrl);
    this.createRiskTextures();
    this.createArrowTexture();
    this.createParticleTextures();
  }

  create() {
    // Built in create(), not preload(), because it needs the loaded art.
    this.createArcherSpritesheet();
    this.scene.start('MainScene');
  }

  /* ── Canvas helpers ─────────────────────────────────────────── */

  private polygon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    sides: number,
    rotation = 0
  ) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i * Math.PI * 2) / sides;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private hexColor(n: number) {
    return `#${n.toString(16).padStart(6, '0')}`;
  }

  /* ── Archer ─────────────────────────────────────────────────── */

  /**
   * Blit the two archer paintings into the 5-frame sheet MainScene expects.
   *
   * MainScene's contract is frame 0 idle, 1 half draw, 2 full draw, 3 release,
   * 4 victory. Two paintings cover it: bow-down for 0 and 4, bow-drawn for the
   * three shot frames. The half-draw/full-draw distinction is not lost — the
   * power ring MainScene draws around the archer is what actually reads the
   * charge, and it is continuous where five discrete frames were not.
   *
   * Returns false if either image is missing so the procedural archer below
   * still runs; that path is the fallback, not dead code.
   */
  private blitArcherArt(
    ctx: CanvasRenderingContext2D,
    frameWidth: number,
    frameHeight: number,
    numFrames: number
  ): boolean {
    if (!this.textures.exists('archer_idle_src') || !this.textures.exists('archer_draw_src')) {
      return false;
    }
    const idle = this.textures.get('archer_idle_src').getSourceImage() as HTMLImageElement;
    const drawn = this.textures.get('archer_draw_src').getSourceImage() as HTMLImageElement;
    if (!idle?.width || !drawn?.width) return false;

    // frame -> source painting
    const byFrame = [idle, drawn, drawn, drawn, idle];

    for (let f = 0; f < numFrames; f++) {
      const src = byFrame[f];
      // Fit inside the cell preserving aspect, then sit the figure on the
      // cell's floor so his feet land where the procedural archer's did.
      const scale = Math.min(frameWidth / src.width, frameHeight / src.height);
      const w = src.width * scale;
      const h = src.height * scale;
      const x = f * frameWidth + (frameWidth - w) / 2;
      const y = frameHeight - h;
      ctx.drawImage(src, x, y, w, h);
    }
    return true;
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

    if (this.blitArcherArt(ctx, frameWidth, frameHeight, numFrames)) {
      texture.refresh();
      this.textures.addSpriteSheet('archer_spritesheet', texture.canvas as unknown as HTMLImageElement, {
        frameWidth: frameWidth * DPR,
        frameHeight: frameHeight * DPR,
      });
      return;
    }

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

      // Bow poses per frame: 0 idle, 1 half draw, 2 full draw, 3 release, 4 victory
      if (f === 0) {
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
      } else {
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

  /* ── Risk antagonists ───────────────────────────────────────────────────
     One 3-frame sheet per risk kind, rasterised at ART_RADIUS and scaled down
     for M/S targets. Four genuinely different silhouettes — hexagonal cell,
     hazard shard, shackled weight, split briefcase — so a glance identifies
     the risk before the colour does.                                       */

  private createRiskTextures() {
    const r = CFG.ART_RADIUS;
    const frameSize = Math.ceil(r * 3.2);
    const numFrames = 3;

    (Object.keys(RISKS) as RiskKind[]).forEach((kind) => {
      const def = RISKS[kind];
      const key = `risk_${kind}`;
      const texture = this.textures.createCanvas(
        `${key}_canvas`,
        frameSize * numFrames * DPR,
        frameSize * DPR
      );
      if (!texture) return;
      const ctx = texture.context;
      ctx.scale(DPR, DPR);

      for (let f = 0; f < numFrames; f++) {
        const ox = f * frameSize + frameSize / 2;
        const oy = frameSize / 2;
        const t = f / numFrames;

        ctx.save();
        ctx.translate(ox, oy);
        switch (def.shape) {
          case 'hexCell':
            this.drawHexCell(ctx, r, t, def);
            break;
          case 'hazardShard':
            this.drawHazardShard(ctx, r, t, def);
            break;
          case 'chainWeight':
            this.drawChainWeight(ctx, r, t, def);
            break;
          case 'brokenCase':
            this.drawBrokenCase(ctx, r, t, def);
            break;
        }
        this.drawCore(ctx, r, t, def);
        ctx.restore();
      }

      texture.refresh();
      this.textures.addSpriteSheet(key, texture.canvas as unknown as HTMLImageElement, {
        frameWidth: frameSize * DPR,
        frameHeight: frameSize * DPR,
      });
    });
  }

  /** Shared critical-hit core: bright nucleus + dashed aiming ring. */
  private drawCore(ctx: CanvasRenderingContext2D, r: number, t: number, def: RiskDef) {
    const coreR = r * CFG.CORE_RATIO * (1 + 0.1 * Math.sin(t * Math.PI * 2));
    const c = this.hexColor(def.core);

    const grad = ctx.createRadialGradient(0, 0, coreR * 0.1, 0, 0, coreR * 1.7);
    grad.addColorStop(0, 'rgba(255,255,255,0.98)');
    grad.addColorStop(0.35, `${c}dd`);
    grad.addColorStop(1, `${c}00`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** ILLNESS — crimson hexagonal cell, cilia stubs, fever ECG trace, throbbing membrane. */
  private drawHexCell(ctx: CanvasRenderingContext2D, r: number, t: number, def: RiskDef) {
    const throb = 1 + 0.07 * Math.sin(t * Math.PI * 2);
    const body = r * 0.94 * throb;

    // Cilia stubs on each vertex
    ctx.strokeStyle = this.hexColor(def.edge);
    ctx.lineWidth = r * 0.13;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 6 + t * 0.25;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * body * 0.92, Math.sin(a) * body * 0.92);
      ctx.lineTo(Math.cos(a) * body * 1.3, Math.sin(a) * body * 1.3);
      ctx.stroke();
    }

    // Membrane
    const grad = ctx.createLinearGradient(0, -body, 0, body);
    grad.addColorStop(0, '#fb7185');
    grad.addColorStop(0.55, this.hexColor(def.body));
    grad.addColorStop(1, this.hexColor(def.edge));
    ctx.fillStyle = grad;
    this.polygon(ctx, 0, 0, body, 6, -Math.PI / 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = r * 0.07;
    this.polygon(ctx, 0, 0, body * 0.99, 6, -Math.PI / 2);
    ctx.stroke();

    // Fever ECG trace across the cell
    ctx.strokeStyle = 'rgba(255,226,232,0.9)';
    ctx.lineWidth = r * 0.075;
    ctx.lineJoin = 'round';
    const w = body * 0.72;
    const amp = body * (0.3 + 0.08 * Math.sin(t * Math.PI * 2));
    ctx.beginPath();
    ctx.moveTo(-w, body * 0.52);
    ctx.lineTo(-w * 0.45, body * 0.52);
    ctx.lineTo(-w * 0.25, body * 0.52 - amp);
    ctx.lineTo(-w * 0.05, body * 0.52 + amp * 0.5);
    ctx.lineTo(w * 0.2, body * 0.52);
    ctx.lineTo(w, body * 0.52);
    ctx.stroke();
  }

  /** ACCIDENT — amber hazard shard: rounded triangle, corner spikes, forking crack. */
  private drawHazardShard(ctx: CanvasRenderingContext2D, r: number, t: number, def: RiskDef) {
    const spin = t * 0.35;
    ctx.save();
    ctx.rotate(spin);

    // Corner impact spikes
    ctx.fillStyle = this.hexColor(def.edge);
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.22) * r * 0.9, Math.sin(a - 0.22) * r * 0.9);
      ctx.lineTo(Math.cos(a) * r * 1.42, Math.sin(a) * r * 1.42);
      ctx.lineTo(Math.cos(a + 0.22) * r * 0.9, Math.sin(a + 0.22) * r * 0.9);
      ctx.closePath();
      ctx.fill();
    }

    // Triangle body
    const grad = ctx.createLinearGradient(0, -r, 0, r);
    grad.addColorStop(0, '#fcd34d');
    grad.addColorStop(0.6, this.hexColor(def.body));
    grad.addColorStop(1, this.hexColor(def.edge));
    ctx.fillStyle = grad;
    ctx.lineJoin = 'round';
    ctx.lineWidth = r * 0.28;
    ctx.strokeStyle = grad;
    this.polygon(ctx, 0, r * 0.12, r * 0.86, 3, -Math.PI / 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = r * 0.07;
    this.polygon(ctx, 0, r * 0.12, r * 0.86, 3, -Math.PI / 2);
    ctx.stroke();

    // Forking crack
    ctx.strokeStyle = 'rgba(60,26,4,0.85)';
    ctx.lineWidth = r * 0.09;
    ctx.lineCap = 'round';
    const jag = 1 + t * 0.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.55);
    ctx.lineTo(r * 0.14 * jag, -r * 0.16);
    ctx.lineTo(-r * 0.12 * jag, r * 0.1);
    ctx.lineTo(r * 0.2, r * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.12 * jag, r * 0.1);
    ctx.lineTo(-r * 0.46, r * 0.42);
    ctx.stroke();
    ctx.restore();
  }

  /** DEBT — violet shackled weight: heavy ingot, chain ring above, two steel bands. */
  private drawChainWeight(ctx: CanvasRenderingContext2D, r: number, t: number, def: RiskDef) {
    const w = r * 1.62;
    const h = r * 1.34;
    const sag = Math.sin(t * Math.PI * 2) * r * 0.06;

    // Chain links above the block
    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = r * 0.11;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.72 - i * r * 0.3 + sag, r * 0.15, r * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ingot body
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, '#a78bfa');
    grad.addColorStop(0.55, this.hexColor(def.body));
    grad.addColorStop(1, this.hexColor(def.edge));
    ctx.fillStyle = grad;
    this.roundRect(ctx, -w / 2, -h / 2 + sag, w, h, r * 0.22);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = r * 0.07;
    this.roundRect(ctx, -w / 2, -h / 2 + sag, w, h, r * 0.22);
    ctx.stroke();

    // Steel restraint bands
    ctx.fillStyle = 'rgba(15,10,45,0.55)';
    ctx.fillRect(-w / 2, -h * 0.18 + sag, w, r * 0.16);
    ctx.fillRect(-w / 2, h * 0.16 + sag, w, r * 0.16);

    // Downward debt arrows on the flanks
    ctx.strokeStyle = 'rgba(214,194,255,0.9)';
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = 'round';
    [-w * 0.34, w * 0.34].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(dx, -h * 0.3 + sag);
      ctx.lineTo(dx, h * 0.3 + sag);
      ctx.moveTo(dx - r * 0.12, h * 0.16 + sag);
      ctx.lineTo(dx, h * 0.3 + sag);
      ctx.lineTo(dx + r * 0.12, h * 0.16 + sag);
      ctx.stroke();
    });
  }

  /** JOB LOSS — steel briefcase split by a widening fault line, handle snapped. */
  private drawBrokenCase(ctx: CanvasRenderingContext2D, r: number, t: number, def: RiskDef) {
    const w = r * 1.72;
    const h = r * 1.18;
    const gap = r * (0.1 + 0.09 * t);

    // Handle (broken in the middle)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -h * 0.5, r * 0.36, Math.PI * 1.12, Math.PI * 1.42);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -h * 0.5, r * 0.36, Math.PI * 1.62, Math.PI * 1.9);
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, '#94a3b8');
    grad.addColorStop(0.55, this.hexColor(def.body));
    grad.addColorStop(1, this.hexColor(def.edge));

    // Left and right halves, drifting apart
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate((side * gap) / 2, 0);
      ctx.rotate(side * 0.05 * t);
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (side < 0) {
        ctx.moveTo(-w / 2, -h / 2);
        ctx.lineTo(0, -h / 2);
        ctx.lineTo(-r * 0.12, -h * 0.14);
        ctx.lineTo(r * 0.06, h * 0.16);
        ctx.lineTo(-r * 0.05, h / 2);
        ctx.lineTo(-w / 2, h / 2);
      } else {
        ctx.moveTo(w / 2, -h / 2);
        ctx.lineTo(0, -h / 2);
        ctx.lineTo(-r * 0.12, -h * 0.14);
        ctx.lineTo(r * 0.06, h * 0.16);
        ctx.lineTo(-r * 0.05, h / 2);
        ctx.lineTo(w / 2, h / 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = r * 0.06;
      ctx.stroke();

      // Latch stud
      ctx.fillStyle = '#cbd5f5';
      ctx.fillRect(side * w * 0.28 - r * 0.09, -h * 0.06, r * 0.18, r * 0.2);
      ctx.restore();
    });

    // Falling-income arrow scored into the case
    ctx.strokeStyle = 'rgba(203,213,245,0.85)';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.22);
    ctx.lineTo(-w * 0.06, h * 0.06);
    ctx.moveTo(w * 0.08, -h * 0.02);
    ctx.lineTo(w * 0.34, h * 0.3);
    ctx.stroke();
  }

  /* ── Arrow & particles ──────────────────────────────────────── */

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

  private createParticleTextures() {
    // Soft round spark
    const spark = this.textures.createCanvas('sparkle', 16 * DPR, 16 * DPR);
    if (spark) {
      const ctx = spark.context;
      ctx.scale(DPR, DPR);
      const grad = ctx.createRadialGradient(8, 8, 1, 8, 8, 7);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fill();
      spark.refresh();
    }

    // Hard-edged debris shard for shatter bursts
    const shard = this.textures.createCanvas('shard', 12 * DPR, 12 * DPR);
    if (shard) {
      const ctx = shard.context;
      ctx.scale(DPR, DPR);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(11, 5);
      ctx.lineTo(7, 12);
      ctx.lineTo(1, 7);
      ctx.closePath();
      ctx.fill();
      shard.refresh();
    }
  }
}
