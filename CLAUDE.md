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
- この環境には `git` と `gh` コマンドが揃っているため、push や PR 作成は `git push` や `gh pr create` などを用いて自力で実行し、「できない」と言い訳しないこと
- 作業（タスク）は、最大限の並列化をして進める
- 作業（タスク）は、最大限の細分化をしてToDoに登録する
- 作業（タスク）の開始前には、必ずToDoを登録した後に作業を開始する
- 作業（タスク）は、忖度なしで進める

### Spec駆動開発ライフサイクル

新機能の開発は、以下の3ステップで進めます：

1. **`/speckit.specify`**: 機能仕様書を作成 (`specs/SPEC-[UUID8桁]/spec.md`)
   - ビジネス要件とユーザーストーリーを定義
   - 「何を」「なぜ」に焦点を当てる（「どのように」は含めない）
   - SPECディレクトリを自動作成（`specs/SPEC-xxxxxxxx/`）
   - Gitブランチ/Worktreeは作成しない（必要なら手動運用）

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
- **UUID生成**: ランダムな16進数（小文字）8桁（`a-f0-9`）
  - ✅ 正しい例: `SPEC-a1b2c3d4`, `SPEC-3f8e9d2a`, `SPEC-7c4b1e5f`
  - ❌ 間違い例: `SPEC-001`, `SPEC-gameobj`, `SPEC-core-001`
- **禁止事項**:
  - 連番の使用（001, 002...）
  - 意味のある名前（gameobj, core, ui...）
  - 大文字の使用（UUID部分は小文字のみ）
- **生成方法**: `uuidgen | tr '[:upper:]' '[:lower:]' | cut -c1-8` またはオンラインUUID生成ツール

#### ブランチ運用（任意）

Speckitは要件ディレクトリ（`specs/SPEC-xxxxxxxx/`）のみを作成し、**Gitブランチ/Worktreeは作成しません**。

**現在の作業対象要件の選択**:

- `/speckit.specify` 実行時に、対象の `FEATURE_ID` が `.specify/current-feature` に保存されます。
- 以降の `/speckit.plan`・`/speckit.tasks` などは、この値を参照して `specs/SPEC-xxxxxxxx/` を特定します。
- 明示的に切り替えたい場合は、環境変数 `SPECIFY_FEATURE=SPEC-xxxxxxxx` を設定しても構いません。

**要件一覧**:

- `specs/README.md` は `/speckit.specify` 実行時に自動更新されます。
- 手動で再生成する場合は `.specify/scripts/bash/update-specs-readme.sh` を実行します。

**ブランチが必要な場合**（任意）:

- 通常のGit運用に従って手動でブランチを作成してください（Speckitは関与しません）。

**スクリプト**:

- `.specify/scripts/bash/create-new-feature.sh`: 新規SPEC作成（ブランチなし）
- `.specify/scripts/bash/update-specs-readme.sh`: `specs/README.md` の再生成
- `.specify/scripts/checks/*.sh`: 任意チェック用スクリプト（tasks/tests/compile/commits 等）

**Speckitアップデート**:

- 手順（Runbook）: `docs/runbooks/speckit-upgrade.md`
- 上流スナップショット取得（比較用）: `bash scripts/upgrade-speckit.sh --tag vX.Y.Z`

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

**詳細は [`docs/constitution.md`](docs/constitution.md) を参照**

### SDD (Spec-Driven Development) 規約

**すべての機能開発・要件追加は `/speckit.specify` から開始**

**新規機能開発フロー**:

1. `/speckit.specify` - ビジネス要件を定義（技術詳細なし）
2. `/speckit.plan` - 技術設計を作成（憲章チェック必須）
3. `/speckit.tasks` - 実行可能タスクに分解
   - 実装実行は `/speckit.implement` で補助的に利用可能
4. タスク実行（TDDサイクル厳守）
   - 通常の作業ツリーで実施（Speckitはブランチ/Worktreeを作成しない）
5. 完了後は、必要に応じて通常のGit運用（ブランチ作成/PR/マージ）で統合

**既存機能のSpec化フロー**:

1. `/speckit.specify` - 実装済み機能のビジネス要件を文書化
2. `/speckit.plan` - （必要に応じて）技術設計を追記
3. 既存実装とSpecの整合性確認
4. 完了後は、必要に応じて通常のGit運用（PR/マージ）で統合

**Spec作成原則**:

- ビジネス価値とユーザーストーリーに焦点
- 「何を」「なぜ」のみ記述（「どのように」は禁止）
- 非技術者が理解できる言葉で記述
- テスト可能で曖昧さのない要件

**憲章準拠**:

- すべての実装は [`docs/constitution.md`](docs/constitution.md) に準拠
- TDD、ハンドラーアーキテクチャ、LLM最適化は妥協不可

