#!/bin/bash

# Claude Code PreToolUse Hook: Block C# editing with non-unity-mcp-server tools
# このスクリプトはUnity C#ファイル（*.cs）の編集を unity-mcp-server 以外のツールでブロックします

# stdinからJSON入力を読み取り
json_input=$(cat)

# ツール名を確認
tool_name=$(echo "$json_input" | jq -r '.tool_name // empty')

# unity-mcp-server のツールは許可
if [[ "$tool_name" == mcp__unity-mcp-server__* ]]; then
    exit 0
fi

# C#ファイル編集をブロックする対象ツール
declare -A blocked_tools=(
    # MCP tools
    ["Edit"]="1"
    ["Write"]="1"
    ["Read"]="1"  # 読み取りは警告のみ（後で制御）
    # serena MCP tools (if accidentally enabled)
    ["mcp__serena__replace_symbol_body"]="1"
    ["mcp__serena__insert_after_symbol"]="1"
    ["mcp__serena__insert_before_symbol"]="1"
    ["mcp__serena__replace_regex"]="1"
)

# 対象ツール以外は許可
if [[ -z "${blocked_tools[$tool_name]}" ]]; then
    exit 0
fi

# ファイルパスを取得（ツールによって異なる）
file_path=""
case "$tool_name" in
    "Edit")
        file_path=$(echo "$json_input" | jq -r '.tool_input.file_path // empty')
        ;;
    "Write")
        file_path=$(echo "$json_input" | jq -r '.tool_input.file_path // empty')
        ;;
    "Read")
        file_path=$(echo "$json_input" | jq -r '.tool_input.file_path // empty')
        ;;
    mcp__serena__*)
        file_path=$(echo "$json_input" | jq -r '.tool_input.relative_path // .tool_input.path // empty')
        ;;
esac

# ファイルパスが取得できない場合は許可
if [ -z "$file_path" ]; then
    exit 0
fi

# C#ファイル（*.cs）かどうかを判定
if [[ ! "$file_path" =~ \.cs$ ]]; then
    exit 0
fi

# Unity関連のC#ファイルかどうかを判定
# Assets/, Packages/, Library/ 配下のC#ファイルはUnity関連とみなす
if [[ "$file_path" =~ (^|/)Assets/ ]] ||
   [[ "$file_path" =~ (^|/)Packages/ ]] ||
   [[ "$file_path" =~ (^|/)Library/ ]] ||
   [[ "$file_path" =~ UnityMCPServer/ ]]; then

    # Readツールの場合は警告のみ（ブロックしない）
    if [ "$tool_name" = "Read" ]; then
        # 警告メッセージをstderrに出力
        cat >&2 <<EOF
⚠️  Warning: Reading Unity C# file with Read tool
    File: $file_path
    Recommendation: Use mcp__unity-mcp-server__read instead for better Unity integration
EOF
        exit 0  # 許可（警告のみ）
    fi

    # Edit/Writeツールの場合はブロック
    cat <<EOF
{
  "decision": "block",
  "reason": "🚫 Unity C# files must be edited with unity-mcp-server tools only",
  "stopReason": "Unity C# file editing with $tool_name is not allowed.\n\nFile: $file_path\n\nRequired tools:\n  - mcp__unity-mcp-server__edit_structured (for method body replacement, class member addition)\n  - mcp__unity-mcp-server__edit_snippet (for 1-2 line edits, max 80 chars)\n  - mcp__unity-mcp-server__get_symbols (to understand file structure)\n  - mcp__unity-mcp-server__find_symbol (to find symbols)\n  - mcp__unity-mcp-server__find_refs (to find references)\n\nReason: unity-mcp-server provides Unity-specific features:\n  - Real-time Unity Editor integration\n  - Compile error detection\n  - LSP diagnostics\n  - Unity-optimized code index\n\nSee CLAUDE.md for detailed guidelines."
}
EOF

    # stderrにもメッセージを出力
    cat >&2 <<EOF
🚫 Blocked: Unity C# file editing with $tool_name
File: $file_path
Reason: Unity C# files must be edited with unity-mcp-server tools only.

Required tools:
  - mcp__unity-mcp-server__edit_structured
  - mcp__unity-mcp-server__edit_snippet
  - mcp__unity-mcp-server__get_symbols
  - mcp__unity-mcp-server__find_symbol
  - mcp__unity-mcp-server__find_refs

See CLAUDE.md for detailed guidelines.
EOF

    exit 2  # ブロック
fi

# Unity関連以外のC#ファイルは許可
exit 0
