# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリでコードを扱う際のガイダンスを提供します。

## 開発指針

### 🎯 プロジェクトの価値を実現

**最重要**: `unity-editor-mcp`はGit worktree管理を効率化するインタラクティブCLIツールです：

1. **インタラクティブな操作**: カーソルベースでの直感的なブランチ選択
2. **自動化されたワークフロー**: worktreeの作成・管理・クリーンアップを自動化
3. **Claude Code統合**: Claude Code開発ワークフローに最適化
4. **ユニバーサル対応**: NPMパッケージとして任意のプロジェクトで利用可能

### 🛠️ 技術実装指針

- **設計・実装は複雑にせずに、シンプルさの極限を追求してください**
- **ただし、ユーザビリティと開発者体験の品質は決して妥協しない**
- 実装はシンプルに、開発者体験は最高品質に
- CLI操作の直感性と効率性を技術的複雑さより優先
- Git worktree管理の効率性と安全性のバランスを重視

### 📝 設計ガイドライン

- 設計に関するドキュメントには、ソースコードを書かないこと

## 開発品質

### 完了条件

- エラーが発生している状態で完了としないこと。必ずエラーが解消された時点で完了とする。

## プロジェクト情報

### ビルドコマンド

```bash
npm run build    # TypeScriptコンパイル
npm run dev      # ウォッチモードでのコンパイル
npm start        # ビルド済みバイナリの実行
```

### テストコマンド

```bash
npm run type-check  # TypeScript型チェック
npm run lint        # ESLint実行
```

### 主要な依存関係

- **TypeScript 5.7.2**: 型安全な開発
- **Node.js CLI**: インタラクティブCLIツール
- **@inquirer/prompts**: ユーザー入力処理
- **chalk**: コンソール出力の色付け
- **execa**: Git コマンドの実行

### アーキテクチャ

- **言語**: TypeScript
- **実行環境**: Node.js >= 18.0.0
- **パッケージ管理**: NPM (グローバルインストール対応)
- **Git統合**: Git worktree コマンドとの連携

## 開発ワークフロー

### 基本ルール

- 作業（タスク）を完了したら、変更点をコミットログに追加して、コミット＆プッシュを必ず行う
- 作業（タスク）は、最大限の並列化をして進める
- 作業（タスク）は、最大限の細分化をしてToDoに登録する
- 作業（タスク）の開始前には、必ずTodoWriteでToDoを登録した後に作業を開始する
- 作業（タスク）の完了後は、作業内容をプッシュして、必ずPRを出す。
- 作業（タスク）を出す前には、必ずmainの最新版をマージする。
- 作業（タスク）は、忖度なしで進める
- 作業（タスク）のPRはmainブランチに対して行う

## コミュニケーションガイドライン

- 回答は必ず日本語

## 外部連携

### GitHub操作について
- GitHub操作は**GitHub CLI (`gh`)コマンド**を直接Bashツールで実行してください
- 例: `gh pr create`, `gh issue create`, `gh repo config apply`など

### 利用可能なMCPツール

#### Serena MCP - コードベース理解と編集の強力なアシスタント
`serena` MCPは、大規模コードベースの理解と編集を効率化する強力なツールです。**積極的に活用してください**：

- **プロジェクト活性化**: `mcp__serena__activate_project` - 作業開始時に必ず実行
- **ファイル検索**: `mcp__serena__find_file` - ファイルの高速検索
- **シンボル検索**: `mcp__serena__find_symbol` - 関数/クラス/変数の定義を検索
- **参照検索**: `mcp__serena__find_referencing_symbols` - シンボルの使用箇所を検索
- **パターン検索**: `mcp__serena__search_for_pattern` - 正規表現でコード検索
- **コード編集**: 
  - `mcp__serena__replace_symbol_body` - シンボル本体の置換
  - `mcp__serena__replace_regex` - 正規表現による置換
  - `mcp__serena__insert_before_symbol` - シンボル前に挿入
  - `mcp__serena__insert_after_symbol` - シンボル後に挿入
- **情報整理**: 
  - `mcp__serena__think_about_collected_information` - 収集した情報の整理
  - `mcp__serena__summarize_changes` - 変更内容のサマリー生成
- **メモリ管理**: `mcp__serena__read_memory` - プロジェクト固有の記憶を読み込み

**Serena MCP使用の推奨ワークフロー**：
1. タスク開始時に `activate_project` を実行
2. `find_file` や `find_symbol` でコードベース構造を理解
3. `search_for_pattern` で関連コードを検索
4. `replace_*` や `insert_*` で効率的に編集
5. `summarize_changes` で変更内容を整理

#### その他のMCPツール
- `context7` MCP - 最新のNode.js、TypeScript、およびその他のライブラリのドキュメントを確認
- `google-search` MCP - ウェブ検索で最新の解決策を検索
- `model-hub` MCP - 最新のモデルを取得
- `textlint` MCP - マークダウンファイルの文法チェック

## ドキュメント管理

- ドキュメントはルートディレクトリに配置してはいけない。必ずdocs/配下に配置する

## バージョン管理

### npm versionコマンドの使用

バージョンアップは必ず`npm version`コマンドを使用する：

- **パッチバージョン**: `npm version patch` (例: 2.9.0 → 2.9.1)
- **マイナーバージョン**: `npm version minor` (例: 2.9.0 → 2.10.0)  
- **メジャーバージョン**: `npm version major` (例: 2.9.0 → 3.0.0)

**重要**: package.jsonを直接編集してのバージョン変更は禁止

### バージョンアップ手順

1. 変更内容に応じて適切なバージョンコマンドを選択
2. mcp-serverディレクトリで: `npm version [patch|minor|major]`
3. Unity packageのバージョンも同期して更新（unity-editor-mcp/package.json）
4. git commit & push
5. npm publish

## コードクオリティガイドライン

- マークダウンファイルはmarkdownlintでエラー及び警告がない状態にする
- コミットログはcommitlintに対応する

## 開発ガイドライン

- 既存のファイルのメンテナンスを無視して、新規ファイルばかり作成するのは禁止。既存ファイルを改修することを優先する。

## ドキュメント作成ガイドライン

- README.mdには設計などは書いてはいけない。プロジェクトの説明やディレクトリ構成などの説明のみに徹底する。設計などは、適切なファイルへのリンクを書く。

## CLI開発メモリ

- インタラクティブCLI操作の品質が最重要
- Git worktree操作の安全性を常に確保すること
