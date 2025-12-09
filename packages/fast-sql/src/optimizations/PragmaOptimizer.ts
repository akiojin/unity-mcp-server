/**
 * PragmaOptimizer
 *
 * SQLite PRAGMA設定の最適化を管理。
 * メモリDB向けの最適な設定をデフォルトで適用。
 */

import type { PragmaOptions, SqliteBackend } from '../types.js'

/**
 * デフォルトPRAGMA設定。
 * メモリDB向けに最適化。
 */
export const DEFAULT_PRAGMA_OPTIONS: Required<Pick<PragmaOptions,
  'journalMode' | 'synchronous' | 'cacheSize' | 'tempStore'
>> = {
  journalMode: 'memory',
  synchronous: 'off',
  cacheSize: 10000,  // 約40MB
  tempStore: 'memory'
}

/**
 * PRAGMAオプティマイザ。
 */
export class PragmaOptimizer {
  private readonly options: PragmaOptions

  constructor(options?: PragmaOptions) {
    this.options = {
      ...DEFAULT_PRAGMA_OPTIONS,
      ...options
    }
  }

  /**
   * PRAGMA設定をバックエンドに適用。
   * @param backend SQLiteバックエンド
   */
  apply(backend: SqliteBackend): void {
    const pragmas = this.buildPragmaStatements()

    for (const pragma of pragmas) {
      backend.execSql(pragma)
    }
  }

  /**
   * PRAGMA文の配列を生成。
   */
  buildPragmaStatements(): string[] {
    const statements: string[] = []

    if (this.options.journalMode !== undefined) {
      statements.push(`PRAGMA journal_mode = ${this.options.journalMode}`)
    }

    if (this.options.synchronous !== undefined) {
      statements.push(`PRAGMA synchronous = ${this.options.synchronous}`)
    }

    if (this.options.cacheSize !== undefined) {
      statements.push(`PRAGMA cache_size = ${this.options.cacheSize}`)
    }

    if (this.options.tempStore !== undefined) {
      statements.push(`PRAGMA temp_store = ${this.tempStoreValue(this.options.tempStore)}`)
    }

    if (this.options.pageSize !== undefined) {
      statements.push(`PRAGMA page_size = ${this.options.pageSize}`)
    }

    if (this.options.mmapSize !== undefined) {
      statements.push(`PRAGMA mmap_size = ${this.options.mmapSize}`)
    }

    return statements
  }

  /**
   * temp_storeの値を数値に変換。
   */
  private tempStoreValue(value: 'default' | 'file' | 'memory'): number {
    switch (value) {
      case 'default': return 0
      case 'file': return 1
      case 'memory': return 2
    }
  }

  /**
   * 現在の設定を取得。
   */
  getOptions(): PragmaOptions {
    return { ...this.options }
  }
}
