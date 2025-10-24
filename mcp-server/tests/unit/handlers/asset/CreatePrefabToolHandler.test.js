import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { CreatePrefabToolHandler } from '../../../../src/handlers/asset/CreatePrefabToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('CreatePrefabToolHandler', () => {
    let handler;
    let mockUnityConnection;

    beforeEach(() => {
        mockUnityConnection = {
            isConnected: mock.fn(() => true),
            connect: mock.fn(),
            sendCommand: mock.fn()
        };
        handler = new CreatePrefabToolHandler(mockUnityConnection);
    });

    describe('initialization', () => {
        it('should extend BaseToolHandler', () => {
            assert(handler instanceof BaseToolHandler);
        });

        it('should have correct tool name', () => {
            assert.strictEqual(handler.name, 'asset_prefab_create');
        });

        it('should have correct description', () => {
            assert.strictEqual(
                handler.description,
                'Create a prefab from a GameObject path or create an empty prefab at a target asset path.'
            );
        });
    });

    describe('getDefinition', () => {
        it('should return correct tool definition', () => {
            const definition = handler.getDefinition();
            
            assert.strictEqual(definition.name, 'asset_prefab_create');
            assert.strictEqual(definition.inputSchema.type, 'object');
            assert(definition.inputSchema.properties.gameObjectPath);
            assert(definition.inputSchema.properties.prefabPath);
            assert(definition.inputSchema.properties.createFromTemplate);
            assert(definition.inputSchema.properties.overwrite);
            assert.deepStrictEqual(definition.inputSchema.required, ['prefabPath']);
        });
    });

    describe('validate', () => {
        it('should require prefabPath', () => {
            assert.throws(
                () => handler.validate({}),
                { message: 'Missing required parameter: prefabPath' }
            );
        });

        it('should validate prefabPath format', () => {
            assert.throws(
                () => handler.validate({ prefabPath: 'invalid/path' }),
                { message: 'prefabPath must start with Assets/ and end with .prefab' }
            );

            assert.throws(
                () => handler.validate({ prefabPath: 'Assets/test.txt' }),
                { message: 'prefabPath must start with Assets/ and end with .prefab' }
            );
        });

        it('should validate gameObjectPath when provided', () => {
            assert.throws(
                () => handler.validate({ 
                    prefabPath: 'Assets/Test.prefab',
                    gameObjectPath: ''
                }),
                { message: 'gameObjectPath cannot be empty when provided' }
            );
        });

        it('should validate mutually exclusive options', () => {
            assert.throws(
                () => handler.validate({ 
                    prefabPath: 'Assets/Test.prefab',
                    gameObjectPath: '/TestObject',
                    createFromTemplate: true
                }),
                { message: 'Cannot specify both gameObjectPath and createFromTemplate' }
            );
        });

        it('should pass with valid parameters', () => {
            assert.doesNotThrow(() => {
                handler.validate({ 
                    prefabPath: 'Assets/Prefabs/Test.prefab'
                });
            });

            assert.doesNotThrow(() => {
                handler.validate({ 
                    prefabPath: 'Assets/Test.prefab',
                    gameObjectPath: '/TestObject'
                });
            });

            assert.doesNotThrow(() => {
                handler.validate({ 
                    prefabPath: 'Assets/Test.prefab',
                    createFromTemplate: true
                });
            });
        });
    });

    describe('execute', () => {
        it('should create prefab from GameObject', async () => {
            const mockResponse = {
                success: true,
                prefabPath: 'Assets/Prefabs/Player.prefab',
                guid: '123e4567-e89b-12d3-a456-426614174000',
                message: 'Prefab created successfully'
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({
                gameObjectPath: '/Player',
                prefabPath: 'Assets/Prefabs/Player.prefab'
            });

            assert.strictEqual(mockUnityConnection.sendCommand.mock.calls.length, 1);
            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments, [
                'create_prefab',
                {
                    gameObjectPath: '/Player',
                    prefabPath: 'Assets/Prefabs/Player.prefab',
                    createFromTemplate: false,
                    overwrite: false
                }
            ]);

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should create empty prefab from template', async () => {
            const mockResponse = {
                success: true,
                prefabPath: 'Assets/Prefabs/Empty.prefab',
                guid: '123e4567-e89b-12d3-a456-426614174001',
                message: 'Empty prefab created successfully'
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({
                prefabPath: 'Assets/Prefabs/Empty.prefab',
                createFromTemplate: true
            });

            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
                gameObjectPath: undefined,
                prefabPath: 'Assets/Prefabs/Empty.prefab',
                createFromTemplate: true,
                overwrite: false
            });

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should overwrite existing prefab when specified', async () => {
            const mockResponse = {
                success: true,
                prefabPath: 'Assets/Prefabs/Existing.prefab',
                guid: '123e4567-e89b-12d3-a456-426614174002',
                message: 'Prefab overwritten successfully'
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({
                gameObjectPath: '/UpdatedObject',
                prefabPath: 'Assets/Prefabs/Existing.prefab',
                overwrite: true
            });

            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1].overwrite, true);
            assert.deepStrictEqual(result, mockResponse);
        });

        it('should connect if not connected', async () => {
            mockUnityConnection.isConnected.mock.mockImplementationOnce(() => false);
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.resolve({ success: true })
            );

            await handler.execute({
                prefabPath: 'Assets/Test.prefab'
            });

            assert.strictEqual(mockUnityConnection.connect.mock.calls.length, 1);
        });

        it('should handle Unity errors', async () => {
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.reject(new Error('GameObject not found'))
            );

            await assert.rejects(
                async () => await handler.execute({
                    gameObjectPath: '/NonExistent',
                    prefabPath: 'Assets/Test.prefab'
                }),
                { message: 'GameObject not found' }
            );
        });
    });

    describe('handle', () => {
        it('should return success response for valid prefab creation', async () => {
            const mockResponse = {
                success: true,
                prefabPath: 'Assets/Test.prefab',
                guid: '123e4567-e89b-12d3-a456-426614174000',
                message: 'Prefab created successfully'
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.handle({
                gameObjectPath: '/TestObject',
                prefabPath: 'Assets/Test.prefab'
            });

            assert.strictEqual(result.status, 'success');
            assert.deepStrictEqual(result.result, mockResponse);
        });

        it('should return error response for invalid parameters', async () => {
            const result = await handler.handle({
                gameObjectPath: '/TestObject'
            });

            assert.strictEqual(result.status, 'error');
            assert.strictEqual(result.error, 'Missing required parameter: prefabPath');
            assert.strictEqual(result.code, 'TOOL_ERROR');
        });

        it('should return error response for execution failures', async () => {
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.reject(new Error('Failed to create prefab'))
            );

            const result = await handler.handle({
                prefabPath: 'Assets/Test.prefab'
            });

            assert.strictEqual(result.status, 'error');
            assert.strictEqual(result.error, 'Failed to create prefab');
        });
    });
});
