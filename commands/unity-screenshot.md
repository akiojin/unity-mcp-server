---
description: Capture screenshots from Unity Editor Game/Scene/Explorer views
argument-hint: "[mode] [target] - mode: game|scene|explorer, target: GameObject name for explorer mode"
---

# Unity Screenshot Capture

Capture screenshots from various Unity Editor views.

## Capture Modes

### 1. Game View (`game`)

Captures the Game View (player's perspective).

```javascript
mcp__unity-mcp-server__capture_screenshot({
  captureMode: "game",
  encodeAsBase64: true
})
```

### 2. Scene View (`scene`)

Captures the editor's Scene View.

```javascript
mcp__unity-mcp-server__capture_screenshot({
  captureMode: "scene",
  encodeAsBase64: true
})
```

### 3. Explorer Mode (`explorer`)

AI/LLM-optimized view that focuses on a specific GameObject.

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

## Usage Examples

### Basic Usage

```
/unity-screenshot
```

Captures the Game View screenshot.

### Capture Scene View

```
/unity-screenshot scene
```

### Focus on Specific GameObject

```
/unity-screenshot explorer Player
```

Frames and captures the Player GameObject.

## Options

### Explorer Mode Settings

| Setting | Description |
|---------|-------------|
| `target.type` | gameObject, tag, area, position |
| `target.name` | Target GameObject name |
| `camera.autoFrame` | Auto-framing (default: true) |
| `camera.padding` | Framing padding (0-1, default: 0.2) |
| `display.showGizmos` | Show gizmos (default: false) |
| `display.showColliders` | Show colliders (default: false) |

## Output

Screenshots are saved to `.unity/capture/` directory. Base64-encoded image data is also returned.

Filename format: `image_<mode>_<timestamp>.png`
