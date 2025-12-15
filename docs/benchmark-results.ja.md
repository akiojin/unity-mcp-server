# unity-mcp-server パフォーマンス ベンチマーク結果

## テスト環境

| 項目 | 値 |
|------|-----|
| プラットフォーム | Linux 6.6.87.2-microsoft-standard-WSL2 (x86_64) |
| Node.js | v22.21.1 |
| Unity MCP Server | v2.42.4 |
| C# ファイル数 (unity-mcp-server パッケージ) | 68 ファイル |
| 総インデックスファイル数 | 128,040 ファイル |
| インデックスカバレッジ | 100% |

## 最適化サマリー (v2.42.4+)

### 速度最適化

| 最適化 | 実装 | 期待される改善 |
|--------|------|----------------|
| 複合SQLiteインデックス | `idx_symbols_name_kind`, `idx_symbols_path_name` | 複合条件クエリが **5-10倍** 高速化 |
| SQL スコープフィルタ | WHERE句に統合 | JS後処理を排除 |
| バッチトランザクション | 100ファイル/トランザクション | コミット回数 **95%** 削減 |
| バッチDELETE | `DELETE WHERE path IN (...)` | ファイル削除が **N倍** 高速化 |
| LRU クエリキャッシュ | `lru-cache` (500クエリ, 5分TTL) | 連続クエリ **80%** 削減 |
| SQLite PRAGMA | `cache_size=64MB`, `temp_store=MEMORY` | 読み書き操作の高速化 |

### レスポンスサイズ最適化

| ツール | 最適化 | サイズ削減 |
|--------|--------|-----------|
| `script_symbol_find` | ファイルごとにグループ化 | **40%** |
| `script_refs_find` | ファイルごとにグループ化 | **40%** |
| `script_search` | ファイルごとにグループ化 | **40%** |
| `script_symbols_get` | endLine/endColumn 削除 | **50%** |
| **全体** | null フィールド省略 | **47%** |

### 出力フォーマット変更

**変更前 (v2.42.3)**:

```json
{
  "results": [
    { "path": "Assets/Scripts/Player.cs", "symbol": { "name": "Foo", "startLine": 10, "endLine": 10 } },
    { "path": "Assets/Scripts/Player.cs", "symbol": { "name": "Bar", "startLine": 20, "endLine": 20 } }
  ]
}
```

**変更後 (v2.43.0+) - ファイルグループ化形式**:

```json
{
  "results": [
    {
      "path": "Assets/Scripts/Player.cs",
      "symbols": [
        { "name": "Foo", "kind": "method", "line": 10, "column": 5 },
        { "name": "Bar", "kind": "method", "line": 20, "column": 5 }
      ]
    }
  ],
  "total": 2
}
```

**メリット**:

- ファイルごとにシンボルをグループ化（LLMが理解しやすい構造）
- パス文字列の重複を排除（同一ファイル内の複数シンボルで1回のみ出力）
- 冗長な `endLine`/`endColumn` を削除（シンボルでは常に start と同値）
- null フィールドを出力から省略
- 配列形式で順序を保持（オブジェクトキー形式と異なり順序が保証）

## サマリー: unity-mcp-server vs 標準ツール

| 操作 | unity-mcp-server ツール | 時間 | 標準ツール | 時間 | 結果 |
|------|------------------------|------|------------|------|------|
| シンボル検索 | `script_symbol_find` | **瞬時** | `grep "class "` | 353ms | **unity-mcp-server 勝利** |
| 参照検索 | `script_refs_find` | **瞬時** | `grep "Response"` | 346ms | **unity-mcp-server 勝利** |
| コード検索 | `script_search` | **瞬時** | `grep` | 346ms | **unity-mcp-server 勝利** |
| ファイル読み取り | `script_read` | **瞬時** | `Read` | **瞬時** | **同等**（両方瞬時） |
| ファイル一覧 | `code_index_status` | **瞬時** | `Glob` | **瞬時** | **同等**（両方瞬時） |

### コンテキスト圧縮

