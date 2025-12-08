/**
 * Export Contract Tests
 *
 * Defines the API contract for database export functionality.
 * These tests must FAIL before implementation (RED phase of TDD).
 *
 * Contract:
 * - exportDb() returns valid SQLite binary (Uint8Array)
 * - Magic bytes verification ("SQLite format 3\0")
 * - Exported data can be re-imported
 */
import { describe, it, before } from 'node:test'
import assert from 'node:assert'

let initFastSql
let SQL

describe('Export Contract', () => {
  before(async () => {
    try {
      const module = await import('../../dist/index.js')
      initFastSql = module.default || module.initFastSql
      SQL = await initFastSql()
    } catch (e) {
      console.log('RED phase: Module not yet implemented')
    }
  })

  describe('exportDb()', () => {
    it('should return Uint8Array', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (id INTEGER)')

      const data = db.exportDb()

      assert.ok(data instanceof Uint8Array, 'exportDb() should return Uint8Array')
      db.close()
    })

    it('should return valid SQLite binary with magic bytes', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (id INTEGER)')

      const data = db.exportDb()

      // SQLite file format magic bytes: "SQLite format 3\0" (16 bytes)
      const expectedMagic = 'SQLite format 3\0'
      const actualMagic = new TextDecoder().decode(data.slice(0, 16))

      assert.strictEqual(
        actualMagic,
        expectedMagic,
        `Magic bytes should be "${expectedMagic}" but got "${actualMagic}"`
      )

      db.close()
    })

    it('should have valid SQLite header structure', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (id INTEGER)')

      const data = db.exportDb()

      // Page size is at bytes 16-17 (big-endian)
      const pageSize = (data[16] << 8) | data[17]
      // Valid page sizes: 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, or 1 (means 65536)
      const validPageSizes = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 1]
      assert.ok(
        validPageSizes.includes(pageSize),
        `Page size ${pageSize} should be a valid SQLite page size`
      )

      // File change counter at bytes 24-27
      // Should be >= 0
      const changeCounter = (data[24] << 24) | (data[25] << 16) | (data[26] << 8) | data[27]
      assert.ok(changeCounter >= 0, 'Change counter should be non-negative')

      db.close()
    })

    it('should preserve data when re-imported', () => {
      // Create and populate database
      const db1 = new SQL.Database()
      db1.execSql('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, score REAL)')
      db1.run('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 95.5])
      db1.run('INSERT INTO users VALUES (?, ?, ?)', [2, 'Bob', 87.3])

      // Export
      const data = db1.exportDb()
      db1.close()

      // Re-import
      const db2 = new SQL.Database(data)
      const results = db2.execSql('SELECT * FROM users ORDER BY id')

      assert.strictEqual(results[0].values.length, 2, 'Should have 2 rows')
      assert.deepStrictEqual(results[0].values[0], [1, 'Alice', 95.5])
      assert.deepStrictEqual(results[0].values[1], [2, 'Bob', 87.3])

      db2.close()
    })

    it('should preserve schema when re-imported', () => {
      const db1 = new SQL.Database()
      db1.execSql(`
        CREATE TABLE test (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      db1.execSql('CREATE INDEX idx_name ON test(name)')

      const data = db1.exportDb()
      db1.close()

      const db2 = new SQL.Database(data)

      // Verify table exists by inserting
      db2.run('INSERT INTO test (name) VALUES (?)', ['Test'])
      const results = db2.execSql('SELECT name FROM test')
      assert.strictEqual(results[0].values[0][0], 'Test')

      // Verify UNIQUE constraint
      assert.throws(
        () => {
          db2.run('INSERT INTO test (name) VALUES (?)', ['Test'])
        },
        Error,
        'UNIQUE constraint should be preserved'
      )

      db2.close()
    })

    it('should handle empty database export', () => {
      const db = new SQL.Database()

      const data = db.exportDb()

      assert.ok(data instanceof Uint8Array)
      // sql.js returns empty Uint8Array for empty database (no tables)
      // Only databases with at least one table have header
      assert.strictEqual(data.length, 0, 'Empty database returns empty array in sql.js')

      db.close()
    })

    it('should handle large data export', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE large (id INTEGER PRIMARY KEY, data TEXT)')

      // Insert 1000 rows with some data
      for (let i = 0; i < 1000; i++) {
        db.run('INSERT INTO large VALUES (?, ?)', [i, `Data row ${i} with some content`])
      }

      const data = db.exportDb()

      assert.ok(data instanceof Uint8Array)
      assert.ok(data.length > 1000, 'Large database export should have substantial size')

      // Verify magic bytes are still correct
      const magic = new TextDecoder().decode(data.slice(0, 16))
      assert.strictEqual(magic, 'SQLite format 3\0')

      db.close()
    })

    it('should handle BLOB data in export', () => {
      const db1 = new SQL.Database()
      db1.execSql('CREATE TABLE blobs (id INTEGER PRIMARY KEY, data BLOB)')

      const blob = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      db1.run('INSERT INTO blobs VALUES (?, ?)', [1, blob])

      const data = db1.exportDb()
      db1.close()

      const db2 = new SQL.Database(data)
      const results = db2.execSql('SELECT data FROM blobs WHERE id = 1')

      assert.ok(results[0].values[0][0] instanceof Uint8Array)
      assert.deepStrictEqual([...results[0].values[0][0]], [0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])

      db2.close()
    })
  })

  describe('Import from external SQLite', () => {
    it('should accept valid SQLite binary from external source', () => {
      // Create a minimal valid SQLite header (first 100 bytes)
      // This is a simplified test - in practice, we'd use actual SQLite files
      const db1 = new SQL.Database()
      db1.execSql('CREATE TABLE external (id INTEGER)')
      const validData = db1.exportDb()
      db1.close()

      // Should be able to import
      const db2 = new SQL.Database(validData)
      assert.ok(!db2.closed)

      // Should be able to query
      const results = db2.execSql("SELECT name FROM sqlite_master WHERE type='table'")
      assert.ok(results[0].values.some(row => row[0] === 'external'))

      db2.close()
    })

    it('should reject invalid binary data', () => {
      const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03])

      assert.throws(
        () => {
          const db = new SQL.Database(invalidData)
          db.close() // Won't reach here
        },
        Error,
        'Should reject invalid SQLite binary'
      )
    })

    it('should reject corrupted SQLite file', () => {
      const db1 = new SQL.Database()
      db1.execSql('CREATE TABLE test (id INTEGER)')
      const data = db1.exportDb()
      db1.close()

      // Corrupt the data by modifying magic bytes
      const corrupted = new Uint8Array(data)
      corrupted[0] = 0x00

      assert.throws(
        () => {
          const db = new SQL.Database(corrupted)
          db.close() // Won't reach here
        },
        Error,
        'Should reject corrupted SQLite file'
      )
    })
  })
})
