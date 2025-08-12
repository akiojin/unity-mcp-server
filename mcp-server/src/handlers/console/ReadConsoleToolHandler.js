import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for reading Unity Editor console logs with advanced filtering
 */
export class ReadConsoleToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'read_console',
      'Read Unity console logs with advanced filtering',
      {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of logs to retrieve (1-1000, default: 100)',
            minimum: 1,
            maximum: 1000,
            default: 100
          },
          logTypes: {
            type: 'array',
            description: 'Filter by log types (default: ["All"])',
            items: {
              type: 'string',
              enum: ['Log', 'Warning', 'Error', 'Assert', 'Exception', 'ErrorsAndExceptions', 'All']
            },
            default: ['All']
          },
          filterText: {
            type: 'string',
            description: 'Filter logs containing this text (case-insensitive)'
          },
          includeStackTrace: {
            type: 'boolean',
            description: 'Include stack traces in results',
            default: true
          },
          format: {
            type: 'string',
            description: 'Output format for logs',
            enum: ['detailed', 'compact', 'json', 'plain'],
            default: 'detailed'
          },
          sinceTimestamp: {
            type: 'string',
            description: 'Only return logs after this timestamp (ISO 8601)'
          },
          untilTimestamp: {
            type: 'string',
            description: 'Only return logs before this timestamp (ISO 8601)'
          },
          sortOrder: {
            type: 'string',
            description: 'Sort order for logs',
            enum: ['newest', 'oldest'],
            default: 'newest'
          },
          groupBy: {
            type: 'string',
            description: 'Group logs by criteria',
            enum: ['none', 'type', 'file', 'time'],
            default: 'none'
          }
        },
        required: []
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {Object} params - The input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    const {
      count,
      logTypes,
      filterText,
      includeStackTrace,
      format,
      sinceTimestamp,
      untilTimestamp,
      sortOrder,
      groupBy
    } = params;

    // Validate count
    if (count !== undefined) {
      if (typeof count !== 'number' || count < 1 || count > 1000) {
        throw new Error('count must be between 1 and 1000');
      }
    }

    // Validate log types
    if (logTypes !== undefined) {
      if (!Array.isArray(logTypes)) {
        throw new Error('logTypes must be an array');
      }
      
      const validTypes = ['Log', 'Warning', 'Error', 'Assert', 'Exception', 'ErrorsAndExceptions', 'All'];
      for (const type of logTypes) {
        if (!validTypes.includes(type)) {
          throw new Error(`Invalid log type: ${type}. Must be one of: ${validTypes.join(', ')}`);
        }
      }
    }

    // Validate timestamps
    if (sinceTimestamp !== undefined) {
      if (!this.isValidISO8601(sinceTimestamp)) {
        throw new Error('sinceTimestamp must be a valid ISO 8601 timestamp');
      }
    }

    if (untilTimestamp !== undefined) {
      if (!this.isValidISO8601(untilTimestamp)) {
        throw new Error('untilTimestamp must be a valid ISO 8601 timestamp');
      }
    }

    // Validate timestamp order
    if (sinceTimestamp && untilTimestamp) {
      const since = new Date(sinceTimestamp);
      const until = new Date(untilTimestamp);
      if (until <= since) {
        throw new Error('untilTimestamp must be after sinceTimestamp');
      }
    }

    // Validate format
    if (format !== undefined) {
      const validFormats = ['detailed', 'compact', 'json', 'plain'];
      if (!validFormats.includes(format)) {
        throw new Error(`format must be one of: ${validFormats.join(', ')}`);
      }
    }

    // Validate sort order
    if (sortOrder !== undefined) {
      const validOrders = ['newest', 'oldest'];
      if (!validOrders.includes(sortOrder)) {
        throw new Error(`sortOrder must be one of: ${validOrders.join(', ')}`);
      }
    }

    // Validate groupBy
    if (groupBy !== undefined) {
      const validGroups = ['none', 'type', 'file', 'time'];
      if (!validGroups.includes(groupBy)) {
        throw new Error(`groupBy must be one of: ${validGroups.join(', ')}`);
      }
    }
  }

  /**
   * Checks if a string is a valid ISO 8601 timestamp
   * @param {string} timestamp - The timestamp to validate
   * @returns {boolean} True if valid
   */
  isValidISO8601(timestamp) {
    const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!regex.test(timestamp)) {
      return false;
    }
    
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }

  /**
   * Executes the enhanced log reading operation
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The result of the log reading
   */
  async execute(params) {
    const {
      count = 100,
      logTypes = ['All'],
      filterText,
      includeStackTrace = true,
      format = 'detailed',
      sinceTimestamp,
      untilTimestamp,
      sortOrder = 'newest',
      groupBy = 'none'
    } = params;

    // Expand ErrorsAndExceptions to include Error, Exception, and Assert types
    let expandedLogTypes = logTypes;
    if (logTypes.includes('ErrorsAndExceptions')) {
      expandedLogTypes = logTypes.reduce((acc, type) => {
        if (type === 'ErrorsAndExceptions') {
          // Include Error, Exception, and Assert as Unity logs exceptions as Assert type
          acc.push('Error', 'Exception', 'Assert');
        } else {
          acc.push(type);
        }
        return acc;
      }, []);
      // Remove duplicates
      expandedLogTypes = [...new Set(expandedLogTypes)];
    }

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Prepare command parameters
    const commandParams = {
      count,
      logTypes: expandedLogTypes,
      includeStackTrace,
      format,
      sortOrder,
      groupBy
    };

    // Add optional parameters
    if (filterText !== undefined) {
      commandParams.filterText = filterText;
    }
    if (sinceTimestamp !== undefined) {
      commandParams.sinceTimestamp = sinceTimestamp;
    }
    if (untilTimestamp !== undefined) {
      commandParams.untilTimestamp = untilTimestamp;
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('read_console', commandParams);

    // Handle Unity response
    if (response.success === false) {
      throw new Error(response.error || 'Failed to read logs');
    }

    // Build result object
    const result = {
      logs: response.logs || [],
      count: response.count || 0,
      totalCaptured: response.totalCaptured || 0
    };

    // Include optional fields if available
    if (response.filteredCount !== undefined) {
      result.filteredCount = response.filteredCount;
    }
    if (response.statistics !== undefined) {
      result.statistics = response.statistics;
    }
    if (response.groupedLogs !== undefined) {
      result.groupedLogs = response.groupedLogs;
    }
    if (response.format !== undefined) {
      result.format = response.format;
    }
    if (response.groupBy !== undefined) {
      result.groupBy = response.groupBy;
    }

    return result;
  }
}