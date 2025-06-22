# Phase 3: Scene Management Tools

Phase 3 introduces scene management capabilities to the Unity MCP integration. This phase provides tools to create, load, save, and manage Unity scenes programmatically.

## Implemented Tools

### 1. create_scene
Creates a new scene in Unity.

**Parameters:**
- `sceneName` (string, required): Name of the scene to create
- `path` (string): Path where the scene should be saved (default: "Assets/Scenes/")
- `loadScene` (boolean): Whether to load the scene after creation (default: true)
- `addToBuildSettings` (boolean): Whether to add the scene to build settings (default: false)

**Example:**
```javascript
await callTool('create_scene', {
  sceneName: 'MyLevel',
  path: 'Assets/Levels/',
  loadScene: true,
  addToBuildSettings: true
});
```

**Response:**
```json
{
  "sceneName": "MyLevel",
  "path": "Assets/Levels/MyLevel.unity",
  "sceneIndex": 3,
  "isLoaded": true,
  "summary": "Created and loaded scene \"MyLevel\" at \"Assets/Levels/MyLevel.unity\" (build index: 3)"
}
```

## Implementation Details

### Architecture

The scene management tools follow the established pattern:

1. **Unity Side** (`SceneHandler.cs`):
   - Static handler class in the `UnityEditorMCP.Handlers` namespace
   - Methods handle scene operations using Unity's `EditorSceneManager` API
   - Integrated into `UnityEditorMCP.cs` command processing

2. **Node.js Side** (`CreateSceneToolHandler.js`):
   - Extends `BaseToolHandler` for consistent error handling
   - Validates parameters before sending to Unity
   - Provides detailed error messages

### Features

- **Automatic Directory Creation**: If the specified path doesn't exist, it will be created
- **Scene Name Validation**: Prevents invalid characters in scene names
- **Path Validation**: Ensures scenes are saved within the Assets folder
- **Build Settings Integration**: Optionally adds scenes to build settings with proper indexing
- **Load Control**: Choose whether to load the scene immediately or create it in the background
- **Undo Support**: All operations support Unity's undo system

### Error Handling

The tool provides specific error messages for common issues:
- Empty or invalid scene names
- Scenes that already exist
- Invalid save paths
- Unity compilation errors

## Testing

### Unit Tests
- **Unity**: `SceneHandlerTests.cs` - Tests scene creation logic
- **Node.js**: `createScene.test.js` - Tests tool definition and handler logic
- **Handler**: `CreateSceneToolHandler.test.js` - Tests the complete handler flow

### Test Coverage
- ✅ Basic scene creation
- ✅ Custom paths
- ✅ Load/no-load options
- ✅ Build settings integration
- ✅ Error scenarios
- ✅ Parameter validation

## Usage Examples

### Create a Simple Scene
```javascript
// Creates a scene in the default location
const result = await callTool('create_scene', {
  sceneName: 'MainMenu'
});
```

### Create a Level in Custom Folder
```javascript
// Creates a scene in a custom folder without loading it
const result = await callTool('create_scene', {
  sceneName: 'Level1',
  path: 'Assets/Game/Levels/',
  loadScene: false
});
```

### Create and Add to Build
```javascript
// Creates a scene and adds it to build settings
const result = await callTool('create_scene', {
  sceneName: 'GameScene',
  addToBuildSettings: true
});
console.log(`Scene added at build index: ${result.sceneIndex}`);
```

## Best Practices

1. **Use Descriptive Names**: Scene names should clearly indicate their purpose
2. **Organize by Folders**: Use the path parameter to organize scenes logically
3. **Build Settings**: Only add scenes to build settings if they're meant to be included in builds
4. **Check Existence**: Consider using find tools before creating to avoid duplicates

### 2. load_scene
Loads an existing scene in Unity.

**Parameters:**
- `scenePath` (string): Full path to the scene file (use either scenePath or sceneName)
- `sceneName` (string): Name of the scene to load (use either scenePath or sceneName)
- `loadMode` (string): How to load the scene - "Single" or "Additive" (default: "Single")