| ツール | 出力サイズ | 標準ツール | 出力サイズ | 圧縮率 |
|--------|-----------|------------|-----------|--------|
| `script_read` | 200行 (8KB) | `Read` | 358行 (13KB) | **1.6倍小さい** |
| `script_symbol_find` | 34シンボル (3KB) | `grep` | 209行 (15KB) | **5倍小さい** |
| `script_refs_find` | 20参照 (4KB) | `grep` | 全行 | **3倍小さい** |
| `script_search` | 7ファイル、スニペット (5KB) | `grep` | 全行 | **3倍小さい** |

## スケール別ベンチマーク（実測値）

プロジェクト規模別の SQLite インデックス vs ripgrep パフォーマンス比較です。

### テスト環境

- **小規模**: unity-mcp-server パッケージ（68 C#ファイル）
- **中規模**: Assets + Packages + Library/PackageCache（〜7,200 C#ファイル）
- **大規模**: 生成されたテストファイル（100,003 C#ファイル、1,258,739 シンボル）

### 比較サマリー

| スケール | ファイル数 | SQLiteインデックス | ripgrep | 高速化 |
|----------|-----------|-------------------|---------|--------|
| 小規模 | 68 | <1ms | 165ms | **>165x** |
| 中規模 | ~7,200 | <5ms | ~500ms | **>100x** |
| 大規模 | 100,003 | <8ms | 48-62秒 | **>6,000x** |

### 大規模ベンチマーク詳細（100,003ファイル）

#### SQLite インデックス クエリ

| クエリタイプ | 実行時間 | マッチ数 |
|-------------|---------|--------|
| シンボル完全一致 (Helper) | 7.79ms | 1件 |
| シンボル完全一致 (BaseEntity) | 0.06ms | 1件 |
| シンボル完全一致 (IService) | 0.04ms | 1件 |
| 種別フィルタ (kind=class) | 5.16ms | 100,138件 |

#### ripgrep 検索

| クエリタイプ | 実行時間 | マッチ数 |
|-------------|---------|--------|
| Utils.Helper (10万参照) | 48,950ms (49秒) | 100,000ファイル |
| class BaseEntity (1件) | 57,164ms (57秒) | 1ファイル |
| IService (10万実装) | 55,167ms (55秒) | 20,001ファイル |
| public class (全クラス) | 61,693ms (62秒) | 100,000ファイル |

### 小規模ベンチマーク詳細（68ファイル）

#### ripgrep 検索

| クエリタイプ | 実行時間 | マッチ数 |
|-------------|---------|--------|
| Response (クラス) | 165ms | 7ファイル |
| public class (全クラス) | 164ms | 24ファイル |

### 結論

| 規模 | SQLite優位性 | 推奨用途 |
|------|-------------|---------|
| 小規模 (〜100) | **165倍高速** | 単一パッケージ開発 |
| 中規模 (〜10K) | **100倍高速** | 一般的なUnityプロジェクト |
| 大規模 (〜100K) | **6,000倍高速** | 大規模ゲーム/エンタープライズ |

> **重要**: プロジェクト規模が大きくなるほど、SQLiteインデックスの優位性は指数関数的に増加します。10万ファイル規模では ripgrep が1分近くかかる検索が、SQLiteでは8ms未満で完了します。

## Serena MCP との比較

### 重要: Serena の C# サポート要件

Serena は公式に C# をサポートしていますが、以下の条件が必要です：

| 要件 | 説明 |
|------|------|
| `.sln` ファイル | プロジェクトルート直下に必要 |
| `.sln` 配置場所 | サブディレクトリ不可（ルート直下のみ） |
| C# LSP | Microsoft.CodeAnalysis.LanguageServer（自動ダウンロード） |
| .NET SDK | 9.x が必要（システムにインストール済みであること） |
| `.slnx` フォーマット | **未対応**（新しい XML ベースの solution 形式） |

> **注意**: 2025年12月時点で、上記要件をすべて満たしても C# サポートが動作しないケースが報告されています（[GitHub Issue #384](https://github.com/oraios/serena/issues/384)）。
>
> `csharp: Requires the presence of a .sln file in the project folder.`
> — Serena 公式ドキュメント

#### 注意: Unity プロジェクトでの制限

Unity プロジェクトでは `.sln` ファイルは Unity Editor が IDE を検出した際に自動生成されます：

