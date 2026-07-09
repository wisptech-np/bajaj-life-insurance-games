// Screens.jsx — Home, HowToPlay + Results screens for Smart Match 3D.
// Matches the life-goals-bubble-shooter design language (glass, Poppins, brand palette).
import React from 'react';
import { motion } from 'framer-motion';
import { GOAL_BY_ID, tokenDataUri } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

/* ─── Inline icons (UI chrome) ───────────────────────────── */
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

function HomeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

/* ─── Home screen hero — floating premium token sprites ──── */
const HERO_LAYOUT = [
  { id: 'shield', size: 92, left: 94, top: 66, rot: 0, dur: 3.6, delay: 0 },
  { id: 'home', size: 66, left: 12, top: 20, rot: -10, dur: 4.2, delay: 0.4 },
  { id: 'savings', size: 62, left: 202, top: 26, rot: 9, dur: 3.8, delay: 0.9 },
  { id: 'education', size: 56, left: 0, top: 128, rot: 8, dur: 4.4, delay: 1.3 },
  { id: 'health', size: 58, left: 222, top: 132, rot: -8, dur: 4.0, delay: 0.6 },
  { id: 'car', size: 50, left: 52, top: 182, rot: -6, dur: 4.6, delay: 1.7 },
  { id: 'family', size: 52, left: 172, top: 186, rot: 7, dur: 4.1, delay: 1.1 },
];

