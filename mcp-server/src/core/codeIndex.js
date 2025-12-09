import fs from 'fs';
import path from 'path';
import { ProjectInfoProvider } from './projectInfo.js';
import { logger } from './config.js';

// fast-sql helper: execute query and return results
function querySQL(db, sql) {
  return db.execSql(sql);
}

// Shared driver availability state across CodeIndex instances
const driverStatus = {
  available: null,
  error: null,
  logged: false
};

// Shared DB connections (singleton pattern for concurrent access)
const sharedConnections = {
  db: null,
  dbPath: null,
  schemaInitialized: false,
  SQL: null // sql.js factory
};

export class CodeIndex {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.db = null;
    this.dbPath = null;
    this.disabled = false;
    this.disableReason = null;
    this._SQL = null;
  }

  async _ensureDriver() {
    if (driverStatus.available === false || this.disabled) {
      this.disabled = true;
      this.disableReason = this.disableReason || driverStatus.error;
      return false;
    }
    if (this._SQL) return true;
    try {
      // Dynamic import fast-sql (hybrid backend: better-sqlite3 or sql.js fallback)
      const initFastSql = (await import('@akiojin/fast-sql')).default;
      this._SQL = await initFastSql();
      sharedConnections.SQL = this._SQL;
      driverStatus.available = true;
      driverStatus.error = null;
      return true;
    } catch (e) {
      this.disabled = true;
      const errMsg = e && typeof e === 'object' && 'message' in e ? e.message : String(e);
      this.disableReason = `fast-sql unavailable: ${errMsg}. Code index features are disabled.`;
      driverStatus.available = false;
      driverStatus.error = this.disableReason;
      this._logDisable(this.disableReason);
      return false;
    }
  }

  async open() {
    if (this.db) return this.db;
    const ok = await this._ensureDriver();
    if (!ok) return null;
    const info = await this.projectInfo.get();
    const dir = info.codeIndexRoot;
    fs.mkdirSync(dir, { recursive: true });
    const dbPath = path.join(dir, 'code-index.db');
    this.dbPath = dbPath;

    // Use shared connection for all CodeIndex instances
    if (sharedConnections.db && sharedConnections.dbPath === dbPath) {
      this.db = sharedConnections.db;
      return this.db;
    }

    try {
      // Load existing database file if exists, otherwise create new
      if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        this.db = new this._SQL.Database(buffer);
      } else {
        this.db = new this._SQL.Database();
      }
      sharedConnections.db = this.db;
      sharedConnections.dbPath = dbPath;
    } catch (e) {
      this.disabled = true;
      const errMsg = e && typeof e === 'object' && 'message' in e ? e.message : String(e);
      this.disableReason = errMsg || 'Failed to open code index database';
      driverStatus.available = false;
      driverStatus.error = this.disableReason;
      this._logDisable(this.disableReason);
      return null;
    }
    this._initSchema();
    return this.db;
  }

  /**
   * Save in-memory database to file
   * fast-sql requires explicit save when using sql.js backend
   */
  _saveToFile() {
    if (!this.db || !this.dbPath) return;
    try {
      const data = this.db.exportDb();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (e) {
      const errMsg = e && typeof e === 'object' && 'message' in e ? e.message : String(e);
      logger.warn(`[index] Failed to save database: ${errMsg}`);
    }
  }

  _logDisable(reason) {
    if (driverStatus.logged) return;
    driverStatus.logged = true;
    try {
      if (logger && typeof logger.warn === 'function') {
        logger.warn(`[index] code index disabled: ${reason}`);
      }
    } catch {
      // Ignore logging errors
    }
  }

  _initSchema() {
    if (!this.db) return;
    // fast-sql applies optimal PRAGMAs automatically
    this.db.run(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        sig TEXT,
        updatedAt TEXT
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS symbols (
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        container TEXT,
        namespace TEXT,
        line INTEGER,
        column INTEGER
      )
    `);
    this.db.run('CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_symbols_path ON symbols(path)');
    this._saveToFile();
  }

  async isReady() {
    const db = await this.open();
    if (!db) return false;
    const result = querySQL(db, 'SELECT COUNT(*) AS c FROM symbols');
    const count = result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : 0;
    return count > 0;
  }

  async clearAndLoad(symbols) {
    const db = await this.open();
    if (!db) throw new Error('CodeIndex is unavailable (fast-sql not loaded)');

    db.run('BEGIN TRANSACTION');
    try {
      db.run('DELETE FROM symbols');
      db.run('DELETE FROM files');

      const stmt = db.prepare(
        'INSERT INTO symbols(path,name,kind,container,namespace,line,column) VALUES (?,?,?,?,?,?,?)'
      );
      for (const r of symbols || []) {
        stmt.run([
          r.path,
          r.name,
          r.kind,
          r.container || null,
          r.ns || r.namespace || null,
          r.line || null,
          r.column || null
        ]);
      }
      stmt.free();

      const metaStmt = db.prepare('REPLACE INTO meta(key,value) VALUES (?,?)');
      metaStmt.run(['lastIndexedAt', new Date().toISOString()]);
      metaStmt.free();

      db.run('COMMIT');
      this._saveToFile();
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }
    return { total: symbols?.length || 0 };
  }

  // Incremental APIs
  async getFiles() {
    const db = await this.open();
    if (!db) return new Map();
    const result = querySQL(db, 'SELECT path, sig FROM files');
    const map = new Map();
    if (result.length > 0) {
      for (const row of result[0].values) {
        map.set(String(row[0]), String(row[1] || ''));
      }
    }
    return map;
  }

  async upsertFile(pathStr, sig) {
    const db = await this.open();
    if (!db) return;
    const stmt = db.prepare('REPLACE INTO files(path,sig,updatedAt) VALUES (?,?,?)');
    stmt.run([pathStr, sig || '', new Date().toISOString()]);
    stmt.free();
    this._saveToFile();
  }

  async removeFile(pathStr) {
    const db = await this.open();
    if (!db) return;
    db.run('BEGIN TRANSACTION');
    try {
      const stmt1 = db.prepare('DELETE FROM symbols WHERE path = ?');
      stmt1.run([pathStr]);
      stmt1.free();

      const stmt2 = db.prepare('DELETE FROM files WHERE path = ?');
      stmt2.run([pathStr]);
      stmt2.free();

      db.run('COMMIT');
      this._saveToFile();
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }
  }

  async replaceSymbolsForPath(pathStr, rows) {
    const db = await this.open();
    if (!db) return;

    db.run('BEGIN TRANSACTION');
    try {
      const delStmt = db.prepare('DELETE FROM symbols WHERE path = ?');
      delStmt.run([pathStr]);
      delStmt.free();

      const insertStmt = db.prepare(
        'INSERT INTO symbols(path,name,kind,container,namespace,line,column) VALUES (?,?,?,?,?,?,?)'
      );
      for (const r of rows || []) {
        insertStmt.run([
          pathStr,
          r.name,
          r.kind,
          r.container || null,
          r.ns || r.namespace || null,
          r.line || null,
          r.column || null
        ]);
      }
      insertStmt.free();

      const metaStmt = db.prepare('REPLACE INTO meta(key,value) VALUES (?,?)');
      metaStmt.run(['lastIndexedAt', new Date().toISOString()]);
      metaStmt.free();

      db.run('COMMIT');
      this._saveToFile();
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }
  }

  async querySymbols({ name, kind, scope = 'all', exact = false }) {
    const db = await this.open();
    if (!db) return [];

    let sql = 'SELECT path,name,kind,container,namespace,line,column FROM symbols WHERE 1=1';
    const params = [];

    if (name) {
      if (exact) {
        sql += ' AND name = ?';
        params.push(name);
      } else {
        sql += ' AND name LIKE ?';
        params.push(`%${name}%`);
      }
    }
    if (kind) {
      sql += ' AND kind = ?';
      params.push(kind);
    }

    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const rows = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push(row);
    }
    stmt.free();

    // Apply path-based scope filter in JS
    const filtered = rows.filter(r => {
      const p = String(r.path || '').replace(/\\/g, '/');
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

    const countResult = querySQL(db, 'SELECT COUNT(*) AS c FROM symbols');
    const total =
      countResult.length > 0 && countResult[0].values.length > 0 ? countResult[0].values[0][0] : 0;

    const metaResult = querySQL(db, "SELECT value FROM meta WHERE key = 'lastIndexedAt'");
    const last =
      metaResult.length > 0 && metaResult[0].values.length > 0 ? metaResult[0].values[0][0] : null;

    return { total, lastIndexedAt: last };
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this._saveToFile();
      this.db.close();
      this.db = null;
    }
    if (sharedConnections.db === this.db) {
      sharedConnections.db = null;
      sharedConnections.dbPath = null;
    }
  }
}

// Test-only helper to reset cached driver status between runs
export function __resetCodeIndexDriverStatusForTest() {
  driverStatus.available = null;
  driverStatus.error = null;
  driverStatus.logged = false;
  // Also reset shared connections
  if (sharedConnections.db) {
    try {
      sharedConnections.db.close();
    } catch {
      // Ignore close errors
    }
  }
  sharedConnections.db = null;
  sharedConnections.dbPath = null;
  sharedConnections.schemaInitialized = false;
  sharedConnections.SQL = null;
}
