# MCP 入力システム テスト計画（カテゴリ: Input系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。アセットが見つからない場合は `skip`。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-input-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-input-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `get_input_actions_state` で前後比較（actions/maps/bindings の増減）。
- 構造検証: `find_ui_elements` 等と併用し、UI の反応/操作可能の変化を確認（必要時）。
- 参照検証: control schemes や devices の有効性/割当変化を確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- 追加したアクションマップ/アクション/バインディング/スキームは全てテスト終了時に削除し、既存状態に影響を残さない。

チェックリスト（Markdown）
- [ ] U60-01: get_input_actions_state（存在確認）
- [ ] U60-02: create_action_map（LLMTEST_Map）
- [ ] U60-03: add_input_action（Jump, Button）
- [ ] U60-04: add_input_binding（<Keyboard>/space）
- [ ] U60-05: create_composite_binding（2D Vector: WASD）
- [ ] U60-06: manage_control_schemes（Keyboard&Mouse）
- [ ] U60-07: analyze_input_actions_asset（統計）
- [ ] U60-08: remove 系で片付け
- [ ] U60-E01: 重複バインディングで fail or notes
- [ ] U60-E02: 不正デバイス/パスで fail
- [ ] U60-E03: 不正スキーム操作で fail

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
