---
title: Unity MCP Script ツール運用ガイド
---

# Unity MCP Script ツール運用ガイド

このドキュメントは、C#関連の探索・編集・置換・生成をUnity MCPのScript系ツールで一貫して実施するための運用基準を示します。

## 原則

- C#の操作は常にUnity MCPのScript系ツールを使用する。
- 直接ファイル編集（`apply_patch`や`shell`での書き込み）は禁止。
- 変更は必ず preview → 適用 → アセットリフレッシュ → コンパイル待機 の順で検証する。
- 対象は `UnityEditorMCP/Assets/**` 配下に限定する。

## 対応ツール一覧（概要）

- 検索: `UnityMCP__script_search`
- 読み取り: `UnityMCP__script_read`
- 差分パッチ: `UnityMCP__script_edit_patch`
- 構造編集: `UnityMCP__script_edit_structured`
- 置換: `UnityMCP__script_replace_pattern`
- 新規作成補助（フォルダ/アセット）: `UnityMCP__manage_asset_database`
- リフレッシュ: `UnityMCP__refresh_assets`
- コンパイル待機: `UnityMCP__wait_for_editor_state`
- コンパイル状態取得: `UnityMCP__get_compilation_state`

## 推奨フロー（テンプレート）

1. 検索 → 読み取り
   - `UnityMCP__script_search` で対象を特定し、`UnityMCP__script_read` で周辺を確認。
2. 編集（プレビュー）
   - `UnityMCP__script_edit_patch` もしくは `UnityMCP__script_edit_structured` を `preview:true` で実行し差分を確認。
3. 編集（適用）
   - 問題なければ同じ内容で `preview:false` で適用。
4. リフレッシュと待機
   - `UnityMCP__refresh_assets` を呼び、`UnityMCP__wait_for_editor_state` で `isCompiling:false` になるまで待機。
5. 状態確認
   - 必要に応じて `UnityMCP__get_compilation_state` でエラー・警告を確認。
6. 置換時の注意
   - `UnityMCP__script_replace_pattern` は必ず `preview:true` → 適用の順で実施。

## 新規スクリプトの作成

- 必要なら `UnityMCP__manage_asset_database` でフォルダを作成。
- `UnityMCP__script_edit_patch` で新規ファイルにコンテンツを書き込む（パスは `UnityEditorMCP/Assets/**`）。
- 以降は上記フローのリフレッシュ・待機・確認を実施。

## 禁止事項（ガードレール）

- `apply_patch` や `shell` による `.cs` ファイルの直接編集。
- `UnityEditorMCP/Assets/**` 以外へのC#スクリプト配置。
- プレビュー無しの直接適用（必ずプレビューを通す）。

## よくある落とし穴と対策

- スクリプト追加後に「コンポーネントが見つからない」
  - リフレッシュ未実施/コンパイル中の可能性。`refresh_assets` → `wait_for_editor_state` を徹底。
- 生成した型がAddComponentで出てこない
  - 名前やファイル名の不一致、名前空間の衝突を確認。再リフレッシュとビルド状態の確認を行う。

## 参考

- AGENTS.mdの要点とリンク先として本ドキュメントを参照する運用。

