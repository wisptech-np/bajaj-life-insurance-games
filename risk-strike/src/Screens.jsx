// Screens.jsx — Home, How to Play, and Results screens for Guardian Shelter.
// Restyled to match the design language of the project (glassmorphism, deep blue, clean buttons).
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

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

/* ─── Confetti (lightweight) ─────────────────────────── */
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
              position: 'absolute',
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
        padding: '50px 24px 64px',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.95) 70%), #051a3a',
        overflow: 'hidden',
      }}
    >
      {/* Title & Brand Section */}
      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          margin: '0 0 6px 0',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
        }}>
          Guardian Shelter
        </h1>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#FF8A3D',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: 0,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          Preemptive Risk Protection
        </p>
      </div>

      {/* Decorative SVG Vector Graphics representing Game Concept */}
      <div style={{
        position: 'relative',
        width: 240,
        height: 240,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1
      }}>
        <svg width="240" height="240" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
          {/* Glass plate background */}
          <rect x="10" y="10" width="180" height="180" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          
          {/* Storm Clouds at the top */}
          <path d="M 40 45 a 15 15 0 0 1 20 -5 a 22 22 0 0 1 35 -10 a 22 22 0 0 1 35 10 a 15 15 0 0 1 20 5 L 150 55 L 50 55 Z" fill="rgba(255,255,255,0.15)" />
          
          {/* Falling virus particles */}
          <g transform="translate(60, 68)">
            <circle cx="0" cy="0" r="10" fill="#49E24B" />
            <path d="M-13,0 L13,0 M0,-13 L0,13 M-9,-9 L9,9 M-9,9 L9,-9" stroke="#49E24B" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="6" fill="#0E5C1D" />
          </g>

          <g transform="translate(140, 75)">
            <circle cx="0" cy="0" r="7" fill="#49E24B" />
            <path d="M-9,0 L9,0 M0,-9 L0,9 M-6,-6 L6,6 M-6,6 L6,-6" stroke="#49E24B" strokeWidth="2" />
            <circle cx="0" cy="0" r="4" fill="#0E5C1D" />
          </g>

          {/* Protective Umbrella (Blue, Glossy) */}
          <g transform="translate(100, 110)">
            {/* Handle / Stick */}
            <path d="M0,0 L0,30 A 6 6 0 0 0 10 30" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            {/* Canopy */}
            <path d="M-45,0 A 45 45 0 0 1 45 0 A 15 15 0 0 0 15 0 A 15 15 0 0 0 -15 0 A 15 15 0 0 0 -45 0 Z" fill="url(#blueGloss)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            {/* Umbrella tip */}
            <path d="M0,-3 L0,-7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
          </g>

          {/* Family silhouettes underneath */}
          <g transform="translate(100, 155)">
            {/* Dad */}
            <circle cx="-16" cy="-14" r="8" fill="#fff" opacity="0.9" />
            <path d="M-28,6 C-28,-6 -14,-7 -12,-4" fill="#fff" opacity="0.9" />
            {/* Mom */}
            <circle cx="16" cy="-12" r="7" fill="#fff" opacity="0.8" />
            <path d="M8,6 C8,-5 20,-6 24,-2" fill="#fff" opacity="0.8" />
            {/* Kid */}
            <circle cx="0" cy="-2" r="5.5" fill="#fff" opacity="0.95" />
            <path d="M-8,12 C-8,4 8,4 8,12" fill="#fff" opacity="0.95" />
          </g>

          {/* Definitions */}
          <defs>
            <linearGradient id="blueGloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E6BE0" />
              <stop offset="60%" stopColor="#003DA6" />
              <stop offset="100%" stopColor="#00185A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Start Button */}
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
            borderRadius: '12px',
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: 'linear-gradient(180deg, #FF8A3D 0%, #F26522 100%)',
            boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
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
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.95) 70%), #051a3a',
        overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'rgba(0, 30, 70, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 24,
        padding: '30px 24px 24px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Title */}
        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          margin: '0 0 20px 0',
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          How to Play
        </h2>

        {/* CSS Animation Demonstration */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 180,
          background: 'rgba(5, 20, 45, 0.5)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 20
        }}>
          {/* Floor */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 12,
            background: 'rgba(255,255,255,0.1)'
          }} />

          {/* Simple Animation container */}
          <div style={{
            position: 'absolute',
            inset: 0
          }}>
            {/* Style injections for keyframes */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes tutShieldDrop {
                0% { transform: translateY(-70px) scale(0.9); opacity: 0; }
                40% { transform: translateY(0) scale(1); opacity: 1; }
                100% { transform: translateY(0) scale(1); opacity: 1; }
              }
              @keyframes tutVirusFall {
                0%, 45% { transform: translate(0, -90px); opacity: 0; }
                65% { transform: translate(0, -35px); opacity: 1; }
                80% { transform: translate(45px, -70px); opacity: 1; }
                100% { transform: translate(90px, 60px); opacity: 0; }
              }
              @keyframes tutHandMove {
                0% { transform: translate(30px, 40px); opacity: 0; }
                15% { transform: translate(30px, 40px); opacity: 1; }
                40% { transform: translate(0px, 0px); opacity: 1; }
                55% { transform: translate(0px, 0px); opacity: 0; }
                100% { transform: translate(30px, 40px); opacity: 0; }
              }
            `}} />

            {/* Target family member */}
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 1
            }}>
              {/* Head */}
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F2C29B', border: '1.5px solid #146C2E' }} />
              {/* Body */}
              <div style={{ width: 32, height: 18, borderTopLeftRadius: 10, borderTopRightRadius: 10, background: '#28A745' }} />
            </div>

            {/* Dropping Shield Umbrella */}
            <div style={{
              position: 'absolute',
              bottom: 40,
              left: 'calc(50% - 30px)',
              width: 60,
              height: 40,
              animation: 'tutShieldDrop 3.5s infinite ease-out',
              zIndex: 2
            }}>
              <svg width="60" height="40" viewBox="0 0 60 40">
                <path d="M 0 20 A 30 30 0 0 1 60 20 Z" fill="#1E6BE0" stroke="#fff" strokeWidth="1" />
                <rect x="29" y="20" width="2" height="15" fill="#fff" />
              </svg>
            </div>

            {/* Hand Cursor demonstrating placing */}
            <div style={{
              position: 'absolute',
              bottom: 30,
              left: 'calc(50% + 15px)',
              width: 32,
              height: 32,
              animation: 'tutHandMove 3.5s infinite ease-in-out',
              zIndex: 5
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.5">
                <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
                <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
                <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
                <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
              </svg>
            </div>

            {/* Falling virus bouncing off */}
            <div style={{
              position: 'absolute',
              bottom: 80,
              left: 'calc(50% - 8px)',
              width: 16,
              height: 16,
              animation: 'tutVirusFall 3.5s infinite ease-in-out',
              zIndex: 3
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" fill="#49E24B" />
                <path d="M1,8 L15,8 M8,1 L8,15 M3,3 L13,13 M3,13 L13,3" stroke="#49E24B" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="3" fill="#0E5C1D" />
              </svg>
            </div>
          </div>
        </div>

        {/* Instructions Text */}
        <div style={{
          textAlign: 'left',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 14,
          lineHeight: 1.45,
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>1.</span>
            <span>Drag protective shields (umbrellas, crates, barrels) from the tray onto the playfield.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>2.</span>
            <span>Arrange them carefully to build a secure shelter over the family members.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>3.</span>
            <span>Tap <strong>Start Storm</strong>. If the family survives the bouncing virus particles, you win the round!</span>
          </div>
        </div>

        {/* Play Button */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%',
              height: 52,
              border: 'none',
              borderRadius: '12px',
              fontSize: 18,
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'linear-gradient(180deg, #1E6BE0 0%, #003DA6 100%)',
              boxShadow: '0 4px 15px rgba(0, 61, 166, 0.4)',
              cursor: 'pointer'
            }}
          >
            Play Game
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot }) {
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
    const shareMessage = `Hi,\nI secured ${score} points in the Guardian Shelter challenge.\nPreemptive risk protection makes all the difference! Protect your family here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Guardian Shelter',
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
  const strokeColor = score < 500 ? "#ef4444" : "#28A745";
  const glowColor = score < 500 ? "rgba(239, 68, 68, 0.4)" : "rgba(40, 167, 69, 0.4)";

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
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.95) 70%), #051a3a',
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
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Preemptive protection shields your family's future from unexpected storms.
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
          backgroundColor: '#1E6BE0',
          color: '#fff',
          fontWeight: 900,
          height: 52,
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 4px 20px rgba(30, 107, 224, 0.4)',
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
        <span>Share Score</span>
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
          Consult a specialist to shield your goals against potential risks.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: '#FF8A3D',
                color: '#fff',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                textDecoration: 'none',
                textTransform: 'uppercase',
                border: '1px solid #FF8A3D',
                boxShadow: '0 4px 12px rgba(255, 138, 61, 0.25)',
              }}
            >
              <PhoneIcon />
              <span>Call Specialist</span>
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
                background: '#28A745',
                color: '#fff',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.25)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book Consultation</span>
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
