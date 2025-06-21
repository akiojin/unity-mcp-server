# Phase 1.1: Architectural Refinement

## Overview
**Goal**: Align our implementation with reference project patterns before Phase 2  
**Duration**: 1 Day  
**Priority**: High (blocks Phase 2 effectively)

## Objectives

### 1. Response Format Alignment
- Change from `{id, success, data}` to `{status, result}` format
- Maintain backward compatibility during transition
- Update all tests to expect new format

### 2. Tool Handler Architecture
- Create base tool handler interface
- Implement separate handler modules
- Refactor command routing to use handler pattern
- Remove switch-based routing

### 3. Enhanced Features
- Add Base64 encoding/decoding support
- Implement JSON pre-validation
- Add parameter summary in errors
- Include stack traces in error responses

### 4. Code Organization
- Create proper tool directory structure
- Separate concerns (handlers, validation, encoding)
- Improve error handling layers

## Implementation Plan

### Morning Session (4 hours)

#### 1. Response Format Refactoring (1 hour)
- Update Unity `Response.cs` helper
- Modify Node.js response handling
- Create migration utilities

#### 2. Tool Architecture Setup (2 hours)
- Create `BaseToolHandler` class/interface
- Implement `PingToolHandler` as example
- Create tool registration system
- Update server.js to use new architecture

#### 3. Base64 Support (1 hour)
- Add encoding utilities
- Add decoding utilities
- Create tests for large content

### Afternoon Session (4 hours)

#### 1. Enhanced Error Handling (1.5 hours)
- Add parameter summarization
- Include stack traces appropriately
- Create error context builders

#### 2. Validation Layer (1.5 hours)
- JSON pre-validation
- Command structure validation
- Parameter type checking

#### 3. Testing & Documentation (1 hour)
- Update all tests for new format
- Document architectural changes
- Update setup guide

## Technical Details

### New Response Format
```javascript
// Success
{
  "status": "success",
  "result": {
    "message": "Operation completed",
    "data": { ... }
  }
}

// Error
{
  "status": "error",
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Tool Handler Pattern
```javascript
// Base handler
class BaseToolHandler {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }
  
  validate(params) {
    // Override in subclasses
  }
  
  async execute(params) {
    // Override in subclasses
  }
  
  async handle(params) {
    try {
      this.validate(params);
      const result = await this.execute(params);
      return {
        status: "success",
        result
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        code: error.code || "UNKNOWN_ERROR",
        details: {
          params: this.summarizeParams(params),
          stack: error.stack
        }
      };
    }
  }
}
```

### Base64 Utilities
```javascript
// utils/encoding.js
export function encodeContent(content) {
  return Buffer.from(content).toString('base64');
}

export function decodeContent(encoded) {
  return Buffer.from(encoded, 'base64').toString('utf-8');
}
```

## Migration Strategy

### Unity Side
1. Keep both response methods temporarily
2. Add feature flag for response format
3. Update incrementally

### Node.js Side
1. Create adapter layer for response transformation
2. Update tools one by one
3. Remove old format after testing

## Success Criteria

### Must Have
- [ ] New response format working
- [ ] Tool handler architecture implemented
- [ ] Base64 encoding functional
- [ ] All tests passing

### Should Have
- [ ] JSON pre-validation
- [ ] Enhanced error messages
- [ ] Parameter summaries
- [ ] Stack trace handling

### Nice to Have
- [ ] Performance benchmarks
- [ ] Migration guide
- [ ] Deprecation warnings

## File Structure After Phase 1.1

```
mcp-server/
├── src/
│   ├── server.js
│   ├── config.js
│   ├── unityConnection.js
│   ├── handlers/
│   │   ├── BaseToolHandler.js
│   │   ├── PingToolHandler.js
│   │   └── index.js
│   ├── utils/
│   │   ├── encoding.js
│   │   ├── validation.js
│   │   └── errors.js
│   └── tools/
│       └── (deprecated, moved to handlers)
```

## Risks & Mitigations

### Risk: Breaking existing functionality
**Mitigation**: Keep parallel implementations temporarily

### Risk: Test failures during migration
**Mitigation**: Update tests incrementally with adapters

### Risk: Unity recompilation issues
**Mitigation**: Use version bumping strategy

## Dependencies

- No new npm packages needed
- Unity package version will increment to 0.2.0
- Existing MCP SDK remains unchanged

## Next Steps

After Phase 1.1 completion:
1. Verify all tests pass
2. Run integration tests
3. Update documentation
4. Begin Phase 2 with solid architecture

---

**Estimated Completion**: 1 day (8 hours)  
**Prerequisites**: Phase 1 completed  
**Blocks**: Phase 2 implementation