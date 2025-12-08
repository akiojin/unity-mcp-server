/**
 * fast-sql Type Definitions
 *
 * sql.js互換の型定義と拡張API用の型定義。
 */

// =============================================================================
// 共通型
// =============================================================================

/**
 * SQLiteが扱うプリミティブ値の型。
 * - string: TEXT
 * - number: INTEGER / REAL
 * - Uint8Array: BLOB
 * - null: NULL
 */
export type SqlValue = string | number | Uint8Array | null

/**
 * バインドパラメータの型。
 * - 配列形式: 位置パラメータ (?, ?1, ?2...)
 * - オブジェクト形式: 名前付きパラメータ ($name, :name, @name)
 */
export type BindParams = Record<string, SqlValue> | SqlValue[]

/**
 * クエリ結果の1行を配列形式で表現。
 */
export type Row = SqlValue[]

/**
 * クエリ結果の1行をオブジェクト形式で表現。
 * カラム名をキーとする。
 */
export type RowObject = Record<string, SqlValue>

/**
 * クエリ実行結果。
 * 複数のSELECT文がある場合、それぞれの結果がQueryExecResult[]として返される。
 */
export interface QueryExecResult {
  /** カラム名の配列 */
  columns: string[]
  /** 結果行の配列 */
  values: Row[]
}

// =============================================================================
// Statement関連
// =============================================================================

/**
 * PreparedStatementのインターフェース。
 * sql.js互換APIを提供。
 */
export interface StatementInterface {
  /** 準備されたSQL文 */
  readonly sql: string

  /**
   * パラメータをバインドする。
   * @param params バインドするパラメータ
   * @returns バインド成功時true
   */
  bind(params?: BindParams): boolean

  /**
   * 次の結果行に進む。
   * @returns 結果行がある場合true、ない場合false
   */
  step(): boolean

  /**
   * 現在の行を配列形式で取得。
   * @param params オプションでバインドパラメータを指定
   * @returns 結果行、または結果がない場合undefined
   */
  get(params?: BindParams): Row | undefined

  /**
   * 現在の行をオブジェクト形式で取得。
   * @param params オプションでバインドパラメータを指定
   * @returns 結果行オブジェクト、または結果がない場合undefined
   */
  getAsObject(params?: BindParams): RowObject | undefined

  /**
   * SQLを実行（結果を返さない操作用）。
   * @param params バインドするパラメータ
   */
  run(params?: BindParams): void

  /**
   * ステートメントをリセットして再利用可能にする。
   */
  reset(): void

  /**
   * ステートメントを解放する。
   * 解放後の操作はエラーになる。
   */
  free(): void

  /**
   * カラム名の配列を取得。
   * @returns カラム名の配列
   */
  getColumnNames(): string[]
}

// =============================================================================
// Cache関連
// =============================================================================

/**
 * StatementCacheの設定オプション。
 */
export interface StatementCacheOptions {
  /** キャッシュの最大エントリ数 (デフォルト: 100) */
  maxSize?: number
  /** エントリのTTL（ミリ秒）(デフォルト: 300000 = 5分) */
  ttlMs?: number
}

/**
 * キャッシュ統計情報。
 */
export interface CacheStats {
  /** キャッシュヒット数 */
  hits: number
  /** キャッシュミス数 */
  misses: number
  /** 現在のキャッシュサイズ */
  size: number
  /** evictionされたエントリ数 */
  evictions: number
}

/**
 * StatementCacheのインターフェース。
 */
export interface StatementCacheInterface {
  /**
   * キャッシュからステートメントを取得。
   * @param sql SQL文
   * @returns キャッシュされたステートメント、またはundefined
   */
  get(sql: string): StatementInterface | undefined

  /**
   * ステートメントをキャッシュに保存。
   * @param sql SQL文
   * @param stmt ステートメント
   */
  set(sql: string, stmt: StatementInterface): void

  /**
   * キャッシュからエントリを削除。
   * @param sql SQL文
   * @returns 削除成功時true
   */
  delete(sql: string): boolean

  /**
   * キャッシュをクリア。
   */
  clear(): void

  /**
   * キャッシュ統計を取得。
   * @returns 統計情報
   */
  getStats(): CacheStats
}

// =============================================================================
// PRAGMA設定
// =============================================================================

/**
 * PRAGMA設定オプション。
 * SQLiteのパフォーマンスとデータ整合性に影響する設定。
 */
export interface PragmaOptions {
  /**
   * ジャーナルモード。
   * - 'memory': ジャーナルをメモリに保持（デフォルト、最速）
   * - 'wal': Write-Ahead Logging（並行読み取り向け）
   * - 'delete': 従来方式
   * - 'truncate': 従来方式（truncate使用）
   * - 'persist': ジャーナルファイルを維持
   * - 'off': ジャーナル無効（危険）
   */
  journalMode?: 'memory' | 'wal' | 'delete' | 'truncate' | 'persist' | 'off'

  /**
   * 同期モード。
   * - 'off': 同期なし（最速、クラッシュ時データ損失リスク）
   * - 'normal': 標準同期
   * - 'full': 完全同期（最も安全）
   * - 'extra': 追加の同期
   */
  synchronous?: 'off' | 'normal' | 'full' | 'extra'

