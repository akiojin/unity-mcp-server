#!/usr/bin/env bash
# Common functions and variables for all scripts

# Get repository root, with fallback for non-git repositories
get_repo_root() {
    if git rev-parse --show-toplevel >/dev/null 2>&1; then
        git rev-parse --show-toplevel
    else
        # Fall back to script location for non-git repos
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        (cd "$script_dir/../../.." && pwd)
    fi
}

# Get current branch, with fallback for non-git repositories
get_current_branch() {
    # First check if SPECIFY_FEATURE environment variable is set
    if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
        echo "$SPECIFY_FEATURE"
        return
    fi

    # Then check git if available
    if git rev-parse --abbrev-ref HEAD >/dev/null 2>&1; then
        git rev-parse --abbrev-ref HEAD
        return
    fi

    # For non-git repos, check .specify/.current-feature file
    local repo_root=$(get_repo_root)
    local current_feature_file="$repo_root/.specify/.current-feature"

    if [[ -f "$current_feature_file" ]]; then
        local branch_name=$(cat "$current_feature_file")
        if [[ -n "$branch_name" ]]; then
            echo "$branch_name"
            return
        fi
    fi

    echo "main"  # Final fallback
}

# Check if we have git available
has_git() {
    git rev-parse --show-toplevel >/dev/null 2>&1
}

check_feature_branch() {
    local branch="$1"
    local has_git_repo="$2"

    # For non-git repos, we can't enforce branch naming but still provide output
    if [[ "$has_git_repo" != "true" ]]; then
        echo "[specify] Warning: Git repository not detected; skipped branch validation" >&2
        return 0
    fi

    # Check for feature/SPEC-UUID8桁 format (branch & worktree workflow)
    if [[ "$branch" =~ ^feature/SPEC-[a-z0-9]{8}$ ]]; then
        return 0
    fi

    # Allow main branch
    if [[ "$branch" == "main" ]] || [[ "$branch" == "master" ]]; then
        return 0
    fi

    # Warn but allow other branches
    echo "[specify] Warning: Branch '$branch' does not match feature/SPEC-[UUID8桁] format, but continuing" >&2
    return 0
}

get_feature_dir() { echo "$1/specs/$2"; }

# Find feature directory for branch & worktree workflow
# Extracts SPEC-ID from branch name and finds corresponding worktree
find_feature_dir_by_prefix() {
    local repo_root="$1"
    local branch_name="$2"

    # Extract SPEC-ID from feature/SPEC-xxx branch name
    if [[ "$branch_name" =~ ^feature/(SPEC-[a-z0-9]{8})$ ]]; then
        local spec_id="${BASH_REMATCH[1]}"
        local worktree_dir="$repo_root/.worktrees/$spec_id"

        # Check if worktree exists
        if [[ -d "$worktree_dir" ]]; then
            echo "$worktree_dir/specs/$spec_id"
            return
        fi

        # Fallback to main repo if worktree doesn't exist
        echo "$repo_root/specs/$spec_id"
        return
    fi

    # For main branch or other branches, use main repo specs directory
    local specs_dir="$repo_root/specs"

    # If branch_name looks like a SPEC-ID directly
    if [[ "$branch_name" =~ ^SPEC-[a-z0-9]{8}$ ]]; then
        echo "$specs_dir/$branch_name"
        return
    fi

    # Fallback: use branch name as-is
    echo "$specs_dir/$branch_name"
}

get_feature_paths() {
    local repo_root=$(get_repo_root)
    local current_branch=$(get_current_branch)
    local has_git_repo="false"

    if has_git; then
        has_git_repo="true"
    fi

    # Use prefix-based lookup to support multiple branches per spec
    local feature_dir=$(find_feature_dir_by_prefix "$repo_root" "$current_branch")

    cat <<EOF
REPO_ROOT='$repo_root'
CURRENT_BRANCH='$current_branch'
HAS_GIT='$has_git_repo'
FEATURE_DIR='$feature_dir'
FEATURE_SPEC='$feature_dir/spec.md'
IMPL_PLAN='$feature_dir/plan.md'
TASKS='$feature_dir/tasks.md'
RESEARCH='$feature_dir/research.md'
DATA_MODEL='$feature_dir/data-model.md'
QUICKSTART='$feature_dir/quickstart.md'
CONTRACTS_DIR='$feature_dir/contracts'
EOF
}

check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }

