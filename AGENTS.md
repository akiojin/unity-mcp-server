# AGENTS.md

このファイルは、このリポジトリでコードを扱う際のガイダンスを提供します。

## 開発指針

### 🛠️ 技術実装指針

- **設計・実装は複雑にせずに、シンプルさの極限を追求してください**
- **ただし、ユーザビリティと開発者体験の品質は決して妥協しない**
- 実装はシンプルに、開発者体験は最高品質に
- CLI操作の直感性と効率性を技術的複雑さより優先

### 📝 設計ガイドライン

- 設計に関するドキュメントには、ソースコードを書かないこと

## 開発品質

### 完了条件

- エラーが発生している状態で完了としないこと。必ずエラーが解消された時点で完了とする。

## 開発ワークフロー

### 基本ルール

- 作業（タスク）を完了したら、変更点を日本語でコミットログに追加して、コミット＆プッシュを必ず行う
- 作業（タスク）は、最大限の並列化をして進める
- 作業（タスク）は、最大限の細分化をしてToDoに登録する
- 作業（タスク）の開始前には、必ずToDoを登録した後に作業を開始する
- 作業（タスク）は、忖度なしで進める

## コミュニケーションガイドライン

- 回答は必ず日本語

## ドキュメント管理

- ドキュメントはREADME（英/日）に集約する

### Unity MCP Scriptツールの使用方針（重要）

- C#の探索/編集/置換/生成は、Unity MCPのScript系ツール（`UnityMCP__script_search`/`UnityMCP__script_read`/`UnityMCP__script_edit_patch`/`UnityMCP__script_replace_pattern`/`UnityMCP__script_edit_structured`）を必ず使用すること。`apply_patch`や`shell`での直接編集は禁止。
- 変更は必ず「previewで差分確認 → 適用 → `UnityMCP__refresh_assets` → `UnityMCP__wait_for_editor_state`でコンパイル完了待ち」の順で検証すること。
- 対象パスは次に限定すること（役割を厳密に区別する）：
  - 実装本体（UPMパッケージ）: `UnityEditorMCP/Packages/unity-editor-mcp/**`（Embedded。最優先の編集対象）
  - サンプル/Unityプロジェクト側: `UnityEditorMCP/Assets/**`（サンプル・検証・デモ専用。実装本体は置かない）

### UPMパッケージ配置と編集対象（Unity側実装本体）

- 実装本体の配置: `UnityEditorMCP/Packages/unity-editor-mcp/**`
  - UPM配布のソース・オブ・トゥルースはこのディレクトリ配下。
  - `Library/PackageCache/**` はPackage Managerの一時領域。編集禁止（再生成で消失）。
  - `UnityEditorMCP/Assets/**` はサンプル/検証向けであり、実装本体や配布対象には含めない。
- 編集手段: 上記ディレクトリは埋め込み（Embedded）パッケージのため、Script系ツールでの編集が可能。
  - 検索例: `UnityMCP__script_search` の `include` に `UnityEditorMCP/Packages/unity-editor-mcp/**/*.cs` を指定
  - 編集例: `UnityMCP__script_edit_patch` または `UnityMCP__script_edit_structured` を `preview=true` で差分確認後に適用
  - 検証: 適用後に `UnityMCP__refresh_assets` → `UnityMCP__wait_for_editor_state` でコンパイル完了を確認
- 注意: レジストリ配布の読み取り専用パッケージを編集する必要がある場合は、まず埋め込み（Embedded）に変換してから対応すること。

### Assets配下の扱い（サンプル/Unityプロジェクト側）

- 目的: サンプル・検証・デモ・手動動作確認用のシーン/プレハブ/補助スクリプトを配置。
- 禁止: 実装本体（ランタイム/エディタ拡張の主要コード）を置かない。UPM配布の対象にも含めない。
- 編集: 必要最小限に留める。スクリプト変更が必要な場合も、可能な限り `Packages/unity-editor-mcp` 側で対応し、Assets側は参照/設定のみで成立させる。

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
