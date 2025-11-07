#!/usr/bin/env bash

# Create Release PR: develop → main
#
# Usage: ./create-release-pr.sh [OPTIONS]
#
# OPTIONS:
#   --draft         Create as draft PR (will not auto-merge)
#   --help, -h      Show help message

set -e

DRAFT=false

for arg in "$@"; do
    case "$arg" in
        --draft)
            DRAFT=true
            ;;
        --help|-h)
            cat << 'EOF'
Usage: create-release-pr.sh [OPTIONS]

Create a release PR from develop to main.

OPTIONS:
  --draft         Create as draft PR (will not trigger auto-release)
  --help, -h      Show this help message

WORKFLOW:
  1. Verify current branch is develop
  2. Pull latest changes from remote
  3. Create GitHub Pull Request (develop → main)
  4. After merge, semantic-release runs automatically on main
  5. Release changes are synced back to develop

EOF
            exit 0
            ;;
        *)
            echo "ERROR: Unknown option '$arg'. Use --help for usage information." >&2
            exit 1
            ;;
    esac
done

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get repository root
REPO_ROOT=$(get_repo_root)
cd "$REPO_ROOT"

# Check if git is available
if ! has_git; then
    echo "ERROR: Git repository not detected. This script requires git." >&2
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "========================================="
echo "Creating Release PR: develop → main"
echo "========================================="

# Verify we're on develop branch
if [[ "$CURRENT_BRANCH" != "develop" ]]; then
    echo ""
    echo "ERROR: Must be on develop branch. Current branch: $CURRENT_BRANCH" >&2
    echo "Please switch to develop branch: git checkout develop" >&2
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo ""
    echo "You have uncommitted changes. Please commit or stash them first."
    echo ""
    git status --short
    exit 1
fi

# Check if gh CLI is installed and authenticated
echo ""
echo "[1/3] Checking GitHub CLI..."
if ! command -v gh &> /dev/null; then
    echo "ERROR: GitHub CLI (gh) is not installed." >&2
    echo "Please install it from: https://cli.github.com/" >&2
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "ERROR: GitHub CLI is not authenticated." >&2
    echo "Please run: gh auth login" >&2
    exit 1
fi

echo "✓ GitHub CLI is ready"

# Pull latest changes
echo ""
echo "[2/3] Pulling latest changes from develop..."
git pull origin develop

# Create PR
echo ""
echo "[3/3] Creating Pull Request..."

PR_TITLE="Release: $(date +%Y-%m-%d)"

PR_BODY=$(cat <<EOF
## リリース概要

developブランチからmainブランチへの自動リリースPRです。

---

## 変更サマリー

$(git log origin/main..origin/develop --oneline --no-merges | head -20)

---

## リリースフロー

このPRがmainブランチにマージされると、以下が自動実行されます：

1. **semantic-release実行**
   - Conventional Commitsを解析してバージョンを自動決定
   - package.json更新
   - CHANGELOG.md生成
   - Gitタグ作成（例: v1.2.0）

2. **GitHub Release作成**
   - リリースノート自動生成
   - 成果物の添付

3. **npm publish（オプション）**
   - 設定されている場合は自動公開

4. **developへの自動バックマージ**
   - リリース変更をdevelopに反映

---

## バージョン決定ルール

| コミットタイプ | バージョン変更 | 例 |
|---------------|---------------|---|
| \`feat:\` | MINOR (0.x.0) | feat: 新機能追加 |
| \`fix:\` | PATCH (0.0.x) | fix: バグ修正 |
| \`BREAKING CHANGE:\` または \`feat!:\` | MAJOR (x.0.0) | feat!: 破壊的変更 |
| \`docs:\`, \`chore:\`, \`test:\` | リリースなし | - |

---

🤖 このPRがマージされると、semantic-releaseが自動的にリリースプロセスを実行します。
EOF
)

# Create PR (draft or normal)
if [ "$DRAFT" = true ]; then
    gh pr create --base main --head develop --title "$PR_TITLE" --body "$PR_BODY" --draft
    echo "✓ Draft release PR created successfully"
else
    gh pr create --base main --head develop --title "$PR_TITLE" --body "$PR_BODY"
    echo "✓ Release PR created successfully"
fi

# Get PR URL
PR_URL=$(gh pr view develop --json url --jq .url 2>/dev/null || echo "")

echo ""
echo "========================================="
echo "✓ Release PR created!"
echo "========================================="
echo ""
if [ -n "$PR_URL" ]; then
    echo "PR URL: $PR_URL"
    echo ""
fi
echo "Required checks will run automatically."
echo "After checks pass and PR is merged, semantic-release will:"
echo "  - Analyze commits and determine version"
echo "  - Update package.json and CHANGELOG.md"
echo "  - Create Git tag and GitHub Release"
echo "  - Sync changes back to develop"
echo ""
if [ "$DRAFT" = true ]; then
    echo "Note: This is a draft PR."
    echo "Mark it as ready for review to proceed with the release."
fi
