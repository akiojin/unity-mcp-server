import { BaseToolHandler } from '../BaseToolHandler.js';

/**
 * Handler for the read_logs tool
 * Reads Unity console logs
 */
export class ReadLogsToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'read_logs',
      'Read Unity console logs',
      {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of logs to retrieve (1-1000, default: 100)',
            minimum: 1,
            maximum: 1000
          },
          logType: {
            type: 'string',
            description: 'Filter by log type (Log, Warning, Error, Assert, Exception)',
            enum: ['Log', 'Warning', 'Error', 'Assert', 'Exception']
          }
        },
        required: []
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {object} params - Input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    super.validate(params);
    
    // Additional validation for count
    if (params.count !== undefined) {
      const count = Number(params.count);
      if (isNaN(count) || count < 1 || count > 1000) {
        throw new Error('count must be a number between 1 and 1000');
      }
    }
    
    // Validate logType if provided
    if (params.logType !== undefined) {
      const validTypes = ['Log', 'Warning', 'Error', 'Assert', 'Exception'];
      if (!validTypes.includes(params.logType)) {
        throw new Error(`logType must be one of: ${validTypes.join(', ')}`);
      }
    }
  }

  /**
   * Executes the read_logs command
   * @param {object} params - Input parameters
   * @returns {Promise<object>} Logs result
   */
  async execute(params) {
    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }
    
    // Send read_logs command
    const result = await this.unityConnection.sendCommand('read_logs', {
      count: params.count || 100,
      logType: params.logType
    });
    
    // Format the logs for better readability
    if (result.logs && Array.isArray(result.logs)) {
      // Add some formatting helpers
      result.formattedLogs = result.logs.map(log => {
        const icon = this.getLogIcon(log.logType);
        return `${icon} [${log.timestamp}] ${log.message}`;
      });
    }
    
    return result;
  }

  /**
   * Gets an icon for the log type
   * @param {string} logType - The Unity log type
   * @returns {string} Icon/emoji for the log type
   */
  getLogIcon(logType) {
    switch (logType) {
      case 'Error': return '❌';
      case 'Warning': return '⚠️';
      case 'Assert': return '🔍';
      case 'Exception': return '💥';
      case 'Log': 
      default: return '📝';
    }
  }
}