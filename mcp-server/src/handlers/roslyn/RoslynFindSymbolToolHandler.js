import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from './RoslynCliUtils.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { openDb, upsertFile, replaceSymbols, querySymbolsByName, isFresh } from '../../core/codeIndexDb.js';

export class RoslynFindSymbolToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'roslyn_find_symbol',
      'Find symbols using external Roslyn CLI (no Unity communication).',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name (substring match)' },
          kind: { type: 'string', description: 'class|struct|interface|enum|method|property|field' },
          relative: { type: 'string', description: 'Optional relative file to restrict' },
        },
        required: ['name']
      }
    );
    this.utils = new RoslynCliUtils(unityConnection);
    this.projectInfo = new ProjectInfoProvider(unityConnection);
  }

  async execute(params) {
    const { name, kind, relative } = params;
    const baseArgs = ['find-symbol'];
    baseArgs.push(...(await this.utils.getSolutionOrProjectArgs()));
    baseArgs.push('--name', String(name));
    if (kind) baseArgs.push('--kind', String(kind));
    if (relative) baseArgs.push('--relative', String(relative).replace(/\\\\/g, '/'));
    // Try DB first (fresh files only)
    try {
      const info = await this.projectInfo.get();
      const db = openDb(info.projectRoot);
      const cached = querySymbolsByName(db, String(name), kind ? String(kind) : null)
        .filter(r => isFresh(info.projectRoot, r.path, db));
      if (cached.length > 0 && !relative) {
        return { success: true, results: cached.map(r => ({ path: r.path, name: r.name, kind: r.kind, line: r.line, column: r.column, container: r.container, ns: r.ns })), total: cached.length };
      }
    } catch (e) { /* ignore cache errors */ }
    // Fallback to CLI, then update DB
    const res = await this.utils.runCli(baseArgs);
    try {
      const info = await this.projectInfo.get();
      const db = openDb(info.projectRoot);
      for (const r of (res.results || [])) {
        try {
          const abs = require('path').join(info.projectRoot, r.path);
          const st = require('fs').statSync(abs);
          upsertFile(db, r.path, st.mtimeMs);
        } catch { upsertFile(db, r.path, Date.now()); }
      }
      // Group symbols by file and store
      const byFile = new Map();
      for (const r of (res.results || [])) {
        if (!byFile.has(r.path)) byFile.set(r.path, []);
        byFile.get(r.path).push({ name: r.name, kind: r.kind, container: r.container, ns: r.ns, line: r.line, column: r.column });
      }
      for (const [p, rows] of byFile.entries()) replaceSymbols(db, p, rows);
    } catch {}
    return res;
  }
}
