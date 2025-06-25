# Phase 16: Script Management Enhancements

## Overview
Enhance script management capabilities with Base64 encoding for safe content transmission, namespace support, script type specification, and advanced script analysis features.

## Current State
- Basic script CRUD operations (create, read, update, delete)
- Simple script listing and validation
- No encoding safety for special characters
- Limited namespace handling
- Basic script type support
- No advanced script analysis

## Target Features

### 1. Base64 Encoding for Safe Transmission
**Handler:** Enhanced `ScriptHandler.cs` / `EncodedScriptToolHandler.js`

**Unity Operations:**
- `read_script_encoded` - Read script with Base64 encoding
- `write_script_encoded` - Write script from Base64 content
- `update_script_encoded` - Update with encoded content
- `validate_encoding` - Validate Base64 content

**Implementation Notes:**
- Use System.Convert.ToBase64String() / FromBase64String()
- Handle UTF-8 encoding properly
- Preserve line endings and formatting
- Validate encoding integrity

### 2. Namespace Support
**Handler:** `NamespaceHandler.cs` / `NamespaceToolHandler.js`

**Unity Operations:**
- `create_script_with_namespace` - Create script with specific namespace
- `extract_namespace` - Get namespace from existing script
- `update_namespace` - Change script namespace
- `list_namespaces` - Get all namespaces in project
- `find_scripts_by_namespace` - Find scripts in namespace

**Implementation Notes:**
- Parse C# namespace declarations
- Handle nested namespaces
- Update using directives
- Validate namespace naming conventions

### 3. Script Type Specification
**Handler:** Enhanced `ScriptHandler.cs` / `ScriptTypeToolHandler.js`

**Unity Operations:**
- `create_monobehaviour_script` - Create MonoBehaviour script
- `create_scriptableobject_script` - Create ScriptableObject script
- `create_editor_script` - Create Editor script
- `create_custom_script` - Create custom class script
- `detect_script_type` - Analyze existing script type

**Implementation Notes:**
- Template-based script generation
- Proper inheritance and attributes
- Editor script placement in Editor folders
- Custom script type validation

### 4. Advanced Script Analysis
**Handler:** `ScriptAnalysisHandler.cs` / `ScriptAnalysisToolHandler.js`

**Unity Operations:**
- `analyze_script_dependencies` - Find script dependencies
- `get_script_methods` - Extract public methods
- `get_script_properties` - Extract properties and fields
- `find_script_references` - Find where script is referenced
- `validate_script_syntax` - Advanced syntax validation

**Implementation Notes:**
- Use Roslyn for C# analysis
- Parse using statements
- Extract class members and signatures
- Cross-reference analysis

### 5. Script Template System
**Handler:** `ScriptTemplateHandler.cs` / `ScriptTemplateToolHandler.js`

**Unity Operations:**
- `create_from_template` - Create script from template
- `register_template` - Add custom template
- `list_templates` - Get available templates
- `validate_template` - Check template validity

**Implementation Notes:**
- Support parameterized templates
- Handle placeholder replacement
- Store templates in project settings
- Template inheritance and composition

## MCP Server Tools

### 1. Encoded Script Tools
```javascript
// EncodedScriptToolHandler.js
- read_script_base64(scriptPath)
- write_script_base64(scriptPath, encodedContent, createDirectories=true)
- update_script_base64(scriptPath, encodedContent)
- validate_script_encoding(encodedContent)
```

### 2. Namespace Tools
```javascript
// NamespaceToolHandler.js
- create_script_with_namespace(scriptPath, namespace, scriptType="MonoBehaviour")
- extract_script_namespace(scriptPath)
- update_script_namespace(scriptPath, newNamespace)
- list_project_namespaces()
- find_scripts_in_namespace(namespace)
```

### 3. Script Type Tools
```javascript
// ScriptTypeToolHandler.js
- create_monobehaviour(scriptPath, className, namespace="")
- create_scriptableobject(scriptPath, className, namespace="")
- create_editor_script(scriptPath, className, targetType="")
- create_custom_class(scriptPath, className, baseClass="", namespace="")
- detect_script_type(scriptPath)
```

### 4. Script Analysis Tools
```javascript
// ScriptAnalysisToolHandler.js
- analyze_dependencies(scriptPath, includeUnity=false)
- get_public_methods(scriptPath, includeInherited=false)
- get_serialized_fields(scriptPath)
- find_script_usages(scriptPath)
- validate_syntax_advanced(scriptPath)
```

### 5. Template Tools
```javascript
// ScriptTemplateToolHandler.js
- create_from_template(templateName, scriptPath, parameters={})
- register_custom_template(templateName, templateContent, description="")
- list_available_templates()
- get_template_parameters(templateName)
```

## Implementation Priority

### Phase 16.1: Encoding and Namespace Support (Week 1)
- Implement Base64 encoding for all script operations
- Add comprehensive namespace handling
- Update existing script tools
- Add encoding validation and error handling

### Phase 16.2: Script Types and Templates (Week 2)
- Implement script type specification
- Create template system
- Add specialized script creation tools
- Template validation and management

### Phase 16.3: Advanced Analysis (Week 3)
- Implement Roslyn-based script analysis
- Add dependency tracking
- Cross-reference analysis
- Performance optimization

## Technical Considerations

### Encoding Safety
- Use UTF-8 encoding consistently
- Handle special characters and Unicode
- Preserve file encoding metadata
- Validate content integrity

### C# Language Features
- Support latest C# language version
- Handle nullable reference types
- Support record types and pattern matching
- Async/await pattern support

### Roslyn Integration
- Microsoft.CodeAnalysis.CSharp NuGet package
- Syntax tree parsing and analysis
- Symbol resolution
- Semantic model analysis

### Performance Optimization
- Cache parsed syntax trees
- Incremental analysis for large projects
- Efficient string operations
- Memory management for large files

## Success Criteria
- [ ] Base64 encoding working for all operations
- [ ] Namespace handling implemented
- [ ] Script type specification complete
- [ ] Template system functional
- [ ] Advanced analysis features working
- [ ] Performance under 100ms for typical operations
- [ ] Full test coverage
- [ ] Reference project feature parity

## Dependencies
- Roslyn CodeAnalysis libraries
- Enhanced encoding utilities
- Template storage system
- Script validation framework

## Risks and Mitigations
- **Risk:** Roslyn version compatibility issues
  - **Mitigation:** Use stable Roslyn version, compatibility testing
- **Risk:** Performance impact of syntax analysis
  - **Mitigation:** Caching and lazy evaluation
- **Risk:** Template system complexity
  - **Mitigation:** Simple parameter replacement initially
- **Risk:** Encoding corruption
  - **Mitigation:** Validation and checksums

## Integration with Unity
- Handle Unity-specific attributes
- Support Unity naming conventions
- Integrate with Unity's script compilation
- Handle Assembly Definition files