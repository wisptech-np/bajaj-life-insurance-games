// Screens.jsx — Home, How to Play, and Results screens for Ripple Shield.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { COLORS, GAME_CONFIG, WAVE_LIST, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Ripple Shield';

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

/** Run-ended mark: the risk that broke the chain. */
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
@keyframes rsTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes rsFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes rsRing    { 0% { transform: scale(0.08); opacity: 0.95; } 100% { transform: scale(1); opacity: 0; } }
@keyframes rsCover   { 0%,32% { opacity: 0; } 48%,100% { opacity: 1; } }
@keyframes rsCover2  { 0%,55% { opacity: 0; } 70%,100% { opacity: 1; } }
@keyframes rsChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes rsTap     { 0%,18% { transform: scale(1); opacity: 1; } 34%,100% { transform: scale(0.66); opacity: 0.35; } }
@keyframes rsBeatRing { 0%,12% { transform: scale(0.12); opacity: 1; } 70%,100% { transform: scale(1); opacity: 0; } }
@keyframes rsBeatRing2 { 0%,45% { transform: scale(0.12); opacity: 0; } 55% { transform: scale(0.14); opacity: 1; } 100% { transform: scale(0.86); opacity: 0; } }
@keyframes rsShrink  { 0%,38% { transform: scale(1); opacity: 0.9; } 58%,100% { transform: scale(0.46); opacity: 0.35; } }
.rs-title { animation: rsTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-float { animation: rsFloat 4s ease-in-out infinite; }
.rs-ring1 { animation: rsRing 3s ease-out infinite; }
.rs-ring2 { animation: rsRing 3s ease-out 0.55s infinite; }
.rs-ring3 { animation: rsRing 3s ease-out 1.1s infinite; }
.rs-cover  { animation: rsCover 3s ease-out infinite; }
.rs-cover2 { animation: rsCover2 3s ease-out infinite; }
.rs-chip  { animation: rsChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-tap   { animation: rsTap 2.4s ease-in-out infinite; }
.rs-bring  { animation: rsBeatRing 2.4s ease-out infinite; }
.rs-bring2 { animation: rsBeatRing2 2.4s ease-out infinite; }
.rs-shrink { animation: rsShrink 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rs-title, .rs-float, .rs-ring1, .rs-ring2, .rs-ring3, .rs-cover, .rs-cover2,
  .rs-chip, .rs-tap, .rs-bring, .rs-bring2, .rs-shrink { animation: none !important; }
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

/* ─── Shared orb art ─────────────────────────────────────── */
/** A family orb: blue bead with the three-dot family motif, as on the canvas. */
function Orb({ x, y, r = 9, covered = false, className }) {
  return (
    <g transform={`translate(${x},${y})`} className={className}>
      <circle cx="0" cy="0" r={r} fill={covered ? 'url(#rsGold)' : 'url(#rsBlue)'} />
      <circle cx="0" cy="0" r={r - 0.7} fill="none"
        stroke={covered ? 'rgba(255,255,255,0.9)' : 'rgba(168,206,255,0.7)'} strokeWidth="1.1" />
      {covered ? (
        <path d={`M${-r * 0.38} 0 L${-r * 0.08} ${r * 0.32} L${r * 0.42} ${-r * 0.34}`}
          fill="none" stroke="#7A4B06" strokeWidth={Math.max(1.4, r * 0.2)}
          strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <g fill="rgba(255,255,255,0.82)">
          <circle cx={-r * 0.3} cy={r * 0.06} r={r * 0.19} />
          <circle cx={r * 0.3} cy={r * 0.06} r={r * 0.19} />
          <circle cx="0" cy={r * 0.34} r={r * 0.14} />
        </g>
      )}
    </g>
  );
}

/** A virus orb: spiked green disc. Green is always risk. */
function Virus({ x, y, r = 8 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r={r} fill={COLORS.virus} />
      <circle cx="0" cy="0" r={r * 0.45} fill={COLORS.virusCore} />
      <g stroke={COLORS.virus} strokeWidth="2.2" strokeLinecap="round">
        <path d={`M0 ${-r} v-3.4 M0 ${r} v3.4 M${-r} 0 h-3.4 M${r} 0 h3.4`} />
        <path
          d={`M${-r * 0.72} ${-r * 0.72} l-2.4 -2.4 M${r * 0.72} ${r * 0.72} l2.4 2.4`
            + ` M${r * 0.72} ${-r * 0.72} l2.4 -2.4 M${-r * 0.72} ${r * 0.72} l-2.4 2.4`}
        />
      </g>
    </g>
  );
}

function OrbDefs() {
  return (
    <defs>
      <linearGradient id="rsBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5C9BFF" />
        <stop offset="100%" stopColor={COLORS.orbCore} />
      </linearGradient>
      <linearGradient id="rsGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={COLORS.orbSafeCore} />
        <stop offset="100%" stopColor={COLORS.orbSafeRim} />
      </linearGradient>
      <linearGradient id="rsSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#061634" />
        <stop offset="100%" stopColor="#0A2444" />
      </linearGradient>
    </defs>
  );
}

/* ─── Home ───────────────────────────────────────────────── */
/**
 * Hero motif: the board itself. One tap point sends three rings outward and the
 * orbs they pass turn gold, with viruses sitting where the chain would break —
 * the screen previews the game rather than illustrating it.
 */
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
        <h1 className="rs-title" style={{
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
          One policy protects many. Start the ripple.
        </p>
      </div>

      <div className="rs-float" style={{ position: 'relative', width: 262, height: 236, zIndex: 1 }}>
        <svg width="262" height="236" viewBox="0 0 200 180" style={{ overflow: 'visible' }} aria-hidden="true">
          <OrbDefs />
          <clipPath id="rsClip"><rect x="4" y="4" width="192" height="172" rx="26" /></clipPath>

          <rect x="4" y="4" width="192" height="172" rx="26" fill="url(#rsSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#rsClip)">
            {/* Expanding shield rings from the tap point. */}
            <g fill="none" stroke="#A8CEFF" strokeWidth="2.4" style={{ transformOrigin: '100px 96px' }}>
              <circle className="rs-ring1" cx="100" cy="96" r="76" style={{ transformOrigin: '100px 96px' }} />
              <circle className="rs-ring2" cx="100" cy="96" r="76" style={{ transformOrigin: '100px 96px' }} />
              <circle className="rs-ring3" cx="100" cy="96" r="76" style={{ transformOrigin: '100px 96px' }} />
            </g>

            {/* Orbs the ripple has already reached turn gold, in order. */}
            <Orb x={100} y={96} r={10} covered className="rs-cover" />
            <Orb x={68} y={72} r={9} covered className="rs-cover" />
            <Orb x={134} y={116} r={9} covered className="rs-cover2" />
            <Orb x={140} y={62} r={9} covered className="rs-cover2" />

            {/* Still exposed. */}
            <Orb x={44} y={130} r={9} />
            <Orb x={72} y={148} r={8} />
            <Orb x={166} y={140} r={8} />
            <Orb x={38} y={44} r={8} />

            {/* The risk that eats a ripple. */}
            <Virus x={162} y={40} r={8} />
            <Virus x={110} y={152} r={7} />
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
/** One beat of the tap - chain - avoid loop. Pure CSS-animated SVG. */
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
          letterSpacing: '-0.02em', margin: '0 0 6px 0', color: '#fff',
        }}>
          How to Play
        </h2>
        <p style={{
          fontSize: 10.5, fontWeight: 900, letterSpacing: '0.09em', textTransform: 'uppercase',
          color: COLORS.orangeLt, margin: '0 0 16px 0',
        }}>
          One tap per wave &middot; Chain family orbs &middot; Avoid the viruses
        </p>

        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <OrbDefs />
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <Beat n="1" title="One tap per wave" copy="Hold to aim, release to send a shield ripple.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <Orb x={18} y={20} r={7} />
              <Orb x={56} y={44} r={7} />
              <circle className="rs-bring" cx="37" cy="34" r="30" fill="none" stroke="#A8CEFF"
                strokeWidth="2.4" style={{ transformOrigin: '37px 34px' }} />
              <circle className="rs-tap" cx="37" cy="34" r="11" fill="none" stroke={COLORS.orangeLt}
                strokeWidth="2.4" style={{ transformOrigin: '37px 34px' }} />
            </svg>
          </Beat>

          <Beat n="2" title="Chain the family" copy="Every orb the ring touches sends its own ripple.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <circle className="rs-bring" cx="20" cy="34" r="30" fill="none" stroke="#A8CEFF"
                strokeWidth="2.2" style={{ transformOrigin: '20px 34px' }} />
              <circle className="rs-bring2" cx="50" cy="26" r="30" fill="none" stroke={COLORS.goldLt}
                strokeWidth="2.2" style={{ transformOrigin: '50px 26px' }} />
              <Orb x={20} y={34} r={7} covered className="rs-cover" />
              <Orb x={50} y={26} r={7} covered className="rs-cover2" />
              <Orb x={64} y={48} r={6} />
            </svg>
          </Beat>

          <Beat n="3" title="Avoid the viruses" copy="A green orb the ripple hits shrinks its reach.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <circle className="rs-shrink" cx="30" cy="32" r="26" fill="none" stroke={COLORS.orangeLt}
                strokeWidth="2.4" style={{ transformOrigin: '30px 32px' }} />
              <Virus x={52} y={22} r={7} />
              <Orb x={22} y={44} r={7} />
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Clear all{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.waves.length} wave targets</strong> inside{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong>. Wave one asks for{' '}
          <strong style={{ color: '#fff' }}>{WAVE_LIST[0].target} of {WAVE_LIST[0].orbs}</strong>.
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
  const protectedCount = stats?.protected || 0;
  const wavesCleared = stats?.waves || 0;
  const bestChain = stats?.chain || 0;
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
    const shareMessage = `Hi,\nI protected ${protectedCount} family orbs across ${wavesCleared} of ${GAME_CONFIG.waves.length} waves and scored ${score} points in the ${GAME_TITLE} challenge.\nOne policy protects many — start your ripple here: ${shareUrl}`.trim();

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
  const strokeColor = won ? COLORS.green : score < 1200 ? COLORS.danger : COLORS.gold;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : score < 1200 ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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
            {won ? 'Every wave protected' : 'Ripple ran short'}
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
        <StatTile label="Protected" value={protectedCount} accent={COLORS.gold} />
        <StatTile label="Waves" value={`${wavesCleared}/${GAME_CONFIG.waves.length}`} accent={COLORS.brandBlueLt} />
        <StatTile label="Best chain" value={bestChain} accent={COLORS.green} />
      </div>

      {/* Wave chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2,
      }}>
        {WAVE_LIST.map((w, i) => {
          const cleared = i < wavesCleared;
          return (
            <span
              key={w.wave}
              className="rs-chip"
              style={{
                animationDelay: `${180 + i * 90}ms`,
                fontSize: 10.5,
                fontWeight: 800,
                padding: '5px 11px',
                borderRadius: 999,
                color: cleared ? '#fff' : 'rgba(255,255,255,0.4)',
                background: cleared ? 'rgba(30,107,224,0.85)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${cleared ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              W{w.wave} &middot; {w.target}/{w.orbs}
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
          One shield reached {protectedCount} on screen. A specialist can show you how far one policy reaches at home.
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
