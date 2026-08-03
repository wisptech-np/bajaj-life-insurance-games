// Screens.jsx — Home, How to Play, and Results screens for Milestone Hopper.
// All art is inline SVG or CSS: no image files, no emoji.
//
// Visual identity, unique to this game in the catalog:
//   shape language  — the CHEVRON, always pointing up-course. It is the hopper's
//                     chest crest, the milestone gate marks, the HUD score mark
//                     and the button glyphs. The hazard inverts it.
//   palette accent  — GOLD (#FFC845) for gates and wealth over brand BLUE
//                     ground, with EMBER (#D0421F / #FF8A3D) reserved for the
//                     debt weights and the arrears tide. Green appears only on a
//                     milestone that has actually been reached.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import {
  COLORS, GAME_CONFIG, MILESTONE_LIST, RESULT_TARGET_SCORE, TOTAL_CORPUS, formatCorpus, formatMult,
} from './data.js';

const GAME_TITLE = 'Milestone Hopper';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** The game's mark: a double chevron pointing up-course. */
function ChevronMark({ size = 14, color = 'currentColor', opacity = 0.55 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ display: 'block' }}>
      <path d="M6 13l6-6 6 6" />
      <path d="M6 19l6-6 6 6" opacity={opacity} />
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

/** Run-ended mark: the debt weight that stopped you. */
function DebtIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M10 12h12l3 11H7z" fill="#fff" />
      <path d="M11.5 12a4.5 4.5 0 0 1 9 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12.6 15.6 16 18.6l3.4-3M12.6 19 16 22l3.4-3" stroke="rgba(11,18,33,0.65)"
        strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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

/** Tapping finger — the real input, shown as a glyph in the How to Play demo. */
function FingerGlyph({ size = 26, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 11V5.5a1.8 1.8 0 0 1 3.6 0V12" fill="rgba(11,18,33,0.55)" />
      <path d="M13.6 12V9.6a1.7 1.7 0 0 1 3.4 0V16a5 5 0 0 1-5 5h-1a4 4 0 0 1-3.2-1.6l-2.6-3.5a1.6 1.6 0 0 1 2.4-2L9.6 15"
        fill="rgba(11,18,33,0.55)" />
    </svg>
  );
}

