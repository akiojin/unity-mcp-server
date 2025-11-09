#!/usr/bin/env bash

# Finish feature: Create Pull Request for auto-merge workflow
#
# Usage: ./finish-feature.sh [OPTIONS]
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
Usage: finish-feature.sh [OPTIONS]

Finish feature development by creating a Pull Request.

OPTIONS:
  --draft         Create as draft PR (will not auto-merge)
  --help, -h      Show this help message

WORKFLOW:
  1. Verify current branch is a feature branch (feature/SPEC-xxx)
  2. Check for uncommitted changes
  3. Push feature branch to remote
  4. Create GitHub Pull Request
  5. Auto-merge will be triggered by GitHub Actions

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

# Verify we're on a feature branch
if [[ ! "$CURRENT_BRANCH" =~ ^feature/ ]]; then
    echo "ERROR: Not on a feature branch. Current branch: $CURRENT_BRANCH" >&2
    echo "Feature branches should be named like: feature/SPEC-a1b2c3d4 or feature/something" >&2
    exit 1
fi

# Extract feature name (everything after feature/)
FEATURE_NAME=$(echo "$CURRENT_BRANCH" | sed 's/^feature\///')

# Determine SPEC-ID: use SPEC-xxx if pattern matches, otherwise use feature name
if [[ "$FEATURE_NAME" =~ ^SPEC-[a-z0-9]{8}$ ]]; then
    SPEC_ID="$FEATURE_NAME"
else
    # For non-SPEC branches, try to find corresponding SPEC from specs directory
    # Default to feature name if no SPEC found
    SPEC_ID="$FEATURE_NAME"
fi

WORKTREE_DIR="$REPO_ROOT/.worktrees/$SPEC_ID"

echo "========================================="
echo "Finishing feature: $CURRENT_BRANCH"
echo "========================================="

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
echo "[1/4] Checking GitHub CLI..."
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

# Validate tags before pushing
echo ""
echo "[2/5] Validating tags..."
echo "Fetching latest tags from remote..."
git fetch --tags origin 2>/dev/null || {
    echo "⚠️  Warning: Failed to fetch tags (continuing anyway)"
}

# Check for mismatched tags
MISMATCHED_TAGS=$(git tag -l | while read tag; do
    LOCAL=$(git rev-parse "refs/tags/$tag" 2>/dev/null || echo "missing")
    REMOTE=$(git ls-remote origin "refs/tags/$tag" 2>/dev/null | cut -f1)
    REMOTE=${REMOTE:-missing}
    if [ "$LOCAL" != "$REMOTE" ] && [ "$LOCAL" != "missing" ] && [ "$REMOTE" != "missing" ]; then
        echo "$tag (local: ${LOCAL:0:8}, remote: ${REMOTE:0:8})"
    fi
done)

if [ -n "$MISMATCHED_TAGS" ]; then
    echo ""
    echo "❌ ERROR: Tag mismatch detected between local and remote:"
    echo "$MISMATCHED_TAGS"
    echo ""
    echo "To fix this issue, run:"
    echo "  git fetch --tags --force origin"
    echo ""
    exit 1
fi

echo "✓ All tags are in sync with remote"

# Push feature branch to remote
echo ""
echo "[3/5] Pushing feature branch to remote..."
git push -u origin "$CURRENT_BRANCH"

# Get PR title from spec.md
echo ""
echo "[4/5] Creating Pull Request..."
PR_TITLE="$CURRENT_BRANCH"

# Check if this is a SPEC branch
if [[ "$FEATURE_NAME" =~ ^SPEC-[a-z0-9]{8}$ ]]; then
    SPEC_FILE="$REPO_ROOT/specs/$SPEC_ID/spec.md"
    if [ -f "$SPEC_FILE" ]; then
        # Extract title from spec.md (first line after removing markdown header)
        PR_TITLE=$(head -1 "$SPEC_FILE" | sed 's/^# 機能仕様書: //' | sed 's/^# //')
    else
        PR_TITLE="$SPEC_ID implementation"
    fi
else
    # Use branch name as title for non-SPEC branches
    PR_TITLE=$(echo "$FEATURE_NAME" | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')
fi

# Create PR body
if [[ "$FEATURE_NAME" =~ ^SPEC-[a-z0-9]{8}$ ]]; then
    # SPEC branch PR body
    PR_BODY=$(cat <<EOF
## SPEC Information

**機能ID**: \`$SPEC_ID\`
**ブランチ**: \`$CURRENT_BRANCH\`

---

## 変更サマリー

$(git log origin/develop..HEAD --oneline --no-merges | head -10)

---

## チェックリスト

- [ ] tasks.md の全タスクが完了している
- [ ] 全テストが合格している
- [ ] コンパイルエラーがない
- [ ] コミットメッセージが規約に準拠している

---

📝 **詳細**: \`specs/$SPEC_ID/spec.md\` を参照してください。

🤖 このPRは自動マージワークフローの対象です。すべてのCI/CDチェックが成功すると自動的にdevelopブランチへマージされます。
EOF
)
else
    # Non-SPEC branch PR body
    PR_BODY=$(cat <<EOF
## Feature: $FEATURE_NAME

**ブランチ**: \`$CURRENT_BRANCH\`

---

## 変更サマリー

$(git log origin/develop..HEAD --oneline --no-merges | head -10)

---

## チェックリスト

- [ ] 全テストが合格している
- [ ] コンパイルエラーがない
- [ ] コミットメッセージが規約に準拠している

---

🤖 このPRは自動マージワークフローの対象です。すべてのCI/CDチェックが成功すると自動的にdevelopブランチへマージされます。
EOF
)
fi

# Create PR (draft or normal)
if [ "$DRAFT" = true ]; then
    gh pr create --base develop --head "$CURRENT_BRANCH" --title "$PR_TITLE" --body "$PR_BODY" --draft
    echo "✓ Draft PR created successfully"
else
    gh pr create --base develop --head "$CURRENT_BRANCH" --title "$PR_TITLE" --body "$PR_BODY"
    echo "✓ PR created successfully"
fi

# Get PR URL
PR_URL=$(gh pr view "$CURRENT_BRANCH" --json url --jq .url 2>/dev/null || echo "")

echo ""
echo "[5/5] Cleaning up..."
rm -f "$REPO_ROOT/.specify/.current-feature"

echo ""
echo "========================================="
echo "✓ Feature $SPEC_ID PR created!"
echo "========================================="
echo ""
if [ -n "$PR_URL" ]; then
    echo "PR URL: $PR_URL"
    echo ""
fi
echo "GitHub Actions will now run quality checks."
echo "If all checks pass, the PR will be automatically merged to develop."
echo ""
if [ "$DRAFT" = true ]; then
    echo "Note: This is a draft PR and will NOT be auto-merged."
    echo "Mark it as ready for review to enable auto-merge."
fi
