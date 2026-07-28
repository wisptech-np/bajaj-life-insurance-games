// Screens.jsx — Home, How to Play, and Results screens for Income Pipeline.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE, TOTAL_TANKS } from './data.js';

const GAME_TITLE = 'Income Pipeline';

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
const PIPE = '#4E7FB8';
const CASING = '#0D1A33';
const SCREEN_BG = 'radial-gradient(ellipse at 50% 26%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221';

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

/** Run-ended mark: a pipe end with money dripping out of it. */
function LeakIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M3 11h16" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M19 8v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <circle cx="21" cy="20" r="2" fill="#fff" opacity="0.9" />
      <circle cx="25" cy="26" r="1.5" fill="#fff" opacity="0.6" />
      <circle cx="17" cy="26" r="1.2" fill="#fff" opacity="0.45" />
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
@keyframes ipTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes ipFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ipGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes ipChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes ipFlow    { from { stroke-dashoffset: 340; } to { stroke-dashoffset: 0; } }
@keyframes ipTankA   { 0%,32% { transform: scaleY(0); } 52%,100% { transform: scaleY(1); } }
@keyframes ipTankB   { 0%,56% { transform: scaleY(0); } 76%,100% { transform: scaleY(1); } }
@keyframes ipSpin    { 0%,30% { transform: rotate(0deg); } 55%,100% { transform: rotate(90deg); } }
@keyframes ipFill    { from { stroke-dashoffset: 74; } to { stroke-dashoffset: 0; } }
@keyframes ipSpray   { 0%,45% { opacity: 1; } 60%,100% { opacity: 0; } }
@keyframes ipSeal    { 0%,45% { opacity: 0; } 60%,100% { opacity: 1; } }
.ip-title { animation: ipTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.ip-float { animation: ipFloat 4s ease-in-out infinite; }
.ip-glow  { animation: ipGlow 2.2s ease-in-out infinite; }
.ip-chip  { animation: ipChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ip-flow  { stroke-dasharray: 340; animation: ipFlow 3.4s linear infinite; }
.ip-tank-a { transform-box: fill-box; transform-origin: bottom; animation: ipTankA 3.4s ease-in-out infinite; }
.ip-tank-b { transform-box: fill-box; transform-origin: bottom; animation: ipTankB 3.4s ease-in-out infinite; }
.ip-spin  { transform-box: fill-box; transform-origin: 50% 0%; animation: ipSpin 2.2s ease-in-out infinite; }
.ip-fill  { stroke-dasharray: 74; animation: ipFill 2.2s linear infinite; }
.ip-spray { animation: ipSpray 2.2s ease-in-out infinite; }
.ip-seal  { animation: ipSeal 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ip-title, .ip-float, .ip-glow, .ip-chip, .ip-flow, .ip-tank-a, .ip-tank-b,
  .ip-spin, .ip-fill, .ip-spray, .ip-seal { animation: none !important; }
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
 * Hero motif: the board itself — a salary tap on the left edge, a lattice of
 * pipe tiles, two goal tanks on the right, and money travelling the route and
 * filling them. Same construction the canvas uses, so the screen previews the
 * game rather than illustrating it.
 */
const HERO_ROUTE_A = 'M22 83 H101 V57 H164';
const HERO_ROUTE_B = 'M101 83 V135 H164';
/** Decoy tiles: pipe the route does not use, exactly as the board has. */
const HERO_DECOYS = [
  'M49 44 V70', 'M127 96 H153', 'M62 109 H88 V135', 'M140 70 V96',
  'M36 122 H62', 'M75 148 V122 H101',
];

function HeroWells() {
  const cells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={36 + c * 26 + 1.5} y={44 + r * 26 + 1.5}
          width={23} height={23} rx="5"
          fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.075)" strokeWidth="0.7"
        />,
      );
    }
  }
  return <g>{cells}</g>;
}

