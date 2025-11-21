#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PKG_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const PREBUILT_ROOT = path.join(PKG_ROOT, 'prebuilt', 'better-sqlite3');
const OUTPUT = path.join(PREBUILT_ROOT, 'manifest.json');

function collect() {
  if (!fs.existsSync(PREBUILT_ROOT)) return [];
  return fs
    .readdirSync(PREBUILT_ROOT)
    .filter(entry => !entry.startsWith('.'))
    .map(entry => {
      const dir = path.join(PREBUILT_ROOT, entry);
      const manifest = path.join(dir, 'manifest.json');
      const checksumFile = path.join(dir, 'better_sqlite3.node');
      const meta = fs.existsSync(manifest)
        ? JSON.parse(fs.readFileSync(manifest, 'utf8'))
        : { platformKey: entry };
      return {
        platformKey: entry,
        checksum: meta.checksum || null,
        node: meta.node || null,
        generatedAt: meta.generatedAt || null,
        size: fs.existsSync(checksumFile) ? fs.statSync(checksumFile).size : null
      };
    });
}

function main() {
  fs.mkdirSync(PREBUILT_ROOT, { recursive: true });
  const data = collect();
  fs.writeFileSync(OUTPUT, `${JSON.stringify({ artifacts: data }, null, 2)}\n`);
  console.log(`[prebuilt] Wrote manifest with ${data.length} entries to ${OUTPUT}`);
}

main();
