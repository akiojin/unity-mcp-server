/**
 * Extended API Contract Tests
 *
 * Defines the API contract for fast-sql extended features.
 * These tests must FAIL before implementation (RED phase of TDD).
 *
 * Contract:
 * - Database.create(data, options) returns Promise<Database>
 * - bulkInsert(sql, rows) returns number of inserted rows
 * - transaction(fn) supports rollback on error
 * - getCacheStats() returns CacheStats object
 */
import { describe, it, before, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

let Database
let initFastSql

describe('Extended API Contract', () => {
  before(async () => {
    try {
      const module = await import('../../dist/index.js')
      Database = module.Database
      initFastSql = module.default || module.initFastSql
      await initFastSql() // Initialize WASM
    } catch (e) {
      console.log('RED phase: Module not yet implemented')
    }
  })

  describe('Database.create(data, options)', () => {
    it('should return Promise<Database>', async () => {
      const db = await Database.create()

      assert.ok(db, 'Database should be created')
      assert.strictEqual(typeof db.execSql, 'function', 'Should have execSql method')
      assert.strictEqual(typeof db.close, 'function', 'Should have close method')

      db.close()
    })

    it('should accept existing data as first argument', async () => {
      // Create and export a database
      const db1 = await Database.create()
      db1.execSql('CREATE TABLE test (id INTEGER)')
      db1.run('INSERT INTO test VALUES (?)', [42])
      const data = db1.exportDb()
      db1.close()

      // Create from existing data
      const db2 = await Database.create(data)
      const results = db2.execSql('SELECT * FROM test')

      assert.strictEqual(results[0].values[0][0], 42)
      db2.close()
    })

    it('should accept options for PRAGMA configuration', async () => {
      const db = await Database.create(undefined, {
        pragma: {
          journalMode: 'memory',
          synchronous: 'off',
          cacheSize: 5000
        }
      })

      // Verify PRAGMA settings were applied
      const journalMode = db.execSql('PRAGMA journal_mode')
      assert.strictEqual(journalMode[0].values[0][0], 'memory')

      const synchronous = db.execSql('PRAGMA synchronous')
      assert.strictEqual(synchronous[0].values[0][0], 0) // 0 = off

      db.close()
    })

    it('should accept options for statement cache configuration', async () => {
      const db = await Database.create(undefined, {
        statementCache: {
          maxSize: 50,
          ttlMs: 60000
        }
      })

      const stats = db.getCacheStats()
      assert.ok(stats, 'Should have cache stats')

      db.close()
    })

    it('should apply default PRAGMA options when not specified', async () => {
      const db = await Database.create()

      // Default should be memory journal mode
      const journalMode = db.execSql('PRAGMA journal_mode')
      assert.strictEqual(journalMode[0].values[0][0], 'memory')

      // Default should be synchronous off
      const synchronous = db.execSql('PRAGMA synchronous')
      assert.strictEqual(synchronous[0].values[0][0], 0)

      db.close()
    })
  })

  describe('bulkInsert(sql, rows)', () => {
    let db

    beforeEach(async () => {
      db = await Database.create()
      db.execSql('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, score REAL)')
    })

    afterEach(() => {
      if (db && !db.closed) {
        db.close()
      }
    })

    it('should return number of inserted rows', () => {
      const rows = [
        [1, 'Alice', 95.5],
        [2, 'Bob', 87.3],
        [3, 'Charlie', 92.1]
      ]

      const count = db.bulkInsert('INSERT INTO users VALUES (?, ?, ?)', rows)

      assert.strictEqual(count, 3, 'Should return 3 for 3 inserted rows')
    })

    it('should insert all rows into database', () => {
      const rows = [
        [1, 'Alice', 95.5],
        [2, 'Bob', 87.3]
      ]

      db.bulkInsert('INSERT INTO users VALUES (?, ?, ?)', rows)

      const results = db.execSql('SELECT COUNT(*) FROM users')
      assert.strictEqual(results[0].values[0][0], 2)
    })

    it('should handle empty rows array', () => {
      const count = db.bulkInsert('INSERT INTO users VALUES (?, ?, ?)', [])

      assert.strictEqual(count, 0)
    })

    it('should handle large number of rows efficiently', () => {
      const rows = Array.from({ length: 10000 }, (_, i) => [i, `User ${i}`, Math.random() * 100])

      const startTime = Date.now()
      const count = db.bulkInsert('INSERT INTO users VALUES (?, ?, ?)', rows)
      const elapsed = Date.now() - startTime

      assert.strictEqual(count, 10000)
      // Should complete in reasonable time (less than 5 seconds)
      assert.ok(elapsed < 5000, `Bulk insert of 10000 rows took ${elapsed}ms, expected < 5000ms`)
    })

    it('should use transactions internally for atomicity', () => {
      // Insert some initial data
      db.run('INSERT INTO users VALUES (?, ?, ?)', [1, 'Existing', 50.0])

      const rows = [
        [2, 'New1', 60.0],
        [1, 'Duplicate', 70.0], // This should fail due to PRIMARY KEY constraint
        [3, 'New2', 80.0]
      ]

      assert.throws(() => {
        db.bulkInsert('INSERT INTO users VALUES (?, ?, ?)', rows)
      }, Error)

      // Due to transaction, either all or none should be inserted
      // Depending on implementation, might rollback all or commit partial
      // The contract should define this behavior
      const results = db.execSql('SELECT COUNT(*) FROM users')
      // After rollback, only original row should exist
      assert.strictEqual(results[0].values[0][0], 1, 'Should rollback on error')
    })

    it('should handle named parameters', () => {
      const rows = [
        { $id: 1, $name: 'Alice', $score: 95.5 },
        { $id: 2, $name: 'Bob', $score: 87.3 }
      ]

      const count = db.bulkInsert('INSERT INTO users VALUES ($id, $name, $score)', rows)

      assert.strictEqual(count, 2)

      const results = db.execSql('SELECT name FROM users ORDER BY id')
      assert.deepStrictEqual(results[0].values, [['Alice'], ['Bob']])
    })
  })

  describe('transaction(fn)', () => {
    let db

    beforeEach(async () => {
      db = await Database.create()
      db.execSql('CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance REAL)')
      db.run('INSERT INTO accounts VALUES (?, ?)', [1, 100.0])
      db.run('INSERT INTO accounts VALUES (?, ?)', [2, 200.0])
    })

    afterEach(() => {
      if (db && !db.closed) {
        db.close()
      }
    })

    it('should commit changes on successful completion', () => {
      db.transaction(() => {
        db.run('UPDATE accounts SET balance = balance - 50 WHERE id = 1')
        db.run('UPDATE accounts SET balance = balance + 50 WHERE id = 2')
      })

      const results = db.execSql('SELECT balance FROM accounts ORDER BY id')
      assert.strictEqual(results[0].values[0][0], 50.0)
      assert.strictEqual(results[0].values[1][0], 250.0)
    })

    it('should rollback on error', () => {
      assert.throws(() => {
        db.transaction(() => {
          db.run('UPDATE accounts SET balance = balance - 50 WHERE id = 1')
          throw new Error('Simulated error')
          // eslint-disable-next-line no-unreachable
          db.run('UPDATE accounts SET balance = balance + 50 WHERE id = 2')
        })
      }, Error)

      // Balances should be unchanged
      const results = db.execSql('SELECT balance FROM accounts ORDER BY id')
      assert.strictEqual(results[0].values[0][0], 100.0)
      assert.strictEqual(results[0].values[1][0], 200.0)
    })

    it('should return value from function', () => {
      const result = db.transaction(() => {
        db.run('UPDATE accounts SET balance = balance - 50 WHERE id = 1')
        return 'success'
      })

      assert.strictEqual(result, 'success')
    })

    it('should support nested transactions (savepoints)', () => {
      db.transaction(() => {
        db.run('UPDATE accounts SET balance = balance - 10 WHERE id = 1')

        // Nested transaction
        try {
          db.transaction(() => {
            db.run('UPDATE accounts SET balance = balance - 20 WHERE id = 1')
            throw new Error('Inner error')
          })
        } catch {
          // Inner transaction rolled back
        }

        // Outer transaction continues
        db.run('UPDATE accounts SET balance = balance - 5 WHERE id = 1')
      })

      // Only -10 and -5 should be applied (inner -20 was rolled back)
      const results = db.execSql('SELECT balance FROM accounts WHERE id = 1')
      assert.strictEqual(results[0].values[0][0], 85.0)
    })

    it('should handle async functions', async () => {
      // Note: sql.js is synchronous, but our API might support async
      // If not supporting async, this test documents that behavior
      const result = db.transaction(() => {
        db.run('UPDATE accounts SET balance = 999 WHERE id = 1')
        return db.execSql('SELECT balance FROM accounts WHERE id = 1')[0].values[0][0]
      })

      assert.strictEqual(result, 999)
    })
  })

  describe('getCacheStats()', () => {
    let db

    beforeEach(async () => {
      db = await Database.create(undefined, {
        statementCache: {
          maxSize: 10,
          ttlMs: 300000
        }
      })
      db.execSql('CREATE TABLE test (id INTEGER)')
    })

    afterEach(() => {
      if (db && !db.closed) {
        db.close()
      }
    })

    it('should return CacheStats object with required properties', () => {
      const stats = db.getCacheStats()

      assert.ok(typeof stats === 'object', 'Should return object')
      assert.ok(typeof stats.hits === 'number', 'Should have hits property')
      assert.ok(typeof stats.misses === 'number', 'Should have misses property')
      assert.ok(typeof stats.size === 'number', 'Should have size property')
      assert.ok(typeof stats.evictions === 'number', 'Should have evictions property')
    })

    it('should track cache hits', () => {
      // First call - cache miss (do not free, keep in cache)
      const stmt1 = db.prepare('SELECT * FROM test WHERE id = ?')

      // Second call - cache hit (same SQL)
      const stmt2 = db.prepare('SELECT * FROM test WHERE id = ?')

      // Both should reference the same cached statement
      assert.strictEqual(stmt1, stmt2, 'Should return same cached statement')

      const stats = db.getCacheStats()
      assert.ok(stats.hits >= 1, 'Should have at least 1 hit')

      stmt1.free()
    })

    it('should track cache misses', () => {
      db.prepare('SELECT * FROM test WHERE id = 1').free()

      const stats = db.getCacheStats()
      assert.ok(stats.misses >= 1, 'Should have at least 1 miss')
    })

    it('should track cache size', () => {
      db.prepare('SELECT 1').free()
      db.prepare('SELECT 2').free()
      db.prepare('SELECT 3').free()

      const stats = db.getCacheStats()
      assert.ok(stats.size >= 1, 'Should have entries in cache')
    })

    it('should track evictions when cache is full', async () => {
      // Create database with small cache
      const smallDb = await Database.create(undefined, {
        statementCache: { maxSize: 2, ttlMs: 300000 }
      })
      smallDb.execSql('CREATE TABLE t (id INTEGER)')

      // Fill and exceed cache
      smallDb.prepare('SELECT 1').free()
      smallDb.prepare('SELECT 2').free()
      smallDb.prepare('SELECT 3').free() // Should evict oldest

      const stats = smallDb.getCacheStats()
      assert.ok(stats.evictions >= 1, 'Should have at least 1 eviction')

      smallDb.close()
    })

    it('should start with zero values', async () => {
      const freshDb = await Database.create()

      const stats = freshDb.getCacheStats()

      assert.strictEqual(stats.hits, 0)
      assert.strictEqual(stats.misses, 0)
      assert.strictEqual(stats.size, 0)
      assert.strictEqual(stats.evictions, 0)

      freshDb.close()
    })
  })
})
