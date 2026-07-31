// Screens.jsx — Home, How to Play, and Results screens for Goal Keeper.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Goal Keeper';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FF8A3D';
const GREEN = '#28A745';
const GREEN_LT = '#4ADE80';
const GOLD = '#FFC845';
const GOLD_LT = '#FFE38A';
const DANGER = '#EF4444';
const SCREEN_BG = 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Won: a goalkeeper's glove. */
function GloveIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 13V7a2 2 0 0 1 4 0v5M12 12V5a2 2 0 0 1 4 0v7M16 12V6a2 2 0 0 1 4 0v7"
        stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 12V9a2 2 0 0 1 4 0v10a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8v-6a2 2 0 0 1 4 0"
        stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Lost: the ball past you, in the net. */
function ConcededIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 6h24v18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      <path d="M4 6v18h24M10 6v18M16 6v18M22 6v18M4 12h24M4 18h24"
        stroke="#fff" strokeWidth="1.1" opacity="0.45" />
      <circle cx="19" cy="17" r="5" fill="#fff" />
      <circle cx="19" cy="17" r="1.7" fill="#0B1221" />
    </svg>
  );
}

function CalendarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ShareIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function PhoneIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function HomeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

/* ─── Shared keyframes ───────────────────────────────────── */
const SCREEN_CSS = `
@keyframes gkTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes gkFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes gkGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes gkChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes gkHeroBall {
  0%      { transform: translate(100px, 152px) scale(1); }
  38%     { transform: translate(100px, 152px) scale(1); }
  70%,100%{ transform: translate(46px, 66px) scale(0.66); }
}
@keyframes gkHeroDive {
  0%,38%  { transform: translate(0,0) rotate(0deg); }
  70%,100%{ transform: translate(-30px,-16px) rotate(-52deg); }
}
@keyframes gkHeroZone { 0%,32% { opacity: 0.16; } 46%,100% { opacity: 0.8; } }
/* How-to-play demo — one 3.6s loop of a single penalty, in the order the game
   gives it to you: 8% the striker plants (telegraph), 22% the swipe is drawn,
   36% the keeper leaves his line, 40% the ball is struck, 62% it is saved. */
@keyframes gkDScene  { 0%,1% { opacity: 0; } 3%,96% { opacity: 1; } 100% { opacity: 0; } }
@keyframes gkDLean   { 0%,8% { transform: rotate(0deg); } 20%,42% { transform: rotate(-15deg); } 58%,100% { transform: rotate(0deg); } }
@keyframes gkDZone   { 0%,10% { opacity: 0.1; } 18%,88% { opacity: 0.7; } 96%,100% { opacity: 0.1; } }
@keyframes gkDSwipe  { 0%,22% { stroke-dashoffset: 66; } 38%,56% { stroke-dashoffset: 0; } 64%,100% { stroke-dashoffset: 66; } }
@keyframes gkDFinger { 0%,20% { opacity: 0; transform: translate(0,0); } 24% { opacity: 1; transform: translate(0,0); } 38%,46% { opacity: 1; transform: translate(-52px,-42px); } 54%,100% { opacity: 0; transform: translate(-52px,-42px); } }
@keyframes gkDDive   { 0%,36% { transform: translate(0,0) rotate(0deg); } 58%,100% { transform: translate(-58px,-46px) rotate(-46deg); } }
@keyframes gkDBall {
  0%,40% { transform: translate(178px, 168px) scale(0.55); opacity: 1; }
  62%    { transform: translate(80px, 52px) scale(1); opacity: 1; }
  66%    { transform: translate(74px, 48px) scale(1.1); opacity: 1; }
  86%    { transform: translate(18px, 6px) scale(0.7); opacity: 0; }
  100%   { transform: translate(18px, 6px) scale(0.7); opacity: 0; }
}
@keyframes gkDSave   { 0%,62% { opacity: 0; transform: scale(0.4); } 70% { opacity: 1; transform: scale(1); } 86%,100% { opacity: 0; transform: scale(1.4); } }
.gk-title { animation: gkTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.gk-float { animation: gkFloat 4s ease-in-out infinite; }
.gk-glow  { animation: gkGlow 2.2s ease-in-out infinite; }
.gk-chip  { animation: gkChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.gk-hero-ball { animation: gkHeroBall 3.2s cubic-bezier(0.35,0,0.4,1) infinite; }
.gk-hero-dive { animation: gkHeroDive 3.2s cubic-bezier(0.3,0,0.3,1) infinite; }
.gk-hero-zone { animation: gkHeroZone 3.2s ease-in-out infinite; }
.gk-d-scene  { animation: gkDScene 3.6s linear infinite; }
.gk-d-lean   { animation: gkDLean 3.6s ease-in-out infinite; }
.gk-d-zone   { animation: gkDZone 3.6s ease-in-out infinite; }
.gk-d-swipe  { animation: gkDSwipe 3.6s cubic-bezier(0.3,0,0.3,1) infinite; }
.gk-d-finger { animation: gkDFinger 3.6s cubic-bezier(0.3,0,0.3,1) infinite; }
.gk-d-dive   { animation: gkDDive 3.6s cubic-bezier(0.3,0,0.25,1) infinite; }
.gk-d-ball   { animation: gkDBall 3.6s cubic-bezier(0.45,0,0.6,1) infinite; }
.gk-d-save   { animation: gkDSave 3.6s ease-out infinite; transform-origin: 76px 50px; }
@media (prefers-reduced-motion: reduce) {
  .gk-title, .gk-float, .gk-glow, .gk-chip, .gk-hero-ball, .gk-hero-dive, .gk-hero-zone,
  .gk-d-scene, .gk-d-lean, .gk-d-zone, .gk-d-swipe, .gk-d-finger, .gk-d-dive,
  .gk-d-ball, .gk-d-save { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, ORANGE_LT, BLUE_LT, BLUE, GREEN, '#EC4899'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {Array.from({ length: 26 }).map((_, i) => {
        const left = Math.random() * 100;
        const dur = 2 + Math.random() * 2;
        const delay = Math.random() * 1.5;
        return (
          <div
            key={i}
            className="confetti"
            style={{
              position: 'absolute',
              left: `${left}%`,
              background: colors[i % colors.length],
              '--dur': `${dur}s`,
              '--delay': `${delay}s`,
              top: -20,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Home ───────────────────────────────────────────────── */
/**
 * Hero motif: the goal itself — the six target zones, the milestone banners on
 * the stand behind it, the keeper on his line, and a ball on its way to the top
 * left corner with the keeper going with it. Same construction the canvas uses,
 * so the screen previews the game rather than illustrating it.
 */
function HeroGoal() {
  const postL = 16;
  const postR = 184;
  const barY = 26;
  const lineY = 118;
  const w = postR - postL;
  const h = lineY - barY;
  const bandY = lineY - h * 0.46;

  const zones = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = postL + (col / 3) * w;
      const y = row === 0 ? bandY : barY;
      const zh = row === 0 ? lineY - bandY : bandY - barY;
      const target = row === 1 && col === 0;
      zones.push(
        <rect
          key={`${row}-${col}`}
          className={target ? 'gk-hero-zone' : undefined}
          x={x + 1.5} y={y + 1.5} width={w / 3 - 3} height={zh - 3} rx="3"
          fill={target ? ORANGE : '#DCEBFF'}
          opacity={target ? 0.16 : 0.07}
          stroke={target ? ORANGE_LT : 'rgba(220,235,255,0.35)'}
          strokeWidth="0.9"
        />,
      );
    }
  }

  const netLines = [];
  for (let x = postL; x <= postR; x += 12) {
    netLines.push(<line key={`v${x}`} x1={x} y1={barY} x2={x + 5} y2={lineY} stroke="rgba(206,228,255,0.22)" strokeWidth="0.6" />);
  }
  for (let y = barY; y <= lineY; y += 10) {
    netLines.push(<line key={`h${y}`} x1={postL} y1={y} x2={postR} y2={y} stroke="rgba(206,228,255,0.22)" strokeWidth="0.6" />);
  }

  return (
    <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id="gkSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#08152F" />
          <stop offset="60%" stopColor="#0A2450" />
          <stop offset="100%" stopColor="#0E4A2C" />
        </linearGradient>
        <radialGradient id="gkBall" cx="0.36" cy="0.32" r="0.75">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F2F7FF" />
          <stop offset="100%" stopColor="#C9D6EA" />
        </radialGradient>
        <clipPath id="gkClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
      </defs>

      <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#gkSky)"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

      <g clipPath="url(#gkClip)">
        <g className="gk-glow">
          <ellipse cx="100" cy="60" rx="96" ry="56" fill="rgba(120,170,240,0.16)" />
        </g>

        {/* Milestone banners on the stand behind the goal. */}
        {GAME_CONFIG.milestones.map((m, i) => (
          <g key={m.label}>
            <rect x={12 + i * 60} y="8" width="56" height="13" rx="3"
              fill="rgba(255,255,255,0.07)" stroke={`${m.color}66`} strokeWidth="0.8" />
            <rect x={14 + i * 60} y="9.4" width="52" height="2" rx="1" fill={m.color} />
            <text x={40 + i * 60} y="18" fill={m.color} fontSize="4.6" fontWeight="900"
              textAnchor="middle" fontFamily="'Poppins', sans-serif">{m.label}</text>
          </g>
        ))}

        {/* Turf */}
        <rect x="0" y="118" width="200" height="72" fill="#0E4A2C" />
        <rect x="0" y="140" width="200" height="24" fill="rgba(255,255,255,0.03)" />
        <line x1="0" y1="118" x2="200" y2="118" stroke="rgba(232,246,255,0.4)" strokeWidth="1.2" />
        <ellipse cx="100" cy="168" rx="3" ry="1.4" fill="rgba(232,246,255,0.5)" />

        {netLines}
        {zones}

        {/* Frame */}
        <rect x={postL - 2.5} y={barY - 2.5} width="5" height={h + 3} rx="1.5" fill="#F4F8FF" />
        <rect x={postR - 2.5} y={barY - 2.5} width="5" height={h + 3} rx="1.5" fill="#F4F8FF" />
        <rect x={postL - 2.5} y={barY - 2.5} width={w + 5} height="5" rx="1.5" fill="#F4F8FF" />

        {/* Keeper, going to his left. */}
        <g className="gk-hero-dive" transform="translate(100,118)">
          <ellipse cx="0" cy="1" rx="11" ry="3" fill="rgba(0,0,0,0.3)" />
          <path d="M-4 -18 L-10 0 M-4 -18 L4 -1" stroke="#A93A0D" strokeWidth="4" strokeLinecap="round" />
          <rect x="-6" y="-36" width="12" height="19" rx="4" fill={ORANGE} />
          <circle cx="0" cy="-41" r="5" fill="#E8B98C" />
          <rect x="-16" y="-38" width="8" height="9" rx="3" fill={GOLD} />
          <rect x="9" y="-30" width="8" height="9" rx="3" fill={GOLD} />
        </g>

        {/* Ball on its way to the top-left corner. */}
        <g className="gk-hero-ball">
          <circle cx="0" cy="0" r="7" fill="url(#gkBall)" />
          <circle cx="0" cy="0" r="2.2" fill="#0B1221" opacity="0.8" />
        </g>
      </g>
    </svg>
  );
}

export function HomeScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '46px 24px 52px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="gk-title" style={{
          fontSize: 34,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 1,
          margin: '0 0 9px 0',
          textShadow: '0 2px 10px rgba(0,0,0,0.55)',
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12,
          fontWeight: 800,
          color: ORANGE_LT,
          letterSpacing: '0.04em',
          margin: 0,
          maxWidth: 310,
          lineHeight: 1.45,
        }}>
          Stand between risk and your family&rsquo;s goals &mdash; every save is cover doing its job.
        </p>
      </div>

      <div className="gk-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <HeroGoal />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}
      >
        <button
          type="button"
          onClick={onStart}
          style={{
            width: '100%',
            maxWidth: 320,
            height: 60,
            border: 'none',
            borderRadius: 14,
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
            boxShadow: '0 6px 22px rgba(242,101,34,0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <PlayIcon size={20} />
          <span>Start Game</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── How to play ─────────────────────────────────────────
   No instructions: one looping 3.6 s demo of a single penalty, played in the
   order the game gives it to you. The striker plants toward the top-left zone
   and that zone lights up (the 400 ms telegraph); a finger draws a LONG swipe
   up and to the left — long because the target is high, which is the one rule
   about swipe length that matters; the keeper leaves his line along the same
   vector; the ball is struck at the lit zone and the gloves get there first. */
function DemoPenalty() {
  const postL = 40;
  const postR = 260;
  const barY = 26;
  const lineY = 118;
  const w = postR - postL;
  const midY = (barY + lineY) / 2;

  const cells = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const hot = row === 1 && col === 0;      // top-left: the zone this penalty goes to
      const y = row === 1 ? barY : midY;
      cells.push(
        <rect
          key={`${row}-${col}`}
          className={hot ? 'gk-d-zone' : undefined}
          x={postL + (col * w) / 3 + 2} y={y + 2}
          width={w / 3 - 4} height={(lineY - barY) / 2 - 4} rx="4"
          fill={hot ? ORANGE : '#DCEBFF'} opacity={hot ? 0.1 : 0.07}
          stroke={hot ? ORANGE_LT : 'rgba(220,235,255,0.3)'} strokeWidth="1"
        />,
      );
    }
  }

  const net = [];
  for (let x = postL; x <= postR; x += 14) {
    net.push(<line key={`v${x}`} x1={x} y1={barY} x2={x + 6} y2={lineY} stroke="rgba(206,228,255,0.2)" strokeWidth="0.7" />);
  }
  for (let y = barY; y <= lineY; y += 12) {
    net.push(<line key={`h${y}`} x1={postL} y1={y} x2={postR} y2={y} stroke="rgba(206,228,255,0.2)" strokeWidth="0.7" />);
  }

  return (
    <svg width="100%" viewBox="0 0 300 200" style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id="gkDSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#08152F" />
          <stop offset="55%" stopColor="#0A2450" />
          <stop offset="100%" stopColor="#0E4A2C" />
        </linearGradient>
        <radialGradient id="gkDBallFill" cx="0.36" cy="0.32" r="0.75">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F2F7FF" />
          <stop offset="100%" stopColor="#C9D6EA" />
        </radialGradient>
        <clipPath id="gkDClip"><rect x="0" y="0" width="300" height="200" rx="16" /></clipPath>
      </defs>

      <g clipPath="url(#gkDClip)" className="gk-d-scene">
        <rect x="0" y="0" width="300" height="200" fill="url(#gkDSky)" />
        <ellipse cx="150" cy="52" rx="150" ry="66" fill="rgba(120,170,240,0.16)" />

        {/* Turf and the six-yard line the keeper stands on */}
        <rect x="0" y={lineY} width="300" height={200 - lineY} fill="#0E4A2C" />
        <rect x="0" y="146" width="300" height="26" fill="rgba(255,255,255,0.03)" />
        <line x1="0" y1={lineY} x2="300" y2={lineY} stroke="rgba(232,246,255,0.4)" strokeWidth="1.4" />
        <ellipse cx="178" cy="170" rx="4" ry="1.8" fill="rgba(232,246,255,0.5)" />

        {net}
        {cells}

        {/* Frame */}
        <rect x={postL - 3} y={barY - 3} width="6" height={lineY - barY + 4} rx="2" fill="#F4F8FF" />
        <rect x={postR - 3} y={barY - 3} width="6" height={lineY - barY + 4} rx="2" fill="#F4F8FF" />
        <rect x={postL - 3} y={barY - 3} width={w + 6} height="6" rx="2" fill="#F4F8FF" />

        {/* Save flash at the top-left zone */}
        <g className="gk-d-save">
          <circle cx="76" cy="50" r="20" fill="none" stroke={GREEN_LT} strokeWidth="4" />
          <circle cx="76" cy="50" r="9" fill="rgba(74,222,128,0.35)" />
        </g>

        {/* The keeper, leaving his line along the swipe vector */}
        <g transform={`translate(150,${lineY})`}>
          <g className="gk-d-dive">
            <ellipse cx="0" cy="2" rx="12" ry="3.2" fill="rgba(0,0,0,0.3)" />
            <path d="M-4 -19 L-11 0 M-4 -19 L5 -1" stroke="#A93A0D" strokeWidth="4.4" strokeLinecap="round" />
            <rect x="-6.5" y="-38" width="13" height="20" rx="4.5" fill={ORANGE} />
            <circle cx="0" cy="-43" r="5.4" fill="#E8B98C" />
            <rect x="-17" y="-40" width="9" height="10" rx="3.4" fill={GOLD} />
            <rect x="9" y="-32" width="9" height="10" rx="3.4" fill={GOLD} />
          </g>
        </g>

        {/* The striker, planting toward the zone he is about to hit */}
        <g transform="translate(212,176)">
          <g className="gk-d-lean" style={{ transformOrigin: '0px 0px' }}>
            <rect x="-5" y="-27" width="10" height="15" rx="4" fill={BLUE_LT} />
            <circle cx="0" cy="-32" r="4.6" fill="#E8B98C" />
            <path d="M-2.5 -12 L-7 0 M2.5 -12 L7 0" stroke={BLUE} strokeWidth="3.2" strokeLinecap="round" />
          </g>
        </g>

        {/* The ball: on the spot, struck at the lit zone, then turned away */}
        <g className="gk-d-ball">
          <circle cx="0" cy="0" r="8" fill="url(#gkDBallFill)" />
          <circle cx="0" cy="0" r="2.6" fill="#0B1221" opacity="0.8" />
        </g>

        {/* The real input: a long swipe up and to the left */}
        <line className="gk-d-swipe" x1="118" y1="186" x2="66" y2="144"
          stroke={ORANGE_LT} strokeWidth="3.4" strokeLinecap="round"
          strokeDasharray="66" strokeDashoffset="66" />
        <g transform="translate(118,204)">
          <g className="gk-d-finger">
            <rect x="-4.5" y="-18" width="9" height="21" rx="4.5" fill="#F3F7FF" />
            <rect x="-9" y="-5" width="19" height="16" rx="7" fill="#C9D6EA" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Icon + ≤4 words. The only prose allowed on this screen. */
function Cue({ tint, label, children }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <svg width="28" height="26" viewBox="0 0 28 26" aria-hidden="true">{children}</svg>
      <span style={{
        fontSize: 9, fontWeight: 900, letterSpacing: '0.06em', color: tint,
        textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.15,
      }}>
        {label}
      </span>
    </div>
  );
}

export function HowToPlayScreen({ onPlay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(11,18,33,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '20px 16px 18px',
        width: '100%',
        maxWidth: 344,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 24, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 14px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DemoPenalty />
        </div>

        <div style={{ display: 'flex', gap: 6, margin: '14px 0 16px' }}>
          <Cue tint={BLUE_LT} label="Read the plant">
            <rect x="10" y="5" width="8" height="12" rx="3.6" fill={BLUE_LT} />
            <circle cx="14" cy="2.8" r="2.8" fill="#E8B98C" />
            <path d="M12 17 L8 24 M16 17 L21 24" stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M6 21 l-4 2.5 l4 2.5" fill="none" stroke={GOLD} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </Cue>
          <Cue tint={ORANGE_LT} label="Longer swipe, higher">
            <circle cx="22" cy="22" r="3.2" fill={ORANGE} />
            <path d="M21 20 L6 6" stroke={ORANGE_LT} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="3.5 3.5" />
            <path d="M6 6 l6 0.6 M6 6 l0.6 6" stroke={ORANGE_LT} strokeWidth="2.6" strokeLinecap="round" />
          </Cue>
          <Cue tint={GREEN_LT} label="Streak earns shield">
            <path d="M14 3 l8 3 l0 7 c0 5.4 -3.4 9.4 -8 11.4 c-4.6 -2 -8 -6 -8 -11.4 l0 -7 z"
              fill={BLUE_LT} stroke="#A6D0FF" strokeWidth="1.3" />
            <path d="M10.4 12.6 l2.6 2.6 l4.8 -5.4" fill="none" stroke="#fff" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </Cue>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52, border: 'none', borderRadius: 12,
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `linear-gradient(180deg, ${BLUE_LT} 0%, ${BLUE} 100%)`,
              boxShadow: '0 4px 16px rgba(0,61,166,0.45)',
              cursor: 'pointer',
            }}
          >
            Play Game
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Results ────────────────────────────────────────────── */
function StatTile({ label, value, accent }) {
  return (
    <div style={{
      flex: 1,
      padding: '10px 6px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 19, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const cfg = GAME_CONFIG;
  const score = stats?.score || 0;
  const saves = stats?.saves || 0;
  const conceded = stats?.conceded || 0;
  const streak = stats?.streak || 0;
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  const [animatedScore, setAnimatedScore] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setAnimatedScore(end);
      return undefined;
    }
    const stepTime = 16;
    const increment = end / (1200 / stepTime);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [score]);

  async function handleShare() {
    const rawShareUrl = buildShareUrl() || window.location.href;
    const shareUrl = await shortenUrl(rawShareUrl);
    const shareMessage = `Hi,\nI kept ${saves} of ${cfg.shotsPerSession} penalties out for ${score} points in the ${GAME_TITLE} challenge.\nLife takes its shots either way - the right cover is what stands in the way. Take your turn in goal here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({ title: GAME_TITLE, text: shareMessage });
      } catch { /* dismissed */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareMessage);
        alert('Score and link copied to clipboard!');
      } catch { /* ignore */ }
    }
  }

  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(score, RESULT_TARGET_SCORE) / RESULT_TARGET_SCORE) * circumference;
  const weak = score < RESULT_TARGET_SCORE * 0.4;
  const strokeColor = won ? GREEN : weak ? DANGER : GOLD;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : weak ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '34px 20px 24px',
        overflowY: 'auto',
        background: SCREEN_BG,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      {won && <Confetti />}

      {/* Outcome header */}
      <div style={{ textAlign: 'center', marginBottom: 14, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '7px 16px', borderRadius: 999,
          background: won ? 'rgba(40,167,69,0.22)' : 'rgba(239,68,68,0.18)',
          border: `1px solid ${won ? 'rgba(40,167,69,0.5)' : 'rgba(239,68,68,0.45)'}`,
          marginBottom: 10,
        }}>
          {won ? <GloveIcon size={20} /> : <ConcededIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Clean sheet kept' : 'Beaten too often'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your shootout.</span>
        </p>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, zIndex: 2 }}>
        <div style={{ width: 162, height: 162, position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
            <circle
              cx="100" cy="100" r={radius} fill="none"
              stroke={strokeColor} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ filter: `drop-shadow(0 0 8px ${glowColor})`, transition: 'stroke-dashoffset 1.2s ease-out' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.55)', marginTop: 5, letterSpacing: '0.16em' }}>
              POINTS
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {saves} of {cfg.shotsPerSession} kept out
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, saves, conceded, streak} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Saves" value={`${saves}/${cfg.savesToWin}`} accent={GREEN_LT} />
        <StatTile label="Conceded" value={conceded} accent={DANGER} />
        <StatTile label="Best streak" value={`x${streak}`} accent={GOLD} />
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: BLUE_LT, color: '#fff', fontWeight: 900,
          height: 50, borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(30,107,224,0.4)',
          width: '100%', maxWidth: 300, marginBottom: 18, zIndex: 2,
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Lead / booking card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,0.05)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: 22, padding: '18px 16px',
        border: '1px solid rgba(255,255,255,0.12)',
        textAlign: 'center', marginBottom: 16, zIndex: 2,
      }}>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.35, margin: '0 0 16px 0' }}>
          Life takes its shots whether you read them or not. A specialist can show you the cover that
          keeps your family&rsquo;s goals funded anyway.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
                color: '#fff', fontWeight: 900, padding: '15px 20px', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 17, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                boxShadow: '0 4px 16px rgba(242,101,34,0.35)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book a Slot</span>
            </button>
          </motion.div>

          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 900,
                padding: '14px 20px', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 16, textDecoration: 'none', textTransform: 'uppercase',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <PhoneIcon />
              <span>Call Specialist</span>
            </a>
          )}
        </div>
      </div>

      {/* Retry / Home */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 360, marginBottom: 16, zIndex: 2 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 2, height: 48, borderRadius: 12, cursor: 'pointer',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff', fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <RotateIcon />
          <span>{retryLabel || 'Play again'}</span>
        </button>
        <button
          onClick={onHome}
          style={{
            flex: 1, height: 48, borderRadius: 12, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <HomeIcon />
          <span>Home</span>
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px', zIndex: 2 }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
