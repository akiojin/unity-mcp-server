import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EditorWindowsManageToolHandler } from '../../../src/handlers/editor/EditorWindowsManageToolHandler.js';

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

describe('EditorWindowsManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new EditorWindowsManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'manage_windows');
      assert.ok(handler.description.startsWith('Manage editor windows'));
      assert.ok(handler.inputSchema);
      assert.equal(handler.inputSchema.type, 'object');
    });

    it('should define action parameter', () => {
      const actionProperty = handler.inputSchema.properties.action;
      assert.ok(actionProperty);
      assert.equal(actionProperty.type, 'string');
      assert.ok(actionProperty.enum.includes('get'));
      assert.ok(actionProperty.enum.includes('focus'));
      assert.ok(actionProperty.enum.includes('get_state'));
    });

    it('should define windowType parameter', () => {
      const windowTypeProperty = handler.inputSchema.properties.windowType;
      assert.ok(windowTypeProperty);
      assert.equal(windowTypeProperty.type, 'string');
    });

    it('should define includeHidden parameter', () => {
      const includeHiddenProperty = handler.inputSchema.properties.includeHidden;
      assert.ok(includeHiddenProperty);
      assert.equal(includeHiddenProperty.type, 'boolean');
    });
  });

  describe('validate', () => {
    it('should pass with valid get action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get' });
      });
    });

    it('should pass with valid get action and includeHidden', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get', includeHidden: true });
      });
    });

    it('should pass with valid focus action and window type', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'focus', windowType: 'SceneView' });
      });
    });

    it('should pass with valid get_state action and window type', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get_state', windowType: 'SceneView' });
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

    it('should fail with focus action but missing windowType', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'focus' });
        },
        { message: /windowType is required for focus action/ }
      );
    });

    it('should fail with get_state action but missing windowType', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'get_state' });
        },
        { message: /windowType is required for get_state action/ }
      );
    });

    it('should fail with empty windowType', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'focus', windowType: '' });
        },
        { message: /windowType cannot be empty/ }
      );
    });
  });

  describe('execute', () => {
    describe('get action', () => {
      it('should get all open windows', async () => {
        const mockWindows = {
          success: true,
          action: 'get',
          windows: [
            {
              type: 'SceneView',
              title: 'Scene',
              hasFocus: true,
              docked: true,
              position: { x: 0, y: 0, width: 800, height: 600 }
            },
            {
              type: 'GameView',
              title: 'Game',
              hasFocus: false,
              docked: true,
              position: { x: 800, y: 0, width: 400, height: 600 }
            },
            {
              type: 'InspectorWindow',
              title: 'Inspector',
              hasFocus: false,
              docked: true,
              position: { x: 1200, y: 0, width: 300, height: 600 }
            }
          ],
          count: 3,
          focusedWindow: 'SceneView'
        };

        mockConnection.setMockResponse('manage_windows', mockWindows);

        const result = await handler.execute({ action: 'get' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'get');
        assert.equal(result.windows.length, 3);
        assert.equal(result.count, 3);
        assert.equal(result.focusedWindow, 'SceneView');
      });

      it('should get windows including hidden', async () => {
        const mockWindows = {
          success: true,
          action: 'get',
          windows: [
            { type: 'SceneView', title: 'Scene', hasFocus: true, docked: true, visible: true },
            {
              type: 'ConsoleWindow',
              title: 'Console',
              hasFocus: false,
              docked: false,
              visible: false
            }
          ],
          count: 2,
          visibleCount: 1,
          hiddenCount: 1
        };

        mockConnection.setMockResponse('manage_windows', mockWindows);

        const result = await handler.execute({ action: 'get', includeHidden: true });

        assert.equal(result.success, true);
        assert.equal(result.visibleCount, 1);
        assert.equal(result.hiddenCount, 1);
      });

      it('should connect if not connected', async () => {
        mockConnection.connected = false;
        mockConnection.setMockResponse('manage_windows', {
          success: true,
          action: 'get',
          windows: [],
          count: 0
        });

        const result = await handler.execute({ action: 'get' });

        assert.equal(result.success, true);
        assert.equal(mockConnection.connected, true);
      });
    });

    describe('focus action', () => {
      it('should focus specific window', async () => {
        mockConnection.setMockResponse('manage_windows', {
          success: true,
          action: 'focus',
          windowType: 'SceneView',
          previousFocus: 'GameView',
          message: 'Focused window: SceneView'
        });

        const result = await handler.execute({
          action: 'focus',
          windowType: 'SceneView'
        });

        assert.equal(result.success, true);
        assert.equal(result.action, 'focus');
        assert.equal(result.windowType, 'SceneView');
        assert.equal(result.previousFocus, 'GameView');
      });

      it('should handle window not found', async () => {
        mockConnection.setMockResponse('manage_windows', {
          error: 'Window type "NonExistentWindow" not found'
        });

        await assert.rejects(
          async () =>
            await handler.execute({
              action: 'focus',
              windowType: 'NonExistentWindow'
            }),
          { message: 'Window type "NonExistentWindow" not found' }
        );
      });

      it('should handle already focused window', async () => {
        mockConnection.setMockResponse('manage_windows', {
          success: true,
          action: 'focus',
          windowType: 'SceneView',
          alreadyFocused: true,
          message: 'Window "SceneView" is already focused'
        });

        const result = await handler.execute({
          action: 'focus',
          windowType: 'SceneView'
        });

        assert.equal(result.success, true);
        assert.equal(result.alreadyFocused, true);
      });
    });

    describe('get_state action', () => {
      it('should get detailed window state', async () => {
        mockConnection.setMockResponse('manage_windows', {
          success: true,
          action: 'get_state',
          windowType: 'SceneView',
          state: {
            type: 'SceneView',
            title: 'Scene',
            hasFocus: true,
            docked: true,
            floating: false,
            position: { x: 0, y: 0, width: 800, height: 600 },
            minSize: { width: 100, height: 100 },
            maxSize: { width: 4000, height: 4000 },
            maximized: false,
            hasUnsavedChanges: false,
            isPlayModeView: false
          }
        });

        const result = await handler.execute({
          action: 'get_state',
          windowType: 'SceneView'
        });

        assert.equal(result.success, true);
        assert.equal(result.action, 'get_state');
        assert.equal(result.windowType, 'SceneView');
        assert.ok(result.state);
        assert.equal(result.state.hasFocus, true);
        assert.equal(result.state.docked, true);
      });

      it('should handle closed window state', async () => {
        mockConnection.setMockResponse('manage_windows', {
          success: true,
          action: 'get_state',
          windowType: 'AnimationWindow',
          state: null,
          message: 'Window "AnimationWindow" is not open'
        });

        const result = await handler.execute({
          action: 'get_state',
          windowType: 'AnimationWindow'
        });

        assert.equal(result.success, true);
        assert.equal(result.state, null);
        assert.ok(result.message.includes('not open'));
      });
    });

    it('should handle Unity connection errors', async () => {
      mockConnection.setMockResponse('manage_windows', {
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

      assert.ok(examples.getAllWindows);
      assert.ok(examples.getAllWindowsIncludingHidden);
      assert.ok(examples.focusSceneView);
      assert.ok(examples.focusGameView);
      assert.ok(examples.getWindowState);

      assert.equal(examples.getAllWindows.params.action, 'get');
      assert.equal(examples.focusSceneView.params.action, 'focus');
      assert.equal(examples.focusSceneView.params.windowType, 'SceneView');
      assert.equal(examples.getWindowState.params.action, 'get_state');
    });
  });
});