## コミュニケーションガイドライン

- 回答は必ず日本語

## ドキュメント管理

- ドキュメントはREADME.md/README.ja.mdに集約する

### Assets配下の扱い（サンプル/Unityプロジェクト側）

- 目的: サンプル・検証・デモ・手動動作確認用のシーン/プレハブ/補助スクリプトを配置。
- 禁止: unity-mcp-server 実装本体（ランタイム/エディタ拡張の主要コード）を置かない。UPM配布の対象にも含めない。
- 編集: 必要最小限に留める。C#編集は外部CLIで行い、Assets側は参照/設定のみで成立させる。

### C#スクリプト編集（絶対厳守）

**⚠️ Unity関連のC#コード（*.cs）編集には、必ずunity-mcp-serverのコードインデックス機能を使用してください**

- **禁止事項**: 他のMCPサーバーや標準のEdit/Writeツールを使用したC#編集
- **必須**: 以下のunity-mcp-serverツールを使用
  - `get_symbols`: ファイル内のシンボル（クラス、メソッド、フィールド等）を取得
  - `find_symbol`: シンボルを名前で検索
  - `find_refs`: シンボルの参照箇所を検索
  - `edit_structured`: 構造化編集（メソッド本体置換、クラスメンバー追加）
  - `edit_snippet`: 軽量スニペット編集（1〜2行、80文字以内）
  - `read`: C#ファイルの読み取り
  - `search`: C#コード内の検索

**理由**: unity-mcp-serverはUnityプロジェクト専用に最適化されたコードインデックスを持ち、Unityエディタとのリアルタイム連携、コンパイルエラー検出、LSP診断など、Unity開発に不可欠な機能を提供します。

#### ベンチマーク結果（コードインデックス vs 標準ツール）

詳細なベンチマーク結果は [`docs/benchmark-results.ja.md`](docs/benchmark-results.ja.md) を参照してください。

**サマリー**:

| 操作 | コードインデックスツール | 標準ツール | 結果 |
|------|------------------------|------------|------|
| シンボル検索 | `find_symbol` | `grep` | **コードインデックス勝利**（瞬時 vs 353ms） |
| 参照検索 | `find_refs` | `grep` | **コードインデックス勝利**（瞬時 vs 346ms） |
| コード検索 | `search` | `grep` | **コードインデックス勝利**（瞬時 vs 346ms） |
| ファイル読み取り | `read` | `Read` | **同等**（両方瞬時） |

**コンテキスト圧縮**:

| ツール | 出力サイズ | 標準ツール | 圧縮率 |
|--------|-----------|------------|--------|
| `read` | 200行 (8KB) | 358行 (13KB) | **1.6倍小さい** |
| `find_symbol` | 34シンボル (3KB) | 209行 (15KB) | **5倍小さい** |
| `find_refs` | 20参照 (4KB) | 全行 | **3倍小さい** |

**重要**: `build_index` を実行してDBインデックスを構築してから使用してください。インデックスなしではLSPタイムアウト（60秒）が発生します。

#### コードインデックスの活用

**編集前の必須ステップ**:

1. **`get_symbols`**: 編集対象ファイルのシンボル構造を把握
   - クラス、メソッド、フィールド、プロパティの一覧を取得
   - 各シンボルの位置（行・列）を確認
   - namePath（例: `Outer/Nested/Member`）を特定

2. **`find_symbol`**: シンボルを名前で検索
   - プロジェクト全体から特定のクラス/メソッドを検索
   - 部分一致検索も可能（`substring_matching=true`）
   - スコープ指定（Assets/Packages）で絞り込み

3. **`find_refs`**: 影響範囲の確認
   - 編集対象シンボルが参照されている箇所を全検索
   - 破壊的変更の影響範囲を事前に把握
   - リファクタリング時の必須チェック

**編集実行**:

1. **`edit_structured`**: 構造化編集
   - メソッド本体の完全置換
   - クラスメンバーの追加
   - namePath指定で対象を一意に特定

2. **`edit_snippet`**: 軽量スニペット編集
   - 1〜2行の小さな変更
   - アンカー文字列で編集位置を厳密に指定

**検証**:

1. **`get_index_status`**: インデックス状態の確認
   - カバレッジ率を確認
   - インデックスが古い場合は`update_index`で更新

**ワークフロー例**:

```
1. get_symbols → クラス構造を把握
2. find_refs → 影響範囲を確認
3. edit_structured → メソッド本体を置換
4. update_index → インデックスを更新
5. find_refs → 変更後の参照箇所を再確認
```

### C#スクリプト編集ツールの使い分け

#### `edit_snippet`: 軽量スニペット編集（1〜2行、80文字以内）

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

