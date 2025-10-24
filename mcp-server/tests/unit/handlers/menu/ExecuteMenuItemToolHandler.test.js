import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ExecuteMenuItemToolHandler } from '../../../../src/handlers/menu/ExecuteMenuItemToolHandler.js';

describe('ExecuteMenuItemToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        message: 'Menu item executed successfully',
        menuPath: 'Assets/Refresh'
      }))
    };
    
    handler = new ExecuteMenuItemToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'menu_item_execute');
      assert.equal(handler.description, 'Execute Unity Editor menu items');
      assert.ok(handler.inputSchema);
      assert.equal(typeof handler.execute, 'function');
    });

    it('should define required input schema', () => {
      const schema = handler.inputSchema;
      assert.equal(schema.type, 'object');
      assert.ok(schema.properties.menuPath);
      assert.deepEqual(schema.required, ['menuPath']);
    });

    it('should define optional parameters', () => {
      const schema = handler.inputSchema;
      assert.ok(schema.properties.action);
      assert.ok(schema.properties.alias);
      assert.ok(schema.properties.parameters);
      assert.ok(schema.properties.safetyCheck);
    });
  });

  describe('validate', () => {
    it('should pass with valid menu path', () => {
      assert.doesNotThrow(() => {
        handler.validate({ menuPath: 'Assets/Refresh' });
      });
    });

    it('should fail with empty menu path', () => {
      assert.throws(
        () => handler.validate({ menuPath: ' ' }),
        /menuPath cannot be empty/
      );
    });

    it('should fail with missing menu path', () => {
      assert.throws(
        () => handler.validate({}),
        /menuPath is required/
      );
    });

    it('should validate menu path format', () => {
      assert.throws(
        () => handler.validate({ menuPath: 'invalid-path' }),
        /menuPath must be in format/
      );
    });

    it('should reject blacklisted menu items by default', () => {
      assert.throws(
        () => handler.validate({ menuPath: 'File/Quit' }),
        /Menu item is blacklisted for safety/
      );
    });

    it('should allow blacklisted items when safety check is disabled', () => {
      assert.doesNotThrow(() => {
        handler.validate({ 
          menuPath: 'File/Quit',
          safetyCheck: false
        });
      });
    });

    it('should validate action enum', () => {
      assert.throws(
        () => handler.validate({ 
          menuPath: 'Assets/Refresh',
          action: 'invalid_action'
        }),
        /action must be one of/
      );
    });

    it('should accept valid actions', () => {
      const validActions = ['execute', 'get_available_menus'];
      validActions.forEach(action => {
        assert.doesNotThrow(() => {
          handler.validate({ 
            menuPath: 'Assets/Refresh',
            action: action
          });
        });
      });
    });
  });

  describe('execute', () => {
    it('should execute menu item by path', async () => {
      const result = await handler.execute({
        menuPath: 'Assets/Refresh'
      });

      assert.equal(mockUnityConnection.sendCommand.mock.calls.length, 1);
      assert.equal(mockUnityConnection.sendCommand.mock.calls[0].arguments[0], 'execute_menu_item');
      
      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.action, 'execute');
      assert.equal(params.menuPath, 'Assets/Refresh');
      assert.equal(params.safetyCheck, true);

      assert.equal(result.message, 'Menu item executed successfully');
      assert.equal(result.menuPath, 'Assets/Refresh');
    });

    it('should execute menu item with custom action', async () => {
      await handler.execute({
        menuPath: 'Assets/Refresh',
        action: 'execute'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.action, 'execute');
    });

    it('should get available menus', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        availableMenus: [
          'Assets/Refresh',
          'Assets/Reimport All',
          'GameObject/Create Empty',
          'Window/General/Console'
        ],
        message: 'Available menus retrieved successfully'
      }));

      const result = await handler.execute({
        menuPath: 'dummy', // Required but not used for this action
        action: 'get_available_menus'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.action, 'get_available_menus');
      
      assert.ok(Array.isArray(result.availableMenus));
      assert.equal(result.availableMenus.length, 4);
    });

    it('should handle menu execution with alias', async () => {
      await handler.execute({
        menuPath: 'Assets/Refresh',
        alias: 'refresh_assets'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.alias, 'refresh_assets');
    });

    it('should handle menu execution with parameters', async () => {
      await handler.execute({
        menuPath: 'Window/General/Console',
        parameters: { clearOnPlay: true }
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.deepEqual(params.parameters, { clearOnPlay: true });
    });

    it('should disable safety check when requested', async () => {
      await handler.execute({
        menuPath: 'File/Quit',
        safetyCheck: false
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.safetyCheck, false);
    });

    it('should connect if not connected', async () => {
      mockUnityConnection.isConnected.mock.mockImplementation(() => false);

      await handler.execute({
        menuPath: 'Assets/Refresh'
      });

      assert.equal(mockUnityConnection.connect.mock.calls.length, 1);
    });

    it('should handle Unity connection errors', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity not responding');
      });

      await assert.rejects(
        () => handler.execute({ menuPath: 'Assets/Refresh' }),
        /Unity not responding/
      );
    });

    it('should handle menu item not found', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Menu item not found: Invalid/Path'
      }));

      await assert.rejects(
        () => handler.execute({ menuPath: 'Invalid/Path' }),
        /Menu item not found/
      );
    });

    it('should handle menu item execution failure', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Menu item execution failed: disabled or context-dependent'
      }));

      await assert.rejects(
        () => handler.execute({ menuPath: 'Assets/Refresh' }),
        /Menu item execution failed/
      );
    });

    it('should handle blacklisted menu items', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: false,
        error: 'Menu item is blacklisted for safety: File/Quit'
      }));

      await assert.rejects(
        () => handler.execute({ menuPath: 'File/Quit' }),
        /Menu item is blacklisted for safety/
      );
    });

    it('should include execution metadata', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        message: 'Menu item executed successfully',
        menuPath: 'Assets/Refresh',
        executed: true,
        executionTime: 150,
        menuExists: true
      }));

      const result = await handler.execute({
        menuPath: 'Assets/Refresh'
      });

      assert.equal(result.executed, true);
      assert.equal(result.executionTime, 150);
      assert.equal(result.menuExists, true);
    });

    it('should handle menu discovery with filters', async () => {
      mockUnityConnection.sendCommand.mock.mockImplementation(async () => ({
        success: true,
        availableMenus: [
          'Assets/Refresh',
          'Assets/Reimport All'
        ],
        totalMenus: 150,
        filteredCount: 2,
        message: 'Filtered menus retrieved successfully'
      }));

      const result = await handler.execute({
        menuPath: 'dummy',
        action: 'get_available_menus',
        parameters: { filter: 'Assets/*' }
      });

      assert.equal(result.totalMenus, 150);
      assert.equal(result.filteredCount, 2);
    });

    it('should handle common menu aliases', async () => {
      // Test a single alias to verify the functionality
      await handler.execute({
        menuPath: 'Assets/Refresh',
        alias: 'refresh'
      });

      const params = mockUnityConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(params.alias, 'refresh');
      assert.equal(params.menuPath, 'Assets/Refresh'); // Should use the actual path, not alias resolution
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({
        menuPath: 'Assets/Refresh'
      });

      assert.equal(result.status, 'success');
      assert.ok(result.result.message);
      assert.ok(result.result.menuPath);
    });

    it('should return error for validation failure', async () => {
      const result = await handler.handle({
        menuPath: ''
      });

      assert.equal(result.status, 'error');
      assert.ok(result.error.includes('menuPath'));
    });
  });
});