**Example:**
```javascript
await callTool('load_scene', {
  sceneName: 'MainMenu',
  loadMode: 'Single'
});
```

**Response:**
```json
{
  "sceneName": "MainMenu",
  "scenePath": "Assets/Scenes/MainMenu.unity",
  "loadMode": "Single",
  "isLoaded": true,
  "previousScene": "GameLevel",
  "summary": "Loaded scene \"MainMenu\" in Single mode"
}
```

### 3. save_scene
Saves the current scene.

**Parameters:**
- `scenePath` (string): Path to save the scene (optional, uses current path if not provided)
- `saveAs` (boolean): Whether to save as a new scene (default: false)

**Example:**
```javascript
await callTool('save_scene', {
  scenePath: 'Assets/Scenes/Level1_backup.unity',
  saveAs: true
});
```

**Response:**
```json
{
  "sceneName": "Level1",
  "scenePath": "Assets/Scenes/Level1_backup.unity",
  "originalPath": "Assets/Scenes/Level1.unity",
  "saved": true,
  "isDirty": false,
  "summary": "Saved scene \"Level1\" as \"Assets/Scenes/Level1_backup.unity\""
}
```

### 4. list_scenes
Lists all scenes in the project.

**Parameters:**
- `includeLoadedOnly` (boolean): Only include currently loaded scenes (default: false)
- `includeBuildScenesOnly` (boolean): Only include scenes in build settings (default: false)
- `includePath` (string): Filter scenes by path substring

**Example:**
```javascript
await callTool('list_scenes', {
  includeBuildScenesOnly: true
});
```

**Response:**
```json
{
  "scenes": [
    {
      "name": "MainMenu",
      "path": "Assets/Scenes/MainMenu.unity",
      "buildIndex": 0,
      "isLoaded": true,
      "isActive": true
    },
    {
      "name": "GameLevel",
      "path": "Assets/Scenes/GameLevel.unity",
      "buildIndex": 1,
      "isLoaded": false,
      "isActive": false
    }
  ],
  "totalCount": 2,
  "loadedCount": 1,
  "inBuildCount": 2,
  "summary": "Found 2 scenes in build settings"
}
```

### 5. get_scene_info
Gets detailed information about a scene.

**Parameters:**
- `scenePath` (string): Full path to the scene file (optional)
- `sceneName` (string): Name of the scene (optional)
- `includeGameObjects` (boolean): Include list of root GameObjects (default: false)

**Example:**
```javascript
await callTool('get_scene_info', {
  sceneName: 'MainMenu',
  includeGameObjects: true
});
```

**Response:**
```json
{
  "sceneName": "MainMenu",
  "scenePath": "Assets/Scenes/MainMenu.unity",
  "isLoaded": true,
  "isActive": true,
  "isDirty": false,
  "buildIndex": 0,
  "fileSize": 1048576,
  "lastModified": "2025-06-22T10:30:00Z",
  "rootGameObjects": [
    { "name": "Main Camera", "childCount": 0 },
    { "name": "Canvas", "childCount": 3 }
  ],
  "rootObjectCount": 2,
  "totalObjectCount": 5,
  "summary": "Scene \"MainMenu\" - Loaded and active, in build settings (index: 0), 1.0 MB, 5 total GameObjects"
}
```

## Version History

- **v0.3.3**: Initial implementation of create_scene tool
  - Basic scene creation functionality
  - Directory auto-creation
  - Build settings integration

- **v0.3.4**: Implementation of load_scene tool
  - Single and Additive load modes
  - Support for loading by name or path
  - Build settings validation

- **v0.3.5**: Implementation of save_scene tool
  - Save current scene
  - Save As functionality
  - Dirty state detection

- **v0.3.6**: Implementation of list_scenes tool
  - List all project scenes
  - Filter by loaded/build status
  - Path filtering support

- **v0.3.7**: Implementation of get_scene_info tool
  - Detailed scene information
  - GameObject hierarchy info
  - File metadata
  - **Phase 3 Complete**: All scene management tools implemented