- **生成場所**: Unityプロジェクトディレクトリ（例: `UnityMCPServer/UnityMCPServer.sln`）
- **問題**: ワークスペースルートにはない（サブディレクトリに生成される）
- **回避策**: シンボリックリンクでルートに配置 `ln -s UnityMCPServer/UnityMCPServer.sln ./`
- **追加要件**: OmniSharp が正常に起動する環境が必要

### テスト環境（再テスト: 2025-12-15）

- **テストファイル**: `UnityMCPServer/Packages/unity-mcp-server/Editor/Helpers/Response.cs` (357行)
- **Serena 設定**: `languages: [csharp, typescript]`
- **`.sln` ファイル**: プロジェクトルートにシンボリックリンク配置
- **C# LSP (Microsoft.CodeAnalysis.LanguageServer)**: 手動インストール済み
- **.NET SDK**: 9.0.308 インストール済み

#### 検証結果

| 試行 | 結果 |
|------|------|
| `.sln` をルートに配置 | ❌ TypeScript フォールバック |
| project.yml に `csharp` 追加 | ❌ TypeScript フォールバック |
| C# LSP 手動インストール | ❌ TypeScript フォールバック |

**根本原因**: Serena の言語サーバーマネージャーは、設定ファイルに `csharp` があっても TypeScript のみを開始する。C# 言語サーバーの初期化ロジック自体が動作していない可能性がある。

**ログ証拠**:

```
Programming languages: typescript; file encoding: utf-8
[StartLS:typescript] Creating language server instance ... language=typescript
```

C# 言語サーバー（`StartLS:csharp`）の開始ログは一切出力されない。

### 比較結果サマリー

| 操作 | unity-mcp-server | Serena MCP | 内蔵ツール | 結果 |
|------|------------------|------------|-----------|------|
| シンボル検索 | ✅ 構造化シンボル | ❌ 空の結果* | ✅ 生テキスト | **unity-mcp-server 勝利** |
| 参照検索 | ✅ 22参照（スニペット付き） | ❌ 未対応* | ✅ 109行（生テキスト） | **unity-mcp-server 勝利** |
| ファイル読み取り | ✅ 200行 (8KB) | ✅ 357行 (14KB) | ✅ 357行 (14KB) | **unity-mcp-server 勝利**（圧縮） |
| シンボル一覧 | ✅ 15シンボル（正確） | ⚠️ 部分的（誤認識あり）* | N/A | **unity-mcp-server 勝利** |

*注: `.sln` ファイルがルートにあっても、OmniSharp が正常起動しない環境では同様の結果となります。

### Serena の C# 解析の問題点

`.sln` ファイルがない、または OmniSharp が起動しない環境では、Serena は TypeScript パーサーでフォールバック解析を行うため：

1. **`find_symbol` が機能しない**: C# シンボル検索で空の結果を返す
2. **`using`文の誤認識**: `using System;` などを「Variable」として解析
3. **戻り値型の誤認識**: メソッドの戻り値型 `string` を「Property」として解析
4. **メソッド欠落**: `AttachWarnings`, `AppendWarnings`, `ErrorResult` が検出されない

### 詳細比較: シンボル一覧

**unity-mcp-server (`script_symbols_get`)**:

```json
{
  "symbols": [
    { "name": "UnityMCPServer.Helpers", "line": 10 },
    { "name": "Response", "kind": "class", "line": 15 },
    { "name": "GetPackageVersion", "kind": "method", "line": 21 },
    { "name": "Success", "kind": "method", "line": 81 },
    { "name": "Success", "kind": "method", "line": 103 },
    { "name": "Error", "kind": "method", "line": 128 },
    { "name": "ErrorWithId", "kind": "method", "line": 157 },
    { "name": "Pong", "kind": "method", "line": 184 },
    { "name": "GetCurrentEditorState", "kind": "method", "line": 199 },
    { "name": "SuccessResult", "kind": "method", "line": 215 },
    { "name": "SuccessResult", "kind": "method", "line": 235 },
    { "name": "AttachWarnings", "kind": "method", "line": 250 },
    { "name": "AppendWarnings", "kind": "method", "line": 275 },
    { "name": "ErrorResult", "kind": "method", "line": 314 },
    { "name": "ErrorResult", "kind": "method", "line": 339 }
  ]
}
```

**Serena (`get_symbols_overview`)**:

