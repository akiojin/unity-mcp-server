# Phase 6: Play Mode Controls Implementation

## Overview
Implement Unity Editor play mode control functionality to allow users to start, pause/resume, and stop play mode through MCP commands. This will enable testing and debugging of Unity scenes directly through the MCP interface.

## Objectives
1. Create play mode control tools (play, pause, stop)
2. Add editor state querying capabilities
3. Implement proper error handling for play mode transitions
4. Ensure thread-safe operations with Unity's main thread
5. Add comprehensive tests for all new functionality

## Reference Implementation Analysis
The reference project implements these features in `ManageEditor.cs` with:
- **play** action: Starts play mode using `EditorApplication.isPlaying = true`
- **pause** action: Toggles pause state using `EditorApplication.isPaused`
- **stop** action: Exits play mode using `EditorApplication.isPlaying = false`
- **get_state** action: Returns current editor state including play/pause status

## Implementation Plan

### 1. Unity Editor Handler (C#)
Create `PlayModeHandler.cs` in `unity-editor-mcp/Editor/Handlers/`:
```csharp
- HandlePlayCommand(): Start play mode
- HandlePauseCommand(): Toggle pause/resume
- HandleStopCommand(): Exit play mode
- HandleGetStateCommand(): Return current play mode state
```

### 2. Node.js MCP Server

#### 2.1 Tool Definitions
Create in `mcp-server/src/tools/editor/`:
- `playMode.js` - Tool definitions and handlers for play/pause/stop
- `getEditorState.js` - Tool for querying editor state

#### 2.2 Handler Classes
Create in `mcp-server/src/handlers/`:
- `PlayToolHandler.js` - Start play mode
- `PauseToolHandler.js` - Toggle pause/resume
- `StopToolHandler.js` - Stop play mode
- `GetEditorStateToolHandler.js` - Query editor state

### 3. Tool Specifications

#### 3.1 play_game
```javascript
{
  name: 'play_game',
  description: 'Start Unity play mode to test the game',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
}
```

#### 3.2 pause_game
```javascript
{
  name: 'pause_game',
  description: 'Pause or resume Unity play mode',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
}
```

#### 3.3 stop_game
```javascript
{
  name: 'stop_game',
  description: 'Stop Unity play mode and return to edit mode',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
}
```

#### 3.4 get_editor_state
```javascript
{
  name: 'get_editor_state',
  description: 'Get current Unity editor state including play mode status',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
}
```

## Technical Considerations

### 1. Thread Safety
- All Unity Editor API calls must be executed on the main thread
- Use Unity's dispatcher pattern for safe execution

### 2. State Validation
- Check current state before attempting transitions
- Handle edge cases (e.g., already playing, not in play mode when pausing)

### 3. Error Handling
- Graceful handling of compilation errors preventing play mode
- Clear error messages for invalid state transitions

### 4. Response Format
Consistent response format for all play mode commands:
```javascript
{
  success: true/false,
  message: "Descriptive message",
  state: {
    isPlaying: boolean,
    isPaused: boolean,
    isCompiling: boolean,
    timeSinceStartup: number
  }
}
```

## Testing Strategy

### 1. Unit Tests
- Test each handler's validation logic
- Mock Unity connection responses
- Verify error handling

### 2. Integration Tests
- Test state transitions (edit → play → pause → resume → stop)
- Verify state consistency
- Test error scenarios

### 3. Manual Testing Checklist
- [ ] Start play mode from edit mode
- [ ] Pause during play mode
- [ ] Resume from pause
- [ ] Stop play mode
- [ ] Attempt invalid transitions
- [ ] Query state at each stage

## Success Criteria
1. All play mode commands execute successfully
2. State transitions are reliable and predictable
3. Error messages are clear and actionable
4. All tests pass with >90% coverage
5. Documentation is complete and accurate

## Future Enhancements (Out of Scope)
- Frame stepping functionality
- Play mode options (maximize on play, etc.)
- Build and run functionality
- Performance profiling integration

## Dependencies
- Unity Editor API (EditorApplication class)
- Existing MCP server infrastructure
- Unity connection handling

## Estimated Timeline
- Unity Handler Implementation: 2 hours
- Node.js Tool Implementation: 2 hours
- Testing: 2 hours
- Documentation: 1 hour
- **Total: 7 hours**