import Phaser from 'phaser';

/**
 * Tightrope Protection — procedural art pass.
 *
 * Palette / shape language (unique to this game in the repo):
 *   brand blue  #003DA6   structural, trousers + shield crest
 *   orange      #F26522   the balance pole — the game's signature accent
 *   green       #28A745   gain / reward feedback
 *   crimson     #D92D4E   risk gusts
 * Motif: long horizontals (rope, pole), a tall thin figure, height + tension.
 */

const TAU = Math.PI * 2;

const SUIT_LIGHT = '#EDF3FF';
const SUIT_SHADE = '#A9C2E8';
const TROUSER = '#0A2C6B';
const TROUSER_HI = '#1E56B4';
const SKIN = '#F3D2AE';
const SHOE = '#FFC845';
const POLE = '#F26522';
const POLE_HI = '#FFB988';
const POLE_LO = '#8E3208';
const BRAND_BLUE = '#003DA6';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.createWalkerRunTexture();
    this.createWalkerHopTexture();
    this.createGustTexture();
    this.createCoinTexture();
    this.createShieldTexture();
    this.createParticleTexture();
    this.createGlowTexture();
  }

  create() {
    this.scene.start('MainScene');
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private ctxOf(key: string, w: number, h: number) {
    const tex = this.textures.createCanvas(key, w, h)!;
    return { tex, ctx: tex.context };
  }

  /**
   * A tightrope walker seen from the side, feet planted at `feetY`.
   * `stride` in -1..1 drives the leg swing; `hop` swaps to a tucked jump pose.
   */
  private drawWalker(
    ctx: CanvasRenderingContext2D,
    ox: number,
    feetY: number,
    stride: number,
    hop: boolean,
  ) {
    const hipY = feetY - 21;
    const shoulderY = feetY - 35;
    const headY = feetY - 43;
    const bob = hop ? -3 : Math.abs(stride) * -1.5;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ── 1. Balance pole (drawn behind the body so the arms read on top)
    const tilt = hop ? -0.18 : stride * 0.11;
    ctx.save();
    ctx.translate(ox, shoulderY + 2 + bob);
    ctx.rotate(tilt);
    ctx.strokeStyle = POLE_LO;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-27, 1.8);
    ctx.lineTo(27, 1.8);
    ctx.stroke();
    ctx.strokeStyle = POLE;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(-27, 0);
    ctx.lineTo(27, 0);
    ctx.stroke();
    ctx.strokeStyle = POLE_HI;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-23, -1.5);
    ctx.lineTo(23, -1.5);
    ctx.stroke();
    // counterweights
    ctx.fillStyle = POLE;
    ctx.beginPath();
    ctx.arc(-27, 0, 3.4, 0, TAU);
    ctx.arc(27, 0, 3.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = POLE_HI;
    ctx.beginPath();
    ctx.arc(-27.8, -1, 1.4, 0, TAU);
    ctx.arc(26.2, -1, 1.4, 0, TAU);
    ctx.fill();
    ctx.restore();

    // ── 2. Legs
    ctx.strokeStyle = TROUSER;
    ctx.lineWidth = 5.4;
    if (hop) {
      // both knees tucked forward
      ctx.beginPath();
      ctx.moveTo(ox - 1, hipY + bob);
      ctx.lineTo(ox + 7, hipY + 9 + bob);
      ctx.lineTo(ox - 1, hipY + 14 + bob);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox + 1, hipY + bob);
      ctx.lineTo(ox + 10, hipY + 5 + bob);
      ctx.lineTo(ox + 4, hipY + 12 + bob);
      ctx.stroke();
    } else {
      const swing = stride * 7.5;
      // rear leg (darker for depth)
      ctx.strokeStyle = '#06204F';
      ctx.beginPath();
      ctx.moveTo(ox, hipY + bob);
      ctx.lineTo(ox - swing, feetY);
      ctx.stroke();
      // front leg
      ctx.strokeStyle = TROUSER;
      ctx.beginPath();
      ctx.moveTo(ox, hipY + bob);
      ctx.lineTo(ox + swing, feetY);
      ctx.stroke();
      // leg rim light
      ctx.strokeStyle = TROUSER_HI;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ox + 1.6, hipY + 1 + bob);
      ctx.lineTo(ox + swing + 1.6, feetY - 2);
      ctx.stroke();
    }

    // ── 3. Shoes
    ctx.fillStyle = SHOE;
    if (hop) {
      ctx.beginPath();
      ctx.ellipse(ox - 1, hipY + 14 + bob, 3.6, 2.4, 0, 0, TAU);
      ctx.ellipse(ox + 4, hipY + 12 + bob, 3.6, 2.4, 0, 0, TAU);
      ctx.fill();
    } else {
      const swing = stride * 7.5;
      ctx.beginPath();
      ctx.ellipse(ox - swing, feetY, 4, 2.4, 0, 0, TAU);
      ctx.ellipse(ox + swing, feetY, 4, 2.4, 0, 0, TAU);
      ctx.fill();
    }

    // ── 4. Torso (light value against the dark sky = strong figure/ground)
    const grad = ctx.createLinearGradient(ox - 7, shoulderY, ox + 8, hipY);
    grad.addColorStop(0, SUIT_LIGHT);
    grad.addColorStop(1, SUIT_SHADE);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ox - 6, shoulderY + bob);
    ctx.quadraticCurveTo(ox - 7.5, hipY - 6 + bob, ox - 5, hipY + 1 + bob);
    ctx.lineTo(ox + 5, hipY + 1 + bob);
    ctx.quadraticCurveTo(ox + 7.5, hipY - 6 + bob, ox + 6, shoulderY + bob);
    ctx.closePath();
    ctx.fill();

    // sash in brand blue across the chest
    ctx.strokeStyle = BRAND_BLUE;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(ox - 5.5, shoulderY + 3 + bob);
    ctx.lineTo(ox + 5.5, shoulderY + 10 + bob);
    ctx.stroke();

    // rim light on the leading (right) edge
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(ox + 5.6, shoulderY + 1 + bob);
    ctx.quadraticCurveTo(ox + 7, hipY - 6 + bob, ox + 5, hipY + bob);
    ctx.stroke();

    // ── 5. Arms reaching to the pole ends
    ctx.strokeStyle = SUIT_LIGHT;
    ctx.lineWidth = 3.4;
    const poleY = shoulderY + 2 + bob;
    ctx.beginPath();
    ctx.moveTo(ox - 4, shoulderY + 3 + bob);
    ctx.lineTo(ox - 15, poleY - Math.sin(tilt) * 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + 4, shoulderY + 3 + bob);
    ctx.lineTo(ox + 15, poleY + Math.sin(tilt) * 15);
    ctx.stroke();

    // ── 6. Head + helmet
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(ox + 1, headY + bob, 5.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = BRAND_BLUE;
    ctx.beginPath();
    ctx.arc(ox + 1, headY - 0.5 + bob, 5.8, Math.PI * 1.02, TAU * 1.02);
    ctx.fill();
    ctx.fillStyle = POLE;
    ctx.fillRect(ox + 4.5, headY - 1.6 + bob, 4, 1.8);
    // face highlight
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(ox + 3.4, headY + 1 + bob, 1.1, 0, TAU);
    ctx.fill();
  }

  private createWalkerRunTexture() {
    const size = 64;
    const frames = 4;
    const { tex, ctx } = this.ctxOf('walker_run_canvas', size * frames, size);
    for (let f = 0; f < frames; f++) {
      const ox = f * size + size / 2;
      // -1 .. 1 .. -1 stride cycle
      this.drawWalker(ctx, ox, 52, Math.sin((f / frames) * TAU), false);
    }
    tex.refresh();
    this.textures.addSpriteSheet(
      'walker_run',
      tex.canvas as unknown as HTMLImageElement,
      { frameWidth: size, frameHeight: size },
    );
  }

  private createWalkerHopTexture() {
    const size = 64;
    const { tex, ctx } = this.ctxOf('walker_hop', size, size);
    this.drawWalker(ctx, size / 2, 52, 0, true);
    tex.refresh();
  }

  /**
   * Risk gust — a crimson wind curl with trailing streaks and a warning core.
   * Reads as "an unplanned event blowing across the rope", not a creature.
   */
  private createGustTexture() {
    const size = 64;
    const frames = 3;
    const { tex, ctx } = this.ctxOf('gust_canvas', size * frames, size);

    for (let f = 0; f < frames; f++) {
      const ox = f * size + size / 2;
      const oy = size / 2;
      const spin = (f / frames) * TAU;

      ctx.lineCap = 'round';

      // 1. Trailing wind streaks (behind, pointing back down-track)
      ctx.strokeStyle = 'rgba(217, 45, 78, 0.42)';
      for (let i = 0; i < 3; i++) {
        const y = oy - 8 + i * 8 + Math.sin(spin + i) * 1.6;
        ctx.lineWidth = 2.6 - i * 0.4;
        ctx.beginPath();
        ctx.moveTo(ox + 6, y);
        ctx.quadraticCurveTo(ox + 18, y - 3, ox + 28, y);
        ctx.stroke();
      }

      // 2. Outer curl
      ctx.strokeStyle = '#FF5C78';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(ox, oy, 15, spin + 0.5, spin + TAU * 0.82);
      ctx.stroke();

      // 3. Inner curl (counter direction, gives the vortex read)
      ctx.strokeStyle = '#D92D4E';
      ctx.lineWidth = 4.4;
      ctx.beginPath();
      ctx.arc(ox, oy, 9.5, -spin + 3.4, -spin + TAU * 0.9);
      ctx.stroke();

      // 4. Dark core with a bright rim so it survives on a dark background
      const core = ctx.createRadialGradient(ox - 2, oy - 3, 1, ox, oy, 8);
      core.addColorStop(0, '#FF9AAC');
      core.addColorStop(0.55, '#D92D4E');
      core.addColorStop(1, '#5B0E1E');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(ox, oy, 7.2, 0, TAU);
      ctx.fill();

      // 5. Warning chevron inside the core (icon, not text)
      ctx.strokeStyle = '#FFE3E9';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(ox - 3.2, oy - 3.4);
      ctx.lineTo(ox + 0.6, oy);
      ctx.lineTo(ox - 3.2, oy + 3.4);
      ctx.stroke();

      // 6. Leading edge highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(ox, oy, 15, Math.PI * 0.85, Math.PI * 1.25);
      ctx.stroke();
    }

    tex.refresh();
    this.textures.addSpriteSheet(
      'gust',
      tex.canvas as unknown as HTMLImageElement,
      { frameWidth: size, frameHeight: size },
    );
  }

  /** Gold savings coin, beveled with a rupee mark. */
  private createCoinTexture() {
    const size = 48;
    const { tex, ctx } = this.ctxOf('coin', size, size);
    const cx = size / 2;
    const cy = size / 2;

    // soft glow halo
    const halo = ctx.createRadialGradient(cx, cy, 12, cx, cy, 23);
    halo.addColorStop(0, 'rgba(255, 200, 69, 0.35)');
    halo.addColorStop(1, 'rgba(255, 200, 69, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 23, 0, TAU);
    ctx.fill();

    // rim
    const rim = ctx.createLinearGradient(cx, cy - 19, cx, cy + 19);
    rim.addColorStop(0, '#FFE9A8');
    rim.addColorStop(0.5, '#E8A317');
    rim.addColorStop(1, '#A96A05');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(cx, cy, 18.5, 0, TAU);
    ctx.fill();

    // face
    const face = ctx.createLinearGradient(cx - 10, cy - 12, cx + 10, cy + 12);
    face.addColorStop(0, '#FFF3C4');
    face.addColorStop(0.55, '#FFC845');
    face.addColorStop(1, '#E39408');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(cx, cy, 14.5, 0, TAU);
    ctx.fill();

    // engraved rupee
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(120, 53, 15, 0.85)';
    ctx.fillText('₹', cx + 0.6, cy + 0.8);
    ctx.fillStyle = '#8A5A05';
    ctx.fillText('₹', cx, cy);

    // specular
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.ellipse(cx - 6, cy - 9, 4.6, 2.4, -0.5, 0, TAU);
    ctx.fill();

    tex.refresh();
  }

  /** Protection crest — brand blue with a white tick. */
  private createShieldTexture() {
    const size = 48;
    const { tex, ctx } = this.ctxOf('shield_item', size, size);
    const cx = size / 2;
    const cy = size / 2;

    const crest = (s: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 20 * s);
      ctx.lineTo(cx + 16 * s, cy - 13 * s);
      ctx.lineTo(cx + 17 * s, cy + 3 * s);
      ctx.lineTo(cx, cy + 20 * s);
      ctx.lineTo(cx - 17 * s, cy + 3 * s);
      ctx.lineTo(cx - 16 * s, cy - 13 * s);
      ctx.closePath();
    };

    const halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, 24);
    halo.addColorStop(0, 'rgba(46, 155, 255, 0.35)');
    halo.addColorStop(1, 'rgba(46, 155, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    crest(1.0);
    ctx.fill();

    const body = ctx.createLinearGradient(cx, cy - 16, cx, cy + 18);
    body.addColorStop(0, '#4FB4FF');
    body.addColorStop(0.55, '#1E6BE0');
    body.addColorStop(1, BRAND_BLUE);
    ctx.fillStyle = body;
    crest(0.86);
    ctx.fill();

    // inner rim light
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    crest(0.7);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 0.5);
    ctx.lineTo(cx - 2, cy + 4.5);
    ctx.lineTo(cx + 7, cy - 5.5);
    ctx.stroke();

    tex.refresh();
  }

  /** Soft spark used by every particle burst. */
  private createParticleTexture() {
    const { tex, ctx } = this.ctxOf('sparkle', 16, 16);
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, TAU);
    ctx.fill();
    tex.refresh();
  }

  /** Wide soft glow used for the horizon bloom and the walker's ground light. */
  private createGlowTexture() {
    const { tex, ctx } = this.ctxOf('glow', 128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    tex.refresh();
  }
}
