import { mock } from 'node:test';

/**
 * Creates a mock Unity connection for testing handlers
 * @param {object} options - Configuration options
 * @returns {object} Mock Unity connection
 */
export function createMockUnityConnection(options = {}) {
  const {
    isConnected = true,
    connectResult = undefined,
    sendCommandResult = { status: 'success', data: {} },
    sendCommandImpl = null
  } = options;

  const mockConnection = {
    isConnected: mock.fn(() => isConnected),
    connect: mock.fn(async () => connectResult),
    sendCommand: sendCommandImpl 
      ? mock.fn(sendCommandImpl)
      : mock.fn(async (command, params) => sendCommandResult)
  };

  return mockConnection;
}

/**
 * Creates a standard test suite for a tool handler
 * @param {string} HandlerClass - The handler class to test
 * @param {object} config - Test configuration
 */
export function createHandlerTestSuite(HandlerClass, config) {
  const {
    handlerName,
    description,
    requiredParams = [],
    validParams,
    invalidParams = [],
    executeTests = []
  } = config;

  return {
    testConstructor: (handler) => {
      return handler.name === handlerName &&
             handler.description === description &&
             JSON.stringify(handler.inputSchema.required) === JSON.stringify(requiredParams);
    },
    
    testValidation: async (handler) => {
      // Test valid params pass
      if (validParams) {
        try {
          handler.validate(validParams);
          return true;
        } catch {
          return false;
        }
      }
      
      // Test invalid params fail
      for (const { params, errorPattern } of invalidParams) {
        try {
          handler.validate(params);
          return false; // Should have thrown
        } catch (error) {
          if (!errorPattern.test(error.message)) {
            return false;
          }
        }
      }
      
      return true;
    },
    
    runExecuteTests: async (handler) => {
      const results = [];
      
      for (const test of executeTests) {
        try {
          const result = await handler.execute(test.params);
          results.push({
            name: test.name,
            success: test.verify(result),
            result
          });
        } catch (error) {
          results.push({
            name: test.name,
            success: test.expectError && test.errorPattern.test(error.message),
            error: error.message
          });
        }
      }
      
      return results;
    }
  };
}

/**
 * Standard Unity command results for testing
 */
export const UNITY_RESPONSES = {
  success: (data = {}) => ({
    status: 'success',
    data
  }),
  
  error: (message, code = 'UNITY_ERROR') => ({
    status: 'error',
    error: message,
    code
  }),
  
  gameObject: (overrides = {}) => ({
    id: -1000,
    name: 'TestObject',
    path: '/TestObject',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    tag: 'Untagged',
    layer: 0,
    isActive: true,
    ...overrides
  }),
  
  scene: (overrides = {}) => ({
    name: 'TestScene',
    path: 'Assets/Scenes/TestScene.unity',
    isLoaded: true,
    isDirty: false,
    buildIndex: 0,
    ...overrides
  }),
  
  hierarchy: (objects = []) => ({
    sceneName: 'TestScene',
    objectCount: objects.length,
    hierarchy: objects,
    totalObjects: objects.length
  })
};