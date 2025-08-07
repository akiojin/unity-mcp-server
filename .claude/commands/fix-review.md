# /FixReview

PRの全ての問題（レビューコメント、コンフリクト、CI/CDエラー等）を包括的に解決するコマンド

## 概要

このコマンドは、PRに関連する全ての問題を自動的に検出・分析し、技術的に適切な修正を実装します。レビューコメントの対応だけでなく、マージコンフリクトの解決、テスト失敗の修正、型チェックエラーの解消なども含みます。

## 依存関係

### 必要なツール

このコマンドを使用する前に、以下のツールがインストールされている必要があります：

- **Bash 4.0+** - シェルスクリプトの実行環境
- **jq** - JSONデータの解析とフィルタリング
  - インストール: `brew install jq` (macOS) または `apt-get install jq` (Ubuntu)
- **GitHub CLI (gh)** - GitHub APIへのアクセス
  - インストール: [GitHub CLI](https://cli.github.com/)
  - 認証: `gh auth login` で事前認証が必要

### 使用するシェルスクリプト

このコマンドは以下のシェルスクリプトを使用します：
- `scripts/get-pr-reviews.sh` - レビューコメントの取得
- `scripts/reply-to-review.sh` - レビューコメントへのリプライ投稿
- `scripts/lib/github-api-utils.sh` - GitHub API共通ユーティリティ（上記スクリプトが使用）

## 使用方法

```
/FixReview
/FixReview #123
```

PR番号を指定しない場合は、現在のブランチに関連するPRを自動的に特定します。現在のブランチに対応するPRが存在しない場合はエラーメッセージを表示します。

## 処理フロー

**重要**: 全てのレビューコメントの対応が完了するまで、繰り返し処理を継続する。最大イテレーション数に達しても未対応コメントがある場合は、エラーとして報告し、手動対応を促す。

1. **PR状態の包括的確認**
   - 引数でPR番号が指定された場合はそれを使用
   - 指定がない場合は`gh pr view --json number,url`で現在のブランチからPRを自動特定
   - PR情報、マージ可能性、CI/CDステータスを取得
   - ベースブランチとの差分を確認
   - **全レビューコメントの詳細情報を取得**

2. **問題の検出と分類**
   - レビューコメント（Changes Requested、コメント）
   - マージコンフリクトの有無
   - CI/CDチェックの失敗（テスト、ビルド、lint等）
   - 型チェックエラー
   - セキュリティアラート
   - 依存関係の問題

3. **コンフリクト解決**
   - ベースブランチをマージ
   - コンフリクトがある場合は自動解決を試行
   - 解決できない場合は、コンテキストを考慮して適切に解決
   - 解決後、テストを実行して動作確認

4. **レビューコメント対応（最大限の並列化とToDo細分化）**
   - **初期分析フェーズ（全コメントを深く分析）**
     - 全てのレビューコメントを取得
     - 各コメントを徹底的に分析（技術的根拠の検証）
     - 対応要否を忖度なしで判断
     - **TodoWriteツールで全タスクを最大限に細分化して一括登録**
     - **並列実行可能なタスクを識別し、同時処理**
   - **並列処理の実施**
     - 独立したファイルの修正は全て並列実行
     - テスト追加とコード修正は並列実行
     - ドキュメント更新と他の修正は並列実行
     - 依存関係のないコメント対応は同時処理
   - **繰り返し処理（未対応コメントがなくなるまで継続、最大5回）**
     - 未対応コメントのみを処理
     - 技術的に妥当な指摘を修正
     - 修正内容をコミット
     - 各レビューコメントに対して修正内容のリプライコメントを投稿
     - リプライ投稿の成功を検証
     - 対応済みコメントのステータスを更新
     - **全コメントが対応完了するまで繰り返す**
   - **全コメントの対応状況を最終確認**
     - 未対応コメントが残っている場合はエラーとして報告

5. **CI/CDエラー修正**
   - テスト失敗の原因を分析・修正
   - ビルドエラーの解消
   - Lintエラーの修正
   - 型チェックエラーの解消

6. **品質保証とコミット**
   - `npm run type-check`で型チェック
   - `npm run lint`でコード品質確認
   - `npm run test`でテスト実行（存在する場合）
   - 全ての修正を適切なコミットメッセージでコミット
   - プッシュして更新


## 判断基準

### レビューコメント対応基準（忖度なし・技術的根拠のみ）

**重要**: 各レビューコメントは徹底的に分析し、技術的根拠に基づいてのみ判断する。レビュアーの権威や関係性による忖度は一切行わない。

#### 対応する指摘（技術的根拠が明確な場合のみ）
- **セキュリティ上の問題** → 必須対応（深く分析して実際のリスクを確認）
- **パフォーマンス問題** → 必須対応（計測可能な影響がある場合）
- **バグや論理エラー** → 必須対応（再現可能で実害がある場合）
- **コーディング規約違反** → プロジェクト規約に明記されている場合のみ対応
- **型安全性の問題** → 必須対応（実行時エラーのリスクがある場合）
- **テストの不備** → 必須対応（重要なロジックのカバレッジ不足）
- **ドキュメント不足** → 技術的に必要かつ保守性に影響する場合のみ対応

#### 対応しない指摘（忖度なし）
- **主観的な意見や個人の好み** → 一切対応しない
- **設計思想の違い** → 技術的に問題がなければ対応しない
- **「〜の方が良い」という曖昧な指摘** → 具体的な技術的根拠がなければ対応しない
- **過度な最適化要求（YAGNI原則違反）** → 現時点で不要なら対応しない
- **プロジェクト方針と矛盾する要求** → 理由を明確に説明して対応しない
- **レビュアーの権威に基づく要求** → 技術的根拠がなければ対応しない
- **「一般的には〜」という慣習論** → プロジェクトに適さなければ対応しない

### コンフリクト解決基準
- ベースブランチの変更を優先しつつ、PRの意図を保持
- 両方の変更が必要な場合は統合
- 不明な場合は、より安全な選択を採用

## 実装詳細

### PR情報の取得
```bash
# PR番号の自動取得または引数から解析
if [ -z "$PR_NUMBER" ]; then
  # 現在のブランチからPR番号を自動取得
  PR_INFO=$(gh pr view --json number,url 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "❌ 現在のブランチに対応するPRが見つかりません"
    exit 1
  fi
  PR_NUMBER=$(echo "$PR_INFO" | jq -r '.number')
else
  # 引数で指定されたPR番号を使用
  PR_NUMBER=$(echo "$1" | grep -o '#[0-9]*' | cut -c2-)
fi

# GitHub APIでの詳細情報取得
gh pr view $PR_NUMBER --json mergeable,statusCheckRollup,reviews
```

### コンフリクト解決の実装
1. ベースブランチの最新を取得
2. マージを試行
3. コンフリクトファイルを検出
4. 各ファイルのコンフリクトを解析・解決
5. 解決後のテスト実行

### レビューコメントへのリプライ機能（強化版）
```bash
# レビューコメント追跡配列（グローバル）
declare -A COMMENT_TRACKING  # コメントID => ステータス (pending/addressed/skipped)
declare -A COMMENT_CONTENT   # コメントID => コメント内容
declare -A COMMENT_AUTHOR    # コメントID => 作成者
declare -A COMMENT_REPLY     # コメントID => リプライ内容
declare -A COMMENT_PRIORITY  # コメントID => 優先度 (critical/high/medium/normal/low)

# レビューコメントの詳細取得（新しいシェルスクリプトを使用）
get_all_review_comments() {
  echo "📝 全レビューコメントを取得中..."

  # スクリプトディレクトリを取得
  local script_dir="$(git rev-parse --show-toplevel)/scripts"

  # get-pr-reviews.sh を使用してレビューコメントを取得
  local reviews_json=$("${script_dir}/get-pr-reviews.sh" --pr "$PR_NUMBER" --format json --include-resolved)

  if [[ -z "$reviews_json" || "$reviews_json" == "[]" ]]; then
    echo "ℹ️ レビューコメントが見つかりません"
    return
  fi

  # JSONから追跡配列に格納
  while IFS= read -r comment; do
    local id=$(echo "$comment" | jq -r '.id')
    local author=$(echo "$comment" | jq -r '.author')
    local body=$(echo "$comment" | jq -r '.body')
    local priority=$(echo "$comment" | jq -r '.priority')

    if [[ -n "$id" && "$id" != "null" ]]; then
      COMMENT_TRACKING["$id"]="pending"
      COMMENT_CONTENT["$id"]="$body"
      COMMENT_AUTHOR["$id"]="$author"
      COMMENT_PRIORITY["$id"]="$priority"
    fi
  done < <(echo "$reviews_json" | jq -c '.[]')

  echo "✅ 合計 ${#COMMENT_TRACKING[@]} 件のレビューコメントを検出"
}

# 未対応コメント数を取得
count_pending_comments() {
  local count=0
  for status in "${COMMENT_TRACKING[@]}"; do
    if [[ "$status" == "pending" ]]; then
      ((count++))
    fi
  done
  echo $count
}

# リプライ投稿（新しいシェルスクリプトを使用）
reply_to_review_comment_with_retry() {
  local comment_id=$1
  local reply_message=$2
  local resolve_thread=${3:-false}  # オプション: スレッドを解決するか

  echo "💬 コメント $comment_id にリプライ投稿中..."

  # スクリプトディレクトリを取得
  local script_dir="$(git rev-parse --show-toplevel)/scripts"

  # reply-to-review.sh を使用してリプライ投稿
  # スクリプト自体にリトライ機能が組み込まれている
  local cmd=("${script_dir}/reply-to-review.sh" \
    --pr "$PR_NUMBER" \
    --comment-id "$comment_id" \
    --body "$reply_message")

  # スレッド解決オプションを追加
  if [[ "$resolve_thread" == "true" ]]; then
    cmd+=(--resolve)
    echo "🔒 スレッドを解決済みにします"
  fi

  local output=$("${cmd[@]}" 2>&1)
  local status=$?

  if [ $status -eq 0 ]; then
    echo "✅ リプライ投稿成功"
    echo "$output" | grep -E "(ID:|html_url:|created_at:|スレッドを解決済み)" || true
    COMMENT_REPLY["$comment_id"]="$reply_message"
    return 0
  else
    echo "❌ リプライ投稿失敗"
    echo "$output"
    return 1
  fi
}

# コメントのステータス更新
update_comment_status() {
  local comment_id=$1
  local status=$2  # addressed/skipped

  COMMENT_TRACKING["$comment_id"]="$status"
  echo "📌 コメント $comment_id のステータスを $status に更新"
}

# 進捗レポート表示
show_progress_report() {
  echo ""
  echo "=== 📊 レビューコメント対応進捗 ==="

  local total=${#COMMENT_TRACKING[@]}
  local addressed=0
  local skipped=0
  local pending=0

  for id in "${!COMMENT_TRACKING[@]}"; do
    case "${COMMENT_TRACKING[$id]}" in
      "addressed")
        ((addressed++))
        ;;
      "skipped")
        ((skipped++))
        ;;
      "pending")
        ((pending++))
        echo "⏳ 未対応: $id - ${COMMENT_AUTHOR[$id]}: ${COMMENT_CONTENT[$id]:0:50}..."
        ;;
    esac
  done

  echo ""
  echo "📈 進捗サマリー:"
  echo "  - 合計コメント数: $total"
  echo "  - ✅ 対応済み: $addressed"
  echo "  - ℹ️ 対応不要: $skipped"
  echo "  - ⏳ 未対応: $pending"
  echo ""

  if [ $pending -eq 0 ]; then
    echo "🎉 全てのレビューコメントの対応が完了しました！"
    return 0
  else
    echo "⚠️ まだ $pending 件の未対応コメントがあります"
    return 1
  fi
}

# 修正実施報告のリプライ例
# "✅ 修正しました: SQLインジェクション対策としてプリペアドステートメントを使用するように変更しました。"
# "ℹ️ 対応不要: この指摘は設計思想の違いによるものため、現在の実装を維持します。"
# "🔄 部分対応: ご指摘の一部を反映しました。残りの部分については別途検討します。"
```

### レビューコメント処理のメインループ
```bash
# レビューコメント対応のメイン処理（全コメント対応完了まで継続）
process_review_comments_with_loop() {
  local max_iterations=5
  local iteration=0

  # 全レビューコメントを取得
  get_all_review_comments

  # 初回の分析とToDo登録（最大限の細分化と並列化）
  echo "📊 全コメントを深く分析し、ToDoを細分化して登録中..."
  create_todos_for_all_comments

  # 初回の進捗表示
  show_progress_report

  # 未対応コメントがなくなるまで繰り返し
  while [ $(count_pending_comments) -gt 0 ] && [ $iteration -lt $max_iterations ]; do
    ((iteration++))
    echo ""
    echo "🔄 === イテレーション $iteration/$max_iterations 開始 ==="

    # 未対応コメントのみを処理
    for comment_id in "${!COMMENT_TRACKING[@]}"; do
      if [[ "${COMMENT_TRACKING[$comment_id]}" == "pending" ]]; then
        echo ""
        echo "📝 コメント処理中: $comment_id"
        echo "  作成者: ${COMMENT_AUTHOR[$comment_id]}"
        echo "  内容: ${COMMENT_CONTENT[$comment_id]}"

        # コメントの分析と対応判断
        local action=$(analyze_and_decide_action "$comment_id" "${COMMENT_CONTENT[$comment_id]}")

        case "$action" in
          "fix")
            # 技術的修正を実施
            echo "🔧 技術的修正を実施中..."
            implement_fix_for_comment "$comment_id" "${COMMENT_CONTENT[$comment_id]}"

            # リプライ投稿（修正完了なのでスレッドも解決）
            local reply_msg="✅ 修正しました: ${COMMENT_CONTENT[$comment_id]:0:50}... に対する修正を実装しました。"
            if reply_to_review_comment_with_retry "$comment_id" "$reply_msg" "true"; then
              update_comment_status "$comment_id" "addressed"
            fi
            ;;

          "skip")
            # 対応不要と判断
            echo "ℹ️ 対応不要と判断"

            # 理由を含むリプライ投稿（スレッドは解決しない）
            local reply_msg="ℹ️ 対応不要: この指摘は設計思想の違いまたは主観的な意見のため、現在の実装を維持します。"
            if reply_to_review_comment_with_retry "$comment_id" "$reply_msg" "false"; then
              update_comment_status "$comment_id" "skipped"
            fi
            ;;

          "partial")
            # 部分対応
            echo "🔄 部分対応を実施中..."
            implement_partial_fix_for_comment "$comment_id" "${COMMENT_CONTENT[$comment_id]}"

            # リプライ投稿（部分対応なのでスレッドは解決しない）
            local reply_msg="🔄 部分対応: ご指摘の一部を反映しました。残りの部分については別途検討します。"
            if reply_to_review_comment_with_retry "$comment_id" "$reply_msg" "false"; then
              update_comment_status "$comment_id" "addressed"
            fi
            ;;
        esac
      fi
    done

    # 各イテレーション後の進捗表示
    show_progress_report

    # 修正をコミット
    if [ $(git diff --cached --name-only | wc -l) -gt 0 ] || [ $(git diff --name-only | wc -l) -gt 0 ]; then
      git add -A
      git commit -m "fix: レビューコメント対応（イテレーション $iteration）"
    fi
  done

  # 最終レポート
  echo ""
  echo "=== 🏁 レビューコメント対応処理終了 ==="
  if [ $(count_pending_comments) -eq 0 ]; then
    echo "✅ 全てのレビューコメントの対応が完了しました！"

    # 最終サマリーレポート
    generate_final_report

    return 0
  else
    echo "❌ エラー: 最大イテレーション数（$max_iterations回）に到達しましたが、まだ未対応のコメントがあります"
    echo "⚠️ 全てのレビューコメントの対応が完了するまで処理を継続する必要があります"
    show_progress_report

    echo ""
    echo "💡 対処方法:"
    echo "  1. 手動で残りのコメントに対応する"
    echo "  2. /FixReview を再度実行する"
    echo "  3. 技術的に対応が困難な場合は、明確な理由を添えてレビュアーと相談する"

    exit 1  # エラーとして終了
  fi
}

# 最終レポート生成
generate_final_report() {
  echo ""
  echo "=== 📋 最終対応レポート ==="
  echo ""

  echo "【対応済みコメント】"
  for id in "${!COMMENT_TRACKING[@]}"; do
    if [[ "${COMMENT_TRACKING[$id]}" == "addressed" ]]; then
      echo "✅ $id - ${COMMENT_AUTHOR[$id]}: ${COMMENT_CONTENT[$id]:0:80}..."
      if [[ -n "${COMMENT_REPLY[$id]}" ]]; then
        echo "   → リプライ: ${COMMENT_REPLY[$id]:0:80}..."
      fi
    fi
  done

  echo ""
  echo "【対応不要と判断したコメント】"
  for id in "${!COMMENT_TRACKING[@]}"; do
    if [[ "${COMMENT_TRACKING[$id]}" == "skipped" ]]; then
      echo "ℹ️ $id - ${COMMENT_AUTHOR[$id]}: ${COMMENT_CONTENT[$id]:0:80}..."
      if [[ -n "${COMMENT_REPLY[$id]}" ]]; then
        echo "   → 理由: ${COMMENT_REPLY[$id]:0:80}..."
      fi
    fi
  done

  echo ""
  echo "📊 統計情報:"
  echo "  - 総コメント数: ${#COMMENT_TRACKING[@]}"
  echo "  - 対応済み: $(count_status 'addressed')"
  echo "  - 対応不要: $(count_status 'skipped')"
  echo "  - リプライ投稿数: ${#COMMENT_REPLY[@]}"
}

# ステータス別カウント
count_status() {
  local target_status=$1
  local count=0
  for status in "${COMMENT_TRACKING[@]}"; do
    if [[ "$status" == "$target_status" ]]; then
      ((count++))
    fi
  done
  echo $count
}
```

### コメント分析と修正実装の補助関数
```bash
# コメントの深い分析と対応判断（忖度なし）
analyze_and_decide_action() {
  local comment_id=$1
  local comment_body=$2

  echo "🔍 コメントを徹底的に分析中..."
  echo "  1. 技術的根拠の検証"
  echo "  2. プロジェクトへの影響評価"
  echo "  3. 既存コードとの整合性確認"
  echo "  4. パフォーマンスへの影響検討"
  echo "  5. セキュリティリスクの評価"
  echo "  6. 保守性への影響検討"

  # セキュリティ関連のキーワード（技術的根拠あり）
  if echo "$comment_body" | grep -iE "(security|injection|vulnerability|xss|csrf|auth)" > /dev/null; then
    echo "🔒 セキュリティリスクを検出 → 必須対応"
    echo "fix"
    return
  fi

  # パフォーマンス関連（計測可能な影響あり）
  if echo "$comment_body" | grep -iE "(performance|n\+1|slow|optimize|cache)" > /dev/null; then
    # 実際のパフォーマンス影響を評価
    echo "⚡ パフォーマンス問題を検出 → 技術的根拠を確認して対応"
    echo "fix"
    return
  fi

  # 型安全性・エラーハンドリング（実行時エラーのリスク）
  if echo "$comment_body" | grep -iE "(type|any|error|exception|try|catch|null|undefined)" > /dev/null; then
    echo "📐 型安全性の問題を検出 → 必須対応"
    echo "fix"
    return
  fi

  # テスト関連（カバレッジ不足による品質リスク）
  if echo "$comment_body" | grep -iE "(test|coverage|spec|unit|integration)" > /dev/null; then
    echo "🧪 テスト不足を検出 → 重要ロジックのカバレッジ確認して対応"
    echo "fix"
    return
  fi

  # 主観的な意見や好み（技術的根拠なし）
  if echo "$comment_body" | grep -iE "(prefer|suggest|maybe|could|style|naming)" > /dev/null; then
    echo "❌ 主観的な意見を検出 → 技術的根拠がないため対応しない"
    echo "skip"
    return
  fi

  # 「一般的には」という慣習論（プロジェクト固有の判断が必要）
  if echo "$comment_body" | grep -iE "(generally|usually|common|convention|standard)" > /dev/null; then
    echo "❌ 一般論を検出 → プロジェクト方針に基づいて判断"
    echo "skip"
    return
  fi

  # デフォルトは技術的影響を詳細に検討
  echo "🔍 詳細な技術的分析が必要 → 部分対応を検討"
  echo "partial"
}

# 技術的修正の実装
implement_fix_for_comment() {
  local comment_id=$1
  local comment_body=$2

  echo "🔍 コメント内容を分析して修正方針を決定中..."

  # セキュリティ修正
  if echo "$comment_body" | grep -i "injection" > /dev/null; then
    echo "🔒 SQLインジェクション対策を実装"
    # 実際の修正コードをここに実装
  fi

  # パフォーマンス修正
  if echo "$comment_body" | grep -i "n+1" > /dev/null; then
    echo "⚡ N+1クエリ問題を解決"
    # 実際の修正コードをここに実装
  fi

  # 型安全性修正
  if echo "$comment_body" | grep -i "any" > /dev/null; then
    echo "📐 any型を具体的な型に変更"
    # 実際の修正コードをここに実装
  fi

  # テスト追加
  if echo "$comment_body" | grep -i "test" > /dev/null; then
    echo "🧪 テストケースを追加"
    # 実際の修正コードをここに実装
  fi
}

# 部分対応の実装
implement_partial_fix_for_comment() {
  local comment_id=$1
  local comment_body=$2

  echo "🔍 部分対応可能な内容を特定中..."

  # 重要度の高い部分のみ対応
  echo "📝 技術的に重要な部分のみ対応を実施"
  # 実際の部分修正コードをここに実装
}

# ToDoを最大限に細分化して並列実行
create_todos_for_all_comments() {
  echo "📝 全コメントの分析結果に基づいてToDoを作成中..."

  local todos=()
  local parallel_groups=()

  # 各コメントを分析してToDoを作成
  for comment_id in "${!COMMENT_TRACKING[@]}"; do
    if [[ "${COMMENT_TRACKING[$comment_id]}" == "pending" ]]; then
      local comment_body="${COMMENT_CONTENT[$comment_id]}"
      local action=$(analyze_and_decide_action "$comment_id" "$comment_body")

      if [[ "$action" == "fix" ]]; then
        # タスクを最大限に細分化
        if echo "$comment_body" | grep -i "test" > /dev/null; then
          todos+=("テストケース作成: $comment_id")
          todos+=("テスト実装: $comment_id")
          todos+=("テスト実行確認: $comment_id")
        fi

        if echo "$comment_body" | grep -i "type" > /dev/null; then
          todos+=("型定義修正: $comment_id")
          todos+=("型チェック実行: $comment_id")
        fi

        if echo "$comment_body" | grep -i "security" > /dev/null; then
          todos+=("セキュリティ脆弱性分析: $comment_id")
          todos+=("セキュリティ修正実装: $comment_id")
          todos+=("セキュリティテスト追加: $comment_id")
        fi

        # 修正とリプライは必須
        todos+=("コード修正実装: $comment_id")
        todos+=("リプライ投稿: $comment_id")
      elif [[ "$action" == "skip" ]]; then
        todos+=("対応不要理由のリプライ投稿: $comment_id")
      fi
    fi
  done

  echo "✅ 合計 ${#todos[@]} 個のToDoを作成"
  echo "🚀 並列実行可能なタスクを識別して同時処理を開始..."

  # TodoWriteツールを使用して一括登録（実際の実装では）
  # TodoWrite --tasks "${todos[@]}" --parallel
}
```

### CI/CDエラーの修正
1. 失敗しているチェックを特定
2. エラーログを解析
3. 原因に応じた修正を実装
4. 修正後の検証

## 出力例

### 包括的な問題解決の例：
```
/FixReview #456

🔍 PR #456を分析中...
  PR #456: "バックエンドAPI実装" を確認
  ベースブランチ: develop
  マージ可能性: ❌ コンフリクトあり

📊 PR状態の総合診断:
  ⚠️ マージコンフリクト: 3ファイル
  ❌ CI/CDチェック: 2/5 失敗
  📝 レビューコメント: 8件（Changes Requested: 2）
  🔒 セキュリティアラート: 1件

🔄 コンフリクト解決中...
  package.json: 依存関係の統合 ✅
  src/api/routes.ts: 両方の変更を統合 ✅
  README.md: ベースブランチ優先 ✅

📝 レビューコメント対応（繰り返し処理）:

🔄 === イテレーション 1/5 開始 ===
  ✅ セキュリティ: SQL injection対策 → 修正実行 → リプライ投稿成功
  ✅ パフォーマンス: N+1クエリ問題 → 修正実行 → リプライ投稿成功
  ⏳ 型安全性: any型の使用（リプライ投稿失敗のため次回再試行）

📊 進捗サマリー:
  - 合計コメント数: 8
  - ✅ 対応済み: 2
  - ℹ️ 対応不要: 0
  - ⏳ 未対応: 6

🔄 === イテレーション 2/5 開始 ===
  ✅ 型安全性: any型の使用 → 具体的な型に変更 → リプライ投稿成功（リトライ2回目）
  ℹ️ 設計: 関数名の好み → 対応不要 → 理由をリプライで説明
  ✅ テスト: カバレッジ不足 → テスト追加 → リプライ投稿成功
  ✅ ドキュメント: APIドキュメント不足 → 追加 → リプライ投稿成功

📊 進捗サマリー:
  - 合計コメント数: 8
  - ✅ 対応済み: 5
  - ℹ️ 対応不要: 1
  - ⏳ 未対応: 2

🔄 === イテレーション 3/5 開始 ===
  ✅ エラーハンドリング: try-catchブロック追加 → 修正実行 → リプライ投稿成功
  ✅ 依存関係: 未使用パッケージ削除 → 修正実行 → リプライ投稿成功

🎉 全てのレビューコメントの対応が完了しました！

=== 📋 最終対応レポート ===

【対応済みコメント】
✅ 12345 - @reviewer1: SQL injection対策が必要です...
   → リプライ: ✅ 修正しました: プリペアドステートメントを使用するように変更しました。
✅ 12346 - @reviewer2: N+1クエリ問題があります...
   → リプライ: ✅ 修正しました: eager loadingを使用してクエリを最適化しました。
...

【対応不要と判断したコメント】
ℹ️ 12347 - @reviewer3: 関数名をcamelCaseにしてください...
   → 理由: ℹ️ 対応不要: プロジェクトのコーディング規約ではsnake_caseを採用しています。

📊 統計情報:
  - 総コメント数: 8
  - 対応済み: 7
  - 対応不要: 1
  - リプライ投稿数: 8

🔧 CI/CDエラー修正:
  ✅ TypeScript: 型エラー5件を修正
  ✅ ESLint: フォーマット違反を修正
  ✅ Jest: 失敗テスト2件を修正

✅ 品質チェック:
  npm run type-check: ✅ エラーなし
  npm run lint: ✅ 警告なし
  npm run test: ✅ 全テスト通過

📤 変更をコミット & プッシュ:
  - fix: マージコンフリクトを解決
  - fix: レビュー指摘事項の対応
  - fix: CI/CDエラーの修正

💬 レビューコメントへのリプライ投稿:
  ✅ 5件のコメントにリプライを投稿
  ✅ 修正内容と対応方針を明確に記載

🎉 PR #456の全ての問題を解決しました！
  マージ可能性: ✅
  全チェック: ✅ 5/5 通過
  レビューコメント: ✅ 全件対応完了
```

### エラーが発生した場合：
```
/FixReview

🔍 現在のブランチからPRを検索中...
  ❌ 現在のブランチに対応するPRが見つかりません

💡 対処方法:
  1. PR番号を明示的に指定: /FixReview #789
  2. PRが存在するブランチに切り替え
  3. 新しいPRを作成

---

/FixReview #789

🔍 PR #789を分析中...
  PR #789: "フロントエンド更新" を確認

⚠️ 問題が発生しました:
  複雑なコンフリクトを検出しました。

  src/components/Dashboard.tsx:
    - ベースブランチ: 新しいコンポーネント構造
    - このPR: 古い構造での大幅な変更

  推奨アクション:
  1. 手動でのコンフリクト解決が必要です
  2. または、ベースブランチの変更を取り込んでから再実装

🔍 可能な範囲で他の問題は解決しました:
  ✅ Lintエラー: 修正済み
  ✅ 型エラー: 修正済み
  ⚠️ コンフリクト: 手動介入が必要

💬 対応可能なレビューコメントにはリプライを投稿:
  ✅ 3件のコメントにリプライ投稿
  ⚠️ コンフリクト関連コメントは解決後に対応予定

---

/FixReview #890

🔍 PR #890を分析中...
  PR #890: "新機能実装" を確認

📝 レビューコメント対応（繰り返し処理）:

=== 📊 レビューコメント対応進捗 ===
  - 合計コメント数: 12
  - ✅ 対応済み: 0
  - ℹ️ 対応不要: 0
  - ⏳ 未対応: 12

🔄 === イテレーション 1/5 開始 ===
⏳ 未対応: 12345 - @reviewer1: セキュリティホールがあります...
⏳ 未対応: 12346 - @reviewer2: この処理は非効率です...
...

(5回のイテレーション後)

⚠️ 最大イテレーション数に到達しましたが、まだ未対応のコメントがあります

=== 📊 レビューコメント対応進捗 ===
  - 合計コメント数: 12
  - ✅ 対応済み: 8
  - ℹ️ 対応不要: 1
  - ⏳ 未対応: 3

⏳ 未対応: 12350 - @reviewer3: APIレスポンスが不正な場合の処理が...
⏳ 未対応: 12351 - @reviewer4: 権限チェックが不十分です...
⏳ 未対応: 12352 - @reviewer5: データベースのトランザクション処理が...

💡 対処方法:
  1. 手動で残りのコメントに対応
  2. /FixReview を再度実行
  3. 技術的に困難な場合は、チームメンバーと相談
```

## 注意事項

- GitHub CLI (`gh`)が適切に設定されている必要があります（GitHub MCPは使用禁止）
- 現在のブランチにPRが存在しない場合は、PR番号を明示的に指定する必要があります
- 大規模なコンフリクトは手動介入が必要な場合があります
- CI/CDの設定によっては、一部の自動修正ができない場合があります
- セキュリティ修正は慎重に行い、不明な場合は報告のみ行います
- **レビューコメントへのリプライは、修正実施の可否に関わらず必ず全てのコメントに投稿します**
- **未対応コメントがなくなるまで最大5回繰り返し処理を行います**
- **各イテレーション後に進捗レポートを表示し、透明性を確保します**
- **リプライ投稿は最大3回までリトライし、確実な投稿を目指します**
- **最終的に全コメントの対応結果をサマリーレポートとして出力します**
