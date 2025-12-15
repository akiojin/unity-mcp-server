---
name: unity-playmode-testing
description: Unityのプレイモード制御、入力シミュレーション、UI自動化、視覚的検証を支援。テスト実行、スクリーンショット/動画キャプチャ、コンソールログ確認を統合。使用タイミング: プレイモード開始、入力シミュレーション、UIクリック、スクリーンショット、動画録画、テスト実行
allowed-tools: Read, Grep, Glob
---

# Unity PlayMode & Testing

プレイモード制御、入力シミュレーション、UI自動化、視覚的検証のガイド。

## Quick Start

### 1. プレイモード制御

```javascript
// プレイモード開始
mcp__unity-mcp-server__playmode_play()

// 状態確認
mcp__unity-mcp-server__playmode_get_state()

// 停止
mcp__unity-mcp-server__playmode_stop()
```

### 2. 入力シミュレーション

```javascript
// キーボード入力
mcp__unity-mcp-server__input_keyboard({
  action: "press",
  key: "w",
  holdSeconds: 1.0
})

// マウスクリック
mcp__unity-mcp-server__input_mouse({
  action: "click",
  x: 500,
  y: 300,
  button: "left"
})
```

### 3. スクリーンショット

```javascript
// ゲームビューをキャプチャ
mcp__unity-mcp-server__screenshot_capture({
  captureMode: "game"
})
```

## Play Mode Control

### 開始・一時停止・停止

```javascript
// プレイモード開始
mcp__unity-mcp-server__playmode_play()

// 一時停止/再開（トグル）
mcp__unity-mcp-server__playmode_pause()

// 停止（エディットモードに戻る）
mcp__unity-mcp-server__playmode_stop()
```

### 状態確認

```javascript
// 現在の状態を取得
mcp__unity-mcp-server__playmode_get_state()
// 戻り値: { isPlaying: true/false, isPaused: true/false }
```

### 状態待機

```javascript
// プレイモードになるまで待機
mcp__unity-mcp-server__playmode_wait_for_state({
  isPlaying: true,
  timeoutMs: 10000,  // 10秒タイムアウト
  pollMs: 500        // 500msごとに確認
})

// エディットモードになるまで待機
mcp__unity-mcp-server__playmode_wait_for_state({
  isPlaying: false,
  timeoutMs: 5000
})
```

## Input Simulation

### キーボード入力

```javascript
// キーを押す
mcp__unity-mcp-server__input_keyboard({
  action: "press",
  key: "space"
})

// キーを離す
mcp__unity-mcp-server__input_keyboard({
  action: "release",
  key: "space"
})

// 自動リリース付き（holdSeconds）
mcp__unity-mcp-server__input_keyboard({
  action: "press",
  key: "w",
  holdSeconds: 2.0  // 2秒後に自動リリース
})

// テキスト入力
mcp__unity-mcp-server__input_keyboard({
  action: "type",
  text: "Hello World",
  typingSpeed: 50  // 50ms間隔
})

// キーコンボ
mcp__unity-mcp-server__input_keyboard({
  action: "combo",
  keys: ["ctrl", "shift", "s"],
  holdSeconds: 0.1
})
```

### マウス入力

```javascript
// 移動
mcp__unity-mcp-server__input_mouse({
  action: "move",
  x: 500,
  y: 300,
  absolute: true  // スクリーン座標
})

// クリック
mcp__unity-mcp-server__input_mouse({
  action: "click",
  x: 500,
  y: 300,
  button: "left",  // left, right, middle
  clickCount: 2    // ダブルクリック
})

// ドラッグ
mcp__unity-mcp-server__input_mouse({
  action: "drag",
  startX: 100,
  startY: 100,
  endX: 300,
  endY: 300,
  button: "left"
})

// スクロール
mcp__unity-mcp-server__input_mouse({
  action: "scroll",
  deltaY: -120  // 負=下、正=上
})

// ボタン長押し
mcp__unity-mcp-server__input_mouse({
  action: "button",
  buttonAction: "press",
  button: "left",
  holdSeconds: 1.0
})
```

