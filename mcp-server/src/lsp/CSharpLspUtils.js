import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { logger, WORKSPACE_ROOT } from '../core/config.js';

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

  getToolRoot() {
    const envRoot = process.env.UNITY_MCP_TOOLS_ROOT;
    if (envRoot && envRoot.trim().length > 0) {
      return path.resolve(envRoot.trim());
    }
    return path.join(os.homedir(), '.unity', 'tools');
  }

  getToolPath(rid) {
    const exe = this.getExecutableName();
    return path.resolve(this.getToolRoot(), 'csharp-lsp', rid, exe);
  }

  getVersionPath(rid) {
    return path.resolve(path.dirname(this.getToolPath(rid)), 'VERSION');
  }

  getLocalPath(rid) {
    return this.getToolPath(rid);
  }

  getVersionMarkerPath(rid) {
    return this.getVersionPath(rid);
  }

  readLocalVersion(rid) {
    try {
      const versionPath = this.getVersionPath(rid);
      if (fs.existsSync(versionPath)) return fs.readFileSync(versionPath, 'utf8').trim();
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
    const binaryExists = fs.existsSync(p);
    const current = this.readLocalVersion(rid);
    const isTestMode = process.env.NODE_ENV === 'test';

    // バージョン取得失敗時もバイナリが存在すれば使用
    if (!desired) {
      if (binaryExists) {
        logger.warning('[unity-mcp-server:lsp] version not found, using existing binary');
        return p;
      }
      throw new Error('mcp-server version not found; cannot resolve LSP tag');
    }

    if (binaryExists && current === desired) return p;

    // テスト環境では既存バイナリを優先し、並列ダウンロードによる不安定化を防ぐ
    if (binaryExists && isTestMode) {
      this.writeLocalVersion(rid, desired);
      return p;
    }

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

    const dest = this.getToolPath(rid);
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
