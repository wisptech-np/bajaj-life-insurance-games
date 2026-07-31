// Screens.jsx — Home, How to Play, and Results screens for Wealth Drop.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Wealth Drop';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js.

   Every value here was picked against the screen background and measured:
   INK 17.5:1, INK_DIM 11.2:1, INK_FAINT 6.9:1, ORANGE_LT 9.9:1, GREEN_LT 12.4:1
   — so body copy clears WCAG AA 4.5:1 and every meaningful icon clears 3:1.
   The old screens leaned on rgba(255,255,255,0.4-0.5) for the ring caption and
   the disclaimer, which measured 3.81:1 and failed. */
const BLUE = '#003DA6';
const BLUE_LT = '#2C7BF0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FFA469';
const GREEN = '#28A745';
const GREEN_LT = '#5CE68F';
const GOLD = '#FFC845';
const GOLD_LT = '#FFD75E';
const TEAL_LT = '#6FE3F0';
const DANGER = '#EF4444';
const DANGER_LT = '#FFA8A8';
const INK = '#FFFFFF';
const INK_DIM = '#B7C6DA';
const INK_FAINT = '#8C9CB2';
const OUTLINE = 'rgba(3,6,11,0.92)';
const SCREEN_BG = 'radial-gradient(ellipse at 50% 26%, rgba(24,58,104,0.42), rgba(6,10,20,0.98) 68%), #05090F';
/* One spacing scale, one control height and one type size for every button.
   19px/900 puts button labels over the WCAG "large text" line (18.66px bold),
   which is what lets the brand orange #F26522 stay as the primary CTA: white on
   it is 3.15:1 — AA for large text, and it would fail at the old 17px. Blue
   buttons use #1E6BE0 rather than #2C7BF0 so they clear 4.5:1 outright. */
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const BTN_H = 52;
const BTN_FS = 19;
const BLUE_BTN = '#1E6BE0';
const ORANGE_GRAD = `linear-gradient(180deg, ${ORANGE} 0%, #C94E12 100%)`;
const BLUE_GRAD = `linear-gradient(180deg, ${BLUE_BTN} 0%, ${BLUE} 100%)`;

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function TrophyIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M9 5h14v5a7 7 0 0 1-14 0V5z" fill="#fff" />
      <path d="M5 7h4v3a3 3 0 0 1-3-3z" fill="#fff" opacity="0.85" />
      <path d="M27 7h-4v3a3 3 0 0 0 3-3z" fill="#fff" opacity="0.85" />
      <rect x="13" y="16" width="6" height="6" fill="#fff" opacity="0.92" />
      <rect x="9" y="22" width="14" height="4" rx="1.5" fill="#fff" />
    </svg>
  );
}

/** Run-ended mark: a payout curve that finished under the target line. */
function ShortfallIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 10h24" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
      <path d="M4 14l6 6 6-5 6 8 6-4" stroke="#fff" strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" />
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
@keyframes wdTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes wdFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes wdGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes wdChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes wdHeroDrop {
  0%      { transform: translate(100px, 34px); }
  16%     { transform: translate(90px, 60px); }
  32%     { transform: translate(107px, 86px); }
  48%     { transform: translate(95px, 112px); }
  64%     { transform: translate(115px, 138px); }
  82%,100%{ transform: translate(147px, 166px); }
}
@keyframes wdHeroPeg { 0%,58% { opacity: 0.55; } 66% { opacity: 1; } 100% { opacity: 0.55; } }
/* How-to-play demo loop. One 4s cycle: the finger drags along the rail and
   lifts, the coin drops on that exact release point, grazes a cover peg (which
   flares and hands the coin a shield ring) and lands in the x5 pocket, which
   lights and throws a floating +500. Every keyframe below is a percentage of
   the same 4s, so the beats stay locked to each other. */
