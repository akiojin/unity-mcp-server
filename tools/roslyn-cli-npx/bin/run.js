#!/usr/bin/env node
// npx @akiojin/roslyn-cli ...
// - Detect RID
// - Ensure binary at ./.tools/roslyn-cli/<rid>/roslyn-cli(.exe)
// - Auto-download from GitHub Releases (tag: roslyn-cli-v<package.version> or latest)
// - Verify SHA256 when available
// - Delegate execution with passed args

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import os from 'os';

const PKG = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

function detectRid() {
  const platform = process.platform;
  if (platform === 'win32') return 'win-x64';
  if (platform === 'darwin') return (process.arch === 'arm64') ? 'osx-arm64' : 'osx-x64';
  return 'linux-x64';
}

async function fetchJson(url, token) {
  const res = await fetch(url, { headers: { 'User-Agent': 'unity-editor-mcp', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

async function fetchText(url, token) {
  const res = await fetch(url, { headers: { 'User-Agent': 'unity-editor-mcp', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function downloadTo(url, dest, token) {
  const res = await fetch(url, { headers: { 'User-Agent': 'unity-editor-mcp', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.body.pipe(out);
    res.body.on('error', reject);
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

async function sha256File(p) {
  return await new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const s = fs.createReadStream(p);
    s.on('data', d => hash.update(d));
    s.on('error', reject);
    s.on('end', () => resolve(hash.digest('hex')));
  });
}

async function ensureBinary(rid, opts = {}) {
  const exeName = process.platform === 'win32' ? 'roslyn-cli.exe' : 'roslyn-cli';
  // Prefer workspace/.unity/tools for npx provisioning
  const destDir = path.resolve(process.cwd(), '.unity', 'tools', 'roslyn-cli', rid);
  const dest = path.join(destDir, exeName);
  if (fs.existsSync(dest)) return dest;

  fs.mkdirSync(destDir, { recursive: true });
  const token = process.env.GITHUB_TOKEN || '';
  const version = PKG.version || '';
  const tagUrl = version
    ? `https://api.github.com/repos/akiojin/unity-editor-mcp/releases/tags/roslyn-cli-v${encodeURIComponent(version)}`
    : 'https://api.github.com/repos/akiojin/unity-editor-mcp/releases/latest';
  const release = await fetchJson(tagUrl, token);
  if (!release || !Array.isArray(release.assets)) throw new Error('release info not found');

  const asset = release.assets.find(a => new RegExp(rid, 'i').test(a.name));
  if (!asset) throw new Error(`no asset for RID ${rid} under tag ${release.tag_name}`);

  const sumAsset = release.assets.find(a => /checksum|sha256|SUM/i.test(a.name));
  const tmp = dest + '.download';
  await downloadTo(asset.browser_download_url, tmp, token);

  if (sumAsset) {
    try {
      const sums = await fetchText(sumAsset.browser_download_url, token);
      const line = sums.split(/\r?\n/).find(l => l.includes(path.basename(asset.browser_download_url)));
      if (line) {
        const expected = (line.trim().split(/\s+/)[0] || '').toLowerCase();
        const actual = (await sha256File(tmp)).toLowerCase();
        if (expected && actual && expected !== actual) {
          try { fs.unlinkSync(tmp); } catch {}
          throw new Error(`checksum mismatch for ${asset.name}`);
        }
      }
    } catch (e) {
      // checksum optional — warn to stderr
      console.error(`[roslyn-cli-npx] checksum verify skipped/failed: ${e.message}`);
    }
  }

  fs.renameSync(tmp, dest);
  if (process.platform !== 'win32') {
    try { fs.chmodSync(dest, 0o755); } catch {}
  }
  return dest;
}

async function main() {
  try {
    const rid = detectRid();
    const bin = await ensureBinary(rid);
    const args = process.argv.slice(2);
    const proc = spawn(bin, args, { stdio: 'inherit' });
    proc.on('close', code => process.exit(code ?? 0));
    proc.on('error', err => { console.error(err.message); process.exit(1); });
  } catch (e) {
    console.error(`[roslyn-cli-npx] ${e.message}`);
    process.exit(1);
  }
}

main();
