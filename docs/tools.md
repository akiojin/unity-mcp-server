# Tools & Discovery

English | [日本語](#日本語)

Unity MCP Server exposes **100+ tools** for Unity Editor automation.

## Recommended: `search_tools`

Instead of scrolling a giant tool list, use the `search_tools` meta-tool to discover the best tools for your task.

```json
{
  "tool": "search_tools",
  "params": {
    "query": "create gameobject",
    "limit": 10
  }
}
```

Tips:

- Use `category` to narrow the scope (e.g. `scene`, `script`, `asset`)
- Use `tags` to filter by intent (e.g. `create`, `modify`, `read`)
- Set `includeSchemas: true` only when you need the full input schema

## Code Index Workflow (for script tools)

For stable, fast code operations:

1. `code_index_build` once (first run or after big changes)
2. `code_index_update` after editing specific files
3. Use `script_symbol_find` / `script_symbols_get` to build accurate `symbolName` inputs for structured edits

## Where the Tool Catalog Lives (Maintainers)

- Manifest: `mcp-server/src/core/toolManifest.json`
- Handler index: `mcp-server/src/handlers/index.js`

---

## 日本語

Unity MCP Server は Unity Editor 自動化の **100+ ツール**を提供します。

## 推奨: `search_tools`

ツール一覧を総当たりせず、`search_tools` で目的のツールを絞り込みます。

```json
{
  "tool": "search_tools",
  "params": {
    "query": "ゲームオブジェクト 作成",
    "limit": 10
  }
}
```

ポイント:

- `category` で領域を限定（例: `scene`, `script`, `asset`）
- `tags` で意図を限定（例: `create`, `modify`, `read`）
- `includeSchemas: true` は必要なときだけ（入力スキーマが大きい）

## コードインデックス運用（script系ツール向け）

コード編集/参照を安定させるための基本手順:

1. 初回（または大幅変更後）に `code_index_build`
2. ファイル編集後は `code_index_update`
3. `script_symbol_find` / `script_symbols_get` で `symbolName` を正確に作って構造化編集へ渡す

## ツール一覧の実体（メンテナ向け）

- マニフェスト: `mcp-server/src/core/toolManifest.json`
- ハンドラー登録: `mcp-server/src/handlers/index.js`
