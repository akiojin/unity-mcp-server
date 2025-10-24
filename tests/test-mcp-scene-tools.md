# MCP シーン管理 テスト計画（カテゴリ: Scene系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-scene-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-scene-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `UnityMCP__scene_info_get`/`UnityMCP__get_hierarchy` で実行前後のスナップショットを取得し比較（追加/削除/ロード状態）。
- 構造検証: `UnityMCP__scene_list` の一覧変化で確認。
- 参照検証: 必要に応じて対象シーン名の検索・一致件数で確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

完走ポリシー（Fail-Safe）
- 本カテゴリは必ず完走する。各項目は pass/fail/skip のいずれかで記録し、途中で停止しない。
- 作成や保存が安全側で拒否される場合や前提未充足の項目は「skip（理由）」で継続する。
- 復元は必須。差分が残らない状態に戻せば restored:true とする。


前提・共通ルール:
- 禁止: UnityMCP 以外のコマンド・独自スクリプトで操作しない。
- 使用ツール: `UnityMCP__scene_create`, `UnityMCP__scene_info_get`, `UnityMCP__scene_list`, `UnityMCP__scene_save`。

原状回復（必須）・禁止事項:
- 作成したシーンはテスト内で保存後、必要に応じて削除または閉じる。既存シーンの変更は行わない。
- `LLMTEST_Scene` などテスト専用名を使用し、テスト終了時に片付ける。

前提: 新規シーン名 `LLMTEST_Scene`

チェックリスト（Markdown）
- [ ] U10-01: scene_create（loadScene=true）
- [ ] U10-02: scene_info_get（現在シーンが LLMTEST_Scene）
- [ ] U10-03: scene_list（LLMTEST_Scene を含む）
- [ ] U10-04: scene_save（保存確認）
- [ ] U10-E01: 重複作成はエラー or skip
- [ ] U10-E02: 無効名でバリデーションエラー
- [ ] U10-E03: 存在しないシーンで scene_info_get は fail

## 正常系

- U10-01: `scene_create`（`loadScene=true`）→ 成功/ロード済
- U10-02: `scene_info_get` → 現在シーンが `LLMTEST_Scene`
- U10-03: `scene_list` → `LLMTEST_Scene` を含む
- U10-04: `scene_save` → 保存確認

## 異常系

- U10-E01: 重複作成 → エラーまたは `skip`
- U10-E02: 無効名 → バリデーションエラー
- U10-E03: 存在しないシーン指定で `scene_info_get` → `fail`
