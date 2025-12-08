/**
 * Worker Thread script for code index builds.
 *
 * This script runs in a separate thread and performs the heavy lifting of
 * index builds: file scanning, LSP document symbol requests, and SQLite
 * database operations (using fast-sql - hybrid backend with better-sqlite3 or sql.js fallback).
 * By running in a Worker Thread, these operations don't block the main event loop.
 *
 * Communication with main thread:
 * - Receives: workerData with build options
 * - Sends: progress updates, completion, errors, logs
 */

import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// fast-sql helper: run SQL statement
function runSQL(db, sql) {
  return db.run(sql);
}

// fast-sql helper: execute query and return results
function querySQL(db, sql) {
  return db.execSql(sql);
}

// Save fast-sql database to file
function saveDatabase(db, dbPath) {
  try {
    const data = db.exportDb();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    log('warn', `[worker] Failed to save database: ${e.message}`);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to send messages to main thread
function sendMessage(type, data) {
  if (parentPort) {
    parentPort.postMessage({ type, ...data });
  }
}

function log(level, message) {
  sendMessage('log', { level, message });
}

function sendProgress(processed, total, rate) {
  sendMessage('progress', { data: { processed, total, rate } });
}

function sendComplete(result) {
  sendMessage('complete', { data: result });
}

function sendError(error) {
  sendMessage('error', { error: error.message || String(error) });
}

/**
 * Walk directory tree and collect .cs files
 */
function walkCs(root, files, seen) {
  try {
    if (!fs.existsSync(root)) return;
    const st = fs.statSync(root);
    if (st.isFile()) {
      if (root.endsWith('.cs') && !seen.has(root)) {
        files.push(root);
        seen.add(root);
      }
      return;
    }
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'obj' || e.name === 'bin' || e.name.startsWith('.')) continue;
      walkCs(path.join(root, e.name), files, seen);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Convert absolute path to relative path
 */
function toRel(full, projectRoot) {
  const normFull = String(full).replace(/\\/g, '/');
  const normRoot = String(projectRoot).replace(/\\/g, '/').replace(/\/$/, '');
  return normFull.startsWith(normRoot) ? normFull.substring(normRoot.length + 1) : normFull;
}

/**
 * Create file signature for change detection
 */
function makeSig(abs) {
  try {
    const st = fs.statSync(abs);
    return `${st.size}-${Math.floor(st.mtimeMs)}`;
  } catch {
    return '0-0';
  }
}

/**
 * Convert LSP symbol kind to string
 */
function kindFromLsp(k) {
  switch (k) {
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
    default:
      return 'unknown';
  }
}

/**
 * Convert LSP document symbols to database rows
 */
function toRows(uri, symbols, projectRoot) {
  const rel = toRel(uri.replace('file://', ''), projectRoot);
  const rows = [];

  const visit = (s, container) => {
    const kind = kindFromLsp(s.kind);
    const name = s.name || '';
    const start = s.range?.start || s.selectionRange?.start || {};
    rows.push({
      path: rel,
      name,
      kind,
      container: container || null,
      ns: null,
      line: (start.line ?? 0) + 1,
      column: (start.character ?? 0) + 1
    });
    if (Array.isArray(s.children)) {
      for (const c of s.children) visit(c, name || container);
    }
  };

  if (Array.isArray(symbols)) {
    for (const s of symbols) visit(s, null);
  }
  return rows;
}

/**
 * Main build function
 */
async function runBuild() {
  const {
    projectRoot,
    dbPath,
    concurrency: _concurrency = 1, // Reserved for future parallel processing
    throttleMs = 0,
    retry = 2,
    reportPercentage = 10
  } = workerData;
  void _concurrency; // Explicitly mark as intentionally unused

  log('info', `[worker] Starting build: projectRoot=${projectRoot}, dbPath=${dbPath}`);

  let db = null;

  try {
    // Dynamic import fast-sql in worker thread (hybrid: better-sqlite3 or sql.js fallback)
    let SQL;
    try {
      const initFastSql = (await import('@akiojin/fast-sql')).default;
      SQL = await initFastSql();
    } catch (e) {
      throw new Error(`fast-sql unavailable in worker: ${e.message}`);
    }

    // Open or create database
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    // Initialize schema if needed (fast-sql applies optimal PRAGMAs automatically)
    runSQL(
      db,
      `
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `
    );
    runSQL(
      db,
      `
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        sig TEXT,
        updatedAt TEXT
      )
    `
    );
    runSQL(
      db,
      `
      CREATE TABLE IF NOT EXISTS symbols (
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        container TEXT,
        namespace TEXT,
        line INTEGER,
        column INTEGER
      )
    `
    );
    runSQL(db, 'CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name)');
    runSQL(db, 'CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind)');
    runSQL(db, 'CREATE INDEX IF NOT EXISTS idx_symbols_path ON symbols(path)');

    // Scan for C# files
    const roots = [
      path.resolve(projectRoot, 'Assets'),
      path.resolve(projectRoot, 'Packages'),
      path.resolve(projectRoot, 'Library/PackageCache')
    ];
    const files = [];
    const seen = new Set();
    for (const r of roots) walkCs(r, files, seen);

    log('info', `[worker] Found ${files.length} C# files to process`);

    // Get current indexed files
    const currentResult = querySQL(db, 'SELECT path, sig FROM files');
    const current = new Map();
    if (currentResult.length > 0) {
      for (const row of currentResult[0].values) {
        current.set(row[0], row[1]);
      }
    }

    // Determine changes
    const wanted = new Map(files.map(abs => [toRel(abs, projectRoot), makeSig(abs)]));
    const changed = [];
    const removed = [];

    for (const [rel, sig] of wanted) {
      if (current.get(rel) !== sig) changed.push(rel);
    }
    for (const [rel] of current) {
      if (!wanted.has(rel)) removed.push(rel);
    }

    log('info', `[worker] Changes: ${changed.length} to update, ${removed.length} to remove`);

    // Remove vanished files
    for (const rel of removed) {
      const stmt1 = db.prepare('DELETE FROM symbols WHERE path = ?');
      stmt1.run([rel]);
      stmt1.free();

      const stmt2 = db.prepare('DELETE FROM files WHERE path = ?');
      stmt2.run([rel]);
      stmt2.free();
    }

    // Prepare for updates
    const absList = changed.map(rel => path.resolve(projectRoot, rel));
    const startAt = Date.now();
    let processed = 0;
    let updated = 0;
    let lastReportedPercentage = 0;

    // Initialize LSP connection
    // Note: LspRpcClientSingleton is in src/lsp/, not src/core/lsp/
    let lsp = null;
    try {
      const lspModulePath = path.join(__dirname, '..', '..', 'lsp', 'LspRpcClientSingleton.js');
      const { LspRpcClientSingleton } = await import(`file://${lspModulePath}`);
      lsp = await LspRpcClientSingleton.getInstance(projectRoot);
      log('info', `[worker] LSP initialized`);
    } catch (e) {
      throw new Error(`LSP initialization failed: ${e.message}`);
    }

    // LSP request with retry
    const requestWithRetry = async (uri, maxRetries = retry) => {
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

    // Process files sequentially (concurrency=1 for non-blocking)
    for (let i = 0; i < absList.length; i++) {
      const abs = absList[i];
      const rel = toRel(abs, projectRoot);

      try {
        const uri = 'file://' + abs.replace(/\\/g, '/');
        const docSymbols = await requestWithRetry(uri);
        const rows = toRows(uri, docSymbols, projectRoot);

        // Update database in transaction
        runSQL(db, 'BEGIN TRANSACTION');
        try {
          const delStmt = db.prepare('DELETE FROM symbols WHERE path = ?');
          delStmt.run([rel]);
          delStmt.free();

          const insertStmt = db.prepare(
            'INSERT INTO symbols(path,name,kind,container,namespace,line,column) VALUES (?,?,?,?,?,?,?)'
          );
          for (const r of rows) {
            insertStmt.run([r.path, r.name, r.kind, r.container, r.ns, r.line, r.column]);
          }
          insertStmt.free();

          const fileStmt = db.prepare('REPLACE INTO files(path,sig,updatedAt) VALUES (?,?,?)');
          fileStmt.run([rel, wanted.get(rel), new Date().toISOString()]);
          fileStmt.free();

          const metaStmt = db.prepare("REPLACE INTO meta(key,value) VALUES ('lastIndexedAt',?)");
          metaStmt.run([new Date().toISOString()]);
          metaStmt.free();

          runSQL(db, 'COMMIT');
        } catch (txErr) {
          runSQL(db, 'ROLLBACK');
          throw txErr;
        }

        updated++;
      } catch (err) {
        // Log occasionally to avoid spam
        if (processed % 50 === 0) {
          log('warn', `[worker] Skipped file: ${rel} - ${err.message}`);
        }
      }

      processed++;

      // Send progress update
      const elapsed = Math.max(1, Date.now() - startAt);
      const rate = parseFloat(((processed * 1000) / elapsed).toFixed(1));
      const currentPercentage = Math.floor((processed / absList.length) * 100);

      if (
        currentPercentage >= lastReportedPercentage + reportPercentage ||
        processed === absList.length
      ) {
        sendProgress(processed, absList.length, rate);
        log(
          'info',
          `[worker] progress ${currentPercentage}% (${processed}/${absList.length}) rate:${rate} f/s`
        );
        lastReportedPercentage = currentPercentage;
      }

      // Throttle if requested (for testing)
      if (throttleMs > 0) {
        await new Promise(r => setTimeout(r, throttleMs));
      }
    }

    // Save database to file
    saveDatabase(db, dbPath);

    // Get final stats
    const countResult = querySQL(db, 'SELECT COUNT(*) AS c FROM symbols');
    const total =
      countResult.length > 0 && countResult[0].values.length > 0 ? countResult[0].values[0][0] : 0;

    const metaResult = querySQL(db, "SELECT value FROM meta WHERE key = 'lastIndexedAt'");
    const lastIndexedAt =
      metaResult.length > 0 && metaResult[0].values.length > 0 ? metaResult[0].values[0][0] : null;

    db.close();
    db = null;

    const result = {
      updatedFiles: updated,
      removedFiles: removed.length,
      totalIndexedSymbols: total,
      lastIndexedAt
    };

    log(
      'info',
      `[worker] Build completed: updated=${result.updatedFiles}, removed=${result.removedFiles}, total=${result.totalIndexedSymbols}`
    );

    sendComplete(result);
  } catch (error) {
    log('error', `[worker] Build failed: ${error.message}`);
    if (db) {
      try {
        db.close();
      } catch {
        // Ignore close errors
      }
    }
    sendError(error);
  }
}

// Run the build
runBuild();
