/**
 * Database Contract Tests
 *
 * Defines the API contract for Database class.
 * These tests must FAIL before implementation (RED phase of TDD).
 *
 * Contract:
 * - new SQL.Database() creates an empty database
 * - execSql(sql) returns QueryExecResult[]
 * - run(sql, params) executes with bound parameters
 * - prepare(sql) returns Statement
 * - exportDb() returns Uint8Array
 * - close() closes the database
 */
import { describe, it, before } from 'node:test'
import assert from 'node:assert'

// Import will fail until implementation exists - this is expected in RED phase
let initFastSql
let SQL

describe('Database Contract', () => {
  before(async () => {
    try {
      const module = await import('../../dist/index.js')
      initFastSql = module.default || module.initFastSql
      SQL = await initFastSql()
    } catch (e) {
      // Expected to fail in RED phase
      console.log('RED phase: Module not yet implemented')
    }
  })

  describe('Constructor', () => {
    it('should create a new empty database with new SQL.Database()', () => {
      assert.ok(SQL, 'SQL module should be loaded')
      const db = new SQL.Database()
      assert.ok(db, 'Database instance should be created')
      assert.strictEqual(db.closed, false, 'Database should not be closed')
      db.close()
    })

    it('should create database from existing data with new SQL.Database(data)', () => {
      assert.ok(SQL, 'SQL module should be loaded')
      // First create and export a database
      const db1 = new SQL.Database()
      db1.execSql('CREATE TABLE test (id INTEGER)')
      db1.run('INSERT INTO test VALUES (?)', [42])
      const data = db1.exportDb()
      db1.close()

      // Then load from that data
      const db2 = new SQL.Database(data)
      const results = db2.execSql('SELECT * FROM test')
      assert.strictEqual(results[0].values[0][0], 42)
      db2.close()
    })
  })

  describe('execSql(sql)', () => {
    it('should return QueryExecResult[] for SELECT queries', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')
      db.run('INSERT INTO users (name) VALUES (?)', ['Alice'])

      const results = db.execSql('SELECT * FROM users')

      assert.ok(Array.isArray(results), 'Results should be an array')
      assert.strictEqual(results.length, 1, 'Should have one result set')
      assert.ok(Array.isArray(results[0].columns), 'Should have columns array')
      assert.ok(Array.isArray(results[0].values), 'Should have values array')
      assert.deepStrictEqual(results[0].columns, ['id', 'name'])
      assert.strictEqual(results[0].values[0][1], 'Alice')

      db.close()
    })

    it('should return empty array for non-SELECT queries', () => {
      const db = new SQL.Database()
      const results = db.execSql('CREATE TABLE test (id INTEGER)')

      assert.ok(Array.isArray(results), 'Results should be an array')
      // CREATE doesn't return result rows

      db.close()
    })

    it('should throw Error for invalid SQL', () => {
      const db = new SQL.Database()

      assert.throws(() => {
        db.execSql('INVALID SQL SYNTAX')
      }, Error)

      db.close()
    })

    it('should throw Error if database is closed', () => {
      const db = new SQL.Database()
      db.close()

      assert.throws(() => {
        db.execSql('SELECT 1')
      }, Error)
    })
  })

  describe('run(sql, params)', () => {
    it('should execute SQL with positional parameters', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (a INTEGER, b TEXT)')

      db.run('INSERT INTO test VALUES (?, ?)', [1, 'hello'])

      const results = db.execSql('SELECT * FROM test')
      assert.deepStrictEqual(results[0].values[0], [1, 'hello'])

      db.close()
    })

    it('should execute SQL with named parameters', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (a INTEGER, b TEXT)')

      db.run('INSERT INTO test VALUES ($a, $b)', { $a: 2, $b: 'world' })

      const results = db.execSql('SELECT * FROM test')
      assert.deepStrictEqual(results[0].values[0], [2, 'world'])

      db.close()
    })

    it('should handle NULL values', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (a INTEGER, b TEXT)')

      db.run('INSERT INTO test VALUES (?, ?)', [null, null])

      const results = db.execSql('SELECT * FROM test')
      assert.deepStrictEqual(results[0].values[0], [null, null])

      db.close()
    })

    it('should handle Uint8Array (BLOB) values', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (data BLOB)')
      const blob = new Uint8Array([1, 2, 3, 4, 5])

      db.run('INSERT INTO test VALUES (?)', [blob])

      const results = db.execSql('SELECT * FROM test')
      assert.ok(results[0].values[0][0] instanceof Uint8Array)
      assert.deepStrictEqual([...results[0].values[0][0]], [1, 2, 3, 4, 5])

      db.close()
    })
  })

  describe('prepare(sql)', () => {
    it('should return a Statement object', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (id INTEGER)')

      const stmt = db.prepare('SELECT * FROM test')

      assert.ok(stmt, 'Statement should be returned')
      assert.strictEqual(typeof stmt.bind, 'function', 'Statement should have bind method')
      assert.strictEqual(typeof stmt.step, 'function', 'Statement should have step method')
      assert.strictEqual(typeof stmt.get, 'function', 'Statement should have get method')
      assert.strictEqual(typeof stmt.free, 'function', 'Statement should have free method')

      stmt.free()
      db.close()
    })

    it('should throw Error for invalid SQL', () => {
      const db = new SQL.Database()

      assert.throws(() => {
        db.prepare('INVALID SQL')
      }, Error)

      db.close()
    })
  })

  describe('exportDb()', () => {
    it('should return Uint8Array with valid SQLite binary', () => {
      const db = new SQL.Database()
      db.execSql('CREATE TABLE test (id INTEGER)')
      db.run('INSERT INTO test VALUES (?)', [42])

      const data = db.exportDb()

      assert.ok(data instanceof Uint8Array, 'Should return Uint8Array')
      assert.ok(data.length > 0, 'Should have content')

      // Verify SQLite magic bytes: "SQLite format 3\0"
      const magic = new TextDecoder().decode(data.slice(0, 16))
      assert.strictEqual(magic, 'SQLite format 3\0', 'Should have SQLite magic bytes')

      db.close()
    })
  })

  describe('close()', () => {
    it('should close the database', () => {
      const db = new SQL.Database()

      db.close()

      assert.strictEqual(db.closed, true, 'Database should be closed')
    })

    it('should be safe to call multiple times', () => {
      const db = new SQL.Database()

      db.close()
      db.close() // Should not throw

      assert.strictEqual(db.closed, true)
    })
  })
})
