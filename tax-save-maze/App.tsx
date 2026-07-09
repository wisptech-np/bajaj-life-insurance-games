import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { submitToLMS, extractLeadNo, LEAD_NO_KEY } from './services/api';
import { incrementPlayCount } from './services/playCount';

// Premium Sound effects engine using Web Audio API
class SoundEffects {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playCollect() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    
    // Sparkly ascending chime arpeggio
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.18); // C6
    osc.frequency.setValueAtTime(1318.51, now + 0.24); // E6
    
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playHit() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Programmatic white-noise synth explosion for satisfying hit feedback
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(10, now + 0.3);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(now);
    noise.stop(now + 0.35);
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Triumphant level-up fanfare chord progression
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.3);
    });
  }

  playStun() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    
    // Sci-fi zap stun sound
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playClick() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

const sfx = new SoundEffects();

enum Screen {
  INTRO = 'INTRO',
  GAME = 'GAME',
  LEAD_CAPTURE = 'LEAD_CAPTURE',
  RESULTS = 'RESULTS',
  THANK_YOU = 'THANK_YOU',
}

interface TaxKey {
  x: number;
  y: number;
  type: '80C' | '80D' | 'Pension';
  name: string;
  color: string;
  collected: boolean;
}

interface ShortcutDoor {
  x: number;
  y: number;
  type: '80C' | '80D' | 'Pension';
  color: string;
}

interface TaxCollector {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  progress: number;
  type: 'GST' | 'Income Tax' | 'Fine';
  name: string;
  color: string;
  speed: number;
  stunTime: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

// ─── Premium Canvas Drawing Functions ───────────────────────────────

/** Draw player as a small person with briefcase using canvas paths */
function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, frameCount: number, shielded: boolean) {
  ctx.save();
  const s = size * 0.35;
  
  // Body glow
  ctx.shadowBlur = 12;
  ctx.shadowColor = shielded ? '#31cdec' : '#0ea5e9';

  // Head
  const headGrad = ctx.createRadialGradient(x, y - s * 0.75, 0, x, y - s * 0.75, s * 0.45);
  headGrad.addColorStop(0, '#fde68a');
  headGrad.addColorStop(0.6, '#f59e0b');
  headGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.75, s * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Hair / cap
  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath();
  ctx.ellipse(x, y - s * 1.05, s * 0.42, s * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Torso
  const torsoGrad = ctx.createLinearGradient(x, y - s * 0.4, x, y + s * 0.5);
  torsoGrad.addColorStop(0, '#0ea5e9');
  torsoGrad.addColorStop(1, '#0369a1');
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.35, y - s * 0.35);
  ctx.lineTo(x + s * 0.35, y - s * 0.35);
  ctx.lineTo(x + s * 0.3, y + s * 0.45);
  ctx.lineTo(x - s * 0.3, y + s * 0.45);
  ctx.closePath();
  ctx.fill();

  // Tie
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.35);
  ctx.lineTo(x + s * 0.06, y - s * 0.1);
  ctx.lineTo(x, y + s * 0.1);
  ctx.lineTo(x - s * 0.06, y - s * 0.1);
  ctx.closePath();
  ctx.fill();

  // Legs
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x - s * 0.22, y + s * 0.45, s * 0.16, s * 0.35);
  ctx.fillRect(x + s * 0.06, y + s * 0.45, s * 0.16, s * 0.35);

  // Briefcase
  const bcX = x + s * 0.4;
  const bcY = y + s * 0.1;
  const bob = Math.sin(frameCount * 0.15) * 1.5;
  const bcGrad = ctx.createLinearGradient(bcX - s * 0.18, bcY + bob, bcX + s * 0.18, bcY + bob + s * 0.22);
  bcGrad.addColorStop(0, '#92400e');
  bcGrad.addColorStop(0.5, '#78350f');
  bcGrad.addColorStop(1, '#451a03');
  ctx.fillStyle = bcGrad;
  ctx.beginPath();
  ctx.roundRect(bcX - s * 0.18, bcY + bob, s * 0.36, s * 0.26, 2);
  ctx.fill();
  // Briefcase handle
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(bcX, bcY + bob - 2, s * 0.08, Math.PI, 0);
  ctx.stroke();
  // Briefcase clasp
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(bcX - 2, bcY + bob + s * 0.1, 4, 3);

  ctx.restore();
}

/** Draw tax collector as a menacing figure with gradient fills */
function drawCollector(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, type: string, frameCount: number, stunned: boolean) {
  ctx.save();
  const s = size * 0.38;

  // Menacing glow aura
  ctx.shadowBlur = stunned ? 4 : 16;
  ctx.shadowColor = color;

  // Body — ghost/reaper shape
  const bodyGrad = ctx.createRadialGradient(x, y, s * 0.15, x, y, s);
  bodyGrad.addColorStop(0, color);
  bodyGrad.addColorStop(0.7, color + 'cc');
  bodyGrad.addColorStop(1, color + '33');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.2, s * 0.75, Math.PI, 0); // top dome
  // Wavy bottom
  const waveOffset = frameCount * 0.12;
  ctx.lineTo(x + s * 0.75, y + s * 0.5);
  for (let i = 3; i >= 0; i--) {
    const wx = x - s * 0.75 + (i / 3) * s * 1.5;
    const wy = y + s * 0.5 + Math.sin(waveOffset + i * 1.2) * s * 0.18;
    ctx.lineTo(wx, wy);
  }
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;

  // Eyes — menacing white with red pupils
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - s * 0.25, y - s * 0.25, s * 0.2, s * 0.24, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.25, y - s * 0.25, s * 0.2, s * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // Angry pupils that track slightly
  const pupilShift = Math.sin(frameCount * 0.08) * 2;
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(x - s * 0.25 + pupilShift, y - s * 0.23, s * 0.1, 0, Math.PI * 2);
  ctx.arc(x + s * 0.25 + pupilShift, y - s * 0.23, s * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Angry red inner pupil
  ctx.fillStyle = '#ff2222';
  ctx.beginPath();
  ctx.arc(x - s * 0.25 + pupilShift, y - s * 0.23, s * 0.04, 0, Math.PI * 2);
  ctx.arc(x + s * 0.25 + pupilShift, y - s * 0.23, s * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Angry eyebrows — slanted
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 0.55);
  ctx.lineTo(x - s * 0.1, y - s * 0.38);
  ctx.moveTo(x + s * 0.5, y - s * 0.55);
  ctx.lineTo(x + s * 0.1, y - s * 0.38);
  ctx.stroke();

  // Jagged mouth
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#330000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y + s * 0.08);
  for (let i = 0; i < 5; i++) {
    const tx = x - s * 0.3 + (i + 0.5) * (s * 0.6 / 5);
    const ty = y + s * 0.08 + (i % 2 === 0 ? s * 0.12 : 0);
    ctx.lineTo(tx, ty);
  }
  ctx.lineTo(x + s * 0.3, y + s * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/** Draw a golden key with radial glow */
function drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, keyType: string, frameCount: number) {
  ctx.save();
  const s = size * 0.35;
  const pulse = 1 + Math.sin(frameCount * 0.12) * 0.12;

  // Outer glow halo
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;

  // Radial glow behind key
  const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, s * 1.8 * pulse);
  glowGrad.addColorStop(0, color + '55');
  glowGrad.addColorStop(0.5, color + '22');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, y, s * 1.8 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Key ring (top circle)
  const keyGrad = ctx.createLinearGradient(x - s * 0.4, y - s * 0.6, x + s * 0.4, y);
  keyGrad.addColorStop(0, '#fef08a');
  keyGrad.addColorStop(0.3, color);
  keyGrad.addColorStop(0.7, '#fbbf24');
  keyGrad.addColorStop(1, '#92400e');
  ctx.strokeStyle = keyGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.3, s * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  // Key shaft
  ctx.fillStyle = keyGrad;
  ctx.fillRect(x - 1.5, y, 3, s * 0.65);

  // Key teeth
  ctx.fillRect(x, y + s * 0.35, s * 0.2, 2.5);
  ctx.fillRect(x, y + s * 0.55, s * 0.15, 2.5);

  ctx.shadowBlur = 0;

  // Label
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(7, s * 0.45)}px 'Plus Jakarta Sans', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(keyType, x, y - s * 0.3);

  // Sparkle particles around key
  for (let i = 0; i < 3; i++) {
    const angle = (frameCount * 0.04 + i * Math.PI * 2 / 3) % (Math.PI * 2);
    const dist = s * 1.2 + Math.sin(frameCount * 0.1 + i) * s * 0.3;
    const sx = x + Math.cos(angle) * dist;
    const sy = y + Math.sin(angle) * dist;
    const sparkleSize = 1.5 + Math.sin(frameCount * 0.2 + i * 2) * 1;
    ctx.fillStyle = '#fef08a';
    ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.15 + i) * 0.4;
    ctx.beginPath();
    // 4-point star
    ctx.moveTo(sx, sy - sparkleSize);
    ctx.lineTo(sx + sparkleSize * 0.3, sy);
    ctx.lineTo(sx, sy + sparkleSize);
    ctx.lineTo(sx - sparkleSize * 0.3, sy);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/** Draw goal as pulsing green glow beacon */
