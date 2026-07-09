// Screens.jsx — Home, How-to-play and Results screens for Shield Drop.
// Matches the gold-standard bubble-shooter structure and design language.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { sfxTap } from './audio.js';

/* ─── Inline vector icons (no emoji, no image files) ───────────── */

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

/* Shield medallion — reusable SVG sprite */
function MedallionSVG({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="sdMedGrad" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="45%" stopColor="#FFC845" />
          <stop offset="100%" stopColor="#E8960C" />
        </radialGradient>
        <linearGradient id="sdShieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F6FD1" />
          <stop offset="100%" stopColor="#003DA6" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#sdMedGrad)" />
      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="23" fill="none" stroke="rgba(140,80,0,0.35)" strokeWidth="1.4" />
      <path d="M32 15 20 20v11c0 8 5 13.5 12 17 7-3.5 12-9 12-17V20L32 15z" fill="url(#sdShieldGrad)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m26.5 32 4 4 7.5-8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="25" cy="22" rx="8" ry="5" fill="rgba(255,255,255,0.28)" transform="rotate(-24 25 22)" />
    </svg>
  );
}

/* Family basket — reusable SVG sprite */
function BasketSVG({ width = 92 }) {
  const h = Math.round(width * 0.72);
  return (
    <svg width={width} height={h} viewBox="0 0 92 66" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sdBasketGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B9722F" />
          <stop offset="100%" stopColor="#7C4A1B" />
        </linearGradient>
      </defs>
      {/* family silhouettes */}
      <circle cx="34" cy="14" r="7" fill="#2F6FD1" />
      <path d="M25 34c0-6 4-10 9-10s9 4 9 10v4H25v-4z" fill="#2F6FD1" />
      <circle cx="57" cy="17" r="5.5" fill="#FF8A3D" />
      <path d="M50 34c0-5 3.2-8 7-8s7 3 7 8v4H50v-4z" fill="#FF8A3D" />
      {/* basket body */}
      <path d="M12 36h68l-7 26H19l-7-26z" fill="url(#sdBasketGrad)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.4" />
      <path d="M15 44h62M17.5 52h57" stroke="rgba(0,0,0,0.28)" strokeWidth="2.4" />
      <path d="M12 36h68" stroke="#FFC845" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function StarSVG({ size = 18, color = '#FFC845' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
    </svg>
  );
}

/* Virus saw icon (vector) */
function SawSVG({ size = 34 }) {
  const spikes = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x1 = 17 + Math.cos(a) * 11;
    const y1 = 17 + Math.sin(a) * 11;
    const x2 = 17 + Math.cos(a) * 15.5;
    const y2 = 17 + Math.sin(a) * 15.5;
    spikes.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3DDC5B" strokeWidth="2.6" strokeLinecap="round" />);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      {spikes}
      <circle cx="17" cy="17" r="11" fill="#1E8F38" stroke="#3DDC5B" strokeWidth="2" />
      <circle cx="13.5" cy="14" r="2.2" fill="#B8FFC9" />
      <circle cx="21" cy="19.5" r="1.7" fill="#B8FFC9" />
    </svg>
  );
}

function ScissorSwipeIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFC845" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="6" cy="18" r="2.6" />
      <path d="M8.2 7.8 20 19M8.2 16.2 20 5" />
    </svg>
  );
}

function TapIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#7FD0FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11V5a2 2 0 0 1 4 0v6" />
      <path d="M13 10.5V8a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3L3 13.6a1.9 1.9 0 0 1 3.2-2L7.5 13" />
    </svg>
  );
}

/* ─── Home screen ──────────────────────────────────────────────── */
export function HomeScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="sd-screen"
      style={{ justifyContent: 'center', padding: '32px 24px 40px', gap: 22 }}
    >
      {/* Animated hero scene */}
      <div className="sd-hero" aria-hidden="true">
        <div className="starfield" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />
        {/* beacon over basket */}
        <div className="sd-hero-beacon" />
        {/* basket at bottom */}
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
          <BasketSVG width={92} />
        </div>
        {/* swinging rope + medallion */}
        <div className="sd-hero-swing">
          <svg width="8" height="96" viewBox="0 0 8 96" style={{ display: 'block', margin: '0 auto' }} aria-hidden="true">
            <path d="M4 0 C 5.5 24, 2.5 60, 4 96" stroke="#C9A15E" strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <path d="M4 0 C 5.5 24, 2.5 60, 4 96" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
          <div className="sd-hero-medallion" style={{ marginTop: -6, display: 'flex', justifyContent: 'center' }}>
            <MedallionSVG size={62} />
          </div>
        </div>
        {/* twinkling star coins */}
        <div className="sd-hero-star" style={{ left: 30, top: 130, animationDelay: '0s' }}><StarSVG size={16} /></div>
        <div className="sd-hero-star" style={{ right: 34, top: 110, animationDelay: '0.6s' }}><StarSVG size={13} /></div>
        <div className="sd-hero-star" style={{ left: 56, top: 176, animationDelay: '1.1s' }}><StarSVG size={11} /></div>
      </div>

      <div>
        <h1 className="sd-title">
          Shield <span>Drop</span>
        </h1>
        <p className="sd-tagline">Deliver protection on time</p>
      </div>

      <p style={{
        maxWidth: 300, textAlign: 'center', fontSize: 13, fontWeight: 600,
        lineHeight: 1.55, color: 'rgba(255,255,255,0.75)', margin: 0,
      }}>
        A family is waiting below. Cut the ropes, dodge the risks and land the
        shield of protection right where it matters — before time runs out.
      </p>

      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        style={{ width: '100%', maxWidth: 320 }}
      >
        <button type="button" className="ls-btn ls-btn-primary" onClick={onStart}
          style={{ width: '100%', height: 62, fontSize: 20 }}>
          Play
        </button>
      </motion.div>

      <div className="bajaj-mark">
        <span className="bajaj-mark-icon" />
        Bajaj Life Insurance
      </div>
    </motion.div>
  );
}