/* ─── Shared keyframes ───────────────────────────────────── */
const SCREEN_CSS = `
@keyframes mhTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes mhFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes mhGlow    { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
@keyframes mhRise    { 0%,100% { opacity: 0.28; transform: translateY(3px); } 50% { opacity: 0.7; transform: translateY(0); } }
@keyframes mhHeroHop {
  0%,16%   { transform: translate(0, 0); }
  26%      { transform: translate(0, -14px) scaleY(1.06); }
  36%,58%  { transform: translate(0, -22px); }
  68%      { transform: translate(0, -36px) scaleY(1.06); }
  78%,100% { transform: translate(0, -44px); }
}
@keyframes mhHeroWeight { 0% { transform: translateX(-72px); } 100% { transform: translateX(76px); } }
@keyframes mhChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }

/* --- How to Play demo, one 4 s loop ------------------------------------
   Bands are 42 px apart. The hopper starts on the bottom pavement and takes
   three hops: onto the expense lane, onto the pavement above it, then onto the
   gold gate. The two debt weights run a 2.4 s cycle offset half a cycle apart
   and are phased so one sweeps the lane just BEFORE the hopper lands on it and
   the next sweeps it just AFTER the hopper leaves — the gap-waiting read the
   real game is built on. Change one of these numbers and re-check both. */
@keyframes mhdHopper {
  0%,12%   { transform: translate(0,0) scaleY(1); }
  15%      { transform: translate(0,-24px) scaleY(1.1); }
  18%,34%  { transform: translate(0,-42px) scaleY(1); }
  37%      { transform: translate(0,-66px) scaleY(1.1); }
  40%,56%  { transform: translate(0,-84px) scaleY(1); }
  59%      { transform: translate(0,-108px) scaleY(1.1); }
  62%,92%  { transform: translate(0,-126px) scaleY(1); }
  100%     { transform: translate(0,-126px) scaleY(1); opacity: 0; }
}
@keyframes mhdFinger {
  0%,8%    { transform: translate(0,0) scale(1); opacity: 0.92; }
  12%      { transform: translate(0,6px) scale(0.82); opacity: 1; }
  18%,30%  { transform: translate(0,-42px) scale(1); opacity: 0.92; }
  34%      { transform: translate(0,-36px) scale(0.82); opacity: 1; }
  40%,52%  { transform: translate(0,-84px) scale(1); opacity: 0.92; }
  56%      { transform: translate(0,-78px) scale(0.82); opacity: 1; }
  62%,100% { transform: translate(0,-126px) scale(1); opacity: 0.92; }
}
@keyframes mhdRipple {
  0%,9%    { opacity: 0; transform: translateY(0) scale(0.35); }
  13%      { opacity: 0.9; transform: translateY(0) scale(0.6); }
  21%      { opacity: 0; transform: translateY(0) scale(1.3); }
  31%      { opacity: 0; transform: translateY(-42px) scale(0.35); }
  35%      { opacity: 0.9; transform: translateY(-42px) scale(0.6); }
  43%      { opacity: 0; transform: translateY(-42px) scale(1.3); }
  53%      { opacity: 0; transform: translateY(-84px) scale(0.35); }
  57%      { opacity: 0.9; transform: translateY(-84px) scale(0.6); }
  65%,100% { opacity: 0; transform: translateY(-84px) scale(1.3); }
}
@keyframes mhdWeight { 0% { transform: translateX(-58px); } 100% { transform: translateX(322px); } }
@keyframes mhdGate {
  0%,58%   { opacity: 0.42; }
  64%      { opacity: 1; }
  74%,100% { opacity: 0.92; }
}
@keyframes mhdScore {
  0%,62%   { opacity: 0; transform: translateY(8px) scale(0.7); }
  70%      { opacity: 1; transform: translateY(-2px) scale(1.1); }
  78%,90%  { opacity: 1; transform: translateY(-7px) scale(1); }
  100%     { opacity: 0; transform: translateY(-18px) scale(1); }
}

.mh-title { animation: mhTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.mh-float { animation: mhFloat 4s ease-in-out infinite; }
.mh-glow  { animation: mhGlow 2.4s ease-in-out infinite; }
.mh-rise  { animation: mhRise 2.8s ease-in-out infinite; }
.mh-chip  { animation: mhChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.mh-hero-hop    { animation: mhHeroHop 4.2s cubic-bezier(0.22,1,0.36,1) infinite; }
.mh-hero-weight { animation: mhHeroWeight 3s linear infinite; }
.mhd-hopper  { animation: mhdHopper 4s cubic-bezier(0.22,1,0.36,1) infinite; }
.mhd-finger  { animation: mhdFinger 4s cubic-bezier(0.22,1,0.36,1) infinite; }
.mhd-ripple  { animation: mhdRipple 4s ease-out infinite; }
.mhd-weight  { animation: mhdWeight 2.4s linear infinite; animation-delay: -0.3s; }
.mhd-weight2 { animation: mhdWeight 2.4s linear infinite; animation-delay: -1.5s; }
.mhd-gate    { animation: mhdGate 4s ease-in-out infinite; }
.mhd-score   { animation: mhdScore 4s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .mh-title, .mh-float, .mh-glow, .mh-rise, .mh-chip, .mh-hero-hop, .mh-hero-weight,
  .mhd-hopper, .mhd-finger, .mhd-ripple, .mhd-weight, .mhd-weight2, .mhd-gate, .mhd-score {
    animation: none !important;
  }
}
`;

const SCREEN_BG = 'radial-gradient(ellipse at 50% 24%, rgba(28,96,180,0.5), rgba(6,14,32,0.97) 68%), #050F26';

/* ─── Shared SVG defs ─────────────────────────────────────
   Both screens and the results art need the same gradients; declaring them once
   in a zero-size <svg> keeps the ids stable wherever they are referenced. */