### ゲームパッド入力

```javascript
// ボタン押下
mcp__unity-mcp-server__input_gamepad({
  action: "button",
  button: "a",  // a/cross, b/circle, x/square, y/triangle, start, select, etc.
  buttonAction: "press"
})

// アナログスティック
mcp__unity-mcp-server__input_gamepad({
  action: "stick",
  stick: "left",
  x: 1.0,   // -1.0 ～ 1.0
  y: 0.5,
  holdSeconds: 1.0
})

// トリガー
mcp__unity-mcp-server__input_gamepad({
  action: "trigger",
  trigger: "right",
  value: 0.8,  // 0.0 ～ 1.0
  holdSeconds: 0.5
})

// D-Pad
mcp__unity-mcp-server__input_gamepad({
  action: "dpad",
  direction: "up",  // up, down, left, right, none
  holdSeconds: 0.3
})
```

### タッチ入力

```javascript
// タップ
mcp__unity-mcp-server__input_touch({
  action: "tap",
  x: 500,
  y: 300,
  touchId: 0
})

// スワイプ
mcp__unity-mcp-server__input_touch({
  action: "swipe",
  startX: 100,
  startY: 500,
  endX: 100,
  endY: 200,
  duration: 300  // ms
})

// ピンチ（ズーム）
mcp__unity-mcp-server__input_touch({
  action: "pinch",
  centerX: 400,
  centerY: 300,
  startDistance: 100,
  endDistance: 200  // ズームイン
})

// マルチタッチ
mcp__unity-mcp-server__input_touch({
  action: "multi",
  touches: [
    { x: 100, y: 200, phase: "began" },
    { x: 300, y: 200, phase: "began" }
  ]
})
```

### バッチ入力（複数アクションを順次実行）

```javascript
// キーボードバッチ
mcp__unity-mcp-server__input_keyboard({
  actions: [
    { action: "press", key: "w", holdSeconds: 1.0 },
    { action: "press", key: "space" },
    { action: "type", text: "test" }
  ]
})

// マウスバッチ
mcp__unity-mcp-server__input_mouse({
  actions: [
    { action: "move", x: 100, y: 100 },
    { action: "click", button: "left" },
    { action: "move", x: 200, y: 200 },
    { action: "click", button: "left" }
  ]
})
```

## UI Automation

### UI要素検索

```javascript
// 要素タイプで検索
mcp__unity-mcp-server__ui_find_elements({
  elementType: "Button"
})

// 名前パターンで検索
mcp__unity-mcp-server__ui_find_elements({
  namePattern: "Start.*",  // 正規表現
  includeInactive: true
})

// Canvas内で検索
mcp__unity-mcp-server__ui_find_elements({
  elementType: "Toggle",
  canvasFilter: "SettingsCanvas"
})
```

### UIクリック

```javascript
// 要素パスでクリック
mcp__unity-mcp-server__ui_click_element({
  elementPath: "/Canvas/StartButton"
})

// 右クリック
mcp__unity-mcp-server__ui_click_element({
  elementPath: "/Canvas/ContextMenu",
  clickType: "right"
})

// 長押し
mcp__unity-mcp-server__ui_click_element({
  elementPath: "/Canvas/HoldButton",
  holdDuration: 1000  // 1秒
})

// 要素内の特定位置をクリック
mcp__unity-mcp-server__ui_click_element({
  elementPath: "/Canvas/Slider",
  position: { x: 0.8, y: 0.5 }  // 0-1の相対座標
})
```

### UI要素状態取得

```javascript
// 要素の状態を取得
mcp__unity-mcp-server__ui_get_element_state({
  elementPath: "/Canvas/StartButton",
  includeInteractableInfo: true
})
// 戻り値: interactable, visible, position, size, etc.

// 子要素も含める
mcp__unity-mcp-server__ui_get_element_state({
  elementPath: "/Canvas/Panel",
  includeChildren: true
})
```

