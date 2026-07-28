// Screens.jsx — Home, How to Play, and Results screens for Spiral Sprint.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { COLORS, GAME_CONFIG, MILESTONE_LIST, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Spiral Sprint';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Win mark: the vault at the bottom of the tower. */
function VaultIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="24" height="22" rx="3" fill="#fff" opacity="0.95" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="rgba(11,18,33,0.75)" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="2" fill="rgba(11,18,33,0.75)" />
      <g stroke="rgba(11,18,33,0.75)" strokeWidth="2" strokeLinecap="round">
        <path d="M16 7.5v3M16 21.5v3M7.5 16h3M21.5 16h3" />
      </g>
    </svg>
  );
}

/** Run-ended mark: the risk blob that stopped you. */
function RiskIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="8" fill="#fff" />
      <circle cx="16" cy="16" r="3.6" fill="rgba(11,18,33,0.6)" />
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        <path d="M16 5v3.5M16 23.5V27M5 16h3.5M23.5 16H27" />
        <path d="M8.2 8.2l2.5 2.5M21.3 21.3l2.5 2.5M23.8 8.2l-2.5 2.5M10.7 21.3l-2.5 2.5" />
      </g>
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
@keyframes ssGlow    { 0%,100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.07); } }
@keyframes ssHeroDrop {
  0%,10%   { transform: translateY(0); opacity: 1; }
  28%,40%  { transform: translateY(34px); opacity: 1; }
  58%,70%  { transform: translateY(68px); opacity: 1; }
  92%,100% { transform: translateY(104px); opacity: 0; }
}
@keyframes ssHeroSpin { 0%,100% { transform: translateX(-7px); } 50% { transform: translateX(7px); } }
@keyframes ssChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes ssBeatDrag { 0%,10% { transform: translateX(-15px); } 55%,100% { transform: translateX(15px); } }
@keyframes ssBeatFall { 0%,20% { transform: translateY(0); } 70%,100% { transform: translateY(26px); } }
@keyframes ssBeatDodge { 0%,25% { transform: translateX(0); } 60%,100% { transform: translateX(-19px); } }
@keyframes ssBeatWarn { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }
.ss-title { animation: ssTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-float { animation: ssFloat 4s ease-in-out infinite; }
.ss-glow  { animation: ssGlow 2.4s ease-in-out infinite; }
.ss-chip  { animation: ssChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-hero-drop { animation: ssHeroDrop 3.6s cubic-bezier(0.4,0,0.7,1) infinite; }
.ss-hero-spin { animation: ssHeroSpin 5s ease-in-out infinite; }
.ss-drag  { animation: ssBeatDrag 2.4s ease-in-out infinite; }
.ss-fall  { animation: ssBeatFall 2.4s cubic-bezier(0.4,0,0.7,1) infinite; }
.ss-dodge { animation: ssBeatDodge 2.4s cubic-bezier(0.22,1,0.36,1) infinite; }
.ss-warn  { animation: ssBeatWarn 1.1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ss-title, .ss-float, .ss-glow, .ss-chip, .ss-hero-drop, .ss-hero-spin,
  .ss-drag, .ss-fall, .ss-dodge, .ss-warn { animation: none !important; }
}
`;

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
 * Hero motif: the tower itself, built the way the canvas builds it — tilted
 * platform rings with a darker front face for thickness, a wedge cut out for
 * the gap, a green wedge for a crash arc, and the shield ball dropping down the
 * shaft toward the vault. The screen previews the game rather than illustrating
 * it.
 */
function wedgePath(cx, cy, rx, ry, from, to) {
  return `M${cx} ${cy} L${cx + rx * Math.cos(from)} ${cy + ry * Math.sin(from)}`
    + ` A${rx} ${ry} 0 0 1 ${cx + rx * Math.cos(to)} ${cy + ry * Math.sin(to)} Z`;
}

function HeroRing({ y, rx, ry, gap, crash, dim }) {
  return (
    <g opacity={dim}>
      <ellipse cx="100" cy={y + 6} rx={rx} ry={ry} fill={COLORS.safeFront} />
      <ellipse cx="100" cy={y} rx={rx} ry={ry} fill={COLORS.landTop} />
      {crash && <path d={wedgePath(100, y, rx, ry, crash[0], crash[1])} fill={COLORS.crashTop} />}
      <path d={wedgePath(100, y, rx, ry, gap[0], gap[1])} fill="#061634" />
      <ellipse cx="100" cy={y} rx={rx * 0.34} ry={ry * 0.34} fill={COLORS.coreTop} />
    </g>
  );
}

function HeroBall({ x, y, r = 9 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r={r} fill="url(#ssBall)" />
      <path
        d={`M0 ${-r * 0.62} L${r * 0.46} ${-r * 0.3} L${r * 0.46} ${r * 0.14}`
          + ` Q${r * 0.38} ${r * 0.6} 0 ${r * 0.68}`
          + ` Q${-r * 0.38} ${r * 0.6} ${-r * 0.46} ${r * 0.14}`
          + ` L${-r * 0.46} ${-r * 0.3} Z`}
        fill="rgba(255,255,255,0.92)"
      />
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
        padding: '50px 24px 56px',
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221',
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="ss-title" style={{
          fontSize: 33,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 1,
          margin: '0 0 8px 0',
          textShadow: '0 2px 10px rgba(0,0,0,0.55)',
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
          Ride the market cycles &mdash; land safe, dodge the crash
        </p>
      </div>

      <div className="ss-float" style={{ position: 'relative', width: 250, height: 230, zIndex: 1 }}>
        <svg width="250" height="230" viewBox="0 0 200 184" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="ssSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#061634" />
              <stop offset="100%" stopColor="#08182F" />
            </linearGradient>
            <radialGradient id="ssBall" cx="35%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#CFE4FF" />
              <stop offset="45%" stopColor="#4E96FF" />
              <stop offset="100%" stopColor="#003DA6" />
            </radialGradient>
            <linearGradient id="ssVault" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F3C75A" />
              <stop offset="100%" stopColor="#8A5F12" />
            </linearGradient>
            <clipPath id="ssClip"><rect x="4" y="4" width="192" height="176" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="176" rx="26" fill="url(#ssSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#ssClip)">
            {/* Core cylinder the rings thread onto. */}
            <rect x="82" y="4" width="36" height="176" fill={COLORS.coreMid} />
            <rect x="82" y="4" width="13" height="176" fill={COLORS.coreTop} opacity="0.55" />

            {/* Far to near, so each near ring's front face stays visible. */}
            <g className="ss-hero-spin">
              <HeroRing y={46} rx={58} ry={20} gap={[0.55, 1.65]} dim={0.55} />
              <HeroRing y={80} rx={63} ry={21} gap={[2.5, 3.55]} crash={[0.25, 1.2]} dim={0.75} />
              <HeroRing y={114} rx={68} ry={23} gap={[0.6, 1.75]} dim={0.92} />
            </g>

            {/* The vault floor at the bottom of the shaft. */}
            <ellipse cx="100" cy="158" rx="72" ry="24" fill={COLORS.vaultFront} />
            <ellipse cx="100" cy="152" rx="72" ry="24" fill="url(#ssVault)" />
            <ellipse cx="100" cy="152" rx="26" ry="9" fill="none" stroke="rgba(11,18,33,0.6)" strokeWidth="2.4" />
            <circle cx="100" cy="152" r="3" fill="rgba(11,18,33,0.7)" />

            {/* Ball dropping down the shaft. */}
            <g className="ss-hero-drop"><HeroBall x={100} y={40} r={9} /></g>

            {/* Years-to-retirement rule near the top. */}
            <text x="100" y="26" fill={COLORS.goldLt} fontSize="8.5" fontWeight="900" textAnchor="middle"
              letterSpacing="1.5" fontFamily="'Plus Jakarta Sans', sans-serif">
              40 YEARS TO RETIREMENT
            </text>

            {/* Depth fog at the base. */}
            <g className="ss-glow">
              <rect x="4" y="168" width="192" height="12" fill="rgba(4,10,22,0.75)" />
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
/** One beat of the spin - drop - dodge loop. Pure CSS-animated SVG. */
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
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: COLORS.orangeLt, textTransform: 'uppercase' }}>
          Step {n}
        </div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.35 }}>{copy}</div>
      </div>
    </div>
  );
}

/** A tutorial ring: tilted band, core hub, optional gap and crash wedges. */
function BeatRing({ y, gap, crash }) {
  const rx = 29;
  const ry = 9.5;
  const cx = 37;
  return (
    <g>
      <ellipse cx={cx} cy={y + 3.5} rx={rx} ry={ry} fill={COLORS.safeFront} />
      <ellipse cx={cx} cy={y} rx={rx} ry={ry} fill={COLORS.landTop} />
      {crash && <path d={wedgePath(cx, y, rx, ry, crash[0], crash[1])} fill={COLORS.crashTop} />}
      {gap && <path d={wedgePath(cx, y, rx, ry, gap[0], gap[1])} fill="#0B1221" />}
      <ellipse cx={cx} cy={y} rx={rx * 0.34} ry={ry * 0.34} fill={COLORS.coreTop} />
    </g>
  );
}

function BeatBall({ x, y, r = 6 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r={r} fill="url(#ssBall2)" />
      <circle cx={-r * 0.26} cy={-r * 0.3} r={r * 0.3} fill="rgba(255,255,255,0.75)" />
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
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221',
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
          letterSpacing: '-0.02em', margin: '0 0 16px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <radialGradient id="ssBall2" cx="35%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#CFE4FF" />
              <stop offset="45%" stopColor="#4E96FF" />
              <stop offset="100%" stopColor="#003DA6" />
            </radialGradient>
          </defs>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <Beat n="1" title="Drag to spin" copy="Swipe left or right to turn the tower under the ball.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatRing y={32} gap={[0.5, 1.6]} />
              <BeatBall x={37} y={20} />
              <g className="ss-drag">
                <path d="M22 52h30" stroke={COLORS.orangeLt} strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="37" cy="52" r="4.5" fill={COLORS.orangeLt} />
              </g>
            </svg>
          </Beat>

          <Beat n="2" title="Drop through the gaps" copy="Three rings in one fall lights the fever flame.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatRing y={22} gap={[0.42, 1.7]} />
              <BeatRing y={48} gap={[0.42, 1.7]} />
              <g className="ss-fall"><BeatBall x={37} y={14} /></g>
            </svg>
          </Beat>

          <Beat n="3" title="Dodge the crash zones" copy="Touch a green crash arc and the run ends.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatRing y={38} gap={[3.6, 4.5]} crash={[0.35, 1.75]} />
              <g className="ss-dodge"><BeatBall x={50} y={26} /></g>
              <g className="ss-warn">
                <path d="M10 12h54" stroke={COLORS.danger} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Every ring you clear is a year closer to the vault. Reach all{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.tower.rings} rings</strong> within{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong> &mdash; and smash a
          crash arc while the fever burns for{' '}
          <strong style={{ color: COLORS.goldLt }}>+{GAME_CONFIG.scoring.smash}</strong>.
        </p>

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
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const rings = stats?.rings || 0;
  const smashes = stats?.smashes || 0;
  const streak = stats?.streak || 0;
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
    const shareMessage = `Hi,\nI rode ${rings} of ${GAME_CONFIG.tower.rings} market cycles down and scored ${score} points in the ${GAME_TITLE} challenge.\nVolatility is survivable when you are covered. Take your run here: ${shareUrl}`.trim();

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
  const strokeColor = won ? COLORS.green : score < 400 ? COLORS.danger : COLORS.gold;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : score < 400 ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221',
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
          {won ? <VaultIcon size={20} /> : <RiskIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Vault reached' : 'Run ended'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: COLORS.brandBlueLt }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your descent.</span>
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
          </div>
        </div>
      </div>

      {/* Run stats */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 12, zIndex: 2 }}>
        <StatTile label="Rings" value={`${rings}/${GAME_CONFIG.tower.rings}`} accent={COLORS.brandBlueLt} />
        <StatTile label="Smashes" value={smashes} accent={COLORS.orangeLt} />
        <StatTile label="Best streak" value={streak} accent={COLORS.gold} />
      </div>

      {/* Milestone chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2,
      }}>
        {MILESTONE_LIST.map((ms, i) => {
          const hit = rings >= ms.ring;
          return (
            <span
              key={ms.ring}
              className="ss-chip"
              style={{
                animationDelay: `${180 + i * 90}ms`,
                fontSize: 10.5,
                fontWeight: 800,
                padding: '5px 11px',
                borderRadius: 999,
                color: hit ? '#fff' : 'rgba(255,255,255,0.4)',
                background: hit ? 'rgba(0,61,166,0.9)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${hit ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              {ms.label}
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
          You rode the cycles down on screen. A specialist can help you ride the real ones.
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
