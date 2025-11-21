import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GetObjectReferencesToolHandler } from '../../../src/handlers/analysis/GetObjectReferencesToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('GetObjectReferencesToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        status: 'success',
        result: {
          references: {
            outgoing: [{ gameObjectName: 'Target', component: 'Script', field: 'target' }],
            incoming: []
          },
          summary: 'TestObject has 1 outgoing reference and 0 incoming references'
        }
      }
    });
    handler = new GetObjectReferencesToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.ok(handler.name);
      assert.ok(handler.description);
      assert.deepEqual(handler.inputSchema.required, ['gameObjectName']);
    });
  });

  describe('validate', () => {
    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => handler.validate({ gameObjectName: 'TestObject' }));
    });

    it('should fail with missing required parameter', () => {
      assert.throws(() => handler.validate({}), /Missing required parameter: gameObjectName/);
    });
  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({ gameObjectName: 'TestObject' });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
      assert.ok(result.content[0].text.includes('1 outgoing reference'));
    });

    it('should return error if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({ gameObjectName: 'TestObject' });

      assert.ok(result);
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Unity connection not available'));
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({ gameObjectName: 'TestObject' });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.ok(result.result.content);
      assert.equal(result.result.isError, false);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'error');
      assert.match(result.error, /Missing required parameter: gameObjectName/);
    });
  });
});
