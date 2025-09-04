# MCP 共通ユーティリティ テスト計画（カテゴリ: Common）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。

前提:
- エディタは起動済み、`isPlaying=false`
- Node 側は全コマンドに `workspaceRoot` を付与

チェックリスト（Markdown）
- [ ] U00-01: get_editor_state（isPlaying=false）
- [ ] U00-02: get_project_settings（player/quality/graphics）
- [ ] U00-03: get_command_stats（集計）
- [ ] U00-E01: wait_for_editor_state（isPlaying=true, timeoutMs=1）で TIMEOUT（fail）
- [ ] U00-E02: get_project_settings（未知フラグ）でバリデーション fail

## 正常系

- U00-01: `get_editor_state` → `isPlaying=false`
- U00-02: `get_project_settings`（player/quality/graphics）→ 取得成功
- U00-03: `get_command_stats` → 集計取得

## 異常系

- U00-E01: `wait_for_editor_state`（`isPlaying=true`, `timeoutMs=1`）→ タイムアウト
- U00-E02: `get_project_settings` に未知フラグ → バリデーションエラー
