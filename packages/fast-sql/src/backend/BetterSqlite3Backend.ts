/**
 * BetterSqlite3Backend
 *
 * better-sqlite3をSqliteBackendインターフェースに適合させるアダプター。
 * ネイティブバインディングによる高性能な実装を提供。
 *
 * 特徴:
 * - sql.jsの約34倍高速なクエリ実行
 * - LTS Node.jsではプリビルドバイナリを使用（ビルド不要）
 * - 同期APIでシンプルな使用感
 *
 * 制限:
 * - Node.js環境専用（ブラウザ非対応）
 * - プリビルドバイナリがない環境ではネイティブビルドが必要
 *
 * NOTE: This file uses better-sqlite3's Database.exec() method for SQL execution.
 * This is better-sqlite3's API method name, NOT Node.js child_process.exec().
 * better-sqlite3 is a native SQLite binding for Node.js.
 */

import type {
  SqliteBackend,
  NativeStatement,
  QueryExecResult,
  BindParams,
  Row,
  RowObject,
  BackendType
} from '../types.js'
import { assertBackendOpen, assertStatementNotFreed } from './BackendInterface.js'

/**
 * better-sqlite3のDatabase型。
 * @see https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
 */
interface BetterSqlite3Database {
  /**
   * Execute raw SQL (better-sqlite3 API method, not child_process).
   * This method name is part of better-sqlite3's API.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  exec(sql: string): BetterSqlite3Database
  prepare(sql: string): BetterSqlite3Statement
  serialize(): Buffer
  close(): void
  readonly open: boolean
}

/**
 * better-sqlite3のStatement型。
 */
interface BetterSqlite3Statement {
  run(...params: unknown[]): BetterSqlite3RunResult
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
  columns(): BetterSqlite3ColumnInfo[]
  bind(...params: unknown[]): BetterSqlite3Statement
}

interface BetterSqlite3RunResult {
  changes: number
  lastInsertRowid: number | bigint
}

interface BetterSqlite3ColumnInfo {
  name: string
  column: string | null
  table: string | null
  database: string | null
  type: string | null
}

/**
 * better-sqlite3モジュールの型。
 */
export interface BetterSqlite3Module {
  default: new (filename?: string | Buffer, options?: { fileMustExist?: boolean }) => BetterSqlite3Database
}

/**
 * better-sqlite3のStatementをNativeStatementインターフェースに適合させるラッパー。
 */
class BetterSqlite3NativeStatement implements NativeStatement {
  private _freed = false
  private _bound: unknown[] = []
  private _boundObject: Record<string, unknown> | null = null
  private _results: unknown[] = []
  private _currentIndex = -1
  private _columnNames: string[] | null = null

  constructor(
    private readonly stmt: BetterSqlite3Statement,
    _sql: string  // SQL文字列（将来のデバッグ用に受け取るが現時点では未使用）
  ) {
    // _sqlは将来のエラーメッセージ/デバッグ機能のために受け取るが、
    // 現時点ではプロパティとして保存しない
    void _sql
  }

  bind(params?: BindParams): boolean {
    assertStatementNotFreed(this._freed, 'bind')

    // パラメータを保存
    // better-sqlite3は配列（位置パラメータ）とオブジェクト（名前付きパラメータ）の両方をサポート
    if (params === undefined) {
      this._bound = []
      this._boundObject = null
    } else if (Array.isArray(params)) {
      this._bound = params
      this._boundObject = null
    } else {
      // オブジェクト形式の場合、キーから$/@/:プレフィックスを削除
      // sql.jsは$param形式、better-sqlite3はparam形式を期待するため正規化
      const normalized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(params)) {
        const normalizedKey = key.replace(/^[$@:]/, '')
        normalized[normalizedKey] = value
      }
      this._boundObject = normalized
      this._bound = []
    }

    // 結果をリセット
    this._results = []
    this._currentIndex = -1

    return true
  }

  step(): boolean {
    assertStatementNotFreed(this._freed, 'step')

    // 初回または結果がまだ取得されていない場合
    if (this._results.length === 0 && this._currentIndex === -1) {
      // better-sqlite3のStatement.readerプロパティでSELECTかどうかを判定
      // readerがtrueの場合はSELECT（結果を返すクエリ）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isReader = (this.stmt as any).reader === true

      if (isReader) {
        if (this._boundObject !== null) {
          this._results = this.stmt.all(this._boundObject)
        } else {
          this._results = this.stmt.all(...this._bound)
        }
      } else {
        // INSERT/UPDATE/DELETE等の場合はrunを実行
        if (this._boundObject !== null) {
          this.stmt.run(this._boundObject)
        } else {
          this.stmt.run(...this._bound)
        }
        this._results = []
      }
    }

    this._currentIndex++
    return this._currentIndex < this._results.length
  }

