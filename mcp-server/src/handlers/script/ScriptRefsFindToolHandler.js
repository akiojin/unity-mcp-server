import fs from 'fs/promises';
import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { CodeIndex } from '../../core/codeIndex.js';
import { JobManager } from '../../core/jobManager.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';

export class ScriptRefsFindToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_refs_find',
      '[OFFLINE] No Unity connection required. Find code references/usages using fast file-based search. LLM-friendly paging/summary: respects pageSize and maxBytes, caps matches per file (maxMatchesPerFile), and trims snippet text to ~400 chars. Use scope/name/kind/path to narrow results.',
      {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Symbol name to search usages for.'
          },
          scope: {
            type: 'string',
            enum: ['assets', 'packages', 'embedded', 'all'],
            description:
              'Search scope: assets (Assets/), packages (Packages/), embedded, or all (default: all).'
          },
          snippetContext: {
            type: 'number',
            description: 'Number of context lines to include around each match.'
          },
          maxMatchesPerFile: {
            type: 'number',
            description: 'Cap reference matches returned per file.'
          },
          pageSize: {
            type: 'number',
            description: 'Maximum results to return per page.'
          },
          maxBytes: {
            type: 'number',
            description: 'Maximum response size (bytes) to keep outputs LLM‑friendly.'
          },
          container: {
            type: 'string',
            description: 'Optional: container (class) of the symbol.'
          },
          namespace: {
            type: 'string',
            description: 'Optional: namespace of the symbol.'
          },
          path: {
            type: 'string',
            description: 'Optional: constrain to file path containing the symbol.'
          },
          kind: {
            type: 'string',
            description: 'Optional: symbol kind (class, method, field, property).'
          }
        },
        required: ['name']
      }
    );
    this.unityConnection = unityConnection;
    this.index = new CodeIndex(unityConnection);
    this.projectInfo = new ProjectInfoProvider(unityConnection);
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
    const {
      name,
      scope = 'all',
      pageSize = 50,
      maxBytes = 1024 * 64,
      maxMatchesPerFile = 5,
      snippetContext = 1
    } = params;

    // Check if code index is ready - required for references search
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
          'Code index is not built. Run code_index_build first, or wait for auto-build to complete on server startup.',
        hint: 'Use code_index_status to check index state, or code_index_build to start a build manually.'
      };
    }

    // File-based search for references
    const info = await this.projectInfo.get();
    const roots = [];
    if (scope === 'assets' || scope === 'all') roots.push(info.assetsPath);
    if (scope === 'packages' || scope === 'embedded' || scope === 'all')
      roots.push(info.packagesPath);

    // Word-boundary regex for identifier matching
    const namePattern = new RegExp(`\\b${escapeRegex(name)}\\b`);
    const MAX_SNIPPET = 400;
    const raw = [];

    for await (const file of walk(roots)) {
      // Only .cs files
      if (!file.toLowerCase().endsWith('.cs')) continue;

      const rel = toRel(file, info.projectRoot);

      // Scope filtering
      if (scope === 'assets' && !rel.startsWith('Assets/')) continue;
      if (
        scope === 'packages' &&
        !rel.startsWith('Packages/') &&
        !rel.startsWith('Library/PackageCache/')
      )
        continue;
      if (scope === 'embedded' && !rel.startsWith('Packages/')) continue;

      let text;
      try {
        text = await fs.readFile(file, 'utf8');
      } catch {
        continue;
      }

      const lines = text.split('\n');
      let matchCount = 0;

      for (let i = 0; i < lines.length && matchCount < maxMatchesPerFile; i++) {
        const line = lines[i];
        const match = namePattern.exec(line);
        if (match) {
          matchCount++;
          const lineNum = i + 1;
          const column = match.index + 1;

          // Build snippet with context
          const startLine = Math.max(0, i - snippetContext);
          const endLine = Math.min(lines.length - 1, i + snippetContext);
          let snippet = lines.slice(startLine, endLine + 1).join('\n');
          let snippetTruncated = false;

          if (snippet.length > MAX_SNIPPET) {
            snippet = snippet.slice(0, MAX_SNIPPET) + '…';
            snippetTruncated = true;
          }

          raw.push({
            path: rel,
            line: lineNum,
            column,
            snippet,
            ...(snippetTruncated && { snippetTruncated: true })
          });
        }
      }
    }

    // Group by file and apply maxMatchesPerFile
    const perFile = new Map();
    for (const item of raw) {
      const key = item.path;
      const list = perFile.get(key) || [];
      if (list.length < maxMatchesPerFile) {
        list.push(item);
        perFile.set(key, list);
      }
    }

    // Phase 3.3: Grouped output format (more compact, LLM-friendly)
    // Pagination and byte limits with grouped format
    const results = [];
    let bytes = 0;
    let total = 0;
    let truncated = false;

    for (const [filePath, arr] of perFile) {
      const references = [];
      for (const it of arr) {
        const ref = {
          line: it.line,
          column: it.column,
          snippet: it.snippet
        };
        const refJson = JSON.stringify(ref);
        const refSize = Buffer.byteLength(refJson, 'utf8');

        // Check limits before adding
        if (total >= pageSize || bytes + refSize > maxBytes) {
          truncated = true;
          break;
        }
        references.push(ref);
        bytes += refSize;
        total++;
      }

      if (references.length > 0) {
        results.push({ path: filePath, references });
      }

      if (truncated) break;
    }

    // Edge case: extreme limits
    const extremeLimits = pageSize <= 1 || maxBytes <= 1;
    if (extremeLimits && results.length === 0) {
      truncated = true;
    }

    return { success: true, results, total, truncated };
  }
}

// --- Helpers ---

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function* walk(roots) {
  for (const r of roots) {
    if (r) yield* walkDir(r);
  }
}

async function* walkDir(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip common non-code directories
      if (e.name === 'obj' || e.name === 'bin' || e.name === '.git') continue;
      yield* walkDir(p);
    } else if (e.isFile()) {
      yield p.replace(/\\/g, '/');
    }
  }
}

function toRel(abs, projectRoot) {
  const n = abs.replace(/\\/g, '/');
  const base = projectRoot.replace(/\\/g, '/');
  return n.startsWith(base) ? n.substring(base.length + 1) : n;
}
