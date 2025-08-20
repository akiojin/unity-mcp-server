# Unity MCP Screenshot Capture Guide for AI/LLM

## Overview

The `capture_screenshot` tool provides powerful screenshot capabilities for Unity Editor, with a special **Explorer Mode** designed specifically for AI/LLM analysis. This guide helps you use the tool effectively to capture and analyze Unity scenes.

## Quick Start

### Simple Game View Capture
```javascript
// Capture what the player sees
{
  "captureMode": "game"
}
```

### AI Analysis Capture
```javascript
// Capture as base64 for immediate processing
{
  "captureMode": "game",
  "encodeAsBase64": true,
  "includeUI": false
}
```

## Capture Modes

### 1. Game Mode (`"game"`)
Captures the Game View - what the player sees during gameplay.

**Use Cases:**
- Bug reporting
- Gameplay documentation
- UI/UX testing
- Player perspective analysis

**Example:**
```javascript
{
  "captureMode": "game",
  "includeUI": true,  // Include HUD/UI elements
  "width": 1920,
  "height": 1080,
  "outputPath": "Assets/Screenshots/gameplay.png"
}
```

### 2. Scene Mode (`"scene"`)
Captures the Scene View - the editor's 3D workspace.

**Use Cases:**
- Level design documentation
- Development progress tracking
- Editor workflow capture

**Example:**
```javascript
{
  "captureMode": "scene",
  "width": 2560,
  "height": 1440
}
```

### 3. Window Mode (`"window"`)
Captures specific Unity Editor windows.

**Use Cases:**
- Console error documentation
- Inspector settings capture
- Project structure documentation

**Example:**
```javascript
{
  "captureMode": "window",
  "windowName": "Console"  // Or "Inspector", "Hierarchy", "Project"
}
```

### 4. Explorer Mode (`"explorer"`) - AI/LLM Optimized
Special mode designed for AI/LLM to understand and analyze Unity scenes effectively.

**Key Features:**
- Automatic object framing
- Clear visibility optimization
- Multiple targeting methods
- Customizable visualization

## Explorer Mode Deep Dive

### Target Types

#### 1. GameObject Targeting
Focus on a specific object by name:
```javascript
{
  "captureMode": "explorer",
  "encodeAsBase64": true,
  "explorerSettings": {
    "target": {
      "type": "gameObject",
      "name": "Player",
      "includeChildren": true
    },
    "camera": {
      "autoFrame": true,
      "padding": 0.3
    }
  }
}
```

#### 2. Tag-Based Targeting
Capture all objects with a specific tag:
```javascript
{
  "captureMode": "explorer",
  "explorerSettings": {
    "target": {
      "type": "tag",
      "tag": "Enemy"
    },
    "camera": {
      "autoFrame": true
    },
    "display": {
      "highlightTarget": true,
      "showBounds": true
    }
  }
}
```

#### 3. Area Targeting
Capture a specific region:
```javascript
{
  "captureMode": "explorer",
  "explorerSettings": {
    "target": {
      "type": "area",
      "center": { "x": 0, "y": 0, "z": 0 },
      "radius": 25
    },
    "camera": {
      "position": { "x": 0, "y": 50, "z": -30 },
      "lookAt": { "x": 0, "y": 0, "z": 0 }
    }
  }
}
```

#### 4. Manual Positioning
Full control over camera placement:
```javascript
{
  "captureMode": "explorer",
  "explorerSettings": {
    "target": {
      "type": "position"
    },
    "camera": {
      "position": { "x": 10, "y": 5, "z": -10 },
      "rotation": { "x": 15, "y": -45, "z": 0 },
      "fieldOfView": 60
    }
  }
}
```

### Camera Settings

| Parameter | Description | Default | Range/Values |
|-----------|-------------|---------|--------------|
| `autoFrame` | Automatically position camera to frame target | `true` | `true`/`false` |
| `padding` | Space around target when auto-framing | `0.2` | `0.0` - `1.0` |
| `fieldOfView` | Camera FOV in degrees | `60` | `1` - `179` |
| `width` | Capture resolution width | `1920` | `1` - `8192` |
| `height` | Capture resolution height | `1080` | `1` - `8192` |
| `nearClip` | Near clipping plane | `0.3` | `> 0` |
| `farClip` | Far clipping plane | `1000` | `> nearClip` |

### Display Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backgroundColor` | Background color (RGBA 0-1) | `{r:0.2, g:0.2, b:0.2, a:1}` |
| `layers` | Unity layers to render | All layers |
| `showGizmos` | Show editor gizmos | `false` |
| `showColliders` | Visualize colliders | `false` |
| `showBounds` | Show bounding boxes | `false` |
| `highlightTarget` | Highlight target objects | `false` |

## Common AI/LLM Use Cases

### 1. Scene Understanding
```javascript
// Get overview of entire game level
{
  "captureMode": "explorer",
  "encodeAsBase64": true,
  "explorerSettings": {
    "camera": {
      "position": { "x": 0, "y": 100, "z": 0 },
      "rotation": { "x": 90, "y": 0, "z": 0 },
      "fieldOfView": 60
    }
  }
}
```

