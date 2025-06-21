# Phase 2: GameObject Operations Tools

Phase 2 introduces comprehensive GameObject manipulation capabilities to the Unity MCP integration. These tools allow you to create, modify, find, and delete GameObjects in Unity scenes programmatically.

## Implemented Tools

### 1. create_gameobject
Creates new GameObjects in the Unity scene.

**Parameters:**
- `name` (string): Name of the GameObject (default: "GameObject")
- `primitiveType` (string): Type of primitive - "cube", "sphere", "cylinder", "capsule", "plane", "quad"
- `position` (object): World position with x, y, z properties
- `rotation` (object): Rotation in Euler angles with x, y, z properties
- `scale` (object): Local scale with x, y, z properties
- `parentPath` (string): Path to parent GameObject
- `tag` (string): Tag to assign
- `layer` (number): Layer index (0-31)

**Example:**
```javascript
await callTool('create_gameobject', {
  name: 'MyCube',
  primitiveType: 'cube',
  position: { x: 0, y: 1, z: 0 },
  rotation: { x: 0, y: 45, z: 0 },
  scale: { x: 2, y: 2, z: 2 }
});
```

### 2. find_gameobject
Finds GameObjects by name, tag, or layer.

**Parameters:**
- `name` (string): Name to search for
- `tag` (string): Tag to search for
- `layer` (number): Layer index to search for
- `exactMatch` (boolean): Whether to match name exactly (default: true)

**Example:**
```javascript
// Find all objects with "Enemy" in their name
await callTool('find_gameobject', {
  name: 'Enemy',
  exactMatch: false
});

// Find all objects with "Player" tag
await callTool('find_gameobject', {
  tag: 'Player'
});
```

### 3. modify_gameobject
Modifies properties of existing GameObjects.

**Parameters:**
- `path` (string, required): Path to the GameObject
- `name` (string): New name
- `position` (object): New position
- `rotation` (object): New rotation
- `scale` (object): New scale
- `active` (boolean): Set active state
- `parentPath` (string|null): New parent path (null to unparent)
- `tag` (string): New tag
- `layer` (number): New layer

**Example:**
```javascript
await callTool('modify_gameobject', {
  path: '/MyCube',
  position: { x: 5, y: 2, z: 0 },
  rotation: { x: 0, y: 90, z: 0 },
  active: false
});
```

### 4. delete_gameobject
Deletes GameObjects from the scene.

**Parameters:**
- `path` (string): Path to a single GameObject
- `paths` (array): Array of paths to multiple GameObjects
- `includeChildren` (boolean): Whether to delete children (default: true)

**Example:**
```javascript
// Delete single object
await callTool('delete_gameobject', {
  path: '/MyCube'
});

// Delete multiple objects
await callTool('delete_gameobject', {
  paths: ['/Enemy1', '/Enemy2', '/Enemy3']
});
```

### 5. get_hierarchy
Gets the scene hierarchy tree.

**Parameters:**
- `includeInactive` (boolean): Include inactive objects (default: true)
- `maxDepth` (number): Maximum depth to traverse (-1 for unlimited)
- `includeComponents` (boolean): Include component information (default: false)

**Example:**
```javascript
const hierarchy = await callTool('get_hierarchy', {
  includeComponents: true,
  maxDepth: 3
});
```

## Response Formats

### Create/Modify Response
```json
{
  "status": "success",
  "result": {
    "id": 12345,
    "name": "MyCube",
    "path": "/MyCube",
    "position": { "x": 0, "y": 1, "z": 0 },
    "rotation": { "x": 0, "y": 45, "z": 0 },
    "scale": { "x": 2, "y": 2, "z": 2 },
    "tag": "Untagged",
    "layer": 0,
    "isActive": true
  }
}
```

### Find Response
```json
{
  "status": "success",
  "result": {
    "count": 2,
    "objects": [
      {
        "id": 12345,
        "name": "Enemy1",
        "path": "/Enemies/Enemy1",
        "tag": "Enemy",
        "layer": 8,
        "isActive": true,
        "transform": {
          "position": { "x": 0, "y": 0, "z": 0 },
          "rotation": { "x": 0, "y": 0, "z": 0 },
          "scale": { "x": 1, "y": 1, "z": 1 }
        }
      }
    ],
    "summary": "Found 2 GameObjects matching name containing \"Enemy\""
  }
}
```

### Hierarchy Response
```json
{
  "status": "success",
  "result": {
    "sceneName": "SampleScene",
    "objectCount": 5,
    "totalObjects": 12,
    "hierarchy": [
      {
        "name": "Player",
        "path": "/Player",
        "isActive": true,
        "tag": "Player",
        "layer": 0,
        "transform": { ... },
        "components": ["Transform", "MeshRenderer", "Rigidbody"],
        "children": [
          {
            "name": "Camera",
            "path": "/Player/Camera",
            ...
          }
        ]
      }
    ],
    "summary": "Scene \"SampleScene\" contains 12 GameObjects (5 at root level)"
  }
}
```

## Features

- **Primitive Creation**: Create cubes, spheres, cylinders, capsules, planes, and quads
- **Empty GameObjects**: Create empty containers for organization
- **Parent-Child Relationships**: Set up hierarchies during creation or modification
- **Transform Control**: Full control over position, rotation, and scale
- **Tag and Layer Management**: Organize objects with tags and layers
- **Batch Operations**: Delete multiple objects at once
- **Scene Inspection**: Get complete or filtered hierarchy views
- **Undo Support**: All operations support Unity's undo system
- **Error Handling**: Comprehensive error messages for debugging

## Best Practices

1. **Use Paths**: GameObject paths (like "/Parent/Child") are more reliable than names alone
2. **Check Existence**: Use find_gameobject before modifying to ensure objects exist
3. **Batch Operations**: Use delete_gameobject with paths array for better performance
4. **Hierarchy Depth**: Limit maxDepth when getting hierarchy for large scenes
5. **Component Info**: Only request component info when needed (performance impact)

## Performance Considerations

- Creating many objects: Consider batching or using prefabs (Phase 8)
- Finding objects: Use exact match when possible
- Hierarchy traversal: Limit depth for large scenes
- Component queries: Can be slow for complex objects

## Unity Version Compatibility

- Requires Unity 2020.3 or later
- All primitive types supported
- Tag and layer systems fully supported
- Undo/Redo integration working