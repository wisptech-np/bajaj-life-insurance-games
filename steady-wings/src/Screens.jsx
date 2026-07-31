// Screens.jsx — Home, How to Play, and Results screens for Steady Wings.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Steady Wings';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js. Values are the
   index.css design tokens: --ls-blue, --ls-blue-light, --ls-orange. */
const BLUE = '#005BAC';
const BLUE_LT = '#3B8DD4';
const BLUE_DK = '#004080';
const ORANGE = '#F26922';
const ORANGE_LT = '#FF8533';
const GREEN = '#22C55E';
const GREEN_LT = '#6EE7A2';
const GOLD = '#FFC845';
const GOLD_LT = '#FFE38A';
const DANGER = '#EF4444';
const SCREEN_BG = 'radial-gradient(ellipse at 50% 26%, rgba(59,141,212,0.42), rgba(5,26,58,0.96) 72%), #051A3A';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Won: wings still level. */
function WingsIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 10 27 5l-3 8 3 8-11-5-11 5 3-8-3-8z" fill="#fff" opacity="0.92" />
      <circle cx="16" cy="16" r="3.2" fill="#fff" />
    </svg>
  );
}

/** Lost: grounded. */
function DownIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 26h20" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
      <path d="M20 6 9 14l5 2-2 6 10-8-5-2 3-6z" fill="#fff" opacity="0.9" />
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

/** The glider, reused at three sizes across these screens. */
function Glider({ scale = 1, shield = false }) {
  const r = 9 * scale;
  return (
    <g>
      {shield && (
        <circle cx="0" cy="0" r={r * 1.7} fill="rgba(59,141,212,0.16)" stroke="#BFE0FF" strokeWidth={1.1 * scale} />
      )}
      <path d={`M${-r * 0.15} ${-r * 0.1} L${-r * 1.72} ${-r * 0.92} L${-r * 1.28} ${r * 0.16} Z`} fill="#8F3208" />
      <path
        d={`M${r * 1.42} 0 Q${r * 0.6} ${-r * 0.95} ${-r * 0.72} ${-r * 0.62} Q${-r * 1.18} 0 ${-r * 0.72} ${r * 0.62} Q${r * 0.6} ${r * 0.95} ${r * 1.42} 0 Z`}
        fill="url(#swBody)"
      />
      <ellipse cx={r * 0.34} cy={-r * 0.14} rx={r * 0.52} ry={r * 0.3} fill="rgba(214,238,255,0.92)" transform={`rotate(-12 ${r * 0.34} ${-r * 0.14})`} />
      <path d={`M${r * 0.2} ${r * 0.1} L${-r * 0.5} ${r} L${r * 0.08} ${r * 0.7} Z`} fill="#FF9A55" />
    </g>
  );
}

