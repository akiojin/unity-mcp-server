import fs from 'fs';
import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { CodeIndex } from '../../core/codeIndex.js';
import { LspRpcClientSingleton } from '../../lsp/LspRpcClientSingleton.js';

/**
 * Incrementally refresh the persistent code index after local edits.
 * Rather than rebuilding the entire database, this tool re-parses the
 * specified C# files via the LSP and replaces the cached symbol rows.
 *
 * This keeps script_edit_* workflows in sync with the latest edits
 * without forcing a long-running full index rebuild.
 */
export class CodeIndexUpdateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'update_index',
      '[OFFLINE] No Unity connection required. Refresh code index entries for specific C# files. Use this after modifying files so script editing tools see the latest symbols.',
      {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' },
            description: 'List of absolute or project-relative C# file paths to re-index.'
          },
          retry: {
            type: 'number',
            description: 'Number of retries when requesting document symbols (default 1).'
          },
          concurrency: {
            type: 'number',
            description: 'Maximum number of concurrent LSP requests. Default 4.'
          }
        },
        required: ['paths']
      }
    );

    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.index = new CodeIndex(unityConnection);
    this.lsp = null;
  }

  async execute(params = {}) {
    const requested = Array.isArray(params.paths) ? params.paths : [];
    if (requested.length === 0) {
      return {
        success: false,
        error: 'invalid_arguments',
        message: 'paths must be a non-empty array.'
      };
    }

    const info = await this.projectInfo.get();
    const projectRoot = info.projectRoot;

    if (!this.lsp) {
      this.lsp = await LspRpcClientSingleton.getInstance(projectRoot);
    }

    const normalized = requested.map(p => this._normalizePath(p, projectRoot));
    const seen = new Set();
    const files = [];
    for (const file of normalized) {
      const key = file.absolute.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(file);
    }
    const missing = files.filter(f => !fs.existsSync(f.absolute));
    if (missing.length === files.length) {
      return {
        success: false,
        error: 'files_not_found',
        message: 'None of the specified files exist on disk.',
        missing: missing.map(m => m.requested)
      };
    }

    const retry = Math.max(0, Math.min(5, Number(params.retry ?? 1)));
    const concurrency = Math.max(1, Math.min(16, Number(params.concurrency ?? 4)));

    const successes = new Set();
    const failures = [];
    const skipped = [];
    let cursor = 0;
    const total = files.length;

    const worker = async () => {
      while (true) {
        const current = cursor++;
        if (current >= total) break;
        const item = files[current];
        try {
          if (!fs.existsSync(item.absolute)) {
            skipped.push({ path: item.requested, reason: 'missing' });
            failures.push({ path: item.requested, reason: 'missing' });
            continue;
          }
          if (!item.absolute.endsWith('.cs')) {
            skipped.push({ path: item.requested, reason: 'unsupported_extension' });
            failures.push({ path: item.requested, reason: 'unsupported_extension' });
            continue;
          }

          await this._updateSingle(item, retry);
          successes.add(item.relative);
        } catch (err) {
          failures.push({ path: item.requested, reason: err?.message || String(err) });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, () => worker()));

    const result = {
      success: failures.length === 0,
      updated: successes.size,
      skipped
    };

    if (failures.length > 0) {
      result.partialSuccess = successes.size > 0;
      result.failures = failures;
    } else {
      delete result.skipped;
    }

    return result;
  }

  _normalizePath(input, projectRoot) {
    const requested = String(input);
    const normalized = requested.replace(/\\/g, '/');
    const absolute = path.isAbsolute(normalized)
      ? normalized
      : path.resolve(projectRoot, normalized);
    return {
      requested,
      absolute,
      relative: this._toRelative(absolute, projectRoot)
    };
  }

  async _updateSingle(fileInfo, retry) {
    const uri = 'file://' + fileInfo.absolute.replace(/\\/g, '/');
    const docSymbols = await this._requestDocumentSymbols(uri, retry);
    const rows = this._symbolsToRows(fileInfo.relative, docSymbols);
    await this.index.replaceSymbolsForPath(fileInfo.relative, rows);
    await this.index.upsertFile(fileInfo.relative, this._signature(fileInfo.absolute));
  }

  async _requestDocumentSymbols(uri, retry) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retry; attempt += 1) {
      try {
        const res = await this.lsp.request('textDocument/documentSymbol', {
          textDocument: { uri }
        });
        return res?.result ?? res;
      } catch (err) {
        lastErr = err;
        if (attempt < retry) {
          await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
        }
      }
    }
    throw lastErr || new Error('documentSymbol failed');
  }

  _symbolsToRows(relativePath, symbols) {
    const rows = [];
    const visit = (symbol, container) => {
      if (!symbol) return;
      const kind = this._kindFromLsp(symbol.kind);
      const name = symbol.name || '';
      const start = symbol.range?.start || symbol.selectionRange?.start || {};
      rows.push({
        path: relativePath,
        name,
        kind,
        container: container || null,
        namespace: null,
        line: (start.line ?? 0) + 1,
        column: (start.character ?? 0) + 1
      });
      if (Array.isArray(symbol.children)) {
        for (const child of symbol.children) {
          visit(child, name || container);
        }
      }
    };

    if (Array.isArray(symbols)) {
      for (const s of symbols) visit(s, null);
    }
    return rows;
  }

  _signature(absPath) {
    try {
      const st = fs.statSync(absPath);
      return `${st.size}-${Math.floor(st.mtimeMs)}`;
    } catch {
      return '0-0';
    }
  }

  _toRelative(absPath, projectRoot) {
    const normAbs = String(absPath).replace(/\\/g, '/');
    const normRoot = String(projectRoot).replace(/\\/g, '/').replace(/\/$/, '');
    return normAbs.startsWith(normRoot) ? normAbs.substring(normRoot.length + 1) : normAbs;
  }

  _kindFromLsp(kind) {
    switch (kind) {
      case 5:
        return 'class';
      case 23:
        return 'struct';
      case 11:
        return 'interface';
      case 10:
        return 'enum';
      case 6:
        return 'method';
      case 7:
        return 'property';
      case 8:
        return 'field';
      case 3:
        return 'namespace';
      case 9:
        return 'constructor';
      default:
        return 'symbol';
    }
  }
}
