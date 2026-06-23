export enum Screen {
  INTRO = 'INTRO',
  GAME = 'GAME',
  DETAILS = 'DETAILS',
  SCORING = 'SCORING',
}

export interface GameResult {
  score: number;       // Final percentage (0-100)
  distance: number;    // Running distance
  coins: number;       // Rupees collected
  shieldHits: number;  // Collisions absorbed by shield
  riskHits: number;    // Unprotected collisions
  timeSeconds: number;
}

export interface PlayerInfo {
  name: string;
  mobile: string;
  email?: string;
}
