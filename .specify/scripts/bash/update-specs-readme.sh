#!/usr/bin/env bash

set -euo pipefail

QUIET=false

for arg in "$@"; do
    case "$arg" in
        --quiet)
            QUIET=true
            ;;
        --help|-h)
            cat << 'EOF'
Usage: update-specs-readme.sh [--quiet]

specs/README.md に要件一覧（SPEC-xxxxxxxx）を自動生成します。

Options:
  --quiet     進捗出力を抑制
  --help, -h  ヘルプを表示
EOF
            exit 0
            ;;
        *)
            echo "ERROR: 不明なオプション '$arg' です。--help を参照してください。" >&2
            exit 1
            ;;
    esac
done

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

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if git rev-parse --show-toplevel >/dev/null 2>&1; then
    REPO_ROOT="$(git rev-parse --show-toplevel)"
else
    REPO_ROOT="$(find_repo_root "$SCRIPT_DIR")"
    if [ -z "${REPO_ROOT:-}" ]; then
        echo "ERROR: リポジトリルートを特定できませんでした。リポジトリ内で実行してください。" >&2
        exit 1
    fi
fi

SPECS_DIR="$REPO_ROOT/specs"
OUTPUT_FILE="$SPECS_DIR/README.md"

mkdir -p "$SPECS_DIR"

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT INT TERM

{
    echo "# 要件一覧"
    echo ""
    echo 'このファイルは `.specify/scripts/bash/update-specs-readme.sh` により自動生成されます。'
    echo '手動編集は避けてください（再生成で上書きされます）。'
    echo ""
    echo "| 要件ID | タイトル | ステータス | 作成日 |"
    echo "|---|---|---|---|"
} >"$tmp_file"

spec_ids=()
while IFS= read -r id; do
    [[ -n "$id" ]] || continue
    spec_ids+=("$id")
done < <(find "$SPECS_DIR" -maxdepth 1 -mindepth 1 -type d -name 'SPEC-*' -exec basename {} \; 2>/dev/null | grep -E '^SPEC-[a-z0-9]{8}$' | sort)

if [[ ${#spec_ids[@]} -eq 0 ]]; then
    echo "| (なし) | - | - | - |" >>"$tmp_file"
else
    for id in "${spec_ids[@]}"; do
        spec_file="$SPECS_DIR/$id/spec.md"

        title=""
        status=""
        created=""

        if [[ -f "$spec_file" ]]; then
            title="$(grep -m1 '^#' "$spec_file" 2>/dev/null | sed 's/^# *//' || true)"
            title="$(echo "$title" | sed -E 's/^(機能仕様書|Feature Specification):[[:space:]]*//' || true)"

            status="$(grep -m1 -E '^\*\*(ステータス|Status)\*\*:' "$spec_file" 2>/dev/null | sed -E 's/^\*\*(ステータス|Status)\*\*:[[:space:]]*//' || true)"
            created="$(grep -m1 -E '^\*\*(作成日|Created)\*\*:' "$spec_file" 2>/dev/null | sed -E 's/^\*\*(作成日|Created)\*\*:[[:space:]]*//' || true)"
        fi

        [[ -n "$title" ]] || title="$id"
        [[ -n "$status" ]] || status="-"
        [[ -n "$created" ]] || created="-"

        # Escape table separators
        title="${title//|/\\|}"
        status="${status//|/\\|}"
        created="${created//|/\\|}"

        if [[ -f "$spec_file" ]]; then
            echo "| \`$id\` | [$title]($id/spec.md) | $status | $created |" >>"$tmp_file"
        else
            echo "| \`$id\` | $title | $status | $created |" >>"$tmp_file"
        fi
    done
fi

mv "$tmp_file" "$OUTPUT_FILE"

if [[ "$QUIET" != "true" ]]; then
    echo "[specify] 要件一覧を更新しました: $OUTPUT_FILE"
fi
