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
