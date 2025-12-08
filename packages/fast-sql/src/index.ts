/**
 * fast-sql
 *
 * 高性能なsql.js互換SQLiteラッパーライブラリ。
 *
 * 特徴:
 * - sql.js互換API
 * - PRAGMA最適化
 * - PreparedStatementキャッシュ
 * - トランザクション最適化
 * - バルク操作最適化
 *
 * 使用方法:
 * ```typescript
 * import initFastSql, { Database } from '@akiojin/fast-sql'
 *
 * // sql.js互換パターン
 * const SQL = await initFastSql()
 * const db = new SQL.Database()
 *
 * // 拡張APIパターン
 * const db = await Database.create(undefined, {
 *   pragma: { cacheSize: 20000 },
 *   statementCache: { maxSize: 200 }
 * })
 * ```
 */

// 型定義のエクスポート
export type {
  SqlValue,
  BindParams,
  Row,
  RowObject,
  QueryExecResult,
  StatementInterface,
  StatementCacheOptions,
  CacheStats,
  StatementCacheInterface,
  PragmaOptions,
  DatabaseOptions,
  NativeStatement,
  SqliteBackend,
  DatabaseInterface,
  SqlJsStatic,
  InitFastSqlFn,
  BackendType,
  BackendInitOptions,
  ExtendedDatabaseOptions
} from './types.js'

// クラスのエクスポート
export { Database, setSqlJsModule, getSqlJsModule } from './core/Database.js'
export { Statement } from './core/Statement.js'
export { StatementCache } from './core/StatementCache.js'
export { PragmaOptimizer, DEFAULT_PRAGMA_OPTIONS } from './optimizations/PragmaOptimizer.js'
export { TransactionManager } from './optimizations/TransactionManager.js'
export { BatchProcessor } from './optimizations/BatchProcessor.js'
export type { BatchOptions } from './optimizations/BatchProcessor.js'

// バックエンドのエクスポート
export { SqlJsBackend } from './backend/SqlJsBackend.js'
export { BetterSqlite3Backend } from './backend/BetterSqlite3Backend.js'
export {
  createBackend,
  detectAvailableBackend,
  getCurrentBackendType,
  clearBackendCache
} from './backend/BackendSelector.js'

// ユーティリティのエクスポート
export { djb2Hash, sqlHashKey, normalizeSql } from './utils/hash.js'

// sql.jsの型（動的インポート用）
import type { SqlJsStatic } from './types.js'
import { Database, setSqlJsModule } from './core/Database.js'

/**
 * fast-sqlを初期化。
 * sql.jsのWASMをロードし、sql.js互換のAPIを返す。
 *
 * @returns sql.js互換のモジュール
 *
 * @example
 * ```typescript
 * const SQL = await initFastSql()
 * const db = new SQL.Database()
 * db.execSql('CREATE TABLE test (id INTEGER)')
 * db.close()
 * ```
 */
export async function initFastSql(): Promise<SqlJsStatic> {
  // sql.jsを動的インポート
  const initSqlJs = (await import('sql.js')).default

  // WASMを初期化
  const SQL = await initSqlJs()

  // sql.jsモジュールを設定
  // Note: sql.js types from @types/sql.js are not fully compatible with our internal types
  // but runtime behavior is the same, so we use type assertion here
  setSqlJsModule(SQL as Parameters<typeof setSqlJsModule>[0])

  // sql.js互換のインターフェースを返す
  return {
    Database
  }
}

// デフォルトエクスポート
export default initFastSql
