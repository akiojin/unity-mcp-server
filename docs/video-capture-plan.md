# 動画保存機能 計画書

このドキュメントは、Unity Editor MCP に動画保存（録画）機能を追加するための計画をまとめたものです。設計や実装はシンプルさを最優先しつつ、ユーザビリティと開発者体験の品質を担保します。

## 目的

- MCP コマンドから録画を開始/停止できるようにし、解像度・FPS・保存先・音声有無などを指定可能にする
- 既存の `capture_screenshot` の設計・操作性と一貫性を保つ

## スコープ

- 対象: Unity Editor 上の Game/Scene/Window 視点の録画
- 出力形式: `mp4`（H.264）を第一候補、代替で `webm` または画像連番（PNG）
- 音声: 任意（ゲームオーディオ/無音）
- 互換: 既存 MCP コマンドのレスポンス形式に準拠

非スコープ（初期版）
- 複数同時録画（並列録画）は未対応（1セッション制限）
- 外部入力（マイク等）の同梱設定 UI は提供しない（将来検討）

## ユースケース（例）

- 手動またはスクリプトから短時間のプレイ録画を作成し、検証・共有する
- 自動テスト中に視覚的なリグレッションを検出するための記録を残す

## 要件（概要）

- 録画制御: `start` / `stop` / `status` の 3 コマンド
- 画質指定: `width` / `height` / `fps` / `bitrateKbps`
- 出力指定: `format`（`mp4|webm|png_sequence`）, `outputPath`（省略時は既定パス）
- 音声指定: `audio`（bool）, `audioSource`（任意）, `includeUI`（GameView 時）
- キャプチャ対象: `captureMode`（`game|scene|window|explorer`）
- 安定性: 長時間録画のメモリ/容量対策、重複セッション防止、Play/Edit 状態に応じた制御

## アーキテクチャ方針

- 優先: Unity Recorder（`com.unity.recorder`）で `mp4` 出力（安定・保守容易）
- 代替: `ffmpeg` が利用可能なら Raw フレームをパイプしてエンコード
- 最小保証（フォールバック）: 画像連番（PNG）
- 既存の `ScreenshotHandler` のカメラ選択・フレーミング・レイヤーフィルタを共用

## コマンド仕様（案）

### `capture_video_start`（最終仕様）

- 必須: `outputPath`（省略時は `Assets/Screenshots/recordings/<timestamp>.mp4` を自動生成）
- 任意:
  - `captureMode`: `game|scene|window|explorer`（既定: `game`）
  - `width`, `height`（既定: GameView/SceneView 実サイズ or 明示指定）
  - `fps`（既定: 30）
  - `bitrateKbps`（既定: 8000、`format:webm` 時は `vp9` 推奨で調整）
  - `format`: `mp4|webm|png_sequence`（既定: `mp4`）
  - `includeUI`（既定: true, GameView のみ有効）
  - `audio`（既定: false、true時はゲームオーディオ）
  - `audioSource`（任意、無指定はゲームオーディオ）
  - `maxDurationSec`（既定: 無制限, 指定時は自動停止、上限超過は `autoStopped:true`）
- 返却: `{ recordingId, outputPath, actualWidth, actualHeight, fps, startedAt }`

### `capture_video_stop`（最終仕様）

- 引数: `recordingId`（省略時は最新のアクティブセッション）
- 返却: `{ recordingId, outputPath, durationSec, frames, warnings }`

### `capture_video_status`（最終仕様）

- 返却: `{ isRecording, recordingId?, elapsedSec?, frames?, outputPath?, captureMode?, fps? }`

エラーコード方針（共通）

- `E_ALREADY_RECORDING`: 録画中に `start`
- `E_NOT_RECORDING`: 非録画中に `stop`
- `E_INVALID_MODE`: `captureMode` 無効
- `E_INVALID_SIZE`: 解像度が 0 または負値
- `E_PATH_DENIED`: 出力先への書込不可
- `E_DEP_MISSING`: 依存（Recorder/ffmpeg）不足

