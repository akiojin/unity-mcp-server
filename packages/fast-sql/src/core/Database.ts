/**
 * Database
 *
 * 最適化済みSQLiteデータベースクラス。
 * sql.js互換APIと拡張APIを提供。
 *
 * ハイブリッドバックエンド:
 * - better-sqlite3がインストール済み → ネイティブバックエンド（34倍高速）
 * - better-sqlite3がない → sql.js（WASMバックエンド、npx互換）
 */

import type {
  DatabaseInterface,
  QueryExecResult,
  BindParams,
  StatementInterface,
  CacheStats,
  SqliteBackend,
  BackendType,
  ExtendedDatabaseOptions
} from '../types.js'
import { Statement } from './Statement.js'
import { StatementCache } from './StatementCache.js'
import { PragmaOptimizer } from '../optimizations/PragmaOptimizer.js'
import { TransactionManager } from '../optimizations/TransactionManager.js'
import { BatchProcessor } from '../optimizations/BatchProcessor.js'
import { createBackend, detectAvailableBackend } from '../backend/BackendSelector.js'
import { SqlJsBackend, type SqlJsStatic } from '../backend/SqlJsBackend.js'

/**
 * sql.jsモジュールの型（レガシー互換用）。
 */
interface SqlJsModule {
  Database: new (data?: ArrayLike<number>) => SqlJsDatabaseInstance
}

/**
 * sql.jsのDatabaseインスタンスの型。
 */
interface SqlJsDatabaseInstance {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>
  prepare(sql: string): unknown
  export(): Uint8Array
  close(): void
}

// sql.jsモジュールを保持（initFastSqlで設定、レガシー互換用）
let sqlJsModule: SqlJsModule | null = null

/**
 * sql.jsモジュールを設定（内部用、レガシー互換）。
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
 * Databaseクラス。
 * sql.js互換APIと拡張APIを提供。
 *
 * ハイブリッド実装:
 * - Database.create() → 自動的に最適なバックエンドを選択
 * - new Database() → レガシー互換（sql.jsのみ）
 */
export class Database implements DatabaseInterface {
  private _closed = false
  private readonly backend: SqliteBackend
  private readonly cache: StatementCache
  private readonly transactionManager: TransactionManager
  private readonly batchProcessor: BatchProcessor

  /**
   * コンストラクタ（sql.js互換、レガシー）。
   * 新規コードでは Database.create() を使用することを推奨。
   * @param data 既存のデータベースバイナリ（オプション）
   */
  constructor(data?: Uint8Array) {
    if (!sqlJsModule) {
      throw new Error('fast-sql not initialized. Call initFastSql() first.')
    }

    // SqlJsModule型をSqlJsStatic型にキャスト（構造は同一）
    this.backend = SqlJsBackend.create(sqlJsModule as unknown as SqlJsStatic, data)
    this.cache = new StatementCache()
    this.transactionManager = new TransactionManager(this.backend)
    this.batchProcessor = new BatchProcessor(this.backend, this.transactionManager)

    // デフォルトPRAGMA適用
    const pragmaOptimizer = new PragmaOptimizer()
    pragmaOptimizer.apply(this.backend)
  }

  /**
   * 非同期ファクトリメソッド（推奨）。
   * 環境に応じて最適なバックエンドを自動選択。
   *
   * @param data 既存のデータベースバイナリ（オプション）
   * @param options データベースオプション（バックエンド選択を含む）
   * @returns Databaseインスタンス
   *
   * @example
   * ```typescript
   * // 自動選択（better-sqlite3があれば使用、なければsql.js）
   * const db = await Database.create()
   *
   * // sql.jsを強制使用
   * const db = await Database.create(undefined, {
   *   backend: { forceBackend: 'sql.js' }
   * })
   *
   * // better-sqlite3を強制使用（インストールされていなければエラー）
   * const db = await Database.create(undefined, {
   *   backend: { forceBackend: 'better-sqlite3' }
   * })
   * ```
   */
  static async create(
    data?: Uint8Array,
    options?: ExtendedDatabaseOptions
  ): Promise<Database> {
    // バックエンドを作成
    const backend = await createBackend(options?.backend, data)

    // 各種マネージャーを初期化
    const cache = new StatementCache(options?.statementCache)
    const transactionManager = new TransactionManager(backend)
    const batchProcessor = new BatchProcessor(backend, transactionManager)

    // PRAGMA適用
    const pragmaOptimizer = new PragmaOptimizer(options?.pragma)
    pragmaOptimizer.apply(backend)

    // インスタンスを直接構築
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

  /**
   * 利用可能なバックエンドタイプを検出（静的メソッド）。
   * Databaseインスタンスを作成せずにバックエンドタイプを確認可能。
   */
  static async detectBackend(): Promise<BackendType> {
    return detectAvailableBackend()
  }

  get closed(): boolean {
    return this._closed
  }

  /**
   * 現在使用中のバックエンドタイプを取得。
   */
  get backendType(): BackendType {
    return this.backend.backendType
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
