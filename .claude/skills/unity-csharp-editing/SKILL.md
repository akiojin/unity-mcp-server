---
name: unity-csharp-editing
description: Unity C#スクリプトの編集・検索・リファクタリングを支援。TDDサイクルでのコード編集、シンボルナビゲーション、参照検索、構造化編集を実現。使用タイミング: C#編集、スクリプト検索、シンボル検索、リファクタリング、コードインデックス、クラス作成、メソッド追加
allowed-tools: Read, Grep, Glob
---

# Unity C# Script Editing

Unity C#スクリプトの編集・検索・リファクタリングを効率的に行うためのガイド。

## Quick Start

### 1. コードインデックスの初期化

初回使用時またはインデックスが古い場合、まずインデックスを構築：

```javascript
// インデックス状態を確認
mcp__unity-mcp-server__get_index_status()

// インデックスを構築（初回のみ、数分かかる場合あり）
mcp__unity-mcp-server__build_index()
```

### 2. 基本的な読み取りフロー

```javascript
// ファイル内のシンボル一覧を取得
mcp__unity-mcp-server__get_symbols({
  path: "Assets/Scripts/Player.cs"
})

// 特定シンボルの詳細を取得
mcp__unity-mcp-server__find_symbol({
  name: "PlayerController",
  kind: "class",
  exact: true
})

// コードを読み取り
mcp__unity-mcp-server__read({
  path: "Assets/Scripts/Player.cs",
  startLine: 10,
  endLine: 50
})
```

### 3. 基本的な編集フロー

```javascript
// 小さな変更（80文字以内）→ snippet
mcp__unity-mcp-server__edit_snippet({
  path: "Assets/Scripts/Player.cs",
  instructions: [{
    operation: "replace",
    anchor: { type: "text", target: "if (health < 0)" },
    newText: "if (health <= 0)"
  }]
})

// 大きな変更（メソッド本体）→ structured
mcp__unity-mcp-server__edit_structured({
  path: "Assets/Scripts/Player.cs",
  symbolName: "PlayerController/TakeDamage",
  operation: "replace_body",
  newText: "{\n    health -= damage;\n    OnDamaged?.Invoke(damage);\n}"
})
```

## Core Concepts

### コードインデックス

unity-mcp-serverは内蔵C# LSPによるコードインデックスを提供。標準ツール（grep等）より**5倍コンパクト**な出力で、LLMコンテキストを効率化。

| ツール | 目的 | 標準比 |
|--------|------|--------|
| `find_symbol` | シンボル検索 | 5倍小さい出力 |
| `find_refs` | 参照検索 | 3倍小さい出力 |
| `search` | コード検索 | 瞬時レスポンス |

### namePath（シンボルパス）

シンボルはファイル内の階層パスで識別：

```
// 単純なクラス
PlayerController

// ネストしたメンバー
PlayerController/TakeDamage
PlayerController/health

// 深いネスト
OuterClass/InnerClass/Method
```

### スコープ指定

検索範囲を絞り込んでパフォーマンス向上：

- `assets` - Assets/配下のみ
- `packages` - Packages/配下のみ
- `embedded` - 埋め込みパッケージのみ
- `all` - 全範囲（デフォルト）

## Tool Selection Guide

### 80文字ルール

**編集ツールの選択基準は「差分が80文字以内かどうか」**

#### `edit_snippet` を使う場合

**条件**: 差分が80文字以内、1〜2行の変更

```javascript
// ✅ nullガード削除
{ operation: "delete", anchor: { type: "text", target: "if (x == null) return;\n" }}

// ✅ 条件式の微修正
{ operation: "replace", anchor: { type: "text", target: "if (x > 10)" }, newText: "if (x > 20)" }

// ✅ ログ挿入
{ operation: "insert", anchor: { type: "text", target: "Process();\n" }, newText: "Debug.Log(\"Processing\");\n" }
```

#### `edit_structured` を使う場合

**条件**: メソッド本体置換、クラスメンバー追加

```javascript
// ✅ メソッド本体置換
{
  symbolName: "Player/Move",
  operation: "replace_body",
  newText: "{\n    transform.position += direction * speed * Time.deltaTime;\n}"
}

// ✅ クラスにメンバー追加
{
  symbolName: "Player",
  operation: "insert_after",
  newText: "\n    private float _jumpForce = 5f;\n"
}
```

