import { ItemDef } from './types';

// ** Asset Image Placeholders **
// We will draw beautifully styled procedurally generated vector illustrations on the canvas.
// These paths serve as asset handles if users want to override them.
export const imgIntro = 'assets/introImage.webp';

export let BLUE = '#003DA6';
export let ORANGE = '#F26522';
export let GREEN = '#28A745';
export let DARK_BLUE = '#0B1221';

export let GAME_SECS = 60;
export let TARGET_PORTFOLIO = 2000; // Protection Points Target for 100% Score

export let COMPANY_NAME = 'Bajaj Allianz Life Insurance';
export let CALL_NOW_NUMBER = '02261241800';
export let BOOK_SLOT_TIMES: string[] = [];
export let PRIVACY_POLICY_URL = '';
export let DISCLAIMER = '';
export let TC_TEXT = '';

export let SCORING_TAGLINE = '';
export let SCORING_CTA_LINE = '';
export let THANK_YOU_BODY = '';
export let SCORING_BG_IMAGE = '';

// Item definitions with default values, depths, colors, and weights.
export const DEFAULT_ITEM_DEFS: ItemDef[] = [
  // --- GOOD ITEMS ---
  {
    id: 'savings_pouch',
    label: 'Savings Coin Pouch',
    value: 10,
    emoji: '💰',
    kind: 'good',
    depthMin: 0.05,
    depthMax: 0.25,
    color: '#34D399',
    weight: 25
  },
  {
    id: 'family_shield',
    label: 'Family Shield',
    value: 20,
    emoji: '🛡️',
    kind: 'good',
    depthMin: 0.1,
    depthMax: 0.45,
    color: '#60A5FA',
    weight: 20
  },
  {
    id: 'emergency_bag',
    label: 'Emergency Coin Bag',
    value: 50,
    emoji: '👜',
    kind: 'good',
    depthMin: 0.2,
    depthMax: 0.5,
    color: '#10B981',
    weight: 18
  },
  {
    id: 'child_education',
    label: 'Child Education Pearl',
    value: 30,
    emoji: '🦪',
    kind: 'good',
    depthMin: 0.25,
    depthMax: 0.6,
    color: '#A78BFA',
    weight: 15
  },
  {
    id: 'health_crystal',
    label: 'Health Cover Crystal',
    value: 40,
    emoji: '💚',
    kind: 'good',
    depthMin: 0.35,
    depthMax: 0.65,
    color: '#34D399',
    weight: 12
  },
  {
    id: 'retirement_chest',
    label: 'Retirement Treasure',
    value: 60,
    emoji: '🪙',
    kind: 'good',
    depthMin: 0.55,
    depthMax: 0.85,
    color: '#FBBF24',
    weight: 10
  },
  {
    id: 'wealth_growth',
    label: 'Wealth Growth Gem',
    value: 80,
    emoji: '💎',
    kind: 'good',
    depthMin: 0.6,
    depthMax: 0.9,
    color: '#60A5FA',
    weight: 8
  },
  {
    id: 'guaranteed_income',
    label: 'Guaranteed Income Pearl',
    value: 100,
    emoji: '🪐',
    kind: 'good',
    depthMin: 0.8,
    depthMax: 1.0,
    color: '#F59E0B',
    weight: 5
  },

  // --- BAD ITEMS ---
  {
    id: 'medical_debt',
    label: 'Medical Debt Crab',
    value: -25,
    emoji: '🦀',
    kind: 'bad',
    depthMin: 0.1,
    depthMax: 0.35,
    color: '#EF4444',
    weight: 15
  },
  {
    id: 'inflation_jellyfish',
    label: 'Inflation Jellyfish',
    value: -15,
    emoji: '🪼',
    kind: 'bad',
    depthMin: 0.2,
    depthMax: 0.5,
    color: '#F87171',
    weight: 18
  },
  {
    id: 'loan_shark',
    label: 'Loan Shark',
    value: -20,
    emoji: '🦈',
    kind: 'bad',
    depthMin: 0.3,
    depthMax: 0.6,
    color: '#DC2626',
    weight: 12
  },
  {
    id: 'tax_leak',
    label: 'Tax Leak Barrel',
    value: -35,
    emoji: '🛢️',
    kind: 'bad',
    depthMin: 0.45,
    depthMax: 0.75,
    color: '#EF4444',
    weight: 10
  },
  {
    id: 'market_crash',
    label: 'Market Crash Mine',
    value: -50,
    emoji: '💥',
    kind: 'bad',
    depthMin: 0.6,
    depthMax: 0.85,
    color: '#B91C1C',
    weight: 8
  },
  {
    id: 'fraud_piranha',
    label: 'Fraud Piranha',
    value: -30,
    emoji: '🐟',
    kind: 'bad',
    depthMin: 0.4,
    depthMax: 0.8,
    color: '#DC2626',
    weight: 12
  },
  {
    id: 'uninsured_storm',
    label: 'Uninsured Storm Orb',
    value: -100,
    emoji: '⚡',
    kind: 'bad',
    depthMin: 0.75,
    depthMax: 1.0,
    color: '#7F1D1D',
    weight: 6
  }
];

export let ACTIVE_ITEM_DEFS = [...DEFAULT_ITEM_DEFS];

export const SCORE_MESSAGES = [
  {
    minScore: 85,
    title: 'Financial Guardian',
    body: 'Exceptional skill! You maximized protection goals and kept wealth leaks to a minimum. You are ready to safeguard your future.'
  },
  {
    minScore: 65,
    title: 'Wealth Builder',
    body: 'Solid performance! You managed high-yield items and avoided many risks. Continue investing in protection plans to fortify your yields.'
  },
  {
    minScore: 40,
    title: 'Family Protector',
    body: 'A decent start! You secured basic assets, but sudden market leaks and debt sharks caught you off guard. Time to plan a stronger defense.'
  },
  {
    minScore: 0,
    title: 'First Steps',
    body: 'The financial waters move fast. Learning to prioritize savings and cover health risks early is key to navigating life successfully.'
  }
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyConfig(c: Record<string, any>): void {
  if (!c) return;
  BLUE = c.ui.primaryColor || BLUE;
  ORANGE = c.ui.accentColor || ORANGE;
  GREEN = c.ui.successColor || GREEN;

  GAME_SECS = c.gameplay.sessionCapSeconds || GAME_SECS;
  TARGET_PORTFOLIO = c.scoring.targetPortfolio || TARGET_PORTFOLIO;

  COMPANY_NAME = c.contact.companyName || COMPANY_NAME;
  CALL_NOW_NUMBER = c.contact.callNowNumber || CALL_NOW_NUMBER;
  BOOK_SLOT_TIMES = c.contact.bookSlotTimeSlots || BOOK_SLOT_TIMES;
  PRIVACY_POLICY_URL = c.contact.privacyPolicyUrl || '';
  DISCLAIMER = String(c.contact.disclaimer || '').replace('{COMPANY}', COMPANY_NAME.toUpperCase());
  TC_TEXT = String(c.contact.tcText || '').replace('{COMPANY}', COMPANY_NAME);

  SCORING_TAGLINE = c.copy.scoringTagline || SCORING_TAGLINE;
  SCORING_CTA_LINE = c.copy.scoringCtaLine || SCORING_CTA_LINE;
  THANK_YOU_BODY = c.copy.thankYouBody || THANK_YOU_BODY;
  SCORING_BG_IMAGE = c.ui.scoringBgImage || SCORING_BG_IMAGE;
}
