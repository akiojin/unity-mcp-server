import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GetGameObjectDetailsToolHandler } from '../../../src/handlers/analysis/GetGameObjectDetailsToolHandler.js';

describe('GetGameObjectDetailsToolHandler', () => {
  let handler;
  let mockUnityConnection;
  let sendCommandSpy;

  beforeEach(() => {
    sendCommandSpy = mock.fn(() =>
      Promise.resolve({
        status: 'success',
        result: {
          name: 'TestObject',
          path: '/TestObject',
          isActive: true,
          components: [],
          summary: 'GameObject "TestObject" at /TestObject'
        }
      })
    );

    mockUnityConnection = {
      sendCommand: sendCommandSpy,
      isConnected: () => true
    };

    handler = new GetGameObjectDetailsToolHandler(mockUnityConnection);
  });

  it('should have correct tool name', () => {
    assert.equal(handler.name, 'analysis_gameobject_details_get');
  });

  it('should have correct tool definition', () => {
    assert.equal(handler.name, 'analysis_gameobject_details_get');
    assert.equal(
      handler.description,
      'Get details for a GameObject by name or path (children/components/materials).'
    );
  });

  it('should execute with valid arguments', async () => {
    const args = { gameObjectName: 'TestObject' };
    const result = await handler.execute(args);

    assert.equal(result.isError, false);
    assert.equal(sendCommandSpy.mock.calls.length, 1);
    assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'get_gameobject_details');
    assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
  });

  it('should handle execution errors', async () => {
    mockUnityConnection.isConnected = () => false;

    const result = await handler.execute({ gameObjectName: 'Test' });
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Unity connection not available'));
  });
});
