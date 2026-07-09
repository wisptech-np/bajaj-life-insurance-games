// Screens.jsx — Home + Results screens for the bubble shooter.
// Restyled to match the stackibility-stack design language.
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import introBg from './bb_bg.webp';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function HelpIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
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

function HeartBreakIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 27s-10-6-10-14a6 6 0 0 1 10-4.5L14 12l4 3-3 4 1 8z" fill="#fff" />
      <path d="M16 27s10-6 10-14a6 6 0 0 0-10-4.5L18 12l-4 3 3 4-1 8z" fill="#fff" opacity="0.85" />
    </svg>
  );
}

function ShieldIcon({ size = 26, stroke = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" fill="rgba(255,255,255,0.18)" />
      <path d="m9 12 2 2 4-4" />
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

/* ─── Decorative bubble illustration for the home screen ────────── */
const BUBBLE_PALETTE = [
  { c: '#3B82F6', d: '#1E40AF', g: '#93C5FD' }, // blue
  { c: '#EF4444', d: '#991B1B', g: '#FCA5A5' }, // red
  { c: '#FACC15', d: '#A16207', g: '#FEF08A' }, // yellow
  { c: '#10B981', d: '#065F46', g: '#6EE7B7' }, // green
  { c: '#EC4899', d: '#9D174D', g: '#F9A8D4' }, // pink
  { c: '#8B5CF6', d: '#5B21B6', g: '#C4B5FD' }, // purple
];

function bubbleBg(p) {
  return `radial-gradient(circle at 32% 28%, ${p.g} 0%, ${p.c} 45%, ${p.d} 100%)`;
}

function HexBubbleField() {
  // Mini bubble-shooter preview: cluster up top, cannon zone at bottom.
  const R = 14;
  const D = R * 2;
  const RH = D * 0.866;

  // 3 hex rows, offset every other row, with a couple of gaps for variety.
  // null = gap. Palette indices otherwise.
  const pattern = [
    [0, 1, 2, 3, 4, 5],
    [2, 3, null, 4, 0],
    [5, 0, 1, null, 2, 3],
  ];

  const cluster = [];
  // Centre the cluster horizontally inside the 240-wide container.
  // Row 0 has 6 bubbles → row width ≈ 6*D = 168 → leftPad ≈ (240-168)/2 ≈ 36.
  const leftPad = 36;
  const topPad = 24;
  for (let r = 0; r < pattern.length; r++) {
    const row = pattern[r];
    const offset = r % 2 === 1 ? R : 0;
    for (let c = 0; c < row.length; c++) {
      const palIdx = row[c];
      if (palIdx === null) continue;
      const x = leftPad + R + c * D + offset;
      const y = topPad + r * RH;
      cluster.push({ x, y, p: BUBBLE_PALETTE[palIdx] });
    }
  }

  const containerW = 240;
  const cannonX = containerW / 2; // 120
  const cannonY = 200;
  const ammo = BUBBLE_PALETTE[1]; // red, contrasts with palette mix above

  // Aim trail: 5 dots from just above the cannon up toward the cluster.
  const trail = [
    { y: 150, op: 0.85 },
    { y: 138, op: 0.70 },
    { y: 126, op: 0.55 },
    { y: 114, op: 0.40 },
    { y: 102, op: 0.25 },
  ];

  // Two queue balls left of (and below) the cannon area.
  const queue = [
    { x: 70, y: 240, p: BUBBLE_PALETTE[2] },
    { x: 98, y: 240, p: BUBBLE_PALETTE[3] },
  ];

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: containerW,
        height: 280,
        margin: '0 auto',
        borderRadius: 22,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(14,79,148,0.55), rgba(5,26,58,0.85) 70%), #051a3a',
        animation: 'ls-float 4s ease-in-out infinite',
        filter: 'drop-shadow(0 22px 26px rgba(0, 0, 0, 0.4))',
      }}
    >
      {/* Faint starfield to read as the in-game playfield */}
      <div
        className="starfield"
        style={{ position: 'absolute', inset: 0, opacity: 0.55 }}
      />

      {/* Hex cluster — top third */}
      {cluster.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: b.x, top: b.y,
          width: D, height: D, borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: bubbleBg(b.p),
          boxShadow: 'inset 0 -5px 7px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.4)',
        }} />
      ))}

      {/* Aim trail — small white dots between cluster and cannon */}
      {trail.map((t, i) => (
        <div key={`t${i}`} style={{
          position: 'absolute',
          left: cannonX, top: t.y,
          width: 4, height: 4,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: `rgba(255,255,255,${t.op})`,
          boxShadow: '0 0 6px rgba(255,255,255,0.4)',
        }} />
      ))}

      {/* Cannon glow halo */}
      <div className="shooter-glow" style={{
        position: 'absolute', left: cannonX, top: cannonY,
        transform: 'translate(-50%, -50%)',
        width: 60, height: 60, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,133,51,0.55) 0%, rgba(242,105,34,0.30) 45%, transparent 75%)',
      }} />

      {/* Loaded ammo bubble — centred on the halo */}
      <div style={{
        position: 'absolute', left: cannonX, top: cannonY,
        transform: 'translate(-50%, -50%)',
        width: D + 4, height: D + 4, borderRadius: '50%',
        background: bubbleBg(ammo),
        boxShadow: 'inset 0 -6px 8px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.4), 0 0 14px rgba(239,68,68,0.55)',
      }} />

      {/* "Up Next" label above queue */}
      <div style={{
        position: 'absolute',
        left: 84, top: 224,
        transform: 'translate(-50%, -50%)',
        fontFamily: "'Poppins', system-ui, sans-serif",
        fontSize: 7,
        fontWeight: 700,
        letterSpacing: '0.18em',
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}>
        Up Next
      </div>

      {/* Queue balls */}
      {queue.map((b, i) => (
        <div key={`q${i}`} style={{
          position: 'absolute', left: b.x, top: b.y,
          width: 24, height: 24, borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: bubbleBg(b.p),
          boxShadow: 'inset 0 -4px 6px rgba(0,0,0,0.3), inset 0 1.5px 2px rgba(255,255,255,0.4)',
          opacity: 0.9,
        }} />
      ))}
    </div>
  );
}

