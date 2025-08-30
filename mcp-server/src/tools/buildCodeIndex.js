import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { ProjectInfoProvider } from '../core/projectInfo.js';
import { parseFileSymbols } from '../utils/csharpParse.js';

function toRel(abs, projectRoot) {
  const n = abs.replace(/\\/g, '/');
  const base = projectRoot.replace(/\\/g, '/');
  return n.startsWith(base) ? n.substring(base.length + 1) : n;
}

async function* walkFiles(dir) {
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) {
      yield* walkFiles(p);
    } else if (e.isFile()) {
      yield p;
    }
  }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true }).catch(() => {});
}

function toTicksFromMs(ms) {
  // .NET ticks since 0001-01-01: ticks = (unixMs * 10000) + 621355968000000000
  const epochTicks = 621355968000000000n;
  const ticks = BigInt(Math.trunc(ms)) * 10000n + epochTicks;
  return ticks.toString();
}

async function writeIndexFiles(root, relPath, symbols, absPath) {
  const filesDir = path.join(root, 'files');
  await ensureDir(filesDir);
  const safe = relPath.replace(/[\\/]/g, '_');
  const metaPath = path.join(filesDir, safe + '.meta.json');
  const dataPath = path.join(filesDir, safe + '.symbols.json');
  const stat = await fs.stat(absPath).catch(() => null);
  const mtimeMs = stat ? stat.mtimeMs : Date.now();
  const meta = { version: '1', mtime: toTicksFromMs(mtimeMs), path: relPath };
  const data = { path: relPath, symbols };
  await fs.writeFile(metaPath, JSON.stringify(meta));
  await fs.writeFile(dataPath, JSON.stringify(data));
}

async function main() {
  const provider = new ProjectInfoProvider(null);
  const info = await provider.get();
  const projectRoot = info.projectRoot;
  const assetsRoot = info.assetsPath;
  const packagesRoot = info.packagesPath;
  const codeIndexRoot = info.codeIndexRoot;

  const roots = [];
  if (fssync.existsSync(assetsRoot)) roots.push(assetsRoot);
  if (fssync.existsSync(packagesRoot)) roots.push(packagesRoot);

  let total = 0;
  let indexed = 0;
  for (const root of roots) {
    for await (const abs of walkFiles(root)) {
      if (!abs.toLowerCase().endsWith('.cs')) continue;
      total++;
      const rel = toRel(abs, projectRoot);
      const text = await fs.readFile(abs, 'utf8').catch(() => null);
      if (!text) continue;
      const parsed = parseFileSymbols(rel, text);
      if (!parsed || !Array.isArray(parsed.symbols)) continue;
      await writeIndexFiles(codeIndexRoot, rel, parsed.symbols, abs).catch(() => {});
      indexed++;
    }
  }
  console.log(JSON.stringify({ success: true, projectRoot, codeIndexRoot, totalFiles: total, indexedFiles: indexed }));
}

main().catch(err => {
  console.error(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});