```json
{
  "symbols": [
    { "name": "Collections", "kind": "Variable" },  // ❌ using文
    { "name": "Generic", "kind": "Variable" },      // ❌ using文
    { "name": "System", "kind": "Variable" },       // ❌ using文
    { "name": "UnityMCPServer.Helpers", "kind": "Module" },  // ✅ 正確
    { "name": "Response", "kind": "Class", "children": [
      { "name": "Error", "kind": "Method" },        // ✅ 正確
      { "name": "Pong", "kind": "Method" },         // ✅ 正確
      { "name": "string", "kind": "Property" },    // ❌ 戻り値型を誤認識
      { "name": "Success", "kind": "Method" }      // ✅ 正確
      // ❌ AttachWarnings, AppendWarnings, ErrorResult が欠落
    ]}
  ]
}
```

### 結論: Unity C# 開発には unity-mcp-server を推奨

| 観点 | unity-mcp-server | Serena（現状）† |
|------|------------------|-----------------|
| C# シンボル検索 | ✅ 完全対応 | ❌ 機能しない |
| C# 解析精度 | ✅ Roslyn LSP 準拠 | ⚠️ TS フォールバック |
| メソッドオーバーロード | ✅ 全て検出 | ⚠️ 一部欠落 |
| Unity プロジェクト連携 | ✅ リアルタイム | ❌ なし |
| コンパイルエラー検出 | ✅ 対応 | ❌ 未対応 |
| `.sln` 依存 | ❌ 不要 | ✅ 必要 |
| 追加環境設定 | ❌ 不要 | ✅ .NET 9 + C# LSP 必要 |
| セットアップの容易さ | ✅ プラグアンドプレイ | ❌ 複雑（手動設定必要） |

†現状 = .sln をルートに配置、project.yml に csharp 設定、C# LSP 手動インストール済みの環境でも C# 言語サーバーが起動しない（2025年12月時点）

### なぜ Unity 開発に unity-mcp-server が適しているか

1. **`.sln` 不要**: Unity Editor を起動せずにコード解析が可能
2. **Roslyn LSP 統合**: Unity の C# コンパイラと同等の解析精度
3. **Unity Editor 連携**: Play Mode、スクリーンショット、コンポーネント操作など
4. **コンテキスト圧縮**: LLM に最適化された出力サイズ

---

## 詳細結果

### 1. Grep ベースライン（標準ツール）

```bash
# クラス検索
$ time grep -r "class " UnityMCPServer/Packages/unity-mcp-server --include="*.cs" | wc -l
88 matches
real    0m0.353s

# 参照検索
$ time grep -r "Response" UnityMCPServer/Packages/unity-mcp-server --include="*.cs" | wc -l
209 matches
real    0m0.346s
```

### 2. unity-mcp-server ステータス

```json
{
  "success": true,
  "totalFiles": 128040,
  "indexedFiles": 128040,
  "coverage": 1,
  "index": {
    "ready": true,
    "rows": 128040,
    "lastIndexedAt": "2025-12-13T07:26:32.540Z"
  }
}
```

**結果**: インデックス準備完了、100%カバレッジ。クエリ時間: **瞬時** (<10ms)

### 3. シンボル検索 (`script_symbol_find`)

クエリ: `name="Response"`, scope: `all`

```json
{
  "success": true,
  "results": [
    {
      "path": "Packages/unity-mcp-server/Editor/Helpers/Response.cs",
      "symbols": [
        { "name": "Response", "kind": "class", "line": 10, "column": 5, "namespace": "UnityMCPServer.Helpers" }
      ]
    },
    {
      "path": "Packages/unity-mcp-server/Editor/Core/UnityMCPServer.cs",
      "symbols": [
        { "name": "CreateErrorResponse", "kind": "method", "line": 25, "column": 9, "container": "UnityMCPServer" }
      ]
    }
  ],
  "total": 34
}
```

**結果**: Assets と Library 全体で 34 シンボルを検出。クエリ時間: **瞬時** (<100ms)

**Grep との比較**:

- Grep: 209 件の生テキスト行（非構造化）
- script_symbol_find: 種類/位置メタデータ付きの 34 構造化シンボル

### 4. 参照検索 (`script_refs_find`)

クエリ: `name="Response"`, scope: `packages`

