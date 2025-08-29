# LLM Playbook for Script Tool

Purpose: 最小トークンで安全に目的達成するための手順とヒント。

Strategies
- 探索は段階取得: `returnMode=metadata` → 必要な箇所のみ `script_read` or `returnMode=snippets`。
- 範囲を狭める: まず `scope=assets`、必要になったら `packages`/`embedded` に拡張。
- ページングを活用: `pageSize` と `startAfter` を使い、結果を分割取得。
- ファイル限定: `include="**/*.cs"` のまま、`path` や `symbol` 絞り込みで対象最小化。
- 正規表現は軽量に: フラグ（i/m/s）は必要時のみ。長いバックトラッキングを避ける。

Common Flows
1) 設計対象の特定
   - `script_symbol_find { name, scope: "assets" }`
   - 足りなければ `scope: "all"` → 件数多い場合は `kind`/`exact` を併用

2) 現状把握
   - `script_symbols_get { path }` でシンボル構造を取得
   - `script_read { path, startLine, endLine }` で局所的に参照

3) 参照影響の確認
   - `script_refs_find { name, scope, snippetContext: 2, pageSize: 200 }`

4) 安全編集
   - まず `script_edit_structured` で `preview: true`（diffを確認）
   - 問題なければ `preview: false` で適用（バックアップ + 診断）
   - 範囲編集は `script_edit_patch` を使用（複数範囲をまとめて適用）
   - 検索置換は `script_replace_pattern` を使用（regex/substr、プレビュー→適用）

Token Saving
- 返却上限 `maxBytes` を小さめに（既定: 32768）
- `maxMatchesPerFile` を適度に制限（既定: 3）
- 大きいファイルは `script_read` で必要行だけ抽出

Error Handling
- エラーモデル `{ error, code?, path? }`
- 返却が `truncated: true` の場合は `startAfter` や `pageSize` を調整
