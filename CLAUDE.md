# CLAUDE.md

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

1. **`/speckit.specify`**: 機能仕様書を作成 (`specs/SPEC-[UUID8桁]/spec.md`)
   - ビジネス要件とユーザーストーリーを定義
   - 「何を」「なぜ」に焦点を当てる（「どのように」は含めない）
   - SPECディレクトリ、featureブランチ、Worktreeを自動作成
   - 作業は`.worktrees/SPEC-xxx/`内で実施

2. **`/speckit.plan`**: 実装計画を作成 (`specs/SPEC-[UUID8桁]/plan.md`)
   - 技術スタック、アーキテクチャ、データモデルを設計
   - 憲章チェック（TDD/LLM最適化/シンプルさの原則）
   - Phase 0: 技術リサーチ (`research.md`)
   - Phase 1: 設計とコントラクト (`data-model.md`, `contracts/`, `quickstart.md`)
   - Phase 2: タスク計画 (`tasks.md`)

3. **`/speckit.tasks`**: 実行可能なタスクに分解 (`specs/SPEC-[UUID8桁]/tasks.md`)
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

#### Worktree＆ブランチ運用（必須）

**すべてのSPEC開発はWorktreeで並行作業**

本プロジェクトは**Git Worktree**を使用した並行開発フローを採用しています。各SPECは独立したWorktreeで作業し、完了後にGitHub Pull Requestを作成して自動マージします（**GitHub Actions自動マージ**）。

**ブランチ命名規則**:

- **形式**: `feature/SPEC-[UUID8桁]`
- **例**: `feature/SPEC-a1b2c3d4`, `feature/SPEC-3f8e9d2a`
- 各SPECに対して1つのfeatureブランチを作成
- developブランチから派生

**Worktree配置**:

- **場所**: `.worktrees/SPEC-[UUID8桁]/`
- **例**: `.worktrees/SPEC-a1b2c3d4/`
- Git管理外（`.gitignore`登録済み）
- 各Worktreeは完全な作業ツリーを持つ

**新規SPEC作成フロー**:

1. `/speckit.specify` コマンド実行
   - SPECディレクトリ作成（`specs/SPEC-xxx/`）
   - featureブランチ作成（`feature/SPEC-xxx`）
   - Worktree作成（`.worktrees/SPEC-xxx/`）
   - 初期ファイル生成（`spec.md`）

2. Worktreeに移動して作業開始:
   ```bash
   cd .worktrees/SPEC-a1b2c3d4/
   ```

3. 独立して開発作業を実行:
   - TDDサイクル厳守
   - 各変更をコミット
   - 他のSPECと完全に独立

**作業完了フロー**:

1. Worktree内で最終コミット完了を確認
2. finish-featureスクリプト実行:
   ```bash
   .specify/scripts/bash/finish-feature.sh
   # またはドラフトPRとして作成:
   .specify/scripts/bash/finish-feature.sh --draft
   ```

3. 自動実行される処理:
   - featureブランチをリモートにpush
   - GitHub PRを自動作成（spec.mdからタイトル取得）
   - GitHub ActionsでRequiredチェックを監視し、自動マージ可否を判定
   - Requiredチェックがすべて成功した場合のみ自動的にdevelopへマージ（`--no-ff`で履歴保持）

**既存SPEC移行**:

既存の16個のSPECは既にWorktree移行済み。各SPECは以下で確認:

```bash
# 全Worktree一覧
git worktree list

# 全featureブランチ一覧
git branch | grep "feature/SPEC-"

# 特定SPECで作業開始
cd .worktrees/SPEC-0d5d84f9/
```

**重要な注意事項**:

- **mainブランチで直接SPEC作業禁止**: 必ずWorktreeを使用
- **PR自動マージ**: GitHub Actionsで Required チェック完了後に自動マージ
- **ドラフトPR**: `--draft`オプションで作成したPRは自動マージ対象外
- **並行開発推奨**: 複数のSPECを同時に異なるWorktreeで作業可能
- **Worktree間の独立性**: 各Worktreeは完全に独立（相互干渉なし）
- **コミット**: Worktree内でのコミットはfeatureブランチに記録される
- **GitHub CLI必須**: `gh auth login`で認証が必要

