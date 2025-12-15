# Capabilities: none (Tools Not Detected) — Root Cause & Fix

## 問題の症状

Claude Codeなど一部のMCPクライアントで以下の症状が発生：

- Status: ✔ connected
- **Capabilities: none** ← 問題
- ツールが全く認識されない（ListToolsが空配列を返す）

## 調査プロセス

### 1. npm package検証

```bash
npm pack @akiojin/unity-mcp-server@2.40.2
tar -xzf akiojin-unity-mcp-server-2.40.2.tgz
```

**結果**:
- 全145ファイル存在（handler: 108ファイル）
- 直接実行: 107/107 handlers initialized successfully
- → **パッケージ自体に問題なし**

### 2. Unity接続テスト

```bash
cd package && node src/core/server.js
```

**結果**:
- Unity接続成功
- ハンドラー登録成功
- → **Unity接続も問題なし**

### 3. 根本原因特定

**ユーザー提供のClaude Code画面**:
```
Status: ✔ connected
Capabilities: none
```

**問題箇所**: `mcp-server/src/core/server.js`

```javascript
// ❌ 問題のコード（2箇所）
capabilities: {
  tools: { listChanged: true },
  resources: {},  // ← 空オブジェクトが原因
  prompts: {}     // ← 空オブジェクトが原因
}
```

**MCP仕様**:
- サポートしていないcapabilitiesは**省略すべき**（`ZodOptional`）
- 空オブジェクト`{}`を設定すると、一部クライアントが「機能なし」と誤解釈

### 4. 副次的問題

MCP SDK v0.6.1は厳密なcapability-handlerマッチングを要求：

```javascript
// ❌ capability未宣言なのにハンドラー登録
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: [] };
});
```

→ `assertRequestHandlerCapability` エラー発生

## 修正内容

### 1. Capabilities宣言修正

```diff
capabilities: {
- // Explicitly advertise tool support; some MCP clients expect a non-empty object
- // Setting listChanged enables future push updates if we emit notifications
+ // Advertise tool support with listChanged enabled for future push updates
  tools: { listChanged: true },
-  resources: {},
-  prompts: {}
}
```

### 2. 未使用ハンドラー削除

```diff
-import {
-  ListToolsRequestSchema,
-  CallToolRequestSchema,
-  ListResourcesRequestSchema,
-  ListPromptsRequestSchema
-} from '@modelcontextprotocol/sdk/types.js';
+import {
+  ListToolsRequestSchema,
+  CallToolRequestSchema
+} from '@modelcontextprotocol/sdk/types.js';
```

```diff
  return { tools };
});

-// Handle resources listing
-server.setRequestHandler(ListResourcesRequestSchema, async () => {
-  logger.debug('[MCP] Received resources/list request');
-  // Unity MCP server doesn't provide resources
-  return { resources: [] };
-});
-
-// Handle prompts listing
-server.setRequestHandler(ListPromptsRequestSchema, async () => {
-  logger.debug('[MCP] Received prompts/list request');
-  // Unity MCP server doesn't provide prompts
-  return { prompts: [] };
-});
-
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async request => {
```

### 3. トラブルシューティングガイド追加

`mcp-server/README.md`:

- "Capabilities: none"問題の症状説明
- 最新版へのアップデート方法
- Unity Editor接続確認
- MCP client互換性チェック
- 問題発生理由（v2.40.3で修正）

## テスト結果

```
✅ 68/68 tests passed
✅ ESLint passed
✅ Prettier passed
✅ pre-push hooks passed
```

## コミット履歴

```
b865b5a fix(mcp-server): remove empty capabilities causing "Capabilities: none"
56237d9 fix(mcp-server): remove unused resources and prompts handlers
```

## 影響範囲

- `mcp-server/src/core/server.js`: 2箇所のcapabilities宣言修正
- `mcp-server/src/core/server.js`: 4箇所のハンドラー削除
- `mcp-server/README.md`: トラブルシューティング追加

## 次のリリース

- バージョン: v2.40.3 (semantic-release自動決定)
- Type: `fix` → patch version up
- 配信: npm + GitHub Release
