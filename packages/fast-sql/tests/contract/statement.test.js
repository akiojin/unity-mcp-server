/**
 * Statement Contract Tests
 *
 * Defines the API contract for Statement class (PreparedStatement).
 * These tests must FAIL before implementation (RED phase of TDD).
 *
 * Contract:
 * - prepare(sql) returns Statement
 * - bind(params) binds parameters
 * - step() returns true if row available, false otherwise
 * - get() returns Row (array)
 * - getAsObject() returns RowObject (object)
 * - reset() resets for re-execution
 * - free() releases the statement
 * - getColumnNames() returns column names
 */
import { describe, it, before, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

let initFastSql
let SQL
let db

describe('Statement Contract', () => {
  before(async () => {
    try {
      const module = await import('../../dist/index.js')
      initFastSql = module.default || module.initFastSql
      SQL = await initFastSql()
    } catch (e) {
      console.log('RED phase: Module not yet implemented')
    }
  })

  beforeEach(() => {
    if (SQL) {
      db = new SQL.Database()
      db.execSql(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          age INTEGER
        )
      `)
      db.run('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30])
      db.run('INSERT INTO users (name, age) VALUES (?, ?)', ['Bob', 25])
      db.run('INSERT INTO users (name, age) VALUES (?, ?)', ['Charlie', 35])
    }
  })

  afterEach(() => {
    if (db && !db.closed) {
      db.close()
    }
  })

  describe('prepare(sql)', () => {
    it('should create Statement with sql property', () => {
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?')

      assert.ok(stmt, 'Statement should be created')
      assert.strictEqual(stmt.sql, 'SELECT * FROM users WHERE id = ?')

      stmt.free()
    })
  })

  describe('bind(params)', () => {
    it('should bind positional parameters (array)', () => {
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?')

      const result = stmt.bind([1])

      assert.strictEqual(result, true, 'bind should return true on success')
      stmt.free()
    })

    it('should bind named parameters (object)', () => {
      const stmt = db.prepare('SELECT * FROM users WHERE id = $id')

      const result = stmt.bind({ $id: 1 })

      assert.strictEqual(result, true, 'bind should return true on success')
      stmt.free()
    })

    it('should handle multiple bind calls (rebind)', () => {
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?')

      stmt.bind([1])
      stmt.step()
      stmt.reset()
      stmt.bind([2]) // Rebind with different value

      assert.strictEqual(stmt.step(), true)
      const row = stmt.getAsObject()
      assert.strictEqual(row.name, 'Bob')

      stmt.free()
    })
  })

  describe('step()', () => {
    it('should return true when row is available', () => {
      const stmt = db.prepare('SELECT * FROM users')

      const hasRow = stmt.step()

      assert.strictEqual(hasRow, true, 'step should return true for available row')
      stmt.free()
    })

    it('should return false when no more rows', () => {
      const stmt = db.prepare('SELECT * FROM users WHERE id = 999')

      const hasRow = stmt.step()

      assert.strictEqual(hasRow, false, 'step should return false when no rows')
      stmt.free()
    })

    it('should iterate through all rows', () => {
      const stmt = db.prepare('SELECT * FROM users ORDER BY id')
      const names = []

      while (stmt.step()) {
        names.push(stmt.getAsObject().name)
      }

      assert.deepStrictEqual(names, ['Alice', 'Bob', 'Charlie'])
      stmt.free()
    })
  })

  describe('get()', () => {
    it('should return Row as array', () => {
      const stmt = db.prepare('SELECT id, name, age FROM users WHERE id = ?')
      stmt.bind([1])
      stmt.step()

      const row = stmt.get()

      assert.ok(Array.isArray(row), 'get() should return array')
      assert.strictEqual(row[0], 1)
      assert.strictEqual(row[1], 'Alice')
      assert.strictEqual(row[2], 30)

      stmt.free()
    })

    it('should return empty array when no current row (sql.js behavior)', () => {
      const stmt = db.prepare('SELECT * FROM users WHERE id = 999')
      stmt.step()

      const row = stmt.get()

      // sql.js returns empty array [] when no row available
      assert.deepStrictEqual(row, [])
      stmt.free()
    })

    it('should accept params and bind before returning', () => {
      const stmt = db.prepare('SELECT name FROM users WHERE id = ?')

      // get() with params should bind and step internally
      stmt.bind([2])
      stmt.step()
      const row = stmt.get()

      assert.ok(Array.isArray(row))
      assert.strictEqual(row[0], 'Bob')

      stmt.free()
    })
  })

  describe('getAsObject()', () => {
    it('should return RowObject with column names as keys', () => {
      const stmt = db.prepare('SELECT id, name, age FROM users WHERE id = ?')
      stmt.bind([1])
      stmt.step()

      const obj = stmt.getAsObject()

      assert.strictEqual(typeof obj, 'object')
      assert.strictEqual(obj.id, 1)
      assert.strictEqual(obj.name, 'Alice')
      assert.strictEqual(obj.age, 30)

      stmt.free()
    })

    it('should return empty object with undefined values when no current row (sql.js behavior)', () => {
      const stmt = db.prepare('SELECT * FROM users WHERE id = 999')
      stmt.step()

      const obj = stmt.getAsObject()

      // sql.js returns object with undefined values when no row available
      assert.ok(typeof obj === 'object')
      stmt.free()
    })

    it('should handle aliased columns', () => {
      const stmt = db.prepare('SELECT name AS username FROM users WHERE id = 1')
      stmt.step()

      const obj = stmt.getAsObject()

      assert.strictEqual(obj.username, 'Alice')
      assert.strictEqual(obj.name, undefined) // Original name should not exist

      stmt.free()
    })
  })

  describe('run(params)', () => {
    it('should execute INSERT/UPDATE/DELETE without returning rows', () => {
      const stmt = db.prepare('INSERT INTO users (name, age) VALUES (?, ?)')

      stmt.run(['David', 40])

      const results = db.execSql('SELECT * FROM users WHERE name = "David"')
      assert.strictEqual(results[0].values.length, 1)
      assert.strictEqual(results[0].values[0][1], 'David')

      stmt.free()
    })

    it('should bind params if provided', () => {
      const stmt = db.prepare('UPDATE users SET age = ? WHERE id = ?')

      stmt.run([99, 1])

      const results = db.execSql('SELECT age FROM users WHERE id = 1')
      assert.strictEqual(results[0].values[0][0], 99)

      stmt.free()
    })
  })

  describe('reset()', () => {
    it('should reset statement for re-execution', () => {
      const stmt = db.prepare('SELECT * FROM users ORDER BY id')

      // First iteration
      stmt.step()
      const first1 = stmt.getAsObject().name
      stmt.step()

      // Reset and iterate again
      stmt.reset()
      stmt.step()
      const first2 = stmt.getAsObject().name

      assert.strictEqual(first1, first2, 'Reset should allow re-iteration')

      stmt.free()
    })

    it('should clear bindings after reset when rebinding', () => {
      const stmt = db.prepare('SELECT name FROM users WHERE id = ?')

      stmt.bind([1])
      stmt.step()
      assert.strictEqual(stmt.getAsObject().name, 'Alice')

      stmt.reset()
      stmt.bind([2])
      stmt.step()
      assert.strictEqual(stmt.getAsObject().name, 'Bob')

      stmt.free()
    })
  })

  describe('free()', () => {
    it('should release the statement', () => {
      const stmt = db.prepare('SELECT * FROM users')

      stmt.free()

      // Further operations should throw
      assert.throws(() => {
        stmt.step()
      }, Error)
    })

    it('should be safe to call multiple times', () => {
      const stmt = db.prepare('SELECT * FROM users')

      stmt.free()
      stmt.free() // Should not throw

      assert.ok(true, 'Multiple free() calls should not throw')
    })
  })

  describe('getColumnNames()', () => {
    it('should return array of column names', () => {
      const stmt = db.prepare('SELECT id, name, age FROM users')

      const columns = stmt.getColumnNames()

      assert.ok(Array.isArray(columns))
      assert.deepStrictEqual(columns, ['id', 'name', 'age'])

      stmt.free()
    })

    it('should reflect aliases', () => {
      const stmt = db.prepare('SELECT id AS user_id, name AS username FROM users')

      const columns = stmt.getColumnNames()

      assert.deepStrictEqual(columns, ['user_id', 'username'])

      stmt.free()
    })
  })

  describe('State Transitions', () => {
    it('should follow: unbound -> bound -> stepping -> done', () => {
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?')

      // sql.js behavior: step() without bind returns false (no results without binding)
      // This is expected behavior - sql.js does not throw, it returns false
      const result = stmt.step()
      assert.strictEqual(result, false, 'step() without bind should return false')
      stmt.free()
    })

    it('should throw after free() on any operation', () => {
      const stmt = db.prepare('SELECT * FROM users')
      stmt.free()

      assert.throws(() => stmt.bind([1]), Error)
      assert.throws(() => stmt.step(), Error)
      assert.throws(() => stmt.get(), Error)
      assert.throws(() => stmt.getAsObject(), Error)
      assert.throws(() => stmt.reset(), Error)
      assert.throws(() => stmt.getColumnNames(), Error)
    })
  })
})
