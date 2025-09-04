# MCP ゲームオブジェクト テスト計画（カテゴリ: GameObject系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- 対象ファイル: <相対パス一覧>` を記載（カテゴリ横断で合算、重複排除）。
- 本カテゴリ見出し直後に `- 対象ファイル: <当カテゴリで操作・参照したファイル>` を1行で記載。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `UnityMCP__get_gameobject_details` や `UnityMCP__get_hierarchy` の前後比較（存在/親子/Transform/タグ/レイヤ）。
- 構造検証: `UnityMCP__find_gameobject` の一致件数を確認。
- 参照検証: 参照/依存関係は `UnityMCP__get_object_references` で件数期待を確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- 新規作成は `LLMTEST_` 接頭辞を付与し、ケース終了時またはカテゴリ末尾で削除。
- 既存オブジェクトの変更は行わない。やむを得ず変更した場合は元の値に復元。

前提: 対象名 `/LLMTEST_Cube`

チェックリスト（Markdown）
- [ ] U20-01: create_gameobject（Cube）
- [ ] U20-02: get_gameobject_details（Transform/Renderer）
- [ ] U20-03: modify_gameobject（位置/回転/スケール）
- [ ] U20-04: get_hierarchy（ルートに LLMTEST_Cube）
- [ ] U20-E01: 不在 parentPath で fail
- [ ] U20-E02: 不正 path で fail
- [ ] U20-E03: 無効スケール等でバリデーション fail

## 正常系

- U20-01: `create_gameobject`（`primitiveType=Cube`）→ 生成
- U20-02: `get_gameobject_details` → Transform/Renderer 取得
- U20-03: `modify_gameobject`（位置/回転/スケール）→ 反映確認
- U20-04: `get_hierarchy` → ルートに `LLMTEST_Cube`

## 異常系

- U20-E01: 存在しない `parentPath` → `fail`
- U20-E02: 不正 `path` 変更 → `fail`
- U20-E03: 無効スケール等 → バリデーション `fail`（仕様準拠）