function Defs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="mhBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6FB0FF" />
          <stop offset="45%" stopColor={COLORS.brandBlueLt} />
          <stop offset="100%" stopColor="#00265F" />
        </linearGradient>
        <linearGradient id="mhGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.goldLt} />
          <stop offset="100%" stopColor={COLORS.goldDeep} />
        </linearGradient>
        <linearGradient id="mhEmber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.debtLt} />
          <stop offset="38%" stopColor={COLORS.debt} />
          <stop offset="100%" stopColor={COLORS.debtDeep} />
        </linearGradient>
        <linearGradient id="mhSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.skyTop} />
          <stop offset="100%" stopColor="#0C2A55" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Shared course art ─────────────────────────────────── */
/** The debt weight: squat cast-iron ingot with a lifting bar. */
function WeightGlyph({ s = 1 }) {
  const w = 26 * s;
  const h = 13 * s;
  return (
    <g>
      <ellipse cx="0" cy={h * 0.62} rx={w * 0.48} ry={h * 0.16} fill="rgba(0,0,0,0.4)" />
      <path d={`M${-w * 0.2} ${-h * 0.5} q${w * 0.2} ${-h * 0.55} ${w * 0.4} 0`} fill="none"
        stroke="#2A1008" strokeWidth={2.2 * s} strokeLinecap="round" />
      <path d={`M${-w * 0.32} ${-h * 0.5} h${w * 0.64} l${w * 0.18} ${h} h${-w} z`} fill="url(#mhEmber)" />
      <path d={`M${-w * 0.3} ${-h * 0.46} h${w * 0.6}`} stroke={COLORS.debtHot} strokeWidth={1.2 * s} strokeLinecap="round" />
      <rect x={-w * 0.22} y={-h * 0.14} width={w * 0.44} height={h * 0.44} rx={h * 0.16} fill="rgba(24,6,2,0.72)" />
      <path d={`M${-w * 0.1} ${-h * 0.02} l${w * 0.1} ${h * 0.16} l${w * 0.1} ${-h * 0.16}`} fill="none"
        stroke="rgba(255,180,110,0.8)" strokeWidth={1.2 * s} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** The hopper: rounded cube, rim light, gold chevron crest. */
function HopperGlyph({ s = 1 }) {
  const w = 15 * s;
  const h = 17 * s;
  return (
    <g>
      <ellipse cx="0" cy={2 * s} rx={w * 0.5} ry={w * 0.2} fill="rgba(0,0,0,0.4)" />
      <path d={`M${-3 * s} ${-16 * s} q${-9 * s} ${5 * s} ${-6 * s} ${14 * s} q${4 * s} ${-5 * s} ${7 * s} ${-4 * s} z`}
        fill={COLORS.orange} />
      <rect x={-w / 2} y={-h} width={w} height={h} rx={5 * s} fill="url(#mhBody)" />
      <path d={`M${-w / 2 + 1.2 * s} ${-h * 0.78} v${h * 0.58}`} stroke="rgba(198,228,255,0.85)"
        strokeWidth={1.5 * s} strokeLinecap="round" />
      <rect x={-w / 2 + 1 * s} y={-h - 4 * s} width={w - 2 * s} height={7 * s} rx={3.4 * s} fill="#CFE6FF" />
      <rect x={-5 * s} y={-h * 0.82} width={10 * s} height={4.4 * s} rx={2.2 * s} fill="rgba(6,14,32,0.88)" />
      <rect x={-4 * s} y={-h * 0.78} width={5 * s} height={3 * s} rx={1.5 * s} fill="#A8CEFF" />
      <g stroke={COLORS.goldLt} strokeWidth={1.5 * s} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={`M${-3.2 * s} ${-6.6 * s} l${3.2 * s} ${-2.6 * s} l${3.2 * s} ${2.6 * s}`} />
        <path d={`M${-3.2 * s} ${-3.2 * s} l${3.2 * s} ${-2.6 * s} l${3.2 * s} ${2.6 * s}`} />
      </g>
    </g>
  );
}

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [COLORS.gold, COLORS.goldLt, COLORS.orangeLt, COLORS.brandBlueLt, COLORS.brandBlue, COLORS.green, '#EC4899'];
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
 * Hero motif: the course itself, a receding stack of flat-shaded slabs with a
 * lit top face and a darker front face — the same construction the canvas uses,
 * so the screen previews the game rather than illustrating it.
 */
const HERO_ROWS = [
  { kind: 'safe' }, { kind: 'road' }, { kind: 'safeAlt' },
  { kind: 'safe' }, { kind: 'road' }, { kind: 'goal' },
];
const HERO_PAINT = {
  safe: [COLORS.rowSafeTop, COLORS.rowSafeFront],
  safeAlt: [COLORS.rowSafeAltTop, COLORS.rowSafeAltFront],
  road: [COLORS.rowRoadTop, COLORS.rowRoadFront],
  goal: [COLORS.rowGoalTop, COLORS.rowGoalFront],
};
const heroInset = (y) => (158 - y) * 0.3;
const heroEdges = (y) => [10 + heroInset(y), 190 - heroInset(y)];

function HeroSlab({ i }) {
  const yb = 158 - i * 22;
  const yt = yb - 16;
  const yf = yb + 6;
  const [t1, t2] = heroEdges(yt);
  const [b1, b2] = heroEdges(yb);
  const [f1, f2] = heroEdges(yf);
  const kind = HERO_ROWS[i].kind;
  const [top, front] = HERO_PAINT[kind];
  const mid = (yt + yb) / 2;
  return (
    <g>
      <polygon points={`${b1},${yb} ${b2},${yb} ${f2},${yf} ${f1},${yf}`} fill={front} />
      <polygon points={`${t1},${yt} ${t2},${yt} ${b2},${yb} ${b1},${yb}`} fill={top} />
      {kind === 'road' && (
        <g stroke="rgba(255,160,90,0.34)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {[0, 1, 2, 3].map((k) => {
            const x = t1 + 14 + k * ((t2 - t1 - 28) / 3);
            return <path key={k} d={`M${x - 5} ${mid + 3} L${x} ${mid - 3} L${x + 5} ${mid + 3}`} />;
          })}
        </g>
      )}
      {(kind === 'safe' || kind === 'safeAlt') && (
        <line x1={b1} y1={yb - 1} x2={b2} y2={yb - 1} stroke="rgba(190,224,255,0.3)" strokeWidth="1.4" />
      )}
      {kind === 'goal' && (
        <>
          <line x1={t1} y1={yt} x2={t2} y2={yt} stroke={COLORS.goldLt} strokeWidth="2.5" />
          <g stroke="rgba(255,227,138,0.5)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {[0, 1, 2, 3, 4, 5].map((k) => {
              const x = t1 + 12 + k * ((t2 - t1 - 24) / 5);
              return <path key={k} d={`M${x - 4} ${yb - 3} L${x} ${yb - 7} L${x + 4} ${yb - 3}`} />;
            })}
          </g>
        </>
      )}
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
      <Defs />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10,
          padding: '4px 12px 4px 8px', borderRadius: 999,
          background: 'rgba(255,200,69,0.1)', border: '1px solid rgba(255,200,69,0.34)',
        }}>
          <ChevronMark size={12} color={COLORS.goldLt} />
          <span style={{
            fontSize: 9.5, fontWeight: 900, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: COLORS.goldLt,
          }}>
            {MILESTONE_LIST.length} goals &middot; {formatCorpus(TOTAL_CORPUS)} cover
          </span>
        </div>
        <h1 className="mh-title" style={{
          fontSize: 33,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 1,
          margin: '0 0 8px 0',
          textShadow: '0 2px 14px rgba(0,0,0,0.6)',
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12.5,
          fontWeight: 800,
          color: COLORS.orangeLt,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          maxWidth: 300,
        }}>
          Outrun the debt &mdash; reach every milestone
        </p>
      </div>

      <div className="mh-float" style={{ position: 'relative', width: 262, height: 236, zIndex: 1 }}>
        <svg width="262" height="236" viewBox="0 0 200 180" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <clipPath id="mhClip"><rect x="4" y="4" width="192" height="172" rx="26" /></clipPath>
            <radialGradient id="mhHeroGlow" cx="0.5" cy="0.32" r="0.7">
              <stop offset="0%" stopColor="rgba(64,150,255,0.4)" />
              <stop offset="100%" stopColor="rgba(64,150,255,0)" />
            </radialGradient>
          </defs>

          <rect x="4" y="4" width="192" height="172" rx="26" fill="url(#mhSky)"
            stroke="rgba(255,255,255,0.14)" strokeWidth="1.4" />

          <g clipPath="url(#mhClip)">
            <rect x="4" y="4" width="192" height="172" fill="url(#mhHeroGlow)" />

            {/* Far to near, so each near band's front face stays visible. */}
            {[5, 4, 3, 2, 1, 0].map((i) => <HeroSlab key={i} i={i} />)}

            {/* Retirement gate at the top of the stack. */}
            <text x="100" y="52" fill="#fff" fontSize="9" fontWeight="900" textAnchor="middle"
              letterSpacing="1.6" fontFamily="'Plus Jakarta Sans', sans-serif">
              RETIREMENT
            </text>

            {/* A debt weight sliding across the near expense lane. */}
            <g transform="translate(100,128)">
              <g className="mh-hero-weight"><WeightGlyph s={1} /></g>
            </g>

            {/* Coin on the safe band above it. */}
            <g transform="translate(62,106)">
              <ellipse cx="0" cy="0" rx="4.5" ry="6.5" fill="url(#mhGold)" />
              <ellipse cx="0" cy="0" rx="2" ry="3.4" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.1" />
            </g>

            {/* Hopper climbing the near bands. */}
            <g className="mh-hero-hop" transform="translate(134,152)">
              <HopperGlyph s={1} />
            </g>

            {/* Arrears tide creeping in at the bottom. */}
            <g className="mh-glow">
              <rect x="4" y="160" width="192" height="18" fill="rgba(168,52,18,0.55)" />
              <rect x="4" y="159" width="192" height="1.8" fill={COLORS.debtLt} />
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
            background: `linear-gradient(180deg, ${COLORS.orangeLt} 0%, ${COLORS.orange} 100%)`,
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
 * Animation only. One 4 s loop of the real mechanic: a finger taps, the hopper
 * hops a row, a debt weight slides past underneath it, the hopper taps again and
 * lands on the gold milestone gate, which lights up and floats +300. Three
 * icon-led labels, no instruction paragraphs.
 */
