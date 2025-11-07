---
description: developからmainへのリリースPRを作成します。
tags: [project]
---

# リリースコマンド

developブランチからmainブランチへのリリースPRを自動作成します。

## 実行内容

1. 現在のブランチがdevelopであることを確認
2. developブランチを最新に更新（git pull）
3. GitHub PRを作成（develop → main）
4. PRがマージされると、GitHub Actionsが以下を自動実行：
   - semantic-releaseによるバージョン決定・更新
   - CHANGELOG.md生成
   - GitタグとGitHub Release作成
   - npm publish（設定されている場合）
   - developへの自動バックマージ

## 前提条件

- developブランチにいること
- GitHub CLIが認証済みであること（`gh auth login`）
- コミットがすべてConventional Commits形式であること

## スクリプト実行

リリースPRを作成するため、以下のスクリプトを実行してください：

```bash
.specify/scripts/bash/create-release-pr.sh
```

または、ドラフトPRとして作成する場合：

```bash
.specify/scripts/bash/create-release-pr.sh --draft
```
