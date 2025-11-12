import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { loadCachedTestResults, persistTestResults } from '../../utils/testResultsCache.js';

/**
 * Handler for getting Unity test execution status
 * Works with non-blocking test execution from RunUnityTestsToolHandler
 */
export class TestGetStatusToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('test_get_status', 'Get current Unity test execution status and results', {
      type: 'object',
      properties: {
        includeTestResults: {
          type: 'boolean',
          default: false,
          description: 'Include the summary of the latest exported test results'
        },
        includeFileContent: {
          type: 'boolean',
          default: false,
          description: 'When includeTestResults is true, also include the JSON file contents'
        }
      }
    });

    this.unityConnection = unityConnection;
  }

  /**
   * Gets current test execution status
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} Test execution status and results
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('get_test_status', params || {});

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return status directly if still running or idle
    if (response.status === 'running') {
      return response;
    }

    if (response.status === 'idle') {
      const cached = await loadCachedTestResults();
      return cached || response;
    }

    // Format completed results
    if (response.status === 'completed') {
      const result = {
        status: 'completed',
        success: response.success,
        totalTests: response.totalTests,
        passedTests: response.passedTests,
        failedTests: response.failedTests,
        skippedTests: response.skippedTests,
        inconclusiveTests: response.inconclusiveTests,
        summary: `${response.passedTests}/${response.totalTests} tests passed`,
        failures: response.failures || [],
        tests: response.tests || []
      };

      const artifactPath = await persistTestResults(result);
      const cachedResult = await loadCachedTestResults(artifactPath);

      return cachedResult || result;
    }

    // Error status
    return response;
  }

  /**
   * Gets example usage for this tool
   * @returns {Object} Example usage scenarios
   */
  getExamples() {
    return {
      checkStatus: {
        description: 'Check current test execution status',
        params: {}
      },
      checkWithResults: {
        description: 'Check status and include last exported test results summary',
        params: {
          includeTestResults: true
        }
      }
    };
  }
}
