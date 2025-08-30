# Script Read & Discoverability

Goal: Minimal, LLM-friendly specs for reading, listing, searching, and symbol discovery. Defaults are token-conservative.

Defaults
- scope: `assets`
- returnMode: `snippets`（compact応答。必要時のみ詳細を個別取得）
- detail: `compact`（`returnMode=snippets`のエイリアス。環境既定で上書き可能）
- pageSize: 20
- maxBytes: 65536
- snippetContext: 2
- regex flags default OFF (i/m/s)
- regex timeout: ~500ms/ファイル（安全に中断）
- 実行主体: Nodeローカル（Unity未接続でも可）。CodeIndex JSONがあれば優先利用、無ければ軽量パーサでフォールバック。

Commands

1) script_packages_list
- Request: `{ "includeBuiltIn": false }`
- Response: `{ "success": true, "packages": [{ "name": string, "displayName": string, "version": string, "source": string, "isEmbedded": bool, "resolvedPath": string }], "totalCount": number }`

2) script_read
- Request: `{ "path": "Assets/.../Foo.cs", "startLine": 1, "endLine": 200, "maxBytes": 32768 }`
- Response: `{ "success": true, "path": string, "startLine": number, "endLine": number, "content": string }`

3) script_search（コンパクト応答）
- Request:
```
{
  "patternType": "substring" | "regex" | "glob",
  "pattern": "...",
  "flags": ["i","m","s"],
  "scope": "assets" | "packages" | "embedded" | "all",
  "include": "**/*.cs",
  "exclude": "Packages/**/Tests/**",
  "returnMode": "metadata" | "snippets" | "full",  // 既定: snippets（compact）
  "detail": "compact|metadata|snippets|full",        // 推奨: compact（snippetsと同義）。UI/クライアント向けの分かりやすい別名
  "pageSize": 20,
  "maxMatchesPerFile": 5,
  "snippetContext": 2,
  "maxBytes": 65536,
  "maxFileSizeKB": 1024,
  "startAfter": "relPath|line|matchIndex",
  "codeOnly": true,
  "identifier": "Move",             // 任意（Roslyn可用時のセマンティック絞り込み）
  "container": "Player",            // 任意（同上）
  "namespace": "Game"               // 任意（同上）
}
```
- Response（compact）:
```
{
  "success": true,
  "pathTable": ["Packages/.../Foo.cs", ...],
  "results": [
    { "fileId": 0, "lineRanges": "10-12,18", "snippets?": [{ "line": 10, "snippet": "..." }] }
  ],
  "total": number,
  "cursor?": string
}
```
- Tips: `codeOnly=true`（既定）でコメント/文字列を除外して検索。正規表現はフィルタ後の行に対して評価（行番号は原文に対応）。

4) script_symbols_get（ローカル優先）
- Request: `{ "path": "Assets/.../Foo.cs" }`
- Response: `{ "success": true, "path": string, "symbols": [{ "name": string, "kind": "namespace|class|struct|interface|enum|method|property", "namespace": string, "container": string|null, "startLine": number, "endLine": number }] }`

5) script_symbol_find（ローカル優先）
- Request: `{ "name": "Player", "scope": "assets|packages|embedded|all", "kind": "class|method|property", "exact": false }`
- Response: `{ "success": true, "results": [{ "path": string, "symbol": { ...Symbol }}], "total": number }`

6) script_refs_find（ローカル優先）
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

7) script_index_status（ローカル優先）
- Request: `{}`
- Response:
```
{ "success": true, "totalFiles": number, "indexedFiles": number, "coverage": percent, "codeIndexRoot": string }
```

Errors
- 共通エラーモデル: `{ "error": string, "code?": string, "path?": string }`
- 代表例（標準コードは `docs/error-codes.md` を参照）
  - `PATH_REQUIRED` / `FILE_NOT_FOUND`
  - `ONLY_CS_SUPPORTED`
  - `PREVIEW_TOO_LARGE` / `truncated: true`
  - `PATTERN_REQUIRED` / `REGEX_TIMEOUT`
