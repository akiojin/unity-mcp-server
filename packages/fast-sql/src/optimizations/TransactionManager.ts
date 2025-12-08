/**
 * TransactionManager
 *
 * トランザクション管理を行うクラス。
 * ネストされたトランザクションはSAVEPOINTで処理。
 */

import type { SqliteBackend } from '../types.js'

/**
 * トランザクションマネージャー。
 */
export class TransactionManager {
  private depth = 0
  private savepointCounter = 0

  constructor(private readonly backend: SqliteBackend) {}

  /**
   * トランザクション内で関数を実行。
   * エラー時は自動ロールバック。
   *
   * @param fn トランザクション内で実行する関数
   * @returns 関数の戻り値
   */
  transaction<T>(fn: () => T): T {
    const isNested = this.depth > 0
    const savepointName = isNested ? this.createSavepointName() : null

    this.begin(savepointName)

    try {
      const result = fn()
      this.commit(savepointName)
      return result
    } catch (error) {
      this.rollback(savepointName)
      throw error
    }
  }

  /**
   * 現在のトランザクション深度を取得。
   */
  get transactionDepth(): number {
    return this.depth
  }

  /**
   * トランザクションを開始。
   */
  private begin(savepointName: string | null): void {
    if (savepointName) {
      // ネストされたトランザクション -> SAVEPOINT
      this.backend.execSql(`SAVEPOINT ${savepointName}`)
    } else {
      // トップレベルトランザクション -> BEGIN IMMEDIATE
      // BEGIN IMMEDIATEは即座にWRITE lockを取得し、デッドロックを防ぐ
      this.backend.execSql('BEGIN IMMEDIATE')
    }
    this.depth++
  }

  /**
   * トランザクションをコミット。
   */
  private commit(savepointName: string | null): void {
    this.depth--
    if (savepointName) {
      // SAVEPOINTを解放
      this.backend.execSql(`RELEASE ${savepointName}`)
    } else {
      // トップレベルトランザクションをコミット
      this.backend.execSql('COMMIT')
    }
  }

  /**
   * トランザクションをロールバック。
   */
  private rollback(savepointName: string | null): void {
    this.depth--
    if (savepointName) {
      // SAVEPOINTまでロールバック
      this.backend.execSql(`ROLLBACK TO ${savepointName}`)
      // SAVEPOINTを解放
      this.backend.execSql(`RELEASE ${savepointName}`)
    } else {
      // トップレベルトランザクションをロールバック
      this.backend.execSql('ROLLBACK')
    }
  }

  /**
   * ユニークなSAVEPOINT名を生成。
   */
  private createSavepointName(): string {
    return `sp_${++this.savepointCounter}`
  }
}
