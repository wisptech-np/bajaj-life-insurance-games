// Copy shared/game-kit/ into every game's src/kit/ folder.
//
// The games are deliberately isolated pnpm projects (no workspace), so they
// cannot import from a shared package. Copying keeps each build self-contained
// while leaving one canonical source to edit.
//
// Usage:  node scripts/sync-game-kit.mjs [--check]
//         --check exits non-zero if any copy is stale (for CI).

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'shared', 'game-kit');

const GAMES = [
  'guardian-shelter',
  'secure-journey',
  'smart-match-3d',
  'risk-exit',
  'life-soar',
  'coverage-archer',
  'tightrope-protection',
  'portfolio-fit',
  'spiral-sprint',
  'wealth-drop',
  'steady-tower',
  'goal-orbit',
  'risk-strike',
  'swing-to-secure',
  'milestone-hopper',
  'premium-pinball',
  'cover-drive',
  'goal-keeper',
  'wealth-carrom',
  'wealth-balloon',
  'income-pipeline',
  'smart-sorter',
  'safe-crossing',
  'slide-to-safety',
  'perfect-premium',
  'steady-wings',
  'premium-pulse',
  'smart-recall',
  'life-rush',
  'guardian-arena',
  'premium-tiles',
  'wealth-merge',
  'risk-slash',
  'sip-stack',
  'legacy-echo',
  'ring-fence',
  'risk-radar',
];

const checkOnly = process.argv.includes('--check');

// .jsx as well as .js — the shared screen furniture (screens.jsx) lives here too.
const files = (await readdir(SRC)).filter((f) => f.endsWith('.js') || f.endsWith('.jsx'));
let stale = 0;
let written = 0;

for (const game of GAMES) {
  const gameDir = join(ROOT, game);
  if (!existsSync(gameDir)) {
    console.warn(`skip ${game} (directory missing)`);
    continue;
  }

  // Phaser games (coverage-archer, tightrope-protection) keep sources at the
  // project root rather than under src/.
  const hasSrc = existsSync(join(gameDir, 'src'));
  const destDir = hasSrc ? join(gameDir, 'src', 'kit') : join(gameDir, 'kit');
  await mkdir(destDir, { recursive: true });

  for (const file of files) {
    const from = join(SRC, file);
    const to = join(destDir, file);
    const content = await readFile(from, 'utf8');
    const existing = existsSync(to) ? await readFile(to, 'utf8') : null;

    if (existing === content) continue;

    if (checkOnly) {
      console.error(`STALE ${game}/${hasSrc ? 'src/' : ''}kit/${file}`);
      stale += 1;
    } else {
      await writeFile(to, content, 'utf8');
      written += 1;
    }
  }
}

if (checkOnly) {
  if (stale > 0) {
    console.error(`\n${stale} stale file(s). Run: node scripts/sync-game-kit.mjs`);
    process.exit(1);
  }
  console.log('game-kit copies are up to date.');
} else {
  console.log(`game-kit synced: ${written} file(s) written across ${GAMES.length} games.`);
}
