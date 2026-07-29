// Screens.jsx — Home, How to Play, and Results screens for Goal Juggler.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, GOALS, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Goal Juggler';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js — only the four
   goal hues, which have to match the orbs the player just juggled. */
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

/** Won: all four goals still in the air, held up by a shield. */
function KeptUpIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="8" cy="7" r="3.2" fill={GOLD} />
      <circle cx="16" cy="4.5" r="3.2" fill={GREEN_LT} />
      <circle cx="24" cy="7" r="3.2" fill={ORANGE_LT} />
      <circle cx="16" cy="12.5" r="3.2" fill="#5FA8FF" />
      <path d="M16 17 8 20v4c0 3.6 3.2 6.6 8 8 4.8-1.4 8-4.4 8-8v-4l-8-3z"
        fill="rgba(30,107,224,0.45)" stroke="#A6D0FF" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Lost: an orb shattered on the floor line. */
function DroppedIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M3 25h26" stroke={DANGER} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11 22 9 15l4 3 2-6 3 5 3-2-1 7z" fill={GOLD} opacity="0.85" />
      <path d="M7 20l-1.5 3M25 20l1.5 3M16 19l0 3.5" stroke={DANGER} strokeWidth="1.8"
        strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

/** Lost on the target: the clock ran out with the score bar short. */
function ShortIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="17" r="11" stroke={GOLD} strokeWidth="2.2" opacity="0.55" />
      <path d="M16 10v7l4.5 3" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 3h10" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
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

/* ─── The four goal silhouettes, as SVG ────────────────────
   Same outlines the canvas draws, so the screens preview the game rather than
   illustrating it. Unit coordinates scaled to a given radius. */
function GoalGlyph({ goal, r = 12, x = 0, y = 0 }) {
  const s = r * 0.60;
  const t = `translate(${x} ${y}) scale(${s})`;
  if (goal.glyph === 'book') {
    return (
      <g transform={t}>
        <path d="M-0.03 -0.34C-0.24 -0.52 -0.52 -0.58 -0.74 -0.5L-0.74 0.42C-0.52 0.32 -0.24 0.36 -0.03 0.54Z" fill="#fff" opacity="0.94" />
        <path d="M0.03 -0.34C0.24 -0.52 0.52 -0.58 0.74 -0.5L0.74 0.42C0.52 0.32 0.24 0.36 0.03 0.54Z" fill="#fff" opacity="0.94" />
        <path d="M0 -0.36L0 0.52" stroke={goal.colorDeep} strokeWidth="0.075" />
      </g>
    );
  }
  if (goal.glyph === 'house') {
    return (
      <g transform={t}>
        <path d="M0 -0.68L0.76 -0.04L0.55 -0.04L0.55 0.6L-0.55 0.6L-0.55 -0.04L-0.76 -0.04Z" fill="#fff" opacity="0.94" />
        <path d="M-0.17 0.6L-0.17 0.26Q-0.17 0.14 0 0.14Q0.17 0.14 0.17 0.26L0.17 0.6Z" fill={goal.colorDeep} />
      </g>
    );
  }
  if (goal.glyph === 'heart') {
    return (
      <g transform={t}>
        <path d="M0 0.6C-0.3 0.32 -0.78 0.02 -0.78 -0.24C-0.78 -0.58 -0.38 -0.68 -0.15 -0.42L0 -0.27L0.15 -0.42C0.38 -0.68 0.78 -0.58 0.78 -0.24C0.78 0.02 0.3 0.32 0 0.6Z" fill="#fff" opacity="0.94" />
      </g>
    );
  }
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const w = 0.11;
    const r0 = 0.44;
    const r1 = 0.76;
    rays.push(
      <path
        key={i}
        d={`M${ca * r0 - sa * w} ${sa * r0 + ca * w}L${ca * r1 - sa * w * 0.42} ${sa * r1 + ca * w * 0.42}`
          + `L${ca * r1 + sa * w * 0.42} ${sa * r1 - ca * w * 0.42}L${ca * r0 + sa * w} ${sa * r0 - ca * w}Z`}
        fill="#fff"
        opacity="0.94"
      />,
    );
  }
  return (
    <g transform={t}>
      <circle cx="0" cy="0" r="0.34" fill="#fff" opacity="0.94" />
      {rays}
    </g>
  );
}

