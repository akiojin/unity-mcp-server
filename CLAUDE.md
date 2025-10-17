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

### Spec駆動開発ライフサイクル

新機能の開発は、以下の3ステップで進めます：

1. **`/specify`**: 機能仕様書を作成 (`specs/SPEC-[UUID8桁]/spec.md`)
   - ビジネス要件とユーザーストーリーを定義
   - 「何を」「なぜ」に焦点を当てる（「どのように」は含めない）
   - 機能ブランチの作成と仕様ファイルの初期化

2. **`/plan`**: 実装計画を作成 (`specs/SPEC-[UUID8桁]/plan.md`)
   - 技術スタック、アーキテクチャ、データモデルを設計
   - 憲章チェック（TDD/LLM最適化/シンプルさの原則）
   - Phase 0: 技術リサーチ (`research.md`)
   - Phase 1: 設計とコントラクト (`data-model.md`, `contracts/`, `quickstart.md`)
   - Phase 2: タスク計画 (`tasks.md`)

3. **`/tasks`**: 実行可能なタスクに分解 (`specs/SPEC-[UUID8桁]/tasks.md`)
   - Setup/Test/Core/Integration/Polishに分類
   - 並列実行可能なタスクに`[P]`マーク付与
   - 依存関係を明確化

#### Spec命名規則

- **形式**: `SPEC-[UUID8桁]`
- **UUID生成**: ランダムな英数字（小文字）8桁
  - ✅ 正しい例: `SPEC-a1b2c3d4`, `SPEC-3f8e9d2a`, `SPEC-7c4b1e5f`
  - ❌ 間違い例: `SPEC-001`, `SPEC-gameobj`, `SPEC-core-001`
- **禁止事項**:
  - 連番の使用（001, 002...）
  - 意味のある名前（gameobj, core, ui...）
  - 大文字の使用（UUID部分は小文字のみ）
- **生成方法**: `uuidgen | tr '[:upper:]' '[:lower:]' | cut -c1-8` またはオンラインUUID生成ツール

### TDD遵守（妥協不可）

**絶対遵守事項:**

- **Red-Green-Refactorサイクル必須**:
  1. **RED**: テストを書く → テスト失敗を確認
  2. **GREEN**: 最小限の実装でテスト合格
  3. **REFACTOR**: コードをクリーンアップ

- **禁止事項**:
  - テストなしでの実装
  - REDフェーズのスキップ（テストが失敗することを確認せずに実装）
  - 実装後のテスト作成（テストが実装より後のコミットになる）

- **Git commitの順序**:
  - テストコミットが実装コミットより先に記録される必要がある
  - 例: `feat(test): Fooのテスト追加` → `feat: Foo実装`

- **テストカテゴリと順序**:
  1. Contract tests (統合テスト) → API/インターフェース定義
  2. Integration tests → クリティカルパス100%
  3. E2E tests → 主要ユーザーワークフロー
  4. Unit tests → 個別機能、80%以上のカバレッジ

**詳細は [`memory/constitution.md`](memory/constitution.md) を参照**

### SDD (Spec-Driven Development) 規約

**すべての機能開発・要件追加は `/specify` から開始**

**新規機能開発フロー**:

1. `/specify` - ビジネス要件を定義（技術詳細なし）
2. `/plan` - 技術設計を作成（憲章チェック必須）
3. `/tasks` - 実行可能タスクに分解
4. タスク実行（TDDサイクル厳守）

**既存機能のSpec化フロー**:

1. `/specify` - 実装済み機能のビジネス要件を文書化
2. `/plan` - （必要に応じて）技術設計を追記
3. 既存実装とSpecの整合性確認

**Spec作成原則**:

- ビジネス価値とユーザーストーリーに焦点
- 「何を」「なぜ」のみ記述（「どのように」は禁止）
- 非技術者が理解できる言葉で記述
- テスト可能で曖昧さのない要件

**憲章準拠**:

- すべての実装は [`memory/constitution.md`](memory/constitution.md) に準拠
- TDD、ハンドラーアーキテクチャ、LLM最適化は妥協不可

## コミュニケーションガイドライン

- 回答は必ず日本語

## ドキュメント管理

- ドキュメントはREADME.md/README.ja.mdに集約する

### Assets配下の扱い（サンプル/Unityプロジェクト側）

- 目的: サンプル・検証・デモ・手動動作確認用のシーン/プレハブ/補助スクリプトを配置。
- 禁止: unity-mcp-server 実装本体（ランタイム/エディタ拡張の主要コード）を置かない。UPM配布の対象にも含めない。
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
3. Unity packageのバージョンも同期して更新（unity-mcp-server/package.json）
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

本リポジトリは「ワークスペース（リポジトリ）ルート」を基点として、Unityプロジェクト・Node製MCPサーバ・C# LSP を同居させています。パスは常にワークスペースルート基準で解決します。

- ワークスペースルート
  - 定義: コーディングエージェント（Codex等）が「起動したディレクトリ」。
  - 設定: `./.unity/config.json` の `project.root` に Unity プロジェクトの相対/絶対パスを記載。
  - Node側は起動時にこの設定を読み、以後「固定の WORKSPACE_ROOT」として保持し、Unityへの全コマンドに `workspaceRoot` を同梱します（`process.cwd()`の変動には依存しない）。

- `.unity/`
  - `config.json`: ワークスペースの設定。特に `project.root` は Unity プロジェクトルートを指す（相対なら `.unity` の1階層上を基準）。
  - `capture/`: スクリーンショット・動画の固定保存先。一時成果物としてGit管理外（`.gitignore` 済）。

- `UnityMCPServer/`（Unityプロジェクト）
  - `Packages/unity-mcp-server/**`（UPMパッケージ 実装本体／ソース・オブ・トゥルース）
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
  - 成果物: 自己完結バイナリは `.tools/csharp-lsp/<rid>/` 配下（Git管理外推奨）。

### パス解決ポリシー（統一）
- スクリーンショット/動画の出力先は常にワークスペースルート固定の `./.unity/capture/`。
- Node側が `WORKSPACE_ROOT` を決定し、全Unityコマンドに `workspaceRoot` を付与。
- Unity側は `workspaceRoot` を優先採用し、未受領時のみ `.unity/config.json` の `project.root` によるフォールバックでワークスペースを探索。
- `process.cwd()` 変化・環境変数には依存しない。

### Git 管理
- `/.unity/capture/` は `.gitignore` に登録（一時成果物の保護）。
- `Library/PackageCache/**` は編集禁止（生成物）。
