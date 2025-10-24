import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { CreateMaterialToolHandler } from '../../../../src/handlers/asset/CreateMaterialToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('CreateMaterialToolHandler', () => {
    let handler;
    let mockUnityConnection;
    let mockResults = {};

    before(() => {
        // Create mock Unity connection
        mockUnityConnection = {
            isConnected: () => true,
            connect: async () => {},
            sendCommand: async (command, params) => {
                if (mockResults[command]) {
                    if (mockResults[command] instanceof Error) {
                        throw mockResults[command];
                    }
                    return mockResults[command];
                }
                return { status: 'success' };
            }
        };
        handler = new CreateMaterialToolHandler(mockUnityConnection);
    });

    after(() => {
        mockResults = {};
    });

    describe('initialization', () => {
        it('should extend BaseToolHandler', () => {
            assert.ok(handler instanceof BaseToolHandler);
        });

        it('should have correct tool name', () => {
            assert.equal(handler.name, 'asset_material_create');
        });

        it('should have correct description', () => {
            assert.ok(handler.description.includes('Create a new material'));
        });
    });

    describe('getDefinition', () => {
        it('should return correct tool definition', () => {
            const definition = handler.getDefinition();
            
            assert.equal(definition.name, 'asset_material_create');
            assert.ok(definition.description.includes('Create a new material'));
            assert.equal(definition.inputSchema.type, 'object');
            assert.ok(definition.inputSchema.properties.materialPath);
            assert.ok(definition.inputSchema.properties.shader);
            assert.ok(definition.inputSchema.properties.properties);
            assert.ok(definition.inputSchema.properties.copyFrom);
            assert.ok(definition.inputSchema.properties.overwrite);
            assert.deepEqual(definition.inputSchema.required, ['materialPath']);
        });
    });

    describe('validate', () => {
        it('should require materialPath', () => {
            assert.throws(
                () => handler.validate({}),
                { message: 'Missing required parameter: materialPath' }
            );
        });

        it('should validate materialPath format', () => {
            assert.throws(
                () => handler.validate({ materialPath: 'invalid/path' }),
                { message: 'materialPath must start with Assets/ and end with .mat' }
            );

            assert.throws(
                () => handler.validate({ materialPath: 'Assets/test' }),
                { message: 'materialPath must start with Assets/ and end with .mat' }
            );

            assert.throws(
                () => handler.validate({ materialPath: 'test.mat' }),
                { message: 'materialPath must start with Assets/ and end with .mat' }
            );
        });

        it('should validate shader format when provided', () => {
            assert.throws(
                () => handler.validate({ 
                    materialPath: 'Assets/Test.mat',
                    shader: ''
                }),
                { message: 'shader cannot be empty when provided' }
            );
        });

        it('should validate properties when provided', () => {
            assert.throws(
                () => handler.validate({ 
                    materialPath: 'Assets/Test.mat',
                    properties: 'not an object'
                }),
                { message: 'properties must be an object' }
            );

            assert.throws(
                () => handler.validate({ 
                    materialPath: 'Assets/Test.mat',
                    properties: null
                }),
                { message: 'properties must be an object' }
            );
        });

        it('should pass with valid parameters', () => {
            assert.doesNotThrow(() => {
                handler.validate({ materialPath: 'Assets/Materials/Test.mat' });
            });

            assert.doesNotThrow(() => {
                handler.validate({ 
                    materialPath: 'Assets/Materials/Test.mat',
                    shader: 'Standard',
                    properties: {
                        _Color: [1, 0, 0, 1],
                        _Metallic: 0.5
                    }
                });
            });
        });
    });

    describe('execute', () => {
        it('should create material with default shader', async () => {
            mockResults.create_material = {
                success: true,
                materialPath: 'Assets/Materials/Test.mat',
                shader: 'Standard',
                guid: 'test-guid'
            };

            const result = await handler.execute({
                materialPath: 'Assets/Materials/Test.mat'
            });

            assert.equal(result.success, true);
            assert.equal(result.materialPath, 'Assets/Materials/Test.mat');
            assert.equal(result.shader, 'Standard');
        });

        it('should create material with custom shader and properties', async () => {
            mockResults.create_material = {
                success: true,
                materialPath: 'Assets/Materials/Custom.mat',
                shader: 'Unlit/Color',
                propertiesSet: ['_Color']
            };

            const result = await handler.execute({
                materialPath: 'Assets/Materials/Custom.mat',
                shader: 'Unlit/Color',
                properties: {
                    _Color: [1, 0, 0, 1]
                }
            });

            assert.equal(result.success, true);
            assert.equal(result.shader, 'Unlit/Color');
            assert.deepEqual(result.propertiesSet, ['_Color']);
        });

        it('should copy from existing material', async () => {
            mockResults.create_material = {
                success: true,
                materialPath: 'Assets/Materials/Copy.mat',
                copiedFrom: 'Assets/Materials/Source.mat'
            };

            const result = await handler.execute({
                materialPath: 'Assets/Materials/Copy.mat',
                copyFrom: 'Assets/Materials/Source.mat'
            });

            assert.equal(result.success, true);
            assert.equal(result.copiedFrom, 'Assets/Materials/Source.mat');
        });

        it('should connect if not connected', async () => {
            let connectCalled = false;
            mockUnityConnection.isConnected = () => false;
            mockUnityConnection.connect = async () => { connectCalled = true; };
            
            mockResults.create_material = { success: true };

            await handler.execute({ materialPath: 'Assets/Test.mat' });
            assert.ok(connectCalled);
            
            // Reset
            mockUnityConnection.isConnected = () => true;
        });

        it('should handle Unity errors', async () => {
            mockResults.create_material = new Error('Material creation failed');

            await assert.rejects(
                handler.execute({ materialPath: 'Assets/Test.mat' }),
                { message: 'Material creation failed' }
            );
        });
    });

    describe('handle', () => {
        it('should return success response for valid material creation', async () => {
            mockResults.create_material = {
                success: true,
                materialPath: 'Assets/Materials/Test.mat',
                shader: 'Standard',
                guid: 'test-guid'
            };

            const response = await handler.handle({ 
                materialPath: 'Assets/Materials/Test.mat'
            });

            assert.equal(response.status, 'success');
            assert.equal(response.result.materialPath, 'Assets/Materials/Test.mat');
        });

        it('should return error response for invalid parameters', async () => {
            const response = await handler.handle({ materialPath: 'invalid' });

            assert.equal(response.status, 'error');
            assert.equal(response.code, 'TOOL_ERROR');
            assert.ok(response.error.includes('materialPath must start with Assets/'));
        });

        it('should return error response for execution failures', async () => {
            mockResults.create_material = new Error('Failed to create material');

            const response = await handler.handle({ 
                materialPath: 'Assets/Test.mat'
            });

            assert.equal(response.status, 'error');
            assert.equal(response.code, 'TOOL_ERROR');
            assert.ok(response.error.includes('Failed to create material'));
        });
    });
});