  get(): Row | undefined {
    assertStatementNotFreed(this._freed, 'get')

    if (this._currentIndex < 0 || this._currentIndex >= this._results.length) {
      return undefined
    }

    const row = this._results[this._currentIndex]
    if (row === undefined) {
      return undefined
    }

    // オブジェクトを配列に変換
    return Object.values(row as Record<string, unknown>) as Row
  }

  getAsObject(): RowObject | undefined {
    assertStatementNotFreed(this._freed, 'getAsObject')

    if (this._currentIndex < 0 || this._currentIndex >= this._results.length) {
      return undefined
    }

    return this._results[this._currentIndex] as RowObject | undefined
  }

  run(params?: BindParams): void {
    assertStatementNotFreed(this._freed, 'run')

    if (params !== undefined) {
      this.bind(params)
    }

    // 名前付きパラメータがある場合はそちらを使用
    if (this._boundObject !== null) {
      this.stmt.run(this._boundObject)
    } else {
      this.stmt.run(...this._bound)
    }
  }

  reset(): void {
    assertStatementNotFreed(this._freed, 'reset')

    this._bound = []
    this._boundObject = null
    this._results = []
    this._currentIndex = -1
  }

  free(): boolean {
    if (this._freed) {
      return true
    }
    this._freed = true
    // better-sqlite3のStatementは明示的なfreeが不要
    // GCで自動解放される
    return true
  }

  getColumnNames(): string[] {
    assertStatementNotFreed(this._freed, 'getColumnNames')

    if (this._columnNames === null) {
      try {
        this._columnNames = this.stmt.columns().map(c => c.name)
      } catch {
        // INSERT/UPDATE/DELETEなど、結果を返さないステートメントの場合
        this._columnNames = []
      }
    }

    return this._columnNames
  }
}

/**
 * better-sqlite3バックエンド実装。
 */
export class BetterSqlite3Backend implements SqliteBackend {
  private _closed = false
  public readonly backendType: BackendType = 'better-sqlite3'

  constructor(
    private readonly db: BetterSqlite3Database
  ) {}

  /**
   * better-sqlite3バックエンドを作成するファクトリ。
   * @param BetterSqlite3 better-sqlite3モジュール
   * @param data 既存のデータベースバイナリ（オプション）
   */
  static create(BetterSqlite3: BetterSqlite3Module['default'], data?: Uint8Array): BetterSqlite3Backend {
    let db: BetterSqlite3Database

    if (data && data.length > 0) {
      // 既存データがある場合はBufferから直接作成
      // better-sqlite3はコンストラクタにBufferを渡すとそのデータから読み込む
      db = new BetterSqlite3(Buffer.from(data))
    } else {
      // 新規インメモリデータベースを作成
      // better-sqlite3では':memory:'を指定するとインメモリDB
      db = new BetterSqlite3(':memory:')
    }

    return new BetterSqlite3Backend(db)
  }

  get closed(): boolean {
    return this._closed
  }

  /**
   * SQL文を実行して結果を返す。
   * This method calls better-sqlite3's Database.exec() API method,
   * which is NOT related to Node.js child_process.exec().
   */
  execSql(sql: string): QueryExecResult[] {
    assertBackendOpen(this, 'execSql')

    const results: QueryExecResult[] = []

    // 複数のSQL文を分割して実行
    const statements = sql.split(';').filter(s => s.trim().length > 0)

    for (const stmt of statements) {
      const trimmedStmt = stmt.trim()
      if (trimmedStmt.length === 0) continue

      // 結果を返すクエリかどうかを判定（SELECT, PRAGMA）
      const returnsResults = /^\s*(SELECT|PRAGMA)\s/i.test(trimmedStmt)

      if (returnsResults) {
        try {
          const prepared = this.db.prepare(trimmedStmt)
          const columns = prepared.columns().map(c => c.name)
          const rows = prepared.all() as Record<string, unknown>[]

          results.push({
            columns,
            values: rows.map(row => Object.values(row) as Row)
          })
        } catch {
          // エラーが発生した場合は空の結果を返す
        }
      } else {
        // SELECT以外は実行のみ（better-sqlite3 API method）
        this.db.exec(trimmedStmt)
      }
    }

    return results
  }

  prepare(sql: string): NativeStatement {
    assertBackendOpen(this, 'prepare')
    const stmt = this.db.prepare(sql)
    return new BetterSqlite3NativeStatement(stmt, sql)
  }

  exportDb(): Uint8Array {
    assertBackendOpen(this, 'exportDb')
    const buffer = this.db.serialize()
    return new Uint8Array(buffer)
  }

  close(): void {
    if (this._closed) {
      return
    }
    this._closed = true
    this.db.close()
  }
}