#### `edit_structured`: 構造化編集（メソッド本体、クラスメンバー追加）

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
   - **解決策**: `edit_structured` に切り替え

4. **構文エラー**: LSP診断で括弧不整合検出
   - **解決策**: 編集はロールバックされる。アンカーまたは newText を修正

#### トラブルシューティング

**Q: アンカーが見つからない**
- A: `read` でファイル内容を確認し、空白・改行を含む正確な文字列をコピー

**Q: 複数箇所にマッチしてしまう**
- A: アンカーに前後数行のコンテキストを含めて一意にする

**Q: 80文字制限に引っかかる**
- A: `edit_structured` で replace_body を使用

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

## コミットメッセージ規約（絶対遵守）

### ⚠️ 重要性

**コミットメッセージはバージョン番号とリリース内容を決定する唯一の情報源です。**

本プロジェクトは**release-please + GitHub Actions**による自動リリースを採用しており、コミットメッセージの形式が不正確な場合、以下の重大な問題が発生します：

- ❌ **意図しないバージョンアップ**: `feat:`を誤用すると不要なminorバージョンアップが発生
- ❌ **リリースの欠落**: 正しい形式でないコミットはCHANGELOG.mdに記載されない
- ❌ **破壊的変更の見逃し**: `BREAKING CHANGE:`がないとmajorバージョンアップが行われず、ユーザーに影響
- ❌ **npm publish失敗**: 不正なバージョン決定により公開が失敗
- ❌ **Unity Package同期失敗**: バージョン不整合により配布パッケージが破損

### 必須ルール

#### 1. Conventional Commits形式の厳守

すべてのコミットメッセージは以下の形式に従う必要があります：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**type（必須）**:
- `feat`: 新機能追加 → **minor version up** (2.16.3 → 2.17.0)
- `fix`: バグ修正 → **patch version up** (2.16.3 → 2.16.4)
- `docs`: ドキュメント変更のみ → version up なし
- `style`: コード意味に影響しない変更（フォーマット等） → version up なし
- `refactor`: バグ修正も機能追加もしないコード変更 → version up なし
- `perf`: パフォーマンス改善 → **patch version up**
- `test`: テスト追加・修正 → version up なし
- `chore`: ビルドプロセスやツール変更 → version up なし
- `ci`: CI設定変更 → version up なし
- `build`: ビルドシステム変更 → version up なし
- `revert`: コミット取り消し → version up なし

**scope（推奨）**: 変更範囲（例: `hooks`, `spec`, `mcp-server`, `unity`）

**subject（必須）**: 変更内容の簡潔な説明（50文字以内、小文字で開始、末尾にピリオド不要）

**body（推奨）**: 変更の詳細説明（何を・なぜ変更したか）

**footer（条件付き必須）**:
- `BREAKING CHANGE:` - 破壊的変更の場合は必須 → **major version up** (2.16.3 → 3.0.0)
- `Closes #123` - Issue番号参照

#### 2. 破壊的変更の明示

APIの互換性を破る変更は必ず以下のいずれかの方法で明示：

**方法1: フッターに記載**
```bash
git commit -m "feat: change screenshot API signature

BREAKING CHANGE: captureScreenshot now requires workspaceRoot parameter"
```

**方法2: typeに`!`を付与**
```bash
git commit -m "feat!: remove deprecated video API"
```

#### 3. commitlintによる自動検証

すべてのコミットは以下でチェックされます：

- **ローカル**: git commitフックでリアルタイム検証
- **CI**: GitHub Actionsで全コミット履歴を検証
- **PR**: Pull Request作成時に全コミットを検証

**検証失敗時の対応**:
```bash
# コミットメッセージを修正（最新コミットのみ）
git commit --amend

# 複数コミットを修正
git rebase -i HEAD~3  # 直近3コミットを対話的に修正
```

#### 4. 禁止事項

- ❌ **曖昧な動詞**: "Update", "Change", "Modify" → 具体的に "Add", "Remove", "Fix" を使用
- ❌ **type省略**: 必ず `feat:`, `fix:` 等を先頭に付与
- ❌ **日本語のみのコミット**: subject は英語で記述（body は日本語可）
- ❌ **複数の変更を1コミット**: 1コミット1変更の原則を厳守
- ❌ **BREAKING CHANGE の誤用**: 本当に互換性を破る場合のみ使用

### 正しいコミット例

