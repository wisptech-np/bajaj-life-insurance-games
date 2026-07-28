// Screens.jsx — Home, How to Play, and Results screens for Wealth Drop.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { BUCKET_LADDER, GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Wealth Drop';

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
  0%      { transform: translate(88px, 34px); }
  16%     { transform: translate(79px, 60px); }
  32%     { transform: translate(95px, 86px); }
  48%     { transform: translate(83px, 112px); }
  64%     { transform: translate(98px, 138px); }
  82%,100%{ transform: translate(104px, 160px); }
}
@keyframes wdHeroPeg { 0%,58% { opacity: 0.55; } 66% { opacity: 1; } 100% { opacity: 0.55; } }
@keyframes wdBeatAim { 0%,20% { transform: translateX(-15px); } 55%,100% { transform: translateX(13px); } }
@keyframes wdBeatFall { 0%,25% { transform: translate(0,0); opacity: 0; } 35% { opacity: 1; } 70%,100% { transform: translate(9px, 34px); opacity: 1; } }
@keyframes wdBeatShield { 0%,40% { opacity: 0.4; } 60%,100% { opacity: 1; } }
.wd-title { animation: wdTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.wd-float { animation: wdFloat 4s ease-in-out infinite; }
.wd-glow  { animation: wdGlow 2.2s ease-in-out infinite; }
.wd-chip  { animation: wdChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wd-hero-drop { animation: wdHeroDrop 3.6s cubic-bezier(0.4,0,0.7,1) infinite; }
.wd-hero-peg  { animation: wdHeroPeg 3.6s ease-in-out infinite; }
.wd-aim    { animation: wdBeatAim 2.4s ease-in-out infinite; }
.wd-fall   { animation: wdBeatFall 2.4s cubic-bezier(0.4,0,0.8,1) infinite; }
.wd-shield { animation: wdBeatShield 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .wd-title, .wd-float, .wd-glow, .wd-chip, .wd-hero-drop, .wd-hero-peg,
  .wd-aim, .wd-fall, .wd-shield { animation: none !important; }
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
 * Hero motif: the board itself — a staggered peg field, the nine pockets with
 * their multipliers, one blue cover peg, and a gold coin picking its way down.
 * Same construction the canvas uses, so the screen previews the game rather
 * than illustrating it.
 */
const HERO_PEG_ROWS = 5;
const HERO_LANES = 9;
const HERO_X0 = 16;
const HERO_W = 168;
const HERO_PITCH = HERO_W / HERO_LANES;
const HERO_ROW_Y = 48;
const HERO_ROW_GAP = 21;
const HERO_MULTS = [5, 1, 0, 2, 3, 2, 0, 1, 5];
const HERO_POCKET = ['#FFC845', '#4E7FB8', '#EF4444', '#3B8DD4', '#1E6BE0', '#3B8DD4', '#EF4444', '#4E7FB8', '#FFC845'];

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
          r={cover ? 3.6 : 2.4}
          fill={cover ? BLUE_LT : '#8FB8E8'}
          stroke={cover ? '#A6D0FF' : 'none'}
          strokeWidth={cover ? 1.2 : 0}
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
            <rect x={x + 0.6} y={158} width={HERO_PITCH - 1.2} height={22} rx="3"
              fill={m === 0 ? 'rgba(239,68,68,0.32)' : 'rgba(255,255,255,0.07)'}
              stroke={m === 0 ? 'rgba(255,139,139,0.7)' : 'rgba(255,255,255,0.18)'} strokeWidth="0.8" />
            <rect x={x + 0.6} y={158} width={HERO_PITCH - 1.2} height={2.6} rx="1.3" fill={HERO_POCKET[i]} />
            <text x={x + HERO_PITCH / 2} y={172} fill={m === 0 ? '#FF8B8B' : HERO_POCKET[i]}
              fontSize="8.5" fontWeight="900" textAnchor="middle"
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
              <stop offset="0%" stopColor="#0A1E42" />
              <stop offset="100%" stopColor="#061229" />
            </linearGradient>
            <radialGradient id="wdCoin" cx="0.36" cy="0.32" r="0.75">
              <stop offset="0%" stopColor="#FFF6D6" />
              <stop offset="55%" stopColor="#FFE38A" />
              <stop offset="100%" stopColor="#B07B12" />
            </radialGradient>
            <clipPath id="wdClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#wdSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#wdClip)">
            <g className="wd-glow">
              <ellipse cx="100" cy="100" rx="88" ry="76" fill="rgba(38,102,196,0.22)" />
            </g>

            {/* Aim rail and drop marker. */}
            <line x1={HERO_X0} y1="30" x2={HERO_X0 + HERO_W} y2="30"
              stroke="rgba(255,255,255,0.18)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M88 24 l-5 -1 l0 -7 l10 0 l0 7 z" fill={ORANGE} />

            <HeroPegs />
            <HeroPockets />

            {/* The coin, tracing a real path down the field. */}
            <g className="wd-hero-drop">
              <circle cx="0" cy="0" r="6.4" fill="url(#wdCoin)" />
              <circle cx="0" cy="0" r="4" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.1" />
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
/** One beat of the aim - drop - protect loop. Pure CSS-animated SVG. */
function Beat({ n, title, copy, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '10px 12px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
    }}>
      <div style={{ width: 74, height: 62, flexShrink: 0 }}>{children}</div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: ORANGE_LT, textTransform: 'uppercase' }}>
          Step {n}
        </div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.35 }}>{copy}</div>
      </div>
    </div>
  );
}

