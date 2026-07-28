// Screens.jsx — Home, HowToPlay, and Results screens for Risk Exit.
// Matches the brand styling: deep-blue background, glassmorphism,
// 12px rounded-xl buttons with hover scale animations, and synthetic SFX.
import React from 'react';
import { motion } from 'framer-motion';
import { BRAND } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ShareIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
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

/* ─── Arrow hero illustration (inline SVG, no assets) ───── */
function ArrowHero() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: 280,
        height: 280,
        margin: '0 auto',
        animation: 're-float 4s ease-in-out infinite',
        filter: 'drop-shadow(0 20px 24px rgba(0,0,0,0.4))',
      }}
    >
      <svg width="280" height="280" viewBox="0 0 280 280">
        <defs>
          <linearGradient id="reBgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#111c30" />
            <stop offset="100%" stopColor="#070c14" />
          </linearGradient>
          <linearGradient id="reBlueArrow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5B8DEF" />
            <stop offset="100%" stopColor="#012B72" />
          </linearGradient>
          <linearGradient id="reOrangeArrow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF9A4D" />
            <stop offset="100%" stopColor="#C24A0E" />
          </linearGradient>
          <linearGradient id="reGreenArrow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#1B7A33" />
          </linearGradient>
          <linearGradient id="reRedRisk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="100%" stopColor="#7F1D1D" />
          </linearGradient>
          {/* Grid pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Board container */}
        <rect x="20" y="20" width="240" height="240" rx="16" fill="url(#reBgGrad)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" />
        
        {/* Grid pattern overlay */}
        <rect x="20" y="20" width="240" height="240" rx="16" fill="url(#grid)" />

        {/* Outer board exit highlights */}
        <path d="M 140 20 L 140 5" stroke="rgba(74, 222, 128, 0.4)" strokeWidth="3" strokeDasharray="3 3" />
        <path d="M 260 140 L 275 140" stroke="rgba(125, 211, 252, 0.4)" strokeWidth="3" strokeDasharray="3 3" />

        {/* Red Risk Block (in center-ish, locked symbol) */}
        <g transform="translate(100, 100)">
          <rect width="80" height="40" rx="8" fill="url(#reRedRisk)" stroke="#DC2626" strokeWidth="1.5" />
          {/* Lock Icon */}
          <path d="M 33 22 L 33 17 A 7 7 0 0 1 47 17 L 47 22" fill="none" stroke="#fff" strokeWidth="2" />
          <rect x="30" y="21" width="20" height="12" rx="2" fill="#fff" />
          <circle cx="40" cy="27" r="2" fill="#7F1D1D" />
          {/* Glow */}
          <rect width="80" height="40" rx="8" fill="none" stroke="rgba(239, 68, 68, 0.6)" strokeWidth="3" style={{ opacity: 0.8 }} />
        </g>

        {/* Static Arrow: Left Orange */}
        <g transform="translate(60, 60)">
          <rect width="40" height="80" rx="8" fill="url(#reOrangeArrow)" stroke="#F26522" strokeWidth="1" />
          {/* Chevron shape pointing down */}
          <path d="M 12 35 L 20 45 L 28 35" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 12 47 L 20 57 L 28 47" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
        </g>

        {/* Animating Arrow: Green sliding UP off screen */}
        <g transform="translate(140, 60)">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="140,60; 140,-60; 140,60"
            keyTimes="0; 0.4; 1"
            dur="3s"
            repeatCount="indefinite"
            ease="ease-out"
          />
          <rect width="40" height="80" rx="8" fill="url(#reGreenArrow)" stroke="#28A745" strokeWidth="1" />
          {/* Chevron shape pointing UP */}
          <path d="M 12 45 L 20 35 L 28 45" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 12 57 L 20 47 L 28 57" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
          {/* Motion lines trailing */}
          <line x1="8" y1="90" x2="8" y2="105" stroke="rgba(74,222,128,0.4)" strokeWidth="2" />
          <line x1="20" y1="92" x2="20" y2="112" stroke="rgba(74,222,128,0.4)" strokeWidth="2.5" />
          <line x1="32" y1="90" x2="32" y2="105" stroke="rgba(74,222,128,0.4)" strokeWidth="2" />
        </g>

        {/* Static Arrow: Blue pointing Right */}
        <g transform="translate(180, 140)">
          <rect width="80" height="40" rx="8" fill="url(#reBlueArrow)" stroke="#003DA6" strokeWidth="1" />
          {/* Chevron shape pointing right */}
          <path d="M 35 12 L 45 20 L 35 28" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 47 12 L 57 20 L 47 28" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
        </g>
      </svg>
    </div>
  );
}

