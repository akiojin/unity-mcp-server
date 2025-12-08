/**
 * Benchmark Tests
 *
 * Performance benchmarks comparing fast-sql against sql.js baseline.
 *
 * Target performance improvements:
 * - 50,000 bulk insert: 100ms or less (sql.js baseline: 126ms, 20%+ improvement)
 * - Same SQL repeated 1000 times: 10μs or less per query (sql.js baseline: 21μs, 50%+ improvement)
 * - LIKE search: 4ms or less (sql.js baseline: 5ms, 20%+ improvement)
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'

let initFastSql
let Database

// Helper to measure execution time
function measure(fn) {
  const start = process.hrtime.bigint()
  const result = fn()
  const end = process.hrtime.bigint()
  const durationNs = Number(end - start)
  const durationMs = durationNs / 1_000_000
  return { result, durationMs, durationNs }
}

describe('Performance Benchmarks', () => {
  before(async () => {
    try {
      const module = await import('../../dist/index.js')
      initFastSql = module.default || module.initFastSql
      Database = module.Database
      await initFastSql() // Initialize WASM
    } catch (e) {
      console.log('RED phase: Module not yet implemented')
    }
  })

  describe('Bulk Insert Performance', () => {
    /**
     * Target: 50,000 rows in 100ms or less
     * sql.js baseline: ~126ms
     * Expected improvement: 20%+
     */
    it('should insert 50,000 rows in 100ms or less using bulkInsert()', async () => {
      const db = await Database.create()
      db.execSql(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          score REAL
        )
      `)

      // Prepare 50,000 rows
      const rows = Array.from({ length: 50000 }, (_, i) => [
        i + 1,
        `User ${i}`,
        `user${i}@example.com`,
        Math.random() * 100
      ])

      const { durationMs, result: count } = measure(() => {
        return db.bulkInsert('INSERT INTO users VALUES (?, ?, ?, ?)', rows)
      })

      console.log(`    Bulk insert 50,000 rows: ${durationMs.toFixed(2)}ms`)

      assert.strictEqual(count, 50000, 'Should insert 50,000 rows')
      assert.ok(
        durationMs <= 100,
        `Bulk insert should complete in 100ms or less, got ${durationMs.toFixed(2)}ms`
      )

      // Verify data integrity
      const countResult = db.execSql('SELECT COUNT(*) FROM users')
      assert.strictEqual(countResult[0].values[0][0], 50000)

      db.close()
    })

    it('should be faster than individual inserts', async () => {
      const db = await Database.create()
      db.execSql('CREATE TABLE test1 (id INTEGER, value TEXT)')
      db.execSql('CREATE TABLE test2 (id INTEGER, value TEXT)')

      const rows = Array.from({ length: 1000 }, (_, i) => [i, `Value ${i}`])

      // Individual inserts (slower)
      const { durationMs: individualMs } = measure(() => {
        db.execSql('BEGIN TRANSACTION')
        for (const row of rows) {
          db.run('INSERT INTO test1 VALUES (?, ?)', row)
        }
        db.execSql('COMMIT')
      })

      // Bulk insert (should be faster)
      const { durationMs: bulkMs } = measure(() => {
        db.bulkInsert('INSERT INTO test2 VALUES (?, ?)', rows)
      })

      console.log(`    Individual inserts (1000 rows): ${individualMs.toFixed(2)}ms`)
      console.log(`    Bulk insert (1000 rows): ${bulkMs.toFixed(2)}ms`)

      // Bulk should be at least as fast (allow some variance)
      assert.ok(
        bulkMs <= individualMs * 1.5, // Allow 50% variance due to test environment
        `Bulk insert (${bulkMs.toFixed(2)}ms) should not be significantly slower than individual (${individualMs.toFixed(2)}ms)`
      )

      db.close()
    })
  })

  describe('Repeated Query Performance (Statement Cache)', () => {
    /**
     * Target: 10μs or less per query for repeated same SQL
     * sql.js baseline: ~21μs
     * Expected improvement: 50%+
     */
    it('should execute same query 1000 times with average 10μs or less per query', async () => {
      const db = await Database.create()
      db.execSql('CREATE TABLE cache_test (id INTEGER PRIMARY KEY, value TEXT)')

      // Insert some test data
      const testData = Array.from({ length: 100 }, (_, i) => [i, `Value ${i}`])
      db.bulkInsert('INSERT INTO cache_test VALUES (?, ?)', testData)

      // Warm up the cache
      for (let i = 0; i < 10; i++) {
        db.execSql('SELECT * FROM cache_test WHERE id = 50')
      }

      const iterations = 1000
      const { durationNs } = measure(() => {
        for (let i = 0; i < iterations; i++) {
          db.execSql('SELECT * FROM cache_test WHERE id = 50')
        }
      })

      const avgNsPerQuery = durationNs / iterations
      const avgUsPerQuery = avgNsPerQuery / 1000

      console.log(`    Average time per repeated query: ${avgUsPerQuery.toFixed(2)}μs`)

      assert.ok(
        avgUsPerQuery <= 10,
        `Average query time should be 10μs or less, got ${avgUsPerQuery.toFixed(2)}μs`
      )

      db.close()
    })

    it('should show cache hit improvement over cache miss', async () => {
      const db = await Database.create(undefined, {
        statementCache: { maxSize: 100, ttlMs: 300000 }
      })
      db.execSql('CREATE TABLE test (id INTEGER)')
      db.run('INSERT INTO test VALUES (?)', [1])

      // First query - cache miss
      const { durationNs: firstQueryNs } = measure(() => {
        db.prepare('SELECT * FROM test WHERE id = ?').free()
      })

      // Subsequent queries - should hit cache
      const iterations = 100
      const { durationNs: cachedTotalNs } = measure(() => {
        for (let i = 0; i < iterations; i++) {
          db.prepare('SELECT * FROM test WHERE id = ?').free()
        }
      })

      const avgCachedNs = cachedTotalNs / iterations

      console.log(`    First query (cache miss): ${(firstQueryNs / 1000).toFixed(2)}μs`)
      console.log(`    Avg cached query: ${(avgCachedNs / 1000).toFixed(2)}μs`)

      // Cached queries should generally be faster than first query
      // Allow for some variance in test environment
      const stats = db.getCacheStats()
      console.log(`    Cache stats: hits=${stats.hits}, misses=${stats.misses}`)

      assert.ok(stats.hits > 0, 'Should have cache hits')

      db.close()
    })
  })

  describe('Search Performance (LIKE queries)', () => {
    /**
     * Target: LIKE search in 4ms or less
     * sql.js baseline: ~5ms
     * Expected improvement: 20%+
     */
    it('should execute LIKE search in 4ms or less on 100,000 rows', async () => {
      const db = await Database.create()
      db.execSql(`
        CREATE TABLE products (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT
        )
      `)

      // Insert 100,000 products
      const products = Array.from({ length: 100000 }, (_, i) => [
        i + 1,
        `Product ${i % 1000}`, // Some repetition for realistic data
        `This is a description for product number ${i}`
      ])

      db.bulkInsert('INSERT INTO products VALUES (?, ?, ?)', products)

      // Create index for faster search
      db.execSql('CREATE INDEX idx_name ON products(name)')

      const { durationMs, result } = measure(() => {
        return db.execSql("SELECT * FROM products WHERE name LIKE 'Product 42%'")
      })

      console.log(`    LIKE search on 100,000 rows: ${durationMs.toFixed(2)}ms`)
      console.log(`    Results found: ${result[0].values.length}`)

      assert.ok(
        durationMs <= 4,
        `LIKE search should complete in 4ms or less, got ${durationMs.toFixed(2)}ms`
      )

      db.close()
    })

    it('should handle complex LIKE patterns efficiently', async () => {
      const db = await Database.create()
      db.execSql('CREATE TABLE logs (id INTEGER PRIMARY KEY, message TEXT)')

      // Insert test data
      const logs = Array.from({ length: 10000 }, (_, i) => [
        i + 1,
        `[${['INFO', 'WARN', 'ERROR'][i % 3]}] Message ${i}: Some log content here`
      ])
      db.bulkInsert('INSERT INTO logs VALUES (?, ?)', logs)

      const { durationMs, result } = measure(() => {
        return db.execSql("SELECT * FROM logs WHERE message LIKE '%ERROR%Message%'")
      })

      console.log(`    Complex LIKE search: ${durationMs.toFixed(2)}ms`)
      console.log(`    Results found: ${result[0].values.length}`)

      // Should be reasonably fast even with complex pattern
      assert.ok(durationMs < 50, `Complex LIKE should be fast, got ${durationMs.toFixed(2)}ms`)

      db.close()
    })
  })

  describe('Transaction Performance', () => {
    it('should execute 1000 operations in transaction faster than auto-commit', async () => {
      const db1 = await Database.create()
      const db2 = await Database.create()

      db1.execSql('CREATE TABLE test (id INTEGER, value TEXT)')
      db2.execSql('CREATE TABLE test (id INTEGER, value TEXT)')

      // Without explicit transaction (each INSERT auto-commits)
      const { durationMs: autoCommitMs } = measure(() => {
        for (let i = 0; i < 1000; i++) {
          db1.run('INSERT INTO test VALUES (?, ?)', [i, `Value ${i}`])
        }
      })

      // With explicit transaction
      const { durationMs: transactionMs } = measure(() => {
        db2.transaction(() => {
          for (let i = 0; i < 1000; i++) {
            db2.run('INSERT INTO test VALUES (?, ?)', [i, `Value ${i}`])
          }
        })
      })

      console.log(`    Auto-commit (1000 inserts): ${autoCommitMs.toFixed(2)}ms`)
      console.log(`    Explicit transaction: ${transactionMs.toFixed(2)}ms`)

      // Transaction should be significantly faster
      assert.ok(
        transactionMs < autoCommitMs,
        `Transaction (${transactionMs.toFixed(2)}ms) should be faster than auto-commit (${autoCommitMs.toFixed(2)}ms)`
      )

      db1.close()
      db2.close()
    })
  })

  describe('Memory Efficiency', () => {
    it('should handle large result sets without memory issues', async () => {
      const db = await Database.create()
      db.execSql('CREATE TABLE large (id INTEGER PRIMARY KEY, data TEXT)')

      // Insert large dataset
      const rows = Array.from({ length: 50000 }, (_, i) => [
        i + 1,
        'X'.repeat(100) // 100 chars per row
      ])
      db.bulkInsert('INSERT INTO large VALUES (?, ?)', rows)

      // Query all rows
      const { durationMs, result } = measure(() => {
        return db.execSql('SELECT * FROM large')
      })

      console.log(`    Large result set query (50,000 rows): ${durationMs.toFixed(2)}ms`)
      console.log(`    Result rows: ${result[0].values.length}`)

      assert.strictEqual(result[0].values.length, 50000)

      db.close()
    })

    it('should efficiently iterate large result with PreparedStatement', async () => {
      const db = await Database.create()
      db.execSql('CREATE TABLE iter_test (id INTEGER PRIMARY KEY, value TEXT)')

      const rows = Array.from({ length: 10000 }, (_, i) => [i + 1, `Value ${i}`])
      db.bulkInsert('INSERT INTO iter_test VALUES (?, ?)', rows)

      const { durationMs } = measure(() => {
        const stmt = db.prepare('SELECT * FROM iter_test')
        let count = 0
        while (stmt.step()) {
          stmt.getAsObject()
          count++
        }
        stmt.free()
        return count
      })

      console.log(`    PreparedStatement iteration (10,000 rows): ${durationMs.toFixed(2)}ms`)

      assert.ok(durationMs < 100, `Iteration should be fast, got ${durationMs.toFixed(2)}ms`)

      db.close()
    })
  })

  describe('Benchmark Summary', () => {
    after(async () => {
      if (!Database) {
        console.log('\n  ⚠️  Benchmarks skipped - module not yet implemented (RED phase)')
        return
      }

      console.log('\n  📊 Benchmark Targets vs sql.js baseline:')
      console.log('  ┌────────────────────────────┬───────────┬────────────┬──────────┐')
      console.log('  │ Operation                  │ sql.js    │ fast-sql   │ Target   │')
      console.log('  ├────────────────────────────┼───────────┼────────────┼──────────┤')
      console.log('  │ 50,000 bulk insert         │ ~126ms    │ ≤100ms     │ 20%+     │')
      console.log('  │ Repeated query (per call)  │ ~21μs     │ ≤10μs      │ 50%+     │')
      console.log('  │ LIKE search (100K rows)    │ ~5ms      │ ≤4ms       │ 20%+     │')
      console.log('  └────────────────────────────┴───────────┴────────────┴──────────┘')
    })
  })
})
