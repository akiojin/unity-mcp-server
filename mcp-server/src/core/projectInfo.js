import fs from 'fs';
import path from 'path';
import { logger, config, WORKSPACE_ROOT } from './config.js';

const normalize = p => p.replace(/\\/g, '/');

const looksLikeUnityProjectRoot = dir => {
  try {
    return (
      fs.existsSync(path.join(dir, 'Assets')) &&
      fs.existsSync(path.join(dir, 'Packages')) &&
      fs.statSync(path.join(dir, 'Assets')).isDirectory() &&
      fs.statSync(path.join(dir, 'Packages')).isDirectory()
    );
  } catch {
    return false;
  }
};

const inferUnityProjectRootFromDir = startDir => {
  // First, search immediate child directories (1 level deep)
  try {
    const entries = fs.readdirSync(startDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip hidden directories and common non-project directories
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const childDir = path.join(startDir, entry.name);
      if (looksLikeUnityProjectRoot(childDir)) return childDir;
    }
  } catch {
    // Fall through to upward search
  }
  // If not found in children, walk up to find a Unity project
  try {
    let dir = startDir;
    const { root } = path.parse(dir);
    while (true) {
      if (looksLikeUnityProjectRoot(dir)) return dir;
      if (dir === root) break;
      dir = path.dirname(dir);
    }
  } catch {
    // Ignore errors (e.g., permission denied)
  }
  return null;
};

const resolveDefaultCodeIndexRoot = projectRoot => {
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
    // Env-driven project root override (explicit, deterministic)
    const envRootRaw = process.env.UNITY_PROJECT_ROOT;
    if (typeof envRootRaw === 'string' && envRootRaw.trim().length > 0) {
      const envRoot = envRootRaw.trim();
      const projectRoot = normalize(path.resolve(envRoot));
      const codeIndexRoot = normalize(resolveDefaultCodeIndexRoot(projectRoot));
      this.cached = {
        projectRoot,
        assetsPath: normalize(path.join(projectRoot, 'Assets')),
        packagesPath: normalize(path.join(projectRoot, 'Packages')),
        packageCachePath: normalize(path.join(projectRoot, 'Library/PackageCache')),
        codeIndexRoot
      };
      return this.cached;
    }

    // Config-driven project root (env is mapped into config.project.root)
    const cfgRootRaw = config?.project?.root;
    if (typeof cfgRootRaw === 'string' && cfgRootRaw.trim().length > 0) {
      const cfgRoot = cfgRootRaw.trim();
      // Resolve relative paths against WORKSPACE_ROOT
      const projectRoot = normalize(
        path.isAbsolute(cfgRoot) ? cfgRoot : path.resolve(WORKSPACE_ROOT, cfgRoot)
      );
      const codeIndexRoot = normalize(
        config?.project?.codeIndexRoot || resolveDefaultCodeIndexRoot(projectRoot)
      );
      this.cached = {
        projectRoot,
        assetsPath: normalize(path.join(projectRoot, 'Assets')),
        packagesPath: normalize(path.join(projectRoot, 'Packages')),
        packageCachePath: normalize(path.join(projectRoot, 'Library/PackageCache')),
        codeIndexRoot
      };
      return this.cached;
    }
    // Try Unity if connected (rate-limit attempts)
    const now = Date.now();
    if (this.unityConnection && this.unityConnection.isConnected() && now - this.lastTried > 1000) {
      this.lastTried = now;
      try {
        const info = await this.unityConnection.sendCommand('get_editor_info', {});
        if (info && info.projectRoot && info.assetsPath) {
          const projectRoot = normalize(info.projectRoot);
          const assetsPath = normalize(info.assetsPath || path.join(info.projectRoot, 'Assets'));
          const packagesPath = normalize(
            info.packagesPath || path.join(info.projectRoot, 'Packages')
          );
          let localReady = false;
          try {
            localReady =
              fs.existsSync(assetsPath) &&
              fs.existsSync(packagesPath) &&
              fs.statSync(assetsPath).isDirectory() &&
              fs.statSync(packagesPath).isDirectory();
          } catch {
            localReady = false;
          }

          if (localReady) {
            this.cached = {
              projectRoot,
              assetsPath,
              packagesPath,
              packageCachePath: normalize(
                info.packageCachePath || path.join(info.projectRoot, 'Library/PackageCache')
              ),
              codeIndexRoot: normalize(
                info.codeIndexRoot || resolveDefaultCodeIndexRoot(info.projectRoot)
              )
            };
            return this.cached;
          }

          logger.warning(
            'get_editor_info returned paths not found locally; falling back to local inference'
          );
        }
      } catch (e) {
        logger.warning(`get_editor_info failed: ${e.message}`);
      }
    }

    // Best-effort local inference (when Unity isn't connected)
    const inferredRoot = inferUnityProjectRootFromDir(process.cwd());
    if (inferredRoot) {
      const projectRoot = normalize(inferredRoot);
      const codeIndexRoot = normalize(resolveDefaultCodeIndexRoot(projectRoot));
      this.cached = {
        projectRoot,
        assetsPath: normalize(path.join(projectRoot, 'Assets')),
        packagesPath: normalize(path.join(projectRoot, 'Packages')),
        packageCachePath: normalize(path.join(projectRoot, 'Library/PackageCache')),
        codeIndexRoot
      };
      return this.cached;
    }

    throw new Error(
      'Unable to resolve Unity project root. Start the server inside a Unity project (directory containing Assets/ and Packages/) or set UNITY_PROJECT_ROOT.'
    );
  }

  inferFromCwd() {
    return null;
  }
}