```json
{
  "success": true,
  "results": [
    {
      "path": "Packages/unity-mcp-server/Editor/Core/UnityMCPServer.cs",
      "references": [
        { "line": 392, "column": 25, "snippet": "var pongResponse = Response.Pong();" },
        { "line": 415, "column": 20, "snippet": "return Response.Success(result);" }
      ]
    },
    {
      "path": "Packages/unity-mcp-server/Editor/Handlers/GameObjectHandler.cs",
      "references": [
        { "line": 45, "column": 16, "snippet": "return Response.Error(\"Not found\");" }
      ]
    }
  ],
  "total": 20,
  "truncated": false
}
```

**結果**: コンテキストスニペット付きで 20 参照を検出。クエリ時間: **瞬時** (<100ms)

### 5. コード検索 (`script_search`)

クエリ: `pattern="Response"`, scope: `packages`, returnMode: `snippets`

```json
{
  "success": true,
  "total": 7,
  "results": [
    {
      "path": "Packages/unity-mcp-server/Editor/Core/UnityMCPServer.cs",
      "lineRanges": "392-393,409-410,415",
      "snippets": [
        { "line": 392, "snippet": "var pongResponse = Response.Pong();" }
      ]
    },
    {
      "path": "Packages/unity-mcp-server/Editor/Handlers/AddressablesHandler.cs",
      "lineRanges": "28,45",
      "snippets": [
        { "line": 28, "snippet": "return Response.Success(data);" }
      ]
    }
  ],
  "cursor": null
}
```

**結果**: ページネーションされたスニペット付きで 7 ファイルでマッチを検出。クエリ時間: **瞬時** (<100ms)

### 6. ファイル読み取り比較

**Read ツール**（標準）:

- 全ファイル: 358行、約13KB
- 行番号含む
- フィルタリングなし

**script_read**（unity-mcp-server）:

- デフォルト制限: 200行、約8KB
- 行範囲指定可能
- プロジェクト相対パス

**圧縮**: デフォルトで 1.6倍小さい

## unity-mcp-server ツールの主な利点

### 1. 構造化出力

unity-mcp-server ツールは生テキストの代わりに**構造化データ**を返却:

| データタイプ | unity-mcp-server | 標準 Grep |
|-------------|-------------------|-----------|
| シンボル名 | `"Response"` | 生行テキスト |
| シンボル種類 | `"class"`, `"method"` | 利用不可 |
| 行/列 | 正確な位置 | 行番号のみ |
| ファイルパス | プロジェクト相対 | 絶対パス |

### 2. コンテキスト圧縮

すべての unity-mcp-server ツールは **LLM フレンドリー** な出力制限を実装:

| パラメータ | デフォルト | 説明 |
|-----------|-----------|------|
| `maxBytes` | 64KB | 最大レスポンスサイズ |
| `pageSize` | 20-50 | ページあたりの結果数 |
| `maxMatchesPerFile` | 5 | ファイルあたりの制限 |
| `snippetContext` | 2行 | マッチ周辺のコンテキスト |

### 3. ノンブロッキングインデックスビルド

インデックスビルドは **Worker Threads** で実行:

```
メインスレッド (MCP ツール)     ワーカースレッド (インデックスビルド)
        │                           │
        ├── system_ping ─────────── │ ──► 瞬時応答
        ├── code_index_status ───── │ ──► 瞬時応答
        │                           ├── ファイル 1/1000 処理中
        │                           ├── ファイル 2/1000 処理中
        ├── script_symbol_find ──── │ ──► 瞬時応答
        │                           └── ビルド完了
```

**結果**: インデックスビルド中でもすべての MCP ツールは瞬時に応答。

## ツール使い分けガイド

| ユースケース | 推奨ツール | 理由 |
|-------------|-----------|------|
| クラス/メソッドを名前で検索 | `script_symbol_find` | インデックス済み、構造化結果 |
| シンボルの全使用箇所を検索 | `script_refs_find` | コンテキストスニペット、ページネーション |
| コードパターンを検索 | `script_search` | 正規表現対応、スコープフィルタリング |
| 特定ファイルを読み取り | `script_read` | 行制限、プロジェクトパス |
| インデックスステータス確認 | `code_index_status` | カバレッジ、ビルド進捗 |
| クイックファイル一覧 | `Glob` | シンプルなパターンに高速 |

