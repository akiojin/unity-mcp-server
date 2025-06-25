# Phase 14: GameObject Enhancements

## Overview
Enhance GameObject management capabilities including save-as-prefab functionality, advanced component property modification with references, multi-criteria search, and layer management by name.

## Current State
- Basic GameObject creation/modification/deletion
- Simple find operations (name, tag, layer by index)
- Basic component operations
- No save-as-prefab from GameObjects
- Limited component property modification
- No reference handling in properties

## Target Features

### 1. Save as Prefab Functionality
**Handler:** `PrefabCreationHandler.cs` / Enhanced `GameObjectHandler`

**Unity Operations:**
- `save_gameobject_as_prefab` - Convert GameObject to prefab asset
- `update_prefab_from_instance` - Update prefab from modified instance
- `revert_prefab_instance` - Revert instance to prefab state
- `check_prefab_status` - Check if GameObject is prefab instance

**Implementation Notes:**
- Use `PrefabUtility.SaveAsPrefabAsset()`
- Handle prefab variants and overrides
- Support nested prefabs
- Manage prefab connections properly

### 2. Advanced Component Property Modification
**Handler:** Enhanced `ComponentHandler.cs` / `AdvancedComponentToolHandler.js`

**Unity Operations:**
- `set_component_property_advanced` - Set properties with reference handling
- `get_component_property_advanced` - Get properties with reference info
- `set_component_reference` - Set object/asset references
- `get_component_references` - Get all references from component

**Implementation Notes:**
- Use reflection for deep property access
- Handle `UnityEngine.Object` references
- Support SerializeReference attributes
- Array and list property modification

### 3. Multi-Criteria Search
**Handler:** Enhanced `GameObjectHandler.cs` / `AdvancedSearchToolHandler.js`

**Unity Operations:**
- `find_by_id` - Find GameObject by instance ID
- `find_by_path` - Find GameObject by hierarchy path
- `find_by_multiple_criteria` - Combined search criteria
- `search_with_filters` - Advanced filtering options

**Implementation Notes:**
- Use `EditorUtility.InstanceIDToObject()`
- Implement hierarchy path parsing
- Support regex patterns in searches
- Combine multiple search criteria

### 4. Layer Management by Name
**Handler:** Enhanced layer operations in existing handlers

**Unity Operations:**
- `set_layer_by_name` - Set GameObject layer by name
- `get_layer_name` - Get layer name from GameObject
- `find_by_layer_name` - Find GameObjects by layer name
- `validate_layer_name` - Check if layer name exists

**Implementation Notes:**
- Convert between layer names and indices
- Use `LayerMask.NameToLayer()` and `LayerMask.LayerToName()`
- Handle invalid layer names gracefully

### 5. Advanced GameObject Analysis
**Handler:** `GameObjectAnalysisHandler.cs` / `GameObjectAnalysisToolHandler.js`

**Unity Operations:**
- `get_gameobject_tree` - Get complete hierarchy tree
- `analyze_gameobject_dependencies` - Find all dependencies
- `get_component_graph` - Get component interaction graph
- `validate_gameobject_integrity` - Check for missing references

**Implementation Notes:**
- Recursive hierarchy traversal
- Component dependency analysis
- Missing reference detection
- Performance-optimized tree operations

## MCP Server Tools

### 1. Prefab Creation Tools
```javascript
// Enhanced GameObjectToolHandler.js
- save_as_prefab(gameObjectPath, prefabPath, replaceInstance=false)
- update_prefab_from_instance(gameObjectPath)
- revert_to_prefab(gameObjectPath)
- get_prefab_status(gameObjectPath)
```

### 2. Advanced Component Tools
```javascript
// AdvancedComponentToolHandler.js
- set_component_property_with_reference(gameObjectPath, componentType, propertyPath, value, referenceType)
- get_component_property_detailed(gameObjectPath, componentType, propertyPath)
- set_object_reference(gameObjectPath, componentType, propertyPath, targetObjectPath)
- get_component_references(gameObjectPath, componentType)
```

### 3. Advanced Search Tools
```javascript
// AdvancedSearchToolHandler.js
- find_gameobject_by_id(instanceId)
- find_gameobject_by_path(hierarchyPath)
- search_gameobjects_advanced(criteria={name, tag, layer, component, active})
- find_gameobjects_with_pattern(namePattern, searchType="regex")
```

### 4. Layer Name Tools
```javascript
// Enhanced existing tools
- set_gameobject_layer_by_name(gameObjectPath, layerName)
- get_gameobject_layer_name(gameObjectPath)
- find_gameobjects_by_layer_name(layerName)
- get_all_layer_names()
```

### 5. GameObject Analysis Tools
```javascript
// GameObjectAnalysisToolHandler.js
- get_hierarchy_tree(rootPath, maxDepth=10)
- analyze_dependencies(gameObjectPath, includeAssets=true)
- get_component_interaction_graph(gameObjectPath)
- validate_references(gameObjectPath)
```

## Implementation Priority

### Phase 14.1: Save as Prefab and Layer Names (Week 1)
- Implement save-as-prefab functionality
- Add layer management by name
- Enhance existing GameObject tools
- Add comprehensive tests

### Phase 14.2: Advanced Component Properties (Week 2)
- Implement advanced component property modification
- Add reference handling capabilities
- Support complex property types
- Create specialized component tools

### Phase 14.3: Advanced Search and Analysis (Week 3)
- Implement multi-criteria search
- Add GameObject analysis tools
- Performance optimization
- Integration testing

## Technical Considerations

### Unity APIs
- `PrefabUtility` for prefab operations
- `LayerMask` for layer name conversion
- `EditorUtility.InstanceIDToObject()` for ID lookup
- Reflection for property access
- `SerializedObject` for complex properties

### Property Reference Handling
- Distinguish between value types and references
- Handle asset references vs scene references
- Support UnityEngine.Object derived types
- Manage serialized reference attributes

### Performance Optimization
- Cache layer name mappings
- Optimize hierarchy traversal
- Efficient property access patterns
- Batch operations where possible

### Error Handling
- Invalid property paths
- Missing references
- Prefab operation failures
- Layer name validation

## Success Criteria
- [ ] Save-as-prefab functionality working
- [ ] Advanced component property modification
- [ ] Multi-criteria search implemented
- [ ] Layer management by name
- [ ] Reference handling in properties
- [ ] Performance benchmarks met
- [ ] Full test coverage
- [ ] Reference project feature parity

## Dependencies
- Unity PrefabUtility APIs
- Enhanced component system
- Layer management infrastructure
- Property reflection system

## Risks and Mitigations
- **Risk:** Prefab corruption during save operations
  - **Mitigation:** Validation and backup systems
- **Risk:** Performance impact of deep property access
  - **Mitigation:** Caching and optimization
- **Risk:** Complex reference handling errors
  - **Mitigation:** Comprehensive validation
- **Risk:** Layer name synchronization issues
  - **Mitigation:** Real-time layer list updates