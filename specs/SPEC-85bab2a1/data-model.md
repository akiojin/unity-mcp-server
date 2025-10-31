# データモデル: Unity AIエージェントウィンドウ

**機能ID**: `SPEC-85bab2a1`
**バージョン**: 2025-10-30

## エンティティ一覧

### AgentDefinition
| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|------|
| id | string | ✔ | エージェント識別子 (例: `codex`, `claude`, `custom-doc-bot`) |
| provider | enum(`openai`,`anthropic`,`http`,`local`) | ✔ | バックエンド種別 |
| model | string | ▲ | プロバイダがモデル指定を要求する場合に設定 (Codex/Claude 等) |
| endpoint | string | ▲ | HTTPベースのカスタムAI先を指すURL |
| capabilities | array<string> | ✔ | 提供する機能 (`code`,`shell`,`test`) |
| isDefault | bool | ✔ | 初期選択するエージェントかどうか |
| authRef | string | ▲ | 認証情報の参照キー (環境変数名など) |
| metadata | map | ▲ | ラベル・説明文などUI表示用の付加情報 |

※ Codex/Claude はコード側で固定登録、カスタムエージェントは `.unity/config.json` の `aiAgents[]` から読み込む。

### AgentSession
| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|------|
| sessionId | string | ✔ | UUIDベースのセッションID |
| agentId | string | ✔ | 利用する `AgentDefinition.id` |
| createdAt | datetime | ✔ | セッション開始時刻 |
| status | enum(`open`,`executing`,`closed`,`error`) | ✔ | 現在ステータス |
| pendingActionId | string | ▲ | 承認待ちの `ActionRequest.actionId` |
| lastActivityAt | datetime | ✔ | 最後にメッセージ/実行があった時刻 |
| workspacePath | string | ▲ | 参照中の作業ディレクトリ (workspace/project) |
| isCached | bool | ✔ | `aiSessions.cache` オプションで永続化対象かどうか |

### SessionMessage
| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|------|
| messageId | string | ✔ | メッセージID (UUID) |
| sessionId | string | ✔ | 親セッションID |
| sender | enum(`user`,`agent`,`system`) | ✔ | 発信主体 |
| content | string | ✔ | 表示用テキスト本文 |
| rawTokens | number | ▲ | AI応答のトークン数 (コスト推定用) |
| createdAt | datetime | ✔ | 生成時刻 |
| attachments | array<object> | ▲ | 生成コード、リンク、ログ断片など |
| collapsed | bool | ✔ | ログ上限超過時に要約表示されているか |

### ActionRequest
| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|------|
| actionId | string | ✔ | アクションID |
| sessionId | string | ✔ | 対象セッション |
| type | enum(`code_generate`,`test_run`,`shell_command`) | ✔ | 操作区分 |
| payload | object | ✔ | 実行内容 (例: コマンド、生成対象パス、引数) |
| status | enum(`pending`,`approved`,`executing`,`succeeded`,`failed`,`cancelled`) | ✔ | 実行状態 |
| requestedBy | enum(`agent`,`user`) | ✔ | 提案者 |
| approvedBy | enum(`user`,`auto`) | ▲ | 承認主体 |
| startedAt | datetime | ▲ | 実行開始時刻 |
| completedAt | datetime | ▲ | 実行完了時刻 |
| resultSummary | string | ▲ | 成功時の主要結果 (例: テスト件数、生成ファイルパス) |
| errorDetail | string | ▲ | 失敗時のエラー要約 |

### ExecutionLogEntry (短期キャッシュ専用)
| フィールド | 型 | 必須 | 説明 |
|-----------|----|------|------|
| logId | string | ✔ | ログ行ID |
| actionId | string | ✔ | 紐づくアクションID |
| order | number | ✔ | ログ順序 (昇順) |
| text | string | ✔ | ログ本文 (行単位) |
| createdAt | datetime | ✔ | 記録時刻 |

`ExecutionLogEntry` は `aiSessions.cache.enabled = true` のときだけ better-sqlite3 に保存し、通常はメモリ上のリングバッファで管理する。

## リレーション
- `AgentDefinition` 1 : n `AgentSession`
- `AgentSession` 1 : n `SessionMessage`
- `AgentSession` 1 : n `ActionRequest`
- `ActionRequest` 1 : n `ExecutionLogEntry`

## データ制約・ドメインルール
- 1ユーザーセッションあたり表示上限は 1000 メッセージ or 200KB。閾値超過で古い `SessionMessage` を要約し `collapsed=true` を設定。
- `ActionRequest` は `status=pending` の間、ユーザー操作で承認/却下が行える。承認なしで `executing` へ遷移させない。
- `ExecutionLogEntry` は最大 500 件/アクションまで保持し、閾値超過時は先頭から削除。
- `AgentSession` の `isCached=false` の場合はUnity終了とともに破棄。`true` の場合のみSQLiteへスナップショット保存。
- カスタムAIは `.unity/config.json` の `aiAgents[]` 定義に従い、必須フィールド `id`,`provider`,`capabilities` をチェックする。

## 状態遷移 (ActionRequest)
```
pending --(user approve)--> approved --(execution start)--> executing --(success)--> succeeded
                                           \--(error)--> failed
pending --(user reject)--> cancelled
pending --(user cancel)--> cancelled
executing --(user cancel)--> cancelled
```

## 永続化
- 既存の better-sqlite3 コードインデックスDBとは別に、`aiSessions` 用のテーブル群をオプションで追加予定。
- 標準設定では永続化しないため、Nodeプロセス内のMapとリングバッファで管理。
- 永続化を有効にした場合は以下テーブルを想定:
  - `ai_sessions(session_id PK, agent_id, status, created_at, last_activity_at, workspace_path, is_cached)`
  - `ai_session_messages(message_id PK, session_id FK, sender, content, raw_tokens, created_at, collapsed)`
  - `ai_action_requests(action_id PK, session_id FK, type, payload_json, status, requested_by, approved_by, started_at, completed_at, result_summary, error_detail)`
  - `ai_action_logs(log_id PK, action_id FK, order_index, text, created_at)`

## 監査・ログ
- 構造化ログ: `sessionId`, `agentId`, `actionId`, `event` (`message`, `action_started`, `action_completed`, `chunk_received`) を必須フィールドとする。
- エラー時は `errorCode` と `errorMessage` を出力し、ユーザーにフレンドリーなメッセージを別途表示。