```bash
# 新機能追加（minor version up）
git commit -m "feat(hooks): add Worktree boundary protection

Implemented PreToolUse Hooks to block operations outside Worktree:
- block-cd-command.sh: Prevents cd outside Worktree
- block-file-ops.sh: Blocks file operations outside Worktree
- block-git-branch-ops.sh: Restricts git branch operations

All 15 test cases passed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# バグ修正（patch version up）
git commit -m "fix(mcp-server): resolve screenshot path resolution

Fixed workspace root detection fallback logic.

Closes #42"

# 破壊的変更（major version up）
git commit -m "feat(api)!: redesign Unity command interface

BREAKING CHANGE: All Unity commands now require workspaceRoot parameter.
Migration guide added to docs/MIGRATION.md"

# ドキュメント変更（version up なし）
git commit -m "docs(readme): update installation instructions"

# テスト追加（version up なし）
git commit -m "test(hooks): add edge case tests for cd command blocking"
```

### 誤ったコミット例

```bash
# ❌ type がない
git commit -m "Update hooks"

# ❌ 曖昧な動詞
git commit -m "feat: Change some files"

# ❌ 日本語のみ
git commit -m "feat: フック機能を追加"

# ❌ BREAKING CHANGE の記載漏れ
git commit -m "feat: change API signature"  # 実際は破壊的変更

# ❌ 複数の変更を1コミット
git commit -m "feat: add hooks and fix bug and update docs"
```

### コミット前チェックリスト

すべてのコミット実行前に以下を確認：

- [ ] Conventional Commits形式に従っているか
- [ ] type（feat/fix/docs等）が正しいか
- [ ] 破壊的変更の場合、`BREAKING CHANGE:`を記載したか
- [ ] subject が50文字以内か
- [ ] 1コミット1変更になっているか
- [ ] commitlintが通るか（CI失敗しないか）

### release-pleaseとの整合性

コミットメッセージは以下のように自動処理されます：

| コミットtype | バージョン影響 | CHANGELOG記載 | 例 |
|-------------|-------------|-------------|-----|
| `feat:` | minor ↑ | ✅ 記載 | 2.16.3 → 2.17.0 |
| `fix:` | patch ↑ | ✅ 記載 | 2.16.3 → 2.16.4 |
| `perf:` | patch ↑ | ✅ 記載 | 2.16.3 → 2.16.4 |
| `BREAKING CHANGE:` | major ↑ | ✅ 記載 | 2.16.3 → 3.0.0 |
| `docs:` | 変更なし | ❌ 記載なし | 2.16.3 |
| `test:` | 変更なし | ❌ 記載なし | 2.16.3 |
| `chore:` | 変更なし | ❌ 記載なし | 2.16.3 |
| `style:` | 変更なし | ❌ 記載なし | 2.16.3 |
| `refactor:` | 変更なし | ❌ 記載なし | 2.16.3 |

**重要**: `feat:`と`fix:`の使い分けが最も重要です。誤用すると意図しないバージョンアップが発生します。

---

## バージョン管理

### 自動リリース（release-please + GitHub Actions）

#### Conventional Commits規約

コミットメッセージで自動的にバージョンが決定されます：

- **`feat:`** - 新機能追加 → **minor** version up (例: 2.16.3 → 2.17.0)
- **`fix:`** - バグ修正 → **patch** version up (例: 2.16.3 → 2.16.4)
- **`BREAKING CHANGE:`** または **`feat!:`** - 破壊的変更 → **major** version up (例: 2.16.3 → 3.0.0)
- **`chore:`**, **`docs:`**, **`test:`** - version up なし

#### リリースフロー（feature → develop → main + tag）

**PRターゲットの絶対ルール**
- featureブランチから作成するPRの宛先は必ず`develop`。`main`への直接PRは禁止（hotfixも`develop`経由でバックポート）。

1. **featureブランチで開発**（Conventional Commits厳守）
   - PRは `develop` 宛に作成（例: `gh pr create --base develop`）。
   - Required Checks（Markdown/ESLint/Prettier・Commit Message Lint）成功でauto-merge。
2. **develop→mainマージ**
   - `/release` コマンドまたは手動で`prepare-release-pr.sh`を実行 → develop→main PRを作成・自動マージ。
   - mainへのマージで`Release`ワークフローがトリガー。
3. **release-pleaseによるバージョンアップPR作成**
   - release-pleaseが`feat:`/`fix:`コミットを検出し、バージョン番号を決定。
   - main向けにバージョンアップPRを自動作成（`chore(release): X.Y.Z`）。
   - PR内容: `package.json`のバージョン更新 + `CHANGELOG.md`更新 + Unity Packageバージョン同期。
   - **重要**: このPRが作成されるのは`skip-github-pull-request: false`の設定による（llm-routerと同じフロー）。
4. **リリースPRマージ → タグ作成**
   - バージョンアップPRをマージすると、release-pleaseが`vX.Y.Z`タグとGitHub Releaseを作成。
   - GitHub Releaseにはrelease-pleaseが生成したリリースノートが添付される。
