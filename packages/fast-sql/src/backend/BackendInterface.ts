/**
 * Backend Interface
 *
 * SQLiteバックエンドの抽象化インターフェース。
 * sql.js、wa-sqlite等の異なるバックエンドを統一的に扱う。
 */

import type {
  SqliteBackend,
  NativeStatement,
  QueryExecResult,
  BindParams,
  Row,
  RowObject
} from '../types.js'

// Re-export types for convenience
export type {
  SqliteBackend,
  NativeStatement,
  QueryExecResult,
  BindParams,
  Row,
  RowObject
}

/**
 * バックエンドファクトリの型。
 * データベースバイナリからバックエンドを作成する。
 */
export type BackendFactory = (data?: Uint8Array) => SqliteBackend

/**
 * バックエンドが閉じられているかチェックするヘルパー。
 * @param backend バックエンド
 * @param methodName 呼び出し元メソッド名
 * @throws データベースが閉じられている場合
 */
export function assertBackendOpen(
  backend: { closed?: boolean },
  methodName: string
): void {
  if (backend.closed) {
    throw new Error(`Database is closed: cannot call ${methodName}()`)
  }
}

/**
 * ステートメントが解放されているかチェックするヘルパー。
 * @param freed 解放済みフラグ
 * @param methodName 呼び出し元メソッド名
 * @throws ステートメントが解放済みの場合
 */
export function assertStatementNotFreed(
  freed: boolean,
  methodName: string
): void {
  if (freed) {
    throw new Error(`Statement is freed: cannot call ${methodName}()`)
  }
}
