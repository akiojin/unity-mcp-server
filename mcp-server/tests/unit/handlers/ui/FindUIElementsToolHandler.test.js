import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { FindUIElementsToolHandler } from '../../../../src/handlers/ui/FindUIElementsToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('FindUIElementsToolHandler', () => {
    let handler;
    let mockUnityConnection;

    beforeEach(() => {
        mockUnityConnection = {
            isConnected: mock.fn(() => true),
            connect: mock.fn(),
            sendCommand: mock.fn()
        };
        handler = new FindUIElementsToolHandler(mockUnityConnection);
    });

    describe('initialization', () => {
        it('should extend BaseToolHandler', () => {
            assert(handler instanceof BaseToolHandler);
        });

        it('should have correct tool name', () => {
            assert.strictEqual(handler.name, 'find_ui_elements');
        });

        it('should have correct description', () => {
            assert.strictEqual(handler.description, 'Find UI elements in Unity scene by type, tag, or name');
        });
    });

    describe('getDefinition', () => {
        it('should return correct tool definition', () => {
            const definition = handler.getDefinition();
            
            assert.strictEqual(definition.name, 'find_ui_elements');
            assert.strictEqual(definition.description, 'Find UI elements in Unity scene by type, tag, or name');
            assert.strictEqual(definition.inputSchema.type, 'object');
            assert(definition.inputSchema.properties.elementType);
            assert(definition.inputSchema.properties.tagFilter);
            assert(definition.inputSchema.properties.namePattern);
            assert(definition.inputSchema.properties.includeInactive);
            assert(definition.inputSchema.properties.canvasFilter);
            assert.equal(definition.inputSchema.required, undefined);
        });
    });

    describe('execute', () => {
        it('should find all UI elements when no filters are provided', async () => {
            const mockResponse = {
                elements: [
                    {
                        path: '/Canvas/Panel/Button',
                        elementType: 'Button',
                        name: 'StartButton',
                        isActive: true,
                        isInteractable: true,
                        tag: 'Untagged',
                        canvasPath: '/Canvas'
                    },
                    {
                        path: '/Canvas/Panel/Text',
                        elementType: 'Text',
                        name: 'Title',
                        isActive: true,
                        isInteractable: false,
                        tag: 'Untagged',
                        canvasPath: '/Canvas'
                    }
                ],
                count: 2
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({});

            assert.strictEqual(mockUnityConnection.sendCommand.mock.calls.length, 1);
            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments, [
                'find_ui_elements',
                {
                    elementType: undefined,
                    tagFilter: undefined,
                    namePattern: undefined,
                    includeInactive: false,
                    canvasFilter: undefined
                }
            ]);

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should filter UI elements by type', async () => {
            const mockResponse = {
                elements: [
                    {
                        path: '/Canvas/Button1',
                        elementType: 'Button',
                        name: 'Button1',
                        isActive: true,
                        isInteractable: true,
                        tag: 'Untagged',
                        canvasPath: '/Canvas'
                    }
                ],
                count: 1
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({ elementType: 'Button' });

            assert.strictEqual(mockUnityConnection.sendCommand.mock.calls.length, 1);
            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
                elementType: 'Button',
                tagFilter: undefined,
                namePattern: undefined,
                includeInactive: false,
                canvasFilter: undefined
            });

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should include inactive elements when requested', async () => {
            const mockResponse = {
                elements: [
                    {
                        path: '/Canvas/ActiveButton',
                        elementType: 'Button',
                        name: 'ActiveButton',
                        isActive: true,
                        isInteractable: true,
                        tag: 'Untagged',
                        canvasPath: '/Canvas'
                    },
                    {
                        path: '/Canvas/InactiveButton',
                        elementType: 'Button', 
                        name: 'InactiveButton',
                        isActive: false,
                        isInteractable: false,
                        tag: 'Untagged',
                        canvasPath: '/Canvas'
                    }
                ],
                count: 2
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({ includeInactive: true });

            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1], {
                elementType: undefined,
                tagFilter: undefined,
                namePattern: undefined,
                includeInactive: true,
                canvasFilter: undefined
            });

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should connect if not connected', async () => {
            mockUnityConnection.isConnected.mock.mockImplementationOnce(() => false);
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve({ elements: [], count: 0 }));

            await handler.execute({});

            assert.strictEqual(mockUnityConnection.connect.mock.calls.length, 1);
        });

        it('should handle Unity errors', async () => {
            const errorMessage = 'Failed to find UI elements';
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.reject(new Error(errorMessage))
            );

            await assert.rejects(
                async () => await handler.execute({}),
                { message: errorMessage }
            );
        });
    });

    describe('handle', () => {
        it('should return success response for valid execution', async () => {
            const mockResponse = {
                elements: [{
                    path: '/Canvas/Button',
                    elementType: 'Button',
                    name: 'TestButton',
                    isActive: true,
                    isInteractable: true,
                    tag: 'Untagged',
                    canvasPath: '/Canvas'
                }],
                count: 1
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.handle({ elementType: 'Button' });

            assert.strictEqual(result.status, 'success');
            assert.deepStrictEqual(result.result, mockResponse);
        });

        it('should return error response for failures', async () => {
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.reject(new Error('Connection failed'))
            );

            const result = await handler.handle({});

            assert.strictEqual(result.status, 'error');
            assert.strictEqual(result.error, 'Connection failed');
            assert.strictEqual(result.code, 'TOOL_ERROR');
            assert.strictEqual(result.details.tool, 'find_ui_elements');
        });
    });
});