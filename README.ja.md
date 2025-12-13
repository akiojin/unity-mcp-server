# Unity MCP Server

[English](README.md) | 日本語

## 概要

Unity MCP Server は、LLMクライアントからUnity Editorを自動化します。シンプルなインターフェースで、安全で再現性の高いエディタ操作を実現します。

## できること

- **エディタ自動化**: シーン/ゲームオブジェクト/コンポーネント/プレハブ/マテリアルの作成・変更
- **UI自動化**: UI要素の探索・操作・状態検証
- **入力シミュレーション**: キーボード/マウス/ゲームパッド/タッチ（Input System のみ対応）
- **ビジュアルキャプチャ**: Game/Scene/Explorer/Window の確定的スクリーンショット
- **コードベース認識**: 同梱 C# LSP により、安全な構造化編集と正確な検索/参照
- **プロジェクト制御**: 一部のプロジェクト/エディタ設定の読み書き、ログ取得、コンパイル状態取得
- **Addressables管理**: アセット登録・整理、グループ管理、ビルド自動化

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
5. **接続テスト** - `system_ping` を実行

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

### 設定ファイルの読み込み順序

1. `UNITY_MCP_CONFIG` 環境変数（絶対パス）
2. カレントディレクトリから上位に探索した `./.unity/config.json`
3. `~/.unity/config.json`（ユーザーグローバル）

### 設定例

```json
{
  "project": {
    "root": ".",
    "codeIndexRoot": "./.unity/cache/code-index"
  }
}
```

### 主要な設定項目

| キー | デフォルト | 説明 |
|-----|---------|-------------|
| `project.root` | 自動検出 | Unityプロジェクトルート（`Assets/` を含むディレクトリ） |
| `unity.port` | `6400` | Unity Editor のTCPポート |
| `unity.mcpHost` | `localhost` | MCPサーバーがUnityに接続するホスト |
| `logging.level` | `info` | ログレベル: `debug`, `info`, `warn` |

詳細な設定リファレンスは [docs/development.md](docs/development.md) を参照してください。

## 利用可能なツール

### システムツール

- `system_ping` - 接続テスト
- `system_refresh_assets` - Unityアセットの更新

### GameObjectツール

- `gameobject_create` - GameObject作成
- `gameobject_find` - 名前/タグ/レイヤーで検索
- `gameobject_modify` - プロパティ変更
- `gameobject_delete` - GameObject削除
- `gameobject_get_hierarchy` - シーンヒエラルキー取得

### シーンツール

- `scene_create`, `scene_load`, `scene_save`, `scene_list`, `scene_info_get`

### コンポーネントツール

- `component_add`, `component_remove`, `component_modify`, `component_list`

### スクリプトツール

- `script_read` - C#ファイル読み取り
- `script_search` - コード検索
- `script_symbols_get` - ファイルのシンボル取得
- `script_symbol_find` - 名前でシンボル検索
- `script_refs_find` - 参照検索
- `script_edit_structured` - 構造化コード編集
- `script_edit_snippet` - 小さなコード編集

### スクリーンショットツール

- `screenshot_capture` - Game/Scene/Explorer/Window ビューをキャプチャ
- `screenshot_analyze` - キャプチャ画像の解析

### 入力ツール

- `input_keyboard`, `input_mouse`, `input_gamepad`, `input_touch`

### プロファイラーツール

- `profiler_start`, `profiler_stop`, `profiler_status`, `profiler_get_metrics`

### その他のツール

- `console_read`, `console_clear` - Unityコンソール
- `test_run`, `test_get_status` - Unityテスト実行
- `package_manage` - Unityパッケージ管理
- `addressables_manage`, `addressables_build` - Addressables管理

## トラブルシューティング

### 接続の問題

| 症状 | 原因 | 解決策 |
|------|------|--------|
| `Connection timeout` | Unity未起動 | Unity Editorを起動 |
| `ECONNREFUSED` | ポートブロック | ファイアウォール確認、ポート6400確認 |
| `Unity TCP disconnected` | プロトコル不一致 | Unity Consoleでエラー確認 |

### npxの問題

**ENOTEMPTYエラー**:

```bash
rm -rf ~/.npm/_npx
```

**初回実行の遅延**: パッケージを事前キャッシュ:

```bash
npx @akiojin/unity-mcp-server@latest --version
```

### デバッグログ

```bash
LOG_LEVEL=debug npx @akiojin/unity-mcp-server@latest
```

### WSL2/DockerからWindows上のUnityへの接続

WSL2/Dockerから接続する場合は `host.docker.internal` を使用:

```json
{
  "mcpServers": {
    "unity-mcp-server": {
      "command": "npx",
      "args": ["@akiojin/unity-mcp-server@latest"],
      "env": {
        "UNITY_MCP_HOST": "host.docker.internal",
        "UNITY_PORT": "6400"
      }
    }
  }
}
```

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
├── config.json      # ワークスペース設定
└── capture/         # スクリーンショット/動画（Git管理外）

UnityMCPServer/
├── Packages/unity-mcp-server/  # UPMパッケージ（ソース）
└── Assets/                     # サンプルのみ

mcp-server/          # Node MCPサーバー

csharp-lsp/          # RoslynベースLSP CLI
```

## 機能ドキュメント

全機能はSDD形式で文書化: [`specs/`](specs/)

## コントリビューション

開発環境のセットアップ、コミットガイドライン、PRプロセスは [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 開発者向けドキュメント

内部開発詳細（Spec Kit、リリースプロセス、LLM最適化）:

- [docs/development.md](docs/development.md)
- [CLAUDE.md](CLAUDE.md)

## ライセンス

MIT License - [LICENSE](LICENSE) ファイルを参照。
