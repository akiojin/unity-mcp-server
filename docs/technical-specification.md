# Unity Editor MCP Technical Specification

## System Architecture

### Component Overview

#### Unity Editor MCP (C#)
- **Runtime**: Unity Editor 2020.3 LTS or newer
- **Language**: C# (.NET Standard 2.1)
- **Dependencies**: 
  - Newtonsoft.Json (via Unity Package Manager)
  - Unity Editor assemblies

#### MCP Server (Node.js)
- **Runtime**: Node.js 18+
- **Framework**: MCP SDK for JavaScript
- **Dependencies**:
  - @modelcontextprotocol/sdk
  - net (built-in)
  - winston (logging)

### Communication Flow

```
1. MCP Client sends request to Node.js Server (stdio)
2. Node.js Server translates to Unity command format
3. Node.js sends command via TCP to Unity (port 6400)
4. Unity processes command on main thread
5. Unity sends response back via TCP
6. Node.js Server translates response to MCP format
7. Node.js Server returns result to MCP Client
```

## Command Specifications

### GameObject Management

#### create_gameobject
```typescript
interface CreateGameObjectParams {
  name: string;
  primitive?: "cube" | "sphere" | "cylinder" | "capsule" | "plane" | "quad";
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  parent?: string;  // GameObject name or path
}

interface CreateGameObjectResult {
  success: boolean;
  gameObjectId: string;
  path: string;
}
```

#### modify_gameobject
```typescript
interface ModifyGameObjectParams {
  name: string;  // Target GameObject
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  active?: boolean;
  newName?: string;
  tag?: string;
  layer?: number;
}
```

#### delete_gameobject
```typescript
interface DeleteGameObjectParams {
  name: string;
  includeChildren?: boolean;
}
```

### Scene Management

#### create_scene
```typescript
interface CreateSceneParams {
  name: string;
  path?: string;  // Default: "Assets/Scenes/"
  setActive?: boolean;
  addToBuilder?: boolean;
}
```

#### load_scene
```typescript
interface LoadSceneParams {
  name?: string;
  path?: string;
  buildIndex?: number;
  mode?: "single" | "additive";
}
```

#### save_scene
```typescript
interface SaveSceneParams {
  path?: string;  // Current scene if not specified
  saveAs?: string;  // New path for save as
}
```

### Asset Management

#### create_folder
```typescript
interface CreateFolderParams {
  path: string;  // e.g., "Assets/MyFolder"
  createParents?: boolean;
}
```

#### create_prefab
```typescript
interface CreatePrefabParams {
  gameObjectName: string;
  prefabPath: string;  // e.g., "Assets/Prefabs/MyPrefab.prefab"
  includeChildren?: boolean;
}
```

#### instantiate_prefab
```typescript
interface InstantiatePrefabParams {
  prefabPath: string;
  position?: Vector3;
  rotation?: Vector3;
  parent?: string;
}
```

### Script Management

#### create_script
```typescript
interface CreateScriptParams {
  name: string;
  path: string;  // e.g., "Assets/Scripts/"
  template?: "monobehaviour" | "scriptableobject" | "editor" | "empty";
  content?: string;  // Custom content if template is "empty"
}
```

#### read_script
```typescript
interface ReadScriptParams {
  path: string;  // Full asset path
}

interface ReadScriptResult {
  content: string;
  lastModified: string;
  guid: string;
}
```

#### update_script
```typescript
interface UpdateScriptParams {
  path: string;
  content: string;
  createBackup?: boolean;
}
```

### Component Management

#### add_component
```typescript
interface AddComponentParams {
  gameObject: string;
  componentType: string;  // e.g., "Rigidbody", "BoxCollider"
  properties?: Record<string, any>;
}
```

#### remove_component
```typescript
interface RemoveComponentParams {
  gameObject: string;
  componentType: string;
}
```

#### get_components
```typescript
interface GetComponentsParams {
  gameObject: string;
  includeInherited?: boolean;
}
```

### Editor Control

#### set_play_mode
```typescript
interface SetPlayModeParams {
  mode: "play" | "pause" | "stop";
}
```

#### execute_menu_item
```typescript
interface ExecuteMenuItemParams {
  path: string;  // e.g., "File/Save Project"
}
```

#### read_console
```typescript
interface ReadConsoleParams {
  logType?: "all" | "log" | "warning" | "error";
  limit?: number;
  clear?: boolean;
}
```

## Data Types

### Vector3
```typescript
interface Vector3 {
  x: number;
  y: number;
  z: number;
}
```

### Color
```typescript
interface Color {
  r: number;  // 0-1
  g: number;  // 0-1
  b: number;  // 0-1
  a?: number; // 0-1, default 1
}
```

### Transform
```typescript
interface Transform {
  position: Vector3;
  rotation: Vector3;  // Euler angles
  scale: Vector3;
}
```

