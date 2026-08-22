// clean-svg.mjs — make a generated SVG shippable.
//
// Recraft returns a 2048x2048 SVG with a C2PA metadata blob, a full-canvas white
// background path, and preserveAspectRatio="none" (which stretches the art when the
// container isn't square). All three have to go before the asset ships.
//
//   node scripts/clean-svg.mjs <file-or-dir>...

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, basename } from 'node:path';

const collect = (p) => {
  if (statSync(p).isDirectory()) return readdirSync(p).flatMap((f) => collect(join(p, f)));
  return extname(p).toLowerCase() === '.svg' ? [p] : [];
};

const files = process.argv.slice(2).flatMap((i) => collect(resolve(i)));
if (files.length === 0) {
  console.error('usage: node scripts/clean-svg.mjs <file-or-dir>...');
  process.exit(1);
}

/** True when the path's coordinates span (nearly) the whole canvas. */
const spansCanvas = (d, w, h) => {
  const n = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  if (!n || n.length < 8) return false;
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  return (
    Math.max(...xs) - Math.min(...xs) >= w * 0.98 &&
    Math.max(...ys) - Math.min(...ys) >= h * 0.98
  );
};

const isWhite = (fill = '') =>
  /rgb\(\s*(2[4-5]\d|25[0-5])\s*,\s*(2[4-5]\d|25[0-5])\s*,\s*(2[4-5]\d|25[0-5])\s*\)/.test(fill) ||
  /^#(f{3}|f{6})$/i.test(fill.trim());

/**
 * A backdrop is either an axis-aligned full-canvas box (the common case) or any
 * white full-canvas shape. Restricting the second rule to white matters: real art
 * can legitimately span the canvas, and dropping it would silently gut the asset.
 */
const isBackdropPath = (d, fill, w, h) => {
  if (!spansCanvas(d, w, h)) return false;
  const n = d.match(/-?\d+(?:\.\d+)?/g).length;
  if (!/[CcSsQqTtAa]/.test(d) && n <= 12) return true;
  return isWhite(fill);
};

let totalBefore = 0;
let totalAfter = 0;

for (const f of files) {
  const before = readFileSync(f, 'utf8');
  totalBefore += Buffer.byteLength(before);

  const vb = before.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const [w, h] = vb ? [Number(vb[1]), Number(vb[2])] : [2048, 2048];

  let s = before
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
    .replace(/\sxmlns:c2pa="[^"]*"/g, '')
    .replace(/\sstyle="display:\s*block;?"/g, '')
    // preserveAspectRatio="none" stretches art in non-square containers.
    .replace(/\spreserveAspectRatio="none"/g, '')
    // Drop intrinsic size so the asset scales to its container; viewBox carries the ratio.
    .replace(/\swidth="\d+(?:\.\d+)?"/, '')
    .replace(/\sheight="\d+(?:\.\d+)?"/, '');

  // Remove opaque full-canvas background paths (white or otherwise).
  s = s.replace(/<path[^>]*\sd="([^"]+)"\s*\/>/g, (m, d) => {
    const fill = m.match(/fill="([^"]*)"/)?.[1] ?? '';
    return isBackdropPath(d, fill, w, h) ? '' : m;
  });

  s = s.replace(/>\s+</g, '><').trim();

  writeFileSync(f, s);
  totalAfter += Buffer.byteLength(s);
  console.log(`${basename(f)}  ${Buffer.byteLength(before)} -> ${Buffer.byteLength(s)} bytes`);
}

console.log(`\ntotal ${totalBefore} -> ${totalAfter} bytes (${Math.round((1 - totalAfter / totalBefore) * 100)}% smaller)`);
