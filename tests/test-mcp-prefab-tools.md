# MCP プレハブ テスト計画（カテゴリ: Prefab系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- 対象ファイル: <相対パス一覧>` を記載（カテゴリ横断で合算、重複排除）。
- 本カテゴリ見出し直後に `- 対象ファイル: <当カテゴリで操作・参照したファイル>` を1行で記載。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `UnityMCP__open_prefab` 後に `UnityMCP__list_components`/`UnityMCP__get_gameobject_details` の前後比較。
- 構造検証: Prefab インスタンス化後のヒエラルキー差分で確認。
- 参照検証: 参照/依存の増減を `get_object_references` で確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- 作成した Prefab/インスタンスはテスト終了時に削除。
- Prefab モードで追加した変更は、検証後に元に戻すか Prefab を破棄。

前提: 元 `/LLMTEST_Cube`、Prefab `Assets/LLMTEST_Prefabs/LLMTEST_Cube.prefab`

チェックリスト（Markdown）
- [ ] U50-01: create_prefab（/LLMTEST_Cube → Prefab 作成）
- [ ] U50-02: open_prefab → add_component(BoxCollider) → save_prefab → exit_prefab_mode
- [ ] U50-03: instantiate_prefab（LLMTEST_Cube_Instance）
- [ ] U50-04: modify_prefab（applyToInstances=true で反映）
- [ ] U50-E01: Assets 外パス保存で fail
- [ ] U50-E02: 存在しない Prefab の open で fail
- [ ] U50-E03: 無効プロパティ変更で fail

## 正常系

- U50-01: `create_prefab` → 成功
- U50-02: `open_prefab` → `add_component(BoxCollider)` → `save_prefab` → `exit_prefab_mode`
- U50-03: `instantiate_prefab`（`LLMTEST_Cube_Instance`）→ 生成
- U50-04: `modify_prefab`（`applyToInstances=true`）→ 反映

## 異常系

- U50-E01: `Assets/` 外パス保存 → `fail`
- U50-E02: 存在しない Prefab をオープン → `fail`
- U50-E03: 無効プロパティ変更 → `fail`