/* ─── Shared keyframes ───────────────────────────────────── */
const SCREEN_CSS = `
@keyframes swTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes swFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes swGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes swChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes swHeroFly {
  0%      { transform: translate(58px, 118px); }
  22%     { transform: translate(74px, 74px); }
  50%     { transform: translate(100px, 96px); }
  74%     { transform: translate(126px, 62px); }
  100%    { transform: translate(146px, 92px); }
}
@keyframes swHeroScroll { from { transform: translateX(0); } to { transform: translateX(-72px); } }
@keyframes swBeatTap {
  0%,14%   { transform: translate(0,0) scale(1); opacity: 0; }
  20%      { opacity: 1; transform: translate(0,0) scale(0.82); }
  46%,100% { opacity: 0; transform: translate(0,-4px) scale(1); }
}
@keyframes swBeatHop {
  0%      { transform: translate(10px, 40px); }
  24%     { transform: translate(24px, 18px); }
  60%     { transform: translate(44px, 34px); }
  100%    { transform: translate(64px, 20px); }
}
@keyframes swBeatCoin { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.22); opacity: 1; } }
@keyframes swBeatShield { 0%,40% { opacity: 0.35; transform: scale(0.86); } 60%,100% { opacity: 1; transform: scale(1); } }
.sw-title { animation: swTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.sw-float { animation: swFloat 4s ease-in-out infinite; }
.sw-glow  { animation: swGlow 2.2s ease-in-out infinite; }
.sw-chip  { animation: swChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.sw-hero-fly    { animation: swHeroFly 3.4s ease-in-out infinite alternate; }
.sw-hero-scroll { animation: swHeroScroll 3.2s linear infinite; }
.sw-beat-tap    { animation: swBeatTap 2.4s ease-out infinite; }
.sw-beat-hop    { animation: swBeatHop 2.4s ease-in-out infinite alternate; }
.sw-beat-coin   { animation: swBeatCoin 1.6s ease-in-out infinite; }
.sw-beat-shield { animation: swBeatShield 2.4s ease-in-out infinite; }

/* How-to-play demo: the real one-tap flight loop. */
@keyframes swDemoScroll { from { transform: translateX(0); } to { transform: translateX(-150px); } }
@keyframes swDemoFly {
  0%    { transform: translate(62px, 124px); }
  6%    { transform: translate(62px, 112px); }
  26%   { transform: translate(62px, 86px); }
  46%   { transform: translate(62px, 92px); }
  100%  { transform: translate(62px, 124px); }
}
@keyframes swDemoPress {
  0%       { transform: translate(16px, 140px) scale(0.92); }
  9%       { transform: translate(16px, 148px) scale(0.82); }
  28%,100% { transform: translate(16px, 140px) scale(0.92); }
}
@keyframes swDemoRing {
  0%       { transform: scale(0.35); opacity: 0; }
  10%      { transform: scale(0.6);  opacity: 1; }
  55%,100% { transform: scale(2.6);  opacity: 0; }
}
@keyframes swDemoPulse { 0%,100% { transform: scale(1); opacity: 0.88; } 50% { transform: scale(1.2); opacity: 1; } }
.sw-demo-scroll { animation: swDemoScroll 2.4s linear infinite; }
.sw-demo-fly    { animation: swDemoFly 1.2s cubic-bezier(0.25,0.9,0.4,1) infinite; }
.sw-demo-press  { animation: swDemoPress 1.2s ease-out infinite; }
.sw-demo-ring   { animation: swDemoRing 1.2s ease-out infinite; transform-box: fill-box; transform-origin: center; }
.sw-demo-pulse  { animation: swDemoPulse 1.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: reduce) {
  .sw-title, .sw-float, .sw-glow, .sw-chip, .sw-hero-fly, .sw-hero-scroll,
  .sw-beat-tap, .sw-beat-hop, .sw-beat-coin, .sw-beat-shield,
  .sw-demo-scroll, .sw-demo-fly, .sw-demo-press, .sw-demo-ring,
  .sw-demo-pulse { animation: none !important; }
}
`;

/** Shared SVG gradient defs — one copy per screen. */
function Defs() {
  return (
    <defs>
      <linearGradient id="swBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF9A55" />
        <stop offset="50%" stopColor="#F26922" />
        <stop offset="100%" stopColor="#8F3208" />
      </linearGradient>
      <linearGradient id="swStone" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#16273F" />
        <stop offset="30%" stopColor="#2C4364" />
        <stop offset="65%" stopColor="#4C6E9B" />
        <stop offset="100%" stopColor="#16273F" />
      </linearGradient>
      <linearGradient id="swSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#051A3A" />
        <stop offset="55%" stopColor="#0E4F94" />
        <stop offset="100%" stopColor="#2F7CBE" />
      </linearGradient>
      <radialGradient id="swCoin" cx="0.36" cy="0.32" r="0.75">
        <stop offset="0%" stopColor="#FFF6D6" />
        <stop offset="45%" stopColor="#FFE38A" />
        <stop offset="100%" stopColor="#B07B12" />
      </radialGradient>
    </defs>
  );
}

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
 * Hero motif: the game itself — labelled expense walls scrolling past, a coin
 * in the slot, and the glider threading it. Built from the same shapes the
 * canvas draws, so the screen previews the game rather than illustrating it.
 */