@keyframes wdDemoFinger {
  0%        { transform: translate(-58px, 0); opacity: 0; }
  8%        { transform: translate(-52px, 0); opacity: 1; }
  30%       { transform: translate(0, 0); opacity: 1; }
  34%       { transform: translate(0, 4px); opacity: 1; }
  42%       { transform: translate(0, -10px); opacity: 0; }
  100%      { transform: translate(0, -10px); opacity: 0; }
}
@keyframes wdDemoCoin {
  0%, 34%   { transform: translate(0, 0); opacity: 0; }
  36%       { transform: translate(0, 0); opacity: 1; }
  46%       { transform: translate(-8px, 32px); }
  56%       { transform: translate(2px, 60px); }
  66%       { transform: translate(-14px, 88px); }
  76%, 100% { transform: translate(-20px, 136px); opacity: 1; }
}
@keyframes wdDemoCover {
  0%, 52%   { opacity: 0.6; transform: scale(1); }
  58%       { opacity: 1; transform: scale(1.45); }
  70%, 100% { opacity: 0.85; transform: scale(1); }
}
@keyframes wdDemoShield {
  0%, 56%   { opacity: 0; transform: scale(0.5); }
  63%       { opacity: 1; transform: scale(1.2); }
  100%      { opacity: 1; transform: scale(1); }
}
@keyframes wdDemoPocket {
  0%, 74%   { opacity: 0; }
  80%       { opacity: 1; }
  100%      { opacity: 0; }
}
@keyframes wdDemoPlus {
  0%, 76%   { opacity: 0; transform: translateY(0); }
  82%       { opacity: 1; transform: translateY(-8px); }
  100%      { opacity: 0; transform: translateY(-26px); }
}
@keyframes wdDemoRail { 0%,100% { opacity: 0.4; } 20%,32% { opacity: 1; } }
.wd-title { animation: wdTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.wd-float { animation: wdFloat 4s ease-in-out infinite; }
.wd-glow  { animation: wdGlow 2.2s ease-in-out infinite; }
.wd-chip  { animation: wdChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wd-hero-drop { animation: wdHeroDrop 3.6s cubic-bezier(0.4,0,0.7,1) infinite; }
.wd-hero-peg  { animation: wdHeroPeg 3.6s ease-in-out infinite; }
.wd-demo-finger { animation: wdDemoFinger 4s ease-in-out infinite; }
.wd-demo-coin   { animation: wdDemoCoin 4s linear infinite; }
.wd-demo-cover  { animation: wdDemoCover 4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
.wd-demo-shield { animation: wdDemoShield 4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
.wd-demo-pocket { animation: wdDemoPocket 4s ease-out infinite; }
.wd-demo-plus   { animation: wdDemoPlus 4s ease-out infinite; }
.wd-demo-rail   { animation: wdDemoRail 4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .wd-title, .wd-float, .wd-glow, .wd-chip, .wd-hero-drop, .wd-hero-peg,
  .wd-demo-finger, .wd-demo-coin, .wd-demo-cover, .wd-demo-shield,
  .wd-demo-pocket, .wd-demo-plus, .wd-demo-rail { animation: none !important; }
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
 * Hero motif: the board itself — a staggered peg field, the eleven pockets with
 * their multipliers, one blue cover peg, and a gold coin picking its way down.
 * Same construction the canvas uses, so the screen previews the game rather
 * than illustrating it.
 */
const HERO_PEG_ROWS = 5;
const HERO_LANES = 11;
const HERO_X0 = 14;
const HERO_W = 172;
const HERO_PITCH = HERO_W / HERO_LANES;
const HERO_ROW_Y = 48;
const HERO_ROW_GAP = 21;
// Mirrors GAME_CONFIG.buckets: savings gutter, jackpot, risk band, then the
// disciplined middle.
const HERO_MULTS = [1, 1, 5, 0, 2, 3, 2, 0, 5, 1, 1];
const HERO_POCKET = [
  '#BBD6F0', '#BBD6F0', GOLD_LT, DANGER_LT, TEAL_LT,
  '#A8C8FF', TEAL_LT, DANGER_LT, GOLD_LT, '#BBD6F0', '#BBD6F0',
];

function HeroPegs() {
  const pegs = [];
  for (let r = 0; r < HERO_PEG_ROWS; r++) {
    const centre = r % 2 === 0;
    const n = centre ? HERO_LANES : HERO_LANES + 1;
    for (let j = 0; j < n; j++) {
      const cx = HERO_X0 + HERO_PITCH * (centre ? j + 0.5 : j);
      const cy = HERO_ROW_Y + r * HERO_ROW_GAP;
      const cover = r === 3 && j === 3;
      pegs.push(
        <circle
          key={`${r}-${j}`}
          className={cover ? undefined : 'wd-hero-peg'}
          cx={cx}
          cy={cy}
          r={cover ? 3.4 : 2}
          fill={cover ? BLUE_LT : '#4A6C93'}
          stroke={cover ? '#CDE4FF' : OUTLINE}
          strokeWidth={cover ? 1.3 : 0.7}
          style={{ animationDelay: `${r * 0.11}s` }}
        />,
      );
    }
  }
  return <g>{pegs}</g>;
}

function HeroPockets() {
  return (
    <g>
      {HERO_MULTS.map((m, i) => {
        const x = HERO_X0 + HERO_PITCH * i;
        return (
          <g key={i}>
            <rect x={x + 0.4} y={158} width={HERO_PITCH - 0.8} height={22} rx="2.5"
              fill={m === 0 ? 'rgba(122,20,20,0.6)' : 'rgba(4,7,14,0.72)'}
              stroke={m === 0 ? DANGER_LT : 'rgba(255,255,255,0.24)'} strokeWidth="0.8" />
            <rect x={x + 0.4} y={158} width={HERO_PITCH - 0.8} height={2.8} rx="1.4" fill={HERO_POCKET[i]} />
            <text x={x + HERO_PITCH / 2} y={172.5} fill={HERO_POCKET[i]}
              fontSize="7.5" fontWeight="900" textAnchor="middle"
              fontFamily="'Poppins', sans-serif">x{m}</text>
          </g>
        );
      })}
    </g>
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
        <h1 className="wd-title" style={{
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
          maxWidth: 300,
          lineHeight: 1.45,
        }}>
          Invest through the ups and downs. Let protection smooth the ride.
        </p>
      </div>

      <div className="wd-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="wdSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A1220" />
              <stop offset="100%" stopColor="#050A12" />
            </linearGradient>
            <radialGradient id="wdCoin" cx="0.36" cy="0.32" r="0.75">
              <stop offset="0%" stopColor="#FFF6D6" />
              <stop offset="55%" stopColor="#FFE38A" />
              <stop offset="100%" stopColor="#6B4A05" />
            </radialGradient>
            <clipPath id="wdClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#wdSky)"
            stroke="rgba(255,255,255,0.16)" strokeWidth="1.4" />

          <g clipPath="url(#wdClip)">
            <g className="wd-glow">
              <ellipse cx="100" cy="100" rx="88" ry="76" fill="rgba(40,72,110,0.2)" />
            </g>

            {/* Aim rail and drop marker. */}
            <line x1={HERO_X0} y1="30" x2={HERO_X0 + HERO_W} y2="30"
              stroke="rgba(255,255,255,0.22)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M100 24 l-5 -1 l0 -7 l10 0 l0 7 z" fill="#FF7A33" stroke={OUTLINE} strokeWidth="1" />

            <HeroPegs />
            <HeroPockets />

            {/* The coin, tracing a real path down the field. Dark rim first, so
                it never disappears where it crosses a peg or a gold lip. */}
            <g className="wd-hero-drop">
              <circle cx="0" cy="0" r="6.9" fill={OUTLINE} />
              <circle cx="0" cy="0" r="6.2" fill="url(#wdCoin)" />
              <circle cx="0" cy="0" r="4" fill="none" stroke="#FFF6D6" strokeWidth="1.2" />
            </g>
          </g>
        </svg>
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
            height: BTN_H,
            border: 'none',
            borderRadius: 14,
            fontSize: BTN_FS,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: ORANGE_GRAD,
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

/* ─── How to play ──────────────────────────────────────────
   Animation only. One looping 4s demo of the real input (a finger dragging the
   aim rail and lifting) and the real outcome (the coin bouncing down, picking
   up cover, landing in the x5 pocket for a floating +500), drawn with the
   game's own shapes and colours. No instruction paragraphs — three icon-led
   labels of two words each carry the whole tutorial. */

/** Staggered peg rows for the demo board, same construction as the canvas. */
function DemoPegs() {
  const pegs = [];
  const rows = [{ y: 62, n: 5, off: 0 }, { y: 90, n: 6, off: -18 }, { y: 118, n: 5, off: 0 }];
  rows.forEach((row, r) => {
    for (let j = 0; j < row.n; j++) {
      const cx = 58 + row.off + j * 36;
      if (r === 1 && j === 3) continue; // the cover peg lives here
      pegs.push(
        <circle key={`${r}-${j}`} cx={cx} cy={row.y} r="4.4"
          fill="#4A6C93" stroke={OUTLINE} strokeWidth="1.6" />,
      );
    }
  });
  return <g>{pegs}</g>;
}

/** Icon + two words. The only text on the screen besides the heading. */
function DemoLabel({ tint, label, children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SP.xs,
      flex: 1, minWidth: 0,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.06)', border: `1px solid ${tint}`,
      }}>
        {children}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 900, letterSpacing: '0.06em',
        color: tint, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2,
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
        padding: SP.lg,
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(6,10,20,0.82)',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: 24,
        padding: `${SP.xl}px ${SP.lg}px ${SP.lg}px`,
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 14px 40px rgba(0,0,0,0.55)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 24, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: `0 0 ${SP.md}px 0`, color: INK,
        }}>
          How to Play
        </h2>

        {/* The demo. Everything the player needs to know, shown. */}
        <svg viewBox="0 0 260 190" width="100%" style={{ display: 'block', maxHeight: 210 }}
          role="img" aria-label="Drag the marker along the rail, release, and the coin bounces into a pocket">
          <defs>
            <radialGradient id="wdDemoCoinFill" cx="0.36" cy="0.32" r="0.75">
              <stop offset="0%" stopColor="#FFF6D6" />
              <stop offset="55%" stopColor="#FFE38A" />
              <stop offset="100%" stopColor="#6B4A05" />
            </radialGradient>
            <linearGradient id="wdDemoSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A1220" />
              <stop offset="100%" stopColor="#050A12" />
            </linearGradient>
          </defs>

          <rect x="1" y="1" width="258" height="188" rx="18" fill="url(#wdDemoSky)"
            stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />

          {/* Aim rail */}
          <line className="wd-demo-rail" x1="34" y1="26" x2="226" y2="26"
            stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />

          <DemoPegs />

          {/* Cover peg — the one blue thing on the board */}
          <g className="wd-demo-cover">
            <path d="M152 80 l9 3.4 l0 7 c0 5.6 -3.8 10 -9 12.2 c-5.2 -2.2 -9 -6.6 -9 -12.2 l0 -7 z"
              fill={BLUE_LT} stroke={OUTLINE} strokeWidth="2.4" />
            <path d="M152 80 l9 3.4 l0 7 c0 5.6 -3.8 10 -9 12.2 c-5.2 -2.2 -9 -6.6 -9 -12.2 l0 -7 z"
              fill="none" stroke="#CDE4FF" strokeWidth="1.1" />
            <path d="M147.5 90.5 l3 3 l5.5 -6" fill="none" stroke="#FFFFFF" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Pockets: risk / jackpot / goal */}
          <g>
            <rect x="18" y="150" width="70" height="30" rx="6"
              fill="rgba(122,20,20,0.62)" stroke={DANGER_LT} strokeWidth="1.6" />
            <rect x="18" y="150" width="70" height="4" rx="2" fill={DANGER} />
            <text x="53" y="171" fill={DANGER_LT} fontSize="14" fontWeight="900" textAnchor="middle"
              fontFamily="'Poppins', sans-serif">x0</text>

            <rect x="95" y="150" width="70" height="30" rx="6"
              fill="rgba(4,7,14,0.8)" stroke={GOLD_LT} strokeWidth="1.6" />
            <rect x="95" y="150" width="70" height="4" rx="2" fill={GOLD} />
            <text x="130" y="171" fill={GOLD_LT} fontSize="14" fontWeight="900" textAnchor="middle"
              fontFamily="'Poppins', sans-serif">x5</text>
            <rect className="wd-demo-pocket" x="95" y="150" width="70" height="30" rx="6" fill="rgba(255,215,94,0.5)" />

            <rect x="172" y="150" width="70" height="30" rx="6"
              fill="rgba(4,7,14,0.8)" stroke="#A8C8FF" strokeWidth="1.6" />
            <rect x="172" y="150" width="70" height="4" rx="2" fill={BLUE_LT} />
            <text x="207" y="171" fill="#A8C8FF" fontSize="14" fontWeight="900" textAnchor="middle"
              fontFamily="'Poppins', sans-serif">x3</text>
          </g>

          {/* The coin: dark rim, gold body, shield ring once it takes cover */}
          <g transform="translate(150,26)">
            <g className="wd-demo-coin">
              <circle className="wd-demo-shield" cx="0" cy="0" r="14"
                fill="rgba(44,123,240,0.2)" stroke="#CDE4FF" strokeWidth="2" />
              <circle cx="0" cy="0" r="9.4" fill={OUTLINE} />
              <circle cx="0" cy="0" r="8.4" fill="url(#wdDemoCoinFill)" />
              <circle cx="0" cy="0" r="5" fill="none" stroke="#FFF6D6" strokeWidth="1.4" />
            </g>
          </g>

          {/* Floating payout at the point of action */}
          <g className="wd-demo-plus">
            <text x="130" y="146" fill={GOLD_LT} fontSize="16" fontWeight="900" textAnchor="middle"
              stroke={OUTLINE} strokeWidth="3.2" paintOrder="stroke"
              fontFamily="'Poppins', sans-serif">+500</text>
          </g>

          {/* The finger doing the real input. Its tip sits exactly on the rail
              at the release point, so the demo shows the input and the outcome
              sharing one x. */}
          <g transform="translate(150,26)">
            <g className="wd-demo-finger">
              <g transform="translate(-18,-6) scale(1.5)" fill="#FFFFFF"
                stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round">
                <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74a4 4 0 1 0-8 0c0 1.56.79 2.93 2 3.74z" />
                <path d="M18.84 15.87l-4.54-2.26a1.2 1.2 0 0 0-.54-.11H13v-6a1.5 1.5 0 0 0-3 0v10.74l-3.44-.72a1 1 0 0 0-.95.27l-.93.94 5.02 5.02c.27.27.64.42 1.02.42h6.1c.75 0 1.38-.55 1.49-1.29l.72-5.02c.09-.62-.23-1.23-.79-1.51z" />
              </g>
            </g>
          </g>
        </svg>

        <div style={{ display: 'flex', gap: SP.sm, margin: `${SP.lg}px 0` }}>
          <DemoLabel tint={ORANGE_LT} label="Drag rail">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ORANGE_LT}
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h16" />
              <path d="M9 4 5 8l4 4M15 4l4 4-4 4" />
              <path d="M12 14v6" />
            </svg>
          </DemoLabel>
          <DemoLabel tint="#A8C8FF" label="Cover saves">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A8C8FF"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
              <path d="m8.5 11.5 2.4 2.4 4.6-5" />
            </svg>
          </DemoLabel>
          <DemoLabel tint={GOLD_LT} label="x5 pocket">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8.6" fill={GOLD} stroke={OUTLINE} strokeWidth="1.8" />
              <path d="M12 7v10M9.5 9.5h5M9.5 13h5" stroke="#3A2800" strokeWidth="1.8"
                strokeLinecap="round" fill="none" />
            </svg>
          </DemoLabel>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: BTN_H, border: 'none', borderRadius: 12,
              fontSize: BTN_FS, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: BLUE_GRAD,
              boxShadow: '0 4px 16px rgba(0,61,166,0.45)',
              cursor: 'pointer',
            }}
          >
            Play
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
      padding: `${SP.sm + 2}px ${SP.xs + 2}px`,
      borderRadius: 14,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.16)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 19, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#A9BACF', marginTop: SP.xs }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const coins = stats?.coins || 0;
  const shielded = stats?.shielded || 0;
  const combo = stats?.combo || 0;
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
    const shareMessage = `Hi,\nI dropped ${coins} premium coins for a ${score} payout in the ${GAME_TITLE} challenge.\nMarkets swing both ways - protection is what smooths the ride. Take your run here: ${shareUrl}`.trim();

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
          {won ? <TrophyIcon size={20} /> : <ShortfallIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Target beaten' : 'Short of target'}
          </span>
        </div>
        <p style={{ color: INK, fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: '#8CB6FF' }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: INK_DIM }}>Here&rsquo;s your payout.</span>
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
            <span style={{ fontSize: 30, fontWeight: 900, color: INK, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 10, fontWeight: 900, color: INK_DIM, marginTop: SP.xs, letterSpacing: '0.16em' }}>
              PAYOUT
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#9AACC3', marginTop: 2 }}>
              target {RESULT_TARGET_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, coins, shielded, combo} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Coins" value={`${coins}/${GAME_CONFIG.coinsPerSession}`} accent={GOLD_LT} />
        <StatTile label="Saves" value={shielded} accent="#A8C8FF" />
        <StatTile label="Streak" value={`x${combo}`} accent={GREEN_LT} />
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: BLUE_BTN, color: '#fff', fontWeight: 900,
          height: BTN_H, borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: BTN_FS, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(44,123,240,0.4)',
          width: '100%', maxWidth: 300, marginBottom: 18, zIndex: 2,
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Lead / booking card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,0.06)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: 22, padding: `${SP.lg + 2}px ${SP.lg}px`,
        border: '1px solid rgba(255,255,255,0.16)',
        textAlign: 'center', marginBottom: SP.lg, zIndex: 2,
      }}>
        <p style={{ color: INK, fontSize: 15, fontWeight: 700, lineHeight: 1.35, margin: `0 0 ${SP.lg}px 0` }}>
          Markets bounce both ways. A specialist can show you how cover keeps your goals funded either way.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm + 2 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%', height: BTN_H,
                background: ORANGE_GRAD,
                color: '#fff', fontWeight: 900, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: BTN_FS, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
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
                background: 'rgba(255,255,255,0.06)', color: INK, fontWeight: 900,
                height: BTN_H, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 16, textDecoration: 'none', textTransform: 'uppercase',
                border: '1px solid rgba(255,255,255,0.22)',
              }}
            >
              <PhoneIcon />
              <span>Call Specialist</span>
            </a>
          )}
        </div>
      </div>

      {/* Retry / Home */}
      <div style={{ display: 'flex', gap: SP.sm + 2, width: '100%', maxWidth: 360, marginBottom: SP.lg, zIndex: 2 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 2, height: BTN_H, borderRadius: 12, cursor: 'pointer',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)',
            color: INK, fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <RotateIcon />
          <span>{retryLabel || 'Play again'}</span>
        </button>
        <button
          onClick={onHome}
          style={{
            flex: 1, height: BTN_H, borderRadius: 12, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.22)',
            color: '#D5DEEA', fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <HomeIcon />
          <span>Home</span>
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 360, padding: `0 ${SP.md}px ${SP.xl - 4}px`, zIndex: 2 }}>
        <p style={{ fontSize: 9, textAlign: 'center', color: INK_FAINT, lineHeight: 1.45, fontWeight: 600, margin: 0 }}>
          <span style={{ color: '#7C8CA2', marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
