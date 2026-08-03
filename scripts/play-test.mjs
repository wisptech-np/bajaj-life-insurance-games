// play-test.mjs — drive a built game through a real browser at handset sizes.
//
// The per-game `scripts/balance.mjs` gates prove the RULES are fair. They say
// nothing about whether the thing a reviewer opens on a phone actually plays:
// both games reported as "not working" in the 2026-08-03 review built clean and
// passed their balance gates. What they did was end the run in 11 and 18
// seconds. This is the check that catches that class of defect.
//
//   node scripts/play-test.mjs <game-dir> [--seconds 150] [--all-sizes]
//
// Requires a Chrome or Edge install and `puppeteer-core` (npm i -D puppeteer-core
// at the repo root). Serves <game-dir>/dist, so run the game's build first.
//
// Reports, per viewport: console/page errors, whether the canvas mounted and
// painted, how long a random-input bot survives, whether the results screen and
// the retry path work, and writes a screenshot next to the output.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

// The sizes the review asks about: the smallest handset still supported, a
// common mid-size, a large one, and a large one with browser chrome open.
const VIEWPORTS = [
  { name: 'iPhone SE   320x568', width: 320, height: 568 },
  { name: 'iPhone 12   390x844', width: 390, height: 844 },
  { name: 'Pixel 7     412x915', width: 412, height: 915 },
  { name: 'chrome open 412x700', width: 412, height: 700 },
];

const args = process.argv.slice(2);
const game = args.find((a) => !a.startsWith('--'));
const seconds = Number(args[args.indexOf('--seconds') + 1]) || 150;
const allSizes = args.includes('--all-sizes');
if (!game) {
  console.error('usage: node scripts/play-test.mjs <game-dir> [--seconds N] [--all-sizes]');
  process.exit(2);
}

const dist = join(ROOT, game, 'dist');
if (!existsSync(dist)) {
  console.error(`no build at ${dist} — run the game's build first`);
  process.exit(2);
}

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('no Chrome or Edge found; add its path to CHROME_CANDIDATES');
  process.exit(2);
}

const { default: puppeteer } = await import('puppeteer-core');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = join(dist, normalize(url === '/' ? '/index.html' : url));
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;

for (const vp of allSizes ? VIEWPORTS : [VIEWPORTS[1]]) {
  const page = await browser.newPage();
  await page.setViewport({ ...vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  const errors = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });

  // The LMS host is unreachable from a test run; stub it so the lead path still
  // executes rather than failing for a reason that is not the game's fault.
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith('http://127.0.0.1') && !url.includes('fonts.g')) {
      r.respond({ status: 200, contentType: 'application/json', body: '{"LeadNo":"TEST"}' });
    } else r.continue();
  });

  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await wait(600);

  const click = (...words) => page.evaluate((w) => {
    const el = [...document.querySelectorAll('button')]
      .find((e) => w.some((x) => (e.textContent || '').toLowerCase().includes(x)));
    if (!el) return null;
    el.click();
    return (el.textContent || '').trim();
  }, words);
  const buttons = () => page.evaluate(() =>
    [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean));

  // Games word their CTA differently ("Take Strike", "Enter the Field"). Matching
  // only on play/start silently skipped cover-drive entirely — the harness
  // reported "canvas: NONE" at every size and tested nothing. Fall back to the
  // last button on screen, which is the primary CTA in this repo's screen layout.
  const CTA = ['start', 'play', 'begin', 'got it', 'take', 'enter', 'go', 'next', 'continue'];
  const clickCta = async (label) => {
    const hit = await click(...CTA) || await page.evaluate(() => {
      const els = [...document.querySelectorAll('button')]
        .filter((e) => (e.textContent || '').trim() && e.offsetParent !== null);
      const el = els[els.length - 1];
      if (!el) return null;
      el.click();
      return `${(el.textContent || '').trim()} (fallback: last button)`;
    });
    notes.push(`${label}: ${hit || 'NO BUTTON'}`);
    return hit;
  };

  const notes = [];
  await clickCta('start');
  await wait(700);
  await clickCta('howto');
  await wait(1200);

  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  notes.push(`canvas: ${box ? `${Math.round(box.w)}x${Math.round(box.h)}` : 'NONE — game never mounted'}`);

  // A canvas that mounted but paints nothing is the other classic "not working".
  if (box) {
    const painted = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      let lit = 0;
      let n = 0;
      for (let i = 3; i < data.length; i += 4 * 97) { n++; if (data[i] > 8) lit++; }
      return ((lit / n) * 100).toFixed(1);
    });
    notes.push(`painted: ${painted}% of sampled pixels`);
  }

  // Random taps and swipes until an end-state button appears.
  const END = ['play again', 'try again', 'retry'];
  let ended = null;
  const t0 = Date.now();
  while (!ended && (Date.now() - t0) / 1000 < seconds && box) {
    const cx = box.x + box.w * (0.25 + Math.random() * 0.5);
    const cy = box.y + box.h * (0.3 + Math.random() * 0.45);
    if (Math.random() < 0.5) {
      await page.touchscreen.tap(cx, cy);
    } else {
      await page.touchscreen.touchStart(cx, cy);
      const dx = (Math.random() < 0.5 ? -1 : 1) * 80;
      const dy = Math.random() < 0.3 ? 80 : 0;
      for (let k = 1; k <= 4; k++) await page.touchscreen.touchMove(cx + (dx * k) / 4, cy + (dy * k) / 4);
      await page.touchscreen.touchEnd();
    }
    await wait(320);
    ended = (await buttons()).map((b) => b.toLowerCase()).find((b) => END.some((e) => b.includes(e))) || null;
  }

  const survived = ((Date.now() - t0) / 1000).toFixed(0);
  notes.push(ended
    ? `run ended after ${survived}s at "${ended}"`
    : `run still going after ${seconds}s (no end state reached)`);

  if (ended) {
    notes.push(`retry: ${await click(...END)}`);
    await wait(1500);
    notes.push(`canvas back after retry: ${await page.evaluate(() => !!document.querySelector('canvas'))}`);
  }

  const shot = join(ROOT, game, `playtest-${vp.width}x${vp.height}.png`);
  await page.screenshot({ path: shot });

  // Hard failures: the game threw, or never mounted a canvas. Those are always
  // defects. A short run is only a SMELL — this bot swipes at random, so a game
  // that punishes random input correctly will die fast and should. The game's
  // own scripts/balance.mjs is the authority on whether a real player can win;
  // this line just tells you where to go look.
  const bad = errors.length > 0 || !box;
  const short = ended && Number(survived) < 20;
  if (bad) failed++;
  console.log(`\n=== ${game} @ ${vp.name} — ${bad ? 'FAIL' : short ? 'check balance.mjs' : 'ok'} ===`);
  notes.forEach((n) => console.log('  ' + n));
  if (short) console.log('  note: random-input run under 20s — confirm the casual bot in scripts/balance.mjs still wins');
  if (errors.length) [...new Set(errors)].slice(0, 8).forEach((e) => console.log('  ' + e));
  console.log(`  shot: ${shot}`);
  await page.close();
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