**スクリプト**:

- `.specify/scripts/bash/create-new-feature.sh`: 新規SPEC＆Worktree作成
- `.specify/scripts/bash/finish-feature.sh`: PR作成（自動マージトリガー）
- `.specify/scripts/checks/*.sh`: 任意チェック用スクリプト（tasks/tests/compile/commits 等）

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

**すべての機能開発・要件追加は `/speckit.specify` から開始**

**新規機能開発フロー**:

1. `/speckit.specify` - ビジネス要件を定義（技術詳細なし）
   - 自動的にfeatureブランチ＆Worktree作成
   - `.worktrees/SPEC-xxx/`に移動して作業開始
2. `/speckit.plan` - 技術設計を作成（憲章チェック必須）
   - Worktree内で実行
3. `/speckit.tasks` - 実行可能タスクに分解
   - 実装実行は `/speckit.implement` で補助的に利用可能
   - Worktree内で実行
4. タスク実行（TDDサイクル厳守）
   - Worktree内で独立して作業
   - 各変更をfeatureブランチにコミット
5. 完了後、`finish-feature.sh`でdevelopにマージ＆Worktree削除

**既存機能のSpec化フロー**:

1. 対応するWorktreeに移動: `cd .worktrees/SPEC-xxx/`
2. `/speckit.specify` - 実装済み機能のビジネス要件を文書化
3. `/speckit.plan` - （必要に応じて）技術設計を追記
4. 既存実装とSpecの整合性確認
5. 完了後、`finish-feature.sh`でdevelopにマージ

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

### C#スクリプト編集ツールの使い分け

#### `script_edit_snippet`: 軽量スニペット編集（1〜2行、80文字以内）

**用途**:
- nullガード削除
- 条件式の微修正（`if (x > 10)` → `if (x > 20)`）
- return直前のログ挿入
- 短い文の追加・削除

**必須条件**:
- アンカー文字列を厳密に指定（前後の空白・改行を含む正確な一致）
- 差分が80文字以内
- アンカーが一意（複数マッチはエラー）
- 1回のリクエストで最大10箇所まで

**使用例**:

```javascript
// ガード削除
{
  "path": "Assets/Scripts/Player.cs",
  "instructions": [
    {
      "operation": "delete",
      "anchor": {
        "type": "text",
        "target": "        if (health == null) return;\n"
      }
    }
  ]
}

// 条件式変更
{
  "path": "Assets/Scripts/Enemy.cs",
  "instructions": [
    {
      "operation": "replace",
      "anchor": {
        "type": "text",
        "target": "if (distance < 5.0f)"
      },
      "newText": "if (distance < 10.0f)"
    }
  ]
}

// ログ挿入（after）
{
  "path": "Assets/Scripts/GameManager.cs",
  "instructions": [
    {
      "operation": "insert",
      "anchor": {
        "type": "text",
        "target": "        Initialize();\n"
      },
      "newText": "        Debug.Log(\"Initialized\");\n"
    }
  ]
}

// ログ挿入（before）
{
  "path": "Assets/Scripts/GameManager.cs",
  "instructions": [
    {
      "operation": "insert",
      "anchor": {
        "type": "text",
        "target": "        Process();\n",
        "position": "before"
      },
      "newText": "        Validate();\n"
    }
  ]
}
```

#### `script_edit_structured`: 構造化編集（メソッド本体、クラスメンバー追加）

**用途**:
- メソッド本体の差し替え
- クラスレベルのメンバー追加
- 名前空間への要素追加

**制約**:
- insert系はクラス/名前空間のみを対象
- `replace_body` はブレースを含む自己完結ボディ
- namePath（`Outer/Nested/Member`）で対象を特定

**使用例**:

