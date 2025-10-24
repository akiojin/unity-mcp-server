import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getComponentValuesToolDefinition, getComponentValuesHandler } from '../../../../src/tools/analysis/getComponentValues.js';

describe('GetComponentValuesTool', () => {
    let mockUnityConnection;
    let sendCommandSpy;

    beforeEach(() => {
        sendCommandSpy = mock.fn(() => Promise.resolve({
            status: 'success',
            result: {
                gameObject: 'Directional Light',
                componentType: 'Light',
                componentIndex: 0,
                enabled: true,
                properties: {
                    type: {
                        value: 'Directional',
                        type: 'LightType',
                        options: ['Spot', 'Directional', 'Point', 'Area']
                    },
                    color: {
                        value: { r: 1, g: 0.95, b: 0.8, a: 1 },
                        type: 'Color'
                    },
                    intensity: {
                        value: 1.2,
                        type: 'float',
                        range: { min: 0, max: 8 }
                    },
                    shadows: {
                        value: 'Soft',
                        type: 'LightShadows',
                        options: ['None', 'Hard', 'Soft']
                    },
                    shadowStrength: {
                        value: 0.8,
                        type: 'float'
                    }
                },
                summary: 'Light component on "Directional Light" - 5 properties'
            }
        }));

        mockUnityConnection = {
            sendCommand: sendCommandSpy,
            isConnected: () => true
        };
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it('should have correct tool definition', () => {
        assert.equal(getComponentValuesToolDefinition.name, 'analysis_component_values_get');
        assert.equal(getComponentValuesToolDefinition.description, 'Get all properties and values of a specific component');
    });

    it('should have correct input schema', () => {
        const schema = getComponentValuesToolDefinition.inputSchema;
        assert.equal(schema.type, 'object');
        assert.ok(schema.properties.gameObjectName);
        assert.ok(schema.properties.componentType);
        assert.ok(schema.properties.componentIndex);
        assert.ok(schema.properties.includePrivateFields);
        assert.ok(schema.properties.includeInherited);
        assert.deepEqual(schema.required, ['gameObjectName', 'componentType']);
    });

    it('should get component values with minimum parameters', async () => {
        const args = {
            gameObjectName: 'Directional Light',
            componentType: 'Light'
        };

        const result = await getComponentValuesHandler(mockUnityConnection, args);

        assert.equal(sendCommandSpy.mock.calls.length, 1);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[0], 'analysis_component_values_get');
        assert.deepEqual(sendCommandSpy.mock.calls[0].arguments[1], args);
        
        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('Light component'));
        assert.ok(result.content[0].text.includes('5 properties'));
    });

    it('should get component values with all parameters', async () => {
        const args = {
            gameObjectName: 'Player',
            componentType: 'CharacterController',
            componentIndex: 0,
            includePrivateFields: true,
            includeInherited: false
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                gameObject: 'Player',
                componentType: 'CharacterController',
                componentIndex: 0,
                enabled: true,
                properties: {
                    height: { value: 2.0, type: 'float' },
                    radius: { value: 0.5, type: 'float' },
                    stepOffset: { value: 0.3, type: 'float' },
                    skinWidth: { value: 0.08, type: 'float' },
                    center: { value: { x: 0, y: 0, z: 0 }, type: 'Vector3' }
                },
                summary: 'CharacterController component on "Player" - 5 properties'
            }
        }));

        const result = await getComponentValuesHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includePrivateFields, true);
        assert.equal(sendCommandSpy.mock.calls[0].arguments[1].includeInherited, false);
    });

    it('should handle multiple components of same type', async () => {
        const args = {
            gameObjectName: 'MultiCollider',
            componentType: 'BoxCollider',
            componentIndex: 1
        };

        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'success',
            result: {
                gameObject: 'MultiCollider',
                componentType: 'BoxCollider',
                componentIndex: 1,
                enabled: true,
                properties: {
                    isTrigger: { value: true, type: 'bool' },
                    center: { value: { x: 0, y: 1, z: 0 }, type: 'Vector3' },
                    size: { value: { x: 1, y: 2, z: 1 }, type: 'Vector3' }
                },
                summary: 'BoxCollider component on "MultiCollider" (index 1) - 3 properties'
            }
        }));

        const result = await getComponentValuesHandler(mockUnityConnection, args);

        assert.equal(result.isError, false);
        assert.ok(result.content[0].text.includes('index 1'));
    });

    it('should handle connection not available', async () => {
        mockUnityConnection.isConnected = () => false;

        const result = await getComponentValuesHandler(mockUnityConnection, { 
            gameObjectName: 'Test',
            componentType: 'Transform' 
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Unity connection not available'));
    });

    it('should handle component not found', async () => {
        sendCommandSpy.mock.mockImplementation(() => Promise.resolve({
            status: 'error',
            error: 'Component not found: Rigidbody on GameObject "StaticObject"'
        }));

        const result = await getComponentValuesHandler(mockUnityConnection, {
            gameObjectName: 'StaticObject',
            componentType: 'Rigidbody'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Component not found'));
    });

    it('should validate required parameters', async () => {
        const result = await getComponentValuesHandler(mockUnityConnection, {
            gameObjectName: 'Test'
            // Missing componentType
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('componentType is required'));
    });

    it('should validate componentIndex', async () => {
        const result = await getComponentValuesHandler(mockUnityConnection, {
            gameObjectName: 'Test',
            componentType: 'Transform',
            componentIndex: -1
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('componentIndex must be non-negative'));
    });

    it('should handle command timeout', async () => {
        sendCommandSpy.mock.mockImplementation(() => 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 100)
            )
        );

        const result = await getComponentValuesHandler(mockUnityConnection, {
            gameObjectName: 'Test',
            componentType: 'Transform'
        });
        
        assert.equal(result.isError, true);
        assert.ok(result.content[0].text.includes('Command timeout'));
    });
});