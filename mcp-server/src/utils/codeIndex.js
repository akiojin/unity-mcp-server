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
  const indexedPaths = new Set();
  if (hasIndex) {
    for await (const item of iterateIndexedFiles(codeIndexRoot)) {
      indexedPaths.add(item.relPath);
      for (const s of item.symbols) {
        if (kind && s.kind !== kind) continue;
        const match = exact ? s.name === name : (s.name || '').toLowerCase().includes(name.toLowerCase());
        if (!match) continue;
        yield { path: item.relPath, symbol: s };
        count++; if (count >= limit) return;
      }
    }
    // Do not return yet; continue to scan roots for files not present in index (e.g., Packages)
  }
  // Walk roots for .cs and parse minimally
  const seen = new Set();
  for (const root of roots) {
    for await (const abs of walkFiles(root)) {
      if (count >= limit) break;
      if (!abs.toLowerCase().endsWith('.cs')) continue;
      const rel = toRel(abs, projectRoot);
      if (seen.has(rel)) continue;
      if (indexedPaths.has(rel)) continue;
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

export async function findReferences(projectRoot, roots, { name, snippetContext = 2, maxMatchesPerFile = 5, pageSize = 50, maxBytes = 64 * 1024 }) {
  const results = [];
  let bytes = 0;
  const rx = new RegExp(`\\b${escapeRegex(name)}\\b`);
  for (const root of roots) {
    for await (const abs of walkFiles(root)) {
      if (results.length >= pageSize || bytes >= maxBytes) return { results, truncated: true };
      if (!abs.toLowerCase().endsWith('.cs')) continue;
      const rel = toRel(abs, projectRoot);
      const text = await fs.readFile(abs, 'utf8').catch(() => null);
      if (!text) continue;
      const lines = text.split('\n');
      const filtered = stripComments(lines);
      let perFile = 0;
      for (let i = 0; i < filtered.length; i++) {
        if (perFile >= maxMatchesPerFile) break;
        const line = filtered[i];
        if (rx.test(line)) {
          const s = Math.max(1, i + 1 - snippetContext);
          const e = Math.min(lines.length, i + 1 + snippetContext);
          const item = { path: rel, line: i + 1, snippet: lines.slice(s - 1, e).join('\n') };
          const json = JSON.stringify(item);
          const size = Buffer.byteLength(json, 'utf8');
          if (bytes + size > maxBytes) return { results, truncated: true };
          results.push(item);
          bytes += size;
          perFile++;
          if (results.length >= pageSize) return { results, truncated: true };
        }
      }
    }
  }
  return { results, truncated: false };
}

export async function indexStatus(projectRoot, codeIndexRoot, roots) {
  // Count cs files under roots
  let total = 0;
  for (const root of roots) {
    for await (const abs of walkFiles(root)) {
      if (abs.toLowerCase().endsWith('.cs')) total++;
    }
  }
  // Count indexed files
  let indexed = 0;
  try {
    const dir = path.join(codeIndexRoot, 'files');
    const entries = await fs.readdir(dir);
    indexed = entries.filter(n => n.endsWith('.symbols.json')).length;
  } catch {}
  return {
    success: true,
    totalFiles: total,
    indexedFiles: indexed,
    coverage: total > 0 ? Math.round((indexed / total) * 100) : 0,
    codeIndexRoot
  };
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

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function stripComments(lines) {
  const out = [];
  let inBlock = false;
  for (const line of lines) {
    let s = line;
    if (inBlock) {
      const end = s.indexOf('*/');
      if (end >= 0) { s = s.slice(end + 2); inBlock = false; } else { out.push(''); continue; }
    }
    let i = 0; let res = '';
    while (i < s.length) {
      if (s.startsWith('/*', i)) { inBlock = true; const end = s.indexOf('*/', i + 2); if (end >= 0) { i = end + 2; inBlock = false; continue; } else break; }
      if (s.startsWith('//', i)) { break; }
      res += s[i++];
    }
    out.push(res);
  }
  return out;
}
