---
description: Check Unity Editor connection, scene info, and compilation state
---

# Unity Status Check

Comprehensively check the current state of Unity Editor.

## Actions

The following information is retrieved and reported:

### 1. Connection Check

```javascript
mcp__unity-mcp-server__ping()
```

Verifies the connection to Unity Editor is working.

### 2. Editor State Check

```javascript
mcp__unity-mcp-server__get_editor_state()
```

Gets the current editor state (Play/Edit mode, pause state, etc.).

### 3. Scene Info Check

```javascript
mcp__unity-mcp-server__get_scene_info()
```

Gets information about the currently loaded scene.

### 4. Compilation State Check

```javascript
mcp__unity-mcp-server__get_compilation_state({ includeMessages: true })
```

Shows any compilation errors or warnings.

### 5. Console Log Check (Errors Only)

```javascript
mcp__unity-mcp-server__read_console({ logTypes: ["Error"], count: 10 })
```

Checks recent error logs.

## Output Format

```
## Unity Status Report

### Connection
Connected to Unity Editor

### Editor State
- Mode: Edit Mode
- Paused: false

### Current Scene
- Name: SampleScene
- Path: Assets/Scenes/SampleScene.unity
- Saved: true

### Compilation
Compilation successful (no errors)

### Recent Errors
(none)
```

## Usage

```
/unity-status
```

Use this command to verify Unity state before development or for debugging issues.
