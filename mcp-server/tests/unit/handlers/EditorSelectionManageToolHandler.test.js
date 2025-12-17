import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EditorSelectionManageToolHandler } from '../../../src/handlers/editor/EditorSelectionManageToolHandler.js';

// Mock Unity connection
class MockUnityConnection {
  constructor() {
    this.connected = true;
    this.mockResponses = new Map();
  }

  isConnected() {
    return this.connected;
  }

  async connect() {
    this.connected = true;
  }

  setMockResponse(command, response) {
    this.mockResponses.set(command, response);
  }

  async sendCommand(command, params) {
    const response = this.mockResponses.get(command);
    if (response) {
      return typeof response === 'function' ? response(params) : response;
    }
    throw new Error(`No mock response for command: ${command}`);
  }
}

describe('EditorSelectionManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new EditorSelectionManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'manage_selection');
      assert.ok(handler.description.startsWith('Manage editor selection'));
      assert.ok(handler.inputSchema);
      assert.equal(handler.inputSchema.type, 'object');
    });

    it('should define action parameter', () => {
      const actionProperty = handler.inputSchema.properties.action;
      assert.ok(actionProperty);
      assert.equal(actionProperty.type, 'string');
      assert.ok(actionProperty.enum.includes('get'));
      assert.ok(actionProperty.enum.includes('set'));
      assert.ok(actionProperty.enum.includes('clear'));
      assert.ok(actionProperty.enum.includes('get_details'));
    });

    it('should define objectPaths parameter', () => {
      const objectPathsProperty = handler.inputSchema.properties.objectPaths;
      assert.ok(objectPathsProperty);
      assert.equal(objectPathsProperty.type, 'array');
      assert.equal(objectPathsProperty.items.type, 'string');
    });

    it('should define includeDetails parameter', () => {
      const includeDetailsProperty = handler.inputSchema.properties.includeDetails;
      assert.ok(includeDetailsProperty);
      assert.equal(includeDetailsProperty.type, 'boolean');
    });
  });

  describe('validate', () => {
    it('should pass with valid get action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get' });
      });
    });

    it('should pass with valid get action and includeDetails', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get', includeDetails: true });
      });
    });

    it('should pass with valid set action and object paths', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'set', objectPaths: ['/Main Camera', '/Directional Light'] });
      });
    });

    it('should pass with valid clear action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'clear' });
      });
    });

    it('should pass with valid get_details action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get_details' });
      });
    });

    it('should fail with missing action', () => {
      assert.throws(
        () => {
          handler.validate({});
        },
        { message: /action is required/ }
      );
    });

    it('should fail with invalid action', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'invalid' });
        },
        { message: /action must be one of/ }
      );
    });

    it('should fail with set action but missing objectPaths', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'set' });
        },
        { message: /objectPaths is required for set action/ }
      );
    });

    it('should fail with empty objectPaths for set action', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'set', objectPaths: [] });
        },
        { message: /objectPaths cannot be empty/ }
      );
    });

    it('should fail with non-array objectPaths', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'set', objectPaths: '/Main Camera' });
        },
        { message: /objectPaths must be an array/ }
      );
    });

    it('should fail with invalid path in objectPaths', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'set', objectPaths: ['Main Camera'] });
        },
        { message: /All object paths must start with/ }
      );
    });

    it('should fail with non-string path in objectPaths', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'set', objectPaths: ['/Main Camera', 123] });
        },
        { message: /All object paths must be strings/ }
      );
    });
  });

  describe('execute', () => {
    describe('get action', () => {
      it('should get current selection without details', async () => {
        const mockSelection = {
          success: true,
          action: 'get',
          selection: [
            { path: '/Main Camera', name: 'Main Camera' },
            { path: '/Directional Light', name: 'Directional Light' }
          ],
          count: 2
        };

        mockConnection.setMockResponse('manage_selection', mockSelection);

        const result = await handler.execute({ action: 'get' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'get');
        assert.equal(result.selection.length, 2);
        assert.equal(result.count, 2);
      });

      it('should get current selection with details', async () => {
        const mockSelection = {
          success: true,
          action: 'get',
          selection: [
            {
              path: '/Main Camera',
              name: 'Main Camera',
              instanceId: -1234,
              tag: 'MainCamera',
              layer: 0,
              isActive: true,
              position: { x: 0, y: 1, z: -10 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
              components: ['Transform', 'Camera', 'FlareLayer', 'AudioListener']
            }
          ],
          count: 1
        };

        mockConnection.setMockResponse('manage_selection', mockSelection);

        const result = await handler.execute({ action: 'get', includeDetails: true });

        assert.equal(result.success, true);
        assert.equal(result.selection[0].components.length, 4);
        assert.equal(result.selection[0].tag, 'MainCamera');
      });

      it('should handle empty selection', async () => {
        mockConnection.setMockResponse('manage_selection', {
          success: true,
          action: 'get',
          selection: [],
          count: 0
        });

        const result = await handler.execute({ action: 'get' });

        assert.equal(result.success, true);
        assert.equal(result.selection.length, 0);
        assert.equal(result.count, 0);
      });

      it('should connect if not connected', async () => {
        mockConnection.connected = false;
        mockConnection.setMockResponse('manage_selection', {
          success: true,
          action: 'get',
          selection: [],
          count: 0
        });

        const result = await handler.execute({ action: 'get' });

        assert.equal(result.success, true);
        assert.equal(mockConnection.connected, true);
      });
    });

    describe('set action', () => {
      it('should set selection to specific objects', async () => {
        mockConnection.setMockResponse('manage_selection', {
          success: true,
          action: 'set',
          selection: [
            { path: '/Player', name: 'Player' },
            { path: '/Enemy', name: 'Enemy' }
          ],
          count: 2,
          message: 'Selection set to 2 objects'
        });

        const result = await handler.execute({
          action: 'set',
          objectPaths: ['/Player', '/Enemy']
        });

        assert.equal(result.success, true);
        assert.equal(result.action, 'set');
        assert.equal(result.count, 2);
        assert.ok(result.message.includes('2 objects'));
      });

      it('should handle non-existent objects', async () => {
        mockConnection.setMockResponse('manage_selection', {
          success: true,
          action: 'set',
          selection: [{ path: '/Player', name: 'Player' }],
          notFound: ['/NonExistent'],
          count: 1,
          message: 'Selection set to 1 object(s). 1 object(s) not found.'
        });

        const result = await handler.execute({
          action: 'set',
          objectPaths: ['/Player', '/NonExistent']
        });

        assert.equal(result.success, true);
        assert.equal(result.count, 1);
        assert.equal(result.notFound.length, 1);
        assert.ok(result.message.includes('not found'));
      });

      it('should handle all objects not found', async () => {
        mockConnection.setMockResponse('manage_selection', {
          error: 'No valid objects found to select'
        });

        await assert.rejects(
          async () =>
            await handler.execute({
              action: 'set',
              objectPaths: ['/NonExistent1', '/NonExistent2']
            }),
          { message: 'No valid objects found to select' }
        );
      });
    });

    describe('clear action', () => {
      it('should clear current selection', async () => {
        mockConnection.setMockResponse('manage_selection', {
          success: true,
          action: 'clear',
          previousCount: 3,
          message: 'Selection cleared. Previously had 3 objects selected.'
        });

        const result = await handler.execute({ action: 'clear' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'clear');
        assert.equal(result.previousCount, 3);
        assert.ok(result.message.includes('cleared'));
      });

      it('should handle clearing empty selection', async () => {
        mockConnection.setMockResponse('manage_selection', {
          success: true,
          action: 'clear',
          previousCount: 0,
          message: 'Selection was already empty'
        });

        const result = await handler.execute({ action: 'clear' });

        assert.equal(result.success, true);
        assert.equal(result.previousCount, 0);
        assert.ok(result.message.includes('already empty'));
      });
    });

    describe('get_details action', () => {
      it('should get detailed information about selection', async () => {
        mockConnection.setMockResponse('manage_selection', {
          success: true,
          action: 'get_details',
          selection: [
            {
              path: '/Player',
              name: 'Player',
              instanceId: -5678,
              tag: 'Player',
              layer: 8,
              isActive: true,
              isPrefabInstance: true,
              prefabPath: 'Assets/Prefabs/Player.prefab',
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
              components: [
                { type: 'Transform', enabled: true },
                { type: 'Rigidbody', enabled: true },
                { type: 'CapsuleCollider', enabled: true },
                { type: 'PlayerController', enabled: true }
              ],
              childCount: 3,
              parentPath: null
            }
          ],
          count: 1,
          totalChildrenCount: 3,
          hasActiveObjects: true,
          hasInactiveObjects: false
        });

        const result = await handler.execute({ action: 'get_details' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'get_details');
        assert.equal(result.selection[0].isPrefabInstance, true);
        assert.equal(result.selection[0].components.length, 4);
        assert.equal(result.totalChildrenCount, 3);
      });

      it('should handle empty selection details', async () => {
        mockConnection.setMockResponse('manage_selection', {
          success: true,
          action: 'get_details',
          selection: [],
          count: 0,
          message: 'No objects selected'
        });

        const result = await handler.execute({ action: 'get_details' });

        assert.equal(result.success, true);
        assert.equal(result.count, 0);
        assert.ok(result.message.includes('No objects selected'));
      });
    });

    it('should handle Unity connection errors', async () => {
      mockConnection.setMockResponse('manage_selection', {
        error: 'Unity connection failed'
      });

      await assert.rejects(async () => await handler.execute({ action: 'get' }), {
        message: 'Unity connection failed'
      });
    });
  });

  describe('getExamples', () => {
    it('should return usage examples', () => {
      const examples = handler.getExamples();

      assert.ok(examples.getSelection);
      assert.ok(examples.getSelectionWithDetails);
      assert.ok(examples.setSelection);
      assert.ok(examples.clearSelection);
      assert.ok(examples.getSelectionDetails);

      assert.equal(examples.getSelection.params.action, 'get');
      assert.equal(examples.setSelection.params.action, 'set');
      assert.equal(examples.clearSelection.params.action, 'clear');
      assert.equal(examples.getSelectionDetails.params.action, 'get_details');
      assert.ok(Array.isArray(examples.setSelection.params.objectPaths));
    });
  });
});
