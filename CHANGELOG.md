## [2.41.0](https://github.com/akiojin/unity-mcp-server/compare/v2.40.6...v2.41.0) (2025-11-21)


### Features

* bundle better-sqlite3 prebuilt artifacts ([34d4daa](https://github.com/akiojin/unity-mcp-server/commit/34d4daa69e238b8d47ce0e66ce4d710af5aeb256))


### Bug Fixes

* add auto reconnect handling for Unity domain reload ([a33539e](https://github.com/akiojin/unity-mcp-server/commit/a33539e7228571dac1970783b80501cdbd127b22))

## [4.1.1](https://github.com/akiojin/unity-mcp-server/compare/v4.1.0...v4.1.1) (2025-12-18)


### Bug Fixes

* **ci:** fix GitHub Actions workflow syntax error in publish.yml ([ffecd68](https://github.com/akiojin/unity-mcp-server/commit/ffecd689bc066071634aaab482c4eae77ec43d5b))

## [4.1.0](https://github.com/akiojin/unity-mcp-server/compare/v4.0.0...v4.1.0) (2025-12-17)


### Features

* Node/Unityパッケージversion不一致を検出 ([c0af5ae](https://github.com/akiojin/unity-mcp-server/commit/c0af5aec91ba19323b2cbfc78c14179626700799))
* Node/Unityパッケージversion不一致検出 ([175cdaa](https://github.com/akiojin/unity-mcp-server/commit/175cdaa3ed887452c5e9656ba4cf33f8c9c64285))
* publish signed OpenUPM Unity package ([2b98975](https://github.com/akiojin/unity-mcp-server/commit/2b98975938ff00f04fbad6d50a8183b8f57bc00e))
* publish signed OpenUPM Unity package ([db60249](https://github.com/akiojin/unity-mcp-server/commit/db602499d4fdd071af672e7493b94510e72044b9))


### Bug Fixes

* **mcp-server:** add child directory search for Unity project root ([1b1439c](https://github.com/akiojin/unity-mcp-server/commit/1b1439cba0fd7c36acb220d5ae999b10108a96c8))
* **mcp-server:** prioritize child directory search for Unity project root ([883c8a8](https://github.com/akiojin/unity-mcp-server/commit/883c8a841d971d82f3bc0b59d74ecf7ae294e3ba))
* **mcp-server:** prioritize child directory search for Unity project root ([f71edbe](https://github.com/akiojin/unity-mcp-server/commit/f71edbee128203f1cf3e9ed9fb6bbacd80c8bad6))
* Unity側のpackage version取得を改善 ([c1cfdcf](https://github.com/akiojin/unity-mcp-server/commit/c1cfdcf5c4f693eca7184a8ce7db0fe7701cabd7))

## [4.0.0](https://github.com/akiojin/unity-mcp-server/compare/v3.2.1...v4.0.0) (2025-12-17)


### ⚠ BREAKING CHANGES

* tools/call no longer accepts legacy tool names.

### Bug Fixes

* 旧ツール名の漏れを解消 ([c422899](https://github.com/akiojin/unity-mcp-server/commit/c4228990cb3d32cc9accf0db5a121efa56146460))
* 旧ツール名の漏れを解消 ([09cdedf](https://github.com/akiojin/unity-mcp-server/commit/09cdedf9855f05e1764d34bb1e82de18c6ce4dab))


### Code Refactoring

* remove legacy MCP tool aliases ([6325d6f](https://github.com/akiojin/unity-mcp-server/commit/6325d6f8b9611f2ae1a44ffdd17ee99a374405d6))

## [3.2.1](https://github.com/akiojin/unity-mcp-server/compare/v3.2.0...v3.2.1) (2025-12-16)


### Bug Fixes

* analysis/input actions のUnityコマンド名マッピング ([222227f](https://github.com/akiojin/unity-mcp-server/commit/222227fc2de7bd650bce84328a260d4743d23490))
* Animator tool名→Unity command type を正規化 ([30754e2](https://github.com/akiojin/unity-mcp-server/commit/30754e2f790b7a5983f5cc9798509d670996e18b))
* Animatorコマンドtypeを正規化 ([13f7a27](https://github.com/akiojin/unity-mcp-server/commit/13f7a2767d07839289f9db74ab4311868c416136))
* Unityコマンド名のマッピング修正 ([0eff680](https://github.com/akiojin/unity-mcp-server/commit/0eff680debc0abf79bd0dc9d76506402e189de9b))

## [3.2.0](https://github.com/akiojin/unity-mcp-server/compare/v3.1.0...v3.2.0) (2025-12-15)


### Features

* **mcp-server:** change output format to grouped by file path ([b608979](https://github.com/akiojin/unity-mcp-server/commit/b608979bb590451bf9c748833e5761bcc6dbbc4e))

## [3.1.0](https://github.com/akiojin/unity-mcp-server/compare/v3.0.0...v3.1.0) (2025-12-15)


### Features

* **code-index:** add forceRebuild option and 100K benchmark results ([43084ae](https://github.com/akiojin/unity-mcp-server/commit/43084ae8d4ee573ddc5482859f6936663b5d3446))
* **test:** add large-scale C# file generation script ([ee74cb3](https://github.com/akiojin/unity-mcp-server/commit/ee74cb37e511ec018cdf2970317c85c0e9f025c5))
* **ui:** UI操作をIMGUI/uGUI/UITK対応 ([29eff99](https://github.com/akiojin/unity-mcp-server/commit/29eff994f4f1017417a1d41cba820a75a6a0a11a))
* UI操作のIMGUI/uGUI/UITK対応とツール改善 ([8c928dd](https://github.com/akiojin/unity-mcp-server/commit/8c928dd50d482a2095c413eb3a620909a84308aa))
* UI操作のIMGUI/uGUI/UITK対応と検証シーン追加 ([f85507d](https://github.com/akiojin/unity-mcp-server/commit/f85507d0dac85bf6f0ff348ec51445172eaab5e1))


### Bug Fixes

* **code-index:** add Library/PackageCache support and performance optimization ([a8c728e](https://github.com/akiojin/unity-mcp-server/commit/a8c728ef9571c703c9061f0f128ba5a5e72f15f6))
* **code-index:** remove */.*  pattern that breaks worktree builds ([2bd9d8b](https://github.com/akiojin/unity-mcp-server/commit/2bd9d8b52cf11d17d805f5de7afdc727d61afe16))
* **mcp-server:** add Library/PackageCache to script_search scope ([e797f5b](https://github.com/akiojin/unity-mcp-server/commit/e797f5b9b1226e3ec726cd66580c0ba7310350a5))
* **uitk:** Query拡張メソッド参照を修正 ([0ddf05f](https://github.com/akiojin/unity-mcp-server/commit/0ddf05f262c0fe83f3323342d1d0d78d11840d03))
* **uitk:** テストシーンUI Toolkit API互換 ([29ced95](https://github.com/akiojin/unity-mcp-server/commit/29ced951a10262f7feda73241c26aafee749bfe2))
* **ui:** UITKクリックとInputSystem対応 ([85d23c6](https://github.com/akiojin/unity-mcp-server/commit/85d23c65860efb98604dce11a46b5d826d0ffe14))


### Performance Improvements

* **code-index:** add fastWalkCs and excludePackageCache option ([2d2b022](https://github.com/akiojin/unity-mcp-server/commit/2d2b02240f75181de6747a3c178955d43cecb649))

## [3.0.0](https://github.com/akiojin/unity-mcp-server/compare/v2.46.0...v3.0.0) (2025-12-15)


### ⚠ BREAKING CHANGES

* **config:** 環境変数による設定（UNITY_* / LOG_LEVEL / UNITY_MCP_CONFIG 等）は無効化 ~/.unity/config.json もサポートしません。 設定はワークスペースの .unity/config.json のみです。

### Features

* **plugin:** add Claude Code plugin manifest for marketplace distribution ([ff1c520](https://github.com/akiojin/unity-mcp-server/commit/ff1c52078720d060f93cf025cf52821971be4c29))
* **skills:** add Claude Code skills for Unity MCP Server ([20844c3](https://github.com/akiojin/unity-mcp-server/commit/20844c3032547b2095b0c75852ad17622cad4fa0))


### Code Refactoring

* **config:** 設定を .unity/config.json のみに統一 ([6c76564](https://github.com/akiojin/unity-mcp-server/commit/6c765646b6e9ab9df70a7a1fa0a63a6649a2bdde))

## [2.46.0](https://github.com/akiojin/unity-mcp-server/compare/v2.45.5...v2.46.0) (2025-12-13)


### Features

* **code-index:** add [OFFLINE] tag to tool descriptions for LLM awareness ([902ac07](https://github.com/akiojin/unity-mcp-server/commit/902ac07a3dc8b4c8807e2e2fd4b28a055889793a))
* **code-index:** add [OFFLINE] tag to tool descriptions for LLM awareness ([f747a51](https://github.com/akiojin/unity-mcp-server/commit/f747a5192404989ae0358faff7b3d4123c6e6bae))


### Bug Fixes

* gh extension インストール時のトークン受け渡し ([f22218e](https://github.com/akiojin/unity-mcp-server/commit/f22218ebc0eaeea174e71e3a7922533cc4d9c829))
* initialized後に重い初期化を延期 ([fc43435](https://github.com/akiojin/unity-mcp-server/commit/fc434352227d27a9fdb36ae1d23455973ac0e5a9))
* **mcp-server:** initialized後に重い初期化を延期 ([dfd52fe](https://github.com/akiojin/unity-mcp-server/commit/dfd52fe9b28319f69bff7803f881b061378f0758))
* **mcp-server:** 起動10秒タイムアウトを解消 ([ea02c62](https://github.com/akiojin/unity-mcp-server/commit/ea02c62a2ed4890e61a708a82d8962df7310b122))
* **mcp-server:** 起動10秒タイムアウトを解消 ([88b4ef4](https://github.com/akiojin/unity-mcp-server/commit/88b4ef4503c13ea4dab11b23eea0fc72d4c33d54))
* **mcp-server:** 起動時のtools/listを高速化 ([afaee8c](https://github.com/akiojin/unity-mcp-server/commit/afaee8c22a4bddeb18ac9362458b07bce2bac53d))
* **monorepo:** add postinstall script and improve error messages ([d132b16](https://github.com/akiojin/unity-mcp-server/commit/d132b1695153fb2db79cb7f48e9de570fa8fd5b6))
* **monorepo:** add postinstall script to build local packages ([8ed1478](https://github.com/akiojin/unity-mcp-server/commit/8ed1478901fdd8f7dec2f1330e99976d621d1d6c))
* **script-tools:** improve file not found error messages ([a975c11](https://github.com/akiojin/unity-mcp-server/commit/a975c1145356ac6477299aae3efdede2bb616090))
* **script-tools:** replace LSP with file-based search in script_refs_find ([cc99ee0](https://github.com/akiojin/unity-mcp-server/commit/cc99ee0e15e4ff7e0fb25ed3da905d9d1c85c375))
* **script-tools:** replace LSP with file-based search in script_refs_find ([b74f081](https://github.com/akiojin/unity-mcp-server/commit/b74f081fb8e4b4c85a2461b74150c68e538cf19b))
* 起動時のtools/listを高速化 ([0e179bc](https://github.com/akiojin/unity-mcp-server/commit/0e179bc76a5406fffb55e37a4513617f4e0bd9eb))


### Performance Improvements

* **code-index:** comprehensive performance optimization ([c02a48f](https://github.com/akiojin/unity-mcp-server/commit/c02a48f95c251b9ba945c83ce3578b70209f8585))
* **code-index:** comprehensive performance optimization ([d43a087](https://github.com/akiojin/unity-mcp-server/commit/d43a08798415cf80cc8c5e246b2cff2a8b416fd0))

## [2.45.5](https://github.com/akiojin/unity-mcp-server/compare/v2.45.4...v2.45.5) (2025-12-09)


### Bug Fixes

* **code-index:** implement inline LSP client for Worker Thread ([89ed79e](https://github.com/akiojin/unity-mcp-server/commit/89ed79ec559853766da91dbeb8803052dd935091))

## [2.45.4](https://github.com/akiojin/unity-mcp-server/compare/v2.45.3...v2.45.4) (2025-12-09)


### Bug Fixes

* **code-index:** throw error on saveDatabase failure and validate DB file existence ([84273b5](https://github.com/akiojin/unity-mcp-server/commit/84273b5ca059ec2e54e3f3b11d45af3a4a477cae))
* **code-index:** throw error on saveDatabase failure and validate DB file existence ([909681a](https://github.com/akiojin/unity-mcp-server/commit/909681a3007b07e20b3ec470a9539cb88be65ae3))

## [2.45.3](https://github.com/akiojin/unity-mcp-server/compare/v2.45.2...v2.45.3) (2025-12-09)


### Bug Fixes

* **code-index:** use Database.create() for better-sqlite3 support in Worker Thread ([5002f65](https://github.com/akiojin/unity-mcp-server/commit/5002f65602837d066c03f08c2b05450ce8174f3b))
* **code-index:** use Database.create() for better-sqlite3 support in Worker Thread ([978e2bc](https://github.com/akiojin/unity-mcp-server/commit/978e2bc2dc97caa0755ba3906a328da81f4cdd1c))

## [2.45.2](https://github.com/akiojin/unity-mcp-server/compare/v2.45.1...v2.45.2) (2025-12-09)


### Bug Fixes

* **code-index:** use Worker Thread for code_index_build to prevent blocking ([467e2a1](https://github.com/akiojin/unity-mcp-server/commit/467e2a18b8cd5edf5b97aef66ea95449201394b5))
* **code-index:** use Worker Thread for code_index_build to prevent blocking ([11d54ea](https://github.com/akiojin/unity-mcp-server/commit/11d54ea7dd0674d3dd461880cfa9b3b599313666))

## [2.45.1](https://github.com/akiojin/unity-mcp-server/compare/v2.45.0...v2.45.1) (2025-12-09)


### Bug Fixes

* **mcp-server:** resolve fast-sql dependency for npm publish ([10a02db](https://github.com/akiojin/unity-mcp-server/commit/10a02db8c3feaef03e09927bd48fbe3cbefc8472))
* **mcp-server:** resolve fast-sql dependency for npm publish ([d95e7cb](https://github.com/akiojin/unity-mcp-server/commit/d95e7cb99d4940b11955c6b8cf1a738051f764d8))

## [2.45.0](https://github.com/akiojin/unity-mcp-server/compare/v2.44.1...v2.45.0) (2025-12-09)


### Features

* **fast-sql:** add hybrid backend with better-sqlite3 support ([25ad97b](https://github.com/akiojin/unity-mcp-server/commit/25ad97be46c8c51f9924abafe996a5079ce96f7d))
* **fast-sql:** implement core fast-sql library ([97d32a0](https://github.com/akiojin/unity-mcp-server/commit/97d32a0411e81c3296987ffa4a0832314d3fab19))
* **fast-sql:** initialize package structure (T001-T004) ([cdb9152](https://github.com/akiojin/unity-mcp-server/commit/cdb9152ebe520d00a640f1aee9cbafa6878324ce))
* **fast-sql:** SQLite optimization wrapper library ([ecd3905](https://github.com/akiojin/unity-mcp-server/commit/ecd3905487a30b240fbc9b64f9911a82a52c2386))
* **mcp-server:** integrate fast-sql hybrid SQLite backend ([d90509a](https://github.com/akiojin/unity-mcp-server/commit/d90509a51f220d68eef9b6de7b0446fd65d110dc))
* **mcp-server:** integrate fast-sql hybrid SQLite backend ([4e1e399](https://github.com/akiojin/unity-mcp-server/commit/4e1e3990c40c0c3ea2bbee0c4209622a5e859e7f))


### Bug Fixes

* **fast-sql:** add cache invalidation for freed statements ([4d0005b](https://github.com/akiojin/unity-mcp-server/commit/4d0005b4e49c6580aca658061ffe515683147668))
* **mcp-server:** replace better-sqlite3 with sql.js for npx compatibility ([e1c5b27](https://github.com/akiojin/unity-mcp-server/commit/e1c5b2723ae8937d14f4d20d169d45d5ebed1a9f))
* **mcp-server:** switch from pnpm to npm workspace protocol ([990963f](https://github.com/akiojin/unity-mcp-server/commit/990963f41d25d57f6c7993d5dea7541d3bcbff3b))


### Performance Improvements

* **fast-sql:** optimize StatementCache Date.now() calls ([4e353e8](https://github.com/akiojin/unity-mcp-server/commit/4e353e892e351cb2174a665d415360e031ec24e7))

## [2.44.1](https://github.com/akiojin/unity-mcp-server/compare/v2.44.0...v2.44.1) (2025-12-08)


### Bug Fixes

* **mcp-server:** replace better-sqlite3 with sql.js for npx compatibility ([b4aabea](https://github.com/akiojin/unity-mcp-server/commit/b4aabea1a3cb1c774f30f81cd294cfb055236f99))
* **mcp-server:** replace better-sqlite3 with sql.js for npx compatibility ([63fbb8c](https://github.com/akiojin/unity-mcp-server/commit/63fbb8cc3c6c5f80526379f06e08d8dca524e8ab))

## [2.44.0](https://github.com/akiojin/unity-mcp-server/compare/v2.43.3...v2.44.0) (2025-12-08)


### Features

* **lsp:** add logging to C# LSP server with unified prefix ([189e72e](https://github.com/akiojin/unity-mcp-server/commit/189e72e34fa982c39dc669bcbfe070620adf01b3))
* **lsp:** add logging to C# LSP server with unified prefix ([8a3b9b5](https://github.com/akiojin/unity-mcp-server/commit/8a3b9b52ce79a04dd095065bc3c2a20c6c082a72))


### Bug Fixes

* **mcp-server:** defer handler initialization for npx compatibility ([3637a79](https://github.com/akiojin/unity-mcp-server/commit/3637a79e30d09b1db7d2c2dcc3a9101c34acf4ba))
* **mcp-server:** defer handler initialization for npx compatibility ([e5c14b1](https://github.com/akiojin/unity-mcp-server/commit/e5c14b1b164329e08b7ceeb3fbaeac404ea1f85f))

## [2.43.3](https://github.com/akiojin/unity-mcp-server/compare/v2.43.2...v2.43.3) (2025-12-08)


### Bug Fixes

* **mcp-server:** use official StdioServerTransport for NDJSON output ([fb39266](https://github.com/akiojin/unity-mcp-server/commit/fb392660196f994a4d595e86f27c2529268f840e))
* **mcp-server:** use official StdioServerTransport for NDJSON output ([b3bb999](https://github.com/akiojin/unity-mcp-server/commit/b3bb999f5733243e0afc7fb49d3a7a05d57cd9cd))

## [2.43.2](https://github.com/akiojin/unity-mcp-server/compare/v2.43.1...v2.43.2) (2025-12-08)


### Bug Fixes

* **mcp-server:** disable code index auto-build on startup ([6e6ca2c](https://github.com/akiojin/unity-mcp-server/commit/6e6ca2cc25d1e5656bc5f2f89f8a395182a57a7b))
* **mcp-server:** disable code index auto-build on startup ([35f4965](https://github.com/akiojin/unity-mcp-server/commit/35f4965c7ee7c38ac002c77fe6df564368582ee5))

## [2.43.1](https://github.com/akiojin/unity-mcp-server/compare/v2.43.0...v2.43.1) (2025-12-08)


### Bug Fixes

* **mcp-server:** always use Content-Length framing for output ([cfcd023](https://github.com/akiojin/unity-mcp-server/commit/cfcd023048d9bc6c3c758eb666f744c15229471c))
* **mcp-server:** always use Content-Length framing for output ([4b84975](https://github.com/akiojin/unity-mcp-server/commit/4b84975a7edc4de2911f599aacbff850e4cb1539))

## [2.43.0](https://github.com/akiojin/unity-mcp-server/compare/v2.42.4...v2.43.0) (2025-12-08)


### Features

* **mcp-server:** migrate logger to MCP SDK-compliant MCPLogger ([76cd0f4](https://github.com/akiojin/unity-mcp-server/commit/76cd0f472d3ba2ebde7bb655cb54ff341be5b4f4))
* **mcp-server:** migrate logger to MCP SDK-compliant MCPLogger ([095a0e9](https://github.com/akiojin/unity-mcp-server/commit/095a0e9cf54d8e93a6372f587a285e3716021b9d))


### Bug Fixes

* **mcp-server:** unify entry point with dynamic imports for npx compatibility ([c1fc275](https://github.com/akiojin/unity-mcp-server/commit/c1fc275d6d133e096934787bea9ce040fe02fea4))
* **mcp-server:** unify entry point with dynamic imports for npx compatibility ([b5860da](https://github.com/akiojin/unity-mcp-server/commit/b5860daf8f3274d1c0d575c325867652c0e997e5))

## [2.42.4](https://github.com/akiojin/unity-mcp-server/compare/v2.42.3...v2.42.4) (2025-12-05)


### Bug Fixes

* **mcp-server:** add bootstrap wrapper for early diagnostic logging ([60095e5](https://github.com/akiojin/unity-mcp-server/commit/60095e57cfec3a5e07ca50ce6eb42aeb3e258942))
* **mcp-server:** add bootstrap wrapper for early diagnostic logging ([73b7479](https://github.com/akiojin/unity-mcp-server/commit/73b7479510e4882beec1431b6f16f861ced2c5ad))

## [2.42.3](https://github.com/akiojin/unity-mcp-server/compare/v2.42.2...v2.42.3) (2025-12-05)


### Bug Fixes

* **mcp-server:** add detailed connection debug logs ([1e009ea](https://github.com/akiojin/unity-mcp-server/commit/1e009ea853085ef648b1919fcbaee5cd7aff24d6))
* **mcp-server:** add detailed connection debug logs ([81b235e](https://github.com/akiojin/unity-mcp-server/commit/81b235e29f00b3688c00d61e1f9af8ccf8686415))

## [2.42.2](https://github.com/akiojin/unity-mcp-server/compare/v2.42.1...v2.42.2) (2025-12-05)


### Bug Fixes

* add startup diagnostics and WSL2/Docker troubleshooting guide ([e4c6259](https://github.com/akiojin/unity-mcp-server/commit/e4c625917e6b82dc1776ffa4761abe2fb025074f))
* config find-up compatibility ([0a5f2ec](https://github.com/akiojin/unity-mcp-server/commit/0a5f2ecbbeddbd7b529bde898a21596cf0c2931e))
* editor window compile errors (EditorStyles, AppendLog, Kill overload) ([bbefff5](https://github.com/akiojin/unity-mcp-server/commit/bbefff585a5691ac80c658dc2ff432fe8b89057c))
* **package:** use SearchAll() for keyword-based package search ([acda256](https://github.com/akiojin/unity-mcp-server/commit/acda2566c19cda04ad2cc927233b0f89082ca103))
* **package:** use SearchAll() for keyword-based package search ([d88b095](https://github.com/akiojin/unity-mcp-server/commit/d88b0951aca9122a1c30caeb71ab65b3bc508504))
* place scroll field inside McpServerWindow class ([c612947](https://github.com/akiojin/unity-mcp-server/commit/c6129473c76df035a2ea435893042b67063de41f))
* Unity editor window compile issues ([a1accc5](https://github.com/akiojin/unity-mcp-server/commit/a1accc54bfa7a9659bbd6ba1181f50b096e32822))

## [2.42.1](https://github.com/akiojin/unity-mcp-server/compare/v2.42.0...v2.42.1) (2025-12-05)


### Bug Fixes

* **lsp:** add grace period for LSP process shutdown on timeout recovery ([b11fd9e](https://github.com/akiojin/unity-mcp-server/commit/b11fd9ec61ae8a552c165d40face214bd2a755a1))
* **lsp:** add grace period for LSP process shutdown on timeout recovery ([636ab9d](https://github.com/akiojin/unity-mcp-server/commit/636ab9d4561afb88cd74b4506258862667adadab))

## [2.42.0](https://github.com/akiojin/unity-mcp-server/compare/v2.41.8...v2.42.0) (2025-11-27)


### Features

* **code-index:** implement Worker Threads for non-blocking index builds (US-10) ([dc55430](https://github.com/akiojin/unity-mcp-server/commit/dc5543053aedc56e0ab90e4bd0da72c1bba72e15))


### Bug Fixes

* **code-index:** add busy_timeout to prevent DB lock contention ([402f343](https://github.com/akiojin/unity-mcp-server/commit/402f3431db9cb5d08ac48bfd188a068ccb4a3277))
* **code-index:** add read/write connection separation for concurrent access ([d4ca06d](https://github.com/akiojin/unity-mcp-server/commit/d4ca06d65030c0714246188549eb24d223c4b9a8))
* **code-index:** prevent event loop blocking during background index build ([a08cc20](https://github.com/akiojin/unity-mcp-server/commit/a08cc20ab1d72b43c941b972ac44019caf7c8148))
* **code-index:** reduce watcher concurrency to 1 for non-blocking builds ([666b49e](https://github.com/akiojin/unity-mcp-server/commit/666b49e20309b15be9eb4018aa5066c4bfaba8bd))
* **code-index:** require DB index for symbol/refs search ([a283b4b](https://github.com/akiojin/unity-mcp-server/commit/a283b4b77fad067893fe671c257122a1f27b1f35))
* **code-index:** require DB index for symbol/refs search, remove LSP fallback ([7de0399](https://github.com/akiojin/unity-mcp-server/commit/7de03995e78102ab89852754574f7c612043d0bf))
* **code-index:** use setTimeout(1) for proper event loop yielding ([03248ec](https://github.com/akiojin/unity-mcp-server/commit/03248ec8ae287ce698bab567dc94f82774597a9d))
* **deps:** add pnpm workspace config for better-sqlite3 hoisting ([8bf2534](https://github.com/akiojin/unity-mcp-server/commit/8bf253401d99278476cb0399fe149bc9ebbfc29a))
* harden code index fallback and MCP transport ([57d7d60](https://github.com/akiojin/unity-mcp-server/commit/57d7d607855d455a96c060770aa9a0e672223ff3))
* **lsp:** prevent write after end crash in LspRpcClient ([633bfbc](https://github.com/akiojin/unity-mcp-server/commit/633bfbca40ab750ee307ddf945d2cf1bf86100a7))
* **mcp-server:** remove WASM fallback and delay initial index watcher tick ([e54213e](https://github.com/akiojin/unity-mcp-server/commit/e54213e9141021032e97931575a43e80eeec0694))


### Performance Improvements

* **code-index:** remove expensive file scan from code_index_status ([ac912e2](https://github.com/akiojin/unity-mcp-server/commit/ac912e2253f726f63d0dc373379b0209e86c332e))
* **code-index:** Worker Thread implementation for non-blocking index builds ([f953608](https://github.com/akiojin/unity-mcp-server/commit/f95360854c7d8063ace06684603d853da041d1f0))

## [2.41.8](https://github.com/akiojin/unity-mcp-server/compare/v2.41.7...v2.41.8) (2025-11-27)


### Performance Improvements

* **lsp:** implement csharp-lsp process singleton for performance ([3b813e1](https://github.com/akiojin/unity-mcp-server/commit/3b813e16fdac58659136cb347b55dad579148021))
* **lsp:** implement csharp-lsp process singleton for performance ([efbe970](https://github.com/akiojin/unity-mcp-server/commit/efbe9703d0ee5e88b151c6a1da7b9b0f665df1ae))

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

* add quit_editor tool ([b8908b5](https://github.com/akiojin/unity-mcp-server/commit/b8908b5e90f953c77a9de17c978a97df64e166cc))
* add quit_editor command for quit_editor tool ([5495b74](https://github.com/akiojin/unity-mcp-server/commit/5495b7455e77a7f5bfe8cd78b30a843d53dfaa4e))
* **test:** persist run state and add watchdog coverage ([278e024](https://github.com/akiojin/unity-mcp-server/commit/278e02499a3defa5224fb1a5027c4b62563eabb8))


### Bug Fixes

* dedupe quit_editor handler registration ([5701c7f](https://github.com/akiojin/unity-mcp-server/commit/5701c7ffe561da69101a843e3bbebef663700deb))
* delay quit_editor until response is sent ([49f3b4a](https://github.com/akiojin/unity-mcp-server/commit/49f3b4a8408d42ba3767d9c3be6d3ee90ef0a995))

## [2.37.2](https://github.com/akiojin/unity-mcp-server/compare/v2.37.1...v2.37.2) (2025-11-14)


### Bug Fixes

* **mcp-server:** remove anyOf from input tool schemas ([8f7ad48](https://github.com/akiojin/unity-mcp-server/commit/8f7ad48ab701bbfb1e7d5b2d42519a13986c72ae))

## [2.37.1](https://github.com/akiojin/unity-mcp-server/compare/v2.37.0...v2.37.1) (2025-11-14)


### Bug Fixes

* enforce prefab path requirement in set_component_field schema ([b04fa68](https://github.com/akiojin/unity-mcp-server/commit/b04fa6875776bd4e68956015c5a53483133e3770))

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
