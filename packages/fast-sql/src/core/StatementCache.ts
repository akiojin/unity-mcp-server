/**
 * StatementCache
 *
 * PreparedStatementのLRUキャッシュ。
 * 同一SQLの繰り返し実行を高速化する。
 *
 * 特徴:
 * - LRU (Least Recently Used) eviction
 * - TTL (Time To Live) サポート
 * - 統計情報の追跡
 */

import type {
  StatementCacheInterface,
  StatementCacheOptions,
  CacheStats,
  StatementInterface
} from '../types.js'

/**
 * キャッシュエントリ。
 */
interface CacheEntry {
  /** キャッシュされたステートメント */
  stmt: StatementInterface
  /** 最終アクセス時刻 */
  lastAccess: number
  /** 作成時刻 */
  createdAt: number
}

/**
 * デフォルト設定。
 */
const DEFAULT_MAX_SIZE = 100
const DEFAULT_TTL_MS = 300000 // 5分

/**
 * StatementCacheの実装。
 */
export class StatementCache implements StatementCacheInterface {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly maxSize: number
  private readonly ttlMs: number

  // 統計情報
  private _hits = 0
  private _misses = 0
  private _evictions = 0

  constructor(options?: StatementCacheOptions) {
    this.maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS

    if (this.maxSize < 1) {
      throw new Error('StatementCache maxSize must be at least 1')
    }
    if (this.ttlMs < 0) {
      throw new Error('StatementCache ttlMs must be non-negative')
    }
  }

  /**
   * キャッシュからステートメントを取得。
   */
  get(sql: string): StatementInterface | undefined {
    const entry = this.cache.get(sql)

    if (!entry) {
      this._misses++
      return undefined
    }

    // TTLチェック
    if (this.ttlMs > 0 && this.isExpired(entry)) {
      this.deleteEntry(sql, entry)
      this._misses++
      return undefined
    }

    // LRU更新: 最新アクセス時刻を更新
    entry.lastAccess = Date.now()
    this._hits++

    return entry.stmt
  }

  /**
   * ステートメントをキャッシュに保存。
   */
  set(sql: string, stmt: StatementInterface): void {
    const now = Date.now()

    // 既存エントリがあれば更新
    const existing = this.cache.get(sql)
    if (existing) {
      existing.stmt.free()
      existing.stmt = stmt
      existing.lastAccess = now
      existing.createdAt = now
      return
    }

    // 容量チェック: 満杯なら最も古いエントリを削除
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    // 新規エントリを追加
    this.cache.set(sql, {
      stmt,
      lastAccess: now,
      createdAt: now
    })
  }

  /**
   * キャッシュからエントリを削除。
   */
  delete(sql: string): boolean {
    const entry = this.cache.get(sql)
    if (!entry) {
      return false
    }

    this.deleteEntry(sql, entry)
    return true
  }

  /**
   * キャッシュをクリア。
   */
  clear(): void {
    for (const [sql, entry] of this.cache) {
      this.deleteEntry(sql, entry)
    }
  }

  /**
   * キャッシュ統計を取得。
   */
  getStats(): CacheStats {
    return {
      hits: this._hits,
      misses: this._misses,
      size: this.cache.size,
      evictions: this._evictions
    }
  }

  /**
   * 期限切れエントリをパージ。
   * 明示的に呼び出すことで、期限切れエントリを一括削除。
   */
  purgeExpired(): number {
    if (this.ttlMs <= 0) {
      return 0
    }

    let purged = 0
    for (const [sql, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.deleteEntry(sql, entry)
        purged++
      }
    }
    return purged
  }

  /**
   * TTLが期限切れかチェック。
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > this.ttlMs
  }

  /**
   * エントリを削除（ステートメントも解放）。
   */
  private deleteEntry(sql: string, entry: CacheEntry): void {
    entry.stmt.free()
    this.cache.delete(sql)
  }

  /**
   * LRUでeviction。
   * 最も古い（lastAccessが最小の）エントリを削除。
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess
        oldestKey = key
      }
    }

    if (oldestKey !== null) {
      const entry = this.cache.get(oldestKey)!
      this.deleteEntry(oldestKey, entry)
      this._evictions++
    }
  }
}
