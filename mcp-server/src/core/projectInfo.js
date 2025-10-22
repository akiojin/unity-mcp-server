import fs from 'fs';
import path from 'path';
import { logger, config, WORKSPACE_ROOT } from './config.js';

const normalize = (p) => p.replace(/\\/g, '/');

const resolveDefaultCodeIndexRoot = (projectRoot) => {
  const base = WORKSPACE_ROOT || projectRoot || process.cwd();
  return normalize(path.join(base, '.unity', 'cache', 'code-index'));
};

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
      // Resolve relative paths against WORKSPACE_ROOT
      const projectRoot = normalize(path.isAbsolute(cfgRoot) ? cfgRoot : path.resolve(WORKSPACE_ROOT, cfgRoot));
      const codeIndexRoot = normalize(config?.project?.codeIndexRoot || resolveDefaultCodeIndexRoot(projectRoot));
      this.cached = {
        projectRoot,
        assetsPath: normalize(path.join(projectRoot, 'Assets')),
        packagesPath: normalize(path.join(projectRoot, 'Packages')),
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
            packagesPath: normalize(info.packagesPath || path.join(info.projectRoot, 'Packages')),
            codeIndexRoot: normalize(info.codeIndexRoot || resolveDefaultCodeIndexRoot(info.projectRoot)),
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
      const projectRoot = normalize(dockerDefaultPath);
      logger.info(`Found Unity project at Docker default path: ${projectRoot}`);
      return {
        projectRoot,
        assetsPath: normalize(dockerAssets),
        packagesPath: normalize(path.join(dockerDefaultPath, 'Packages')),
        codeIndexRoot: resolveDefaultCodeIndexRoot(projectRoot),
      };
    }

    let dir = process.cwd();
    // Walk up max 5 levels (look for Assets directly under a directory)
    for (let i = 0; i < 5; i++) {
      const assets = path.join(dir, 'Assets');
      if (fs.existsSync(assets)) {
        const projectRoot = normalize(dir);
        return {
          projectRoot,
          assetsPath: normalize(assets),
          packagesPath: normalize(path.join(dir, 'Packages')),
          codeIndexRoot: resolveDefaultCodeIndexRoot(projectRoot),
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
            const projectRoot = normalize(candidate);
            return {
              projectRoot,
              assetsPath: normalize(assets),
              packagesPath: normalize(path.join(candidate, 'Packages')),
              codeIndexRoot: resolveDefaultCodeIndexRoot(projectRoot),
            };
          }
        }
      } catch {}
    }
    return null;
  }
}
