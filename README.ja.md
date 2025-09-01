# Unity Editor MCP

[English](README.md) | 日本語

## 概要

Unity Editor MCP は、LLMクライアントからUnity Editorを自動化します。シンプルなインターフェースで、安全かつ再現性の高いエディタ操作を実現します。

## できること

- エディタ自動化: シーン/ゲームオブジェクト/コンポーネント/プレハブ/マテリアルの作成・変更
- UI自動化: UI要素の探索・操作・状態検証
- 入力シミュレーション: キーボード/マウス/ゲームパッド/タッチ（Input System のみ対応）
- ビジュアルキャプチャ: Game/Scene/Explorer/Window の確定的スクリーンショット、解析も可能
- コードベース認識: 軽量なC#コードインデックスにより、高速なシンボル/検索（Unity未接続でも可）
- プロジェクト制御: 一部のプロジェクト/エディタ設定の読み書き、ログ取得、コンパイル監視

## 接続の仕組み（Unity ↔ MCPサーバー）

- ホスト/ポート: Unity側パッケージが `UNITY_HOST`/`UNITY_PORT`（既定 `localhost:6400`）でTCP待受。
- フロー: Unityプロジェクトを開く → パッケージが待受開始 → MCPクライアントがNodeサーバーを起動 → NodeがUnityへ接続。
- 設定: Configuration章（`project.root`、`project.codeIndexRoot`、`UNITY_MCP_CONFIG`）を参照。
- タイムアウト/リトライ: `reconnectDelay`/`maxReconnectDelay`/`reconnectBackoffMultiplier` による指数バックオフ。
- トラブルシュート: Unityが稼働中か、ポート6400の競合がないか、ホスト/ポート設定が一致しているかを確認。

アーキテクチャ図

```
┌────────────────┐        JSON-RPC (MCP)        ┌──────────────────────┐
│  MCP クライアント │ ───────────────────────────▶ │  Node MCP サーバー     │
│ (Claude/Codex/  │ ◀─────────────────────────── │ (@akiojin/unity-     │
│   Cursor など)  │        ツール応答              │ editor-mcp)          │
└────────────────┘                              └──────────┬───────────┘
                                                         TCP│6400
                                                            ▼
                                                   ┌───────────────────┐
                                                   │  Unity Editor     │
                                                   │ （パッケージがTCP   │
                                                   │   リスナーを起動） │
                                                   └───────────────────┘
```

シーケンス

```mermaid
sequenceDiagram
    participant Client as MCP クライアント
    participant Node as MCP サーバー（Node）
    participant Unity as Unity Editor

    Client->>Node: 接続 / リクエスト（ツール呼び出し）
    Node->>Unity: TCP上のJSON（コマンド）
    Unity-->>Node: 結果 / 進捗 / ログ
    Node-->>Client: 応答
    alt 切断 / タイムアウト
        Node->>Node: 指数バックオフ
        Node->>Unity: 再接続
    end
```

## ディレクトリ構成

- `UnityEditorMCP/`: Unityプロジェクト（Editorブリッジ、ツール、サンプル）
- `mcp-server/`: Unityツールを公開する Node.js MCP サーバー
- `scripts/`: ローカル開発向けヘルパースクリプト

## セットアップ
- 対応バージョン: Unity 2020.3 LTS以降 / Node.js 18+ / npm
- MCPクライアント: Claude Desktop など

インストール
- Unity: Package Manager → Git URL から追加 → `https://github.com/akiojin/unity-editor-mcp.git?path=UnityEditorMCP/Packages/unity-editor-mcp`
- MCPクライアント設定（Claude Desktop例）:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
  - 追記内容:
    ```json
    {
      "mcpServers": {
        "unity-editor-mcp": {
          "command": "npx",
          "args": ["@akiojin/unity-editor-mcp@latest"]
        }
      }
    }
    ```

1) Unity の Package Manager から本パッケージを導入（下記Git URL）
2) Unity プロジェクトを開く（パッケージがポート6400で待受）
3) MCPクライアントを設定して Node サーバーを起動（例は後述）

### 設定（.unity/config.json）

設定は任意で、未設定でも既定値で動作します。存在する場合の読込順は次のとおりです。

- `UNITY_MCP_CONFIG`（設定JSONへの絶対パス）
- `./.unity/config.json`（サーバープロセスのカレントディレクトリ基準）
- `~/.unity/config.json`（ユーザーグローバル）

