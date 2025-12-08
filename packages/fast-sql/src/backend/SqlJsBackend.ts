/**
 * SqlJsBackend
 *
 * sql.jsをラップするバックエンド実装。
 * sql.jsのAPIをSqliteBackendインターフェースに適合させる。
 *
 * NOTE: This file uses sql.js Database.exec() method for SQL execution,
 * which is unrelated to Node.js child_process.exec().
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

// sql.jsの型定義（実際のsql.js APIに基づく）
interface SqlJsDatabase {
  // sql.js uses 'exec' as the method name for executing SQL
  // eslint-disable-next-line @typescript-eslint/naming-convention
  exec(sql: string): SqlJsQueryResult[]
  prepare(sql: string): SqlJsStatement
  export(): Uint8Array
  close(): void
}

interface SqlJsQueryResult {
  columns: string[]
  values: unknown[][]
}

interface SqlJsStatement {
  bind(params?: unknown[] | Record<string, unknown>): boolean
  step(): boolean
  get(params?: unknown[] | Record<string, unknown>): unknown[] | undefined
  getAsObject(params?: unknown[] | Record<string, unknown>): Record<string, unknown> | undefined
  run(params?: unknown[] | Record<string, unknown>): void
  reset(): void
  free(): boolean
  getColumnNames(): string[]
}

/**
 * sql.jsモジュールの型（initSqlJs()の戻り値）。
 */
export interface SqlJsStatic {
  Database: new (data?: ArrayLike<number>) => SqlJsDatabase
}

/**
 * sql.jsのStatementをNativeStatementインターフェースに適合させるラッパー。
 */
class SqlJsNativeStatement implements NativeStatement {
  private _freed = false

  constructor(private readonly stmt: SqlJsStatement) {}

  bind(params?: BindParams): boolean {
    assertStatementNotFreed(this._freed, 'bind')
    return this.stmt.bind(params as unknown[] | Record<string, unknown>)
  }

  step(): boolean {
    assertStatementNotFreed(this._freed, 'step')
    return this.stmt.step()
  }

  get(): Row | undefined {
    assertStatementNotFreed(this._freed, 'get')
    const result = this.stmt.get()
    return result as Row | undefined
  }

  getAsObject(): RowObject | undefined {
    assertStatementNotFreed(this._freed, 'getAsObject')
    const result = this.stmt.getAsObject()
    return result as RowObject | undefined
  }

  run(params?: BindParams): void {
    assertStatementNotFreed(this._freed, 'run')
    this.stmt.run(params as unknown[] | Record<string, unknown>)
  }

  reset(): void {
    assertStatementNotFreed(this._freed, 'reset')
    this.stmt.reset()
  }

  free(): boolean {
    if (this._freed) {
      return true
    }
    this._freed = true
    return this.stmt.free()
  }

  getColumnNames(): string[] {
    assertStatementNotFreed(this._freed, 'getColumnNames')
    return this.stmt.getColumnNames()
  }
}

/**
 * sql.jsバックエンド実装。
 */
export class SqlJsBackend implements SqliteBackend {
  private _closed = false
  public readonly backendType: BackendType = 'sql.js'

  constructor(
    private readonly db: SqlJsDatabase
  ) {}

  /**
   * sql.jsを初期化してバックエンドを作成するファクトリ。
   * @param SQL sql.jsモジュール
   * @param data 既存のデータベースバイナリ（オプション）
   */
  static create(SQL: SqlJsStatic, data?: Uint8Array): SqlJsBackend {
    const db = new SQL.Database(data)
    return new SqlJsBackend(db)
  }

  get closed(): boolean {
    return this._closed
  }

  execSql(sql: string): QueryExecResult[] {
    assertBackendOpen(this, 'execSql')
    // Call sql.js Database.exec() method (not child_process)
    const results = this.db.exec(sql)
    return results.map(r => ({
      columns: r.columns,
      values: r.values as Row[]
    }))
  }

  prepare(sql: string): NativeStatement {
    assertBackendOpen(this, 'prepare')
    const stmt = this.db.prepare(sql)
    return new SqlJsNativeStatement(stmt)
  }

  exportDb(): Uint8Array {
    assertBackendOpen(this, 'exportDb')
    return this.db.export()
  }

  close(): void {
    if (this._closed) {
      return
    }
    this._closed = true
    this.db.close()
  }
}
