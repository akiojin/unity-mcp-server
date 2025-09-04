import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { logger } from '../../core/config.js';
import { WORKSPACE_ROOT } from '../../core/config.js';
import { fileURLToPath } from 'url';
import { ProjectInfoProvider } from '../../core/projectInfo.js';

let AUTO_BUILD_ATTEMPTED = false;

export class RoslynCliUtils {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
  }

  async getCliPath() {
    const rid = this._detectRid();
    // 1) mcp-server 配下（npm配布時に同梱される想定の場所）
    const pkgRoot = this._resolvePackageRoot();
    const exeName = process.platform === 'win32' ? 'roslyn-cli.exe' : 'roslyn-cli';
    const pkgCandidates = [
      path.join(pkgRoot, 'roslyn-cli', rid, exeName),
      path.join(pkgRoot, '.tools', 'roslyn-cli', rid, exeName), // legacy fallback under package
      path.join(pkgRoot, '.unity', 'tools', 'roslyn-cli', rid, exeName),
    ];
    for (const p of pkgCandidates) {
      if (p && fs.existsSync(p)) {
        logger.info(`[roslyn-cli] using packaged binary: ${p}`);
        return p;
      }
    }

    // 2) リポジトリ開発環境（このリポジトリ内）
    const repoRoot = this._resolveRepoRoot() || WORKSPACE_ROOT || process.cwd();
    const localPreferred = path.resolve(repoRoot, '.unity', 'tools', 'roslyn-cli', rid, exeName);
    const localLegacy = path.resolve(repoRoot, '.tools', 'roslyn-cli', rid, exeName);
    if (fs.existsSync(localPreferred)) {
      logger.info(`[roslyn-cli] using workspace binary: ${localPreferred}`);
      return localPreferred;
    }
    if (fs.existsSync(localLegacy)) return localLegacy;

    // Auto-build exactly once per process if missing (bootstrap behavior)
    if (!AUTO_BUILD_ATTEMPTED) {
      AUTO_BUILD_ATTEMPTED = true;
      try {
        // Only attempt bootstrap if scripts exist in the resolved repo root
        const hasScript = this._hasBootstrapScript(repoRoot);
        if (hasScript) {
          await this._autoBuildCli(rid, repoRoot);
        }
      } catch (e) {
        // Fall-through to standardized error below
        logger.error(`[roslyn-cli] auto-build failed: ${e.message}`);
      }
    }

    if (fs.existsSync(localPreferred)) return localPreferred;
    if (fs.existsSync(localLegacy)) return localLegacy;

    // Always auto-download from GitHub Releases into WORKSPACE_ROOT when missing
    try {
      const dl = await this._autoDownloadCli(rid, repoRoot);
      if (dl && fs.existsSync(dl)) return dl;
    } catch (e) {
      logger.warn(`roslyn-cli auto-download failed: ${e.message}`);
    }

    // Not found after (optional) auto-build — return explicit guidance
    const expected = (pkgCandidates.find(p => p) || localPreferred || localLegacy).replace(/\\/g, '/');
    const hint = process.platform === 'win32'
      ? 'powershell -ExecutionPolicy Bypass -File scripts/bootstrap-roslyn-cli.ps1 -Rid win-x64'
      : `./scripts/bootstrap-roslyn-cli.sh ${rid}`;
    const msg = [
      'roslyn-cli binary not found.',
      `Expected: ${expected} (.unity/tools/roslyn-cli/<rid>)`,
      'Provision options:',
      `  - Build from source if present: ${hint}`,
      '  - Or place a prebuilt binary at the above path',
      '  - Auto-download is performed automatically from GitHub Releases'
    ].join('\n');
    throw new Error(msg);
  }

  _detectRid() {
    if (process.platform === 'win32') return 'win-x64';
    if (process.platform === 'darwin') return process.arch === 'arm64' ? 'osx-arm64' : 'osx-x64';
    return 'linux-x64';
  }

  _spawnOnce(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
      let out = '';
      let err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());
      proc.on('error', reject);
      proc.on('close', code => {
        if (code !== 0) {
          const trimmed = (err || out).toString().slice(0, 4000);
          return reject(new Error(`${cmd} exited with code ${code}. Output:\n${trimmed}`));
        }
        resolve({ out, err });
      });
    });
  }

  async _autoBuildCli(rid, repoRoot) {
    const isWin = process.platform === 'win32';
    const script = isWin
      ? path.resolve(repoRoot, 'scripts', 'bootstrap-roslyn-cli.ps1')
      : path.resolve(repoRoot, 'scripts', 'bootstrap-roslyn-cli.sh');
    const exists = fs.existsSync(script);
    if (!exists) throw new Error(`bootstrap script not found: ${script}`);
    logger.info(`[roslyn-cli] bootstrapping for ${rid} using ${path.basename(script)} ...`);
    if (isWin) {
      await this._spawnOnce('powershell', ['-ExecutionPolicy','Bypass','-File', script, '-Rid', rid], { cwd: repoRoot });
    } else {
      await this._spawnOnce(script, [rid], { cwd: repoRoot });
    }
  }

  // mcp-server パッケージルートを import.meta.url から解決
  _resolvePackageRoot() {
    try {
      const here = path.dirname(fileURLToPath(import.meta.url));
      // このファイル: mcp-server/src/handlers/roslyn/RoslynCliUtils.js
      // パッケージルート: mcp-server/
      // パスを3階層上がる: handlers -> roslyn -> src -> mcp-server
      const candidate = path.resolve(here, '../../..');
      // 簡易検証: package.json が存在するか
      const pkgJson = path.join(candidate, 'package.json');
      if (fs.existsSync(pkgJson)) return candidate;
      return candidate; // 最低限返す
    } catch {
      return process.cwd();
    }
  }

  _hasBootstrapScript(repoRoot) {
    const ps1 = path.resolve(repoRoot, 'scripts', 'bootstrap-roslyn-cli.ps1');
    const sh = path.resolve(repoRoot, 'scripts', 'bootstrap-roslyn-cli.sh');
    return fs.existsSync(ps1) || fs.existsSync(sh);
  }

  async _autoDownloadCli(rid, workspaceRoot) {
    const owner = 'akiojin';
    const repo = 'unity-editor-mcp';
    const exeName = process.platform === 'win32' ? 'roslyn-cli.exe' : 'roslyn-cli';

    // 1) バージョンは mcp-server/package.json の version と一致させる（厳密固定）
    const version = await this._getMcpServerVersion();
    if (!version) throw new Error('mcp-server version not found; cannot resolve roslyn-cli tag');
    const tag = `v${version}`;

    // 2) マニフェスト（rid→url/sha256/size）を取得
    const manifestUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}/roslyn-cli-manifest.json`;
    const manifest = await this._fetchJson(manifestUrl);
    if (!manifest?.assets) throw new Error(`manifest not found for tag ${tag}`);
    const ridEntry = manifest.assets[rid];
    if (!ridEntry?.url || !ridEntry?.sha256) throw new Error(`manifest has no entry for RID ${rid} under tag ${tag}`);

    // 3) ダウンロード→検証→配置（原子置換）
    const destDir = path.resolve(workspaceRoot, '.unity', 'tools', 'roslyn-cli', rid);
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, exeName);
    const tmp = dest + '.download';
    await this._downloadTo(ridEntry.url, tmp);

    const actual = await this._sha256File(tmp);
    if (ridEntry.sha256.toLowerCase() !== actual.toLowerCase()) {
      try { fs.unlinkSync(tmp); } catch {}
      throw new Error(`checksum mismatch for ${path.basename(ridEntry.url)}`);
    }

    fs.renameSync(tmp, dest);
    try { if (process.platform !== 'win32') fs.chmodSync(dest, 0o755); } catch {}
    logger.info(`[roslyn-cli] downloaded ${path.basename(ridEntry.url)} -> ${dest}`);
    return dest;
  }

  async _getMcpServerVersion() {
    try {
      const root = this._resolvePackageRoot();
      const pkg = path.resolve(root, 'package.json');
      if (!fs.existsSync(pkg)) return null;
      const raw = fs.readFileSync(pkg, 'utf8');
      const json = JSON.parse(raw);
      return json?.version || null;
    } catch { return null; }
  }

  async _fetchJson(url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'unity-editor-mcp' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  }

  async _fetchText(url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'unity-editor-mcp' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  }

  async _downloadTo(url, dest) {
    const res = await fetch(url, { headers: { 'User-Agent': 'unity-editor-mcp' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const file = fs.createWriteStream(dest);
    await new Promise((resolve, reject) => {
      res.body.pipe(file);
      res.body.on('error', reject);
      file.on('finish', resolve);
      file.on('error', reject);
    });
  }

  async _sha256File(file) {
    const { createHash } = await import('crypto');
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = fs.createReadStream(file);
      stream.on('data', d => hash.update(d));
      stream.on('error', reject);
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  _extractChecksum(text, name) {
    try {
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/([a-fA-F0-9]{64})\s+\*?(.+)$/);
        if (m && m[2].trim().endsWith(name)) return m[1];
      }
    } catch {}
    return null;
  }

  // Resolve repository root by locating a 'roslyn-cli' directory using the strategy:
  // 1) Check current dir (itself named roslyn-cli or has direct child)
  // 2) Recursively scan all subdirectories (skipping heavy/common dirs)
  // 3) Walk up to 3 parent levels; at each, repeat checks and recursive scan
  _resolveRepoRoot() {
    const start = process.cwd();
    const target = 'roslyn-cli';
    const skip = new Set(['.git', 'Library', 'node_modules', '.tools', 'PackageCache', '.vs', '.vscode', 'Temp', 'Logs']);

    const hasDirectChild = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory() && e.name.toLowerCase() === target) return path.join(dir, e.name);
        }
      } catch {}
      return null;
    };

    const findDown = (root) => {
      const queue = [root];
      let scanned = 0;
      const limit = 30000; // safety cap
      while (queue.length) {
        const dir = queue.shift();
        if (++scanned > limit) break;
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
        for (const e of entries) {
          if (!e.isDirectory()) continue;
          if (skip.has(e.name)) continue;
          if (e.name.toLowerCase() === target) return path.join(dir, e.name);
          queue.push(path.join(dir, e.name));
        }
      }
      return null;
    };

    const checkHere = (dir) => {
      if (path.basename(dir).toLowerCase() === target) return dir;
      const direct = hasDirectChild(dir);
      if (direct) return direct;
      return findDown(dir);
    };

    let found = checkHere(start);
    if (!found) {
      let dir = start;
      for (let up = 0; up < 3; up++) {
        const parent = path.dirname(dir);
        if (!parent || parent === dir) break;
        found = checkHere(parent);
        if (found) break;
        dir = parent;
      }
    }
    return found ? path.dirname(found) : null;
  }

  async getSolutionOrProjectArgs() {
    const info = await this.projectInfo.get();
    const root = info.projectRoot.replace(/\\/g, '/');
    const path = await import('path');
    const fs = await import('fs');
    const dirName = path.default.basename(root);
    // Unity の既定: ルートディレクトリ名.sln のみを許容（厳格運用）
    const slnPath = path.default.resolve(root, `${dirName}.sln`).replace(/\\/g, '/');
    if (fs.existsSync(slnPath)) {
      return ['--solution', slnPath];
    }
    throw new Error(`Solution not found. Expected: ${slnPath}`);
  }

  _findFirst(dir, ext) {
    // 使用しない（厳格運用）
    return null;
  }

  async runCli(args, input = null) {
    // serve専用（フォールバックなし）
    const { sendServe } = await import('./RoslynCliServeClient.js');
    return await sendServe(args[0], args.slice(1));
  }

  _spawnAndParse(cmd, args, input) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());
      proc.on('error', reject);
      proc.on('close', code => {
        if (code !== 0 && !out) {
          return reject(new Error(err || `${cmd} exited with code ${code}`));
        }
        try {
          const json = JSON.parse(out);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse output: ${e.message}. Raw: ${out}\nStderr: ${err}`));
        }
      });
      if (input) proc.stdin.end(input);
      else proc.stdin.end();
    });
  }
}