注意:
- パスはそのまま使用されます。相対パスは設定ファイルの場所ではなく「プロセスのCWD」基準で解決されます。
- `~` や環境変数の展開は行いません。

代表的なキー:
- `project.root`: Unityプロジェクトのルート（`Assets/` を含むディレクトリ）
- `project.codeIndexRoot`: Code Index の出力先（既定: `<project.root>/Library/UnityMCP/CodeIndex`）

例（絶対パス推奨）:

```json
{
  "project": {
    "root": "/absolute/path/to/UnityProject",
    "codeIndexRoot": "/absolute/path/to/UnityProject/Library/UnityMCP/CodeIndex"
  }
}
```

チーム向け（相対）の例 — 常にリポジトリ直下から起動して `process.cwd()` を一定にしてください:

```json
{
  "project": {
    "root": ".",
    "codeIndexRoot": "./Library/UnityMCP/CodeIndex"
  }
}
```

ヒント: CWD依存を避けるには、起動時に `UNITY_MCP_CONFIG=/absolute/path/to/config.json` を指定してください。

#### 設定キー一覧

| キー | 型 | 既定値 | 説明 | 許容値 |
| --- | --- | --- | --- | --- |
| `project.root` | string | 自動検出（Unity接続 or 近傍の `Assets/` を含むディレクトリ） | Unityプロジェクトのルート。相対パスはプロセスのCWD基準。 | — |
| `project.codeIndexRoot` | string | `<project.root>/Library/UnityMCP/CodeIndex` | Code Index の保存先ルート。 | — |
| `unity.host` | string | `process.env.UNITY_HOST` または `localhost` | Unity Editor のTCPサーバーホスト。 | — |
| `unity.port` | number | `process.env.UNITY_PORT` または `6400` | Unity Editor のTCPサーバーポート。 | — |
| `unity.reconnectDelay` | number (ms) | `1000` | 再接続の初期待機時間。 | — |
| `unity.maxReconnectDelay` | number (ms) | `30000` | 再接続バックオフの最大待機時間。 | — |
| `unity.reconnectBackoffMultiplier` | number | `2` | 再接続の指数バックオフ倍率。 | — |
| `unity.commandTimeout` | number (ms) | `30000` | 各Unityコマンドのタイムアウト。 | — |
| `server.name` | string | `unity-editor-mcp-server` | MCPで公開されるサーバー名。 | — |
| `server.version` | string | `0.1.0` | サーバーのバージョン文字列。 | — |
| `server.description` | string | `MCP server for Unity Editor integration` | サーバーの説明。 | — |
| `logging.level` | string | `process.env.LOG_LEVEL` または `info` | 標準エラーへのログ出力レベル。 | `debug` / `info` / `warn` |
| `logging.prefix` | string | `[Unity Editor MCP]` | ログのプレフィックス。 | — |
| `writeQueue.debounceMs` | number (ms) | `process.env.WRITE_DEBOUNCE_MS` または `1200` | 書き込みバッチングのデバウンス時間。 | — |
| `writeQueue.maxEdits` | number | `process.env.WRITE_MAX_EDITS` または `100` | バッチにまとめる最大編集数。 | — |
| `writeQueue.deferDefault` | boolean | `true`（`WRITE_DEFER_DEFAULT` が厳密に `false` の場合のみ `false`） | 既定で書き込みをキューして凝縮する。 | `true` / `false` |
| `search.defaultDetail` | string | `process.env.SEARCH_DEFAULT_DETAIL` または `compact` | 検索の既定詳細度。`compact` は `snippets` のエイリアス。 | `compact` / `metadata` / `snippets` / `full` |
| `search.engine` | string | `process.env.SEARCH_ENGINE` または `naive` | 検索エンジンの実装。 | `naive`（将来的に `treesitter` 予定） |

## スクリーンショット

- Game/Scene/Explorer/Window の各ビューをキャプチャ可能。
- モード: `game` | `scene` | `explorer` | `window`。
- 主なオプション:
  - 解像度: `width`/`height`（Explorerは `camera.width`/`camera.height`）。
  - UI重畳: Game Viewで `includeUI`。
  - Explorerフレーミング: `explorerSettings.camera.*`（autoFrame、FOV、near/far、position/rotation、padding）。
  - 表示補助: `explorerSettings.display.*`（highlightTarget、showBounds、showColliders、showGizmos、backgroundColor、layers）。
  - ターゲット: `explorerSettings.target.*`（gameObject/tag/area/position、includeChildren）。
  - 出力: `outputPath`（`Assets/` 配下に保存）または base64 返却。
