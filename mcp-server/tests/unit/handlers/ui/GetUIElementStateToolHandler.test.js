import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { GetUIElementStateToolHandler } from '../../../../src/handlers/ui/GetUIElementStateToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('GetUIElementStateToolHandler', () => {
    let handler;
    let mockUnityConnection;

    beforeEach(() => {
        mockUnityConnection = {
            isConnected: mock.fn(() => true),
            connect: mock.fn(),
            sendCommand: mock.fn()
        };
        handler = new GetUIElementStateToolHandler(mockUnityConnection);
    });

    describe('initialization', () => {
        it('should extend BaseToolHandler', () => {
            assert(handler instanceof BaseToolHandler);
        });

        it('should have correct tool name', () => {
            assert.strictEqual(handler.name, 'get_ui_element_state');
        });

        it('should have correct description', () => {
            assert.strictEqual(handler.description, 'Get detailed state information about UI elements');
        });
    });

    describe('getDefinition', () => {
        it('should return correct tool definition', () => {
            const definition = handler.getDefinition();
            
            assert.strictEqual(definition.name, 'get_ui_element_state');
            assert.strictEqual(definition.inputSchema.type, 'object');
            assert(definition.inputSchema.properties.elementPath);
            assert(definition.inputSchema.properties.includeChildren);
            assert(definition.inputSchema.properties.includeInteractableInfo);
            assert.deepStrictEqual(definition.inputSchema.required, ['elementPath']);
        });
    });

    describe('execute', () => {
        it('should get UI element state successfully', async () => {
            const mockResponse = {
                path: '/Canvas/Button',
                name: 'StartButton',
                isActive: true,
                tag: 'Untagged',
                layer: 'UI',
                components: ['RectTransform', 'CanvasRenderer', 'Image', 'Button'],
                isInteractable: true
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({ elementPath: '/Canvas/Button' });

            assert.strictEqual(mockUnityConnection.sendCommand.mock.calls.length, 1);
            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments, [
                'get_ui_element_state',
                {
                    elementPath: '/Canvas/Button',
                    includeChildren: false,
                    includeInteractableInfo: true
                }
            ]);

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should get state with children when requested', async () => {
            const mockResponse = {
                path: '/Canvas/Panel',
                name: 'Panel',
                isActive: true,
                children: [
                    {
                        path: '/Canvas/Panel/Button',
                        name: 'Button',
                        isActive: true
                    }
                ]
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({
                elementPath: '/Canvas/Panel',
                includeChildren: true
            });

            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
                elementPath: '/Canvas/Panel',
                includeChildren: true,
                includeInteractableInfo: true
            });

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should get state of input field with value', async () => {
            const mockResponse = {
                path: '/Canvas/InputField',
                name: 'UsernameInput',
                isActive: true,
                isInteractable: true,
                value: 'test user',
                placeholder: 'Enter username...'
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({ elementPath: '/Canvas/InputField' });

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should get state of toggle with isOn value', async () => {
            const mockResponse = {
                path: '/Canvas/Toggle',
                name: 'RememberMe',
                isActive: true,
                isInteractable: true,
                isOn: true
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({ elementPath: '/Canvas/Toggle' });

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should connect if not connected', async () => {
            mockUnityConnection.isConnected.mock.mockImplementationOnce(() => false);
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.resolve({ path: '/Canvas/Button', isActive: true })
            );

            await handler.execute({ elementPath: '/Canvas/Button' });

            assert.strictEqual(mockUnityConnection.connect.mock.calls.length, 1);
        });

        it('should handle Unity errors', async () => {
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.reject(new Error('UI element not found'))
            );

            await assert.rejects(
                async () => await handler.execute({ elementPath: '/Canvas/NonExistent' }),
                { message: 'UI element not found' }
            );
        });
    });

    describe('handle', () => {
        it('should return success response for valid execution', async () => {
            const mockResponse = {
                path: '/Canvas/Button',
                name: 'Button',
                isActive: true,
                isInteractable: true
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.handle({ elementPath: '/Canvas/Button' });

            assert.strictEqual(result.status, 'success');
            assert.deepStrictEqual(result.result, mockResponse);
        });

        it('should return error response for missing elementPath', async () => {
            const result = await handler.handle({});

            assert.strictEqual(result.status, 'error');
            assert.strictEqual(result.error, 'Missing required parameter: elementPath');
            assert.strictEqual(result.code, 'TOOL_ERROR');
        });
    });
});