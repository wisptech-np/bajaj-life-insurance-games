// Screens.jsx — Home, How to Play, and Results screens for Milestone Hopper.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { COLORS, GAME_CONFIG, MILESTONE_LIST, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Milestone Hopper';

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
@keyframes mhTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes mhFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes mhGlow    { 0%,100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.07); } }
@keyframes mhHeroHop {
  0%,18%  { transform: translate(0, 0); }
  30%     { transform: translate(0, -16px) scaleY(1.08); }
  42%,60% { transform: translate(0, -22px); }
  72%     { transform: translate(0, -22px) scaleY(0.9); }
  84%,100%{ transform: translate(0, -22px); opacity: 0; }
}
@keyframes mhHeroVirus { 0% { transform: translateX(-70px); } 100% { transform: translateX(70px); } }
@keyframes mhChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes mhBeatTap { 0%,20% { transform: scale(1); opacity: 1; } 34%,100% { transform: scale(0.7); opacity: 0.4; } }
@keyframes mhBeatHop { 0%,22% { transform: translateY(0); } 40%,100% { transform: translateY(-20px); } }
@keyframes mhBeatCar { 0% { transform: translateX(-30px); } 100% { transform: translateX(58px); } }
@keyframes mhBeatDodge { 0%,30% { transform: translateX(0); } 48%,100% { transform: translateX(-16px); } }
@keyframes mhBeatFlag { 0%,40% { opacity: 0; transform: translateY(6px) scale(0.7); } 58%,100% { opacity: 1; transform: none; } }
.mh-title { animation: mhTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.mh-float { animation: mhFloat 4s ease-in-out infinite; }
.mh-glow  { animation: mhGlow 2.4s ease-in-out infinite; }
.mh-chip  { animation: mhChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.mh-hero-hop   { animation: mhHeroHop 3.4s ease-in-out infinite; }
.mh-hero-virus { animation: mhHeroVirus 2.6s linear infinite; }
.mh-tap   { animation: mhBeatTap 2.6s ease-in-out infinite; transform-origin: 37px 40px; }
.mh-hop   { animation: mhBeatHop 2.6s cubic-bezier(0.22,1,0.36,1) infinite; }
.mh-car   { animation: mhBeatCar 2.2s linear infinite; }
.mh-dodge { animation: mhBeatDodge 2.2s cubic-bezier(0.22,1,0.36,1) infinite; }
.mh-flag  { animation: mhBeatFlag 2.6s cubic-bezier(0.22,1,0.36,1) infinite; transform-origin: 37px 26px; }
@media (prefers-reduced-motion: reduce) {
  .mh-title, .mh-float, .mh-glow, .mh-chip, .mh-hero-hop, .mh-hero-virus,
  .mh-tap, .mh-hop, .mh-car, .mh-dodge, .mh-flag { animation: none !important; }
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
 * Hero motif: the course itself, drawn as a receding stack of flat-shaded slabs.
 * Each band is a top face plus a darker front face, and the bands tile exactly —
 * the same construction the canvas uses, so the screen previews the game rather
 * than illustrating it.
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
  const [top, front] = HERO_PAINT[HERO_ROWS[i].kind];
  return (
    <g>
      <polygon points={`${b1},${yb} ${b2},${yb} ${f2},${yf} ${f1},${yf}`} fill={front} />
      <polygon points={`${t1},${yt} ${t2},${yt} ${b2},${yb} ${b1},${yb}`} fill={top} />
      {HERO_ROWS[i].kind === 'road' && (
        <g stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" strokeDasharray="7 7">
          <line x1={t1 + 4} y1={(yt + yb) / 2} x2={t2 - 4} y2={(yt + yb) / 2} />
        </g>
      )}
      {HERO_ROWS[i].kind === 'goal' && <line x1={t1} y1={yt} x2={t2} y2={yt} stroke={COLORS.gold} strokeWidth="2.5" />}
    </g>
  );
}

function HeroGuardian({ x, y, s = 1 }) {
  const w = 15 * s;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx={w * 0.5} ry={w * 0.2} fill="rgba(0,0,0,0.35)" />
      <path d="M-3 -16 q-9 5 -6 14 q4 -5 7 -4 z" fill={COLORS.orange} />
      <rect x={-w / 2} y={-17} width={w} height={17} rx="5" fill="url(#mhBody)" />
      <rect x={-w / 2 + 1} y={-21} width={w - 2} height={7} rx="3.4" fill="#7FB6FF" />
      <rect x={-5} y={-14} width={10} height={4.4} rx="2.2" fill="rgba(11,18,33,0.85)" />
      <rect x={-4} y={-13.4} width={5} height={3} rx="1.5" fill="#A8CEFF" />
    </g>
  );
}

function HeroVirus({ r = 8 }) {
  return (
    <g>
      <circle cx="0" cy="0" r={r} fill={COLORS.virus} />
      <circle cx="0" cy="0" r={r * 0.45} fill={COLORS.virusCore} />
      <g stroke={COLORS.virus} strokeWidth="2.4" strokeLinecap="round">
        <path d={`M0 ${-r} v-4 M0 ${r} v4 M${-r} 0 h-4 M${r} 0 h4`} />
        <path
          d={`M${-r * 0.72} ${-r * 0.72} l-2.8 -2.8 M${r * 0.72} ${r * 0.72} l2.8 2.8`
            + ` M${r * 0.72} ${-r * 0.72} l2.8 -2.8 M${-r * 0.72} ${r * 0.72} l-2.8 2.8`}
        />
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
        padding: '50px 24px 56px',
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221',
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="mh-title" style={{
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
          Cross life&rsquo;s risks &mdash; one milestone at a time
        </p>
      </div>

      <div className="mh-float" style={{ position: 'relative', width: 262, height: 236, zIndex: 1 }}>
        <svg width="262" height="236" viewBox="0 0 200 180" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="mhSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#061634" />
              <stop offset="100%" stopColor="#0A2444" />
            </linearGradient>
            <linearGradient id="mhBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4E96FF" />
              <stop offset="100%" stopColor="#003DA6" />
            </linearGradient>
            <linearGradient id="mhGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFE38A" />
              <stop offset="100%" stopColor="#B07B12" />
            </linearGradient>
            <clipPath id="mhClip"><rect x="4" y="4" width="192" height="172" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="172" rx="26" fill="url(#mhSky)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#mhClip)">
            {/* Far to near, so each near band's front face stays visible. */}
            {[5, 4, 3, 2, 1, 0].map((i) => <HeroSlab key={i} i={i} />)}

            {/* Retirement rule at the top of the stack. */}
            <text x="100" y="52" fill={COLORS.goldLt} fontSize="9" fontWeight="900" textAnchor="middle"
              letterSpacing="1.6" fontFamily="'Plus Jakarta Sans', sans-serif">
              RETIREMENT
            </text>

            {/* A blob streaming across the near road. */}
            <g transform="translate(100,128)">
              <g className="mh-hero-virus"><HeroVirus r={8} /></g>
            </g>

            {/* Coin on the safe band above it. */}
            <g transform="translate(62,106)">
              <ellipse cx="0" cy="0" rx="4.5" ry="6.5" fill="url(#mhGold)" />
              <ellipse cx="0" cy="0" rx="2" ry="3.4" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.1" />
            </g>

            {/* Guardian mid-hop between the two near bands. */}
            <g className="mh-hero-hop" transform="translate(130,152)">
              <HeroGuardian x={0} y={0} s={1} />
            </g>
            <HeroGuardian x={130} y={130} s={0.92} />

            {/* Risk tide creeping in at the bottom. */}
            <g className="mh-glow">
              <rect x="4" y="164" width="192" height="14" fill="rgba(40,180,80,0.4)" />
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
/** One beat of the tap - dodge - arrive loop. Pure CSS-animated SVG. */
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

/** A band of the course, for the tutorial diagrams. */
function BeatBand({ y, top, front, dash }) {
  return (
    <g>
      <rect x="0" y={y} width="74" height="14" fill={top} />
      <rect x="0" y={y + 14} width="74" height="5" fill={front} />
      {dash && <line x1="3" y1={y + 7} x2="71" y2={y + 7} stroke="rgba(255,255,255,0.24)" strokeWidth="1.6" strokeDasharray="6 6" />}
    </g>
  );
}

function BeatHero({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="1" rx="6" ry="2.4" fill="rgba(0,0,0,0.35)" />
      <rect x="-5.5" y="-12" width="11" height="12" rx="3.6" fill="url(#mhBody)" />
      <rect x="-4.6" y="-15" width="9.2" height="5" rx="2.4" fill="#7FB6FF" />
      <rect x="-3.4" y="-10" width="6.8" height="3.2" rx="1.6" fill="rgba(11,18,33,0.85)" />
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
            <linearGradient id="mhBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4E96FF" />
              <stop offset="100%" stopColor="#003DA6" />
            </linearGradient>
          </defs>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <Beat n="1" title="Tap to hop" copy="One tap moves you forward one row.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatBand y={38} top={COLORS.rowSafeTop} front={COLORS.rowSafeFront} />
              <BeatBand y={19} top={COLORS.rowSafeAltTop} front={COLORS.rowSafeAltFront} />
              <g className="mh-hop"><BeatHero x={37} y={48} /></g>
              <circle className="mh-tap" cx="37" cy="40" r="12" fill="none" stroke={COLORS.orangeLt} strokeWidth="2.4" />
            </svg>
          </Beat>

          <Beat n="2" title="Swipe to dodge" copy="Green risk blobs stream across the roads. Step aside.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatBand y={38} top={COLORS.rowRoadTop} front={COLORS.rowRoadFront} dash />
              <BeatBand y={19} top={COLORS.rowSafeTop} front={COLORS.rowSafeFront} />
              <g className="mh-car" transform="translate(8,45)"><HeroVirus r={6} /></g>
              <g className="mh-dodge"><BeatHero x={45} y={50} /></g>
            </svg>
          </Beat>

          <Beat n="3" title="Reach the milestone" copy="Six life stages. Retirement is row 48.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatBand y={38} top={COLORS.rowSafeTop} front={COLORS.rowSafeFront} />
              <BeatBand y={19} top={COLORS.rowGoalTop} front={COLORS.rowGoalFront} />
              <line x1="0" y1="19" x2="74" y2="19" stroke={COLORS.gold} strokeWidth="2.4" />
              <g className="mh-hop"><BeatHero x={37} y={48} /></g>
              <g className="mh-flag">
                <rect x="17" y="2" width="40" height="14" rx="7" fill="rgba(40,167,69,0.95)" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
                <text x="37" y="12" fill="#fff" fontSize="8" fontWeight="900" textAnchor="middle"
                  fontFamily="'Plus Jakarta Sans', sans-serif">+300</text>
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Grab coins and cover tokens, ride the glowing platforms across the risk
          rivers, and stay ahead of the tide &mdash; all{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.totalRows} rows</strong> in{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong>.
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
  const rows = stats?.rows || 0;
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
    const shareMessage = `Hi,\nI crossed ${rows} of ${GAME_CONFIG.totalRows} rows and scored ${score} points in the ${GAME_TITLE} challenge.\nEvery life milestone needs cover to reach. Take your run here: ${shareUrl}`.trim();

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
          {won ? <TrophyIcon size={20} /> : <RiskIcon size={20} />}
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
        <StatTile label="Rows" value={`${rows}/${GAME_CONFIG.totalRows}`} accent={COLORS.brandBlueLt} />
        <StatTile label="Coins" value={coins} accent={COLORS.gold} />
        <StatTile label="Milestones" value={`${milestonesHit}/${MILESTONE_LIST.length}`} accent={COLORS.green} />
      </div>

      {/* Milestone chips */}
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
                fontSize: 10.5,
                fontWeight: 800,
                padding: '5px 11px',
                borderRadius: 999,
                color: hit ? '#fff' : 'rgba(255,255,255,0.4)',
                background: hit ? 'rgba(40,167,69,0.85)' : 'rgba(255,255,255,0.05)',
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
          You dodged the risks on screen. A specialist can help you cover the real ones.
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
