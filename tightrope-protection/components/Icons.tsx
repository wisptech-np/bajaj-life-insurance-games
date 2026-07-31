import React from 'react';

/**
 * Inline SVG glyph set for Tightrope Protection.
 * Shape language: long taut horizontals (rope, balance pole), tall thin
 * figures, height ticks. No emoji anywhere in the UI.
 */

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
});

/** The signature mark — a balance pole resting on a rope. */
export const PoleIcon: React.FC<IconProps> = ({ size = 18, color = '#F26522', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M2 9h20" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="3" cy="9" r="2.1" fill={color} />
    <circle cx="21" cy="9" r="2.1" fill={color} />
    <path d="M12 9v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
  </svg>
);

/** Walking figure carrying the pole — used as a marker on the progress rope. */
export const WalkerIcon: React.FC<IconProps> = ({ size = 20, color = '#EDF3FF', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M3 8h18" stroke="#F26522" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="4.4" r="2.2" fill={color} />
    <path d="M12 6.6v6.4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M12 8.4 6 8M12 8.4l6-.4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 13 9 20M12 13l3 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const CoinIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9.2" fill="#E8A317" />
    <circle cx="12" cy="12" r="7" fill="#FFC845" />
    <path
      d="M9 7.6h6M9 10.2h6M13.6 7.6c1.4 0 2 .9 2 2 0 1.3-1 2.3-2.6 2.3H9.6l4.2 4.5"
      stroke="#8A5A05"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 18, color = '#2E9BFF', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path
      d="M12 2.6 20 5.4v6.1c0 4.6-3.2 8.4-8 9.9-4.8-1.5-8-5.3-8-9.9V5.4l8-2.8Z"
      fill={color}
    />
    <path
      d="m8.3 12 2.6 2.6L15.9 9.6"
      stroke="#fff"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Risk gust — a crimson vortex curl. */
export const GustIcon: React.FC<IconProps> = ({ size = 18, color = '#FF6B84', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path
      d="M3 8h9.5a2.8 2.8 0 1 0-2.8-2.8"
      stroke={color}
      strokeWidth="2.1"
      strokeLinecap="round"
    />
    <path
      d="M3 13h13a3 3 0 1 1-3 3"
      stroke={color}
      strokeWidth="2.1"
      strokeLinecap="round"
    />
    <path d="M4 18h6" stroke={color} strokeWidth="2.1" strokeLinecap="round" opacity="0.6" />
  </svg>
);

/** Pointing finger used in the how-to-play loop. */
export const HandIcon: React.FC<IconProps> = ({ size = 30, className }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path
      d="M13 18V7.5a2.2 2.2 0 0 1 4.4 0V15m0-1.6a2.1 2.1 0 0 1 4.2 0v2m0-1.2a2.1 2.1 0 0 1 4.2 0v6.6c0 4.4-3 7.7-7.6 7.7-4.2 0-6.6-2-8.2-5.4l-2.6-5.4a2.2 2.2 0 0 1 3.7-2.3L13 19"
      fill="#EDF3FF"
      stroke="#04122B"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SoundOnIcon: React.FC<IconProps> = ({ size = 20, color = '#EDF3FF', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" fill={color} />
    <path d="M15.4 9a4.2 4.2 0 0 1 0 6M18 6.4a7.8 7.8 0 0 1 0 11.2" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const SoundOffIcon: React.FC<IconProps> = ({ size = 20, color = '#7E97BB', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" fill={color} />
    <path d="m16 9.5 5 5m0-5-5 5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ShareIcon: React.FC<IconProps> = ({ size = 19, color = '#fff', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <circle cx="18" cy="5.2" r="2.9" stroke={color} strokeWidth="2" />
    <circle cx="6" cy="12" r="2.9" stroke={color} strokeWidth="2" />
    <circle cx="18" cy="18.8" r="2.9" stroke={color} strokeWidth="2" />
    <path d="m8.6 10.6 6.8-3.9M8.6 13.4l6.8 3.9" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ size = 19, color = '#04122B', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path
      d="M6.4 3.5h3l1.5 3.8-1.9 1.4a11.5 11.5 0 0 0 5.3 5.3l1.4-1.9 3.8 1.5v3a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.4 5.7a2 2 0 0 1 2-2.2Z"
      fill={color}
    />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 19, color = '#fff', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <rect x="3.2" y="5" width="17.6" height="16" rx="2.6" stroke={color} strokeWidth="2" />
    <path d="M3.2 9.8h17.6M8 3v4M16 3v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="13" width="3.4" height="3.4" rx="1" fill={color} />
  </svg>
);

export const RotateIcon: React.FC<IconProps> = ({ size = 18, color = '#A9C2E8', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path
      d="M20 12a8 8 0 1 1-2.6-5.9"
      stroke={color}
      strokeWidth="2.1"
      strokeLinecap="round"
    />
    <path d="M20 3v5h-5" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 16, color = '#28A745', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="m4.5 12.5 5 5 10-11" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = 13, color = '#7E97BB', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" fill={color} />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 18, color = '#A9C2E8', className }) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
