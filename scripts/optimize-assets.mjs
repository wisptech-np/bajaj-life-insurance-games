// optimize-assets.mjs — downscale and re-encode generated art to shippable WebP.
//
// Generated sprites land as 2K PNGs of 3-6 MB. The style guide budget is 700 KB
// of art per game, so they cannot ship as-is. Authoring big and downscaling is
// correct; shipping big is not.
//
// Requires sharp:  npm i -D sharp
//
//   node scripts/optimize-assets.mjs <out-dir> <file.png>...
//   node scripts/optimize-assets.mjs --width 512 --quality 88 <out-dir> <file>...

import { mkdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error('sharp is required:  npm i -D sharp');
  process.exit(1);
}

const argv = process.argv.slice(2);
const numFlag = (name, dflt) => {
  const i = argv.indexOf(name);
  if (i < 0) return dflt;
  const v = Number(argv[i + 1]);
  argv.splice(i, 2);
  return Number.isFinite(v) ? v : dflt;
};

// 512 on the long edge covers a 2x sprite in a 390px-wide portrait frame.
const width = numFlag('--width', 512);
const quality = numFlag('--quality', 88);

// Keying a flat backdrop out locally costs nothing; the hosted background
// remover is a second billed job per sprite. Only works when the subject was
// generated against a plain flat colour — which is what our prompts ask for.
const keyBg = argv.includes('--key-bg');
if (keyBg) argv.splice(argv.indexOf('--key-bg'), 1);
const keyTolerance = numFlag('--key-tolerance', 38);

const [outDir, ...files] = argv;
if (!outDir || files.length === 0) {
  console.error('usage: node scripts/optimize-assets.mjs [--width N] [--quality N] <out-dir> <file>...');
  process.exit(1);
}
mkdirSync(resolve(outDir), { recursive: true });

let before = 0;
let after = 0;

for (const f of files) {
  const src = resolve(f);
  const out = join(resolve(outDir), basename(f, extname(f)) + '.webp');
  const inBytes = statSync(src).size;

  let pipeline = sharp(src);

  if (keyBg) {
    // Sample the corner for the backdrop colour, then clear alpha on every pixel
    // within tolerance of it. Flood-fill would be safer against subjects that
    // contain the backdrop colour, but for centred sprites on a plain field this
    // is enough and keeps the whole pass local.
    // ponytail: distance threshold, not flood fill — revisit if a sprite loses interior pixels.
    const { data, info } = await pipeline
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const [br, bg2, bb] = [data[0], data[1], data[2]];
    for (let i = 0; i < data.length; i += info.channels) {
      const d = Math.hypot(data[i] - br, data[i + 1] - bg2, data[i + 2] - bb);
      if (d <= keyTolerance) data[i + 3] = 0;
    }
    pipeline = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
  }

  // fit:'inside' + withoutEnlargement keeps aspect and never upscales.
  await pipeline
    .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
    .trim() // generated sprites carry transparent margin; crop it so the art fills the frame
    .webp({ quality, alphaQuality: 100, effort: 6 })
    .toFile(out);

  const outBytes = statSync(out).size;
  before += inBytes;
  after += outBytes;
  console.log(
    `${basename(f).padEnd(30)} ${(inBytes / 1024).toFixed(0).padStart(6)} KB -> ${(outBytes / 1024).toFixed(0).padStart(5)} KB  ${basename(out)}`,
  );
}

console.log(
  `\n${files.length} files: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024).toFixed(0)} KB ` +
  `(${Math.round((1 - after / before) * 100)}% smaller)`,
);
