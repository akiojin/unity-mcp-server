import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../core/config.js';
import { WORKSPACE_ROOT } from '../core/config.js';

export class CSharpLspUtils {
  constructor() {}

  detectRid() {
    if (process.platform === 'win32') return process.arch === 'arm64' ? 'win-arm64' : 'win-x64';
    if (process.platform === 'darwin') return process.arch === 'arm64' ? 'osx-arm64' : 'osx-x64';
    return process.arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
  }

  getDesiredVersion() {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.resolve('mcp-server/package.json'), 'utf8'));
      return pkg.version;
    } catch {
      return null;
    }
  }

  getExecutableName() {
    return process.platform === 'win32' ? 'server.exe' : 'server';
  }

  getPrimaryToolRoot() {
    const envRoot = process.env.UNITY_MCP_TOOLS_ROOT;
    if (envRoot && envRoot.trim().length > 0) {
      return path.resolve(envRoot.trim());
    }
    return path.join(os.homedir(), '.unity', 'tools');
  }

  getLegacyToolRoot() {
    const root = WORKSPACE_ROOT || process.cwd();
    return path.resolve(root, '.unity', 'tools');
  }

  resolveToolPaths(rid) {
    const exe = this.getExecutableName();
    const primary = path.resolve(this.getPrimaryToolRoot(), 'csharp-lsp', rid, exe);
    const legacy = path.resolve(this.getLegacyToolRoot(), 'csharp-lsp', rid, exe);
    return { primary, legacy };
  }

  resolveVersionPaths(rid) {
    const { primary, legacy } = this.resolveToolPaths(rid);
    return {
      primary: path.resolve(path.dirname(primary), 'VERSION'),
      legacy: path.resolve(path.dirname(legacy), 'VERSION')
    };
  }

  migrateLegacyIfNeeded(rid) {
    const { primary, legacy } = this.resolveToolPaths(rid);
    if (!fs.existsSync(legacy)) return;
    if (fs.existsSync(primary)) return;
    try {
      fs.mkdirSync(path.dirname(primary), { recursive: true });
      fs.copyFileSync(legacy, primary);
      const { primary: primaryVersion, legacy: legacyVersion } = this.resolveVersionPaths(rid);
      if (fs.existsSync(legacyVersion) && !fs.existsSync(primaryVersion)) {
        try {
          fs.copyFileSync(legacyVersion, primaryVersion);
        } catch {}
      }
      logger.info(`[csharp-lsp] migrated legacy binary to ${path.dirname(primary)}`);
    } catch (e) {
      logger.warn(`[csharp-lsp] legacy migration failed: ${e.message}`);
    }
  }

  getLocalPath(rid) {
    const { primary, legacy } = this.resolveToolPaths(rid);
    this.migrateLegacyIfNeeded(rid);
    if (fs.existsSync(primary)) return primary;
    if (fs.existsSync(legacy)) return legacy;
    return primary;
  }

  getVersionMarkerPath(rid) {
    const { primary, legacy } = this.resolveVersionPaths(rid);
    if (fs.existsSync(primary)) return primary;
    if (fs.existsSync(legacy)) return legacy;
    return primary;
  }

  readLocalVersion(rid) {
    try {
      const { primary, legacy } = this.resolveVersionPaths(rid);
      if (fs.existsSync(primary)) return fs.readFileSync(primary, 'utf8').trim();
      if (fs.existsSync(legacy)) return fs.readFileSync(legacy, 'utf8').trim();
    } catch {}
    return null;
  }

  writeLocalVersion(rid, version) {
    try {
      const marker = this.getVersionMarkerPath(rid);
      fs.mkdirSync(path.dirname(marker), { recursive: true });
      fs.writeFileSync(marker, String(version || '').trim() + '\n', 'utf8');
    } catch {}
  }

  async ensureLocal(rid) {
    const p = this.getLocalPath(rid);
    const desired = this.getDesiredVersion();
    if (!desired) throw new Error('mcp-server version not found; cannot resolve LSP tag');
    const current = this.readLocalVersion(rid);
    if (fs.existsSync(p) && current === desired) return p;
    await this.autoDownload(rid, desired);
    if (!fs.existsSync(p)) throw new Error('csharp-lsp binary not found after download');
    this.writeLocalVersion(rid, desired);
    return p;
  }

  async autoDownload(rid, version) {
    const repo = process.env.GITHUB_REPOSITORY || 'akiojin/unity-mcp-server';
    const tag = `v${version}`;
    const manifestUrl = `https://github.com/${repo}/releases/download/${tag}/csharp-lsp-manifest.json`;
    const manifest = await this.fetchJson(manifestUrl);
    const entry = manifest?.assets?.[rid];
    if (!entry?.url || !entry?.sha256) throw new Error(`manifest missing entry for ${rid}`);

    const { primary: dest } = this.resolveToolPaths(rid);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.download';
    await this.downloadTo(entry.url, tmp);
    const actual = await this.sha256File(tmp);
    if (String(actual).toLowerCase() !== String(entry.sha256).toLowerCase()) {
      try { fs.unlinkSync(tmp); } catch {}
      throw new Error('checksum mismatch for csharp-lsp asset');
    }
    // atomic replace
    try { fs.renameSync(tmp, dest); } catch (e) {
      // Windows may need removal before rename
      try { fs.unlinkSync(dest); } catch {}
      fs.renameSync(tmp, dest);
    }
    try { if (process.platform !== 'win32') fs.chmodSync(dest, 0o755); } catch {}
    logger.info(`[csharp-lsp] downloaded: ${path.basename(dest)} @ ${path.dirname(dest)}`);
  }

  async fetchJson(url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'unity-mcp-server' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  }

  async downloadTo(url, dest) {
    const headers = { 'User-Agent': 'unity-mcp-server' };
    const fetchOnce = async () => {
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      return r;
    };

    const res = await fetchOnce();
    const body = res.body;

    // Prefer WebStream -> Node stream piping
    if (body) {
      try {
        const file = fs.createWriteStream(dest);
        const { Readable } = await import('node:stream');
        const nodeStream = Readable.fromWeb(body);
        await new Promise((resolve, reject) => {
          nodeStream.pipe(file);
          nodeStream.on('error', reject);
          file.on('finish', resolve);
          file.on('error', reject);
        });
        return;
      } catch (e) {
        // If streaming failed or body was already consumed, re-fetch and fall back to arrayBuffer
      }
    }

    // Fallback: re-fetch fresh response and write full buffer
    const res2 = await fetchOnce();
    const ab = await res2.arrayBuffer();
    await fs.promises.writeFile(dest, Buffer.from(ab));
  }

  async sha256File(file) {
    const { createHash } = await import('crypto');
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = fs.createReadStream(file);
      stream.on('data', d => hash.update(d));
      stream.on('error', reject);
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }
}
