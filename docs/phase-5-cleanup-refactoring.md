# Phase 5: Cleanup and Refactoring

## Overview
This phase focuses on cleaning up technical debt, improving code quality, and refactoring the project structure while maintaining all existing functionality through a Test-Driven Development (TDD) approach.

## Goals
1. Consolidate and organize test files
2. Eliminate code duplication
3. Improve error handling consistency
4. Refactor handler registration system
5. Extract common utilities
6. Clean up project structure
7. Consider adopting consolidated tool approach from reference project

## TDD Approach
- **No functionality will be broken** - all existing tests must continue to pass
- **Write tests first** for any new utilities or refactored code
- **Refactor in small steps** with tests passing after each change
- **Maintain backwards compatibility** for all public APIs

## Tasks

### 1. Test Consolidation (High Priority)
**Problem**: Tests scattered across src/, tests/, and handler directories with duplicates

**Solution**:
1. Create proper test structure under `/mcp-server/tests/`
2. Organize tests to mirror source structure:
   ```
   tests/
   ├── unit/
   │   ├── handlers/
   │   ├── tools/
   │   └── core/
   ├── integration/
   └── e2e/
   ```
3. Merge duplicate test files (integration.test.js)
4. Standardize naming convention (*.test.js)

**TDD Steps**:
- Run all existing tests and document coverage
- Move tests one by one, ensuring they still pass
- Remove duplicates only after verifying coverage

### 2. Handler Registration Refactoring (Medium Priority)
**Problem**: Massive duplication in handlers/index.js with manual instantiation

**Solution**:
1. Create a handler registry system
2. Use dynamic imports or a registration pattern
3. Eliminate duplicate imports

**TDD Steps**:
- Write tests for new registry system
- Implement registry while maintaining current API
- Gradually migrate handlers to new system

### 3. Extract Common Utilities (Medium Priority)
**Problem**: Vector3 validation and other logic duplicated across handlers

**Solution**:
1. Create shared utilities:
   - `validators/vector3.js`
   - `validators/common.js`
   - `utils/connectionCheck.js`
2. Extract and consolidate validation logic
3. Update handlers to use shared utilities

**TDD Steps**:
- Write comprehensive tests for utilities
- Extract logic piece by piece
- Update handlers one at a time

### 4. Error Handling Standardization (High Priority)
**Problem**: Inconsistent error handling (auto-connect vs throw)

**Solution**:
1. Define clear error handling strategy
2. Create error classes for different scenarios
3. Standardize connection handling approach
4. Replace console.error with proper logging

**TDD Steps**:
- Write tests for error scenarios
- Implement consistent error handling
- Update all handlers to follow pattern

### 5. Project Structure Cleanup (High Priority)
**Problem**: Empty directories, included reference project, configuration duplicates

**Actions**:
1. Remove empty directories:
   - `/unity-editor-mcp/Editor/Tools/Scene/`
2. Move reference project to separate repository or docs
3. Consolidate configuration examples
4. Clean up root directory

### 6. Code Quality Improvements (Medium Priority)
**Problem**: Hardcoded values, missing type safety, poor separation of concerns

**Solution**:
1. Extract configuration:
   - Buffer sizes
   - Timeouts
   - Retry limits
2. Add JSDoc type annotations (TypeScript migration for future phase)
3. Improve separation of concerns in handlers

**TDD Steps**:
- Write tests for configuration system
- Add JSDoc incrementally
- Refactor handlers to single responsibility

### 7. Tool Consolidation Analysis (Low Priority)
**Problem**: 18 granular tools vs reference's 7 consolidated tools

**Analysis Task**:
1. Document current tool usage patterns
2. Analyze user experience impact
3. Create migration plan if beneficial
4. Consider hybrid approach

## Success Criteria
- [ ] All existing tests pass
- [ ] No functionality is broken
- [ ] Test coverage maintained or improved
- [ ] Code duplication significantly reduced
- [ ] Consistent error handling across codebase
- [ ] Clean project structure
- [ ] Clear documentation of changes

## Risk Mitigation
1. **Backup current working state** before major changes
2. **Run full test suite** after each refactoring step
3. **Test with actual Unity Editor** regularly
4. **Keep detailed logs** of all changes
5. **Create rollback plan** for each major change

## Timeline Estimate
- Test Consolidation: 2-3 hours
- Handler Refactoring: 3-4 hours
- Utility Extraction: 2-3 hours
- Error Handling: 2-3 hours
- Structure Cleanup: 1-2 hours
- Code Quality: 3-4 hours
- Tool Analysis: 2-3 hours

**Total: 15-22 hours**

## Next Steps
1. Begin with test consolidation (least risky)
2. Move to structure cleanup
3. Progress to code refactoring
4. End with tool consolidation analysis