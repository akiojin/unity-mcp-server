import fs from 'fs';
import path from 'path';
import { ProjectInfoProvider } from './projectInfo.js';
import { logger } from './config.js';

// Shared driver availability state across CodeIndex instances
const driverStatus = {
  available: null,
  error: null,
  logged: false
};

export class CodeIndex {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.db = null;
    this.dbPath = null;
    this.disabled = false; // set true if better-sqlite3 is unavailable
    this.disableReason = null;
    this._Database = null;
  }

  async _ensureDriver() {
    if (driverStatus.available === false || this.disabled) {
      this.disabled = true;
      this.disableReason = this.disableReason || driverStatus.error;
      return false;
    }
    if (this._Database) return true;
    try {
      // Dynamic import to avoid hard failure when native binding is missing
      const mod = await import('better-sqlite3');
      this._Database = mod.default || mod;
      driverStatus.available = true;
      driverStatus.error = null;
      return true;
    } catch (e) {
      // No fallback - fail fast with clear error
      this.disabled = true;
      this.disableReason = `better-sqlite3 native binding unavailable: ${e?.message || e}. Code index features are disabled.`;
      driverStatus.available = false;
      driverStatus.error = this.disableReason;
      this._logDisable(this.disableReason);
      return false;
    }
  }

  async open() {
    if (this.db) return this.db;
    const ok = await this._ensureDriver();
    if (!ok) return null; // index disabled
    const info = await this.projectInfo.get();
    const dir = info.codeIndexRoot;
    fs.mkdirSync(dir, { recursive: true });
    const dbPath = path.join(dir, 'code-index.db');
    this.dbPath = dbPath;
    try {
      if (this._Database) {
        this.db = new this._Database(dbPath);
      } else {
        throw new Error('No database driver available');
      }
    } catch (e) {
      this.disabled = true;
      this.disableReason = e?.message || 'Failed to open code index database';
      driverStatus.available = false;
      driverStatus.error = this.disableReason;
      this._logDisable(this.disableReason);
      return null;
    }
    this._initSchema();
    return this.db;
  }

  _logDisable(reason) {
    if (driverStatus.logged) return;
    driverStatus.logged = true;
    try {
      logger?.warn?.(`[index] code index disabled: ${reason}`);
    } catch {}
  }

  _initSchema() {
    if (!this.db) return;
    const db = this.db;
    db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        sig TEXT,
        updatedAt TEXT
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
    const db = await this.open();
    if (!db) return false;
    const row = db.prepare('SELECT COUNT(*) AS c FROM symbols').get();
    return (row?.c || 0) > 0;
  }

  async clearAndLoad(symbols) {
    const db = await this.open();
    if (!db) throw new Error('CodeIndex is unavailable (better-sqlite3 not installed)');
    const insert = db.prepare(
      'INSERT INTO symbols(path,name,kind,container,namespace,line,column) VALUES (?,?,?,?,?,?,?)'
    );
    const tx = db.transaction(rows => {
      db.exec('DELETE FROM symbols');
      db.exec('DELETE FROM files');
      for (const r of rows) {
        insert.run(
          r.path,
          r.name,
          r.kind,
          r.container || null,
          r.ns || r.namespace || null,
          r.line || null,
          r.column || null
        );
      }
      db.prepare('REPLACE INTO meta(key,value) VALUES (?,?)').run(
        'lastIndexedAt',
        new Date().toISOString()
      );
    });
    tx(symbols || []);
    return { total: symbols?.length || 0 };
  }

  // Incremental APIs
  async getFiles() {
    const db = await this.open();
    if (!db) return new Map();
    const rows = db.prepare('SELECT path, sig FROM files').all();
    const map = new Map();
    for (const r of rows) map.set(String(r.path), String(r.sig || ''));
    return map;
  }

  async upsertFile(pathStr, sig) {
    const db = await this.open();
    if (!db) return;
    db.prepare('REPLACE INTO files(path,sig,updatedAt) VALUES (?,?,?)').run(
      pathStr,
      sig || '',
      new Date().toISOString()
    );
  }

  async removeFile(pathStr) {
    const db = await this.open();
    if (!db) return;
    const tx = db.transaction(p => {
      db.prepare('DELETE FROM symbols WHERE path = ?').run(p);
      db.prepare('DELETE FROM files WHERE path = ?').run(p);
    });
    tx(pathStr);
  }

  async replaceSymbolsForPath(pathStr, rows) {
    const db = await this.open();
    if (!db) return;
    const tx = db.transaction((p, list) => {
      db.prepare('DELETE FROM symbols WHERE path = ?').run(p);
      const insert = db.prepare(
        'INSERT INTO symbols(path,name,kind,container,namespace,line,column) VALUES (?,?,?,?,?,?,?)'
      );
      for (const r of list)
        insert.run(
          p,
          r.name,
          r.kind,
          r.container || null,
          r.ns || r.namespace || null,
          r.line || null,
          r.column || null
        );
      db.prepare('REPLACE INTO meta(key,value) VALUES (?,?)').run(
        'lastIndexedAt',
        new Date().toISOString()
      );
    });
    tx(pathStr, rows || []);
  }

  async querySymbols({ name, kind, scope = 'all', exact = false }) {
    const db = await this.open();
    if (!db) return [];
    let sql = 'SELECT path,name,kind,container,namespace,line,column FROM symbols WHERE 1=1';
    const params = {};
    if (name) {
      if (exact) {
        sql += ' AND name = @name';
        params.name = name;
      } else {
        sql += ' AND name LIKE @name';
        params.name = `%${name}%`;
      }
    }
    if (kind) {
      sql += ' AND kind = @kind';
      params.kind = kind;
    }
    const rows = db.prepare(sql).all(params);
    // Apply path-based scope filter in JS (simpler than CASE in SQL)
    const filtered = rows.filter(r => {
      const p = String(r.path || '').replace(/\\\\/g, '/');
      if (scope === 'assets') return p.startsWith('Assets/');
      if (scope === 'packages')
        return p.startsWith('Packages/') || p.includes('Library/PackageCache/');
      if (scope === 'embedded') return p.startsWith('Packages/');
      return true;
    });
    return filtered.map(r => ({
      path: r.path,
      name: r.name,
      kind: r.kind,
      container: r.container,
      ns: r.namespace,
      line: r.line,
      column: r.column
    }));
  }

  async getStats() {
    const db = await this.open();
    if (!db) return { total: 0, lastIndexedAt: null };
    const total = db.prepare('SELECT COUNT(*) AS c FROM symbols').get().c || 0;
    const last =
      db.prepare("SELECT value AS v FROM meta WHERE key = 'lastIndexedAt'").get()?.v || null;
    return { total, lastIndexedAt: last };
  }
}

// Test-only helper to reset cached driver status between runs
export function __resetCodeIndexDriverStatusForTest() {
  driverStatus.available = null;
  driverStatus.error = null;
  driverStatus.logged = false;
}
