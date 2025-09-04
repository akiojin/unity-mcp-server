# MCP 入力イベントシミュレーション テスト計画（カテゴリ: InputSimulation系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- 対象ファイル: <相対パス一覧>` を記載（カテゴリ横断で合算、重複排除）。
- 本カテゴリ見出し直後に `- 対象ファイル: <当カテゴリで操作・参照したファイル>` を1行で記載。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `UnityMCP__get_ui_element_state`/ゲーム状態のスクリーンショット（任意）で操作前後の状態差を確認。
- 構造検証: 対象要素の interactable/selected 変化で確認。
- 参照検証: 期待されたログ/イベント（Console/Animator 等）が出力されるか補助確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- 入力の副作用（UI 変更など）がある場合は、状態を元に戻すか一時 UI を対象とする。

チェックリスト（Markdown）
- [ ] U130-01: simulate_keyboard（type: "hello"）
- [ ] U130-02: simulate_mouse（move → click）
- [ ] U130-03: simulate_gamepad / simulate_touch（簡易）
- [ ] U130-E01: 不正キーで fail
- [ ] U130-E02: 未知 action で fail

## 正常系

- U130-01: `simulate_keyboard`（`action=type`, `text="hello"`）→ 成功
- U130-02: `simulate_mouse`（move → click）→ 成功
- U130-03: `simulate_gamepad` / `simulate_touch` → 成功

## 異常系

- U130-E01: 不正キー → `fail`
- U130-E02: 未知 `action` → `fail`
