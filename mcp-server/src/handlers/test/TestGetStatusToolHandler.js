import { BaseToolHandler } from '../base/BaseToolHandler.js';
import * as testResultsCache from '../../utils/testResultsCache.js';
import * as testRunState from '../../utils/testRunState.js';

/**
 * Handler for getting Unity test execution status
 * Works with non-blocking test execution from RunUnityTestsToolHandler
 */
export class TestGetStatusToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('get_test_status', 'Get current Unity test execution status and results', {
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
    this.testResultsCache = testResultsCache;
  }

  /**
   * Gets current test execution status
   * @param {Object} params - The validated input parameters
   * @returns {Promise<Object>} Test execution status and results
   */
  async execute(params) {
    let response;
    try {
      // Ensure connection to Unity
      if (!this.unityConnection.isConnected()) {
        await this.unityConnection.connect();
      }

      // Send command to Unity
      response = await this.unityConnection.sendCommand('get_test_status', params || {});
    } catch (error) {
      // 一度リトライしてみる（ドメインリロード直後を考慮）
      try {
        await this.unityConnection.connect();
        response = await this.unityConnection.sendCommand('get_test_status', params || {});
      } catch (retryError) {
        // Connection or transport error persists: fall back to cached run state so callers
        // can still distinguish "テスト起因のPlayMode" かどうか。
        const cached = testRunState.getState();
        return {
          ...cached,
          status: cached.status || 'error',
          error: retryError.message,
          connectionState: 'disconnected'
        };
      }
    }

    // Handle Unity response
    if (response.error) {
      throw new Error(response.error);
    }

    // Return status directly if still running or idle
    if (response.status === 'running') {
      const merged = { ...testRunState.updateFromStatus(response), ...response };
      return merged;
    }

    if (response.status === 'idle') {
      testRunState.markIdle();
      const cached = await this.testResultsCache.loadCachedTestResults();
      return cached || testRunState.getState() || response;
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
        tests: response.tests || [],
        testMode: response.testMode || testRunState.getState().testMode,
        runId: testRunState.getState().runId
      };

      if (response.latestResult) {
        result.latestResult = response.latestResult;
      }

      testRunState.updateFromStatus({ ...result, status: 'completed' });
      const artifactPath = await this.testResultsCache.persistTestResults(result);
      const cachedResult = await this.testResultsCache.loadCachedTestResults(artifactPath);

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
