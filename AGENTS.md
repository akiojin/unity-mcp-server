# AGENTS.md

このファイルは、このリポジトリでコードを扱う際のガイダンスを提供します。

## 開発指針

### 🛠️ 技術実装指針

- **設計・実装は複雑にせずに、シンプルさの極限を追求してください**
- **ただし、ユーザビリティと開発者体験の品質は決して妥協しない**
- 実装はシンプルに、開発者体験は最高品質に
- CLI操作の直感性と効率性を技術的複雑さより優先

### 📝 設計ガイドライン

- 設計に関するドキュメントには、ソースコードを書かないこと

## 開発品質

### 完了条件

- エラーが発生している状態で完了としないこと。必ずエラーが解消された時点で完了とする。

## 開発ワークフロー

### 基本ルール

- 作業（タスク）を完了したら、変更点を日本語でコミットログに追加して、コミット＆プッシュを必ず行う
- 作業（タスク）は、最大限の並列化をして進める
- 作業（タスク）は、最大限の細分化をしてToDoに登録する
- 作業（タスク）の開始前には、必ずToDoを登録した後に作業を開始する
- 作業（タスク）は、忖度なしで進める

### テスト実行・出力ポリシー（エージェント向け）

- 出力フォーマット: すべてのテスト結果は Markdown。仕様とテンプレートは `tests/RESULTS_FORMAT.md` を参照。
- 出力先: 1 ラン＝1 ファイル運用。`tests/.reports/run-<YYYYMMDD_HHmmss>.md` に集約（Git管理外、.gitignore 済）。任意で `tests/.reports/latest.md` を上書き更新。
- ラン初期化: 最初に Run ID を採番し、パスを `tests/.reports/.current-run` に保存。以降の全カテゴリはこのパスへ追記（別ファイル作成禁止）。
  - サマリ更新: 各カテゴリ追記後とラン終了時に、先頭のサマリテーブルを再計算して上書き。更新後の全文を `tests/.reports/latest.md` にも上書きする。
- ToDo運用: ファイル出力は不要。エージェント（LLM）の ToDo/プラン機能（update_plan 等）に、各カテゴリの全テスト項目を登録し、実行中は `in_progress`、完了時に `completed` へ「都度」更新する。
- 原状回復: 各ケース終了時に必ず原状復帰（チェックリスト行に `restored:true` を明記）。
- BLOCKED_ENV の原因記録: ブロック時はチェックリスト行に短い原因語句を必ず併記（例: `blocked（Missing .sln）`）。加えて details に前提チェック結果の内訳（.sln/LSP/index など）を記載する。
- fail / skip の理由記録: fail は簡潔な原因（期待不一致・検証エラー等）をチェックリスト行に併記し、details に根拠（入力・期待・観測・主要診断）を箇条書き。skip も理由を併記（例: `skip（UI 無し）`）。
- コミット禁止: テスト結果/ToDo/キャプチャは成果物扱いで Git には含めない（`.unity/capture/`, `tests/.reports/`, `tests/.todo/` は .gitignore 済）。
- 参照場所の要約:
  - 実行ログ: ターミナル（stdout）
  - テストレポート本体: `tests/.reports/run-<YYYYMMDD_HHmmss>.md`（Git管理外。.gitignore 済）
  - 最新ポインタ: `tests/.reports/latest.md`（当該ランの内容を都度上書き）
  - 追記先ポインタ: `tests/.reports/.current-run`（各カテゴリはこのパスに追記）
  - ToDo 台帳: `tests/.todo/` または `tests/TODO.md`
  - フォーマット仕様: `tests/RESULTS_FORMAT.md`

備考（アーカイブ）:
- スクリーンショット/動画の保存先は固定で `<workspace>/.unity/capture/`。レポートから相対参照可。

## コミュニケーションガイドライン

- 回答は必ず日本語

## ドキュメント管理

- ドキュメントはREADME.md/README.ja.mdに集約する

### Assets配下の扱い（サンプル/Unityプロジェクト側）

- 目的: サンプル・検証・デモ・手動動作確認用のシーン/プレハブ/補助スクリプトを配置。
- 禁止: unity-editor-mcp 実装本体（ランタイム/エディタ拡張の主要コード）を置かない。UPM配布の対象にも含めない。
- 編集: 必要最小限に留める。C#編集は外部CLIで行い、Assets側は参照/設定のみで成立させる。

