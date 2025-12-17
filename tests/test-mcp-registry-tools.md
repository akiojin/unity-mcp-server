# MCP レジストリ設定 テスト計画（カテゴリ: RegistryConfig系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 既存のレジストリ設定には影響を与えない。`recommend`/`list` 等の非破壊操作に限定。

チェックリスト（Markdown）
- [ ] R10-01: registry_config（action=recommend, registry=OpenUPM）→ 推奨スコープ取得
- [ ] R10-02: registry_config（action=get）→ 現在の登録状況取得
- [ ] R10-E01: 不正 registry 名 → fail

## 正常系

- R10-01: `registry_config`（`action=recommend`, `registry=OpenUPM`）→ 推奨スコープが得られる
- R10-02: `registry_config`（`action=get`）→ 現在のスコープ一覧

## 異常系

- R10-E01: `registry_config`（未知の `registry`）→ `fail`
