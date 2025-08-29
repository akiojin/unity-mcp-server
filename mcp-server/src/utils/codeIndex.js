import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { parseFileSymbols } from './csharpParse.js';

export async function loadFileSymbolsFromIndex(codeIndexRoot, relPath) {
  const filesDir = path.join(codeIndexRoot, 'files');
  const safe = relPath.replace(/[\\/]/g, '_');
  const metaPath = path.join(filesDir, safe + '.meta.json');
  const dataPath = path.join(filesDir, safe + '.symbols.json');
  try {
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
    const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
    if (meta && data) return data; // data has { path, symbols }
  } catch {}
  return null;
}

export async function* iterateIndexedFiles(codeIndexRoot) {
  const filesDir = path.join(codeIndexRoot, 'files');
  let entries = [];
  try { entries = await fs.readdir(filesDir); } catch { return; }
  for (const name of entries) {
    if (!name.endsWith('.meta.json')) continue;
    const base = name.slice(0, -('.meta.json'.length));
    const metaPath = path.join(filesDir, name);
    const dataPath = path.join(filesDir, base + '.symbols.json');
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
      if (meta && data && data.symbols) {
        const relPath = meta.path || data.path;
        yield { relPath, symbols: data.symbols };
      }
    } catch {}
  }
}

export async function loadFileSymbolsWithFallback(projectRoot, codeIndexRoot, relPath) {
  const idx = await loadFileSymbolsFromIndex(codeIndexRoot, relPath);
  if (idx) return idx;
  // Fallback to quick parse
  const abs = path.join(projectRoot, relPath);
  const text = await fs.readFile(abs, 'utf8');
  return parseFileSymbols(relPath, text);
}

export async function* findSymbols(projectRoot, codeIndexRoot, roots, { name, kind, exact = false, limit = 200 }) {
  // Prefer index if present, otherwise walk files
  const hasIndex = fssync.existsSync(path.join(codeIndexRoot, 'files'));
  let count = 0;
  if (hasIndex) {
    for await (const item of iterateIndexedFiles(codeIndexRoot)) {
      for (const s of item.symbols) {
        if (kind && s.kind !== kind) continue;
        const match = exact ? s.name === name : (s.name || '').toLowerCase().includes(name.toLowerCase());
        if (!match) continue;
        yield { path: item.relPath, symbol: s };
        count++; if (count >= limit) return;
      }
    }
    return;
  }
  // Walk roots for .cs and parse minimally
  const seen = new Set();
  for (const root of roots) {
    for await (const abs of walkFiles(root)) {
      if (count >= limit) break;
      if (!abs.toLowerCase().endsWith('.cs')) continue;
      const rel = toRel(abs, projectRoot);
      if (seen.has(rel)) continue;
      seen.add(rel);
      const text = await fs.readFile(abs, 'utf8').catch(() => null);
      if (!text) continue;
      const fsym = parseFileSymbols(rel, text);
      for (const s of fsym.symbols) {
        if (kind && s.kind !== kind) continue;
        const match = exact ? s.name === name : (s.name || '').toLowerCase().includes(name.toLowerCase());
        if (!match) continue;
        yield { path: rel, symbol: s };
        count++; if (count >= limit) break;
      }
    }
    if (count >= limit) break;
  }
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

function toRel(abs, projectRoot) {
  const n = abs.replace(/\\/g, '/');
  const base = projectRoot.replace(/\\/g, '/');
  return n.startsWith(base) ? n.substring(base.length + 1) : n;
}