5. **Publish（タグトリガー）**
   - タグpushで`Publish`ワークフローがトリガー。
   - csharp-lspを全RIDでビルドし、manifest＋バイナリをReleaseに添付。
   - `mcp-server`をnpm publish。UnityパッケージはUnity 6.3で署名生成し、OpenUPMへpublish。
   - 完了後、`main`→`develop`をバックマージ。

**重要**:
- 手動でのバージョン変更・npm publishは禁止（すべて自動化）
- バージョン・CHANGELOGの更新はmainブランチのみで行われる（developでは行わない）
- release-pleaseが作成するバージョンアップPRを必ずマージすること（マージしないとリリースが完了しない）

**注意事項**:
- developブランチへのマージ後、すぐにリリースする必要はありません
- 複数の機能をdevelopで統合してから、まとめてmainへリリースできます
- リリースタイミングは `/release` コマンドで制御可能

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

- **mcp-server / Unity Package**: release-please（manifest + extra-files）が自動更新
- **csharp-lsp**: タグ `vX.Y.Z` に合わせてビルドし、GitHub Releaseに添付
- **CHANGELOG.md**: release-pleaseのリリースノートで更新

#### トラブルシューティング

- **リリースが作成されない**: Conventional Commits形式とrelease-pleaseログを確認
- **バージョンが不正**: manifest/extra-filesが更新されたか確認し、必要なら`Release`を再実行
- **Unity Packageバージョン同期失敗**: release-pleaseのリリース結果を確認（手動で書き換えない）

### Git操作のベストプラクティス

#### タグの同期

**問題**: `git pull --tags`はGit設定によって期待通りに動作しない場合があります。

**推奨される正しいコマンド**:

```bash
# ❌ 非推奨（動作が不安定）
git pull --tags origin develop

# ✅ 推奨（タグのみ取得）
git fetch --tags origin

# ✅ 推奨（タグ + ブランチ更新）
git fetch --tags origin && git pull origin develop

# ✅ タグ競合時（強制上書き）
git fetch --tags --force origin
```

**理由**:

- `git pull`は`git fetch` + `git merge`だが、`--tags`フラグが無視される場合がある
- `remote.origin.tagOpt`設定に依存し、環境によって動作が異なる
- タグの取得は`git fetch --tags`で明示的に行うのが確実

**運用ルール**:

- Worktree作成後は必ず`git fetch --tags origin`を実行
- タグに基づく操作（リリース、バージョン確認）前に必ずfetch
- ローカルタグとリモートタグの不一致を検出したら即座に`git fetch --tags --force origin`

## コードクオリティガイドライン

- マークダウンファイルはmarkdownlintでエラー及び警告がない状態にする
- コミットログはcommitlintに対応する

### テストカバレッジ（Codecov）

本プロジェクトは **Codecov** を使用してテストカバレッジを計測・可視化しています。

#### Codecovの役割

Codecovは、テストがコードのどれだけをカバーしているかを計測・追跡するSaaSサービスです。TDD遵守（80%以上のカバレッジ維持）を客観的に測定し、品質保証を支えています。

#### 実装詳細（GitHub Actions連携）

`.github/workflows/test.yml` でカバレッジを自動計測・アップロード：

```yaml
- name: Generate coverage report
  run: npm run test:coverage --workspace=mcp-server  # c8でlcov.info生成

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: false  # Codecov障害時もCI通過
```

**フロー:**

1. `npm run test:coverage --workspace=mcp-server` → c8でカバレッジレポート生成（lcov形式）
2. `codecov-action` → レポートをCodecovにアップロード
3. Codecov側でカバレッジ可視化・PRコメント追加・トレンドグラフ生成

#### API経由での確認方法

**Codecov API v2 エンドポイント:**

```bash
# リポジトリの最新カバレッジ情報
curl "https://codecov.io/api/v2/github/akiojin/repos/unity-mcp-server"

# 特定ブランチのカバレッジ
curl "https://codecov.io/api/v2/github/akiojin/repos/unity-mcp-server/branches/main"

# PRごとのカバレッジ比較
curl "https://codecov.io/api/v2/github/akiojin/repos/unity-mcp-server/compare/?pullid=<PR番号>"

# カバレッジトレンド（1日/7日/30日）
curl "https://codecov.io/api/v2/github/akiojin/repos/unity-mcp-server/coverage-trends"
```

**認証が必要な場合（プライベートリポジトリ）:**

```bash
# Codecov.io → Settings → Access → Generate Token
curl -H "Authorization: Bearer <CODECOV_TOKEN>" \
  "https://codecov.io/api/v2/github/akiojin/repos/unity-mcp-server"
```

#### カバレッジバッジ

README.mdにカバレッジバッジを追加する場合：

