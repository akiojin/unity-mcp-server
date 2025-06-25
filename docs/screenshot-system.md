# Unity MCP Screenshot System

## Overview
The Unity MCP Screenshot System enables capturing and analyzing screenshots from Unity Editor through MCP. This feature supports capturing Game View, Scene View, and provides basic image analysis capabilities with hooks for AI-powered vision analysis.

## Features

### Screenshot Capture
- **Game View Capture**: Capture the game as it appears during play or edit mode
- **Scene View Capture**: Capture the editor's 3D scene view with camera position data
- **Window Capture**: (Placeholder) Capture specific Unity Editor windows
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
  captureMode: string,     // "game", "scene", or "window"
  width: number,          // Custom width (optional)
  height: number,         // Custom height (optional)
  includeUI: boolean,     // Include UI in Game View (default: true)
  windowName: string,     // Window name for window mode
  encodeAsBase64: boolean // Return as base64 (default: false)
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

## Usage Examples

### Capture Game View Screenshot
```javascript
// Basic Game View capture
const result = await mcp.tools.capture_screenshot({
  captureMode: 'game',
  includeUI: true
});
// Result: { path: "Assets/Screenshots/screenshot_game_2025-06-25.png", width: 1920, height: 1080 }
```

### Capture Scene View with Custom Resolution
```javascript
// HD Scene View capture
const result = await mcp.tools.capture_screenshot({
  captureMode: 'scene',
  width: 1920,
  height: 1080,
  outputPath: 'Assets/Screenshots/scene_hd.png'
});
// Includes camera position and rotation data
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