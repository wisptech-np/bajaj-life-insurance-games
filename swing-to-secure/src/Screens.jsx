// Screens.jsx — Home, How to Play, and Results screens for Swing to Secure.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { COLORS, GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Swing to Secure';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function TrophyIcon({ size = 34 }) {
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

function RopeCutIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="#fff"
      strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M8 3c0 5 4 6 4 10" />
      <path d="M20 29c0-5 4-6 4-10" opacity="0.7" />
      <path d="M10 15l6 4M22 15l-6 4" />
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
@keyframes stsSwing   { 0%,100% { transform: rotate(-38deg); } 50% { transform: rotate(30deg); } }
@keyframes stsFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes stsGlow    { 0%,100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.08); } }
@keyframes stsTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.03em; transform: none; } }
@keyframes stsSheen   { 0% { background-position: -180% 0; } 60%,100% { background-position: 180% 0; } }
@keyframes stsBeat1   { 0%,12% { transform: scale(1); opacity: 1; } 20%,100% { transform: scale(0.8); opacity: 0.55; } }
@keyframes stsRope    { 0%,10% { stroke-dashoffset: 96; } 24%,100% { stroke-dashoffset: 0; } }
@keyframes stsArc     { 0%,22% { transform: rotate(-40deg); } 60% { transform: rotate(34deg); } 74%,100% { transform: rotate(34deg); opacity: 0; } }
@keyframes stsFly     { 0%,72% { transform: translate(0,0); opacity: 0; } 74% { opacity: 1; } 100% { transform: translate(52px,-14px); opacity: 0; } }
@keyframes stsChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
.sts-title { animation: stsTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.sts-swing { animation: stsSwing 3.2s ease-in-out infinite; transform-origin: 100px 44px; }
.sts-float { animation: stsFloat 4s ease-in-out infinite; }
.sts-glow  { animation: stsGlow 2.4s ease-in-out infinite; }
.sts-chip  { animation: stsChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .sts-title, .sts-swing, .sts-float, .sts-glow, .sts-chip,
  .sts-beat, .sts-rope, .sts-arc, .sts-flyaway { animation: none !important; }
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
        <h1 className="sts-title" style={{
          fontSize: 34,
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
          Bridge life&rsquo;s gaps — keep your protection momentum
        </p>
      </div>

      {/* Rope-swing motif: pylons, a swinging guardian, the vault ahead. */}
      <div className="sts-float" style={{ position: 'relative', width: 260, height: 232, zIndex: 1 }}>
        <svg width="260" height="232" viewBox="0 0 200 180" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="stsSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A2E62" />
              <stop offset="100%" stopColor="#061634" />
            </linearGradient>
            <linearGradient id="stsRock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22456F" />
              <stop offset="100%" stopColor="#0A1428" />
            </linearGradient>
            <linearGradient id="stsBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4E96FF" />
              <stop offset="100%" stopColor="#003DA6" />
            </linearGradient>
            <linearGradient id="stsGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFE38A" />
              <stop offset="100%" stopColor="#B07B12" />
            </linearGradient>
          </defs>

          <rect x="4" y="4" width="192" height="172" rx="26" fill="url(#stsSky)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />
          <clipPath id="stsClip"><rect x="4" y="4" width="192" height="172" rx="26" /></clipPath>

          <g clipPath="url(#stsClip)">
            {/* Canyon walls */}
            <path d="M4 132 Q34 108 60 126 Q88 146 118 118 Q150 90 196 118 L196 176 L4 176 Z" fill="url(#stsRock)" opacity="0.85" />
            <path d="M4 156 Q40 138 78 154 Q120 172 196 148 L196 176 L4 176 Z" fill="#050C1A" />

            {/* Pylons */}
            {[{ x: 44, y: 44 }, { x: 100, y: 44 }, { x: 156, y: 52 }].map((a) => (
              <g key={a.x}>
                <line x1={a.x} y1="4" x2={a.x} y2={a.y} stroke="rgba(143,185,245,0.4)" strokeWidth="1.4" />
                <rect x={a.x - 15} y={a.y - 9} width="30" height="18" rx="6" fill="#1E6BE0" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                <path d={`M${a.x - 6} ${a.y + 9} h12 v5 q-6 7 -12 0 z`} fill="#fff" opacity="0.9" />
              </g>
            ))}

            {/* Swinging guardian on the middle pylon */}
            <g className="sts-swing">
              <line x1="100" y1="44" x2="100" y2="112" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M100 112 q-14 6 -10 20 q7 -8 12 -6 z" fill="#F26522" />
              <rect x="93" y="106" width="14" height="18" rx="6" fill="url(#stsBody)" />
              <circle cx="100" cy="102" r="6.5" fill="#F2C29B" />
              <path d="M93.5 100 a6.5 6.5 0 0 1 13 0 z" fill="#003DA6" />
              <path d="M100 112 l4 2 q0 6 -4 8 q-4 -2 -4 -8 z" fill="#FFE38A" />
            </g>

            {/* Vault on the far ledge */}
            <g transform="translate(178,120)">
              <circle className="sts-glow" cx="0" cy="-10" r="26" fill="rgba(255,200,69,0.3)" />
              <path d="M-18 22 v-20 q0-22 18-22 q18 0 18 22 v20 z" fill="url(#stsGold)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" />
              <circle cx="0" cy="0" r="8" fill="none" stroke="#0B1221" strokeWidth="2.6" />
              <path d="M0 -12 v5 M0 12 v-5 M-12 0 h5 M12 0 h-5" stroke="#0B1221" strokeWidth="2.2" strokeLinecap="round" />
            </g>

            {/* A coin on the ideal arc */}
            <circle cx="128" cy="88" r="5.5" fill="url(#stsGold)" />
            <circle cx="128" cy="88" r="2.6" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" />
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
/** One beat of the hold → swing → release loop. Pure CSS-animated SVG. */
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
  const pylon = (
    <>
      <line x1="37" y1="0" x2="37" y2="14" stroke="rgba(143,185,245,0.5)" strokeWidth="1.4" />
      <rect x="25" y="8" width="24" height="13" rx="5" fill="#1E6BE0" stroke="rgba(255,255,255,0.45)" strokeWidth="1.1" />
    </>
  );
  const hero = (cx, cy) => (
    <g transform={`translate(${cx},${cy})`}>
      <rect x="-5" y="-5" width="10" height="13" rx="4" fill="#1E6BE0" />
      <circle cx="0" cy="-9" r="5" fill="#F2C29B" />
      <path d="M-5 -10 a5 5 0 0 1 10 0 z" fill="#003DA6" />
    </g>
  );

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
      <style dangerouslySetInnerHTML={{
        __html: `${SCREEN_CSS}
        .sts-beat    { animation: stsBeat1 3.6s ease-in-out infinite; transform-origin: 37px 46px; }
        .sts-rope    { stroke-dasharray: 96; animation: stsRope 3.6s ease-in-out infinite; }
        .sts-arc     { animation: stsArc 3.6s ease-in-out infinite; transform-origin: 37px 14px; }
        .sts-flyaway { animation: stsFly 3.6s ease-in-out infinite; }`,
      }} />

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <Beat n="1" title="Hold to grab" copy="Your rope snaps to the nearest protection pylon.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              {pylon}
              <line className="sts-rope" x1="37" y1="14" x2="37" y2="46" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              {hero(37, 50)}
              <circle className="sts-beat" cx="37" cy="46" r="13" fill="none" stroke={COLORS.orangeLt} strokeWidth="2.4" />
            </svg>
          </Beat>

          <Beat n="2" title="Swing for speed" copy="Gravity builds momentum through the low point of the arc.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              {pylon}
              <path d="M13 40 A26 26 0 0 0 61 40" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" strokeDasharray="3 4" />
              <g className="sts-arc">
                <line x1="37" y1="14" x2="37" y2="44" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                {hero(37, 48)}
              </g>
            </svg>
          </Beat>

          <Beat n="3" title="Release to fly" copy="Let go on the forward swing. Time it right for PERFECT +50.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              {pylon}
              <g className="sts-arc">
                <line x1="37" y1="14" x2="37" y2="44" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              </g>
              <g className="sts-flyaway">
                {hero(30, 40)}
                <text x="42" y="26" fill={COLORS.gold} fontSize="9" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">+50</text>
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Collect coins, dodge the green risk orbs, and reach the vault at{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.goalMeters.toLocaleString()} m</strong> before the clock runs out.
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
          {won ? <TrophyIcon size={20} /> : <RopeCutIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Vault secured' : 'Run ended'}
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
        <StatTile label="Distance" value={`${distance.toLocaleString()}m`} accent={COLORS.brandBlueLt} />
        <StatTile label="Coins" value={coins} accent={COLORS.gold} />
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
          Momentum carried you this far. A specialist can make sure every real milestone is covered.
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
