#!/usr/bin/env bash

# check-tests.sh - テスト実行チェック
#
# 使用方法:
#   check-tests.sh [--npm-only | --unity-only]
#
# 戻り値:
#   0: すべてのテストが合格
#   1: テストが失敗
#   2: エラー（テスト環境が見つからない等）

set -e

NPM_ONLY=false
UNITY_ONLY=false

# 引数解析
while [[ $# -gt 0 ]]; do
    case "$1" in
        --npm-only)
            NPM_ONLY=true
            shift
            ;;
        --unity-only)
            UNITY_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--npm-only | --unity-only]"
            echo "  --npm-only    Run only npm tests"
            echo "  --unity-only  Run only Unity tests"
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

EXIT_CODE=0

# npm テスト実行
if [ "$UNITY_ONLY" = false ]; then
    echo "========================================="
    echo "Running npm tests..."
    echo "========================================="

    if [ -d "mcp-server" ] && [ -f "mcp-server/package.json" ]; then
        cd mcp-server

        if ! npm test; then
            echo "❌ npm tests failed"
            EXIT_CODE=1
        else
            echo "✅ npm tests passed"
        fi

        cd "$REPO_ROOT"
    else
        echo "⚠️  mcp-server directory not found, skipping npm tests"
    fi
fi

# Unity テスト実行
if [ "$NPM_ONLY" = false ]; then
    echo ""
    echo "========================================="
    echo "Running Unity tests..."
    echo "========================================="

    # Unity Test Runnerの実行（MCP経由または直接実行）
    # TODO: Unity Test Runnerの統合を実装
    # 現時点では、Unity testsをスキップするか、MCPコマンドを呼び出す

    echo "⚠️  Unity tests are not yet integrated (TODO)"
    echo "   To enable, implement Unity Test Runner integration"
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
else
    echo ""
    echo "❌ Some tests failed"
fi

exit $EXIT_CODE