```javascript
// メソッド本体置換
{
  "path": "Assets/Scripts/Foo.cs",
  "namePath": "Foo/Execute",
  "operation": "replace_body",
  "newText": "{\n    DoSomething();\n    DoAnother();\n}"
}

// クラスメンバー追加
{
  "path": "Assets/Scripts/Bar.cs",
  "namePath": "Bar",
  "operation": "insert_after",
  "newText": "private int _count;\n"
}
```

#### プレビューモード（`preview=true`）

**推奨使用タイミング**:
- 初回適用時
- 複雑な編集（5箇所以上のバッチ編集）
- 不確実なアンカー

**動作**:
- ファイル書き込みなし
- LSP構文検証実行
- 編集後プレビューテキスト返却

#### エラーハンドリング

**よくあるエラー**:

1. **`anchor_not_unique`**: 複数箇所にマッチ
   - **解決策**: アンカー文字列をより具体的に（前後コンテキストを含める）

2. **`anchor_not_found`**: アンカーが見つからない
   - **解決策**: ファイル内容を確認し、空白・改行を正確にコピー

3. **`diff exceeds 80 characters`**: 差分が80文字超
   - **解決策**: `script_edit_structured` に切り替え

4. **構文エラー**: LSP診断で括弧不整合検出
   - **解決策**: 編集はロールバックされる。アンカーまたは newText を修正

#### トラブルシューティング

**Q: アンカーが見つからない**
- A: `script_read` でファイル内容を確認し、空白・改行を含む正確な文字列をコピー

**Q: 複数箇所にマッチしてしまう**
- A: アンカーに前後数行のコンテキストを含めて一意にする

**Q: 80文字制限に引っかかる**
- A: `script_edit_structured` で replace_body を使用

**Q: 編集が反映されない**
- A: `preview=false` で apply モードになっているか確認

**Q: 構文エラーが出る**
- A: `preview=true` で事前確認。LSP診断結果を確認してから修正

#### ベストプラクティス

1. **アンカー文字列の指定**:
   - インデント（空白・タブ）を正確に含める
   - 改行文字（`\n`）を明示的に含める
   - 一意性を確保するため前後コンテキストを含める

2. **バッチ編集**:
   - 順序を意識（上から下へ適用されるため、後の編集が先の編集に影響する）
   - 最大10箇所まで、それ以上は複数リクエストに分割

3. **検証**:
   - 初回は `preview=true` で確認
   - LSP診断エラーがあれば適用しない
   - 適用後は Unity Editor でコンパイルエラーを確認

## バージョン管理

### 自動リリース（semantic-release）

本プロジェクトは**semantic-release**を使用した完全自動リリースフローを採用しています。

#### Conventional Commits規約

コミットメッセージで自動的にバージョンが決定されます：

- **`feat:`** - 新機能追加 → **minor** version up (例: 2.16.3 → 2.17.0)
- **`fix:`** - バグ修正 → **patch** version up (例: 2.16.3 → 2.16.4)
- **`BREAKING CHANGE:`** または **`feat!:`** - 破壊的変更 → **major** version up (例: 2.16.3 → 3.0.0)
- **`chore:`**, **`docs:`**, **`test:`** - version up なし

#### リリースフロー（3層: feature → develop → main）

1. **featureブランチで開発**（Conventional Commitsを使用）
2. **finish-feature.sh実行** → PR作成（developベース）
3. **Required Checks成功** → 自動マージ（developへ）
4. **developブランチで変更を蓄積**（複数のfeatureを統合）
5. **`/release` コマンド実行** → develop → main PR作成
6. **Required Checks成功** → 自動マージ（mainへ）
7. **semantic-release自動実行**:
   - コミット解析 → バージョン決定
   - package.json更新（mcp-server + Unity Package自動同期）
   - CHANGELOG.md生成
   - タグ作成（v*）
8. **csharp-lspビルド**（全プラットフォーム）
9. **GitHub Release作成**
10. **npm publish実行**

**重要**: 手動でのバージョン変更・npm publishは禁止（すべて自動化）

