import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import initSqlJs from 'sql.js';

// Create a lightweight better-sqlite3 compatible surface using sql.js (WASM)
export async function createSqliteFallback(dbPath) {
  // Use Node's module resolution to find sql.js regardless of package manager (npm, pnpm, yarn)
  // require.resolve('sql.js') returns the main entry point (dist/sql-wasm.js)
  // so we just need sql-wasm.wasm in the same directory
  const require = createRequire(import.meta.url);
  const sqlJsPath = require.resolve('sql.js');
  const sqlJsDir = path.dirname(sqlJsPath);
  const wasmPath = path.resolve(sqlJsDir, 'sql-wasm.wasm');
  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  const loadDb = () => {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath);
      return new SQL.Database(new Uint8Array(data));
    }
    return new SQL.Database();
  };

  const db = loadDb();

  const persist = () => {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  };

  // Wrap sql.js Statement to look like better-sqlite3's
  const wrapStatement = stmt => ({
    run(...params) {
      stmt.bind(params);
      // sql.js run via stepping through the statement
      while (stmt.step()) {
        /* consume rows for statements that return data */
      }
      stmt.reset();
      persist();
      return this;
    },
    get(...params) {
      stmt.bind(params);
      const has = stmt.step();
      const row = has ? stmt.getAsObject() : undefined;
      stmt.reset();
      return row;
    },
    all(...params) {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.reset();
      return rows;
    }
  });

  const prepare = sql => wrapStatement(db.prepare(sql));

  // Mimic better-sqlite3 transaction(fn)
  const transaction =
    fn =>
    (...args) => {
      const result = fn(...args);
      persist();
      return result;
    };

  // Minimal surface used by CodeIndex
  return {
    exec: sql => {
      db.exec(sql);
      persist();
    },
    prepare,
    transaction,
    persist
  };
}
