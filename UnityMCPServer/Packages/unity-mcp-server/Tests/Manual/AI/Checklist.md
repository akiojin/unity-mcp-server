# Manual Test Checklist: AI Agent Window (SPEC-85bab2a1)

## 前提
- Unity MCP Server が起動し、`npm start` でMCPサーバーが待機状態。
- Unity Editor で `UnityMCPServer` プロジェクトを開いている。
- Codex / Claude のAPIキーが環境変数に設定済み。

## 基本フロー
1. Unityメニュー `Window > Unity MCP Server > AI Agent Window` を開く。
2. Codex を選択して「プレイヤー移動スクリプト」を質問 → 応答が表示されること。
3. エージェントが `npm test` を提案したら承認 → Pending Actions が `executing → succeeded` に変化し、ログが表示されること。
4. 「セッション終了」ボタンを押してウィンドウを閉じる。

## カスタムエージェント
1. `.unity/config.json` に `aiAgents[]` を追加しUnityを再起動。
2. ウィンドウを再度開き、カスタムエージェントがリストに表示されること。
3. カスタムエージェントでメッセージ送信が行えること。

## ストリーミング挙動
1. 長文応答を要求（例: `UnityEditorのAPI一覧を要約して`）。
2. チャンクが順番に表示され、スクロールが自動で追従すること。
3. 1000メッセージ/200KBを超えると要約ノードが表示されることを確認（疑似ログで可）。

## エラーハンドリング
1. Unityを閉じた状態で `UNITY_MCP_TEST_SKIP_UNITY=true node --test tests/integration/ai/*.test.js` を実行 → エラー系テストがすべて成功すること。
2. Unknown agent を指定して `ai_session_open` を呼び出すツール（例: 直接MCPコマンド）で `AGENT_NOT_FOUND` が返ること。

## キャッシュオプション
1. `.unity/config.json` の `"aiSessions": { "cache": { "enabled": true } }` を有効化。
2. Unityを終了・再起動後も直近セッションが復元されることを確認（SQLiteスナップショット）。

## レポート
- 手動テスト完了後は `docs/manual-test-report.md` 等に結果を追記して共有。
