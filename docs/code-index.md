# Code Index の手動生成

Unity プロジェクトの C# 記号インデックスをローカルで一括生成できます。Unity Editor 未接続でも動作します。

- 実行場所: `mcp-server` ディレクトリ
- 出力先: `Library/UnityMCP/CodeIndex/files`（自動検出された Unity プロジェクト配下）

## 使い方

1. `mcp-server` ディレクトリへ移動
2. Unity プロジェクトルートが自動検出できない場合は環境変数を指定:
   - macOS/Linux: `UNITY_PROJECT_ROOT="/path/to/UnityEditorMCP" npm run build:index`
   - Windows(PowerShell): `$env:UNITY_PROJECT_ROOT="C:/path/to/UnityEditorMCP"; npm run build:index`
   - Windows(CMD): `set UNITY_PROJECT_ROOT=C:/path/to/UnityEditorMCP && npm run build:index`
3. そのままで検出できる環境では `npm run build:index` だけでOK

完了すると、`*.meta.json` と `*.symbols.json` が生成され、`script_*` 系の検索やシンボル取得が CodeIndex を優先して高速化されます。

## 仕組みの概要

- `Assets` および `Packages` 配下の `*.cs` を走査
- 軽量パーサで記号抽出し、`files/<safe>.symbols.json` と `files/<safe>.meta.json` を作成
- Node 側の参照は既存のローダー（`src/utils/codeIndex.js`）を利用

## トラブルシュート

- `script_index_status` が `totalFiles: 0` の場合は、プロジェクトルート誤認の可能性があります。
  - サーバ起動やビルド時に `UNITY_PROJECT_ROOT` を Unity プロジェクト直下（`Assets` が直下にあるディレクトリ）へ設定してください。
  - 例: `UNITY_PROJECT_ROOT=/repo/UnityEditorMCP`