/** A miniature peg field for the tutorial diagrams. */
function BeatPegs({ rows = 3, y0 = 20, gap = 13 }) {
  const pegs = [];
  for (let r = 0; r < rows; r++) {
    for (let j = 0; j < 5; j++) {
      pegs.push(
        <circle key={`${r}-${j}`} cx={9 + j * 14 + (r % 2 ? 7 : 0)} cy={y0 + r * gap} r="2" fill="#8FB8E8" opacity="0.75" />,
      );
    }
  }
  return <g>{pegs}</g>;
}

function BeatCoin({ x = 0, y = 0, r = 5 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r={r} fill={GOLD} />
      <circle cx="0" cy="0" r={r * 0.6} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
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
        padding: 22,
        background: SCREEN_BG,
        overflowY: 'auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(11,18,33,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '26px 20px 22px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 25, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 6px 0', color: '#fff',
        }}>
          How to Play
        </h2>
        <p style={{ fontSize: 11.5, fontWeight: 800, color: ORANGE_LT, margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Drag to aim your coin &middot; Release to drop &middot; Shield pegs protect against Risk buckets
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Beat n="1" title="Drag to aim" copy="Slide along the rail to choose where the coin enters the board.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <line x1="8" y1="10" x2="66" y2="10" stroke="rgba(255,255,255,0.22)" strokeWidth="2.6" strokeLinecap="round" />
              <BeatPegs rows={3} y0={26} />
              <g className="wd-aim" transform="translate(37,10)">
                <path d="M0 7 l-6 -8 l0 -5 l12 0 l0 5 z" fill={ORANGE} />
              </g>
            </svg>
          </Beat>

          <Beat n="2" title="Release and watch" copy="Every peg deflects the coin. The same drop never lands twice.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatPegs rows={3} y0={16} />
              <rect x="4" y="52" width="20" height="9" rx="2.5" fill="rgba(255,255,255,0.08)" stroke={BLUE_LT} strokeWidth="0.9" />
              <rect x="27" y="52" width="20" height="9" rx="2.5" fill="rgba(239,68,68,0.3)" stroke="#FF8B8B" strokeWidth="0.9" />
              <rect x="50" y="52" width="20" height="9" rx="2.5" fill="rgba(255,255,255,0.08)" stroke={GOLD} strokeWidth="0.9" />
              <g className="wd-fall"><BeatCoin x={30} y={10} /></g>
            </svg>
          </Beat>

          <Beat n="3" title="Cover the downside" copy="Graze a blue shield peg and a red Risk pocket still pays x1.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatPegs rows={2} y0={12} />
              <g className="wd-shield">
                <path d="M37 22 l7 2.6 l0 5.4 c0 4.4 -3 7.8 -7 9.6 c-4 -1.8 -7 -5.2 -7 -9.6 l0 -5.4 z"
                  fill={BLUE_LT} stroke="#A6D0FF" strokeWidth="1.1" />
                <path d="M34 30.5 l2.2 2.2 l4 -4.4" fill="none" stroke="#fff" strokeWidth="1.7"
                  strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <rect x="24" y="50" width="26" height="10" rx="2.5" fill="rgba(239,68,68,0.32)" stroke="#FF8B8B" strokeWidth="0.9" />
              <text x="37" y="57.5" fill={GOLD_LT} fontSize="7" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">x1</text>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.coinsPerSession} coins</strong> worth{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.coinValue}</strong> each, or{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong> &mdash; whichever runs out first.
          Reach <strong style={{ color: GREEN_LT }}>{RESULT_TARGET_SCORE.toLocaleString()}</strong> total payout to win.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 18 }}>
          {BUCKET_LADDER.map((b, i) => (
            <span
              key={b.key}
              className="wd-chip"
              style={{
                animationDelay: `${140 + i * 80}ms`,
                fontSize: 10,
                fontWeight: 900,
                padding: '4px 9px',
                borderRadius: 999,
                color: b.kind === 'risk' ? '#FF8B8B' : b.colorLt,
                background: b.kind === 'risk' ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${b.kind === 'risk' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.14)'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {b.full} x{b.mult}
            </span>
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
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your payout.</span>
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
              PAYOUT
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              target {RESULT_TARGET_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, coins, shielded, combo} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Coins dropped" value={`${coins}/${GAME_CONFIG.coinsPerSession}`} accent={GOLD} />
        <StatTile label="Cover saves" value={shielded} accent={BLUE_LT} />
        <StatTile label="Best streak" value={`x${combo}`} accent={GREEN_LT} />
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
          Markets bounce both ways. A specialist can show you how cover keeps your goals funded either way.
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
