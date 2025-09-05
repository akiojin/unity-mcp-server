import fs from 'fs';
import path from 'path';
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

  getLocalPath(rid) {
    const root = WORKSPACE_ROOT || process.cwd();
    const exe = process.platform === 'win32' ? 'server.exe' : 'server';
    return path.resolve(root, '.unity', 'tools', 'csharp-lsp', rid, exe);
  }

  getVersionMarkerPath(rid) {
    const bin = this.getLocalPath(rid);
    return path.resolve(path.dirname(bin), 'VERSION');
  }

  readLocalVersion(rid) {
    try {
      const m = this.getVersionMarkerPath(rid);
      if (fs.existsSync(m)) return fs.readFileSync(m, 'utf8').trim();
    } catch {}
    return null;
  }

  writeLocalVersion(rid, version) {
    try {
      const m = this.getVersionMarkerPath(rid);
      fs.writeFileSync(m, String(version || '').trim() + '\n', 'utf8');
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
    const repo = process.env.GITHUB_REPOSITORY || 'akiojin/unity-editor-mcp';
    const tag = `v${version}`;
    const manifestUrl = `https://github.com/${repo}/releases/download/${tag}/csharp-lsp-manifest.json`;
    const manifest = await this.fetchJson(manifestUrl);
    const entry = manifest?.assets?.[rid];
    if (!entry?.url || !entry?.sha256) throw new Error(`manifest missing entry for ${rid}`);

    const dest = this.getLocalPath(rid);
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
    const res = await fetch(url, { headers: { 'User-Agent': 'unity-editor-mcp' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  }

  async downloadTo(url, dest) {
    const res = await fetch(url, { headers: { 'User-Agent': 'unity-editor-mcp' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const file = fs.createWriteStream(dest);
    const body = res.body;
    if (body && typeof body.pipe === 'function') {
      await new Promise((resolve, reject) => {
        body.pipe(file);
        body.on('error', reject);
        file.on('finish', resolve);
        file.on('error', reject);
      });
      return;
    }
    try {
      const { Readable } = await import('node:stream');
      const nodeStream = Readable.fromWeb(body);
      await new Promise((resolve, reject) => {
        nodeStream.pipe(file);
        nodeStream.on('error', reject);
        file.on('finish', resolve);
        file.on('error', reject);
      });
    } catch (e) {
      const ab = await res.arrayBuffer();
      await fs.promises.writeFile(dest, Buffer.from(ab));
    }
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
