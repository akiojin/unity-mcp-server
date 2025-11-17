# Quickstart: Unity Profilerパフォーマンス計測

**機能ID**: `SPEC-1591581c` | **日付**: 2025-01-17

## 前提条件

- Unity Editor 2021.3以降が起動中
- MCP Server接続済み
- Unity Profiler Window (`Window > Analysis > Profiler`) で.dataファイルを確認可能

---

## 基本的な使い方

### 1. プロファイリングの開始（P1機能）

**通常モードで記録開始**:

```json
{
  "tool": "profiler_start",
  "arguments": {
    "mode": "normal",
    "recordToFile": true,
    "maxDurationSec": 60
  }
}
```

**レスポンス例**:

```json
{
  "sessionId": "a1b2c3d4e5f67890",
  "startedAt": "2025-01-17T10:00:00.000Z",
  "isRecording": true,
  "outputPath": "/path/to/workspace/.unity/capture/profiler_a1b2c3d4e5f67890_20250117_100000.data"
}
```

**検証ステップ**:

1. レスポンスの`isRecording`が`true`であることを確認
2. `outputPath`のファイルが存在することを確認（記録中は一時ファイル）
3. Unity Profiler Windowで記録中のインジケーターが表示されることを確認

---

### 2. プロファイリングの停止（P1機能）

**記録停止**:

```json
{
  "tool": "profiler_stop",
  "arguments": {
    "sessionId": "a1b2c3d4e5f67890"
  }
}
```

**レスポンス例**:

```json
{
  "sessionId": "a1b2c3d4e5f67890",
  "outputPath": "/path/to/workspace/.unity/capture/profiler_a1b2c3d4e5f67890_20250117_100000.data",
  "duration": 45.3,
  "frameCount": 2715,
  "metrics": null
}
```

**検証ステップ**:

1. `outputPath`の.dataファイルが完全に保存されていることを確認
2. Unity Profiler Windowで `Load` ボタンからファイルを開く
3. 記録されたフレーム数（`frameCount`）とプロファイラー上の表示が一致することを確認
4. メモリ・CPU・レンダリング統計が正しく記録されていることを確認

---

### 3. リアルタイムメトリクス取得（P2機能）

**利用可能なメトリクス一覧の取得**:

```json
{
  "tool": "profiler_get_metrics",
  "arguments": {
    "listAvailable": true
  }
}
```

**レスポンス例**:

```json
{
  "categories": {
    "Memory": {
      "name": "Memory",
      "metrics": [
        {"category": "Memory", "name": "System Used Memory", "value": 524288000, "unit": "bytes"},
        {"category": "Memory", "name": "GC Reserved Memory", "value": 104857600, "unit": "bytes"}
      ]
    },
    "Rendering": {
      "name": "Rendering",
      "metrics": [
        {"category": "Rendering", "name": "Draw Calls Count", "value": 128, "unit": "count"}
      ]
    }
  }
}
```

**現在のメトリクス値の取得**:

```json
{
  "tool": "profiler_get_metrics",
  "arguments": {
    "listAvailable": false,
    "metrics": ["System Used Memory", "Draw Calls Count", "Main Thread Frame Time"]
  }
}
```

**レスポンス例**:

```json
{
  "metrics": [
    {"category": "Memory", "name": "System Used Memory", "value": 524288000, "unit": "bytes"},
    {"category": "Rendering", "name": "Draw Calls Count", "value": 128, "unit": "count"},
    {"category": "CPU", "name": "Main Thread Frame Time", "value": 16.7, "unit": "milliseconds"}
  ]
}
```

**検証ステップ**:

1. `listAvailable=true`ですべてのカテゴリ（Memory、Rendering、CPU、GC等）が返却されることを確認
2. 特定メトリクスの値が妥当な範囲内にあることを確認（例: Frame Timeが0-100ms）
3. 同じメトリクスを複数回取得し、値が変化することを確認（リアルタイム性）

---

### 4. プロファイリング状態の確認（P3機能）

**状態確認**:

```json
{
  "tool": "profiler_status",
  "arguments": {}
}
```

**記録中のレスポンス例**:

```json
{
  "isRecording": true,
  "sessionId": "a1b2c3d4e5f67890",
  "startedAt": "2025-01-17T10:00:00.000Z",
  "elapsedSec": 30.5,
  "remainingSec": 29.5
}
```

**記録停止中のレスポンス例**:

```json
{
  "isRecording": false,
  "sessionId": null,
  "startedAt": null,
  "elapsedSec": 0,
  "remainingSec": null
}
```

**検証ステップ**:

1. 記録開始前: `isRecording=false`、すべてのフィールドがnull/0
2. 記録中: `isRecording=true`、`elapsedSec`が増加、`remainingSec`が減少（maxDurationSec指定時）
3. 記録停止後: `isRecording=false`に戻る

---

## 高度な使い方

### ディーププロファイリングモード

**より詳細なプロファイリング（オーバーヘッド大）**:

```json
{
  "tool": "profiler_start",
  "arguments": {
    "mode": "deep",
    "recordToFile": true,
    "maxDurationSec": 30
  }
}
```

**用途**: すべてのメソッド呼び出しを記録（パフォーマンス劣化に注意）

---

### 特定メトリクスのみ記録

**メモリとGCのみ記録**:

```json
{
  "tool": "profiler_start",
  "arguments": {
    "mode": "normal",
    "recordToFile": true,
    "metrics": [
      "System Used Memory",
      "GC Reserved Memory",
      "GC Allocated In Frame"
    ],
    "maxDurationSec": 0
  }
}
```

