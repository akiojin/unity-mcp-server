/**
 * BackendSelector Unit Tests
 *
 * Tests for automatic backend selection logic.
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

let Database, detectAvailableBackend, clearBackendCache, getCurrentBackendType, createBackend

/**
 * Check if better-sqlite3 is available in the current environment.
 * This is used to conditionally skip tests that require better-sqlite3.
 */
async function isBetterSqlite3Available() {
  try {
    await import('better-sqlite3')
    return true
  } catch {
    return false
  }
}

const betterSqlite3Available = await isBetterSqlite3Available()

describe('BackendSelector', () => {
  beforeEach(async () => {
    const module = await import('../../dist/index.js')
    Database = module.Database
    detectAvailableBackend = module.detectAvailableBackend
    clearBackendCache = module.clearBackendCache
    getCurrentBackendType = module.getCurrentBackendType
    createBackend = module.createBackend

    // Clear cache before each test
    clearBackendCache()
  })

  afterEach(() => {
    clearBackendCache()
  })

  describe('detectAvailableBackend()', () => {
    it('should return BackendType', async () => {
      const backendType = await detectAvailableBackend()

      assert.ok(
        backendType === 'better-sqlite3' || backendType === 'sql.js',
        `BackendType should be "better-sqlite3" or "sql.js", got "${backendType}"`
      )
    })

    it('should cache the result', async () => {
      const type1 = await detectAvailableBackend()
      const type2 = await detectAvailableBackend()

      assert.strictEqual(type1, type2, 'Should return same type on repeated calls')
    })

    it(
      'should return better-sqlite3 when installed',
      { skip: !betterSqlite3Available },
      async () => {
        // In our test environment, better-sqlite3 is installed
        const backendType = await detectAvailableBackend()

        assert.strictEqual(
          backendType,
          'better-sqlite3',
          'Should detect better-sqlite3 when installed'
        )
      }
    )

    it(
      'should return sql.js when better-sqlite3 is not installed',
      { skip: betterSqlite3Available },
      async () => {
        // This test runs only when better-sqlite3 is NOT installed
        const backendType = await detectAvailableBackend()

        assert.strictEqual(
          backendType,
          'sql.js',
          'Should fallback to sql.js when better-sqlite3 is not available'
        )
      }
    )
  })

  describe('getCurrentBackendType()', () => {
    it('should return null before detection', () => {
      const type = getCurrentBackendType()
      assert.strictEqual(type, null, 'Should be null before detection')
    })

    it('should return cached type after detection', async () => {
      await detectAvailableBackend()
      const type = getCurrentBackendType()

      assert.ok(type === 'better-sqlite3' || type === 'sql.js', 'Should return detected type')
    })
  })

  describe('clearBackendCache()', () => {
    it('should reset cached backend type', async () => {
      await detectAvailableBackend()
      assert.ok(getCurrentBackendType() !== null, 'Should have cached type')

      clearBackendCache()

      assert.strictEqual(getCurrentBackendType(), null, 'Should be null after clear')
    })
  })

  describe('createBackend()', () => {
    it('should create backend with auto-selection', async () => {
      const backend = await createBackend()

      assert.ok(backend, 'Backend should be created')
      assert.ok(
        backend.backendType === 'better-sqlite3' || backend.backendType === 'sql.js',
        'Should have valid backendType'
      )

      backend.close()
    })

    it('should create sql.js backend when forced', async () => {
      const backend = await createBackend({ forceBackend: 'sql.js' })

      assert.strictEqual(backend.backendType, 'sql.js', 'Should create sql.js backend when forced')

      backend.close()
    })

    it(
      'should create better-sqlite3 backend when forced',
      { skip: !betterSqlite3Available },
      async () => {
        const backend = await createBackend({ forceBackend: 'better-sqlite3' })

        assert.strictEqual(
          backend.backendType,
          'better-sqlite3',
          'Should create better-sqlite3 backend when forced'
        )

        backend.close()
      }
    )

    it(
      'should throw error when forcing unavailable better-sqlite3',
      { skip: betterSqlite3Available },
      async () => {
        // This test runs only when better-sqlite3 is NOT installed
        await assert.rejects(
          async () => {
            await createBackend({ forceBackend: 'better-sqlite3' })
          },
          {
            message: /better-sqlite3 is not available/
          }
        )
      }
    )

    it(
      'should not throw when forcing available backend',
      { skip: !betterSqlite3Available },
      async () => {
        // This test runs only when better-sqlite3 IS installed
        await assert.doesNotReject(async () => {
          const backend = await createBackend({ forceBackend: 'better-sqlite3' })
          backend.close()
        })
      }
    )
  })

  describe('Database.create() backend selection', () => {
    it('should expose backendType property', async () => {
      const db = await Database.create()

      assert.ok(
        db.backendType === 'better-sqlite3' || db.backendType === 'sql.js',
        'Should expose backendType'
      )

      db.close()
    })

    it(
      'should use better-sqlite3 by default when available',
      { skip: !betterSqlite3Available },
      async () => {
        const db = await Database.create()

        // In our environment, better-sqlite3 is installed
        assert.strictEqual(
          db.backendType,
          'better-sqlite3',
          'Should use better-sqlite3 when available'
        )

        db.close()
      }
    )

    it(
      'should fallback to sql.js when better-sqlite3 is not available',
      { skip: betterSqlite3Available },
      async () => {
        const db = await Database.create()

        // better-sqlite3 is not installed, so should fallback to sql.js
        assert.strictEqual(
          db.backendType,
          'sql.js',
          'Should fallback to sql.js when better-sqlite3 is not available'
        )

        db.close()
      }
    )

    it('should allow forcing sql.js backend', async () => {
      const db = await Database.create(undefined, {
        backend: { forceBackend: 'sql.js' }
      })

      assert.strictEqual(db.backendType, 'sql.js', 'Should use sql.js when forced')

      db.close()
    })

    it(
      'should allow forcing better-sqlite3 backend',
      { skip: !betterSqlite3Available },
      async () => {
        const db = await Database.create(undefined, {
          backend: { forceBackend: 'better-sqlite3' }
        })

        assert.strictEqual(
          db.backendType,
          'better-sqlite3',
          'Should use better-sqlite3 when forced'
        )

        db.close()
      }
    )
  })
})

