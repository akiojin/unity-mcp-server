import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { RunUnityTestsToolHandler } from '../../../../src/handlers/test/RunUnityTestsToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('RunUnityTestsToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        totalTests: 10,
        passedTests: 8,
        failedTests: 2,
        skippedTests: 0,
        inconclusiveTests: 0,
        duration: 5.23,
        failures: [
          {
            testName: 'PlayerControllerTests.Jump_ShouldIncreaseHeight',
            message: 'Expected: 10, But was: 5',
            stackTrace: 'at PlayerControllerTests.Jump_ShouldIncreaseHeight...'
          },
          {
            testName: 'EnemyAITests.Attack_ShouldDealDamage',
            message: 'NullReferenceException: Object reference not set',
            stackTrace: 'at EnemyAITests.Attack_ShouldDealDamage...'
          }
        ]
      }
    });
    handler = new RunUnityTestsToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'run_unity_tests');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Run Unity NUnit tests'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.testMode);
      assert.deepEqual(schema.properties.testMode.enum, ['EditMode', 'PlayMode', 'All']);
      assert.equal(schema.properties.testMode.default, 'EditMode');
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.testMode, 'testMode parameter should exist');
      assert.ok(props.filter, 'filter parameter should exist');
      assert.ok(props.category, 'category parameter should exist');
      assert.ok(props.namespace, 'namespace parameter should exist');
      assert.ok(props.includeDetails, 'includeDetails parameter should exist');
      assert.ok(props.exportPath, 'exportPath parameter should exist');
    });
  });

  describe('validate', () => {
    it('should pass with default parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should pass with EditMode', () => {
      assert.doesNotThrow(() => handler.validate({ testMode: 'EditMode' }));
    });

    it('should pass with PlayMode', () => {
      assert.doesNotThrow(() => handler.validate({ testMode: 'PlayMode' }));
    });

    it('should pass with All testMode', () => {
      assert.doesNotThrow(() => handler.validate({ testMode: 'All' }));
    });

    it('should pass with filter parameter', () => {
      assert.doesNotThrow(() => handler.validate({ filter: 'PlayerControllerTests' }));
    });

    it('should pass with category parameter', () => {
      assert.doesNotThrow(() => handler.validate({ category: 'Integration' }));
    });

    it('should pass with includeDetails parameter', () => {
      assert.doesNotThrow(() => handler.validate({ includeDetails: true }));
    });
  });

  describe('execute', () => {
    it('should execute successfully with default params', async () => {
      const result = await handler.execute({});

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'run_unity_tests');

      assert.ok(result);
      assert.equal(result.success, true);
      assert.equal(result.totalTests, 10);
      assert.equal(result.passedTests, 8);
      assert.equal(result.failedTests, 2);
      assert.equal(result.duration, 5.23);
      assert.ok(result.summary.includes('8/10 tests passed'));
    });

    it('should execute with EditMode', async () => {
      const result = await handler.execute({ testMode: 'EditMode' });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.testMode, 'EditMode');
      assert.equal(result.success, true);
    });

    it('should execute with filter parameter', async () => {
      const result = await handler.execute({
        testMode: 'EditMode',
        filter: 'PlayerControllerTests'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.filter, 'PlayerControllerTests');
      assert.equal(result.success, true);
    });

    it('should execute with category parameter', async () => {
      const result = await handler.execute({
        testMode: 'EditMode',
        category: 'Integration'
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.category, 'Integration');
      assert.equal(result.success, true);
    });

    it('should include detailed test results when requested', async () => {
      const detailedResponse = {
        ...mockConnection.sendCommandResult,
        tests: [
          { name: 'Test1', status: 'Passed', duration: 0.5 },
          { name: 'Test2', status: 'Failed', duration: 1.2 }
        ]
      };

      mockConnection = createMockUnityConnection({ sendCommandResult: detailedResponse });
      handler = new RunUnityTestsToolHandler(mockConnection);

      const result = await handler.execute({ includeDetails: true });

      assert.ok(result.tests);
      assert.equal(result.tests.length, 2);
      assert.equal(result.tests[0].name, 'Test1');
    });

    it('should not include detailed test results by default', async () => {
      const result = await handler.execute({});

      assert.equal(result.tests, undefined);
    });

    it('should return failure information', async () => {
      const result = await handler.execute({});

      assert.ok(result.failures);
      assert.equal(result.failures.length, 2);
      assert.ok(result.failures[0].testName);
      assert.ok(result.failures[0].message);
      assert.ok(result.failures[0].stackTrace);
    });

    it('should handle test execution with no failures', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          totalTests: 5,
          passedTests: 5,
          failedTests: 0,
          skippedTests: 0,
          inconclusiveTests: 0,
          duration: 2.1,
          failures: []
        }
      });
      handler = new RunUnityTestsToolHandler(mockConnection);

      const result = await handler.execute({});

      assert.equal(result.success, true);
      assert.equal(result.failedTests, 0);
      assert.equal(result.failures.length, 0);
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Test execution timed out after 5 minutes'
        }
      });
      handler = new RunUnityTestsToolHandler(mockConnection);

      await assert.rejects(async () => await handler.execute({}), /Test execution timed out/);
    });

    it('should throw error if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      await assert.rejects(async () => await handler.execute({}), /Unity connection not available/);
    });

    it('should connect if not already connected', async () => {
      mockConnection.isConnected.mock.mockImplementationOnce(() => false);

      await handler.execute({});

      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });
  });

  describe('getExamples', () => {
    it('should return example usage scenarios', () => {
      const examples = handler.getExamples();

      assert.ok(examples);
      assert.ok(examples.runAllEditModeTests);
      assert.ok(examples.runSpecificClass);
      assert.ok(examples.runCategoryTests);
      assert.ok(examples.runWithDetails);
      assert.ok(examples.runAndExport);
      assert.ok(examples.runPlayModeTests);
      assert.ok(examples.runAllTests);
    });

    it('should have valid example parameters', () => {
      const examples = handler.getExamples();

      assert.equal(examples.runAllEditModeTests.params.testMode, 'EditMode');
      assert.equal(examples.runSpecificClass.params.filter, 'PlayerControllerTests');
      assert.equal(examples.runCategoryTests.params.category, 'Integration');
      assert.equal(examples.runWithDetails.params.includeDetails, true);
      assert.equal(examples.runPlayModeTests.params.testMode, 'PlayMode');
      assert.equal(examples.runAllTests.params.testMode, 'All');
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({ testMode: 'EditMode' });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.content);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({});

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text.includes('8/10 tests passed'));
    });

    it('should handle execution errors gracefully', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Invalid testMode'
        }
      });
      handler = new RunUnityTestsToolHandler(mockConnection);

      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.ok(result.error);
    });
  });

  describe('SPEC-e7c9b50c compliance', () => {
    it('FR-001: should support running all Unity NUnit tests', async () => {
      const result = await handler.execute({});
      assert.ok(result.totalTests >= 0);
    });

    it('FR-002: should support EditMode test mode', async () => {
      await handler.execute({ testMode: 'EditMode' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.testMode, 'EditMode');
    });

    it('FR-002: should support PlayMode test mode', async () => {
      await handler.execute({ testMode: 'PlayMode' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.testMode, 'PlayMode');
    });

    it('FR-002: should support All test mode', async () => {
      await handler.execute({ testMode: 'All' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.testMode, 'All');
    });

    it('FR-003: should support filtering by class name', async () => {
      await handler.execute({ filter: 'MyTestClass' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.filter, 'MyTestClass');
    });

    it('FR-004: should support filtering by namespace', async () => {
      await handler.execute({ namespace: 'MyGame.Tests' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.namespace, 'MyGame.Tests');
    });

    it('FR-005: should support filtering by category', async () => {
      await handler.execute({ category: 'Integration' });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.category, 'Integration');
    });

    it('FR-006: should return test result summary', async () => {
      const result = await handler.execute({});
      assert.ok(result.totalTests !== undefined);
      assert.ok(result.passedTests !== undefined);
      assert.ok(result.failedTests !== undefined);
      assert.ok(result.skippedTests !== undefined);
    });

    it('FR-007: should return test execution duration', async () => {
      const result = await handler.execute({});
      assert.ok(result.duration !== undefined);
      assert.ok(typeof result.duration === 'number');
    });

    it('FR-008: should return error messages for failed tests', async () => {
      const result = await handler.execute({});
      if (result.failures.length > 0) {
        assert.ok(result.failures[0].message);
      }
    });

    it('FR-009: should return stack traces for failed tests', async () => {
      const result = await handler.execute({});
      if (result.failures.length > 0) {
        assert.ok(result.failures[0].stackTrace);
      }
    });

    it('FR-010: should support detailed mode for individual test results', async () => {
      const detailedResponse = {
        ...mockConnection.sendCommandResult,
        tests: [{ name: 'Test1', status: 'Passed' }]
      };
      mockConnection = createMockUnityConnection({ sendCommandResult: detailedResponse });
      handler = new RunUnityTestsToolHandler(mockConnection);

      const result = await handler.execute({ includeDetails: true });
      assert.ok(result.tests);
    });
  });
});