export function HomeScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="sm3-home"
    >
      <div className="sm3-home-glow" />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
        <div className="sm3-brand-badge">Bajaj Life Insurance</div>
        <h1 className="sm3-title">
          Smart Match <span className="accent">3D</span>
        </h1>
        <p className="sm3-tagline">
          Match your life goals three at a time — protection, savings, home, education and more.
        </p>
      </div>

      <div className="sm3-hero" aria-hidden="true">
        {HERO_LAYOUT.map((h) => (
          <img
            key={h.id}
            src={tokenDataUri(GOAL_BY_ID[h.id])}
            alt=""
            draggable={false}
            className="sm3-hero-token"
            style={{
              width: h.size,
              height: h.size,
              left: h.left,
              top: h.top,
              '--rot': `${h.rot}deg`,
              '--dur': `${h.dur}s`,
              '--delay': `${h.delay}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileTap={{ scale: 0.97 }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 2 }}
      >
        <button type="button" className="sm3-play-btn" onClick={onStart}>
          Play
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── How to play ────────────────────────────────────────── */
const DEMO_LEFTS = [46, 118, 190];

export function HowToPlayScreen({ onPlay }) {
  const demoGoal = GOAL_BY_ID.home;
  const demoUri = tokenDataUri(demoGoal);
  const sparks = [
    { dx: '-34px', dy: '-30px' },
    { dx: '0px', dy: '-42px' },
    { dx: '34px', dy: '-30px' },
    { dx: '-24px', dy: '8px' },
    { dx: '24px', dy: '8px' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="sm3-howto"
    >
      <div className="sm3-howto-card">
        <h2 className="sm3-howto-title">How to Play</h2>

        <div className="sm3-demo" aria-hidden="true">
          {DEMO_LEFTS.map((left, i) => (
            <img
              key={i}
              src={demoUri}
              alt=""
              draggable={false}
              className="sm3-demo-token"
              style={{ left, '--d': `${i * 0.28}s` }}
            />
          ))}
          <div className="sm3-demo-tray" />
          {sparks.map((s, i) => (
            <span
              key={i}
              className="sm3-demo-burst"
              style={{ '--d': '0.56s', '--dx': s.dx, '--dy': s.dy }}
            />
          ))}
        </div>

        <div className="sm3-step">
          <span className="sm3-step-num">1</span>
          <span className="sm3-step-text">
            <b>Tap</b> life-goal tokens on the pile to move them into the tray. Dimmed tokens are
            buried — uncover them first.
          </span>
        </div>
        <div className="sm3-step">
          <span className="sm3-step-num">2</span>
          <span className="sm3-step-text">
            <b>Match 3 identical goals</b> to secure them. Chain matches quickly for combo bonuses.
          </span>
        </div>
        <div className="sm3-step">
          <span className="sm3-step-num">3</span>
          <span className="sm3-step-text">
            Don&apos;t overfill the <b>7-slot tray</b> — clear all 20 goals within <b>2:00</b>.
            Use <b>Undo</b>, <b>Shuffle</b> and <b>Magnet</b> boosters wisely.
          </span>
        </div>

        <motion.div whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button type="button" className="sm3-play-btn" onClick={onPlay} style={{ height: 56, maxWidth: '100%' }}>
            Start Matching
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Confetti (kept lightweight) ─────────────────────────── */
function Confetti() {
  const colors = ['#FFC845', '#FFE38A', '#FF8533', '#3B8DD4', '#003DA6', '#28A745', '#EC4899'];
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

/* ─── ResultsScreen — full-screen game-over view ─────────── */
export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const matches = stats?.matches || 0;
  const totalTriplets = stats?.totalTriplets || 20;
  const bestCombo = stats?.bestCombo || 0;
  const timeTaken = stats?.timeTaken ?? 0;
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
    const shareMessage = `Hi,\nI scored ${score} points matching life goals in Smart Match 3D.\nIt really makes you think about how many goals a family has to protect — try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Smart Match 3D',
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
  const targetScore = 3000;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = won ? '#22c55e' : score < 600 ? '#ef4444' : '#f59e0b';
  const glowColor = won
    ? 'rgba(34, 197, 94, 0.4)'
    : score < 600
      ? 'rgba(239, 68, 68, 0.4)'
      : 'rgba(245, 158, 11, 0.4)';

  const mm = Math.floor(timeTaken / 60);
  const ss = String(timeTaken % 60).padStart(2, '0');

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
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.85) 70%), #051a3a',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {won && <Confetti />}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Friend'}!</span>
          <br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'All Goals Matched!' : matches >= totalTriplets ? 'So Close!' : 'Goals Left Unmatched'}
          </span>
        </p>
      </div>

      {/* Circular score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 18, zIndex: 2 }}>
        <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#0f172a" strokeWidth="10" />
            <circle cx="100" cy="100" r={radius + 6} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.3" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="12"
              strokeLinecap="round"
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

      {/* Round stats */}
      <div className="sm3-stats-row" style={{ zIndex: 2 }}>
        <div className="sm3-stat">
          <div className="sm3-stat-value">{matches}/{totalTriplets}</div>
          <div className="sm3-stat-label">Goals matched</div>
        </div>
        <div className="sm3-stat">
          <div className="sm3-stat-value">x{Math.max(bestCombo, 1)}</div>
          <div className="sm3-stat-label">Best combo</div>
        </div>
        <div className="sm3-stat">
          <div className="sm3-stat-value">{mm}:{ss}</div>
          <div className="sm3-stat-label">Time played</div>
        </div>
      </div>

      {/* Motivational message */}
      <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 16px', zIndex: 2 }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Matching goals in a game takes 2 minutes. Securing them for real takes one conversation.
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
          marginBottom: 20,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background 0.2s',
          zIndex: 2,
        }}
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {/* Action card */}
      <div
        style={{
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
          marginBottom: 18,
          zIndex: 2,
        }}
      >
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 18px 0' }}>
          A simple conversation can protect every goal you just matched
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

      {/* Retry / home */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, zIndex: 2 }}>
        <motion.div whileTap={{ scale: 0.95 }}>
          <button
            onClick={onRetry}
            className="play-again-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.55)',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 'bold',
              letterSpacing: '0.05em',
              padding: '12px 16px',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
              marginBottom: 12,
            }}
          >
            <RotateIcon />
            <span>{retryLabel || 'Play again'}</span>
          </button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <button
            onClick={onHome}
            className="play-again-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.55)',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 'bold',
              letterSpacing: '0.05em',
              padding: '12px 16px',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
              marginBottom: 12,
            }}
          >
            <HomeIcon />
            <span>Home</span>
          </button>
        </motion.div>
      </div>

      {/* Disclaimer */}
      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px', zIndex: 2 }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
