// Screens.jsx — Home, How to Play and Results screens for Smart Recall.
// All art is inline SVG or CSS: no image files, no emoji.
//
// The home and how-to art deliberately shows the SAME nine goal tiles the
// canvas draws, lighting one at a time with a numbered order badge. That is the
// screen's job here: the store already has a concentration/pairs game, so these
// screens have to say "ordered recall" before the player presses Start — face-up
// tiles, a visible 1-2-3-4 order, and nothing that ever flips.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, GOALS, perfectScore } from './data.js';
import { tapCount } from './sequence.js';

const GAME_TITLE = 'Smart Recall';
const TAGLINE = 'A financial plan only works if you remember every step — recall it in order, skip the risky detours.';
const PERFECT_SCORE = perfectScore(GAME_CONFIG);
const ROUNDS = GAME_CONFIG.rounds;
const LONGEST = ROUNDS[ROUNDS.length - 1].len;
const TOTAL_TAPS = ROUNDS.reduce((a, _, i) => a + tapCount(GAME_CONFIG, i + 1), 0);

/* Brand palette, inline. These screens are chrome rather than gameplay. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FF8A3D';
const GREEN_LT = '#4ADE80';
const GOLD = '#FFC845';
const GOLD_LT = '#FFE38A';
const DANGER = '#EF4444';
const DANGER_LT = '#FF8B8B';
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

/** Run-ended mark: a broken chain of steps. */
function ForgottenIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="6" cy="16" r="3.4" fill="#fff" />
      <circle cx="16" cy="16" r="3.4" fill="#fff" opacity="0.85" />
      <circle cx="26" cy="16" r="3.4" fill="#fff" opacity="0.3" />
      <path d="M20 10l6 6M26 10l-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
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

/* ─── Goal glyphs (24x24, same silhouettes as the canvas) ── */
function GoalGlyph({ kind, fill, cut, size = 24 }) {
  const common = { fill, stroke: 'none' };
  let body = null;
  switch (kind) {
    case 'heart':
      body = (
        <>
          <path d="M12 20.4C1.5 12.6 5.2 3.4 12 8.7 18.8 3.4 22.5 12.6 12 20.4Z" {...common} />
          <path d="M5.6 11.9h2.9l1.4-2.6 1.9 5.2 1.4-2.6h3.2" fill="none" stroke={cut} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
      break;
    case 'house':
      body = (
        <>
          <path d="M12 3 22 11.6H2Z" {...common} />
          <rect x="4.6" y="11.2" width="14.8" height="9.6" rx="1.4" {...common} />
          <path d="M10 20.8v-5.2a2 2 0 0 1 4 0v5.2Z" fill={cut} />
        </>
      );
      break;
    case 'cap':
      body = (
        <>
          <path d="M12 3.4 22.8 8.7 12 14 1.2 8.7Z" {...common} />
          <path d="M6.7 10.7v6.1c3.2 2.3 7.4 2.3 10.6 0v-6.1Z" {...common} />
          <path d="M21.2 10v4.6" fill="none" stroke={fill} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="21.2" cy="16" r="1.5" {...common} />
        </>
      );
      break;
    case 'sun':
      body = (
        <>
          <circle cx="12" cy="10" r="4.3" {...common} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i * Math.PI) / 4 - Math.PI / 2;
            return (
              <line key={i}
                x1={12 + Math.cos(a) * 6.2} y1={10 + Math.sin(a) * 6.2}
                x2={12 + Math.cos(a) * 8.6} y2={10 + Math.sin(a) * 8.6}
                stroke={fill} strokeWidth="1.7" strokeLinecap="round" />
            );
          })}
          <rect x="2" y="19.4" width="20" height="2.1" rx="1.05" {...common} />
        </>
      );
      break;
    case 'plane':
      body = (
        <>
          <path d="M22 2.6 2 11.4l8.6 2.3Z" {...common} />
          <path d="M22 2.6 10.6 13.7l1.9 7.7Z" {...common} opacity="0.62" />
        </>
      );
      break;
    case 'family':
      body = (
        <>
          <circle cx="6.4" cy="7.6" r="2.7" {...common} />
          <path d="M2.6 20.4c0-4 1.7-7 3.8-7s3.8 3 3.8 7Z" {...common} />
          <circle cx="17.6" cy="7.6" r="2.7" {...common} />
          <path d="M13.8 20.4c0-4 1.7-7 3.8-7s3.8 3 3.8 7Z" {...common} />
          <circle cx="12" cy="12.4" r="2.1" {...common} />
          <path d="M8.9 21c0-3 1.4-5.2 3.1-5.2s3.1 2.2 3.1 5.2Z" {...common} />
        </>
      );
      break;
    case 'coins':
      body = (
        <>
          <ellipse cx="12" cy="18.4" rx="8.4" ry="2.9" {...common} />
          <ellipse cx="12" cy="13.6" rx="8.4" ry="2.9" {...common} />
          <ellipse cx="12" cy="8.8" rx="8.4" ry="2.9" {...common} />
          <rect x="10.6" y="7.9" width="2.8" height="1.7" rx="0.85" fill={cut} />
        </>
      );
      break;
    case 'rings':
      body = (
        <>
          <circle cx="8.4" cy="14.4" r="5.4" fill="none" stroke={fill} strokeWidth="2.3" />
          <circle cx="15.6" cy="14.4" r="5.4" fill="none" stroke={fill} strokeWidth="2.3" />
          <path d="M8.4 2.6 11.3 6.3H5.5Z" {...common} />
        </>
      );
      break;
    case 'shieldbolt':
    default:
      body = (
        <>
          <path d="M12 2.2 20.6 6.6v6.1c0 4.2-3.3 7.7-8.6 9.1-5.3-1.4-8.6-4.9-8.6-9.1V6.6Z" {...common} />
          <path d="M13.7 7 8.4 13.7h3.1l-1.2 4.6 5.3-6.7h-3.1Z" fill={cut} />
        </>
      );
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {body}
    </svg>
  );
}

