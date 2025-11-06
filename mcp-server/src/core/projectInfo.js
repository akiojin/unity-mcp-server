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
    const cfgRootRaw = config?.project?.root;
    if (typeof cfgRootRaw === 'string' && cfgRootRaw.trim().length > 0) {
      const cfgRoot = cfgRootRaw.trim();
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
    if (typeof cfgRootRaw === 'string') {
      throw new Error('project.root is configured but empty. Set a valid path in .unity/config.json or UNITY_MCP_CONFIG.');
    }
    throw new Error('Unable to resolve Unity project root. Configure project.root in .unity/config.json or provide UNITY_MCP_CONFIG.');
  }

  inferFromCwd() {
    return null;
  }
}
