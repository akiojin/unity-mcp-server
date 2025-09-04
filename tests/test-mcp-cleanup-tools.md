# MCP クリーンアップ テスト計画（カテゴリ: Cleanup系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 本カテゴリは最終的な安全網だが、各カテゴリ/各テストケース自身で原状回復を完了させること（本カテゴリは残存物の最終清掃）。

対象:
- ゲームオブジェクト: `/LLMTEST_*`
- アセット: `Assets/LLMTEST_*`

## 正常系

- U170-01: `delete_gameobject`（`/LLMTEST_Cube`, `/LLMTEST_Cube_Instance`）→ 削除
- U170-02: `manage_asset_database`（`action=delete` で `Assets/LLMTEST_*` を順次）→ 削除

## 異常系

- U170-E01: 不在対象の再削除 → `skip` または `fail`
