# Script Read & Discoverability

Goal: Minimal, LLM-friendly specs for reading, listing, searching, and symbol discovery. Defaults are token-conservative.

Defaults
- scope: `assets`
- returnMode: `metadata`
- pageSize: 200
- maxBytes: 32768
- snippetContext: 2
 - regex flags default OFF (i/m/s)
 - regex timeout: ~500ms/ファイル（重いパターンは安全に中断）
 - Roslynが利用可能な環境ではシンボル抽出の精度が自動で向上（なければ軽量パーサにフォールバック）

Commands

1) script_packages_list
- Request: `{ "includeBuiltIn": false }`
- Response: `{ "success": true, "packages": [{ "name": string, "displayName": string, "version": string, "source": string, "isEmbedded": bool, "resolvedPath": string }], "totalCount": number }`

2) script_read
- Request: `{ "path": "Assets/.../Foo.cs", "startLine": 1, "endLine": 200, "maxBytes": 32768 }`
- Response: `{ "success": true, "path": string, "startLine": number, "endLine": number, "content": string }`

3) script_search
- Request:
```
{
  "patternType": "substring" | "regex" | "glob",
  "pattern": "...",
  "flags": ["i","m","s"],
  "scope": "assets" | "packages" | "embedded" | "all",
  "include": "**/*.cs",
  "exclude": "Packages/**/Tests/**",
  "returnMode": "metadata" | "snippets" | "full",
  "pageSize": 200,
  "maxMatchesPerFile": 3,
  "snippetContext": 2,
  "maxBytes": 32768,
  "maxFileSizeKB": 0,
  "startAfter": "relPath|line|matchIndex",
  "codeOnly": true,
  "identifier": "Move",             // 任意（Roslyn可用時のセマンティック絞り込み）
  "container": "Player",            // 任意（同上）
  "namespace": "Game"               // 任意（同上）
}
```
- Response: `{ "success": true, "results": [{ "path": string, "line": number, "snippet?": string, "content?": string }], "total": number, "nextStartAfter?": string, "truncated?": true }`
- Tips: `codeOnly=true`（既定）でコメント/文字列を除外して検索（substring/regex/glob）。正規表現はフィルタ後の行に対して評価します（行番号は原文基準）。

4) script_symbols_get
- Request: `{ "path": "Assets/.../Foo.cs" }`
- Response: `{ "success": true, "path": string, "symbols": [{ "name": string, "kind": "namespace|class|struct|interface|enum|method|property", "namespace": string, "container": string|null, "startLine": number, "endLine": number }] }`

5) script_symbol_find
- Request: `{ "name": "Player", "scope": "assets|packages|embedded|all", "kind": "class|method|property", "exact": false }`
- Response: `{ "success": true, "results": [{ "path": string, "symbol": { ...Symbol }}], "total": number }`

6) script_refs_find
- Request:
```
{
  "name": "Move",
  "scope": "assets|packages|embedded|all",
  "path": "Assets/Scripts/Player.cs", // 任意: ターゲットのコンテナ/名前空間を補完
  "kind": "method",                  // 任意: 絞り込み
  "container": "Player",             // 任意: 明示指定
  "namespace": "Game",               // 任意: 明示指定
  "snippetContext": 2,
  "pageSize": 200,
  "maxMatchesPerFile": 3,
  "maxBytes": 32768
}
```
- Response: `{ "success": true, "results": [{ "path": string, "line": number, "snippet": string }], "total": number }`
- 備考: Roslynが利用可能な場合は識別子トークンで一致を検出（コメント/文字列を除外）。`container`/`namespace` 指定で誤検出が減少。

7) script_index_status
- Request: `{}`
- Response: `{ "success": true, "storedFiles": number }`

Errors
- 共通エラーモデル: `{ "error": string, "code?": string, "path?": string }`
- 代表例（標準コードは `docs/error-codes.md` を参照）
  - `PATH_REQUIRED` / `FILE_NOT_FOUND`
  - `ONLY_CS_SUPPORTED`
  - `PREVIEW_TOO_LARGE` / `truncated: true`
  - `PATTERN_REQUIRED` / `REGEX_TIMEOUT`
