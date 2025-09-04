# MCP コンソール テスト計画（カテゴリ: Console系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

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