### 2. UI Analysis
```javascript
// Analyze UI layout
{
  "captureMode": "explorer",
  "encodeAsBase64": true,
  "explorerSettings": {
    "target": {
      "type": "gameObject",
      "name": "Canvas",
      "includeChildren": true
    },
    "camera": {
      "autoFrame": true,
      "padding": 0.1
    },
    "display": {
      "layers": ["UI"]
    }
  }
}
```

### 3. Physics Debugging
```javascript
// Visualize physics setup
{
  "captureMode": "explorer",
  "encodeAsBase64": true,
  "explorerSettings": {
    "target": {
      "type": "gameObject",
      "name": "PhysicsObject"
    },
    "display": {
      "showColliders": true,
      "showBounds": true
    }
  }
}
```

### 4. Multi-Object Analysis
```javascript
// Analyze all interactive objects
{
  "captureMode": "explorer",
  "encodeAsBase64": true,
  "explorerSettings": {
    "target": {
      "type": "tag",
      "tag": "Interactive"
    },
    "camera": {
      "autoFrame": true,
      "padding": 0.5
    },
    "display": {
      "highlightTarget": true,
      "showBounds": true
    }
  }
}
```

## Best Practices for AI/LLM Usage

### 1. Use Base64 Encoding
When capturing for immediate analysis, always use `encodeAsBase64: true` to avoid file I/O:
```javascript
{
  "captureMode": "explorer",
  "encodeAsBase64": true,
  // ... other settings
}
```

### 2. Optimize View for Analysis
- Use `autoFrame: true` for automatic object framing
- Adjust `padding` based on context needed (0.2-0.5 recommended)
- Enable `highlightTarget` for clear object identification
- Use `showBounds` for spatial understanding

### 3. Resolution Considerations
- Default 1920x1080 is usually sufficient
- Use higher resolutions (2560x1440, 3840x2160) for detailed analysis
- Lower resolutions (1280x720) for quick previews or multiple captures

### 4. Layer Filtering
Filter unnecessary layers to reduce visual noise:
```javascript
"display": {
  "layers": ["Default", "Player", "Enemies"]  // Only show relevant layers
}
```

### 5. Background Color
Choose appropriate background for contrast:
- Dark (0.2, 0.2, 0.2) - Good for most objects
- Light (0.8, 0.8, 0.8) - For dark objects
- Blue (0.53, 0.81, 0.92) - Sky-like for outdoor scenes

## Troubleshooting

### Common Issues and Solutions

1. **"GameObject not found"**
   - Verify the exact GameObject name (case-sensitive)
   - Check if GameObject is active in hierarchy
   - Use tag-based targeting as alternative

2. **"Invalid captureMode"**
   - Must be one of: "game", "scene", "window", "explorer"
   - Check spelling and lowercase

3. **"windowName is required"**
   - Required when captureMode is "window"
   - Common values: "Console", "Inspector", "Hierarchy", "Project"

4. **Resolution too large**
   - Maximum is 8192x8192
   - Consider if high resolution is necessary

5. **Path issues**
   - Must start with "Assets/"
   - Use forward slashes (/) not backslashes (\)
   - Must end with .png, .jpg, or .jpeg

## Performance Tips

1. **Batch Operations**: Capture multiple views in sequence rather than repeatedly
2. **Resolution**: Use appropriate resolution for the analysis task
3. **Base64**: Use for immediate processing, files for storage
4. **Layer Filtering**: Reduce rendered objects with layer filtering
5. **Far Clip**: Reduce `farClip` distance to improve performance

## Example Workflow for AI Analysis

```javascript
// Step 1: Get scene overview
{
  "captureMode": "explorer",
  "encodeAsBase64": true,
  "explorerSettings": {
    "camera": {
      "position": { "x": 50, "y": 50, "z": -50 },
      "lookAt": { "x": 0, "y": 0, "z": 0 },
      "fieldOfView": 60
    }
  }
}

// Step 2: Focus on specific object identified
{
  "captureMode": "explorer",
  "encodeAsBase64": true,
  "explorerSettings": {
    "target": {
      "type": "gameObject",
      "name": "IdentifiedObject",
      "includeChildren": true
    },
    "camera": {
      "autoFrame": true,
      "padding": 0.3
    },
    "display": {
      "highlightTarget": true
    }
  }
}

// Step 3: Analyze object details
{
  "captureMode": "explorer",
  "encodeAsBase64": true,
  "explorerSettings": {
    "target": {
      "type": "gameObject",
      "name": "IdentifiedObject"
    },
    "camera": {
      "autoFrame": true,
      "padding": 0.1,
      "fieldOfView": 30  // Zoom in
    },
    "display": {
      "showColliders": true,
      "showBounds": true
    }
  }
}
```

## Conclusion

The `capture_screenshot` tool, especially with Explorer Mode, provides powerful capabilities for AI/LLM to understand and analyze Unity scenes. By following this guide and best practices, you can effectively capture the visual information needed for comprehensive scene analysis and debugging.