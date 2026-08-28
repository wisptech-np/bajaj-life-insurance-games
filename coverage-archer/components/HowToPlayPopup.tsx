// HowToPlayPopup — animation only (GAME_STANDARD G2).
// One looping SMIL demo of the real mechanic: finger pulls back, power ring fills,
// arrow arcs with the wind, risk target takes the hit. Three icon-led labels, no prose.
import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
  onBack: () => void;
}

import archerDrawUrl from '../assets/archer-draw.webp';
import { Marker } from '../kit/screens.jsx';
import { metaFor } from '../kit/game-meta.js';

const META = metaFor('coverage-archer');

const LOOP = '4s';

/* ── Icon-led labels (<= 4 words each) ─────────────────────── */
/* ── The looping demo ──────────────────────────────────────── */
function ArcheryDemo() {
  // Timeline over LOOP: 0.10 draw -> 0.45 release -> 0.78 impact -> reset
  return (
    <svg viewBox="0 0 320 180" width="100%" height="100%" aria-label="Pull back, release, hit the core" role="img">
      <defs>
        <linearGradient id="ga-htp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#04122B" />
          <stop offset="100%" stopColor="#0A1F47" />
        </linearGradient>
        <linearGradient id="ga-htp-cell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="320" height="180" fill="url(#ga-htp-sky)" />

      {/* Wind streaks — the same left-to-right drift the game draws */}
      <g stroke="#00AEEF" strokeWidth="1.4" strokeLinecap="round" opacity="0.45">
        {[38, 74, 108, 142].map((y, i) => (
          <line key={y} x1="-30" y1={y} x2={4 + i * 6} y2={y}>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 360 0"
              dur={LOOP}
              begin={`${i * 0.35}s`}
              repeatCount="indefinite"
            />
          </line>
        ))}
      </g>

      {/* Ground */}
      <path d="M0 152 Q90 140 175 150 T320 144 L320 180 L0 180 Z" fill="#14532D" />

      {/* Risk target — illness hex cell with a glowing core */}
      <g transform="translate(248 62)">
        <animateTransform
          attributeName="transform"
          type="translate"
          values="248 62; 248 62; 262 70; 262 70"
          keyTimes="0; 0.78; 0.9; 1"
          dur={LOOP}
          repeatCount="indefinite"
        />
        <g>
          {/* shatter on impact, stays gone until the loop restarts */}
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1; 1; 1.25; 0.1; 0; 0"
            keyTimes="0; 0.78; 0.83; 0.9; 0.94; 1"
            dur={LOOP}
            repeatCount="indefinite"
          />
          <g stroke="#7f1d1d" strokeWidth="3.4" strokeLinecap="round">
            {[0, 60, 120, 180, 240, 300].map((d) => {
              const a = ((d - 90) * Math.PI) / 180;
              return (
                <line
                  key={d}
                  x1={Math.cos(a) * 17}
                  y1={Math.sin(a) * 17}
                  x2={Math.cos(a) * 24}
                  y2={Math.sin(a) * 24}
                />
              );
            })}
          </g>
          <polygon
            points={[0, 60, 120, 180, 240, 300]
              .map((d) => {
                const a = ((d - 90) * Math.PI) / 180;
                return `${(Math.cos(a) * 18).toFixed(1)},${(Math.sin(a) * 18).toFixed(1)}`;
              })
              .join(' ')}
            fill="url(#ga-htp-cell)"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.4"
          />
          <circle cx="0" cy="0" r="6.5" fill="none" stroke="#FF9DB0" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="0" cy="0" r="3.6" fill="#fff">
            <animate attributeName="r" values="3.2;4.4;3.2" dur="1.1s" repeatCount="indefinite" />
          </circle>
        </g>
      </g>

      {/* Impact burst + score pop */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.77;0.82;0.95;1" dur={LOOP} repeatCount="indefinite" />
        <circle cx="248" cy="62" r="6" fill="none" stroke="#FACC15" strokeWidth="3">
          <animate attributeName="r" values="6;6;34;34" keyTimes="0;0.77;0.9;1" dur={LOOP} repeatCount="indefinite" />
        </circle>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => {
          const a = (d * Math.PI) / 180;
          return (
            <circle
              key={d}
              cx={248 + Math.cos(a) * 26}
              cy={62 + Math.sin(a) * 26}
              r="2.6"
              fill="#FACC15"
            />
          );
        })}
        <text x="248" y="30" textAnchor="middle" fill="#FACC15" fontSize="15" fontWeight="900" fontFamily="'Plus Jakarta Sans', sans-serif">
          x2
        </text>
      </g>

      {/* Archer — the same painting MainScene blits, so the tutorial and the
          game show the player the same character. */}
      <image href={archerDrawUrl} x="14" y="104" width="42" height="54" preserveAspectRatio="xMidYMax meet" />

      {/* Bowstring pulling back with the finger */}
      <line x1="42" y1="114" x2="42" y2="142" stroke="#fff" strokeWidth="1.6" opacity="0.85">
        <animate attributeName="x2" values="42;42;18;42;42" keyTimes="0;0.1;0.45;0.5;1" dur={LOOP} repeatCount="indefinite" />
        <animate attributeName="y2" values="128;128;146;128;128" keyTimes="0;0.1;0.45;0.5;1" dur={LOOP} repeatCount="indefinite" />
      </line>

      {/* Power ring around the launch anchor */}
      <circle cx="46" cy="128" r="26" fill="none" stroke="#0B1F42" strokeWidth="4" opacity="0.9" />
      <circle
        cx="46"
        cy="128"
        r="26"
        fill="none"
        stroke="#28A745"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="163.4"
        strokeDashoffset="163.4"
        transform="rotate(-90 46 128)"
      >
        <animate attributeName="stroke-dashoffset" values="163.4;163.4;16;16;163.4;163.4" keyTimes="0;0.1;0.44;0.46;0.5;1" dur={LOOP} repeatCount="indefinite" />
        <animate attributeName="stroke" values="#28A745;#28A745;#FACC15;#F26522;#F26522" keyTimes="0;0.2;0.32;0.45;1" dur={LOOP} repeatCount="indefinite" />
      </circle>

      {/* Predicted arc, revealed while drawing */}
      <path d="M56 124 Q140 30 244 62" fill="none" stroke="#00AEEF" strokeWidth="2" strokeDasharray="3 7" opacity="0">
        <animate attributeName="opacity" values="0;0;0.9;0.9;0" keyTimes="0;0.15;0.4;0.48;0.6" dur={LOOP} repeatCount="indefinite" />
      </path>

      {/* The arrow — flies the same curve, nose along the velocity vector */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.45;0.47;0.77;0.79;1" dur={LOOP} repeatCount="indefinite" />
        <animateMotion
          dur={LOOP}
          repeatCount="indefinite"
          rotate="auto"
          path="M56 124 Q140 30 244 62"
          keyPoints="0;0;1;1"
          keyTimes="0;0.45;0.78;1"
          calcMode="linear"
        />
        <line x1="-14" y1="0" x2="8" y2="0" stroke="#fff" strokeWidth="2.2" />
        <polygon points="8,-4 15,0 8,4" fill="#00AEEF" stroke="#fff" strokeWidth="0.8" />
        <polygon points="-14,0 -19,-4 -16,0 -19,4" fill="#003DA6" />
      </g>

      {/* Finger glyph doing the real input */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0.95;0.95;0;0" keyTimes="0;0.12;0.44;0.5;1" dur={LOOP} repeatCount="indefinite" />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="46 122; 46 122; 22 140; 46 122; 46 122"
          keyTimes="0;0.1;0.45;0.5;1"
          dur={LOOP}
          repeatCount="indefinite"
        />
        <g transform="scale(0.95)" stroke="#FACC15" strokeWidth="2" fill="#04122B" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5V-1a2 2 0 0 1 4 0v6" />
          <path d="M13 4V0a2 2 0 0 1 4 0v9" />
          <path d="M17 6v-1a2 2 0 0 1 4 0v9a7 7 0 0 1-7 7h-3a7 7 0 0 1-6-4l-3-6a2 2 0 0 1 3-2l2 3" />
        </g>
      </g>
    </svg>
  );
}

const HowToPlayPopup: React.FC<Props> = ({ onStart, onBack }) => {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#04122B]/70 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.04, y: -14 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="glass-card relative w-full max-w-[360px] p-5"
      >
        {/* Back — icon only, keeps the text budget for the demo */}
        <button
          onClick={onBack}
          aria-label="Back"
          className="btn-press absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/70"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <h2 className="mb-4 text-center text-base font-black uppercase tracking-[0.16em] text-white">
          How to Play
        </h2>

        {/* Looping demo of the real mechanic */}
        <div className="relative mb-4 h-[180px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#04122B]">
          <ArcheryDemo />
          {/* What scores and what costs a shot, marked on the demo itself. */}
          <Marker kind="pos" x={236} y={44} label="Hit the core" size={20} />
          <Marker kind="neg" x={128} y={152} label="Miss wastes an arrow" size={20} />
        </div>

        {/* One line, the objective. */}
        <div className="mb-5 flex items-center justify-center gap-2 text-center">
          <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFB800]">
            Goal
          </span>
          <span className="text-[13px] font-bold leading-snug text-white/90">{META.goal}</span>
        </div>

        <button onClick={onStart} className="btn-primary btn-press w-full">
          Start Game
        </button>
      </motion.div>
    </div>
  );
};

export default HowToPlayPopup;
