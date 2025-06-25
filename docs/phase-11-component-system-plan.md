# Phase 11: Unity MCP Component System Planning Document

## Current State Analysis

### What We Have
1. **GameObject Creation** (`CreateGameObject`)
   - Can create empty GameObjects
   - Can create primitive shapes (cube, sphere, etc.)
   - Can set transform, tag, layer, parent
   - No component addition during creation

2. **GameObject Modification** (`ModifyGameObject`)
   - Can modify transform, tag, layer, parent, active state
   - Cannot add/remove components
   - Cannot modify component properties

3. **Component Reading** (`GetComponentValues`)
   - Can read component properties
   - Limited to specific component types (Transform, Light, Camera, etc.)
   - Read-only access

### What's Missing
1. **Add Component** - Ability to add any component to a GameObject
2. **Remove Component** - Ability to remove components
3. **Modify Component** - Ability to change component property values
4. **Component Discovery** - List available component types
5. **Batch Operations** - Add/modify multiple components at once

## Proposed Component System Design

### Core Operations

#### 1. Add Component
```javascript
add_component({
  gameObjectPath: "/Player",
  componentType: "Rigidbody",
  properties: {
    mass: 1.5,
    useGravity: true,
    isKinematic: false
  }
})
```

#### 2. Remove Component
```javascript
remove_component({
  gameObjectPath: "/Player",
  componentType: "Rigidbody",
  componentIndex: 0  // For multiple components of same type
})
```

#### 3. Modify Component
```javascript
modify_component({
  gameObjectPath: "/Player",
  componentType: "Rigidbody",
  componentIndex: 0,
  properties: {
    mass: 2.0,
    drag: 0.5
  }
})
```

#### 4. List Components
```javascript
list_components({
  gameObjectPath: "/Player",
  includeProperties: true
})
```

#### 5. Get Available Component Types
```javascript
get_component_types({
  category: "Physics",  // Optional filter
  searchTerm: "Collider"  // Optional search
})
```

## Technical Considerations

### Unity C# Side

#### Component Type Resolution
- **String to Type**: Convert string component names to Unity Types
- **Assembly Scanning**: Find components across all loaded assemblies
- **Namespace Handling**: Support both short names ("Rigidbody") and full names ("UnityEngine.Rigidbody")

#### Property Setting
- **Type Conversion**: Convert JSON values to C# types
- **Nested Properties**: Support complex properties (e.g., "constraints.freezePositionX")
- **Validation**: Ensure property values are valid for the component

#### Special Component Cases
1. **RequireComponent**: Handle dependencies automatically
2. **Unique Components**: Prevent multiple Transform, etc.
3. **Script Components**: Support custom MonoBehaviours
4. **Editor-Only**: Handle components that only work in editor

### MCP Server Side

#### Handler Structure
```
handlers/
  component/
    AddComponentToolHandler.js
    RemoveComponentToolHandler.js
    ModifyComponentToolHandler.js
    ListComponentsToolHandler.js
    GetComponentTypesToolHandler.js
```

#### Validation
- GameObject path exists
- Component type is valid
- Properties match component schema
- Type safety for property values

## Implementation Phases

### Phase 1: Basic Component Operations
1. **AddComponent** - Core components only (Rigidbody, Colliders, etc.)
2. **RemoveComponent** - Single component removal
3. **ModifyComponent** - Simple property changes
4. **ListComponents** - Basic component listing

### Phase 2: Advanced Features
1. **Component Discovery** - List all available components
2. **Batch Operations** - Multiple components at once
3. **Complex Properties** - Nested properties, arrays, enums
4. **Script Components** - Custom MonoBehaviour support

### Phase 3: Enhanced Functionality
1. **Component Templates** - Predefined component configurations
2. **Component Copying** - Copy components between GameObjects
3. **Undo/Redo** - Full undo support for all operations
4. **Performance Mode** - Batch operations for many objects

## Component Categories

### Core Unity Components
- **Transform** (special - always present)
- **Rendering**: MeshRenderer, SkinnedMeshRenderer, SpriteRenderer
- **Physics**: Rigidbody, Colliders (Box, Sphere, Mesh, etc.)
- **Audio**: AudioSource, AudioListener
- **UI**: Canvas, Image, Text, Button
- **Lighting**: Light, ReflectionProbe
- **Camera**: Camera, CinemachineVirtualCamera
- **Animation**: Animator, Animation
- **Particles**: ParticleSystem
- **Scripts**: MonoBehaviour derivatives

### Property Types to Support
1. **Primitives**: int, float, bool, string
2. **Unity Types**: Vector3, Quaternion, Color, AnimationCurve
3. **References**: GameObject, Transform, Material, Texture
4. **Arrays**: int[], Vector3[], GameObject[]
5. **Enums**: LightType, CollisionDetectionMode, etc.