### 判断フローチャート

```
変更が80文字以内？
├─ YES → edit_snippet
└─ NO → メソッド/プロパティ全体の置換？
         ├─ YES → edit_structured (replace_body)
         └─ NO → クラスへの追加？
                  ├─ YES → edit_structured (insert_after)
                  └─ NO → 複数のsnippetに分割
```

## Common Workflows

### TDDサイクル（RED-GREEN-REFACTOR）

#### 1. RED: テストを書く

```javascript
// テストファイルを作成
mcp__unity-mcp-server__create_class({
  path: "Assets/Tests/PlayerTests.cs",
  className: "PlayerTests",
  namespace: "Tests",
  usings: "NUnit.Framework,UnityEngine"
})

// テストメソッドを追加
mcp__unity-mcp-server__edit_structured({
  path: "Assets/Tests/PlayerTests.cs",
  symbolName: "PlayerTests",
  operation: "insert_after",
  newText: `
    [Test]
    public void TakeDamage_ReducesHealth()
    {
        var player = new Player(100);
        player.TakeDamage(30);
        Assert.AreEqual(70, player.Health);
    }
`
})
```

#### 2. GREEN: 最小限の実装

```javascript
// 実装を追加
mcp__unity-mcp-server__edit_structured({
  path: "Assets/Scripts/Player.cs",
  symbolName: "Player",
  operation: "insert_after",
  newText: `
    public void TakeDamage(int damage)
    {
        Health -= damage;
    }
`
})
```

#### 3. REFACTOR: コード改善

```javascript
// コンパイル状態を確認
mcp__unity-mcp-server__get_compilation_state({ includeMessages: true })

// 影響範囲を確認してからリファクタリング
mcp__unity-mcp-server__find_refs({
  name: "TakeDamage",
  container: "Player"
})
```

### 新規クラス作成

```javascript
// 1. クラスファイル作成
mcp__unity-mcp-server__create_class({
  path: "Assets/Scripts/Enemies/Enemy.cs",
  className: "Enemy",
  namespace: "Game.Enemies",
  baseType: "MonoBehaviour",
  usings: "UnityEngine,System"
})

// 2. フィールドとメソッドを追加
mcp__unity-mcp-server__edit_structured({
  path: "Assets/Scripts/Enemies/Enemy.cs",
  symbolName: "Enemy",
  operation: "insert_after",
  newText: `
    [SerializeField] private int _health = 100;
    [SerializeField] private float _speed = 3f;

    public int Health => _health;

    public void TakeDamage(int damage)
    {
        _health = Mathf.Max(0, _health - damage);
        if (_health == 0) Die();
    }

    private void Die()
    {
        Destroy(gameObject);
    }
`
})

// 3. インデックス更新
mcp__unity-mcp-server__update_index({
  paths: ["Assets/Scripts/Enemies/Enemy.cs"]
})
```

### リファクタリング（シンボル名変更）

```javascript
// 1. 影響範囲を確認
mcp__unity-mcp-server__find_refs({
  name: "oldMethodName",
  container: "ClassName",
  scope: "all"
})

// 2. リネーム実行（プロジェクト全体に適用）
mcp__unity-mcp-server__rename_symbol({
  relative: "Assets/Scripts/Player.cs",
  namePath: "Player/oldMethodName",
  newName: "newMethodName",
  preview: true  // まずプレビューで確認
})

// 3. 問題なければ適用
mcp__unity-mcp-server__rename_symbol({
  relative: "Assets/Scripts/Player.cs",
  namePath: "Player/oldMethodName",
  newName: "newMethodName",
  preview: false
})
```

### コード検索

```javascript
// パターン検索（正規表現）
mcp__unity-mcp-server__search({
  pattern: "GetComponent<.*>",
  patternType: "regex",
  scope: "assets",
  returnMode: "snippets",
  snippetContext: 2
})

// 特定クラスの使用箇所を検索
mcp__unity-mcp-server__find_refs({
  name: "PlayerController",
  kind: "class",
  scope: "all"
})
```