/* ─── HomeScreen ───────────────────────────────────────── */
export function HomeScreen({ onStart, theme }) {
  void theme;
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
        padding: '28px 24px 40px',
        background: 'radial-gradient(ellipse at 50% 25%, rgba(14,79,148,0.6), rgba(5,26,58,0.9) 72%), #051a3a',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.28em',
          color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginBottom: 8,
        }}>
          Bajaj Life Insurance
        </div>
        <h1 style={{
          margin: 0, fontSize: 40, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em',
          color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.45)',
        }}>
          Risk <span style={{
            background: 'linear-gradient(180deg, #FF8533 0%, #F26522 60%, #C24A0E 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Exit</span>
        </h1>
        <p style={{
          margin: '10px auto 0', maxWidth: 300, fontSize: 13.5, lineHeight: 1.45,
          color: 'rgba(255,255,255,0.75)', fontWeight: 600,
        }}>
          Clear the path, escape the board, and make the smart sequence of decisions to solve the puzzle.
        </p>
      </div>

      <ArrowHero />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileTap={{ scale: 0.96 }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 15, zIndex: 5 }}
      >
        <button
          type="button"
          className="re-play-btn"
          onClick={onStart}
          style={{
            width: '100%', maxWidth: 320, height: 60,
            fontSize: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            backgroundColor: BRAND.orange,
            color: '#fff',
            fontWeight: 900,
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 18px rgba(242, 101, 34, 0.45)',
            cursor: 'pointer',
          }}
        >
          <PlayIcon size={22} />
          Play Game
        </button>
      </motion.div>

      <p style={{
        marginTop: 16, fontSize: 11, fontWeight: 600,
        color: 'rgba(255,255,255,0.4)', textAlign: 'center',
      }}>
        2-minute cap · 5 levels · order-of-decisions test
      </p>
    </motion.div>
  );
}

/* ─── HowToPlayScreen ──────────────────────────────────── */
function TutorialAnimation() {
  return (
    <div style={{
      position: 'relative', width: 120, height: 120, margin: '0 auto',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Grid lines inside */}
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: 'absolute', inset: 0 }}>
        <line x1="40" y1="0" x2="40" y2="120" stroke="rgba(255,255,255,0.05)" />
        <line x1="80" y1="0" x2="80" y2="120" stroke="rgba(255,255,255,0.05)" />
        <line x1="0" y1="40" x2="120" y2="40" stroke="rgba(255,255,255,0.05)" />
        <line x1="0" y1="80" x2="120" y2="80" stroke="rgba(255,255,255,0.05)" />
      </svg>

      {/* Arrow sliding right */}
      <motion.div
        animate={{
          x: [-30, 10, 80, -30],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.2, 0.7, 1]
        }}
        style={{
          width: 50,
          height: 26,
          borderRadius: 6,
          background: 'linear-gradient(90deg, #7DD3FC 0%, #0B5394 100%)',
          border: '1px solid #7DD3FC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          left: 10,
          top: 47,
          boxShadow: '0 0 10px rgba(125,211,252,0.4)',
        }}
      >
        <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
          <path d="M10 2 L15 7 L10 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 2 L21 7 L16 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>
      </motion.div>

      {/* Hand tapping */}
      <motion.div
        animate={{
          scale: [1, 0.85, 1, 1],
          x: [20, 20, 20, 20],
          y: [20, 12, 20, 20],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.15, 0.3, 1]
        }}
        style={{
          position: 'absolute',
          left: 30,
          top: 55,
          zIndex: 10,
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFC845" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))' }}>
          <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
          <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
          <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
          <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
        </svg>
      </motion.div>
    </div>
  );
}