### UI値設定

```javascript
// InputFieldにテキスト設定
mcp__unity-mcp-server__ui_set_element_value({
  elementPath: "/Canvas/NameInput",
  value: "PlayerName",
  triggerEvents: true  // OnValueChanged等を発火
})

// Sliderの値設定
mcp__unity-mcp-server__ui_set_element_value({
  elementPath: "/Canvas/VolumeSlider",
  value: 0.75
})

// Toggleの状態設定
mcp__unity-mcp-server__ui_set_element_value({
  elementPath: "/Canvas/MuteToggle",
  value: true
})

// Dropdownの選択
mcp__unity-mcp-server__ui_set_element_value({
  elementPath: "/Canvas/DifficultyDropdown",
  value: "Hard"  // または index
})
```

### 複合UIシーケンス

```javascript
// 複数のUI操作を順次実行
mcp__unity-mcp-server__ui_simulate_input({
  inputSequence: [
    { type: "click", params: { elementPath: "/Canvas/NameInput" }},
    { type: "setvalue", params: { elementPath: "/Canvas/NameInput", value: "Player1" }},
    { type: "click", params: { elementPath: "/Canvas/StartButton" }}
  ],
  waitBetween: 500,     // アクション間500ms待機
  validateState: true   // 各アクション後に状態検証
})
```

## Visual Capture

### スクリーンショット

```javascript
// ゲームビュー
mcp__unity-mcp-server__screenshot_capture({
  captureMode: "game"
})

// シーンビュー
mcp__unity-mcp-server__screenshot_capture({
  captureMode: "scene"
})

// 解像度指定
mcp__unity-mcp-server__screenshot_capture({
  captureMode: "game",
  width: 1920,
  height: 1080
})

// UIを除外
mcp__unity-mcp-server__screenshot_capture({
  captureMode: "game",
  includeUI: false
})

// Base64で取得（即時分析用）
mcp__unity-mcp-server__screenshot_capture({
  captureMode: "game",
  encodeAsBase64: true
})
```

### Explorerモード（LLM最適化キャプチャ）

```javascript
// 特定オブジェクトにフォーカス
mcp__unity-mcp-server__screenshot_capture({
  captureMode: "explorer",
  explorerSettings: {
    target: {
      type: "gameObject",
      name: "Player",
      includeChildren: true
    },
    camera: {
      autoFrame: true,
      padding: 0.2
    }
  }
})

// タグで複数オブジェクトをキャプチャ
mcp__unity-mcp-server__screenshot_capture({
  captureMode: "explorer",
  explorerSettings: {
    target: {
      type: "tag",
      tag: "Enemy"
    },
    display: {
      showBounds: true,
      highlightTarget: true
    }
  }
})

// エリア指定
mcp__unity-mcp-server__screenshot_capture({
  captureMode: "explorer",
  explorerSettings: {
    target: {
      type: "area",
      center: { x: 0, y: 0, z: 0 },
      radius: 10
    }
  }
})
```

### スクリーンショット分析

```javascript
// 基本分析（色・サイズ）
mcp__unity-mcp-server__screenshot_analyze({
  imagePath: "Assets/../.unity/capture/screenshot.png",
  analysisType: "basic"
})

// UI要素検出
mcp__unity-mcp-server__screenshot_analyze({
  analysisType: "ui"
})

// シーン内容分析
mcp__unity-mcp-server__screenshot_analyze({
  analysisType: "content"
})

// 全分析
mcp__unity-mcp-server__screenshot_analyze({
  analysisType: "full",
  prompt: "Find all buttons in the UI"
})
```

### 動画録画

