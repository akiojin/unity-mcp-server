---
description: release-please で次のリリースPRを作成し、mainの自動リリースフローを開始します。
tags: [project]
---

# リリースコマンド（release-please）

release-please を使って main の最新コミットからリリースPRを起動します。PRは必要なチェックが通れば自動マージされ、タグ作成後に publish ワークフローが走ります。

> ℹ️ ローカルのブランチは自由です。スクリプトが GitHub Actions 上で `create-release.yml` を直接起動します。

## 実行内容

1. `gh auth status` で GitHub CLI の認証を確認。
2. `scripts/create-release-branch.sh` が `create-release.yml`（ref=main）を手動トリガー。
3. release-please が CHANGELOG とバージョンを計算し、`chore(release): x.y.z` PR を作成。
4. PR は `Lint`（Markdown, ESLint & Formatting / Commit Message Lint）と `Test`（Test & Coverage / Package）の Required Checks 完了後に `gh pr merge --auto --merge` で自動マージ。
5. main へのマージで `release.yml` がタグと GitHub Release を作成し、タグ push で `publish.yml` が npm / OpenUPM / csharp-lsp を公開し、完了後に main → develop を自動バックマージ。

## 前提条件

- GitHub CLI が認証済みであること（`gh auth login`）
- リリースしたい変更が main に入っていること（develop の変更は先に PR で main へ取り込み）
- Conventional Commits でコミットされていること（release-please がバージョン決定に使用）
- Required Checks がブランチ保護に設定されていること：
  - Markdown, ESLint & Formatting
  - Commit Message Lint
  - Test & Coverage
  - Package

## スクリプト実行

1. develop にリリースしたい変更がある場合は、まず develop → main のPRを作成（自動マージ設定）:
   ```bash
   scripts/prepare-release-pr.sh
   ```
2. PR がマージされ main に入ると、`release.yml` で release-please が自動実行され、タグ・GitHub Release が作成されます。
3. タグ push で `publish.yml` が走り、npm / OpenUPM / csharp-lsp を配信します（バックマージは行いません）。

進捗確認は `gh run watch $(gh run list --workflow=prepare-release.yml --limit 1 --json databaseId --jq '.[0].databaseId')` などで可能です。