```markdown
[![codecov](https://codecov.io/gh/akiojin/unity-mcp-server/branch/main/graph/badge.svg)](https://codecov.io/gh/akiojin/unity-mcp-server)
```

#### セットアップ（パブリックリポジトリ）

1. <https://codecov.io> にGitHubアカウントでログイン
2. リポジトリを追加
3. GitHub Actionsからのレポートを自動検出
4. 初回ワークフロー完了後、バッジが自動表示

**詳細:** `.github/workflows/README.md` を参照

## 開発ガイドライン

- 既存のファイルのメンテナンスを無視して、新規ファイルばかり作成するのは禁止。既存ファイルを改修することを優先する。

## ドキュメント作成ガイドライン

- README.mdには設計などは書いてはいけない。プロジェクトの説明やディレクトリ構成などの説明のみに徹底する。設計などは、適切なファイルへのリンクを書く。

---

## プロジェクト構成（リポジトリ全体）

本リポジトリは「ワークスペース（リポジトリ）ルート」を基点として、Unityプロジェクト・Node製MCPサーバ・C# LSP を同居させています。パスは常にワークスペースルート基準で解決します。

- ワークスペースルート
  - 定義: MCPサーバ（Node）の起動ディレクトリ（`process.cwd()`）。
  - Node側は起動時の `process.cwd()` を `WORKSPACE_ROOT` として固定し、Unityへの全コマンドに `workspaceRoot` を同梱します（プロセス内の `process.chdir()` には依存しない）。

- Unityプロジェクトルート
  - 設定: 環境変数 `UNITY_PROJECT_ROOT` に Unity プロジェクトの相対/絶対パスを指定（未指定なら自動検出）。

- `.unity/`
  - `cache/`: コードインデックス等のキャッシュ（Git管理外）
  - `captures/`: スクリーンショット・動画の固定保存先（Git管理外）
  - `capture/`: プロファイラ等の成果物保存先（Git管理外）

- `UnityMCPServer/`（Unityプロジェクト）
  - `Packages/unity-mcp-server/**`（UPMパッケージ 実装本体／ソース・オブ・トゥルース）
  - `Assets/**` はサンプル/検証用途（実装本体を置かない）
  - `Library/PackageCache/**` は自動生成（編集禁止）
  - エディタ拡張のスクショ/動画ハンドラ:
    - `Editor/Handlers/ScreenshotHandler.cs`:
      - 保存先は常に `<workspace>/.unity/captures/image_<mode>_<timestamp>.png`
      - Nodeから受け取る `workspaceRoot` を優先。未受領時は `.unity/` ディレクトリを上位探索してワークスペースを推定。
    - `Editor/Handlers/VideoCaptureHandler.cs`:
      - Unity Recorder（必須依存）で mp4/webm へ録画。
      - 保存先は常に `<workspace>/.unity/captures/video_<mode>_<timestamp>.(mp4|webm)`。
      - Nodeから受け取る `workspaceRoot` を優先採用。

- `mcp-server/`（Node製 MCP サーバ）
  - `src/core/config.js`:
    - 起動時に環境変数（`UNITY_*`）を読み込み、`WORKSPACE_ROOT`（起動時 `process.cwd()`）を固定。
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
- スクリーンショット/動画の出力先は常にワークスペースルート固定の `./.unity/captures/`。
- Node側が `WORKSPACE_ROOT` を決定し、全Unityコマンドに `workspaceRoot` を付与。
- Unity側は `workspaceRoot` を優先採用し、未受領時は `.unity/` ディレクトリを上位探索してワークスペースを推定。
- Node側の接続設定（Unity接続先/ログ等）は環境変数、Unity側のリッスン設定は Project Settings で管理する。

### Git 管理
- `/.unity/captures/` は `.gitignore` に登録（一時成果物の保護）。
- `Library/PackageCache/**` は編集禁止（生成物）。

### MCPサーバー開発メモ（汎用）
- **公式コンプライアンス検証**: OpenAI MCP Compliance Suite をCIに組み込み、初期化ハンドシェイク・tool呼び出し・キャンセルの順守を自動確認する。`npx mcp-compliance run --config compliance.json` を基本とし、失敗時はGitステータスで即検知。
- **ハーネスベースの単体テスト**: Mandrelなどのモッククライアントでhandlerを直接呼び、Schemaバリデーションとリトライ/タイムアウト挙動を高速にテスト。長時間ジョブやキャンセルを再現できるようサブトランスポートを差し替える。
- **パフォーマンス計測**: LiveMCPBench等のベンチツールで同時呼び出し数・バックプレッシャ・リソース消費を可視化し、しきい値を定義。定期実行してリグレッションを検知する。
- **セキュリティテンプレート**: MCPSecテンプレートを取り込み、tool allowlist逸脱・認証情報注入・レートリミット突破を自動テスト。OPA等を使いポリシーをコード化する。
- **カオス試験**: ソケット遮断や遅延を注入し、再接続戦略・ジョブキューの耐障害性を検証。CIのナイトリービルドで実施しログを蓄積。
- **テレメトリ＆リプレイ**: MCP Companion ToolkitなどでJSON-RPCログを収集し、問題再現時にローカルでリプレイ。実装の可観測性を高める。
- **ドキュメント整備**: 上記フローと対応手順をREADMEや運用Runbookに反映し、新規開発者が同じ手順を踏めるようにする。

