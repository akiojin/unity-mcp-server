import fs from 'fs';
import path from 'path';
import { logger } from './config.js';

// Lazy project info resolver. Prefers Unity via get_editor_info, otherwise infers by walking up for Assets/Packages.
export class ProjectInfoProvider {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
    this.cached = null;
    this.lastTried = 0;
  }

  async get() {
    if (this.cached) return this.cached;
    // Try Unity if connected (rate-limit attempts)
    const now = Date.now();
    if (this.unityConnection && this.unityConnection.isConnected() && (now - this.lastTried > 1000)) {
      this.lastTried = now;
      try {
        const info = await this.unityConnection.sendCommand('get_editor_info', {});
        if (info && info.projectRoot && info.assetsPath) {
          this.cached = {
            projectRoot: info.projectRoot,
            assetsPath: info.assetsPath,
            packagesPath: info.packagesPath || path.join(info.projectRoot, 'Packages').replace(/\\/g, '/'),
            codeIndexRoot: info.codeIndexRoot || path.join(info.projectRoot, 'Library/UnityMCP/CodeIndex').replace(/\\/g, '/'),
          };
          return this.cached;
        }
      } catch (e) {
        logger.warn(`get_editor_info failed: ${e.message}`);
      }
    }
    // Fallback: infer by walking up from CWD to find Assets/
    const inferred = this.inferFromCwd();
    if (inferred) {
      this.cached = inferred;
      return this.cached;
    }
    throw new Error('Unable to resolve Unity project root (no connection and no Assets/ found)');
  }

  inferFromCwd() {
    let dir = process.cwd();
    // If running inside package dir (e.g., mcp-server), step up once.
    try {
      const parent = path.dirname(dir);
      if (fs.existsSync(path.join(parent, 'Assets'))) dir = parent;
    } catch {}
    // Walk up max 5 levels
    for (let i = 0; i < 5; i++) {
      const assets = path.join(dir, 'Assets');
      const packages = path.join(dir, 'Packages');
      if (fs.existsSync(assets)) {
        const projectRoot = dir.replace(/\\/g, '/');
        return {
          projectRoot,
          assetsPath: assets.replace(/\\/g, '/'),
          packagesPath: packages.replace(/\\/g, '/'),
          codeIndexRoot: path.join(dir, 'Library/UnityMCP/CodeIndex').replace(/\\/g, '/'),
        };
      }
      const next = path.dirname(dir);
      if (next === dir) break;
      dir = next;
    }
    return null;
  }
}

