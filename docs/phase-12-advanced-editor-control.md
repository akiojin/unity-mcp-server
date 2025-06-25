# Phase 12: Advanced Editor Control

## Overview
Implement comprehensive Unity Editor control features to match reference project capabilities, including tag/layer management, window management, tool selection, and selection queries.

## Current State
- Basic editor state queries (play mode, compilation status)
- Limited editor control functionality
- No tag/layer management
- No window or tool management
- No selection system access

## Target Features

### 1. Tag Management
**Handler:** `TagManagementHandler.cs` / `TagManagementToolHandler.js`

**Unity Operations:**
- `add_tag` - Add new tags to project settings
- `remove_tag` - Remove existing tags (with validation)
- `get_tags` - List all available tags

**Implementation Notes:**
- Use `UnityEditorInternal.InternalEditorUtility.tags`
- Validate tag names (no duplicates, valid characters)
- Handle built-in tags (Untagged, Respawn, Finish, etc.)

### 2. Layer Management  
**Handler:** `LayerManagementHandler.cs` / `LayerManagementToolHandler.js`

**Unity Operations:**
- `add_layer` - Add new layers to project settings
- `remove_layer` - Remove layers (with dependency check)
- `get_layers` - List all layers with indices
- `get_layer_by_name` - Convert layer name to index
- `get_layer_by_index` - Convert layer index to name

**Implementation Notes:**
- Use `UnityEditorInternal.InternalEditorUtility.layers`
- Handle built-in layers (Default, TransparentFX, etc.)
- Check for GameObjects using layer before removal
- Support both name and index operations

### 3. Editor Window Management
**Handler:** `WindowManagementHandler.cs` / `WindowManagementToolHandler.js`

**Unity Operations:**
- `get_windows` - List all open editor windows
- `focus_window` - Bring window to front
- `get_window_state` - Get window properties (docked, floating, etc.)

**Implementation Notes:**
- Use `Resources.FindObjectsOfTypeAll<EditorWindow>()`
- Window type detection and properties
- Focus management with `EditorWindow.Focus()`

### 4. Active Tool Management
**Handler:** `ToolManagementHandler.cs` / `ToolManagementToolHandler.js`

**Unity Operations:**
- `get_active_tool` - Get currently selected editor tool
- `set_active_tool` - Set active editor tool
- `get_available_tools` - List available tools

**Implementation Notes:**
- Use `Tools.current` for tool state
- Support built-in tools (Move, Rotate, Scale, etc.)
- Handle custom tools if available

### 5. Selection Queries
**Handler:** `SelectionHandler.cs` / `SelectionToolHandler.js`

**Unity Operations:**
- `get_selection` - Get currently selected objects
- `set_selection` - Set selected objects
- `get_selection_details` - Get detailed selection info
- `clear_selection` - Clear current selection

**Implementation Notes:**
- Use `Selection.objects` and `Selection.gameObjects`
- Provide detailed object information
- Handle multi-selection scenarios
- Include transform and component data

## MCP Server Tools

### 1. Tag Management Tools
```javascript
// TagManagementToolHandler.js
- add_tag(tagName)
- remove_tag(tagName, force=false) 
- get_tags()
```

### 2. Layer Management Tools
```javascript
// LayerManagementToolHandler.js  
- add_layer(layerName)
- remove_layer(layerName, force=false)
- get_layers()
- get_layer_index(layerName)
- get_layer_name(layerIndex)
```

### 3. Window Management Tools
```javascript
// WindowManagementToolHandler.js
- get_windows()
- focus_window(windowType)
- get_window_state(windowType)
```

### 4. Tool Management Tools
```javascript
// ToolManagementToolHandler.js
- get_active_tool()
- set_active_tool(toolType)
- get_available_tools()
```

### 5. Selection Tools
```javascript
// SelectionToolHandler.js
- get_selection(includeDetails=true)
- set_selection(objectPaths)
- clear_selection()
- get_selection_details()
```

## Implementation Priority

### Phase 12.1: Tag and Layer Management (Week 1)
- Implement TagManagementHandler.cs
- Implement LayerManagementHandler.cs
- Create corresponding MCP tool handlers
- Add comprehensive tests
- Update documentation

### Phase 12.2: Selection System (Week 2)
- Implement SelectionHandler.cs
- Create SelectionToolHandler.js
- Add selection state tracking
- Implement tests

### Phase 12.3: Window and Tool Management (Week 3)
- Implement WindowManagementHandler.cs
- Implement ToolManagementHandler.cs
- Create corresponding MCP handlers
- Add advanced features and tests

## Technical Considerations

### Unity Editor APIs
- `UnityEditorInternal.InternalEditorUtility` for tags/layers
- `Selection` class for selection management
- `Tools` class for tool management
- `EditorWindow` for window management

### Error Handling
- Tag/layer name validation
- Dependency checking before removal
- Window type validation
- Tool availability checking

### Performance
- Cache tag/layer lists when possible
- Efficient window enumeration
- Selection change event handling

## Success Criteria
- [ ] All 5 feature areas implemented
- [ ] Comprehensive error handling
- [ ] Full test coverage (unit + integration)
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Reference project feature parity achieved

## Dependencies
- Unity Editor APIs
- MCP server infrastructure
- Test framework enhancements

## Risks and Mitigations
- **Risk:** Unity API changes between versions
  - **Mitigation:** Version compatibility testing
- **Risk:** Performance impact of frequent queries
  - **Mitigation:** Caching and efficient polling
- **Risk:** Editor state synchronization issues
  - **Mitigation:** Event-based updates where possible