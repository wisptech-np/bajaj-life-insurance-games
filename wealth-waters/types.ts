export enum Screen {
  INTRO = 'INTRO',
  GAME = 'GAME',
  DETAILS = 'DETAILS',
  SCORING = 'SCORING'
}

export interface GameResult {
  portfolio: number;
  gains: number;
  losses: number;
  itemsCaught: number;
  timeSeconds: number;
  rawScore: number; // Final calculated percentage (0 - 100)
}

export interface PlayerInfo {
  name: string;
  mobile: string;
}

export type UpgradeType = 'rod' | 'reel' | 'hook' | 'sonar' | 'magnet';

export interface UpgradeState {
  rod: number;
  reel: number;
  hook: number;
  sonar: number;
  magnet: number;
}

export type ItemKind = 'good' | 'bad';

export interface ItemDef {
  id: string;
  label: string;
  value: number;
  emoji: string;
  kind: ItemKind;
  depthMin: number; // normalized depth range (0.0 = top, 1.0 = bottom of ocean)
  depthMax: number;
  color: string;
  weight: number; // spawn probability weight
}

export interface FishEntity {
  id: number;
  x: number;
  y: number;
  def: ItemDef;
  size: number;
  speed: number;
  dir: number; // -1 = moving left, 1 = moving right
  caught: boolean;
  bob: number;
  bobSpeed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  opacity: number;
}

export type Phase = 'swing' | 'cast' | 'retract';
