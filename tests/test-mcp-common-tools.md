# MCP 共通ユーティリティ テスト計画（カテゴリ: Common）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。

前提:
- エディタは起動済み、`isPlaying=false`
- Node 側は全コマンドに `workspaceRoot` を付与

チェックリスト（Markdown）
- [ ] U00-01: playmode_get_state（isPlaying=false）
- [ ] U00-02: settings_get（player/quality/graphics）
- [ ] U00-03: system_get_command_stats（集計）
- [ ] U00-E01: playmode_wait_for_state（isPlaying=true, timeoutMs=1）で TIMEOUT（fail）
- [ ] U00-E02: settings_get（未知フラグ）でバリデーション fail

## 正常系

- U00-01: `playmode_get_state` → `isPlaying=false`
- U00-02: `settings_get`（player/quality/graphics）→ 取得成功
- U00-03: `system_get_command_stats` → 集計取得

## 異常系

- U00-E01: `playmode_wait_for_state`（`isPlaying=true`, `timeoutMs=1`）→ タイムアウト
- U00-E02: `settings_get` に未知フラグ → バリデーションエラー
