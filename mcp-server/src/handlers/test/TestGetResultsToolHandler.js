import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for retrieving latest Unity Test Runner exported results
 */
export class TestGetResultsToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('test_get_results', 'Get the most recently exported Unity test results and summary', {
      type: 'object',
      properties: {
        includeFileContent: {
          type: 'boolean',
          default: true,
          description: 'Whether to include the full JSON contents of the exported results file'
        }
      }
    });

    this.unityConnection = unityConnection;
  }

  async execute(params) {
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const response = await this.unityConnection.sendCommand('get_test_results', params || {});
    if (response.error) {
      throw new Error(response.error);
    }

    return response;
  }

  getExamples() {
    return {
      getSummaryOnly: {
        description: 'Fetch the latest test run summary without full file contents',
        params: {
          includeFileContent: false
        }
      },
      getFullResults: {
        description: 'Fetch summary and the JSON content of the exported results file',
        params: {
          includeFileContent: true
        }
      }
    };
  }
}
