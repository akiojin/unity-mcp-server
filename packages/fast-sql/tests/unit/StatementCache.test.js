import { describe, it } from 'node:test'
import assert from 'node:assert'

import { StatementCache } from '../../dist/core/StatementCache.js'

function makeStatement(label) {
  return {
    label,
    freed: false,
    free() {
      this.freed = true
    }
  }
}

describe('StatementCache', () => {
  it('evicts least-recently-used entries when full', () => {
    const originalNow = Date.now
    let now = 0
    Date.now = () => now

    try {
      const cache = new StatementCache({ maxSize: 2, ttlMs: 0 })
      const stmtA = makeStatement('A')
      const stmtB = makeStatement('B')
      const stmtC = makeStatement('C')

      now = 1
      cache.set('A', stmtA)
      now = 2
      cache.set('B', stmtB)
      now = 3
      cache.set('C', stmtC)

      assert.strictEqual(cache.get('A'), undefined)
      assert.strictEqual(stmtA.freed, true)
      assert.strictEqual(cache.get('B'), stmtB)
      assert.strictEqual(cache.get('C'), stmtC)
    } finally {
      Date.now = originalNow
    }
  })

  it('expires entries when TTL is exceeded', () => {
    const originalNow = Date.now
    let now = 0
    Date.now = () => now

    try {
      const cache = new StatementCache({ maxSize: 2, ttlMs: 5 })
      const stmtA = makeStatement('A')
      cache.set('A', stmtA)

      now = 10
      let value
      for (let i = 0; i < 99; i++) {
        value = cache.get('A')
      }
      assert.strictEqual(value, stmtA)

      value = cache.get('A')
      assert.strictEqual(value, undefined)
      assert.strictEqual(stmtA.freed, true)
    } finally {
      Date.now = originalNow
    }
  })

  it('tracks cache hit/miss statistics', () => {
    const cache = new StatementCache({ maxSize: 2, ttlMs: 0 })
    const stmtA = makeStatement('A')
    cache.set('A', stmtA)

    assert.strictEqual(cache.get('A'), stmtA)
    assert.strictEqual(cache.get('missing'), undefined)

    const stats = cache.getStats()
    assert.strictEqual(stats.hits, 1)
    assert.strictEqual(stats.misses, 1)
    assert.strictEqual(stats.size, 1)
  })
})
