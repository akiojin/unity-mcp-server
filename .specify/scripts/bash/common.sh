#!/usr/bin/env bash
# Common functions and variables for all scripts

get_repo_root() {
    if git rev-parse --show-toplevel >/dev/null 2>&1; then
        git rev-parse --show-toplevel
    else
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        (cd "$script_dir/../../.." && pwd)
    fi
}

# Determine current feature identifier (SPEC-xxxxxxxx)
get_current_feature() {
    if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
        echo "$SPECIFY_FEATURE"
        return
    fi

    local repo_root=$(get_repo_root)
    local marker="$repo_root/.specify/.current-feature"
    if [[ -f "$marker" ]]; then
        local feature
        feature=$(cat "$marker" | tr -d '\r\n')
        if [[ -n "$feature" ]]; then
            echo "$feature"
            return
        fi
    fi

    local specs_dir="$repo_root/specs"
    if [[ -d "$specs_dir" ]]; then
        local latest
        latest=$(ls -td "$specs_dir"/SPEC-* 2>/dev/null | head -1)
        if [[ -n "$latest" ]]; then
            basename "$latest"
            return
        fi
    fi

    if git rev-parse --abbrev-ref HEAD >/dev/null 2>&1; then
        git rev-parse --abbrev-ref HEAD
        return
    fi

    echo ""
}

get_current_branch() {
    get_current_feature
}

has_git() {
    git rev-parse --show-toplevel >/dev/null 2>&1
}

check_feature_branch() {
    local feature_id="$1"
    local has_git_repo="$2"

    if [[ -z "$feature_id" ]]; then
        echo "[specify] Warning: SPECIFY_FEATURE が未設定です。最新のSPECディレクトリを参照できない場合があります" >&2
        return 0
    fi

    if [[ "$has_git_repo" == "true" ]]; then
        local git_branch
        git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
        if [[ "$git_branch" == "main" ]]; then
            echo "[specify] Gitブランチは main のままです（ブランチ作成なしポリシー）" >&2
        fi
    fi

    if [[ ! "$feature_id" =~ ^SPEC-[a-z0-9]{8}$ ]]; then
        echo "[specify] Warning: フィーチャーID '$feature_id' が SPEC-xxxxxxxx 形式ではありません" >&2
    fi
    return 0
}

get_feature_dir() {
    echo "$1/specs/$2"
}

find_feature_dir_by_prefix() {
    local repo_root="$1"
    local feature_id="$2"
    local specs_dir="$repo_root/specs"

    if [[ -d "$specs_dir/$feature_id" ]]; then
        echo "$specs_dir/$feature_id"
    else
        echo "$specs_dir/$feature_id"
    fi
}

get_feature_paths() {
    local repo_root=$(get_repo_root)
    local current_feature=$(get_current_feature)
    local has_git_repo="false"

    if has_git; then
        has_git_repo="true"
    fi

    local feature_dir=$(find_feature_dir_by_prefix "$repo_root" "$current_feature")

    cat <<'EOF'
REPO_ROOT='__REPO_ROOT__'
CURRENT_BRANCH='__CURRENT_BRANCH__'
HAS_GIT='__HAS_GIT__'
FEATURE_DIR='__FEATURE_DIR__'
FEATURE_SPEC='__FEATURE_SPEC__'
IMPL_PLAN='__IMPL_PLAN__'
TASKS='__TASKS__'
RESEARCH='__RESEARCH__'
DATA_MODEL='__DATA_MODEL__'
QUICKSTART='__QUICKSTART__'
CONTRACTS_DIR='__CONTRACTS_DIR__'
EOF
    | sed \
        -e "s#__REPO_ROOT__#$repo_root#g" \
        -e "s#__CURRENT_BRANCH__#$current_feature#g" \
        -e "s#__HAS_GIT__#$has_git_repo#g" \
        -e "s#__FEATURE_DIR__#$feature_dir#g" \
        -e "s#__FEATURE_SPEC__#$feature_dir/spec.md#g" \
        -e "s#__IMPL_PLAN__#$feature_dir/plan.md#g" \
        -e "s#__TASKS__#$feature_dir/tasks.md#g" \
        -e "s#__RESEARCH__#$feature_dir/research.md#g" \
        -e "s#__DATA_MODEL__#$feature_dir/data-model.md#g" \
        -e "s#__QUICKSTART__#$feature_dir/quickstart.md#g" \
        -e "s#__CONTRACTS_DIR__#$feature_dir/contracts#g"
}

check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
