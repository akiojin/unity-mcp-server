import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CompilationGetStateToolHandler } from '../../../../src/handlers/compilation/CompilationGetStateToolHandler.js';

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

describe('CompilationGetStateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new CompilationGetStateToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'get_compilation_state');
      assert.equal(
        handler.description,
        'Get current Unity compilation state, errors, and warnings with enhanced detection'
      );
      assert.equal(handler.inputSchema.required, undefined);
    });
  });

  describe('execute', () => {
    it('should get compilation state without messages', async () => {
      mockConnection.setMockResponse('get_compilation_state', {
        success: true,
        isCompiling: false,
        isUpdating: false,
        isMonitoring: true,
        lastCompilationTime: '2025-06-25T10:30:00.000Z',
        messageCount: 5,
        errorCount: 2,
        warningCount: 3
      });

      const result = await handler.execute({
        includeMessages: false
      });

      assert.equal(result.success, true);
      assert.equal(result.isCompiling, false);
      assert.equal(result.errorCount, 2);
      assert.equal(result.warningCount, 3);
      assert.equal(result.messages, undefined);
    });

    it('should get compilation state with messages', async () => {
      const mockMessages = [
        {
          type: 'Error',
          message: 'CS0117: ResourceType does not contain a definition for Diamond',
          file: 'Assets/Scripts/ResourceItemView.cs',
          line: 53,
          column: 30,
          timestamp: '2025-06-25T10:30:00.000Z'
        },
        {
          type: 'Warning',
          message: 'CS0414: Variable is assigned but never used',
          file: 'Assets/Scripts/TestScript.cs',
          line: 10,
          column: 15,
          timestamp: '2025-06-25T10:29:00.000Z'
        }
      ];

      mockConnection.setMockResponse('get_compilation_state', {
        success: true,
        isCompiling: false,
        isUpdating: false,
        isMonitoring: true,
        lastCompilationTime: '2025-06-25T10:30:00.000Z',
        messageCount: 2,
        errorCount: 1,
        warningCount: 1,
        messages: mockMessages
      });

      const result = await handler.execute({
        includeMessages: true,
        maxMessages: 10
      });

      assert.equal(result.success, true);
      assert.equal(result.messageCount, 2);
      assert.equal(result.errorCount, 1);
      assert.equal(result.warningCount, 1);
      assert.equal(result.messages.length, 2);
      assert.equal(result.messages[0].type, 'Error');
      assert.equal(result.messages[0].file, 'Assets/Scripts/ResourceItemView.cs');
      assert.equal(result.messages[0].line, 53);
    });

    it('should handle compilation in progress', async () => {
      mockConnection.setMockResponse('get_compilation_state', {
        success: true,
        isCompiling: true,
        isUpdating: true,
        isMonitoring: true,
        lastCompilationTime: '2025-06-25T10:30:00.000Z',
        messageCount: 0,
        errorCount: 0,
        warningCount: 0,
        messages: []
      });

      const result = await handler.execute({});

      assert.equal(result.isCompiling, true);
      assert.equal(result.isUpdating, true);
      assert.equal(result.errorCount, 0);
    });

    it('should handle Unity errors', async () => {
      mockConnection.setMockResponse('get_compilation_state', {
        error: 'Failed to read compilation logs'
      });

      await assert.rejects(async () => await handler.execute({}), {
        message: 'Failed to read compilation logs'
      });
    });
  });
});
