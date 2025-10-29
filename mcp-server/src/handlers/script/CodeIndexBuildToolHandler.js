import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { CodeIndex } from '../../core/codeIndex.js';
import fs from 'fs';
import path from 'path';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { LspRpcClient } from '../../lsp/LspRpcClient.js';
import { logger } from '../../core/config.js';
import { JobManager } from '../../core/jobManager.js';

export class CodeIndexBuildToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'code_index_build',
      'Build (or rebuild) the persistent SQLite symbol index by scanning document symbols via the C# LSP. Returns immediately with jobId for background execution. Check progress with script_index_status. Stores DB under .unity/cache/code-index/code-index.db.',
      {
        type: 'object',
        properties: {},
        required: []
      }
    );
    this.unityConnection = unityConnection;
    this.index = new CodeIndex(unityConnection);
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.lsp = null; // lazy init with projectRoot
    this.jobManager = JobManager.getInstance();
    this.currentJobId = null; // Track current running job
  }

  async execute(params = {}) {
    // Check if a build is already running
    if (this.currentJobId) {
      const existingJob = this.jobManager.get(this.currentJobId);
      if (existingJob && existingJob.status === 'running') {
        return {
          success: false,
          error: 'build_already_running',
          message: `Code index build is already running (jobId: ${this.currentJobId}). Use script_index_status to check progress.`,
          jobId: this.currentJobId
        };
      }
    }

    // Generate new jobId
    const jobId = `build-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    this.currentJobId = jobId;

    // Create background job
    this.jobManager.create(jobId, async (job) => {
      return await this._executeBuild(params, job);
    });

    // Return immediately with jobId
    return {
      success: true,
      jobId,
      message: 'Code index build started in background',
      checkStatus: 'Use script_index_status to check progress and completion'
    };
  }

  /**
   * Internal method that performs the actual build
   * @private
   */
  async _executeBuild(params, job) {
    try {
      const info = await this.projectInfo.get();
      const roots = [
        path.resolve(info.projectRoot, 'Assets'),
        path.resolve(info.projectRoot, 'Packages'),
        path.resolve(info.projectRoot, 'Library/PackageCache'),
      ];
      const files = [];
      const seen = new Set();
      for (const r of roots) this.walkCs(r, files, seen);

      // Initialize LSP with error handling
      if (!this.lsp) {
        try {
          this.lsp = new LspRpcClient(info.projectRoot);
          logger.info(`[index][${job.id}] LSP initialized for project: ${info.projectRoot}`);
        } catch (lspError) {
          logger.error(`[index][${job.id}] LSP initialization failed: ${lspError.message}`);
          throw new Error(`LSP initialization failed: ${lspError.message}. Ensure C# LSP is properly configured and OmniSharp is available.`);
        }
      }
      const lsp = this.lsp;

      // Incremental detection based on size-mtime signature
      const makeSig = (abs) => {
        try { const st = fs.statSync(abs); return `${st.size}-${Math.floor(st.mtimeMs)}`; } catch { return '0-0'; }
      };
      const wanted = new Map(files.map(abs => [this.toRel(abs, info.projectRoot), makeSig(abs)]));
      const current = await this.index.getFiles();
      const changed = [];
      const removed = [];
      for (const [rel, sig] of wanted) {
        if (current.get(rel) !== sig) changed.push(rel);
      }
      for (const [rel] of current) if (!wanted.has(rel)) removed.push(rel);
      const toRows = (uri, symbols) => {
        const rel = this.toRel(uri.replace('file://', ''), info.projectRoot);
        const rows = [];
        const visit = (s, container) => {
          const kind = this.kindFromLsp(s.kind);
          const name = s.name || '';
          const start = s.range?.start || s.selectionRange?.start || {};
          rows.push({ path: rel, name, kind, container: container || null, ns: null, line: (start.line ?? 0) + 1, column: (start.character ?? 0) + 1 });
          if (Array.isArray(s.children)) for (const c of s.children) visit(c, name || container);
        };
        if (Array.isArray(symbols)) for (const s of symbols) visit(s, null);
        return rows;
      };

      // Remove vanished files
      for (const rel of removed) await this.index.removeFile(rel);

      // Update changed files
      const absList = changed.map(rel => path.resolve(info.projectRoot, rel));
      const concurrency = Math.max(1, Math.min(64, Number(params?.concurrency ?? 8)));
      const reportEvery = Math.max(1, Number(params?.reportEvery ?? 100));
      const startAt = Date.now();
      let i = 0; let updated = 0; let processed = 0;

      // Initialize progress
      job.progress.total = absList.length;
      job.progress.processed = 0;
      job.progress.rate = 0;

      logger.info(`[index][${job.id}] Build started: ${absList.length} files to process, ${removed.length} to remove (status: ${job.status})`);

      // LSP request with small retry/backoff
      const requestWithRetry = async (uri, maxRetries = Math.max(0, Math.min(5, Number(params?.retry ?? 2)))) => {
        let lastErr = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const res = await lsp.request('textDocument/documentSymbol', { textDocument: { uri } });
            return res?.result ?? res;
          } catch (err) {
            lastErr = err;
            await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
          }
        }
        throw lastErr || new Error('documentSymbol failed');
      };
      const worker = async () => {
        while (true) {
          const idx = i++;
          if (idx >= absList.length) break;
          const abs = absList[idx];
          const rel = this.toRel(abs, info.projectRoot);
          try {
            const uri = 'file://' + abs.replace(/\\/g, '/');
            const docSymbols = await requestWithRetry(uri, 2);
            const rows = toRows(uri, docSymbols);
            await this.index.replaceSymbolsForPath(rel, rows);
            await this.index.upsertFile(rel, wanted.get(rel));
            updated += 1;
          } catch (err) {
            // File access or LSP error - skip and continue
            // This allows build to continue even if some files fail
            if (processed % 50 === 0) {
              // Log occasionally to avoid spam
              logger.warn(`[index][${job.id}] Skipped file due to error: ${rel} - ${err.message}`);
            }
          }
          finally {
            processed += 1;

            // Update job progress
            const elapsed = Math.max(1, Date.now() - startAt);
            job.progress.processed = processed;
            job.progress.rate = parseFloat((processed * 1000 / elapsed).toFixed(1));

            if (processed % reportEvery === 0 || processed === absList.length) {
              logger.info(`[index][${job.id}] progress ${processed}/${absList.length} (removed:${removed.length}) rate:${job.progress.rate} f/s (status: ${job.status})`);
            }
          }
        }
      };
      const workers = Array.from({ length: Math.min(concurrency, absList.length) }, () => worker());
      await Promise.all(workers);

      const stats = await this.index.getStats();

      // Clear current job tracking on success
      if (this.currentJobId === job.id) {
        this.currentJobId = null;
      }

      const result = {
        updatedFiles: updated,
        removedFiles: removed.length,
        totalIndexedSymbols: stats.total,
        lastIndexedAt: stats.lastIndexedAt
      };

      logger.info(`[index][${job.id}] Build completed successfully: updated=${result.updatedFiles}, removed=${result.removedFiles}, total=${result.totalIndexedSymbols} (status: completed)`);

      return result;
    } catch (e) {
      // Clear current job tracking on error
      if (this.currentJobId === job.id) {
        this.currentJobId = null;
      }

      // Log detailed error with job context
      logger.error(`[index][${job.id}] Build failed: ${e.message} (status: failed)`);

      // Provide helpful error message with context
      const errorMessage = e.message.includes('LSP')
        ? `LSP error: ${e.message}`
        : `Build error: ${e.message}. Hint: C# LSP not ready. Ensure manifest/auto-download and workspace paths are valid.`;

      throw new Error(errorMessage);
    }
  }

  walkCs(root, files, seen) {
    try {
      if (!fs.existsSync(root)) return;
      const st = fs.statSync(root);
      if (st.isFile()) {
        if (root.endsWith('.cs') && !seen.has(root)) { files.push(root); seen.add(root); }
        return;
      }
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'obj' || e.name === 'bin' || e.name.startsWith('.')) continue;
        this.walkCs(path.join(root, e.name), files, seen);
      }
    } catch {}
  }

  toRel(full, projectRoot) {
    const normFull = String(full).replace(/\\/g, '/');
    const normRoot = String(projectRoot).replace(/\\/g, '/').replace(/\/$/, '');
    return normFull.startsWith(normRoot) ? normFull.substring(normRoot.length + 1) : normFull;
  }

  kindFromLsp(k) {
    switch (k) {
      case 5: return 'class';
      case 23: return 'struct';
      case 11: return 'interface';
      case 10: return 'enum';
      case 6: return 'method';
      case 7: return 'property';
      case 8: return 'field';
      case 3: return 'namespace';    }
  }
}
