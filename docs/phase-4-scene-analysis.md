# Phase 4: Scene Analysis Tools

Phase 4 introduces comprehensive scene inspection and analysis capabilities to the Unity MCP integration. This phase provides tools to deeply understand and analyze everything in Unity scenes - GameObjects, components, properties, and their relationships.

## Overview

Scene Analysis tools enable AI assistants and developers to:
- Inspect GameObjects and their complete component data
- Analyze scene composition and statistics
- Find objects by component types
- Understand object relationships and references
- Get detailed component property values

## Planned Tools

### 1. get_gameobject_details
Provides deep inspection of a specific GameObject with all its components and properties.

**Parameters:**
- `gameObjectName` (string): Name of the GameObject to inspect
- `path` (string): Full hierarchy path (alternative to name)
- `includeChildren` (boolean): Include full hierarchy details (default: false)
- `includeComponents` (boolean): Include all component details (default: true)
- `includeMaterials` (boolean): Include material information (default: false)
- `maxDepth` (number): Maximum depth for child traversal (default: 3)

**Expected Response:**
```json
{
  "name": "Player",
  "path": "/Game/Characters/Player",
  "isActive": true,
  "isStatic": false,
  "tag": "Player",
  "layer": "Characters",
  "transform": {
    "position": {"x": 0, "y": 1, "z": 0},
    "rotation": {"x": 0, "y": 45, "z": 0},
    "scale": {"x": 1, "y": 1, "z": 1},
    "worldPosition": {"x": 0, "y": 1, "z": 0}
  },
  "components": [
    {
      "type": "MeshRenderer",
      "enabled": true,
      "properties": {
        "shadowCastingMode": "On",
        "receiveShadows": true,
        "materials": ["PlayerMaterial"]
      }
    },
    {
      "type": "CharacterController",
      "enabled": true,
      "properties": {
        "height": 2.0,
        "radius": 0.5,
        "stepOffset": 0.3,
        "skinWidth": 0.08
      }
    }
  ],
  "children": [...],
  "prefabInfo": {
    "isPrefab": true,
    "prefabPath": "Assets/Prefabs/Player.prefab",
    "isInstance": true
  }
}
```

### 2. analyze_scene_contents
Provides high-level analysis and statistics about the current scene.

**Parameters:**
- `includeInactive` (boolean): Include inactive objects in analysis (default: true)
- `groupByType` (boolean): Group results by component types (default: true)
- `includePrefabInfo` (boolean): Include prefab connection info (default: true)
- `includeMemoryInfo` (boolean): Include memory usage estimates (default: false)

**Expected Response:**
```json
{
  "sceneName": "GameLevel",
  "statistics": {
    "totalGameObjects": 156,
    "activeGameObjects": 142,
    "rootObjects": 12,
    "prefabInstances": 45,
    "uniquePrefabs": 8
  },
  "componentDistribution": {
    "Transform": 156,
    "MeshRenderer": 89,
    "Collider": 67,
    "Light": 4,
    "Camera": 2,
    "AudioSource": 12,
    "Scripts": {
      "PlayerController": 1,
      "EnemyAI": 8,
      "GameManager": 1
    }
  },
  "rendering": {
    "materials": 23,
    "textures": 45,
    "meshes": 34,
    "vertices": 125000,
    "triangles": 85000
  },
  "lighting": {
    "directionalLights": 1,
    "pointLights": 2,
    "spotLights": 1,
    "realtimeLights": 4,
    "bakedLights": 0
  },
  "summary": "Scene contains 156 GameObjects with 89 renderers and 4 lights"
}
```

### 3. get_component_values
Gets all properties and current values of a specific component.

**Parameters:**
- `gameObjectName` (string): Name of the GameObject
- `componentType` (string): Type of component (e.g., "Light", "Camera")
- `componentIndex` (number): Index if multiple components of same type (default: 0)
- `includePrivateFields` (boolean): Include non-public fields (default: false)
- `includeInherited` (boolean): Include inherited properties (default: true)

