#!/bin/bash
set -euo pipefail

echo "==========================================="
echo "Creating Release Branch"
echo "==========================================="
echo ""

# GitHub CLIが認証済みか確認
if ! gh auth status >/dev/null 2>&1; then
  echo "Error: GitHub CLI is not authenticated"
  echo "Please run: gh auth login"
  exit 1
fi

echo "[1/2] Triggering GitHub Actions workflow..."

# create-release.yml ワークフローを実行
gh workflow run create-release.yml --ref develop

echo "✓ Workflow triggered successfully"
echo ""

echo "[2/2] Monitoring workflow..."
echo ""

# ワークフロー実行を待機（最新の実行を取得）
sleep 5

# 最新のワークフロー実行を表示
echo "Latest workflow runs:"
gh run list --workflow=create-release.yml --limit 3

echo ""
echo "==========================================="
echo "✓ Release branch creation initiated"
echo "==========================================="
echo ""
echo "To monitor progress, run:"
echo "  gh run watch \$(gh run list --workflow=create-release.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
echo ""
echo "Or visit:"
echo "  https://github.com/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/actions/workflows/create-release.yml"
