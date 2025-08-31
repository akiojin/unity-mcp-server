# Unity MCP Screenshot System

## Overview
The Unity MCP Screenshot System enables capturing and analyzing screenshots from Unity Editor through MCP. This feature supports two main modes:
1. **User Perspective**: Capturing actual views (Game View, Scene View) as the user sees them
2. **LLM Explorer Mode**: AI-controlled camera for exploring scenes independently

The system provides basic image analysis capabilities with hooks for AI-powered vision analysis.

## Features

### Screenshot Capture Modes

#### User Perspective Modes
- **Game View Capture**: Capture the game as it appears during play or edit mode
- **Scene View Capture**: Capture the editor's 3D scene view with camera position data
- **Window Capture**: (Placeholder) Capture specific Unity Editor windows

#### LLM Explorer Mode (New)
- **Independent Camera**: Creates temporary camera without affecting user's view
- **Target-based Capture**: Focus on specific GameObjects, tags, or areas
- **Auto-framing**: Automatically positions camera to frame targets
- **Manual Control**: Direct camera positioning and orientation
- **Layer Filtering**: Capture only specific layers
- **Custom Backgrounds**: Set background colors for clarity

### Common Features
- **Custom Resolution**: Specify width and height for screenshots
- **Base64 Encoding**: Get screenshot data as base64 for immediate processing
- **Automatic Timestamping**: Auto-generated filenames with timestamps

### Screenshot Analysis
- **Basic Analysis**: Image dimensions, file size, and format detection
- **Color Analysis**: Dominant color extraction with percentages
- **UI Detection**: Basic edge detection for UI elements
- **AI Integration Ready**: Placeholder for vision model integration (GPT-4V, Claude Vision, etc.)

## Implementation

### Unity C# Components

#### ScreenshotHandler.cs
Located at: `unity-editor-mcp/Editor/Handlers/ScreenshotHandler.cs`

**Key Methods:**
- `CaptureScreenshot(JObject parameters)` - Main capture method
- `CaptureGameView()` - Uses ScreenCapture API for Game View
- `CaptureSceneView()` - Uses Scene camera rendering for Scene View
- `AnalyzeScreenshot()` - Basic image analysis
- `AnalyzeDominantColors()` - Color histogram analysis
- `AnalyzeUIElements()` - Simple edge detection for UI

### MCP Server Components

#### CaptureScreenshotToolHandler.js
Located at: `mcp-server/src/handlers/screenshot/CaptureScreenshotToolHandler.js`

**Parameters:**
```javascript
{
  outputPath: string,      // Path to save screenshot (optional)
  captureMode: string,     // "game", "scene", "window", or "explorer"
  width: number,          // Custom width (optional, not for explorer mode)
  height: number,         // Custom height (optional, not for explorer mode)
  includeUI: boolean,     // Include UI in Game View (default: true)
  windowName: string,     // Window name for window mode
  encodeAsBase64: boolean, // Return as base64 (default: false)
  explorerSettings: {      // Settings for explorer mode (optional)
    target: {              // Target configuration
      type: string,        // "gameObject", "tag", "area", or "position"
      name: string,        // GameObject name (for gameObject type)
      tag: string,         // Tag name (for tag type)
      center: Vector3,     // Center position (for area type)
      radius: number,      // Radius (for area type)
      includeChildren: boolean // Include children in bounds calculation
    },
    camera: {              // Camera configuration
      position: Vector3,   // Manual camera position
      lookAt: Vector3,     // Point to look at
      rotation: Vector3,   // Euler angles rotation
      fieldOfView: number, // FOV in degrees (default: 60)
      autoFrame: boolean,  // Auto-frame target (default: true)
      padding: number,     // Framing padding 0-1 (default: 0.2)
      width: number,       // Resolution width (default: 1920)
      height: number       // Resolution height (default: 1080)
    },
    display: {             // Display settings
      backgroundColor: Color, // Background color
      layers: string[],    // Layer names to render
      highlightTarget: boolean // Highlight target (placeholder)
    }
  }
}
```

#### AnalyzeScreenshotToolHandler.js
Located at: `mcp-server/src/handlers/screenshot/AnalyzeScreenshotToolHandler.js`

**Parameters:**
```javascript
{
  imagePath: string,      // Path to screenshot file
  base64Data: string,     // OR base64 encoded image
  analysisType: string,   // "basic", "ui", "content", "full"
  prompt: string         // Optional AI analysis prompt
}
```

<!-- Usage examples have been intentionally removed to keep docs/ focused on architecture/design. -->

#### Capture Scene View with Custom Resolution
```javascript
// HD Scene View capture (editor camera view)
const result = await mcp.tools.capture_screenshot({
  captureMode: 'scene',
  width: 1920,
  height: 1080,
  outputPath: 'Assets/Screenshots/scene_hd.png'
});
// Includes camera position and rotation data
```

### LLM Explorer Mode Captures

#### Auto-frame a GameObject
```javascript
// LLM explores and captures a specific GameObject
const result = await mcp.tools.capture_screenshot({
  captureMode: 'explorer',
  explorerSettings: {
    target: {
      type: 'gameObject',
      name: 'Player',
      includeChildren: true
    },
    camera: {
      autoFrame: true,
      padding: 0.3
    }
  }
});
// Camera automatically positions to frame the Player
```

