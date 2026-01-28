---
description: LLMベースのインタラクティブリリースフロー。バージョン更新、タグ作成、develop→mainへのPR作成を実行。
---

# /release コマンド

LLMベースのインタラクティブリリースフローです。どのブランチからでも実行可能です。

## 前提条件チェック

以下を確認してください:

1. **クリーンな状態**: ワーキングディレクトリに未コミットの変更がないこと
2. **リモート同期**: 現在のブランチがリモートと同期していること

```bash
# 現在のブランチを確認
git branch --show-current

# ワーキングディレクトリの状態を確認
git status --porcelain

# タグを取得
git fetch --tags origin
```

未コミットの変更がある場合はエラーメッセージを表示して中止してください。

## Phase 1: 変更分析

最新のタグから現在のHEADまでの変更を分析します。

```bash
# 最新タグを取得
git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"

# タグからの変更履歴を取得
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")..HEAD --oneline

# 変更ファイルの統計
git diff $(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")..HEAD --stat
```

### 変更サマリーの生成

コミットログを分析し、以下の形式で日本語のサマリーを生成:

```markdown
## 変更サマリー

### 新機能
- [feat: xxx] の説明

### バグ修正
- [fix: xxx] の説明

### 改善
- [perf: xxx] の説明

### その他
- [chore: xxx] の説明
```

## Phase 2: バージョン判定

コミットメッセージを分析してsemverを決定:

| 検出内容 | バージョン変更 |
|---------|--------------|
| `BREAKING CHANGE:` または `feat!:` | major (X.0.0) |
| `feat:` | minor (x.Y.0) |
| `fix:`, `perf:`, その他 | patch (x.y.Z) |

現在のバージョンは `mcp-server/package.json` から取得します。

## Phase 3: プレビュー表示

ユーザーに以下の形式でプレビューを表示し、確認を求めます:

```
📦 リリースプレビュー
─────────────────────
現在: vX.Y.Z → 次: vA.B.C (major/minor/patch)

## 変更サマリー
[Phase 1で生成したサマリー]

─────────────────────
```

AskUserQuestion を使用して以下の選択肢を提示:

- **続行**: このままリリースを実行
- **バージョン編集**: バージョン番号を手動で指定
- **中止**: リリースをキャンセル

「バージョン編集」が選択された場合は、新しいバージョン番号を入力してもらいます。

## Phase 4: バージョン更新

確認後、以下のファイルを更新:

```bash
# バージョン更新スクリプトを実行
node scripts/release/update-versions.mjs <new-version>
```

### CHANGELOG.md の更新

CHANGELOG.md の先頭に新しいリリースエントリを追加:

```markdown
## [X.Y.Z](https://github.com/akiojin/unity-mcp-server/compare/vPREV...vX.Y.Z) (YYYY-MM-DD)

### Features
- [変更サマリーから]

### Bug Fixes
- [変更サマリーから]
```

## Phase 5: コミット・タグ・PR作成

```bash
# 現在のブランチ名を取得
CURRENT_BRANCH=$(git branch --show-current)

# 変更をステージング
git add mcp-server/package.json UnityMCPServer/Packages/unity-mcp-server/package.json CHANGELOG.md

# リリースコミット
git commit -m "chore(release): vX.Y.Z

Release version X.Y.Z

Co-Authored-By: Claude <noreply@anthropic.com>"

# タグ作成
git tag -a vX.Y.Z -m "vX.Y.Z"

# 現在のブランチをプッシュ（タグ含む）
git push origin "$CURRENT_BRANCH" --tags

# PR作成 (現在のブランチ → main)
gh pr create --base main --head "$CURRENT_BRANCH" --title "chore(release): vX.Y.Z" --body "$(cat <<'EOF'
## Release vX.Y.Z

[変更サマリーを挿入]

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Phase 6: 完了通知

```
✅ リリースPR作成完了
PR: https://github.com/akiojin/unity-mcp-server/pull/XXX

次のステップ:
1. PRをレビューしてマージ
2. mainへのマージでpublish.ymlが自動実行
3. npm publish、GitHub Release、csharp-lspビルドが自動実行
```

## エラーハンドリング

### 未コミットの変更がある場合

```
❌ エラー: 未コミットの変更があります

以下のファイルに変更があります:
[変更ファイル一覧]

変更をコミットまたはスタッシュしてから再実行してください。
```

### リリース対象のコミットがない場合

```
ℹ️ リリース対象のコミットがありません

最新タグ vX.Y.Z 以降、feat: や fix: などのリリース対象コミットがありません。
```

## 注意事項

- どのブランチからでも実行可能です
- バージョン番号はsemverに従います
- CHANGELOG.mdは自動更新されます
- PRマージ後、publish.ymlワークフローが自動実行されます
