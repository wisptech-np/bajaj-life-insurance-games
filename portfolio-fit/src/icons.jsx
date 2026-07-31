// icons.jsx — Portfolio Fit icon system.
// ONE design language for every icon in the game:
//   · 24×24 box · 2px stroke · round caps + round joins · no inner detail below 20px
//   · geometry is repeated 1:1 by the canvas glyph drawers in PortfolioFitGame.jsx
//     so a block face on the board and its HUD/legend icon are the same drawing.
// No emoji anywhere (G4).
import React from 'react';

const K = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Icon({ size = 20, children, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flex: '0 0 auto', ...style }}
    >
      {children}
    </svg>
  );
}

/* ── Asset-class faces (one per block type) ─────────────────── */

// Equity — growth trend with arrow head.
export function EquityIcon(p) {
  return (
    <Icon {...p}>
      <path {...K} d="M3.5 16.8 9 11.3l3.2 3.2L20.2 6.5" />
      <path {...K} d="M14.6 6.5h5.6v5.6" />
    </Icon>
  );
}

// Debt — coupon note: banded rectangle with a value disc.
export function DebtIcon(p) {
  return (
    <Icon {...p}>
      <rect {...K} x="3" y="6" width="18" height="12" rx="2.6" />
      <circle {...K} cx="12" cy="12" r="2.6" />
      <path {...K} d="M6.4 9.6v4.8M17.6 9.6v4.8" />
    </Icon>
  );
}

// Gold — stacked bullion bars.
export function GoldIcon(p) {
  return (
    <Icon {...p}>
      <path {...K} d="M9 5.6h6l1.7 4H7.3z" />
      <path {...K} d="M4.6 13h6l1.7 4.4h-9.4z" />
      <path {...K} d="M13.4 13h6l1.7 4.4h-9.4z" />
    </Icon>
  );
}

// Insurance — shield with confirm tick.
export function InsuranceIcon(p) {
  return (
    <Icon {...p}>
      <path {...K} d="M12 3 5 5.9v5.2c0 4.5 2.9 7.8 7 9.4 4.1-1.6 7-4.9 7-9.4V5.9z" />
      <path {...K} d="m8.9 11.7 2.3 2.4 4-4.6" />
    </Icon>
  );
}

export const ASSET_ICONS = {
  equity: EquityIcon,
  debt: DebtIcon,
  gold: GoldIcon,
  insurance: InsuranceIcon,
};

/* ── HUD ────────────────────────────────────────────────────── */

// Score — coin stack.
export function CoinsIcon(p) {
  return (
    <Icon {...p}>
      <ellipse {...K} cx="12" cy="6.8" rx="7" ry="2.9" />
      <path {...K} d="M5 6.8v4.6c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9V6.8" />
      <path {...K} d="M5 11.4V16c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9v-4.6" />
    </Icon>
  );
}

// Time — clock.
export function ClockIcon(p) {
  return (
    <Icon {...p}>
      <circle {...K} cx="12" cy="12" r="8.6" />
      <path {...K} d="M12 7v5.2l3.4 2" />
    </Icon>
  );
}

// Streak — flame.
export function FlameIcon(p) {
  return (
    <Icon {...p}>
      <path {...K} d="M12 2.8c.7 3 3.1 4.5 4.5 6.9 1.6 2.8 1 6.3-1.5 8.4-1 .9-1.9 1.4-3 1.4s-2-.5-3-1.4c-2.5-2.1-3.1-5.6-1.5-8.4C8.9 7.3 11.3 5.8 12 2.8Z" />
      <path {...K} d="M12 12.4c.9 1.2 1.9 2 1.9 3.4 0 1.2-.9 2.1-1.9 2.1s-1.9-.9-1.9-2.1c0-1.4 1-2.2 1.9-3.4Z" />
    </Icon>
  );
}

/* ── Result / how-to-play ───────────────────────────────────── */

