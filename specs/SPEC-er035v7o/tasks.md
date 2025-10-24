# タスク分解: Unity接続設定の分離

**機能ID**: `SPEC-er035v7o`
**作成日**: 2025-10-17
**ステータス**: 完了

## 実装状況

本機能は既に実装済みです。すべてのタスクが完了しています。

### 完了済みタスク

#### Setup
- [x] `.unity/config.json` の現状を確認し、更新方針を明確化

#### Test
- [x] `mcpHost` / `unityHost` の読み込みと旧キーからのフォールバック挙動を検証するユニットテストを追加 (RED)

#### Core
- [x] 設定モジュールを `unity.mcpHost` / `unity.unityHost` ベースに更新 (GREEN)
- [x] Unity 接続処理で新プロパティを使用するよう更新 (GREEN)

#### Integration
- [x] README（英/日）を更新し設定の分離と移行例を反映 (REFACTOR)

#### Polish
- [x] `.unity/config.json` サンプル値とコードコメントの整合性を確認

## 参考

- 実装: `mcp-server/src/core/config.js:128-154` (normalizeUnityConfig)
- Unity接続: `mcp-server/src/core/unityConnection.js:43`
- テスト: `mcp-server/tests/unit/core/config.test.js:32-239`
- ドキュメント: `README.md`, `README.ja.md`
