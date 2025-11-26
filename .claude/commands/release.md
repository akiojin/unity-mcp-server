---
description: develop→main のPRを自動で作成・マージし、mainでrelease-pleaseを走らせてリリースする（ollama-router / llm-routerと同じフロー）。
tags: [project]
---

# リリースコマンド（prepare-release → release-please）

1. GitHub CLI 認証確認:
   ```bash
   gh auth status
   ```
2. develop→main のリリースPRを作成（既存があれば再利用し auto-merge 設定）:
   ```bash
   scripts/prepare-release-pr.sh
   ```
3. PR が main にマージされると `release.yml` で release-please が動き、タグ & GitHub Release を作成。
4. タグ push で `publish.yml` が走り、npm / OpenUPM / csharp-lsp を配信。完了後、main→develop を自動バックマージ。

## Required Checks（develop ブランチ）
- Markdown, ESLint & Formatting
- Commit Message Lint
- Test & Coverage
- Package

## 進捗確認
- prepare-release: `gh run watch $(gh run list --workflow=prepare-release.yml --limit 1 --json databaseId --jq '.[0].databaseId')`
- release/publish は GitHub Actions 画面または `gh run list` で確認。
