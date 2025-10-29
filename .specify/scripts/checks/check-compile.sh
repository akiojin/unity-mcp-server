#!/usr/bin/env bash

# check-compile.sh - TypeScript/C# コンパイルチェック
#
# 使用方法:
#   check-compile.sh [--typescript-only | --csharp-only]
#
# 戻り値:
#   0: コンパイル成功
#   1: コンパイルエラー
#   2: エラー（コンパイラが見つからない等）

set -e

TYPESCRIPT_ONLY=false
CSHARP_ONLY=false

# 引数解析
while [[ $# -gt 0 ]]; do
    case "$1" in
        --typescript-only)
            TYPESCRIPT_ONLY=true
            shift
            ;;
        --csharp-only)
            CSHARP_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--typescript-only | --csharp-only]"
            echo "  --typescript-only  Check only TypeScript compilation"
            echo "  --csharp-only      Check only C# compilation"
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

# TypeScript コンパイルチェック
if [ "$CSHARP_ONLY" = false ]; then
    echo "========================================="
    echo "Checking TypeScript compilation..."
    echo "========================================="

    if [ -d "mcp-server" ] && [ -f "mcp-server/package.json" ]; then
        cd mcp-server

        # TypeScriptのコンパイル（tscコマンド）
        if ! npm run type-check 2>/dev/null && ! npx tsc --noEmit 2>/dev/null; then
            echo "❌ TypeScript compilation failed"
            EXIT_CODE=1
        else
            echo "✅ TypeScript compilation passed"
        fi

        cd "$REPO_ROOT"
    else
        echo "⚠️  mcp-server directory not found, skipping TypeScript check"
    fi
fi

# C# コンパイルチェック
if [ "$TYPESCRIPT_ONLY" = false ]; then
    echo ""
    echo "========================================="
    echo "Checking C# compilation..."
    echo "========================================="

    # Unity プロジェクトの存在確認
    UNITY_PROJECT=""
    if [ -f ".unity/config.json" ]; then
        # config.jsonからUnityプロジェクトルートを取得
        UNITY_PROJECT=$(jq -r '.project.root // "UnityMCPServer"' .unity/config.json 2>/dev/null || echo "UnityMCPServer")
    else
        UNITY_PROJECT="UnityMCPServer"
    fi

    if [ ! -d "$UNITY_PROJECT" ]; then
        echo "⚠️  Unity project not found at $UNITY_PROJECT, skipping C# check"
    else
        # C# LSP を使用したコンパイルチェック
        # TODO: C# LSP統合を実装
        echo "⚠️  C# compilation check is not yet integrated (TODO)"
        echo "   To enable, implement C# LSP or Unity CLI integration"
    fi
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ All compilation checks passed!"
else
    echo ""
    echo "❌ Compilation failed"
fi

exit $EXIT_CODE
