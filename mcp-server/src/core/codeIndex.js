import fs from 'fs';
import path from 'path';
import { LRUCache } from 'lru-cache';
import { ProjectInfoProvider } from './projectInfo.js';
import { logger } from './config.js';

// Phase 4: Query result cache (80% reduction for repeated queries)
const queryCache = new LRUCache({
  max: 500, // Max 500 cached queries
  ttl: 1000 * 60 * 5 // 5 minute TTL
});

// Stats cache with shorter TTL
const statsCache = new LRUCache({
  max: 1,
  ttl: 1000 * 60 // 1 minute TTL for stats
});

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
  dbStat: null,
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

  invalidateSharedConnection(reason) {
    if (reason) logger.info(`[index] ${reason}`);
    try {
      if (sharedConnections.db) {
        sharedConnections.db.close();
      }
    } catch {
      // Ignore close errors
    }
    sharedConnections.db = null;
    sharedConnections.dbPath = null;
    sharedConnections.dbStat = null;
    sharedConnections.schemaInitialized = false;
    queryCache.clear();
    statsCache.clear();
    this.db = null;
  }

  async open() {
    const ok = await this._ensureDriver();
    if (!ok) return null;
    const info = await this.projectInfo.get();
    const dir = info.codeIndexRoot;
    fs.mkdirSync(dir, { recursive: true });
    const dbPath = path.join(dir, 'code-index.db');
    this.dbPath = dbPath;

    const fileStat = (() => {
      try {
        if (!fs.existsSync(dbPath)) return null;
        const stat = fs.statSync(dbPath);
        return { mtimeMs: stat.mtimeMs, size: stat.size };
      } catch {
        return null;
      }
    })();

    if (this.db && (sharedConnections.db !== this.db || sharedConnections.dbPath !== dbPath)) {
      this.db = null;
    }

    // Use shared connection for all CodeIndex instances
    if (sharedConnections.db && sharedConnections.dbPath === dbPath) {
      // Verify the DB file still exists before returning cached connection
      if (!fileStat) {
        // File was deleted or never created, invalidate cache
        this.invalidateSharedConnection('DB file missing, invalidating cached connection');
      } else if (
        sharedConnections.dbStat &&
        (fileStat.mtimeMs !== sharedConnections.dbStat.mtimeMs ||
          fileStat.size !== sharedConnections.dbStat.size)
      ) {
        this.invalidateSharedConnection('DB file changed on disk, reloading connection');
      } else {
        this.db = sharedConnections.db;
        return this.db;
      }
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
      sharedConnections.dbStat = fileStat;
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
      if (sharedConnections.dbPath === this.dbPath) {
        try {
          const stat = fs.statSync(this.dbPath);
          sharedConnections.dbStat = { mtimeMs: stat.mtimeMs, size: stat.size };
        } catch {
          sharedConnections.dbStat = null;
        }
      }
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
    // Phase 5: Explicit PRAGMA optimization
    this.db.run('PRAGMA cache_size = 16000'); // 64MB cache (16000 * 4KB pages)
    this.db.run('PRAGMA temp_store = MEMORY'); // Faster temp operations
    this.db.run('PRAGMA synchronous = NORMAL'); // Balanced safety/speed
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
    // Composite indexes for faster multi-condition queries
    this.db.run('CREATE INDEX IF NOT EXISTS idx_symbols_name_kind ON symbols(name, kind)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_symbols_path_name ON symbols(path, name)');
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

    // Phase 4: Invalidate caches on write
    queryCache.clear();
    statsCache.clear();

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
    // Phase 4: Invalidate caches on write
    statsCache.clear();
    const stmt = db.prepare('REPLACE INTO files(path,sig,updatedAt) VALUES (?,?,?)');
    stmt.run([pathStr, sig || '', new Date().toISOString()]);
    stmt.free();
    this._saveToFile();
  }

  async removeFile(pathStr) {
    const db = await this.open();
    if (!db) return;
    // Phase 4: Invalidate caches on write
    queryCache.clear();
    statsCache.clear();
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

    // Phase 4: Invalidate caches on write
    queryCache.clear();
    statsCache.clear();

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
    // Phase 4: Check cache first
    const cacheKey = JSON.stringify({ name, kind, scope, exact });
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

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

    // Apply scope filter directly in SQL for better performance
    if (scope === 'assets') {
      sql += " AND path LIKE 'Assets/%'";
    } else if (scope === 'packages') {
      sql += " AND (path LIKE 'Packages/%' OR path LIKE '%Library/PackageCache/%')";
    } else if (scope === 'embedded') {
      sql += " AND path LIKE 'Packages/%'";
    }
    // scope === 'all' requires no additional filter

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

    const result = rows.map(r => ({
      path: r.path,
      name: r.name,
      kind: r.kind,
      container: r.container,
      ns: r.namespace,
      line: r.line,
      column: r.column
    }));

    // Cache the result
    queryCache.set(cacheKey, result);
    return result;
  }

  async getStats() {
    // Phase 4: Check stats cache first
    const cached = statsCache.get('stats');
    if (cached) return cached;

    const db = await this.open();
    if (!db) return { total: 0, lastIndexedAt: null };

    const countResult = querySQL(db, 'SELECT COUNT(*) AS c FROM symbols');
    const total =
      countResult.length > 0 && countResult[0].values.length > 0 ? countResult[0].values[0][0] : 0;

    const metaResult = querySQL(db, "SELECT value FROM meta WHERE key = 'lastIndexedAt'");
    const last =
      metaResult.length > 0 && metaResult[0].values.length > 0 ? metaResult[0].values[0][0] : null;

    const result = { total, lastIndexedAt: last };
    statsCache.set('stats', result);
    return result;
  }

  /**
   * Close the database connection
   */
  close() {
    const wasShared = sharedConnections.db === this.db;
    if (this.db) {
      this._saveToFile();
      this.db.close();
      this.db = null;
    }
    if (wasShared) {
      sharedConnections.db = null;
      sharedConnections.dbPath = null;
      sharedConnections.dbStat = null;
    }
  }
}

// Test-only helper to reset cached driver status between runs
export function __resetCodeIndexDriverStatusForTest() {
  driverStatus.available = null;
  driverStatus.error = null;
  driverStatus.logged = false;
  // Phase 4: Clear query caches
  queryCache.clear();
  statsCache.clear();
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
  sharedConnections.dbStat = null;
}
