import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { FindGameObjectToolHandler } from '../../../src/handlers/gameobject/FindGameObjectToolHandler.js';
import { createMockUnityConnection } from '../../utils/test-helpers.js';

describe('FindGameObjectToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: [
        {
          "id": -1000,
          "name": "TestObject",
          "path": "/TestObject"
        }
      ]
    });
    handler = new FindGameObjectToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.ok(handler.name);
      assert.ok(handler.description);
      assert.deepEqual(handler.inputSchema.required, []);
    });
  });

  describe('validate', () => {
    it('should pass with valid parameters', () => {
      assert.doesNotThrow(() => handler.validate({"name":"TestObject"}));
    });

    it('should pass with empty parameters', () => {
      assert.doesNotThrow(() => handler.validate({}));
    });

    it('should validate layer bounds', () => {
      assert.throws(
        () => handler.validate({"layer": -1}),
        /layer must be between 0 and 31/
      );
      
      assert.throws(
        () => handler.validate({"layer": 32}),
        /layer must be between 0 and 31/
      );
    });

    it('should accept valid layer values', () => {
      assert.doesNotThrow(() => handler.validate({"layer": 0}));
      assert.doesNotThrow(() => handler.validate({"layer": 31}));
      assert.doesNotThrow(() => handler.validate({"layer": 15}));
    });

    it('should validate exactMatch parameter type', () => {
      assert.throws(
        () => handler.validate({"exactMatch": "true"}),
        /exactMatch must be a boolean/
      );
    });

    it('should accept boolean exactMatch values', () => {
      assert.doesNotThrow(() => handler.validate({"exactMatch": true}));
      assert.doesNotThrow(() => handler.validate({"exactMatch": false}));
    });

    it('should validate parameter types', () => {
      assert.throws(
        () => handler.validate({"name": 123}),
        /name must be a string/
      );
      
      assert.throws(
        () => handler.validate({"tag": 123}),
        /tag must be a string/
      );
      
      assert.throws(
        () => handler.validate({"layer": "invalid"}),
        /layer must be a number/
      );
    });

    it('should handle all parameter combinations', () => {
      assert.doesNotThrow(() => handler.validate({
        "name": "TestObject",
        "tag": "Player", 
        "layer": 8,
        "exactMatch": false
      }));
    });
  });

  describe('execute', () => {
    it('should execute successfully with valid params', async () => {
      const result = await handler.execute({"name":"TestObject"});
      
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 1);
    });

    it('should connect if not connected', async () => {
      mockConnection.isConnected.mock.mockImplementation(() => false);
      mockConnection.connect = mock.fn(async () => {});
      
      await handler.execute({"name":"TestObject"});
      
      assert.equal(mockConnection.connect.mock.calls.length, 1);
    });

    it('should handle empty results from Unity', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => []);
      
      const result = await handler.execute({"name":"NonExistent"});
      
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 0);
    });

    it('should handle Unity error responses', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => {
        throw new Error('Unity search failed');
      });
      
      await assert.rejects(
        async () => await handler.execute({"name":"TestObject"}),
        /Unity search failed/
      );
    });

    it('should pass all parameters to Unity', async () => {
      const params = {
        "name": "Player",
        "tag": "Player",
        "layer": 8,
        "exactMatch": true
      };
      
      await handler.execute(params);
      
      const sentParams = mockConnection.sendCommand.mock.calls[0].arguments[1];
      assert.equal(sentParams.name, "Player");
      assert.equal(sentParams.tag, "Player");
      assert.equal(sentParams.layer, 8);
      assert.equal(sentParams.exactMatch, true);
    });

    it('should handle Unity error in response', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => ({
        error: "Search failed: Invalid parameters"
      }));
      
      await assert.rejects(
        async () => await handler.execute({"name":"TestObject"}),
        /Search failed: Invalid parameters/
      );
    });

    it('should return result with summary when successful', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => ({
        objects: [
          { "id": -1000, "name": "Player1", "path": "/Player1" },
          { "id": -1001, "name": "Player2", "path": "/Player2" }
        ]
      }));
      
      const result = await handler.execute({"name":"Player"});
      
      assert.ok(result.objects);
      assert.ok(result.summary);
      assert.equal(result.objects.length, 2);
    });

    it('should process multiple search results', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => [
        { "id": -1000, "name": "Player1", "path": "/Player1" },
        { "id": -1001, "name": "Player2", "path": "/Player2" },
        { "id": -1002, "name": "Player3", "path": "/Player3" }
      ]);
      
      const result = await handler.execute({"name":"Player"});
      
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 3);
      assert.equal(result[0].name, "Player1");
      assert.equal(result[2].name, "Player3");
    });
  });

  describe('integration with BaseToolHandler', () => {
    it('should handle valid request through handle method', async () => {
      const result = await handler.handle({"name":"TestObject"});
      
      assert.equal(result.status, 'success');
      assert.ok(result.result);
    });

  });
});