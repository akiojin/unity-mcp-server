#!/bin/bash

# Claude Code PreToolUse Hook: Block git branch operations and cd to repository root
# このスクリプトは git checkout, git switch, git branch, git worktree コマンドと
# リポジトリルートへの cd コマンドをブロックします

# 配列内に値が含まれているかを判定
contains_element() {
    local needle="$1"
    shift
    for element in "$@"; do
        if [ "$element" = "$needle" ]; then
            return 0
        fi
    done
    return 1
}

# git branch コマンドが参照系かどうかを判定
is_read_only_git_branch() {
    local branch_args="$1"

    branch_args=$(echo "$branch_args" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    if [ -z "$branch_args" ]; then
        return 0
    fi

    local -a branch_tokens=()
    if command -v python3 >/dev/null 2>&1; then
        local tokens_json
        tokens_json=$(
            BRANCH_ARGS="$branch_args" python3 - <<'PY' 2>/dev/null
import os
import shlex
import json

args = os.environ.get("BRANCH_ARGS", "")
try:
    tokens = shlex.split(args)
except ValueError:
    tokens = []

print(json.dumps(tokens))
PY
        )
        if [ -z "$tokens_json" ]; then
            tokens_json='[]'
        fi
        mapfile -t branch_tokens < <(printf '%s\n' "$tokens_json" | jq -r '.[]')
    else
        # Pythonが利用できない環境向けフォールバック
        read -r -a branch_tokens <<< "$branch_args"
    fi

    local dangerous_flags=(-d -D --delete -m -M --move -c -C --copy --create-reflog --set-upstream-to --unset-upstream --track --no-track --edit-description -f --force)
    local expect_value_flags=(--list -l --contains --merged --no-merged --points-at --format --sort --abbrev)

    local expect_value=""
    for token in "${branch_tokens[@]}"; do
        if [ -z "$token" ]; then
            continue
        fi

        if [ -n "$expect_value" ]; then
            if [[ "$token" == -* ]]; then
                expect_value=""
            else
                expect_value=""
                continue
            fi
        fi

        if [ "$token" = "--" ]; then
            return 1
        fi

        if [[ "$token" == -* ]]; then
            local option_name="$token"
            local inline_value=""

            if [[ "$token" == *=* ]]; then
                option_name="${token%%=*}"
                inline_value="${token#*=}"
            fi

            if [[ "$option_name" == -* && "$option_name" != --* && ${#option_name} -gt 2 && "$option_name" != -*=* ]]; then
                local short_flags="${option_name#-}"
                local i
                for ((i = 0; i < ${#short_flags}; i++)); do
                    local short_flag="-${short_flags:i:1}"
                    if contains_element "$short_flag" "${dangerous_flags[@]}"; then
                        return 1
                    fi
                    if contains_element "$short_flag" "${expect_value_flags[@]}"; then
                        expect_value="$short_flag"
                    fi
                done
                continue
            fi

            if contains_element "$option_name" "${dangerous_flags[@]}"; then
                return 1
            fi

            if contains_element "$option_name" "${expect_value_flags[@]}"; then
                if [ -z "$inline_value" ]; then
                    expect_value="$option_name"
                fi
                continue
            fi

            continue
        fi

        return 1
    done

    return 0
}

# stdinからJSON入力を読み取り
json_input=$(cat)

# ツール名を確認
tool_name=$(echo "$json_input" | jq -r '.tool_name // empty')

# Bashツール以外は許可
if [ "$tool_name" != "Bash" ]; then
    exit 0
fi

# コマンドを取得
command=$(echo "$json_input" | jq -r '.tool_input.command // empty')

# 演算子で連結された各コマンドを個別にチェックするために分割
# &&, ||, ;, |, |&, &, 改行などで区切って先頭トークンを判定する
command_segments=$(printf '%s\n' "$command" | sed -E 's/\|&/\n/g; s/\|\|/\n/g; s/&&/\n/g; s/[;|&]/\n/g')

while IFS= read -r segment; do
    # リダイレクトやheredoc以降を落としてトリミング
    trimmed_segment=$(echo "$segment" | sed 's/[<>].*//; s/<<.*//' | xargs)

    # 空行はスキップ
    if [ -z "$trimmed_segment" ]; then
        continue
    fi

    # cdコマンドで起動ディレクトリより上への移動をチェック
    if echo "$trimmed_segment" | grep -qE '^cd\s+'; then
        cd_target=$(echo "$trimmed_segment" | sed -E 's/^cd[[:space:]]+//; s/^"//; s/"$//; s/^'\''//; s/'\''$//')

        # 起動ディレクトリ（PWDの初期値）を取得
        # INITIAL_PWDが設定されていない場合は現在のPWDを使用
        initial_pwd="${INITIAL_PWD:-$PWD}"

        # 絶対パスに変換してチェック（cd_targetが相対パスの場合も対応）
        if [[ "$cd_target" == /* ]]; then
            # 絶対パスの場合
            resolved_target="$cd_target"
        else
            # 相対パスの場合は現在のディレクトリ基準で解決
            resolved_target="$initial_pwd/$cd_target"
        fi

        # パスを正規化（..や.を解決）
        resolved_target=$(cd "$initial_pwd" 2>/dev/null && cd "$cd_target" 2>/dev/null && pwd 2>/dev/null || echo "INVALID")

        # 解決できなかった場合はスキップ（cdコマンド自体がエラーになるため）
        if [[ "$resolved_target" == "INVALID" ]]; then
            continue
        fi

        # 起動ディレクトリより上の階層への移動を検出
        # resolved_targetがinitial_pwdで始まらない場合はブロック
        if [[ "$resolved_target" != "$initial_pwd"* ]]; then
            cat <<EOF
{
  "decision": "block",
  "reason": "🚫 起動ディレクトリより上への cd は禁止されています / cd above startup directory is not allowed",
  "stopReason": "Worktree運用では、起動ディレクトリ ($initial_pwd) より上の階層への移動は禁止されています。\n\nReason: In Worktree operation, moving above the startup directory ($initial_pwd) is not allowed.\n\nBlocked command: $command\nResolved path: $resolved_target"
}
EOF
            echo "🚫 ブロック: $command" >&2
            echo "理由: 起動ディレクトリより上への cd は禁止されています。" >&2
            echo "起動ディレクトリ: $initial_pwd" >&2
            echo "移動先: $resolved_target" >&2
            exit 2  # ブロック
        fi
    fi

    # ブランチ切り替え/作成/worktreeコマンドをチェック
    if echo "$trimmed_segment" | grep -qE '^git\s+(checkout|switch|branch|worktree)\b'; then
        if echo "$trimmed_segment" | grep -qE '^git\s+branch\b'; then
            branch_args=$(echo "$trimmed_segment" | sed -E 's/^git[[:space:]]+branch//')
            if is_read_only_git_branch "$branch_args"; then
                continue
            fi
        fi
        # JSON応答を返す
        cat <<EOF
{
  "decision": "block",
  "reason": "🚫 ブランチ切り替え・作成・worktreeコマンドは禁止されています / Branch switching, creation, and worktree commands are not allowed",
  "stopReason": "Worktreeは起動したブランチで作業を完結させる設計です。git checkout、git switch、git branch、git worktree 等の操作は実行できません。\n\nReason: Worktree is designed to complete work on the launched branch. Branch operations such as git checkout, git switch, git branch, and git worktree cannot be executed.\n\nBlocked command: $command"
}
EOF

    # stderrにもメッセージを出力
    echo "🚫 ブロック: $command" >&2
    echo "理由: Worktreeは起動したブランチで作業を完結させる設計です。" >&2

    exit 2  # ブロック
    fi
done <<< "$command_segments"

# 許可
exit 0
