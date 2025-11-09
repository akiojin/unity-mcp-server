---
description: developからrelease/vX.Y.Zブランチを作成し、リリースフローを開始します。
tags: [project]
---

# リリースコマンド

developブランチから`release/vX.Y.Z`ブランチを自動作成し、リリースフローを開始します。

> ℹ️ ブランチ作成処理は GitHub Actions 上で完結するため、ローカルで develop ブランチに切り替える必要はありません。任意の Worktree／ブランチから実行できます。

## 実行内容

1. GitHub CLIの認証状態を確認（`gh auth status`）。
2. `scripts/create-release-branch.sh` が `create-release.yml` ワークフローを develop ブランチで起動。
3. ワークフロー内で semantic-release dry-run を実行し、次のバージョン番号を確定。
4. GitHub Actions が `release/vX.Y.Z` ブランチを **リモート develop 最新コミット** から作成して push。
5. release ブランチが push されると `release.yml` が起動し、以下を自動実行：
   - semantic-release によるバージョン決定、CHANGELOG.md 生成、タグ／GitHub Release 作成
   - release → main の自動マージと csharp-lsp ビルド、npm/OpenUPM publish
   - main → develop のバックマージ

## 前提条件

- GitHub CLIが認証済みであること（`gh auth login`）
- リリースしたい変更がすべて develop ブランチにマージ済みであること（`finish-feature.sh` 完了済み）
- コミットがすべて Conventional Commits 形式であること
- semantic-release がバージョンアップを判定できるコミットが存在すること

## スクリプト実行

リリースブランチを作成するため、以下のスクリプトを実行してください：

```bash
scripts/create-release-branch.sh
```

スクリプトはGitHub Actions ワークフローを起動し、リモートで以下を実行します：
1. developブランチで semantic-release dry-run
2. バージョン番号を判定
3. release/vX.Y.Zブランチを作成＆push
