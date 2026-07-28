// Screens.jsx — Home + Results screens for the glider flight game.
// Restyled to match the stackibility-stack design language.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import introBg from './canyon_bg.png';
import gliderImg from './hang_glider.png';

/* ─── Inline icons ─────────────────────────────────────── */
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

function CalendarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

function CleanGliderImage({ style }) {
  const [cleanedSrc, setCleanedSrc] = React.useState(null);

  React.useEffect(() => {
    const img = new Image();
    img.src = gliderImg;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        const rBg = data[0];
        const gBg = data[1];
        const bBg = data[2];
        const tolerance = 45;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const dist = Math.sqrt((r - rBg) ** 2 + (g - gBg) ** 2 + (b - bBg) ** 2);
          if (dist < tolerance || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        setCleanedSrc(canvas.toDataURL());
      } catch (e) {
        console.error("Failed to clean preview glider", e);
        setCleanedSrc(gliderImg);
      }
    };
  }, []);

  if (!cleanedSrc) {
    // Fallback: original vector SVG glider
    return (
      <svg width="44" height="28" viewBox="0 0 44 28" fill="none" style={style}>
        <path d="M 2 22 L 22 2 L 42 22 L 22 16 Z" fill="url(#gliderGrad)" stroke="#fff" strokeWidth="1" />
        <path d="M 12 20 L 22 26 L 32 20" stroke="#E2E8F0" strokeWidth="1.5" />
        <circle cx="22" cy="22" r="2.5" fill="#F59E0B" />
        <defs>
          <linearGradient id="gliderGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#005BAC" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <img src={cleanedSrc} alt="Glider" style={{ ...style, objectFit: 'contain' }} />
  );
}

/* ─── Decorative glider illustration for the home screen ────────── */
function GliderPreview() {
  const containerW = 240;
  const containerH = 280;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: containerW,
        height: containerH,
        margin: '0 auto',
        borderRadius: 22,
        overflow: 'hidden',
        backgroundImage: `linear-gradient(rgba(5, 26, 58, 0.45), rgba(5, 26, 58, 0.85)), url(${introBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        animation: 'ls-float 4s ease-in-out infinite',
        filter: 'drop-shadow(0 22px 26px rgba(0, 0, 0, 0.4))',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      {/* Parallax background rock layers */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '200%', height: 80,
        background: 'linear-gradient(180deg, rgba(10,31,74,0.6) 0%, rgba(5,20,48,0.8) 100%)',
        clipPath: 'polygon(0% 40%, 15% 20%, 30% 50%, 45% 30%, 60% 60%, 75% 25%, 90% 55%, 100% 40%, 100% 100%, 0% 100%)',
        animation: 'move-left 8s linear infinite'
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '200%', height: 110,
        background: 'linear-gradient(180deg, rgba(16,48,107,0.4) 0%, rgba(8,30,70,0.6) 100%)',
        clipPath: 'polygon(0% 60%, 10% 40%, 25% 70%, 40% 50%, 55% 80%, 70% 45%, 85% 75%, 100% 60%, 100% 100%, 0% 100%)',
        animation: 'move-left 14s linear infinite',
        opacity: 0.6
      }} />

      {/* Floating collectibles */}
      <div style={{
        position: 'absolute', left: '70%', top: '40%',
        width: 18, height: 18, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #FFE875, #FACC15, #CA8A04)',
        boxShadow: '0 0 10px rgba(250, 204, 21, 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontSize: 10, color: '#854D0E',
        animation: 'float-item 3s ease-in-out infinite'
      }}>₹</div>

      <div style={{
        position: 'absolute', left: '85%', top: '60%',
        width: 16, height: 18,
        background: 'linear-gradient(180deg, #60A5FA, #2563EB)',
        border: '1px solid #93C5FD',
        boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)',
        clipPath: 'polygon(50% 0%, 100% 30%, 80% 80%, 50% 100%, 20% 80%, 0% 30%)',
        animation: 'float-item 4s ease-in-out infinite 0.5s'
      }} />

      {/* Animated Glider */}
      <div style={{
        position: 'absolute', left: 40, top: '45%',
        width: 44, height: 28,
        animation: 'glider-soar 4s ease-in-out infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CleanGliderImage style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Wind trail lines */}
      <div style={{
        position: 'absolute', left: 20, top: '48%', width: 20, height: 2,
        background: 'rgba(255, 255, 255, 0.4)', borderRadius: 1,
        animation: 'wind-trail 1s linear infinite'
      }} />
      <div style={{
        position: 'absolute', left: 10, top: '53%', width: 15, height: 2,
        background: 'rgba(255, 255, 255, 0.3)', borderRadius: 1,
        animation: 'wind-trail 1.2s linear infinite 0.2s'
      }} />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes move-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes float-item {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes glider-soar {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50% { transform: translateY(-30px) rotate(-6deg); }
        }
        @keyframes wind-trail {
          0% { transform: translateX(0); opacity: 0; }
          30% { opacity: 0.7; }
          100% { transform: translateX(-60px); opacity: 0; }
        }
      `}} />
    </div>
  );
}

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
        justifyContent: 'flex-end',
        padding: '0 24px 64px',
        backgroundImage: `url(${introBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', gap: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="bajaj-mark">
            <span className="bajaj-mark-icon" />
            <span>Bajaj Allianz Life</span>
          </div>

          <h1 className="logo-title" style={{ marginTop: 12 }}>
            Life <span>Soar</span>
          </h1>
          <p className="logo-tagline">Stage Protection challenge</p>
        </div>

        <GliderPreview />
      </div>

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
          <span style={{ position: 'relative', zIndex: 2, textShadow: '0 2px 4px rgba(0,0,0,0.5)', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 22 }}>
            <HelpIcon size={20} /> How to Play
          </span>
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
    const shareMessage = `Hi,\nI soared high and scored ${score} points in the Life Soar challenge!\nIt really makes you think about how much protection you need at every life stage — try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Life Soar',
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
  const targetScore = 2500;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = score < 600 ? "#ef4444" : "#22c55e";
  const glowColor = score < 600 ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.4)";

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
          <span>{retryLabel}</span>
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

