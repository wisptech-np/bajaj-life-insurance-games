// gen-assets.mjs — generate portfolio assets from a manifest via the Higgsfield CLI.
//
// Idempotent by design: an asset whose output file already exists is skipped, so a
// re-run after a partial failure costs nothing. Credits are real money; never make
// re-running the safe thing to do expensive.
//
//   node scripts/gen-assets.mjs docs/asset-manifest.json [--only <substring>] [--dry]

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { tmpdir, homedir } from 'node:os';

const run = promisify(execFile);
const CONCURRENCY = 4;

// Invoke the CLI's JS entrypoint through node directly. Going via the `higgsfield`
// shim needs shell:true on Windows, and the shell then re-splits the prompt on
// spaces into positional args ("Too many positional args"). No shell, no re-parsing.
const CLI_JS =
  process.env.HIGGSFIELD_CLI ??
  join(homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@higgsfield', 'cli', 'bin', 'higgsfield.js');
if (!existsSync(CLI_JS)) {
  console.error(`higgsfield CLI entrypoint not found at ${CLI_JS}\nSet HIGGSFIELD_CLI to its path.`);
  process.exit(1);
}

const [manifestPath, ...flags] = process.argv.slice(2);
if (!manifestPath) {
  console.error('usage: node scripts/gen-assets.mjs <manifest.json> [--only <substr>] [--dry]');
  process.exit(1);
}
const onlyIdx = flags.indexOf('--only');
const only = onlyIdx >= 0 ? flags[onlyIdx + 1] : null;
const dry = flags.includes('--dry');

const repoRoot = resolve(dirname(manifestPath), '..');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const items = manifest.assets.filter((a) => (only ? a.out.includes(only) : true));

// The CLI wants array params as @file.json, and rejects a UTF-8 BOM.
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v), { encoding: 'utf8' });

async function generate(asset) {
  const outPath = resolve(repoRoot, asset.out);
  if (existsSync(outPath)) return { asset, status: 'skipped', outPath };
  if (dry) return { asset, status: 'dry', outPath };

  const model = asset.model ?? manifest.defaults.model;
  const prompt = [asset.prompt, manifest.defaults.style_suffix].filter(Boolean).join(' ');

  const args = ['generate', 'create', model, '--prompt', prompt, '--wait', '--wait-timeout', '5m'];
  for (const [k, v] of Object.entries({ ...manifest.defaults.params, ...asset.params })) {
    if (Array.isArray(v)) {
      const tmp = join(tmpdir(), `hf-${k}-${Math.abs(hash(asset.out))}.json`);
      writeJson(tmp, v);
      args.push(`--${k}`, `@${tmp}`);
    } else {
      args.push(`--${k}`, String(v));
    }
  }

  const { stdout } = await run(process.execPath, [CLI_JS, ...args], { maxBuffer: 1 << 24 });
  let url = stdout.trim().split(/\s+/).find((t) => t.startsWith('http'));
  if (!url) throw new Error(`no URL in CLI output: ${stdout.slice(0, 300)}`);

  // Cutting the background is a second billed job, not a flag on the first one.
  // Chained here so a sprite is one manifest entry rather than two.
  if (asset.removeBg ?? manifest.defaults.removeBg) {
    const jobId = url.match(/_([0-9a-f-]{36})\.\w+$/i)?.[1];
    if (!jobId) throw new Error(`could not read job id from ${url}`);
    const { stdout: bg } = await run(
      process.execPath,
      [CLI_JS, 'generate', 'create', 'image_background_remover', '--image', jobId, '--wait', '--wait-timeout', '5m'],
      { maxBuffer: 1 << 24 },
    );
    const cut = bg.trim().split(/\s+/).find((t) => t.startsWith('http'));
    if (!cut) throw new Error(`background removal produced no URL: ${bg.slice(0, 300)}`);
    url = cut;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} for ${url}`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return { asset, status: 'generated', outPath, url };
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// Fixed-size worker pool — the CLI is a network call per asset, so a few in flight
// is a large speedup, but an unbounded fan-out just gets rate-limited.
const queue = [...items];
const results = [];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const asset = queue.shift();
      try {
        const r = await generate(asset);
        results.push(r);
        console.log(`${r.status.padEnd(9)} ${asset.out}`);
      } catch (err) {
        results.push({ asset, status: 'failed', error: String(err.message ?? err) });
        console.log(`failed    ${asset.out} — ${err.message ?? err}`);
      }
    }
  }),
);

const by = (s) => results.filter((r) => r.status === s).length;
console.log(
  `\n${results.length} assets: ${by('generated')} generated, ${by('skipped')} already present, ${by('failed')} failed`,
);
if (by('failed')) process.exitCode = 1;
