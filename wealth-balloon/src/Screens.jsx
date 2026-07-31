// Screens.jsx — Home, How to Play, and Results screens for Wealth Balloon.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Wealth Balloon';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const SKY_LT = '#7FB6FF';
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

/** Run-ended mark: a balloon that went one beat too far. */
function ShortfallIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 10h24" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
      <path d="M10 26l4-6M22 26l-4-6M16 14v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 18l3-4-4-2M24 18l-3-4 4-2" stroke="#fff" strokeWidth="2.2"
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
@keyframes wbTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes wbFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes wbGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes wbChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes wbHeroGrow {
  0%      { transform: scale(0.42); }
  58%     { transform: scale(1); }
  74%     { transform: scale(1.05); }
  86%     { transform: scale(1.02); }
  100%    { transform: scale(0.42); }
}
@keyframes wbHeroWarm { 0%,52% { opacity: 0; } 78% { opacity: 1; } 100% { opacity: 0; } }
@keyframes wbHeroCount {
  0%   { transform: translateY(6px); opacity: 0.35; }
  60%  { transform: translateY(0);   opacity: 1; }
  100% { transform: translateY(6px); opacity: 0.35; }
}
@keyframes wbDrone { 0% { transform: translateX(-34px); } 100% { transform: translateX(214px); } }
@keyframes wbBeatHold { 0%,20% { transform: scale(0.5); } 70%,100% { transform: scale(1); } }
@keyframes wbBeatTell { 0%,45% { opacity: 0.15; } 70%,100% { opacity: 1; } }
@keyframes wbBeatShield { 0%,40% { opacity: 0.25; transform: scale(0.85); } 65%,100% { opacity: 1; transform: scale(1); } }
.wb-title { animation: wbTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.wb-float { animation: wbFloat 4s ease-in-out infinite; }
.wb-glow  { animation: wbGlow 2.2s ease-in-out infinite; }
.wb-chip  { animation: wbChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wb-hero-grow  { animation: wbHeroGrow 4.2s ease-in-out infinite; transform-origin: 100px 104px; }
.wb-hero-warm  { animation: wbHeroWarm 4.2s ease-in-out infinite; }
.wb-hero-count { animation: wbHeroCount 4.2s ease-in-out infinite; }
.wb-drone { animation: wbDrone 5.2s linear infinite; }
.wb-hold   { animation: wbBeatHold 2.4s ease-in-out infinite; transform-origin: 37px 38px; }
.wb-tell   { animation: wbBeatTell 2.4s ease-in-out infinite; }
.wb-shield { animation: wbBeatShield 2.4s ease-in-out infinite; transform-origin: 37px 32px; }

/* How-to-play demo. One 6.4s loop, two rounds of the real press-your-luck loop:
   round 1 banks on the wobble, round 2 pushes past it and the Term Shield pays
   half. Every transform is authored around its parent's origin, so no
   transform-box/transform-origin fiddling is needed. */
@keyframes wbDemoBody {
  0%,2%    { opacity: 0; }
  4%,31%   { opacity: 1; }
  35%,41%  { opacity: 0; }
  43%,71%  { opacity: 1; }
  74%,100% { opacity: 0; }
}
@keyframes wbDemoScale {
  0%,3%    { transform: scale(0.34); }
  26%      { transform: scale(0.95); }
  31%      { transform: scale(1.02); }
  34%      { transform: scale(1.12); }
  42%      { transform: scale(0.34); }
  68%      { transform: scale(1.18); }
  71%      { transform: scale(1.3); }
  73%      { transform: scale(1.55); }
  75%,100% { transform: scale(0.34); }
}
@keyframes wbDemoWarm {
  0%,10%   { opacity: 0; }
  24%,31%  { opacity: 1; }
  35%,49%  { opacity: 0; }
  60%,73%  { opacity: 1; }
  76%,100% { opacity: 0; }
}
@keyframes wbDemoHot {
  0%,60%   { opacity: 0; }
  68%,73%  { opacity: 1; }
  76%,100% { opacity: 0; }
}
@keyframes wbDemoWobble {
  0%,24%   { transform: translate(0,0) rotate(0deg); }
  26%      { transform: translate(-2.5px,0) rotate(-2.5deg); }
  28%      { transform: translate(2.5px,0) rotate(2.5deg); }
  30%      { transform: translate(-2px,0) rotate(-2deg); }
  32%,61%  { transform: translate(0,0) rotate(0deg); }
  63%      { transform: translate(-4px,0) rotate(-4.5deg); }
  65%      { transform: translate(4px,0) rotate(4.5deg); }
  67%      { transform: translate(-4px,0) rotate(-4.5deg); }
  69%      { transform: translate(4px,0) rotate(4.5deg); }
  71%      { transform: translate(-3px,0) rotate(-3.5deg); }
  73%,100% { transform: translate(0,0) rotate(0deg); }
}
@keyframes wbDemoFinger {
  0%,1%    { transform: translate(136px, 164px); }
  3%,31%   { transform: translate(136px, 173px); }
  33%,41%  { transform: translate(136px, 164px); }
  43%,73%  { transform: translate(136px, 173px); }
  76%,100% { transform: translate(136px, 164px); }
}
@keyframes wbDemoHoldRing {
  0%,2%    { opacity: 0; transform: scale(0.5); }
  6%       { opacity: 0.9; transform: scale(1); }
  29%      { opacity: 0.9; transform: scale(1.35); }
  33%,42%  { opacity: 0; transform: scale(0.5); }
  46%      { opacity: 0.9; transform: scale(1); }
  71%      { opacity: 0.9; transform: scale(1.35); }
  75%,100% { opacity: 0; transform: scale(0.5); }
}
@keyframes wbDemoValue {
  0%,3%    { transform: scaleY(0.06); }
  26%      { transform: scaleY(0.62); }
  31%      { transform: scaleY(0.66); }
  34%,42%  { transform: scaleY(0.06); }
  68%      { transform: scaleY(0.92); }
  73%      { transform: scaleY(1); }
  76%,100% { transform: scaleY(0.06); }
}
@keyframes wbDemoCoinA {
  0%,31%   { transform: translate(150px,108px) scale(0.15); opacity: 0; }
  34%      { transform: translate(150px,108px) scale(1);    opacity: 1; }
  42%      { transform: translate(44px,176px)  scale(0.85); opacity: 1; }
  45%,100% { transform: translate(44px,176px)  scale(0.85); opacity: 0; }
}
@keyframes wbDemoCoinB {
  0%,76%   { transform: translate(150px,108px) scale(0.12); opacity: 0; }
  79%      { transform: translate(150px,108px) scale(0.6);  opacity: 1; }
  88%      { transform: translate(44px,176px)  scale(0.52); opacity: 1; }
  91%,100% { transform: translate(44px,176px)  scale(0.52); opacity: 0; }
}
@keyframes wbDemoBurst {
  0%,71%   { opacity: 0; transform: scale(0.35); }
  73.5%    { opacity: 1; transform: scale(1); }
  80%,100% { opacity: 0; transform: scale(1.55); }
}
@keyframes wbDemoShield {
  0%,72%   { opacity: 0; transform: scale(0.5); }
  77%      { opacity: 1; transform: scale(1.14); }
  82%      { opacity: 1; transform: scale(1); }
  90%,100% { opacity: 0; transform: scale(1); }
}
@keyframes wbDemoVault {
  0%,40%   { opacity: 0.3; }
  44%      { opacity: 1; }
  50%,85%  { opacity: 0.3; }
  89%      { opacity: 1; }
  95%,100% { opacity: 0.3; }
}
.wb-demo-body    { animation: wbDemoBody 6.4s linear infinite; }
.wb-demo-scale   { animation: wbDemoScale 6.4s cubic-bezier(0.4,0,0.6,1) infinite; }
.wb-demo-warm    { animation: wbDemoWarm 6.4s linear infinite; }
.wb-demo-hot     { animation: wbDemoHot 6.4s linear infinite; }
.wb-demo-wobble  { animation: wbDemoWobble 6.4s linear infinite; }
.wb-demo-finger  { animation: wbDemoFinger 6.4s ease-out infinite; }
.wb-demo-ring    { animation: wbDemoHoldRing 6.4s ease-out infinite; }
.wb-demo-value   { animation: wbDemoValue 6.4s cubic-bezier(0.4,0,0.6,1) infinite; }
.wb-demo-coin-a  { animation: wbDemoCoinA 6.4s cubic-bezier(0.5,0,0.6,1) infinite; }
.wb-demo-coin-b  { animation: wbDemoCoinB 6.4s cubic-bezier(0.5,0,0.6,1) infinite; }
.wb-demo-burst   { animation: wbDemoBurst 6.4s ease-out infinite; }
.wb-demo-shield  { animation: wbDemoShield 6.4s cubic-bezier(0.22,1,0.36,1) infinite; }
.wb-demo-vault   { animation: wbDemoVault 6.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .wb-title, .wb-float, .wb-glow, .wb-chip, .wb-hero-grow, .wb-hero-warm,
  .wb-hero-count, .wb-drone, .wb-hold, .wb-tell, .wb-shield,
  .wb-demo-body, .wb-demo-scale, .wb-demo-warm, .wb-demo-hot, .wb-demo-wobble,
  .wb-demo-finger, .wb-demo-ring, .wb-demo-value, .wb-demo-coin-a,
  .wb-demo-coin-b, .wb-demo-burst, .wb-demo-shield,
  .wb-demo-vault { animation: none !important; }
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
 * Hero motif: the game itself — one balloon inflating past its tell (blue into
 * orange), the value counter climbing with it, and a needle drone crossing the
 * lane below. Same construction the canvas uses, so the screen previews the
 * game rather than illustrating it.
 */
function BalloonShape({ fill }) {
  return (
    <path
      d="M0,-60 C33,-60 46,-36 46,-14 C46,12 26,42 0,54 C-26,42 -46,12 -46,-14 C-46,-36 -33,-60 0,-60 Z"
      fill={fill}
    />
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
        <h1 className="wb-title" style={{
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
          Grow your wealth as far as you dare — and let a Term Shield absorb the one burst you never saw coming.
        </p>
      </div>

      <div className="wb-float" style={{ position: 'relative', width: 262, height: 234, zIndex: 1 }}>
        <svg width="262" height="234" viewBox="0 0 200 180" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="wbSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A1E42" />
              <stop offset="100%" stopColor="#061229" />
            </linearGradient>
            <radialGradient id="wbCalm" cx="0.34" cy="0.3" r="0.8">
              <stop offset="0%" stopColor="#7ABAFF" />
              <stop offset="52%" stopColor="#1E6BE0" />
              <stop offset="100%" stopColor="#002D7A" />
            </radialGradient>
            <radialGradient id="wbHot" cx="0.34" cy="0.3" r="0.8">
              <stop offset="0%" stopColor="#FFCD96" />
              <stop offset="52%" stopColor="#F26522" />
              <stop offset="100%" stopColor="#962C08" />
            </radialGradient>
            <clipPath id="wbClip"><rect x="4" y="4" width="192" height="172" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="172" rx="26" fill="url(#wbSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#wbClip)">
            <g className="wb-glow">
              <ellipse cx="100" cy="100" rx="86" ry="72" fill="rgba(38,102,196,0.22)" />
            </g>

            {/* Skyline: the goals the balloon is being inflated for. */}
            {[10, 30, 50, 70, 90, 110, 130, 150, 170].map((x, i) => (
              <rect key={x} x={x} y={146 - (i % 3) * 9} width="16" height={40 + (i % 3) * 9}
                rx="2" fill="rgba(6,18,41,0.85)" />
            ))}

            {/* Drone lane + drone */}
            <line x1="0" y1="140" x2="200" y2="140" stroke={DANGER} strokeWidth="1"
              strokeDasharray="4 7" opacity="0.35" />
            <g className="wb-drone">
              <rect x="-9" y="136" width="18" height="8" rx="3" fill="#2B3A50" stroke="rgba(214,228,247,0.45)" strokeWidth="0.8" />
              <line x1="9" y1="140" x2="21" y2="140" stroke="#D6E4F7" strokeWidth="1.6" />
              <circle cx="-3" cy="140" r="1.8" fill={DANGER} />
              <line x1="-6" y1="134" x2="-12" y2="130" stroke="rgba(214,228,247,0.4)" strokeWidth="1.2" />
              <line x1="6" y1="134" x2="12" y2="130" stroke="rgba(214,228,247,0.4)" strokeWidth="1.2" />
            </g>

            {/* The balloon, inflating past its tell */}
            <g className="wb-hero-grow">
              <g transform="translate(100,104)">
                <BalloonShape fill="url(#wbCalm)" />
                <g className="wb-hero-warm"><BalloonShape fill="url(#wbHot)" /></g>
                <ellipse cx="-16" cy="-24" rx="10" ry="15" fill="rgba(255,255,255,0.42)" transform="rotate(-28 -16 -24)" />
                <path d="M-5,54 L5,54 L2,62 L-2,62 Z" fill="#002D7A" />
              </g>
            </g>

            <text x="100" y="34" className="wb-hero-count" fill={GOLD_LT} fontSize="21" fontWeight="900"
              textAnchor="middle" fontFamily="'Poppins', sans-serif">68</text>
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
 * Animation-first how-to-play. One 6.4 s loop plays two real rounds:
 *   round 1  hold → the envelope grows and warms → the wobble arrives → let go
 *            → the round's value drops into the vault.
 *   round 2  hold → push past the wobble → burst → the Term Shield catches it
 *            and a half-size coin drops into the vault.
 * No prose: the curve, the tell, the bank and the cover are all shown.
 */

/** The envelope, drawn around its parent's origin so CSS scale works cleanly. */
function DemoBalloon() {
  const r = 40;
  return (
    <g className="wb-demo-scale">
      <ellipse cx="0" cy="0" rx={r} ry={r * 1.14} fill={BLUE_LT} />
      <ellipse className="wb-demo-warm" cx="0" cy="0" rx={r} ry={r * 1.14} fill={ORANGE} />
      <ellipse className="wb-demo-hot" cx="0" cy="0" rx={r} ry={r * 1.14} fill={DANGER} />
      <ellipse cx={-r * 0.34} cy={-r * 0.42} rx={r * 0.2} ry={r * 0.3} fill="rgba(255,255,255,0.5)" />
      <path d={`M${-r * 0.12},${r * 1.1} L${r * 0.12},${r * 1.1} L${r * 0.06},${r * 1.36} L${-r * 0.06},${r * 1.36} Z`}
        fill="#002D7A" />
    </g>
  );
}

/** A banked coin. Small = the half the Term Shield rescues. */
function DemoCoin({ cls }) {
  return (
    <g className={cls}>
      <circle cx="0" cy="0" r="11" fill={GOLD} stroke="#B07B12" strokeWidth="2" />
      <circle cx="-3" cy="-3.4" r="3" fill={GOLD_LT} />
      <path d="M0 -5.5 L0 5.5 M-3.6 -2 L3.6 -2" stroke="#8A5E0B" strokeWidth="2" strokeLinecap="round" />
    </g>
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

        {/* ── The looping demo: hold, read the wobble, bank — then the burst ── */}
        <svg viewBox="0 0 300 210" width="100%" role="img"
          aria-label="A finger holds to inflate the balloon until it wobbles, then lets go and the value drops into the vault; on the second round it holds too long, the balloon bursts and the Term Shield banks half."
          style={{ display: 'block', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
          <defs>
            <radialGradient id="wbDemoBg" cx="50%" cy="42%" r="70%">
              <stop offset="0%" stopColor="rgba(30,107,224,0.24)" />
              <stop offset="100%" stopColor="rgba(6,11,22,0.92)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="300" height="210" rx="15" fill="url(#wbDemoBg)" />

          {/* Value column: the 10·t^1.6 curve, shown as a rising gold gauge */}
          <rect x="272" y="38" width="14" height="134" rx="7" fill="rgba(255,255,255,0.08)" />
          <g transform="translate(279,172)">
            <rect className="wb-demo-value" x="-5" y="-132" width="10" height="132" rx="5" fill={GOLD} />
          </g>

          {/* The vault the banked value falls into */}
          <g transform="translate(44,176)">
            <rect className="wb-demo-vault" x="-27" y="-24" width="54" height="46" rx="10"
              fill={GREEN} stroke={GREEN_LT} strokeWidth="2.5" />
            <rect x="-13" y="-16" width="26" height="5" rx="2.5" fill="#062B12" opacity="0.7" />
            <circle cx="0" cy="4" r="9" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" />
            <path d="M0 -1.5 V9" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* The envelope, with its wobble tell */}
          <g transform="translate(150,108)">
            <g className="wb-demo-wobble">
              <g className="wb-demo-body">
                <DemoBalloon />
              </g>

              {/* Burst rays — round 2 only */}
              <g className="wb-demo-burst">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <path key={a} transform={`rotate(${a})`} d="M0 -22 L6 -40 L0 -62 L-6 -40 Z" fill={DANGER} />
                ))}
                <circle cx="0" cy="0" r="18" fill={ORANGE_LT} />
              </g>

              {/* The Term Shield that absorbs it */}
              <g className="wb-demo-shield">
                <path d="M0 -30 l22 8 v17 c0 14 -9 24 -22 30 c-13 -6 -22 -16 -22 -30 v-17 z"
                  fill="rgba(30,107,224,0.92)" stroke={SKY_LT} strokeWidth="2.4" />
                <path d="M-9 2 l7 7 l13 -14" fill="none" stroke="#fff" strokeWidth="3.6"
                  strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
          </g>

          {/* Banked value flying to the vault */}
          <DemoCoin cls="wb-demo-coin-a" />
          <DemoCoin cls="wb-demo-coin-b" />

          {/* The finger, held down for as long as the balloon is inflating */}
          <g className="wb-demo-finger">
            <g transform="translate(15,6)">
              <circle className="wb-demo-ring" cx="0" cy="0" r="17" fill="none"
                stroke={GOLD} strokeWidth="3" />
            </g>
            <path d="M13 21V7.6a3 3 0 0 1 6 0V18h1.6a3 3 0 0 1 3 3v.6l3.2 1.4a4 4 0 0 1 2.3 4.5l-1.2 5.6A5 5 0 0 1 23 37h-6.4a6 6 0 0 1-4.6-2.2l-5.6-6.9a2.8 2.8 0 0 1 3.9-4L13 26"
              fill="#FFFFFF" stroke="#0B1221" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        </svg>

        {/* ── At most three icon-led labels ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, margin: '12px 2px 14px' }}>
          {[
            {
              color: GOLD, word: 'HOLD TO GROW',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke={GOLD} strokeWidth="1.8" opacity="0.5" />
                  <circle cx="12" cy="12" r="4.6" fill={GOLD} />
                </svg>
              ),
            },
            {
              color: ORANGE_LT, word: 'WOBBLE = BANK',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <ellipse cx="12" cy="12" rx="5.4" ry="6.2" fill={ORANGE_LT} />
                  <path d="M3.4 7.4 Q1.4 12 3.4 16.6M20.6 7.4 Q22.6 12 20.6 16.6" stroke={ORANGE_LT}
                    strokeWidth="1.9" fill="none" strokeLinecap="round" opacity="0.85" />
                </svg>
              ),
            },
            {
              color: SKY_LT, word: 'COVER SAVES HALF',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2.6 4.6 5.4v6.1c0 5 3.3 8.6 7.4 10.3 4.1-1.7 7.4-5.3 7.4-10.3V5.4L12 2.6z"
                    fill={BLUE_LT} stroke={SKY_LT} strokeWidth="1.6" strokeLinejoin="round" />
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
  const rounds = stats?.rounds || 0;
  const bursts = stats?.bursts || 0;
  const bestRound = stats?.bestRound || 0;
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
    const shareMessage = `Hi,\nI banked ${score} in the ${GAME_TITLE} challenge with ${bursts} burst${bursts === 1 ? '' : 's'}.\nKnowing when to let go is the whole game - and cover is what rescues the one you get wrong. Take your run here: ${shareUrl}`.trim();

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
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s what you banked.</span>
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
              BANKED
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              target {RESULT_TARGET_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, rounds, bursts, bestRound} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Rounds played" value={`${rounds}/${GAME_CONFIG.rounds}`} accent={GOLD} />
        <StatTile label="Bursts" value={bursts} accent={bursts > 1 ? '#FF8B8B' : SKY_LT} />
        <StatTile label="Best round" value={bestRound} accent={GREEN_LT} />
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
          Real life only hands you a Term Shield if you arranged it first. A specialist can size yours in a few minutes.
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
