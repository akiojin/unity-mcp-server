import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { SimulateUIInputToolHandler } from '../../../../src/handlers/ui/SimulateUIInputToolHandler.js';
import { BaseToolHandler } from '../../../../src/handlers/base/BaseToolHandler.js';

describe('SimulateUIInputToolHandler', () => {
    let handler;
    let mockUnityConnection;

    beforeEach(() => {
        mockUnityConnection = {
            isConnected: mock.fn(() => true),
            connect: mock.fn(),
            sendCommand: mock.fn()
        };
        handler = new SimulateUIInputToolHandler(mockUnityConnection);
    });

    describe('initialization', () => {
        it('should extend BaseToolHandler', () => {
            assert(handler instanceof BaseToolHandler);
        });

        it('should have correct tool name', () => {
            assert.strictEqual(handler.name, 'ui_simulate_input');
        });

        it('should have correct description', () => {
            assert.strictEqual(handler.description, 'Simulate complex UI interactions and input sequences');
        });
    });

    describe('getDefinition', () => {
        it('should return correct tool definition', () => {
            const definition = handler.getDefinition();
            
            assert.strictEqual(definition.name, 'ui_simulate_input');
            assert.strictEqual(definition.inputSchema.type, 'object');
            assert(definition.inputSchema.properties.inputSequence);
            assert(definition.inputSchema.properties.waitBetween);
            assert(definition.inputSchema.properties.validateState);
            assert.deepStrictEqual(definition.inputSchema.required, ['inputSequence']);
        });
    });

    describe('validate', () => {
        it('should require inputSequence', () => {
            assert.throws(
                () => handler.validate({}),
                { message: 'Missing required parameter: inputSequence' }
            );
        });

        it('should validate inputSequence is array', () => {
            assert.throws(
                () => handler.validate({ inputSequence: 'not an array' }),
                { message: 'inputSequence must be an array' }
            );
        });

        it('should validate inputSequence is not empty', () => {
            assert.throws(
                () => handler.validate({ inputSequence: [] }),
                { message: 'inputSequence must contain at least one action' }
            );
        });

        it('should validate each action has type and params', () => {
            assert.throws(
                () => handler.validate({ 
                    inputSequence: [{ type: 'click' }] 
                }),
                { message: 'Each action must have type and params' }
            );

            assert.throws(
                () => handler.validate({ 
                    inputSequence: [{ params: {} }] 
                }),
                { message: 'Each action must have type and params' }
            );
        });

        it('should validate waitBetween range', () => {
            assert.throws(
                () => handler.validate({ 
                    inputSequence: [{ type: 'click', params: {} }],
                    waitBetween: -1 
                }),
                { message: 'waitBetween must be between 0 and 10000 milliseconds' }
            );
        });

        it('should pass with valid parameters', () => {
            assert.doesNotThrow(() => {
                handler.validate({
                    inputSequence: [
                        { type: 'click', params: { elementPath: '/Canvas/Button' } },
                        { type: 'setvalue', params: { elementPath: '/Canvas/Input', value: 'test' } }
                    ],
                    waitBetween: 100,
                    validateState: true
                });
            });
        });
    });

    describe('execute', () => {
        it('should execute simple click sequence', async () => {
            const mockResponse = {
                success: true,
                results: [
                    { success: true, elementPath: '/Canvas/Button', message: 'Clicked' }
                ],
                totalActions: 1
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({
                inputSequence: [
                    { type: 'click', params: { elementPath: '/Canvas/Button' } }
                ]
            });

            assert.strictEqual(mockUnityConnection.sendCommand.mock.calls.length, 1);
            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments, [
                'simulate_ui_input',
                {
                    inputSequence: [
                        { type: 'click', params: { elementPath: '/Canvas/Button' } }
                    ],
                    waitBetween: 100,
                    validateState: true
                }
            ]);

            assert.deepStrictEqual(result, mockResponse);
        });

        it('should execute complex sequence with multiple actions', async () => {
            const mockResponse = {
                success: true,
                results: [
                    { success: true },
                    { wait: 500 },
                    { success: true }
                ],
                totalActions: 2
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.execute({
                inputSequence: [
                    { type: 'click', params: { elementPath: '/Canvas/OpenButton' } },
                    { type: 'setvalue', params: { elementPath: '/Canvas/Input', value: 'test' } }
                ],
                waitBetween: 500
            });

            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1].waitBetween, 500);
            assert.deepStrictEqual(result, mockResponse);
        });

        it('should execute without state validation when specified', async () => {
            const mockResponse = { success: true, results: [], totalActions: 1 };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            await handler.execute({
                inputSequence: [{ type: 'click', params: {} }],
                validateState: false
            });

            assert.deepStrictEqual(mockUnityConnection.sendCommand.mock.calls[0].arguments[1].validateState, false);
        });

        it('should connect if not connected', async () => {
            mockUnityConnection.isConnected.mock.mockImplementationOnce(() => false);
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.resolve({ success: true, results: [], totalActions: 0 })
            );

            await handler.execute({
                inputSequence: [{ type: 'click', params: {} }]
            });

            assert.strictEqual(mockUnityConnection.connect.mock.calls.length, 1);
        });

        it('should handle Unity errors', async () => {
            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => 
                Promise.reject(new Error('Failed to execute sequence'))
            );

            await assert.rejects(
                async () => await handler.execute({
                    inputSequence: [{ type: 'click', params: {} }]
                }),
                { message: 'Failed to execute sequence' }
            );
        });
    });

    describe('handle', () => {
        it('should return success response for valid execution', async () => {
            const mockResponse = {
                success: true,
                results: [{ success: true }],
                totalActions: 1
            };

            mockUnityConnection.sendCommand.mock.mockImplementationOnce(() => Promise.resolve(mockResponse));

            const result = await handler.handle({
                inputSequence: [{ type: 'click', params: { elementPath: '/Canvas/Button' } }]
            });

            assert.strictEqual(result.status, 'success');
            assert.deepStrictEqual(result.result, mockResponse);
        });

        it('should return error response for invalid parameters', async () => {
            const result = await handler.handle({
                inputSequence: 'not an array'
            });

            assert.strictEqual(result.status, 'error');
            assert.strictEqual(result.error, 'inputSequence must be an array');
        });
    });
});