## バージョン管理

### npm versionコマンドの使用

バージョンアップは必ず`npm version`コマンドを使用する：

- **パッチバージョン**: `npm version patch` (例: 2.9.0 → 2.9.1)
- **マイナーバージョン**: `npm version minor` (例: 2.9.0 → 2.10.0)
- **メジャーバージョン**: `npm version major` (例: 2.9.0 → 3.0.0)

**重要**: package.jsonを直接編集してのバージョン変更は禁止

### バージョンアップ手順（推奨: スクリプト）

- コマンド: `bash scripts/publish.sh <major|minor|patch>`
  - やること: 版上げ（npm version）→ バージョン同期（C#/UPM）→ コミット → タグ作成 → プッシュ
  - 以降は GitHub Actions が自動でリリース（CLI）と npm 公開（MCP）を実行

手動で行う場合:

1. 変更内容に応じて適切なバージョンコマンドを選択
2. `cd mcp-server && npm version [patch|minor|major]`
3. （自動同期）`csharp-lsp/Directory.Build.props` と `UnityEditorMCP/Packages/unity-editor-mcp/package.json` の `version` が更新される
4. 変更をコミット＆プッシュ、タグ `vX.Y.Z` を作成してプッシュ（`git push && git push origin vX.Y.Z`）
5. GitHub Actions の `Release csharp-lsp` 完了を確認（各RIDビルド＋Release公開）
6. `Publish: mcp-server (npm)` の成功を確認（npm公開）

### リリース（自動公開）

- csharp-lsp（GitHub Release に自動公開）
  - トリガ: タグ `vX.Y.Z` のプッシュ
  - CI: self-contained + 単一ファイルで各RIDを `dotnet publish`、`csharp-lsp-csharp-lsp-manifest.json` を生成し Release に添付（Workflow 名: `Release: csharp-lsp`）
  - Node側: `mcp-server/package.json` の `version` と同一タグの `csharp-lsp-manifest.json` を参照し、RID資産をダウンロード（sha256検証）
- mcp-server（npm 公開に自動対応）
  - トリガ: GitHub Release の published（`vX.Y.Z`）
  - CI: `mcp-server` の `npm ci && npm run test:ci && npm publish --access public`（Workflow 名: `Publish: mcp-server (npm)`）
  - 前提: リポジトリSecret `NPM_TOKEN` を設定（npmのPublish権限付きトークン）
- Unity UPM（GitHubパス指定で配布）
  - 消費側は `Packages/csharp-lsp-manifest.json` に Git URL を記載（例）:
    - `"com.unity.editor-mcp": "https://github.com/akiojin/unity-editor-mcp.git#vX.Y.Z"`
  - レジストリ公開は不要。タグに対応した `package.json.version` が使われます。

### リリース自動化（LLM用手順）

- 前提:
  - 作業ツリーがクリーン、テストが成功していること
  - GitHub Actions が有効で、Release作成権限（GITHUB_TOKEN）があること
- 手順（実行コマンド）:
  - `cd mcp-server`
  - `npm version patch|minor|major`
    - 自動で以下が同期される:
      - `csharp-lsp/Directory.Build.props` の `<Version>` 群
      - `UnityEditorMCP/Packages/unity-editor-mcp/package.json` の `version`
  - `git push --follow-tags`
  - GitHub Actions で `csharp-lsp release` の成功を確認
  - GitHub Releases の対象タグ（例: `v2.13.4`）に以下が存在することを確認:
    - `csharp-lsp-{win,osx,linux}-{x64,arm64}[.exe]`（6種）
    - `csharp-lsp-csharp-lsp-manifest.json`（RIDごとの `url/sha256/size` を収録）
  - （必要時）`cd mcp-server && npm publish`

### csharp-lsp リリースの自動化仕様

- トリガ: タグ `vX.Y.Z` のプッシュ（`npm version` により作成）
- CI: self-contained + 単一ファイルで各RIDを `dotnet publish`、`csharp-lsp-csharp-lsp-manifest.json` を生成し Release に添付
- Node側: `mcp-server/package.json` の `version` と同一タグの `csharp-lsp-csharp-lsp-manifest.json` を参照し、RID資産をダウンロード（sha256検証）
- ポリシー: 「常に最新版DL」は行わず、必ず“同一バージョン固定”で取得

