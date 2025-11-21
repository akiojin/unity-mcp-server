#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { resolvePlatformKey } from './ensure-better-sqlite3.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PKG_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const SOURCE = path.join(
  PKG_ROOT,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node'
);

function sha256(file) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('[prebuild] better_sqlite3.node not found. Run `npm ci` before prebuilding.');
    process.exit(1);
  }
  const platformKey = resolvePlatformKey();
  const destDir = path.join(PKG_ROOT, 'prebuilt', 'better-sqlite3', platformKey);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, 'better_sqlite3.node');
  fs.copyFileSync(SOURCE, dest);
  const checksum = sha256(dest);
  const metadata = {
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node,
    checksum,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(destDir, 'manifest.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`[prebuild] Stored better-sqlite3 prebuilt for ${platformKey}`);
}

main();
