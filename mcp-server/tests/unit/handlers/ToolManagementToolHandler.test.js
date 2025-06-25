import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ToolManagementToolHandler } from '../../../src/handlers/editor/ToolManagementToolHandler.js';

describe('ToolManagementToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: () => true,
      connect: async () => {},
      sendCommand: async (command, params) => {
        if (command === 'manage_tools') {
          const action = params.action;
          
          if (action === 'get') {
            return {
              success: true,
              action: 'get',
              tools: [
                {
                  name: 'ProBuilder',
                  displayName: 'ProBuilder',
                  version: '5.1.0',
                  category: 'Modeling',
                  isInstalled: true,
                  isActive: true
                },
                {
                  name: 'Cinemachine',
                  displayName: 'Cinemachine',
                  version: '2.9.0',
                  category: 'Camera',
                  isInstalled: true,
                  isActive: false
                },
                {
                  name: 'TextMeshPro',
                  displayName: 'TextMesh Pro',
                  version: '3.0.6',
                  category: 'UI',
                  isInstalled: false,
                  isActive: false
                }
              ],
              installedCount: 2,
              activeCount: 1
            };
          }
          
          if (action === 'activate') {
            if (params.toolName === 'Cinemachine') {
              return {
                success: true,
                action: 'activate',
                toolName: 'Cinemachine',
                previousState: { isActive: false },
                currentState: { isActive: true },
                message: 'Tool activated: Cinemachine'
              };
            }
            if (params.toolName === 'AlreadyActivePlugin') {
              return {
                success: true,
                action: 'activate',
                toolName: 'AlreadyActivePlugin',
                alreadyActive: true,
                message: 'Tool is already active: AlreadyActivePlugin'
              };
            }
            if (params.toolName === 'NonExistentTool') {
              throw new Error('Tool not found: NonExistentTool');
            }
          }
          
          if (action === 'deactivate') {
            if (params.toolName === 'ProBuilder') {
              return {
                success: true,
                action: 'deactivate',
                toolName: 'ProBuilder',
                previousState: { isActive: true },
                currentState: { isActive: false },
                message: 'Tool deactivated: ProBuilder'
              };
            }
          }
          
          if (action === 'refresh') {
            return {
              success: true,
              action: 'refresh',
              message: 'Tool cache refreshed',
              toolsCount: 15,
              timestamp: new Date().toISOString()
            };
          }
        }
        
        throw new Error('Unknown command');
      }
    };

    handler = new ToolManagementToolHandler(mockUnityConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'manage_tools');
      assert.equal(handler.description, 'Manage Unity Editor tools and plugins (list, activate, deactivate, refresh)');
      assert.ok(handler.inputSchema);
      assert.equal(handler.inputSchema.type, 'object');
    });
  });

  describe('validate', () => {
    it('should validate get action with valid params', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get' });
      });
    });

    it('should validate get action with optional category filter', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get', category: 'Modeling' });
      });
    });

    it('should validate activate action with toolName', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'activate', toolName: 'ProBuilder' });
      });
    });

    it('should validate deactivate action with toolName', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'deactivate', toolName: 'ProBuilder' });
      });
    });

    it('should validate refresh action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'refresh' });
      });
    });

    it('should fail without action', () => {
      assert.throws(() => {
        handler.validate({});
      }, { message: /action is required/ });
    });

    it('should fail with invalid action', () => {
      assert.throws(() => {
        handler.validate({ action: 'invalid' });
      }, { message: /action must be one of: get, activate, deactivate, refresh/ });
    });

    it('should fail activate without toolName', () => {
      assert.throws(() => {
        handler.validate({ action: 'activate' });
      }, { message: /toolName is required for activate action/ });
    });

    it('should fail deactivate without toolName', () => {
      assert.throws(() => {
        handler.validate({ action: 'deactivate' });
      }, { message: /toolName is required for deactivate action/ });
    });

    it('should fail with empty toolName for activate', () => {
      assert.throws(() => {
        handler.validate({ action: 'activate', toolName: '' });
      }, { message: /toolName cannot be empty/ });
    });

    it('should fail with empty category', () => {
      assert.throws(() => {
        handler.validate({ action: 'get', category: '' });
      }, { message: /category cannot be empty/ });
    });
  });

  describe('execute', () => {
    it('should get all tools successfully', async () => {
      const result = await handler.execute({ action: 'get' });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'get');
      assert.equal(result.tools.length, 3);
      assert.equal(result.installedCount, 2);
      assert.equal(result.activeCount, 1);
      
      const proBuilder = result.tools.find(t => t.name === 'ProBuilder');
      assert.ok(proBuilder);
      assert.equal(proBuilder.isInstalled, true);
      assert.equal(proBuilder.isActive, true);
    });

    it('should activate a tool successfully', async () => {
      const result = await handler.execute({ action: 'activate', toolName: 'Cinemachine' });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'activate');
      assert.equal(result.toolName, 'Cinemachine');
      assert.equal(result.previousState.isActive, false);
      assert.equal(result.currentState.isActive, true);
      assert.ok(result.message.includes('activated'));
    });

    it('should handle already active tool', async () => {
      const result = await handler.execute({ action: 'activate', toolName: 'AlreadyActivePlugin' });
      
      assert.equal(result.success, true);
      assert.equal(result.alreadyActive, true);
      assert.ok(result.message.includes('already active'));
    });

    it('should deactivate a tool successfully', async () => {
      const result = await handler.execute({ action: 'deactivate', toolName: 'ProBuilder' });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'deactivate');
      assert.equal(result.toolName, 'ProBuilder');
      assert.equal(result.previousState.isActive, true);
      assert.equal(result.currentState.isActive, false);
      assert.ok(result.message.includes('deactivated'));
    });

    it('should refresh tool cache', async () => {
      const result = await handler.execute({ action: 'refresh' });
      
      assert.equal(result.success, true);
      assert.equal(result.action, 'refresh');
      assert.ok(result.message.includes('refreshed'));
      assert.equal(result.toolsCount, 15);
      assert.ok(result.timestamp);
    });

    it('should handle errors gracefully', async () => {
      await assert.rejects(
        handler.execute({ action: 'activate', toolName: 'NonExistentTool' }),
        { message: /Tool not found: NonExistentTool/ }
      );
    });
  });

  describe('getExamples', () => {
    it('should return array of examples', () => {
      const examples = handler.getExamples();
      assert.ok(Array.isArray(examples));
      assert.ok(examples.length >= 4);
      
      // Check first example structure
      const firstExample = examples[0];
      assert.ok(firstExample.input);
      assert.ok(firstExample.output);
      assert.equal(firstExample.input.action, 'get');
    });

    it('should include examples for all actions', () => {
      const examples = handler.getExamples();
      const actions = examples.map(e => e.input.action);
      
      assert.ok(actions.includes('get'));
      assert.ok(actions.includes('activate'));
      assert.ok(actions.includes('deactivate'));
      assert.ok(actions.includes('refresh'));
    });
  });
});