# MCPサーバーアーキテクチャ調査結果

## 現在のツール定義・登録構造

### 1. ツール定義の方法

#### A. ハンドラーベースアプローチ（現在採用）
- **場所**: `mcp-server/src/handlers/*/`配下
- **ファイル数**: 102ファイル（ハンドラークラス + BaseToolHandler）
- **実装**: 各ツールは`BaseToolHandler`を継承したクラス
- **スキーマ定義**: コンストラクタで`super(name, description, inputSchema)`に渡す
- **例**:
  ```javascript
  class SystemPingToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
      super('system_ping', 'Test connection...', {
        type: 'object',
        properties: { ... },
        required: []
      })
    }
  }
  ```

#### B. 旧式ツール関数アプローチ（廃止中）
- **場所**: `mcp-server/src/tools/*/`配下
- **ファイル数**: 16ファイル（ping.js, getComponentValues.js等）
- **実装**: `registerXxxTool(server, unityConnection)`関数で`setRequestHandler`を直接登録
- **スキーマ定義**: `ListToolsRequestSchema`/`CallToolRequestSchema`ハンドラ内で定義
- **状態**: 新規開発では使用されず、レガシーコード

### 2. ツール登録の仕組み

#### 登録フロー（ハンドラーベース）
1. **`src/handlers/index.js`** がハンドラーの単一の真実ソース
   - 102個のハンドラークラスをインポート
   - `HANDLER_CLASSES`配列に順序を定義（265～405行）
   - `createHandlers(unityConnection)`関数でMap<name, handler>を生成

2. **`src/core/server.js`** でハンドラーをMCPプロトコルに接続
   - `handlers = createHandlers(unityConnection)`で全ハンドラー生成
   - `server.setRequestHandler(ListToolsRequestSchema, ...)` → ハンドラーの`getDefinition()`呼び出し
   - `server.setRequestHandler(CallToolRequestSchema, ...)` → ハンドラーの`handle()`呼び出し

#### 利点
- 単一のハンドラーレジストリで一元管理
- 初期化エラーをキャッチして続行（fail-softモード）
- ハンドラーサイズが大きくても起動時の負荷が低い

### 3. ハンドラー実装パターン

#### BaseToolHandlerの構造
```
constructor(name, description, inputSchema = {})
  → inputSchema の正規化・サニタイズ
  → スキーマ内の空の required[] を削除、recursiveに処理

validate(params)
  → required フィールドの存在チェック
  → オーバーライドで拡張可能

execute(params)
  → 実装必須（サブクラスで実装）
  → 非同期実行

handle(params)
  → メイン呼び出し口
  → 検証→実行→エラーハンドリング
  → 標準レスポンス形式 { status: 'success'|'error', result, error, code, details }

getDefinition()
  → MCP用のツール定義を返却 { name, description, inputSchema }
```

#### ハンドラー実装例（SystemPingToolHandler）
```javascript
// 1. コンストラクタでスキーマ定義（検証後に正規化）
constructor(unityConnection) {
  super('system_ping', 'Test connection...', {
    type: 'object',
    properties: { message: { type: 'string', description: '...' } },
    required: []
  })
  this.unityConnection = unityConnection
}

// 2. execute()で実装（validate()は自動実行）
async execute(params) {
  if (!this.unityConnection.isConnected()) {
    await this.unityConnection.connect()
  }
  const result = await this.unityConnection.sendCommand('ping', {...})
  return { message: result.message, echo: result.echo, ... }
}
```

### 4. 現在のツール数

| カテゴリ | ツール数 | 主要ツール |
|---------|---------|-----------|
| System | 3 | ping, refresh_assets, get_command_stats |
| GameObject | 5 | create, find, modify, delete, get_hierarchy |
| Scene | 5 | create, load, save, list, get_info |
| Analysis | 9 | get_gameobject_details, analyze_scene_contents, get_component_values, ... |
| PlayMode | 5 | play, pause, stop, get_state, wait_for_state |
| UI | 5 | find_elements, click_element, get_element_state, set_element_value, simulate_input |
| Input System | 14 | keyboard, mouse, gamepad, touch, action_map_*, binding_*, control_schemes_* |
| Asset | 11 | prefab_*, material_*, import_settings_*, database_*, dependency_* |
| Addressables | 3 | manage, build, analyze |
| Menu | 1 | menu_item_execute |
| Console | 2 | clear, read |
| Screenshot | 2 | capture, analyze |
| Video | 4 | start, stop, status, for |
| Component | 6 | add, remove, modify, list, get_types, field_set |
| Compilation | 1 | get_state |
| Test | 2 | run, get_status |
| Editor | 6 | tags_manage, layers_manage, selection_manage, windows_manage, tools_manage, quit |
| Settings | 2 | get, update |
| Package | 2 | manager, registry_config |
| Script | 13 | packages_list, read, search, edit_structured, edit_snippet, symbols_get, symbol_find, refs_find, refactor_rename, create_class, remove_symbol, code_index_* |
| **合計** | **~102** | Unity系: ~98, Serena系: 4 |

