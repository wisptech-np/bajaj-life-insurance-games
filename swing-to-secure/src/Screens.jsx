// Screens.jsx — Home, How to Play, and Results screens for Swing to Secure.
//
// All art is inline SVG or CSS: no image files, no emoji. The screens share the
// game's identity — a dusk skyline, a hexagon-and-chevron shape language, and a
// sunset-amber accent inside the Bajaj brand blue/orange/green.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { COLORS, GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Swing to Secure';

/** Flat-top hex path in a 0 0 24 24 box — the repeated motif across all screens. */
const HEX24 = 'M12 1.6 21 6.8v10.4L12 22.4 3 17.2V6.8z';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Vault gate: the win mark. A hex with a locked chevron core. */
function VaultIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={HEX24} fill="#fff" opacity="0.95" />
      <path d="M8.4 13.6 12 9.4l3.6 4.2" stroke={COLORS.green} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Snapped tether: the lose mark. */
function TetherSnapIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff"
      strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v6" />
      <path d="M12 16v6" opacity="0.65" />
      <path d="m8.5 9.5 3.5 2.5-3.5 2.5M15.5 9.5 12 12l3.5 2.5" />
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

/* ─── Shared look ────────────────────────────────────────── */
/** Dusk field: night at the top, sunset burn at the bottom. Used by all three. */
const DUSK_BG = `
  radial-gradient(120% 62% at 72% 96%, rgba(242,101,34,0.5) 0%, rgba(242,101,34,0) 62%),
  radial-gradient(90% 46% at 50% 8%, rgba(44,123,239,0.28) 0%, rgba(4,9,28,0) 70%),
  linear-gradient(180deg, #04091C 0%, #0C2352 46%, #2E3E7C 74%, #7E3413 100%)
`;

const SCREEN_CSS = `
@keyframes stsFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes stsGlow    { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.1); } }
@keyframes stsTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.03em; transform: none; } }
@keyframes stsChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes stsHomeSwing { 0%,100% { transform: rotate(-36deg); } 50% { transform: rotate(28deg); } }
.sts-title { animation: stsTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.sts-float { animation: stsFloat 4s ease-in-out infinite; }
.sts-glow  { animation: stsGlow 2.6s ease-in-out infinite; }
.sts-chip  { animation: stsChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.sts-home-swing { animation: stsHomeSwing 3.6s ease-in-out infinite; transform-origin: 100px 44px; }
@media (prefers-reduced-motion: reduce) {
  .sts-title, .sts-float, .sts-glow, .sts-chip, .sts-home-swing,
  .sts-d-swingA, .sts-d-swingB, .sts-d-fly, .sts-d-finger,
  .sts-d-press, .sts-d-tetherA, .sts-d-tetherB, .sts-d-spark { animation: none !important; }
}
`;

/** Gradient/def block shared by the Home and How-to-Play art. */
function ArtDefs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}Body`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5FA0FF" />
        <stop offset="100%" stopColor="#00246A" />
      </linearGradient>
      <linearGradient id={`${id}Gold`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={COLORS.goldLt} />
        <stop offset="100%" stopColor={COLORS.goldDeep} />
      </linearGradient>
      <linearGradient id={`${id}Beacon`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9CC6FF" />
        <stop offset="100%" stopColor="#02163B" />
      </linearGradient>
      <radialGradient id={`${id}Sun`}>
        <stop offset="0%" stopColor="#FFECBE" stopOpacity="0.95" />
        <stop offset="40%" stopColor={COLORS.gold} stopOpacity="0.45" />
        <stop offset="100%" stopColor={COLORS.orange} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}Sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#04091C" />
        <stop offset="42%" stopColor="#0C2352" />
        <stop offset="72%" stopColor="#2E3E7C" />
        <stop offset="100%" stopColor="#B24C1B" />
      </linearGradient>
    </defs>
  );
}

/** Hex points helper — keeps every hex in the SVG art on the same geometry. */
function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** The guardian, drawn once and reused across every screen. */
function Guardian({ x, y, s = 1, idPrefix }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-2 -8 -19 -2 -11 2 -18 11 -2 8Z" fill={COLORS.orange} />
      <polygon points={hexPoints(0, 3, 8)} fill={`url(#${idPrefix}Body)`} />
      <path d="M-3.5 6 0 1.5 3.5 6" stroke={COLORS.goldLt} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polygon points={hexPoints(0, -8, 6)} fill={COLORS.brandBlue} stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
      <rect x="-3.8" y="-9.4" width="7.6" height="2.6" rx="1.3" fill={COLORS.goldLt} />
    </g>
  );
}