/* ─── How-to-play screen ───────────────────────────────────────── */
export function HowToPlayScreen({ onPlay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="sd-screen"
      style={{ justifyContent: 'center', padding: '28px 22px', gap: 18 }}
    >
      <h2 style={{
        fontSize: 26, fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '-0.02em', margin: 0, color: '#fff',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
      }}>
        How to Play
      </h2>

      <div className="sd-howto-card">
        <div className="sd-step">
          <div className="sd-step-icon"><ScissorSwipeIcon /></div>
          <div className="sd-step-text">
            <b>Swipe across a rope</b> to cut it — the shield drops and swings.
            Time your cuts to guide it.
          </div>
        </div>
        <div className="sd-step">
          <div className="sd-step-icon"><StarSVG size={26} /></div>
          <div className="sd-step-text">
            <b>Collect star coins</b> along the way — each one is worth bonus
            points.
          </div>
        </div>
        <div className="sd-step">
          <div className="sd-step-icon"><SawSVG size={32} /></div>
          <div className="sd-step-text">
            <b>Avoid the green virus saws.</b> One touch destroys the shield and
            costs you time.
          </div>
        </div>
        <div className="sd-step">
          <div className="sd-step-icon"><TapIcon /></div>
          <div className="sd-step-text">
            <b>Tap air-puffers</b> to blow the shield sideways, and <b>tap
            bubbles</b> to pop them when the shield floats.
          </div>
        </div>
        <div className="sd-step">
          <div className="sd-step-icon"><BasketSVG width={40} /></div>
          <div className="sd-step-text">
            <b>Land the shield in the family basket.</b> Deliver all 6 shields
            within 2 minutes to win.
          </div>
        </div>
      </div>

      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ width: '100%', maxWidth: 320 }}>
        <button type="button" className="ls-btn ls-btn-primary" onClick={onPlay}
          style={{ width: '100%', height: 58, fontSize: 19 }}>
          Start Delivery
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Confetti (lightweight, CSS-driven) ───────────────────────── */
function Confetti() {
  const colors = ['#FFC845', '#FFE38A', '#FF8533', '#3B8DD4', '#003DA6', '#28A745', '#7FD0FF'];
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

/* ─── Results screen ───────────────────────────────────────────── */
export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  void onHome;
  void retryLabel;
  const score = stats?.score || 0;
  const levels = stats?.levelsCleared || 0;
  const coins = stats?.coins || 0;
  const timeBonus = stats?.timeBonus || 0;
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
    const shareMessage = `Hi,\nI delivered ${levels} shield${levels === 1 ? '' : 's'} of protection and scored ${score} points in Shield Drop.\nProtecting your family at the right moment matters — try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shield Drop',
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
  const targetScore = 2400;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = won ? '#22c55e' : score >= 900 ? '#FFC845' : '#ef4444';
  const glowColor = won ? 'rgba(34, 197, 94, 0.4)' : score >= 900 ? 'rgba(255, 200, 69, 0.4)' : 'rgba(239, 68, 68, 0.4)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="sd-screen"
      style={{ padding: '40px 20px 24px' }}
    >
      {won && <Confetti />}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 18, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#FFC845', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'All shields delivered!' : 'Time ran out'}
          </span>
        </p>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}>
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

      {/* Stat chips */}
      <div className="sd-stat-row">
        <div className="sd-stat-chip">
          <span className="sd-stat-val">{levels}/6</span>
          <span className="sd-stat-label">Delivered</span>
        </div>
        <div className="sd-stat-chip">
          <span className="sd-stat-val">{coins}</span>
          <span className="sd-stat-label">Star coins</span>
        </div>
        <div className="sd-stat-chip">
          <span className="sd-stat-val">+{timeBonus}</span>
          <span className="sd-stat-label">Time bonus</span>
        </div>
      </div>

      {/* Motivational message */}
      <div style={{ textAlign: 'center', marginBottom: 22, padding: '0 16px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          In real life too, protection only counts when it reaches your family
          at the right moment
        </h2>
      </div>

      {/* Share */}
      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          backgroundColor: '#1d4ed8', color: '#fff', fontWeight: 900,
          height: 52, borderRadius: '16px', border: 'none', cursor: 'pointer',
          fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 20px rgba(29, 78, 216, 0.6)',
          width: '100%', maxWidth: 280, marginBottom: 22, flexShrink: 0,
          whiteSpace: 'nowrap', boxSizing: 'border-box', transition: 'background 0.2s',
        }}
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {/* Action card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(15, 23, 42, 0.75)',
        WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)',
        borderRadius: '24px', padding: '20px 18px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        marginBottom: 20,
      }}>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 18px 0' }}>
          A simple conversation can make sure your family is never left waiting
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: '#F59E0B', color: '#000', fontWeight: 900,
                padding: '15px 20px', borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 17, textDecoration: 'none', textTransform: 'uppercase',
                border: '1px solid #fbbf24', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
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
              onClick={() => { sfxTap(); onBookSlot(); }}
              style={{
                width: '100%', background: '#16A34A', color: '#fff', fontWeight: 900,
                padding: '15px 20px', borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 17, border: 'none', cursor: 'pointer',
                textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book a Slot</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Play again */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <button
          onClick={() => { sfxTap(); onRetry(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'none', border: 'none',
            color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer',
            fontSize: 16, fontWeight: 'bold', letterSpacing: '0.05em',
            padding: '12px 24px', textTransform: 'uppercase',
            transition: 'color 0.2s', marginBottom: 16,
          }}
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
