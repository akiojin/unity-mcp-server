## [2.41.0](https://github.com/akiojin/unity-mcp-server/compare/v2.40.6...v2.41.0) (2025-11-21)


### Features

* bundle better-sqlite3 prebuilt artifacts ([34d4daa](https://github.com/akiojin/unity-mcp-server/commit/34d4daa69e238b8d47ce0e66ce4d710af5aeb256))


### Bug Fixes

* add auto reconnect handling for Unity domain reload ([a33539e](https://github.com/akiojin/unity-mcp-server/commit/a33539e7228571dac1970783b80501cdbd127b22))

## [2.41.7](https://github.com/akiojin/unity-mcp-server/compare/v2.41.6...v2.41.7) (2025-11-27)


### Bug Fixes

* **unity:** add missing McpLogger.cs.meta file ([1593c07](https://github.com/akiojin/unity-mcp-server/commit/1593c07c85cc37002420ce094a59612cdd4e32f2))
* **unity:** add missing McpLogger.cs.meta file ([cedd944](https://github.com/akiojin/unity-mcp-server/commit/cedd944ab669451000629dcbd16c4af51b2aa9bd))

## [2.41.6](https://github.com/akiojin/unity-mcp-server/compare/v2.41.5...v2.41.6) (2025-11-27)


### Bug Fixes

* **lsp:** add error handling and version fallback for csharp-lsp ([8eadc6a](https://github.com/akiojin/unity-mcp-server/commit/8eadc6a60c20e9c4779b3abfb202c12b5040e560))
* **lsp:** csharp-lsp エラーハンドリング強化とバージョン同期 ([e65b1ac](https://github.com/akiojin/unity-mcp-server/commit/e65b1ac8a0d297377f74b68318aea433c0470758))
* **lsp:** use manifest.version for VERSION file synchronization ([82f7df1](https://github.com/akiojin/unity-mcp-server/commit/82f7df135febab60eb26cd091bb3eebddce31b68))

## [2.41.5](https://github.com/akiojin/unity-mcp-server/compare/v2.41.4...v2.41.5) (2025-11-26)


### Bug Fixes

* configure release-please to track entire project (align with llm-router) ([d27cb51](https://github.com/akiojin/unity-mcp-server/commit/d27cb510d2df38cd5bc5771cfbd52f50f37feb2e))
* enable release-please PR creation (align with llm-router) ([07e4387](https://github.com/akiojin/unity-mcp-server/commit/07e4387d18df03f29496f106c1b2a14bfbcd6a03))

## [2.40.6](https://github.com/akiojin/unity-mcp-server/compare/v2.40.5...v2.40.6) (2025-11-19)


### Bug Fixes

* skip native rebuild by default to avoid first-run timeout ([60eb8fa](https://github.com/akiojin/unity-mcp-server/commit/60eb8fa1c7f68f79e674614f33d307738c3a8725))

## [2.40.5](https://github.com/akiojin/unity-mcp-server/compare/v2.40.4...v2.40.5) (2025-11-19)


### Bug Fixes

* **docs:** note first-time npx timeout and warmup ([e57572f](https://github.com/akiojin/unity-mcp-server/commit/e57572f1ce786440b1cfc14809a3200771babc73))

## [2.40.4](https://github.com/akiojin/unity-mcp-server/compare/v2.40.3...v2.40.4) (2025-11-19)


### Bug Fixes

* better-sqlite3再構築とWASMフォールバック ([780bab8](https://github.com/akiojin/unity-mcp-server/commit/780bab8e00788b5b202784a3d9de6765ee3ff028))

## [2.40.3](https://github.com/akiojin/unity-mcp-server/compare/v2.40.2...v2.40.3) (2025-11-18)


### Bug Fixes

* **mcp-server:** remove unused resources and prompts handlers ([56237d9](https://github.com/akiojin/unity-mcp-server/commit/56237d9eb87359b8a3a8834137c8f0537bc1dc96))
* **mcp:** resolve "Capabilities: none" issue in MCP SDK v0.6.1 ([c497d3a](https://github.com/akiojin/unity-mcp-server/commit/c497d3aed3bdada65e25803f4a00c2de9dce87f2))

## [2.40.2](https://github.com/akiojin/unity-mcp-server/compare/v2.40.1...v2.40.2) (2025-11-18)


### Bug Fixes

* **docs:** remove remaining pnpm references from README.ja.md ([95fef1e](https://github.com/akiojin/unity-mcp-server/commit/95fef1e1f24590f7757ae8709dd2b4203a577f4d)), closes [#104](https://github.com/akiojin/unity-mcp-server/issues/104)

## [2.40.1](https://github.com/akiojin/unity-mcp-server/compare/v2.40.0...v2.40.1) (2025-11-18)


### Bug Fixes

* **ci:** improve release workflow duplicate execution prevention ([241cf79](https://github.com/akiojin/unity-mcp-server/commit/241cf797c4bb8b2e88a034d09c6ab2b5eca012c1))

## [2.40.0](https://github.com/akiojin/unity-mcp-server/compare/v2.39.2...v2.40.0) (2025-11-18)


### Features

* **code-index:** add auto-initialization and percentage-based progress logging ([52e738a](https://github.com/akiojin/unity-mcp-server/commit/52e738ac25e8d22113d63fa785651c3a3b7d3178))
* **index-watcher:** add DB existence check and auto-rebuild on deletion ([7bf65e1](https://github.com/akiojin/unity-mcp-server/commit/7bf65e18b8622575589c1e2c6faff6ad19abb31c))
* **index:** enable IndexWatcher by default and add DB deletion recovery ([8783471](https://github.com/akiojin/unity-mcp-server/commit/87834710eea5cde3734ff00e34fcfaade6361395))


### Bug Fixes

* **index-watcher:** use fs.existsSync for DB file check instead of isReady() ([a300d9c](https://github.com/akiojin/unity-mcp-server/commit/a300d9c5ee74700c3a72bd2ae6cfcfe754df4772))
* update Docker configuration for codex auth.json synchronization ([ce4e7ec](https://github.com/akiojin/unity-mcp-server/commit/ce4e7ecb6bde5947aa10e327ba12efe7e91c5600))

## [2.39.2](https://github.com/akiojin/unity-mcp-server/compare/v2.39.1...v2.39.2) (2025-11-18)


### Bug Fixes

* resolve duplicate requestedSessionId in profiler stop ([099a824](https://github.com/akiojin/unity-mcp-server/commit/099a8242eb1128639e70072aea65d0aa6c32360f))

## [2.39.1](https://github.com/akiojin/unity-mcp-server/compare/v2.39.0...v2.39.1) (2025-11-18)


### Bug Fixes

* handle profiler autostop and clean test logs ([cdd83fd](https://github.com/akiojin/unity-mcp-server/commit/cdd83fdfada808cb2d1044d101bdf9d1907e0679))

## [2.39.0](https://github.com/akiojin/unity-mcp-server/compare/v2.38.1...v2.39.0) (2025-11-17)


### Features

* **claude-md:** enforce unity-mcp-server for C# editing ([8af1c81](https://github.com/akiojin/unity-mcp-server/commit/8af1c8133586af6b0c18d0b727d4f9c51013baaf))
* **hooks:** add Unity C# editing protection Hook ([fcf2d69](https://github.com/akiojin/unity-mcp-server/commit/fcf2d69e5d18966333af4f545439ab2afdb45d56))
* **hooks:** AppBrew記事準拠のCLAUDE.md自動改善システムを実装 ([36f2050](https://github.com/akiojin/unity-mcp-server/commit/36f2050df4a407993a60453847415514a0530883))
* **mcp-server:** add search_tools meta-tool for 96.2% token reduction ([d63270b](https://github.com/akiojin/unity-mcp-server/commit/d63270b5b8e11195af4fc9269374ad5ef00fb7ad))
* **mcp-server:** implement actual 96.2% token reduction via ListTools restriction ([64b794c](https://github.com/akiojin/unity-mcp-server/commit/64b794c57185e1a38e004af585c8747a8bbc1cc6))
* **profiler:** add structured logging to ProfilerHandler (T027) ([9302c56](https://github.com/akiojin/unity-mcp-server/commit/9302c56d3ead1355998dd0a7695b6f735d71f626))
* **profiler:** enhance error handling with parameter validation (T026) ([e66d6e1](https://github.com/akiojin/unity-mcp-server/commit/e66d6e1ce1f2c6d583ac2338bc37f7074825b0d5))
* **profiler:** implement profiler handlers (T013-T020) ([74d405f](https://github.com/akiojin/unity-mcp-server/commit/74d405fd7962da85756915610e872b304d4cd170))
* **profiler:** setup profiler handlers and contracts (T001-T007) ([bb4801d](https://github.com/akiojin/unity-mcp-server/commit/bb4801d99fba85a61227f87ebd1da2751831c7b8))


### Bug Fixes

* **ci:** enable merge-to-main even when semantic-release is skipped ([98976c0](https://github.com/akiojin/unity-mcp-server/commit/98976c060d3e85a5d72dbf60e2cc2e78164576df))
* **mcp-server:** revert ListTools restriction - return all tools for MCP protocol compliance ([54a6f2d](https://github.com/akiojin/unity-mcp-server/commit/54a6f2d5df6a497fd32677ef87e2c37af76cfa5d))
* **profiler:** fix string interpolation syntax error in ProfilerHandler.cs ([2d07072](https://github.com/akiojin/unity-mcp-server/commit/2d07072269d1df4dfc316b879c395484603f4f94))
* **profiler:** fix Unity.Profiling API usage for ProfilerRecorder ([dc54711](https://github.com/akiojin/unity-mcp-server/commit/dc54711271039ba5759d0e6a3ed3cae721c430d7))
* **script:** normalize line endings in script_edit_snippet for Issue [#97](https://github.com/akiojin/unity-mcp-server/issues/97) ([27f4650](https://github.com/akiojin/unity-mcp-server/commit/27f465070ca55e53df7b5845b9990d19d58e63da))

## [2.39.0](https://github.com/akiojin/unity-mcp-server/compare/v2.38.1...v2.39.0) (2025-11-17)


### Features

* **claude-md:** enforce unity-mcp-server for C# editing ([8af1c81](https://github.com/akiojin/unity-mcp-server/commit/8af1c8133586af6b0c18d0b727d4f9c51013baaf))
* **hooks:** add Unity C# editing protection Hook ([fcf2d69](https://github.com/akiojin/unity-mcp-server/commit/fcf2d69e5d18966333af4f545439ab2afdb45d56))
* **hooks:** AppBrew記事準拠のCLAUDE.md自動改善システムを実装 ([36f2050](https://github.com/akiojin/unity-mcp-server/commit/36f2050df4a407993a60453847415514a0530883))
* **mcp-server:** add search_tools meta-tool for 96.2% token reduction ([d63270b](https://github.com/akiojin/unity-mcp-server/commit/d63270b5b8e11195af4fc9269374ad5ef00fb7ad))
* **mcp-server:** implement actual 96.2% token reduction via ListTools restriction ([64b794c](https://github.com/akiojin/unity-mcp-server/commit/64b794c57185e1a38e004af585c8747a8bbc1cc6))
* **profiler:** add structured logging to ProfilerHandler (T027) ([9302c56](https://github.com/akiojin/unity-mcp-server/commit/9302c56d3ead1355998dd0a7695b6f735d71f626))
* **profiler:** enhance error handling with parameter validation (T026) ([e66d6e1](https://github.com/akiojin/unity-mcp-server/commit/e66d6e1ce1f2c6d583ac2338bc37f7074825b0d5))
* **profiler:** implement profiler handlers (T013-T020) ([74d405f](https://github.com/akiojin/unity-mcp-server/commit/74d405fd7962da85756915610e872b304d4cd170))
* **profiler:** setup profiler handlers and contracts (T001-T007) ([bb4801d](https://github.com/akiojin/unity-mcp-server/commit/bb4801d99fba85a61227f87ebd1da2751831c7b8))


### Bug Fixes

* **ci:** enable merge-to-main even when semantic-release is skipped ([98976c0](https://github.com/akiojin/unity-mcp-server/commit/98976c060d3e85a5d72dbf60e2cc2e78164576df))
* **mcp-server:** revert ListTools restriction - return all tools for MCP protocol compliance ([54a6f2d](https://github.com/akiojin/unity-mcp-server/commit/54a6f2d5df6a497fd32677ef87e2c37af76cfa5d))
* **profiler:** fix string interpolation syntax error in ProfilerHandler.cs ([2d07072](https://github.com/akiojin/unity-mcp-server/commit/2d07072269d1df4dfc316b879c395484603f4f94))
* **profiler:** fix Unity.Profiling API usage for ProfilerRecorder ([dc54711](https://github.com/akiojin/unity-mcp-server/commit/dc54711271039ba5759d0e6a3ed3cae721c430d7))
* **script:** normalize line endings in script_edit_snippet for Issue [#97](https://github.com/akiojin/unity-mcp-server/issues/97) ([27f4650](https://github.com/akiojin/unity-mcp-server/commit/27f465070ca55e53df7b5845b9990d19d58e63da))

## [2.38.1](https://github.com/akiojin/unity-mcp-server/compare/v2.38.0...v2.38.1) (2025-11-17)


### Bug Fixes

* align lsp manifest version and prep 2.38.1 ([b740c41](https://github.com/akiojin/unity-mcp-server/commit/b740c41e039a8ff80d7224979417292606257aaa))

## [2.38.0](https://github.com/akiojin/unity-mcp-server/compare/v2.37.2...v2.38.0) (2025-11-17)


### Features

* add editor_quit tool ([b8908b5](https://github.com/akiojin/unity-mcp-server/commit/b8908b5e90f953c77a9de17c978a97df64e166cc))
* add quit_editor command for editor_quit tool ([5495b74](https://github.com/akiojin/unity-mcp-server/commit/5495b7455e77a7f5bfe8cd78b30a843d53dfaa4e))
* **test:** persist run state and add watchdog coverage ([278e024](https://github.com/akiojin/unity-mcp-server/commit/278e02499a3defa5224fb1a5027c4b62563eabb8))


### Bug Fixes

* dedupe editor_quit handler registration ([5701c7f](https://github.com/akiojin/unity-mcp-server/commit/5701c7ffe561da69101a843e3bbebef663700deb))
* delay quit_editor until response is sent ([49f3b4a](https://github.com/akiojin/unity-mcp-server/commit/49f3b4a8408d42ba3767d9c3be6d3ee90ef0a995))

## [2.37.2](https://github.com/akiojin/unity-mcp-server/compare/v2.37.1...v2.37.2) (2025-11-14)


### Bug Fixes

* **mcp-server:** remove anyOf from input tool schemas ([8f7ad48](https://github.com/akiojin/unity-mcp-server/commit/8f7ad48ab701bbfb1e7d5b2d42519a13986c72ae))

## [2.37.1](https://github.com/akiojin/unity-mcp-server/compare/v2.37.0...v2.37.1) (2025-11-14)


### Bug Fixes

* enforce prefab path requirement in component_field_set schema ([b04fa68](https://github.com/akiojin/unity-mcp-server/commit/b04fa6875776bd4e68956015c5a53483133e3770))

## [2.37.0](https://github.com/akiojin/unity-mcp-server/compare/v2.36.3...v2.37.0) (2025-11-12)


### Features

* 入力システム更新とテストシーン追加 ([2c08934](https://github.com/akiojin/unity-mcp-server/commit/2c08934a416021a1bb5f5dd6302017f7dc4110d4))


### Bug Fixes

* **playmode:** handle new response envelopes ([399f066](https://github.com/akiojin/unity-mcp-server/commit/399f066cc6d65176f6fbe99d0a0a99c48320919e))
* **test:** preserve latestResult when caching ([142604d](https://github.com/akiojin/unity-mcp-server/commit/142604d8eb3ec56de81452678f63cd89706ec9b5))

## [2.36.3](https://github.com/akiojin/unity-mcp-server/compare/v2.36.2...v2.36.3) (2025-11-12)


### Bug Fixes

* align publish workflow pnpm version ([430afbc](https://github.com/akiojin/unity-mcp-server/commit/430afbc3ca826a26344b967d63dd7e92bbad06d2))

## [2.36.2](https://github.com/akiojin/unity-mcp-server/compare/v2.36.1...v2.36.2) (2025-11-12)


### Bug Fixes

* stabilize publish workflow install step ([1167516](https://github.com/akiojin/unity-mcp-server/commit/1167516132ea1c96df9f9076656927149ab88b34))

## [2.36.1](https://github.com/akiojin/unity-mcp-server/compare/v2.36.0...v2.36.1) (2025-11-12)


### Bug Fixes

* auto-save dirty scenes before running tests ([7992990](https://github.com/akiojin/unity-mcp-server/commit/79929900e4190ad32c684c4755303b8e11dfd2c0))

## [2.36.0](https://github.com/akiojin/unity-mcp-server/compare/v2.35.1...v2.36.0) (2025-11-12)


### Features

* PlayMode中の変更ツールに警告レスポンスを追加 ([7e11ecc](https://github.com/akiojin/unity-mcp-server/commit/7e11ecc4486dff4db34cfd56adb6f6c2647a1b00))
* **test:** persist Unity test results cache ([79b605e](https://github.com/akiojin/unity-mcp-server/commit/79b605e834771e7971c40fce08c1d12d56bbcb85))
* テストステータス取得で結果サマリーを返却 ([8a41d92](https://github.com/akiojin/unity-mcp-server/commit/8a41d921ca66e542a950a539ff0e2eba77e52b88))
* テスト結果エクスポートと取得ツールを追加 ([ae43cf9](https://github.com/akiojin/unity-mcp-server/commit/ae43cf96d1b51f123360235d05a266638112d204))


### Bug Fixes

* **ci:** replace npm with pnpm in publish workflow ([cee12f8](https://github.com/akiojin/unity-mcp-server/commit/cee12f8919b16e3f781f32cd3bf9b22a5af4f233))
* stabilize playmode tools and test blocking ([cf45e05](https://github.com/akiojin/unity-mcp-server/commit/cf45e0572d26f0ab09e668dd79e9b74c78e47873))
* support node 22 and stabilize tool tests ([2f616a2](https://github.com/akiojin/unity-mcp-server/commit/2f616a2cf8b5860d94c4ac42e0d330b0fa1697a0))

## [2.35.1](https://github.com/akiojin/unity-mcp-server/compare/v2.35.0...v2.35.1) (2025-11-10)


### Bug Fixes

* add meta for package README ([2d09138](https://github.com/akiojin/unity-mcp-server/commit/2d09138e80cdfe987b4fdb6f2ed96777cc5a60fd))

## [2.35.0](https://github.com/akiojin/unity-mcp-server/compare/v2.34.0...v2.35.0) (2025-11-10)


### Features

* **ci:** align workflows with claude-worktree structure ([57a4643](https://github.com/akiojin/unity-mcp-server/commit/57a4643bc5bea842cc6d29158e1b52c1dafb7f2e))


### Bug Fixes

* Move [skip ci] to commit message trailer for commitlint compliance ([ed2e391](https://github.com/akiojin/unity-mcp-server/commit/ed2e391ff7f887d93d93aced31f21a643d090e04))

## [2.34.0](https://github.com/akiojin/unity-mcp-server/compare/v2.33.0...v2.34.0) (2025-11-09)


### Features

* akiojin/claude-worktreeのHooksを最新版に更新 ([6a8f6f2](https://github.com/akiojin/unity-mcp-server/commit/6a8f6f2e0b0bb4e7671a43c9dd16aed0f1a8145b))

# [2.33.0](https://github.com/akiojin/unity-mcp-server/compare/v2.32.0...v2.33.0) (2025-11-09)


### Features

* **hooks:** リポジトリルートへのcd移動を禁止 ([8f229ea](https://github.com/akiojin/unity-mcp-server/commit/8f229eaae48b0063fda4ce7b52ed92ba18ab55be))

# [2.32.0](https://github.com/akiojin/unity-mcp-server/compare/v2.31.0...v2.32.0) (2025-11-09)


### Bug Fixes

* カバレッジ閾値エラーでCIが失敗しないように修正 ([6ac4dc9](https://github.com/akiojin/unity-mcp-server/commit/6ac4dc94fc65a72e9e82c30cf6768100355f97ee))
* タグ同期問題の再発防止策を追加 ([10f3378](https://github.com/akiojin/unity-mcp-server/commit/10f3378085d3530b8927d3373c12ac2cc7013e3b))


### Features

* OpenUPMページでREADME表示対応を追加 ([4b3d08e](https://github.com/akiojin/unity-mcp-server/commit/4b3d08e1e5cb35ea3d855b7a3d35c0a0723bd241))
* test:ciと同じファイルのみでカバレッジ生成してCodecov再導入 ([cfa2767](https://github.com/akiojin/unity-mcp-server/commit/cfa27674c0a4f1ac464db8273ad1c0bd38dae49b))

# [2.31.0](https://github.com/akiojin/unity-mcp-server/compare/v2.30.1...v2.31.0) (2025-11-08)


### Features

* マイナーリリーステストv2（v2.30.1 → v2.31.0） ([2033ec1](https://github.com/akiojin/unity-mcp-server/commit/2033ec16fe16cba680ad69d14b477b4f6115f659))

## [2.30.1](https://github.com/akiojin/unity-mcp-server/compare/v2.30.0...v2.30.1) (2025-11-08)


### Bug Fixes

* パッチリリーステストv2（v2.30.0 → v2.30.1） ([70454f8](https://github.com/akiojin/unity-mcp-server/commit/70454f84b38b040c30ef20d2b5dfd90ce1d6929f))

# [2.30.0](https://github.com/akiojin/unity-mcp-server/compare/v2.29.0...v2.30.0) (2025-11-08)


### Bug Fixes

* カバレッジ生成のハング問題を解決（test:ciのみに戻す） ([188ffc8](https://github.com/akiojin/unity-mcp-server/commit/188ffc8708f77ac4f366867e6dc3db90b39cc52b))


### Features

* ユニットテストのカバレッジレポートとCodecovアップロードを再導入 ([5b7e0ed](https://github.com/akiojin/unity-mcp-server/commit/5b7e0ed374d9b5bb544f9426dcbc68fa5e2d20c9))

# [2.29.0](https://github.com/akiojin/unity-mcp-server/compare/v2.28.0...v2.29.0) (2025-11-08)


### Bug Fixes

* Codecovアップロードにタイムアウトを設定してCI高速化 ([843c1d1](https://github.com/akiojin/unity-mcp-server/commit/843c1d175a05f365122e3917506db02e59cee257))
* Codecovアップロードにタイムアウトを設定してCI高速化 (test.yml) ([0945de6](https://github.com/akiojin/unity-mcp-server/commit/0945de6756cc2b73ceb7e2cc18429f26012bfb87))
* test:coverageにもDISABLE_AUTO_RECONNECTを設定してハング問題を解決 ([5028c0c](https://github.com/akiojin/unity-mcp-server/commit/5028c0ca01c934ab69bce56751e41e53fe9cca14))
* カバレッジ生成ステップを削除してCIハング問題を解決 ([44d4188](https://github.com/akiojin/unity-mcp-server/commit/44d4188df21cb741b80d9176f686087517cca61b))
* カバレッジ生成で統合テストを除外してハング問題を解決 ([8cd589e](https://github.com/akiojin/unity-mcp-server/commit/8cd589edc21517b6ceba82b1b728a76059c1a8ab))
* テストファイルを追加してパッチリリースをテスト ([f31c78b](https://github.com/akiojin/unity-mcp-server/commit/f31c78b76d8900a8b1adf8f0690674636fd8b07e))


### Features

* テストファイルを追加してマイナーリリースをテスト ([356f2a1](https://github.com/akiojin/unity-mcp-server/commit/356f2a176397a9a3a73979188b5bb30e7ee97eb7))

# [2.28.0](https://github.com/akiojin/unity-mcp-server/compare/v2.27.2...v2.28.0) (2025-11-07)


### Features

* create-release.ymlにバージョン情報の詳細表示機能を追加 ([e0c9e7d](https://github.com/akiojin/unity-mcp-server/commit/e0c9e7d248e74aba5eda557fcec595868ca798d9))

## [2.27.2](https://github.com/akiojin/unity-mcp-server/compare/v2.27.1...v2.27.2) (2025-11-07)


### Bug Fixes

* release.ymlにワークフローの処理フローを説明するコメントを追加 ([2b51f26](https://github.com/akiojin/unity-mcp-server/commit/2b51f268221c43f21266476126f68f82e88be7ea))

## [2.27.1](https://github.com/akiojin/unity-mcp-server/compare/v2.27.0...v2.27.1) (2025-11-07)


### Bug Fixes

* ESLintのno-misleading-character-classエラーを修正 ([36ec5a1](https://github.com/akiojin/unity-mcp-server/commit/36ec5a1d77381a0675f8352e47c74cf1e47d4e84))
* README.ja.mdの表現を統一（かつ→で） ([23008eb](https://github.com/akiojin/unity-mcp-server/commit/23008eb5c33d7154bcb4c36948f09e4fb0924bf3))
* release.ymlでcheckout時に明示的にブランチを指定し、semantic-releaseが正しいブランチで実行されるように修正 ([471505c](https://github.com/akiojin/unity-mcp-server/commit/471505c2593037685608f52429fdd7a2818fa13e))
* release.ymlのマージログメッセージを改善してバージョン情報を表示 ([73c97cf](https://github.com/akiojin/unity-mcp-server/commit/73c97cfa8cbcce720679b588691dd3a054005bd8))
* release.ymlを修正し、PRを作成せずに直接mainにマージするように変更 ([ed49693](https://github.com/akiojin/unity-mcp-server/commit/ed496938cf5d2ce687903deb74f2450af4d1642a))
* semantic-releaseコミットメッセージから[skip ci]を削除 ([015ee8f](https://github.com/akiojin/unity-mcp-server/commit/015ee8f6d5f7e3ddeb07672f153544dbe00f9b79))
* semantic-releaseの無限ループを防ぐため、[skip ci]の代わりにchore(release):プレフィックスでスキップ ([124b6c0](https://github.com/akiojin/unity-mcp-server/commit/124b6c085e6ff844e20b91d7e16636bcf8e8e64b))

# [2.27.0](https://github.com/akiojin/unity-mcp-server/compare/v2.26.1...v2.27.0) (2025-11-07)


### Features

* README.mdに自動リリース管理セクションを追加 ([c19c5c5](https://github.com/akiojin/unity-mcp-server/commit/c19c5c557a0bb5a51eafe4d3d7f0d67320e7a9a7))

## [2.26.1](https://github.com/akiojin/unity-mcp-server/compare/v2.26.0...v2.26.1) (2025-11-07)


### Bug Fixes

* README.mdの誤字修正（zero- or low → zero or low） ([db9b2df](https://github.com/akiojin/unity-mcp-server/commit/db9b2df4241cc87f082c8bd16770b14571015ce9))

# [2.26.0](https://github.com/akiojin/unity-mcp-server/compare/v2.25.0...v2.26.0) (2025-11-07)


### Bug Fixes

* Correct GitHub Secret name from PAT_TOKEN to PAT ([9aeaa97](https://github.com/akiojin/unity-mcp-server/commit/9aeaa97ab974b5cf2f2b0e690a0376c4c7b55b57))
* Disable husky in semantic-release step ([d209d17](https://github.com/akiojin/unity-mcp-server/commit/d209d1798de3ab9238f43a13461b9feb2dad4e88))
* huskyフックをスキップしてリリースブランチ作成を修正 ([3ffead2](https://github.com/akiojin/unity-mcp-server/commit/3ffead2bdea7547f398eb81afa5e9476a0bc5120))
* improve husky scripts for better readability ([ea3637f](https://github.com/akiojin/unity-mcp-server/commit/ea3637fcdf88a284c82d320d339cb84aa56e51d4))
* lintワークフローのエラー解消 ([74710d8](https://github.com/akiojin/unity-mcp-server/commit/74710d8039231a6880f7583625cfaed9cf956ce0))
* macOSの一時パス差異でconfigテストが失敗する不具合を修正 ([99a94cb](https://github.com/akiojin/unity-mcp-server/commit/99a94cb7c2900810e2256a0627daffc936042750))
* semantic-releaseの出力をGitHub Actionsの出力として正しく設定 ([a63d029](https://github.com/akiojin/unity-mcp-server/commit/a63d029f226728f959bdad0db6f3f85d6be46967))
* semantic-releaseの出力解析を修正してリリース検出を改善 ([b4b408e](https://github.com/akiojin/unity-mcp-server/commit/b4b408ef40a8a4dd51810c4378b6edd2d17ad002))
* Skip husky hooks in release workflow to avoid markdownlint errors ([caf1acb](https://github.com/akiojin/unity-mcp-server/commit/caf1acb8216118c45cf103ac26366f2a4165eecd))


### Features

* Add automated backmerge and csharp-lsp build workflows ([6ce2486](https://github.com/akiojin/unity-mcp-server/commit/6ce2486e0d2b839ad2dc8f262faec789baaab1da))
* Git Flow方式リリースフローへ統合・変更 ([e3a5a73](https://github.com/akiojin/unity-mcp-server/commit/e3a5a73cadb78cd93446af13f57ad77d1ea6acea))
* GitHub Actionsベースのリリースブランチ作成フローを追加 ([c7cae9d](https://github.com/akiojin/unity-mcp-server/commit/c7cae9d6aca29d19570cf36d1a753515cc9734ac))
* Implement Git-Flow with release branch ([3638144](https://github.com/akiojin/unity-mcp-server/commit/3638144a44b14e55c0b8f3961006d1b9b62507bb))
* Implement Git-Flow with release branch ([368cc63](https://github.com/akiojin/unity-mcp-server/commit/368cc6393c42ba764763a58380cbf4f60cb46f37))
* STDIOハンドシェイクの互換性改善 ([b1d4dc5](https://github.com/akiojin/unity-mcp-server/commit/b1d4dc54c254f46b8c5f455f95d8d76aaaba82b2))


### Performance Improvements

* パブリッシュジョブを並列化してリリース時間を短縮 ([937d639](https://github.com/akiojin/unity-mcp-server/commit/937d6391ff897a98ebffe256f29df898f9a0220a))

# [2.26.0](https://github.com/akiojin/unity-mcp-server/compare/v2.25.0...v2.26.0) (2025-11-07)


### Bug Fixes

* Correct GitHub Secret name from PAT_TOKEN to PAT ([9aeaa97](https://github.com/akiojin/unity-mcp-server/commit/9aeaa97ab974b5cf2f2b0e690a0376c4c7b55b57))
* Disable husky in semantic-release step ([d209d17](https://github.com/akiojin/unity-mcp-server/commit/d209d1798de3ab9238f43a13461b9feb2dad4e88))
* huskyフックをスキップしてリリースブランチ作成を修正 ([3ffead2](https://github.com/akiojin/unity-mcp-server/commit/3ffead2bdea7547f398eb81afa5e9476a0bc5120))
* semantic-releaseの出力をGitHub Actionsの出力として正しく設定 ([a63d029](https://github.com/akiojin/unity-mcp-server/commit/a63d029f226728f959bdad0db6f3f85d6be46967))
* semantic-releaseの出力解析を修正してリリース検出を改善 ([b4b408e](https://github.com/akiojin/unity-mcp-server/commit/b4b408ef40a8a4dd51810c4378b6edd2d17ad002))
* Skip husky hooks in release workflow to avoid markdownlint errors ([caf1acb](https://github.com/akiojin/unity-mcp-server/commit/caf1acb8216118c45cf103ac26366f2a4165eecd))


### Features

* Add automated backmerge and csharp-lsp build workflows ([6ce2486](https://github.com/akiojin/unity-mcp-server/commit/6ce2486e0d2b839ad2dc8f262faec789baaab1da))
* Git Flow方式リリースフローへ統合・変更 ([e3a5a73](https://github.com/akiojin/unity-mcp-server/commit/e3a5a73cadb78cd93446af13f57ad77d1ea6acea))
* GitHub Actionsベースのリリースブランチ作成フローを追加 ([c7cae9d](https://github.com/akiojin/unity-mcp-server/commit/c7cae9d6aca29d19570cf36d1a753515cc9734ac))
* Implement Git-Flow with release branch ([3638144](https://github.com/akiojin/unity-mcp-server/commit/3638144a44b14e55c0b8f3961006d1b9b62507bb))
* Implement Git-Flow with release branch ([368cc63](https://github.com/akiojin/unity-mcp-server/commit/368cc6393c42ba764763a58380cbf4f60cb46f37))

# [2.25.0](https://github.com/akiojin/unity-mcp-server/compare/v2.24.0...v2.25.0) (2025-11-07)


### Bug Fixes

* Add @semantic-release/git plugin to commit version changes ([4758b5c](https://github.com/akiojin/unity-mcp-server/commit/4758b5caceb76226fb0ec9ee82f09cc76d202033))
* Skip husky hooks in release workflow to avoid markdownlint errors ([eb1bac9](https://github.com/akiojin/unity-mcp-server/commit/eb1bac9e7d10b516ab24325ef30de949eb1ffe4f))
* Use PAT_TOKEN in auto-merge to trigger subsequent workflows ([86619c5](https://github.com/akiojin/unity-mcp-server/commit/86619c5e60f3dfbf1c93b1c0983a316dc7640d78))


### Features

* Add release branch support to auto-merge workflow ([29c5b8b](https://github.com/akiojin/unity-mcp-server/commit/29c5b8b11a381c343b077aa9d3561778c8caf036))
* Add three-tier release workflow (feature → develop → main) ([4f3836b](https://github.com/akiojin/unity-mcp-server/commit/4f3836b45ee64c4a1dae43691a19c313f34311b1))
* Configure semantic-release for Git-Flow release branch ([ef5be62](https://github.com/akiojin/unity-mcp-server/commit/ef5be624f4b16aaf18ad498638107fc169933bf9))
* Update release workflow for Git-Flow ([2f48e3b](https://github.com/akiojin/unity-mcp-server/commit/2f48e3b9316fe8f36d04f44e7be54ed10f5a69c8))

# [2.25.0](https://github.com/akiojin/unity-mcp-server/compare/v2.24.0...v2.25.0) (2025-11-07)


### Bug Fixes

* Add @semantic-release/git plugin to commit version changes ([4758b5c](https://github.com/akiojin/unity-mcp-server/commit/4758b5caceb76226fb0ec9ee82f09cc76d202033))
* Skip husky hooks in release workflow to avoid markdownlint errors ([eb1bac9](https://github.com/akiojin/unity-mcp-server/commit/eb1bac9e7d10b516ab24325ef30de949eb1ffe4f))
* Use PAT_TOKEN in auto-merge to trigger subsequent workflows ([86619c5](https://github.com/akiojin/unity-mcp-server/commit/86619c5e60f3dfbf1c93b1c0983a316dc7640d78))


### Features

* Add release branch support to auto-merge workflow ([29c5b8b](https://github.com/akiojin/unity-mcp-server/commit/29c5b8b11a381c343b077aa9d3561778c8caf036))
* Add three-tier release workflow (feature → develop → main) ([4f3836b](https://github.com/akiojin/unity-mcp-server/commit/4f3836b45ee64c4a1dae43691a19c313f34311b1))
* Configure semantic-release for Git-Flow release branch ([ef5be62](https://github.com/akiojin/unity-mcp-server/commit/ef5be624f4b16aaf18ad498638107fc169933bf9))
* Update release workflow for Git-Flow ([2f48e3b](https://github.com/akiojin/unity-mcp-server/commit/2f48e3b9316fe8f36d04f44e7be54ed10f5a69c8))
