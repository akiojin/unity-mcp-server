---
name: unity-screenshot
description: Unity EditorのGame/Scene/Explorerビューのスクリーンショットを取得するコマンド
arguments:
  - name: mode
    description: "キャプチャモード: game, scene, explorer (デフォルト: game)"
    required: false
  - name: target
    description: "explorerモード時のターゲット指定 (例: Player, MainCamera)"
    required: false
---

# Unity Screenshot Capture

Unity Editorの各種ビューのスクリーンショットを取得します。

## キャプチャモード

### 1. Game View (`game`)

プレイヤーが見る画面（Game View）をキャプチャします。

```javascript
mcp__unity-mcp-server__capture_screenshot({
  captureMode: "game",
  encodeAsBase64: true
})
```

### 2. Scene View (`scene`)

エディタのシーンビューをキャプチャします。

```javascript
mcp__unity-mcp-server__capture_screenshot({
  captureMode: "scene",
  encodeAsBase64: true
})
```

### 3. Explorer Mode (`explorer`)

AI/LLM向けに最適化されたビューで、特定のGameObjectにフォーカスしてキャプチャします。

```javascript
mcp__unity-mcp-server__capture_screenshot({
  captureMode: "explorer",
  encodeAsBase64: true,
  explorerSettings: {
    target: {
      type: "gameObject",
      name: "Player"
    },
    camera: {
      autoFrame: true,
      padding: 0.2
    }
  }
})
```

## 使用例

### 基本的な使用

```
/unity-screenshot
```

Game Viewのスクリーンショットを取得します。

### Scene Viewをキャプチャ

```
/unity-screenshot scene
```

### 特定のGameObjectにフォーカス

```
/unity-screenshot explorer Player
```

PlayerというGameObjectを中心にフレーミングしてキャプチャします。

## オプション

### Explorer Mode設定

| 設定 | 説明 |
|------|------|
| `target.type` | gameObject, tag, area, position |
| `target.name` | ターゲットGameObjectの名前 |
| `camera.autoFrame` | 自動フレーミング（デフォルト: true） |
| `camera.padding` | フレーミングの余白（0-1、デフォルト: 0.2） |
| `display.showGizmos` | ギズモ表示（デフォルト: false） |
| `display.showColliders` | コライダー表示（デフォルト: false） |

## 出力

スクリーンショットは `.unity/capture/` ディレクトリに保存され、Base64エンコードされた画像データも返されます。

ファイル名形式: `image_<mode>_<timestamp>.png`
