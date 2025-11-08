#!/usr/bin/env bash

set -e

REPO_ROOT="/unity-mcp-server"
cd "$REPO_ROOT"

echo "========================================="
echo "既存SPECをブランチ＆Worktreeに移行"
echo "========================================="
echo ""

# Get list of SPEC directories
SPEC_DIRS=$(find specs -maxdepth 1 -type d -name "SPEC-*" | sort)

if [ -z "$SPEC_DIRS" ]; then
    echo "No SPEC directories found."
    exit 0
fi

TOTAL=$(echo "$SPEC_DIRS" | wc -l)
COUNT=0

for spec_dir in $SPEC_DIRS; do
    SPEC_ID=$(basename "$spec_dir")
    BRANCH_NAME="feature/$SPEC_ID"
    WORKTREE_DIR="$REPO_ROOT/.worktrees/$SPEC_ID"

    COUNT=$((COUNT + 1))

    echo "[$COUNT/$TOTAL] Processing $SPEC_ID..."

    # Check if branch already exists
    if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
        echo "  ⚠️  Branch $BRANCH_NAME already exists, skipping..."
        continue
    fi

    # Create branch from main (without checking out)
    echo "  → Creating branch: $BRANCH_NAME"
    git branch "$BRANCH_NAME" main 2>/dev/null || {
        echo "  ❌ Failed to create branch, skipping..."
        continue
    }

    # Create worktree
    echo "  → Creating worktree: $WORKTREE_DIR"
    mkdir -p "$(dirname "$WORKTREE_DIR")"
    git worktree add "$WORKTREE_DIR" "$BRANCH_NAME" 2>/dev/null || {
        echo "  ❌ Failed to create worktree, cleaning up..."
        git branch -d "$BRANCH_NAME"
        continue
    }

    # Fetch latest tags to ensure worktree has up-to-date tag information
    echo "  → Fetching latest tags..."
    cd "$WORKTREE_DIR"
    git fetch --tags origin 2>/dev/null || echo "  ⚠️  Tag fetch failed (non-fatal)"
    cd "$REPO_ROOT"

    # Copy existing SPEC content to worktree
    echo "  → Copying SPEC content to worktree..."
    mkdir -p "$WORKTREE_DIR/specs/$SPEC_ID"
    cp -r "$spec_dir"/* "$WORKTREE_DIR/specs/$SPEC_ID/" 2>/dev/null || true

    # Commit in worktree
    cd "$WORKTREE_DIR"
    git add specs/
    git commit -m "feat: Initialize $SPEC_ID in worktree

Migrated from main branch specs/ directory to feature branch with worktree.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>" 2>/dev/null || {
        echo "  ⚠️  Nothing to commit (empty SPEC?)"
    }

    cd "$REPO_ROOT"
    echo "  ✓ Completed $SPEC_ID"
    echo ""
done

# Return to main branch
git checkout main

echo "========================================="
echo "Migration Summary"
echo "========================================="
echo "Total SPECs processed: $TOTAL"
echo ""
echo "Worktrees created in: .worktrees/"
echo "Branches created with prefix: feature/"
echo ""
echo "Note: Original specs/ directories are preserved on main branch."
echo "You can remove them after verifying worktrees are correct."
