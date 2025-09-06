# Unity Editor MCP

AI アシスト開発のための Model Context Protocol (MCP) に対応した Unity エディタ連携パッケージです。

本パッケージは、GameObject のコンポーネント列挙・追加・削除・変更などのエディタ操作を MCP 互換コマンドとして提供し、IDE やエージェントとの連携を可能にします。

## インストール

- Unity Package Manager で「Add package from Git URL…」を選択します。
- 次の URL（UPM サブフォルダ指定）を使用します。

```
https://github.com/akiojin/unity-mcp-server.git?path=UnityMCPServer/Packages/unity-mcp-server
```

## 特長

- コンポーネント操作: GameObject 上のコンポーネントの追加・削除・変更・一覧取得。
- 型安全な値変換: Vector2/3、Color、Quaternion、enum などの Unity 型をサポート。
- MCP コマンド向けに拡張可能なエディタハンドラ群。

## ディレクトリ構成

- `Editor/`: MCP コマンドハンドラやエディタロジック。
- `Tests/`: エディタ用テスト。
- `docs/`: ドキュメント（英語 README と日本語 README を含む）。

## ライセンス

MIT

## リポジトリ

GitHub: https://github.com/akiojin/unity-mcp-server