/** A full orb: glow, body gradient, rim, silhouette. */
function Orb({ goal, r = 14, x = 0, y = 0, className, style }) {
  return (
    <g className={className} style={style}>
      <circle cx={x} cy={y} r={r * 1.5} fill={goal.color} opacity="0.14" />
      <circle cx={x} cy={y} r={r} fill={`url(#gjOrb${goal.key})`} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={goal.colorLt} strokeWidth={r * 0.09} opacity="0.65" />
      <GoalGlyph goal={goal} r={r} x={x} y={y} />
      <ellipse cx={x - r * 0.34} cy={y - r * 0.4} rx={r * 0.28} ry={r * 0.15}
        transform={`rotate(-40 ${x - r * 0.34} ${y - r * 0.4})`} fill="rgba(255,255,255,0.45)" />
    </g>
  );
}

function OrbDefs() {
  return (
    <defs>
      {GOALS.map((g) => (
        <radialGradient key={g.key} id={`gjOrb${g.key}`} cx="0.34" cy="0.30" r="0.78">
          <stop offset="0%" stopColor={g.colorLt} />
          <stop offset="46%" stopColor={g.color} />
          <stop offset="100%" stopColor={g.colorDeep} />
        </radialGradient>
      ))}
    </defs>
  );
}

/* ─── Shared keyframes ───────────────────────────────────── */
const SCREEN_CSS = `
@keyframes gjTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes gjFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes gjGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes gjChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes gjJugA { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-52px); } }
@keyframes gjJugB { 0%,100% { transform: translateY(-46px); } 50% { transform: translateY(4px); } }
@keyframes gjJugC { 0%,100% { transform: translateY(-18px); } 50% { transform: translateY(-62px); } }
@keyframes gjJugD { 0%,100% { transform: translateY(-60px); } 50% { transform: translateY(-8px); } }
@keyframes gjTapRing { 0% { r: 4; opacity: 0.9; } 100% { r: 26; opacity: 0; } }
@keyframes gjFinger { 0%,42% { opacity: 0; transform: translateY(10px); } 50% { opacity: 1; transform: translateY(0); } 66%,100% { opacity: 0; transform: translateY(0); } }
@keyframes gjBeatTap { 0%,45% { transform: translateY(0); } 55% { transform: translateY(3px) scaleY(0.86); } 100% { transform: translateY(-26px); } }
@keyframes gjBeatSteer { 0%,40% { transform: translate(0,0); } 100% { transform: translate(20px,-22px); } }
@keyframes gjBeatFall { 0% { transform: translateY(-24px); opacity: 1; } 70% { transform: translateY(16px); opacity: 1; } 100% { transform: translateY(16px); opacity: 0.25; } }
.gj-title { animation: gjTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.gj-float { animation: gjFloat 4s ease-in-out infinite; }
.gj-glow  { animation: gjGlow 2.2s ease-in-out infinite; }
.gj-chip  { animation: gjChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.gj-jug-a { animation: gjJugA 2.0s ease-in-out infinite; }
.gj-jug-b { animation: gjJugB 2.0s ease-in-out infinite; }
.gj-jug-c { animation: gjJugC 2.4s ease-in-out infinite; }
.gj-jug-d { animation: gjJugD 2.4s ease-in-out infinite; }
.gj-finger { animation: gjFinger 2.0s ease-in-out infinite; }
.gj-beat-tap { animation: gjBeatTap 1.9s ease-out infinite; }
.gj-beat-steer { animation: gjBeatSteer 1.9s ease-out infinite; }
.gj-beat-fall { animation: gjBeatFall 1.9s ease-in infinite; }
@media (prefers-reduced-motion: reduce) {
  .gj-title, .gj-float, .gj-glow, .gj-chip, .gj-jug-a, .gj-jug-b, .gj-jug-c, .gj-jug-d,
  .gj-finger, .gj-beat-tap, .gj-beat-steer, .gj-beat-fall { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, ORANGE_LT, BLUE_LT, BLUE, GREEN, '#5FA8FF'];
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
 * Hero motif: the playfield itself — four goal orbs at different points of
 * their arcs inside the walled court, the red floor line beneath them and a
 * finger landing a tap on the lowest one. Built from the same silhouettes and
 * the same colour grammar the canvas uses.
 */
function HeroCourt() {
  const left = 18;
  const right = 182;
  const top = 22;
  const bottom = 158;

  return (
    <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id="gjSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#08152F" />
          <stop offset="55%" stopColor="#0C2A57" />
          <stop offset="100%" stopColor="#061229" />
        </linearGradient>
        <clipPath id="gjClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
      </defs>
      <OrbDefs />

      <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#gjSky)"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

      <g clipPath="url(#gjClip)">
        <g className="gj-glow">
          <ellipse cx="100" cy="80" rx="94" ry="66" fill="rgba(120,170,240,0.16)" />
        </g>

        {/* Rails */}
        <rect x={left - 4} y={top - 4} width="3" height={bottom - top + 8} rx="1.5" fill="rgba(150,190,240,0.4)" />
        <rect x={right + 1} y={top - 4} width="3" height={bottom - top + 8} rx="1.5" fill="rgba(150,190,240,0.4)" />
        <line x1={left - 4} y1={top} x2={right + 4} y2={top} stroke="rgba(190,220,255,0.3)" strokeWidth="1.2" />

        {/* High-keep guide */}
        <line x1={left} y1={top + (bottom - top) / 3} x2={right} y2={top + (bottom - top) / 3}
          stroke="rgba(166,208,255,0.3)" strokeWidth="0.9" strokeDasharray="4 6" />

        {/* Floor hazard */}
        <rect x="0" y={bottom} width="200" height={190 - bottom} fill="rgba(239,68,68,0.18)" />
        <line x1={left - 5} y1={bottom} x2={right + 5} y2={bottom} stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />

        {/* Four goals mid-juggle */}
        <Orb goal={GOALS[0]} r={13} x={44} y={92} className="gj-jug-a" />
        <Orb goal={GOALS[1]} r={13} x={82} y={96} className="gj-jug-b" />
        <Orb goal={GOALS[2]} r={13} x={120} y={92} className="gj-jug-c" />
        <Orb goal={GOALS[3]} r={13} x={158} y={96} className="gj-jug-d" />

        {/* A tap landing on the lowest orb */}
        <g className="gj-finger">
          <circle cx="82" cy="100" r="4" fill="none" stroke="#fff" strokeWidth="2" opacity="0.9" />
          <circle cx="82" cy="100" r="14" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.35" />
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
        <h1 className="gj-title" style={{
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
          maxWidth: 320,
          lineHeight: 1.45,
        }}>
          Education, home, health, retirement &mdash; real life means keeping every goal in the air at once.
        </p>
      </div>

      <div className="gj-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <HeroCourt />
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

/** A miniature court for the tutorial diagrams. */
function BeatCourt({ children }) {
  return (
    <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
      <OrbDefs />
      <rect x="4" y="4" width="2" height="48" rx="1" fill="rgba(150,190,240,0.4)" />
      <rect x="68" y="4" width="2" height="48" rx="1" fill="rgba(150,190,240,0.4)" />
      <line x1="4" y1="4" x2="70" y2="4" stroke="rgba(190,220,255,0.3)" strokeWidth="1" />
      <rect x="0" y="52" width="74" height="10" fill="rgba(239,68,68,0.16)" />
      <line x1="2" y1="52" x2="72" y2="52" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" />
      {children}
    </svg>
  );
}

export function HowToPlayScreen({ onPlay }) {
  const cfg = GAME_CONFIG;
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
          Tap to bounce &middot; Tap off-centre to steer &middot; Never let one reach the floor
        </p>
        {/* The shared input kit tracks a single pointer, so a second finger
            resting on the glass swallows every tap. The kit is immutable, so the
            player is told rather than fixed. */}
        <p style={{
          fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,0.55)',
          margin: '-8px 0 14px 0', lineHeight: 1.4, letterSpacing: '0.02em',
        }}>
          Use <strong style={{ color: '#fff' }}>one finger</strong> &mdash; keep your other hand off the screen.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Beat n="1" title="Tap to keep it up" copy="A tap knocks the orb straight back up. Tap anywhere near it — the target is far bigger than it looks.">
            <BeatCourt>
              <g className="gj-beat-tap">
                <Orb goal={GOALS[0]} r={9} x={37} y={38} />
              </g>
              <circle className="gj-finger" cx="37" cy="46" r="4" fill="none" stroke="#fff" strokeWidth="1.6" />
            </BeatCourt>
          </Beat>

          <Beat n="2" title="Off-centre to steer" copy="Tap the left of an orb and it goes right. That is how you pull one back from a wall — or out of a gust.">
            <BeatCourt>
              <g className="gj-beat-steer">
                <Orb goal={GOALS[1]} r={9} x={26} y={34} />
              </g>
              <circle className="gj-finger" cx="18" cy="40" r="3.6" fill="none" stroke="#fff" strokeWidth="1.6" />
              <path d="M30 30 L46 18" stroke={ORANGE_LT} strokeWidth="1.6" strokeDasharray="3 3" strokeLinecap="round" opacity="0.8" />
            </BeatCourt>
          </Beat>

          <Beat n="3" title="The floor costs a cover" copy={`Miss one and it shatters — ${cfg.covers} covers and the run is over. It comes back after ${cfg.serve.respawnSeconds}s.`}>
            <BeatCourt>
              <g className="gj-beat-fall">
                <Orb goal={GOALS[2]} r={9} x={37} y={36} />
              </g>
              <path d="M26 58l-2 3M37 58l0 3M48 58l2 3" stroke={DANGER} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
            </BeatCourt>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          <strong style={{ color: '#fff' }}>{cfg.sessionSeconds} seconds.</strong> Orbs grow{' '}
          <strong style={{ color: GOLD }}>1 &rarr; {cfg.maxOrbs}</strong> at{' '}
          {cfg.orbSchedule.join('s / ')}s, and a{' '}
          <strong style={{ color: ORANGE_LT }}>risk gust</strong> starts blowing at{' '}
          {cfg.gust.startSeconds}s. Survive with fewer than{' '}
          <strong style={{ color: DANGER }}>{cfg.covers}</strong> drops and at least{' '}
          <strong style={{ color: GREEN_LT }}>{cfg.targetScore.toLocaleString()}</strong> points to win.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 18 }}>
          {[
            { k: 'b', label: `Bounce +${cfg.scoring.bouncePerOrb} x orbs`, color: GREEN_LT },
            { k: 'h', label: `High keep +${cfg.scoring.highKeep}`, color: GOLD },
            { k: 's', label: `All four ${cfg.scoring.allUpSeconds}s +${cfg.scoring.allUpBonus}`, color: ORANGE_LT },
          ].map((c, i) => (
            <span
              key={c.k}
              className="gj-chip"
              style={{
                animationDelay: `${140 + i * 80}ms`,
                fontSize: 10,
                fontWeight: 900,
                padding: '4px 9px',
                borderRadius: 999,
                color: c.color,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {c.label}
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

export function ResultsScreen({ stats, won, endCause, onRetry, onHome, onBookSlot, retryLabel }) {
  const cfg = GAME_CONFIG;
  const score = stats?.score || 0;
  const bounces = stats?.bounces || 0;
  const maxOrbs = stats?.maxOrbs || 0;
  const drops = stats?.drops || 0;
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';
  /* Lost on the clock rather than on covers: survived all 80s but finished
     under the score target. A different sentence, and a different lesson. */
  const shortOfTarget = !won && endCause === 'target';

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
    const shareMessage = `Hi,\nI kept ${maxOrbs} life goals in the air at once and scored ${score.toLocaleString()} in the ${GAME_TITLE} challenge.\nReal life juggles all of them at the same time - cover is what catches the one you miss. Take your turn here: ${shareUrl}`.trim();

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
          {won ? <KeptUpIcon size={20} /> : shortOfTarget ? <ShortIcon size={20} /> : <DroppedIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {/* Truthful outcome. There are two ways to lose and they are not the
                same story: running out of covers, or lasting the whole 80s but
                coasting. Reporting the floor for both would be a lie the player
                can see through — they watched the clock run out. */}
            {won ? 'Every goal kept up' : shortOfTarget ? 'Lasted, but coasted' : 'A goal hit the floor'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
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
              target {cfg.targetScore.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, bounces, maxOrbs, drops} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Bounces" value={bounces} accent={GREEN_LT} />
        <StatTile label="Most in air" value={`${maxOrbs}/${cfg.maxOrbs}`} accent={GOLD} />
        <StatTile label="Dropped" value={drops} accent={DANGER} />
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
          Nobody keeps all four in the air forever. Cover is what catches the one you miss &mdash; a
          specialist can show you which goals yours should be catching.
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
