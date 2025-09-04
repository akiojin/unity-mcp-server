# MCP エディタ状態/再生/ポーズ テスト計画（カテゴリ: Play/Pause系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- テスト終了時は必ず `stop_game` で `isPlaying=false` の静止状態に戻す。

チェックリスト（Markdown）
- [ ] U120-01: play_game → wait_for_editor_state(isPlaying=true)
- [ ] U120-02: pause_game → get_editor_state
- [ ] U120-03: stop_game → wait_for_editor_state(isPlaying=false)
- [ ] U120-E01: 短すぎる timeoutMs で TIMEOUT（fail）

## 正常系

- U120-01: `play_game` → `wait_for_editor_state(isPlaying=true)`
- U120-02: `pause_game` → `get_editor_state`
- U120-03: `stop_game` → `wait_for_editor_state(isPlaying=false)`

## 異常系

- U120-E01: 短すぎる `timeoutMs` で待機 → タイムアウト `fail`