/* ─── Shared keyframes ───────────────────────────────────── */
const SCREEN_CSS = `
@keyframes srTitleIn { from { opacity: 0; letter-spacing: 0.22em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes srFloat  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes srGlow   { 0%,100% { opacity: 0.28; } 50% { opacity: 0.85; } }
@keyframes srChip   { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
/* Four tiles light one after another on a 4.4s cycle: 0.55s lit each, then the
   whole board rests. That is the game's playback, at the game's real cadence. */
@keyframes srLight  { 0%, 4% { opacity: 0; transform: scale(1); } 6% { opacity: 1; transform: scale(1.07); } 16% { opacity: 1; transform: scale(1.04); } 20%, 100% { opacity: 0; transform: scale(1); } }
@keyframes srBadge  { 0%, 4% { opacity: 0; transform: scale(0.6); } 8% { opacity: 1; transform: scale(1.1); } 14% { transform: scale(1); } 62% { opacity: 1; } 72%, 100% { opacity: 0; } }
@keyframes srTapRing{ 0%, 62% { opacity: 0; transform: scale(0.7); } 68% { opacity: 0.9; transform: scale(1); } 82%, 100% { opacity: 0; transform: scale(1.3); } }
@keyframes srRisk   { 0%, 30% { opacity: 0; } 38%, 66% { opacity: 1; } 74%, 100% { opacity: 0; } }
@keyframes srHand   { 0%, 55% { opacity: 0; transform: translate(0,10px) scale(1); } 62% { opacity: 1; transform: translate(0,0) scale(0.9); } 78% { opacity: 1; transform: translate(0,0) scale(1); } 88%, 100% { opacity: 0; transform: translate(0,6px) scale(1); } }
/* How-to-play loop (6 s). First half is the plan playing back on the real 3x3
   board — three goals in order plus one red detour. Second half is the finger
   tapping the same three back and arcing around the red one. */
@keyframes srdLit1  { 0%,4%  { opacity: 0; } 6%,13%  { opacity: 1; } 16%,100% { opacity: 0; } }
@keyframes srdLit2  { 0%,15% { opacity: 0; } 17%,24% { opacity: 1; } 27%,100% { opacity: 0; } }
@keyframes srdRisk  { 0%,26% { opacity: 0; } 28%,35% { opacity: 1; } 38%,100% { opacity: 0; } }
@keyframes srdLit3  { 0%,37% { opacity: 0; } 39%,46% { opacity: 1; } 49%,100% { opacity: 0; } }
@keyframes srdTap1  { 0%,58% { opacity: 0; } 60%,66% { opacity: 1; } 69%,100% { opacity: 0; } }
@keyframes srdTap2  { 0%,71% { opacity: 0; } 73%,79% { opacity: 1; } 82%,100% { opacity: 0; } }
@keyframes srdTap3  { 0%,87% { opacity: 0; } 89%,95% { opacity: 1; } 98%,100% { opacity: 0; } }
@keyframes srdHand  { 0%,46% { opacity: 0; transform: translate(22px,74px); } 50% { opacity: 1; transform: translate(7px,28px); } 55% { opacity: 1; transform: translate(0,0); } 59% { opacity: 1; transform: translate(0,5px); } 64% { opacity: 1; transform: translate(0,0); } 69% { opacity: 1; transform: translate(51px,51px); } 73% { opacity: 1; transform: translate(51px,56px); } 78% { opacity: 1; transform: translate(51px,51px); } 85% { opacity: 1; transform: translate(-51px,51px); } 89% { opacity: 1; transform: translate(-51px,56px); } 94% { opacity: 1; transform: translate(-51px,51px); } 98%,100% { opacity: 0; transform: translate(-51px,68px); } }
@keyframes srdWin   { 0%,90% { opacity: 0; transform: scale(0.82); } 94% { opacity: 1; transform: scale(1); } 99%,100% { opacity: 0; transform: scale(1.12); } }
.sr-title { animation: srTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.sr-float { animation: srFloat 4s ease-in-out infinite; }
.sr-glow  { animation: srGlow 2.4s ease-in-out infinite; }
.sr-chip  { animation: srChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.sr-light { animation: srLight 4.4s ease-in-out infinite; transform-origin: center; }
.sr-badge { animation: srBadge 4.4s ease-in-out infinite; transform-origin: center; }
.sr-tapring { animation: srTapRing 4.4s ease-in-out infinite; transform-origin: center; }
.sr-risk  { animation: srRisk 2.6s ease-in-out infinite; }
.sr-hand  { animation: srHand 2.6s ease-in-out infinite; }
.srd-lit1 { animation: srdLit1 6s ease-in-out infinite; }
.srd-lit2 { animation: srdLit2 6s ease-in-out infinite; }
.srd-risk { animation: srdRisk 6s ease-in-out infinite; }
.srd-lit3 { animation: srdLit3 6s ease-in-out infinite; }
.srd-tap1 { animation: srdTap1 6s ease-out infinite; }
.srd-tap2 { animation: srdTap2 6s ease-out infinite; }
.srd-tap3 { animation: srdTap3 6s ease-out infinite; }
.srd-hand { animation: srdHand 6s cubic-bezier(0.3,0,0.3,1) infinite; }
.srd-win  { animation: srdWin 6s ease-out infinite; transform-origin: center; }
@media (prefers-reduced-motion: reduce) {
  .sr-title, .sr-float, .sr-glow, .sr-chip, .sr-light, .sr-badge,
  .sr-tapring, .sr-risk, .sr-hand, .srd-lit1, .srd-lit2, .srd-risk,
  .srd-lit3, .srd-tap1, .srd-tap2, .srd-tap3, .srd-hand, .srd-win { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, ORANGE_LT, BLUE_LT, GREEN_LT, '#EC5FA8', '#17C3D4'];
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

/* ─── The board motif ─────────────────────────────────────
   A face-up 3x3 of the real nine goals. `sequence` is the order the demo lights
   them in; each lit tile carries its step number, so the screen reads as
   "reproduce this order" and can never be mistaken for a pairs game. */
function GoalBoard({ cell = 40, gap = 6, sequence = [], showOrder = true, riskIndex = -1, cycle = 4.4 }) {
  const side = cell * 3 + gap * 2;
  const pos = (i) => ({
    x: (i % 3) * (cell + gap),
    y: Math.floor(i / 3) * (cell + gap),
  });
  const step = sequence.length ? (cycle / sequence.length) : cycle;

  return (
    <svg width={side} height={side} viewBox={`0 0 ${side} ${side}`} aria-hidden="true" style={{ overflow: 'visible' }}>
      <defs>
        {GOALS.map((g) => (
          <linearGradient key={g.id} id={`sr-lit-${g.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={g.colorLt} />
            <stop offset="55%" stopColor={g.color} />
            <stop offset="100%" stopColor={g.colorDeep} />
          </linearGradient>
        ))}
      </defs>

      {GOALS.map((g, i) => {
        const p = pos(i);
        const order = sequence.indexOf(i);
        const delay = order >= 0 ? order * step : 0;
        const isRisk = order >= 0 && order === riskIndex;
        return (
          <g key={g.id} transform={`translate(${p.x} ${p.y})`}>
            {/* Resting face — always visible, always face-up. */}
            <rect width={cell} height={cell} rx={cell * 0.22}
              fill={`${g.colorDeep}CC`} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
            <g transform={`translate(${cell * 0.24} ${cell * 0.2})`} opacity="0.72">
              <GoalGlyph kind={g.icon} fill={g.colorLt} cut="rgba(9,20,42,0.95)" size={cell * 0.52} />
            </g>

            {order >= 0 && (
              <g className="sr-light" style={{ animationDelay: `${delay}s`, transformOrigin: `${cell / 2}px ${cell / 2}px` }}>
                <rect width={cell} height={cell} rx={cell * 0.22}
                  fill={isRisk ? 'url(#sr-risk-fill)' : `url(#sr-lit-${g.id})`}
                  stroke={isRisk ? DANGER_LT : 'rgba(255,255,255,0.8)'} strokeWidth="1.4" />
                <g transform={`translate(${cell * 0.24} ${cell * 0.2})`}>
                  <GoalGlyph kind={g.icon} fill="#fff" cut={isRisk ? DANGER : g.color} size={cell * 0.52} />
                </g>
                {isRisk && (
                  <g stroke="#fff" strokeWidth={cell * 0.07} strokeLinecap="round" fill="none">
                    <circle cx={cell / 2} cy={cell / 2} r={cell * 0.27} />
                    <line x1={cell * 0.31} y1={cell * 0.31} x2={cell * 0.69} y2={cell * 0.69} />
                  </g>
                )}
              </g>
            )}

            {order >= 0 && showOrder && (
              <g className="sr-badge" style={{ animationDelay: `${delay}s`, transformOrigin: `${cell - 4}px 4px` }}>
                <circle cx={cell - 4} cy={4} r={cell * 0.19}
                  fill={isRisk ? DANGER : ORANGE} stroke="#fff" strokeWidth="1.2" />
                <text x={cell - 4} y={4} textAnchor="middle" dominantBaseline="central"
                  fontSize={cell * 0.24} fontWeight="900" fill="#fff"
                  fontFamily="'Poppins', system-ui, sans-serif">
                  {isRisk ? '×' : order + 1}
                </text>
              </g>
            )}
          </g>
        );
      })}

      <defs>
        <linearGradient id="sr-risk-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF8B8B" />
          <stop offset="50%" stopColor={DANGER} />
          <stop offset="100%" stopColor="#7F1D1D" />
        </linearGradient>
      </defs>
    </svg>
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
        padding: '42px 24px 46px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="sr-title" style={{
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
          letterSpacing: '0.02em',
          margin: 0,
          maxWidth: 312,
          lineHeight: 1.45,
        }}>
          {TAGLINE}
        </p>
      </div>

      <div className="sr-float" style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center' }}>
        <div className="sr-glow" style={{
          position: 'absolute',
          inset: -46,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(38,102,196,0.42), rgba(38,102,196,0) 70%)',
          pointerEvents: 'none',
        }} />
        <GoalBoard cell={62} gap={9} sequence={[4, 1, 6, 8]} riskIndex={2} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 10 }}
      >
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          {ROUNDS.length} rounds · up to {LONGEST} steps · {GAME_CONFIG.sessionSeconds}s
        </div>
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
/** A single face-up tile used in the how-to demo. */
function MiniTile({ goal, lit, size = 26, risk }) {
  return (
    <g>
      <rect width={size} height={size} rx={size * 0.22}
        fill={risk ? DANGER : lit ? goal.color : `${goal.colorDeep}CC`}
        stroke={risk ? DANGER_LT : lit ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.16)'}
        strokeWidth="1.2" />
      <g transform={`translate(${size * 0.24} ${size * 0.24})`} opacity={lit || risk ? 1 : 0.7}>
        <GoalGlyph kind={goal.icon} fill={lit || risk ? '#fff' : goal.colorLt}
          cut={risk ? DANGER : lit ? goal.color : 'rgba(9,20,42,0.95)'} size={size * 0.52} />
      </g>
      {risk && (
        <g stroke="#fff" strokeWidth={size * 0.09} strokeLinecap="round" fill="none">
          <circle cx={size / 2} cy={size / 2} r={size * 0.3} />
          <line x1={size * 0.3} y1={size * 0.3} x2={size * 0.7} y2={size * 0.7} />
        </g>
      )}
    </g>
  );
}

