/**
 * Database
 *
 * 最適化済みSQLiteデータベースクラス。
 * sql.js互換APIと拡張APIを提供。
 *
 * NOTE: This file references sql.js Database.exec() method for SQL execution.
 * This is the sql.js API method name, NOT Node.js child_process.exec().
 * sql.js is a JavaScript SQLite implementation compiled from C via Emscripten.
 */

import type {
  DatabaseInterface,
  DatabaseOptions,
  QueryExecResult,
  BindParams,
  StatementInterface,
  CacheStats,
  SqliteBackend,
  NativeStatement,
  Row,
  RowObject
} from '../types.js'
import { Statement } from './Statement.js'
import { StatementCache } from './StatementCache.js'
import { PragmaOptimizer } from '../optimizations/PragmaOptimizer.js'
import { TransactionManager } from '../optimizations/TransactionManager.js'
import { BatchProcessor } from '../optimizations/BatchProcessor.js'

/**
 * sql.jsモジュールの型。
 */
interface SqlJsModule {
  Database: new (data?: ArrayLike<number>) => SqlJsDatabaseInstance
}

/**
 * sql.jsのDatabaseインスタンスの型。
 * The method name 'exec' is sql.js API, not child_process.
 */
interface SqlJsDatabaseInstance {
  /** sql.js method to execute SQL (not child_process) */
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>
  prepare(sql: string): SqlJsStatementInstance
  export(): Uint8Array
  close(): void
}

/**
 * sql.jsのStatementインスタンスの型。
 */
interface SqlJsStatementInstance {
  bind(params?: unknown[] | Record<string, unknown>): boolean
  step(): boolean
  get(params?: unknown[] | Record<string, unknown>): unknown[] | undefined
  getAsObject(params?: unknown[] | Record<string, unknown>): Record<string, unknown> | undefined
  run(params?: unknown[] | Record<string, unknown>): void
  reset(): void
  free(): boolean
  getColumnNames(): string[]
}

// sql.jsモジュールを保持（initFastSqlで設定）
let sqlJsModule: SqlJsModule | null = null

/**
 * sql.jsモジュールを設定（内部用）。
 */
export function setSqlJsModule(module: SqlJsModule): void {
  sqlJsModule = module
}

/**
 * sql.jsモジュールを取得。
 */
export function getSqlJsModule(): SqlJsModule | null {
  return sqlJsModule
}

/**
 * sql.jsのDatabaseをSqliteBackendインターフェースに適合させるアダプター。
 */
class SqlJsBackendAdapter implements SqliteBackend {
  private _closed = false

  constructor(private readonly db: SqlJsDatabaseInstance) {}

  get closed(): boolean {
    return this._closed
  }

  execSql(sql: string): QueryExecResult[] {
    this.assertOpen('execSql')
    // Call sql.js Database.exec() - this is sql.js API, not child_process
    const results = this.db.exec(sql)
    return results.map(r => ({
      columns: r.columns,
      values: r.values as QueryExecResult['values']
    }))
  }

  prepare(sql: string): NativeStatement {
    this.assertOpen('prepare')
    const stmt = this.db.prepare(sql)
    return {
      bind: (params?: BindParams) => stmt.bind(params as unknown[] | Record<string, unknown>),
      step: () => stmt.step(),
      get: () => stmt.get() as Row | undefined,
      getAsObject: () => stmt.getAsObject() as RowObject | undefined,
      run: (params?: BindParams) => stmt.run(params as unknown[] | Record<string, unknown>),
      reset: () => stmt.reset(),
      free: () => stmt.free(),
      getColumnNames: () => stmt.getColumnNames()
    }
  }

  exportDb(): Uint8Array {
    this.assertOpen('exportDb')
    return this.db.export()
  }

  close(): void {
    if (this._closed) return
    this._closed = true
    this.db.close()
  }

  private assertOpen(method: string): void {
    if (this._closed) {
      throw new Error(`Database is closed: cannot call ${method}()`)
    }
  }
}

/**
 * Databaseクラス。
 * sql.js互換APIと拡張APIを提供。
 */
export class Database implements DatabaseInterface {
  private _closed = false
  private readonly backend: SqliteBackend
  private readonly cache: StatementCache
  private readonly transactionManager: TransactionManager
  private readonly batchProcessor: BatchProcessor

