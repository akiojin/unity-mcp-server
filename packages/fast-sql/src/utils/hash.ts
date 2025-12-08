/**
 * hash.ts
 *
 * SQLハッシュ生成ユーティリティ。
 * StatementCacheのキー生成に使用。
 */

/**
 * 文字列のハッシュを計算（DJB2アルゴリズム）。
 * 高速で衝突が少ないハッシュ関数。
 *
 * @param str ハッシュ対象の文字列
 * @returns 32ビット整数のハッシュ値
 */
export function djb2Hash(str: string): number {
  let hash = 5381

  for (let i = 0; i < str.length; i++) {
    // hash * 33 + charCode
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    // 32ビット整数に制限
    hash = hash >>> 0
  }

  return hash
}

/**
 * SQLを正規化してハッシュキーを生成。
 * 空白の正規化を行い、同等のSQLが同じキーになるようにする。
 *
 * @param sql SQL文
 * @returns ハッシュキー文字列
 */
export function sqlHashKey(sql: string): string {
  // 空白を正規化（連続する空白を1つに、前後の空白を除去）
  const normalized = sql.trim().replace(/\s+/g, ' ')
  const hash = djb2Hash(normalized)
  return `${hash.toString(16)}_${normalized.length}`
}

/**
 * SQL文の正規化のみを行う（ハッシュなし）。
 * デバッグやログ用。
 *
 * @param sql SQL文
 * @returns 正規化されたSQL
 */
export function normalizeSql(sql: string): string {
  return sql.trim().replace(/\s+/g, ' ')
}