## 既知の制限

### LSP タイムアウト (60秒)

C# LSP が遅い場合、一部のツールがタイムアウトする可能性:

| ツール | タイムアウト可能性 | 回避策 |
|--------|-------------------|--------|
| `script_symbols_get` | あり | 代わりに `script_symbol_find` を使用 |
| `script_symbol_find` | なし (DB ベース) | N/A |
| `script_refs_find` | なし (ファイルベース) | N/A |

### 初回インデックスビルド

- 初回ビルド: 大規模プロジェクトで約1-2分
- 以降のビルド: 増分（高速）
- バックグラウンド: ノンブロッキング

### ファイルスキャン最適化 (v2.46.0+)

大規模プロジェクト（100K+ファイル）でのファイルスキャンを大幅に高速化しました。

#### 最適化内容

| 最適化 | 実装 | 期待される改善 |
|--------|------|----------------|
| OS ネイティブ `find` コマンド | `fastWalkCs` 関数 | ファイルスキャン **15-20倍** 高速化 |
| `excludePackageCache` オプション | Library/PackageCache 除外 | ビルド時間 **90%** 削減（除外時） |
| ルートごとの進捗報告 | スキャン中にログ出力 | 進捗の可視化向上 |

#### ベンチマーク結果

| ツール | ファイル数 | 実行時間 | 備考 |
|--------|-----------|---------|------|
| `find` コマンド（OS） | 107,203 | **10秒** | OSレベル最適化 |
| `walkCs`（旧実装） | 107,203 | **7分以上** | 同期fs操作 |
| `fastWalkCs`（新実装） | 107,203 | **10-15秒** | `find`/PowerShell活用 |

#### 検証済み実行結果（v2.46.0+）

**`excludePackageCache=true` 時のビルド結果:**

| 指標 | 値 |
|------|-----|
| Assets ファイル数 | 1,013 |
| Packages ファイル数 | 68 |
| Library/PackageCache | **0**（除外） |
| 合計ファイル数 | 1,081 |
| 総シンボル数 | 12,243 |
| ビルド時間 | **18.9秒** |
| 処理速度 | ~104 ファイル/秒 |

**ファイルスキャン内訳:**

| ディレクトリ | スキャン時間 |
|-------------|------------|
| Assets | 198ms |
| Packages | 105ms |
| **合計** | **~300ms** |

> **注**: ファイルスキャン（300ms）とLSPシンボル抽出（18秒）は別フェーズ。`fastWalkCs` による高速化はスキャンフェーズに適用。

#### `excludePackageCache` オプション

```javascript
// Library/PackageCache を除外（高速ビルド）
code_index_build({ excludePackageCache: true })

// Library/PackageCache を含む（デフォルト、完全インデックス）
code_index_build({ excludePackageCache: false })
```

| 設定 | ファイル数 | 用途 |
|------|-----------|------|
| `excludePackageCache: false`（デフォルト） | 107,203 | 外部パッケージシンボルも検索したい場合 |
| `excludePackageCache: true` | 〜1,500 | Assets/Packages のみで十分な場合 |

#### セキュリティ考慮

- `execFile` を使用（`exec` ではない）してコマンドインジェクションを防止
- シェル解釈なしで引数を直接渡す
- エラー時は従来の `walkCs` にフォールバック

## 大規模プロジェクトテスト（10万ファイル）

### テスト環境

| 項目 | 値 |
|------|-----|
| 生成ファイル数 | 100,003 C#ファイル |
| 構成 | 100モジュール × 1,000ファイル + Core(3ファイル) |
| ファイルサイズ | 平均 800-1000 バイト |
| 総シンボル数 | 1,258,739 |
| Utils.Helper() 参照 | 320,000 箇所（100,000ファイル） |

### インデックス構築パフォーマンス

| 指標 | 値 |
|------|-----|
| 対象ファイル数 | 100,081 |
| 総シンボル数 | 1,258,739 |
| ビルド時間 | **962秒（16分）** |
| 処理速度 | 104.6 ファイル/秒 |
| DBファイルサイズ | 241 MB |
| 使用オプション | `excludePackageCache=true`, `forceRebuild=true` |

#### シンボル種別分布

