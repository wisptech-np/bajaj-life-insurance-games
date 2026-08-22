// Screens.jsx — Home, How to Play, and Results screens for Guardian Shelter.
// Restyled to match the design language of the project (glassmorphism, deep blue, clean buttons).
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import guardianBgImg from './guardian_shelter_bg.webp';

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
        backgroundImage: `linear-gradient(rgba(5, 26, 58, 0.45), rgba(5, 26, 58, 0.85)), url(${guardianBgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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
          
          {/* Falling acid rain droplets */}
          <g transform="translate(60, 68)">
            <path d="M0,-12 C5,-5 8,0 8,5 A 8 8 0 0 1 -8,5 C-8,0 -5,-5 0,-12 Z" fill="#49E24B" />
          </g>

          <g transform="translate(140, 75)">
            <path d="M0,-9 C4,-4 6,0 6,4 A 6 6 0 0 1 -6,4 C-6,0 -4,-4 0,-9 Z" fill="#49E24B" />
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
        backgroundImage: `linear-gradient(rgba(5, 26, 58, 0.45), rgba(5, 26, 58, 0.85)), url(${guardianBgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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

        {/* Looping demo of the real mechanic: drag a shield out of the tray,
            drop it over the family, watch the storm particle deflect.
            Deliberately wordless — everything is taught by the animation. */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 186,
          background: 'linear-gradient(180deg, rgba(3,14,35,0.75) 0%, rgba(8,32,68,0.6) 100%)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          marginBottom: 16
        }}>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes gsHand {
              0%        { transform: translate(72px, 28px) scale(1);    opacity: 0; }
              6%        { transform: translate(72px, 28px) scale(1);    opacity: 1; }
              12%       { transform: translate(72px, 28px) scale(0.8);  opacity: 1; }
              42%       { transform: translate(0px, -22px)  scale(0.8);  opacity: 1; }
              50%       { transform: translate(0px, -22px)  scale(1);    opacity: 1; }
              58%       { transform: translate(4px, -30px)  scale(1);    opacity: 0; }
              100%      { transform: translate(72px, 28px) scale(1);    opacity: 0; }
            }
            @keyframes gsShield {
              0%, 10%   { transform: translate(72px, 44px) scale(0.42); opacity: 0; }
              14%       { transform: translate(72px, 44px) scale(0.42); opacity: 1; }
              22%       { transform: translate(64px, 30px) scale(0.7);  opacity: 1; }
              42%       { transform: translate(0px, -22px) scale(1);    opacity: 1; }
              50%       { transform: translate(0px, 0px)   scale(1);    opacity: 1; }
              54%       { transform: translate(0px, 0px)   scaleX(1.16) scaleY(0.84); opacity: 1; }
              60%       { transform: translate(0px, 0px)   scaleX(0.97) scaleY(1.04); opacity: 1; }
              66%, 100% { transform: translate(0px, 0px)   scale(1);    opacity: 1; }
            }
            @keyframes gsGhost {
              0%, 16%   { opacity: 0; }
              24%, 46%  { opacity: 0.85; }
              52%, 100% { opacity: 0; }
            }
            @keyframes gsRaindrop {
              0%, 56%   { transform: translate(-4px, -74px); opacity: 0; }
              60%       { transform: translate(-4px, -68px); opacity: 1; }
              76%       { transform: translate(0px, 0px);    opacity: 1; }
              83%       { transform: translate(18px, -18px); opacity: 1; }
              92%       { transform: translate(56px, -28px); opacity: 1; }
              100%      { transform: translate(110px, 48px); opacity: 0; }
            }
            @keyframes gsThreat {
              0%, 100%  { opacity: 0.35; }
              50%       { opacity: 0.75; }
            }
            @keyframes gsIdle {
              0%, 100%  { transform: translateX(-50%) translateY(0)      scaleY(1); }
              50%       { transform: translateX(-50%) translateY(-2px)   scaleY(1.03); }
            }
          `}} />

          {/* Storm band along the top — the source of the threat */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 34,
            background: 'linear-gradient(180deg, rgba(73,226,75,0.22) 0%, rgba(73,226,75,0) 100%)',
            animation: 'gsThreat 2s ease-in-out infinite'
          }} />

          {/* Floor */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 10,
            background: 'linear-gradient(180deg, #0a2a5a 0%, #021028 100%)',
            borderTop: '2px solid #005BAC'
          }} />

          {/* Tray slot the shield is dragged out of */}
          <div style={{
            position: 'absolute', bottom: 4, left: 'calc(50% + 54px)',
            width: 36, height: 36, borderRadius: '50%',
            border: '1.5px dashed rgba(30,107,224,0.85)',
            background: 'rgba(15,23,42,0.6)'
          }} />

          {/* Family member to protect */}
          <div style={{
            position: 'absolute', bottom: 10, left: '50%',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            transformOrigin: 'bottom center',
            animation: 'gsIdle 2.4s ease-in-out infinite',
            filter: 'drop-shadow(0 0 8px rgba(255,200,69,0.55))',
            zIndex: 2
          }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F2C29B', border: '2px solid #FFC845' }} />
            <div style={{ width: 34, height: 18, borderTopLeftRadius: 11, borderTopRightRadius: 11, background: '#28A745', border: '2px solid #FFC845', borderBottom: 'none' }} />
          </div>

          {/* Ghost footprint — shows exactly where the shield will rest */}
          <div style={{
            position: 'absolute', bottom: 58, left: 'calc(50% - 34px)',
            width: 68, height: 44, borderRadius: 12,
            border: '2px dashed rgba(255,255,255,0.55)',
            animation: 'gsGhost 4.2s linear infinite',
            zIndex: 1
          }} />

          {/* The shield being dragged */}
          <div style={{
            position: 'absolute', bottom: 58, left: 'calc(50% - 34px)',
            width: 68, height: 44, transformOrigin: 'bottom center',
            animation: 'gsShield 4.2s ease-in-out infinite',
            zIndex: 3
          }}>
            <svg width="68" height="44" viewBox="0 0 68 44" aria-hidden="true">
              <path d="M2 26 A 32 32 0 0 1 66 26 A 12 12 0 0 0 50 26 A 12 12 0 0 0 34 26 A 12 12 0 0 0 18 26 A 12 12 0 0 0 2 26 Z" fill="url(#gsDome)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
              <path d="M34 0 L34 -5" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
              <path d="M34 26 L34 40 A 5 5 0 0 0 44 40" fill="none" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
              <defs>
                <linearGradient id="gsDome" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1E6BE0" />
                  <stop offset="45%" stopColor="#3B8DD4" />
                  <stop offset="100%" stopColor="#001B5A" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Finger doing the drag */}
          <div style={{
            position: 'absolute', bottom: 34, left: 'calc(50% - 16px)',
            width: 32, height: 32, transformOrigin: 'center',
            animation: 'gsHand 4.2s ease-in-out infinite',
            zIndex: 5
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(15,23,42,0.55)" stroke="#FACC15" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 11V6a2 2 0 0 0-4 0v5" />
              <path d="M14 10V4a2 2 0 0 0-4 0v6" />
              <path d="M10 10.5V7a2 2 0 0 0-4 0v7" />
              <path d="M6 14v-2a2 2 0 0 0-4 0v4a7 7 0 0 0 7 7h4a7 7 0 0 0 7-7v-4a2 2 0 0 0-4 0" />
            </svg>
          </div>

          {/* Storm particle that hits the dome and ricochets away */}
          <div style={{
            position: 'absolute', bottom: 98, left: 'calc(50% - 9px)',
            width: 18, height: 18,
            animation: 'gsRaindrop 4.2s ease-in-out infinite',
            filter: 'drop-shadow(0 0 5px rgba(73,226,75,0.9))',
            zIndex: 4
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8,1 C11,6 13,10 13,12 A 5 5 0 0 1 3,12 C3,10 5,6 8,1 Z" fill="#49E24B" />
            </svg>
          </div>
        </div>

        {/* Three icon-led labels — the only copy on this screen */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 18
        }}>
          {[
            {
              color: '#FACC15',
              label: 'DRAG',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 11V6a2 2 0 0 0-4 0v5" />
                  <path d="M14 10V4a2 2 0 0 0-4 0v6" />
                  <path d="M10 10.5V7a2 2 0 0 0-4 0v7" />
                  <path d="M6 14v-2a2 2 0 0 0-4 0v4a7 7 0 0 0 7 7h4a7 7 0 0 0 7-7v-4a2 2 0 0 0-4 0" />
                </svg>
              ),
            },
            {
              color: '#3B8DD4',
              label: 'COVER',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12a10 10 0 0 1 20 0 4 4 0 0 0-5 0 4 4 0 0 0-5 0 4 4 0 0 0-5 0 4 4 0 0 0-5 0z" fill="rgba(59,141,212,0.25)" />
                  <path d="M12 12v7a3 3 0 0 0 6 0" />
                </svg>
              ),
            },
            {
              color: '#49E24B',
              label: 'DEFLECT',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8,2 C10,5 11,7 11,8 A 3 3 0 0 1 5,8 C5,7 6,5 8,2 Z" fill="rgba(73,226,75,0.3)" />
                  <path d="M4 12h8M8 8v8" />
                  <path d="M13 15l7 6M20 13l-7 8" />
                </svg>
              ),
            },
          ].map((chip) => (
            <div
              key={chip.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                padding: '9px 2px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: chip.color,
              }}
            >
              {chip.icon}
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.06em', color: '#fff', whiteSpace: 'nowrap' }}>
                {chip.label}
              </span>
            </div>
          ))}
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
        backgroundImage: `linear-gradient(rgba(5, 26, 58, 0.45), rgba(5, 26, 58, 0.85)), url(${guardianBgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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
