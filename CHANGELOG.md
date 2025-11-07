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
