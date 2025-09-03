import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from './RoslynCliUtils.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { openDb, upsertFile, replaceReferences, queryRefsByName, isFresh } from '../../core/codeIndexDb.js';

export class RoslynFindReferencesToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'roslyn_find_references',
      'Find identifier references using external Roslyn CLI (no Unity communication).',
      {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Identifier name (exact)' },
          relative: { type: 'string', description: 'Optional relative file to restrict' },
        },
        required: ['name']
      }
    );
    this.utils = new RoslynCliUtils(unityConnection);
    this.projectInfo = new ProjectInfoProvider(unityConnection);
  }

  async execute(params) {
    const { name, relative } = params;
    const args = ['find-references'];
    args.push(...(await this.utils.getSolutionOrProjectArgs()));
    args.push('--name', String(name));
    if (relative) args.push('--relative', String(relative).replace(/\\\\/g, '/'));
    // Try DB first when not restricted to a file
    try {
      const info = await this.projectInfo.get();
      const db = openDb(info.projectRoot);
      const cached = queryRefsByName(db, String(name)).filter(r => isFresh(info.projectRoot, r.path, db));
      if (cached.length > 0 && !relative) {
        return { success: true, results: cached.map(r => ({ path: r.path, line: r.line, snippet: r.snippet })), total: cached.length };
      }
    } catch {}
    const res = await this.utils.runCli(args);
    try {
      const info = await this.projectInfo.get();
      const db = openDb(info.projectRoot);
      const fs = require('fs');
      const p = require('path');
      // Upsert file mtimes then store refs
      for (const r of (res.results || [])) {
        try { const st = fs.statSync(p.join(info.projectRoot, r.path)); upsertFile(db, r.path, st.mtimeMs); } catch { upsertFile(db, r.path, Date.now()); }
      }
      const byFile = new Map();
      for (const r of (res.results || [])) {
        if (!byFile.has(r.path)) byFile.set(r.path, []);
        byFile.get(r.path).push({ name: name, line: r.line, snippet: r.snippet });
      }
      for (const [fp, rows] of byFile.entries()) replaceReferences(db, fp, rows);
    } catch {}
    return res;
  }
}