## Advanced Patterns

### バッチ編集（複数箇所を一度に）

```javascript
// 最大10箇所まで一度に編集可能
mcp__unity-mcp-server__edit_snippet({
  path: "Assets/Scripts/GameManager.cs",
  instructions: [
    { operation: "replace", anchor: { type: "text", target: "Debug.Log" }, newText: "Logger.Info" },
    { operation: "delete", anchor: { type: "text", target: "// TODO: remove\n" }},
    { operation: "insert", anchor: { type: "text", target: "void Start()\n    {" }, newText: "\n        Initialize();" }
  ]
})
```

### プレビューモード

大きな変更や不確実な編集は、まずプレビューで確認：

```javascript
// プレビューモードで検証
mcp__unity-mcp-server__edit_structured({
  path: "Assets/Scripts/Player.cs",
  symbolName: "Player/Update",
  operation: "replace_body",
  newText: "{ /* new implementation */ }",
  preview: true  // ファイルに書き込まない
})

// LSP診断エラーがなければ適用
mcp__unity-mcp-server__edit_structured({
  // 同じパラメータで preview: false
})
```

### シンボル削除

```javascript
// 参照がないことを確認
mcp__unity-mcp-server__find_refs({
  name: "UnusedMethod",
  container: "Player"
})

// 参照がなければ削除
mcp__unity-mcp-server__remove_symbol({
  path: "Assets/Scripts/Player.cs",
  namePath: "Player/UnusedMethod",
  failOnReferences: true,  // 参照があればエラー
  apply: true
})
```

## Common Mistakes

### 1. アンカー不一致

**問題**: `anchor_not_found` エラー

```javascript
// ❌ 空白・改行が不正確
anchor: { type: "text", target: "if(x>10)" }

// ✅ 実際のコードと完全一致
anchor: { type: "text", target: "if (x > 10)" }
```

**解決策**: `read`でファイル内容を確認し、空白・改行を含む正確な文字列をコピー

### 2. 80文字制限超過

**問題**: `diff exceeds 80 characters` エラー

```javascript
// ❌ snippetで長いコードを編集
{ operation: "replace", anchor: {...}, newText: "very long code..." }

// ✅ structuredでメソッド本体を置換
{ symbolName: "Class/Method", operation: "replace_body", newText: "..." }
```

### 3. コードインデックス未構築

**問題**: LSPタイムアウト（60秒）

```javascript
// ✅ 必ずインデックス状態を確認
mcp__unity-mcp-server__get_index_status()

// カバレッジが低ければ構築
mcp__unity-mcp-server__build_index()
```

### 4. 複数マッチ

**問題**: `anchor_not_unique` エラー

```javascript
// ❌ 一般的すぎるアンカー
anchor: { type: "text", target: "return;" }

// ✅ コンテキストを含めて一意に
anchor: { type: "text", target: "        return health;\n    }" }
```

### 5. 編集後のインデックス未更新

**問題**: 編集後に古いシンボル情報が返される

```javascript
// ✅ 編集後は必ずインデックス更新
mcp__unity-mcp-server__update_index({
  paths: ["Assets/Scripts/Player.cs"]
})
```

## Tool Reference

| ツール | 用途 | 主要パラメータ |
|--------|------|----------------|
| `get_symbols` | ファイル内シンボル一覧 | path |
| `find_symbol` | シンボル検索 | name, kind, scope, exact |
| `find_refs` | 参照検索 | name, container, scope |
| `read` | コード読み取り | path, startLine, endLine |
| `search` | パターン検索 | pattern, patternType, scope |
| `edit_snippet` | 軽量編集（80文字以内） | path, instructions |
| `edit_structured` | 構造化編集 | path, symbolName, operation, newText |
| `create_class` | クラス作成 | path, className, namespace, baseType |
| `rename_symbol` | リネーム | relative, namePath, newName |
| `remove_symbol` | シンボル削除 | path, namePath, failOnReferences |
| `get_index_status` | インデックス状態確認 | - |
| `build_index` | インデックス構築 | - |
| `update_index` | インデックス更新 | paths |
| `get_compilation_state` | コンパイル状態 | includeMessages |
