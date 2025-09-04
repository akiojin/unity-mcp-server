# MCP エディタ状態/再生/ポーズ テスト計画（カテゴリ: Play/Pause系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- 対象ファイル: <相対パス一覧>` を記載（カテゴリ横断で合算、重複排除）。
- 本カテゴリ見出し直後に `- 対象ファイル: <当カテゴリで操作・参照したファイル>` を1行で記載。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `UnityMCP__get_editor_state` の `isPlaying` 等の前後比較。
- 構造検証: 再生/停止中のログや Animator/Update の動作で補助確認。
- 参照検証: `UnityMCP__read_console` によるステート遷移ログの有無を確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

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
