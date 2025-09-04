# MCP シーン解析 テスト計画（カテゴリ: SceneAnalysis系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 解析は非破壊。必要に応じて一時オブジェクトを生成した場合は削除。

チェックリスト（Markdown）
- [ ] SA10-01: analyze_scene_contents（includeInactive=true, groupByType=true）
- [ ] SA10-02: get_hierarchy（nameOnly=true, maxObjects=100）
- [ ] SA10-E01: パラメータ不正（maxObjects<0 等）で fail

## 正常系

- SA10-01: `UnityMCP__analyze_scene_contents` → 種別ごとの集計が取得できる
- SA10-02: `UnityMCP__get_hierarchy`（nameOnly, maxObjects）→ ヒエラルキー取得

## 異常系

- SA10-E01: 無効パラメータで `fail`