/** A pointing hand whose fingertip sits on the local origin. */
function TapFinger({ scale = 1 }) {
  return (
    <g transform={`scale(${scale}) translate(-7.8,-1.4)`} fill="rgba(11,18,33,0.6)"
      stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10.5V3.2a1.8 1.8 0 0 1 3.6 0v7.3" />
      <path d="M9.6 8.6a1.7 1.7 0 0 1 3.4 0v2" />
      <path d="M13 9.6a1.7 1.7 0 0 1 3.4 0v1.6" />
      <path d="M16.4 11.2a1.6 1.6 0 0 1 3.2 0v4.2a6.4 6.4 0 0 1-6.4 6.4h-2.4a6.4 6.4 0 0 1-6.4-6.4v-2.6a1.7 1.7 0 0 1 3.4 0" />
    </g>
  );
}

/** Icon-led cue under the demo. Label must stay ≤ 4 words. */
function Cue({ label, tint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
      <div style={{
        width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
      }}>
        {children}
      </div>
      <span style={{
        fontSize: 9.5, fontWeight: 900, letterSpacing: '0.07em', textTransform: 'uppercase',
        color: tint, lineHeight: 1.2, textAlign: 'center',
      }}>{label}</span>
    </div>
  );
}

/**
 * One 6 s loop of the real round on the real 3x3 board of nine goals.
 * First half — the plan plays itself: Home, Family, a red detour, Retirement,
 * each lighting in turn exactly the way the canvas plays a sequence back.
 * Second half — a finger taps Home, Family, Retirement in that same order and
 * arcs *around* the red tile without touching it, and the board rings green.
 * Ordering is carried by time and by the drawn route, never by step numerals,
 * so the demo needs no text at all.
 */
