# リサーチログ: Unity AIエージェントウィンドウ

**機能ID**: `SPEC-85bab2a1`
**最終更新**: 2025-10-30

## サマリー
- 既存のターミナル仕様はアーカイブ済み。AIエージェント専用の体験を優先する。
- Unity側はUI ToolkitベースのチャットUI、新規セッション管理クラスが必要。
- Node側はMCPツール群を拡張し、Codex/Claude/カスタムツールへプロキシする設計が必要。
- 以下の論点は追加調査または意思決定が必要。

## 未解決の論点とアクション
| ID | テーマ | 状態 | 次のアクション |
|----|--------|------|----------------|
| RQ-1 | カスタムAIツールの登録/認証管理 | 完了 | Codex/Claudeはコード固定。カスタムツールのみ `.unity/config.json` の `aiAgents` で宣言する方針を採用 |
| RQ-2 | セッション情報の保持方針 (ワンショット vs 短期永続) | 調査中 | Unity/Node双方でのライフサイクル要件を整理し、最小限の永続化要否を判断する |
| RQ-3 | エージェント応答のストリーミング可否とUI更新戦略 | 調査中 | Node SDK / Unity UI Toolkit のサンプルを確認し、逐次描画の性能影響を測定する計画を立てる |
| RQ-4 | 実行ログの最大件数と保管ポリシー | 未着手 | チャットビューのパフォーマンス実測計画を作成し、ログサマリ圧縮の要否を検討する |
| RQ-5 | 既存ターミナルハンドラ資産の再利用範囲 | 調査済み | `mcp-server/src/handlers/terminal/*.js` でシェル実行ロジックが既に存在。AIエージェントのシェル操作はこれをラップして再利用する方針 |

## 調査ノート

### RQ-1: カスタムAIツール設定
- Codex/Claude Code はサーバー内で固定定義し、ユーザー設定は不要とする。
- `mcp-server/src/core/config.js` では `.unity/config.json` をマージする仕組みが既にあるため、カスタムツールのみ `aiAgents` 配列に記述する。
- シンプルなスキーマ案:
  ```json
  {
    "aiAgents": [
      {
        "id": "custom-doc-bot",
        "provider": "http",
        "endpoint": "https://example.com/agents/doc-bot",
        "capabilities": ["code"],
        "auth": { "type": "bearer", "tokenEnv": "DOC_BOT_TOKEN" },
        "metadata": { "label": "社内ドキュメント検索" }
      }
    ]
  }
  ```
- `aiAgents` が存在しない場合でも問題なく起動し、Codex/Claude の2件は常に利用可能とする。
- 将来的にUnity UIから登録させる場合は、このJSONを更新するスクリプト/ツールを別途検討する。

### RQ-2: セッション保持方針
- ユースケース: 実行中のビルドや長時間テストがある間はセッション維持が必要だが、Unity再起動を跨いでの復元は必須ではない。
- 最小要件として、Unity起動中のみメモリ管理で十分。Node側も同一プロセス内で完結させる。
- ただし、ログ参照のため一定件数を保存したい場合は `mcp-server` 側で短期キャッシュ (例: 最後のNセッション) を better-sqlite3 に書き出す案を検討。
- 永続化を採用する場合でも、デフォルトでは無効にし、設定でオンにできるようにする。

### RQ-3: ストリーミング応答
- Node側では @modelcontextprotocol/sdk がストリーミング対応 (`tool.handler.onChunk`) を提供していることを確認。Unity側で逐次反映する場合、UI Toolkit の `ListView` + `ScrollView` の最適化が必要。
- 仮リスク: 大量トークン出力でEditorがフリーズする可能性。`Dispatcher` 経由でチャンクをバッチ処理する案を検討。
- シンプル案: Node側でチャンクを一定長にまとめて送信し、Unityでは1フレームあたりのUI更新数を制限する。
- 旧ターミナルのTerminalReadはポーリング前提のため、本機能では push 型のイベント (Unity側 -> UI) を新設予定。

### RQ-5: ターミナルハンドラの再利用
- 既存ファイル: `mcp-server/src/handlers/terminal/TerminalOpenToolHandler.js` ほか3件。
- これらはシェル起動や標準入出力管理を既に実装しているため、AIエージェントの「シェル実行提案」は新規ツールから既存ハンドラを呼び出し、共通ログ整形レイヤーを挟む形にする。
- Unity側は旧ターミナルUIを利用しないが、プロセス管理ロジックの重複を避けられる。

## 参考コード
- `mcp-server/src/handlers/terminal/*.js` — シェル実行ロジックの再利用候補
- `UnityMCPServer/Packages/unity-mcp-server/Editor/Terminal/` — 旧ターミナルWindow実装。UI要件は異なるため直接流用しないが、Processラッパーの使い方を参考にする
- `CLAUDE.md` — 既存のエージェント向けインストラクション。新UI追加時に更新が必要

## 次のステップ (Phase 0 継続)
- [ ] RQ-2: メモリ管理案とキャッシュ案の利点・欠点を比較し、推奨方針を決定 — 2025-11-01 まで
- [ ] RQ-3: ストリーミング実装プロトタイプの検証 — Nodeハンドラで疑似チャンクを返すテストを作成
- [ ] RQ-4: ログ保持ポリシー案 (メッセージ数・クリッピング戦略) を提示
- [ ] research.md を更新し、未解決項目が解決したら `status=完了` に変更する
