import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for reading Unity Editor console logs with advanced filtering
 */
export class ReadConsoleToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'read_console',
      'Read Console logs with filters (type/text/time), formatting, sort, and grouping.',
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
              enum: ['Info', 'Warning', 'Error', 'All']
            },
            default: ['All']
          },
          filterText: {
            type: 'string',
            description: 'Filter logs containing this text (case-insensitive)'
          },
          includeStackTrace: {
            type: 'boolean',
            description: 'Include stack traces in results. Unity default: false (set to true for debugging)',
            default: false
          },
          format: {
            type: 'string',
            description: 'Output format for logs. Unity default: compact. RECOMMENDED: compact for general use, detailed for debugging',
            enum: ['detailed', 'compact', 'json', 'plain'],
            default: 'compact'
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
      
      const validTypes = ['Info', 'Warning', 'Error', 'All'];
      for (const type of logTypes) {
        if (!validTypes.includes(type)) {
          // Invalid types are treated as 'All' later, so just log a warning
          console.warn(`Invalid log type: ${type}. Will be treated as 'All'.`);
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

    // Convert simplified log types to Unity log types
    let expandedLogTypes = [];
    
    if (!logTypes || logTypes.length === 0 || logTypes.includes('All')) {
      // Default to all types
      expandedLogTypes = ['Log', 'Warning', 'Error', 'Exception', 'Assert'];
    } else {
      // Expand each simplified type to Unity types
      logTypes.forEach(type => {
        switch(type) {
          case 'Info':
            expandedLogTypes.push('Log');
            break;
          case 'Warning':
            expandedLogTypes.push('Warning');
            break;
          case 'Error':
            // Error includes all error-related types
            expandedLogTypes.push('Error', 'Exception', 'Assert');
            break;
          case 'All':
          default:
            // Treat unknown types as 'All'
            expandedLogTypes.push('Log', 'Warning', 'Error', 'Exception', 'Assert');
            break;
        }
      });
      
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
