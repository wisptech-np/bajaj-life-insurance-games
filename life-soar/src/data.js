// Game data — classic bubble shooter style.
// Each colour is tied to a real-life risk theme + a Bajaj Life product.
// Match 3+ same-colour bubbles to clear them.

export const COLORS = {
  red:    { id: 'red',    color: '#E60012', colorDeep: '#800000', glow: '#FF6666', theme: 'Health Risk',       product: 'Health Cover' },
  blue:   { id: 'blue',   color: '#0044FF', colorDeep: '#001180', glow: '#66AAFF', theme: 'Income Loss',       product: 'Term Insurance' },
  yellow: { id: 'yellow', color: '#FF9900', colorDeep: '#994C00', glow: '#FFE066', theme: "Child's Education", product: 'Child Plan' },
  green:  { id: 'green',  color: '#00CC33', colorDeep: '#005916', glow: '#66FF99', theme: 'Wealth Goal',       product: 'Savings Plan' },
  purple: { id: 'purple', color: '#8800FF', colorDeep: '#3C0080', glow: '#CC99FF', theme: 'Inflation',         product: 'ULIP' },
  pink:   { id: 'pink',   color: '#FF0088', colorDeep: '#800040', glow: '#FF99CC', theme: 'Retirement',        product: 'Pension Plan' },
};

export const COLOR_KEYS = Object.keys(COLORS);

export const GAME_CONFIG = {
  colors: ['red', 'blue', 'yellow', 'green', 'purple', 'pink'],
  rows: 7,
  shots: 35,
};