## Error Handling Strategy

### Validation Errors
- Component type not found
- Invalid property name
- Type mismatch for property value
- GameObject not found

### Runtime Errors
- Component dependencies not met
- Component conflicts
- Property setter exceptions
- Unity-specific limitations

### Recovery Strategies
- Detailed error messages
- Partial success reporting
- Rollback on failure
- Safe defaults for missing values

## Usage Examples

### Example 1: Create Physics Object
```javascript
// 1. Create GameObject
await mcp.tools.create_gameobject({
  name: "PhysicsCube",
  primitiveType: "cube",
  position: { x: 0, y: 5, z: 0 }
});

// 2. Add Rigidbody
await mcp.tools.add_component({
  gameObjectPath: "/PhysicsCube",
  componentType: "Rigidbody",
  properties: {
    mass: 2.0,
    useGravity: true
  }
});

// 3. Modify collider
await mcp.tools.modify_component({
  gameObjectPath: "/PhysicsCube",
  componentType: "BoxCollider",
  properties: {
    isTrigger: false,
    material: "Assets/PhysicMaterials/Bouncy.mat"
  }
});
```

### Example 2: Setup Camera
```javascript
// Add and configure camera component
await mcp.tools.add_component({
  gameObjectPath: "/CameraRig/MainCamera",
  componentType: "Camera",
  properties: {
    fieldOfView: 60,
    nearClipPlane: 0.1,
    farClipPlane: 1000,
    depth: 0,
    clearFlags: "Skybox"
  }
});

// Add post-processing (if available)
await mcp.tools.add_component({
  gameObjectPath: "/CameraRig/MainCamera",
  componentType: "PostProcessVolume",
  properties: {
    isGlobal: true,
    weight: 1.0
  }
});
```

### Example 3: UI Button Setup
```javascript
// Add Canvas if needed
await mcp.tools.add_component({
  gameObjectPath: "/UIRoot",
  componentType: "Canvas",
  properties: {
    renderMode: "ScreenSpaceOverlay"
  }
});

// Add button components
await mcp.tools.add_component({
  gameObjectPath: "/UIRoot/Button",
  componentType: "Image",
  properties: {
    color: { r: 1, g: 1, b: 1, a: 1 }
  }
});

await mcp.tools.add_component({
  gameObjectPath: "/UIRoot/Button",
  componentType: "Button",
  properties: {
    interactable: true
  }
});
```

## Security Considerations

1. **Component Whitelist**: Only allow safe components
2. **Property Validation**: Validate all property values
3. **Resource Limits**: Prevent excessive component addition
4. **Script Execution**: Be careful with custom scripts
5. **Asset References**: Validate all asset paths

## Performance Considerations

1. **Batch Operations**: Group multiple operations
2. **Lazy Loading**: Don't load all component types at once
3. **Caching**: Cache component type information
4. **Minimal Reflection**: Use reflection efficiently
5. **Async Operations**: Don't block Unity main thread

## Testing Strategy

### Unit Tests
1. Component type resolution
2. Property value conversion
3. Validation logic
4. Error handling

### Integration Tests
1. Add various component types
2. Modify complex properties
3. Remove components with dependencies
4. Batch operations

### Edge Cases
1. Multiple components of same type
2. Components with circular dependencies
3. Invalid property values
4. Non-existent GameObjects
5. Editor-only components in runtime

## Future Enhancements

1. **Visual Component Editor**: Web UI for component editing
2. **Component Presets**: Save/load component configurations
3. **Smart Suggestions**: AI-powered component recommendations
4. **Dependency Graph**: Visualize component dependencies
5. **Performance Profiling**: Measure component impact
6. **Version Control**: Track component changes over time

## Decision Points

### Questions to Resolve
1. **Naming Convention**: Short names vs full type names?
2. **Property Access**: Dot notation vs nested objects?
3. **Batch API**: Separate endpoints or array support?
4. **Custom Scripts**: How to handle user scripts?
5. **Validation Level**: Client vs server vs Unity validation?

### Recommended Approach
1. Start with core Unity components
2. Use short names with fallback to full names
3. Support both dot notation and nested objects
4. Implement array support in existing endpoints
5. Three-layer validation for safety

## Success Criteria

1. **Functionality**: All core Unity components supported
2. **Usability**: Intuitive API with good defaults
3. **Performance**: <100ms for single operations
4. **Reliability**: Comprehensive error handling
5. **Documentation**: Clear examples for common tasks

## Next Steps

1. Review and approve this plan
2. Implement Phase 1 handlers
3. Create comprehensive tests
4. Document all supported components
5. Gather feedback and iterate