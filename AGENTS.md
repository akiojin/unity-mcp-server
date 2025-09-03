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

## コミュニケーションガイドライン

- 回答は必ず日本語

## ドキュメント管理

- ドキュメントはREADME（英/日）に集約する

### C#編集ポリシー（重要・外部化）

- C#の探索/参照/構造化編集は、Unity外部のRoslyn WorkspaceベースのCLI（オンデマンド実行）で行う。Unityとは通信しない。
- Unityパッケージ内のC#編集・検索系エンドポイント（Script系）は使用しない（非推奨）。必要最小限の`AssetDatabase.Refresh`等の補助のみ許可。
- 変更フローは「外部CLIで構造化編集（プリフライト必須）→ 保存 →（必要時のみ）Unityで手動Refresh」。
- Unity側でC#を直接編集する必要がある場合のみ、`Packages/unity-editor-mcp/**` に限り、Unity MCP Scriptツールを使用し、次の順序で検証すること：
  - 「previewで差分確認 → 適用 → `UnityMCP__refresh_assets` → `UnityMCP__wait_for_editor_state`」
  - ただし、通常は外部CLIを優先する。

### UPMパッケージ配置と編集対象（Unity側実装本体）

- 実装本体の配置: `UnityEditorMCP/Packages/unity-editor-mcp/**`
  - UPM配布のソース・オブ・トゥルースはこのディレクトリ配下。
  - `Library/PackageCache/**` はPackage Managerの一時領域。編集禁止（再生成で消失）。
  - `UnityEditorMCP/Assets/**` はサンプル/検証向けであり、実装本体や配布対象には含めない。
- 実装手段: 上記ディレクトリのメンテナンスは最小限とし、C#探索/編集は外部CLIに委譲。やむを得ない場合のみScript系ツールで編集し、前述の手順で検証。
- 注意: レジストリ配布の読み取り専用パッケージを編集する必要がある場合は、まず埋め込み（Embedded）に変換してから対応すること。

### Assets配下の扱い（サンプル/Unityプロジェクト側）

- 目的: サンプル・検証・デモ・手動動作確認用のシーン/プレハブ/補助スクリプトを配置。
- 禁止: 実装本体（ランタイム/エディタ拡張の主要コード）を置かない。UPM配布の対象にも含めない。
- 編集: 必要最小限に留める。C#編集は外部CLIで行い、Assets側は参照/設定のみで成立させる。

### 外部Roslyn CLI（設計概要）

- 目的: `.sln/.csproj` をRoslyn/MSBuildWorkspaceでロードし、`find_symbol`/`find_referencing_symbols`/`replace_symbol_body`/`insert_{before,after}` を提供。
- 方式: オンデマンドCLI（非常駐）。標準入出力でJSON I/O。未保存バッファは対象外（必要なら仮想ドキュメント差し替えでプリフライト可能）。
- セーフティ: すべて構造化限定。プリフライト（Roslyn診断）でエラーが増える場合は不適用。バッチ適用→まとめて保存。
- Unity連携: 自動Refreshは行わない。必要時のみ手動`AssetDatabase.Refresh`を実行。

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

## LLM実運用テンプレート（Serena流オーケストレーション統合）

目的: トークン消費を抑えつつ、ゼロエラーで安全にC#編集を行うための実行SOP。

### 基本原則（強制）

- シンボル先行: 変更前に必ず `UnityMCP__script_symbols_get` で対象クラス/メソッドを特定。対象外なら編集しない。
- 構造化限定: 変更は `UnityMCP__script_edit_structured`（`replace_body`/`insert_after`/`insert_before`）のみを使用。
- スコープ厳守: 追加メンバーはクラス直下にのみ挿入（`kind:"class"` を明示）。メソッド内へのメンバー定義挿入は禁止（CS0106対策）。
- 一括反映: 複数編集は `refreshMode:"none"` で適用し、最後に1回だけ `UnityMCP__refresh_assets`→`UnityMCP__wait_for_editor_state`。

### トークン最適化（既定）

- 短読込: `UnityMCP__script_read` は署名周辺 30–40 行のみ（本文の全読込はしない）。
- プレビュー抑制: 既定は `preview:false`。巨大 diff を返すプレビューは原則使わない（微小・高リスク時のみ）。
- 軽量ビルド確認: 通常は `get_compilation_state { includeMessages:false }`。エラー時のみ `includeMessages:true, maxMessages:10`。
- 検索は軽量: `script_search` は `returnMode:"snippets"|"metadata"`＋`snippetContext:1–2` を使用（`full` 禁止）。

### ガード（自動検証と復旧）

- 置換前チェック: `replace_body.newText` の波括弧バランスと戻り値パスを自己検査（負の深さ/未閉鎖なし）。
- 適用後パース: 同ファイルへ再度 `script_symbols_get` を実行し、シンボルツリー取得可否で健全性を確認。
- 自動ロールバック: コンパイルエラー発生時は直前の変更ファイルのみを即時復旧（バックアップ/バージョン管理を利用）。

### 禁止事項（違反時は編集中断）

- メソッド途中の行範囲削除や広域正規表現での大塊削除。
- メソッド内に `private/public` などのメンバー定義を挿入。
- 毎編集ごとの `refresh_assets` 多発（必ず一括反映）。

### 実行レシピ（コピペ用）

1) 構造取得: `UnityMCP__script_symbols_get { path:"<path>" }`
2) 署名読込: `UnityMCP__script_read { path:"<path>", startLine:<methodStart>, endLine:<methodStart+30> }`
3) 本体置換: `UnityMCP__script_edit_structured { operation:"replace_body", path:"<path>", symbolName:"<method>", kind:"method", newText:"{ ... }", preview:false, refreshMode:"none" }`
4) 追加（必要時）: `UnityMCP__script_edit_structured { operation:"insert_after", path:"<path>", symbolName:"<class>", kind:"class", newText:"\nprivate static ... { ... }\n", preview:false, refreshMode:"none" }`
5) 一括反映: `UnityMCP__refresh_assets` → `UnityMCP__wait_for_editor_state`
6) 確認: `UnityMCP__get_compilation_state { includeMessages:false }`（失敗時のみ詳細取得）

### Serena思考ゲート（任意だが推奨）

- 事前: `serena__think_about_task_adherence`（対象/目的/スコープの整合確認）
- 中間: `serena__think_about_collected_information`（読込量が最小か）
- 事後: `serena__think_about_whether_you_are_done`（想定結果が満たされたか）

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

### Git 管理
- `/.unity/capture/` は `.gitignore` に登録（一時成果物の保護）。
- `Library/PackageCache/**` は編集禁止（生成物）。
