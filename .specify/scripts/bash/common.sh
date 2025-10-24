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
        local feature_id=$(cat "$current_feature_file")
        if [[ -n "$feature_id" ]]; then
            echo "$feature_id"
            return
        fi
    fi

    # Fallback: find the latest SPEC-* directory
    local specs_dir="$repo_root/specs"
    if [[ -d "$specs_dir" ]]; then
        local latest_feature=""
        local latest_time=0

        for dir in "$specs_dir"/SPEC-*; do
            if [[ -d "$dir" ]]; then
                local dirname=$(basename "$dir")
                local mod_time=$(stat -c %Y "$dir" 2>/dev/null || stat -f %m "$dir" 2>/dev/null || echo "0")
                if [[ "$mod_time" -gt "$latest_time" ]]; then
                    latest_time=$mod_time
                    latest_feature=$dirname
                fi
            fi
        done

        if [[ -n "$latest_feature" ]]; then
            echo "$latest_feature"
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

    # Check for SPEC-UUID8桁 format (branchless workflow)
    if [[ "$branch" =~ ^SPEC-[a-z0-9]{8}$ ]]; then
        return 0
    fi

    # Fallback: allow any branch for now (branchless workflow)
    echo "[specify] Warning: Branch '$branch' does not match SPEC-[UUID8桁] format, but continuing" >&2
    return 0
}

get_feature_dir() { echo "$1/specs/$2"; }

# Find feature directory by SPEC-UUID8桁 exact match
# For branchless workflow using SPEC-[UUID8桁] format
find_feature_dir_by_prefix() {
    local repo_root="$1"
    local feature_id="$2"
    local specs_dir="$repo_root/specs"

    # For SPEC-UUID8桁 format, use exact match
    if [[ "$feature_id" =~ ^SPEC-[a-z0-9]{8}$ ]]; then
        echo "$specs_dir/$feature_id"
        return
    fi

    # Fallback: exact match for any other format
    echo "$specs_dir/$feature_id"
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

