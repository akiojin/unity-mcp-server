# Code Index（設計概要）

Unity プロジェクトの C# 記号インデックスをローカルで構築し、検索やシンボル取得の高速化に利用します（Unity Editor 未接続でも参照可能）。

本ドキュメントは仕組みの概要のみを記載します。

## 仕組みの概要

- `Assets` および `Packages` 配下の `*.cs` を走査
- 軽量パーサで記号抽出し、`files/<safe>.symbols.json` と `files/<safe>.meta.json` を作成
- Node 側の参照は既存のローダー（`src/utils/codeIndex.js`）を利用

---

## 目的と非目標

- 目的: LLM が最小トークンで素早くソース構造を把握できるよう、静的に参照可能な軽量インデックス（JSON）を提供する。
- 非目標: 完全なC#コンパイル互換の解析（Semantic/CFG/IL など）。必要十分な粒度（クラス/メソッド/フィールド/プロパティ/名前空間）に限定。

## データモデル（JSON スキーマ概要）

各ソースファイルに対し2つの JSON を生成します。

1) `<safe>.meta.json`
- `version`: インデックススキーマのバージョン（例: 1）
- `path`: 実ファイルパス（プロジェクト内相対）
- `size`: バイトサイズ
- `mtime`: 最終更新（epoch ms）
- `hash`: 内容ハッシュ（xxhash/sha1 等、実装依存）
- `language`: `csharp`

2) `<safe>.symbols.json`
- `path`: 実ファイルパス
- `namespace`: 先頭名前空間（複数対応可）
- `symbols`: 配列（下記）
  - `kind`: `class` | `struct` | `interface` | `enum` | `method` | `field` | `property`
  - `name`: 記号名
  - `container`: 親記号（例: クラス名）
  - `span`: `{ startLine, endLine, startCol?, endCol? }`
  - `modifiers?`: `public`/`private`/`static`/`partial` 等
  - `returnType?`/`type?`: 型名（必要に応じて）

備考:
- スキーマは後方互換を意識し、`version` を用いたマイグレーションを許容します。
- 解析失敗時は部分的に出力（`symbols` 空配列）とし、メタ情報で検知可能にします。

## ストレージ構成

- ルート: `Library/UnityMCP/CodeIndex/`
- JSON: `Library/UnityMCP/CodeIndex/files/<safe>.{meta|symbols}.json`
- オプション: `files/pathTable.json`（高速ルックアップ用のパス→セーフ名対応表）

設計方針:
- 1ファイル1インデックス（差分反映が容易、局所的再生成が可能）
- 小さな JSON 群に分割し、LLM の読み取りコストを最小化

## インデクシング・パイプライン

1. ソース探索: `Assets/**.cs` と `Packages/**.cs` を列挙（除外グロブ対応）
2. パース: 軽量トークナイザ/パーサで記号抽出（早戻り・緩やかな容認）
3. 書き出し: 一時ファイルに吐き出してからアトミックリネーム（部分書き込み防止）
4. デバウンス: 連続更新はバッチ化（スロットリング）
5. 検証: メタ情報とシンボルの整合性チェック（最低限）

## 更新トリガーと整合性

- 更新トリガー: Unityのアセットリフレッシュ、コンパイル完了イベント、`script_*` の適用完了、手動再生成
- 整合性モデル: 最終的整合性（eventual）。読み取りは CodeIndex を優先、存在しない場合はフォールバック解析
- 衝突回避: ファイルロックは行わず、アトミックリネーム＋メタの `mtime/hash` で新旧を判定

## パフォーマンス特性

- 目標: 数千〜数万ファイルでのサブ秒～数秒応答（キャッシュヒット時）
- メモリ: JSONは分割保存。読み取りは必要ファイルのみ（ストリーミング）
- 閾値: 10万ファイル規模で遅延が顕著化する場合、次段の強化策を検討
  - 例: tree-sitter 導入、バイナリ化（MessagePack 等）、前方索引（グローバル記号テーブル）

## 失敗モードと復旧

- 部分書き込み: 一時ファイル→リネームで回避
- 破損JSON: 次回再生成で上書き。ローダーは破損をスキップしログ出力
- 不一致（mtime/hash）: 古いエントリを無視（再生成）

## セキュリティ/スコープ

- 走査対象はプロジェクト内 `.cs` のみ。外部パスは扱わない
- 機密情報は保存しない（シンボル名・位置情報のみ）

## 拡張ポイント

- 記号種の拡張（イベント/デリゲート/属性など）
- 参照情報の別ファイル化（`refs.json`）
- グローバルインデックス（パス→ID、ID→シンボルの二段テーブル）

## 統合ポイント（読み取り系）

- `UnityMCP__script_search`: pathTable/メタを用いた高速パス解決とスニペット抽出
- `UnityMCP__script_symbol_find` / `script_symbols_get`: `symbols.json` の参照を優先
- `UnityMCP__script_refs_find`: 将来の `refs.json` 拡張で対応

## バージョニングとマイグレーション

- `meta.json` と `symbols.json` に `version` を付与
- 破壊的変更時は新バージョンの併存を許容（ローダーは最新版を優先）
- 旧版はガベージコレクションの対象（起動時/一定間隔で清掃）