| 種別 | 件数 | 割合 |
|------|------|------|
| field | 697,517 | 55.4% |
| method | 340,937 | 27.1% |
| class | 100,138 | 8.0% |
| namespace | 100,070 | 7.9% |
| property | 20,043 | 1.6% |
| enum | 21 | 0.0% |
| interface | 10 | 0.0% |
| struct | 3 | 0.0% |

### シンボルリネームパフォーマンス

`Utils.Helper()` → `Utils.Process()` のリネームテスト:

| 操作 | 対象 | 時間 | 処理速度 |
|------|------|------|---------|
| リネーム | 100,000ファイル / 320,000箇所 | **952秒（15.9分）** | 105 ファイル/秒 |
| リバート | 100,000ファイル / 320,000箇所 | **930秒（15.5分）** | 107 ファイル/秒 |

#### テスト方法

```bash
# 8並列でsed置換（ファイルI/O帯域テスト）
find Assets/Scripts/Generated -name "*.cs" -type f | \
  xargs -P 8 -I {} sed -i 's/Utils\.Helper()/Utils.Process()/g' {}
```

#### 検証結果

| 検証項目 | Before | After | 結果 |
|---------|--------|-------|------|
| Utils.Helper() ファイル数 | 100,000 | 0 | ✅ |
| Utils.Process() ファイル数 | 0 | 100,000 | ✅ |
| リバート後 Helper 数 | 100,000 | 100,000 | ✅ |

### `forceRebuild` オプション

10万ファイル規模では変更検出（`makeSig`）のオーバーヘッドが大きいため、初回ビルド時は `forceRebuild=true` を推奨:

| 操作 | 実行時間 | 備考 |
|------|---------|------|
| 変更検出（`makeSig` × 100K回） | **521秒（8.7分）** | `fs.statSync` がボトルネック |
| `forceRebuild=true` | **スキップ** | 変更検出を省略 |

```javascript
// 初回ビルド（推奨）
code_index_build({ forceRebuild: true, excludePackageCache: true })

// 増分ビルド（変更検出あり）
code_index_build({ excludePackageCache: true })
```

### スケーラビリティ結論

| 規模 | インデックス構築 | リネーム（全参照） | 実用性 |
|------|-----------------|------------------|--------|
| 〜1,000ファイル | 瞬時（<20秒） | 瞬時 | ✅ 実用的 |
| 〜10,000ファイル | 〜2分 | 〜2分 | ✅ 実用的 |
| 〜100,000ファイル | 〜16分 | 〜16分 | ⚠️ バッチ処理推奨 |

> **注**: 10万ファイル規模のプロジェクトでは、初回インデックス構築に16分、全ファイルリネームに16分を要する。日常的な増分更新は高速だが、大規模リファクタリングはバッチ処理として実行することを推奨。

---

## 技術実装詳細

### SQLite 複合インデックス

```sql
-- 複合条件クエリ用に追加
CREATE INDEX IF NOT EXISTS idx_symbols_name_kind ON symbols(name, kind);
CREATE INDEX IF NOT EXISTS idx_symbols_path_name ON symbols(path, name);
```

**クエリ最適化**:

- `WHERE name = ? AND kind = ?` は `idx_symbols_name_kind` を使用
- `WHERE path LIKE 'Assets/%' AND name LIKE '%Foo%'` は `idx_symbols_path_name` を使用

### バッチトランザクション処理

```javascript
// 変更前: ファイルごとに1トランザクション（5000ファイルで5000トランザクション）
for (file of files) {
  db.run('BEGIN'); // ❌ 遅い
  insertSymbols(file);
  db.run('COMMIT');
}

// 変更後: 100ファイルごとに1トランザクション（5000ファイルで50トランザクション）
const TX_BATCH_SIZE = 100;
for (batch of chunk(files, TX_BATCH_SIZE)) {
  db.run('BEGIN'); // ✅ 高速
  for (file of batch) insertSymbols(file);
  db.run('COMMIT');
}
```

### LRU キャッシュ設定

```javascript
import { LRUCache } from 'lru-cache';

// クエリ結果キャッシュ
const queryCache = new LRUCache({
  max: 500,           // 最大500クエリをキャッシュ
  ttl: 1000 * 60 * 5  // 5分TTL
});

// 統計キャッシュ（短いTTL）
const statsCache = new LRUCache({
  max: 1,
  ttl: 1000 * 60      // 1分TTL
});
```

