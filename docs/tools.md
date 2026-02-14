# Tools & Discovery

English | [日本語](#日本語)

Unity MCP Server exposes **100+ tools** for Unity Editor automation.

## Tool Naming

Tool names match the Unity TCP command `type` (for example: `ping`, `create_gameobject`, `find_ui_elements`).

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

## Client Tool Limits

For MCP clients with strict tool limits, filter `tools/list` using environment variables:

```bash
export UNITY_MCP_TOOL_INCLUDE_CATEGORIES=system,scene,gameobject,analysis,script
export UNITY_MCP_TOOL_EXCLUDE_CATEGORIES=ui,input,addressables,video,screenshot,profiler
```

Filtering also applies to `tools/call` so hidden tools cannot be executed by name.

## Code Index Workflow (for script tools)

For stable, fast code operations:

1. `build_index` once (first run or after big changes)
2. `update_index` after editing specific files
3. Use `find_symbol` / `get_symbols` to build accurate `symbolName` inputs for structured edits

## `find_refs` Pagination

`find_refs` supports pagination via `startAfter`. When results are truncated, the response includes `cursor`.

## Where the Tool Catalog Lives (Maintainers)

- Manifest: `mcp-server/src/core/toolManifest.json`
- Handler index: `mcp-server/src/handlers/index.js`

---

## 日本語

Unity MCP Server は Unity Editor 自動化の **100+ ツール**を提供します。

## ツール名について

ツール名は Unity TCP コマンドの `type` と一致します（例: `ping`, `create_gameobject`, `find_ui_elements`）。

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

## ツール数上限のあるクライアント向け

ツール数制限があるMCPクライアントでは、環境変数で `tools/list` を絞り込みます。

```bash
export UNITY_MCP_TOOL_INCLUDE_CATEGORIES=system,scene,gameobject,analysis,script
export UNITY_MCP_TOOL_EXCLUDE_CATEGORIES=ui,input,addressables,video,screenshot,profiler
```

このフィルタは `tools/call` にも適用されるため、非公開ツール名の直接実行もブロックされます。

## コードインデックス運用（script系ツール向け）

コード編集/参照を安定させるための基本手順:

1. 初回（または大幅変更後）に `build_index`
2. ファイル編集後は `update_index`
3. `find_symbol` / `get_symbols` で `symbolName` を正確に作って構造化編集へ渡す

## `find_refs` のページング

`find_refs` は `startAfter` によるページングに対応し、結果が切り詰められた場合は `cursor` を返します。

## ツール一覧の実体（メンテナ向け）

- マニフェスト: `mcp-server/src/core/toolManifest.json`
- ハンドラー登録: `mcp-server/src/handlers/index.js`
