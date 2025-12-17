import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GetAnimatorStateToolHandler } from '../../../../src/handlers/analysis/GetAnimatorStateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetAnimatorStateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        controllerName: 'PlayerAnimator',
        summary: 'Animator state retrieved',
        layers: [
          {
            layerIndex: 0,
            layerName: 'Base Layer',
            layerWeight: 1.0,
            currentState: {
              name: 'Idle',
              fullPathHash: 123456,
              normalizedTime: 0.5,
              speed: 1.0,
              motion: 'Idle_Animation'
            }
          }
        ],
        parameters: {
          Speed: { type: 'Float', value: 0.0, defaultValue: 0.0 },
          Jump: { type: 'Trigger', value: false }
        }
      }
    });
    handler = new GetAnimatorStateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'get_animator_state');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Animator'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.gameObjectName);
      assert.deepEqual(schema.required, ['gameObjectName']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.gameObjectName);
      assert.ok(props.includeParameters);
      assert.ok(props.includeStates);
      assert.ok(props.includeTransitions);
      assert.ok(props.includeClips);
      assert.ok(props.layerIndex);
    });
  });

  describe('validate', () => {
    it('should pass with gameObjectName', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          gameObjectName: 'Player'
        })
      );
    });

    it('should pass with optional parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          gameObjectName: 'Player',
          includeParameters: true,
          includeStates: true,
          layerIndex: 0
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully with gameObjectName', async () => {
      const result = await handler.execute({
        gameObjectName: 'Player'
      });

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockConnection.sendCommand.mock.calls[0].arguments[0], 'get_animator_state');

      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
    });

    it('should include controller name in response', async () => {
      const result = await handler.execute({
        gameObjectName: 'Player'
      });

      assert.ok(result.content[0].text.includes('PlayerAnimator'));
    });

    it('should include layer information', async () => {
      const result = await handler.execute({
        gameObjectName: 'Player',
        includeStates: true
      });

      const text = result.content[0].text;
      assert.ok(text.includes('Layer States'));
      assert.ok(text.includes('Base Layer'));
    });

    it('should include current state information', async () => {
      const result = await handler.execute({
        gameObjectName: 'Player'
      });

      const text = result.content[0].text;
      assert.ok(text.includes('Idle'));
      assert.ok(text.includes('Normalized Time'));
    });

    it('should include parameter values', async () => {
      const result = await handler.execute({
        gameObjectName: 'Player',
        includeParameters: true
      });

      const text = result.content[0].text;
      assert.ok(text.includes('Parameters'));
      assert.ok(text.includes('Speed'));
      assert.ok(text.includes('Jump'));
    });

    it('should handle active transitions', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          layers: [
            {
              layerIndex: 0,
              layerName: 'Base Layer',
              activeTransition: {
                duration: 0.5,
                normalizedTime: 0.3,
                nextState: { name: 'Walk' }
              }
            }
          ]
        }
      });
      handler = new GetAnimatorStateToolHandler(mockConnection);

      const result = await handler.execute({
        gameObjectName: 'Player'
      });

      const text = result.content[0].text;
      assert.ok(text.includes('Active Transition'));
      assert.ok(text.includes('Walk'));
    });

    it('should filter by layer index', async () => {
      await handler.execute({
        gameObjectName: 'Player',
        layerIndex: 0
      });

      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.layerIndex, 0);
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'GameObject not found'
        }
      });
      handler = new GetAnimatorStateToolHandler(mockConnection);

      const result = await handler.execute({
        gameObjectName: 'Invalid'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle missing gameObjectName', async () => {
      const result = await handler.execute({});

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('required'));
    });

    it('should handle connection errors', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({
        gameObjectName: 'Player'
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('connection'));
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        gameObjectName: 'Player'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({
        gameObjectName: 'Player'
      });

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text);
    });
  });

  describe('SPEC-e8f7a2c1 compliance', () => {
    it('FR-001: should get Animator state', async () => {
      const result = await handler.execute({
        gameObjectName: 'Player'
      });
      assert.equal(result.isError, false);
    });

    it('FR-002: should include layer information', async () => {
      await handler.execute({
        gameObjectName: 'Player',
        includeStates: true
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.includeStates, true);
    });

    it('FR-003: should include parameter values', async () => {
      await handler.execute({
        gameObjectName: 'Player',
        includeParameters: true
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.includeParameters, true);
    });

    it('FR-004: should include transition information', async () => {
      await handler.execute({
        gameObjectName: 'Player',
        includeTransitions: true
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.includeTransitions, true);
    });

    it('FR-005: should support layer filtering', async () => {
      await handler.execute({
        gameObjectName: 'Player',
        layerIndex: 0
      });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.layerIndex, 0);
    });
  });
});