function HeroTank({ y, color, colorLt, cls }) {
  return (
    <g>
      <rect x={164} y={y - 11} width={20} height={22} rx="4" fill="rgba(255,255,255,0.06)"
        stroke={color} strokeWidth="1.2" />
      <rect className={cls} x={166} y={y - 4} width={16} height={13} rx="2" fill={colorLt} />
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
        <h1 className="ip-title" style={{
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
          Route every rupee of income to the goals that matter &mdash; before payday flows, seal the leaks.
        </p>
      </div>

      <div className="ip-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="ipSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A1E42" />
              <stop offset="100%" stopColor="#061229" />
            </linearGradient>
            <clipPath id="ipClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#ipSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#ipClip)">
            <g className="ip-glow">
              <ellipse cx="100" cy="96" rx="88" ry="74" fill="rgba(38,102,196,0.22)" />
            </g>

            <HeroWells />

            {/* Decoy pipe: the tiles the route leaves alone. */}
            <g stroke={CASING} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none">
              {HERO_DECOYS.map((d) => <path key={d} d={d} />)}
            </g>
            <g stroke={PIPE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.72">
              {HERO_DECOYS.map((d) => <path key={d} d={d} />)}
            </g>

            {/* The connected route, with money running through it. */}
            <g stroke={CASING} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d={HERO_ROUTE_A} />
              <path d={HERO_ROUTE_B} />
            </g>
            <g stroke={PIPE} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d={HERO_ROUTE_A} />
              <path d={HERO_ROUTE_B} />
            </g>
            <g className="ip-flow" stroke={GOLD} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d={HERO_ROUTE_A} />
              <path d={HERO_ROUTE_B} />
            </g>

            {/* Salary tap. */}
            <rect x="10" y="70" width="16" height="26" rx="5" fill={ORANGE} stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
            <circle cx="18" cy="64" r="4.5" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" />
            <text x="18" y="108" fill="rgba(255,255,255,0.8)" fontSize="7" fontWeight="900"
              textAnchor="middle" fontFamily="'Poppins', sans-serif">SALARY</text>

            {/* Goal tanks. */}
            <HeroTank y={57} color="#3B8DD4" colorLt="#9FD0FF" cls="ip-tank-a" />
            <HeroTank y={135} color="#1E6BE0" colorLt="#7FB6FF" cls="ip-tank-b" />
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
/** One beat of the turn - route - seal loop. Pure CSS-animated SVG. */
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
          Tap a pipe to turn it &middot; Link Salary to every tank &middot; Close the open ends first
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Beat n="1" title="Tap to turn" copy="Each tap rotates one pipe tile a quarter turn clockwise. Cross junctions are fixed.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <rect x="18" y="10" width="38" height="38" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" />
              <g className="ip-spin">
                <path d="M37 29 V11 M37 29 H55" stroke={CASING} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M37 29 V11 M37 29 H55" stroke={PIPE} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
              <path d="M22 54a8 8 0 1 0 0-11" stroke={ORANGE_LT} strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M22 38v6h6" stroke={ORANGE_LT} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Beat>

          <Beat n="2" title="Reach every tank" copy="Money flows the instant the last tank connects, and banks the seconds you saved.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <rect x="2" y="21" width="9" height="16" rx="3" fill={ORANGE} />
              <path d="M40 29 H55" stroke={CASING} strokeWidth="11" strokeLinecap="round" fill="none" />
              <path d="M40 29 H55" stroke={PIPE} strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M11 29 H40 V13 H55" stroke={CASING} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M11 29 H40 V13 H55" stroke={PIPE} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path className="ip-fill" d="M11 29 H40 V13 H55" stroke={GOLD} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <rect x="55" y="4" width="15" height="19" rx="3.5" fill="rgba(255,255,255,0.07)" stroke="#3B8DD4" strokeWidth="1.2" />
              <rect x="57" y="13" width="11" height="8" rx="1.6" fill="#9FD0FF" />
              <rect x="55" y="21" width="15" height="19" rx="3.5" fill="rgba(255,255,255,0.07)" stroke="#1E6BE0" strokeWidth="1.2" />
            </svg>
          </Beat>

          <Beat n="3" title="Seal the leaks" copy="Every open pipe end on the live route sprays income away at -25 each.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <path d="M6 31 H44" stroke={CASING} strokeWidth="11" strokeLinecap="round" fill="none" />
              <path d="M6 31 H44" stroke={GOLD} strokeWidth="6" strokeLinecap="round" fill="none" />
              <g className="ip-spray" stroke={DANGER} strokeWidth="2.4" strokeLinecap="round" fill="none">
                <path d="M48 30 L60 21" />
                <path d="M48 33 L63 33" />
                <path d="M48 36 L60 45" />
              </g>
              <g className="ip-seal">
                <path d="M40 31 H58 V15" stroke={CASING} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M40 31 H58 V15" stroke={GREEN_LT} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.levels.length} boards</strong>, one payday clock each.
          Tank filled <strong style={{ color: GREEN_LT }}>+{GAME_CONFIG.scoring.tankFilled}</strong> &middot;
          leak <strong style={{ color: DANGER }}>&minus;{GAME_CONFIG.scoring.leakPenalty}</strong> &middot;
          early finish <strong style={{ color: ORANGE_LT }}>+{GAME_CONFIG.scoring.earlyBonusPerSecond}</strong> a second.
          Fill all <strong style={{ color: '#fff' }}>{TOTAL_TANKS}</strong> tanks to win.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 18 }}>
          {GAME_CONFIG.levels.map((l, i) => (
            <span
              key={l.id}
              className="ip-chip"
              style={{
                animationDelay: `${140 + i * 80}ms`,
                fontSize: 10,
                fontWeight: 900,
                padding: '4px 9px',
                borderRadius: 999,
                color: GOLD_LT,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {l.cols}&times;{l.rows} &middot; {l.tanks} tank{l.tanks > 1 ? 's' : ''} &middot; {l.timerSeconds}s
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
  const tanksFilled = stats?.tanksFilled || 0;
  const leaks = stats?.leaks || 0;
  const moves = stats?.moves || 0;
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
    const shareMessage = `Hi,\nI routed ${tanksFilled} of ${TOTAL_TANKS} goal tanks for ${score} points in the ${GAME_TITLE} challenge.\nIncome only builds a future if it reaches the goals - and the leaks stay sealed. Take your run here: ${shareUrl}`.trim();

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
          {won ? <TrophyIcon size={20} /> : <LeakIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Every goal funded' : 'Income left the pipe'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s where your income landed.</span>
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
              ROUTED
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              clean run {RESULT_TARGET_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, tanksFilled, leaks, moves} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Tanks filled" value={`${tanksFilled}/${TOTAL_TANKS}`} accent={GREEN_LT} />
        <StatTile label="Leaks" value={leaks} accent={leaks > 0 ? DANGER : GREEN_LT} />
        <StatTile label="Taps" value={moves} accent={ORANGE_LT} />
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
          Real income leaks too. A specialist can map your salary to education, home and retirement &mdash; and seal the gaps.
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
