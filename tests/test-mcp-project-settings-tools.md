# MCP プロジェクト設定 テスト計画（カテゴリ: ProjectSettings系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-project-settings-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-project-settings-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `settings_get` の前後比較（適用前/適用後）。
- 構造検証: 変更対象カテゴリ（player/graphics/quality 等）のキー値が期待どおり変化しているか確認。
- 参照検証: Quality/Graphics の変更が GameView などに反映されるかは必要に応じて補助。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

原状回復（必須）・禁止事項:
- 変更前の設定値（例: `vSyncCount`）を必ず保存し、テスト終了時に元の値へ復元する。

チェックリスト（Markdown）
- [ ] U110-01: settings_get（quality.vSyncCount 確認）
- [ ] U110-02: settings_update（confirmChanges=true で一時変更）
- [ ] U110-03: 変更確認→復元
- [ ] U110-E01: confirmChanges=false で fail
- [ ] U110-E02: 不正値（例: vSyncCount=-1）で fail

## 正常系

- U110-01: `settings_get`（quality）→ `vSyncCount` を取得
- U110-02: `settings_update`（`confirmChanges=true`）で一時変更（0↔1）
- U110-03: 変更確認後に復元

## 異常系

- U110-E01: `confirmChanges=false` → セーフティで `fail`
- U110-E02: 不正値（`vSyncCount=-1`）→ バリデーション `fail`
