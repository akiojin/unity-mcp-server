# MCP ウィンドウ/ツール テスト計画（カテゴリ: Windows/Tools系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

出力フォーマット補足（必須）
- Run ヘッダに `- テスト仕様: tests/test-mcp-windows-tools.md`、`- 所感: <短文>` を記載。
- 本カテゴリ見出し直後に `- テスト仕様: tests/test-mcp-windows-tools.md` を1行で記載。任意で `- 操作対象ファイル: <当カテゴリで操作・参照したファイル>` を追記。
- 各ケースの details には `targetPaths: [<相対パス>...]` を付記（単一でも配列）。

観測不能時の二次検証（エビデンス・エスカレーション）
- 差分検証: `editor_windows_manage(action=get_state)` の前後比較（フォーカス/可視状態/配置）。
- 構造検証: `editor_windows_manage(action=get)` の一覧に対象が存在/消失していること。
- 参照検証: ターゲット windowType の一意/複数性を確認。
- なお判定不能時のみ `skip（OBSERVATION_GAP）`。

完走ポリシー（Fail-Safe）
- 本カテゴリは必ず完走する。各項目は pass/fail/skip のいずれかで記録し、途中で停止しない。
- 不在ウィンドウ種や未知ツールは `skip（理由）` として継続する。
- フォーカス等の操作が安全側で拒否される場合も `skip（理由）` とし、復元方針を明記。

前提・共通ルール:
- 禁止: UnityMCP 以外のコマンド・独自スクリプトで操作しない。
- 使用ツール: `editor_windows_manage`, `editor_tools_manage`。

原状回復（必須）・禁止事項:
- フォーカス操作などの状態変更は、終了時に元のウィンドウ状態へ戻すか影響が出ない構成で実行。

チェックリスト（Markdown）
- [ ] U150-01: editor_windows_manage（action=get, includeHidden=true）
- [ ] U150-02: editor_tools_manage（action=get）
- [ ] U150-E01: editor_windows_manage（focus, 不在 windowType）で fail
- [ ] U150-E02: editor_tools_manage（activate, 不明 toolName）で fail

## 正常系

- U150-01: `editor_windows_manage`（`action=get`, `includeHidden=true`）→ 一覧
- U150-02: `editor_tools_manage`（`action=get`）→ 一覧

## 異常系

- U150-E01: `editor_windows_manage` フォーカス（存在しない `windowType`）→ `fail`
- U150-E02: `editor_tools_manage` activate（不明 `toolName`）→ `fail`
