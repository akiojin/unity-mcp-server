import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GetInputActionsStateToolHandler } from '../../../../src/handlers/analysis/GetInputActionsStateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('GetInputActionsStateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        success: true,
        assetName: 'PlayerInputActions',
        assetPath: 'Assets/Input/PlayerInputActions.inputactions',
        actionMaps: [
          {
            name: 'Player',
            id: 'abc123',
            actions: [
              {
                name: 'Move',
                type: 'Value',
                expectedControlType: 'Vector2',
                bindings: [
                  {
                    path: '<Gamepad>/leftStick',
                    groups: 'Gamepad',
                    isComposite: false
                  }
                ]
              },
              {
                name: 'Jump',
                type: 'Button',
                expectedControlType: 'Button',
                bindings: [
                  {
                    path: '<Keyboard>/space',
                    groups: 'Keyboard&Mouse',
                    isComposite: false
                  }
                ]
              }
            ]
          }
        ],
        controlSchemes: [
          {
            name: 'Keyboard&Mouse',
            bindingGroup: 'Keyboard&Mouse',
            devices: [
              { controlPath: '<Keyboard>', isOptional: false },
              { controlPath: '<Mouse>', isOptional: false }
            ]
          }
        ]
      }
    });
    handler = new GetInputActionsStateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'input_actions_state_get');
      assert.ok(handler.description);
      assert.ok(handler.description.includes('Input Actions'));
    });

    it('should have correct input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.assetName);
      assert.ok(schema.properties.assetPath);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.assetName);
      assert.ok(props.assetPath);
      assert.ok(props.includeBindings);
      assert.ok(props.includeControlSchemes);
      assert.ok(props.includeJsonStructure);
    });
  });

  describe('validate', () => {
    it('should pass with no parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should pass with assetName', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetName: 'PlayerInputActions'
        })
      );
    });

    it('should pass with optional parameters', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          assetPath: 'Assets/Input/PlayerInputActions.inputactions',
          includeBindings: true,
          includeControlSchemes: true
        })
      );
    });
  });

  describe('execute', () => {
    it('should execute successfully', async () => {
      const result = await handler.execute({});

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.equal(
        mockConnection.sendCommand.mock.calls[0].arguments[0],
        'input_actions_state_get'
      );

      assert.ok(result);
      assert.ok(result.content);
      assert.equal(result.isError, false);
    });

    it('should include asset name and path', async () => {
      const result = await handler.execute({});

      const text = result.content[0].text;
      assert.ok(text.includes('PlayerInputActions'));
      assert.ok(text.includes('Assets/Input'));
    });

    it('should include action maps', async () => {
      const result = await handler.execute({
        includeBindings: true
      });

      const text = result.content[0].text;
      assert.ok(text.includes('Action Maps'));
      assert.ok(text.includes('Player'));
    });

    it('should include actions information', async () => {
      const result = await handler.execute({});

      const text = result.content[0].text;
      assert.ok(text.includes('Move'));
      assert.ok(text.includes('Jump'));
      assert.ok(text.includes('Vector2'));
    });

    it('should include bindings when requested', async () => {
      const result = await handler.execute({
        includeBindings: true
      });

      const text = result.content[0].text;
      assert.ok(text.includes('Bindings'));
      assert.ok(text.includes('<Gamepad>/leftStick'));
      assert.ok(text.includes('<Keyboard>/space'));
    });

    it('should include control schemes when requested', async () => {
      const result = await handler.execute({
        includeControlSchemes: true
      });

      const text = result.content[0].text;
      assert.ok(text.includes('Control Schemes'));
      assert.ok(text.includes('Keyboard&Mouse'));
      assert.ok(text.includes('<Keyboard>'));
    });

    it('should include JSON structure when requested', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          assetName: 'Test',
          assetPath: 'Assets/Test.inputactions',
          actionMaps: [],
          jsonStructure: { name: 'Test', maps: [] }
        }
      });
      handler = new GetInputActionsStateToolHandler(mockConnection);

      const result = await handler.execute({
        includeJsonStructure: true
      });

      const text = result.content[0].text;
      assert.ok(text.includes('JSON Structure'));
    });

    it('should handle composite bindings', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          success: true,
          assetName: 'Test',
          assetPath: 'Assets/Test.inputactions',
          actionMaps: [
            {
              name: 'Player',
              id: 'abc',
              actions: [
                {
                  name: 'Move',
                  type: 'Value',
                  bindings: [
                    {
                      name: 'WASD',
                      isComposite: true
                    },
                    {
                      path: '<Keyboard>/w',
                      isPartOfComposite: true
                    }
                  ]
                }
              ]
            }
          ]
        }
      });
      handler = new GetInputActionsStateToolHandler(mockConnection);

      const result = await handler.execute({});

      const text = result.content[0].text;
      assert.ok(text.includes('Composite'));
      assert.ok(text.includes('WASD'));
    });

    it('should throw error when Unity returns error', async () => {
      mockConnection = createMockUnityConnection({
        sendCommandResult: {
          error: 'Asset not found'
        }
      });
      handler = new GetInputActionsStateToolHandler(mockConnection);

      const result = await handler.execute({});

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });

    it('should handle connection errors', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);

      const result = await handler.execute({});

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('connection'));
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({});

      assert.equal(result.status, 'success');
      assert.ok(result.result);
      assert.equal(result.result.isError, false);
    });

    it('should format success result correctly', async () => {
      const result = await handler.handle({});

      assert.ok(result.result.content);
      assert.ok(Array.isArray(result.result.content));
      assert.ok(result.result.content[0].text);
    });
  });

  describe('SPEC-0d5d84f9 compliance', () => {
    it('FR-001: should get Input Actions state', async () => {
      const result = await handler.execute({});
      assert.equal(result.isError, false);
    });

    it('FR-002: should include action maps', async () => {
      const result = await handler.execute({});
      const text = result.content[0].text;
      assert.ok(text.includes('Action Maps'));
    });

    it('FR-003: should include actions', async () => {
      const result = await handler.execute({});
      const text = result.content[0].text;
      assert.ok(text.includes('Move'));
      assert.ok(text.includes('Jump'));
    });

    it('FR-004: should include bindings', async () => {
      await handler.execute({ includeBindings: true });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.includeBindings, true);
    });

    it('FR-005: should include control schemes', async () => {
      await handler.execute({ includeControlSchemes: true });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.includeControlSchemes, true);
    });

    it('FR-006: should support JSON structure export', async () => {
      await handler.execute({ includeJsonStructure: true });
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.includeJsonStructure, true);
    });
  });
});
