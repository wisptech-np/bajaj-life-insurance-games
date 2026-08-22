// audit-assets.mjs — per-game asset and review-rule audit across the whole portfolio.
//
// Layout-agnostic on purpose: an earlier pass filtered on `src/` and silently
// skipped the two Phaser titles, which is exactly the kind of gap an audit is
// supposed to catch. This walks every game directory whatever its shape.
//
//   node scripts/audit-assets.mjs [--md docs/ASSET_AUDIT.md]

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, relative } from 'node:path';

const ROOT = resolve(process.argv[1], '..', '..');
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', 'docs', 'scripts', 'shared',
  'log_archives', 'okf-brain', '.agents', '.claude', '.superpowers', '.vscode',
]);
const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif']);
const AUDIO_EXT = new Set(['.mp3', '.ogg', '.wav', '.webm', '.m4a']);

// play-test.mjs drops viewport screenshots next to each game. They are gitignored
// test artifacts, not shipped art — counting them inflates the art figure ~25x.
const NOT_ART = /(^|[\\/])playtest-[^\\/]*\.png$/i;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name), out);
    } else {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

// Pictographic emoji, excluding the plain-text ranges that show up in ordinary source.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F02F}]/gu;

// The review banned emoji *as game assets*. Counting every glyph lumps 35 identical
// lead-form checkbox ticks in with the handful of real violations and makes the
// finding useless, so those and comment lines are excluded.
const GLYPH_EXEMPT = /sl-lead-checkbox-tick|^\s*(\/\/|\*|\/\*)/;

const HOWTO = /how\s*to\s*play|tap\s+to\s+start|swipe\s+to|drag\s+to|instructions?/i;
const EMAIL_FIELD = /type=["']email["']|name=["']email["']|\bemail\b\s*:/i;
const ONTAP = /\bonTap\b/;

const games = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name))
  .map((e) => e.name)
  .sort();

const rows = games.map((name) => {
  const dir = join(ROOT, name);
  const files = walk(dir);

  const code = files.filter((f) => CODE_EXT.has(extname(f).toLowerCase()));
  const images = files.filter(
    (f) => IMG_EXT.has(extname(f).toLowerCase()) && !NOT_ART.test(f),
  );
  const audio = files.filter((f) => AUDIO_EXT.has(extname(f).toLowerCase()));

  let loc = 0;
  let drawImage = 0;
  let primitives = 0;
  let emojiHits = 0;
  const flags = new Set();

  for (const f of code) {
    let src;
    try {
      src = readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const lines = src.split('\n');
    loc += lines.length;
    drawImage += (src.match(/\.drawImage\(/g) ?? []).length;
    primitives += (src.match(/\.(fillRect|arc|roundRect|ellipse|createLinearGradient|createRadialGradient)\(/g) ?? []).length;
    for (const line of lines) {
      if (GLYPH_EXEMPT.test(line)) continue;
      emojiHits += (line.match(EMOJI) ?? []).length;
    }
    if (HOWTO.test(src)) flags.add('howto-text');
    if (EMAIL_FIELD.test(src)) flags.add('email-field');
    if (ONTAP.test(src)) flags.add('onTap');
  }
  if (emojiHits) flags.add(`emoji:${emojiHits}`);

  const imgBytes = images.reduce((n, f) => n + statSync(f).size, 0);
  const audioBytes = audio.reduce((n, f) => n + statSync(f).size, 0);

  return {
    game: name,
    loc,
    drawImage,
    primitives,
    images: images.length,
    imgKB: Math.round(imgBytes / 1024),
    audio: audio.length,
    audioKB: Math.round(audioBytes / 1024),
    flags: [...flags],
    imageList: images.map((f) => relative(dir, f)),
  };
});

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

console.log(
  pad('game', 22) + lpad('LOC', 7) + lpad('draw', 6) + lpad('prim', 6) +
  lpad('imgs', 6) + lpad('KB', 7) + lpad('sfx', 5) + '  flags',
);
for (const r of rows) {
  console.log(
    pad(r.game, 22) + lpad(r.loc, 7) + lpad(r.drawImage, 6) + lpad(r.primitives, 6) +
    lpad(r.images, 6) + lpad(r.imgKB, 7) + lpad(r.audio, 5) + '  ' + r.flags.join(' '),
  );
}

const tot = (k) => rows.reduce((n, r) => n + r[k], 0);
console.log(
  `\n${rows.length} games | ${tot('loc').toLocaleString()} LOC | ` +
  `${tot('images')} images (${tot('imgKB')} KB) | ${tot('audio')} audio files | ` +
  `drawImage ${tot('drawImage')} vs primitives ${tot('primitives')}`,
);
console.log(`games shipping zero images: ${rows.filter((r) => r.images === 0).length}`);
console.log(`games shipping zero audio files: ${rows.filter((r) => r.audio === 0).length}`);

const mdIdx = process.argv.indexOf('--md');
if (mdIdx >= 0) {
  const out = process.argv[mdIdx + 1];
  const lines = [
    '# Per-Game Asset Audit',
    '',
    `Generated by \`scripts/audit-assets.mjs\` — ${rows.length} games, layout-agnostic.`,
    '',
    '| Game | LOC | drawImage | primitives | images | img KB | audio | review-rule flags |',
    '|---|--:|--:|--:|--:|--:|--:|---|',
    ...rows.map(
      (r) =>
        `| \`${r.game}\` | ${r.loc} | ${r.drawImage} | ${r.primitives} | ${r.images} | ${r.imgKB} | ${r.audio} | ${r.flags.join(', ') || '—'} |`,
    ),
    '',
    '**Totals** — ' +
      `${tot('loc').toLocaleString()} LOC, ${tot('images')} images (${tot('imgKB')} KB), ` +
      `${tot('audio')} audio files, ${tot('drawImage')} \`drawImage\` vs ${tot('primitives')} primitive calls. ` +
      `${rows.filter((r) => r.images === 0).length} games ship zero images; ` +
      `${rows.filter((r) => r.audio === 0).length} ship zero audio files.`,
    '',
    '## Image files present, by game',
    '',
    ...rows.flatMap((r) =>
      r.images === 0 ? [] : [`- **${r.game}** — ${r.imageList.map((f) => `\`${f}\``).join(', ')}`],
    ),
  ];
  writeFileSync(resolve(ROOT, out), lines.join('\n') + '\n');
  console.log(`\nwrote ${out}`);
}
