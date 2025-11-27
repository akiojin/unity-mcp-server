import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
let dbCache = new Map();

function getDbPath(projectRoot) {
  const dir = path.join(projectRoot, 'Library', 'UnityMCP', 'CodeIndex');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'index.db');
}

export function openDb(projectRoot) {
  const key = path.resolve(projectRoot);
  if (dbCache.has(key)) return dbCache.get(key);
  const dbPath = getDbPath(projectRoot);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      path TEXT PRIMARY KEY,
      mtime INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS symbols (
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT,
      container TEXT,
      ns TEXT,
      line INTEGER,
      column INTEGER,
      FOREIGN KEY(path) REFERENCES files(path)
    );
    CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
    CREATE TABLE IF NOT EXISTS refs (
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      line INTEGER,
      snippet TEXT,
      FOREIGN KEY(path) REFERENCES files(path)
    );
    CREATE INDEX IF NOT EXISTS idx_refs_name ON refs(name);
  `);
  dbCache.set(key, db);
  return db;
}

export function upsertFile(db, filePath, mtimeMs) {
  const stmt = db.prepare(
    'INSERT INTO files(path, mtime) VALUES(?, ?) ON CONFLICT(path) DO UPDATE SET mtime=excluded.mtime'
  );
  stmt.run(filePath, Math.floor(mtimeMs));
}

export function replaceSymbols(db, filePath, symbols) {
  const del = db.prepare('DELETE FROM symbols WHERE path = ?');
  del.run(filePath);
  const ins = db.prepare(
    'INSERT INTO symbols(path, name, kind, container, ns, line, column) VALUES(?,?,?,?,?,?,?)'
  );
  const tr = db.transaction(rows => {
    for (const s of rows)
      ins.run(
        filePath,
        s.name || '',
        s.kind || '',
        s.container || null,
        s.ns || null,
        s.line || 0,
        s.column || 0
      );
  });
  tr(symbols || []);
}

export function replaceReferences(db, filePath, refs) {
  const del = db.prepare('DELETE FROM refs WHERE path = ?');
  del.run(filePath);
  const ins = db.prepare('INSERT INTO refs(path, name, line, snippet) VALUES(?,?,?,?)');
  const tr = db.transaction(rows => {
    for (const r of rows) ins.run(filePath, r.name || '', r.line || 0, r.snippet || null);
  });
  tr(refs || []);
}

export function querySymbolsByName(db, name, kind = null) {
  if (kind) {
    return db
      .prepare(
        'SELECT path,name,kind,container,ns,line,column FROM symbols WHERE name = ? AND kind = ? LIMIT 500'
      )
      .all(name, kind);
  }
  return db
    .prepare('SELECT path,name,kind,container,ns,line,column FROM symbols WHERE name = ? LIMIT 500')
    .all(name);
}

export function queryRefsByName(db, name) {
  return db.prepare('SELECT path,name,line,snippet FROM refs WHERE name = ? LIMIT 1000').all(name);
}

export function isFresh(projectRoot, filePath, db) {
  try {
    const row = db.prepare('SELECT mtime FROM files WHERE path = ?').get(filePath);
    if (!row) return false;
    const abs = path.join(projectRoot, filePath);
    const st = fs.statSync(abs);
    return Math.floor(st.mtimeMs) === row.mtime;
  } catch {
    return false;
  }
}