**Expected Response:**
```json
{
  "gameObject": "Directional Light",
  "componentType": "Light",
  "componentIndex": 0,
  "enabled": true,
  "properties": {
    "type": {
      "value": "Directional",
      "type": "LightType",
      "options": ["Spot", "Directional", "Point", "Area"]
    },
    "color": {
      "value": {"r": 1, "g": 0.95, "b": 0.8, "a": 1},
      "type": "Color"
    },
    "intensity": {
      "value": 1.2,
      "type": "float",
      "range": {"min": 0, "max": 8}
    },
    "shadows": {
      "value": "Soft",
      "type": "LightShadows",
      "options": ["None", "Hard", "Soft"]
    },
    "shadowStrength": {
      "value": 0.8,
      "type": "float"
    },
    "cookieSize": {
      "value": 10,
      "type": "float"
    }
  }
}
```

### 4. find_by_component
Finds all GameObjects that have specific component(s).

**Parameters:**
- `componentType` (string): Single component type to search for
- `componentTypes` (string[]): Multiple component types (AND condition)
- `excludeTypes` (string[]): Components that should NOT be present
- `includeInactive` (boolean): Search inactive objects (default: false)
- `returnDetails` (boolean): Return component details (default: false)

**Expected Response:**
```json
{
  "searchCriteria": {
    "componentTypes": ["Rigidbody", "Collider"],
    "excludeTypes": ["NavMeshAgent"]
  },
  "results": [
    {
      "name": "Crate_01",
      "path": "/Environment/Props/Crate_01",
      "isActive": true,
      "components": ["Transform", "MeshRenderer", "BoxCollider", "Rigidbody"]
    },
    {
      "name": "PhysicsBox",
      "path": "/TestObjects/PhysicsBox",
      "isActive": true,
      "components": ["Transform", "MeshRenderer", "BoxCollider", "Rigidbody"]
    }
  ],
  "count": 2,
  "summary": "Found 2 GameObjects with Rigidbody and Collider components"
}
```

### 5. get_object_references
Analyzes references between GameObjects and components.

**Parameters:**
- `gameObjectName` (string): The GameObject to analyze
- `findReferencesTo` (boolean): Find what references this object (default: true)
- `findReferencesFrom` (boolean): Find what this object references (default: true)
- `includeComponents` (boolean): Include component references (default: true)
- `maxDepth` (number): Maximum search depth (default: 2)

**Expected Response:**
```json
{
  "gameObject": "GameManager",
  "referencesTo": [
    {
      "source": "UIManager",
      "component": "UIManager",
      "field": "gameManager",
      "type": "Direct"
    },
    {
      "source": "PlayerController",
      "component": "PlayerController", 
      "field": "manager",
      "type": "Direct"
    }
  ],
  "referencesFrom": [
    {
      "target": "Player",
      "component": "GameManager",
      "field": "playerObject",
      "type": "Direct"
    },
    {
      "target": "MainCamera",
      "component": "GameManager",
      "field": "cameraReference",
      "type": "Direct"
    }
  ],
  "hierarchy": {
    "parent": null,
    "children": ["GameUI", "AudioManager"]
  },
  "summary": "GameManager is referenced by 2 objects and references 2 objects"
}
```

## Implementation Architecture

### Unity Side

Create a new handler class `SceneAnalysisHandler.cs` in the Handlers folder:

```csharp
namespace UnityEditorMCP.Handlers
{
    public static class SceneAnalysisHandler
    {
        // Main tool methods
        public static object GetGameObjectDetails(JObject parameters)
        public static object AnalyzeSceneContents(JObject parameters)
        public static object GetComponentValues(JObject parameters)
        public static object FindByComponent(JObject parameters)
        public static object GetObjectReferences(JObject parameters)
        
        // Helper methods for serialization
        private static Dictionary<string, object> SerializeComponent(Component component)
        private static object SerializePropertyValue(object value, Type type)
        private static List<string> GetComponentTypes(GameObject obj)
        private static void FindReferencesInScene(GameObject target, ...)
    }
}
```

