/**
 * Migration Scenario Tests
 *
 * Tests migration paths from sql.js and better-sqlite3 to fast-sql.
 * Ensures existing code patterns work with minimal changes.
 */
import { describe, it, before, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

let initFastSql
let Database
let SQL

describe('Migration Scenarios', () => {
  before(async () => {
    try {
      const module = await import('../../dist/index.js')
      initFastSql = module.default || module.initFastSql
      Database = module.Database
      SQL = await initFastSql()
    } catch (e) {
      console.log('RED phase: Module not yet implemented')
    }
  })

  describe('sql.js Pattern Migration', () => {
    /**
     * Original sql.js pattern:
     *
     * import initSqlJs from 'sql.js';
     * const SQL = await initSqlJs();
     * const db = new SQL.Database();
     */
    it('should support sql.js initialization pattern', async () => {
      // This is exactly how sql.js is used
      const SQL = await initFastSql()
      const db = new SQL.Database()

      assert.ok(db, 'Database should be created')
      assert.strictEqual(typeof db.execSql, 'function')

      db.close()
    })

    /**
     * Original sql.js exec pattern:
     *
     * db.exec('CREATE TABLE ...');
     * Note: sql.js uses exec(), fast-sql uses execSql() to avoid confusion
     * with Node's child_process.exec()
     */
    it('should support execSql() for DDL statements', () => {
      const db = new SQL.Database()

      db.execSql('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)')

      // Verify table was created
      const result = db.execSql("SELECT name FROM sqlite_master WHERE type='table' AND name='test'")
      assert.strictEqual(result[0].values[0][0], 'test')

      db.close()
    })

    /**
     * Original sql.js run pattern:
     *
     * db.run('INSERT INTO users VALUES (?, ?)', [1, 'Alice']);
     */
    it('should support run() with positional parameters', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE users (id INTEGER, name TEXT)')

      db.run('INSERT INTO users VALUES (?, ?)', [1, 'Alice'])
      db.run('INSERT INTO users VALUES (?, ?)', [2, 'Bob'])

      const result = db.execSql('SELECT * FROM users ORDER BY id')
      assert.strictEqual(result[0].values.length, 2)
      assert.strictEqual(result[0].values[0][1], 'Alice')

      db.close()
    })

    /**
     * Original sql.js PreparedStatement pattern:
     *
     * const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
     * stmt.bind([1]);
     * while (stmt.step()) {
     *   const row = stmt.getAsObject();
     * }
     * stmt.free();
     */
    it('should support sql.js PreparedStatement pattern', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE users (id INTEGER, name TEXT)')
      db.run('INSERT INTO users VALUES (?, ?)', [1, 'Alice'])
      db.run('INSERT INTO users VALUES (?, ?)', [2, 'Bob'])

      const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
      stmt.bind([1])

      const rows = []
      while (stmt.step()) {
        rows.push(stmt.getAsObject())
      }
      stmt.free()

      assert.strictEqual(rows.length, 1)
      assert.strictEqual(rows[0].name, 'Alice')

      db.close()
    })

    /**
     * Original sql.js export pattern:
     *
     * const data = db.export();
     * // data is Uint8Array
     */
    it('should support export() returning Uint8Array', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (id INTEGER)')
      db.run('INSERT INTO test VALUES (?)', [42])

      const data = db.exportDb()

      assert.ok(data instanceof Uint8Array)
      // Verify it's valid SQLite
      const magic = new TextDecoder().decode(data.slice(0, 16))
      assert.strictEqual(magic, 'SQLite format 3\0')

      db.close()
    })

    /**
     * Original sql.js import from data pattern:
     *
     * const db = new SQL.Database(uint8Array);
     */
    it('should support creating database from Uint8Array', () => {
      // Create and export
      const db1 = new SQL.Database()
      db1.execSql('CREATE TABLE test (value TEXT)')
      db1.run('INSERT INTO test VALUES (?)', ['Hello from sql.js'])
      const data = db1.exportDb()
      db1.close()

      // Import
      const db2 = new SQL.Database(data)
      const result = db2.execSql('SELECT value FROM test')

      assert.strictEqual(result[0].values[0][0], 'Hello from sql.js')

      db2.close()
    })
  })

  describe('better-sqlite3 Pattern Migration', () => {
    let db

    beforeEach(async () => {
      // fast-sql's extended API is closer to better-sqlite3
      db = await Database.create()
    })

    afterEach(() => {
      if (db && !db.closed) {
        db.close()
      }
    })

    /**
     * Original better-sqlite3 pattern:
     *
     * const Database = require('better-sqlite3');
     * const db = new Database(':memory:');
     *
     * Migration:
     * import { Database } from '@akiojin/fast-sql';
     * const db = await Database.create();
     */
    it('should support Database.create() for async initialization', async () => {
      const db = await Database.create()

      assert.ok(db)
      assert.strictEqual(typeof db.execSql, 'function')

      db.close()
    })

    /**
     * Original better-sqlite3 exec pattern:
     *
     * db.exec('CREATE TABLE ...');
     *
     * Migration: Same, but use execSql()
     */
    it('should support execSql() for multi-statement SQL', () => {
      db.execSql(`
        CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT);
      `)

      const tables = db.execSql("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      const tableNames = tables[0].values.map(row => row[0])

      assert.ok(tableNames.includes('users'))
      assert.ok(tableNames.includes('posts'))
    })

    /**
     * Original better-sqlite3 prepare().run() pattern:
     *
     * const stmt = db.prepare('INSERT INTO users VALUES (?, ?)');
     * stmt.run(1, 'Alice');
     *
     * Migration: Use array for params
     * stmt.run([1, 'Alice']);
     */
    it('should support prepare().run() pattern with array params', () => {
      db.execSql('CREATE TABLE users (id INTEGER, name TEXT)')

      const stmt = db.prepare('INSERT INTO users VALUES (?, ?)')
      stmt.run([1, 'Alice'])
      stmt.reset()
      stmt.run([2, 'Bob'])
      stmt.free()

      const result = db.execSql('SELECT COUNT(*) FROM users')
      assert.strictEqual(result[0].values[0][0], 2)
    })

    /**
     * Original better-sqlite3 prepare().all() pattern:
     *
     * const stmt = db.prepare('SELECT * FROM users');
     * const rows = stmt.all();
     *
     * Migration: Use iteration pattern
     * const stmt = db.prepare('SELECT * FROM users');
     * const rows = [];
     * while (stmt.step()) {
     *   rows.push(stmt.getAsObject());
     * }
     * stmt.free();
     *
     * OR use execSql() directly:
     * const results = db.execSql('SELECT * FROM users');
     * const rows = results[0].values;
     */
    it('should support execSql() as alternative to prepare().all()', () => {
      db.execSql('CREATE TABLE users (id INTEGER, name TEXT)')
      db.run('INSERT INTO users VALUES (?, ?)', [1, 'Alice'])
      db.run('INSERT INTO users VALUES (?, ?)', [2, 'Bob'])

      // Direct query - similar to better-sqlite3's all()
      const results = db.execSql('SELECT * FROM users ORDER BY id')

      assert.strictEqual(results[0].values.length, 2)
      assert.deepStrictEqual(results[0].columns, ['id', 'name'])
    })

    /**
     * Original better-sqlite3 prepare().get() pattern:
     *
     * const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
     * const row = stmt.get(1);
     *
     * Migration: Use bind/step/getAsObject pattern
     */
    it('should support prepare() for single row fetch', () => {
      db.execSql('CREATE TABLE users (id INTEGER, name TEXT)')
      db.run('INSERT INTO users VALUES (?, ?)', [1, 'Alice'])

      const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
      stmt.bind([1])
      stmt.step()
      const row = stmt.getAsObject()
      stmt.free()

      assert.strictEqual(row.id, 1)
      assert.strictEqual(row.name, 'Alice')
    })

    /**
     * Original better-sqlite3 transaction pattern:
     *
     * const transfer = db.transaction((from, to, amount) => {
     *   db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, from);
     *   db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amount, to);
     * });
     * transfer(1, 2, 100);
     *
     * Migration: Use transaction() method
     */
    it('should support transaction() method similar to better-sqlite3', () => {
      db.execSql('CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance REAL)')
      db.run('INSERT INTO accounts VALUES (?, ?)', [1, 1000])
      db.run('INSERT INTO accounts VALUES (?, ?)', [2, 500])

      db.transaction(() => {
        db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [100, 1])
        db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [100, 2])
      })

      const results = db.execSql('SELECT balance FROM accounts ORDER BY id')
      assert.strictEqual(results[0].values[0][0], 900)
      assert.strictEqual(results[0].values[1][0], 600)
    })

    /**
     * Original better-sqlite3 pragma() pattern:
     *
     * db.pragma('journal_mode = WAL');
     *
     * Migration: Use options in Database.create() or execSql()
     */
    it('should support PRAGMA configuration via Database.create() options', async () => {
      const db = await Database.create(undefined, {
        pragma: {
          journalMode: 'memory',
          synchronous: 'off',
          cacheSize: 5000
        }
      })

      const journalMode = db.execSql('PRAGMA journal_mode')
      assert.strictEqual(journalMode[0].values[0][0], 'memory')

      db.close()
    })
  })

  describe('Common Migration Gotchas', () => {
    it('should handle async initialization (unlike sync better-sqlite3)', async () => {
      // better-sqlite3 is sync: const db = new Database(':memory:');
      // fast-sql is async for WASM loading
      const db = await Database.create()

      assert.ok(db)
      db.close()
    })

    it('should use execSql() instead of exec() to avoid Node.js confusion', () => {
      // We use execSql() instead of exec() to avoid confusion with
      // Node.js child_process.exec()
      const db = new SQL.Database()

      // This should work
      db.execSql('CREATE TABLE test (id INTEGER)')

      // exec() should not exist or throw (design decision)
      assert.strictEqual(db.exec, undefined)

      db.close()
    })

    it('should use exportDb() instead of export() for clarity', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (id INTEGER)')

      // exportDb() is clearer than export()
      const data = db.exportDb()
      assert.ok(data instanceof Uint8Array)

      // export() should not exist (reserved word in ES modules)
      // Note: export is a reserved keyword, so db.export might work but exportDb is preferred

      db.close()
    })

    it('should require array or object for bind parameters', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (id INTEGER)')

      const stmt = db.prepare('SELECT * FROM test WHERE id = ?')

      // Must use array, not variadic
      stmt.bind([1]) // Correct

      stmt.free()
      db.close()
    })

    it('should require explicit free() for statements', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (id INTEGER)')

      const stmt = db.prepare('SELECT * FROM test')

      // Must explicitly free
      stmt.free()

      // After free, operations should throw
      assert.throws(() => stmt.step(), Error)

      db.close()
    })
  })

  describe('Real-World Migration Examples', () => {
    /**
     * Example: Migrating a user repository pattern
     */
    it('should support repository pattern migration', async () => {
      const db = await Database.create()

      // Setup
      db.execSql(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Repository-like operations
      // Create
      const createUser = (email, name) => {
        db.run('INSERT INTO users (email, name) VALUES (?, ?)', [email, name])
        const result = db.execSql('SELECT last_insert_rowid()')
        return result[0].values[0][0]
      }

      // Read
      const getUserById = id => {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
        stmt.bind([id])
        let user = null
        if (stmt.step()) {
          user = stmt.getAsObject()
        }
        stmt.free()
        return user
      }

      // Update
      const updateUserName = (id, name) => {
        db.run('UPDATE users SET name = ? WHERE id = ?', [name, id])
      }

      // Delete
      const deleteUser = id => {
        db.run('DELETE FROM users WHERE id = ?', [id])
      }

      // Test the repository
      const userId = createUser('alice@example.com', 'Alice')
      assert.ok(userId > 0)

      const user = getUserById(userId)
      assert.strictEqual(user.email, 'alice@example.com')
      assert.strictEqual(user.name, 'Alice')

      updateUserName(userId, 'Alice Smith')
      const updated = getUserById(userId)
      assert.strictEqual(updated.name, 'Alice Smith')

      deleteUser(userId)
      const deleted = getUserById(userId)
      assert.strictEqual(deleted, null)

      db.close()
    })

    /**
     * Example: Migrating batch insert pattern
     */
    it('should support batch insert migration with bulkInsert()', async () => {
      const db = await Database.create()
      db.execSql('CREATE TABLE logs (id INTEGER PRIMARY KEY, message TEXT, level TEXT)')

      // Original pattern (slow):
      // for (const log of logs) {
      //   db.run('INSERT INTO logs VALUES (?, ?, ?)', log);
      // }

      // Migrated pattern (fast):
      const logs = [
        [1, 'Application started', 'INFO'],
        [2, 'User logged in', 'INFO'],
        [3, 'Error occurred', 'ERROR'],
        [4, 'Request completed', 'DEBUG']
      ]

      const count = db.bulkInsert('INSERT INTO logs VALUES (?, ?, ?)', logs)

      assert.strictEqual(count, 4)
      const result = db.execSql('SELECT COUNT(*) FROM logs')
      assert.strictEqual(result[0].values[0][0], 4)

      db.close()
    })
  })
})
