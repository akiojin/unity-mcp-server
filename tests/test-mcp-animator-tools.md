# MCP アニメータ テスト計画（カテゴリ: Animator系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

完走ポリシー（Fail-Safe）
- 本カテゴリは必ず完走する。各項目は pass/fail/skip のいずれかで記録し、途中で停止しない。
- Animator 対象が無い場合は全項目を `skip（Animator 無し）` として継続（カテゴリ完走）。
- Play 依存の項目は条件未満なら `skip（Playでない）` として継続。


前提・共通ルール:
- 禁止: UnityMCP 以外のコマンド・独自スクリプトで操作しない。
- 使用ツール: `UnityMCP__get_animator_state`, `UnityMCP__get_animator_runtime_info`。

前提:
- シーン内に Animator コンポーネントを持つ対象が存在しない場合は `skip`。

原状回復（必須）・禁止事項:
- 再生状態やパラメータ変更は終了時に元へ戻す。Play 中に限る項目は停止で静止へ戻す。

チェックリスト（Markdown）
- [ ] A10-01: get_animator_state（対象名を指定、states/parameters）
- [ ] A10-02: get_animator_runtime_info（IK/root motion 等）
- [ ] A10-E01: 存在しない対象名で fail
- [ ] A10-E02: Play でない状態で runtime_info 要求 → skip or fail（仕様準拠）

## 正常系

- A10-01: `UnityMCP__get_animator_state`（`includeParameters=true`, `includeStates=true`）→ 情報取得
- A10-02: （Play中）`UnityMCP__get_animator_runtime_info` → 情報取得

## 異常系

- A10-E01: `get_animator_state`（存在しない対象）→ `fail`
- A10-E02: `get_animator_runtime_info`（非Play）→ `fail` または適切応答
