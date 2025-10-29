/**
 * Contract Tests for SPEC-3a7f2e8d: Unity Editor Terminal
 *
 * 前提条件:
 * - Unity Editorが起動している
 * - UnityMCPServerプロジェクトが開いている
 * - TCP接続がlocalhost:6400で待機している
 *
 * 実行方法:
 * npm run test:integration -- tests/integration/terminal-contract.test.js
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UnityConnection } from '../../src/core/unityConnection.js';
import { TerminalOpenToolHandler } from '../../src/handlers/terminal/TerminalOpenToolHandler.js';
import { TerminalExecuteToolHandler } from '../../src/handlers/terminal/TerminalExecuteToolHandler.js';
import { TerminalReadToolHandler } from '../../src/handlers/terminal/TerminalReadToolHandler.js';
import { TerminalCloseToolHandler } from '../../src/handlers/terminal/TerminalCloseToolHandler.js';

describe('SPEC-3a7f2e8d: Terminal Contract Tests', () => {
  let connection;
  let openHandler;
  let executeHandler;
  let readHandler;
  let closeHandler;

  before(async () => {
    // Unity接続確立
    connection = new UnityConnection();

    try {
      await connection.connect();
    } catch (error) {
      console.error('❌ Unity connection failed. Make sure Unity Editor is running.');
      console.error('   1. Open UnityMCPServer project in Unity');
      console.error('   2. Ensure TCP server is listening on localhost:6400');
      throw error;
    }

    assert.ok(connection.connected, 'Unity connection should be established');
    console.log('✓ Unity connection established');
  });

  after(() => {
    if (connection && connection.connected) {
      connection.disconnect();
      console.log('✓ Unity connection closed');
    }
  });

  beforeEach(() => {
    openHandler = new TerminalOpenToolHandler(connection);
    executeHandler = new TerminalExecuteToolHandler(connection);
    readHandler = new TerminalReadToolHandler(connection);
    closeHandler = new TerminalCloseToolHandler(connection);
  });

  describe('Contract: terminal_open', () => {
    it('should open terminal with workspace root', async () => {
      // Given: valid input with workspace root
      const input = {
        workingDirectory: 'workspace',
        shell: 'auto'
      };

      // When: terminal_open is called
      const result = await openHandler.execute(input);

      // Then: should return valid response
      assert.ok(result, 'Result should exist');
      assert.ok(result.sessionId, 'Should have sessionId');
      assert.ok(result.shellType, 'Should have shellType');
      assert.ok(result.shellPath, 'Should have shellPath');
      assert.ok(result.workingDirectory, 'Should have workingDirectory');

      // Validate response types
      assert.strictEqual(typeof result.sessionId, 'string', 'sessionId should be string');
      assert.strictEqual(typeof result.shellType, 'string', 'shellType should be string');
      assert.strictEqual(typeof result.shellPath, 'string', 'shellPath should be string');
      assert.strictEqual(typeof result.workingDirectory, 'string', 'workingDirectory should be string');

      // Cleanup
      await closeHandler.execute({ sessionId: result.sessionId });
      console.log('  ✓ terminal_open contract validated (workspace root)');
    });

    it('should open terminal with project root', async () => {
      // Given: valid input with project root
      const input = {
        workingDirectory: 'project',
        shell: 'auto'
      };

      // When: terminal_open is called
      const result = await openHandler.execute(input);

      // Then: should return valid response
      assert.ok(result, 'Result should exist');
      assert.ok(result.sessionId, 'Should have sessionId');

      // Cleanup
      await closeHandler.execute({ sessionId: result.sessionId });
      console.log('  ✓ terminal_open contract validated (project root)');
    });

    it('should reject when working directory is invalid', async () => {
      // Given: invalid working directory
      const input = {
        workingDirectory: 'invalid',
        shell: 'auto'
      };

      // When: terminal_open is called
      // Then: should throw error
      await assert.rejects(
        async () => await openHandler.execute(input),
        (err) => {
          assert.ok(err.message, 'Should have error message');
          return true;
        },
        'Should throw error for invalid working directory'
      );

      console.log('  ✓ terminal_open error case validated (invalid directory)');
    });
  });

  describe('Contract: terminal_execute', () => {
    let sessionId;

    beforeEach(async () => {
      // Setup: create terminal session
      const result = await openHandler.execute({
        workingDirectory: 'workspace',
        shell: 'auto'
      });
      sessionId = result.sessionId;
    });

    after(async () => {
      // Cleanup: close terminal session
      if (sessionId) {
        await closeHandler.execute({ sessionId });
      }
    });

    it('should execute command in terminal', async () => {
      // Given: valid session and command
      const input = {
        sessionId,
        command: 'echo "test"'
      };

      // When: terminal_execute is called
      const result = await executeHandler.execute(input);

      // Then: should return success response
      assert.ok(result, 'Result should exist');
      assert.strictEqual(typeof result.success, 'boolean', 'success should be boolean');
      assert.ok(result.success, 'Should execute successfully');

      console.log('  ✓ terminal_execute contract validated');
    });

    it('should reject when session not found', async () => {
      // Given: invalid session ID
      const input = {
        sessionId: 'invalid-session-id',
        command: 'echo "test"'
      };

      // When: terminal_execute is called
      // Then: should throw error with SESSION_NOT_FOUND
      await assert.rejects(
        async () => await executeHandler.execute(input),
        (err) => {
          assert.ok(err.message.includes('not found') || err.message.includes('SESSION_NOT_FOUND'), 'Should have SESSION_NOT_FOUND error');
          return true;
        },
        'Should throw error for invalid session'
      );

      console.log('  ✓ terminal_execute error case validated (session not found)');
    });
  });

  describe('Contract: terminal_read', () => {
    let sessionId;

    beforeEach(async () => {
      // Setup: create terminal session
      const result = await openHandler.execute({
        workingDirectory: 'workspace',
        shell: 'auto'
      });
      sessionId = result.sessionId;
    });

    after(async () => {
      // Cleanup: close terminal session
      if (sessionId) {
        await closeHandler.execute({ sessionId });
      }
    });

    it('should read terminal output', async () => {
      // Given: valid session with output
      await executeHandler.execute({
        sessionId,
        command: 'echo "test output"'
      });

      // Wait for output to be captured
      await new Promise(resolve => setTimeout(resolve, 500));

      // When: terminal_read is called
      const result = await readHandler.execute({ sessionId });

      // Then: should return valid response
      assert.ok(result, 'Result should exist');
      assert.ok(Array.isArray(result.lines), 'lines should be array');
      assert.strictEqual(typeof result.hasMore, 'boolean', 'hasMore should be boolean');

      // Validate line structure
      if (result.lines.length > 0) {
        const line = result.lines[0];
        assert.ok(line.text !== undefined, 'line should have text');
        assert.strictEqual(typeof line.isError, 'boolean', 'line.isError should be boolean');
        assert.ok(line.timestamp, 'line should have timestamp');
      }

      console.log('  ✓ terminal_read contract validated');
    });

    it('should respect maxLines parameter', async () => {
      // Given: session with multiple output lines
      await executeHandler.execute({
        sessionId,
        command: 'echo "line1" && echo "line2" && echo "line3"'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // When: terminal_read is called with maxLines=1
      const result = await readHandler.execute({
        sessionId,
        maxLines: 1
      });

      // Then: should return at most 1 line
      assert.ok(result.lines.length <= 1, 'Should return at most 1 line');

      console.log('  ✓ terminal_read maxLines validated');
    });
  });

  describe('Contract: terminal_close', () => {
    it('should close terminal session', async () => {
      // Given: open terminal session
      const openResult = await openHandler.execute({
        workingDirectory: 'workspace',
        shell: 'auto'
      });
      const sessionId = openResult.sessionId;

      // When: terminal_close is called
      const result = await closeHandler.execute({ sessionId });

      // Then: should return success response
      assert.ok(result, 'Result should exist');
      assert.strictEqual(typeof result.success, 'boolean', 'success should be boolean');
      assert.ok(result.success, 'Should close successfully');

      console.log('  ✓ terminal_close contract validated');
    });

    it('should handle closing non-existent session', async () => {
      // Given: invalid session ID
      const input = {
        sessionId: 'non-existent-session-id'
      };

      // When: terminal_close is called
      // Then: should either succeed (idempotent) or throw SESSION_NOT_FOUND
      try {
        const result = await closeHandler.execute(input);
        assert.ok(result, 'Result should exist');
      } catch (error) {
        assert.ok(error.message.includes('not found') || error.message.includes('SESSION_NOT_FOUND'), 'Should have SESSION_NOT_FOUND error');
      }

      console.log('  ✓ terminal_close error case validated (session not found)');
    });
  });
});
