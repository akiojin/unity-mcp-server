# スクリプト処理のハイブリッド設計（Node主導）

本ドキュメントは、スクリプト系（読み取り・検索・インデックス）をNode.js側で主導し、変更適用はUnity側に集約するハイブリッド設計方針を示す。

## 目的
- 最高速度: 検索/読取をUnity非依存・非同期で即応する
- トークン最小: コンパクト応答（ID化・行範囲圧縮・ページング）で最小化
- 安全性: 変更適用はUnityのAssetDatabase/CompilationPipelineに集約し整合性を担保

## 責務分離
- Node.js（MCP Server）
  - 読取: `script_read`（範囲/最大バイト）
  - 検索: `script_search`（substring/regex/glob、ページング/早期終了）
  - キャッシュ: ファイル一覧＋mtime/sizeの軽量キャッシュ、必要に応じて`Library/UnityMCP/CodeIndex`のJSONをオンデマンド読取
  - 応答整形: `detail=metadata|snippets|full`、`pathTable`＋`fileId`＋`lineRanges`（RLE）
- Unity（Editor拡張）
  - 適用: 構造化編集/リネーム/置換の適用、`StartAssetEditing/StopAssetEditing`＋単一`Refresh`
  - 状態: `get_compilation_state`（既存）＋ `get_editor_info`（今回追加）
  - 将来: `get_editor_state`（compiling/isPlaying/canApply）

## 通信不能タイミングの考慮
- 検索/読取は完全にNode側で完結（Unityへの接続不要）。
- 書き込みは「状態ゲート＋キュー＋デバウンス＋一括適用」。UnityがIdleの時のみ適用し、`Refresh`は1回。

## フロー概要
1) 検索/読取: Nodeがプロジェクトルート配下（`Assets/`, `Packages/`）を直接走査
2) プレビュー/要約: コンパクト応答既定、スニペットは必要時のみ
3) 適用: Unityへまとめて送信→`StartAssetEditing`〜適用〜`StopAssetEditing`→`Refresh`（1回）

## 初期実装（Phase 1）
- Unity: `get_editor_info` 追加（`projectRoot`, `assetsPath`, `packagesPath`, `codeIndexRoot`）
- Node: `script_read`/`script_search`をローカル実装に切替
  - 遅延＋LRU（将来）
  - 早期終了（`pageSize`/`maxMatchesPerFile`/`maxBytes`）
  - サイズ上限（`maxFileSizeKB`）

## スケール指針
- 数千〜数万ファイル: JSON＋軽量インメモリで対応
- 閾値超過時（>5–10万ファイル、平均レイテンシ>300ms等）: tree-sitter導入やバイナリ化を段階投入

## 互換と安全
- 既存ツール名と引数は維持（Node側実装で同等の応答形）
- 書き込みはUnityに残し、AssetDatabase/Importer/コンパイル整合を確保

