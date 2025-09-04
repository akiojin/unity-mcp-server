# MCP スクリーンショット/動画 テスト計画（カテゴリ: Capture系）

結果フォーマットは `tests/RESULTS_FORMAT.md` を参照。保存先は `<workspace>/.unity/capture/` 固定。全テストは原状回復までを含め、Git へのコミットやバージョン変更は行いません。

原状回復（必須）・禁止事項:
- 生成したスクリーンショット/動画はテスト成果物として記録し、必要に応じてクリーンアップポリシーに従って削除可能。

## 正常系

- U70-01: `capture_screenshot`（`captureMode=game`, `includeUI=true`）→ 画像作成
- U70-02: `analyze_screenshot`（`analysisType=basic`）→ 解析
- U70-03: `capture_video_for`（`durationSec=2`）→ 動画作成

## 異常系

- U70-E01: 不正 `captureMode` → `fail`
- U70-E02: Recorder 欠如 → `fail`（要約記録）
