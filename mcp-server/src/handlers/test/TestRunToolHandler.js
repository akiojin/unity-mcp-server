import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for running Unity NUnit tests via Test Runner API
 * Implements SPEC-e7c9b50c: Unity Test Execution Feature
 */
export class TestRunToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'test_run',
      'Run Unity NUnit tests in the current project',
      {
        type: 'object',
        properties: {
          testMode: {
            type: 'string',
            enum: ['EditMode', 'PlayMode', 'All'],
            default: 'EditMode',
            description: 'Test mode to run (EditMode: editor tests, PlayMode: runtime tests, All: both)'
          },
          filter: {
            type: 'string',
            description: 'Filter tests by class name (e.g., "PlayerControllerTests")'
          },
          category: {
            type: 'string',
            description: 'Filter tests by category attribute (e.g., "Integration")'
          },
          namespace: {
            type: 'string',
            description: 'Filter tests by namespace (e.g., "MyGame.Tests.Player")'
          },
          includeDetails: {
            type: 'boolean',
            default: false,
            description: 'Include detailed test results for each individual test'
          },
          exportPath: {
            type: 'string',
            description: 'Export test results to NUnit XML file at specified path'
          }
        }
      }
    );

    this.unityConnection = unityConnection;
  }

  /**
   * Executes Unity tests based on specified parameters
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} Test execution results
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('run_tests', params);

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Handle new non-blocking response format (status: "running")
    if (response.status === 'running') {
      return {
        status: 'running',
        message: response.message || 'Test execution started. Use get_test_status to check progress.'
      };
    }

    // Legacy format support (for backwards compatibility)
    // Format and return result
    const result = {
      success: response.success,
      totalTests: response.totalTests,
      passedTests: response.passedTests,
      failedTests: response.failedTests,
      skippedTests: response.skippedTests,
      inconclusiveTests: response.inconclusiveTests,
      duration: response.duration,
      summary: `${response.passedTests}/${response.totalTests} tests passed in ${response.duration}s`,
      failures: response.failures || []
    };

    // Include detailed test results if requested
    if (params.includeDetails && response.tests) {
      result.tests = response.tests;
    }

    return result;
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      runAllEditModeTests: {
        description: 'Run all Edit Mode tests',
        params: {
          testMode: 'EditMode'
        }
      },
      runSpecificClass: {
        description: 'Run tests in a specific class',
        params: {
          testMode: 'EditMode',
          filter: 'PlayerControllerTests'
        }
      },
      runCategoryTests: {
        description: 'Run tests in a specific category',
        params: {
          testMode: 'EditMode',
          category: 'Integration'
        }
      },
      runWithDetails: {
        description: 'Run tests with detailed results for each test',
        params: {
          testMode: 'EditMode',
          includeDetails: true
        }
      },
      runAndExport: {
        description: 'Run tests and export results to XML',
        params: {
          testMode: 'EditMode',
          exportPath: 'TestResults/results.xml'
        }
      },
      runPlayModeTests: {
        description: 'Run Play Mode tests (requires Play Mode)',
        params: {
          testMode: 'PlayMode'
        }
      },
      runAllTests: {
        description: 'Run both Edit Mode and Play Mode tests',
        params: {
          testMode: 'All',
          includeDetails: true
        }
      }
    };
  }
}
