// ThankYouScreen — confirmation after slot booking (confetti + booked details).
// Structure mirrors life-goals-bubble-shooter/src/ThankYouScreen.jsx, restyled for Guardian Archer.
import React, { useMemo } from 'react';
import { BookedDetails } from '../types';

interface Props {
  details: BookedDetails | null;
  onPlayAgain: () => void;
  onHome: () => void;
}

const CONFETTI_COLORS = ['#FFC845', '#FFE38A', '#F26522', '#00AEEF', '#003DA6', '#28A745', '#EC4899'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        left: Math.random() * 100,
        dur: 2 + Math.random() * 2,
        delay: Math.random() * 1.5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
      })),
    []
  );
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]" aria-hidden="true">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function ThankYouScreen({ details, onPlayAgain, onHome }: Props) {
  const leadName = details?.name || sessionStorage.getItem('lastSubmittedName') || '';

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between px-6 py-10 overflow-hidden"
      style={{ background: 'linear-gradient(185deg, #030F26 0%, #08224F 50%, #030F26 100%)' }}
    >
      <Confetti />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
        {/* Success icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-[#28A745]/30 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#28A745] to-[#0D9488] flex items-center justify-center shadow-[0_8px_30px_rgba(40,167,69,0.45)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12" aria-hidden="true">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-xl font-black text-white uppercase tracking-wide leading-snug">
          <span className="block">Thank You</span>
          {leadName && <span className="block text-[#00AEEF] my-1">{leadName}</span>}
          <span className="block text-sm text-blue-200/80">for sharing your details</span>
        </h2>
        <p className="text-xs text-blue-200/60 mt-3 max-w-[260px]">
          Our Relationship Manager will reach out to you
        </p>

        {/* Booked slot details */}
        {details?.date && details?.time && (
          <div className="mt-6 w-full max-w-[300px] bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-200/60 block mb-2">
              Your Booked Slot
            </span>
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <span className="text-[9px] font-bold text-blue-300/50 uppercase block">Date</span>
                <span className="text-sm font-black text-white">{formatDate(details.date)}</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <span className="text-[9px] font-bold text-blue-300/50 uppercase block">Time</span>
                <span className="text-sm font-black text-white">{details.time}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="relative z-10 flex flex-col gap-3 items-center w-full pb-2">
        <button
          onClick={onPlayAgain}
          className="btn-press w-full max-w-[300px] rounded-full py-3.5 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-[0_6px_24px_rgba(0,174,239,0.4)]"
          style={{ background: 'linear-gradient(135deg, #00AEEF 0%, #003DA6 100%)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Play Again
        </button>
        <button
          onClick={onHome}
          className="btn-press w-full max-w-[300px] rounded-full py-3 text-xs font-black uppercase tracking-wider text-white/70 border border-white/20 hover:bg-white/5"
        >
          Home
        </button>
      </div>
    </div>
  );
}
