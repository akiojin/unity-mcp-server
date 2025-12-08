import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { CodeIndex } from '../../core/codeIndex.js';
import { JobManager } from '../../core/jobManager.js';

export class ScriptSymbolFindToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_symbol_find',
      'Find symbol definitions by name (class/method/field/property) using the bundled C# LSP. Guidance: prefer narrowing by kind and set exact=true when possible; use scope=assets|packages to avoid large outputs. Use results (container, namespace) to construct container namePath like Outer/Nested/Member for subsequent edit tools.',
      {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Symbol name to search (exact or fuzzy based on "exact").'
          },
          kind: {
            type: 'string',
            description: 'Optional: narrow by symbol kind (class, method, field, property).'
          },
          scope: {
            type: 'string',
            enum: ['assets', 'packages', 'embedded', 'all'],
            description:
              'Search scope: assets (Assets/), packages (Packages/), embedded, or all (default: all).'
          },
          exact: {
            type: 'boolean',
            description:
              'If true, match name exactly; otherwise allows partial matches (default: false).'
          }
        },
        required: ['name']
      }
    );
    this.unityConnection = unityConnection;
    this.index = new CodeIndex(unityConnection);
    this.jobManager = JobManager.getInstance();
  }

  validate(params) {
    super.validate(params);

    const { name } = params;

    if (!name || name.trim() === '') {
      throw new Error('name cannot be empty');
    }
  }

  async execute(params) {
    const { name, kind, scope = 'assets', exact = false } = params;

    // Check if code index is ready - no fallback to LSP
    const ready = await this.index.isReady();
    if (this.index.disabled) {
      return {
        success: false,
        error: 'code_index_unavailable',
        message:
          this.index.disableReason ||
          'Code index is disabled because the SQLite driver could not be loaded.',
        remediation:
          'Ensure sql.js is installed by running "npm install sql.js". After installing, restart unity-mcp-server.'
      };
    }

    if (!ready) {
      // Check if a build job is currently running
      const allJobs = this.jobManager.getAllJobs();
      const buildJob = allJobs.find(
        job =>
          (job.id.startsWith('build-') || job.id.startsWith('watcher-')) && job.status === 'running'
      );

      if (buildJob) {
        const progress = buildJob.progress || {};
        const pct =
          progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
        return {
          success: false,
          error: 'index_building',
          message: `Code index is currently being built. Please wait and retry. Progress: ${pct}% (${progress.processed || 0}/${progress.total || 0})`,
          jobId: buildJob.id,
          progress: {
            processed: progress.processed || 0,
            total: progress.total || 0,
            percentage: pct
          }
        };
      }

      // No build job running - index not available
      return {
        success: false,
        error: 'index_not_ready',
        message:
          'Code index is not built. Run code_index_build first, or wait for auto-build to complete on server startup.',
        hint: 'Use code_index_status to check index state, or code_index_build to start a build manually.'
      };
    }

    // DB index is ready - use it
    const rows = await this.index.querySymbols({ name, kind, scope, exact });
    let results = rows.map(r => ({
      // Index returns project-relative paths already
      path: (r.path || '').replace(/\\\\/g, '/'),
      symbol: {
        name: r.name,
        kind: r.kind,
        namespace: r.ns,
        container: r.container,
        startLine: r.line,
        startColumn: r.column,
        endLine: r.line,
        endColumn: r.column
      }
    }));
    // Optional post-filtering: scope and exact name
    if (scope && scope !== 'all') {
      results = results.filter(x => {
        const p = (x.path || '').replace(/\\\\/g, '/');
        switch (scope) {
          case 'assets':
            return p.startsWith('Assets/');
          case 'packages':
            return p.startsWith('Packages/') || p.startsWith('Library/PackageCache/');
          case 'embedded':
            return p.startsWith('Packages/');
          default:
            return true;
        }
      });
    }
    if (exact) {
      const target = String(name);
      results = results.filter(x => x.symbol && x.symbol.name === target);
    }
    return { success: true, results, total: results.length };
  }
}
