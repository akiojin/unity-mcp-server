#!/usr/bin/env bash

set -e

JSON_MODE=false
ARGS=()

for arg in "$@"; do
    case "$arg" in
        --json)
            JSON_MODE=true
            ;;
        --help|-h)
            echo "Usage: $0 [--json] <feature_description>"
            echo "  --json      Output in JSON format"
            echo "  --help, -h  Show this help message"
            exit 0
            ;;
        *)
            ARGS+=("$arg")
            ;;
    esac
done

FEATURE_DESCRIPTION="${ARGS[*]}"
if [ -z "$FEATURE_DESCRIPTION" ]; then
    echo "Usage: $0 [--json] <feature_description>" >&2
    exit 1
fi

# Generate SPEC ID (SPEC-xxxxxxxx) using UUID8桁 format
generate_spec_id() {
    for _ in 1 2 3 4 5; do
        if uuid=$(cat /proc/sys/kernel/random/uuid 2>/dev/null); then
            local short="${uuid:0:8}"
            short=$(echo "$short" | tr '[:upper:]' '[:lower:]')
            echo "SPEC-$short"
            return
        fi
    done
    # Fallback to timestamp if UUID generation fails
    local ts=$(date +%s%N)
    echo "SPEC-${ts: -8}"
}

# Function to find the repository root by searching for existing project markers
find_repo_root() {
    local dir="$1"
    while [ "$dir" != "/" ]; do
        if [ -d "$dir/.git" ] || [ -d "$dir/.specify" ]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

# Resolve repository root. Prefer git information when available, but fall back
# to searching for repository markers so the workflow still functions in repositories that
# were initialised with --no-git.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if git rev-parse --show-toplevel >/dev/null 2>&1; then
    REPO_ROOT=$(git rev-parse --show-toplevel)
    HAS_GIT=true
else
    REPO_ROOT="$(find_repo_root "$SCRIPT_DIR")"
    if [ -z "$REPO_ROOT" ]; then
        echo "Error: Could not determine repository root. Please run this script from within the repository." >&2
        exit 1
    fi
    HAS_GIT=false
fi

cd "$REPO_ROOT"

SPECS_DIR="$REPO_ROOT/specs"
mkdir -p "$SPECS_DIR"

# Generate unique SPEC ID
FEATURE_ID=""
while :; do
    candidate=$(generate_spec_id)
    if [ ! -d "$SPECS_DIR/$candidate" ]; then
        FEATURE_ID="$candidate"
        break
    fi
done

# Create branch name with feature/ prefix
BRANCH_NAME="feature/$FEATURE_ID"

# Create Git branch and worktree if git is available
if [ "$HAS_GIT" = true ]; then
    # Create branch
    git checkout -b "$BRANCH_NAME" 2>/dev/null || {
        echo "Error: Failed to create branch $BRANCH_NAME" >&2
        exit 1
    }

    # Create worktree directory
    WORKTREE_DIR="$REPO_ROOT/.worktrees/$FEATURE_ID"
    mkdir -p "$(dirname "$WORKTREE_DIR")"

    # Add worktree
    git worktree add "$WORKTREE_DIR" "$BRANCH_NAME" 2>/dev/null || {
        echo "Error: Failed to create worktree at $WORKTREE_DIR" >&2
        git checkout main
        git branch -d "$BRANCH_NAME"
        exit 1
    }

    FEATURE_DIR="$WORKTREE_DIR/specs/$FEATURE_ID"
    echo "[specify] Created Git branch: $BRANCH_NAME"
    echo "[specify] Created worktree: $WORKTREE_DIR"
else
    # Fallback for non-git repos
    FEATURE_DIR="$SPECS_DIR/$FEATURE_ID"
    echo "[specify] Warning: Git repository not detected; using local directory without worktree"
fi

mkdir -p "$FEATURE_DIR"

# Initialize spec file from template
TEMPLATE="$REPO_ROOT/.specify/templates/spec-template.md"
SPEC_FILE="$FEATURE_DIR/spec.md"
if [ -f "$TEMPLATE" ]; then
    cp "$TEMPLATE" "$SPEC_FILE"
else
    touch "$SPEC_FILE"
fi

# Create checklists subdirectory for quality validation
mkdir -p "$FEATURE_DIR/checklists"

# Set the SPECIFY_FEATURE environment variable for the current session
export SPECIFY_FEATURE="$BRANCH_NAME"
mkdir -p "$REPO_ROOT/.specify"
echo "$SPECIFY_FEATURE" > "$REPO_ROOT/.specify/.current-feature"

echo "[specify] Created feature directory: $FEATURE_ID"
echo "[specify] Description: $FEATURE_DESCRIPTION"

if $JSON_MODE; then
    if [ "$HAS_GIT" = true ]; then
        printf '{"FEATURE_ID":"%s","BRANCH_NAME":"%s","SPEC_FILE":"%s","FEATURE_DIR":"%s","WORKTREE_DIR":"%s"}\n' \
            "$FEATURE_ID" "$BRANCH_NAME" "$SPEC_FILE" "$FEATURE_DIR" "$WORKTREE_DIR"
    else
        printf '{"FEATURE_ID":"%s","SPEC_FILE":"%s","FEATURE_DIR":"%s"}\n' \
            "$FEATURE_ID" "$SPEC_FILE" "$FEATURE_DIR"
    fi
else
    echo "FEATURE_ID: $FEATURE_ID"
    if [ "$HAS_GIT" = true ]; then
        echo "BRANCH_NAME: $BRANCH_NAME"
        echo "WORKTREE_DIR: $WORKTREE_DIR"
    fi
    echo "SPEC_FILE: $SPEC_FILE"
    echo "FEATURE_DIR: $FEATURE_DIR"
    echo "SPECIFY_FEATURE environment variable set to: $BRANCH_NAME"
fi
