# タスク: Unity AIエージェントウィンドウ

**入力**: `/specs/SPEC-85bab2a1/`の設計ドキュメント
**前提条件**: plan.md, research.md, data-model.md, contracts/

## Phase 3.1: セットアップ
- [x] T001 UnityMCPServer/Packages/unity-mcp-server/Editor/AI/ と Tests/Editor/AI/ ディレクトリを作成し、既存 asmdef にパスを追加する
- [x] T002 [P] mcp-server/tests/integration/ai/ フォルダを作成し、共通ユーティリティ `mcp-server/tests/integration/ai/aiTestUtils.js` を追加する

## Phase 3.2: テストファースト (TDD)
- [x] T003 [P] `mcp-server/tests/integration/ai/ai-session-open.test.js` に ai_session_open の contract test を追加
- [x] T004 [P] `mcp-server/tests/integration/ai/ai-session-message.test.js` に ai_session_message の contract test を追加
- [x] T005 [P] `mcp-server/tests/integration/ai/ai-session-execute.test.js` に ai_session_execute の contract test を追加
- [x] T006 [P] `mcp-server/tests/integration/ai/ai-session-close.test.js` に ai_session_close の contract test を追加
- [x] T007 [P] `mcp-server/tests/integration/ai/ai-stream-chunk.test.js` にストリーミングチャンクの contract test を追加
- [x] T008 [P] `UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/AI/AgentSessionTests.cs` に AgentSession/Manager の EditMode テストを追加
- [x] T009 [P] `UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/AI/ActionRequestTests.cs` に ActionRequest ワークフローのテストを追加
- [x] T010 [P] `UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/AI/ChatWindowTests.cs` にチャットUIのストリーミング更新テストを追加

## Phase 3.3: コア実装
- [x] T011 `mcp-server/src/core/config.js` に `config.aiAgents` と `aiSessions.cache` の読み込み/バリデーションを追加
- [x] T012 `mcp-server/src/handlers/index.js` にAIセッションツール登録を追加
- [x] T013 `mcp-server/src/handlers/ai/AiSessionOpenHandler.js` を実装し、Unityへのセッション開始コマンドを送信
- [x] T014 `mcp-server/src/handlers/ai/AiSessionMessageHandler.js` を実装し、ストリーミング購読を開始
- [x] T015 `mcp-server/src/handlers/ai/AiSessionExecuteHandler.js` を実装し、コード/テスト/シェルのディスパッチとログ記録を行う
- [x] T016 `mcp-server/src/handlers/ai/AiSessionCloseHandler.js` を実装し、トランスクリプト保存とクリーンアップを行う
- [x] T017 `mcp-server/src/handlers/ai/AiStreamDispatcher.js` を実装し、Unityへの `ai_stream_chunk` push 通知を処理
- [x] T018 `mcp-server/src/utils/aiSessionLogger.js` を追加し、構造化ログを共通出力
- [x] T019 `UnityMCPServer/Packages/unity-mcp-server/Editor/AI/AgentDefinitionLoader.cs` を実装し、内蔵エージェントと `aiAgents` 設定をマージ
- [x] T020 `UnityMCPServer/Packages/unity-mcp-server/Editor/AI/AgentSessionManager.cs` を実装し、セッションとアクションの状態管理を行う
- [x] T021 `UnityMCPServer/Packages/unity-mcp-server/Editor/AI/StreamingBuffer.cs` を実装し、チャンクキューと1フレーム処理上限を制御
- [x] T023 `UnityMCPServer/Packages/unity-mcp-server/Editor/AI/AIChatWindow.cs` を実装し、送受信/承認UIと SessionManager を接続
- [x] T024 `UnityMCPServer/Packages/unity-mcp-server/Editor/AI/ActionRequestController.cs` を実装し、実行提案の承認/取消しフローを提供

## Phase 3.4: 統合
- [x] T025 `UnityMCPServer/Packages/unity-mcp-server/Editor/Handlers/` に AI 用コマンドハンドラを追加し、Node からの `ai_stream_chunk` を受信して StreamingBuffer に流し込む
- [x] T026 `mcp-server/tests/integration/ai/ai-session-error.test.js` にエラーパス (未登録エージェント、WSL変換失敗など) のテストを追加
- [ ] T027 `mcp-server/tests/e2e/ai-window.e2e.test.js` に open→message→execute→close を実機(Unity)で検証する E2E テストを追加
- [ ] T028 `UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/AI/AIChatWindowStreamingTests.cs` にストリーミング負荷テスト (バッチ処理) を追加

## Phase 3.5: 仕上げ
- [x] T029 `mcp-server/src/core/server.js` と `UnityMCPServer/Packages/unity-mcp-server/Editor/AI/` にAIセッション用構造化ログ出力を追加
- [x] T030 [P] `CLAUDE.md` と `README.md` を更新し、AIエージェントウィンドウの利用方法を追記
- [x] T031 [P] `specs/SPEC-85bab2a1/quickstart.md` を最新UIスクリーンショットとキャッシュ設定の注意書きで更新
- [ ] T032 [P] manual テスト手順を `UnityMCPServer/Packages/unity-mcp-server/Tests/Manual/AI/Checklist.md` に追加してQA観点を整理

## 依存関係
- T001 が Unity側全タスク (T008以降) をブロック
- T002 が Node側テストタスク (T003〜T007, T026, T027) をブロック
- T003〜T008 が Node/Unity 実装タスク (T011〜T025) をブロック
- T021 が T023, T024, T028 をブロック
- T025 が T027, T028 をブロック
- T027 完了後に T029〜T032 を実行

## 並列実行例
```
# contract testsを並列実行
Task: T003 mcp-server/tests/integration/ai/ai-session-open.test.js に contract test
Task: T004 mcp-server/tests/integration/ai/ai-session-message.test.js に contract test
Task: T005 mcp-server/tests/integration/ai/ai-session-execute.test.js に contract test
Task: T006 mcp-server/tests/integration/ai/ai-session-close.test.js に contract test
Task: T007 mcp-server/tests/integration/ai/ai-stream-chunk.test.js にストリーミングテスト

# Unity側モデルテストを並列実行
Task: T008 UnityMCPServer/.../AgentSessionTests.cs
Task: T009 UnityMCPServer/.../ActionRequestTests.cs
Task: T010 UnityMCPServer/.../ChatWindowTests.cs
```
