import fs from 'fs';
import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { logger } from '../../core/config.js';

export class ScriptPackagesListToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'list_packages',
      '[OFFLINE] No Unity connection required. List Unity packages in the project (optionally include built‑in). BEST PRACTICES: Use to discover available packages and their paths. Set includeBuiltIn=false to see only user packages. Returns package IDs, versions, and resolved paths. Embedded packages can be edited directly. Essential for understanding project dependencies.',
      {
        type: 'object',
        properties: {
          includeBuiltIn: {
            type: 'boolean',
            description: 'If true, includes built‑in packages in results (default: false).'
          }
        },
        required: []
      }
    );
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
  }

  async execute(params) {
    const { includeBuiltIn = false } = params;
    const info = await this.projectInfo.get();

    // Prefer packages-lock.json for authoritative list (includes builtin/embedded/registry)
    const lockPath = path.join(info.projectRoot, 'Packages', 'packages-lock.json');
    const manifestPath = path.join(info.projectRoot, 'Packages', 'manifest.json');
    let results = [];
    try {
      if (fs.existsSync(lockPath)) {
        const json = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        const deps = json?.dependencies || {};
        for (const [name, meta] of Object.entries(deps)) {
          const source = String(meta.source || '').toLowerCase();
          if (!includeBuiltIn && source === 'builtin') continue;
          const version = String(meta.version || '');
          let resolvedPath = null;
          let isEmbedded = source === 'embedded';
          if (isEmbedded) {
            // For embedded, manifest specifies file:folder
            try {
              const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              const spec = man?.dependencies?.[name];
              if (typeof spec === 'string' && spec.startsWith('file:')) {
                const folder = spec.substring('file:'.length);
                resolvedPath = path.join(info.projectRoot, 'Packages', folder).replace(/\\/g, '/');
              }
            } catch {}
          }
          results.push({
            packageId: `${name}@${version}`,
            name,
            displayName: name,
            version,
            source,
            isEmbedded,
            resolvedPath
          });
        }
      } else if (fs.existsSync(manifestPath)) {
        const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const deps = man?.dependencies || {};
        for (const [name, spec] of Object.entries(deps)) {
          let source = 'registry';
          let version = String(spec);
          let resolvedPath = null;
          let isEmbedded = false;
          if (version.startsWith('file:')) {
            source = 'embedded';
            isEmbedded = true;
            const folder = version.substring('file:'.length);
            resolvedPath = path.join(info.projectRoot, 'Packages', folder).replace(/\\/g, '/');
          }
          if (!includeBuiltIn && source === 'builtin') continue;
          results.push({
            packageId: `${name}@${version}`,
            name,
            displayName: name,
            version,
            source,
            isEmbedded,
            resolvedPath
          });
        }
      } else {
        return { success: true, packages: [], totalCount: 0 };
      }
    } catch (e) {
      logger.error(`[list_packages] local parse failed: ${e.message}`);
      return { error: e.message };
    }

    // Sort by name
    results.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, packages: results, totalCount: results.length };
  }
}