describe('Backend API Compatibility', () => {
  const runCompatibilityTests = (backendType, skipCondition = false) => {
    describe(`${backendType} backend`, { skip: skipCondition }, () => {
      let db

      beforeEach(async () => {
        const module = await import('../../dist/index.js')
        db = await module.Database.create(undefined, {
          backend: { forceBackend: backendType }
        })
        db.execSql('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)')
      })

      afterEach(() => {
        if (db && !db.closed) {
          db.close()
        }
      })

      it('should execute SQL and return results', () => {
        db.run('INSERT INTO test VALUES (?, ?)', [1, 'Alice'])

        const results = db.execSql('SELECT * FROM test')

        assert.strictEqual(results.length, 1)
        assert.deepStrictEqual(results[0].columns, ['id', 'name'])
        assert.deepStrictEqual(results[0].values, [[1, 'Alice']])
      })

      it('should prepare statements', () => {
        const stmt = db.prepare('INSERT INTO test VALUES (?, ?)')

        assert.ok(stmt, 'Statement should be created')
        assert.strictEqual(typeof stmt.bind, 'function')
        assert.strictEqual(typeof stmt.step, 'function')
        assert.strictEqual(typeof stmt.free, 'function')

        stmt.free()
      })

      it('should export database', () => {
        db.run('INSERT INTO test VALUES (?, ?)', [1, 'Test'])

        const data = db.exportDb()

        assert.ok(data instanceof Uint8Array, 'Should return Uint8Array')
        assert.ok(data.length > 0, 'Should have content')

        // Check SQLite magic header
        assert.strictEqual(data[0], 0x53) // S
        assert.strictEqual(data[1], 0x51) // Q
        assert.strictEqual(data[2], 0x4c) // L
      })

      it('should support transactions', () => {
        const result = db.transaction(() => {
          db.run('INSERT INTO test VALUES (?, ?)', [1, 'Alice'])
          db.run('INSERT INTO test VALUES (?, ?)', [2, 'Bob'])
          return 'success'
        })

        assert.strictEqual(result, 'success')

        const count = db.execSql('SELECT COUNT(*) FROM test')
        assert.strictEqual(count[0].values[0][0], 2)
      })

      it('should rollback on error', () => {
        db.run('INSERT INTO test VALUES (?, ?)', [1, 'Original'])

        assert.throws(() => {
          db.transaction(() => {
            db.run('INSERT INTO test VALUES (?, ?)', [2, 'Should rollback'])
            throw new Error('Intentional error')
          })
        })

        const count = db.execSql('SELECT COUNT(*) FROM test')
        assert.strictEqual(count[0].values[0][0], 1)
      })

      it('should support bulkInsert', () => {
        const rows = [
          [1, 'Alice'],
          [2, 'Bob'],
          [3, 'Charlie']
        ]

        const count = db.bulkInsert('INSERT INTO test VALUES (?, ?)', rows)

        assert.strictEqual(count, 3)
      })

      it('should restore from exported data', async () => {
        db.run('INSERT INTO test VALUES (?, ?)', [42, 'Preserved'])
        const data = db.exportDb()
        db.close()

        const module = await import('../../dist/index.js')
        const db2 = await module.Database.create(data, {
          backend: { forceBackend: backendType }
        })

        const results = db2.execSql('SELECT * FROM test')
        assert.strictEqual(results[0].values[0][0], 42)
        assert.strictEqual(results[0].values[0][1], 'Preserved')

        db2.close()
      })
    })
  }

  // Run compatibility tests for both backends
  // sql.js is always available
  runCompatibilityTests('sql.js', false)
  // better-sqlite3 tests are skipped when not installed
  runCompatibilityTests('better-sqlite3', !betterSqlite3Available)
})
