# MCP 参照/階層/選択 テスト計画（カテゴリ: References/Selection系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 選択状態を変更した場合は、テスト終了時に選択をクリアまたは元の選択に戻す。

前提: 対象 `/LLMTEST_Cube`

チェックリスト（Markdown）
- [ ] U100-01: get_object_references（参照情報）
- [ ] U100-02: manage_selection（set→get）
- [ ] U100-E01: 存在しない対象で fail
- [ ] U100-E02: 不正選択パスで fail

## 正常系

- U100-01: `get_object_references` → 参照情報が返る
- U100-02: `manage_selection`（set → get）→ 選択が反映

## 異常系

- U100-E01: 存在しない対象 → `fail`
- U100-E02: 不正選択パス → `fail`