/** One hex beacon on its mast, with chevron catch-wings. */
function Beacon({ x, y, r = 12, lit, idPrefix }) {
  return (
    <g>
      <line x1={x} y1="0" x2={x} y2={y - r * 0.6} stroke="rgba(156,198,255,0.3)" strokeWidth="1.4" />
      <polygon points={hexPoints(x, y, r)} fill={`url(#${idPrefix}Beacon)`} stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
      {[-1, 1].map((d) => (
        <path
          key={d}
          d={`M${x + d * (r + 2)} ${y - r * 0.42} L${x + d * (r + 8)} ${y} L${x + d * (r + 2)} ${y + r * 0.42}`}
          stroke={lit ? COLORS.gold : 'rgba(156,198,255,0.7)'} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      ))}
      <polygon points={hexPoints(x, y, 3.6)} fill={lit ? COLORS.goldLt : COLORS.orangeLt} />
    </g>
  );
}

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [COLORS.gold, COLORS.goldLt, COLORS.orangeLt, COLORS.brandBlueLt, COLORS.brandBlue, COLORS.green, COLORS.orange];
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
        padding: '48px 22px 52px',
        background: DUSK_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10,
          padding: '5px 12px', borderRadius: 999,
          background: 'rgba(242,101,34,0.16)', border: '1px solid rgba(242,101,34,0.5)',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
            <path d={HEX24} fill={COLORS.gold} />
          </svg>
          <span style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '0.18em', color: COLORS.goldLt }}>
            MOMENTUM RUN
          </span>
        </div>
        <h1 className="sts-title" style={{
          fontSize: 36,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 0.95,
          margin: '0 0 8px 0',
          textShadow: '0 2px 14px rgba(0,0,0,0.6)',
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12,
          fontWeight: 800,
          color: 'rgba(255,255,255,0.72)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          maxWidth: 290,
        }}>
          Beacon to beacon, all the way to the vault
        </p>
      </div>

      {/* Skyline motif: beacons above, towers below, the vault on the horizon. */}
      <div className="sts-float" style={{ position: 'relative', width: 272, height: 236, zIndex: 1 }}>
        <svg width="272" height="236" viewBox="0 0 200 174" style={{ overflow: 'visible' }} aria-hidden="true">
          <ArtDefs id="h" />
          <clipPath id="hClip"><polygon points="4,26 26,4 174,4 196,26 196,148 174,170 26,170 4,148" /></clipPath>

          <polygon points="4,26 26,4 174,4 196,26 196,148 174,170 26,170 4,148"
            fill="#061029" stroke="rgba(255,255,255,0.14)" strokeWidth="1.4" />

          <g clipPath="url(#hClip)">
            <rect x="0" y="0" width="200" height="174" fill="url(#hSky)" />

            {/* Low sun */}
            <circle className="sts-glow" cx="150" cy="126" r="52" fill="url(#hSun)" />
            <polygon points={hexPoints(150, 126, 9)} fill="rgba(255,240,205,0.9)" />

            {/* Far towers */}
            {[[10, 96, 16], [30, 84, 13], [46, 104, 18], [68, 90, 14], [110, 100, 15], [130, 88, 12], [170, 94, 17]].map(([tx, ty, tw]) => (
              <path key={tx} d={`M${tx} 174 L${tx} ${ty + 7} L${tx + 7} ${ty} L${tx + tw - 7} ${ty} L${tx + tw} ${ty + 7} L${tx + tw} 174 Z`}
                fill="#12305C" opacity="0.75" stroke="rgba(255,176,32,0.28)" strokeWidth="0.9" />
            ))}
            {/* Near towers */}
            {[[0, 132, 26], [34, 122, 22], [76, 138, 30], [124, 126, 24], [162, 140, 34]].map(([tx, ty, tw]) => (
              <path key={`n${tx}`} d={`M${tx} 174 L${tx} ${ty + 8} L${tx + 8} ${ty} L${tx + tw - 8} ${ty} L${tx + tw} ${ty + 8} L${tx + tw} 174 Z`}
                fill="#050D22" stroke="rgba(242,101,34,0.4)" strokeWidth="1" />
            ))}

            <Beacon x={44} y={44} lit={false} idPrefix="h" />
            <Beacon x={100} y={44} lit idPrefix="h" />
            <Beacon x={158} y={52} lit={false} idPrefix="h" />

            {/* Guardian mid-swing on the lit beacon */}
            <g className="sts-home-swing">
              <line x1="100" y1="44" x2="100" y2="104" stroke={COLORS.gold} strokeWidth="5" strokeLinecap="round" opacity="0.35" />
              <line x1="100" y1="44" x2="100" y2="104" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              <Guardian x={100} y={112} s={1} idPrefix="h" />
            </g>

            {/* Premium chip on the ideal arc */}
            <polygon points={hexPoints(130, 84, 6)} fill="url(#hGold)" />
            <path d="M127 86l3-4 3 4" stroke={COLORS.goldDeep} strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round" fill="none" />

            {/* Risk mine */}
            <polygon points={hexPoints(72, 96, 6)} fill={COLORS.virus} />
            <polygon points={hexPoints(72, 96, 10)} fill="none" stroke={COLORS.virus} strokeWidth="1.4" opacity="0.6" />
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
            borderRadius: '18px 8px 18px 8px',
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.orange} 55%, ${COLORS.orangeDeep} 100%)`,
            boxShadow: '0 8px 26px rgba(242,101,34,0.5)',
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
 * Animation only (spec G2). A 4.2 s loop shows the real input — a finger that
 * presses to grab, holds through the swing, and lifts at the top of the forward
 * arc — driving the real outcome, in the game's own sprites and colours. The
 * only text on the screen is the heading, three one-word labels, and the button.
 */
const DEMO_CSS = `
@keyframes stsDFinger {
  0%,42%    { transform: translate(78px,130px) scale(1); }
  47%       { transform: translate(96px,116px) scale(0.92); }
  70%       { transform: translate(198px,116px) scale(0.92); }
  75%,100%  { transform: translate(216px,130px) scale(1); }
}
@keyframes stsDPress {
  0%        { opacity: 0; transform: scale(0.3); }
  6%        { opacity: 0.95; transform: scale(1); }
  26%,72%   { opacity: 0; transform: scale(1.7); }
  76%       { opacity: 0.95; transform: scale(1); }
  96%,100%  { opacity: 0; transform: scale(1.7); }
}
@keyframes stsDSwingA {
  0%,7%     { transform: rotate(-44deg); opacity: 1; }
  22%       { transform: rotate(-22deg); }
  32%       { transform: rotate(6deg); }
  43%       { transform: rotate(34deg); opacity: 1; }
  44%,100%  { transform: rotate(34deg); opacity: 0; }
}
@keyframes stsDFly {
  0%,43%    { opacity: 0; transform: translate(0,0); }
  45%       { opacity: 1; transform: translate(2px,-3px); }
  58%       { opacity: 1; transform: translate(34px,-17px); }
  72%       { opacity: 1; transform: translate(68px,4px); }
  74%,100%  { opacity: 0; transform: translate(68px,4px); }
}
@keyframes stsDSwingB {
  0%,73%    { opacity: 0; transform: rotate(-42deg); }
  76%       { opacity: 1; transform: rotate(-42deg); }
  92%       { opacity: 1; transform: rotate(-6deg); }
  100%      { opacity: 1; transform: rotate(10deg); }
}
@keyframes stsDTetherA {
  0%,4%     { stroke-dashoffset: 62; opacity: 0.4; }
  9%,43%    { stroke-dashoffset: 0; opacity: 1; }
  44%,100%  { stroke-dashoffset: 62; opacity: 0; }
}
@keyframes stsDTetherB {
  0%,73%    { stroke-dashoffset: 62; opacity: 0; }
  78%,100%  { stroke-dashoffset: 0; opacity: 1; }
}
@keyframes stsDSpark {
  0%,43%    { opacity: 0; transform: translate(0,0) scale(0.6); }
  48%       { opacity: 1; transform: translate(6px,-10px) scale(1); }
  62%,100%  { opacity: 0; transform: translate(14px,-24px) scale(1); }
}
.sts-d-finger  { animation: stsDFinger 4.2s linear infinite; }
.sts-d-press   { animation: stsDPress 4.2s linear infinite; transform-origin: 0 0; }
.sts-d-swingA  { animation: stsDSwingA 4.2s linear infinite; transform-origin: 78px 44px; }
.sts-d-swingB  { animation: stsDSwingB 4.2s linear infinite; transform-origin: 216px 52px; }
.sts-d-fly     { animation: stsDFly 4.2s linear infinite; }
.sts-d-tetherA { stroke-dasharray: 62; animation: stsDTetherA 4.2s linear infinite; }
.sts-d-tetherB { stroke-dasharray: 62; animation: stsDTetherB 4.2s linear infinite; }
.sts-d-spark   { animation: stsDSpark 4.2s linear infinite; }
`;

/** Finger glyph — the real input, not a description of it. */
function FingerGlyph() {
  return (
    <g className="sts-d-finger">
      <g className="sts-d-press">
        <circle cx="0" cy="-16" r="13" fill="none" stroke={COLORS.orangeLt} strokeWidth="2.4" />
      </g>
      <path
        d="M0 -16 V-2 M0 -2 c-7 0-11 4-11 10 v8 h22 v-9 c0-5-4-9-11-9z"
        fill="rgba(4,9,28,0.85)" stroke={COLORS.goldLt} strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </g>
  );
}

function DemoLabel({ children, icon }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 5,
      padding: '9px 4px',
      borderRadius: '14px 5px 14px 5px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.13)',
    }}>
      {icon}
      <span style={{
        fontSize: 9.5, fontWeight: 900, letterSpacing: '0.14em',
        color: 'rgba(255,255,255,0.85)',
      }}>
        {children}
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
        background: DUSK_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `${SCREEN_CSS}${DEMO_CSS}` }} />

      <div style={{
        background: 'rgba(4,9,28,0.7)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '28px 10px 28px 10px',
        padding: '22px 16px 18px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 14px 44px rgba(0,0,0,0.5)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 22, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.01em', margin: '0 0 12px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        {/* The demo. Everything the player needs to learn happens in here. */}
        <div style={{
          borderRadius: '20px 8px 20px 8px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(180deg,#04091C 0%,#0C2352 52%,#8C3B14 100%)',
          marginBottom: 12,
        }}>
          <svg viewBox="0 0 300 176" width="100%" style={{ display: 'block' }} aria-hidden="true">
            <ArtDefs id="d" />

            {/* Skyline floor so the demo shares the game's world. */}
            {[[6, 138, 30], [50, 128, 26], [96, 146, 34], [150, 134, 28], [200, 148, 38], [252, 132, 30]].map(([tx, ty, tw]) => (
              <path key={tx} d={`M${tx} 176 L${tx} ${ty + 8} L${tx + 8} ${ty} L${tx + tw - 8} ${ty} L${tx + tw} ${ty + 8} L${tx + tw} 176 Z`}
                fill="#050D22" stroke="rgba(242,101,34,0.38)" strokeWidth="1" />
            ))}

            {/* Beacons */}
            <Beacon x={78} y={44} lit idPrefix="d" />
            <Beacon x={216} y={52} lit idPrefix="d" />

            {/* Beat 1+2 — grab and swing on the first beacon */}
            <g className="sts-d-swingA">
              <line className="sts-d-tetherA" x1="78" y1="44" x2="78" y2="102"
                stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              <Guardian x={78} y={110} idPrefix="d" />
            </g>

            {/* Beat 3 — release and fly */}
            <g className="sts-d-fly">
              <Guardian x={110} y={92} idPrefix="d" />
            </g>
            <g className="sts-d-spark" transform="translate(112,80)">
              <polygon points={hexPoints(0, 0, 7)} fill="url(#dGold)" />
              <path d="M-3 2 0-2.4 3 2" stroke={COLORS.goldDeep} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            {/* Loop close — grab the next beacon */}
            <g className="sts-d-swingB">
              <line className="sts-d-tetherB" x1="216" y1="52" x2="216" y2="110"
                stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              <Guardian x={216} y={118} idPrefix="d" />
            </g>

            <FingerGlyph />
          </svg>
        </div>

        {/* Max three icon-led labels, one word each. */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
          <DemoLabel icon={(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.goldLt}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v9M12 12c-4 0-6 2-6 5v3h12v-4c0-2.5-2-4-6-4z" />
            </svg>
          )}>
            HOLD
          </DemoLabel>
          <DemoLabel icon={(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.brandBlueLt}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6a11 11 0 0 0 16 0" />
              <path d="M12 3v3" />
              <circle cx="12" cy="17" r="2.6" fill={COLORS.brandBlueLt} stroke="none" />
            </svg>
          )}>
            SWING
          </DemoLabel>
          <DemoLabel icon={(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.orangeLt}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 19 19 5" />
              <path d="M13 5h6v6" />
              <path d="M4 12 7 9" opacity="0.6" />
            </svg>
          )}>
            RELEASE
          </DemoLabel>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52, border: 'none',
              borderRadius: '16px 7px 16px 7px',
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.orange} 60%, ${COLORS.orangeDeep} 100%)`,
              boxShadow: '0 6px 22px rgba(242,101,34,0.45)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <PlayIcon size={18} />
            <span>Play</span>
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
      borderRadius: '14px 5px 14px 5px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.13)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 19, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const distance = stats?.distance || 0;
  const coins = stats?.coins || 0;
  const milestonesHit = stats?.milestones || 0;
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
    const shareMessage = `Hi,\nI swung ${distance.toLocaleString()} m and scored ${score} points in the ${GAME_TITLE} challenge.\nEvery milestone needs momentum — and cover. Take your swing here: ${shareUrl}`.trim();

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
  const strokeColor = won ? COLORS.green : score < 500 ? COLORS.virus : COLORS.gold;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : score < 500 ? 'rgba(255,59,78,0.4)' : 'rgba(255,176,32,0.45)';

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
        background: DUSK_BG,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      {won && <Confetti />}

      {/* Outcome header */}
      <div style={{ textAlign: 'center', marginBottom: 14, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '7px 16px', borderRadius: 999,
          background: won ? 'rgba(40,167,69,0.22)' : 'rgba(255,59,78,0.18)',
          border: `1px solid ${won ? 'rgba(40,167,69,0.5)' : 'rgba(255,59,78,0.45)'}`,
          marginBottom: 10,
        }}>
          {won ? <VaultIcon size={20} /> : <TetherSnapIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Vault secured' : 'Run ended'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: COLORS.gold }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your run.</span>
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
          {/* Hex inlay behind the number keeps the ring on-motif. */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 200 200" aria-hidden="true">
            <polygon points={hexPoints(100, 100, 56)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
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
          </div>
        </div>
      </div>

      {/* Run stats */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 12, zIndex: 2 }}>
        <StatTile label="Distance" value={`${distance.toLocaleString()}m`} accent={COLORS.brandBlueLt} />
        <StatTile label="Chips" value={coins} accent={COLORS.gold} />
        <StatTile label="Milestones" value={`${milestonesHit}/${GAME_CONFIG.milestones.length}`} accent={COLORS.green} />
      </div>

      {/* Milestone chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2,
      }}>
        {GAME_CONFIG.milestones.map((ms, i) => {
          const hit = distance >= ms.m;
          return (
            <span
              key={ms.m}
              className="sts-chip"
              style={{
                animationDelay: `${180 + i * 90}ms`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10.5,
                fontWeight: 800,
                padding: '5px 11px',
                borderRadius: '10px 4px 10px 4px',
                color: hit ? '#fff' : 'rgba(255,255,255,0.4)',
                background: hit ? 'rgba(40,167,69,0.85)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${hit ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 4l8 8-8 8" />
              </svg>
              {ms.label}
            </span>
          );
        })}
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: `linear-gradient(135deg, ${COLORS.brandBlueLt}, ${COLORS.brandBlue})`,
          color: '#fff', fontWeight: 900,
          height: 50, borderRadius: '16px 7px 16px 7px', border: 'none', cursor: 'pointer',
          fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 6px 20px rgba(44,123,239,0.4)',
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
        borderRadius: '24px 10px 24px 10px', padding: '18px 16px',
        border: '1px solid rgba(255,255,255,0.13)',
        textAlign: 'center', marginBottom: 16, zIndex: 2,
      }}>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.35, margin: '0 0 16px 0' }}>
          Momentum carried you this far. A specialist can make sure every real milestone is covered.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.orange} 60%, ${COLORS.orangeDeep} 100%)`,
                color: '#fff', fontWeight: 900, padding: '15px 20px',
                borderRadius: '16px 7px 16px 7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 17, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                boxShadow: '0 6px 20px rgba(242,101,34,0.38)',
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
                padding: '14px 20px', borderRadius: '16px 7px 16px 7px',
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
            flex: 2, height: 48, borderRadius: '14px 6px 14px 6px', cursor: 'pointer',
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
            flex: 1, height: 48, borderRadius: '14px 6px 14px 6px', cursor: 'pointer',
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