---

## Hook機能による自動化（Claude Code）

このプロジェクトでは、Claude CodeのHook機能を活用して以下の自動化を実現しています。

### 概要

Claude CodeはHook機能により、特定のイベント（セッション終了、コンテキスト圧縮、ツール実行前後など）をトリガーとして、シェルスクリプトやLLMプロンプトを自動実行できます。このプロジェクトでは、以下の2つの目的でHookを活用しています：

1. **Worktree運用の保護**: 誤操作防止のためのPreToolUse Hook
2. **CLAUDE.md自動改善**: 会話履歴分析によるドキュメント改善提案

### 実装済みHook一覧

#### 1. PreToolUse Hook（ツール実行前の検証）

**対象ツール**: `Bash`, `Edit`, `Write`, `Read`

**実装スクリプト**:

a) **Worktree運用保護**:
- `.claude/hooks/block-git-branch-ops.sh`: Gitブランチ操作のブロック
- `.claude/hooks/block-cd-command.sh`: Worktree外へのディレクトリ移動をブロック
- `.claude/hooks/block-file-ops.sh`: Worktree外でのファイル操作をブロック（※未登録）

**目的**: Worktree運用フローの保護
- `git checkout/switch/branch`等のブランチ切り替えを禁止
- Worktree外への`cd`コマンドを禁止
- Worktree外でのファイル作成・削除・移動を禁止

b) **Unity C#編集保護**:
- `.claude/hooks/block-cs-edit-tools.sh`: Unity C#ファイル編集の保護（**NEW!**）

**目的**: Unity C#ファイル（*.cs）の編集をunity-mcp-server以外のツールでブロック

**ブロック対象**:
- `Edit` ツールでのUnity C#ファイル編集
- `Write` ツールでのUnity C#ファイル作成

**警告のみ（ブロックしない）**:
- `Read` ツールでのUnity C#ファイル読み取り（代わりに`mcp__unity-mcp-server__read`を推奨）

**Unity C#ファイルの判定基準**:
- ファイル拡張子が`.cs`
- かつ以下のディレクトリ配下:
  - `Assets/`
  - `Packages/`
  - `Library/`
  - `UnityMCPServer/`

**許可されるツール**:
- `mcp__unity-mcp-server__edit_structured`
- `mcp__unity-mcp-server__edit_snippet`
- `mcp__unity-mcp-server__get_symbols`
- `mcp__unity-mcp-server__find_symbol`
- `mcp__unity-mcp-server__find_refs`
- `mcp__unity-mcp-server__read`
- `mcp__unity-mcp-server__search`

**テスト**:
```bash
# 全10個のテストケースを実行
.claude/hooks/test-cs-edit-blocking.sh
```

**動作仕様**:
- Hookは標準入力からJSON（`tool_name`, `tool_input`）を受け取る
- ブロックする場合はexit code 2を返す
- JSON応答で`decision: "block"`とブロック理由を返す

#### 2. SessionEnd Hook（セッション終了時の自動実行）

**実装スクリプト**: `scripts/auto-suggest-claude-md-hook.sh`

**目的**: セッション終了時に会話履歴を自動分析し、CLAUDE.md改善提案を生成

**動作仕様**:
- セッション終了時に自動実行
- 会話履歴を分析してCLAUDE.mdへの追記候補を提案
- バックグラウンドで実行（メインセッションをブロックしない）
- 無限ループ防止機構を実装（5分クールダウン）

#### 3. PreCompact Hook（コンテキスト圧縮前の自動実行）

**実装スクリプト**: `scripts/auto-suggest-claude-md-hook.sh`

**目的**: コンテキストウィンドウが満杯になる前に会話履歴を分析

**動作仕様**:
- SessionEnd Hookと同じスクリプトを使用
- コンテキスト圧縮前に自動実行
- 長時間の会話セッションでも定期的に分析を実行

### `/suggest-claude-md` スラッシュコマンド

手動でCLAUDE.md改善提案を生成するコマンドです。

**使い方**:
```
/suggest-claude-md
```

