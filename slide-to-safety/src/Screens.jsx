// Screens.jsx — Home, How to Play and Results screens for Slide to Safety.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, perfectScore } from './data.js';
import { LEVELS, TOTAL_PAR } from './levels.js';

const GAME_TITLE = 'Slide to Safety';
const TAGLINE = 'One swipe at a time, glide your shield past thin ice and bring it home to the family.';
const PERFECT_SCORE = perfectScore(LEVELS);
const TOTAL_COINS = LEVELS.reduce((a, lv) => a + lv.coins.length, 0);

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
const ICE = '#CFE4F7';
const ICE_LT = '#F2F9FF';
const ICE_DEEP = '#9BC1E4';
const CRACK = '#E0785A';
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

/** Run-ended mark: a route that stopped short of the shore. */
function ShortfallIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 26h22" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
      <path d="M6 22 6 12l8 0 0-6" stroke="#fff" strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 8l7 7M27 8l-7 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
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
@keyframes ssTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes ssFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ssGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes ssChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes ssHeroSlide {
  0%      { transform: translate(24px, 132px); }
  8%      { transform: translate(24px, 132px); }
  24%     { transform: translate(24px, 36px); }
  34%     { transform: translate(24px, 36px); }
  50%     { transform: translate(120px, 36px); }
  60%     { transform: translate(120px, 36px); }
  76%,100%{ transform: translate(120px, 108px); }
}
@keyframes ssHeroTrail { 0% { stroke-dashoffset: 300; } 60%,100% { stroke-dashoffset: 0; } }
@keyframes ssGust { 0% { opacity: 0.25; transform: translateX(-6px); } 50% { opacity: 0.9; } 100% { opacity: 0.25; transform: translateX(6px); } }
@keyframes ssBeatGlide { 0%,10% { transform: translateX(0); } 55%,100% { transform: translateX(34px); } }
@keyframes ssBeatCrack { 0%,45% { opacity: 0.25; } 60%,100% { opacity: 1; } }
@keyframes ssBeatPush { 0%,40% { transform: translate(0,0); } 70%,100% { transform: translate(20px, 12px); } }
.ss-title { animation: ssTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-float { animation: ssFloat 4s ease-in-out infinite; }
.ss-glow  { animation: ssGlow 2.2s ease-in-out infinite; }
.ss-chip  { animation: ssChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-hero-slide { animation: ssHeroSlide 5s cubic-bezier(0.3,0,0.2,1) infinite; }
.ss-hero-trail { animation: ssHeroTrail 5s cubic-bezier(0.3,0,0.2,1) infinite; }
.ss-gust  { animation: ssGust 1.8s ease-in-out infinite; }
.ss-glide { animation: ssBeatGlide 2.4s cubic-bezier(0.25,0,0.2,1) infinite; }
.ss-crack { animation: ssBeatCrack 2.4s ease-in-out infinite; }
.ss-push  { animation: ssBeatPush 2.4s cubic-bezier(0.25,0,0.2,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .ss-title, .ss-float, .ss-glow, .ss-chip, .ss-hero-slide, .ss-hero-trail,
  .ss-gust, .ss-glide, .ss-crack, .ss-push { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, ORANGE_LT, BLUE_LT, BLUE, GREEN, ICE];
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

/* ─── Shared SVG pieces ─────────────────────────────────── */
function ShieldToken({ s = 12 }) {
  return (
    <g>
      <path
        d={`M0 ${-s} L${s * 0.88} ${-s * 0.48} L${s * 0.88} ${s * 0.18}
            Q${s * 0.7} ${s * 0.92} 0 ${s * 1.08}
            Q${-s * 0.7} ${s * 0.92} ${-s * 0.88} ${s * 0.18}
            L${-s * 0.88} ${-s * 0.48} Z`}
        fill={BLUE_LT}
        stroke="#A6D0FF"
        strokeWidth={s * 0.12}
      />
      <path
        d={`M${-s * 0.34} 0 L${-s * 0.05} ${s * 0.3} L${s * 0.4} ${-s * 0.34}`}
        fill="none"
        stroke="#fff"
        strokeWidth={s * 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function IceGrid({ cols, rows, cell, x = 0, y = 0, opacity = 1 }) {
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push(
        <rect
          key={`${c}-${r}`}
          x={x + c * cell + 1}
          y={y + r * cell + 1}
          width={cell - 2}
          height={cell - 2}
          rx={cell * 0.18}
          fill={(c + r) % 2 ? ICE : ICE_LT}
          opacity={opacity}
        />,
      );
    }
  }
  return <g>{tiles}</g>;
}

function FamilyTile({ cell, x, y }) {
  const s = cell * 0.42;
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={cell - 2} height={cell - 2} rx={cell * 0.18}
        fill="rgba(40,167,69,0.24)" stroke={GREEN_LT} strokeWidth="1.4" />
      <path d={`M${cx} ${cy - s * 0.86} L${cx + s * 0.8} ${cy - s * 0.1} L${cx - s * 0.8} ${cy - s * 0.1} Z`} fill={GREEN} />
      <rect x={cx - s * 0.6} y={cy - s * 0.1} width={s * 1.2} height={s * 0.86} rx={s * 0.12} fill={ICE_LT} />
      <circle cx={cx - s * 0.28} cy={cy + s * 0.16} r={s * 0.15} fill={BLUE} />
      <circle cx={cx + s * 0.04} cy={cy + s * 0.14} r={s * 0.17} fill={BLUE_LT} />
      <circle cx={cx + s * 0.34} cy={cy + s * 0.22} r={s * 0.12} fill={ORANGE} />
    </g>
  );
}

function RockTile({ cell, x, y }) {
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const r = cell * 0.34;
  return (
    <g>
      <path
        d={`M${cx - r} ${cy + r * 0.6} L${cx - r * 0.75} ${cy - r * 0.3} L${cx - r * 0.15} ${cy - r * 0.9}
            L${cx + r * 0.55} ${cy - r * 0.65} L${cx + r} ${cy + r * 0.1} L${cx + r * 0.65} ${cy + r * 0.7} Z`}
        fill="#3C516C"
        stroke="#1C2A3D"
        strokeWidth="1"
      />
      <path
        d={`M${cx - r * 0.15} ${cy - r * 0.9} L${cx + r * 0.55} ${cy - r * 0.65} L${cx + r * 0.1} ${cy - r * 0.2}
            L${cx - r * 0.6} ${cy - r * 0.3} Z`}
        fill="#6A83A2"
        opacity="0.7"
      />
    </g>
  );
}

function CrackTile({ cell, x, y, className }) {
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const arms = [0, 1.1, 2.2, 3.4, 4.5, 5.6];
  return (
    <g className={className}>
      <rect x={x + 1} y={y + 1} width={cell - 2} height={cell - 2} rx={cell * 0.18}
        fill="rgba(224,120,90,0.24)" />
      {arms.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(a) * cell * 0.34}
          y2={cy + Math.sin(a) * cell * 0.34}
          stroke={CRACK}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

/* ─── Home ───────────────────────────────────────────────── */
/**
 * Hero motif: a miniature of the real board — an ice field, a rock that stops
 * the glide, thin ice, a gust lane and the family tile — with the shield token
 * taking three legs of a route. The same construction the canvas uses, so the
 * screen previews the game rather than illustrating it.
 */
const HERO_CELL = 24;

function HeroBoard() {
  return (
    <g>
      <IceGrid cols={7} rows={7} cell={HERO_CELL} x={0} y={12} />
      <RockTile cell={HERO_CELL} x={0} y={12} />
      <RockTile cell={HERO_CELL} x={HERO_CELL * 5} y={12 + HERO_CELL * 4} />
      <CrackTile cell={HERO_CELL} x={HERO_CELL * 3} y={12 + HERO_CELL} />
      <FamilyTile cell={HERO_CELL} x={HERO_CELL * 5} y={12 + HERO_CELL * 5} />
      <g className="ss-gust">
        {[2, 3, 4].map((r) => (
          <g key={r}>
            <rect x={HERO_CELL * 1 + 1} y={12 + r * HERO_CELL + 1} width={HERO_CELL - 2}
              height={HERO_CELL - 2} rx={HERO_CELL * 0.18} fill="rgba(166,208,255,0.5)" />
            <path
              d={`M${HERO_CELL * 1.3} ${12 + r * HERO_CELL + HERO_CELL * 0.32}
                  L${HERO_CELL * 1.7} ${12 + r * HERO_CELL + HERO_CELL * 0.5}
                  L${HERO_CELL * 1.3} ${12 + r * HERO_CELL + HERO_CELL * 0.68}`}
              fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            />
          </g>
        ))}
      </g>
      <path
        className="ss-hero-trail"
        d={`M${HERO_CELL} ${12 + HERO_CELL * 5.5} L${HERO_CELL} ${12 + HERO_CELL * 1.5}
            L${HERO_CELL * 5} ${12 + HERO_CELL * 1.5} L${HERO_CELL * 5} ${12 + HERO_CELL * 4.5}`}
        fill="none"
        stroke={ORANGE_LT}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="300"
        opacity="0.75"
      />
      <g className="ss-hero-slide">
        <ShieldToken s={9} />
      </g>
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
        padding: '44px 24px 48px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="ss-title" style={{
          fontSize: 32,
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
          maxWidth: 310,
          lineHeight: 1.45,
        }}>
          {TAGLINE}
        </p>
      </div>

      <div className="ss-float" style={{ position: 'relative', width: 232, height: 216, zIndex: 1 }}>
        <svg width="232" height="216" viewBox="-8 0 184 192" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <radialGradient id="ssWell" cx="0.5" cy="0.5" r="0.7">
              <stop offset="0%" stopColor="rgba(38,102,196,0.4)" />
              <stop offset="100%" stopColor="rgba(38,102,196,0)" />
            </radialGradient>
          </defs>
          <g className="ss-glow">
            <ellipse cx="84" cy="98" rx="104" ry="96" fill="url(#ssWell)" />
          </g>
          <HeroBoard />
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
      <div style={{ width: 78, height: 58, flexShrink: 0 }}>{children}</div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: ORANGE_LT, textTransform: 'uppercase' }}>
          Step {n}
        </div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.68)', lineHeight: 1.35 }}>{copy}</div>
      </div>
    </div>
  );
}

export function HowToPlayScreen({ onPlay }) {
  const C = 18;
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
        <p style={{ fontSize: 11.5, fontWeight: 800, color: ORANGE_LT, margin: '0 0 14px 0', lineHeight: 1.4 }}>
          Swipe to glide &middot; Thin ice breaks &middot; Reach the family tile
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
          <Beat n="1" title="Swipe to glide" copy="The shield slides until a rock, the shore or the family stops it.">
            <svg width="78" height="58" viewBox="0 0 78 58" aria-hidden="true">
              <IceGrid cols={4} rows={2} cell={C} x={2} y={11} />
              <RockTile cell={C} x={2 + C * 3} y={11} />
              <g className="ss-glide" transform={`translate(${2 + C * 0.5}, ${11 + C * 0.5})`}>
                <ShieldToken s={6.5} />
              </g>
            </svg>
          </Beat>

          <Beat n="2" title="Thin ice cracks" copy="Cross it fast and it only deepens. Stop on it and you are through.">
            <svg width="78" height="58" viewBox="0 0 78 58" aria-hidden="true">
              <IceGrid cols={4} rows={2} cell={C} x={2} y={11} />
              <CrackTile cell={C} x={2 + C * 2} y={11} className="ss-crack" />
              <g transform={`translate(${2 + C * 0.5}, ${11 + C * 0.5})`}>
                <ShieldToken s={6.5} />
              </g>
              <path d={`M${2 + C} ${11 + C * 0.5} L${2 + C * 3.6} ${11 + C * 0.5}`} stroke={ORANGE_LT}
                strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />
            </svg>
          </Beat>

          <Beat n="3" title="Mind the gust" copy="A wind lane shoves you one cell sideways as you cross it.">
            <svg width="78" height="58" viewBox="0 0 78 58" aria-hidden="true">
              <IceGrid cols={4} rows={2} cell={C} x={2} y={11} />
              <g className="ss-gust">
                <rect x={2 + C * 2 + 1} y={12} width={C - 2} height={C * 2 - 2} rx={C * 0.18}
                  fill="rgba(166,208,255,0.55)" />
                <path d={`M${2 + C * 2.3} ${11 + C * 0.7} L${2 + C * 2.5} ${11 + C * 1.05}
                          L${2 + C * 2.7} ${11 + C * 0.7}`}
                  fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <FamilyTile cell={C} x={2 + C * 3} y={11 + C} />
              <g className="ss-push" transform={`translate(${2 + C * 0.5}, ${11 + C * 0.5})`}>
                <ShieldToken s={6.5} />
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)', margin: '0 0 12px 0', lineHeight: 1.45 }}>
          <strong style={{ color: '#fff' }}>{LEVELS.length} boards</strong> in{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong> with{' '}
          <strong style={{ color: BLUE_LT }}>{GAME_CONFIG.retries} retries</strong>. Coins pay{' '}
          <strong style={{ color: GOLD_LT }}>{GAME_CONFIG.scoring.coin}</strong>; finishing a board pays{' '}
          <strong style={{ color: GREEN_LT }}>{GAME_CONFIG.scoring.levelComplete}</strong>, plus{' '}
          <strong style={{ color: GREEN_LT }}>{GAME_CONFIG.scoring.parBonus}</strong> if you match par.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 16 }}>
          {LEVELS.map((lv, i) => (
            <span
              key={lv.id}
              className="ss-chip"
              style={{
                animationDelay: `${140 + i * 80}ms`,
                fontSize: 9.5,
                fontWeight: 900,
                padding: '4px 9px',
                borderRadius: 999,
                color: ICE,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {lv.name} · par {lv.par}
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
  const levels = stats?.levels || 0;
  const coins = stats?.coins || 0;
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
    const shareMessage = `Hi,\nI slid my shield across ${levels} of ${LEVELS.length} frozen boards for ${score} points in the ${GAME_TITLE} challenge.\nThin ice is everywhere - the right cover is what gets your family home. Take your run here: ${shareUrl}`.trim();

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
            {won ? 'Everyone home' : 'Stopped short'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your route.</span>
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
              SCORE
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              perfect {PERFECT_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, levels, coins, moves} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Boards cleared" value={`${levels}/${LEVELS.length}`} accent={GREEN_LT} />
        <StatTile label="Coins" value={`${coins}/${TOTAL_COINS}`} accent={GOLD} />
        <StatTile label="Moves" value={`${moves}`} accent={BLUE_LT} />
      </div>

      <div style={{
        width: '100%', maxWidth: 360, marginBottom: 14, textAlign: 'center',
        fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', zIndex: 2,
      }}>
        A perfect run clears all {LEVELS.length} boards in {TOTAL_PAR} moves.
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
          Real life has thin ice you cannot see. A specialist can map the cover that gets your family home.
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
