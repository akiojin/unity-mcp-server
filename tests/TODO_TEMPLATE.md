# テスト ToDo テンプレート

本テンプレートをコピーして、カテゴリごとの ToDo を作成してください。保存先は `tests/.todo/<category>-<YYYYMMDD_HHmmss>.json` 推奨です。

JSON 例（`lastUpdated` は状態変更ごとに更新、`history` に遷移ログを保持可能）
```json
{
  "category": "<category>",
  "todos": [
    {"id":"<testId>","name":"<name>","status":"pending","assignee":"<optional>",
     "lastUpdated":"<ISO>",
     "history":[{"at":"<ISO>","from":null,"to":"pending"}]}
  ]
}
```

Markdown 例
- [ ] <testId>: <name>

ステータス定義
- `pending`: 未着手
- `in_progress`: 実行中（同時に 1 件のみ推奨）
- `completed`: 実行完了（JSONL にも出力済み）
- `blocked`: 実行不能（`reasonCode` を JSONL のケース行に出力）

運用ルール
- 各ケース開始時に `in_progress`、終了時に `completed`（または `blocked`）。状態変更のたびにファイルへ即時書き戻し（バッチ更新不可）。
- JSONL の `testId` と ToDo の `id` を一致させ、集計時に突合可能とする。

実装ヒント
- 競合・破損回避のため、一時ファイルへ書き出してからアトミックに rename する方式を推奨（例: `<file>.tmp` → `<file>`）。