**実行内容**:
1. 会話履歴を取得（`~/.claude/projects/<project-name>/`から最新のJSONLファイル）
2. 会話履歴を分析（3つの観点）:
   - **プロジェクト独自のルール**: 標準実装ではなく、プロジェクト特有の方法
   - **繰り返し指摘される内容**: 同じ指摘が複数回出現したパターン
   - **複数箇所で統一すべき実装**: 関連箇所で実装を揃えるべきパターン
3. CLAUDE.mdへの追記候補を提案

**適用方法**:
提案内容を確認後、以下のように指示してください：
```
この提案をCLAUDE.mdに追記してください
```

### 無限ループ防止メカニズム

SessionEnd/PreCompact Hookは会話終了時に毎回発火するため、無限ループを防ぐ仕組みが必要です。このプロジェクトでは以下の3つの防止策を実装しています：

#### 1. 環境変数フラグ

```bash
if [ "${SUGGEST_CLAUDE_MD_RUNNING:-}" = "1" ]; then
    exit 0
fi
export SUGGEST_CLAUDE_MD_RUNNING=1
```

- 環境変数`SUGGEST_CLAUDE_MD_RUNNING`で実行フラグを管理
- 既に実行中の場合はスキップ

#### 2. タイムスタンプベース（5分クールダウン）

```bash
LAST_SUGGEST=".claude/.last-suggest-timestamp"
CURRENT=$(date +%s)
if [ -f "$LAST_SUGGEST" ]; then
  DIFF=$((CURRENT - $(cat "$LAST_SUGGEST")))
  [ $DIFF -lt 300 ] && exit 0
fi
echo "$CURRENT" > "$LAST_SUGGEST"
```

- 前回実行から5分以内の場合はスキップ
- タイムスタンプファイル：`.claude/.last-suggest-timestamp`

#### 3. セッションID重複チェック

```bash
SESSION_ID=$(echo "$json_input" | jq -r '.sessionId')
LAST_SESSION=".claude/.last-session-id"
[ -f "$LAST_SESSION" ] && [ "$(cat "$LAST_SESSION")" = "$SESSION_ID" ] && exit 0
echo "$SESSION_ID" > "$LAST_SESSION"
```

- 同一セッションでの重複実行を防止
- セッションIDファイル：`.claude/.last-session-id`

### Hook追加・カスタマイズガイドライン

新しいHookを追加する場合は、以下のガイドラインに従ってください：

#### JSON応答形式の標準

PreToolUse Hookは以下の形式でJSON応答を返す必要があります：

**許可する場合**:
```json
{
  "decision": "allow"
}
```

**ブロックする場合**:
```json
{
  "decision": "block",
  "reason": "ブロック理由の説明"
}
```

**exit code**:
- 0: 許可
- 2: ブロック

#### エラーメッセージのベストプラクティス

- ユーザーにわかりやすい日本語で説明
- ブロック理由を明確に記載
- 代替手段を提示（可能な場合）

例：
```
❌ Worktree外へのディレクトリ移動は禁止されています。

理由: このプロジェクトではWorktree運用フローを採用しており、
      各featureブランチは独立したWorktreeで作業します。

代替手段: 別のSPECで作業したい場合は、以下を実行してください：
  cd .worktrees/SPEC-xxx/
```

#### テスト駆動開発の推奨

新しいHookを追加する場合は、TDDアプローチを推奨します：

1. **RED**: テストを書く（`.claude/hooks/test-hooks.sh`）
2. **GREEN**: 最小限の実装でテスト合格
3. **REFACTOR**: コードをクリーンアップ

参考: `.claude/hooks/test-hooks.sh`（15個のテストケースを実装）

### Git管理

以下のファイルは`.gitignore`に登録されています：

```gitignore
# Hook実行時の一時ファイル
.claude/.last-suggest-timestamp
.claude/.last-session-id
```

### 参考資料

このプロジェクトのHook機能は、AppBrewのたっくん氏による以下の記事を参考に実装しています：

- [Claude CodeのHook機能でCLAUDE.mdの自動更新提案を実現する](https://zenn.dev/appbrew/articles/e2f38677f6a0ce)
- [CLAUDE.mdに書くべきルールを判断する仕組み](https://zenn.dev/appbrew/articles/7eb12fff5738f4)

### トラブルシューティング

**Q: SessionEnd Hookが実行されない**
- A: `.claude/settings.json`の`hooks.SessionEnd`設定を確認してください

**Q: Hook実行時にエラーが出る**
- A: スクリプトに実行権限が付与されているか確認してください（`chmod +x`）

**Q: 無限ループが発生した**
- A: `.claude/.last-suggest-timestamp`を削除して、タイムスタンプをリセットしてください

**Q: 会話履歴が見つからない**
- A: `~/.claude/projects/`配下にプロジェクトディレクトリが存在するか確認してください
