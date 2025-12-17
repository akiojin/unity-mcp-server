# MCP マテリアル テスト計画（カテゴリ: Material系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-material-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-material-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `modify_material` 適用の前後でプロパティ値を比較（事前は `create_material`/既存読取）。
- 構造検証: マテリアルの shader/keywords 変化を確認。
- 参照検証: マテリアル参照箇所の増減は `get_object_references` で補助。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- 作成したマテリアルはテスト終了時に削除。
- 既存マテリアルには直接変更を行わず、必要なら複製して検証のうえ削除。

前提: `Assets/LLMTEST_Materials/LLMTEST_Mat.mat`

チェックリスト（Markdown）
- [ ] U40-01: create_material（Unlit/Color, 赤）
- [ ] U40-02: modify_material（青へ変更）
- [ ] U40-E01: Assets 外パスで fail
- [ ] U40-E02: 不正シェーダで fail
- [ ] U40-E03: 未存在プロパティ/型不一致で fail

## 正常系

- U40-01: `create_material`（`shader=Unlit/Color`, 色=赤）→ 成功
- U40-02: `modify_material`（色=青）→ 成功

## 異常系

- U40-E01: `Assets/` 外パス → `fail`
- U40-E02: 不正シェーダ → `fail`
- U40-E03: 未存在プロパティ/型不一致 → `fail`
