# タスク: Rust版 unity-cli 置換とTDD整備

**入力**: `/specs/SPEC-83d9d7ee/`  
**前提条件**: `spec.md`, `plan.md`

## Phase 1: 仕様整備

- [x] T001 `specs/SPEC-83d9d7ee/spec.md` にユーザーストーリー・FR・成功基準を定義
- [x] T002 `specs/SPEC-83d9d7ee/plan.md` に技術方針と実装フェーズを定義
- [x] T003 `specs/SPEC-83d9d7ee/tasks.md` に実行順序と完了判定を記述

## Phase 2: TDD (RED→GREEN→REFACTOR)

- [x] T004 [US1] `unity-cli/src/main.rs` に JSONパラメータ検証・ポートCSV解析のユニットテストを追加
- [x] T005 [US1] `unity-cli/src/transport.rs` に framed応答の成功/失敗テストを追加
- [x] T006 [US2] `unity-cli/src/instances.rs` に parse_id/到達性/切替失敗テストを追加
- [x] T007 [US1][US2] `cargo test --manifest-path unity-cli/Cargo.toml` を実行し、テスト成功を確認

## Phase 3: 実装

- [x] T008 [US1] `unity-cli` のサブコマンド (`raw/tool/system/scene/instances`) を実装
- [x] T009 [US1] Unity TCP transport 実装（framed送受信 + fallback JSONパース）
- [x] T010 [US2] ローカルインスタンスレジストリ実装（list/set-active）
- [x] T011 [US1] `UNITY_CLI_*` + `UNITY_MCP_*` 互換の設定解決を実装

## Phase 4: 移行導線とスキル

- [x] T012 [US3] `README.md` / `README.ja.md` に移行ガイドとコマンド対応表を追記
- [x] T013 [US3] Codex スキル `unity-cli-usage/SKILL.md` を追加
- [x] T014 [US3] Claude plugin `unity-cli` とスキルを追加
- [x] T015 [US3] `.claude-plugin/marketplace.json` に `unity-cli` エントリを追加

## Phase 5: 残課題（次スプリント）

- [x] T016 [US1] 108ツール名を `unity-cli tool <tool>` で直接指定可能にした（catalog検証付き）
- [x] T017 [US1] script/index 系ローカル処理の Rust 移植（`find_symbol/find_refs/get_symbols/build_index/update_index`）
- [x] T018 [US3] 新規 `unity-cli` 専用リポジトリへの切り出しとリリース導線整備（subtree export script + release workflow）
- [x] T019 [US1] `read/search/list_packages` のローカル処理を Rust 側へ移植

## Phase 6: UPM/LSP/Cargo 移行反映

- [x] T020 [US4] `unity-cli/UnityCliBridge/Packages/unity-cli-bridge` を同梱し、UPM URL を `akiojin/unity-cli` に統一
- [x] T021 [US4] Unity 側公開名を `UnityCliBridge` に統一（`UnityMCPServer` 名称を排除）
- [x] T022 [US4] `unity-cli/csharp-lsp` を `unity-cli/lsp` に改名し、LSPテスト導線を更新
- [x] T023 [US4] Rust 側に `src/lsp.rs` を追加し、`get_symbols/find_symbol/find_refs/build_index` のLSP経路（`UNITY_CLI_LSP_MODE`）を実装
- [x] T024 [US4] `Cargo.toml` と `unity-cli/README.md` を crates.io 配布向け（`cargo install`）に更新

## 依存関係

- T001-T003 完了後に T004-T007 を実施
- T004-T007 完了後に T008-T011 を確定
- T008-T011 完了後に T012-T015 を確定
- T016-T019 を完了済み

## 実行メモ

- TDD順序は必ず RED→GREEN→REFACTOR。  
- CLI互換は `raw` 経路を最終フォールバックとして維持する。