  /**
   * ページキャッシュサイズ（ページ数）。
   * 正の値はページ数、負の値はKB単位。
   * デフォルト: 10000 (約40MB)
   */
  cacheSize?: number

  /**
   * 一時テーブルの保存場所。
   * - 'default': SQLiteのデフォルト
   * - 'file': ファイルに保存
   * - 'memory': メモリに保存（デフォルト）
   */
  tempStore?: 'default' | 'file' | 'memory'

  /**
   * ページサイズ（バイト）。
   * 有効値: 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536
   * 新規データベース作成時のみ有効。
   */
  pageSize?: number

  /**
   * メモリマップサイズ（バイト）。
   * 大きいファイルの読み取りパフォーマンス向上。
   */
  mmapSize?: number
}

// =============================================================================
// Database設定
// =============================================================================

/**
 * Database作成時のオプション。
 */
export interface DatabaseOptions {
  /** PRAGMA設定 */
  pragma?: PragmaOptions
  /** StatementCache設定 */
  statementCache?: StatementCacheOptions
}

// =============================================================================
// Backend抽象化
// =============================================================================

/**
 * ネイティブステートメントのインターフェース。
 * バックエンド（sql.js等）が提供するStatement。
 */
export interface NativeStatement {
  bind(params?: BindParams): boolean
  step(): boolean
  get(): Row | undefined
  getAsObject(): RowObject | undefined
  run(params?: BindParams): void
  reset(): void
  free(): boolean
  getColumnNames(): string[]
}

/**
 * SQLiteバックエンドのインターフェース。
 * sql.js、better-sqlite3等の異なるバックエンドを抽象化。
 */
export interface SqliteBackend {
  /**
   * SQLを実行して結果を返す。
   * @param sql SQL文
   * @returns クエリ実行結果の配列
   */
  execSql(sql: string): QueryExecResult[]

  /**
   * PreparedStatementを作成。
   * @param sql SQL文
   * @returns ネイティブステートメント
   */
  prepare(sql: string): NativeStatement

  /**
   * データベースをバイナリとしてエクスポート。
   * @returns SQLiteバイナリ
   */
  exportDb(): Uint8Array

  /**
   * データベースを閉じる。
   */
  close(): void

  /**
   * バックエンドの種類。
   */
  readonly backendType: BackendType
}

// =============================================================================
// Backend関連
// =============================================================================

/**
 * サポートされているバックエンドの種類。
 */
export type BackendType = 'better-sqlite3' | 'sql.js'

/**
 * バックエンド初期化オプション。
 */
export interface BackendInitOptions {
  /**
   * 使用するバックエンドを強制指定。
   * 指定しない場合は自動選択。
   */
  forceBackend?: BackendType
}

/**
 * 拡張DatabaseOptions（バックエンド選択を含む）。
 */
export interface ExtendedDatabaseOptions extends DatabaseOptions {
  /** バックエンド初期化オプション */
  backend?: BackendInitOptions
}

// =============================================================================
// Database
// =============================================================================

/**
 * Databaseのインターフェース。
 * sql.js互換APIと拡張APIを提供。
 */
export interface DatabaseInterface {
  /** データベースがクローズされているか */
  readonly closed: boolean

  // sql.js互換メソッド

  /**
   * SQLを実行して結果を返す。
   * @param sql SQL文
   * @returns クエリ実行結果の配列
   */
  execSql(sql: string): QueryExecResult[]

  /**
   * SQLを実行（パラメータバインド対応）。
   * @param sql SQL文
   * @param params バインドパラメータ
   */
  run(sql: string, params?: BindParams): void

  /**
   * PreparedStatementを作成。
   * @param sql SQL文
   * @returns ステートメント
   */
  prepare(sql: string): StatementInterface

  /**
   * データベースをバイナリとしてエクスポート。
   * @returns SQLiteバイナリ
   */
  exportDb(): Uint8Array

  /**
   * データベースを閉じる。
   */
  close(): void

  // 拡張メソッド

  /**
   * 複数行を一括挿入。
   * トランザクション内で実行され、エラー時はロールバック。
   * @param sql INSERT文
   * @param rows 挿入する行の配列
   * @returns 挿入された行数
   */
  bulkInsert(sql: string, rows: BindParams[]): number

  /**
   * トランザクション内で関数を実行。
   * エラー時は自動ロールバック。
   * @param fn トランザクション内で実行する関数
   * @returns 関数の戻り値
   */
  transaction<T>(fn: () => T): T

  /**
   * キャッシュ統計を取得。
   * @returns 統計情報
   */
  getCacheStats(): CacheStats
}

// =============================================================================
// 初期化関数
// =============================================================================

/**
 * sql.js互換の初期化結果。
 */
export interface SqlJsStatic {
  Database: new (data?: Uint8Array) => DatabaseInterface
}

/**
 * 初期化関数の型。
 * sql.js互換: `const SQL = await initFastSql()`
 */
export type InitFastSqlFn = () => Promise<SqlJsStatic>