#### Capture Objects by Tag
```javascript
// Find and frame all enemies
const result = await mcp.tools.capture_screenshot({
  captureMode: 'explorer',
  explorerSettings: {
    target: {
      type: 'tag',
      tag: 'Enemy'
    },
    camera: {
      autoFrame: true
    }
  }
});
// Frames all GameObjects tagged as "Enemy"
```

#### Manual Camera Control
```javascript
// LLM positions camera manually
const result = await mcp.tools.capture_screenshot({
  captureMode: 'explorer',
  explorerSettings: {
    camera: {
      position: { x: 0, y: 50, z: 0 },
      lookAt: { x: 0, y: 0, z: 0 },
      fieldOfView: 90
    },
    display: {
      backgroundColor: { r: 0, g: 0, b: 0 },
      layers: ['Default', 'Player']
    }
  }
});
// Top-down view with black background, showing only specific layers
```

#### Capture Area Overview
```javascript
// Survey a specific area
const result = await mcp.tools.capture_screenshot({
  captureMode: 'explorer',
  explorerSettings: {
    target: {
      type: 'area',
      center: { x: 10, y: 0, z: 10 },
      radius: 25
    }
  }
});
// Automatically positions camera to capture the specified area
```

### Capture and Analyze in One Workflow
```javascript
// 1. Capture with base64 encoding
const capture = await mcp.tools.capture_screenshot({
  captureMode: 'game',
  encodeAsBase64: true
});

// 2. Analyze the captured image
const analysis = await mcp.tools.analyze_screenshot({
  base64Data: capture.base64Data,
  analysisType: 'full',
  prompt: 'Identify all UI buttons and describe the scene'
});
```

### Analyze Existing Screenshot
```javascript
const analysis = await mcp.tools.analyze_screenshot({
  imagePath: 'Assets/Screenshots/ui_test.png',
  analysisType: 'ui'
});
// Returns dominant colors and basic UI element detection
```

## Technical Details

### Game View Capture
- Uses Unity's `ScreenCapture.CaptureScreenshot()` API
- Captures exactly what's visible in the Game View
- Includes UI elements by default
- Temporary file approach ensures reliable capture

### Scene View Capture
- Accesses `SceneView.lastActiveSceneView.camera`
- Creates RenderTexture for custom resolution
- Captures editor gizmos and handles
- Includes camera transform data in response

### Explorer Mode Capture
- Creates temporary `MCP_ExplorerCamera` GameObject
- Configures camera independently of user's view
- Auto-calculates optimal position for targets
- Cleans up camera after capture
- No impact on game state or user's camera

### Color Analysis
- Samples pixels at intervals for performance
- Quantizes colors to reduce noise (32-level quantization)
- Returns top 5 dominant colors with:
  - RGB values
  - Hex color codes
  - Percentage of image coverage

### Base64 Encoding
- Enables immediate processing without file I/O
- Useful for streaming to AI vision APIs
- Adds minimal overhead for reasonably sized images

## AI Integration Guide

The system includes placeholders for AI vision integration. To enable AI analysis:

1. **Choose a Vision API**:
   - OpenAI GPT-4V
   - Anthropic Claude 3 Vision
   - Google Vision API
   - Custom vision models

2. **Update AnalyzeScreenshotToolHandler.js**:
```javascript
// In analyzeBase64Image method
if (prompt && base64Data) {
  const visionResult = await callVisionAPI({
    image: base64Data,
    prompt: prompt
  });
  result.aiAnalysis = visionResult;
}
```

3. **Unity-Side AI Integration**:
   - Add vision API calls in ScreenshotHandler.cs
   - Process results for Unity-specific insights
   - Return structured data for game logic

## Limitations and Notes

### Current Limitations
1. **Window Capture**: Not fully implemented due to Unity Editor limitations
2. **Performance**: Large screenshots may cause brief editor freezes
3. **File Format**: Currently supports PNG output only
4. **AI Analysis**: Requires external API integration

### Best Practices
1. **Resolution**: Keep screenshots under 4K for performance
2. **Frequency**: Avoid rapid successive captures
3. **Storage**: Implement cleanup for old screenshots
4. **Base64**: Use for small images or immediate processing

### Future Enhancements
1. **Video Capture**: Record gameplay clips
2. **GIF Creation**: Animated captures for documentation
3. **Batch Processing**: Multiple screenshots in sequence
4. **Advanced Analysis**: Object detection, text OCR
5. **Comparison Tools**: Diff between screenshots

## Error Handling

Common errors and solutions:

1. **"Game View not found"**
   - Ensure Game View window is open
   - Focus the Game View before capture

2. **"Scene View camera not available"**
   - Open a Scene View window
   - Ensure a scene is loaded

3. **"Invalid output path"**
   - Path must start with "Assets/"
   - Ensure directory exists or will be created

4. **"Image file not found"** (analysis)
   - Verify the image path exists
   - Use AssetDatabase.Refresh() if needed

## Test Results

All screenshot system tests pass:
- ✅ Game View capture
- ✅ Scene View capture  
- ✅ Base64 encoding
- ✅ Error validation
- ✅ Image analysis
- ✅ Integration workflow

The screenshot system is production-ready and provides a solid foundation for visual testing, documentation, and AI-powered game analysis.