## 依存と導入方針

- 第一候補: `com.unity.recorder` を `Packages/manifest.json` に追加（存在チェック→未導入なら追加）
- 任意依存: `ffmpeg`（パス設定前提・同梱しない）
- Fallback: 画像連番（Recorder/ffmpeg 不可時の保険）

## エラー/ガード方針

- 重複開始の抑止（1セッション制限）
- 無効なウィンドウ/カメラ/サイズ指定時の早期エラー
- Play/Edit の互換性チェック（モードによって制限）
- ディスク空き容量/書込権限/出力拡張子妥当性の検証
- 長時間録画のメモリ/ファイルサイズ監視と安全停止

## 実装タスク（WBS）

1. 要件定義（形式/解像度/音声/保存先）
2. アーキ設計（Recorder/ffmpeg 方針）
3. コマンド設計（start/stop/status）
4. 依存性検討とパッケージ導入（Recorder の動的導入）
5. キャプチャ基盤実装（Game/Scene/Window/Explorer 共通化）
6. エンコード実装（Recorder/ffmpeg/Fallback）
7. 音声キャプチャ実装（任意）
8. 出力/エラー制御実装（ガード/検証）
9. 長時間/並列録画の安定化（1 セッション制限）
10. テスト追加（単体/結合/負荷/手動）
11. ドキュメント整備（READMEja/en からリンク）
12. バージョン更新とリリース（`npm version minor`）

## 進捗用 ToDo（チェックリスト）

- [x] 要件定義の確定（デフォルト値/制約を文書反映）
- [x] コマンド仕様の最終化（引数/戻り値/エラー）
- [x] ルータへのコマンド追加（start/stop/status）
- [x] VideoCaptureHandler スケルトン実装（状態管理/出力パス生成）
- [x] PlayMode ポリシー反映（許可コマンド追加）
- [x] Recorder 依存導入（manifest.json 追加とガード）
- [x] Game/Scene/Window/Explorer キャプチャ基盤（初期版はPNGフォールバックで網羅、RecorderはGameView対応）
- [x] Recorder による mp4 出力実装（GameView：リフレクション統合）
- [x] 音声キャプチャ（任意）※RecorderのAudioInputSettingsを最小有効化（ベストエフォート）
- [x] Fallback: 画像連番（PNG）
- [x] エラー/ガード実装（基本）
- [x] 自動/手動テスト追加（PNG連番の基本動作）
- [x] README リンク追加・設計詳細 docs 分離
- [x] バージョン更新（mcp-server 2.12.0 / unity package 2.12.0）
- [ ] リリース手順（npm publish 等）

## テスト計画

- 単体: 引数検証、出力パス組み立て、依存検出、状態遷移
- 結合: 10 秒録画→ファイル生成/再生可能性の確認、`status` 推移
- 負荷: 1080p/60fps/5 分録画の安定性（クラッシュ/リーク/ドロップ）
- 手動: `captureMode` ごとの映像/音声/UI 有無の目視確認

## ドキュメント/配布

- README（英/日）: 使い方/制約/依存のみ。設計は本ドキュメントへリンク
- 変更履歴: 新コマンド追加・既知の制約・互換性
- リリース: `npm version minor` → unity package の `package.json` 同期 → コミット/プッシュ → `npm publish`

## 決定待ち（要確認）

- 優先出力形式: `mp4` 固定で問題ないか（`webm` 必要性）
- 音声: 必須/任意、有効時のソース（ゲーム音/マイク）
- 既定パラメータ: 解像度/FPS/ビットレート（例: 1920x1080@60fps, 8000kbps）
- 上限録画時間/ファイルサイズの既定ガードの有無
- 初期対応の `captureMode` 優先度（game/scene/window/explorer）

---

補足: 本ドキュメントは計画の集約であり、詳細設計は別ドキュメント（例: `docs/video-capture-design.md`）に切り出して管理します。
