// game-meta.js — per-title screen copy, in one place.
//
// The How to Play screen needs a single-line objective and the results screen
// needs one line of advisor copy. Keeping all 37 in one file is what stops them
// drifting into 37 different voices, which is how the portfolio got here.
//
// scoreMode:
//   'points'  — a real score worth showing as a number
//   'percent' — completion or accuracy reads better as a percentage
//   'yesno'   — the run is solved or it isn't; a number would be dressed up

export const GAME_META = {
  'guardian-shelter':     { goal: 'Place your shields so every family member survives the drop.', scoreMode: 'points', target: 1000 },
  'secure-journey':       { goal: 'Grow your column and reach the end before the virus tide does.', scoreMode: 'points', target: 1500 },
  'smart-match-3d':       { goal: 'Match three of the same life goal to clear the board before time runs out.', scoreMode: 'points', target: 1000 },
  'risk-exit':            { goal: 'Slide the blocks aside and get your shield out of the grid.', scoreMode: 'yesno' },
  'life-soar':            { goal: 'Glide as far as you can, collecting cover and dodging the virus.', scoreMode: 'points', target: 1200 },
  'coverage-archer':      { goal: 'Hit every virus target before it reaches your family.', scoreMode: 'points', target: 1000 },
  'tightrope-protection': { goal: 'Stay balanced on the wire and reach the far end.', scoreMode: 'points', target: 800 },
  'portfolio-fit':        { goal: 'Fit every block into the grid without running out of room.', scoreMode: 'points', target: 1200 },
  'spiral-sprint':        { goal: 'Descend as deep as you can without touching a green risk zone.', scoreMode: 'points', target: 1000 },
  'wealth-drop':          { goal: 'Drop the ball and land it in the highest-value slot.', scoreMode: 'points', target: 1000 },
  'steady-tower':         { goal: 'Remove blocks without toppling the tower.', scoreMode: 'points', target: 800 },
  'goal-orbit':           { goal: 'Switch orbits at the right moment to keep circling your goal.', scoreMode: 'points', target: 1000 },
  'risk-strike':          { goal: 'Knock down every pin in as few shots as you can.', scoreMode: 'points', target: 600 },
  'swing-to-secure':      { goal: 'Swing rope to rope and cross the gap without falling.', scoreMode: 'points', target: 1000 },
  'milestone-hopper':     { goal: 'Cross the lanes and reach the next milestone without touching a virus.', scoreMode: 'points', target: 1000 },
  'premium-pinball':      { goal: 'Keep the ball in play and run the score as high as you can.', scoreMode: 'points', target: 2000 },
  'cover-drive':          { goal: 'Time your shot and score off every ball.', scoreMode: 'points', target: 1000 },
  'goal-keeper':          { goal: 'Renew your cover before each event locks it out.', scoreMode: 'points', target: 1000 },
  'wealth-carrom':        { goal: 'Pocket every goal coin before your opponent does.', scoreMode: 'points', target: 800 },
  'wealth-balloon':       { goal: 'Fund the right goals before the forecast shock lands.', scoreMode: 'points', target: 1000 },
  'income-pipeline':      { goal: 'Rotate the pipes to route every rupee to its goal.', scoreMode: 'yesno' },
  'smart-sorter':         { goal: 'Sort each item into protect, grow or bin before it drops.', scoreMode: 'points', target: 1000 },
  'safe-crossing':        { goal: 'Wave the traffic through without causing a collision.', scoreMode: 'points', target: 1000 },
  'slide-to-safety':      { goal: 'Slide your shield to the exit without breaking through thin ice.', scoreMode: 'yesno' },
  'perfect-premium':      { goal: 'Hold your cover at the right level as the risk moves.', scoreMode: 'percent' },
  'steady-wings':         { goal: 'Tap to fly through every gate without clipping one.', scoreMode: 'points', target: 1000 },
  'premium-pulse':        { goal: 'Tap on the beat and never miss a premium.', scoreMode: 'percent' },
  'smart-recall':         { goal: 'Repeat the sequence in the exact order it was shown.', scoreMode: 'percent' },
  'life-rush':            { goal: 'Finish each five-second challenge before the timer runs out.', scoreMode: 'points', target: 1000 },
  'guardian-arena':       { goal: 'Survive every wave and pick the upgrade that keeps you standing.', scoreMode: 'points', target: 1500 },
  'premium-tiles':        { goal: 'Tap the falling tiles in time and never miss one.', scoreMode: 'points', target: 1000 },
  'wealth-merge':         { goal: 'Drop and merge matching goals to build the biggest one.', scoreMode: 'points', target: 1500 },
  'risk-slash':           { goal: 'Slice every virus and spare the shields.', scoreMode: 'points', target: 1000 },
  'sip-stack':            { goal: 'Stack each layer as precisely as you can and build the tallest tower.', scoreMode: 'points', target: 1000 },
  'legacy-echo':          { goal: 'Work alongside your past runs to collect everything in time.', scoreMode: 'points', target: 1000 },
  'ring-fence':           { goal: 'Claim ground and wall the virus out of your territory.', scoreMode: 'percent' },
  'risk-radar':           { goal: 'Pulse the radar to find the path and reach the exit in the dark.', scoreMode: 'yesno' },
};

/** Advisor line on the results screen. One shared default; override per title. */
export const DEFAULT_RM_MESSAGE =
  "A simple conversation can protect everything you're building";

export const RM_MESSAGE = {
  'smart-match-3d': 'A simple conversation can protect every goal you just matched',
  'cover-drive': 'Life bowls the unplayable ball eventually. A specialist can set your cover so one delivery never ends the innings.',
  'guardian-shelter': 'The shields you placed here take one conversation to place for real',
  'life-soar': 'A specialist can keep you gliding when the air turns rough',
  'coverage-archer': 'Every risk you just hit is one a specialist can cover for real',
  'wealth-drop': 'Markets bounce both ways. A specialist can show you how cover keeps your goals funded either way.',
  'portfolio-fit': 'A specialist can show you which gaps your plan still has room for',
  'steady-tower': 'De-risking is easier with someone who knows which block to pull',
  'milestone-hopper': 'Every milestone ahead is easier to reach with cover behind it',
};

export function metaFor(directory) {
  return {
    goal: '',
    scoreMode: 'points',
    target: 1000,
    ...(GAME_META[directory] || {}),
    rmMessage: RM_MESSAGE[directory] || DEFAULT_RM_MESSAGE,
  };
}
