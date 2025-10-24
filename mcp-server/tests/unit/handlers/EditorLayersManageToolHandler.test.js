import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EditorLayersManageToolHandler } from '../../../src/handlers/editor/EditorLayersManageToolHandler.js';

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

describe('EditorLayersManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new EditorLayersManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'editor_layers_manage');
      assert.equal(handler.description, 'Manage Unity project layers (add, remove, list, convert)');
      assert.ok(handler.inputSchema);
      assert.equal(handler.inputSchema.type, 'object');
    });

    it('should define action parameter', () => {
      const actionProperty = handler.inputSchema.properties.action;
      assert.ok(actionProperty);
      assert.equal(actionProperty.type, 'string');
      assert.ok(actionProperty.enum.includes('add'));
      assert.ok(actionProperty.enum.includes('remove'));
      assert.ok(actionProperty.enum.includes('get'));
      assert.ok(actionProperty.enum.includes('get_by_name'));
      assert.ok(actionProperty.enum.includes('get_by_index'));
    });

    it('should define layerName parameter', () => {
      const layerNameProperty = handler.inputSchema.properties.layerName;
      assert.ok(layerNameProperty);
      assert.equal(layerNameProperty.type, 'string');
    });

    it('should define layerIndex parameter', () => {
      const layerIndexProperty = handler.inputSchema.properties.layerIndex;
      assert.ok(layerIndexProperty);
      assert.equal(layerIndexProperty.type, 'integer');
      assert.equal(layerIndexProperty.minimum, 0);
      assert.equal(layerIndexProperty.maximum, 31);
    });
  });

  describe('validate', () => {
    it('should pass with valid get action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get' });
      });
    });

    it('should pass with valid add action and layer name', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'add', layerName: 'Enemy' });
      });
    });

    it('should pass with valid remove action and layer name', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'remove', layerName: 'Enemy' });
      });
    });

    it('should pass with valid get_by_name action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get_by_name', layerName: 'Enemy' });
      });
    });

    it('should pass with valid get_by_index action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get_by_index', layerIndex: 8 });
      });
    });

    it('should fail with missing action', () => {
      assert.throws(() => {
        handler.validate({});
      }, { message: /action is required/ });
    });

    it('should fail with invalid action', () => {
      assert.throws(() => {
        handler.validate({ action: 'invalid' });
      }, { message: /action must be one of/ });
    });

    it('should fail with add action but missing layer name', () => {
      assert.throws(() => {
        handler.validate({ action: 'add' });
      }, { message: /layerName is required for add action/ });
    });

    it('should fail with empty layer name', () => {
      assert.throws(() => {
        handler.validate({ action: 'add', layerName: '' });
      }, { message: /layerName cannot be empty/ });
    });

    it('should fail with invalid layer name characters', () => {
      assert.throws(() => {
        handler.validate({ action: 'add', layerName: 'Invalid Layer!' });
      }, { message: /layerName contains invalid characters/ });
    });

    it('should fail with reserved layer name', () => {
      assert.throws(() => {
        handler.validate({ action: 'add', layerName: 'Default' });
      }, { message: /layerName is reserved/ });
    });

    it('should fail with invalid layer index', () => {
      assert.throws(() => {
        handler.validate({ action: 'get_by_index', layerIndex: 32 });
      }, { message: /layerIndex must be between 0 and 31/ });
    });

    it('should fail with negative layer index', () => {
      assert.throws(() => {
        handler.validate({ action: 'get_by_index', layerIndex: -1 });
      }, { message: /layerIndex must be between 0 and 31/ });
    });

    it('should fail with missing layerIndex for get_by_index', () => {
      assert.throws(() => {
        handler.validate({ action: 'get_by_index' });
      }, { message: /layerIndex is required for get_by_index action/ });
    });

    it('should fail with missing layerName for get_by_name', () => {
      assert.throws(() => {
        handler.validate({ action: 'get_by_name' });
      }, { message: /layerName is required for get_by_name action/ });
    });
  });

  describe('execute', () => {
    describe('get action', () => {
      it('should get all layers with indices', async () => {
        const mockLayers = [
          { index: 0, name: 'Default' },
          { index: 1, name: 'TransparentFX' },
          { index: 2, name: 'Ignore Raycast' },
          { index: 4, name: 'Water' },
          { index: 5, name: 'UI' },
          { index: 8, name: 'Player' },
          { index: 9, name: 'Enemy' }
        ];
        
        mockConnection.setMockResponse('manage_layers', {
          success: true,
          action: 'get',
          layers: mockLayers,
          count: mockLayers.length
        });

        const result = await handler.execute({ action: 'get' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'get');
        assert.equal(result.layers.length, 7);
        assert.equal(result.layers[0].name, 'Default');
        assert.equal(result.layers[0].index, 0);
        assert.equal(result.count, 7);
      });

      it('should connect if not connected', async () => {
        mockConnection.connected = false;
        mockConnection.setMockResponse('manage_layers', {
          success: true,
          action: 'get',
          layers: [],
          count: 0
        });

        const result = await handler.execute({ action: 'get' });

        assert.equal(result.success, true);
        assert.equal(mockConnection.connected, true);
      });
    });

    describe('add action', () => {
      it('should add new layer', async () => {
        mockConnection.setMockResponse('manage_layers', {
          success: true,
          action: 'add',
          layerName: 'NewLayer',
          layerIndex: 10,
          message: 'Layer "NewLayer" added successfully at index 10',
          layersCount: 8
        });

        const result = await handler.execute({ action: 'add', layerName: 'NewLayer' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'add');
        assert.equal(result.layerName, 'NewLayer');
        assert.equal(result.layerIndex, 10);
        assert.ok(result.message.includes('added successfully'));
      });

      it('should handle duplicate layer error', async () => {
        mockConnection.setMockResponse('manage_layers', {
          error: 'Layer "Player" already exists'
        });

        await assert.rejects(
          async () => await handler.execute({ action: 'add', layerName: 'Player' }),
          { message: 'Layer "Player" already exists' }
        );
      });

      it('should handle no available slots error', async () => {
        mockConnection.setMockResponse('manage_layers', {
          error: 'No available layer slots. All 32 layers are in use'
        });

        await assert.rejects(
          async () => await handler.execute({ action: 'add', layerName: 'TooMany' }),
          { message: 'No available layer slots. All 32 layers are in use' }
        );
      });
    });

    describe('remove action', () => {
      it('should remove existing layer', async () => {
        mockConnection.setMockResponse('manage_layers', {
          success: true,
          action: 'remove',
          layerName: 'OldLayer',
          layerIndex: 10,
          message: 'Layer "OldLayer" removed successfully from index 10',
          layersCount: 7,
          gameObjectsAffected: 3
        });

        const result = await handler.execute({ action: 'remove', layerName: 'OldLayer' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'remove');
        assert.equal(result.layerName, 'OldLayer');
        assert.equal(result.gameObjectsAffected, 3);
      });

      it('should handle non-existent layer error', async () => {
        mockConnection.setMockResponse('manage_layers', {
          error: 'Layer "NonExistent" does not exist'
        });

        await assert.rejects(
          async () => await handler.execute({ action: 'remove', layerName: 'NonExistent' }),
          { message: 'Layer "NonExistent" does not exist' }
        );
      });

      it('should handle reserved layer removal error', async () => {
        mockConnection.setMockResponse('manage_layers', {
          error: 'Cannot remove reserved layer "Default"'
        });

        await assert.rejects(
          async () => await handler.execute({ action: 'remove', layerName: 'Default' }),
          { message: 'Cannot remove reserved layer "Default"' }
        );
      });
    });

    describe('get_by_name action', () => {
      it('should get layer index by name', async () => {
        mockConnection.setMockResponse('manage_layers', {
          success: true,
          action: 'get_by_name',
          layerName: 'Player',
          layerIndex: 8,
          message: 'Layer "Player" is at index 8'
        });

        const result = await handler.execute({ action: 'get_by_name', layerName: 'Player' });

        assert.equal(result.success, true);
        assert.equal(result.layerName, 'Player');
        assert.equal(result.layerIndex, 8);
      });

      it('should handle non-existent layer name', async () => {
        mockConnection.setMockResponse('manage_layers', {
          error: 'Layer "Unknown" does not exist'
        });

        await assert.rejects(
          async () => await handler.execute({ action: 'get_by_name', layerName: 'Unknown' }),
          { message: 'Layer "Unknown" does not exist' }
        );
      });
    });

    describe('get_by_index action', () => {
      it('should get layer name by index', async () => {
        mockConnection.setMockResponse('manage_layers', {
          success: true,
          action: 'get_by_index',
          layerIndex: 8,
          layerName: 'Player',
          message: 'Layer at index 8 is "Player"'
        });

        const result = await handler.execute({ action: 'get_by_index', layerIndex: 8 });

        assert.equal(result.success, true);
        assert.equal(result.layerIndex, 8);
        assert.equal(result.layerName, 'Player');
      });

      it('should handle empty layer slot', async () => {
        mockConnection.setMockResponse('manage_layers', {
          success: true,
          action: 'get_by_index',
          layerIndex: 15,
          layerName: null,
          message: 'Layer at index 15 is not assigned'
        });

        const result = await handler.execute({ action: 'get_by_index', layerIndex: 15 });

        assert.equal(result.success, true);
        assert.equal(result.layerIndex, 15);
        assert.equal(result.layerName, null);
      });
    });

    it('should handle Unity connection errors', async () => {
      mockConnection.setMockResponse('manage_layers', {
        error: 'Unity connection failed'
      });

      await assert.rejects(
        async () => await handler.execute({ action: 'get' }),
        { message: 'Unity connection failed' }
      );
    });
  });

  describe('getExamples', () => {
    it('should return usage examples', () => {
      const examples = handler.getExamples();
      
      assert.ok(examples.getLayers);
      assert.ok(examples.addLayer);
      assert.ok(examples.removeLayer);
      assert.ok(examples.getLayerByName);
      assert.ok(examples.getLayerByIndex);
      
      assert.equal(examples.getLayers.params.action, 'get');
      assert.equal(examples.addLayer.params.action, 'add');
      assert.equal(examples.removeLayer.params.action, 'remove');
      assert.equal(examples.getLayerByName.params.action, 'get_by_name');
      assert.equal(examples.getLayerByIndex.params.action, 'get_by_index');
    });
  });
});