**用途**: メモリリーク調査、GC圧力の測定

---

### リアルタイムメトリクスのみ（ファイル保存なし）

**ファイル保存せずメモリ内のみで記録**:

```json
{
  "tool": "profiler_start",
  "arguments": {
    "mode": "normal",
    "recordToFile": false,
    "maxDurationSec": 10
  }
}
```

**停止時のレスポンス（メトリクスが返却される）**:

```json
{
  "sessionId": "a1b2c3d4e5f67890",
  "outputPath": null,
  "duration": 10.0,
  "frameCount": 600,
  "metrics": [
    {"category": "Memory", "name": "System Used Memory", "value": 524288000, "unit": "bytes"},
    {"category": "Rendering", "name": "Draw Calls Count", "value": 128, "unit": "count"}
  ]
}
```

**用途**: 自動テスト、CI環境での軽量メトリクス取得

---

## ユーザーストーリーごとの検証手順

### P1: プロファイリング記録と保存

**ストーリー**: "CI自動テストで特定シーンのパフォーマンスを計測し、.dataファイルとして保存したい"

1. `profiler_start`で記録開始（`recordToFile=true`）
2. Unity Editorで対象シーンを再生（Play Mode）
3. 1分間記録
4. `profiler_stop`で記録停止
5. `outputPath`の.dataファイルをUnity Profiler Windowで開く
6. フレーム単位でCPU・メモリ・描画統計を確認

**成功条件**:
- .dataファイルが正常に開ける
- すべてのフレームが記録されている
- Unity標準Profilerと同じデータが取得できている

---

### P2: リアルタイムメトリクス取得

**ストーリー**: "長時間実行中のUnityアプリケーションのメモリ使用量を定期的に監視したい"

1. `profiler_get_metrics`で`listAvailable=true`を実行し、監視対象メトリクスを決定
2. 5秒ごとに`profiler_get_metrics`で`System Used Memory`を取得
3. 10回取得し、メモリ使用量の推移をグラフ化

**成功条件**:
- 5秒ごとに異なる値が返却される（リアルタイム性）
- メモリ使用量が妥当な範囲内（例: 100MB〜2GB）
- Unity Profiler Windowの表示値と一致

---

### P3: プロファイリング状態確認

**ストーリー**: "プロファイリング実行中かどうかをチェックし、二重起動を防ぎたい"

1. `profiler_status`で状態確認（`isRecording=false`を確認）
2. `profiler_start`で記録開始
3. `profiler_status`で状態確認（`isRecording=true`、`elapsedSec`が増加）
4. `profiler_stop`で記録停止
5. `profiler_status`で状態確認（`isRecording=false`に戻る）

**成功条件**:
- 状態が正確に反映される
- `elapsedSec`が実時間と一致
- `remainingSec`が`maxDurationSec`から正しく減算されている

---

## エラーハンドリング例

### 既に記録中の場合（E_ALREADY_RUNNING）

**リクエスト**:

```json
{
  "tool": "profiler_start",
  "arguments": {"mode": "normal"}
}
```

**エラーレスポンス**:

```json
{
  "error": "A profiling session is already running.",
  "code": "E_ALREADY_RUNNING",
  "sessionId": "a1b2c3d4e5f67890"
}
```

**対処**: `profiler_stop`で既存セッションを停止してから再度開始

---

### 無効なメトリクス名（E_INVALID_METRICS）

**リクエスト**:

```json
{
  "tool": "profiler_start",
  "arguments": {
    "metrics": ["Invalid Metric Name", "System Used Memory"]
  }
}
```

**エラーレスポンス**:

```json
{
  "error": "Invalid metrics: Invalid Metric Name",
  "code": "E_INVALID_METRICS"
}
```

**対処**: `profiler_get_metrics`で`listAvailable=true`を実行し、有効なメトリクス名を確認

---

### 記録していない状態で停止を試行（E_NOT_RECORDING）

**リクエスト**:

```json
{
  "tool": "profiler_stop",
  "arguments": {}
}
```

**エラーレスポンス**:

```json
{
  "error": "No profiling session is currently running.",
  "code": "E_NOT_RECORDING"
}
```

**対処**: `profiler_status`で状態を確認してから操作

---

## トラブルシューティング

### .dataファイルが開けない

**原因**: 記録中にUnityがクラッシュした、またはファイル破損

**対処**:
1. `profiler_status`で`isRecording=false`を確認
2. 再度`profiler_start`→`profiler_stop`を実行
3. ファイルサイズが0byteでないか確認

---

### メトリクス値が0または異常値

**原因**: Unity Editorが非アクティブ、またはProfilerRecorder未初期化

**対処**:
1. Unity Editorウィンドウをアクティブにする
2. `profiler_get_metrics`で`listAvailable=true`を実行し、メトリクスが利用可能か確認
3. Unity Editorを再起動

---

### 自動停止が機能しない

**原因**: `maxDurationSec=0`（無制限）が指定されている

**対処**:
1. `profiler_status`で`remainingSec`がnullか確認
2. 手動で`profiler_stop`を実行
3. 次回は`maxDurationSec`に正の値を指定

---

## まとめ

本機能により、以下が実現できます：

- ✅ **P1**: .dataファイルとして保存し、Unity Profiler Windowで詳細分析
- ✅ **P2**: リアルタイムでメモリ・CPU・レンダリング統計を取得
- ✅ **P3**: プロファイリング状態を確認し、二重起動を防止

**次のステップ**: `tasks.md`を作成し、TDDサイクルで実装を進めてください。