function DemoLabel({ icon, text }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      flex: 1, minWidth: 0,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 11,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.25,
      }}>
        {text}
      </span>
    </div>
  );
}

function DemoBand({ y, top, front, kind }) {
  return (
    <g>
      <rect x="0" y={y} width="260" height="30" fill={top} />
      <rect x="0" y={y + 30} width="260" height="9" fill={front} />
      {kind === 'road' && (
        <g stroke="rgba(255,160,90,0.32)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <path key={k} d={`M${20 + k * 44} ${y + 19} L${26 + k * 44} ${y + 11} L${32 + k * 44} ${y + 19}`} />
          ))}
        </g>
      )}
      {kind === 'safe' && (
        <line x1="0" y1={y + 29} x2="260" y2={y + 29} stroke="rgba(190,224,255,0.3)" strokeWidth="1.6" />
      )}
      {kind === 'goal' && (
        <>
          <rect x="0" y={y} width="260" height="3" fill={COLORS.goldLt} />
          <g stroke="rgba(255,227,138,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <path key={k} d={`M${18 + k * 44} ${y + 26} L${24 + k * 44} ${y + 20} L${30 + k * 44} ${y + 26}`} />
            ))}
          </g>
        </>
      )}
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
        padding: 20,
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      <Defs />

      <div style={{
        background: 'rgba(6,14,32,0.74)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '20px 16px 18px',
        width: '100%',
        maxWidth: 340,
        boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 22, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.01em', margin: '0 0 14px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        {/* The demo: one looping run of the real input and the real outcome. */}
        <div style={{
          borderRadius: 16, overflow: 'hidden', marginBottom: 14,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(180deg, #061634 0%, #0C2A55 100%)',
        }}>
          <svg width="100%" viewBox="0 0 260 176" role="img" aria-label="Tap to hop up a row, dodge the debt weight, land on the milestone gate">
            <defs>
              <clipPath id="mhdClip"><rect x="0" y="0" width="260" height="176" /></clipPath>
            </defs>
            <g clipPath="url(#mhdClip)">
              {/* Bands, far to near, 42 px apart: gate, pavement, expense lane,
                  pavement (the hopper's starting row). */}
              <DemoBand y={20} top={COLORS.rowGoalTop} front={COLORS.rowGoalFront} kind="goal" />
              <DemoBand y={62} top={COLORS.rowSafeTop} front={COLORS.rowSafeFront} kind="safe" />
              <DemoBand y={104} top={COLORS.rowRoadTop} front={COLORS.rowRoadFront} kind="road" />
              <DemoBand y={146} top={COLORS.rowSafeAltTop} front={COLORS.rowSafeAltFront} kind="safe" />

              {/* Gate label, lighting up when the hopper arrives. */}
              <g className="mhd-gate">
                <text x="130" y="41" fill="#fff" fontSize="11" fontWeight="900" textAnchor="middle"
                  letterSpacing="2" fontFamily="'Plus Jakarta Sans', sans-serif">
                  MILESTONE
                </text>
              </g>

              {/* Two debt weights streaming across the expense lane. */}
              <g transform="translate(0,120)">
                <g className="mhd-weight"><WeightGlyph s={1.05} /></g>
                <g className="mhd-weight2"><WeightGlyph s={1.05} /></g>
              </g>

              {/* Tap ripple, under the hopper at each point of input. */}
              <g className="mhd-ripple" transform="translate(52,158)">
                <circle cx="0" cy="0" r="17" fill="none" stroke={COLORS.orangeLt} strokeWidth="2.6" />
              </g>

              {/* Hopper: three hops — lane, pavement, gate. */}
              <g transform="translate(52,168)">
                <g className="mhd-hopper"><HopperGlyph s={1.05} /></g>
              </g>

              {/* Floating +N at the gate — the real reward, in the real place. */}
              <g className="mhd-score" transform="translate(52,30)">
                <text x="0" y="0" fill={COLORS.goldLt} fontSize="15" fontWeight="900" textAnchor="middle"
                  fontFamily="'Plus Jakarta Sans', sans-serif">+300</text>
              </g>

              {/* Finger doing the actual input, riding up with the hopper. */}
              <g className="mhd-finger" transform="translate(66,138)">
                <FingerGlyph size={30} color="#fff" />
              </g>
            </g>
          </svg>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <DemoLabel
            icon={<FingerGlyph size={19} color={COLORS.orangeLt} />}
            text="Tap side to steer"
          />
          <DemoLabel
            icon={(
              <svg width="22" height="14" viewBox="-16 -9 32 18" aria-hidden="true">
                <WeightGlyph s={0.86} />
              </svg>
            )}
            text="Dodge debt"
          />
          <DemoLabel
            icon={<ChevronMark size={19} color={COLORS.goldLt} />}
            text="Bank goals"
          />
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52, border: 'none', borderRadius: 12,
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `linear-gradient(180deg, ${COLORS.brandBlueLt} 0%, ${COLORS.brandBlue} 100%)`,
              boxShadow: '0 4px 16px rgba(0,61,166,0.45)',
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
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
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
  const rows = stats?.rows || 0;
  const coins = stats?.coins || 0;
  const milestonesHit = stats?.milestones || 0;
  const corpus = stats?.corpus || 0;
  const multiplier = stats?.multiplier || 1;
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
    const shareMessage = `Hi,\nI secured ${formatCorpus(corpus)} of goal cover across ${milestonesHit} of ${MILESTONE_LIST.length} life milestones and scored ${score} points in the ${GAME_TITLE} challenge.\nEvery life milestone needs cover to reach. Take your run here: ${shareUrl}`.trim();

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
  const strokeColor = won ? COLORS.green : score < 500 ? COLORS.danger : COLORS.gold;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : score < 500 ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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
      <Defs />
      {won && <Confetti />}

      {/* Outcome header */}
      <div style={{ textAlign: 'center', marginBottom: 14, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '7px 16px', borderRadius: 999,
          background: won ? 'rgba(40,167,69,0.22)' : 'rgba(208,66,31,0.2)',
          border: `1px solid ${won ? 'rgba(40,167,69,0.5)' : 'rgba(255,138,61,0.5)'}`,
          marginBottom: 10,
        }}>
          {won ? <TrophyIcon size={20} /> : <DebtIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Retirement reached' : 'Run ended'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: COLORS.brandBlueLt }}>{leadName || 'Friend'}!</span>{' '}
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
            <ChevronMark size={15} color={strokeColor} />
            <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: '0.16em' }}>
              POINTS
            </span>
          </div>
        </div>
      </div>

      {/* Corpus secured — the run's headline financial outcome, and the thing
          the whole progression system was built to produce. */}
      <div style={{
        width: '100%', maxWidth: 360, marginBottom: 10, zIndex: 2,
        borderRadius: 16, padding: '11px 14px 12px',
        background: 'linear-gradient(180deg, rgba(58,42,6,0.72), rgba(20,14,2,0.78))',
        border: '1px solid rgba(255,200,69,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{
            fontSize: 8.5, fontWeight: 900, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'rgba(255,227,138,0.66)',
          }}>
            Goal cover secured
          </span>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,227,138,0.5)' }}>
            of {formatCorpus(TOTAL_CORPUS)}
          </span>
        </div>
        <div style={{
          fontSize: 26, fontWeight: 900, color: COLORS.goldLt, lineHeight: 1.15,
          fontVariantNumeric: 'tabular-nums', marginTop: 2,
        }}>
          {formatCorpus(corpus)}
        </div>
        <div style={{
          height: 4, borderRadius: 3, marginTop: 8,
          background: 'rgba(255,255,255,0.12)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${Math.min(100, (corpus / TOTAL_CORPUS) * 100)}%`,
            background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.greenLt})`,
            transition: 'width 1.1s ease-out',
          }} />
        </div>
      </div>

      {/* Run stats */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 12, zIndex: 2 }}>
        <StatTile label="Rows" value={`${rows}/${GAME_CONFIG.totalRows}`} accent={COLORS.brandBlueLt} />
        <StatTile label="SIP coins" value={coins} accent={COLORS.gold} />
        <StatTile label="Gates" value={`${milestonesHit}/${MILESTONE_LIST.length}`} accent={COLORS.green} />
        <StatTile label="Earnings" value={`×${formatMult(multiplier)}`} accent={COLORS.orangeLt} />
      </div>

      {/* Milestone gate chips — each carries the corpus it banks, so an unreached
          gate reads as money still on the table rather than a greyed-out label. */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2,
      }}>
        {MILESTONE_LIST.map((ms, i) => {
          const hit = rows >= ms.row;
          return (
            <span
              key={ms.row}
              className="mh-chip"
              style={{
                animationDelay: `${180 + i * 90}ms`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10.5,
                fontWeight: 800,
                padding: '5px 5px 5px 7px',
                borderRadius: 999,
                color: hit ? '#fff' : 'rgba(255,255,255,0.4)',
                background: hit ? 'rgba(40,167,69,0.85)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${hit ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              <ChevronMark size={11} color={hit ? '#fff' : 'rgba(255,255,255,0.32)'} opacity={0.5} />
              {ms.label}
              <span style={{
                fontSize: 9.5, fontWeight: 900, borderRadius: 999, padding: '2px 6px',
                background: hit ? 'rgba(255,255,255,0.22)' : 'rgba(255,200,69,0.1)',
                color: hit ? '#fff' : 'rgba(255,227,138,0.55)',
              }}>
                {ms.corpusLabel}
              </span>
            </span>
          );
        })}
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: COLORS.brandBlueLt, color: '#fff', fontWeight: 900,
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
          You dodged the debt on screen. A specialist can help you cover the real milestones.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: `linear-gradient(180deg, ${COLORS.orangeLt} 0%, ${COLORS.orange} 100%)`,
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
