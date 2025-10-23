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

# Generate SPEC ID (SPEC-xxxxxxxx)
generate_spec_id() {
    for _ in 1 2 3 4 5; do
        if uuid=$(cat /proc/sys/kernel/random/uuid 2>/dev/null); then
            local short="${uuid:0:8}"
            short=$(echo "$short" | tr '[:upper:]' '[:lower:]')
            echo "SPEC-$short"
            return
        fi
    done
    local ts=$(date +%s%N)
    echo "SPEC-${ts: -8}"
}

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

FEATURE_ID=""
while :; do
    candidate=$(generate_spec_id)
    if [ ! -d "$SPECS_DIR/$candidate" ]; then
        FEATURE_ID="$candidate"
        break
    fi
done

FEATURE_DIR="$SPECS_DIR/$FEATURE_ID"
mkdir -p "$FEATURE_DIR"

TEMPLATE="$REPO_ROOT/.specify/templates/spec-template.md"
SPEC_FILE="$FEATURE_DIR/spec.md"
if [ -f "$TEMPLATE" ]; then
    cp "$TEMPLATE" "$SPEC_FILE"
else
    touch "$SPEC_FILE"
fi

export SPECIFY_FEATURE="$FEATURE_ID"
mkdir -p "$REPO_ROOT/.specify"
echo "$SPECIFY_FEATURE" > "$REPO_ROOT/.specify/.current-feature"

echo "[specify] Created feature directory: $FEATURE_ID"
if [ "$HAS_GIT" = true ]; then
    echo "[specify] Gitブランチは作成しません（既定動作）"
fi

echo "[specify] Description: $FEATURE_DESCRIPTION"

if $JSON_MODE; then
    printf '{"FEATURE_ID":"%s","SPEC_FILE":"%s"}\n' "$FEATURE_ID" "$SPEC_FILE"
else
    echo "FEATURE_ID: $FEATURE_ID"
    echo "SPEC_FILE: $SPEC_FILE"
    echo "SPECIFY_FEATURE environment variable set to: $FEATURE_ID"
fi