```javascript
// 録画開始
mcp__unity-mcp-server__video_capture_start({
  captureMode: "game",
  fps: 30,
  width: 1280,
  height: 720
})

// 録画状態確認
mcp__unity-mcp-server__video_capture_status()

// 録画停止
mcp__unity-mcp-server__video_capture_stop()

// 一括録画（N秒間録画して自動停止）
mcp__unity-mcp-server__video_capture_for({
  durationSec: 10,
  play: true,  // 自動でプレイモード開始
  fps: 30
})
```

## Testing & Debugging

### テスト実行

```javascript
// EditModeテスト実行
mcp__unity-mcp-server__test_run({
  testMode: "EditMode"
})

// PlayModeテスト実行
mcp__unity-mcp-server__test_run({
  testMode: "PlayMode"
})

// 両方実行
mcp__unity-mcp-server__test_run({
  testMode: "All"
})

// フィルタ付き
mcp__unity-mcp-server__test_run({
  testMode: "EditMode",
  filter: "PlayerTests",          // クラス名
  namespace: "Tests.Player",      // 名前空間
  category: "Unit",               // カテゴリ
  includeDetails: true
})

// 結果をXMLにエクスポート
mcp__unity-mcp-server__test_run({
  testMode: "All",
  exportPath: "TestResults/results.xml"
})
```

### テスト状態確認

```javascript
// テスト実行状態
mcp__unity-mcp-server__test_get_status()

// 結果サマリー付き
mcp__unity-mcp-server__test_get_status({
  includeTestResults: true,
  includeFileContent: true
})
```

### コンソールログ

```javascript
// ログ読み取り
mcp__unity-mcp-server__console_read({
  count: 100,
  logTypes: ["Log", "Warning", "Error"]
})

// エラーのみ
mcp__unity-mcp-server__console_read({
  logTypes: ["Error"],
  includeStackTrace: true
})

// テキストフィルタ
mcp__unity-mcp-server__console_read({
  filterText: "Player",
  sortOrder: "newest"
})

// 時間範囲指定
mcp__unity-mcp-server__console_read({
  sinceTimestamp: "2024-01-01T00:00:00Z"
})

// コンソールクリア
mcp__unity-mcp-server__console_clear({
  preserveErrors: true  // エラーは残す
})
```

## Common Workflows

### UI自動テスト

```javascript
// 1. プレイモード開始
mcp__unity-mcp-server__playmode_play()
mcp__unity-mcp-server__playmode_wait_for_state({ isPlaying: true })

// 2. メニュー操作
mcp__unity-mcp-server__ui_click_element({
  elementPath: "/Canvas/MainMenu/StartButton"
})

// 3. 待機
await new Promise(r => setTimeout(r, 1000))

// 4. 入力
mcp__unity-mcp-server__ui_set_element_value({
  elementPath: "/Canvas/NameInput",
  value: "TestPlayer"
})

// 5. 確認ボタン
mcp__unity-mcp-server__ui_click_element({
  elementPath: "/Canvas/ConfirmButton"
})

// 6. 結果をスクリーンショット
mcp__unity-mcp-server__screenshot_capture({ captureMode: "game" })

// 7. コンソールでエラー確認
mcp__unity-mcp-server__console_read({ logTypes: ["Error"] })

// 8. 停止
mcp__unity-mcp-server__playmode_stop()
```

### ゲームプレイ記録

```javascript
// 1. 録画付きでプレイモード開始
mcp__unity-mcp-server__video_capture_for({
  durationSec: 30,
  play: true
})

// または手動制御:
mcp__unity-mcp-server__playmode_play()
mcp__unity-mcp-server__video_capture_start()

// 2. ゲームプレイ入力
mcp__unity-mcp-server__input_keyboard({
  actions: [
    { action: "press", key: "w", holdSeconds: 2.0 },
    { action: "press", key: "space" },
    { action: "press", key: "a", holdSeconds: 1.0 }
  ]
})

// 3. 録画停止
mcp__unity-mcp-server__video_capture_stop()
mcp__unity-mcp-server__playmode_stop()
```

### バグ再現自動化

