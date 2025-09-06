import fs from 'fs';
import path from 'path';
import { logger, config } from './config.js';

// Lazy project info resolver. Prefers Unity via get_editor_info, otherwise infers by walking up for Assets/Packages.
export class ProjectInfoProvider {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
    this.cached = null;
    this.lastTried = 0;
  }

  async get() {
    if (this.cached) return this.cached;
    // Config-driven project root (no env fallback)
    const cfgRoot = config?.project?.root;
    if (cfgRoot) {
      const projectRoot = cfgRoot.replace(/\\/g, '/');
      const codeIndexRoot = (config?.project?.codeIndexRoot
        || path.join(projectRoot, 'Library/UnityMCP/CodeIndex')).replace(/\\/g, '/');
      this.cached = {
        projectRoot,
        assetsPath: path.join(projectRoot, 'Assets').replace(/\\/g, '/'),
        packagesPath: path.join(projectRoot, 'Packages').replace(/\\/g, '/'),
        codeIndexRoot,
      };
      return this.cached;
    }
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
    // First, check for Docker environment default path
    const dockerDefaultPath = '/unity-mcp-server/UnityMCPServer';
    const dockerAssets = path.join(dockerDefaultPath, 'Assets');
    if (fs.existsSync(dockerAssets)) {
      const projectRoot = dockerDefaultPath.replace(/\\/g, '/');
      logger.info(`Found Unity project at Docker default path: ${projectRoot}`);
      return {
        projectRoot,
        assetsPath: dockerAssets.replace(/\\/g, '/'),
        packagesPath: path.join(dockerDefaultPath, 'Packages').replace(/\\/g, '/'),
        codeIndexRoot: path.join(dockerDefaultPath, 'Library/UnityMCP/CodeIndex').replace(/\\/g, '/'),
      };
    }

    let dir = process.cwd();
    // Walk up max 5 levels (look for Assets directly under a directory)
    for (let i = 0; i < 5; i++) {
      const assets = path.join(dir, 'Assets');
      if (fs.existsSync(assets)) {
        const projectRoot = dir.replace(/\\/g, '/');
        return {
          projectRoot,
          assetsPath: assets.replace(/\\/g, '/'),
          packagesPath: path.join(dir, 'Packages').replace(/\\/g, '/'),
          codeIndexRoot: path.join(dir, 'Library/UnityMCP/CodeIndex').replace(/\\/g, '/'),
        };
      }
      dir = path.dirname(dir);
    }

    // Fallback: search shallow subdirectories for Unity projects (depth 2)
    const rootsToCheck = [process.cwd(), path.dirname(process.cwd())];
    for (const root of rootsToCheck) {
      try {
        const entries = fs.readdirSync(root, { withFileTypes: true });
        for (const e of entries) {
          if (!e.isDirectory()) continue;
          const candidate = path.join(root, e.name);
          const assets = path.join(candidate, 'Assets');
          if (fs.existsSync(assets)) {
            const projectRoot = candidate.replace(/\\/g, '/');
            return {
              projectRoot,
              assetsPath: assets.replace(/\\/g, '/'),
              packagesPath: path.join(candidate, 'Packages').replace(/\\/g, '/'),
              codeIndexRoot: path.join(candidate, 'Library/UnityMCP/CodeIndex').replace(/\\/g, '/'),
            };
          }
        }
      } catch {}
    }
    return null;
  }
}
