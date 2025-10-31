# クイックスタート: Unity AIエージェントウィンドウ

この手順は5分以内にAIエージェントウィンドウを体験するためのガイドです。

## 前提条件
1. Unity MCP Server が起動できる環境 (Node.js 18以上)。
2. `.unity/config.json` に `project.root` が設定済み。
3. Codex/Claude用APIキーを環境変数 (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) に設定済み。

## ステップ 1: MCPサーバーを起動
```bash
cd mcp-server
npm install
npm start
```
サーバーログに `Unity Editor MCP` が待機中であることを確認します。

## ステップ 2: UnityでAIウィンドウを開く
1. Unity Editor を起動。
2. メニュー `Window > Unity MCP Server > AI Agent Window` を選択。
3. Codex または Claude がデフォルトエージェントとして表示されることを確認。

## ステップ 3: 会話してみる
1. チャット入力欄に「プレイヤー移動スクリプトの例を教えて」と入力し、送信。
2. 数秒以内にエージェントから応答が表示され、コードサンプルが提示されます。

## ステップ 4: コマンド実行を承認
1. エージェントが `npm test` 実行を提案した場合、「承認」ボタンを押します。
2. 進捗ログがストリーミング表示され、完了後に成功/失敗ステータスが記録されます。

## ステップ 5: カスタムAIを追加 (任意)
`.unity/config.json` に以下を追記し、Unityを再起動します。
```json
{
  "aiAgents": [
    {
      "id": "custom-doc-bot",
      "provider": "http",
      "endpoint": "https://example.com/agents/doc-bot",
      "capabilities": ["code"],
      "auth": { "type": "bearer", "tokenEnv": "DOC_BOT_TOKEN" }
    }
  ]
}
```
再度ウィンドウを開くと、カスタムエージェントが選択肢に追加されます。

## ステップ 6: セッションを終了
1. ウィンドウの「セッション終了」ボタンを押します。
2. 必要に応じてログを保存し、ウィンドウを閉じます。

## 追加ヒント
- ログは最大 1000 メッセージ / 200KB まで保持され、それ以上は要約表示に折りたたまれます。
- 長時間実行コマンドはバックグラウンドで継続し、完了時に通知されます。
