# Unity MCP Server

[English](README.md) | 日本語

## 概要

Unity MCP Server は、LLMクライアントからUnity Editorを自動化します。シンプルなインターフェースで、安全で再現性の高いエディタ操作を実現します。

## できること

- **エディタ自動化**: シーン/ゲームオブジェクト/コンポーネント/プレハブ/マテリアルの作成・変更
- **UI自動化**: UI要素の探索・操作・状態検証
- **入力シミュレーション**: キーボード/マウス/ゲームパッド/タッチ（Input System のみ対応）
- **ビジュアルキャプチャ**: Game/Scene/Explorer/Window の確定的スクリーンショット
- **コードベース認識**: 同梱 C# LSP により、安全な構造化編集と正確な検索/参照（`.sln` ファイル不要）
- **プロジェクト制御**: 一部のプロジェクト/エディタ設定の読み書き、ログ取得、コンパイル状態取得
- **Addressables管理**: アセット登録・整理、グループ管理、ビルド自動化

## パフォーマンス

コードインデックスツールは標準ファイル操作を上回る性能を発揮:

| 操作         | コードインデックスツール | 標準ツール | 優位性                     |
| ------------ | ------------------------ | ---------- | -------------------------- |
| シンボル検索 | `script_symbol_find`     | `grep`     | **瞬時** vs 350ms          |
| 参照検索     | `script_refs_find`       | `grep`     | **構造化**された結果       |
| コード検索   | `script_search`          | `grep`     | **3〜5倍小さい**レスポンス |

主な利点:

- **128,040ファイル**を100%カバレッジでインデックス化
- **ノンブロッキング**なバックグラウンドインデックスビルド（Worker Threads）
- **LLM最適化**されたページネーションとサイズ制限付き出力

> 詳細なベンチマーク結果は [docs/benchmark-results-2025-12-13.md](docs/benchmark-results-2025-12-13.md) を参照

## 要件

- Unity 2020.3 LTS以降
- Node.js 18.x / 20.x / 22.x LTS（23以上は非対応）
- Claude Desktop または MCP対応クライアント

## インストール

### Unityパッケージ

Package Manager → Git URL から追加:

```
https://github.com/akiojin/unity-mcp-server.git?path=UnityMCPServer/Packages/unity-mcp-server
```

または OpenUPM:

```bash
openupm add com.akiojin.unity-mcp-server
```

### MCPクライアント設定

MCPクライアントを設定（Claude Desktop の例）:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "unity-mcp-server": {
      "command": "npx",
      "args": ["@akiojin/unity-mcp-server@latest"]
    }
  }
}
```

### HTTPモード（HTTP接続のみ許可されたネットワーク向け）

```bash
npx @akiojin/unity-mcp-server --http 6401 --no-telemetry
curl http://localhost:6401/healthz
```

## クイックスタート

1. **Unityパッケージをインストール**（Git URL または OpenUPM）
2. **MCPクライアントを設定**（上記JSONを追加）
3. **Unityプロジェクトを開く**（パッケージがポート6400でTCPリスナーを起動）
4. **MCPクライアントを起動**（Nodeサーバーに接続）
5. **接続テスト** - `ping` を実行

> ヒント: `npx @akiojin/unity-mcp-server@latest` を使うとクローンなしで最新ビルドを実行できます。

## アーキテクチャ

```
┌────────────────┐        JSON-RPC (MCP)        ┌──────────────────────┐
│  MCP クライアント │ ───────────────────────────▶ │  Node MCP サーバー     │
│ (Claude/Codex/  │ ◀─────────────────────────── │ (@akiojin/unity-     │
│   Cursor など)  │        ツール応答              │ mcp-server)          │
└────────────────┘                              └──────────┬───────────┘
                                                         TCP│6400
                                                            ▼
                                                   ┌───────────────────┐
                                                   │  Unity Editor     │
                                                   │ （パッケージがTCP   │
                                                   │   リスナーを起動） │
                                                   └───────────────────┘
