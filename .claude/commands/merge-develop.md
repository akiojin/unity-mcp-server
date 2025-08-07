# /merge-develop

最新のdevelopブランチを現在のブランチにマージするコマンド

## 概要

このコマンドは、リモートの最新のdevelopブランチを現在作業中のブランチにマージします。
CLAUDE.mdの基本ルールに従い、PR作成前に必ず実行する必要があります。

## 処理内容

1. **現在のブランチ状態を確認**
   - 未コミットの変更がないかチェック
   - 現在のブランチ名を取得

2. **リモートの最新状態を取得**
   - `git fetch origin develop` で最新のdevelopブランチを取得

3. **developブランチをマージ**
   - `git merge origin/develop` でマージ実行
   - コンフリクトがある場合は解決を促す

4. **結果報告**
   - マージ成功時：成功メッセージを表示
   - コンフリクト発生時：解決方法を案内

## 実行手順

```bash
#!/bin/bash

# 現在のブランチ名を取得
current_branch=$(git branch --show-current)
echo "現在のブランチ: $current_branch"

# mainまたはdevelopブランチでの直接マージを防ぐ
if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "develop" ]]; then
    echo "❌ エラー: mainまたはdevelopブランチでの直接マージは禁止されています"
    exit 1
fi

# 未コミットの変更をチェック
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  警告: 未コミットの変更があります"
    echo "マージ前にコミットまたはstashしてください"
    git status --short
    exit 1
fi

# リモートの最新developを取得
echo "📥 リモートの最新developブランチを取得中..."
git fetch origin develop

# マージ実行
echo "🔄 developブランチをマージ中..."
if git merge origin/develop; then
    echo "✅ developブランチのマージが完了しました"

    # マージコミット数を表示
    merged_commits=$(git rev-list --count HEAD...origin/develop)
    echo "📊 マージされたコミット数: $merged_commits"

    # 次のステップを案内
    echo ""
    echo "次のステップ:"
    echo "1. テストを実行して動作を確認"
    echo "2. 変更内容をプッシュ: git push origin $current_branch"
    echo "3. PRを作成または更新"
else
    echo "❌ マージ中にコンフリクトが発生しました"
    echo ""
    echo "コンフリクト解決の手順:"
    echo "1. コンフリクトのあるファイルを確認: git status"
    echo "2. 各ファイルのコンフリクトを解決"
    echo "3. 解決後: git add <ファイル名>"
    echo "4. すべて解決したら: git commit"
    echo ""
    echo "または、マージを中止する場合: git merge --abort"
fi
```

## 注意事項

- CLAUDE.mdの基本ルールに従い、PR作成前には必ずdevelopの最新版をマージする必要があります
- mainまたはdevelopブランチでの直接作業は禁止されているため、これらのブランチでは実行できません
- 未コミットの変更がある場合は、マージ前にコミットまたはstashする必要があります
- コンフリクトが発生した場合は、手動で解決する必要があります