### Node.js Side

Following the established pattern, create tool definitions and handlers:

1. Tool definitions in `src/tools/analysis/`:
   - `getGameObjectDetails.js`
   - `analyzeSceneContents.js`
   - `getComponentValues.js`
   - `findByComponent.js`
   - `getObjectReferences.js`

2. Handler classes in `src/handlers/`:
   - `GetGameObjectDetailsToolHandler.js`
   - `AnalyzeSceneContentsToolHandler.js`
   - `GetComponentValuesToolHandler.js`
   - `FindByComponentToolHandler.js`
   - `GetObjectReferencesToolHandler.js`

## Technical Considerations

### 1. Reflection and Serialization
- Use C# reflection to access component properties
- Create custom serializers for Unity types (Vector3, Color, etc.)
- Handle circular references carefully
- Cache reflection data for performance

### 2. Performance Optimization
- Implement depth limits to prevent infinite recursion
- Use lazy loading for child objects
- Batch operations where possible
- Consider pagination for large result sets

### 3. Data Size Management
- Implement summary vs. detailed modes
- Compress large responses
- Allow filtering of specific property types
- Provide count-only options

### 4. Type Handling
```csharp
// Example of handling Unity-specific types
private static object SerializeValue(object value)
{
    switch (value)
    {
        case Vector3 v:
            return new { x = v.x, y = v.y, z = v.z };
        case Color c:
            return new { r = c.r, g = c.g, b = c.b, a = c.a };
        case GameObject go:
            return new { name = go.name, instanceId = go.GetInstanceID() };
        // ... more types
    }
}
```

## Use Cases

### 1. Scene Understanding
```javascript
// What's in this scene?
const analysis = await callTool('analyze_scene_contents', {
  groupByType: true,
  includeMemoryInfo: true
});
```

### 2. Debugging
```javascript
// Why is this object not rendering?
const details = await callTool('get_gameobject_details', {
  gameObjectName: 'BrokenObject',
  includeComponents: true,
  includeMaterials: true
});
```

### 3. Component Analysis
```javascript
// Check all light settings
const lights = await callTool('find_by_component', {
  componentType: 'Light',
  returnDetails: true
});
```

### 4. Reference Tracking
```javascript
// What depends on the GameManager?
const refs = await callTool('get_object_references', {
  gameObjectName: 'GameManager',
  findReferencesTo: true
});
```

## Testing Strategy

### Unit Tests
- Test component serialization with various types
- Test reflection with different component types
- Test search algorithms
- Test reference detection

### Integration Tests
- Create test scenes with known objects
- Verify accurate component detection
- Test performance with large scenes
- Validate reference tracking

### Edge Cases
- Null or missing components
- Circular references
- Very deep hierarchies
- Custom components
- Invalid type names

## Success Criteria

1. **Accuracy**: 100% accurate component detection
2. **Performance**: < 500ms for typical operations
3. **Completeness**: Support for all built-in Unity components
4. **Reliability**: Graceful handling of edge cases
5. **Usability**: Clear and intuitive response formats

## Future Enhancements

- Visual debugging overlays
- Component diff comparisons
- Performance profiling data
- Animation state inspection
- Physics simulation data
- Shader property inspection

## Timeline

- **Day 1**: Implement core architecture and GetGameObjectDetails
- **Day 2**: Implement AnalyzeSceneContents and GetComponentValues
- **Day 3**: Implement FindByComponent and GetObjectReferences
- **Day 4**: Testing, optimization, and documentation

This phase will provide powerful scene analysis capabilities that complement the existing GameObject and Scene management tools, enabling comprehensive understanding of Unity scenes through the MCP interface.