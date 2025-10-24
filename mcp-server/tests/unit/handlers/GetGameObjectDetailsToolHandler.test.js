import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GetGameObjectDetailsToolHandler } from '../../../src/handlers/analysis/GetGameObjectDetailsToolHandler.js';

describe('GetGameObjectDetailsToolHandler', () => {
    let handler;
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                name: 'TestObject',
                path: '/TestObject',
                isActive: true,
                components: [],
                summary: 'GameObject "TestObject" at /TestObject'
            }
        }));

        mockUnityConnection = {
            sendCommand: sendCommandSpy,
            isConnected: () => true
        };

        handler = new GetGameObjectDetailsToolHandler(mockUnityConnection);
    });

    it('should have correct tool name', () => {
        assert.equal(handler.name, 'analysis_gameobject_details_get');
    });

    it('should have correct tool definition', () => {
        assert.equal(handler.name, 'analysis_gameobject_details_get');
        assert.equal(handler.description, 'Get detailed information about a specific GameObject');
    });

    it('should execute with valid arguments', async () => {
        const args = { gameObjectName: 'TestObject' };
        const result = await handler.execute(args);

        assert.equal(result.isError, false);
        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'analysis_gameobject_details_get');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
    });

    it('should handle execution errors', async () => {
        mockUnityConnection.isConnected = () => false;
        
        await assert.rejects(
            async () => await handler.execute({ gameObjectName: 'Test' }),
            {
                message: 'Unity connection not available'
            }
        );
    });
});