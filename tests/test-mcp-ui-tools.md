# MCP UI 要素 テスト計画（カテゴリ: UI系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。UI がなければ `skip`。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

前提・共通ルール:
- 禁止: UnityMCP 以外のコマンド・独自スクリプトで操作しない。
- 使用ツール: `UnityMCP__find_ui_elements`, `UnityMCP__get_ui_element_state`, `UnityMCP__click_ui_element`, `UnityMCP__set_ui_element_value`。

原状回復（必須）・禁止事項:
- 値設定やトグル変更を行った場合は、終了時に元の値に戻す。テスト専用 UI を対象にすることが望ましい。

チェックリスト（Markdown）
- [ ] U140-01: find_ui_elements（Button 等）
- [ ] U140-02: get_ui_element_state（interactable 等）
- [ ] U140-03: click_ui_element / set_ui_element_value（反映確認）
- [ ] U140-E01: 不正 elementPath で fail

## 正常系（UI が存在する場合）

- U140-01: `find_ui_elements`（`Button` 等）→ 列挙
- U140-02: `get_ui_element_state` → 状態取得
- U140-03: `click_ui_element` / `set_ui_element_value` → 操作成功

## 異常系

- U140-E01: 存在しない `elementPath` → `fail`
