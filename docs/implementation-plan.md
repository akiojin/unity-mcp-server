# Unity Editor MCP Implementation Plan

## Project Overview

Unity Editor MCP (Model Context Protocol) is a bridge that enables AI assistants to interact directly with the Unity Editor through a standardized protocol. This document outlines the implementation plan for creating our own Unity Editor MCP system.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ MCP Client  │────▶│  MCP Server  │────▶│  Unity MCP  │
│(Claude/etc) │◀────│   (Node.js)  │◀────│    (C#)     │
└─────────────┘     └──────────────┘     └─────────────┘
     JSON               Socket              Unity API
   Protocol           TCP:6400             Editor
```

## Core Components

### 1. Unity Editor MCP Package (C#)
**Location**: `/unity-editor-mcp/`

#### Core Systems
- **TCP Server**: Listens on port 6400 for incoming commands
- **Command Router**: Parses JSON and routes to appropriate handlers
- **Response Manager**: Formats and sends responses back to server
- **Unity API Integration**: Safe main-thread execution of Unity commands
- **Auto-Installer**: Automatic server installation and updates
- **Configuration Manager**: Client auto-configuration and persistence
- **Status Monitor**: Connection health and visual indicators

#### Essential Tools to Implement
1. **Scene Management**
   - Create new scene
   - Load/Save scenes
   - Get scene hierarchy
   - Manage scene objects

2. **GameObject Operations**
   - Create primitives (cube, sphere, etc.)
   - Create empty GameObject
   - Modify transform (position, rotation, scale)
   - Add/Remove components
   - Parent/Unparent objects
   - Find objects by name/tag

3. **Asset Management**
   - Create folders
   - Import assets
   - Create prefabs
   - Instantiate prefabs
   - Delete assets

4. **Script Management**
   - Create C# scripts
   - Read script contents
   - Update scripts
   - Attach scripts to GameObjects

5. **Editor Control**
   - Play/Pause/Stop
   - Save project
   - Refresh assets
   - Execute menu items
   - Read console logs
   - Clear console
   - Log type filtering

#### Helper Classes
- **Response**: Standardized response formatting
- **Vector3Helper**: Vector3 parsing utilities
- **ServerInstaller**: Automated installation and updates
- **ConnectionManager**: TCP connection lifecycle

#### UI Components
- **Main Control Window**: Status monitoring and controls
- **Manual Config Window**: Step-by-step configuration guide
- **Status Indicators**: Visual connection feedback

#### Data Models
- **McpClient**: Client configuration registry
- **ServerConfig**: Server configuration model
- **McpStatus**: Connection status enum
- **DefaultConfig**: Default settings

### 2. Node.js MCP Server
**Location**: `/mcp-server/`

#### Core Components
- **MCP SDK Integration**: Use official MCP SDK for Node.js
- **Unity Connection**: Manage TCP connection to Unity
- **Tool Registry**: Register and expose Unity operations as MCP tools
- **Error Handling**: Graceful error recovery and reporting

#### Key Modules
- `server.js` - Main MCP server entry point
- `unityConnection.js` - TCP client for Unity communication
- `tools/` - Individual tool implementations
  - `sceneTools.js`
  - `gameObjectTools.js`
  - `assetTools.js`
  - `scriptTools.js`
  - `editorTools.js`

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up project structure
- [ ] Create Unity package with basic TCP server
- [ ] Implement Node.js MCP server skeleton
- [ ] Establish basic communication (ping/pong)
- [ ] Create command routing system

### Phase 2: Core Tools (Week 2)
- [ ] Implement GameObject creation/manipulation
- [ ] Add scene management capabilities
- [ ] Create basic asset operations
- [ ] Implement console reading

### Phase 3: Advanced Features (Week 3)
- [ ] Script creation and management
- [ ] Prefab system integration
- [ ] Component management
- [ ] Editor state control

### Phase 4: Polish & Testing (Week 4)
- [ ] Error handling improvements
- [ ] Connection stability
- [ ] Auto-configuration for clients
- [ ] Documentation
- [ ] Example projects

## Technical Specifications

### Communication Protocol
```json
// Request Format
{
  "type": "command_name",
  "params": {
    "param1": "value1",
    "param2": "value2"
  }
}

// Response Format
{
  "status": "success|error",
  "result": {
    // Command-specific data
  },
  "error": "Error message if status is error"
}
```

### Unity Editor MCP API Examples
```csharp
// GameObject Creation
{
  "type": "create_gameobject",
  "params": {
    "name": "MyObject",
    "primitive": "cube",
    "position": {"x": 0, "y": 1, "z": 0}
  }
}

// Scene Management
{
  "type": "create_scene",
  "params": {
    "name": "MyNewScene",
    "path": "Assets/Scenes/"
  }
}
```

### Node.js MCP Tool Definitions
```javascript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "create_gameobject",
    description: "Creates a new GameObject in the scene",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        primitive: { type: "string" },
        position: { type: "object" }
      }
    }
  }]
}));
```

## Development Guidelines

### Unity C# Standards
- Use async/await for non-blocking operations
- All Unity API calls must be on main thread
- Comprehensive error handling with try-catch
- Clear logging for debugging

### Node.js Standards
- ES6+ syntax with async/await
- JSDoc comments for documentation
- Proper error propagation
- Connection retry logic with exponential backoff

### Testing Strategy
1. Unit tests for command parsing
2. Integration tests for Unity-Node.js communication
3. End-to-end tests with MCP clients
4. Performance tests for large operations

## Security Considerations
- Local-only connections (localhost)
- No authentication needed (local dev tool)
- Input validation for all commands
- Safe file path handling

## Performance Goals
- < 100ms response time for simple operations
- Handle large script files (up to 10MB)
- Concurrent command support
- Graceful degradation under load

## Success Metrics
- All core Unity operations accessible via MCP
- Stable connection management
- Clear error messages
- Easy installation process
- Comprehensive documentation

## Next Steps
1. Create project repository structure
2. Initialize Unity package
3. Set up Node.js development environment
4. Implement basic TCP communication
5. Create first working tool (e.g., create_gameobject)

## Resources
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Unity Editor Scripting](https://docs.unity3d.com/Manual/ExtendingTheEditor.html)
- [MCP SDK for Node.js](https://github.com/modelcontextprotocol/sdk-js)
- Unity Editor MCP Reference Implementation