## コードクオリティガイドライン

- マークダウンファイルはmarkdownlintでエラー及び警告がない状態にする
- コミットログはcommitlintに対応する

## 開発ガイドライン

- 既存のファイルのメンテナンスを無視して、新規ファイルばかり作成するのは禁止。既存ファイルを改修することを優先する。

## ドキュメント作成ガイドライン

- README.mdには設計などは書いてはいけない。プロジェクトの説明やディレクトリ構成などの説明のみに徹底する。設計などは、適切なファイルへのリンクを書く。

---

## プロジェクト構成（リポジトリ全体）

本リポジトリは「ワークスペース（リポジトリ）ルート」を基点として、Unityプロジェクト・Node製MCPサーバ・C# LSP を同居させています。パスは常にワークスペースルート基準で解決します。

- ワークスペースルート
  - 定義: コーディングエージェント（Codex等）が「起動したディレクトリ」。
  - 設定: `./.unity/config.json` の `project.root` に Unity プロジェクトの相対/絶対パスを記載。
  - Node側は起動時にこの設定を読み、以後「固定の WORKSPACE_ROOT」として保持し、Unityへの全コマンドに `workspaceRoot` を同梱します（`process.cwd()`の変動には依存しない）。

- `.unity/`
  - `config.json`: ワークスペースの設定。特に `project.root` は Unity プロジェクトルートを指す（相対なら `.unity` の1階層上を基準）。
  - `capture/`: スクリーンショット・動画の固定保存先。一時成果物としてGit管理外（`.gitignore` 済）。

- `UnityEditorMCP/`（Unityプロジェクト）
  - `Packages/unity-editor-mcp/**`（UPMパッケージ 実装本体／ソース・オブ・トゥルース）
  - `Assets/**` はサンプル/検証用途（実装本体を置かない）
  - `Library/PackageCache/**` は自動生成（編集禁止）
  - エディタ拡張のスクショ/動画ハンドラ:
    - `Editor/Handlers/ScreenshotHandler.cs`:
      - 保存先は常に `<workspace>/.unity/capture/screenshot_<mode>_<timestamp>.png`
      - Nodeから受け取る `workspaceRoot` を優先。未受領時のみ `.unity/config.json` を用いてフォールバック解決。
    - `Editor/Handlers/VideoCaptureHandler.cs`:
      - Unity Recorder（必須依存）で mp4/webm へ録画。
      - 保存先は常に `<workspace>/.unity/capture/recording_<mode>_<timestamp>.(mp4|webm)`。
      - Nodeから受け取る `workspaceRoot` を優先採用。

- `mcp-server/`（Node製 MCP サーバ）
  - `src/core/config.js`:
    - 起動時に `./.unity/config.json` を読み込み、`WORKSPACE_ROOT` を確定・固定（`process.cwd()`変動非依存）。
  - ハンドラ登録: `src/handlers/index.js`
  - スクリーンショット: `src/handlers/screenshot/CaptureScreenshotToolHandler.js`
    - Unityコマンド `capture_screenshot` に `workspaceRoot` を常時付与。
  - 動画: `src/handlers/video/`（`CaptureVideoStart/Stop/Status/For`）
    - `capture_video_start` / `capture_video_for` で `workspaceRoot` を常時付与。
    - `capture_video_for` は「N秒録画→自動停止」を一括実行。

- `csharp-lsp/`（外部 Roslyn Workspace CLI）
  - 目的: `.sln/.csproj` を MSBuildWorkspace でロードし、`find_symbol`/`find_referencing_symbols`/`replace_symbol_body`/`insert_{before,after}` を安全に提供。
  - 実行: MCPサーバ（Node）からCLIを呼び出し、Unityとは直接通信しない。
- 成果物: 自己完結バイナリは `.unity/tools/csharp-lsp/<rid>/` 配下（Git管理外推奨）。

### パス解決ポリシー（統一）
- スクリーンショット/動画の出力先は常にワークスペースルート固定の `./.unity/capture/`。
- Node側が `WORKSPACE_ROOT` を決定し、全Unityコマンドに `workspaceRoot` を付与。
- Unity側は `workspaceRoot` を優先採用し、未受領時のみ `.unity/config.json` の `project.root` によるフォールバックでワークスペースを探索。
- `process.cwd()` 変化・環境変数には依存しない。
