# 実装計画: Unity AIエージェントウィンドウ

**機能ID**: `SPEC-85bab2a1` | **日付**: 2025-10-30 | **仕様**: specs/SPEC-85bab2a1/spec.md
**入力**: `/specs/SPEC-85bab2a1/spec.md` の機能仕様

## 概要
Unity Editor内にAIエージェント用チャットウィンドウを追加し、Codex/Claude Code/カスタムAIツールと対話しながらコード生成・テスト実行・シェル操作を完結させる。既存のUnity MCP Server（Node.js）とUnityパッケージを拡張し、複数セッションを並行維持しつつ実行結果をチャットログとして可視化する。成功基準は初回応答5秒以内、主要コマンド実行結果の95%以上記録、UI応答遅延1秒以内、カスタムツールの即時反映などを満たすこと。

## 技術コンテキスト
**言語/バージョン**: C# (Unity 2022 LTS想定), Node.js 20 (最低18)  
**主要依存関係**: UnityEditor UI Toolkit/EditorWindow, System.Diagnostics.Process, @modelcontextprotocol/sdk, better-sqlite3  
**ストレージ**: 既存のbetter-sqlite3コードインデックス (新規永続化は不要)  
**テスト**: Unity Test Framework (EditMode), Node.js `node --test` によるintegration/e2e  
**対象プラットフォーム**: Unity Editor (Windows/macOS/Linux)  
**プロジェクトタイプ**: single (Unityパッケージ + MCPサーバーの二層構成、追加プロジェクトは増やさない)  
**パフォーマンス目標**: 初回応答平均5秒以内、UI操作は1秒以内、並列セッション5件以上継続  
**制約**: オフラインでは会話不可、TTY制御不可、UnityメインスレッドでUI更新、外部AI APIのレート制限順守  
**スケール/スコープ**: 同時セッション5–10想定、主要AIプロバイダ3種類 + 任意カスタムツール

## 憲章チェック
**シンプルさ**:
- プロジェクト数: 2 (Unityパッケージ, MCPサーバー) に限定
- フレームワークはUnity標準UIと@modelcontextprotocol/sdkを直接利用し追加レイヤーを導入しない
- データモデルは「セッション」「エージェント」「アクションリクエスト」の3種に絞りDTOを増やさない
- Repository/UoWなど抽象パターンは導入せずシンプルなサービスクラスで処理

**アーキテクチャ**:
- 既存ライブラリ (Unityパッケージ, MCPサーバー) を継続利用。新規ライブラリ追加は最小限 (必要ならUI補助クラスのみ)
- CLI追加予定なし。MCPサーバーの既存ツール登録に追記する形で保持
- ドキュメントは spec/plan/research/quickstart に集約し、llms.txt等の新規ファイルは必要時のみ

**テスト (妥協不可)**:
- RED→GREEN→Refactorを徹底。新規テストは失敗させてから実装
- gitコミット順はテスト→実装→リファクタリングの順序を死守
- 契約→統合→E2E→ユニットの順で作成し、倒さない限り次に進まない
- 実システム (Unity, Node) を用いたintegration/e2eを準備。モックは最小限
- 新しいAIセッションAPI、ログ保存など共有契約はintegrationテスト対象に含める

**可観測性**:
- MCPサーバー側に構造化ログ (sessionId, agent, action, duration, status) を追加
- Unityウィンドウでも主要イベントをEditorConsoleへ出力し、Nodeログと突合しやすくする
- エラー時はユーザー向けメッセージと詳細ログ (デバッグ用) の両方を残す

**バージョニング**:
- パッケージバージョンはMAJOR.MINOR.PATCHを維持し、機能導入でMINOR、修正でPATCHを予定
- 破壊的変更を避ける。既存ターミナル関連APIと互換性を確認し、差分がある場合は移行手順をquickstartに記載

## プロジェクト構造
```
specs/SPEC-85bab2a1/
├── spec.md        # 機能仕様 (作成済)
├── plan.md        # 本ファイル
├── research.md    # Phase 0で作成
├── data-model.md  # Phase 1で作成
├── quickstart.md  # Phase 1で作成
└── contracts/     # Phase 1でAPI/プロトコル定義

UnityMCPServer/Packages/unity-mcp-server/Editor/
└── AI/            # 新規フォルダ (Window/UI/Sessions)

UnityMCPServer/Packages/unity-mcp-server/Tests/Editor/
└── AI/            # EditModeテスト群

mcp-server/src/handlers/ai/
└── *.js           # 新規AIハンドラ (open/execute/logging 等)

mcp-server/tests/integration/ai-
└── *.test.js      # MCPツール契約テスト
```
構造決定: 既存リポジトリに単一プロジェクトとして追加。Unity側とNode側の2コンポーネント拡張のみで、frontend/backendなどの新ディレクトリは増やさない。

## Phase 0: アウトライン＆リサーチ
1. 未確定事項:
   - カスタムAIツールの登録/設定方法 (既存設定ファイルか新規UIか)  
   - 複数セッション管理の永続化要否とID生成規則  
   - Node側とUnity側でのストリーミング応答の扱い (逐次表示か完了後一括か)  
   - 実行ログの保持期間と最大サイズ (チャット表示性能に影響)
2. リサーチタスク例:
   - Unity UI Toolkitでチャットログを高頻度更新する際のベストプラクティス調査  
   - MCP Serverで複数AIプロバイダを切り替える設計事例調査  
   - AI提案を人間確認後に実行させるUXパターン (確認ダイアログ/アクションキュー)
3. `research.md` には決定/理由/代替案を記載。要明確化事項が残らない状態にする。

## Phase 1: 設計＆契約
1. `data-model.md`:
   - セッション (id, agentType, createdAt, status, pendingAction)  
   - メッセージ (sessionId, sender, content, timestamp, attachments)  
   - アクションリクエスト (type: code/test/shell, payload, approvalStatus, result)  
   - エージェント設定 (id, description, capabilities, authRef)
2. `/contracts/`:
   - MCPツール: `ai_session_open`, `ai_session_message`, `ai_session_execute`, `ai_session_close` 等の入出力スキーマ  
   - Unity EditorとのIPC契約: ScriptableObject/JSONでのセッション通知フォーマット  
   - エージェント登録仕様 (config JSON 形式)
3. テスト骨子:
   - MCP integration tests: open→message→execute→logのhappy/エラー系  
   - Unity EditMode: セッション生成、メッセージ表示、長文出力の処理  
   - 非同期シナリオ: 実行中のステータス更新、失敗時リトライ
4. `quickstart.md`:
   - APIキー設定→Unityメニュー起動→初回会話→コマンド実行の手順（5分以内）
5. エージェントファイル更新: `CLAUDE.md` など必要なContextファイルに新UI/操作を追記。

## Phase 2: タスク計画アプローチ
- `/templates/tasks-template.md` をベースに、Phase1成果から以下のカテゴリでタスク化:
  - Setup: Node/Unity双方でAIハンドラディレクトリ作成、設定ファイルのスケルトン  
  - Contract tests: 各MCPツール用のREDテスト  
  - Unity models: Session/Message/Actionクラスと対応テスト  
  - Unity UI: Chat window, message renderer, execution approval UI  
  - Node handlers: open/message/execute/close + structured logging  
  - Integration/E2E: 複数セッション並列、失敗系、カスタムAIツール確認  
  - Polish: エラーハンドリング、進捗表示、ログ整形
- 順序: 契約テスト → Unity/Node基盤 → UI/実行処理 → 統合 → E2E → Polish。独立ファイル作業は[P]マークで並列化。