```

## 設定

設定は任意です。設定ファイルがなくてもデフォルト値で動作します。

Node 側は **環境変数**、Unity 側の host/port は **Project Settings** で設定します。

詳細は [docs/configuration.md](docs/configuration.md) を参照してください。

## ツール探索

Unity MCP Server は **100+ ツール**を提供します。`search_tools` を使って目的のツールを素早く探すのが推奨です。

ツール探索とコードインデックス運用は [docs/tools.md](docs/tools.md) を参照してください。

## Claude Code スキル

このパッケージには、108以上のツールを効果的に使用するためのワークフロー指向のClaude Codeスキルが含まれています。

### 利用可能なスキル

| スキル                         | 説明                                                                                    | トリガーキーワード                                                |
| ------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `mcp-server-development`       | MCPサーバー（TypeScript SDK）の開発、ツール/リソース/プロンプト実装、JSON-RPCパターン   | "MCPサーバー", "ツール実装", "JSON-RPC", "TypeScript"             |
| `unity-csharp-editing`         | C#スクリプト編集、検索、TDDワークフローでのリファクタリング                             | "C#編集", "スクリプト検索", "リファクタリング"                    |
| `unity-scene-management`       | シーン、GameObject、コンポーネント管理                                                  | "シーン作成", "GameObject", "コンポーネント追加"                  |
| `unity-playmode-testing`       | プレイモード制御、入力シミュレーション、UI自動化                                        | "プレイモード", "入力シミュレーション", "UIクリック"              |
| `unity-asset-management`       | プレハブ、マテリアル、Addressables管理                                                  | "プレハブ作成", "マテリアル", "Addressables"                      |
| `unity-editor-imgui-design`    | Unity Editor拡張向けIMGUI（EditorWindow/Inspector/PropertyDrawer）※ゲームUI用途ではない | "EditorWindow", "カスタムインスペクタ", "PropertyDrawer", "IMGUI" |
| `unity-game-ugui-design`       | ゲームUI向けuGUI（Canvas/RectTransform/Anchors）設計                                    | "uGUI", "Canvas", "RectTransform", "アンカー", "HUD"              |
| `unity-game-ui-toolkit-design` | ゲームUI向けUI Toolkit（UXML/USS/Flexbox）設計                                          | "UI Toolkit", "UXML", "USS", "VisualElement", "Flexbox"           |

### インストール

Claude Code CLIからGitHubプラグインとしてインストール:

```bash
# ステップ1: マーケットプレイスを追加
/plugin marketplace add akiojin/unity-mcp-server

# ステップ2: プラグインをインストール
/plugin install unity-mcp-server@unity-mcp-server
```

または、`.claude/skills/` ディレクトリを手動でプロジェクトにコピーしてください。

### 使い方

関連キーワードを含むメッセージで自動的にスキルがアクティブになります。直接呼び出すこともできます:

```
# C#編集ワークフローについて質問
「Unity C#スクリプトの編集方法は？」

# シーン管理について質問
「基本的なライティングを含む新しいシーンを作成して」

# テストについて質問
「プレイモードでキーボード入力をシミュレートするには？」
```

## トラブルシューティング

詳細は [docs/troubleshooting/README.md](docs/troubleshooting/README.md) を参照してください。

## OpenUPM スコープドレジストリ

OpenUPMパッケージを使用するには、プロジェクトにスコープドレジストリを追加:

### Project Settings から

1. `Edit > Project Settings > Package Manager`
2. **Scoped Registries** で **+** をクリック
3. 追加:
   - **Name**: `OpenUPM`
   - **URL**: `https://package.openupm.com`
   - **Scopes**: `com.akiojin`, `com.akiojin.unity-mcp-server`

### manifest.json から

```json
"scopedRegistries": [
  {
    "name": "OpenUPM",
    "url": "https://package.openupm.com",
    "scopes": ["com.akiojin", "com.akiojin.unity-mcp-server"]
  }
]
```

## リポジトリ構成

```
.unity/
├── cache/           # ローカルキャッシュ（Git管理外）
└── capture/         # スクリーンショット/動画（Git管理外）

UnityMCPServer/
├── Packages/unity-mcp-server/  # UPMパッケージ（ソース）
└── Assets/                     # サンプルのみ

mcp-server/          # Node MCPサーバー

csharp-lsp/          # RoslynベースLSPツール
```

## 機能ドキュメント

全機能はSDD形式で文書化: [`specs/`](specs/)

## コントリビューション

開発環境のセットアップ、コミットガイドライン、PRプロセスは [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 開発者向けドキュメント

内部開発詳細（Spec Kit、リリースプロセス、LLM最適化）:

- [docs/README.md](docs/README.md)
- [docs/development.md](docs/development.md)
- [CLAUDE.md](CLAUDE.md)

## ライセンス

MIT License - [LICENSE](LICENSE) ファイルを参照。
