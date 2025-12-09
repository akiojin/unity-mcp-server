/**
 * sql.js Compatibility Integration Tests
 *
 * Verifies that fast-sql is compatible with sql.js usage patterns.
 * These tests ensure seamless migration from sql.js to fast-sql.
 *
 * Test scenarios:
 * - Full CRUD cycle (Create, Read, Update, Delete)
 * - PreparedStatement usage patterns
 * - Transaction with multiple operations
 */
import { describe, it, before, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

let initFastSql
let SQL
let db

describe('sql.js Compatibility', () => {
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
    }
  })

  afterEach(() => {
    if (db && !db.closed) {
      db.close()
    }
  })

  describe('Full CRUD Cycle', () => {
    it('should handle CREATE TABLE', () => {
      db.execSql(`
        CREATE TABLE products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          stock INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Verify table exists
      const tables = db.execSql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='products'"
      )
      assert.strictEqual(tables[0].values.length, 1)
      assert.strictEqual(tables[0].values[0][0], 'products')
    })

    it('should handle INSERT with various data types', () => {
      db.execSql('CREATE TABLE items (id INTEGER, name TEXT, price REAL, data BLOB)')

      db.run('INSERT INTO items VALUES (?, ?, ?, ?)', [
        1,
        'Widget',
        19.99,
        new Uint8Array([1, 2, 3])
      ])

      const results = db.execSql('SELECT * FROM items')
      assert.strictEqual(results[0].values[0][0], 1)
      assert.strictEqual(results[0].values[0][1], 'Widget')
      assert.strictEqual(results[0].values[0][2], 19.99)
      assert.ok(results[0].values[0][3] instanceof Uint8Array)
    })

    it('should handle SELECT with WHERE clause', () => {
      db.execSql('CREATE TABLE users (id INTEGER, name TEXT, active INTEGER)')
      db.run('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 1])
      db.run('INSERT INTO users VALUES (?, ?, ?)', [2, 'Bob', 0])
      db.run('INSERT INTO users VALUES (?, ?, ?)', [3, 'Charlie', 1])

      const active = db.execSql('SELECT name FROM users WHERE active = 1 ORDER BY name')

      assert.strictEqual(active[0].values.length, 2)
      assert.strictEqual(active[0].values[0][0], 'Alice')
      assert.strictEqual(active[0].values[1][0], 'Charlie')
    })

    it('should handle UPDATE', () => {
      db.execSql('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, score INTEGER)')
      db.run('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 100])

      db.run('UPDATE users SET score = score + 10 WHERE id = ?', [1])

      const results = db.execSql('SELECT score FROM users WHERE id = 1')
      assert.strictEqual(results[0].values[0][0], 110)
    })

    it('should handle DELETE', () => {
      db.execSql('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')
      db.run('INSERT INTO users VALUES (?, ?)', [1, 'Alice'])
      db.run('INSERT INTO users VALUES (?, ?)', [2, 'Bob'])

      db.run('DELETE FROM users WHERE id = ?', [1])

      const results = db.execSql('SELECT COUNT(*) FROM users')
      assert.strictEqual(results[0].values[0][0], 1)
    })

    it('should handle full CRUD cycle', () => {
      // CREATE
      db.execSql(`
        CREATE TABLE notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT
        )
      `)

      // INSERT (Create)
      db.run('INSERT INTO notes (title, content) VALUES (?, ?)', ['Note 1', 'Content 1'])
      db.run('INSERT INTO notes (title, content) VALUES (?, ?)', ['Note 2', 'Content 2'])

      // SELECT (Read)
      let results = db.execSql('SELECT * FROM notes ORDER BY id')
      assert.strictEqual(results[0].values.length, 2)

      // UPDATE
      db.run('UPDATE notes SET content = ? WHERE id = ?', ['Updated Content', 1])
      results = db.execSql('SELECT content FROM notes WHERE id = 1')
      assert.strictEqual(results[0].values[0][0], 'Updated Content')

      // DELETE
      db.run('DELETE FROM notes WHERE id = ?', [2])
      results = db.execSql('SELECT COUNT(*) FROM notes')
      assert.strictEqual(results[0].values[0][0], 1)
    })
  })

  describe('PreparedStatement Patterns', () => {
    beforeEach(() => {
      db.execSql(`
        CREATE TABLE employees (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          department TEXT,
          salary REAL
        )
      `)
      db.run('INSERT INTO employees VALUES (?, ?, ?, ?)', [1, 'Alice', 'Engineering', 75000])
      db.run('INSERT INTO employees VALUES (?, ?, ?, ?)', [2, 'Bob', 'Marketing', 65000])
      db.run('INSERT INTO employees VALUES (?, ?, ?, ?)', [3, 'Charlie', 'Engineering', 80000])
    })

    it('should iterate with step() and getAsObject()', () => {
      const stmt = db.prepare('SELECT * FROM employees ORDER BY id')
      const employees = []

      while (stmt.step()) {
        employees.push(stmt.getAsObject())
      }

      assert.strictEqual(employees.length, 3)
      assert.strictEqual(employees[0].name, 'Alice')
      assert.strictEqual(employees[1].name, 'Bob')
      assert.strictEqual(employees[2].name, 'Charlie')

      stmt.free()
    })

    it('should iterate with step() and get()', () => {
      const stmt = db.prepare('SELECT name, salary FROM employees ORDER BY salary DESC')
      const rows = []

      while (stmt.step()) {
        rows.push(stmt.get())
      }

      assert.strictEqual(rows.length, 3)
      assert.deepStrictEqual(rows[0], ['Charlie', 80000])
      assert.deepStrictEqual(rows[1], ['Alice', 75000])
      assert.deepStrictEqual(rows[2], ['Bob', 65000])

      stmt.free()
    })

    it('should support bind() and reset() for parameterized queries', () => {
      const stmt = db.prepare('SELECT name FROM employees WHERE department = ?')

      // First query
      stmt.bind(['Engineering'])
      const engineers = []
      while (stmt.step()) {
        engineers.push(stmt.getAsObject().name)
      }

      // Reset and rebind
      stmt.reset()
      stmt.bind(['Marketing'])
      const marketers = []
      while (stmt.step()) {
        marketers.push(stmt.getAsObject().name)
      }

      assert.deepStrictEqual(engineers.sort(), ['Alice', 'Charlie'])
      assert.deepStrictEqual(marketers, ['Bob'])

      stmt.free()
    })

    it('should support named parameters', () => {
      const stmt = db.prepare(
        'SELECT name FROM employees WHERE department = $dept AND salary >= $minSalary'
      )

      stmt.bind({ $dept: 'Engineering', $minSalary: 77000 })
      const results = []
      while (stmt.step()) {
        results.push(stmt.getAsObject().name)
      }

      assert.deepStrictEqual(results, ['Charlie'])

      stmt.free()
    })

    it('should support INSERT with PreparedStatement', () => {
      const stmt = db.prepare('INSERT INTO employees VALUES (?, ?, ?, ?)')

      stmt.run([4, 'David', 'Sales', 70000])
      stmt.reset()
      stmt.run([5, 'Eve', 'Sales', 72000])

      const results = db.execSql('SELECT COUNT(*) FROM employees WHERE department = "Sales"')
      assert.strictEqual(results[0].values[0][0], 2)

      stmt.free()
    })

    it('should provide column names via getColumnNames()', () => {
      const stmt = db.prepare('SELECT id, name AS employee_name, salary FROM employees')

      const columns = stmt.getColumnNames()

      assert.deepStrictEqual(columns, ['id', 'employee_name', 'salary'])

      stmt.free()
    })
  })

  describe('Transaction Patterns', () => {
    beforeEach(() => {
      db.execSql(`
        CREATE TABLE bank_accounts (
          id INTEGER PRIMARY KEY,
          owner TEXT NOT NULL,
          balance REAL NOT NULL CHECK(balance >= 0)
        )
      `)
      db.run('INSERT INTO bank_accounts VALUES (?, ?, ?)', [1, 'Alice', 1000.0])
      db.run('INSERT INTO bank_accounts VALUES (?, ?, ?)', [2, 'Bob', 500.0])
    })

    it('should support manual BEGIN/COMMIT transaction', () => {
      db.execSql('BEGIN TRANSACTION')
      db.run('UPDATE bank_accounts SET balance = balance - 100 WHERE id = 1')
      db.run('UPDATE bank_accounts SET balance = balance + 100 WHERE id = 2')
      db.execSql('COMMIT')

      const results = db.execSql('SELECT balance FROM bank_accounts ORDER BY id')
      assert.strictEqual(results[0].values[0][0], 900.0)
      assert.strictEqual(results[0].values[1][0], 600.0)
    })

    it('should support manual BEGIN/ROLLBACK transaction', () => {
      db.execSql('BEGIN TRANSACTION')
      db.run('UPDATE bank_accounts SET balance = balance - 100 WHERE id = 1')

      // Decide to rollback
      db.execSql('ROLLBACK')

      const results = db.execSql('SELECT balance FROM bank_accounts WHERE id = 1')
      assert.strictEqual(results[0].values[0][0], 1000.0) // Unchanged
    })

    it('should support multiple operations in transaction', () => {
      db.execSql('BEGIN IMMEDIATE')

      // Multiple operations
      db.run('INSERT INTO bank_accounts VALUES (?, ?, ?)', [3, 'Charlie', 200.0])
      db.run('UPDATE bank_accounts SET balance = balance * 1.05') // 5% interest
      db.run('DELETE FROM bank_accounts WHERE balance < 250')

      db.execSql('COMMIT')

      const results = db.execSql('SELECT * FROM bank_accounts ORDER BY id')
      // Alice: 1000 * 1.05 = 1050
      // Bob: 500 * 1.05 = 525
      // Charlie: 200 * 1.05 = 210 (deleted, < 250)
      assert.strictEqual(results[0].values.length, 2)
      assert.strictEqual(results[0].values[0][2], 1050.0)
      assert.strictEqual(results[0].values[1][2], 525.0)
    })

    it('should handle CHECK constraint violation with rollback', () => {
      db.execSql('BEGIN TRANSACTION')
      db.run('UPDATE bank_accounts SET balance = balance - 100 WHERE id = 1')

      // This should fail due to CHECK constraint (balance >= 0)
      assert.throws(() => {
        db.run('UPDATE bank_accounts SET balance = balance - 1000 WHERE id = 2') // Would make balance -500
      }, Error)

      db.execSql('ROLLBACK')

      // Verify original balances
      const results = db.execSql('SELECT balance FROM bank_accounts ORDER BY id')
      assert.strictEqual(results[0].values[0][0], 1000.0)
      assert.strictEqual(results[0].values[1][0], 500.0)
    })
  })

  describe('Complex Query Patterns', () => {
    beforeEach(() => {
      db.execSql(`
        CREATE TABLE orders (
          id INTEGER PRIMARY KEY,
          customer_id INTEGER,
          product TEXT,
          quantity INTEGER,
          price REAL,
          order_date TEXT
        )
      `)
      db.execSql(`
        CREATE TABLE customers (
          id INTEGER PRIMARY KEY,
          name TEXT,
          email TEXT
        )
      `)

      // Insert customers
      db.run('INSERT INTO customers VALUES (?, ?, ?)', [1, 'Alice', 'alice@example.com'])
      db.run('INSERT INTO customers VALUES (?, ?, ?)', [2, 'Bob', 'bob@example.com'])

      // Insert orders
      db.run('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)', [
        1,
        1,
        'Widget',
        5,
        10.0,
        '2024-01-15'
      ])
      db.run('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)', [
        2,
        1,
        'Gadget',
        2,
        25.0,
        '2024-01-20'
      ])
      db.run('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)', [
        3,
        2,
        'Widget',
        3,
        10.0,
        '2024-01-18'
      ])
    })

    it('should handle JOIN queries', () => {
      const results = db.execSql(`
        SELECT c.name, o.product, o.quantity
        FROM customers c
        JOIN orders o ON c.id = o.customer_id
        ORDER BY c.name, o.product
      `)

      assert.strictEqual(results[0].values.length, 3)
      assert.deepStrictEqual(results[0].columns, ['name', 'product', 'quantity'])
    })

    it('should handle aggregate functions', () => {
      const results = db.execSql(`
        SELECT customer_id, SUM(quantity * price) as total
        FROM orders
        GROUP BY customer_id
        ORDER BY total DESC
      `)

      assert.strictEqual(results[0].values.length, 2)
      assert.strictEqual(results[0].values[0][1], 100.0) // Alice: 5*10 + 2*25
      assert.strictEqual(results[0].values[1][1], 30.0) // Bob: 3*10
    })

    it('should handle subqueries', () => {
      const results = db.execSql(`
        SELECT name FROM customers
        WHERE id IN (
          SELECT DISTINCT customer_id FROM orders WHERE product = 'Widget'
        )
        ORDER BY name
      `)

      assert.strictEqual(results[0].values.length, 2)
      assert.strictEqual(results[0].values[0][0], 'Alice')
      assert.strictEqual(results[0].values[1][0], 'Bob')
    })

    it('should handle LIKE pattern matching', () => {
      const results = db.execSql("SELECT product FROM orders WHERE product LIKE 'W%'")

      assert.strictEqual(results[0].values.length, 2)
      results[0].values.forEach(row => {
        assert.ok(row[0].startsWith('W'))
      })
    })

    it('should handle CASE expressions', () => {
      const results = db.execSql(`
        SELECT product,
          CASE
            WHEN quantity >= 5 THEN 'High'
            WHEN quantity >= 3 THEN 'Medium'
            ELSE 'Low'
          END as volume
        FROM orders
        ORDER BY product
      `)

      const volumes = results[0].values.map(row => row[1])
      assert.ok(volumes.includes('High'))
      assert.ok(volumes.includes('Medium'))
      assert.ok(volumes.includes('Low'))
    })
  })

  describe('Export and Re-import Cycle', () => {
    it('should preserve all data through export/import cycle', () => {
      // Create complex data
      db.execSql(`
        CREATE TABLE multi_type (
          id INTEGER PRIMARY KEY,
          int_val INTEGER,
          real_val REAL,
          text_val TEXT,
          blob_val BLOB,
          null_val TEXT
        )
      `)

      db.run('INSERT INTO multi_type VALUES (?, ?, ?, ?, ?, ?)', [
        1,
        42,
        3.14159,
        'Hello, 世界!',
        new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        null
      ])

      // Export
      const data = db.exportDb()
      db.close()

      // Re-import
      const db2 = new SQL.Database(data)
      const results = db2.execSql('SELECT * FROM multi_type')

      const row = results[0].values[0]
      assert.strictEqual(row[0], 1)
      assert.strictEqual(row[1], 42)
      assert.ok(Math.abs(row[2] - 3.14159) < 0.00001)
      assert.strictEqual(row[3], 'Hello, 世界!')
      assert.ok(row[4] instanceof Uint8Array)
      assert.deepStrictEqual([...row[4]], [0xde, 0xad, 0xbe, 0xef])
      assert.strictEqual(row[5], null)

      db2.close()
    })
  })
})
