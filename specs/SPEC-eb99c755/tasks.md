# タスク: Prebuilt better-sqlite3 配布と初回 npx 体験改善

**入力**: `specs/SPEC-eb99c755/`
**前提条件**: plan.md 完了 (research/data-model/contracts はこれから)

## Phase 3.1: セットアップ
- [ ] T001 `mcp-server/prebuilt/better-sqlite3/` ディレクトリ構造を作成し、`.npmignore`/`package.json` の `files` で配布対象に含める
- [ ] T002 release ワークフローに prebuildify 実行のベースステップを追加（matrix 定義は後続 / 本ブランチでは Linux x64 をまず確保）

## Phase 3.2: テストファースト (TDD)
- [ ] T003 [P] `mcp-server/tests/unit/scripts/ensure-better-sqlite3.test.js` で postinstall の挙動 (prebuilt 有無 / env flags) を RED で定義
- [ ] T004 [P] `mcp-server/tests/integration/prebuilt-install.test.js` で prebuilt 展開と WASM フォールバックを RED で定義

## Phase 3.3: コア実装
- [ ] T005 `mcp-server/scripts/ensure-better-sqlite3.mjs` をモジュール化し、prebuilt コピー → フォールバック → rebuild の順に実装。テスト用の環境変数 (PREBUILT_DIR, BINDING_PATH) を導入
- [ ] T006 `mcp-server/scripts/prebuild-better-sqlite3.mjs` を追加し、`node_modules/.../better_sqlite3.node` から prebuilt へコピー＆manifest 生成
- [ ] T007 `package.json` に prebuild スクリプトと `prebuilt/` 配布設定を追加（`files` 更新）

## Phase 3.4: 統合
- [ ] T008 `README.md` / `README.ja.md` のトラブルシューティングを更新し、「初回 npx は即応答」「環境変数でネイティブ強制」などを明記（手動ウォーム記述を削除）
- [ ] T009 Quickstart や CLAUDE ガイドに prebuilt 配布の流れを追記

## Phase 3.5: 仕上げ
- [ ] T010 [P] prebuilt 成果物を列挙する `mcp-server/scripts/generate-prebuilt-manifest.mjs` を追加し、CI/ドキュメント用 JSON を生成
- [ ] T011 [P] クリーン環境で `npx @akiojin/unity-mcp-server@latest --help` を実行して 30 秒以内に完了することを `docs/manual-testing.md` に記録

## 依存関係
- T003/T004 が T005 をブロック
- T005 が README 更新 (T008) の前提
- prebuilt スクリプト (T006) が manifest (T010) を支える

## 並列実行例
- [P] マーク済みの T003/T004 は異なるファイルの RED テストなので並列可能。
- Phase 3.5 の T010/T011 も独立して実行可能。
