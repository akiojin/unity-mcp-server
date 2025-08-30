# Script Edit & Refactor

Goal: Safe, minimal, LLM-friendly specs for editing C# files. Writes are restricted to existing `.cs` under `Assets/` and Embedded packages.

Safety
- Preview → Apply の二段階
- 既存`.cs`のみ（新規作成は既定で不可）
- 書込み範囲は正規化/ガード済み。適用時はバックアップ + インポート + 診断返却
- Packages配下に補助ファイルは生成しない

Defaults
- maxBytes: 32768（プレビュー差分の上限）
- snippetContext: 2（診断や検索の周辺行数）
 - apply対象: 既存の `.cs`（Assets と Embedded のみ）
 - apply時の挙動: 既定でデバウンス一括適用（約1.2秒後）。即時適用したい場合は `defer:false` を指定。
 - 既定値は設定から変更可能（環境変数/設定ファイル）。
 - Unity側は `get_editor_state` / `get_compilation_state` に基づきアイドル待機→安全タイミングで適用。

Commands

1) script_edit_patch（行範囲差替え）
- Request (preview):
```
{
  "preview": true,
  "edits": [
    { "path": "Assets/Scripts/Foo.cs", "startLine": 10, "endLine": 12, "newText": "..." }
  ]
}
```
- Response (preview): `{ "success": true, "previews": [{ "path": string, "startLine": number, "endLine": number, "preview": string /* unified diff */ }] }`
  - Warnings: `warnings.proximity: [{ path, clusters: [{ startLine, endLine, size }] }]`（近接変更のクラスタ）
  - Options: `proximityThreshold`（行差の閾値、既定3）/ `minClusterSize`（クラスタ最小サイズ、既定2）
- Request (apply): same as above with `"preview": false`
- Options (apply): `defer: true|false`（既定: true=バッチキューに投入し一括適用。false=即時適用）
- Response (apply): `{ "success": true, "applied": true, "previews": [...], "backups": [{ "path": string, "backup": string }], "compilation": { ...state } }`
  - Impact: `impact: { errorsBefore, errorsAfter, errorDelta, warningsBefore, warningsAfter, warningDelta, newDiagnostics: [{ type, file, line, message }] }`

2) script_edit_structured（構造化編集）
- Operations: `insert_before` | `insert_after` | `replace_body`
- Request (preview):
```
{
  "operation": "insert_before",
  "path": "Assets/Scripts/Foo.cs",
  "symbolName": "Bar",
  "kind": "class|method|property", // optional filter
  "preview": true,
  "newText": "..." // for insert/replace
}
```
- Response (preview): `{ "success": true, "preview": string /* unified diff */ }`
- Request (apply): same, with `"preview": false`
- Response (apply): `{ "success": true, "backup": string, "compilation": { ...state } }`
  - Impact: `impact: { ... }`（適用前後の診断差分）

3) script_refactor_rename（安全な単語境界リネーム）
- Request (preview):
```
{
  "name": "OldName",
  "newName": "NewName",
  "scope": "assets|embedded|all",
  "preview": true,
  "pageSize": 200,
  "maxMatchesPerFile": 3,
  "allowCollisions": false
}
```
- Response (preview): `{ "success": true, "previews": [{ "path": string, "preview": string }], "truncated?": true, "collisions?": [{ "path": string, "existing": number }], "summary": { "filesAffected": number, "occurrences": number }, "warnings": { "proximity": [{ path, clusters: [...] }], "mixedNames": [{ path, oldCount, newCount }] } }`
  - Options: `returnLineMeta`（`previews[*].meta.lines` に対象行番号を返却）
- Request (apply): same, with `"preview": false`
- Behavior: `allowCollisions=false` で既に `newName` が存在するファイルがある場合、`COLLISION_DETECTED` を返し適用を中止。
- Response (apply): `{ "success": true, "backups": [{ "path": string, "backup": string }], "compilation": { ...state }, "impact": { ... }, "summary": { "filesChanged": number, "occurrences": number } }`
  - Warnings: `warnings.proximity`（参照行の近接クラスタ）, `warnings.semanticProximityTypes`（Roslyn可用時: 同一コンテナ/名前空間での密集Top）。Options: `proximityThreshold`/`minClusterSize`/`semanticMinCount`
  - Impact: `impact: { ... }`、Summary: `{ filesChanged, occurrences }`


4) script_replace_pattern（検索置換）
- Request (preview):
```
{
  "patternType": "substring" | "regex",
  "pattern": "...",
  "replacement": "...",
  "flags": ["i","m","s"],
  "wordBoundary": false,
  "scope": "assets|packages|embedded|all",
  "include": "**/*.cs",
  "exclude": "",
  "includeSemantic": [{ "container": "Player", "namespace": "Game" }], // substring+wordBoundary で Roslyn 可用時: 行単位で対象制限
  "preview": true,
  "pageSize": 200,
  "maxMatchesPerFile": 3,
  "maxFileSizeKB": 0
}
```
- Response (preview): `{ "success": true, "previews": [{ "path": string, "preview": string, "matches": number }], "changedFiles": number }`
  - Warnings: `warnings.proximity`（ヒット行の近接クラスタ）, `warnings.mixedTokens`（置換対象と置換後トークンが同一ファイルに混在）, `warnings.semanticProximityTypes`（Roslyn可用時） Options: `proximityThreshold`/`minClusterSize`/`semanticMinCount`
  - Options: `returnLineMeta`（`previews[*].meta.lines` に変更行番号を返却）
- Request (apply): same, with `"preview": false`
- Response (apply): `{ "success": true, "backups": [{ "path": string, "backup": string }], "compilation": { ...state }, "changedFiles": number }`
  - Impact: `impact: { ... }`、Summary: `{ filesChanged, matches }`
  - Warnings: `warnings.proximity`（ヒット行の近接クラスタ）。Options: `proximityThreshold`/`minClusterSize`


Notes
- 書き込みは `Assets/**.cs` と Embedded packages の既存`.cs`のみ許可。設定で拡張子/スコープを制御可能。
- 適用時は `Library/UnityMCP/Backups/<timestamp>/...` に原本コピーを保存します。
- 参照検索/シンボル検索と組み合わせることで、LLMは目的の位置を特定→プレビュー→適用の流れを自動化できます。
- 大量変更は `script_edit_patch` に集約し、`defer:true` で1回のRefresh/コンパイルに抑制するのが推奨です。

Configuration
- 環境変数（mcp-server 側）
  - `WRITE_DEBOUNCE_MS`: デバウンス遅延（ms）。既定 `1200`
  - `WRITE_MAX_EDITS`: キューに貯める最大編集数。既定 `100`
  - `WRITE_DEFER_DEFAULT`: `true|false`。`script_edit_patch` の既定`defer`。既定 `true`
- 設定ファイル（任意）
  - `UNITY_MCP_CONFIG` でJSONパスを指定、未指定時は `mcp-server/config.json` を自動検出
  - 例:
```
{
  "writeQueue": { "debounceMs": 800, "maxEdits": 200, "deferDefault": true },
  "search": { "defaultDetail": "compact", "engine": "naive" }
}
```

Errors
- 共通エラーモデル: `{ "error": string, "code?": string, "path?": string }`
- 代表例（標準コードは `docs/error-codes.md` を参照）
  - `PARAMS_REQUIRED` / `PATH_REQUIRED`
  - `WRITE_NOT_ALLOWED`
  - `FILE_NOT_FOUND` / `SYMBOL_NOT_FOUND`
  - `PREVIEW_TOO_LARGE`
