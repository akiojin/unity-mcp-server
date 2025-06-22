import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { UnityConnection } from './unityConnection.js';

describe('UnityConnection Message Parsing', () => {
  let connection;

  beforeEach(() => {
    connection = new UnityConnection();
    connection.connected = true; // Simulate connected state for testing
  });

  afterEach(() => {
    connection.pendingCommands.clear();
    connection.messageBuffer = Buffer.alloc(0);
  });

  describe('handleData - Message Framing', () => {
    it('should parse properly framed JSON message', () => {
      const message = { id: '1', status: 'success', result: { test: true } };
      const json = JSON.stringify(message);
      const messageBuffer = Buffer.from(json, 'utf8');
      
      // Create framed message with 4-byte length header (big-endian)
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(messageBuffer.length, 0);
      const framedMessage = Buffer.concat([lengthBuffer, messageBuffer]);

      // Set up pending command
      const pending = {
        resolve: (data) => {
          assert.deepEqual(data, { test: true });
        },
        reject: assert.fail
      };
      connection.pendingCommands.set('1', pending);

      // Process the framed message
      connection.handleData(framedMessage);

      // Verify command was resolved
      assert.equal(connection.pendingCommands.size, 0);
    });

    it('should handle multiple messages in single data chunk', () => {
      const messages = [
        { id: '1', status: 'success', result: { message: 'first' } },
        { id: '2', status: 'success', result: { message: 'second' } }
      ];

      const resolvedMessages = [];
      
      // Set up pending commands
      messages.forEach((msg, index) => {
        connection.pendingCommands.set(String(index + 1), {
          resolve: (data) => resolvedMessages.push(data),
          reject: assert.fail
        });
      });

      // Create framed messages
      const framedMessages = messages.map(msg => {
        const json = JSON.stringify(msg);
        const messageBuffer = Buffer.from(json, 'utf8');
        const lengthBuffer = Buffer.allocUnsafe(4);
        lengthBuffer.writeInt32BE(messageBuffer.length, 0);
        return Buffer.concat([lengthBuffer, messageBuffer]);
      });

      // Send both messages at once
      connection.handleData(Buffer.concat(framedMessages));

      // Verify both were processed
      assert.equal(resolvedMessages.length, 2);
      assert.deepEqual(resolvedMessages[0], { message: 'first' });
      assert.deepEqual(resolvedMessages[1], { message: 'second' });
    });

    it('should handle fragmented messages across multiple data chunks', () => {
      const message = { id: '1', status: 'success', result: { test: 'fragmented' } };
      const json = JSON.stringify(message);
      const messageBuffer = Buffer.from(json, 'utf8');
      
      // Create framed message
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(messageBuffer.length, 0);
      const framedMessage = Buffer.concat([lengthBuffer, messageBuffer]);

      let resolved = false;
      connection.pendingCommands.set('1', {
        resolve: (data) => {
          resolved = true;
          assert.deepEqual(data, { test: 'fragmented' });
        },
        reject: assert.fail
      });

      // Split message into chunks
      const chunk1 = framedMessage.slice(0, 10); // Partial header + partial message
      const chunk2 = framedMessage.slice(10, 25); // More message
      const chunk3 = framedMessage.slice(25); // Rest of message

      // Process chunks
      connection.handleData(chunk1);
      assert.equal(resolved, false, 'Should not resolve with partial message');

      connection.handleData(chunk2);
      assert.equal(resolved, false, 'Should not resolve with incomplete message');

      connection.handleData(chunk3);
      assert.equal(resolved, true, 'Should resolve when message is complete');
    });

    it('should skip non-JSON messages like Unity debug logs', () => {
      // Simulate Unity debug log being sent
      const debugLog = '[Unity Editor MCP] This is a debug log message';
      const debugBuffer = Buffer.from(debugLog, 'utf8');
      
      // Create improperly framed message (what might happen with Unity logs)
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(debugBuffer.length, 0);
      const framedDebugLog = Buffer.concat([lengthBuffer, debugBuffer]);

      // Should not throw
      assert.doesNotThrow(() => {
        connection.handleData(framedDebugLog);
      });

      // Now send a valid message after the debug log
      const validMessage = { id: '1', status: 'success', result: { after: 'debug' } };
      const json = JSON.stringify(validMessage);
      const messageBuffer = Buffer.from(json, 'utf8');
      const validLengthBuffer = Buffer.allocUnsafe(4);
      validLengthBuffer.writeInt32BE(messageBuffer.length, 0);
      const framedValidMessage = Buffer.concat([validLengthBuffer, messageBuffer]);

      let resolved = false;
      connection.pendingCommands.set('1', {
        resolve: (data) => {
          resolved = true;
          assert.deepEqual(data, { after: 'debug' });
        },
        reject: assert.fail
      });

      connection.handleData(framedValidMessage);
      assert.equal(resolved, true, 'Should process valid message after debug log');
    });

    it('should handle invalid message length and recover', () => {
      // Create message with invalid length
      const invalidLengthBuffer = Buffer.allocUnsafe(4);
      invalidLengthBuffer.writeInt32BE(-1, 0); // Invalid negative length
      
      // Send invalid length first
      connection.handleData(invalidLengthBuffer);
      
      // Buffer should be cleared after invalid length
      assert.equal(connection.messageBuffer.length, 0, 'Buffer should be cleared');
      
      // Now send a properly framed valid message
      const validMessage = { id: '1', status: 'success', result: { recovered: true } };
      const json = JSON.stringify(validMessage);
      const messageBuffer = Buffer.from(json, 'utf8');
      const validLengthBuffer = Buffer.allocUnsafe(4);
      validLengthBuffer.writeInt32BE(messageBuffer.length, 0);
      const framedMessage = Buffer.concat([validLengthBuffer, messageBuffer]);

      let resolved = false;
      connection.pendingCommands.set('1', {
        resolve: (data) => {
          resolved = true;
          assert.deepEqual(data, { recovered: true });
        },
        reject: assert.fail
      });

      // Should handle gracefully
      assert.doesNotThrow(() => {
        connection.handleData(framedMessage);
      });

      // Should process the valid message after recovery
      assert.equal(resolved, true, 'Should process valid message after recovery');
    });

    it('should handle message length exceeding max size', () => {
      const oversizedLengthBuffer = Buffer.allocUnsafe(4);
      oversizedLengthBuffer.writeInt32BE(2 * 1024 * 1024, 0); // 2MB, exceeds 1MB limit
      
      // Follow with valid message
      const validMessage = { id: '1', status: 'success', result: { recovered: true } };
      const json = JSON.stringify(validMessage);
      const messageBuffer = Buffer.from(json, 'utf8');
      const validLengthBuffer = Buffer.allocUnsafe(4);
      validLengthBuffer.writeInt32BE(messageBuffer.length, 0);
      
      // First send invalid, then valid
      connection.handleData(oversizedLengthBuffer);
      
      let resolved = false;
      connection.pendingCommands.set('1', {
        resolve: (data) => {
          resolved = true;
          assert.deepEqual(data, { recovered: true });
        },
        reject: assert.fail
      });

      // Buffer should be cleared, so this should work
      connection.handleData(Buffer.concat([validLengthBuffer, messageBuffer]));
      assert.equal(resolved, true, 'Should process valid message after oversized length');
    });

    it('should handle Unity log messages mixed with JSON responses', () => {
      const responses = [];
      
      // Simulate interleaved Unity logs and JSON responses
      const data = [
        // Unity debug log (improperly framed)
        { type: 'log', content: '[Unity Editor MCP] Processing command...' },
        // Valid JSON response
        { type: 'json', content: { id: '1', status: 'success', result: { step: 1 } } },
        // Another Unity log
        { type: 'log', content: '[Unity Editor MCP] Command completed' },
        // Another JSON response
        { type: 'json', content: { id: '2', status: 'success', result: { step: 2 } } }
      ];

      // Set up pending commands
      connection.pendingCommands.set('1', {
        resolve: (data) => responses.push({ id: '1', data }),
        reject: assert.fail
      });
      connection.pendingCommands.set('2', {
        resolve: (data) => responses.push({ id: '2', data }),
        reject: assert.fail
      });

      // Process each piece of data
      data.forEach(item => {
        if (item.type === 'log') {
          const buffer = Buffer.from(item.content, 'utf8');
          const lengthBuffer = Buffer.allocUnsafe(4);
          lengthBuffer.writeInt32BE(buffer.length, 0);
          connection.handleData(Buffer.concat([lengthBuffer, buffer]));
        } else {
          const json = JSON.stringify(item.content);
          const buffer = Buffer.from(json, 'utf8');
          const lengthBuffer = Buffer.allocUnsafe(4);
          lengthBuffer.writeInt32BE(buffer.length, 0);
          connection.handleData(Buffer.concat([lengthBuffer, buffer]));
        }
      });

      // Verify only JSON responses were processed
      assert.equal(responses.length, 2);
      assert.deepEqual(responses[0], { id: '1', data: { step: 1 } });
      assert.deepEqual(responses[1], { id: '2', data: { step: 2 } });
    });
  });

  describe('handleData - Response Format Compatibility', () => {
    it('should handle new response format (status: success)', () => {
      const response = { id: '1', status: 'success', result: { data: 'new format' } };
      const json = JSON.stringify(response);
      const messageBuffer = Buffer.from(json, 'utf8');
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(messageBuffer.length, 0);

      let resolved = false;
      connection.pendingCommands.set('1', {
        resolve: (data) => {
          resolved = true;
          assert.deepEqual(data, { data: 'new format' });
        },
        reject: assert.fail
      });

      connection.handleData(Buffer.concat([lengthBuffer, messageBuffer]));
      assert.equal(resolved, true);
    });

    it('should handle old response format (success: true)', () => {
      const response = { id: '1', success: true, data: { data: 'old format' } };
      const json = JSON.stringify(response);
      const messageBuffer = Buffer.from(json, 'utf8');
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(messageBuffer.length, 0);

      let resolved = false;
      connection.pendingCommands.set('1', {
        resolve: (data) => {
          resolved = true;
          assert.deepEqual(data, { data: 'old format' });
        },
        reject: assert.fail
      });

      connection.handleData(Buffer.concat([lengthBuffer, messageBuffer]));
      assert.equal(resolved, true);
    });

    it('should handle error response (status: error)', () => {
      const response = { id: '1', status: 'error', error: 'Command failed' };
      const json = JSON.stringify(response);
      const messageBuffer = Buffer.from(json, 'utf8');
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(messageBuffer.length, 0);

      let rejected = false;
      connection.pendingCommands.set('1', {
        resolve: assert.fail,
        reject: (error) => {
          rejected = true;
          assert.equal(error.message, 'Command failed');
        }
      });

      connection.handleData(Buffer.concat([lengthBuffer, messageBuffer]));
      assert.equal(rejected, true);
    });

    it('should handle error response (success: false)', () => {
      const response = { id: '1', success: false, error: 'Old format error' };
      const json = JSON.stringify(response);
      const messageBuffer = Buffer.from(json, 'utf8');
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(messageBuffer.length, 0);

      let rejected = false;
      connection.pendingCommands.set('1', {
        resolve: assert.fail,
        reject: (error) => {
          rejected = true;
          assert.equal(error.message, 'Old format error');
        }
      });

      connection.handleData(Buffer.concat([lengthBuffer, messageBuffer]));
      assert.equal(rejected, true);
    });

    it('should handle unknown response format gracefully', () => {
      const response = { id: '1', unknownField: 'value' };
      const json = JSON.stringify(response);
      const messageBuffer = Buffer.from(json, 'utf8');
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(messageBuffer.length, 0);

      let resolved = false;
      connection.pendingCommands.set('1', {
        resolve: (data) => {
          resolved = true;
          assert.deepEqual(data, response);
        },
        reject: assert.fail
      });

      connection.handleData(Buffer.concat([lengthBuffer, messageBuffer]));
      assert.equal(resolved, true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty buffer', () => {
      assert.doesNotThrow(() => {
        connection.handleData(Buffer.alloc(0));
      });
    });

    it('should handle buffer with only length header', () => {
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(100, 0);

      assert.doesNotThrow(() => {
        connection.handleData(lengthBuffer);
      });

      // Buffer should be preserved for next data
      assert.equal(connection.messageBuffer.length, 4);
    });

    it('should clear buffer when unable to recover from invalid frame', () => {
      // Send garbage data with no valid JSON start
      const garbage = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x01, 0x02, 0x03]);
      
      connection.handleData(garbage);
      
      // Buffer should be cleared
      assert.equal(connection.messageBuffer.length, 0);
    });

    it('should handle JSON parsing errors for otherwise valid frames', () => {
      const invalidJson = '{ invalid json }';
      const buffer = Buffer.from(invalidJson, 'utf8');
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeInt32BE(buffer.length, 0);

      assert.doesNotThrow(() => {
        connection.handleData(Buffer.concat([lengthBuffer, buffer]));
      });
    });
  });
});