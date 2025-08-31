# Unity Editor MCP

[English](README.md) | 日本語

## 概要

Unity Editor MCP は、LLMクライアントからUnity Editorを操作するためのMCP互換ツールセットです。安全で再現性のあるエディタ自動化を、シンプルなインターフェースで提供します。

## ディレクトリ構成

- `UnityEditorMCP/`: Unityプロジェクト（Editorブリッジ、ツール、サンプル）
- `mcp-server/`: Unityツールを公開する Node.js MCP サーバー
- `docs/`: ドキュメント（ガイド、仕様、トラブルシューティング）
- `scripts/`: ローカル開発向けヘルパースクリプト

## クイックリンク

- セットアップガイド: `docs/setup-guide.md`
- スクリプト処理アーキテクチャ（ハイブリッド）: `docs/script-architecture-hybrid.md`
- Unity MCP Scriptツール運用方針: `docs/agent-guidelines/unity-mcp-script.md`
- 技術仕様: `docs/technical-specification.md`

注意: 設計などの詳細は `docs/` 配下に記載します。READMEはプロジェクト方針により最小構成です。

