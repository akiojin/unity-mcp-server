import { describe, it } from 'node:test'
import assert from 'node:assert'

import {
  PragmaOptimizer,
  DEFAULT_PRAGMA_OPTIONS
} from '../../dist/optimizations/PragmaOptimizer.js'

function makeBackend() {
  const calls = []
  return {
    calls,
    execSql(sql) {
      calls.push(sql)
    }
  }
}

describe('PragmaOptimizer', () => {
  it('builds default pragma statements', () => {
    const optimizer = new PragmaOptimizer()
    const statements = optimizer.buildPragmaStatements()

    assert.deepStrictEqual(statements, [
      `PRAGMA journal_mode = ${DEFAULT_PRAGMA_OPTIONS.journalMode}`,
      `PRAGMA synchronous = ${DEFAULT_PRAGMA_OPTIONS.synchronous}`,
      `PRAGMA cache_size = ${DEFAULT_PRAGMA_OPTIONS.cacheSize}`,
      'PRAGMA temp_store = 2'
    ])
  })

  it('applies custom pragma statements in order', () => {
    const optimizer = new PragmaOptimizer({
      journalMode: 'wal',
      synchronous: 'normal',
      cacheSize: 256,
      tempStore: 'file',
      pageSize: 4096,
      mmapSize: 1024
    })
    const backend = makeBackend()

    optimizer.apply(backend)

    assert.deepStrictEqual(backend.calls, [
      'PRAGMA journal_mode = wal',
      'PRAGMA synchronous = normal',
      'PRAGMA cache_size = 256',
      'PRAGMA temp_store = 1',
      'PRAGMA page_size = 4096',
      'PRAGMA mmap_size = 1024'
    ])
  })
})
