# Unity Editor MCP - 推奨コマンド

## ビルドとテスト

### Node.js側 (mcp-server)
```bash
# ビルド・実行
npm start                 # MCPサーバーを起動
npm run dev              # ウォッチモードで開発

# テスト
npm test                 # 全テスト実行
npm run test:unit        # ユニットテスト
npm run test:integration # 統合テスト
npm run test:coverage    # カバレッジ付きテスト
npm run test:watch       # ウォッチモードでテスト
```

## 型チェックとリンティング
```bash
npm run type-check       # TypeScript型チェック (存在する場合)
npm run lint            # ESLintでコード品質チェック (存在する場合)
```

## Git操作
```bash
git status              # 変更状態確認
git diff                # 変更内容確認
git add .               # 変更をステージング
git commit -m "message" # コミット
git push                # プッシュ
```

## GitHub CLI
```bash
gh pr create           # プルリクエスト作成
gh pr list            # PRリスト表示
gh pr view            # PR詳細表示
```

## Unity側
Unity Editorでパッケージをインストール後、自動的にTCPサーバーが起動します（ポート6400）。