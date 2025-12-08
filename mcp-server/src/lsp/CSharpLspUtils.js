import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
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
    const candidates = [];

    // When launched from workspace root: mcp-server/package.json
    candidates.push(path.resolve('mcp-server/package.json'));
    // When launched within mcp-server directory
    candidates.push(path.resolve('package.json'));

    // Resolve relative to this module (always inside mcp-server/src/lsp)
    try {
      const moduleDir = path.dirname(fileURLToPath(import.meta.url));
      candidates.push(path.resolve(moduleDir, '../../package.json'));
    } catch {}

    // Resolve relative to WORKSPACE_ROOT if provided
    if (WORKSPACE_ROOT) {
      candidates.push(path.resolve(WORKSPACE_ROOT, 'mcp-server', 'package.json'));
      candidates.push(path.resolve(WORKSPACE_ROOT, 'package.json'));
    }

    for (const candidate of candidates) {
      try {
        if (!fs.existsSync(candidate)) continue;
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (pkg?.version) return pkg.version;
      } catch {}
    }

    return null;
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
      logger.info(`[unity-mcp-server:lsp] migrated legacy binary to ${path.dirname(primary)}`);
    } catch (e) {
      logger.warning(`[unity-mcp-server:lsp] legacy migration failed: ${e.message}`);
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

    // バージョン取得失敗時もバイナリが存在すれば使用
    if (!desired) {
      if (fs.existsSync(p)) {
        logger.warning('[unity-mcp-server:lsp] version not found, using existing binary');
        return p;
      }
      throw new Error('mcp-server version not found; cannot resolve LSP tag');
    }

    const current = this.readLocalVersion(rid);
    if (fs.existsSync(p) && current === desired) return p;

    // ダウンロード失敗時のフォールバック
    try {
      const resolved = await this.autoDownload(rid, desired);
      if (!fs.existsSync(p)) throw new Error('csharp-lsp binary not found after download');
      this.writeLocalVersion(rid, resolved || desired);
      return p;
    } catch (e) {
      if (fs.existsSync(p)) {
        logger.warning(
          `[unity-mcp-server:lsp] download failed, using existing binary: ${e.message}`
        );
        return p;
      }
      throw e;
    }
  }

  async autoDownload(rid, version) {
    const repo = process.env.GITHUB_REPOSITORY || 'akiojin/unity-mcp-server';

    const fetchManifest = async ver => {
      const tag = `v${ver}`;
      const manifestUrl = `https://github.com/${repo}/releases/download/${tag}/csharp-lsp-manifest.json`;
      const manifest = await this.fetchJson(manifestUrl);
      return { manifest, tag };
    };

    let targetVersion = version;
    let manifest;
    try {
      ({ manifest } = await fetchManifest(targetVersion));
    } catch (e) {
      // Gracefully fall back to the latest release when the requested manifest is missing (404).
      if (String(e?.message || '').includes('HTTP 404')) {
        const latest = await this.fetchLatestReleaseVersion(repo);
        if (!latest) throw e;
        targetVersion = latest;
        ({ manifest } = await fetchManifest(targetVersion));
      } else {
        throw e;
      }
    }

    const entry = manifest?.assets?.[rid];
    if (!entry?.url || !entry?.sha256) throw new Error(`manifest missing entry for ${rid}`);

    const { primary: dest } = this.resolveToolPaths(rid);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.download';
    await this.downloadTo(entry.url, tmp);
    const actual = await this.sha256File(tmp);
    if (String(actual).toLowerCase() !== String(entry.sha256).toLowerCase()) {
      try {
        fs.unlinkSync(tmp);
      } catch {}
      throw new Error('checksum mismatch for csharp-lsp asset');
    }
    // atomic replace
    try {
      fs.renameSync(tmp, dest);
    } catch (e) {
      // Windows may need removal before rename
      try {
        fs.unlinkSync(dest);
      } catch {}
      fs.renameSync(tmp, dest);
    }
    try {
      if (process.platform !== 'win32') fs.chmodSync(dest, 0o755);
    } catch {}
    logger.info(
      `[unity-mcp-server:lsp] downloaded: ${path.basename(dest)} @ ${path.dirname(dest)}`
    );
    // manifestから実際のバージョンを取得（信頼性の高いソースとして使用）
    const actualVersion = manifest.version || targetVersion;
    return actualVersion;
  }

  async fetchLatestReleaseVersion(repo) {
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    const json = await this.fetchJson(url);
    const tag = json?.tag_name || '';
    const version = tag.replace(/^v/, '');
    if (!version) throw new Error('latest release version not found');
    return version;
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
