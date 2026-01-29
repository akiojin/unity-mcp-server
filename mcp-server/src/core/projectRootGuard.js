import path from 'node:path';
import { ProjectInfoProvider } from './projectInfo.js';

const normalizeRoot = root => {
  if (!root) return '';
  const resolved = path.resolve(String(root));
  const normalized = resolved.replace(/\\/g, '/').replace(/\/+$/g, '');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
};

export function createProjectRootGuard({
  requireClientRoot = false,
  projectInfoProvider = null,
  logger = null
} = {}) {
  const provider = projectInfoProvider || new ProjectInfoProvider();
  let cachedRoot = null;

  const getServerRoot = async () => {
    if (cachedRoot) return cachedRoot;
    try {
      const info = await provider.get();
      cachedRoot = normalizeRoot(info?.projectRoot || '');
    } catch (e) {
      logger?.warning?.(`[unity-mcp-server] project root resolve failed: ${e.message}`);
    }
    return cachedRoot;
  };

  return async function guard(args = {}) {
    const clientRootRaw = args?.projectRoot;
    if (!requireClientRoot && !clientRootRaw) return null;

    if (!clientRootRaw) {
      return 'projectRoot is required. Call get_server_info and pass projectRoot with tool arguments.';
    }

    const clientRoot = normalizeRoot(clientRootRaw);
    const serverRoot = await getServerRoot();
    if (!serverRoot) {
      return 'server projectRoot could not be resolved';
    }
    if (clientRoot !== serverRoot) {
      return `projectRoot mismatch (client=${clientRootRaw}, server=${serverRoot})`;
    }
    return null;
  };
}
