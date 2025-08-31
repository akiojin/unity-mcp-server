# Code Index（設計概要）

Unity プロジェクトの C# 記号インデックスをローカルで構築し、検索やシンボル取得の高速化に利用します（Unity Editor 未接続でも参照可能）。

本ドキュメントは仕組みの概要のみを記載します。

## 仕組みの概要

- `Assets` および `Packages` 配下の `*.cs` を走査
- 軽量パーサで記号抽出し、`files/<safe>.symbols.json` と `files/<safe>.meta.json` を作成
- Node 側の参照は既存のローダー（`src/utils/codeIndex.js`）を利用
