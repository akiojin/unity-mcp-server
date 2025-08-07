# Unity Editor MCP プロジェクト概要

## プロジェクトの目的
Unity Editor MCP (Model Context Protocol) は、ClaudeやCursorなどのAIアシスタントがUnity Editorと直接対話できるようにするツールです。これにより、AI支援によるゲーム開発と自動化が可能になります。

## 技術スタック
- **言語**: JavaScript (Node.js MCPサーバー) / C# (Unityパッケージ)
- **フレームワーク**: Model Context Protocol SDK
- **Unity**: 2020.3 LTS以降
- **Node.js**: 18.0.0以降
- **依存関係**: 
  - @modelcontextprotocol/sdk (Node.js側)
  - Newtonsoft.Json (Unity側)

## プロジェクト構造
```
unity-editor-mcp/
├── mcp-server/          # Node.js MCPサーバー
│   ├── src/
│   │   ├── core/        # サーバーコア、Unity接続
│   │   ├── handlers/    # 各種ツールハンドラー
│   │   ├── tools/       # ツール定義
│   │   └── utils/       # ユーティリティ
│   └── package.json
├── unity-editor-mcp/    # Unityパッケージ
│   └── Editor/
│       ├── Core/        # UnityEditorMCP メインクラス
│       ├── Handlers/    # Unity側のハンドラー
│       ├── Logging/     # ログキャプチャシステム
│       └── Models/      # データモデル
└── docs/               # ドキュメント
```

## 主要コンポーネント

### Node.js側 (mcp-server)
- **UnityConnection**: TCP経由でUnityと通信
- **ToolHandlers**: 各種ツールの実装
- **EnhancedReadLogsToolHandler**: 高度なログ読み取り機能

### Unity側 (unity-editor-mcp)
- **UnityEditorMCP**: TCPリスナーとコマンド処理
- **ConsoleHandler**: コンソール操作とログ読み取り
- **LogCapture**: ログキャプチャシステム

## 通信アーキテクチャ
1. Unity EditorがTCPサーバー（ポート6400）を起動
2. Node.js MCPサーバーがTCPクライアントとして接続
3. JSONベースのコマンド/レスポンス通信
4. リアルタイムのログキャプチャとフィルタリング