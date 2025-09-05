import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { CodeIndex } from '../../core/codeIndex.js';
import fs from 'fs';
import path from 'path';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { LspRpcClient } from '../../lsp/LspRpcClient.js';

export class BuildCodeIndexToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'build_code_index',
      'Build a persistent SQLite symbol index using roslyn-cli scan-symbols. Stores DB under Library/UnityMCP/CodeIndex/code-index.db.',
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
  }

  async execute() {
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

      if (!this.lsp) this.lsp = new LspRpcClient(info.projectRoot);
      const lsp = this.lsp;
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

      const concurrency = 8;
      const collected = [];
      let i = 0;
      const worker = async () => {
        while (true) {
          const idx = i++;
          if (idx >= files.length) break;
          const f = files[idx];
          try {
            const uri = 'file://' + f.replace(/\\/g, '/');
            const res = await lsp.request('textDocument/documentSymbol', { textDocument: { uri } });
            const docSymbols = res?.result ?? res;
            const rows = toRows(uri, docSymbols);
            collected.push(...rows);
          } catch {}
        }
      };
      const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
      await Promise.all(workers);

      const symbols = collected;
      const r = await this.index.clearAndLoad(symbols);
      const stats = await this.index.getStats();
      return { success: true, inserted: r.total, total: stats.total, lastIndexedAt: stats.lastIndexedAt };
    } catch (e) {
      return {
        success: false,
        error: 'build_index_failed',
        message: e.message,
        hint: 'C# LSP not ready. Ensure manifest/auto-download and workspace paths are valid.'
      };
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
      case 3: return 'namespace';
      default: return 'symbol';
    }
  }
}
