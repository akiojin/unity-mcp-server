# fast-sql

sql.js互換APIを提供しながら、環境に応じて最適なSQLiteバックエンドを自動選択するハイブリッドSQLiteライブラリ。

## 特徴

- **ハイブリッドバックエンド**: better-sqlite3（ネイティブ、34倍高速）とsql.js（WASM）を自動切り替え
- **npx互換**: better-sqlite3が利用できない環境ではsql.jsにフォールバック、タイムアウトなし
- **sql.js互換API**: 既存コードからの移行が容易
- **PreparedStatementキャッシュ**: LRUキャッシュで同一SQLの繰り返し実行を最適化
- **PRAGMA最適化**: インメモリDB向けに自動チューニング
- **バルク処理**: `bulkInsert()`で大量データを効率的に挿入
- **トランザクション管理**: ネストされたトランザクション（SAVEPOINT）をサポート

## ハイブリッドバックエンド

fast-sqlは環境に応じて最適なバックエンドを自動選択します：

| 環境 | バックエンド | パフォーマンス | 備考 |
|------|-------------|---------------|------|
| Node.js + better-sqlite3インストール済み | **better-sqlite3** | 最速（34倍高速） | プリビルドバイナリを自動DL |
| Node.js + better-sqlite3なし | sql.js | 標準 | ビルド不要 |
| npx実行 | sql.js | 標準 | タイムアウトなし |
| ブラウザ | sql.js | 標準 | WASM対応 |

### バックエンド選択ロジック

```
Database.create()
       ↓
BackendSelector.select()
       ├─ better-sqlite3がロード可能 → BetterSqlite3Backend（0.34μs/クエリ）
       └─ ロード失敗 → SqlJsBackend（11.78μs/クエリ）
```

### バックエンドの強制指定

```typescript
// sql.jsを強制使用（npx環境でのテスト等）
const db = await Database.create(undefined, {
  backend: { forceBackend: 'sql.js' }
})

// better-sqlite3を強制使用（インストールされていなければエラー）
const db = await Database.create(undefined, {
  backend: { forceBackend: 'better-sqlite3' }
})

// 使用中のバックエンドを確認
console.log(db.backendType) // 'better-sqlite3' または 'sql.js'
```

### 静的メソッドでバックエンド検出

```typescript
// インスタンス作成前にバックエンドタイプを確認
const backendType = await Database.detectBackend()
console.log(backendType) // 'better-sqlite3' または 'sql.js'
```

## パフォーマンス比較

同一環境での実測値（Node.js v22、Linux）:

| 操作 | fast-sql (better-sqlite3) | fast-sql (sql.js) | 備考 |
|------|--------------------------|-------------------|------|
| 50,000件挿入 | **28.97ms** | 53.30ms | ネイティブが1.8倍高速 |
| 同一SQL×1000回 | **0.34μs/回** | 11.53μs/回 | ネイティブが34倍高速 |
| LIKE検索(100K行) | **2.52ms** | 7.74ms | ネイティブが3倍高速 |
| 起動時間 | 数ms | 数ms | ほぼ同等 |
| npx実行 | △（DL時間） | ◎ | sql.jsが安定 |

### 使い分けガイド

| ユースケース | 推奨設定 | 理由 |
|-------------|---------|------|
| 通常のNode.js開発 | デフォルト | better-sqlite3が自動選択され最速 |
| npx実行が必要 | `forceBackend: 'sql.js'` | 確実にタイムアウト回避 |
| パフォーマンス重視 | デフォルト | better-sqlite3が自動選択 |
| ブラウザ環境 | sql.js直接使用 | fast-sqlはNode.js向け |
| テスト（両バックエンド） | 両方をforceして実行 | 互換性確認 |

## インストール

```bash
npm install @akiojin/fast-sql
```

better-sqlite3は`optionalDependencies`として含まれているため、インストール可能な環境では自動的にインストールされます。インストールできない場合（npx等）でもsql.jsにフォールバックするため、エラーにはなりません。

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
- better-sqlite3バックエンド使用時はLTS Node.jsを推奨（プリビルドバイナリ対応）
- ブラウザ環境は未テスト（sql.jsは対応）
- better-sqlite3の`deserialize()`APIは未サポート（代わりにBufferからの直接読み込みを使用）

## ライセンス

MIT
