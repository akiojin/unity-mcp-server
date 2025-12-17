# MCP シーン解析 テスト計画（カテゴリ: SceneAnalysis系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-scene-analysis-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-scene-analysis-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `analyze_scene_contents` の前後比較（object counts/memory 推定等）。
- 構造検証: `get_hierarchy` で構成変化を補助確認。
- 参照検証: 変化対象に対する参照の有無を `get_object_references` で補助。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- 解析は非破壊。必要に応じて一時オブジェクトを生成した場合は削除。

チェックリスト（Markdown）
- [ ] SA10-01: analyze_scene_contents（includeInactive=true, groupByType=true）
- [ ] SA10-02: get_hierarchy（nameOnly=true, maxObjects=100）
- [ ] SA10-E01: パラメータ不正（maxObjects<0 等）で fail

## 正常系

- SA10-01: `analyze_scene_contents` → 種別ごとの集計が取得できる
- SA10-02: `get_hierarchy`（nameOnly, maxObjects）→ ヒエラルキー取得

## 異常系

- SA10-E01: 無効パラメータで `fail`
