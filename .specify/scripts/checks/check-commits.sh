#!/usr/bin/env bash

# check-commits.sh - commitlint コミットメッセージ規約チェック
#
# 使用方法:
#   check-commits.sh [--from <commit>] [--to <commit>]
#
# 戻り値:
#   0: すべてのコミットメッセージが規約に準拠
#   1: 規約違反のコミットメッセージが存在
#   2: エラー（commitlintが見つからない等）

set -e

FROM_COMMIT="origin/main"
TO_COMMIT="HEAD"

# 引数解析
while [[ $# -gt 0 ]]; do
    case "$1" in
        --from)
            FROM_COMMIT="$2"
            shift 2
            ;;
        --to)
            TO_COMMIT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--from <commit>] [--to <commit>]"
            echo "  --from <commit>  Start commit (default: origin/main)"
            echo "  --to <commit>    End commit (default: HEAD)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 2
            ;;
    esac
done

# リポジトリルートを見つける
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"

echo "========================================="
echo "Checking commit messages..."
echo "========================================="
echo "Range: $FROM_COMMIT..$TO_COMMIT"
echo ""

# commitlintの存在確認
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found. Please install Node.js and npm." >&2
    exit 2
fi

# commitlint設定ファイルの確認
if [ ! -f ".commitlintrc.json" ] && [ ! -f "commitlint.config.js" ]; then
    echo "⚠️  Warning: commitlint config file not found"
    echo "   Expected: .commitlintrc.json or commitlint.config.js"
    echo "   Skipping commitlint check"
    exit 0
fi

# コミット範囲の取得
COMMITS=$(git log --format=%H "$FROM_COMMIT".."$TO_COMMIT" 2>/dev/null || true)

if [ -z "$COMMITS" ]; then
    echo "ℹ️  No commits found in range $FROM_COMMIT..$TO_COMMIT"
    exit 0
fi

COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')
echo "Checking $COMMIT_COUNT commits..."
echo ""

EXIT_CODE=0
FAILED_COMMITS=()

# 各コミットメッセージをチェック
while IFS= read -r commit; do
    MESSAGE=$(git log --format=%B -n 1 "$commit")
    echo "Checking commit: ${commit:0:8}"

    # commitlintでチェック
    if ! echo "$MESSAGE" | npx commitlint --verbose 2>&1; then
        echo "❌ Commit message does not follow conventions: ${commit:0:8}"
        echo "   Message: $(echo "$MESSAGE" | head -n 1)"
        FAILED_COMMITS+=("$commit")
        EXIT_CODE=1
    else
        echo "✅ Commit ${commit:0:8} passed"
    fi

    echo ""
done <<< "$COMMITS"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All $COMMIT_COUNT commit messages follow conventions!"
else
    FAILED_COUNT=${#FAILED_COMMITS[@]}
    echo "❌ $FAILED_COUNT/$COMMIT_COUNT commit messages do not follow conventions"
    echo ""
    echo "Failed commits:"
    for commit in "${FAILED_COMMITS[@]}"; do
        echo "  - ${commit:0:8}: $(git log --format=%s -n 1 "$commit")"
    done
fi

exit $EXIT_CODE