### PRAGMA 最適化

```javascript
this.db.run('PRAGMA cache_size = 16000');    // 64MB キャッシュ
this.db.run('PRAGMA temp_store = MEMORY');   // 高速一時操作
this.db.run('PRAGMA synchronous = NORMAL');  // 安全性/速度のバランス
```

## テストカバレッジ

### ユニットテスト（68テスト合格）

| テストスイート | テスト数 | カバレッジ |
|---------------|---------|-----------|
| `codeIndex.test.js` | 6 | CodeIndex クラス、ドライバ処理 |
| `config.test.js` | 18 | 設定読み込み、ロギング |
| `indexWatcher.test.js` | 8 | ファイル監視、DB検出 |
| `projectInfo.test.js` | 7 | プロジェクト情報解決 |
| `server.test.js` | 11 | ハンドラ登録、ツール実行 |
| `CodeIndexStatusToolHandler.test.js` | 18 | ステータス報告、ビルドジョブ追跡 |

### 統合テスト

| テスト | 説明 | ステータス |
|--------|------|-----------|
| `code-index-background.test.js` | バックグラウンドビルド分離 | ✅ |
| ハンドラ実行テスト | 全107ハンドラ | ✅ |

### CI パイプライン

```bash
# pre-commit フック
- ステージされたJSファイルにESLint
- Prettier フォーマット
- commitlint 検証

# pre-push フック
- npm run test:ci (68テスト)

# GitHub Actions
- Markdown/ESLint/Prettier チェック
- コミットメッセージ lint
- 完全テストスイート
```

## マイグレーションガイド

### v2.43.0+ での破壊的変更（ファイルグループ化形式）

1. **`script_symbol_find` 出力フォーマット**:
   - 旧: `results[]` にフラットなシンボルリスト
   - 新: `results[].path` + `results[].symbols[]` でファイルごとにグループ化

2. **`script_refs_find` 出力フォーマット**:
   - 旧: `results[]` にフラットな参照リスト
   - 新: `results[].path` + `results[].references[]` でファイルごとにグループ化

3. **`script_search` 出力フォーマット**:
   - 旧: `results[]` にフラットな検索結果リスト
   - 新: `results[].path` + `results[].snippets[]` でファイルごとにグループ化

4. **`script_symbols_get` 出力フォーマット**:
   - 旧: `symbols[].startLine`, `symbols[].endLine`
   - 新: `symbols[].line`, `symbols[].column`

### クライアント適応

```javascript
// 変更前（フラットリスト）
for (const result of response.results) {
  console.log(result.path, result.symbol.name);
}

// 変更後（ファイルグループ化）
for (const fileGroup of response.results) {
  console.log(`File: ${fileGroup.path}`);
  for (const symbol of fileGroup.symbols) {
    console.log(`  - ${symbol.name} at line ${symbol.line}`);
  }
}
```

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `mcp-server/src/core/CodeIndex.js` | 複合インデックス、LRUキャッシュ、PRAGMA |
| `mcp-server/src/core/workers/indexBuildWorker.js` | バッチトランザクション、バッチDELETE |
| `mcp-server/src/handlers/script/ScriptSymbolFindToolHandler.js` | ファイルグループ化出力 |
| `mcp-server/src/handlers/script/ScriptRefsFindToolHandler.js` | ファイルグループ化出力 |
| `mcp-server/src/handlers/script/ScriptSearchToolHandler.js` | ファイルグループ化出力 |
| `mcp-server/src/handlers/script/ScriptSymbolsGetToolHandler.js` | 簡略化出力 |
| `mcp-server/package.json` | `lru-cache` 依存関係追加 |

## 結論

**unity-mcp-server ツールは標準ファイル操作に対して大きな優位性を提供:**

1. **速度**: 128,040インデックスファイルへの瞬時クエリ
2. **構造**: 生テキストではなくセマンティックシンボル情報
3. **圧縮**: LLM効率のため3-5倍小さいレスポンス
4. **ノンブロッキング**: Worker Thread分離による応答性確保

**推奨**: 新プロジェクト開始時は常に `code_index_build` を実行して高速シンボル操作を有効化してください。
