import { describe, it } from 'node:test'
import assert from 'node:assert'

import { TransactionManager } from '../../dist/optimizations/TransactionManager.js'

function makeBackend() {
  const calls = []
  return {
    calls,
    execSql(sql) {
      calls.push(sql)
    }
  }
}

describe('TransactionManager', () => {
  it('commits a successful transaction', () => {
    const backend = makeBackend()
    const manager = new TransactionManager(backend)

    const result = manager.transaction(() => 'ok')

    assert.strictEqual(result, 'ok')
    assert.deepStrictEqual(backend.calls, ['BEGIN IMMEDIATE', 'COMMIT'])
    assert.strictEqual(manager.transactionDepth, 0)
  })

  it('rolls back when an error is thrown', () => {
    const backend = makeBackend()
    const manager = new TransactionManager(backend)

    assert.throws(() =>
      manager.transaction(() => {
        throw new Error('boom')
      })
    )

    assert.deepStrictEqual(backend.calls, ['BEGIN IMMEDIATE', 'ROLLBACK'])
    assert.strictEqual(manager.transactionDepth, 0)
  })

  it('handles nested transactions with savepoints', () => {
    const backend = makeBackend()
    const manager = new TransactionManager(backend)

    manager.transaction(() => {
      manager.transaction(() => 'inner')
      return 'outer'
    })

    assert.deepStrictEqual(backend.calls, [
      'BEGIN IMMEDIATE',
      'SAVEPOINT sp_1',
      'RELEASE sp_1',
      'COMMIT'
    ])
  })

  it('rolls back nested transactions to savepoints', () => {
    const backend = makeBackend()
    const manager = new TransactionManager(backend)

    assert.throws(() =>
      manager.transaction(() => {
        manager.transaction(() => {
          throw new Error('inner')
        })
      })
    )

    assert.deepStrictEqual(backend.calls, [
      'BEGIN IMMEDIATE',
      'SAVEPOINT sp_1',
      'ROLLBACK TO sp_1',
      'RELEASE sp_1',
      'ROLLBACK'
    ])
    assert.strictEqual(manager.transactionDepth, 0)
  })
})
