import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { ModifyPrefabToolHandler } from '../../../../src/handlers/asset/ModifyPrefabToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('ModifyPrefabToolHandler', () => {
    let handler;
    let mockUnityConnection;

    beforeEach(() => {
        mockUnityConnection = {
            isConnected: mock.fn(() => true),
            connect: mock.fn(),
            sendCommand: mock.fn()
        };
        handler = new ModifyPrefabToolHandler(mockUnityConnection);
    });

    describe('initialization', () => {
        it('should extend BaseToolHandler', () => {
            assert(handler instanceof BaseToolHandler);
        });

        it('should have correct tool name', () => {
            assert.strictEqual(handler.name, 'asset_prefab_modify');
        });

        it('should have correct description', () => {
            assert.strictEqual(handler.description, 'Modify properties of an existing prefab');
        });
    });

    describe('getDefinition', () => {
        it('should return correct tool definition', () => {
            const definition = handler.getDefinition();
            
            assert.strictEqual(definition.name, 'asset_prefab_modify');
            assert.strictEqual(definition.inputSchema.type, 'object');
            assert(definition.inputSchema.properties.prefabPath);
            assert(definition.inputSchema.properties.modifications);
            assert(definition.inputSchema.properties.applyToInstances);
            assert.deepStrictEqual(definition.inputSchema.required, ['prefabPath', 'modifications']);
        });
    });

    describe('validate', () => {
        it('should require prefabPath', () => {
            assert.throws(
                () => handler.validate({ modifications: {} }),
                { message: 'Missing required parameter: prefabPath' }
            );
        });

        it('should require modifications', () => {
            assert.throws(
                () => handler.validate({ prefabPath: 'Assets/Test.prefab' }),
                { message: 'Missing required parameter: modifications' }
            );
        });

        it('should validate prefabPath format', () => {
            assert.throws(
                () => handler.validate({ 
                    prefabPath: 'invalid/path',
                    modifications: {}
                }),
                { message: 'prefabPath must start with Assets/ and end with .prefab' }
            );
        });

        it('should validate modifications is object', () => {
            assert.throws(
                () => handler.validate({ 
                    prefabPath: 'Assets/Test.prefab',
                    modifications: 'not an object'
                }),
                { message: 'modifications must be an object' }
            );
        });

        it('should validate modifications is not empty', () => {
            assert.throws(
                () => handler.validate({ 
                    prefabPath: 'Assets/Test.prefab',
                    modifications: {}
                }),
                { message: 'modifications cannot be empty' }
            );
        });

        it('should pass with valid parameters', () => {
            assert.doesNotThrow(() => {
                handler.validate({ 
                    prefabPath: 'Assets/Prefabs/Player.prefab',
                    modifications: {
                        transform: { position: { x: 0, y: 1, z: 0 } },
                        name: 'UpdatedPlayer'
                    }
                });
            });
        });
    });

    describe('execute', () => {
        it('should modify prefab properties', async () => {
            const mockResponse = {
                success: true,
                prefabPath: 'Assets/Prefabs/Player.prefab',
                modifiedProperties: ['transform.position', 'name'],
                affectedInstances: 3,
                message: 'Prefab modified successfully'
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({
                prefabPath: 'Assets/Prefabs/Player.prefab',
                modifications: {
                    transform: { position: { x: 0, y: 1, z: 0 } },
                    name: 'UpdatedPlayer'
                }
            });

            assert.strictEqual(mockUnityConnection.sendCommand.mock.calls.length, 1);
            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments, [
                'modify_prefab',
                {
                    prefabPath: 'Assets/Prefabs/Player.prefab',
                    modifications: {
                        transform: { position: { x: 0, y: 1, z: 0 } },
                        name: 'UpdatedPlayer'
                    },
                    applyToInstances: true
                }
            ]);

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should modify prefab without applying to instances', async () => {
            const mockResponse = {
                success: true,
                prefabPath: 'Assets/Prefabs/Enemy.prefab',
                modifiedProperties: ['tag'],
                affectedInstances: 0,
                message: 'Prefab modified without updating instances'
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({
                prefabPath: 'Assets/Prefabs/Enemy.prefab',
                modifications: { tag: 'Enemy' },
                applyToInstances: false
            });

            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1].applyToInstances, false);
            assert.deepStrictEqual(result, mockResponse);
        });

        it('should modify prefab components', async () => {
            const mockResponse = {
                success: true,
                prefabPath: 'Assets/Prefabs/Pickup.prefab',
                modifiedProperties: ['components.BoxCollider.isTrigger', 'components.MeshRenderer.enabled'],
                affectedInstances: 5,
                message: 'Prefab components modified successfully'
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({
                prefabPath: 'Assets/Prefabs/Pickup.prefab',
                modifications: {
                    components: {
                        BoxCollider: { isTrigger: true },
                        MeshRenderer: { enabled: false }
                    }
                }
            });

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should connect if not connected', async () => {
            mockUnityConnection.isConnected.mock.mockImplementationOnce(() => false);
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.resolve({ success: true })
            );

            await handler.execute({
                prefabPath: 'Assets/Test.prefab',
                modifications: { name: 'Test' }
            });

            assert.strictEqual(mockUnityConnection.connect.mock.calls.length, 1);
        });

        it('should handle Unity errors', async () => {
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.reject(new Error('Prefab not found'))
            );

            await assert.rejects(
                async () => await handler.execute({
                    prefabPath: 'Assets/NonExistent.prefab',
                    modifications: { name: 'Test' }
                }),
                { message: 'Prefab not found' }
            );
        });
    });

    describe('handle', () => {
        it('should return success response for valid modification', async () => {
            const mockResponse = {
                success: true,
                prefabPath: 'Assets/Test.prefab',
                modifiedProperties: ['name'],
                affectedInstances: 1
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.handle({
                prefabPath: 'Assets/Test.prefab',
                modifications: { name: 'NewName' }
            });

            assert.strictEqual(result.status, 'success');
            assert.deepStrictEqual(result.result, mockResponse);
        });

        it('should return error response for invalid parameters', async () => {
            const result = await handler.handle({
                modifications: { name: 'Test' }
            });

            assert.strictEqual(result.status, 'error');
            assert.strictEqual(result.error, 'Missing required parameter: prefabPath');
        });

        it('should return error response for empty modifications', async () => {
            const result = await handler.handle({
                prefabPath: 'Assets/Test.prefab',
                modifications: {}
            });

            assert.strictEqual(result.status, 'error');
            assert.strictEqual(result.error, 'modifications cannot be empty');
        });
    });
});