function drawGoalBeacon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, frameCount: number) {
  ctx.save();
  const pulse = Math.sin(frameCount * 0.06) * 0.3 + 1;
  const pulse2 = Math.sin(frameCount * 0.04 + 1) * 0.2 + 1;

  // Outer beacon rings
  for (let i = 3; i >= 0; i--) {
    const r = size * (0.3 + i * 0.18) * pulse2;
    const alpha = 0.08 - i * 0.015;
    ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pulsing green beacon
  ctx.shadowBlur = 25;
  ctx.shadowColor = '#22c55e';
  const beaconGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.4 * pulse);
  beaconGrad.addColorStop(0, '#bbf7d0');
  beaconGrad.addColorStop(0.3, '#22c55e');
  beaconGrad.addColorStop(0.7, '#16a34a');
  beaconGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = beaconGrad;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.35 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Rotating rays
  for (let i = 0; i < 6; i++) {
    const angle = (frameCount * 0.02 + i * Math.PI / 3) % (Math.PI * 2);
    ctx.strokeStyle = `rgba(34, 197, 94, ${0.15 + Math.sin(frameCount * 0.08 + i) * 0.1})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * size * 0.2, y + Math.sin(angle) * size * 0.2);
    ctx.lineTo(x + Math.cos(angle) * size * 0.7 * pulse, y + Math.sin(angle) * size * 0.7 * pulse);
    ctx.stroke();
  }

  // Center icon — checkmark / exempt symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.28}px 'Plus Jakarta Sans', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', x, y + 1);

  // "EXEMPT" label
  ctx.fillStyle = '#bbf7d0';
  ctx.font = `bold ${Math.max(5, size * 0.14)}px 'Plus Jakarta Sans', sans-serif`;
  ctx.fillText('EXEMPT', x, y + size * 0.55);

  ctx.restore();
}

/** Draw locked door with programmatic lock icon */
function drawLockedDoor(ctx: CanvasRenderingContext2D, dx: number, dy: number, size: number, color: string) {
  ctx.save();
  const cx = dx + size / 2;
  const cy = dy + size / 2;

  // Fill
  ctx.fillStyle = color + '18';
  ctx.fillRect(dx + 2, dy + 2, size - 4, size - 4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(dx + 2, dy + 2, size - 4, size - 4);

  // Programmatic padlock
  const ls = size * 0.16;
  // Shackle
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy - ls * 0.5, ls * 0.7, Math.PI, 0);
  ctx.stroke();
  // Lock body
  const lockGrad = ctx.createLinearGradient(cx - ls, cy - ls * 0.2, cx + ls, cy + ls);
  lockGrad.addColorStop(0, color);
  lockGrad.addColorStop(1, color + '88');
  ctx.fillStyle = lockGrad;
  ctx.beginPath();
  ctx.roundRect(cx - ls, cy - ls * 0.2, ls * 2, ls * 1.5, 2);
  ctx.fill();
  // Keyhole
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy + ls * 0.2, ls * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - ls * 0.1, cy + ls * 0.3, ls * 0.2, ls * 0.4);

  ctx.restore();
}

/** Draw 3D extruded wall with gradient shading */
function drawWall3D(ctx: CanvasRenderingContext2D, wx: number, wy: number, size: number) {
  // Main face — darker bottom
  const wallGrad = ctx.createLinearGradient(wx, wy, wx, wy + size);
  wallGrad.addColorStop(0, '#1a2744');
  wallGrad.addColorStop(0.4, '#0f1b32');
  wallGrad.addColorStop(1, '#070e1e');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(wx, wy, size, size);

  // Top edge highlight
  ctx.fillStyle = 'rgba(100, 150, 220, 0.12)';
  ctx.fillRect(wx, wy, size, 2);

  // Left edge highlight
  ctx.fillStyle = 'rgba(100, 150, 220, 0.06)';
  ctx.fillRect(wx, wy, 2, size);

  // Bottom edge shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(wx, wy + size - 2, size, 2);

  // Right edge shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(wx + size - 2, wy, 2, size);

  // Inner bevel border
  ctx.strokeStyle = '#162040';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(wx + 0.5, wy + 0.5, size - 1, size - 1);
}

/** Draw ambient floor grid with player lighting */
function drawFloorGrid(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, cellSize: number, cols: number, rows: number, maze: number[][], playerX: number, playerY: number) {
  // Base floor
  ctx.fillStyle = '#060e1c';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Subtle grid lines on floor cells
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (maze[y][x] === 0) {
        const fx = x * cellSize;
        const fy = y * cellSize;
        ctx.strokeStyle = 'rgba(30, 58, 95, 0.25)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(fx + 0.5, fy + 0.5, cellSize - 1, cellSize - 1);

        // Small center dot
        ctx.fillStyle = 'rgba(30, 58, 95, 0.15)';
        ctx.beginPath();
        ctx.arc(fx + cellSize / 2, fy + cellSize / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Ambient lighting around player position
  const lightGrad = ctx.createRadialGradient(playerX, playerY, 0, playerX, playerY, cellSize * 4);
  lightGrad.addColorStop(0, 'rgba(14, 165, 233, 0.08)');
  lightGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.03)');
  lightGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lightGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

/** Apply fog-of-war effect — darken areas far from player */
function drawFogOfWar(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, playerX: number, playerY: number, cellSize: number) {
  const fogGrad = ctx.createRadialGradient(playerX, playerY, cellSize * 2.5, playerX, playerY, cellSize * 6.5);
  fogGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  fogGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
  fogGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

/** Draw red vignette warning at screen edges */
function drawRedVignette(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, intensity: number) {
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalAlpha = intensity;
  // Top
  let g = ctx.createLinearGradient(0, 0, 0, canvasH * 0.25);
  g.addColorStop(0, 'rgba(220, 38, 38, 0.6)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvasW, canvasH * 0.25);
  // Bottom
  g = ctx.createLinearGradient(0, canvasH, 0, canvasH * 0.75);
  g.addColorStop(0, 'rgba(220, 38, 38, 0.6)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, canvasH * 0.75, canvasW, canvasH * 0.25);
  // Left
  g = ctx.createLinearGradient(0, 0, canvasW * 0.2, 0);
  g.addColorStop(0, 'rgba(220, 38, 38, 0.5)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvasW * 0.2, canvasH);
  // Right
  g = ctx.createLinearGradient(canvasW, 0, canvasW * 0.8, 0);
  g.addColorStop(0, 'rgba(220, 38, 38, 0.5)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(canvasW * 0.8, 0, canvasW * 0.2, canvasH);
  ctx.restore();
}

/** Draw shield ring with energy effect */
function drawShieldRing(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, frameCount: number, shieldTime: number) {
  ctx.save();
  const radius = size * 0.55;
  const maxTime = 300;
  const ratio = shieldTime / maxTime;

  // Outer shield glow
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#31cdec';

  // Rotating dashed ring
  ctx.strokeStyle = `rgba(49, 205, 236, ${0.3 + ratio * 0.5})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(x, y, radius, frameCount * 0.06, frameCount * 0.06 + Math.PI * 2 * ratio);
  ctx.stroke();
  ctx.setLineDash([]);

  // Solid faint ring
  ctx.strokeStyle = 'rgba(49, 205, 236, 0.15)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Energy sparkles
  for (let i = 0; i < 4; i++) {
    const angle = frameCount * 0.08 + i * Math.PI / 2;
    const sx = x + Math.cos(angle) * radius;
    const sy = y + Math.sin(angle) * radius;
    ctx.fillStyle = '#7dd3fc';
    ctx.globalAlpha = 0.6 + Math.sin(frameCount * 0.2 + i) * 0.4;
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.shadowBlur = 0;
  ctx.restore();
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.INTRO);
  const [activeTab, setActiveTab] = useState<'play' | 'how-to-play'>('play');
  const [score, setScore] = useState<number>(1200);
  const [combo, setCombo] = useState<number>(1);
  const [comboTimerVal, setComboTimerVal] = useState<number>(0); // 0 to 1 progress
  const [won, setWon] = useState<boolean>(false);
  const [leadSubmitted, setLeadSubmitted] = useState<boolean>(false);
  const [leadNo, setLeadNo] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>(sessionStorage.getItem('lastSubmittedName') || '');
  const [mobile, setMobile] = useState<string>(sessionStorage.getItem('lastSubmittedPhone') || '');
  const [email, setEmail] = useState<string>('');
  const [terms, setTerms] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [termsOpen, setTermsOpen] = useState<boolean>(false);

  // Game references
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const playClick = () => sfx.playClick();

  const cols = 15;
  const rows = 15;
  const cellSize = 40;

  // Maze constants
  const [gameData, setGameData] = useState<{
    maze: number[][];
    keys: TaxKey[];
    doors: ShortcutDoor[];
    goal: { x: number; y: number };
  } | null>(null);

  const initGame = useCallback(() => {
    // Procedural backtracking maze algorithm
    const grid: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(1));

    function carve(cx: number, cy: number) {
      grid[cy][cx] = 0;
      const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
      dirs.sort(() => Math.random() - 0.5);

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1) {
          if (grid[ny][nx] === 1) {
            grid[cy + dy / 2][cx + dx / 2] = 0;
            carve(nx, ny);
          }
        }
      }
    }
    carve(1, 1);
    grid[13][13] = 0; // Exemption Goal cell

    // Select internal walls separating paths to place locked shortcut doors
    const candidateWalls: { x: number; y: number }[] = [];
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        if (grid[y][x] === 1) {
          const nsPath = grid[y - 1][x] === 0 && grid[y + 1][x] === 0;
          const ewPath = grid[y][x - 1] === 0 && grid[y][x + 1] === 0;
          if (nsPath || ewPath) candidateWalls.push({ x, y });
        }
      }
    }

    candidateWalls.sort(() => Math.random() - 0.5);
    const doors: ShortcutDoor[] = [];
    if (candidateWalls.length >= 3) {
      doors.push({ x: candidateWalls[0].x, y: candidateWalls[0].y, type: '80C', color: '#06b6d4' }); // Cyan
      doors.push({ x: candidateWalls[1].x, y: candidateWalls[1].y, type: '80D', color: '#22c55e' }); // Green
      doors.push({ x: candidateWalls[2].x, y: candidateWalls[2].y, type: 'Pension', color: '#f97316' }); // Orange
    }

    // Place Tax Saving Keys in separate quadrants
    const keys: TaxKey[] = [
      { x: 1, y: 13, type: '80C', name: 'Life Ins. 80C', color: '#06b6d4', collected: false },
      { x: 13, y: 1, type: '80D', name: 'Health Ins. 80D', color: '#22c55e', collected: false },
      { x: 7, y: 7, type: 'Pension', name: 'Pension Fund', color: '#f97316', collected: false }
    ];

    // Readjust coordinates to open paths if they land on walls
    const pathCells: { x: number; y: number }[] = [];
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        if (grid[y][x] === 0 && !(x === 1 && y === 1) && !(x === 13 && y === 13)) {
          pathCells.push({ x, y });
        }
      }
    }

    keys.forEach(k => {
      if (grid[k.y][k.x] !== 0) {
        const replacement = pathCells.find(p => !keys.some(o => o.x === p.x && o.y === p.y));
        if (replacement) {
          k.x = replacement.x;
          k.y = replacement.y;
        }
      }
    });

    setGameData({
      maze: grid,
      keys,
      doors,
      goal: { x: 13, y: 13 }
    });
    setScore(1200);
    setCombo(1);
    setComboTimerVal(0);
  }, []);

  const handleStartGame = () => {
    playClick();
    void incrementPlayCount();
    initGame();
    setScreen(Screen.GAME);
  };

  // Keyboard binding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Game Loop
  useEffect(() => {
    if (screen !== Screen.GAME || !canvasRef.current || !gameData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    // Player (Taxpayer) state
    let player = {
      x: 1,
      y: 1,
      canvasX: 1 * cellSize + cellSize / 2,
      canvasY: 1 * cellSize + cellSize / 2,
      targetX: 1,
      targetY: 1,
      progress: 0,
      speed: 0.08,
      shieldTime: 0,
      invulnerableTime: 0
    };

    // Stun, Shake & Flash timers for game Juice
    let shakeTime = 0;
    let flashTime = 0;
    let flashColor = '';

    // Combo system timers
    let comboMultiplier = 1;
    let comboTimer = 0; // in frames

    // Collectors states
    const collectors: TaxCollector[] = [
      {
        x: 13 * cellSize + cellSize/2, y: 1 * cellSize + cellSize/2,
        gridX: 13, gridY: 1, targetX: 13, targetY: 1, progress: 0,
        type: 'GST', name: 'GST Collector', color: '#ec4899', speed: 0.05, stunTime: 0
      },
      {
        x: 1 * cellSize + cellSize/2, y: 13 * cellSize + cellSize/2,
        gridX: 1, gridY: 13, targetX: 1, targetY: 13, progress: 0,
        type: 'Income Tax', name: 'Income Tax', color: '#ef4444', speed: 0.045, stunTime: 0
      },
      {
        x: 7 * cellSize + cellSize/2, y: 13 * cellSize + cellSize/2,
        gridX: 7, gridY: 13, targetX: 7, targetY: 13, progress: 0,
        type: 'Fine', name: 'Fine Collector', color: '#a855f7', speed: 0.06, stunTime: 0
      }
    ];

    const activeKeys = [...gameData.keys];
    const activeDoors = [...gameData.doors];

    let desiredDir: { x: number; y: number } | null = null;
    let currentDir: { x: number; y: number } | null = null;

    // Bind D-pad controls
    const handleDpad = (dx: number, dy: number) => {
      desiredDir = { x: dx, y: dy };
    };

    const upBtn = document.getElementById('dpad-up');
    const downBtn = document.getElementById('dpad-down');
    const leftBtn = document.getElementById('dpad-left');
    const rightBtn = document.getElementById('dpad-right');

    const pressUp = () => handleDpad(0, -1);
    const pressDown = () => handleDpad(0, 1);
    const pressLeft = () => handleDpad(-1, 0);
    const pressRight = () => handleDpad(1, 0);

    upBtn?.addEventListener('touchstart', pressUp);
    downBtn?.addEventListener('touchstart', pressDown);
    leftBtn?.addEventListener('touchstart', pressLeft);
    rightBtn?.addEventListener('touchstart', pressRight);
    upBtn?.addEventListener('mousedown', pressUp);
    downBtn?.addEventListener('mousedown', pressDown);
    leftBtn?.addEventListener('mousedown', pressLeft);
    rightBtn?.addEventListener('mousedown', pressRight);

    // Canvas Swipes
    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      
      if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
          desiredDir = { x: dx > 0 ? 1 : -1, y: 0 };
        } else {
          desiredDir = { x: dy > 0 ? 1 : -1, y: 0 };
        }
      }
      touchStart.current = null;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    let gameScore = 1200;
    let frameCount = 0;

    // Visual juice particles, floats & shockwaves
    let particles: Particle[] = [];
    let floatingTexts: FloatingText[] = [];
    let shockwaves: Shockwave[] = [];
    let redVignetteIntensity = 0;

    const spawnParticles = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 3 + 1.5;
        particles.push({
          x, y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          color,
          size: Math.random() * 3 + 2,
          alpha: 1,
          life: 25 + Math.random() * 15
        });
      }
    };

    const spawnShockwave = (x: number, y: number, color: string, maxRadius = 60) => {
      shockwaves.push({ x, y, radius: 5, maxRadius, alpha: 0.8, color });
    };

    const addFloatingText = (x: number, y: number, text: string, color: string) => {
      floatingTexts.push({ x, y, text, color, life: 45 });
    };

    const checkWalkable = (gx: number, gy: number) => {
      if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) return false;
      if (gameData.maze[gy][gx] === 1) return false;

      // Unlocked shortcut check
      const door = activeDoors.find(d => d.x === gx && d.y === gy);
      if (door) {
        const correspondingKey = activeKeys.find(k => k.type === door.type);
        if (!correspondingKey || !correspondingKey.collected) {
          return false;
        }
      }
      return true;
    };

    // Frame update tick
    const tick = () => {
      frameCount++;

      // Keyboard Inputs
      if (keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current['W']) desiredDir = { x: 0, y: -1 };
      else if (keysPressed.current['ArrowDown'] || keysPressed.current['s'] || keysPressed.current['S']) desiredDir = { x: 0, y: 1 };
      else if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A']) desiredDir = { x: -1, y: 0 };
      else if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D']) desiredDir = { x: 1, y: 0 };

      // Snapped movement calculation
      if (player.progress === 0) {
        if (desiredDir && checkWalkable(player.x + desiredDir.x, player.y + desiredDir.y)) {
          currentDir = desiredDir;
        }

        if (currentDir) {
          if (checkWalkable(player.x + currentDir.x, player.y + currentDir.y)) {
            player.targetX = player.x + currentDir.x;
            player.targetY = player.y + currentDir.y;
            player.progress = player.speed;
          } else {
            currentDir = null; // stop
          }
        }
      } else {
        player.progress += player.speed;
        if (player.progress >= 1) {
          player.x = player.targetX;
          player.y = player.targetY;
          player.progress = 0;
          
          if (desiredDir && checkWalkable(player.x + desiredDir.x, player.y + desiredDir.y)) {
            currentDir = desiredDir;
          }
        }
      }

      // Smooth coordinate calculation
      const baseCanvasX = player.x * cellSize + cellSize / 2;
      const baseCanvasY = player.y * cellSize + cellSize / 2;
      if (player.progress > 0 && currentDir) {
        const targetCanvasX = player.targetX * cellSize + cellSize / 2;
        const targetCanvasY = player.targetY * cellSize + cellSize / 2;
        player.canvasX = baseCanvasX + (targetCanvasX - baseCanvasX) * player.progress;
        player.canvasY = baseCanvasY + (targetCanvasY - baseCanvasY) * player.progress;
      } else {
        player.canvasX = baseCanvasX;
        player.canvasY = baseCanvasY;
      }

      // Collector Movement AI
      collectors.forEach(c => {
        if (c.stunTime > 0) {
          c.stunTime--;
          c.x = c.gridX * cellSize + cellSize / 2;
          c.y = c.gridY * cellSize + cellSize / 2;
          return;
        }

        if (c.progress === 0) {
          const walks: { x: number; y: number; dx: number; dy: number }[] = [];
          const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
          
          vectors.forEach(([dx, dy]) => {
            const nx = c.gridX + dx;
            const ny = c.gridY + dy;
            if (checkWalkable(nx, ny)) {
              walks.push({ x: nx, y: ny, dx, dy });
            }
          });

          if (walks.length > 0) {
            let selected = walks[0];
            // Income Tax hunts within range
            if (c.type === 'Income Tax' && Math.abs(player.x - c.gridX) + Math.abs(player.y - c.gridY) < 6) {
              let minDistance = 999;
              walks.forEach(w => {
                const distance = Math.abs(player.x - w.x) + Math.abs(player.y - w.y);
                if (distance < minDistance) {
                  minDistance = distance;
                  selected = w;
                }
              });
            } else {
              // Roaming algorithm excluding immediate reverse direction
              const forwards = walks.filter(w => {
                const reverses = (w.dx === -(c.targetX - c.gridX) && w.dy === -(c.targetY - c.gridY));
                return !reverses;
              });
              if (forwards.length > 0) {
                selected = forwards[Math.floor(Math.random() * forwards.length)];
              } else {
                selected = walks[Math.floor(Math.random() * walks.length)];
              }
            }

            c.targetX = selected.x;
            c.targetY = selected.y;
            c.progress = c.speed;
          }
        } else {
          c.progress += c.speed;
          if (c.progress >= 1) {
            c.gridX = c.targetX;
            c.gridY = c.targetY;
            c.progress = 0;
          }
        }

        // Interpolation coordinates
        const cXStart = c.gridX * cellSize + cellSize / 2;
        const cYStart = c.gridY * cellSize + cellSize / 2;
        const cXEnd = c.targetX * cellSize + cellSize / 2;
        const cYEnd = c.targetY * cellSize + cellSize / 2;
        c.x = cXStart + (cXEnd - cXStart) * c.progress;
        c.y = cYStart + (cYEnd - cYStart) * c.progress;
      });

      // Update Shield and Invulnerable timers
      if (player.shieldTime > 0) player.shieldTime--;
      if (player.invulnerableTime > 0) player.invulnerableTime--;

      // Combo decrease check
      if (comboTimer > 0) {
        comboTimer--;
        setComboTimerVal(comboTimer / 360);
        if (comboTimer === 0) {
          comboMultiplier = 1;
          setCombo(1);
        }
      }

      // Score decrease tick over time (10 pts per second)
      if (frameCount % 60 === 0 && gameScore > 100) {
        gameScore -= 10;
        setScore(gameScore);
      }

      // Check Key collections
      activeKeys.forEach(k => {
        if (!k.collected) {
          const dist = Math.hypot(player.canvasX - (k.x * cellSize + cellSize/2), player.canvasY - (k.y * cellSize + cellSize/2));
          if (dist < cellSize * 0.7) {
            k.collected = true;
            player.shieldTime = 300; // 5 seconds
            
            // Apply combo multiplier
            if (comboTimer > 0) {
              comboMultiplier = Math.min(3, comboMultiplier + 1);
            } else {
              comboMultiplier = 1;
            }
            comboTimer = 360; // 6 seconds timer
            setCombo(comboMultiplier);
            setComboTimerVal(1.0);

            const pointsEarned = 300 * comboMultiplier;
            gameScore += pointsEarned;
            setScore(gameScore);

            sfx.playCollect();
            flashTime = 12;
            flashColor = k.color; // Flash screen key color
            // Golden explosion particles + radial shockwave
            spawnParticles(k.x * cellSize + cellSize/2, k.y * cellSize + cellSize/2, '#fbbf24', 24);
            spawnParticles(k.x * cellSize + cellSize/2, k.y * cellSize + cellSize/2, k.color, 12);
            spawnShockwave(k.x * cellSize + cellSize/2, k.y * cellSize + cellSize/2, '#fbbf24', 80);
            addFloatingText(
              k.x * cellSize + cellSize/2,
              k.y * cellSize + cellSize/2,
              `${comboMultiplier > 1 ? `COMBO x${comboMultiplier}! ` : ''}+${pointsEarned} Tax Shield!`,
              k.color
            );
          }
        }
      });

      // Check Collector collision
      collectors.forEach(c => {
        const dist = Math.hypot(player.canvasX - c.x, player.canvasY - c.y);
        if (dist < cellSize * 0.65) {
          if (player.shieldTime > 0) {
            // Shielded: Stun enemy
            if (c.stunTime === 0) {
              c.stunTime = 180; // 3 seconds
              c.progress = 0;
              c.targetX = c.gridX;
              c.targetY = c.gridY;
              sfx.playStun();
              spawnParticles(c.x, c.y, '#31cdec', 12);
              addFloatingText(c.x, c.y - 15, 'Stunned!', '#31cdec');
            }
          } else if (player.invulnerableTime === 0) {
            // Hit penalty
            player.invulnerableTime = 90; // 1.5 seconds
            gameScore = Math.max(0, gameScore - 200);
            setScore(gameScore);
            
            // Screen Shake & Red flash juice!
            shakeTime = 18;
            flashTime = 14;
            flashColor = '#ef4444'; // Red flash
            redVignetteIntensity = 1.0; // Trigger red vignette warning
            
            sfx.playHit();
            spawnParticles(player.canvasX, player.canvasY, '#ef4444', 20);
            addFloatingText(player.canvasX, player.canvasY - 15, '-200 Tax Audit!', '#ef4444');

            if (gameScore <= 0) {
              setWon(false);
              setScreen(Screen.LEAD_CAPTURE);
              cancelAnimationFrame(requestRef.current!);
              return;
            }
          }
        }
      });

      // Goal Collisions
      const goalX = gameData.goal.x * cellSize + cellSize/2;
      const goalY = gameData.goal.y * cellSize + cellSize/2;
      const distToGoal = Math.hypot(player.canvasX - goalX, player.canvasY - goalY);
      if (distToGoal < cellSize * 0.5) {
        gameScore += 500;
        setScore(gameScore);
        setWon(true);
        sfx.playWin();
        setScreen(Screen.LEAD_CAPTURE);
        cancelAnimationFrame(requestRef.current!);
        return;
      }

      // Decay red vignette
      if (redVignetteIntensity > 0) redVignetteIntensity -= 0.02;

      // Drawing pipeline
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply screen shake translation if active
      ctx.save();
      if (shakeTime > 0) {
        const sX = (Math.random() - 0.5) * 8;
        const sY = (Math.random() - 0.5) * 8;
        ctx.translate(sX, sY);
        shakeTime--;
      }

      // Draw Floor Grid with ambient player lighting
      drawFloorGrid(ctx, canvas.width, canvas.height, cellSize, cols, rows, gameData.maze, player.canvasX, player.canvasY);

      // Draw 3D Extruded Walls
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (gameData.maze[y][x] === 1) {
            drawWall3D(ctx, x * cellSize, y * cellSize, cellSize);
          }
        }
      }

      // Draw Shortcut Doors
      activeDoors.forEach(d => {
        const correspondingKey = activeKeys.find(k => k.type === d.type);
        if (correspondingKey && correspondingKey.collected) {
          // Open door — glowing dashed border
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = d.color;
          ctx.strokeStyle = d.color;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(d.x * cellSize + 4, d.y * cellSize + 4, cellSize - 8, cellSize - 8);
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
          ctx.restore();
        } else {
          // Locked door — programmatic lock icon
          drawLockedDoor(ctx, d.x * cellSize, d.y * cellSize, cellSize, d.color);
        }
      });

      // Draw Goal Portal — pulsing green glow beacon
      drawGoalBeacon(ctx, goalX, goalY, cellSize, frameCount);

      // Draw Keys — golden keys with radial glow
      activeKeys.forEach(k => {
        if (!k.collected) {
          drawKey(ctx, k.x * cellSize + cellSize / 2, k.y * cellSize + cellSize / 2, cellSize, k.color, k.type, frameCount);
        }
      });

      // Draw Particles (with gravity)
      particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.alpha -= 0.025;
        p.size *= 0.985; // shrink
        p.life--;

        if (p.life <= 0 || p.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      // Draw Shockwaves
      shockwaves = shockwaves.filter(sw => {
        sw.radius += 3;
        sw.alpha -= 0.025;
        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) return false;

        ctx.save();
        ctx.globalAlpha = sw.alpha;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        // Inner ring
        ctx.globalAlpha = sw.alpha * 0.4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        return true;
      });

      // Draw Collectors — menacing gradient figures
      collectors.forEach(c => {
        ctx.save();
        if (c.stunTime > 0) {
          if (Math.floor(c.stunTime / 6) % 2 === 0) ctx.globalAlpha = 0.3;
        }
        drawCollector(ctx, c.x, c.y, cellSize, c.color, c.type, frameCount, c.stunTime > 0);
        ctx.restore();

        // Tag Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold 7px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(c.type, c.x, c.y - cellSize * 0.5);
      });

      // Draw Player — person with briefcase
      ctx.save();
      if (player.invulnerableTime > 0) {
        if (Math.floor(player.invulnerableTime / 4) % 2 === 0) ctx.globalAlpha = 0.25;
      }
      drawPlayer(ctx, player.canvasX, player.canvasY, cellSize, frameCount, player.shieldTime > 0);

      // Draw premium shield ring overlay
      if (player.shieldTime > 0) {
        drawShieldRing(ctx, player.canvasX, player.canvasY, cellSize, frameCount, player.shieldTime);
      }
      ctx.restore();

      // Draw Floating Texts with glow
      floatingTexts = floatingTexts.filter(ft => {
        ft.y -= 0.8;
        ft.life--;
        if (ft.life <= 0) return false;

        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life / 15);
        ctx.shadowBlur = 6;
        ctx.shadowColor = ft.color;
        ctx.fillStyle = ft.color;
        ctx.font = `bold 10px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        return true;
      });

      // Fog-of-war darkening effect
      drawFogOfWar(ctx, canvas.width, canvas.height, player.canvasX, player.canvasY, cellSize);

      // Subtle vignette at screen edges (always)
      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.35,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.75
      );
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.restore(); // Restore shake transformations

      // Render Screen Flash overlay (juice)
      if (flashTime > 0) {
        ctx.save();
        ctx.fillStyle = flashColor;
        ctx.globalAlpha = (flashTime / 15) * 0.3;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        flashTime--;
      }

      // Red vignette warning on tax collector encounter
      drawRedVignette(ctx, canvas.width, canvas.height, redVignetteIntensity);

      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      upBtn?.removeEventListener('touchstart', pressUp);
      downBtn?.removeEventListener('touchstart', pressDown);
      leftBtn?.removeEventListener('touchstart', pressLeft);
      rightBtn?.removeEventListener('touchstart', pressRight);
      upBtn?.removeEventListener('mousedown', pressUp);
      downBtn?.removeEventListener('mousedown', pressDown);
      leftBtn?.removeEventListener('mousedown', pressLeft);
      rightBtn?.removeEventListener('mousedown', pressRight);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [screen, gameData]);

  // Lead capture validator
  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Name is required';
    } else if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      errs.name = 'Letters only';
    }

    if (!mobile) {
      errs.mobile = 'Mobile is required';
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      errs.mobile = 'Invalid 10-digit number (starts 6-9)';
    }

    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      errs.email = 'Invalid email address';
    }

    if (!terms) {
      errs.terms = 'Please accept the Terms & Conditions';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const result = await submitToLMS({
        name: name.trim(),
        mobile_no: mobile,
        email_id: email.trim(),
        score,
        summary_dtls: `Tax Save Maze - Post Game Lead | Status: ${won ? 'Won' : 'Lost'}`
      });

      const refNo = extractLeadNo(result);
      if (refNo) {
        sessionStorage.setItem(LEAD_NO_KEY, refNo);
        setLeadNo(refNo);
      }
      
      sessionStorage.setItem('lastSubmittedName', name.trim());
      sessionStorage.setItem('lastSubmittedPhone', mobile);
      setLeadSubmitted(true);
      setScreen(Screen.RESULTS);
    } catch (err) {
      console.error(err);
      setLeadSubmitted(true);
      setScreen(Screen.RESULTS);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlayAgain = () => {
    playClick();
    setLeadSubmitted(false);
    setLeadNo(null);
    setEmail('');
    handleStartGame();
  };

  return (
    <div className="game-wrap mx-auto flex flex-col h-full relative text-white antialiased overflow-hidden select-none">
      
      {/* 1. START / MENU SCREEN WITH TUTORIAL */}
      {screen === Screen.INTRO && (
        <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto animate-fade-in screen-scroll h-full">
          <div className="flex-1 flex flex-col items-center justify-center my-auto">
            {/* Gamification Header */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-800/50 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#22d3ee" stroke="#06b6d4" strokeWidth="1"/></svg>
              Bajaj Allianz Life
            </div>
            
            {/* Interactive Title */}
            <h1 className="text-4xl font-black text-center tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 uppercase leading-none mb-1">
              Tax Save Maze
            </h1>
            <p className="text-xs font-semibold text-slate-400 text-center mb-6 tracking-wide">
              Beat the tax codes, secure your future!
            </p>

            {/* Premium Tab Selection */}
            <div className="w-full flex bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 mb-6">
              <button
                onClick={() => { playClick(); setActiveTab('play'); }}
                className={`flex-1 py-2 text-xs font-extrabold uppercase rounded-lg transition duration-200 ${
                  activeTab === 'play' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mission Directive
              </button>
              <button
                onClick={() => { playClick(); setActiveTab('how-to-play'); }}
                className={`flex-1 py-2 text-xs font-extrabold uppercase rounded-lg transition duration-200 ${
                  activeTab === 'how-to-play' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Interactive Guide
              </button>
            </div>

            {/* Interactive Slider content */}
            {activeTab === 'play' ? (
              <div className="w-full max-w-sm space-y-4 bg-slate-900/65 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl mb-6 animate-fade-in">
                <h2 className="text-xs font-black tracking-wider text-cyan-400 uppercase">Mission Directive</h2>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="3" fill="#38bdf8"/><path d="M8 13h8l-1 7H9l-1-7z" fill="#0ea5e9"/><rect x="14" y="14" width="5" height="4" rx="1" fill="#92400e"/></svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Navigate to Exemption</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">Guide the taxpayer through the maze to the <span className="text-green-400 font-bold">Tax-Free Exemption Zone</span> at the end.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="5" stroke="#fbbf24" strokeWidth="2" fill="none"/><rect x="11" y="13" width="2" height="8" fill="#fbbf24"/><rect x="13" y="17" width="4" height="2" fill="#fbbf24"/><rect x="13" y="14" width="3" height="2" fill="#fbbf24"/></svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Collect Tax Saving Keys</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                      Grab <span className="text-cyan-400 font-bold">80C</span>, <span className="text-green-400 font-bold">80D</span> & <span className="text-orange-400 font-bold">Pension</span> Keys. They grant a <span className="text-cyan-400 font-semibold">5s shield</span> and unlock secret shortcut walls!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3C8 3 5 7 5 11c0 2 .5 3 1.5 4.5l-1 4.5h3l.5-2h6l.5 2h3l-1-4.5C19.5 14 20 13 20 11c20 7 17 3 12 3z" fill="#ef4444"/><circle cx="9" cy="10" r="2" fill="white"/><circle cx="15" cy="10" r="2" fill="white"/><circle cx="9" cy="10" r="1" fill="#1a1a2e"/><circle cx="15" cy="10" r="1" fill="#1a1a2e"/></svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Dodge Tax Collectors</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">Avoid GST, Income Tax & Fine collectors. Getting caught costs you <span className="text-red-400 font-semibold">-200 Exemption Score</span> unless shielded!</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm space-y-3 bg-slate-900/65 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-xl mb-6 max-h-[220px] overflow-y-auto pr-1 animate-fade-in text-left">
                <h2 className="text-xs font-black tracking-wider text-cyan-400 uppercase mb-2">Interactive Guide</h2>
                
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Life Insurance 80C Key</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-bold">Cyan Portal</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Health Insurance 80D Key</span>
                  <span className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-[9px] font-bold">Green Portal</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Pension Fund Key</span>
                  <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[9px] font-bold">Orange Portal</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Combo Multiplier</span>
                  <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[9px] font-bold">Up to x3 points!</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <button
              onClick={handleStartGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] transition-all duration-200 text-white font-extrabold text-lg tracking-wider uppercase shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              Start Game
            </button>
            <p className="text-[10px] text-center text-slate-500 font-semibold tracking-wide">
              Compatible with Keyboard WASD, Touch Swipes & D-Pad
            </p>
          </div>
        </div>
      )}

      {/* 2. ACTIVE GAMEPLAY SCREEN */}
      {screen === Screen.GAME && (
        <div className="flex-1 flex flex-col h-full bg-[#030712] select-none overflow-hidden">
          {/* HUD Header */}
          <div className="flex justify-between items-center px-4 py-3 bg-[#0b1329] border-b border-slate-800/80 shadow-md">
            <div>
              <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Exemption Score</p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300 tracking-tight">
                  {score}
                </h3>
                
                {/* Burning Combo tag juice! */}
                {combo > 1 && (
                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2c0 6-4 8-4 14a4 4 0 008 0c0-6-4-8-4-14z" fill="#f59e0b"/><path d="M12 8c0 4-2 5-2 9a2 2 0 004 0c0-4-2-5-2-9z" fill="#fbbf24"/></svg>
                    x{combo} Combo
                  </span>
                )}
              </div>
            </div>
            
            {/* Keys Status HUD */}
            <div className="flex gap-2">
              {['80C', '80D', 'Pension'].map(type => {
                const k = gameData?.keys.find(key => key.type === type);
                const col = type === '80C' ? 'bg-cyan-500 shadow-cyan-500/30' : type === '80D' ? 'bg-green-500 shadow-green-500/30' : 'bg-orange-500 shadow-orange-500/30';
                return (
                  <div
                    key={type}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg font-black text-[10px] tracking-tighter transition-all duration-300 ${
                      k?.collected ? `${col} text-white shadow-md border-t border-white/25` : 'bg-slate-900 text-slate-600 border border-slate-800'
                    }`}
                  >
                    {type === 'Pension' ? '80CCD' : type}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combo Timeline Bar juice */}
          {combo > 1 && (
            <div className="w-full h-1 bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-75"
                style={{ width: `${comboTimerVal * 100}%` }}
              />
            </div>
          )}

          {/* Game Canvas Container */}
          <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-radial-at-c from-slate-900 to-slate-950">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
              <canvas
                ref={canvasRef}
                className="block mx-auto max-w-full h-auto aspect-square bg-[#060f1e]"
                style={{ maxWidth: '400px', width: '100%' }}
              />
            </div>
          </div>

          {/* Virtual Controls — Glassmorphic D-pad */}
          <div className="p-4 bg-[#070e1e]/80 border-t border-slate-900/50 flex flex-col items-center justify-center select-none gap-2" style={{ backdropFilter: 'blur(12px)' }}>
            <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mb-1">
              Tap D-Pad or Swipe Canvas to Navigate
            </p>
            
            {/* D-pad Joystick Layout — Glassmorphic */}
            <div className="relative w-36 h-36 flex items-center justify-center select-none">
              {/* Outer Ring — glass effect */}
              <div className="absolute inset-0 rounded-full border border-cyan-800/20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, rgba(3,10,22,0.6) 100%)' }} />

              {/* Up Button */}
              <button
                id="dpad-up"
                className="absolute top-1 w-12 h-12 rounded-xl flex items-center justify-center select-none dpad-btn shadow-lg transition-all duration-100"
                style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5l-7 9h14l-7-9z" fill="#22d3ee" fillOpacity="0.9"/></svg>
              </button>
              
              {/* Left Button */}
              <button
                id="dpad-left"
                className="absolute left-1 w-12 h-12 rounded-xl flex items-center justify-center select-none dpad-btn shadow-lg transition-all duration-100"
                style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12l9-7v14l-9-7z" fill="#22d3ee" fillOpacity="0.9"/></svg>
              </button>

              {/* Center Core — glass orb */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[9px] text-cyan-500/60 font-bold z-10 pointer-events-none" style={{ background: 'rgba(3,10,22,0.8)', border: '1px solid rgba(6,182,212,0.15)', boxShadow: '0 0 15px rgba(6,182,212,0.08) inset' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.4"/></svg>
              </div>

              {/* Right Button */}
              <button
                id="dpad-right"
                className="absolute right-1 w-12 h-12 rounded-xl flex items-center justify-center select-none dpad-btn shadow-lg transition-all duration-100"
                style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12l-9-7v14l9-7z" fill="#22d3ee" fillOpacity="0.9"/></svg>
              </button>
              
              {/* Down Button */}
              <button
                id="dpad-down"
                className="absolute bottom-1 w-12 h-12 rounded-xl flex items-center justify-center select-none dpad-btn shadow-lg transition-all duration-100"
                style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 19l7-9H5l7 9z" fill="#22d3ee" fillOpacity="0.9"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. LEAD CAPTURE MODAL SCREEN */}
      {screen === Screen.LEAD_CAPTURE && (
        <div className="flex-1 flex flex-col justify-center items-center p-6 bg-[#0B1221] overflow-y-auto animate-fade-in screen-scroll h-full">
          <div className="w-full max-w-sm bg-slate-900/70 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-slate-800/80 relative text-white">
            
            {/* Header info */}
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase mb-2">
                {won ? 'Exemption Secured!' : 'Audit Interrupted!'}
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                Claim Exemption
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Submit details to save your exemption certificate and score!
              </p>
            </div>

            <form onSubmit={handleFormSubmit} noValidate className="space-y-4 text-left">
              {/* Name Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  className={`w-full bg-slate-950/60 border rounded-xl px-4 py-3 font-semibold text-sm outline-none transition text-white placeholder-slate-500 ${
                    errors.name ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-cyan-400'
                  }`}
                />
                {errors.name && (
                  <p className="text-[10px] font-black text-red-500 uppercase ml-1">{errors.name}</p>
                )}
              </div>

              {/* Mobile Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, ''));
                    if (errors.mobile) setErrors(prev => ({ ...prev, mobile: '' }));
                  }}
                  className={`w-full bg-slate-950/60 border rounded-xl px-4 py-3 font-semibold text-sm outline-none transition text-white placeholder-slate-500 ${
                    errors.mobile ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-cyan-400'
                  }`}
                />
                {errors.mobile && (
                  <p className="text-[10px] font-black text-red-500 uppercase ml-1">{errors.mobile}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  className={`w-full bg-slate-950/60 border rounded-xl px-4 py-3 font-semibold text-sm outline-none transition text-white placeholder-slate-500 ${
                    errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-cyan-400'
                  }`}
                />
                {errors.email && (
                  <p className="text-[10px] font-black text-red-500 uppercase ml-1">{errors.email}</p>
                )}
              </div>

              {/* T&C Checkbox */}
              <div
                onClick={() => {
                  const val = !terms;
                  setTerms(val);
                  if (errors.terms && val) setErrors(prev => ({ ...prev, terms: '' }));
                }}
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition duration-150 ${
                  terms ? 'bg-cyan-400 border-cyan-400 text-white' : errors.terms ? 'border-red-500 bg-red-950/40' : 'border-slate-700 bg-slate-950/40'
                }`}>
                  {terms && <span className="text-xs font-black">✓</span>}
                </div>
                <p className="text-[10px] text-slate-400 font-bold leading-tight">
                  I agree and consent to the{' '}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setTermsOpen(true);
                    }}
                    className="text-cyan-400 underline font-black"
                  >
                    T&amp;C and Privacy Policy
                  </span>
                </p>
              </div>
              {errors.terms && (
                <p className="text-[10px] font-black text-red-500 uppercase text-center mt-1">{errors.terms}</p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] transition-all duration-200 text-white font-extrabold text-lg tracking-wider uppercase shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? 'PROCESSING...' : 'Verify & Reveal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. RESULTS / TAX ADVISORY SCREEN */}
      {screen === Screen.RESULTS && (
        <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto animate-fade-in screen-scroll h-full">
          <div className="space-y-6">
            
            {/* Outcome card */}
            <div className="text-center py-4 bg-slate-900/60 rounded-3xl border border-slate-800">
              <h2 className="text-3xl font-black tracking-tight text-yellow-400 uppercase">
                {won ? 'Exemption Cleared!' : 'Audit Failed!'}
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1 tracking-wide">
                Exemption Certificate Secured
              </p>
              
              {/* Score breakdown */}
              <div className="mt-4 inline-block bg-slate-950/80 px-6 py-2 rounded-2xl border border-slate-800/80">
                <span className="text-3xl font-black text-cyan-400 tracking-tight">{score}</span>
                <span className="text-xs font-semibold text-slate-500 ml-1.5 uppercase">Saved Points</span>
              </div>
            </div>

            {/* Financial Education Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-wider text-cyan-400 uppercase ml-1">
                Your Tax Saving Toolkit
              </h3>

              {/* 80C Card */}
              <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-sm flex-shrink-0">
                  80C
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Life Insurance Exemption</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Invest in term plans or savings schemes (e.g. <span className="text-slate-250">Guaranteed Pension Plans</span>) to save up to <span className="text-cyan-400 font-semibold">₹1.5 Lakhs</span> in taxes annually.
                  </p>
                </div>
              </div>

              {/* 80D Card */}
              <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center font-black text-green-400 text-sm flex-shrink-0">
                  80D
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Health Care Shield</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Premium paid towards health insurance secures family wellness and qualifies for deduction up to <span className="text-green-400 font-semibold">₹25,000</span> (self) / <span className="text-green-400 font-semibold">₹50,000</span> (senior citizens).
                  </p>
                </div>
              </div>

              {/* Pension Plan Card */}
              <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center font-black text-orange-400 text-sm flex-shrink-0">
                  80CCD
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Guaranteed Pension Plans</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Additional deductions under Section <span className="text-slate-250">80CCD(1B)</span> up to <span className="text-orange-400 font-semibold">₹50,000</span> are available by investing in long-term pension schemes.
                  </p>
                </div>
              </div>
            </div>

            {/* Quote details */}
            <div className="bg-cyan-950/20 border border-cyan-800/30 rounded-2xl p-4 text-center">
              <p className="text-xs text-cyan-400 font-medium">
                "Early planning is the ultimate tax shield. Shield your family and income simultaneously."
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            <button
              onClick={() => {
                playClick();
                setScreen(Screen.THANK_YOU);
              }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] transition-all duration-200 text-white font-extrabold text-lg tracking-wider uppercase shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              Get Expert Advisory
            </button>
            <button
              onClick={handlePlayAgain}
              className="w-full py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] transition-all duration-200 text-slate-300 font-extrabold text-sm tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-slate-800/50"
            >
              Retry Level
            </button>
          </div>
        </div>
      )}

      {/* 5. THANK YOU SCREEN */}
      {screen === Screen.THANK_YOU && (
        <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto animate-fade-in screen-scroll h-full">
          <div className="flex-1 flex flex-col items-center justify-center my-auto">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/10">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="#22d3ee" strokeWidth="1.5" fill="rgba(6,182,212,0.1)"/><path d="M2 7l10 6 10-6" stroke="#22d3ee" strokeWidth="1.5" fill="none"/></svg>
            </div>
            
            {/* Header */}
            <h2 className="text-3xl font-black text-center text-slate-100 uppercase tracking-tight mb-2">
              Submission Received
            </h2>
            <p className="text-sm font-semibold text-cyan-400 text-center tracking-wide mb-6">
              Empowering your financial freedom!
            </p>

            {/* Confirmation Box */}
            <div className="w-full bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3 mb-6 text-left">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference No</span>
                <span className="text-xs font-black text-slate-300 select-all">{leadNo || 'GAM_TAX_PENDING'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Representative Name</span>
                <span className="text-xs font-black text-slate-300">
                  {sessionStorage.getItem('gamification_empName') || 'Bajaj Life Advisor'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-1 font-semibold">
                An expert advisor will reach out to you at <span className="text-white">{mobile}</span> shortly to design your personalized, tax-exempt portfolio.
              </p>
            </div>

            {/* Safe zone callout */}
            <div className="w-full py-4 px-4 bg-emerald-950/15 border border-emerald-800/30 rounded-2xl flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5.5-3.8 10-8 11-4.2-1-8-5.5-8-11V6l8-4z" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-xs text-emerald-400 font-semibold leading-normal text-left">
                Guaranteed Pension Plans and Term Goals are now under verification. Save up to ₹46,800 in taxes!
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handlePlayAgain}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] transition-all duration-200 text-white font-extrabold text-lg tracking-wider uppercase shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal Overlay */}
      {termsOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTermsOpen(false)} />
          <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-md rounded-xl p-6 border border-slate-700/50 relative z-10 text-white animate-slide-up shadow-2xl">
            <button
              onClick={() => setTermsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              aria-label="Close Terms"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h3 className="text-xl font-black uppercase text-white mb-4 text-center">
              Terms &amp; Conditions
            </h3>

            <div className="text-[10px] text-slate-300 leading-relaxed space-y-3 max-h-60 overflow-y-auto pr-1 text-left font-bold">
              <p>
                I hereby authorize Bajaj Allianz Life Insurance Company Limited to call me on the contact number made available by me on the website with a specific request to call back.
              </p>
              <p>
                I further declare that, irrespective of my contact number being registered on National Customer Preference Register (NCPR) or on National Do Not Call Registry (NDNC), any call made, SMS or WhatsApp sent in response to my request shall not be construed as an Unsolicited Commercial Communication even though the content of the call may be for the purposes of explaining various insurance products and services or solicitation and procurement of insurance business.
              </p>
              <p>
                Please refer to Bajaj Allianz Life's <a href="https://www.bajajallianzlife.com/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-black">Privacy Policy</a>.
              </p>
            </div>

            <button
              onClick={() => setTermsOpen(false)}
              className="w-full py-3.5 mt-5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] transition-all duration-200 text-white font-extrabold uppercase text-sm shadow-md shadow-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              I AGREE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
