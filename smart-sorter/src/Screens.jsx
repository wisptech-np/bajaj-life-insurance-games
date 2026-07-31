// Screens.jsx — Home, How to Play, and Results screens for Smart Sorter.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Smart Sorter';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FF8A3D';
const GREEN = '#28A745';
const GREEN_LT = '#4ADE80';
const GOLD = '#FFC845';
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

/** Run-ended mark: a card that went over the end of the belt. */
function SpilledIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M3 18h26" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="9" y="21" width="15" height="9" rx="2" transform="rotate(14 9 21)"
        fill="#fff" opacity="0.85" />
      <path d="M8 10h14" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
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

/* ─── Family glyphs (the same three shape families the canvas draws) ─── */
function ShieldGlyph({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.6 4.6 5.4v6.1c0 5 3.3 8.6 7.4 10.3 4.1-1.7 7.4-5.3 7.4-10.3V5.4L12 2.6z"
        fill="rgba(255,255,255,0.16)" stroke={color} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="m8.8 12.1 2.2 2.2 4.4-4.6" fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartGlyph({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.4" y="13" width="4" height="7.4" rx="1.4" fill={color} />
      <rect x="10" y="9" width="4" height="11.4" rx="1.4" fill={color} opacity="0.85" />
      <rect x="16.6" y="4.6" width="4" height="15.8" rx="1.4" fill={color} />
    </svg>
  );
}

function HazardGlyph({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 22 20H2L12 3z" fill="rgba(255,255,255,0.16)" stroke={color}
        strokeWidth="1.9" strokeLinejoin="round" />
      <rect x="11" y="9" width="2" height="5.6" rx="1" fill={color} />
      <circle cx="12" cy="17" r="1.25" fill={color} />
    </svg>
  );
}

/* ─── Shared keyframes ───────────────────────────────────── */
const SCREEN_CSS = `
@keyframes ssTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes ssFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ssGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes ssChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes ssBeltA {
  0%      { transform: translateY(-38px); opacity: 0; }
  12%     { opacity: 1; }
  46%     { transform: translateY(84px); opacity: 1; }
  60%     { transform: translate(-92px, 92px) rotate(-22deg); opacity: 0; }
  100%    { transform: translate(-92px, 92px) rotate(-22deg); opacity: 0; }
}
@keyframes ssBeltB {
  0%,32%  { transform: translateY(-52px); opacity: 0; }
  44%     { opacity: 1; }
  78%     { transform: translateY(84px); opacity: 1; }
  92%,100%{ transform: translate(92px, 92px) rotate(22deg); opacity: 0; }
}
@keyframes ssTread { from { transform: translateY(0); } to { transform: translateY(18px); } }
@keyframes ssShelfL { 0%,52% { opacity: 0.4; } 62% { opacity: 1; } 80%,100% { opacity: 0.4; } }
@keyframes ssShelfR { 0%,84% { opacity: 0.4; } 92% { opacity: 1; } 100% { opacity: 0.4; } }
@keyframes ssSwipeL { 0%,25% { transform: translateX(14px); opacity: 0; } 40% { opacity: 1; } 70%,100% { transform: translateX(-20px); opacity: 0; } }
@keyframes ssSwipeR { 0%,25% { transform: translateX(-14px); opacity: 0; } 40% { opacity: 1; } 70%,100% { transform: translateX(20px); opacity: 0; } }
@keyframes ssSwipeD { 0%,25% { transform: translateY(-14px); opacity: 0; } 40% { opacity: 1; } 70%,100% { transform: translateY(18px); opacity: 0; } }
.ss-title { animation: ssTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-float { animation: ssFloat 4s ease-in-out infinite; }
.ss-glow  { animation: ssGlow 2.2s ease-in-out infinite; }
.ss-chip  { animation: ssChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-belt-a { animation: ssBeltA 3.6s cubic-bezier(0.4,0,0.6,1) infinite; }
.ss-belt-b { animation: ssBeltB 3.6s cubic-bezier(0.4,0,0.6,1) infinite; }
.ss-tread  { animation: ssTread 0.9s linear infinite; }
.ss-shelf-l { animation: ssShelfL 3.6s ease-in-out infinite; }
.ss-shelf-r { animation: ssShelfR 3.6s ease-in-out infinite; }
.ss-swipe-l { animation: ssSwipeL 2.2s ease-in-out infinite; }
.ss-swipe-r { animation: ssSwipeR 2.2s ease-in-out infinite; }
.ss-swipe-d { animation: ssSwipeD 2.2s ease-in-out infinite; }

/* How-to-play demo: one 6s loop, three cards, three real swipes. */
@keyframes ssDemoCardL {
  0%       { transform: translate(0,-48px) rotate(0deg); opacity: 0; }
  4%       { transform: translate(0,-30px) rotate(0deg); opacity: 1; }
  16%      { transform: translate(0, 62px) rotate(0deg); opacity: 1; }
  23%      { transform: translate(0, 62px) rotate(0deg); opacity: 1; }
  31%      { transform: translate(-108px, 74px) rotate(-24deg); opacity: 0; }
  100%     { transform: translate(-108px, 74px) rotate(-24deg); opacity: 0; }
}
@keyframes ssDemoCardR {
  0%       { transform: translate(0,-48px) rotate(0deg); opacity: 0; }
  4%       { transform: translate(0,-30px) rotate(0deg); opacity: 1; }
  16%      { transform: translate(0, 62px) rotate(0deg); opacity: 1; }
  23%      { transform: translate(0, 62px) rotate(0deg); opacity: 1; }
  31%      { transform: translate(108px, 74px) rotate(24deg); opacity: 0; }
  100%     { transform: translate(108px, 74px) rotate(24deg); opacity: 0; }
}
@keyframes ssDemoCardD {
  0%       { transform: translate(0,-48px) scale(1); opacity: 0; }
  4%       { transform: translate(0,-30px) scale(1); opacity: 1; }
  16%      { transform: translate(0, 62px) scale(1); opacity: 1; }
  23%      { transform: translate(0, 62px) scale(1); opacity: 1; }
  31%      { transform: translate(0, 152px) scale(0.72); opacity: 0; }
  100%     { transform: translate(0, 152px) scale(0.72); opacity: 0; }
}
@keyframes ssDemoFingerL {
  0%,14%   { transform: translate(10px, 78px) scale(0.7); opacity: 0; }
  18%      { transform: translate(10px, 78px) scale(1);   opacity: 1; }
  23%      { transform: translate(10px, 78px) scale(0.86); opacity: 1; }
  31%      { transform: translate(-92px, 90px) scale(0.86); opacity: 1; }
  36%,100% { transform: translate(-92px, 90px) scale(0.86); opacity: 0; }
}
@keyframes ssDemoFingerR {
  0%,14%   { transform: translate(10px, 78px) scale(0.7); opacity: 0; }
  18%      { transform: translate(10px, 78px) scale(1);   opacity: 1; }
  23%      { transform: translate(10px, 78px) scale(0.86); opacity: 1; }
  31%      { transform: translate(96px, 90px) scale(0.86); opacity: 1; }
  36%,100% { transform: translate(96px, 90px) scale(0.86); opacity: 0; }
}
@keyframes ssDemoFingerD {
  0%,14%   { transform: translate(10px, 78px) scale(0.7); opacity: 0; }
  18%      { transform: translate(10px, 78px) scale(1);   opacity: 1; }
  23%      { transform: translate(10px, 78px) scale(0.86); opacity: 1; }
  31%      { transform: translate(10px, 158px) scale(0.86); opacity: 1; }
  36%,100% { transform: translate(10px, 158px) scale(0.86); opacity: 0; }
}
@keyframes ssDemoHit {
  0%,26%   { opacity: 0.34; transform: scale(1); }
  32%      { opacity: 1;    transform: scale(1.16); }
  42%,100% { opacity: 0.34; transform: scale(1); }
}
.ss-demo-card-l { animation: ssDemoCardL 6s cubic-bezier(0.4,0,0.5,1) 0s   infinite both; }
.ss-demo-card-r { animation: ssDemoCardR 6s cubic-bezier(0.4,0,0.5,1) 2s   infinite both; }
.ss-demo-card-d { animation: ssDemoCardD 6s cubic-bezier(0.4,0,0.5,1) 4s   infinite both; }
.ss-demo-fin-l  { animation: ssDemoFingerL 6s cubic-bezier(0.4,0,0.5,1) 0s infinite both; }
.ss-demo-fin-r  { animation: ssDemoFingerR 6s cubic-bezier(0.4,0,0.5,1) 2s infinite both; }
.ss-demo-fin-d  { animation: ssDemoFingerD 6s cubic-bezier(0.4,0,0.5,1) 4s infinite both; }
.ss-demo-hit-l  { animation: ssDemoHit 6s ease-in-out 0s infinite both; }
.ss-demo-hit-r  { animation: ssDemoHit 6s ease-in-out 2s infinite both; }
.ss-demo-hit-d  { animation: ssDemoHit 6s ease-in-out 4s infinite both; }
@media (prefers-reduced-motion: reduce) {
  .ss-title, .ss-float, .ss-glow, .ss-chip, .ss-belt-a, .ss-belt-b, .ss-tread,
  .ss-shelf-l, .ss-shelf-r, .ss-swipe-l, .ss-swipe-r, .ss-swipe-d,
  .ss-demo-card-l, .ss-demo-card-r, .ss-demo-card-d,
  .ss-demo-fin-l, .ss-demo-fin-r, .ss-demo-fin-d,
  .ss-demo-hit-l, .ss-demo-hit-r, .ss-demo-hit-d { animation: none !important; }
}
`;

/** Pointing-hand cursor used by every how-to-play demo. */
function FingerGlyph({ size = 34 }) {
  return (
    <svg width={size} height={size * 1.18} viewBox="0 0 34 40" fill="none" aria-hidden="true">
      <path d="M13 21V7.6a3 3 0 0 1 6 0V18h1.6a3 3 0 0 1 3 3v.6l3.2 1.4a4 4 0 0 1 2.3 4.5l-1.2 5.6A5 5 0 0 1 23 37h-6.4a6 6 0 0 1-4.6-2.2l-5.6-6.9a2.8 2.8 0 0 1 3.9-4L13 26"
        fill="#FFFFFF" stroke="#0B1221" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="16" cy="4" r="3.2" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.55" />
    </svg>
  );
}

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GREEN_LT, ORANGE_LT, BLUE_LT, BLUE, GREEN, '#EC4899'];
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
 * Hero motif: the belt itself — two shelves, a bin, scrolling treads and two
 * cards riding down and peeling off to left and right. Same construction the
 * canvas uses, so the screen previews the game rather than illustrating it.
 */
/* Badge marks drawn as plain paths in the hero's own coordinate space. They are
   deliberately not the <svg>-wrapped glyph components above: a nested <svg>
   inside the clipped hero would establish a second viewport, and getting a
   14 px mark to land inside a 20 px badge through two transforms and a nested
   viewport is exactly the kind of thing that renders differently per browser. */
const HERO_MARK = {
  protect: (
    <g fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      <path d="M-20 -6.6 -14.6 -4.6v4.4c0 3.6-2.4 6.2-5.4 7.4-3-1.2-5.4-3.8-5.4-7.4v-4.4L-20 -6.6z"
        fill="rgba(255,255,255,0.2)" />
      <path d="m-22.3 -0.2 1.6 1.6 3.2-3.3" />
    </g>
  ),
  grow: (
    <g fill="#fff">
      <rect x="-25.6" y="0.4" width="3.1" height="5.6" rx="1.1" />
      <rect x="-21.5" y="-2.6" width="3.1" height="8.6" rx="1.1" opacity="0.85" />
      <rect x="-17.4" y="-5.8" width="3.1" height="11.8" rx="1.1" />
    </g>
  ),
  bin: (
    <g fill="#fff">
      <path d="M-20 -6.4 -13.6 5.6h-12.8L-20 -6.4z" fill="rgba(255,255,255,0.22)"
        stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="-20.7" y="-2.4" width="1.5" height="4" rx="0.7" />
      <circle cx="-20" cy="3.1" r="0.95" />
    </g>
  ),
};

function HeroCard({ className, y, family, color, colorLt }) {
  return (
    <g className={className} transform={`translate(0 ${y})`}>
      <rect x="-42" y="-15" width="84" height="30" rx="7"
        fill="#12213F" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <rect x="-42" y="-15" width="5" height="30" rx="2.5" fill={colorLt} />
      <rect x="-30" y="-10" width="20" height="20" rx="6" fill={color} />
      {HERO_MARK[family]}
      <rect x="-4" y="-7" width="34" height="4.4" rx="2.2" fill="rgba(255,255,255,0.75)" />
      <rect x="-4" y="1" width="24" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
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
        <h1 className="ss-title" style={{
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
          Protect it, grow it, or bin it &mdash; sort your money life before it scrolls past you.
        </p>
      </div>

      <div className="ss-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="ssSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A1E42" />
              <stop offset="100%" stopColor="#061229" />
            </linearGradient>
            <clipPath id="ssClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#ssSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#ssClip)">
            <g className="ss-glow">
              <ellipse cx="100" cy="96" rx="86" ry="74" fill="rgba(38,102,196,0.2)" />
            </g>

            {/* Belt lane + scrolling treads */}
            <rect x="62" y="4" width="76" height="150" fill="rgba(255,255,255,0.05)" />
            <g className="ss-tread">
              {[0, 18, 36, 54, 72, 90, 108, 126, 144].map((y) => (
                <line key={y} x1="68" y1={y - 18} x2="132" y2={y - 18}
                  stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              ))}
            </g>
            <line x1="62" y1="4" x2="62" y2="154" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
            <line x1="138" y1="4" x2="138" y2="154" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />

            {/* Sorting head */}
            <rect x="62" y="96" width="76" height="58" fill="rgba(255,255,255,0.07)" />
            <path d="M66 112V100h12M134 112V100h-12" fill="none" stroke="rgba(255,255,255,0.5)"
              strokeWidth="2" strokeLinecap="round" />

            {/* Protect shelf */}
            <g className="ss-shelf-l">
              <rect x="8" y="88" width="48" height="66" rx="10" fill="rgba(0,61,166,0.35)"
                stroke="rgba(30,107,224,0.7)" strokeWidth="1.2" />
              <path d="M20 104l-8 7 8 7z" fill={BLUE_LT} />
              <text x="32" y="132" fill="#fff" fontSize="9" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">PROTECT</text>
            </g>

            {/* Grow shelf */}
            <g className="ss-shelf-r">
              <rect x="144" y="88" width="48" height="66" rx="10" fill="rgba(40,167,69,0.32)"
                stroke="rgba(74,222,128,0.7)" strokeWidth="1.2" />
              <path d="M180 104l8 7-8 7z" fill={GREEN_LT} />
              <text x="168" y="132" fill="#fff" fontSize="10" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">GROW</text>
            </g>

            {/* Bin strip */}
            <rect x="8" y="160" width="184" height="24" rx="9" fill="rgba(242,101,34,0.28)"
              stroke="rgba(255,138,61,0.65)" strokeWidth="1.2" />
            <path d="M92 166l8 8 8-8z" fill={ORANGE_LT} />
            <text x="100" y="181" fill="#fff" fontSize="8.5" fontWeight="900" textAnchor="middle"
              fontFamily="'Poppins', sans-serif">BIN</text>

            <g transform="translate(100 0)">
              <HeroCard className="ss-belt-a" y={40} family="protect" color={BLUE} colorLt={BLUE_LT} />
              <HeroCard className="ss-belt-b" y={40} family="grow" color={GREEN} colorLt={GREEN_LT} />
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

/* ─── How to play ────────────────────────────────────────── */
/**
 * Animation-first how-to-play. One 6s loop runs the real mechanic three times:
 * a card rides the belt down to the sorting head, a finger grabs it and swipes
 * it onto Protect (left), Grow (right) or Bin (down). No instruction prose.
 */
const DEMO_H = 208;

/** A belt card: the family glyph on the same rounded plate the canvas draws. */
function DemoCard({ cls, Glyph, tint }) {
  return (
    <div
      className={cls}
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        marginLeft: -41,
        width: 82,
        height: 54,
        borderRadius: 13,
        background: 'linear-gradient(180deg, #FFFFFF 0%, #DCE6F5 100%)',
        border: `2px solid ${tint}`,
        boxShadow: `0 6px 16px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.6)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <Glyph size={26} color={tint} />
      <span style={{ display: 'block', width: 22, height: 4, borderRadius: 2, background: `${tint}55` }} />
    </div>
  );
}

/** A shelf tile at the edge of the belt; flashes when its card lands. */
function DemoShelf({ side, cls, Glyph, color, colorLt }) {
  const edge = side === 'bottom'
    ? { left: '50%', marginLeft: -23, bottom: 4 }
    : { [side]: 2, top: 56 };
  return (
    <div
      className={cls}
      style={{
        position: 'absolute',
        ...edge,
        width: 46,
        height: 46,
        borderRadius: 14,
        background: `linear-gradient(180deg, ${colorLt}, ${color})`,
        border: '2px solid rgba(255,255,255,0.8)',
        boxShadow: `0 0 18px ${colorLt}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Glyph size={24} color="#fff" />
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
        padding: '18px 14px 16px',
        width: '100%',
        maxWidth: 340,
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

        {/* ── The looping demo: belt → head → swipe → shelf ── */}
        <div style={{
          position: 'relative',
          height: DEMO_H,
          borderRadius: 18,
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at 50% 40%, rgba(30,107,224,0.22), rgba(6,11,22,0.9) 74%), #060B16',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {/* Belt lane with scrolling treads */}
          <div style={{
            position: 'absolute', left: '50%', marginLeft: -52, top: 0, bottom: 0, width: 104,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
            borderLeft: '3px solid rgba(255,255,255,0.22)',
            borderRight: '3px solid rgba(255,255,255,0.22)',
            overflow: 'hidden',
          }}>
            <div className="ss-tread" style={{
              position: 'absolute', left: 0, right: 0, top: -18, height: DEMO_H + 36,
              backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 18px)',
            }} />
          </div>

          {/* Sorting head: the bracket the card must reach before it can be swiped */}
          <div style={{
            position: 'absolute', left: '50%', marginLeft: -58, top: 58, width: 116, height: 62,
            border: `2px dashed ${GOLD}`, borderRadius: 12, opacity: 0.75,
          }} />

          {/* Shelves + bin */}
          <DemoShelf side="left"   cls="ss-demo-hit-l" Glyph={ShieldGlyph} color={BLUE}   colorLt={BLUE_LT} />
          <DemoShelf side="right"  cls="ss-demo-hit-r" Glyph={ChartGlyph}  color={GREEN}  colorLt={GREEN_LT} />
          <DemoShelf side="bottom" cls="ss-demo-hit-d" Glyph={HazardGlyph} color={ORANGE} colorLt={ORANGE_LT} />

          {/* Cards riding the belt */}
          <DemoCard cls="ss-demo-card-l" Glyph={ShieldGlyph} tint={BLUE} />
          <DemoCard cls="ss-demo-card-r" Glyph={ChartGlyph}  tint={GREEN} />
          <DemoCard cls="ss-demo-card-d" Glyph={HazardGlyph} tint={ORANGE} />

          {/* The finger doing the real swipe */}
          {['ss-demo-fin-l', 'ss-demo-fin-r', 'ss-demo-fin-d'].map((c) => (
            <div key={c} className={c} style={{ position: 'absolute', left: '50%', top: 0 }}>
              <FingerGlyph size={32} />
            </div>
          ))}
        </div>

        {/* ── At most three icon-led labels ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, margin: '12px 2px 14px' }}>
          {[
            { Glyph: ShieldGlyph, color: BLUE_LT, arrow: '←', word: 'PROTECT' },
            { Glyph: ChartGlyph, color: GREEN_LT, arrow: '→', word: 'GROW' },
            { Glyph: HazardGlyph, color: ORANGE_LT, arrow: '↓', word: 'BIN' },
          ].map(({ Glyph, color, arrow, word }) => (
            <div key={word} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '7px 2px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}44`,
            }}>
              <Glyph size={20} color={color} />
              <span style={{ fontSize: 11, fontWeight: 900, color, letterSpacing: '0.04em' }}>
                {arrow} {word}
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
  const score = stats?.score || 0;
  const sorted = stats?.sorted || 0;
  const bestCombo = stats?.bestCombo || 0;
  const mistakes = stats?.mistakes || 0;
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
    const shareMessage = `Hi,\nI sorted ${sorted} money decisions for ${score} points in the ${GAME_TITLE} challenge.\nProtect it, grow it, or bin it - see how fast you can call it: ${shareUrl}`.trim();

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
          {won ? <TrophyIcon size={20} /> : <SpilledIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Belt cleared' : 'Belt got away'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your sorting run.</span>
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
              target {RESULT_TARGET_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, sorted, bestCombo, mistakes} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Sorted" value={sorted} accent={BLUE_LT} />
        <StatTile label="Best combo" value={bestCombo} accent={GREEN_LT} />
        <StatTile label="Mistakes" value={`${mistakes}/${GAME_CONFIG.mistakes.allowed}`} accent={mistakes > 0 ? DANGER : GREEN_LT} />
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
          Real money decisions arrive just as fast. A specialist can help you put the
          protect-and-grow half on autopilot.
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