## Error Handling

### Error Response Format
```json
{
  "status": "error",
  "error": {
    "code": "UNITY_001",
    "message": "GameObject not found",
    "details": {
      "gameObject": "MyObject",
      "availableObjects": ["Main Camera", "Directional Light"]
    }
  }
}
```

### Error Codes
- `CONN_001` - Cannot connect to Unity
- `CONN_002` - Connection lost during operation
- `CONN_003` - Port already in use
- `CONN_004` - Invalid connection parameters
- `UNITY_001` - GameObject not found
- `UNITY_002` - Component not found
- `UNITY_003` - Invalid component type
- `UNITY_004` - Scene operation failed
- `UNITY_005` - Invalid transform values
- `UNITY_006` - Hierarchy operation failed
- `ASSET_001` - Asset not found
- `ASSET_002` - Invalid asset path
- `ASSET_003` - Asset already exists
- `ASSET_004` - Asset import failed
- `SCRIPT_001` - Script compilation error
- `SCRIPT_002` - Script not found
- `SCRIPT_003` - Invalid script template
- `PERM_001` - Operation not allowed in play mode
- `PERM_002` - Read-only asset
- `MENU_001` - Menu item not found
- `MENU_002` - Menu item execution failed
- `CONFIG_001` - Client configuration failed
- `CONFIG_002` - Invalid configuration format

## Connection Management

### TCP Protocol
- Port: 6400 (configurable)
- Host: localhost only
- Timeout: 30 seconds
- Keep-alive: Enabled
- Max message size: 10MB

### Reconnection Strategy
1. Initial connection attempt
2. On failure, retry after 1 second
3. Exponential backoff: 1s, 2s, 4s, 8s
4. Max retry attempts: 5
5. Reset retry count on successful command

### Connection Health Check
- Ping command every 30 seconds
- Automatic reconnection on ping failure
- Grace period for Unity compilation

## Performance Considerations

### Buffering
- Command queue in Unity for thread safety
- Response buffering for large data (scripts, hierarchies)
- Chunk size: 8KB

### Optimization Strategies
1. Batch operations where possible
2. Lazy loading for hierarchies
3. Caching for frequently accessed data
4. Async operations for file I/O

### Rate Limiting
- Max commands per second: 100
- Queue overflow handling
- Priority system for critical commands

## Security Model

### Access Control
- Local connections only (no remote access)
- No authentication (development tool)
- File system access limited to project folder

### Input Validation
- Path traversal prevention
- Script content sanitization
- Command parameter validation
- Size limits for string inputs

## Extensibility

### Adding New Tools
1. Define command in Unity Bridge
2. Create handler method
3. Add Python tool wrapper
4. Update documentation

### Plugin System
- Custom command handlers
- Tool discovery mechanism
- Version compatibility checks

## Testing Requirements

### Unit Tests
- Command parsing
- Parameter validation
- Error handling
- Response formatting

### Integration Tests
- TCP communication
- Full command flow
- Error propagation
- Connection recovery

### Performance Tests
- Command throughput
- Large data handling
- Memory usage
- Connection stability

## UI Components

### Main Control Window
```csharp
public class UnityEditorMCPWindow : EditorWindow {
    // Connection status display
    // Server controls (Start/Stop/Restart)
    // Client configuration buttons
    // Auto-install server button
    // Connection logs
}
```

### Manual Configuration Window
```csharp
public class ManualConfigWindow : EditorWindow {
    // Platform-specific instructions
    // Copy buttons for paths
    // JSON configuration examples
    // Direct file opening
    // Validation feedback
}
```

### Status Indicators
- Green: Connected and operational
- Yellow: Connecting or configuring
- Red: Disconnected or error
- Gray: Not configured

## Auto-Configuration System

### Server Installation
1. Detect platform (Windows/macOS/Linux)
2. Download Node.js server package
3. Install to platform-specific location:
   - Windows: `%LOCALAPPDATA%\Programs\UnityEditorMCP\`
   - macOS: `/usr/local/bin/UnityEditorMCP/`
   - Linux: `~/bin/UnityEditorMCP/`
4. Verify installation
5. Set up auto-update checks

### Client Detection & Configuration
1. Detect installed MCP clients:
   - Claude Desktop
   - Cursor
   - Other known clients
2. Read existing configuration
3. Merge Unity Editor MCP settings
4. Write updated configuration
5. Verify configuration

### Configuration Paths
- Claude (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude (Windows): `%APPDATA%\Claude\claude_desktop_config.json`
- Cursor: Platform-specific paths

## Deployment

### Unity Package
- package.json manifest
- Assembly definitions
- Editor-only code
- No runtime dependencies

### Node.js Server
- npm/yarn installation
- package.json configuration
- Cross-platform compatibility
- Auto-update mechanism