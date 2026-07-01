export enum Screen {
  INTRO = 'INTRO',
  GAME = 'GAME',
  DETAILS = 'DETAILS',
  SCORING = 'SCORING',
}

export interface GameResult {
  score: number;             // Final percentage (0-100)
  arrowsLeft: number;        // Arrows remaining at the end
  virusesNeutralized: number; // Count of risk viruses neutralized
  familyShieldPct: number;    // Final integrity percentage of family shield (0-100)
  level: number;             // Final level reached
  timeSeconds: number;
}

export interface PlayerInfo {
  name: string;
  mobile: string;
  email?: string;
}
