#!/bin/bash
# Setup implementation plan structure
# Returns paths needed for implementation plan generation
# Usage: ./setup-plan.sh [--json] [--no-branch-check] [--feature-dir <abs>] [--spec <abs>]

set -e

JSON_MODE=false
NO_BRANCH_CHECK=false
FEATURE_DIR_OVERRIDE=""
FEATURE_SPEC_OVERRIDE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)
            JSON_MODE=true; shift ;;
        --no-branch-check)
            NO_BRANCH_CHECK=true; shift ;;
        --feature-dir)
            FEATURE_DIR_OVERRIDE="$2"; shift 2 ;;
        --spec)
            FEATURE_SPEC_OVERRIDE="$2"; shift 2 ;;
        --help|-h)
            echo "Usage: $0 [--json] [--no-branch-check] [--feature-dir <abs>] [--spec <abs>]"; exit 0 ;;
        *)
            echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

REPO_ROOT="$(get_repo_root)"

# Establish baseline paths from current branch (for default behavior)
eval $(get_feature_paths)

# Optionally bypass branch check (no feature branch requirement)
if [ "$NO_BRANCH_CHECK" != true ]; then
    check_feature_branch "$CURRENT_BRANCH" || true
fi

# Apply overrides if provided
if [[ -n "$FEATURE_SPEC_OVERRIDE" ]]; then
    FEATURE_SPEC="$FEATURE_SPEC_OVERRIDE"
    FEATURE_DIR="$(dirname "$FEATURE_SPEC_OVERRIDE")"
    IMPL_PLAN="$FEATURE_DIR/plan.md"
elif [[ -n "$FEATURE_DIR_OVERRIDE" ]]; then
    FEATURE_DIR="$FEATURE_DIR_OVERRIDE"
    FEATURE_SPEC="$FEATURE_DIR/spec.md"
    IMPL_PLAN="$FEATURE_DIR/plan.md"
fi

# Create specs directory if it doesn't exist
mkdir -p "$FEATURE_DIR"

# Copy plan template if it exists
TEMPLATE="$REPO_ROOT/templates/plan-template.md"
if [ -f "$TEMPLATE" ]; then
    cp "$TEMPLATE" "$IMPL_PLAN"
fi

if $JSON_MODE; then
    printf '{"FEATURE_SPEC":"%s","IMPL_PLAN":"%s","SPECS_DIR":"%s"}\n' \
        "$FEATURE_SPEC" "$IMPL_PLAN" "$FEATURE_DIR"
else
    # Output all paths for LLM use
    echo "FEATURE_SPEC: $FEATURE_SPEC"
    echo "IMPL_PLAN: $IMPL_PLAN"
    echo "SPECS_DIR: $FEATURE_DIR"
    # Branch is intentionally omitted to support no-branch workflow
fi
