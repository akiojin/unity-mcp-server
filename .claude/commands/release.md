---
description: developからrelease/vX.Y.Zブランチを作成し、リリースフローを開始します。
tags: [project]
---

# リリースコマンド

developブランチから`release/vX.Y.Z`ブランチを自動作成し、リリースフローを開始します。

## 実行内容

1. 現在のブランチがdevelopであることを確認
2. developブランチを最新に更新（git pull）
3. semantic-release dry-runを実行してバージョン番号を判定
4. `release/vX.Y.Z`ブランチをdevelopから作成
5. リモートにpush
6. GitHub Actionsが以下を自動実行：
   - **releaseブランチ**: semantic-releaseによるバージョン決定・更新、CHANGELOG.md生成、GitタグとGitHub Release作成
   - **release → mainへ自動PR作成**: Requiredチェック成功後に自動マージ
   - **mainブランチ**: csharp-lspビルド、npm publish、OpenUPM publish、developへの自動バックマージ

## 前提条件

- developブランチにいること
- GitHub CLIが認証済みであること（`gh auth login`）
- コミットがすべてConventional Commits形式であること
- semantic-releaseがバージョンアップを判定できるコミットが存在すること

## スクリプト実行

リリースブランチを作成するため、以下のスクリプトを実行してください：

```bash
.specify/scripts/bash/create-release-branch.sh
```
