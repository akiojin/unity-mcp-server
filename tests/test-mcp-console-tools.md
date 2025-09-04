# MCP コンソール テスト計画（カテゴリ: Console系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- 対象ファイル: <相対パス一覧>` を記載（カテゴリ横断で合算、重複排除）。
- 本カテゴリ見出し直後に `- 対象ファイル: <当カテゴリで操作・参照したファイル>` を1行で記載。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `UnityMCP__read_console` 前後でログ件数/最新時刻/フィルタ結果を比較。
- 構造検証: ログ種別（Error/Warning/Info）やフィルタ適用の有無を確認。
- 参照検証: 期待したエラーメッセージID/キーワードの出現有無を確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- クリア実行後は必要に応じてログを再度生成するなど、他テストへの影響が出ないように順序・分離を保つ。

チェックリスト（Markdown）
- [ ] U80-01: read_console（count=50）
- [ ] U80-02: clear_console（preserveErrors/Warnings=true）
- [ ] U80-E01: 不正 logTypes 値で fail

## 正常系

- U80-01: `read_console`（`count=50`）→ 直近ログ取得
- U80-02: `clear_console`（`preserveErrors=true`, `preserveWarnings=true`）→ エラー/警告保持

## 異常系

- U80-E01: 不正 `logTypes` 値 → `fail`