export function HowToPlayScreen({ onPlay }) {
  const steps = [
    { n: '1', text: 'Tap an arrow block to slide it in the direction it points.' },
    { n: '2', text: 'If its exit path is clear of other blocks, it will slide completely off the board.' },
    { n: '3', text: 'Red Risk Blocks lock their neighbors if tapped early. You must clear normal blocks first and risks LAST.' },
    { n: '4', text: 'Earn combo bonuses for consecutive exits. Clear all 5 levels inside 2 minutes!' },
  ];

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
        padding: 24,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.85) 70%), #051a3a',
        overflowY: 'auto',
      }}
    >
      <div className="re-glass-card" style={{
        width: '100%',
        maxWidth: 360,
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        backdropFilter: 'blur(12px)',
      }}>
        <h2 style={{
          fontSize: 24, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.01em', margin: 0, color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          How to Play
        </h2>

        <TutorialAnimation />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          {steps.map((s) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                backgroundColor: BRAND.orange, color: '#fff',
                fontSize: 11, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>{s.n}</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>

        <motion.div whileTap={{ scale: 0.96 }} style={{ width: '100%', marginTop: 6 }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 50,
              fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              backgroundColor: BRAND.orange,
              color: '#fff',
              fontWeight: 900,
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)',
            }}
          >
            <PlayIcon size={20} />
            Let's Escape
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Confetti (win only) ──────────────────────────────── */
function Confetti() {
  const colors = ['#FFC845', '#FFE38A', '#F26522', '#3B8DD4', '#003DA6', '#28A745'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {Array.from({ length: 26 }).map((_, i) => {
        const left = Math.random() * 100;
        const dur = 2 + Math.random() * 2;
        const delay = Math.random() * 1.5;
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${left}%`,
              background: color,
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

/* ─── ResultsScreen ────────────────────────────────────── */
export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  void onHome;
  const score = stats?.score || 0;
  const levelsCleared = stats?.levelsCleared ?? 0;
  const exits = stats?.exits ?? 0;
  const bumps = stats?.bumps ?? 0;
  
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  const [animatedScore, setAnimatedScore] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setAnimatedScore(end);
      return;
    }
    const duration = 1200;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = end / steps;
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
    const shareMessage = `Hi,\nI scored ${score} points in Risk Exit by choosing the smart order of decisions!\nCan you beat my score? Try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Risk Exit',
          text: shareMessage,
        });
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
  const targetScore = 1500;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = won ? '#22c55e' : score < 500 ? '#ef4444' : '#FFC845';
  const glowColor = won ? 'rgba(34, 197, 94, 0.4)' : score < 500 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 200, 69, 0.4)';

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
        padding: '36px 20px 24px',
        overflowY: 'auto',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.85) 70%), #051a3a',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {won && <Confetti />}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#FFC845', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Decisions Secured!' : 'Session Complete'}
          </span>
        </p>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#0f172a" strokeWidth="10" />
            <circle cx="100" cy="100" r={radius + 6} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.3" />
            <circle
              cx="100" cy="100" r={radius} fill="none"
              stroke={strokeColor} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{
                filter: `drop-shadow(0 0 8px ${glowColor})`,
                transition: 'stroke-dashoffset 1.2s ease-out',
              }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255, 255, 255, 0.6)', marginTop: 4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              POINTS
            </span>
          </div>
        </div>
      </div>

      {/* Session stats chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 12, fontWeight: 800, color: '#fff',
        }}>
          Levels <span style={{ color: '#FFC845' }}>{levelsCleared}/5</span>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 12, fontWeight: 800, color: '#fff',
        }}>
          Exits <span style={{ color: '#22c55e' }}>{exits}</span>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 12, fontWeight: 800, color: '#fff',
        }}>
          Bumps <span style={{ color: '#ef4444' }}>{bumps}</span>
        </div>
      </div>

      {/* Motivational message */}
      <div style={{ textAlign: 'center', marginBottom: 22, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Prioritize risk protection in the right order to keep your plans safe.
        </h2>
      </div>

      {/* Share */}
      <button
        onClick={handleShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: '#1d4ed8',
          color: '#fff',
          fontWeight: 900,
          height: 52,
          borderRadius: '16px',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 4px 20px rgba(29, 78, 216, 0.6)',
          width: '100%',
          maxWidth: 280,
          marginBottom: 22,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background 0.2s',
        }}
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {/* Action Card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: 'rgba(15, 23, 42, 0.75)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: '24px',
        padding: '20px 18px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        marginBottom: 20,
      }}>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 18px 0' }}>
          Consult an expert to balance your protection and investment choices.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: '#F59E0B',
                color: '#000',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                textDecoration: 'none',
                textTransform: 'uppercase',
                border: '1px solid #fbbf24',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              }}
            >
              <PhoneIcon />
              <span>Call Now</span>
            </a>
          )}

          {empPhone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 'bold', fontSize: 9, letterSpacing: '0.15em' }}>OR</span>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </div>
          )}

          <motion.div whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: '#16A34A',
                color: '#fff',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book a Slot</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Retry */}
      <motion.div whileTap={{ scale: 0.95 }}>
        <button
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            padding: '12px 24px',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
            marginBottom: 16,
          }}
          className="play-again-btn"
        >
          <RotateIcon />
          <span>{retryLabel || 'Play again'}</span>
        </button>
      </motion.div>

      {/* Disclaimer */}
      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px' }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
