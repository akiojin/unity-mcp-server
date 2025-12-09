/**
 * BatchProcessor
 *
 * バルク操作を最適化するクラス。
 * 大量のINSERT/UPDATE/DELETEを効率的に処理。
 */

import type { SqliteBackend, BindParams } from '../types.js'
import { TransactionManager } from './TransactionManager.js'

/**
 * バッチ処理オプション。
 */
export interface BatchOptions {
  /** バッチサイズ（1回のコミットあたりの行数）*/
  batchSize?: number
}

/**
 * デフォルトバッチサイズ。
 */
const DEFAULT_BATCH_SIZE = 1000

/**
 * バッチプロセッサ。
 */
export class BatchProcessor {
  private readonly batchSize: number

  constructor(
    private readonly backend: SqliteBackend,
    private readonly transactionManager: TransactionManager,
    options?: BatchOptions
  ) {
    this.batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE
  }

  /**
   * 複数行を一括挿入。
   * トランザクション内で実行され、エラー時はロールバック。
   *
   * @param sql INSERT文（パラメータプレースホルダー付き）
   * @param rows 挿入する行の配列
   * @returns 挿入された行数
   */
  bulkInsert(sql: string, rows: BindParams[]): number {
    if (rows.length === 0) {
      return 0
    }

    // トランザクション内で実行
    return this.transactionManager.transaction(() => {
      const stmt = this.backend.prepare(sql)
      let insertedCount = 0

      try {
        for (const row of rows) {
          stmt.bind(row)
          stmt.step()
          stmt.reset()
          insertedCount++
        }
      } finally {
        stmt.free()
      }

      return insertedCount
    })
  }

  /**
   * 大量データを分割してバルク挿入。
   * メモリ効率を考慮し、バッチサイズごとにコミット。
   *
   * @param sql INSERT文
   * @param rows 挿入する行の配列
   * @returns 挿入された行数
   */
  bulkInsertBatched(sql: string, rows: BindParams[]): number {
    if (rows.length === 0) {
      return 0
    }

    let totalInserted = 0

    for (let i = 0; i < rows.length; i += this.batchSize) {
      const batch = rows.slice(i, i + this.batchSize)
      totalInserted += this.bulkInsert(sql, batch)
    }

    return totalInserted
  }
}
