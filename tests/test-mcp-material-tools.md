# MCP マテリアル テスト計画（カテゴリ: Material系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 作成したマテリアルはテスト終了時に削除。
- 既存マテリアルには直接変更を行わず、必要なら複製して検証のうえ削除。

前提: `Assets/LLMTEST_Materials/LLMTEST_Mat.mat`

## 正常系

- U40-01: `create_material`（`shader=Unlit/Color`, 色=赤）→ 成功
- U40-02: `modify_material`（色=青）→ 成功

## 異常系

- U40-E01: `Assets/` 外パス → `fail`
- U40-E02: 不正シェーダ → `fail`
- U40-E03: 未存在プロパティ/型不一致 → `fail`