#### コミット例

```bash
# 新機能追加（minor version up）
git commit -m "feat: Add video capture support"

# バグ修正（patch version up）
git commit -m "fix: Resolve screenshot path issue"

# 破壊的変更（major version up）
git commit -m "feat!: Remove deprecated API"

# バージョンアップなし
git commit -m "chore: Update dependencies"
git commit -m "docs: Update README"
git commit -m "test: Add unit tests"
```

#### バージョン同期

- **mcp-server**: semantic-releaseが自動更新
- **Unity Package**: scripts/sync-unity-package-version.jsで自動同期
- **csharp-lsp**: 同一バージョンでタグ作成、GitHub Releaseに添付
- **CHANGELOG.md**: コミットメッセージから自動生成

#### トラブルシューティング

- **リリースが作成されない**: Conventional Commits形式を確認
- **バージョンが不正**: semantic-releaseのログを確認
- **Unity Packageバージョン同期失敗**: sync-unity-package-version.jsのログを確認

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
  - 動画: `src/handlers/video/`（`VideoCaptureStart/Stop/Status/For`）
    - `capture_video_start` / `capture_video_for` で `workspaceRoot` を常時付与。
    - `capture_video_for` は「N秒録画→自動停止」を一括実行。

- `csharp-lsp/`（外部 Roslyn Workspace CLI）
  - 目的: `.sln/.csproj` を MSBuildWorkspace でロードし、`find_symbol`/`find_referencing_symbols`/`replace_symbol_body`/`insert_{before,after}` を安全に提供。
  - 実行: MCPサーバ（Node）からCLIを呼び出し、Unityとは直接通信しない。
  - 成果物: 自己完結バイナリは `~/.unity/tools/csharp-lsp/<rid>/` 配下（Git管理外推奨）。

### パス解決ポリシー（統一）
- スクリーンショット/動画の出力先は常にワークスペースルート固定の `./.unity/capture/`。
- Node側が `WORKSPACE_ROOT` を決定し、全Unityコマンドに `workspaceRoot` を付与。
- Unity側は `workspaceRoot` を優先採用し、未受領時のみ `.unity/config.json` の `project.root` によるフォールバックでワークスペースを探索。
- `process.cwd()` 変化・環境変数には依存しない。

### Git 管理
- `/.unity/capture/` は `.gitignore` に登録（一時成果物の保護）。
- `Library/PackageCache/**` は編集禁止（生成物）。

### MCPサーバー開発メモ（汎用）
- **公式コンプライアンス検証**: OpenAI MCP Compliance Suite をCIに組み込み、初期化ハンドシェイク・tool呼び出し・キャンセルの順守を自動確認する。`npx mcp-compliance run --config compliance.json` を基本とし、失敗時はGitステータスで即検知。
- **ハーネスベースの単体テスト**: Mandrelなどのモッククライアントでhandlerを直接呼び、Schemaバリデーションとリトライ/タイムアウト挙動を高速にテスト。長時間ジョブやキャンセルを再現できるようサブトランスポートを差し替える。
- **パフォーマンス計測**: LiveMCPBench等のベンチツールで同時呼び出し数・バックプレッシャ・リソース消費を可視化し、しきい値を定義。定期実行してリグレッションを検知する。
- **セキュリティテンプレート**: MCPSecテンプレートを取り込み、tool allowlist逸脱・認証情報注入・レートリミット突破を自動テスト。OPA等を使いポリシーをコード化する。
- **カオス試験**: ソケット遮断や遅延を注入し、再接続戦略・ジョブキューの耐障害性を検証。CIのナイトリービルドで実施しログを蓄積。
- **テレメトリ＆リプレイ**: MCP Companion ToolkitなどでJSON-RPCログを収集し、問題再現時にローカルでリプレイ。実装の可観測性を高める。
- **ドキュメント整備**: 上記フローと対応手順をREADMEや運用Runbookに反映し、新規開発者が同じ手順を踏めるようにする。
