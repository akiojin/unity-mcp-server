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
- 出力先: `tests/.reports/<category>-<YYYYMMDD_HHmmss>.md`（Git管理外、.gitignore 済）。チェックリスト＋サマリテーブル形式。
- ToDo運用: 実行前に該当カテゴリの全テストを Markdown チェックリストとして ToDo 化。保存は `tests/.todo/<category>-<timestamp>.md` または `tests/TODO.md`（Git管理外）。テンプレートは `tests/TODO_TEMPLATE.md` を参照。各ケースの状態変更（pending→in_progress→completed/blocked）は「都度」ファイルへ書き戻すこと（最後にまとめて更新しない）。必要に応じて一時ファイルからのアトミック rename を用いて競合・破損を回避。
- 原状回復: 各ケース終了時に必ず原状復帰（`restored=true` をJSONに含める）。
- コミット禁止: テスト結果/ToDo/キャプチャは成果物扱いで Git には含めない（`.unity/capture/`, `tests/.reports/`, `tests/.todo/` は .gitignore 済）。
- 参照場所の要約:
  - 実行ログ: ターミナル（stdout）
  - ファイル保存した結果: `tests/.reports/`（任意）
  - ToDo 台帳: `tests/.todo/` または `tests/TODO.md`
  - フォーマット仕様: `tests/RESULTS_FORMAT.md`

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

### バージョンアップ手順

1. 変更内容に応じて適切なバージョンコマンドを選択
2. mcp-serverディレクトリで: `npm version [patch|minor|major]`
3. Unity packageのバージョンも同期して更新（unity-editor-mcp/package.json）
4. git commit & push
5. npm publish

## コードクオリティガイドライン

- マークダウンファイルはmarkdownlintでエラー及び警告がない状態にする
- コミットログはcommitlintに対応する

## 開発ガイドライン

- 既存のファイルのメンテナンスを無視して、新規ファイルばかり作成するのは禁止。既存ファイルを改修することを優先する。

## ドキュメント作成ガイドライン

- README.mdには設計などは書いてはいけない。プロジェクトの説明やディレクトリ構成などの説明のみに徹底する。設計などは、適切なファイルへのリンクを書く。

---

## プロジェクト構成（リポジトリ全体）

本リポジトリは「ワークスペース（リポジトリ）ルート」を基点として、Unityプロジェクト・Node製MCPサーバ・Roslyn CLI を同居させています。パスは常にワークスペースルート基準で解決します。

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

- `roslyn-cli/`（外部 Roslyn Workspace CLI）
  - 目的: `.sln/.csproj` を MSBuildWorkspace でロードし、`find_symbol`/`find_referencing_symbols`/`replace_symbol_body`/`insert_{before,after}` を安全に提供。
  - 実行: MCPサーバ（Node）からCLIを呼び出し、Unityとは直接通信しない。
  - 成果物: 自己完結バイナリは `.tools/roslyn-cli/<rid>/` 配下（Git管理外推奨）。

### パス解決ポリシー（統一）
- スクリーンショット/動画の出力先は常にワークスペースルート固定の `./.unity/capture/`。
- Node側が `WORKSPACE_ROOT` を決定し、全Unityコマンドに `workspaceRoot` を付与。
- Unity側は `workspaceRoot` を優先採用し、未受領時のみ `.unity/config.json` の `project.root` によるフォールバックでワークスペースを探索。
- `process.cwd()` 変化・環境変数には依存しない。