```javascript
// 1. シーン読み込み
mcp__unity-mcp-server__scene_load({
  scenePath: "Assets/Scenes/BugScene.unity"
})

// 2. プレイモード開始
mcp__unity-mcp-server__playmode_play()
mcp__unity-mcp-server__playmode_wait_for_state({ isPlaying: true })

// 3. 再現手順
mcp__unity-mcp-server__input_keyboard({
  action: "press",
  key: "e",
  holdSeconds: 0.5
})

mcp__unity-mcp-server__input_mouse({
  action: "click",
  x: 500,
  y: 300
})

// 4. エラー確認
mcp__unity-mcp-server__console_read({
  logTypes: ["Error"],
  includeStackTrace: true
})

// 5. スクリーンショット
mcp__unity-mcp-server__screenshot_capture({ captureMode: "game" })

// 6. 停止
mcp__unity-mcp-server__playmode_stop()
```

## Common Mistakes

### 1. プレイモード状態の確認漏れ

```javascript
// ❌ 状態確認なしで入力
mcp__unity-mcp-server__input_keyboard({ action: "press", key: "w" })

// ✅ プレイモード確認後に入力
mcp__unity-mcp-server__playmode_play()
mcp__unity-mcp-server__playmode_wait_for_state({ isPlaying: true })
mcp__unity-mcp-server__input_keyboard({ action: "press", key: "w" })
```

### 2. 入力の即時リリース忘れ

```javascript
// ❌ press後にrelease忘れ（キーが押しっぱなし）
mcp__unity-mcp-server__input_keyboard({ action: "press", key: "shift" })

// ✅ holdSecondsで自動リリース
mcp__unity-mcp-server__input_keyboard({
  action: "press",
  key: "shift",
  holdSeconds: 0.5
})
```

### 3. UI要素パスの誤り

```javascript
// ❌ 相対パス
elementPath: "Canvas/Button"

// ✅ 絶対パス（先頭スラッシュ）
elementPath: "/Canvas/Button"
```

### 4. 録画停止忘れ

```javascript
// ✅ 録画は必ず停止
mcp__unity-mcp-server__video_capture_start()
// ... 録画処理 ...
mcp__unity-mcp-server__video_capture_stop()  // 忘れずに!

// ✅ または video_capture_for で自動停止
mcp__unity-mcp-server__video_capture_for({ durationSec: 10 })
```

### 5. テスト実行タイミング

```javascript
// ❌ PlayModeテストをエディットモードで実行しようとする
// （Unity側で自動的にプレイモードに切り替わるが、タイミング注意）

// ✅ 明示的にモードを指定
mcp__unity-mcp-server__test_run({
  testMode: "PlayMode",  // EditModeテストなら "EditMode"
  includeDetails: true
})
```

## Tool Reference

| ツール | 用途 |
|--------|------|
| `playmode_play` | プレイモード開始 |
| `playmode_pause` | 一時停止/再開 |
| `playmode_stop` | プレイモード停止 |
| `playmode_get_state` | 状態取得 |
| `playmode_wait_for_state` | 状態待機 |
| `input_keyboard` | キーボード入力 |
| `input_mouse` | マウス入力 |
| `input_gamepad` | ゲームパッド入力 |
| `input_touch` | タッチ入力 |
| `ui_find_elements` | UI要素検索 |
| `ui_click_element` | UIクリック |
| `ui_get_element_state` | UI状態取得 |
| `ui_set_element_value` | UI値設定 |
| `ui_simulate_input` | 複合UIシーケンス |
| `screenshot_capture` | スクリーンショット |
| `screenshot_analyze` | スクリーンショット分析 |
| `video_capture_start` | 録画開始 |
| `video_capture_stop` | 録画停止 |
| `video_capture_status` | 録画状態 |
| `video_capture_for` | 指定秒数録画 |
| `test_run` | テスト実行 |
| `test_get_status` | テスト状態 |
| `console_read` | ログ読み取り |
| `console_clear` | ログクリア |
