// signals.jsx — the radar signal vocabulary, defined ONCE.
//
// The 2026-08-03 review said the mechanics were hard to understand and asked us
// to "clearly define what each radar signal represents". This file is that
// definition, and both places that teach it — the How to Play screen and the
// in-game legend behind the ? button — render from this array, so the wording,
// the glyph and the game can never drift apart.
//
// ACCESSIBILITY: no signal is distinguishable by colour alone. Each one has a
// distinct SHAPE and a distinct BEHAVIOUR (its rhythm or its decay), and both
// are stated in `shape` — read the list with the colours removed and every row
// is still unambiguous.

import React from 'react';

const CYAN = '#60CDFF';
const GOLD = '#FFC845';
const RED = '#FF5A5A';
const GREY = 'rgba(170,178,196,0.75)';

/* Each glyph is drawn to the same 24x24 box the canvas draws the real thing in,
   using the same construction — so the key looks like what you will see. */

function WallGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 8 H21" stroke="#E8F1FF" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M3 16 H21" stroke="#E8F1FF" strokeWidth="2.6" strokeLinecap="round" opacity="0.26" />
    </svg>
  );
}

function HazardGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6.4" fill="rgba(140,22,22,0.85)" stroke={RED} strokeWidth="1.6" />
      <g stroke={RED} strokeWidth="1.5" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={12 + Math.cos(r) * 3.2} y1={12 + Math.sin(r) * 3.2}
              x2={12 + Math.cos(r) * 8.6} y2={12 + Math.sin(r) * 8.6}
            />
          );
        })}
      </g>
    </svg>
  );
}

function ShelterGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.4" />
      <circle cx="12" cy="12" r="6.4" fill="none" stroke={GOLD} strokeWidth="1.8" />
      <path d="M7.6 13.4 L12 9 L16.4 13.4" fill="none" stroke={GOLD} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckpointGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="12" y1="3" x2="12" y2="21" stroke={GOLD} strokeWidth="2.4"
        strokeDasharray="4 4" strokeLinecap="round" />
    </svg>
  );
}

function OrbGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="#fff" />
      <g stroke={CYAN} strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="4.5" x2="12" y2="7.5" />
        <line x1="12" y1="16.5" x2="12" y2="19.5" />
        <line x1="4.5" y1="12" x2="7.5" y2="12" />
        <line x1="16.5" y1="12" x2="19.5" y2="12" />
      </g>
    </svg>
  );
}

function LurkerGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke={GREY} strokeWidth="1.1" opacity="0.45" />
      <circle cx="12" cy="12" r="7" fill="none" stroke={GREY} strokeWidth="1.4" opacity="0.8" />
      <circle cx="12" cy="12" r="3.6" fill="#FF4D4D" />
    </svg>
  );
}

/**
 * name  — what it is, in two words.
 * shape — the colour-free discriminator: form + behaviour. This is the line
 *         that has to be true even in greyscale.
 * mean  — what to DO about it.
 */
export const SIGNALS = [
  {
    key: 'wall',
    Glyph: WallGlyph,
    name: 'Wall',
    shape: 'Straight line. Bright as the ring passes, then a dim memory that stays.',
    mean: 'You cannot walk through it.',
  },
  {
    key: 'hazard',
    Glyph: HazardGlyph,
    name: 'Risk pool',
    shape: 'Spiked disc that keeps breathing in and out.',
    mean: 'Costs a heart. Squeeze past on its dark side.',
  },
  {
    key: 'exit',
    Glyph: ShelterGlyph,
    name: 'Shelter',
    shape: 'Roof chevron that rings by itself, forever, once you have found it.',
    mean: 'Your goal. Get the family here.',
  },
  {
    key: 'gate',
    Glyph: CheckpointGlyph,
    name: 'Checkpoint',
    shape: 'Dashed line straight across the corridor. Goes solid once crossed.',
    mean: 'Cross it — you restart from here if caught.',
  },
  {
    key: 'orb',
    Glyph: OrbGlyph,
    name: 'Bonus orb',
    shape: 'Small four-spoke spinner, always turning.',
    mean: 'Optional. Worth points.',
  },
  {
    key: 'lurker',
    Glyph: LurkerGlyph,
    name: 'Lurker',
    shape: 'Repeating rings from a point that moves. Never leaves a memory trace.',
    mean: 'Walks to wherever your ping came from. Ping, then move away.',
  },
];
