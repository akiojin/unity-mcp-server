import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { CodeIndex } from '../../core/codeIndex.js';
import { JobManager } from '../../core/jobManager.js';

export class ScriptSymbolFindToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'find_symbol',
      '[OFFLINE] No Unity connection required. Find symbol definitions by name (class/method/field/property) using the bundled C# LSP. Guidance: prefer narrowing by kind and set exact=true when possible; use scope=assets|packages to avoid large outputs. Use results (container, namespace) to construct container namePath like Outer/Nested/Member for subsequent edit tools.',
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
              'Search scope: assets (Assets/), packages (Packages/), embedded, or all (default: assets).'
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
          'Ensure fast-sql is properly installed. After reinstalling dependencies, restart unity-mcp-server.'
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
          'Code index is not built. Run build_index first, or wait for auto-build to complete on server startup.',
        hint: 'Use get_index_status to check index state, or build_index to start a build manually.'
      };
    }

    // DB index is ready - use it
    const rows = await this.index.querySymbols({ name, kind, scope, exact });

    // Note: Scope filtering is now done in SQL (CodeIndex.querySymbols), but keep JS filter for safety
    let filteredRows = rows;
    if (exact) {
      const target = String(name);
      filteredRows = filteredRows.filter(r => r.name === target);
    }

    // Phase 3.2: Grouped output format (40% more compact than pathTable)
    // Group symbols by file path
    const grouped = new Map();
    let total = 0;
    for (const r of filteredRows) {
      const p = (r.path || '').replace(/\\/g, '/');
      if (!grouped.has(p)) {
        grouped.set(p, []);
      }
      const symbol = {
        name: r.name,
        kind: r.kind,
        line: r.line,
        column: r.column
      };
      // Only include non-null optional fields
      if (r.ns) symbol.namespace = r.ns;
      if (r.container) symbol.container = r.container;
      grouped.get(p).push(symbol);
      total++;
    }

    // Convert to array format
    const results = [];
    for (const [path, symbols] of grouped) {
      results.push({ path, symbols });
    }

    return { success: true, results, total };
  }
}
