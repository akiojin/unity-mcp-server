# 動画保存機能 設計詳細（概要）

本ドキュメントは、録画機能の実装詳細を記載する設計ドキュメントです（コード断片は含めません）。

## 全体構成

- 入口: MCPコマンド `capture_video_start` / `capture_video_stop` / `capture_video_status`
- ルーティング: `UnityEditorMCP/Editor/Core/UnityEditorMCP.cs`
- ハンドラ: `VideoCaptureHandler`（セッション状態・各実装の委譲）
- 実装段階:
  1) Fallback（PNG連番）
  2) Unity Recorder による mp4 出力（GameView → Scene/Window/Explorerへ拡張）
  3) 音声キャプチャ（ゲームオーディオ）

## キャプチャ対象

- `game`: GameView（UIの有無をパラメータで切替）
- `scene`: SceneView（最前面のSceneViewカメラ）
- `window`: 指定ウィンドウ名の描画領域
- `explorer`: 既存Explorer撮影機構を流用（autoFrame, display options, target指定）

## パラメータ

- 解像度: `width`/`height`（0は自動）
- フレームレート: `fps`（固定）
- ビットレート: `bitrateKbps`（Recorder/ffmpeg時）
- 形式: `mp4|webm|png_sequence`
- 音声: `audio`（ゲームオーディオ/無音）
- 出力: `outputPath`（Assets/配下必須）

## Recorder 統合方針

- Recorder パッケージ（`com.unity.recorder`）に依存
- MovieRecorder（H.264/MP4）を基本とし、`GameViewInput` を入力に採用
- 設定: 出力ファイル名/解像度/FPS/ビットレート/音声の有無
- コントローラ: `RecorderControllerSettings` + `RecorderController`
- 段階的拡張: `scene`/`window`/`explorer` の入力切替（必要に応じてカスタム入力）

## Fallback（PNG連番）

- EditorApplication.update で一定間隔（1/fps）ごとに `ScreenCapture.CaptureScreenshot` を保存
- パス: `Assets/Screenshots/recordings/<session>/frame_000001.png` 形式

## エラー/ガード

- モード/形式/サイズの検証
- 出力パスは `Assets/` 配下のみ許可
- 1セッション制限（重複開始は拒否）
- 長時間撮影の上限（`maxDurationSec`）

## 今後の拡張

- ffmpeg によるエンコード（Rawフレーム→パイプ）
- 複数同時録画（排他制御の見直し）
- メタデータ付与（開始・停止・フレームドロップ統計）

