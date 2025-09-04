# MCP 入力システム テスト計画（カテゴリ: Input系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。アセットが見つからない場合は `skip`。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 追加したアクションマップ/アクション/バインディング/スキームは全てテスト終了時に削除し、既存状態に影響を残さない。

## 正常系（アセットが存在する場合）

- U60-01: `get_input_actions_state` → 状態取得
- U60-02: `create_action_map`（`LLMTEST_Map`）→ 作成
- U60-03: `add_input_action`（`Jump`, Button）→ 追加
- U60-04: `add_input_binding`（`<Keyboard>/space`）→ 追加
- U60-05: `create_composite_binding`（2D Vector: WASD）→ 追加
- U60-06: `manage_control_schemes`（`Keyboard&Mouse`）→ 追加/確認
- U60-07: `analyze_input_actions_asset` → 統計
- U60-08: 片付け（remove 系）→ 正常削除

## 異常系

- U60-E01: 重複バインディング → `fail` or `notes` 重複回避
- U60-E02: 不正デバイス/パス（`<NotADevice>/key`）→ `fail`
- U60-E03: 不正スキーム操作 → `fail`
