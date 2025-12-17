# MCP レイヤー/タグ テスト計画（カテゴリ: Layers/Tags系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 追加したレイヤー/タグはテスト終了時に削除（元の設定に戻す）。

チェックリスト（Markdown）
- [ ] L10-01: manage_layers（action=get）→ 一覧取得
- [ ] L10-02: manage_layers（action=add, layerName=LLMTEST_Layer）→ 追加
- [ ] L10-03: manage_layers（action=get_by_name, layerName=LLMTEST_Layer）→ 存在確認
- [ ] L10-04: manage_layers（action=remove, layerName=LLMTEST_Layer）→ 削除
- [ ] L10-E01: 予約名/不正名で add → fail（検証）
- [ ] L10-E02: 不存在 remove → fail もしくは適切な応答
- [ ] T10-01: manage_tags（action=get）→ 一覧取得
- [ ] T10-02: manage_tags（action=add, tagName=LLMTEST_Tag）→ 追加
- [ ] T10-03: manage_tags（action=remove, tagName=LLMTEST_Tag）→ 削除
- [ ] T10-E01: 不正名 add/remove → fail

## 正常系

- L10-01: `manage_layers`（`action=get`）→ 一覧
- L10-02: `manage_layers`（`action=add`, `layerName=LLMTEST_Layer`）→ 追加
- L10-03: `manage_layers`（`action=get_by_name`）→ 存在
- L10-04: `manage_layers`（`action=remove`）→ 削除
- T10-01: `manage_tags`（`action=get`）→ 一覧
- T10-02: `manage_tags`（`action=add`, `tagName=LLMTEST_Tag`）→ 追加
- T10-03: `manage_tags`（`action=remove`, `tagName=LLMTEST_Tag`）→ 削除

## 異常系

- L10-E01: `manage_layers`（`action=add`, 予約名/不正形式）→ `fail`
- L10-E02: `manage_layers`（`action=remove`, 存在しない）→ `fail` または適切応答
- T10-E01: `manage_tags`（`action=add/remove`, 不正名）→ `fail`
