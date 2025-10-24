#!/usr/bin/env bash

# Finish feature: Merge feature branch to main locally and cleanup worktree
#
# Usage: ./finish-feature.sh [OPTIONS]
#
# OPTIONS:
#   --no-cleanup    Don't remove worktree after merge
#   --help, -h      Show help message

set -e

NO_CLEANUP=false

for arg in "$@"; do
    case "$arg" in
        --no-cleanup)
            NO_CLEANUP=true
            ;;
        --help|-h)
            cat << 'EOF'
Usage: finish-feature.sh [OPTIONS]

Finish feature development by merging to main branch locally.

OPTIONS:
  --no-cleanup    Don't remove worktree after merge
  --help, -h      Show this help message

WORKFLOW:
  1. Verify current branch is a feature branch (feature/SPEC-xxx)
  2. Commit any pending changes
  3. Switch to main branch
  4. Merge feature branch to main (--no-ff)
  5. Remove worktree (unless --no-cleanup)
  6. Delete feature branch
  7. Push to remote

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
if [[ ! "$CURRENT_BRANCH" =~ ^feature/SPEC-[a-z0-9]{8}$ ]]; then
    echo "ERROR: Not on a feature branch. Current branch: $CURRENT_BRANCH" >&2
    echo "Feature branches should be named like: feature/SPEC-a1b2c3d4" >&2
    exit 1
fi

# Extract SPEC-ID
SPEC_ID=$(echo "$CURRENT_BRANCH" | sed 's/^feature\///')
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

# Switch to main branch
echo ""
echo "[1/6] Switching to main branch..."
git checkout main

# Merge feature branch (no fast-forward to preserve history)
echo ""
echo "[2/6] Merging $CURRENT_BRANCH to main (no fast-forward)..."
git merge --no-ff "$CURRENT_BRANCH" -m "feat: Merge $CURRENT_BRANCH - $(cat "$WORKTREE_DIR/specs/$SPEC_ID/spec.md" 2>/dev/null | head -1 | sed 's/^# //' || echo 'Feature implementation')"

# Remove worktree if requested
if [ "$NO_CLEANUP" = false ]; then
    echo ""
    echo "[3/6] Removing worktree: $WORKTREE_DIR..."
    if [ -d "$WORKTREE_DIR" ]; then
        git worktree remove "$WORKTREE_DIR" --force
    else
        echo "  Warning: Worktree directory not found: $WORKTREE_DIR"
    fi
else
    echo ""
    echo "[3/6] Skipping worktree cleanup (--no-cleanup specified)"
fi

# Delete feature branch
echo ""
echo "[4/6] Deleting feature branch: $CURRENT_BRANCH..."
git branch -d "$CURRENT_BRANCH"

# Clear current feature
echo ""
echo "[5/6] Clearing current feature tracking..."
rm -f "$REPO_ROOT/.specify/.current-feature"

# Push to remote
echo ""
echo "[6/6] Pushing to remote..."
git push origin main

echo ""
echo "========================================="
echo "✓ Feature $SPEC_ID merged successfully!"
echo "========================================="
echo ""
echo "Main branch is now up to date with your changes."
echo "Worktree and feature branch have been cleaned up."
