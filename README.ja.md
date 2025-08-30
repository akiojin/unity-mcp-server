# Unity Editor MCP

Unity EditorのModel Context Protocol (MCP)サーバー実装

[English](README.md)

## 概要

Unity Editor MCPは、Unity EditorをMCP経由で制御可能にし、AIアシスタント（Claude等）がUnityプロジェクトと直接やり取りできるようにします。

## 機能

- **GameObject操作**: GameObjectの作成、変更、削除、検索
- **Scene管理**: シーンの作成、読み込み、保存、切り替え
- **Script系ツール**: C#コードの読み取り、検索、編集、シンボル解析
- **Component管理**: コンポーネントの追加、削除、設定変更
- **Asset操作**: アセットの作成、インポート設定、依存関係分析
- **Prefab操作**: プレハブの作成、編集、インスタンス化
- **Material管理**: マテリアルの作成、シェーダー設定、プロパティ変更
- **Play Mode制御**: エディタの再生、一時停止、停止
- **Console操作**: コンソールログの読み取りとクリア
- **Screenshot**: ゲームビュー、シーンビュー、カスタムビューのキャプチャ

## インストール

### 前提条件

- Unity 2021.3 LTS以降
- Node.js 18以降
- npm 9以降

### セットアップ手順

1. **Unity Packageのインストール**
   ```bash
   # Unity Package Managerで以下を追加
   https://github.com/your-repo/unity-editor-mcp.git#package
   ```

2. **Node.jsサーバーのセットアップ**
   ```bash
   cd mcp-server
   npm install
   npm link
   ```

3. **MCPクライアント設定**
   
   Claudeデスクトップアプリの設定ファイルに追加:
   
   ```json
   {
     "mcpServers": {
       "unity-editor-mcp": {
         "command": "npx",
         "args": ["unity-editor-mcp"],
         "env": {
           "UNITY_PROJECT_ROOT": "/path/to/your/unity/project"
         }
       }
     }
   }
   ```

## 使用方法

1. Unity Editorでプロジェクトを開く
2. MCPクライアント（Claude等）を起動
3. Unity関連のタスクをAIアシスタントに依頼

### 使用例

```
"新しいGameObjectを作成して、位置を(1, 2, 3)に設定してください"
"現在のシーンにあるすべてのCameraを探してください"
"PlayerControllerスクリプトのUpdateメソッドを表示してください"
```

## トラブルシューティング

### ポート使用中エラー

1. 他のUnityインスタンスが実行中でないか確認
2. すべてのUnityインスタンスを閉じて再起動
3. 問題が続く場合、ポート6400を使用している他のプロセスを確認

### 接続失敗

1. Unity Editorが実行中でパッケージがインストールされていることを確認
2. Unityコンソールでエラーメッセージを確認
3. Node.jsサーバーが実行中であることを確認
4. MCPクライアント設定のパスが絶対パスであることを確認

### Node.jsサーバーが起動しない

1. Node.js 18以降がインストールされていることを確認: `node --version`
2. mcp-serverディレクトリで `npm install` を実行
3. コンソールのエラーメッセージを確認

### Script系ツールの設定

#### Docker環境
Docker環境では、MCPサーバーは自動的に `/unity-editor-mcp/UnityEditorMCP` のUnityプロジェクトを検出します。追加設定は不要です。

#### カスタムプロジェクトパス
Unityプロジェクトが別の場所にある場合、`UNITY_PROJECT_ROOT` 環境変数を設定します：

```bash
export UNITY_PROJECT_ROOT=/path/to/your/unity/project
```

#### Script系ツールのトラブルシューティング
Script系ツール（script_read、script_search等）が「File not found」を返す場合：

1. **プロジェクトパスの検出を確認**
   - `script_index_status` を実行してファイルが検出されているか確認
   - `totalFiles` が0より大きいことを確認

2. **コードインデックスの存在を確認**
   - `Library/UnityMCP/CodeIndex/files/` にファイルが存在することを確認
   - インデックスファイルは `.symbols.json` と `.meta.json` 拡張子を持つ

3. **コンパイルが成功していることを確認**
   - インデックスが構築されるにはUnityが正常にコンパイルする必要がある
   - Unityコンソールでコンパイルエラーを確認

4. **パス変更後はMCPサーバーを再起動**
   - `UNITY_PROJECT_ROOT` を変更した場合、MCPサーバーを再起動
   - サーバーは起動時にプロジェクトパスをキャッシュする

## 貢献

開発ガイドラインについては [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。