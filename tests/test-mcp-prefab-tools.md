# MCP プレハブ テスト計画（カテゴリ: Prefab系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 作成した Prefab/インスタンスはテスト終了時に削除。
- Prefab モードで追加した変更は、検証後に元に戻すか Prefab を破棄。

前提: 元 `/LLMTEST_Cube`、Prefab `Assets/LLMTEST_Prefabs/LLMTEST_Cube.prefab`

## 正常系

- U50-01: `create_prefab` → 成功
- U50-02: `open_prefab` → `add_component(BoxCollider)` → `save_prefab` → `exit_prefab_mode`
- U50-03: `instantiate_prefab`（`LLMTEST_Cube_Instance`）→ 生成
- U50-04: `modify_prefab`（`applyToInstances=true`）→ 反映

## 異常系

- U50-E01: `Assets/` 外パス保存 → `fail`
- U50-E02: 存在しない Prefab をオープン → `fail`
- U50-E03: 無効プロパティ変更 → `fail`
