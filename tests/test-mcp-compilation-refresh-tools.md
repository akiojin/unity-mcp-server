# MCP コンパイル/リフレッシュ テスト計画（カテゴリ: Compilation/Refresh系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- リフレッシュ/コンパイルは非破壊だが、他カテゴリと干渉しないタイミングで実施し副作用が残らないようにする。

チェックリスト（Markdown）
- [ ] U160-01: system_refresh_assets（完了）
- [ ] U160-02: compilation_get_state（includeMessages=true, エラー0）
- [ ] U160-E01: 無効 maxMessages（負数）で fail

## 正常系

- U160-01: `system_refresh_assets` → 完了
- U160-02: `compilation_get_state`（`includeMessages=true`）→ `isCompiling=false`・エラー0（なければ `fail`）

## 異常系

- U160-E01: 無効 `maxMessages`（負数）→ `fail`
