# MCP UI 要素 テスト計画（カテゴリ: UI系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。UI がなければ `skip`。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-ui-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-ui-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `ui_get_element_state` で操作前後の状態（interactable/value/visible 等）を比較。
- 構造検証: `ui_find_elements` の列挙結果の変化で確認。
- 参照検証: 対象 `elementPath` の一致件数や有効/無効の切り替わりで確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

完走ポリシー（Fail-Safe）
- 本カテゴリは必ず完走する。各項目は pass/fail/skip のいずれかで記録し、途中で停止しない。
- UI が存在しない場合は全項目を `skip（UI 無し）` で埋めて継続（カテゴリ完走）。
- 操作系が安全側で拒否される場合は `skip（理由）` とし、復元の要否を確認する。

前提・共通ルール:
- 禁止: UnityMCP 以外のコマンド・独自スクリプトで操作しない。
- 使用ツール: `ui_find_elements`, `ui_get_element_state`, `ui_click_element`, `ui_set_element_value`。

原状回復（必須）・禁止事項:
- 値設定やトグル変更を行った場合は、終了時に元の値に戻す。テスト専用 UI を対象にすることが望ましい。

チェックリスト（Markdown）
- [ ] U140-01: ui_find_elements（Button 等）
- [ ] U140-02: ui_get_element_state（interactable 等）
- [ ] U140-03: ui_click_element / ui_set_element_value（反映確認）
- [ ] U140-E01: 不正 elementPath で fail

## 正常系（UI が存在する場合）

- U140-01: `ui_find_elements`（`Button` 等）→ 列挙
- U140-02: `ui_get_element_state` → 状態取得
- U140-03: `ui_click_element` / `ui_set_element_value` → 操作成功

## 異常系

- U140-E01: 存在しない `elementPath` → `fail`
