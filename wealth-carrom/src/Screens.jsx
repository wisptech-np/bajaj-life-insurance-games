// Screens.jsx — Home, How to Play, and Results screens for Wealth Carrom.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_COINS } from './data.js';

const GAME_TITLE = 'Wealth Carrom';
const TAGLINE = 'Pocket every goal — and remember, the Queen of Protection only stays yours if you cover her.';

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
const QUEEN = '#E5343C';
const QUEEN_LT = '#FF7A80';
const RISK = '#3A3350';
const RISK_EDGE = '#B9A8F0';
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

/** Run-ended mark: a coin that stopped short of the pocket. */
function ShortfallIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M26 6a6 6 0 0 1 0 12" stroke="#fff" strokeWidth="2" opacity="0.6" strokeDasharray="3 3" />
      <circle cx="12" cy="20" r="6" stroke="#fff" strokeWidth="2.4" />
      <path d="M6 8l12 12" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
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
@keyframes wcTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes wcFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes wcGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes wcChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes wcHeroStrike {
  0%      { transform: translate(0, 0); }
  22%     { transform: translate(0, 12px); }
  46%     { transform: translate(-6px, -76px); }
  70%,100%{ transform: translate(-34px, -104px); opacity: 0; }
}
@keyframes wcHeroCoin {
  0%,44%  { transform: translate(0, 0); }
  74%,100%{ transform: translate(-30px, -34px); opacity: 0; }
}
@keyframes wcHeroPocket { 0%,60% { opacity: 0.3; } 76% { opacity: 1; } 100% { opacity: 0.3; } }
@keyframes wcBeatPull { 0%,20% { transform: translate(0,0); } 46% { transform: translate(0,9px); } 62%,100% { transform: translate(0,-26px); } }
@keyframes wcBeatSlide { 0%,25% { transform: translateX(-13px); } 60%,100% { transform: translateX(13px); } }
@keyframes wcBeatCover { 0%,45% { opacity: 0.25; } 65%,100% { opacity: 1; } }
.wc-title { animation: wcTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.wc-float { animation: wcFloat 4s ease-in-out infinite; }
.wc-glow  { animation: wcGlow 2.2s ease-in-out infinite; }
.wc-chip  { animation: wcChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wc-hero-strike { animation: wcHeroStrike 3.4s cubic-bezier(0.3,0,0.5,1) infinite; }
.wc-hero-coin   { animation: wcHeroCoin 3.4s cubic-bezier(0.3,0,0.5,1) infinite; }
.wc-hero-pocket { animation: wcHeroPocket 3.4s ease-in-out infinite; }
.wc-slide { animation: wcBeatSlide 2.4s ease-in-out infinite; }
.wc-pull  { animation: wcBeatPull 2.4s cubic-bezier(0.4,0,0.6,1) infinite; }
.wc-cover { animation: wcBeatCover 2.4s ease-in-out infinite; }

/* How-to-play demo: one 7s loop, two real strikes on a full board.
   Strike 1 pots the Queen (pending, red ring). Strike 2 pots a gold coin and
   the cover completes (green tick). Every transform is authored around its
   parent group's origin. */
@keyframes wcdStriker {
  0%       { transform: translate(-34px, 0); }
  8%       { transform: translate(0, 0); }
  17%      { transform: translate(0, 22px); }
  20%      { transform: translate(0, 22px); }
  26%      { transform: translate(-34px, -84px); }
  32%      { transform: translate(-52px, -58px); }
  40%,52%  { transform: translate(0, 0); }
  58%      { transform: translate(0, 22px); }
  61%      { transform: translate(0, 22px); }
  67%      { transform: translate(36px, -66px); }
  73%      { transform: translate(52px, -42px); }
  82%,94%  { transform: translate(0, 0); }
  100%     { transform: translate(-34px, 0); }
}
@keyframes wcdFinger {
  0%       { transform: translate(-34px, 0); opacity: 0; }
  3%       { transform: translate(-30px, 0); opacity: 1; }
  8%       { transform: translate(0, 0); opacity: 1; }
  17%,20%  { transform: translate(0, 22px); opacity: 1; }
  23%      { transform: translate(0, 28px); opacity: 0; }
  50%      { transform: translate(0, 6px); opacity: 0; }
  53%      { transform: translate(0, 0); opacity: 1; }
  58%,61%  { transform: translate(0, 22px); opacity: 1; }
  64%      { transform: translate(0, 28px); opacity: 0; }
  94%,100% { transform: translate(-34px, 0); opacity: 0; }
}
@keyframes wcdPower {
  0%,10%   { opacity: 0; transform: scale(0.7); }
  17%,20%  { opacity: 1; transform: scale(1.55); }
  22%,51%  { opacity: 0; transform: scale(0.7); }
  58%,61%  { opacity: 1; transform: scale(1.45); }
  63%,100% { opacity: 0; transform: scale(0.7); }
}
@keyframes wcdRayA { 0%,10% { opacity: 0; } 14%,20% { opacity: 0.95; } 23%,100% { opacity: 0; } }
@keyframes wcdRayB { 0%,51% { opacity: 0; } 55%,61% { opacity: 0.95; } 64%,100% { opacity: 0; } }
@keyframes wcdQueen {
  0%,25%   { transform: translate(0,0) scale(1); opacity: 1; }
  33%      { transform: translate(-112px,-88px) scale(0.82); opacity: 1; }
  36%,90%  { transform: translate(-120px,-94px) scale(0.25); opacity: 0; }
  93%      { transform: translate(0,0) scale(0.25); opacity: 0; }
  97%,100% { transform: translate(0,0) scale(1); opacity: 1; }
}
@keyframes wcdCoin {
  0%,66%   { transform: translate(0,0) scale(1); opacity: 1; }
  73%      { transform: translate(88px,-64px) scale(0.82); opacity: 1; }
  76%,92%  { transform: translate(94px,-70px) scale(0.25); opacity: 0; }
  95%      { transform: translate(0,0) scale(0.25); opacity: 0; }
  98%,100% { transform: translate(0,0) scale(1); opacity: 1; }
}
@keyframes wcdPocketTL { 0%,33% { opacity: 0; } 37% { opacity: 1; } 46%,100% { opacity: 0; } }
@keyframes wcdPocketTR { 0%,73% { opacity: 0; } 77% { opacity: 1; } 86%,100% { opacity: 0; } }
/* The Queen is pocketed but not yet paid for — this is the cover rule, shown. */
@keyframes wcdPending { 0%,36% { opacity: 0; } 42%,72% { opacity: 0.9; } 76%,100% { opacity: 0; } }
@keyframes wcdCover {
  0%,76%   { opacity: 0; transform: scale(0.5); }
  81%      { opacity: 1; transform: scale(1.18); }
  85%      { opacity: 1; transform: scale(1); }
  93%,100% { opacity: 0; transform: scale(1); }
}
.wcd-striker   { animation: wcdStriker 7s cubic-bezier(0.3,0,0.4,1) infinite; }
.wcd-finger    { animation: wcdFinger 7s cubic-bezier(0.3,0,0.4,1) infinite; }
.wcd-power     { animation: wcdPower 7s ease-out infinite; }
.wcd-ray-a     { animation: wcdRayA 7s linear infinite; }
.wcd-ray-b     { animation: wcdRayB 7s linear infinite; }
.wcd-queen     { animation: wcdQueen 7s cubic-bezier(0.3,0,0.4,1) infinite; }
.wcd-coin      { animation: wcdCoin 7s cubic-bezier(0.3,0,0.4,1) infinite; }
.wcd-pocket-tl { animation: wcdPocketTL 7s ease-out infinite; }
.wcd-pocket-tr { animation: wcdPocketTR 7s ease-out infinite; }
.wcd-pending   { animation: wcdPending 7s ease-in-out infinite; }
.wcd-cover     { animation: wcdCover 7s cubic-bezier(0.22,1,0.36,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .wc-title, .wc-float, .wc-glow, .wc-chip, .wc-hero-strike, .wc-hero-coin,
  .wc-hero-pocket, .wc-slide, .wc-pull, .wc-cover,
  .wcd-striker, .wcd-finger, .wcd-power, .wcd-ray-a, .wcd-ray-b, .wcd-queen,
  .wcd-coin, .wcd-pocket-tl, .wcd-pocket-tr, .wcd-pending,
  .wcd-cover { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, ORANGE_LT, BLUE_LT, BLUE, GREEN, QUEEN_LT];
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
 * Hero motif: the board itself — the frame, four corner pockets, the rosette in
 * its real arrangement (queen at the centre, a ring of six with the two risk
 * discs top and bottom, an outer ring of five) and a striker flicking a coin
 * into the top-left pocket. Same construction the canvas uses, so the screen
 * previews the game rather than illustrating it.
 */
const HERO = { x0: 16, y0: 16, size: 168, frame: 9 };
const HERO_PLAY = HERO.size - HERO.frame * 2;
const HERO_CX = HERO.x0 + HERO.size / 2;
const HERO_CY = HERO.y0 + HERO.size / 2;
const HERO_R = HERO_PLAY * GAME_CONFIG.board.discRadiusFrac;
const HERO_POCKET = HERO_R * GAME_CONFIG.board.pocketRadiusDiscs;

function heroRosette() {
  const out = [{ kind: 'queen', x: HERO_CX, y: HERO_CY }];
  for (const ring of GAME_CONFIG.layout.rings) {
    for (let i = 0; i < ring.count; i++) {
      const a = ((ring.startDeg + (360 / ring.count) * i) * Math.PI) / 180;
      out.push({
        kind: ring.kinds[i % ring.kinds.length],
        x: HERO_CX + Math.cos(a) * ring.radiusDiscs * HERO_R,
        y: HERO_CY + Math.sin(a) * ring.radiusDiscs * HERO_R,
      });
    }
  }
  return out;
}

function HeroDisc({ kind, x, y, r, className }) {
  const fill = kind === 'queen' ? 'url(#wcQueen)' : kind === 'risk' ? 'url(#wcRisk)' : 'url(#wcCoin)';
  return (
    <g className={className} transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r={r} fill={fill} />
      <circle cx="0" cy="0" r={r * 0.62} fill="none"
        stroke={kind === 'queen' ? GOLD_LT : kind === 'risk' ? RISK_EDGE : 'rgba(255,255,255,0.75)'}
        strokeWidth={r * 0.16} />
    </g>
  );
}

export function HomeScreen({ onStart }) {
  const pieces = heroRosette();
  const pocketPts = [
    [HERO.x0 + HERO.frame, HERO.y0 + HERO.frame],
    [HERO.x0 + HERO.size - HERO.frame, HERO.y0 + HERO.frame],
    [HERO.x0 + HERO.size - HERO.frame, HERO.y0 + HERO.size - HERO.frame],
    [HERO.x0 + HERO.frame, HERO.y0 + HERO.size - HERO.frame],
  ];
  const baseY = HERO.y0 + HERO.size - HERO.frame - HERO_PLAY * GAME_CONFIG.board.baselineFrac;

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
        padding: '42px 24px 48px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="wc-title" style={{
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
          maxWidth: 306,
          lineHeight: 1.45,
        }}>
          Pocket every goal — the Queen of Protection only stays yours if you cover her.
        </p>
      </div>

      <div className="wc-float" style={{ position: 'relative', width: 264, height: 244, zIndex: 1 }}>
        <svg width="264" height="244" viewBox="0 0 200 200" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="wcFrame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A4396" />
              <stop offset="100%" stopColor="#04255C" />
            </linearGradient>
            <radialGradient id="wcFelt" cx="0.5" cy="0.42" r="0.72">
              <stop offset="0%" stopColor="#12305F" />
              <stop offset="60%" stopColor="#0E2650" />
              <stop offset="100%" stopColor="#081A3A" />
            </radialGradient>
            <radialGradient id="wcCoin" cx="0.34" cy="0.3" r="0.78">
              <stop offset="0%" stopColor="#FFF6D6" />
              <stop offset="52%" stopColor={GOLD} />
              <stop offset="100%" stopColor="#8F6209" />
            </radialGradient>
            <radialGradient id="wcQueen" cx="0.34" cy="0.3" r="0.78">
              <stop offset="0%" stopColor={QUEEN_LT} />
              <stop offset="52%" stopColor={QUEEN} />
              <stop offset="100%" stopColor="#7C1015" />
            </radialGradient>
            <radialGradient id="wcRisk" cx="0.34" cy="0.3" r="0.78">
              <stop offset="0%" stopColor="#8C7FB8" />
              <stop offset="52%" stopColor={RISK} />
              <stop offset="100%" stopColor="#161226" />
            </radialGradient>
            <radialGradient id="wcStriker" cx="0.34" cy="0.3" r="0.78">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#F4F7FF" />
              <stop offset="100%" stopColor="#9FB2D6" />
            </radialGradient>
            <clipPath id="wcFeltClip">
              <rect x={HERO.x0 + HERO.frame} y={HERO.y0 + HERO.frame}
                width={HERO_PLAY} height={HERO_PLAY} rx="3" />
            </clipPath>
          </defs>

          <g className="wc-glow">
            <ellipse cx="100" cy="100" rx="94" ry="86" fill="rgba(38,102,196,0.2)" />
          </g>

          <rect x={HERO.x0} y={HERO.y0} width={HERO.size} height={HERO.size} rx="10"
            fill="url(#wcFrame)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
          <rect x={HERO.x0 + HERO.frame} y={HERO.y0 + HERO.frame}
            width={HERO_PLAY} height={HERO_PLAY} rx="3"
            fill="url(#wcFelt)" stroke="rgba(255,200,69,0.35)" strokeWidth="1" />

          <g clipPath="url(#wcFeltClip)">
            {pocketPts.map(([px, py], i) => (
              <g key={i} className={i === 0 ? 'wc-hero-pocket' : undefined}>
                <circle cx={px} cy={py} r={HERO_POCKET} fill="#02060F" />
                <circle cx={px} cy={py} r={HERO_POCKET - 0.6} fill="none"
                  stroke="rgba(255,200,69,0.5)" strokeWidth="1.1" />
              </g>
            ))}
            <circle cx={HERO_CX} cy={HERO_CY} r={HERO_PLAY * 0.115} fill="rgba(229,52,60,0.1)"
              stroke="rgba(255,200,69,0.24)" strokeWidth="0.8" />
            <circle cx={HERO_CX} cy={HERO_CY} r={HERO_PLAY * 0.155} fill="none"
              stroke="rgba(255,200,69,0.18)" strokeWidth="0.8" />
            <line x1={HERO.x0 + HERO.frame + HERO_PLAY * 0.155} y1={baseY}
              x2={HERO.x0 + HERO.size - HERO.frame - HERO_PLAY * 0.155} y2={baseY}
              stroke="rgba(255,200,69,0.45)" strokeWidth="1.1" />

            {pieces.map((p, i) => (
              <HeroDisc
                key={i}
                kind={p.kind}
                x={p.x}
                y={p.y}
                r={HERO_R}
                className={i === 8 ? 'wc-hero-coin' : undefined}
              />
            ))}

            {/* Striker, flicked from the baseline into the rosette. */}
            <g className="wc-hero-strike" transform={`translate(${HERO_CX + 8},${baseY})`}>
              <circle cx="0" cy="0" r={HERO_R * 1.24} fill="url(#wcStriker)" />
              <circle cx="0" cy="0" r={HERO_R * 0.86} fill="none" stroke={ORANGE} strokeWidth="1.4" />
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
 * Animation-first how-to-play. One 7 s loop plays two real strikes on a full
 * board: place the striker on the baseline, pull back to load the aim ray and
 * the power ring, release, pot the Queen — then pot a gold coin on the very
 * next strike so the cover completes. No prose.
 */
const DEMO_POCKETS = [[30, 30], [270, 30], [30, 230], [270, 230]];
/* Six goal coins ringing the Queen; the seventh (index -1) is the one strike 2 pots. */
const DEMO_COINS = [[150, 88], [122, 106], [178, 106], [122, 142], [150, 160], [178, 142]];

function DemoDefs() {
  return (
    <defs>
      <radialGradient id="wcdCoinG" cx="0.34" cy="0.3" r="0.78">
        <stop offset="0%" stopColor="#FFF6D6" />
        <stop offset="55%" stopColor={GOLD} />
        <stop offset="100%" stopColor="#8F6209" />
      </radialGradient>
      <radialGradient id="wcdQueenG" cx="0.34" cy="0.3" r="0.78">
        <stop offset="0%" stopColor={QUEEN_LT} />
        <stop offset="55%" stopColor={QUEEN} />
        <stop offset="100%" stopColor="#7C1015" />
      </radialGradient>
      <radialGradient id="wcdStrikerG" cx="0.34" cy="0.3" r="0.78">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#F4F7FF" />
        <stop offset="100%" stopColor="#9FB2D6" />
      </radialGradient>
      <radialGradient id="wcdRiskG" cx="0.34" cy="0.3" r="0.78">
        <stop offset="0%" stopColor="#6B5FA0" />
        <stop offset="60%" stopColor={RISK} />
        <stop offset="100%" stopColor="#150F26" />
      </radialGradient>
    </defs>
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
        padding: 16,
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(11,18,33,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '16px 13px 14px',
        width: '100%',
        maxWidth: 344,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 22, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 10px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        {/* ── The looping demo: two strikes on the real board ── */}
        <svg viewBox="0 0 300 260" width="100%" role="img"
          aria-label="A finger places the striker on the baseline, pulls back to aim, and flicks it into the Queen; on the next strike it pockets a gold coin and the cover is confirmed."
          style={{ display: 'block', borderRadius: 14 }}>
          <DemoDefs />

          {/* Board frame and playfield */}
          <rect x="2" y="2" width="296" height="256" rx="16" fill="#0A1A38" stroke={BLUE_LT} strokeWidth="2.5" />
          <rect x="16" y="16" width="268" height="228" rx="8" fill="#0E2650" stroke="rgba(255,200,69,0.28)" strokeWidth="1.4" />

          {/* Centre circle and the gold arcs a carrom board always has */}
          <circle cx="150" cy="124" r="38" fill="none" stroke="rgba(255,200,69,0.3)" strokeWidth="1.4" />
          <circle cx="150" cy="124" r="9" fill="none" stroke="rgba(255,200,69,0.45)" strokeWidth="1.2" />

          {/* Corner pockets */}
          {DEMO_POCKETS.map(([px, py]) => (
            <g key={`${px}-${py}`}>
              <circle cx={px} cy={py} r="15" fill="#02060F" stroke="rgba(255,200,69,0.45)" strokeWidth="1.4" />
              <circle cx={px} cy={py} r="9" fill="#000" opacity="0.6" />
            </g>
          ))}
          {/* Pocket flashes when something drops in */}
          <circle className="wcd-pocket-tl" cx="30" cy="30" r="17" fill="none" stroke={QUEEN_LT} strokeWidth="3.5" />
          <circle className="wcd-pocket-tr" cx="270" cy="30" r="17" fill="none" stroke={GREEN_LT} strokeWidth="3.5" />
          {/* The Queen is in but not yet paid for */}
          <circle className="wcd-pending" cx="30" cy="30" r="22" fill="none" stroke={QUEEN}
            strokeWidth="2.6" strokeDasharray="5 5" />

          {/* Baseline strip the striker is placed along */}
          <line x1="62" y1="204" x2="238" y2="204" stroke="rgba(255,200,69,0.5)" strokeWidth="1.6" />
          <line x1="62" y1="214" x2="238" y2="214" stroke="rgba(255,200,69,0.5)" strokeWidth="1.6" />
          <circle cx="62" cy="209" r="5" fill="none" stroke="rgba(255,200,69,0.4)" strokeWidth="1.2" />
          <circle cx="238" cy="209" r="5" fill="none" stroke="rgba(255,200,69,0.4)" strokeWidth="1.2" />

          {/* Two risk discs — one parked between the baseline and the Queen */}
          <circle cx="150" cy="180" r="11" fill="url(#wcdRiskG)" stroke={RISK_EDGE} strokeWidth="1.6" />
          <path d="M144 174 L156 186 M156 174 L144 186" stroke={RISK_EDGE} strokeWidth="2" strokeLinecap="round" />
          <circle cx="94" cy="72" r="11" fill="url(#wcdRiskG)" stroke={RISK_EDGE} strokeWidth="1.6" />
          <path d="M88 66 L100 78 M100 66 L88 78" stroke={RISK_EDGE} strokeWidth="2" strokeLinecap="round" />

          {/* The goal coins */}
          {DEMO_COINS.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="11" fill="url(#wcdCoinG)"
              stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          ))}
          {/* The coin strike 2 pots, which is what covers the Queen */}
          <g transform="translate(206,124)">
            <circle className="wcd-coin" cx="0" cy="0" r="11" fill="url(#wcdCoinG)"
              stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          </g>

          {/* The Queen of Protection on the centre spot */}
          <g transform="translate(150,124)">
            <g className="wcd-queen">
              <circle cx="0" cy="0" r="12.5" fill="url(#wcdQueenG)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <path d="M-6 -2 l3 3 l3 -6 l3 6 l3 -3 v6 h-12 z" fill={GOLD_LT} />
            </g>
          </g>

          {/* Aim rays: dashed, opposite the pull, exactly as the game draws them */}
          <line className="wcd-ray-a" x1="150" y1="208" x2="106" y2="102"
            stroke={ORANGE_LT} strokeWidth="2.2" strokeDasharray="6 5" strokeLinecap="round" />
          <line className="wcd-ray-b" x1="150" y1="208" x2="206" y2="106"
            stroke={ORANGE_LT} strokeWidth="2.2" strokeDasharray="6 5" strokeLinecap="round" />

          {/* Striker home is the baseline centre; everything else is relative */}
          <g transform="translate(150,208)">
            <g className="wcd-striker">
              <circle className="wcd-power" cx="0" cy="0" r="13" fill="none" stroke={ORANGE} strokeWidth="2.4" />
              <circle cx="0" cy="0" r="13" fill="url(#wcdStrikerG)" />
              <circle cx="0" cy="0" r="8.5" fill="none" stroke={ORANGE} strokeWidth="2.2" />
            </g>
          </g>

          {/* The finger: places, pulls back, releases */}
          <g transform="translate(150,208)">
            <g className="wcd-finger">
              <g transform="translate(-3,-4)">
                <path d="M13 21V7.6a3 3 0 0 1 6 0V18h1.6a3 3 0 0 1 3 3v.6l3.2 1.4a4 4 0 0 1 2.3 4.5l-1.2 5.6A5 5 0 0 1 23 37h-6.4a6 6 0 0 1-4.6-2.2l-5.6-6.9a2.8 2.8 0 0 1 3.9-4L13 26"
                  fill="#FFFFFF" stroke="#0B1221" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* Cover confirmed */}
          <g transform="translate(150,124)">
            <g className="wcd-cover">
              <circle cx="0" cy="0" r="30" fill="rgba(40,167,69,0.22)" stroke={GREEN_LT} strokeWidth="3" />
              <path d="M-13 1 l9 10 l18 -20" fill="none" stroke={GREEN_LT} strokeWidth="6"
                strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        </svg>

        {/* ── At most three icon-led labels ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, margin: '10px 2px 12px' }}>
          {[
            {
              color: ORANGE_LT, word: 'PULL TO AIM',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="16" r="5" fill="#F4F7FF" stroke={ORANGE} strokeWidth="1.8" />
                  <path d="M12 10.5 V2.6" stroke={ORANGE_LT} strokeWidth="2.2" strokeDasharray="3 3" strokeLinecap="round" />
                  <path d="M8.6 5.6 L12 2 l3.4 3.6" fill="none" stroke={ORANGE_LT} strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
            {
              color: GOLD_LT, word: 'POCKET COINS',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M2 2 h8 a8 8 0 0 1 -8 8 z" fill="#02060F" stroke={GOLD} strokeWidth="1.4" />
                  <circle cx="15" cy="15" r="6" fill={GOLD} stroke="#8F6209" strokeWidth="1.6" />
                  <circle cx="13" cy="13" r="1.8" fill={GOLD_LT} />
                </svg>
              ),
            },
            {
              color: QUEEN_LT, word: 'COVER THE QUEEN',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.4" fill={QUEEN} stroke={QUEEN_LT} strokeWidth="1.6" />
                  <path d="M7 11 l2.4 2.4 l2.6 -5 l2.6 5 L17 11 v4.6 H7 z" fill={GOLD_LT} />
                </svg>
              ),
            },
          ].map(({ color, word, icon }) => (
            <div key={word} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 2px', borderRadius: 12,
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
  // The stats contract: {score, coins, queenCovered, fouls}.
  const score = stats?.score || 0;
  const coins = stats?.coins || 0;
  const queenCovered = !!stats?.queenCovered;
  const fouls = stats?.fouls || 0;
  const equiv = coins + (queenCovered ? GAME_CONFIG.scoring.queenCoinEquivalent : 0);
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
    const shareMessage = `Hi,\nI pocketed ${coins} wealth coins${queenCovered ? ' and covered the Queen of Protection' : ''} for ${score} points in the ${GAME_TITLE} challenge.\n${TAGLINE}\nTake your shot here: ${shareUrl}`.trim();

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
  const progress = (Math.min(equiv, RESULT_TARGET_COINS) / RESULT_TARGET_COINS) * circumference;
  const weak = equiv < RESULT_TARGET_COINS * 0.4;
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
            {won ? 'Board cleared' : 'Short of target'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your board.</span>
        </p>
      </div>

      {/* Coin ring */}
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
              {equiv} of {RESULT_TARGET_COINS} coins
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, coins, queenCovered, fouls} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Coins pocketed" value={`${coins}/9`} accent={GOLD} />
        <StatTile
          label="Queen covered"
          value={queenCovered ? 'Yes' : 'No'}
          accent={queenCovered ? GREEN_LT : QUEEN_LT}
        />
        <StatTile label="Fouls" value={`${fouls}/${GAME_CONFIG.fouls.max}`} accent={fouls ? DANGER : GREEN_LT} />
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
          {queenCovered
            ? 'You covered the Queen. A specialist can show you what covering your real goals looks like.'
            : 'An uncovered goal pays nothing. A specialist can show you how to cover yours properly.'}
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
