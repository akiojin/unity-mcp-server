import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { ProjectInfoProvider } from './projectInfo.js';

export class CodeIndex {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.db = null;
    this.dbPath = null;
  }

  async open() {
    if (this.db) return this.db;
    const info = await this.projectInfo.get();
    const dir = info.codeIndexRoot;
    fs.mkdirSync(dir, { recursive: true });
    const dbPath = path.join(dir, 'code-index.db');
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this._initSchema();
    return this.db;
  }

  _initSchema() {
    const db = this.db;
    db.exec(`
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS symbols (
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        container TEXT,
        namespace TEXT,
        line INTEGER,
        column INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
      CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);
      CREATE INDEX IF NOT EXISTS idx_symbols_path ON symbols(path);
    `);
  }

  async isReady() {
    await this.open();
    const row = this.db.prepare('SELECT COUNT(*) AS c FROM symbols').get();
    return (row?.c || 0) > 0;
  }

  async clearAndLoad(symbols) {
    await this.open();
    const db = this.db;
    const insert = db.prepare('INSERT INTO symbols(path,name,kind,container,namespace,line,column) VALUES (?,?,?,?,?,?,?)');
    const tx = db.transaction((rows) => {
      db.exec('DELETE FROM symbols');
      for (const r of rows) {
        insert.run(r.path, r.name, r.kind, r.container || null, r.ns || r.namespace || null, r.line || null, r.column || null);
      }
      db.prepare('REPLACE INTO meta(key,value) VALUES (?,?)').run('lastIndexedAt', new Date().toISOString());
    });
    tx(symbols || []);
    return { total: symbols?.length || 0 };
  }

  async querySymbols({ name, kind, scope = 'all', exact = false }) {
    await this.open();
    let sql = 'SELECT path,name,kind,container,namespace,line,column FROM symbols WHERE 1=1';
    const params = {};
    if (name) {
      if (exact) { sql += ' AND name = @name'; params.name = name; }
      else { sql += ' AND name LIKE @name'; params.name = `%${name}%`; }
    }
    if (kind) { sql += ' AND kind = @kind'; params.kind = kind; }
    const rows = this.db.prepare(sql).all(params);
    // Apply path-based scope filter in JS (simpler than CASE in SQL)
    const filtered = rows.filter(r => {
      const p = String(r.path || '').replace(/\\\\/g, '/');
      if (scope === 'assets') return p.startsWith('Assets/');
      if (scope === 'packages') return p.startsWith('Packages/') || p.includes('Library/PackageCache/');
      if (scope === 'embedded') return p.startsWith('Packages/');
      return true;
    });
    return filtered.map(r => ({ path: r.path, name: r.name, kind: r.kind, container: r.container, ns: r.namespace, line: r.line, column: r.column }));
  }

  async getStats() {
    await this.open();
    const total = this.db.prepare('SELECT COUNT(*) AS c FROM symbols').get().c || 0;
    const last = this.db.prepare("SELECT value AS v FROM meta WHERE key = 'lastIndexedAt'").get()?.v || null;
    return { total, lastIndexedAt: last };
  }
}
