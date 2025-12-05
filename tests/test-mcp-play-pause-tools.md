# MCP エディタ状態/再生/ポーズ テスト計画（カテゴリ: Play/Pause系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-play-pause-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-play-pause-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `playmode_get_state` の `isPlaying` 等の前後比較。
- 構造検証: 再生/停止中のログや Animator/Update の動作で補助確認。
- 参照検証: `console_read` によるステート遷移ログの有無を確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- テスト終了時は必ず `playmode_stop` で `isPlaying=false` の静止状態に戻す。

チェックリスト（Markdown）
- [ ] U120-01: playmode_play → playmode_wait_for_state(isPlaying=true)
- [ ] U120-02: playmode_pause → playmode_get_state
- [ ] U120-03: playmode_stop → playmode_wait_for_state(isPlaying=false)
- [ ] U120-E01: 短すぎる timeoutMs で TIMEOUT（fail）

## 正常系

- U120-01: `playmode_play` → `playmode_wait_for_state(isPlaying=true)`
- U120-02: `playmode_pause` → `playmode_get_state`
- U120-03: `playmode_stop` → `playmode_wait_for_state(isPlaying=false)`

## 異常系

- U120-E01: 短すぎる `timeoutMs` で待機 → タイムアウト `fail`
