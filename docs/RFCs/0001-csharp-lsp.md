# RFC-0001: C# LSP 置き換え（自己完結配布・常駐運用）

## 目的と背景

- 目的: 利用者側で .NET SDK を不要にしたまま、C# の解析・検索・参照取得・リネーム・構造編集を高精度に提供する。
- 背景: 既存の roslyn-cli（MSBuildWorkspace 直叩き）は、実行時にホストの .NET SDK/MSBuild レイアウトを要求するため、バイナリ配布の旨味が薄い。
- 解決: 公式 Roslyn LSP（Microsoft.CodeAnalysis.LanguageServer）を土台にした「自前 C# LSP サーバ」を自己完結（self-contained）で配布し、MCP から子プロセス常駐起動して利用する。

## スコープ

- 対象: C# の解析・ナビゲーション・編集（構造編集含む）。
- 非対象: Unity 以外のエンジン固有拡張、言語横断の LSP 実装。
- 置換: roslyn-cli はコード/CI/Release 資産を含めて完全撤去。

## アーキテクチャ

- 構成: MCP（Node）が LSP サーバを子プロセス（stdio）で常駐起動（ワークスペース単位・1インスタンス）。
- 終了連動: MCP 終了時に LSP へ `shutdown` → `exit` → 応答なしは `SIGTERM` → `SIGKILL`。
- 再起動: クラッシュ検知で指数バックオフ再起動（進行中要求はキュー制御で再試行）。
- ログ: LSP 標準出力は通信専用。ログは標準エラーへ最小限（英語）。

## 配布・バージョニング・自動DL/更新

- 配布物: RID 別の自己完結 LSP サーバ（.NET ランタイム + Roslyn + MSBuild 相当を内包）。
- 配置: `/.unity/tools/csharp-lsp/<rid>/server` 固定。
- マニフェスト: `csharp-lsp-manifest.json`（`rid -> { url, sha256, size }`）。
- 版ポリシー（既定）: `mcp-server` と同一バージョンのタグ `vX.Y.Z` にピン止め（常に固定版取得）。
- 自動DL: LSP 未配置時にマニフェストから取得 → SHA256 検証 → 原子的配置（権限付与）。
- 自動更新: 望ましい版と現行版を比較し差分があれば DL → 検証 → 二重化配置 → `current` 切替 → 優雅再起動。失敗時は即ロールバック。履歴は直近 2 版保持。
- オフライン/社内配布: `pathOverride` で事前配布を採用。`manifestUrl` は社内ミラーも可。

## 公開 API 方針（MCP 側）

- 公開は Script 系のみ（LSP 管理 API は公開しない）。
- 失敗時メッセージは英語・簡潔。実行コマンドの案内は出さず、設定見直しのみ示唆。

## LSP 標準メソッド（委譲）

- 検索/移動: `textDocument/definition`, `textDocument/implementation`, `textDocument/typeDefinition`。
- 記号: `textDocument/documentSymbol`, `workspace/symbol`。
- 参照: `textDocument/references`。
- 編集: `textDocument/rename`（`workspace/applyEdit`）、`textDocument/formatting`。

## LSP 拡張（Roslyn 実装）

- 目的: 標準では表現しづらい構造編集を高精度に提供。
- メソッド例（暫定名）:
  - `mcp/replaceSymbolBody`
  - `mcp/insertBeforeSymbol`, `mcp/insertAfterSymbol`
  - `mcp/removeSymbol`
- 仕様要点:
  - 入力: 相対パス/シンボル特定情報（namePath 等）/編集内容。
  - 処理: Roslyn 構文木編集 → Formatter → 診断収集。
  - 出力: `WorkspaceEdit` を返却し、クライアント側で `workspace/applyEdit` を適用。診断は結果に同梱。

## インデックス構築（build_code_index）

- 方針: 「全 `.cs` 列挙 → 各ファイルへ `textDocument/documentSymbol` 発行 → 結果を収集して SQLite 永続化」。
- 理由: `workspace/symbol` 連打よりも網羅性・制御性が高い。
- 実装要点: 並列上限・バックオフ・部分再試行・進捗集計。初期は全量再走査（差分更新は次段）。

## 設定（.unity/config.json）

- 例（キー案）:
  - `lsp.autoDownload: true`
  - `lsp.autoUpdate: true`
  - `lsp.versionPolicy: "mcp"`（固定）
  - `lsp.manifestUrl: "https://github.com/<org>/<repo>/releases/download/v<version>/csharp-lsp-manifest.json"`
  - `lsp.pathOverride: "<absolute-path-to-server>"`
  - `lsp.killTimeoutMs: 5000`

## 失敗ポリシーとログ

- 失敗時は英語・簡潔な理由を返す（例: network/manifest/sha256/applyEdit）。
- 詳細は内部ログ（stderr）。ユーザーに運用コマンドは要求しない。

## 移行計画

1. 本 RFC 確定。
2. LSP サーバ PoC（initialize → documentSymbol → references → rename）。
3. MCP クライアント実装（常駐起動・終了連動・再起動・並列/再試行）。
4. build_code_index の LSP 化（全量走査 → SQLite）。
5. 構造編集拡張（replaceBody → insertBefore/After → remove）。
6. roslyn-cli の完全撤去（コード/CI/Release 資産・過去配布参照の整理）。

## 性能・規模目標（初期）

- 初回ウォームアップ: 数十秒〜（プロジェクト規模依存）。
- 並列: 8〜16 リクエスト程度から調整。
- フルスキャン: 1〜数分（数千ファイル想定、機材依存）。

## ライセンス

- 同梱コンポーネント（.NET ランタイム/Roslyn/MSBuild 等）のライセンス表記を含める。配布資産に NOTICE/THIRD-PARTY を同梱。

