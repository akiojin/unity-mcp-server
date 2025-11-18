# Unity MCP Testing Infrastructure

This directory contains the comprehensive test suite for the Unity MCP server. The tests are organized into multiple categories to ensure thorough coverage and maintainability.

## Directory Structure

```
tests/
├── unit/                    # Unit tests (isolated, fast)
│   ├── core/               # Core functionality tests
│   ├── handlers/           # Tool handler tests
│   └── tools/              # Individual tool tests
├── integration/            # Integration tests (system-level)
├── e2e/                   # End-to-end tests (full workflow)
├── performance/           # Performance and benchmarking tests
└── utils/                 # Test utilities and helpers
```

## Test Categories

### Unit Tests (`tests/unit/`)

- **Purpose**: Test individual components in isolation
- **Speed**: Fast (< 1 second per test)
- **Coverage**: High granularity, focused on specific functions/classes
- **Dependencies**: Minimal, uses mocks for external dependencies

### Integration Tests (`tests/integration/`)

- **Purpose**: Test component interactions and system integration
- **Speed**: Medium (1-10 seconds per test)
- **Coverage**: Cross-component functionality
- **Dependencies**: May require mock Unity connection

### End-to-End Tests (`tests/e2e/`)

- **Purpose**: Test complete user workflows
- **Speed**: Slow (10+ seconds per test)
- **Coverage**: Full system functionality
- **Dependencies**: May require actual Unity instance

### Performance Tests (`tests/performance/`)

- **Purpose**: Benchmark and validate performance metrics
- **Speed**: Variable
- **Coverage**: Performance-critical paths
- **Dependencies**: Timing-sensitive, may require specific hardware

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run specific test categories
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
pnpm run test:performance

# Run with coverage
pnpm run test:coverage
pnpm run test:coverage:full

# Watch mode for development
pnpm run test:watch
pnpm run test:watch:all

# Verbose output
pnpm run test:verbose

# CI/CD friendly
pnpm run test:ci
```

### Environment Variables

```bash
# Skip integration tests
SKIP_INTEGRATION=true pnpm test

# Skip E2E tests
SKIP_E2E=true pnpm test

# Enable verbose logging
VERBOSE_TEST=true pnpm test

# CI mode (affects test selection)
CI=true pnpm test
```

## Test Utilities

### Shared Helpers (`tests/utils/test-helpers.js`)

- **MockUnityConnection**: Mock Unity connection for testing
- **TestAssertions**: Custom assertion helpers
- **TestDataFactory**: Generate test data
- **PerformanceTracker**: Performance measurement utilities
- **TestEnvironment**: Environment detection and management
- **TestLogger**: Test-specific logging utilities

### Configuration (`tests/utils/test-config.js`)

- **TEST_CONFIG**: Centralized test configuration
- **TEST_MESSAGES**: Standard test messages
- **Timing constants**: Timeouts and delays
- **Sample data**: Reusable test data

## Writing Tests

### Unit Test Example

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { MockUnityConnection, TestAssertions } from '../utils/test-helpers.js';

describe('MyComponent', () => {
  test('should handle basic functionality', async () => {
    const mockConnection = new MockUnityConnection();
    const result = await myComponent.process(mockConnection);

    TestAssertions.assertValidResponse(result, ['id', 'status']);
    assert.strictEqual(result.status, 'success');
  });
});
```

### Integration Test Example

```javascript
import { TestEnvironment } from '../utils/test-helpers.js';

describe('Integration Tests', () => {
  test(
    'should integrate components',
    {
      skip: TestEnvironment.shouldSkipTest('integration')
    },
    async () => {
      // Test implementation
    }
  );
});
```

## Coverage Requirements

The project maintains the following coverage thresholds:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

Coverage reports are generated in multiple formats:

- **Console**: Text summary
- **HTML**: `coverage/index.html`
- **LCOV**: `coverage/lcov.info` (for CI/CD)

## Continuous Integration

Tests run automatically on:

- **Push** to main/develop branches
- **Pull requests** to main/develop
- **Manual triggers** via GitHub Actions

### CI Test Matrix

- **Node.js versions**: 18.x, 20.x, 22.x
- **Operating systems**: Ubuntu (primary), additional OS as needed
- **Test categories**: Unit, Integration, Performance (on main branch only)

## Performance Benchmarks

Performance tests track:

- **Connection establishment time**: < 1 second
- **Command execution time**: < 100ms average
- **Memory usage**: Monitored for leaks
- **Concurrent operations**: Throughput testing

## Best Practices

### Test Organization

1. **One test file per source file** for unit tests
2. **Descriptive test names** that explain the scenario
3. **Arrange-Act-Assert** pattern
4. **Mock external dependencies** appropriately

### Test Data

1. **Use TestDataFactory** for consistent test data
2. **Avoid hardcoded values** when possible
3. **Clean up resources** after tests
4. **Use meaningful assertions**

### Performance Considerations

1. **Keep unit tests fast** (< 1 second)
2. **Use appropriate timeouts** for async operations
3. **Skip expensive tests** in CI when appropriate
4. **Monitor test execution time**

### Error Handling

1. **Test both success and failure cases**
2. **Use TestAssertions.assertError** for error validation
3. **Verify error messages** are helpful
4. **Test edge cases** and boundary conditions

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Check Unity connection availability
   - Verify timeout values in TEST_CONFIG
   - Use VERBOSE_TEST=true for debugging

2. **Coverage not meeting thresholds**
   - Review .c8rc.json configuration
   - Check for untested code paths
   - Add unit tests for new functionality

3. **Integration tests failing**
   - Ensure Unity Editor is running (if required)
   - Check network connectivity
   - Verify test data consistency

### Debugging Tests

```bash
# Run single test file
node --test tests/unit/core/config.test.js

# Run with debugger
node --inspect --test tests/unit/core/config.test.js

# Verbose output
VERBOSE_TEST=true node --test tests/unit/core/config.test.js
```

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Maintain coverage** thresholds
3. **Update documentation** as needed
4. **Run full test suite** before submitting
5. **Add performance tests** for critical paths

For questions or issues with the test infrastructure, please check the existing test files for examples or create an issue in the repository.
