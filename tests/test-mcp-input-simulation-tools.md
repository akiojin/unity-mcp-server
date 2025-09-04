# MCP 入力イベントシミュレーション テスト計画（カテゴリ: InputSimulation系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

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