### 5. MCPプロトコルとの接続

#### MCPハンドシェイク
```javascript
// server.jsで以下をセットアップ
const server = new Server(
  { name: 'unity-mcp-server', version: '2.38.0' },
  { capabilities: { tools: { listChanged: true }, resources: {}, prompts: {} } }
)

// ListToolsRequestSchema → ハンドラーのgetDefinition()を集約
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Array.from(handlers.values())
    .map(handler => handler.getDefinition())
    .filter(tool => tool !== null)
  return { tools }
})

// CallToolRequestSchema → ハンドラーのhandle()を呼び出し
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const handler = handlers.get(name)
  const result = await handler.handle(args)
  
  // MCP応答フォーマットに変換
  if (result.status === 'error') {
    return {
      content: [{ type: 'text', text: `Error: ${result.error}` }]
    }
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(result.result) }]
  }
})
```

---

## search_tools パターン適用時の変更影響分析

### 現在のアーキテクチャ保持可能な部分

1. **BaseToolHandler クラス（変更なし）**
   - スキーマ定義・検証・実行のカプセル化は維持
   - `execute()`の実装インターフェースは変更不要

2. **個別ハンドラー実装（変更なし）**
   - 各ハンドラーの`execute()`実装ロジックは維持
   - `unityConnection`との通信は変更不要

3. **カテゴリ分類（拡張）**
   - `tool:search_gameobject`, `tool:analysis_*` 等のプレフィックス追加は可能
   - 階層的な検索対応

### 変更が必要な部分

1. **ハンドラーレジストリ（src/handlers/index.js）**
   - `HANDLER_CLASSES` 配列に `category` メタデータを追加
   - または、個別ハンドラーが `getCategory()` メソッドを実装

   ```javascript
   // 例: ハンドラーにカテゴリメタデータ
   class GameObjectCreateToolHandler extends BaseToolHandler {
     constructor(unityConnection) {
       super('gameobject_create', '...', {...})
       this.category = 'scene_manipulation'
       this.scope = 'write'
       this.keywords = ['gameobject', 'create', 'instantiate']
     }
   }
   ```

2. **MCPプロトコルハンドラー（server.js の ListToolsRequestSchema）**
   - ツール定義に `tags` フィールドを追加
   - `getDefinition()` をサーバー側で拡張

   ```javascript
   const definition = handler.getDefinition()
   definition.tags = handler.tags || []  // カテゴリタグ追加
   ```

3. **search_tools エンドポイント実装（新規）**
   - `src/core/server.js` に新しいリクエストハンドラー追加
   - ツール検索ロジックを実装

   ```javascript
   server.setRequestHandler(SearchToolsRequestSchema, async (request) => {
     const { query, tags, limit } = request.params
     const results = await searchTools(handlers, query, tags, limit)
     return { results }
   })
   ```

4. **キャッシング層（新規）**
   - ハンドラー初期化時のメタデータ抽出→キャッシング
   - 検索パフォーマンス向上（ツール数が増加した場合）

---

## search_tools パターンの適用可能性

### 適用における利点
1. **スケーラビリティ**: ツール数増加時の検索パフォーマンス確保
2. **セマンティック検索**: キーワード・カテゴリベースの高度な検索
3. **ツール発見の効率化**: ユーザーが目的のツールを迅速に発見
4. **拡張性**: タグ・スコープ・デフォルト値情報の付与

### 実装アプローチ
- **最小変更**: `BaseToolHandler.getDefinition()` の `tags` フィールド追加のみ
- **段階的導入**: 新規ハンドラーから `tags` を付与、既存は互換性維持
- **MCPスキーマ依存**: MCPプロトコル側で `SearchTools` 要求スキーマが定義されるまではカスタム実装

### 非適用時の継続可能性
- 現在のアーキテクチャは完全に自立
- ハンドラーベースの登録・実行フローは変更不要
- 新規ツール追加は `src/handlers/` にクラスを追加するのみ

---

## 結論

**unity-mcp-server** のアーキテクチャ:
- **設計**: ハンドラークラスベースの集約パターン（優れた保守性）
- **レジストリ**: 単一ソース（`src/handlers/index.js`）で全ツール管理
- **現ツール数**: 102個（Unity連携95+、スクリプト/Serena系7）
- **search_tools 対応**: 最小限の変更で段階的に導入可能（BaseToolHandler + カテゴリメタデータ）
