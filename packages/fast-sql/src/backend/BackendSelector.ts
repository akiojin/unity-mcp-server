/**
 * BackendSelector
 *
 * 環境に応じて最適なSQLiteバックエンドを自動選択する。
 *
 * 選択ロジック:
 * 1. better-sqlite3がインストールされている → ネイティブバックエンド（34倍高速）
 * 2. better-sqlite3がない → sql.js（WASMバックエンド、npx互換）
 *
 * 強制指定:
 * - forceBackend: 'better-sqlite3' → better-sqlite3を強制使用（失敗時エラー）
 * - forceBackend: 'sql.js' → sql.jsを強制使用
 */

import type {
  SqliteBackend,
  BackendType,
  BackendInitOptions
} from '../types.js'
import { SqlJsBackend } from './SqlJsBackend.js'
import { BetterSqlite3Backend, type BetterSqlite3Module } from './BetterSqlite3Backend.js'

/**
 * 現在選択されているバックエンドタイプをキャッシュ。
 * 初回選択後は同じバックエンドを使用し続ける。
 */
let cachedBackendType: BackendType | null = null

/**
 * キャッシュされたsql.jsモジュール。
 */
let cachedSqlJsModule: unknown = null

/**
 * キャッシュされたbetter-sqlite3モジュール。
 */
let cachedBetterSqlite3Module: BetterSqlite3Module['default'] | null = null

/**
 * better-sqlite3が利用可能かチェック。
 * 動的importで試行し、成功すればtrue。
 */
async function isBetterSqlite3Available(): Promise<boolean> {
  if (cachedBetterSqlite3Module !== null) {
    return true
  }

  try {
    const module = await import('better-sqlite3')
    cachedBetterSqlite3Module = module.default
    return true
  } catch {
    return false
  }
}

/**
 * sql.jsモジュールを取得。
 */
async function getSqlJsModule(): Promise<unknown> {
  if (cachedSqlJsModule !== null) {
    return cachedSqlJsModule
  }

  const initSqlJs = (await import('sql.js')).default
  cachedSqlJsModule = await initSqlJs()
  return cachedSqlJsModule
}

/**
 * 利用可能なバックエンドタイプを取得。
 * better-sqlite3が利用可能ならそれを、なければsql.jsを返す。
 */
export async function detectAvailableBackend(): Promise<BackendType> {
  if (cachedBackendType !== null) {
    return cachedBackendType
  }

  const betterSqlite3Available = await isBetterSqlite3Available()
  cachedBackendType = betterSqlite3Available ? 'better-sqlite3' : 'sql.js'

  return cachedBackendType
}

/**
 * 指定されたバックエンドを作成。
 * @param options バックエンド初期化オプション
 * @param data 既存のデータベースバイナリ（オプション）
 * @returns SqliteBackendインスタンス
 */
export async function createBackend(
  options?: BackendInitOptions,
  data?: Uint8Array
): Promise<SqliteBackend> {
  const forceBackend = options?.forceBackend

  // 強制指定がある場合
  if (forceBackend === 'better-sqlite3') {
    const available = await isBetterSqlite3Available()
    if (!available) {
      throw new Error(
        'better-sqlite3 is not available. ' +
        'Install it with: npm install better-sqlite3'
      )
    }
    return BetterSqlite3Backend.create(cachedBetterSqlite3Module!, data)
  }

  if (forceBackend === 'sql.js') {
    const SQL = await getSqlJsModule()
    return SqlJsBackend.create(
      SQL as Parameters<typeof SqlJsBackend.create>[0],
      data
    )
  }

  // 自動選択
  const backendType = await detectAvailableBackend()

  if (backendType === 'better-sqlite3') {
    return BetterSqlite3Backend.create(cachedBetterSqlite3Module!, data)
  }

  // sql.jsフォールバック
  const SQL = await getSqlJsModule()
  return SqlJsBackend.create(
    SQL as Parameters<typeof SqlJsBackend.create>[0],
    data
  )
}

/**
 * 現在選択されているバックエンドタイプを取得。
 * まだ選択されていない場合はnull。
 */
export function getCurrentBackendType(): BackendType | null {
  return cachedBackendType
}

/**
 * バックエンドキャッシュをクリア（主にテスト用）。
 */
export function clearBackendCache(): void {
  cachedBackendType = null
  cachedSqlJsModule = null
  cachedBetterSqlite3Module = null
}