// Rebalanced lines — two-way cycle.
export function RebalanceIcon(p) {
  return (
    <Icon {...p}>
      <path {...K} d="M4.4 10.4a7.9 7.9 0 0 1 13.3-3.6l2.3 2.3" />
      <path {...K} d="M20 4.6v4.5h-4.5" />
      <path {...K} d="M19.6 13.6a7.9 7.9 0 0 1-13.3 3.6L4 14.9" />
      <path {...K} d="M4 19.4v-4.5h4.5" />
    </Icon>
  );
}

// Diversified — four-way split disc.
export function DiversifyIcon(p) {
  return (
    <Icon {...p}>
      <circle {...K} cx="12" cy="12" r="8.6" />
      <path {...K} d="M12 3.4v17.2M3.4 12h17.2" />
    </Icon>
  );
}

// A grid with one full line — the "complete a row" idea.
export function LineIcon(p) {
  return (
    <Icon {...p}>
      <rect {...K} x="3.4" y="3.4" width="17.2" height="17.2" rx="3.2" />
      <path {...K} d="M3.4 9.1h17.2M3.4 14.9h17.2M9.1 3.4v17.2M14.9 3.4v17.2" />
      <path {...K} d="M4.6 12h14.8" strokeWidth="3.4" opacity="0.55" />
    </Icon>
  );
}

// Finger / pointer used by the how-to-play demo.
export function DragIcon(p) {
  return (
    <Icon {...p}>
      <path {...K} d="M10.2 11.4V6a1.8 1.8 0 0 1 3.6 0v6.4" />
      <path {...K} d="M13.8 11.8a1.7 1.7 0 0 1 3.4 0v1" />
      <path {...K} d="M17.2 12.5a1.7 1.7 0 0 1 3.4 0v3.6a5.1 5.1 0 0 1-5.1 5.1h-2a4.6 4.6 0 0 1-3.4-1.5l-4-4.3a1.8 1.8 0 0 1 2.6-2.4l1.5 1.5" />
    </Icon>
  );
}

/* ── Chrome ─────────────────────────────────────────────────── */

export function PlayIcon({ size = 20, style }) {
  return (
    <Icon size={size} style={style}>
      <path
        d="M9.3 5.6 19 12l-9.7 6.4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Icon>
  );
}

export function CalendarIcon(p) {
  return (
    <Icon {...p}>
      <rect {...K} x="3.4" y="5" width="17.2" height="15.6" rx="3.2" />
      <path {...K} d="M3.4 10h17.2M8.6 3v4M15.4 3v4" />
    </Icon>
  );
}

export function ShareIcon(p) {
  return (
    <Icon {...p}>
      <circle {...K} cx="17.8" cy="5.6" r="2.8" />
      <circle {...K} cx="6.2" cy="12" r="2.8" />
      <circle {...K} cx="17.8" cy="18.4" r="2.8" />
      <path {...K} d="m8.6 13.4 6.8 3.7M15.4 6.9 8.6 10.6" />
    </Icon>
  );
}

export function PhoneIcon(p) {
  return (
    <Icon {...p}>
      <path {...K} d="M6.2 3.4h3.2l1.6 4-2 1.4a12.8 12.8 0 0 0 6.2 6.2l1.4-2 4 1.6v3.2a1.9 1.9 0 0 1-2.1 1.9A17 17 0 0 1 4.3 5.5a1.9 1.9 0 0 1 1.9-2.1Z" />
    </Icon>
  );
}

export function RotateIcon(p) {
  return (
    <Icon {...p}>
      <path {...K} d="M20.2 5v5.4h-5.4" />
      <path {...K} d="M19.6 14.4A8.2 8.2 0 1 1 18.9 7" />
    </Icon>
  );
}

export function ShieldTinyIcon({ size = 13, style }) {
  return (
    <Icon size={size} style={style}>
      <path {...K} strokeWidth="2.4" d="M12 3 5 5.9v5.2c0 4.5 2.9 7.8 7 9.4 4.1-1.6 7-4.9 7-9.4V5.9z" />
    </Icon>
  );
}
