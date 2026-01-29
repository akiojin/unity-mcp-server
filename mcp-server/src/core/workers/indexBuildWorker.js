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
 *
 * IMPORTANT: This worker uses an inline LSP client implementation to avoid
 * importing main thread modules that may not work correctly in Worker Threads.
 */

import { parentPort, workerData } from 'worker_threads';
import { spawn, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { buildProgress } from '../indexProgress.js';

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

    // Ensure parent directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(dbPath, buffer);

    // Verify file was written
    if (!fs.existsSync(dbPath)) {
      throw new Error('Database file was not created');
    }

    log('info', `[worker] Database saved successfully: ${dbPath} (${buffer.length} bytes)`);
  } catch (e) {
    log('error', `[worker] Failed to save database: ${e.message}`);
    throw e; // Re-throw to fail the build
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

function sendProgress(phase, processed, total, rate) {
  sendMessage('progress', { data: buildProgress({ phase, processed, total, rate }) });
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
 * Fast file enumeration using OS native commands (find on Unix, PowerShell on Windows)
 * Falls back to walkCs on failure
 * @param {string[]} roots - Array of root directories to scan
 * @returns {Promise<string[]>} Array of absolute C# file paths
 */
async function fastWalkCs(roots) {
  const isWindows = process.platform === 'win32';
  const allFiles = [];
  const seen = new Set();

  for (const root of roots) {
    if (!fs.existsSync(root)) {
      log('info', `[worker] Skipping non-existent root: ${root}`);
      continue;
    }

    log('info', `[worker] Scanning ${path.basename(root)}...`);
    const startTime = Date.now();

    try {
      const files = await new Promise((resolve, reject) => {
        if (isWindows) {
          // Windows: Use PowerShell (secure - no shell interpretation)
          execFile(
            'powershell',
            [
              '-NoProfile',
              '-Command',
              `Get-ChildItem -Path '${root.replace(/'/g, "''")}' -Recurse -Include *.cs -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName`
            ],
            { maxBuffer: 50 * 1024 * 1024 }, // 50MB buffer for large projects
            (error, stdout) => {
              if (error) {
                reject(error);
                return;
              }
              const files = stdout
                .split('\r\n')
                .map(f => f.trim())
                .filter(f => f && f.endsWith('.cs'));
              resolve(files);
            }
          );
        } else {
          // Unix: Use find command (secure - no shell interpretation)
          // Note: We intentionally don't exclude hidden directories (*/.*) because:
          // - The search root may be inside .worktrees which contains a dot
          // - -name '*.cs' already filters to only C# files (excluding .meta etc.)
          execFile(
            'find',
            [
              root,
              '-name',
              '*.cs',
              '-type',
              'f',
              '-not',
              '-path',
              '*/obj/*',
              '-not',
              '-path',
              '*/bin/*'
            ],
            { maxBuffer: 50 * 1024 * 1024 }, // 50MB buffer for large projects
            (error, stdout) => {
              if (error) {
                reject(error);
                return;
              }
              const files = stdout
                .split('\n')
                .map(f => f.trim())
                .filter(f => f && f.endsWith('.cs'));
              resolve(files);
            }
          );
        }
      });

      const elapsed = Date.now() - startTime;
      log('info', `[worker] Found ${files.length} files in ${path.basename(root)} (${elapsed}ms)`);

      // Add unique files
      for (const f of files) {
        if (!seen.has(f)) {
          seen.add(f);
          allFiles.push(f);
        }
      }
    } catch (e) {
      // Fallback to walkCs on error
      log(
        'warn',
        `[worker] Fast scan failed for ${path.basename(root)}: ${e.message}. Using fallback.`
      );
      const fallbackFiles = [];
      walkCs(root, fallbackFiles, seen);
      allFiles.push(...fallbackFiles);
    }
  }

  return allFiles;
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

// ============================================================================
// Worker-local LSP Client Implementation
// ============================================================================
// This is an inline implementation specifically for Worker Threads.
// It does NOT share state with main thread and manages its own LSP process.

/**
 * Detect runtime identifier for csharp-lsp binary
 */
function detectRid() {
  if (process.platform === 'win32') return process.arch === 'arm64' ? 'win-arm64' : 'win-x64';
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'osx-arm64' : 'osx-x64';
  return process.arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
}

/**
 * Get csharp-lsp executable name
 */
function getExecutableName() {
  return process.platform === 'win32' ? 'server.exe' : 'server';
}

/**
 * Find csharp-lsp binary path
 */
function findLspBinary() {
  const rid = detectRid();
  const exe = getExecutableName();

  // Single location: ~/.unity/tools/csharp-lsp/<rid>/server
  const candidates = [path.join(os.homedir(), '.unity', 'tools', 'csharp-lsp', rid, exe)];

  for (const p of candidates) {
    try {
      const resolved = path.resolve(p);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Worker-local LSP client class
 * Manages its own csharp-lsp process independently from main thread
 */
class WorkerLspClient {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.proc = null;
    this.seq = 1;
    this.pending = new Map();
    this.buf = Buffer.alloc(0);
    this.initialized = false;
  }

  async start() {
    const binPath = findLspBinary();
    if (!binPath) {
      throw new Error(
        `csharp-lsp binary not found. Expected at ~/.unity/tools/csharp-lsp/${detectRid()}/${getExecutableName()}`
      );
    }

    log('info', `[worker-lsp] Starting LSP: ${binPath}`);

    this.proc = spawn(binPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

    this.proc.on('error', e => {
      log('error', `[worker-lsp] Process error: ${e.message}`);
    });

    this.proc.on('close', (code, sig) => {
      log('info', `[worker-lsp] Process exited: code=${code}, signal=${sig || 'none'}`);
      // Reject all pending requests
      for (const [id, p] of this.pending.entries()) {
        p.reject(new Error('LSP process exited'));
        this.pending.delete(id);
      }
      this.proc = null;
      this.initialized = false;
    });

    this.proc.stderr.on('data', d => {
      const s = String(d || '').trim();
      if (s) log('debug', `[worker-lsp] stderr: ${s}`);
    });

    this.proc.stdout.on('data', chunk => this._onData(chunk));

    // Initialize LSP
    await this._initialize();
    this.initialized = true;
    log('info', `[worker-lsp] Initialized successfully`);
  }

  _onData(chunk) {
    this.buf = Buffer.concat([this.buf, Buffer.from(chunk)]);
    while (true) {
      const headerEnd = this.buf.indexOf('\r\n\r\n');
      if (headerEnd < 0) break;
      const header = this.buf.slice(0, headerEnd).toString('utf8');
      const m = header.match(/Content-Length:\s*(\d+)/i);
      const len = m ? parseInt(m[1], 10) : 0;
      const total = headerEnd + 4 + len;
      if (this.buf.length < total) break;
      const jsonBuf = this.buf.slice(headerEnd + 4, total);
      this.buf = this.buf.slice(total);
      try {
        const msg = JSON.parse(jsonBuf.toString('utf8'));
        if (msg.id && this.pending.has(msg.id)) {
          this.pending.get(msg.id).resolve(msg);
          this.pending.delete(msg.id);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  _writeMessage(obj) {
    if (!this.proc || this.proc.killed) {
      throw new Error('LSP process not available');
    }
    const json = JSON.stringify(obj);
    const payload = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
    this.proc.stdin.write(payload, 'utf8');
  }

  async _initialize() {
    const id = this.seq++;
    const req = {
      jsonrpc: '2.0',
      id,
      method: 'initialize',
      params: {
        processId: process.pid,
        rootUri: 'file://' + String(this.projectRoot).replace(/\\/g, '/'),
        capabilities: {},
        workspaceFolders: null
      }
    };

    const timeoutMs = 60000;
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`initialize timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });

    this._writeMessage(req);
    await p;

    // Send initialized notification
    this._writeMessage({ jsonrpc: '2.0', method: 'initialized', params: {} });
  }

  async request(method, params) {
    if (!this.proc || this.proc.killed) {
      throw new Error('LSP process not available');
    }

    const id = this.seq++;
    const timeoutMs = 30000;

    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`${method} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });

    this._writeMessage({ jsonrpc: '2.0', id, method, params });
    const resp = await p;
    return resp?.result ?? resp;
  }

  stop() {
    if (this.proc && !this.proc.killed) {
      try {
        // Send shutdown/exit
        this._writeMessage({ jsonrpc: '2.0', id: this.seq++, method: 'shutdown', params: {} });
        this._writeMessage({ jsonrpc: '2.0', method: 'exit' });
        this.proc.stdin.end();
      } catch {
        // Ignore
      }
      setTimeout(() => {
        if (this.proc && !this.proc.killed) {
          this.proc.kill('SIGTERM');
        }
      }, 1000);
    }
  }
}

// ============================================================================
// End Worker-local LSP Client
// ============================================================================

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
    reportPercentage = 10,
    excludePackageCache = false,
    forceRebuild = false // Skip change detection and rebuild all files
  } = workerData;
  void _concurrency; // Explicitly mark as intentionally unused

  log('info', `[worker] Starting build: projectRoot=${projectRoot}, dbPath=${dbPath}`);

  let db = null;

  try {
    // Dynamic import fast-sql Database class (uses better-sqlite3 when available, sql.js fallback)
    let Database;
    try {
      const fastSql = await import('@akiojin/fast-sql');
      Database = fastSql.Database;
    } catch (e) {
      throw new Error(`fast-sql unavailable in worker: ${e.message}`);
    }

    // Open or create database using Database.create() for better-sqlite3 support
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = await Database.create(buffer);
    } else {
      db = await Database.create();
    }

    log('info', `[worker] Using backend: ${db.backendType || 'unknown'}`);

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
    // Build roots list based on excludePackageCache option
    const roots = [path.resolve(projectRoot, 'Assets'), path.resolve(projectRoot, 'Packages')];
    if (!excludePackageCache) {
      roots.push(path.resolve(projectRoot, 'Library/PackageCache'));
    }
    log(
      'info',
      `[worker] Scanning roots: ${roots.map(r => path.basename(r)).join(', ')}${excludePackageCache ? ' (PackageCache excluded)' : ''}`
    );

    // Use fast find command when available, fallback to walkCs
    const files = await fastWalkCs(roots);
    log('info', `[worker] Found ${files.length} C# files to process`);

    let changed = [];
    let removed = [];
    const wanted = new Map();

    if (forceRebuild) {
      // Skip change detection - process all files
      log('info', `[worker] forceRebuild=true, skipping change detection`);
      // Clear all existing data
      runSQL(db, 'DELETE FROM symbols');
      runSQL(db, 'DELETE FROM files');
      // Mark all files as changed
      for (const abs of files) {
        const rel = toRel(abs, projectRoot);
        wanted.set(rel, '0-0'); // Dummy signature for forceRebuild
        changed.push(rel);
      }
      log('info', `[worker] All ${changed.length} files marked for processing`);
    } else {
      // Normal change detection
      // Get current indexed files
      const currentResult = querySQL(db, 'SELECT path, sig FROM files');
      const current = new Map();
      if (currentResult.length > 0) {
        for (const row of currentResult[0].values) {
          current.set(row[0], row[1]);
        }
      }

      // Determine changes (this calls makeSig for each file)
      log('info', `[worker] Computing file signatures (${files.length} files)...`);
      sendProgress('signature', 0, files.length, 0);
      const sigStartTime = Date.now();
      let sigProcessed = 0;
      for (const abs of files) {
        const rel = toRel(abs, projectRoot);
        const sig = makeSig(abs);
        wanted.set(rel, sig);
        sigProcessed++;
        // Report progress every 10000 files
        if (sigProcessed % 10000 === 0) {
          const elapsed = ((Date.now() - sigStartTime) / 1000).toFixed(1);
          log('info', `[worker] Signature progress: ${sigProcessed}/${files.length} (${elapsed}s)`);
          const sigElapsed = Math.max(1, Date.now() - sigStartTime);
          const sigRate = parseFloat(((sigProcessed * 1000) / sigElapsed).toFixed(1));
          sendProgress('signature', sigProcessed, files.length, sigRate);
        }
      }
      const sigTime = ((Date.now() - sigStartTime) / 1000).toFixed(1);
      log('info', `[worker] Signatures computed in ${sigTime}s`);
      const sigElapsed = Math.max(1, Date.now() - sigStartTime);
      const sigRate = parseFloat(((sigProcessed * 1000) / sigElapsed).toFixed(1));
      sendProgress('signature', sigProcessed, files.length, sigRate);

      for (const [rel, sig] of wanted) {
        if (current.get(rel) !== sig) changed.push(rel);
      }
      for (const [rel] of current) {
        if (!wanted.has(rel)) removed.push(rel);
      }
    }

    log('info', `[worker] Changes: ${changed.length} to update, ${removed.length} to remove`);

    // Remove vanished files - optimized batch delete (Phase 2.2)
    if (removed.length > 0) {
      // SQLite has a limit on compound expressions, batch in groups of 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < removed.length; i += BATCH_SIZE) {
        const batch = removed.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '?').join(',');

        const stmt1 = db.prepare(`DELETE FROM symbols WHERE path IN (${placeholders})`);
        stmt1.run(batch);
        stmt1.free();

        const stmt2 = db.prepare(`DELETE FROM files WHERE path IN (${placeholders})`);
        stmt2.run(batch);
        stmt2.free();
      }
      log('info', `[worker] Removed ${removed.length} files in batches`);
    }

    // Prepare for updates
    const absList = changed.map(rel => path.resolve(projectRoot, rel));
    sendProgress('index', 0, absList.length, 0);
    const startAt = Date.now();
    let processed = 0;
    let updated = 0;
    let lastReportedPercentage = 0;

    // Initialize Worker-local LSP client
    // This is independent from main thread's LspRpcClientSingleton
    const lsp = new WorkerLspClient(projectRoot);
    try {
      await lsp.start();
      log('info', `[worker] Worker-local LSP initialized`);
    } catch (e) {
      throw new Error(`LSP initialization failed: ${e.message}`);
    }

    // LSP request with retry
    const requestWithRetry = async (uri, maxRetries = retry) => {
      let lastErr = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const res = await lsp.request('textDocument/documentSymbol', { textDocument: { uri } });
          return res;
        } catch (err) {
          lastErr = err;
          await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
        }
      }
      throw lastErr || new Error('documentSymbol failed');
    };

    // Phase 2.1 & 2.3: Process files with batched transactions
    // Collect LSP results, then write in batched transactions to reduce overhead
    const TX_BATCH_SIZE = 100; // Files per transaction
    let pendingWrites = []; // { rel, rows, sig }

    const flushPendingWrites = () => {
      if (pendingWrites.length === 0) return;

      runSQL(db, 'BEGIN TRANSACTION');
      try {
        // Batch delete old symbols for all pending files
        const pathsToDelete = pendingWrites.map(w => w.rel);
        const delPlaceholders = pathsToDelete.map(() => '?').join(',');
        const delStmt = db.prepare(`DELETE FROM symbols WHERE path IN (${delPlaceholders})`);
        delStmt.run(pathsToDelete);
        delStmt.free();

        // Batch insert all symbols
        const insertStmt = db.prepare(
          'INSERT INTO symbols(path,name,kind,container,namespace,line,column) VALUES (?,?,?,?,?,?,?)'
        );
        for (const { rows } of pendingWrites) {
          for (const r of rows) {
            insertStmt.run([r.path, r.name, r.kind, r.container, r.ns, r.line, r.column]);
          }
        }
        insertStmt.free();

        // Batch update file signatures
        const fileStmt = db.prepare('REPLACE INTO files(path,sig,updatedAt) VALUES (?,?,?)');
        const now = new Date().toISOString();
        for (const { rel, sig } of pendingWrites) {
          fileStmt.run([rel, sig, now]);
        }
        fileStmt.free();

        // Update meta once per batch
        const metaStmt = db.prepare("REPLACE INTO meta(key,value) VALUES ('lastIndexedAt',?)");
        metaStmt.run([now]);
        metaStmt.free();

        runSQL(db, 'COMMIT');
        updated += pendingWrites.length;
      } catch (txErr) {
        runSQL(db, 'ROLLBACK');
        log('error', `[worker] Batch write failed: ${txErr.message}`);
      }
      pendingWrites = [];
    };

    // Process files sequentially (LSP requests), batch DB writes
    for (let i = 0; i < absList.length; i++) {
      const abs = absList[i];
      const rel = toRel(abs, projectRoot);

      try {
        const uri = 'file://' + abs.replace(/\\/g, '/');
        const docSymbols = await requestWithRetry(uri);
        const rows = toRows(uri, docSymbols, projectRoot);

        // Queue for batch write
        pendingWrites.push({ rel, rows, sig: wanted.get(rel) });

        // Flush when batch is full
        if (pendingWrites.length >= TX_BATCH_SIZE) {
          flushPendingWrites();
        }
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
        sendProgress('index', processed, absList.length, rate);
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

    // Flush remaining pending writes
    flushPendingWrites();

    // Stop LSP process
    lsp.stop();

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
