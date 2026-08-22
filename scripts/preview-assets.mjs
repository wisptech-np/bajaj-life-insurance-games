// preview-assets.mjs — render a contact sheet of SVG/PNG assets for visual review.
//
// Generated assets have to be *looked at*, not just diffed. This builds one HTML
// page with every asset on the ink background they actually ship against, plus a
// small-size row so the silhouette test from the style guide can be eyeballed.
//
//   node scripts/preview-assets.mjs <out.html> <file-or-dir> [more...]

import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, extname, basename, resolve } from 'node:path';

const [, , out, ...inputs] = process.argv;
if (!out || inputs.length === 0) {
  console.error('usage: node scripts/preview-assets.mjs <out.html> <file-or-dir>...');
  process.exit(1);
}

const collect = (p) => {
  const s = statSync(p);
  if (s.isDirectory()) {
    return readdirSync(p).flatMap((f) => collect(join(p, f)));
  }
  return ['.svg', '.png', '.webp'].includes(extname(p).toLowerCase()) ? [p] : [];
};

const files = inputs.flatMap((i) => collect(resolve(i))).sort();

const cell = (f) => {
  const name = basename(f);
  // Inline SVGs so they scale to the cell; raster gets a plain <img>.
  let art;
  if (extname(f).toLowerCase() === '.svg') {
    const raw = readFileSync(f, 'utf8')
      .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
      .replace(/\swidth="[^"]*"/, '')
      .replace(/\sheight="[^"]*"/, '');
    art = raw;
  } else {
    art = `<img src="file:///${f.replace(/\\/g, '/')}" alt="">`;
  }
  return `<figure><div class="big">${art}</div><div class="small">${art}</div><figcaption>${name}</figcaption></figure>`;
};

const html = `<!doctype html><meta charset="utf-8"><title>asset preview</title><style>
  body{margin:0;background:#101D2E;font:12px/1.4 'Segoe UI',system-ui,sans-serif;color:#fff;padding:24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px}
  figure{margin:0;background:#18293D;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px;text-align:center}
  .big{height:150px;display:flex;align-items:center;justify-content:center}
  .big svg,.big img{max-width:100%;max-height:150px;height:auto;width:auto}
  .small{height:36px;display:flex;align-items:center;justify-content:center;margin-top:8px;
         border-top:1px dashed rgba(255,255,255,.14);padding-top:8px}
  .small svg,.small img{width:32px;height:32px}
  figcaption{margin-top:8px;color:rgba(255,255,255,.68);word-break:break-all}
</style><div class="grid">${files.map(cell).join('')}</div>`;

writeFileSync(out, html);
console.log(`${files.length} assets -> ${out}`);
