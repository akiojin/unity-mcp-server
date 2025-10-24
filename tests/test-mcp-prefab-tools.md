# MCP プレハブ テスト計画（カテゴリ: Prefab系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-prefab-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-prefab-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `UnityMCP__asset_prefab_open` 後に `UnityMCP__list_components`/`UnityMCP__get_gameobject_details` の前後比較。
- 構造検証: Prefab インスタンス化後のヒエラルキー差分で確認。
- 参照検証: 参照/依存の増減を `get_object_references` で確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- 作成した Prefab/インスタンスはテスト終了時に削除。
- Prefab モードで追加した変更は、検証後に元に戻すか Prefab を破棄。

前提: 元 `/LLMTEST_Cube`、Prefab `Assets/LLMTEST_Prefabs/LLMTEST_Cube.prefab`

チェックリスト（Markdown）
- [ ] U50-01: asset_prefab_create（/LLMTEST_Cube → Prefab 作成）
- [ ] U50-02: asset_prefab_open → add_component(BoxCollider) → asset_prefab_save → asset_prefab_exit_mode
- [ ] U50-03: asset_prefab_instantiate（LLMTEST_Cube_Instance）
- [ ] U50-04: asset_prefab_modify（applyToInstances=true で反映）
- [ ] U50-E01: Assets 外パス保存で fail
- [ ] U50-E02: 存在しない Prefab の open で fail
- [ ] U50-E03: 無効プロパティ変更で fail

## 正常系

- U50-01: `asset_prefab_create` → 成功
- U50-02: `asset_prefab_open` → `add_component(BoxCollider)` → `asset_prefab_save` → `asset_prefab_exit_mode`
- U50-03: `asset_prefab_instantiate`（`LLMTEST_Cube_Instance`）→ 生成
- U50-04: `asset_prefab_modify`（`applyToInstances=true`）→ 反映

## 異常系

- U50-E01: `Assets/` 外パス保存 → `fail`
- U50-E02: 存在しない Prefab をオープン → `fail`
- U50-E03: 無効プロパティ変更 → `fail`
