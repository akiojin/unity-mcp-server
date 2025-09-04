# テスト ToDo テンプレート

本テンプレートをコピーして、カテゴリごとの ToDo を作成してください。保存先は `tests/.todo/<category>-<YYYYMMDD_HHmmss>.md` 推奨です。

Markdown 例（状態は都度書き戻し）
- [ ] S00-00: 前提チェック（.sln 必須） — lastUpdated: 2025-01-01T12:00:00Z
- [ ] S10-01: script_symbols_get で FinalTestClass 確認 — lastUpdated: 2025-01-01T12:00:00Z
- [ ] S20-01: replace_body（TestMethod12 を 99 に） — lastUpdated: 2025-01-01T12:00:00Z

ステータス定義
- `pending`: 未着手
- `in_progress`: 実行中（同時に 1 件のみ推奨）
- `completed`: 実行完了（レポートにも反映済み）
- `blocked`: 実行不能（`reasonCode` をレポートにも記載）

運用ルール
- 各ケース開始時に `in_progress`、終了時に `completed`（または `blocked`）。状態変更のたびにファイルへ即時書き戻し（バッチ更新不可）。
- チェックリストのチェック状態（[ ] / [x]）は `completed` に同期させる。

実装ヒント
- 競合・破損回避のため、一時ファイルへ書き出してからアトミックに rename する方式を推奨（例: `<file>.tmp` → `<file>`）。

実装ヒント
- 競合・破損回避のため、一時ファイルへ書き出してからアトミックに rename する方式を推奨（例: `<file>.tmp` → `<file>`）。
