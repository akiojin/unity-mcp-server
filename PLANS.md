# Implementation Plan (HTTP mode, Multi-instance CLI, Unity GUI Samples)

## 0. 方針
- 順序: HTTP/テレメトリ (SPEC-a28f3f95) → マルチインスタンスCLI (SPEC-911befe7) → Unity GUI + サンプル (SPEC-4ebff657)
- すべて TDD: contract/integration/unit → 実装 → ポリッシュ
- 互換性最優先: 既存 stdio/TCP 挙動を壊さない、外向き通信はデフォルト無効

## 1. SPEC-a28f3f95 (HTTP/テレメトリ)
- テスト先行: `tests/contract/http-health.test.js`, `tests/integration/http-mode.test.js`, `tests/unit/core/httpServer.test.js`, `tests/unit/core/telemetry.test.js`
- 実装: `src/core/httpServer.js` 新規、`src/core/server.js` に HTTP 起動オプション追加、CLI/README へ --http & telemetry 追記
- ポート競合処理: EADDRINUSE 捕捉し代替ポート提案をログ
- Done条件: ヘルスチェック200、外向き通信0件、代替ポートガイド出力

## 2. SPEC-911befe7 (マルチインスタンス CLI)
- テスト先行: `tests/integration/instances.test.js`（list→set-active）、`tests/unit/core/instanceRegistry.test.js`, `tests/unit/cli/set-active.test.js`
- 実装: `src/core/instanceRegistry.js`、CLI コマンド `listInstances.js` / `setActive.js`、server 状態への反映
- タイムアウト ≤1s で疎通不可を即エラー; 出力は表/JSON 両対応
- Done条件: 5回連続切替で誤送信ゼロ、停止先は1秒以内にエラー

## 3. SPEC-4ebff657 (Unity GUI + サンプル)
- テスト先行: `Editor/ServerWindowTests.cs`, `Editor/SampleWorkflowsTests.cs`（副作用＆クリーンアップ）
- 実装: `Editor/McpServerWindow.cs`, `Editor/MenuItems.cs`, `Editor/SampleWorkflows.cs`; npx 呼び出しで Start/Stop; Addressables サンプルの一時グループ
- Play中無効化/警告、Telemetry/HTTP トグルの反映、ログ表示20行
- Done条件: Start/Stop 3回成功、Scene/Addressables サンプルが1クリックで成功し後処理完了

## 4. クロスカット
- ドキュメント: README/Quickstart へ HTTP, CLI, GUI 手順を追加
- ロギング: すべての新機能で人間可読な EN/JA メッセージ
- QA: manual smoke (HTTPヘルス3回, CLI切替5回, GUI Start/Stop+サンプル)

## 5. ブランチ/PR
- 作業ブランチ: feature/compare-mcp
- 既存PR: https://github.com/akiojin/unity-mcp-server/pull/165
