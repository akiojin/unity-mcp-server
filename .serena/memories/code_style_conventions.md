# Unity Editor MCP - コードスタイルとコンベンション

## JavaScript/Node.js側 (mcp-server)

### 命名規則
- **クラス**: PascalCase (例: `EnhancedReadLogsToolHandler`)
- **メソッド**: camelCase (例: `execute`, `validate`)
- **変数**: camelCase (例: `logTypes`, `filterText`)
- **定数**: UPPER_SNAKE_CASE (例: `DEFAULT_PORT`)

### ファイル構造
- ツールハンドラーは `handlers/` ディレクトリに配置
- 各ハンドラーは `BaseToolHandler` を継承
- 1ファイル1クラスの原則

### エラーハンドリング
- try-catchでエラーをキャッチ
- エラーレスポンスは `{ success: false, error: message }` 形式

## C#/Unity側 (unity-editor-mcp)

### 命名規則
- **クラス**: PascalCase (例: `ConsoleHandler`)
- **メソッド**: PascalCase (例: `EnhancedReadLogs`)
- **プライベートフィールド**: _camelCase (例: `_clearMethod`)
- **定数**: PascalCase または UPPER_SNAKE_CASE

### Unity特有のパターン
- Reflectionを使用した内部API アクセス
- `UnityEditor` 名前空間の活用
- `EditorPrefs` での設定管理

### ドキュメンテーション
- XMLコメント（`///`）でメソッドを文書化
- パラメータと戻り値の説明を含める

## 共通原則
- シンプルさを追求
- ユーザビリティを最優先
- エラーメッセージは明確に
- ログ出力は適切なレベルで