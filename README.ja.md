# Unity Editor MCP

[English](README.md) | 日本語

## 概要

Unity Editor MCP は、LLMクライアントからUnity Editorを操作するためのMCP互換ツールセットです。安全で再現性のあるエディタ自動化を、シンプルなインターフェースで提供します。

## ディレクトリ構成

- `UnityEditorMCP/`: Unityプロジェクト（Editorブリッジ、ツール、サンプル）
- `mcp-server/`: Unityツールを公開する Node.js MCP サーバー
- `docs/`: ドキュメント（ガイド、仕様、トラブルシューティング）
- `scripts/`: ローカル開発向けヘルパースクリプト

## クイックスタート

- 対応バージョン: Unity 2020.3 LTS以降 / Node.js 18+ / npm
- MCPクライアント: Claude Desktop など

インストール
- Unity: Package Manager → Git URL から追加 → `https://github.com/akiojin/unity-editor-mcp.git?path=unity-editor-mcp`
- MCPクライアント設定（Claude Desktop例）:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
  - 追記内容:
    ```json
    {
      "mcpServers": {
        "unity-editor-mcp": {
          "command": "npx",
          "args": ["unity-editor-mcp@latest"]
        }
      }
    }
    ```

使用フロー
- Unityプロジェクトを開く（TCPリスナーがポート6400で起動）
- MCPクライアントからツールを呼び出す（ping/scene/script系など）

## 使用例（最小）

- UIボタンで処理を呼ぶ:
  - `Canvas` に `Button` を追加し、バインダー側でゲームロジックを呼び出す。
  - スクリプトは `script_edit_patch` で編集し、`refresh_assets` してコンパイル完了を待つ。
- スクリーンショット取得:
  - `capture_screenshot` を `captureMode:"game"`（`includeUI:false` も指定可）で呼び出す。
- 入力のシミュレーション:
  - `simulate_keyboard` / `simulate_mouse` / `simulate_gamepad` を利用してUIやゲーム挙動をテスト。

## クイックリンク

- セットアップガイド: `docs/setup-guide.md`
- スクリプト処理アーキテクチャ（ハイブリッド）: `docs/script-architecture-hybrid.md`
- 技術仕様: `docs/technical-specification.md`

## ガイドライン（重要）

- C#の操作はUnity MCPのScript系ツール（`script_search`/`script_read`/`script_edit_patch`/`script_replace_pattern`/`script_edit_structured`）を使用。
- 変更の検証順序: preview → 適用 → `refresh_assets` → `wait_for_editor_state`（`isCompiling:false`まで）。
- 対象パスは `UnityEditorMCP/Assets/**` に限定。

## トラブルシューティング（簡易）

- UnityのTCPが待受しない: プロジェクトを開き直し／ポート6400の占有を解除。
- Node.jsが接続できない: Unity稼働確認、FW設定、Unity/Nodeのログ確認。
- Script系で型が見つからない: アセットをリフレッシュし、コンパイル完了まで待機。

注意: 設計などの詳細は `docs/` 配下に記載します。READMEはプロジェクト方針により最小構成です。
