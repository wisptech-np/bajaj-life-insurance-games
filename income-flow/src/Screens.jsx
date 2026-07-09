// Screens.jsx — Home, HowToPlay and Results screens for Income Flow.
// Matches the life-goals-bubble-shooter design language (glass cards, Poppins,
// spring transitions) with a pipes-and-gold-liquid visual identity.
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

/* ─── Pipe hero illustration (inline SVG, no assets) ───── */
function PipeHero() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: 280,
        height: 300,
        margin: '0 auto',
        animation: 'if-float 4.5s ease-in-out infinite',
        filter: 'drop-shadow(0 22px 28px rgba(0,0,0,0.45))',
      }}
    >
      <svg width="280" height="300" viewBox="0 0 280 300">
        <defs>
          <linearGradient id="ifPipeMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5f7ea8" />
            <stop offset="45%" stopColor="#2c4a75" />
            <stop offset="100%" stopColor="#15294a" />
          </linearGradient>
          <linearGradient id="ifGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE08A" />
            <stop offset="55%" stopColor="#FFC845" />
            <stop offset="100%" stopColor="#E8940A" />
          </linearGradient>
          <linearGradient id="ifVaultBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B8DD4" />
            <stop offset="100%" stopColor="#003DA6" />
          </linearGradient>
          <radialGradient id="ifGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(255,200,69,0.55)" />
            <stop offset="100%" stopColor="rgba(255,200,69,0)" />
          </radialGradient>
        </defs>

        {/* Backdrop panel */}
        <rect x="10" y="14" width="260" height="272" rx="24" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" />

        {/* Salary tap — top left */}
        <g transform="translate(48, 34)">
          <rect x="-22" y="-4" width="44" height="20" rx="8" fill="url(#ifGold)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <rect x="-6" y="14" width="12" height="14" rx="3" fill="url(#ifGold)" />
          <circle cx="0" cy="-12" r="8" fill="none" stroke="url(#ifGold)" strokeWidth="5" />
          <text x="0" y="46" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="10" fill="#FFC845" letterSpacing="1.5">SALARY</text>
        </g>

        {/* Pipe route: tap → down → right → down → right → vault */}
        <g fill="none" strokeLinecap="round">
          <path d="M48 66 L48 128 L140 128 L140 208 L216 208" stroke="#0d1f3c" strokeWidth="30" />
          <path d="M48 66 L48 128 L140 128 L140 208 L216 208" stroke="url(#ifPipeMetal)" strokeWidth="24" />
          {/* golden liquid inside the pipe */}
          <path d="M48 66 L48 128 L140 128 L140 208 L216 208" stroke="url(#ifGold)" strokeWidth="12">
            <animate attributeName="stroke-dasharray" values="0 400; 400 0" dur="3.2s" repeatCount="indefinite" />
          </path>
          {/* shimmer highlight */}
          <path d="M48 66 L48 128 L140 128 L140 208 L216 208" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeDasharray="14 60">
            <animate attributeName="stroke-dashoffset" values="74;0" dur="1.4s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Pipe flanges */}
        <g fill="#22406b" stroke="rgba(255,255,255,0.25)" strokeWidth="1">
          <rect x="32" y="88" width="32" height="10" rx="4" />
          <rect x="92" y="112" width="10" height="32" rx="4" />
          <rect x="124" y="160" width="32" height="10" rx="4" />
          <rect x="172" y="192" width="10" height="32" rx="4" />
        </g>

        {/* Vault — bottom right */}
        <g transform="translate(216, 208)">
          <circle cx="14" cy="0" r="34" fill="url(#ifGlow)" />
          <rect x="-6" y="-26" width="52" height="52" rx="12" fill="url(#ifVaultBlue)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
          <circle cx="20" cy="0" r="13" fill="none" stroke="#FFC845" strokeWidth="3.5" />
          <circle cx="20" cy="0" r="5" fill="#FFC845" />
          <line x1="20" y1="-13" x2="20" y2="-6" stroke="#FFC845" strokeWidth="2.5" />
          <line x1="20" y1="13" x2="20" y2="6" stroke="#FFC845" strokeWidth="2.5" />
          <line x1="7" y1="0" x2="14" y2="0" stroke="#FFC845" strokeWidth="2.5" />
          <line x1="33" y1="0" x2="26" y2="0" stroke="#FFC845" strokeWidth="2.5" />
          <text x="20" y="44" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="10" fill="#7FB3E8" letterSpacing="1.2">RETIREMENT</text>
        </g>

        {/* Floating coins */}
        <g fontFamily="Poppins, sans-serif" fontWeight="900">
          <circle cx="222" cy="70" r="14" fill="url(#ifGold)" stroke="#B36F08" strokeWidth="1.5">
            <animate attributeName="cy" values="70;60;70" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="248" cy="108" r="9" fill="url(#ifGold)" stroke="#B36F08" strokeWidth="1.2" opacity="0.85">
            <animate attributeName="cy" values="108;100;108" dur="3.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="70" cy="238" r="11" fill="url(#ifGold)" stroke="#B36F08" strokeWidth="1.2" opacity="0.9">
            <animate attributeName="cy" values="238;229;238" dur="3.4s" repeatCount="indefinite" />
          </circle>
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
          margin: 0, fontSize: 42, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.03em',
          color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.45)',
        }}>
          Income <span style={{
            background: 'linear-gradient(180deg, #FFE08A 0%, #FFC845 55%, #E8940A 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Flow</span>
        </h1>
        <p style={{
          margin: '10px auto 0', maxWidth: 300, fontSize: 13.5, lineHeight: 1.5,
          color: 'rgba(255,255,255,0.75)', fontWeight: 600,
        }}>
          Route your salary through the pipes into a
          guaranteed lifelong retirement income.
        </p>
      </div>

      <PipeHero />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileTap={{ scale: 0.96 }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 22, zIndex: 5 }}
      >
        <button
          type="button"
          className="if-play-btn"
          onClick={onStart}
          style={{
            width: '100%', maxWidth: 320, height: 64,
            fontSize: 21, letterSpacing: '0.06em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <PlayIcon size={22} />
          Play
        </button>
      </motion.div>

      <p style={{
        marginTop: 16, fontSize: 11, fontWeight: 600,
        color: 'rgba(255,255,255,0.4)', textAlign: 'center',
      }}>
        2-minute challenge · 4 boards · beat the leaks
      </p>
    </motion.div>
  );
}

/* ─── HowToPlayScreen ──────────────────────────────────── */
function DemoTile() {
  // An elbow pipe tile that keeps rotating 90° with a tapping hand — pure CSS/SVG.
  return (
    <div style={{
      position: 'relative', width: 118, height: 118, margin: '0 auto',
      borderRadius: 20,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.15)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg
        width="94" height="94" viewBox="0 0 94 94"
        style={{ animation: 'if-tile-demo-rotate 2.6s ease-in-out infinite' }}
      >
        <defs>
          <linearGradient id="ifDemoMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5f7ea8" />
            <stop offset="50%" stopColor="#2c4a75" />
            <stop offset="100%" stopColor="#15294a" />
          </linearGradient>
          <linearGradient id="ifDemoGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE08A" />
            <stop offset="100%" stopColor="#E8940A" />
          </linearGradient>
        </defs>
        <path d="M47 0 L47 47 L94 47" fill="none" stroke="#0d1f3c" strokeWidth="34" strokeLinejoin="round" />
        <path d="M47 0 L47 47 L94 47" fill="none" stroke="url(#ifDemoMetal)" strokeWidth="27" strokeLinejoin="round" />
        <path d="M47 0 L47 47 L94 47" fill="none" stroke="url(#ifDemoGold)" strokeWidth="13" strokeLinejoin="round" strokeDasharray="50 200">
          <animate attributeName="stroke-dashoffset" values="50;-94" dur="2.6s" repeatCount="indefinite" />
        </path>
      </svg>
      {/* tap hand */}
      <div style={{
        position: 'absolute', right: -14, bottom: -14,
        animation: 'if-hand-tap 2.6s ease-in-out infinite',
      }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#FFC845" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))' }}>
          <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
          <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
          <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
          <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
        </svg>
      </div>
    </div>
  );
}

export function HowToPlayScreen({ onPlay }) {
  const steps = [
    { n: '1', text: 'Tap any pipe tile to rotate it 90° and build a route.' },
    { n: '2', text: 'Connect the golden SALARY tap (top-left) to the RETIREMENT vault (bottom-right).' },
    { n: '3', text: 'When planning time ends, the income starts flowing tile by tile. Release it early for bonus points!' },
    { n: '4', text: 'A dead end springs a LEAK and costs a life. Green shield valves absorb one leak. Clear 4 boards in 2 minutes!' },
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
      <div className="if-glass-card" style={{
        width: '100%', maxWidth: 360, padding: '26px 22px',
        display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center',
      }}>
        <h2 style={{
          fontSize: 25, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.01em', margin: 0, color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          How to Play
        </h2>

        <DemoTile />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {steps.map((s) => (
            <div key={s.n} className="if-step-row">
              <div className="if-step-badge">{s.n}</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>

        <motion.div whileTap={{ scale: 0.96 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            className="if-play-btn"
            style={{
              width: '100%', height: 56, marginTop: 4,
              fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <PlayIcon size={20} />
            Start the flow
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
  const boardsCleared = stats?.boardsCleared ?? 0;
  const vaultFill = stats?.vaultFill ?? 0;
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
    const shareMessage = `Hi,\nI piped ${score} points of lifelong income in Income Flow!\nIt really makes you think about turning salary into retirement income — try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Income Flow',
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
  const targetScore = 2000;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = won ? '#22c55e' : score < 400 ? '#ef4444' : '#FFC845';
  const glowColor = won ? 'rgba(34, 197, 94, 0.4)' : score < 400 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 200, 69, 0.4)';

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
            {won ? 'Income secured!' : 'The flow stopped short'}
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
          Boards <span style={{ color: '#FFC845' }}>{boardsCleared}/4</span>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 12, fontWeight: 800, color: '#fff',
        }}>
          Vault <span style={{ color: '#28A745' }}>{vaultFill}%</span>
        </div>
      </div>

      {/* Motivational message */}
      <div style={{ textAlign: 'center', marginBottom: 22, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          A guaranteed income plan keeps your salary flowing — for life, leak-free
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
          A simple conversation can turn today's income into lifelong income
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