function HeroSky() {
  const walls = [
    { x: 22, gapY: 96, gapH: 54, label: 'EMI' },
    { x: 94, gapY: 74, gapH: 50, label: 'FEES' },
    { x: 166, gapY: 108, gapH: 46, label: 'BILL' },
  ];
  return (
    <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
      <Defs />
      <clipPath id="swHeroClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>

      <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#swSky)"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

      <g clipPath="url(#swHeroClip)">
        <g className="sw-glow">
          <ellipse cx="100" cy="46" rx="96" ry="52" fill="rgba(255,180,120,0.16)" />
        </g>

        {/* Cloud bank */}
        <g fill="rgba(255,255,255,0.10)">
          <ellipse cx="42" cy="34" rx="20" ry="7" />
          <ellipse cx="150" cy="52" rx="24" ry="8" />
          <ellipse cx="96" cy="24" rx="16" ry="5.5" />
        </g>

        {/* Ridge */}
        <path d="M0 168 L26 146 L48 164 L74 140 L102 166 L130 144 L158 165 L186 146 L200 162 L200 190 L0 190 Z"
          fill="rgba(4,20,46,0.85)" />

        {/* Expense walls, scrolling */}
        <g className="sw-hero-scroll">
          {walls.concat(walls.map((w) => ({ ...w, x: w.x + 216 }))).map((w, i) => (
            <g key={i}>
              <rect x={w.x} y="-6" width="17" height={w.gapY - w.gapH / 2 + 6} fill="url(#swStone)"
                stroke="rgba(143,180,223,0.35)" strokeWidth="0.7" />
              <rect x={w.x - 1} y={w.gapY - w.gapH / 2 - 3} width="19" height="3" fill="#F2694C" />
              <rect x={w.x} y={w.gapY + w.gapH / 2} width="17" height={190 - (w.gapY + w.gapH / 2)} fill="url(#swStone)"
                stroke="rgba(143,180,223,0.35)" strokeWidth="0.7" />
              <rect x={w.x - 1} y={w.gapY + w.gapH / 2} width="19" height="3" fill="#F2694C" />
              <text x={w.x + 8.5} y={w.gapY + w.gapH / 2 + 26} fill="rgba(214,235,255,0.8)" fontSize="6"
                fontWeight="900" textAnchor="middle" fontFamily="'Poppins', sans-serif"
                transform={`rotate(-90 ${w.x + 8.5} ${w.gapY + w.gapH / 2 + 26})`}>
                {w.label}
              </text>
              <circle cx={w.x + 8.5} cy={w.gapY} r="4" fill="url(#swCoin)" />
            </g>
          ))}
        </g>

        {/* The glider, threading it */}
        <g className="sw-hero-fly">
          <Glider scale={1.15} shield />
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
        <h1 className="sw-title" style={{
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
          maxWidth: 312,
          lineHeight: 1.45,
        }}>
          Life&rsquo;s expenses keep coming &mdash; keep your cover airborne and glide through every one of them.
        </p>
      </div>

      <div className="sw-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <HeroSky />
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
            boxShadow: '0 6px 22px rgba(242,105,34,0.45)',
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

/* ─── How to play ────────────────────────────────────────── */
/**
 * Animation-first how-to-play. One looping scene runs the actual game: expense
 * pillars scroll in from the right, a hand taps, the glider gets its one fixed
 * lift and threads the slot, and the cover token rides in the gap. No prose.
 */

/** One expense gate — the paired stone pillars and the coin sitting in the slot. */
function DemoGate({ x, token }) {
  const GAP_T = 68;
  const GAP_B = 132;
  return (
    <g transform={`translate(${x},0)`}>
      <rect x="0" y="8" width="18" height={GAP_T - 8} fill="url(#swStone)" />
      <rect x="-2" y={GAP_T - 3} width="22" height="3.4" fill="#F2694C" />
      <rect x="0" y={GAP_B} width="18" height={192 - GAP_B} fill="url(#swStone)" />
      <rect x="-2" y={GAP_B - 0.4} width="22" height="3.4" fill="#F2694C" />
      {token === 'coin' && (
        <circle className="sw-demo-pulse" cx="9" cy="100" r="7" fill="url(#swCoin)"
          stroke="#B07B12" strokeWidth="1.2" />
      )}
      {token === 'shield' && (
        <g className="sw-demo-pulse" transform="translate(9,100)">
          <path d="M0 -10 l8 3 v6.2c0 5.1 -3.4 9 -8 11 c-4.6 -2 -8 -5.9 -8 -11 V-7z"
            fill="#3B8DD4" stroke="#BFE0FF" strokeWidth="1.4" />
          <path d="M-3.6 0.4 l2.5 2.5 l4.7 -5" fill="none" stroke="#fff" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
}

/** The tapping hand, drawn last so it stays legible over whatever scrolls past. */
function DemoHand() {
  return (
    <>
      <circle className="sw-demo-ring" cx="33" cy="152" r="10" fill="none"
        stroke={GOLD} strokeWidth="2.4" />
      <g className="sw-demo-press">
        <circle cx="17" cy="12" r="26" fill="rgba(5,26,58,0.55)" />
        <g transform="scale(0.92)">
          <path d="M13 21V7.6a3 3 0 0 1 6 0V18h1.6a3 3 0 0 1 3 3v.6l3.2 1.4a4 4 0 0 1 2.3 4.5l-1.2 5.6A5 5 0 0 1 23 37h-6.4a6 6 0 0 1-4.6-2.2l-5.6-6.9a2.8 2.8 0 0 1 3.9-4L13 26"
            fill="#FFFFFF" stroke="#051A3A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </g>
    </>
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
        background: 'rgba(5,26,58,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '18px 14px 16px',
        width: '100%',
        maxWidth: 344,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 23, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 12px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        {/* ── The looping demo: tap → lift → thread the slot ── */}
        <svg viewBox="0 0 300 200" width="100%" role="img"
          aria-label="A hand taps, the glider lifts, and it flies through the gap between two expense pillars."
          style={{ display: 'block', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)' }}>
          <Defs />
          <clipPath id="swDemoClip"><rect x="0" y="0" width="300" height="200" rx="15" /></clipPath>
          <g clipPath="url(#swDemoClip)">
            <rect x="0" y="0" width="300" height="200" fill="url(#swSky)" />
            {/* ceiling and floor — touching either ends the run */}
            <rect x="0" y="0" width="300" height="8" fill="#0B2B52" />
            <rect x="0" y="192" width="300" height="8" fill="#0B2B52" />
            <rect x="0" y="8" width="300" height="2" fill="rgba(242,105,34,0.5)" />
            <rect x="0" y="190" width="300" height="2" fill="rgba(242,105,34,0.5)" />

            {/* Expense gates scrolling in from the right, seamlessly */}
            <g className="sw-demo-scroll">
              <DemoGate x={150} token="coin" />
              <DemoGate x={300} token="shield" />
              <DemoGate x={450} token="coin" />
            </g>

            {/* The glider: one tap per bob, gravity does the rest */}
            <g className="sw-demo-fly">
              <Glider scale={1.05} />
            </g>

            <DemoHand />
          </g>
        </svg>

        {/* ── At most three icon-led labels ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, margin: '12px 2px 14px' }}>
          {[
            {
              color: GOLD, word: 'TAP TO LIFT',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.4" stroke={GOLD} strokeWidth="1.8" opacity="0.55" />
                  <circle cx="12" cy="12" r="3.6" fill={GOLD} />
                </svg>
              ),
            },
            {
              color: GREEN_LT, word: 'THREAD GAP',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="1.5" width="6" height="7" rx="1" fill={GREEN_LT} opacity="0.9" />
                  <rect x="9" y="15.5" width="6" height="7" rx="1" fill={GREEN_LT} opacity="0.9" />
                  <path d="M2 12h20" stroke={GREEN_LT} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              color: '#BFE0FF', word: 'COVER SAVES ONE',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2.6 4.6 5.4v6.1c0 5 3.3 8.6 7.4 10.3 4.1-1.7 7.4-5.3 7.4-10.3V5.4L12 2.6z"
                    fill={BLUE_LT} stroke="#BFE0FF" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="m8.8 12.1 2.2 2.2 4.4-4.6" fill="none" stroke="#fff" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
          ].map(({ color, word, icon }) => (
            <div key={word} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '7px 2px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}44`,
            }}>
              {icon}
              <span style={{ fontSize: 9.5, fontWeight: 900, color, letterSpacing: '0.03em', lineHeight: 1.15 }}>
                {word}
              </span>
            </div>
          ))}
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52, border: 'none', borderRadius: 12,
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `linear-gradient(180deg, ${BLUE_LT} 0%, ${BLUE_DK} 100%)`,
              boxShadow: '0 4px 16px rgba(0,91,172,0.45)',
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
  // The stats contract: {score, gates, coins, nearMisses}.
  const score = stats?.score || 0;
  const gates = stats?.gates || 0;
  const coins = stats?.coins || 0;
  const nearMisses = stats?.nearMisses || 0;
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
    const shareMessage = `Hi,\nI glided through ${gates} of ${cfg.gatesToWin} expense walls for ${score} points in the ${GAME_TITLE} challenge.\nThe bills keep coming either way - cover is what keeps you flying. Take the controls here: ${shareUrl}`.trim();

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
  const glowColor = won ? 'rgba(34,197,94,0.45)' : weak ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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
          background: won ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.18)',
          border: `1px solid ${won ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.45)'}`,
          marginBottom: 10,
        }}>
          {won ? <WingsIcon size={20} /> : <DownIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Cover stayed airborne' : 'Cover went down'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your flight.</span>
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
              {gates} of {cfg.gatesToWin} walls cleared
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, gates, coins, nearMisses} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Gates" value={`${gates}/${cfg.gatesToWin}`} accent={GREEN_LT} />
        <StatTile label="Coins" value={coins} accent={GOLD} />
        <StatTile label="Near misses" value={nearMisses} accent={ORANGE_LT} />
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: BLUE_LT, color: '#fff', fontWeight: 900,
          height: 50, borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(59,141,212,0.4)',
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
          School fees, medical bills, an EMI that moves &mdash; they arrive whether you are ready or not.
          A specialist can show you the cover that keeps your family flying through them.
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
          <span>{retryLabel || 'Fly again'}</span>
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
