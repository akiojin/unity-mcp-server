# Error Codes (Standardized)

LLM が分岐しやすいよう、主要APIのエラー `code` を標準化しています。

Common
- `PATH_REQUIRED`: `path` が未指定
- `NAME_REQUIRED`: `name` が未指定
- `PARAMS_REQUIRED`: 必須パラメータ欠如（複合）
- `FILE_NOT_FOUND`: 対象ファイルが存在しない
- `ONLY_CS_SUPPORTED`: `.cs` 以外は非対応
- `PATH_SCOPE_INVALID`: `Assets/` または `Packages/` 以外
- `WRITE_NOT_ALLOWED`: 書込ポリシー違反（既存.cs/Assets/Embedded以外）
- `PREVIEW_TOO_LARGE`: 返却/プレビューの上限超過
- `PATTERN_REQUIRED`: 検索/置換パターン未指定
- `INVALID_REGEX`: 不正な正規表現
- `REGEX_TIMEOUT`: 正規表現のタイムアウト（安全中断）

Operation-specific
- `SEARCH_ERROR`: 検索の内部エラー
- `SYMBOLS_GET_ERROR`: シンボル一覧の内部エラー
- `SYMBOL_FIND_ERROR`: シンボル検索の内部エラー
- `REFS_FIND_ERROR`: 参照検索の内部エラー
- `EDIT_PATCH_ERROR`: 行範囲パッチの内部エラー
- `EDIT_STRUCTURED_ERROR`: 構造化編集の内部エラー
- `RENAME_ERROR`: リネームの内部エラー
- `REPLACE_ERROR`: 検索置換の内部エラー
- `INDEX_STATUS_ERROR`: インデックス状態取得の内部エラー
- `PACKAGE_LIST_FAILED` / `PACKAGE_LIST_ERROR`: パッケージ一覧の失敗/内部エラー
- `UNKNOWN_OPERATION`: サポート外の操作

Notes
- 可能な限り `error`（人間可読）と `code`（機械可読）の両方を返します。
- `truncated: true` が同時に返る場合は、ページングや上限の調整を検討してください。
