#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ABI_BY_NODE_MAJOR = new Map([
  [18, 115],
  [20, 120],
  [22, 131],
  [24, 137]
]);

export function parseEnvFlag(value) {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function resolveNodeMajor(nodeVersion) {
  if (!nodeVersion) return null;
  const major = Number.parseInt(String(nodeVersion).split('.')[0], 10);
  return Number.isFinite(major) ? major : null;
}

export function resolveNodeAbi({ nodeVersion, nodeAbi } = {}) {
  const abi = Number.parseInt(nodeAbi, 10);
  if (Number.isFinite(abi)) return abi;
  const major = resolveNodeMajor(nodeVersion);
  if (!major) return null;
  return ABI_BY_NODE_MAJOR.get(major) ?? null;
}

export function resolveRuntimeInfo({
  env = process.env,
  platform = process.platform,
  arch = process.arch,
  nodeVersion = process.versions?.node,
  nodeAbi = process.versions?.modules
} = {}) {
  const resolvedPlatform = env.UNITY_MCP_PLATFORM || platform;
  const resolvedArch = env.UNITY_MCP_ARCH || arch;
  const envNodeMajor = env.UNITY_MCP_NODE_MAJOR
    ? Number.parseInt(env.UNITY_MCP_NODE_MAJOR, 10)
    : null;
  const resolvedNodeMajor = Number.isFinite(envNodeMajor)
    ? envNodeMajor
    : resolveNodeMajor(nodeVersion);
  const envNodeAbi = env.UNITY_MCP_NODE_ABI ? Number.parseInt(env.UNITY_MCP_NODE_ABI, 10) : null;
  const resolvedNodeAbi = Number.isFinite(envNodeAbi)
    ? envNodeAbi
    : resolveNodeAbi({ nodeVersion, nodeAbi });

  return {
    platform: resolvedPlatform,
    arch: resolvedArch,
    nodeMajor: resolvedNodeMajor,
    nodeAbi: resolvedNodeAbi
  };
}

export function buildPlatformKey({ platform, arch, nodeMajor }) {
  if (!platform || !arch || !nodeMajor) return null;
  return `${platform}-${arch}-node${nodeMajor}`;
}

export function resolvePackageRoot(env = process.env) {
  if (env.UNITY_MCP_PACKAGE_ROOT) {
    return path.resolve(env.UNITY_MCP_PACKAGE_ROOT);
  }
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, '..');
}

export function resolvePrebuiltRoot(packageRoot, env = process.env) {
  if (env.UNITY_MCP_PREBUILT_DIR) {
    return path.resolve(env.UNITY_MCP_PREBUILT_DIR);
  }
  return path.join(packageRoot, 'prebuilt', 'better-sqlite3');
}

export function resolveBetterSqlite3Root(packageRoot, env = process.env) {
  if (env.UNITY_MCP_BETTER_SQLITE3_ROOT) {
    return path.resolve(env.UNITY_MCP_BETTER_SQLITE3_ROOT);
  }
  try {
    const req = createRequire(path.join(packageRoot, 'package.json'));
    const pkgPath = req.resolve('better-sqlite3/package.json');
    return path.dirname(pkgPath);
  } catch {
    return path.join(packageRoot, 'node_modules', 'better-sqlite3');
  }
}

export function resolvePrebuiltBindingPath(prebuiltRoot, platformKey) {
  if (!prebuiltRoot || !platformKey) return null;
  return path.join(prebuiltRoot, platformKey, 'better_sqlite3.node');
}

export function resolveInstalledBindingPath(moduleRoot) {
  return path.join(moduleRoot, 'build', 'Release', 'better_sqlite3.node');
}

export function ensureBinExecutable({ packageRoot, env = process.env, logger = console } = {}) {
  if (parseEnvFlag(env.UNITY_MCP_SKIP_BIN_CHMOD)) return false;
  const binPath = path.join(packageRoot, 'bin', 'unity-mcp-server.js');
  try {
    if (fs.existsSync(binPath)) {
      fs.chmodSync(binPath, 0o755);
      logger.info(`[ensure-better-sqlite3] chmod +x ${binPath}`);
      return true;
    }
  } catch (err) {
    logger.warn(
      `[ensure-better-sqlite3] Failed to chmod ${binPath}: ${err?.message || String(err)}`
    );
  }
  return false;
}

export function ensureBetterSqlite3({
  env = process.env,
  logger = console,
  packageRoot,
  prebuiltRoot,
  moduleRoot,
  platform,
  arch,
  nodeVersion,
  nodeAbi
} = {}) {
  const skipNative = parseEnvFlag(env.UNITY_MCP_SKIP_NATIVE_BUILD);
  const forceNative = parseEnvFlag(env.UNITY_MCP_FORCE_NATIVE);

  const resolvedPackageRoot = packageRoot || resolvePackageRoot(env);
  const resolvedPrebuiltRoot = prebuiltRoot || resolvePrebuiltRoot(resolvedPackageRoot, env);
  const resolvedModuleRoot = moduleRoot || resolveBetterSqlite3Root(resolvedPackageRoot, env);

  if (skipNative) {
    logger.info('[ensure-better-sqlite3] Native preload skipped (UNITY_MCP_SKIP_NATIVE_BUILD).');
    ensureBinExecutable({ packageRoot: resolvedPackageRoot, env, logger });
    return { action: 'skip' };
  }

  if (!fs.existsSync(resolvedModuleRoot)) {
    const message = `[ensure-better-sqlite3] better-sqlite3 module not found at ${resolvedModuleRoot}`;
    if (forceNative) {
      throw new Error(message);
    }
    logger.warn(message);
    ensureBinExecutable({ packageRoot: resolvedPackageRoot, env, logger });
    return { action: 'no-module' };
  }

  const runtimeInfo = resolveRuntimeInfo({
    env,
    platform,
    arch,
    nodeVersion,
    nodeAbi
  });

  const platformKey = buildPlatformKey(runtimeInfo);
  if (!platformKey) {
    const message = '[ensure-better-sqlite3] Unable to resolve platform key';
    if (forceNative) throw new Error(message);
    logger.warn(message);
    ensureBinExecutable({ packageRoot: resolvedPackageRoot, env, logger });
    return { action: 'fallback' };
  }

  const prebuiltPath = resolvePrebuiltBindingPath(resolvedPrebuiltRoot, platformKey);
  if (!prebuiltPath || !fs.existsSync(prebuiltPath)) {
    const message = `[ensure-better-sqlite3] Prebuilt binary not found for ${platformKey}`;
    if (forceNative) throw new Error(message);
    logger.info(message);
    ensureBinExecutable({ packageRoot: resolvedPackageRoot, env, logger });
    return { action: 'fallback', platformKey, prebuiltPath };
  }

  const destPath = resolveInstalledBindingPath(resolvedModuleRoot);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(prebuiltPath, destPath);
  logger.info(`[ensure-better-sqlite3] Installed prebuilt ${platformKey} -> ${destPath}`);

  ensureBinExecutable({ packageRoot: resolvedPackageRoot, env, logger });
  return { action: 'copied', platformKey, prebuiltPath, destPath };
}

function isCliInvocation() {
  if (!process.argv[1]) return false;
  const invoked = path.resolve(process.argv[1]);
  const current = path.resolve(fileURLToPath(import.meta.url));
  return invoked === current;
}

if (isCliInvocation()) {
  try {
    ensureBetterSqlite3();
  } catch (err) {
    const message = err?.message || String(err);
    console.error(`[ensure-better-sqlite3] ${message}`);
    process.exit(1);
  }
}