/* ─── Interactive instruction animation ───────────────── */
function TutGliderAnimation() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '100%',
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundImage: `linear-gradient(rgba(5, 26, 58, 0.45), rgba(5, 26, 58, 0.85)), url(${introBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16
      }}
    >
      {/* Undulating bounds */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 35, background: '#0a172e', borderBottom: '1px solid rgba(59, 141, 212, 0.3)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 35, background: '#0a172e', borderTop: '1px solid rgba(59, 141, 212, 0.3)' }} />

      {/* Floating hazard */}
      <div style={{
        position: 'absolute', left: '75%', top: '45%',
        width: 20, height: 20, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #4ADE80, #16A34A, #14532D)',
        border: '1px solid #22C55E',
        boxShadow: '0 0 8px rgba(22, 163, 74, 0.4)',
        animation: 'float-item-tut 2s ease-in-out infinite'
      }} />

      {/* Gold coin */}
      <div style={{
        position: 'absolute', left: '50%', top: '65%',
        width: 16, height: 16, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #FFE875, #FACC15, #CA8A04)',
        boxShadow: '0 0 8px rgba(250, 204, 21, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontSize: 9, color: '#854D0E',
        animation: 'float-item-tut 2s ease-in-out infinite 0.5s'
      }}>₹</div>

      {/* Tutorial Glider */}
      <div style={{
        position: 'absolute', left: 40, top: '40%',
        width: 44, height: 28,
        animation: 'tut-glider 4s linear infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CleanGliderImage style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Gesture Finger overlay */}
      <div style={{
        position: 'absolute', bottom: 15, right: 30,
        width: 40, height: 40,
        animation: 'tut-hand 4s linear infinite',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))' }}>
          <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
          <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
          <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
          <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
        </svg>
      </div>

      {/* Action text overlay */}
      <div className="tut-action-label" style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase'
      }} />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-item-tut {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes tut-glider {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(35px) rotate(15deg); }
          50% { transform: translateY(35px) rotate(0deg); }
          75% { transform: translateY(-25px) rotate(-15deg); }
        }
        @keyframes tut-hand {
          0%, 100% { transform: scale(1.0); opacity: 0.3; }
          20% { transform: scale(0.85); opacity: 1; }
          45% { transform: scale(0.85); opacity: 1; }
          50% { transform: scale(1.0); opacity: 0.3; }
        }
      `}} />
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
        justifyContent: 'flex-start', // Fix: allow scroll to top
        padding: '32px 24px',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.85) 70%), #051a3a',
        overflowY: 'auto',
      }}
    >
      <div className="tutorial-card" style={{ width: '100%', maxWidth: 360, margin: 'auto 0' }}>
        {/* Title */}
        <h2 style={{ fontSize: 26, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 16px 0', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          How to Play
        </h2>

        {/* Gesture Animation Screen */}
        <TutGliderAnimation />

        {/* Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 20, padding: '0 8px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>1</span>
            <p style={{ fontSize: 13, margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, fontWeight: 600 }}>
              Hold the screen to <strong style={{ color: '#F26922' }}>DIVE</strong> and build up speed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>2</span>
            <p style={{ fontSize: 13, margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, fontWeight: 600 }}>
              Release your hold to convert speed into lift and <strong style={{ color: '#3B8DD4' }}>SOAR</strong> upward!
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>3</span>
            <p style={{ fontSize: 13, margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, fontWeight: 600 }}>
              Collect gold <strong style={{ color: '#FACC15' }}>Wealth Coins</strong> and blue <strong style={{ color: '#60A5FA' }}>Protection Shields</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>4</span>
            <p style={{ fontSize: 13, margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, fontWeight: 600 }}>
              Shields protect against collision. Avoid spiky green viruses and red wall spikes. Reach 2000m to win!
            </p>
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
              Let's Fly
            </span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
