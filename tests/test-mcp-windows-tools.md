# MCP ウィンドウ/ツール テスト計画（カテゴリ: Windows/Tools系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

完走ポリシー（Fail-Safe）
- 本カテゴリは必ず完走する。各項目は pass/fail/skip のいずれかで記録し、途中で停止しない。
- 不在ウィンドウ種や未知ツールは `skip（理由）` として継続する。
- フォーカス等の操作が安全側で拒否される場合も `skip（理由）` とし、復元方針を明記。


前提・共通ルール:
- 禁止: UnityMCP 以外のコマンド・独自スクリプトで操作しない。
- 使用ツール: `UnityMCP__manage_windows`, `UnityMCP__manage_tools`。

原状回復（必須）・禁止事項:
- フォーカス操作などの状態変更は、終了時に元のウィンドウ状態へ戻すか影響が出ない構成で実行。

チェックリスト（Markdown）
- [ ] U150-01: manage_windows（action=get, includeHidden=true）
- [ ] U150-02: manage_tools（action=get）
- [ ] U150-E01: manage_windows（focus, 不在 windowType）で fail
- [ ] U150-E02: manage_tools（activate, 不明 toolName）で fail

## 正常系

- U150-01: `manage_windows`（`action=get`, `includeHidden=true`）→ 一覧
- U150-02: `manage_tools`（`action=get`）→ 一覧

## 異常系

- U150-E01: `manage_windows` フォーカス（存在しない `windowType`）→ `fail`
- U150-E02: `manage_tools` activate（不明 `toolName`）→ `fail`
