# fast-sql

sql.js互換APIを提供しながら、PreparedStatementキャッシュ、PRAGMA最適化、バルク処理機能によりパフォーマンスを改善するSQLiteラッパーライブラリ。

## 特徴

- **ビルド不要**: WASMベース（sql.js）でネイティブビルド不要、`npx`実行でタイムアウトしない
- **sql.js互換API**: 既存コードからの移行が容易
- **PreparedStatementキャッシュ**: LRUキャッシュで同一SQLの繰り返し実行を最適化
- **PRAGMA最適化**: インメモリDB向けに自動チューニング
- **バルク処理**: `bulkInsert()`で大量データを効率的に挿入
- **トランザクション管理**: ネストされたトランザクション（SAVEPOINT）をサポート

## パフォーマンス比較

同一環境での実測値（Node.js v22、Linux）:

| 操作 | better-sqlite3 | sql.js | fast-sql | 備考 |
|------|----------------|--------|----------|------|
| 50,000件挿入 | **28.97ms** | 53.77ms | 53.30ms | ネイティブが最速 |
| 同一SQL×1000回 | **0.34μs/回** | 11.78μs/回 | 11.53μs/回 | キャッシュ使用時 |
| LIKE検索(100K行) | **2.52ms** | 6.99ms | 7.74ms | インデックス使用 |
| ネイティブビルド | 必要 | 不要 | 不要 | - |
| npx実行 | タイムアウト | OK | OK | 30秒制限回避 |

**注**: fast-sqlはsql.jsと同等のパフォーマンスですが、PRAGMA最適化とキャッシュ機能が自動適用されます。better-sqlite3はネイティブビルドが必要なため、`npx`での実行時にタイムアウトする問題があります。

### 使い分けガイド

| ユースケース | 推奨 | 理由 |
|-------------|------|------|
| npx実行が必要 | **fast-sql** | ビルド不要で即座に起動 |
| 最高パフォーマンスが必要 | better-sqlite3 | ネイティブで最速 |
| ブラウザ環境 | sql.js | WASM対応 |
| Node.js + ビルド環境あり | better-sqlite3 | 最速 |
| Node.js + ビルド環境なし | **fast-sql** | sql.jsより高速 |

## インストール

```bash
npm install @akiojin/fast-sql
```

## 使い方

### sql.js互換API

```typescript
import initFastSql from '@akiojin/fast-sql'

// 初期化
const SQL = await initFastSql()
const db = new SQL.Database()

// SQL実行
db.execSql('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')
db.run('INSERT INTO users VALUES (?, ?)', [1, 'Alice'])

// クエリ
const results = db.execSql('SELECT * FROM users')
console.log(results[0].values) // [[1, 'Alice']]

// PreparedStatement
const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
stmt.bind([1])
while (stmt.step()) {
  console.log(stmt.getAsObject()) // { id: 1, name: 'Alice' }
}
stmt.free()

// エクスポート・クローズ
const data = db.exportDb()
db.close()
```

### 拡張API

```typescript
import { Database } from '@akiojin/fast-sql'

// オプション付きで作成
const db = await Database.create(undefined, {
  pragma: {
    journalMode: 'memory',
    synchronous: 'off',
    cacheSize: 20000
  },
  statementCache: {
    maxSize: 200,
    ttlMs: 600000 // 10分
  }
})

// バルク挿入（自動トランザクション）
const rows = Array.from({ length: 50000 }, (_, i) => [i, `User ${i}`])
const count = db.bulkInsert('INSERT INTO users VALUES (?, ?)', rows)
console.log(`${count} rows inserted`)

// トランザクション（ロールバック対応）
db.transaction(() => {
  db.run('UPDATE accounts SET balance = balance - 100 WHERE id = 1')
  db.run('UPDATE accounts SET balance = balance + 100 WHERE id = 2')
  // エラー時は自動ロールバック
})

// ネストされたトランザクション（SAVEPOINT）
db.transaction(() => {
  db.run('UPDATE ...')
  try {
    db.transaction(() => {
      db.run('UPDATE ...')
      throw new Error('Inner error')
    })
  } catch {
    // 内側のトランザクションのみロールバック
  }
  db.run('UPDATE ...') // 外側は継続
})

// キャッシュ統計
const stats = db.getCacheStats()
console.log(stats) // { hits: 150, misses: 10, size: 25, evictions: 5 }

db.close()
```

## API リファレンス

### sql.js互換API

| メソッド | 説明 |
|----------|------|
| `new Database(data?)` | データベース作成 |
| `execSql(sql)` | SQL実行、結果配列を返す |
| `run(sql, params?)` | パラメータ付きSQL実行 |
| `prepare(sql)` | PreparedStatement作成（キャッシュ対応） |
| `exportDb()` | Uint8Arrayでエクスポート |
| `close()` | データベースクローズ |

### 拡張API

| メソッド | 説明 |
|----------|------|
| `Database.create(data?, options?)` | オプション付き非同期作成 |
| `bulkInsert(sql, rows)` | 最適化されたバルク挿入 |
| `transaction(fn)` | トランザクションラッパー |
| `getCacheStats()` | キャッシュ統計取得 |

### Statement

| メソッド | 説明 |
|----------|------|
| `bind(params?)` | パラメータをバインド |
| `step()` | 次の行に進む |
| `get(params?)` | 現在行を配列で取得 |
| `getAsObject(params?)` | 現在行をオブジェクトで取得 |
| `run(params?)` | 実行（結果なし） |
| `reset()` | ステートメントをリセット |
| `free()` | リソース解放 |
| `getColumnNames()` | カラム名を取得 |

## 最適化の仕組み

### 1. PRAGMA最適化

デフォルトで以下のPRAGMAを適用（インメモリDB向け）:

```sql
PRAGMA journal_mode = memory;   -- ジャーナルをメモリに
PRAGMA synchronous = off;       -- 同期書き込み無効
PRAGMA cache_size = 10000;      -- キャッシュ拡大（~40MB）
PRAGMA temp_store = memory;     -- 一時テーブルをメモリに
```

### 2. PreparedStatementキャッシュ

- **LRUアルゴリズム**: 最大100エントリ、TTL 5分
- **サンプリング最適化**: `Date.now()`呼び出しを削減（TTL: 100回に1回、LRU: 10回に1回）
- **キャッシュヒット時**: 同一SQLの繰り返し実行でsql.jsと同等のパフォーマンス

### 3. トランザクション最適化

- `bulkInsert()`は自動的に`BEGIN IMMEDIATE`でラップ
- エラー時は自動ロールバック
- ネストされたトランザクションはSAVEPOINTで処理

## 制限事項

- Node.js 18以上が必要
- WASMをサポートする環境が必要
- better-sqlite3ほどの最高パフォーマンスは達成できない
- ブラウザ環境は未テスト（sql.jsは対応）

## ライセンス

MIT
