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
    const envPath = process.env.ROSLYN_CLI;
    if (envPath && fs.existsSync(envPath)) return envPath;

    const rid = this._detectRid();
    // 1) mcp-server 配下（npm配布時に同梱される想定の場所）
    const pkgRoot = this._resolvePackageRoot();
    const exeName = process.platform === 'win32' ? 'roslyn-cli.exe' : 'roslyn-cli';
    const pkgCandidates = [
      path.join(pkgRoot, 'roslyn-cli', rid, exeName),
      path.join(pkgRoot, '.tools', 'roslyn-cli', rid, exeName),
    ];
    for (const p of pkgCandidates) {
      if (p && fs.existsSync(p)) return p;
    }

    // 2) リポジトリ開発環境（このリポジトリ内）
    const repoRoot = this._resolveRepoRoot() || WORKSPACE_ROOT || process.cwd();
    const local = path.resolve(repoRoot, '.tools', 'roslyn-cli', rid, exeName);
    if (fs.existsSync(local)) return local;

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

    if (fs.existsSync(local)) return local;

    // Not found after (optional) auto-build — return explicit guidance
    const expected = (pkgCandidates.find(p => p) || local).replace(/\\/g, '/');
    const hint = process.platform === 'win32'
      ? 'powershell -ExecutionPolicy Bypass -File scripts/bootstrap-roslyn-cli.ps1 -Rid win-x64'
      : `./scripts/bootstrap-roslyn-cli.sh ${rid}`;
    const msg = [
      'roslyn-cli binary not found.',
      `Expected: ${expected}`,
      'Provision options:',
      `  - Build from source if present: ${hint}`,
      '  - Or place a prebuilt binary at the above path',
      '  - Or set ROSLYN_CLI env var to the binary path'
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
    const root = info.projectRoot;
    // Prefer .sln under project root
    const sln = this._findFirst(root, '.sln');
    if (sln) return ['--solution', sln];
    const csproj = this._findFirst(root, '.csproj');
    if (csproj) return ['--project', csproj];
    throw new Error(`No .sln or .csproj found under ${root}`);
  }

  _findFirst(dir, ext) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isFile() && e.name.toLowerCase().endsWith(ext)) return path.resolve(dir, e.name);
      }
      // shallow search (depth 2)
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const sub = path.join(dir, e.name);
        const subEntries = fs.readdirSync(sub, { withFileTypes: true });
        for (const s of subEntries) {
          if (s.isFile() && s.name.toLowerCase().endsWith(ext)) return path.resolve(sub, s.name);
        }
      }
    } catch {}
    return null;
  }

  async runCli(args, input = null) {
    // serve優先。serveはビルド済みバイナリを用いて起動（dotnet runは使わない）。
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