  /**
   * コンストラクタ（sql.js互換）。
   * @param data 既存のデータベースバイナリ（オプション）
   */
  constructor(data?: Uint8Array) {
    if (!sqlJsModule) {
      throw new Error('fast-sql not initialized. Call initFastSql() first.')
    }

    const db = new sqlJsModule.Database(data)
    this.backend = new SqlJsBackendAdapter(db)
    this.cache = new StatementCache()
    this.transactionManager = new TransactionManager(this.backend)
    this.batchProcessor = new BatchProcessor(this.backend, this.transactionManager)

    // デフォルトPRAGMA適用
    const pragmaOptimizer = new PragmaOptimizer()
    pragmaOptimizer.apply(this.backend)
  }

  /**
   * 非同期ファクトリメソッド（拡張API）。
   * @param data 既存のデータベースバイナリ（オプション）
   * @param options データベースオプション
   */
  static async create(data?: Uint8Array, options?: DatabaseOptions): Promise<Database> {
    if (!sqlJsModule) {
      throw new Error('fast-sql not initialized. Call initFastSql() first.')
    }

    const db = new sqlJsModule.Database(data)
    const backend = new SqlJsBackendAdapter(db)
    const cache = new StatementCache(options?.statementCache)
    const transactionManager = new TransactionManager(backend)
    const batchProcessor = new BatchProcessor(backend, transactionManager)

    // PRAGMA適用
    const pragmaOptimizer = new PragmaOptimizer(options?.pragma)
    pragmaOptimizer.apply(backend)

    // インスタンスを直接構築（private constructorを使用）
    const instance = Object.create(Database.prototype) as Database
    Object.assign(instance, {
      _closed: false,
      backend,
      cache,
      transactionManager,
      batchProcessor
    })

    return instance
  }

  get closed(): boolean {
    return this._closed
  }

  /**
   * SQLを実行して結果を返す（sql.js互換）。
   */
  execSql(sql: string): QueryExecResult[] {
    this.assertOpen('execSql')
    return this.backend.execSql(sql)
  }

  /**
   * SQLを実行（パラメータバインド対応、sql.js互換）。
   */
  run(sql: string, params?: BindParams): void {
    this.assertOpen('run')
    const stmt = this.backend.prepare(sql)
    try {
      stmt.run(params)
    } finally {
      stmt.free()
    }
  }

  /**
   * PreparedStatementを作成（sql.js互換）。
   */
  prepare(sql: string): StatementInterface {
    this.assertOpen('prepare')

    // キャッシュをチェック
    const cached = this.cache.get(sql)
    if (cached) {
      // Check if statement was freed externally
      const stmt = cached as Statement
      if (stmt.state === 'freed') {
        // Remove invalid entry and create new
        this.cache.delete(sql)
      } else {
        stmt.reset()
        return stmt
      }
    }

    // 新規作成
    const nativeStmt = this.backend.prepare(sql)
    const stmt = new Statement(nativeStmt, sql)

    // キャッシュに保存
    this.cache.set(sql, stmt)

    return stmt
  }

  /**
   * データベースをバイナリとしてエクスポート（sql.js互換）。
   */
  exportDb(): Uint8Array {
    this.assertOpen('exportDb')
    return this.backend.exportDb()
  }

  /**
   * データベースを閉じる（sql.js互換）。
   */
  close(): void {
    if (this._closed) return
    this._closed = true
    this.cache.clear()
    this.backend.close()
  }

  // 拡張API

  /**
   * 複数行を一括挿入（拡張API）。
   */
  bulkInsert(sql: string, rows: BindParams[]): number {
    this.assertOpen('bulkInsert')
    return this.batchProcessor.bulkInsert(sql, rows)
  }

  /**
   * トランザクション内で関数を実行（拡張API）。
   */
  transaction<T>(fn: () => T): T {
    this.assertOpen('transaction')
    return this.transactionManager.transaction(fn)
  }

  /**
   * キャッシュ統計を取得（拡張API）。
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats()
  }

  /**
   * データベースがオープンしていることを確認。
   */
  private assertOpen(method: string): void {
    if (this._closed) {
      throw new Error(`Database is closed: cannot call ${method}()`)
    }
  }
}