const DEMO_CELL = 44;
const DEMO_STRIDE = 51;              // cell 44 + gap 7
const DEMO_X0 = 77;                  // (300 - 146) / 2
const DEMO_Y0 = 15;                  // (176 - 146) / 2
const demoAt = (i) => [DEMO_X0 + (i % 3) * DEMO_STRIDE, DEMO_Y0 + Math.floor(i / 3) * DEMO_STRIDE];
const demoMid = (i) => [demoAt(i)[0] + DEMO_CELL / 2, demoAt(i)[1] + DEMO_CELL / 2];

/** Playback order: Home (1) → Family (5) → [red detour: Wedding (7)] → Retirement (3). */
const DEMO_SEQ = [1, 5, 3];
const DEMO_RISK = 7;
const DEMO_LIT_CLASS = ['srd-lit1', 'srd-lit2', 'srd-lit3'];
const DEMO_TAP_CLASS = ['srd-tap1', 'srd-tap2', 'srd-tap3'];

function RecallDemo() {
  const route = DEMO_SEQ.map((i, n) => `${n === 0 ? 'M' : 'L'}${demoMid(i)[0]} ${demoMid(i)[1]}`).join(' ');
  const [hx, hy] = demoMid(DEMO_SEQ[0]);
  return (
    <div style={{
      position: 'relative', width: '100%', height: 176,
      background: 'rgba(6,18,41,0.6)', borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 16,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 300 176" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {/* Resting board — all nine goals, always face up */}
        {GOALS.map((g, i) => {
          const [x, y] = demoAt(i);
          return <g key={g.id} transform={`translate(${x} ${y})`}><MiniTile goal={g} size={DEMO_CELL} /></g>;
        })}

        {/* The route the plan traces, so order reads without numbers */}
        <path d={route} fill="none" stroke={ORANGE_LT} strokeWidth="2.4" strokeLinecap="round"
          strokeLinejoin="round" strokeDasharray="4 5" opacity="0.55" />

        {/* Playback: each goal lights in turn */}
        {DEMO_SEQ.map((i, n) => {
          const [x, y] = demoAt(i);
          return (
            <g key={`lit-${i}`} transform={`translate(${x} ${y})`} className={DEMO_LIT_CLASS[n]}>
              <MiniTile goal={GOALS[i]} size={DEMO_CELL} lit />
            </g>
          );
        })}

        {/* Playback: the red detour, the one step you must not repeat */}
        <g transform={`translate(${demoAt(DEMO_RISK)[0]} ${demoAt(DEMO_RISK)[1]})`} className="srd-risk">
          <MiniTile goal={GOALS[DEMO_RISK]} size={DEMO_CELL} risk />
        </g>

        {/* Recall: the tap confirmations */}
        {DEMO_SEQ.map((i, n) => {
          const [x, y] = demoAt(i);
          return (
            <g key={`tap-${i}`} transform={`translate(${x} ${y})`} className={DEMO_TAP_CLASS[n]}>
              <rect width={DEMO_CELL} height={DEMO_CELL} rx={DEMO_CELL * 0.22}
                fill={GOALS[i].color} stroke="#fff" strokeWidth="2" />
              <g transform={`translate(${DEMO_CELL * 0.24} ${DEMO_CELL * 0.24})`}>
                <GoalGlyph kind={GOALS[i].icon} fill="#fff" cut={GOALS[i].color} size={DEMO_CELL * 0.52} />
              </g>
            </g>
          );
        })}

        {/* Round cleared */}
        <g transform={`translate(${DEMO_X0 + 73} ${DEMO_Y0 + 73})`}>
          <g className="srd-win">
            <rect x="-79" y="-79" width="158" height="158" rx="20" fill="none" stroke={GREEN_LT} strokeWidth="3" />
          </g>
        </g>

        {/* The real input */}
        <g transform={`translate(${hx} ${hy})`}>
          <g className="srd-hand"><TapFinger scale={1.3} /></g>
        </g>
      </svg>
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
        padding: 20,
        background: SCREEN_BG,
        overflowY: 'auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(11,18,33,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '24px 18px 20px',
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
        <RecallDemo />

        <div style={{ display: 'flex', justifyContent: 'space-around', gap: 6, marginBottom: 16 }}>
          <Cue label="Watch the order" tint={ORANGE_LT}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke={ORANGE_LT}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 15s4.6-7 13-7 13 7 13 7-4.6 7-13 7-13-7-13-7Z" />
              <circle cx="15" cy="15" r="3.4" fill={ORANGE_LT} stroke="none" />
            </svg>
          </Cue>
          <Cue label="Tap it back" tint="#fff">
            <svg width="30" height="30" viewBox="0 0 30 30">
              <circle cx="15" cy="16" r="11" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.7" />
              <g transform="translate(14,7)"><TapFinger scale={0.76} /></g>
            </svg>
          </Cue>
          <Cue label="Skip the red" tint={DANGER_LT}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <g transform="translate(3 3)"><MiniTile goal={GOALS[DEMO_RISK]} size={24} risk /></g>
            </svg>
          </Cue>
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
  const bestLen = stats?.bestLen || 0;
  const slips = stats?.slips || 0;
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
    const shareMessage = `Hi,\nI recalled ${rounds} of ${ROUNDS.length} family plans - ${bestLen} steps in order - for ${score} points in the ${GAME_TITLE} challenge.\nA plan you cannot remember is a plan you do not have. Take your turn here: ${shareUrl}`.trim();

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
  const progress = (Math.min(score, PERFECT_SCORE) / PERFECT_SCORE) * circumference;
  const weak = score < PERFECT_SCORE * 0.35;
  const strokeColor = won ? GREEN_LT : weak ? DANGER : GOLD;
  const glowColor = won ? 'rgba(74,222,128,0.45)' : weak ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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

      <div style={{ textAlign: 'center', marginBottom: 14, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '7px 16px', borderRadius: 999,
          background: won ? 'rgba(40,167,69,0.22)' : 'rgba(239,68,68,0.18)',
          border: `1px solid ${won ? 'rgba(40,167,69,0.5)' : 'rgba(239,68,68,0.45)'}`,
          marginBottom: 10,
        }}>
          {won ? <TrophyIcon size={20} /> : <ForgottenIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Plan remembered' : 'Plan forgotten'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your recall.</span>
        </p>
      </div>

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
              SCORE
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              perfect {PERFECT_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, rounds, bestLen, slips} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Rounds" value={`${rounds}/${ROUNDS.length}`} accent={GREEN_LT} />
        <StatTile label="Longest plan" value={`${bestLen}`} accent={GOLD} />
        <StatTile label="Slips" value={`${slips}/${GAME_CONFIG.maxSlips}`} accent={slips >= GAME_CONFIG.maxSlips ? DANGER_LT : BLUE_LT} />
      </div>

      <div style={{
        width: '100%', maxWidth: 360, marginBottom: 14, textAlign: 'center',
        fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', zIndex: 2,
      }}>
        A perfect run recalls all {TOTAL_TAPS} steps across {ROUNDS.length} plans without one slip.
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
          Real plans have more than nine steps and run for decades. A specialist keeps yours in order so you never have to.
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
