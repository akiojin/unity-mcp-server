# MCP コンポーネント テスト計画（カテゴリ: Component系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-component-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-component-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `UnityMCP__list_components`/`UnityMCP__get_component_values` の前後比較（追加/削除/値変更）。
- 構造検証: `UnityMCP__find_by_component` の一致件数で確認。
- 参照検証: 依存エラーなどはコンソールログ確認や `get_object_references` 併用。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- 追加したコンポーネントはテスト終了時に削除。
- 変更したプロパティは元の値に戻す（変更前に現在値を保存）。

前提: 対象 `/LLMTEST_Cube`（未存在なら先に作成）

チェックリスト（Markdown）
- [ ] U30-01: add_component（Rigidbody）
- [ ] U30-02: get_component_values（Rigidbody）
- [ ] U30-03: modify_component（useGravity=false 等）
- [ ] U30-04: component_field_set（SerializeField 更新）
- [ ] U30-05: list_components（Rigidbody を含む）
- [ ] U30-E01: 未知 componentType で fail
- [ ] U30-E02: 不正プロパティ/型不一致で fail
- [ ] U30-E03: 対象なしで fail

## 正常系

- U30-01: `add_component`（`Rigidbody`）→ 成功
- U30-02: `get_component_values`（`Rigidbody`）→ 値取得
- U30-03: `modify_component`（`useGravity=false` 等）→ 反映
- U30-04: `component_field_set`（SerializeField 値更新）→ 反映
- U30-05: `list_components` → 追加済みが列挙

## 異常系

- U30-E01: 未知 `componentType` → `fail`
- U30-E02: 不正プロパティ/型不一致 → `fail`
- U30-E03: 対象なし → `fail`
