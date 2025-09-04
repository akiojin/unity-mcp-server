# MCP パッケージ/アセット/インポート テスト計画（カテゴリ: Assets系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 取得/検索系は非破壊に。検証で作成した一時アセットはテスト終了時に削除。

## 正常系

- U90-01: `package_manager`（`action=list`, `includeBuiltIn=false`）→ 一覧取得
- U90-02: `manage_asset_database`（`action=find_assets`, `filter=t:Texture2D`）→ 検索
- U90-03: `manage_asset_import_settings`（`action=get`）→ 1件の設定取得

## 異常系

- U90-E01: 無効 `filter` → `fail`
- U90-E02: 存在しない `assetPath` → `fail`
