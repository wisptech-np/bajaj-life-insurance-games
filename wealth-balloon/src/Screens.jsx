// Screens.jsx — Home, How to Play, and Results screens for Wealth Balloon.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { RESULT_TARGET_SCORE } from './data.js';

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
.wb-title { animation: wbTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.wb-float { animation: wbFloat 4s ease-in-out infinite; }
.wb-glow  { animation: wbGlow 2.2s ease-in-out infinite; }

/* Home hero: the middle goal fills toward its ring while a shock is forecast
   on it and cover snaps in. Same three beats the game opens with. */
@keyframes wbHeroFill  { 0%,4% { transform: scale(0.22); } 62% { transform: scale(0.86); } 86%,100% { transform: scale(1); } }
@keyframes wbHeroBadge { 0%,26% { opacity: 0; } 34%,66% { opacity: 1; } 72%,100% { opacity: 0; } }
@keyframes wbHeroRing  { 0%,58% { opacity: 0; transform: scale(0.8); } 66% { opacity: 1; transform: scale(1); } 92%,100% { opacity: 1; transform: scale(1); } }
.wb-hero-fill  { animation: wbHeroFill 5.2s cubic-bezier(0.4,0,0.5,1) infinite; }
.wb-hero-badge { animation: wbHeroBadge 5.2s linear infinite; }
.wb-hero-ring  { animation: wbHeroRing 5.2s cubic-bezier(0.22,1,0.36,1) infinite; }

/* How-to-play demo. One 7 s loop plays the whole decision:
   hold the goal that is due -> a shock is forecast with its exact cost ->
   the cost beats the premium so cover is bought -> the shock is absorbed ->
   funding resumes and the goal lands. Nothing is narrated; it is all shown. */
@keyframes wbDemoFill {
  0%,3%    { transform: scale(0.18); }
  32%      { transform: scale(0.70); }
  52%      { transform: scale(0.70); }
  80%      { transform: scale(1); }
  92%,100% { transform: scale(0.18); }
}
@keyframes wbDemoDone   { 0%,79% { opacity: 0; } 82%,91% { opacity: 1; } 93%,100% { opacity: 0; } }
@keyframes wbDemoBadge  { 0%,20% { opacity: 0; } 25%,53% { opacity: 1; } 56%,100% { opacity: 0; } }
@keyframes wbDemoRing   { 0%,41% { opacity: 0; } 44%,54% { opacity: 1; } 58%,100% { opacity: 0; } }
@keyframes wbDemoBtn    { 0%,38% { opacity: 0.35; } 42%,54% { opacity: 1; } 58%,100% { opacity: 0.35; } }
@keyframes wbDemoShock  { 0%,53% { opacity: 0; transform: scale(0.4); } 56% { opacity: 1; transform: scale(1); } 63%,100% { opacity: 0; transform: scale(1.5); } }
@keyframes wbDemoSaved  { 0%,55% { opacity: 0; transform: translateY(0); } 59% { opacity: 1; transform: translateY(-6px); } 70%,100% { opacity: 0; transform: translateY(-14px); } }
@keyframes wbDemoGain   { 0%,80% { opacity: 0; transform: translateY(0); } 84% { opacity: 1; transform: translateY(-7px); } 93%,100% { opacity: 0; transform: translateY(-16px); } }
@keyframes wbDemoFinger {
  0%,2%    { transform: translate(140px, 96px); }
  6%,33%   { transform: translate(140px, 104px); }
  38%,40%  { transform: translate(140px, 158px); }
  42%,44%  { transform: translate(140px, 166px); }
  48%,52%  { transform: translate(140px, 158px); }
  57%,79%  { transform: translate(140px, 104px); }
  84%,100% { transform: translate(140px, 96px); }
}
@keyframes wbDemoIncome { 0%,3% { width: 92px; } 33% { width: 30px; } 41% { width: 46px; } 44% { width: 18px; } 78% { width: 8px; } 92%,100% { width: 92px; } }
.wb-demo-fill   { animation: wbDemoFill 7s cubic-bezier(0.4,0,0.5,1) infinite; }
.wb-demo-done   { animation: wbDemoDone 7s linear infinite; }
.wb-demo-badge  { animation: wbDemoBadge 7s linear infinite; }
.wb-demo-ring   { animation: wbDemoRing 7s linear infinite; }
.wb-demo-btn    { animation: wbDemoBtn 7s linear infinite; }
.wb-demo-shock  { animation: wbDemoShock 7s ease-out infinite; }
.wb-demo-saved  { animation: wbDemoSaved 7s ease-out infinite; }
.wb-demo-gain   { animation: wbDemoGain 7s ease-out infinite; }
.wb-demo-finger { animation: wbDemoFinger 7s cubic-bezier(0.3,0,0.3,1) infinite; }
.wb-demo-income { animation: wbDemoIncome 7s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .wb-title, .wb-float, .wb-glow,
  .wb-hero-fill, .wb-hero-badge, .wb-hero-ring,
  .wb-demo-fill, .wb-demo-done, .wb-demo-badge, .wb-demo-ring, .wb-demo-btn,
  .wb-demo-shock, .wb-demo-saved, .wb-demo-gain, .wb-demo-finger,
  .wb-demo-income { animation: none !important; }
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
 * Hero motif: the game itself. Three goals inflating toward their dashed
 * targets, a shock forecast on the middle one with the exact money it would
 * take, and cover snapping in to stop it. The screen previews the decision the
 * game is about rather than illustrating a balloon.
 */
function BalloonShape({ fill, r = 30 }) {
  return (
    <>
      <path
        d={`M0,${-r} C${r * 0.72},${-r} ${r},${-r * 0.6} ${r},${-r * 0.22}
            C${r},${r * 0.24} ${r * 0.56},${r * 0.76} 0,${r}
            C${-r * 0.56},${r * 0.76} ${-r},${r * 0.24} ${-r},${-r * 0.22}
            C${-r},${-r * 0.6} ${-r * 0.72},${-r} 0,${-r} Z`}
        fill={fill}
      />
      <ellipse cx={-r * 0.34} cy={-r * 0.38} rx={r * 0.17} ry={r * 0.26}
        fill="rgba(255,255,255,0.42)" transform={`rotate(-28 ${-r * 0.34} ${-r * 0.38})`} />
      <path d={`M${-r * 0.1},${r} L${r * 0.1},${r} L0,${r * 1.24} Z`} fill="#002D7A" />
    </>
  );
}

/** One hero column: dashed target ring, the balloon inside it, a name strip. */
function HeroGoal({ x, fill, scale, ring = 30, label, fillClass }) {
  return (
    <g transform={`translate(${x},96)`}>
      <circle cx="0" cy="0" r={ring} fill="none" stroke="rgba(255,255,255,0.34)"
        strokeWidth="1.4" strokeDasharray="4 4" />
      <g className={fillClass} transform={fillClass ? undefined : `scale(${scale})`}>
        <BalloonShape fill={fill} r={ring} />
      </g>
      <text x="0" y={ring + 18} fill="rgba(255,255,255,0.6)" fontSize="8" fontWeight="900"
        textAnchor="middle" fontFamily="'Poppins', sans-serif">{label}</text>
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
          Three goals, one income, and shocks you can see coming. Fund what is due — and cover what you cannot afford to lose.
        </p>
      </div>

      <div className="wb-float" style={{ position: 'relative', width: 268, height: 224, zIndex: 1 }}>
        <svg width="268" height="224" viewBox="0 0 210 176" style={{ overflow: 'visible' }} aria-hidden="true">
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
            <clipPath id="wbClip"><rect x="4" y="4" width="202" height="168" rx="24" /></clipPath>
          </defs>

          <rect x="4" y="4" width="202" height="168" rx="24" fill="url(#wbSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#wbClip)">
            <g className="wb-glow"><ellipse cx="105" cy="96" rx="92" ry="70" fill="rgba(38,102,196,0.2)" /></g>

            {/* Income — the one scarce resource everything competes for */}
            <rect x="16" y="20" width="178" height="10" rx="5" fill="rgba(255,255,255,0.1)" />
            <rect x="16" y="20" width="104" height="10" rx="5" fill={GOLD} />
            <text x="22" y="27.5" fill="#0B1221" fontSize="6.6" fontWeight="900"
              fontFamily="'Poppins', sans-serif">INCOME</text>

            <HeroGoal x={44} fill="url(#wbCalm)" scale={0.52} ring={26} label="HOME" />
            <HeroGoal x={105} fill="url(#wbCalm)" ring={30} label="CHILD&rsquo;S FEES" fillClass="wb-hero-fill" />
            <HeroGoal x={166} fill="url(#wbCalm)" scale={0.38} ring={26} label="RETIREMENT" />

            {/* Cover snapping onto the goal under threat */}
            <circle className="wb-hero-ring" cx="105" cy="96" r="36" fill="none"
              stroke={BLUE_LT} strokeWidth="3" />

            {/* The forecast, with the exact money it would take */}
            <g className="wb-hero-badge" transform="translate(105,50)">
              <rect x="-30" y="-13" width="60" height="26" rx="8" fill="rgba(239,68,68,0.94)"
                stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <text x="0" y="-2" fill="#fff" fontSize="12" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">-96</text>
              <text x="0" y="8" fill="rgba(255,255,255,0.9)" fontSize="6.6" fontWeight="800"
                textAnchor="middle" fontFamily="'Poppins', sans-serif">55%  in 2.4s</text>
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

/* ─── How to play ──────────────────────────────── */
/**
 * Animation-first how-to-play. One 7 s loop plays the whole decision once:
 *   hold the goal that is due -> a shock is forecast with its exact cost ->
 *   the cost (96) beats the premium (28), so cover is bought -> the shock is
 *   absorbed -> funding resumes and the goal lands.
 * The arithmetic is on screen the entire time; no sentence has to explain it.
 * The live game then re-teaches the same three beats with its coach overlay,
 * which advances only when the player actually does the thing.
 */
function DemoGoal({ x, ring, scale, label, fillClass }) {
  return (
    <g transform={`translate(${x},104)`}>
      <circle cx="0" cy="0" r={ring} fill="none" stroke="rgba(255,255,255,0.32)"
        strokeWidth="1.3" strokeDasharray="4 4" />
      <g className={fillClass} transform={fillClass ? undefined : `scale(${scale})`}>
        <BalloonShape fill="url(#wbCalmB)" r={ring} />
      </g>
      {fillClass && (
        <g className="wb-demo-done">
          <BalloonShape fill="url(#wbDone)" r={ring} />
        </g>
      )}
      <text x="0" y={ring + 15} fill="rgba(255,255,255,0.55)" fontSize="7.5" fontWeight="900"
        textAnchor="middle" fontFamily="'Poppins', sans-serif">{label}</text>
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

        {/* -- The looping demo: fund, read the forecast, cover, land it -- */}
        <svg viewBox="0 0 280 200" width="100%" role="img"
          aria-label="A finger holds the middle goal to fund it. A red badge forecasts a shock costing 96. Because 96 is more than the 28 premium, the finger taps Cover, the shock is absorbed, and the goal is funded."
          style={{ display: 'block', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
          <defs>
            <radialGradient id="wbDemoBg" cx="50%" cy="42%" r="72%">
              <stop offset="0%" stopColor="rgba(30,107,224,0.24)" />
              <stop offset="100%" stopColor="rgba(6,11,22,0.94)" />
            </radialGradient>
            <radialGradient id="wbCalmB" cx="0.34" cy="0.3" r="0.8">
              <stop offset="0%" stopColor="#7ABAFF" />
              <stop offset="52%" stopColor="#1E6BE0" />
              <stop offset="100%" stopColor="#002D7A" />
            </radialGradient>
            <radialGradient id="wbDone" cx="0.34" cy="0.3" r="0.8">
              <stop offset="0%" stopColor="#D6FFD6" />
              <stop offset="52%" stopColor="#28A745" />
              <stop offset="100%" stopColor="#0C4E20" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="280" height="200" rx="15" fill="url(#wbDemoBg)" />

          {/* Income drains as you fund and as you pay the premium */}
          <rect x="14" y="14" width="180" height="9" rx="4.5" fill="rgba(255,255,255,0.1)" />
          <rect className="wb-demo-income" x="14" y="14" width="92" height="9" rx="4.5" fill={GOLD} />
          <text x="200" y="21.5" fill="rgba(255,255,255,0.6)" fontSize="8" fontWeight="900"
            fontFamily="'Poppins', sans-serif">INCOME</text>

          <DemoGoal x={52} ring={22} scale={0.5} label="HOME" />
          <DemoGoal x={140} ring={30} label="CHILD&rsquo;S FEES" fillClass="wb-demo-fill" />
          <DemoGoal x={228} ring={22} scale={0.34} label="RETIREMENT" />

          {/* Cover ring on the goal under threat */}
          <circle className="wb-demo-ring" cx="140" cy="104" r="36" fill="none"
            stroke={BLUE_LT} strokeWidth="3" />

          {/* The forecast: which goal, how bad, and what it costs in money */}
          <g className="wb-demo-badge" transform="translate(140,52)">
            <rect x="-31" y="-13" width="62" height="26" rx="8" fill="rgba(239,68,68,0.94)"
              stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <text x="0" y="-2.5" fill="#fff" fontSize="12.5" fontWeight="900" textAnchor="middle"
              fontFamily="'Poppins', sans-serif">-96</text>
            <text x="0" y="8" fill="rgba(255,255,255,0.9)" fontSize="6.8" fontWeight="800"
              textAnchor="middle" fontFamily="'Poppins', sans-serif">55%  in 2.4s</text>
          </g>

          {/* The shock landing, and the money cover kept */}
          <g className="wb-demo-shock" transform="translate(140,104)">
            {[0, 60, 120, 180, 240, 300].map((ang) => (
              <path key={ang} transform={`rotate(${ang})`} d="M0 -30 L5 -44 L0 -58 L-5 -44 Z" fill={DANGER} />
            ))}
          </g>
          <text className="wb-demo-saved" x="140" y="82" fill={SKY_LT} fontSize="13" fontWeight="900"
            textAnchor="middle" fontFamily="'Poppins', sans-serif">SAVED 96</text>
          <text className="wb-demo-gain" x="140" y="78" fill={GOLD_LT} fontSize="15" fontWeight="900"
            textAnchor="middle" fontFamily="'Poppins', sans-serif">+180</text>

          {/* COVER buttons -- the middle one lights up and is pressed */}
          {[52, 140, 228].map((cx) => (
            <g key={cx} className={cx === 140 ? 'wb-demo-btn' : undefined} opacity={cx === 140 ? undefined : 0.35}>
              <rect x={cx - 30} y="156" width="60" height="30" rx="9"
                fill="rgba(30,107,224,0.2)" stroke={SKY_LT} strokeWidth="1.2" />
              <text x={cx} y="168" fill={SKY_LT} fontSize="8" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">COVER</text>
              <text x={cx} y="179" fill="#fff" fontSize="11" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">28</text>
            </g>
          ))}

          {/* The finger: holds the goal, moves down to buy cover, comes back */}
          <g className="wb-demo-finger">
            <path d="M13 21V7.6a3 3 0 0 1 6 0V18h1.6a3 3 0 0 1 3 3v.6l3.2 1.4a4 4 0 0 1 2.3 4.5l-1.2 5.6A5 5 0 0 1 23 37h-6.4a6 6 0 0 1-4.6-2.2l-5.6-6.9a2.8 2.8 0 0 1 3.9-4L13 26"
              fill="#FFFFFF" stroke="#0B1221" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        </svg>

        {/* -- Three icon-led labels, no prose -- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, margin: '12px 2px 14px' }}>
          {[
            {
              color: GOLD, word: 'HOLD TO FUND',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke={GOLD} strokeWidth="1.8" strokeDasharray="3 3" opacity="0.7" />
                  <circle cx="12" cy="12" r="5" fill={GOLD} />
                </svg>
              ),
            },
            {
              color: ORANGE_LT, word: 'BEAT THE CLOCK',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.6" stroke={ORANGE_LT} strokeWidth="1.9" />
                  <path d="M12 7v5.4l3.4 2" stroke={ORANGE_LT} strokeWidth="2.1"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
            {
              color: SKY_LT, word: 'LOSS > PREMIUM? COVER',
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
              <span style={{ fontSize: 8.5, fontWeight: 900, color, letterSpacing: '0.02em', lineHeight: 1.15 }}>
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
  const goals = stats?.goals || 0;
  const missed = stats?.missed || 0;
  const bestGoal = stats?.bestGoal || 0;
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
            {won ? 'Goals funded' : 'Short of target'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s what you funded.</span>
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
              FUNDED
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              target {RESULT_TARGET_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, goals, missed, bestGoal} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Goals funded" value={goals} accent={GOLD} />
        <StatTile label="Fell short" value={missed} accent={missed > 4 ? '#FF8B8B' : SKY_LT} />
        <StatTile label="Biggest goal" value={bestGoal} accent={GREEN_LT} />
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
          In the game the premium is 28 and you can see every shock coming. Real life gives you neither — which is exactly why cover is arranged in advance. A specialist can size yours in a few minutes.
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
