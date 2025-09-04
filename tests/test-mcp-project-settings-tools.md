# MCP プロジェクト設定 テスト計画（カテゴリ: ProjectSettings系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 変更前の設定値（例: `vSyncCount`）を必ず保存し、テスト終了時に元の値へ復元する。

## 正常系

- U110-01: `get_project_settings`（quality）→ `vSyncCount` を取得
- U110-02: `update_project_settings`（`confirmChanges=true`）で一時変更（0↔1）
- U110-03: 変更確認後に復元

## 異常系

- U110-E01: `confirmChanges=false` → セーフティで `fail`
- U110-E02: 不正値（`vSyncCount=-1`）→ バリデーション `fail`