- 解析: UI検出や内容サマリも可能。

シーケンス

```mermaid
sequenceDiagram
    participant Client as MCP クライアント
    participant Node as MCP サーバー（Node）
    participant Unity as Unity Editor

    Client->>Node: スクリーンショット要求（モード/オプション）
    Node->>Unity: キャプチャ命令（パラメータ渡し）
    Unity->>Unity: カメラ/レンダリング設定の適用
    Unity-->>Node: 画像データ（ファイルパス or base64）
    Node-->>Client: 結果返却（必要に応じ解析）
```

## 入力シミュレーション

- 対応: Unity Input System のみ対応（新Input Systemパッケージ）。
- 非対応: 旧 Input Manager（Project Settings → Input Manager）。
- 機能: キーボード/マウス/ゲームパッド/タッチの入力をエミュレートして、Play Mode やUI操作をテスト。
- 注意: プロジェクトが Input System を使用していない場合、シミュレーションによるゲーム操作は反映されません。

## コードインデックス

- 保存先: `<project.root>/Library/UnityMCP/CodeIndex/files/`。
- 構成: 各 `.cs` に対して `*.meta.json`（メタ）と `*.symbols.json`（シンボル）のペア（1ファイル=1インデックス）。
- データモデル:
  - Meta: `version` / `path` / `size` / `mtime` / `hash` / `language`。
  - Symbols: `namespace`、`symbols[]`（`kind`（class/method/field/property等）/`name`/`container`/`span`/`modifiers?`/`type?`）。
- パイプライン: `Assets/**.cs` と `Packages/**.cs` を探索 → 解析 → JSONをアトミック書き出し → 連続更新はデバウンス。
- 整合性: 読み取り/検索はインデックスを優先、未インデックス領域は簡易パースでフォールバック。編集後は最終的整合性で更新反映。
- トリガー: アセットリフレッシュ、コンパイル完了、スクリプト適用完了時。

アーキテクチャ

- 責務分離:
  - Unity: Roslyn（Microsoft.CodeAnalysis）でC#を解析。`JsonIndexStore` で各ファイルのJSONを書き出し、アセット変更時に無効化。
  - Node: JSONインデックスを参照してシンボル/検索を実行。インデックスが無い/Unity未接続時はNode側の軽量抽出でフォールバック。
- 精度:
  - UnityはRoslynの構文木から `class/struct/interface/enum/method/property` を抽出し、コンテナ/名前空間/行範囲を付与。
  - 参照検索は可能な限りRoslynの識別子トークンを優先し、コメント/文字列の誤検知を抑制。必要に応じてコンテナ/名前空間でフィルタ。
- 無効化:
  - UnityのAssetPostprocessorが `.cs` のインポート/削除/移動でキャッシュを無効化。再解析でJSONを再生成。

シーケンス

```mermaid
sequenceDiagram
    participant Client as MCP クライアント
    participant Node as MCP サーバー（Index/Tools）
    participant Unity as Unity Editor
    participant Index as Code Index

    Client->>Node: 編集 or 検索リクエスト
    alt 編集フロー
        Node->>Unity: 変更適用
        Unity->>Unity: リフレッシュ / コンパイル
        Node->>Index: 変更ファイルを再インデックス（JSON書き出し）
    else 検索フロー
        Node->>Index: シンボルを参照
        Index-->>Node: シンボル/メタデータ
        Node->>Node: 未インデックスは簡易パースで補完
    end
    Node-->>Client: 結果（編集確定 or 検索ヒット）
```

## その他クライアント

### Codex CLI

Codex の MCP サーバー設定は次のファイルに作成してください。

- macOS/Linux: `~/.codex/servers.json`
- Windows: `%USERPROFILE%\.codex\servers.json`

例:

```json
{
  "mcpServers": {
    "unity-editor-mcp": {
      "command": "npx",
      "args": ["@akiojin/unity-editor-mcp@latest"]
    }
  }
}
```

## トラブルシューティング（簡易）

- UnityのTCPが待受しない: プロジェクトを開き直し／ポート6400の占有を解除。
- Node.jsが接続できない: Unity稼働確認、FW設定、Unity/Nodeのログ確認。
- C#の型が見つからない: アセットをリフレッシュし、コンパイル完了まで待機。

注意: 本READMEに接続設計・スクリーンショット・コードインデックスの要点を集約しました.
