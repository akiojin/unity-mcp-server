# 実装計画: Prebuilt better-sqlite3 配布と初回 npx 体験改善

**機能ID**: `SPEC-eb99c755` | **日付**: 2025-11-19 | **仕様**: specs/SPEC-eb99c755/spec.md

## 実行フロー (/speckit.plan コマンドのスコープ)
```
1. 機能仕様(SPEC-eb99c755)を読み込み、要件と成功基準を整理
2. 技術コンテキストを確定し、npm パッケージ配布の制約を洗い出す
3. 憲章チェック (シンプルさ/テスト/バージョニング) を確認
4. Phase 0: prebuild ツールチェーンと配布方法のリサーチ → research.md
5. Phase 1: data-model.md, contracts/postinstall-schema, quickstart.md を作成し、契約テストを RED で用意
6. Phase 2: tasks.md 生成方針を記述 (このファイルでは実行しない)
7. /speckit.tasks に制御を渡す
```

## 概要
初回 `npx @akiojin/unity-mcp-server@latest` で better-sqlite3 のビルドに 60–90 秒かかり、MCP クライアントが 30 秒でタイムアウトする問題を解消する。npm パッケージに主要 OS/CPU/Node 向け prebuilt バイナリを同梱し、postinstall では同梱物を展開するだけの仕組みにする。未対応プラットフォームは即座に WASM フォールバックし、必要に応じて環境変数でネイティブビルドを強制/スキップできるようにする。

## 技術コンテキスト
- **言語/バージョン**: Node.js 20.x (CI) / ユーザーは 18.x, 20.x, 22.x
- **主要依存関係**: better-sqlite3, sql.js, prebuildify, npm scripts
- **ストレージ**: N/A
- **テスト**: `npm run test:ci --workspace=mcp-server`, 追加で postinstall スクリプトのユニットテスト
- **対象プラットフォーム**: linux/darwin/win32 × x64/arm64
- **プロジェクトタイプ**: 単一 npm パッケージ (CLI + スクリプト)
- **パフォーマンス目標**: `npx --help` 実行が 30 秒以内、postinstall < 5 秒
- **制約**: npm パッケージサイズ < 50MB、MIT ライセンス順守
- **スケール/スコープ**: 1 npm package + 1 postinstall script + prebuilt CI job

## 憲章チェック
**シンプルさ**
- プロジェクト数 1、既存ファイルを書き換えるのみ
- 追加のアーキテクチャ層を導入しない
- データモデルは prebuilt 管理情報のみ

**アーキテクチャ**
- mcp-server npm package に閉じる
- 新規 CLI なし、既存の `bin/unity-mcp-server` の配布手順に追加しない

**テスト**
- postinstall スクリプトに RED → GREEN テストを追加
- GitHub Actions で prebuild 成果物を検証 (実依存)
- README の手順も quickstart テストで検証

**可観測性**
- postinstall ログを構造化 (どのバイナリを展開/スキップしたか)

**バージョニング**
- semantic-release により MINOR/PATCH を自動割り当て
- 破壊的変更なし、CHANGELOG に prebuilt 追加を記載

## プロジェクト構造
```
specs/SPEC-eb99c755/
├── spec.md
├── plan.md (このファイル)
├── research.md (Phase 0)
├── data-model.md (Phase 1)
├── quickstart.md (Phase 1)
├── contracts/
│   └── postinstall-schema.json (Phase 1)
└── tasks.md (/speckit.tasks で生成)
```
ソースは `mcp-server/` 配下に限定する。

## Phase 0: アウトライン＆リサーチ
- 不明点: prebuildify での better-sqlite3 ビルド手順、npm でのバイナリ同梱ベストプラクティス、サポート対象 OS/Node の matrix
- タスク: 上記 3 点を調査し、研究結果 (決定/理由/代替案) を `research.md` に記載

## Phase 1: 設計＆契約
- data-model.md: `PrebuiltArtifact(os, arch, nodeVersion, checksum, size)` と `InstallContext(platform, envFlags, fallbackUsed)` を定義
- contracts/postinstall-schema.json: postinstall 入出力 (環境変数/ログ) の仕様を記述
- quickstart.md: npx 初回の挙動と環境変数の使い方を追記
- RED テスト: postinstall を様々な環境変数で呼び出す Node.js テストを追加

## Phase 2: タスク計画アプローチ
- contracts と data-model をベースに RED→GREEN タスクを列挙 (tasks.md は /speckit.tasks で生成)
- 並列可能: README 更新、CI ワークフロー、postinstall テスト
