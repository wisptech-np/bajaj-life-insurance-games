export type ScreenName = 'home' | 'howtoplay' | 'game' | 'results' | 'thankyou';

export interface GameResult {
  score: number;              // Total points scored
  won: boolean;               // True when every wave was cleared
  virusesNeutralized: number; // Risk viruses destroyed
  totalViruses: number;       // Total viruses across all waves
  arrowsUsed: number;         // Arrows fired
  accuracy: number;           // Hit accuracy percentage (0-100)
  criticalHits: number;       // Direct core hits (x2)
  bestStreak: number;         // Longest consecutive-hit streak
  wavesCleared: number;       // Fully cleared waves (0-3)
  timeSeconds: number;        // Seconds elapsed in the session
}

export interface HudState {
  score: number;
  arrowsLeft: number;
  timeLeft: number;
  wave: number;
  waveTotal: number;
  virusesLeft: number;
  virusesTotal: number;
  windLevel: number;          // 0..6 strength
  windDir: 'L' | 'R' | 'none';
  streak: number;
  feedback: string;           // transient banner copy ('' = hidden)
}

export interface BookedDetails {
  name: string;
  mobile: string;
  date: string;
  time: string;
  error?: string;
}

export interface LeadDetails {
  name: string;
  mobile: string;
  email?: string;
  leadNo?: string | null;
}