export function HomeScreen({ onStart, theme }) {
  // theme is accepted for API compat but ignored
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
        justifyContent: 'flex-end',
        padding: '0 24px 64px',
        backgroundImage: `url(${introBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    >
      {/* CTA play button at bottom */}
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
          className="bubble-play-btn"
          onClick={onStart}
          style={{ width: '100%', maxWidth: 320, height: 68 }}
        >
          {/* Left deco bubble */}
          <span className="btn-bubble-deco bubble-blue" style={{ left: 16, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22 }} />
          <span className="btn-bubble-deco bubble-pink" style={{ left: 34, top: '30%', width: 12, height: 12 }} />
          
          <span style={{ position: 'relative', zIndex: 2, textShadow: '0 2px 4px rgba(0,0,0,0.5)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 22 }}>
            Play
          </span>

          {/* Right deco bubble */}
          <span className="btn-bubble-deco bubble-yellow" style={{ right: 16, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22 }} />
          <span className="btn-bubble-deco bubble-green" style={{ right: 34, top: '70%', width: 14, height: 14 }} />
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Confetti (kept lightweight) ─────────────────────── */
function Confetti() {
  const colors = ['#FFC845', '#FFE38A', '#FF8533', '#3B8DD4', '#005BAC', '#10B981', '#EC4899'];
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

/* ─── ResultsScreen — full-screen game-over view ──────── */
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

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
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
    const shareMessage = `Hi,\nI secured ${score} points in this Life Goals challenge.\nIt really makes you think about how much protection those goals need — try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Life Goals Bubble Shooter',
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
  const targetScore = 1000;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = score < 300 ? "#ef4444" : "#22c55e";
  const glowColor = score < 300 ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.4)";

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
        padding: '40px 20px 24px',
        overflowY: 'auto',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.85) 70%), #051a3a',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {won && <Confetti />}

      {/* Header / Top Bar */}
      <div style={{ textAlign: 'center', marginBottom: 20, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>Your Score</span>
        </p>
      </div>

      {/* Circular Progress Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            {/* Background ring */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#0f172a"
              strokeWidth="10"
            />
            {/* Outline border decor */}
            <circle
              cx="100"
              cy="100"
              r={radius + 6}
              fill="none"
              stroke="#1e293b"
              strokeWidth="1"
              opacity="0.3"
            />
            {/* Progress circle */}
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
          {/* Inner Text */}
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

      {/* Motivational Message */}
      <div style={{ textAlign: 'center', marginBottom: 24, padding: '0 16px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)', px: 4 }}>
          Know how much Life Cover your Family needs to protect your life goals
        </h2>
      </div>

      {/* Primary Action */}
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
          marginBottom: 24,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background 0.2s',
        }}
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {/* Action Card Section */}
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
          A simple conversation can protect everything you're building
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

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
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

      {/* Play again action */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
          <span>Play again</span>
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
        padding: '24px',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.85) 70%), #051a3a',
        overflowY: 'auto',
      }}
    >
      <div className="tutorial-card">
        {/* Title */}
        <h2 style={{ fontSize: 26, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          How to Play
        </h2>

        {/* Gesture Animation Screen */}
        <div className="tutorial-animation-container">
          {/* Target Bubbles (direct children of container to ensure proper absolute alignment) */}
          {/* Row 0 (top row: 19px) - Surrounding bubbles of other colors */}
          <div className="bubble red" style={{ left: 'calc(50% - 54px)', top: '19px', background: 'radial-gradient(circle at 32% 28%, #FF6666 0%, #E60012 45%, #800000 100%)', position: 'absolute', width: 36, height: 36, zIndex: 6 }} />
          <div className="bubble yellow" style={{ left: 'calc(50% - 18px)', top: '19px', background: 'radial-gradient(circle at 32% 28%, #FFE066 0%, #FF9900 45%, #994C00 100%)', position: 'absolute', width: 36, height: 36, zIndex: 6 }} />
          <div className="bubble green" style={{ left: 'calc(50% + 18px)', top: '19px', background: 'radial-gradient(circle at 32% 28%, #66FF99 0%, #00CC33 45%, #005916 100%)', position: 'absolute', width: 36, height: 36, zIndex: 6 }} />
          <div className="bubble purple" style={{ left: 'calc(50% + 54px)', top: '19px', background: 'radial-gradient(circle at 32% 28%, #CC99FF 0%, #8800FF 45%, #3C0080 100%)', position: 'absolute', width: 36, height: 36, zIndex: 6 }} />

          {/* Row 1 (middle row: 50px) */}
          <div className="bubble pink" style={{ left: 'calc(50% - 72px)', top: '50px', background: 'radial-gradient(circle at 32% 28%, #FF99CC 0%, #FF0088 45%, #800040 100%)', position: 'absolute', width: 36, height: 36, zIndex: 6 }} />
          <div className="tut-target-bubble bubble blue" style={{ left: 'calc(50% - 36px)', top: '50px', background: 'radial-gradient(circle at 32% 28%, #66AAFF 0%, #0044FF 45%, #001180 100%)', position: 'absolute' }} />
          <div className="tut-target-bubble bubble blue" style={{ left: '50%', top: '50px', background: 'radial-gradient(circle at 32% 28%, #66AAFF 0%, #0044FF 45%, #001180 100%)', position: 'absolute' }} />
          <div className="tut-target-bubble bubble blue" style={{ left: 'calc(50% + 36px)', top: '50px', background: 'radial-gradient(circle at 32% 28%, #66AAFF 0%, #0044FF 45%, #001180 100%)', position: 'absolute' }} />
          <div className="bubble yellow" style={{ left: 'calc(50% + 72px)', top: '50px', background: 'radial-gradient(circle at 32% 28%, #FFE066 0%, #FF9900 45%, #994C00 100%)', position: 'absolute', width: 36, height: 36, zIndex: 6 }} />

          {/* Row 2 (bottom row: 81px) - Left and right outer bubbles only, leaving a center gap for the shooter path */}
          <div className="bubble green" style={{ left: 'calc(50% - 54px)', top: '81px', background: 'radial-gradient(circle at 32% 28%, #66FF99 0%, #00CC33 45%, #005916 100%)', position: 'absolute', width: 36, height: 36, zIndex: 6 }} />
          <div className="bubble purple" style={{ left: 'calc(50% + 54px)', top: '81px', background: 'radial-gradient(circle at 32% 28%, #CC99FF 0%, #8800FF 45%, #3C0080 100%)', position: 'absolute', width: 36, height: 36, zIndex: 6 }} />

          {/* Pop particles */}
          <div className="tut-pop-burst">
            <div className="tut-particle" />
            <div className="tut-particle" />
            <div className="tut-particle" />
            <div className="tut-particle" />
            <div className="tut-particle" />
          </div>

          {/* Aim Guide Container (rotates in sync with Cannon) */}
          <div className="tut-aim-line-container">
            <div className="aim-dot" style={{ bottom: 20, background: '#0044FF', boxShadow: '0 0 8px #66AAFF', opacity: 0.9 }} />
            <div className="aim-dot" style={{ bottom: 40, background: '#0044FF', boxShadow: '0 0 8px #66AAFF', opacity: 0.8 }} />
            <div className="aim-dot" style={{ bottom: 60, background: '#0044FF', boxShadow: '0 0 8px #66AAFF', opacity: 0.7 }} />
            <div className="aim-dot" style={{ bottom: 80, background: '#0044FF', boxShadow: '0 0 8px #66AAFF', opacity: 0.6 }} />
            <div className="aim-dot" style={{ bottom: 100, background: '#0044FF', boxShadow: '0 0 8px #66AAFF', opacity: 0.5 }} />
            <div className="aim-dot" style={{ bottom: 120, background: '#0044FF', boxShadow: '0 0 8px #66AAFF', opacity: 0.4 }} />
            <div className="aim-dot" style={{ bottom: 140, background: '#0044FF', boxShadow: '0 0 8px #66AAFF', opacity: 0.3 }} />
            <div className="aim-dot" style={{ bottom: 160, background: '#0044FF', boxShadow: '0 0 8px #66AAFF', opacity: 0.2 }} />
          </div>

          {/* Projectile bubble */}
          <div className="tut-projectile-bubble bubble blue" style={{ background: 'radial-gradient(circle at 32% 28%, #66AAFF 0%, #0044FF 45%, #001180 100%)' }} />

          {/* Shooter Cannon at bottom */}
          <div className="tut-launcher">
            <div className="tut-launcher-ring" />
            
            {/* Cannon Turret SVG (rotates in sync with aim line) */}
            <svg className="tut-cannon-turret" viewBox="0 0 80 80" style={{ width: 80, height: 80, position: 'absolute', left: 0, top: 0, zIndex: 1, overflow: 'visible' }}>
              <defs>
                <linearGradient id="tutMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0a2a5a" />
                  <stop offset="30%" stopColor="#1e4f94" />
                  <stop offset="50%" stopColor="#3b8dd4" />
                  <stop offset="70%" stopColor="#1e4f94" />
                  <stop offset="100%" stopColor="#0a2a5a" />
                </linearGradient>
                <filter id="tutGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <g transform="translate(40, 40) scale(0.65)">
                {/* Barrel */}
                <path 
                  d="M -10 -45 L 10 -45 L 14 -20 L -14 -20 Z" 
                  fill="url(#tutMetalGrad)" 
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1.5"
                />
                {/* Gold Tip */}
                <rect 
                  x="-12" 
                  y="-52" 
                  width="24" 
                  height="7" 
                  rx="1.5" 
                  fill="#FFD700" 
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="0.5"
                />
                {/* Cyan Tip Glow */}
                <ellipse
                  cx="0"
                  cy="-52"
                  rx="8"
                  ry="2"
                  fill="#00ffff"
                  filter="url(#tutGlowFilter)"
                />
                {/* Dome Body */}
                <circle
                  cx="0"
                  cy="0"
                  r="32"
                  fill="rgba(10, 42, 90, 0.35)"
                  stroke="rgba(0, 229, 255, 0.4)"
                  strokeWidth="1.5"
                />
                {/* Accent Gold Ring around Core */}
                <circle
                  cx="0"
                  cy="0"
                  r="20"
                  fill="none"
                  stroke="#FFA500"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />
                {/* Glass dome reflection overlay */}
                <path
                  d="M -22 -15 A 26 26 0 0 1 22 -15"
                  fill="none"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            </svg>

            {/* Cannon Bubble loaded inside the turret */}
            <div className="tut-cannon-bubble bubble blue" style={{ left: '50%', top: '50%', background: 'radial-gradient(circle at 32% 28%, #66AAFF 0%, #0044FF 45%, #001180 100%)' }} />
          </div>

          {/* Gesture Finger overlay */}
          <div className="tut-gesture-hand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))' }}>
              <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
              <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
            </svg>
          </div>
        </div>

        {/* CTA Play Button */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            className="bubble-play-btn"
            style={{ width: '100%', height: 56, marginTop: 8 }}
          >
            <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Play
            </span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

